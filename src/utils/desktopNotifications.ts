import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type {
  DesktopNotificationCategory,
  NotificationItem,
} from "../types/anilist";
import {
  formatNotificationPlainText,
  formatNotificationSummary,
  getNotificationCategory,
} from "./notifications";

export type DesktopPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

let permissionRequestedThisSession = false;

export async function getDesktopNotificationPermission(): Promise<DesktopPermissionState> {
  try {
    const granted = await isPermissionGranted();
    return granted ? "granted" : "prompt";
  } catch {
    return "unsupported";
  }
}

export async function requestDesktopNotificationPermission(): Promise<DesktopPermissionState> {
  try {
    const alreadyGranted = await isPermissionGranted();
    if (alreadyGranted) {
      permissionRequestedThisSession = true;
      return "granted";
    }

    permissionRequestedThisSession = true;
    const permission = await requestPermission();
    return permission === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

export async function sendDesktopNotification(
  title: string,
  body: string,
): Promise<boolean> {
  try {
    const granted = await isPermissionGranted();
    if (!granted) return false;
    sendNotification({ title, body });
    return true;
  } catch (error) {
    console.error("Failed to send desktop notification:", error);
    return false;
  }
}

export async function dispatchDesktopNotifications(
  items: NotificationItem[],
  enabledCategories: Record<DesktopNotificationCategory, boolean>,
): Promise<number> {
  const filtered = items.filter(
    (item) => enabledCategories[getNotificationCategory(item.type)] !== false,
  );
  if (filtered.length === 0) return 0;

  let permission = await getDesktopNotificationPermission();
  if (permission === "prompt" && !permissionRequestedThisSession) {
    permission = await requestDesktopNotificationPermission();
  }
  if (permission !== "granted") return 0;

  if (filtered.length > 3) {
    const summary = formatNotificationSummary(filtered);
    const sent = await sendDesktopNotification(summary.title, summary.body);
    return sent ? 1 : 0;
  }

  let sentCount = 0;
  // Send oldest first so the newest item rests at the top of the OS toast stack.
  const ordered = [...filtered].reverse();
  for (const item of ordered) {
    const { title, body } = formatNotificationPlainText(item);
    const sent = await sendDesktopNotification(title, body);
    if (sent) sentCount += 1;
  }
  return sentCount;
}
