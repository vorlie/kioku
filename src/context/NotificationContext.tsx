import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  clearAniListCache,
  fetchNotifications,
  fetchUnreadNotificationCount,
} from "../hooks/useAniList";
import type {
  DesktopNotificationCategory,
  NotificationItem,
  NotificationPage,
} from "../types/anilist";
import {
  getMaxNotificationId,
} from "../utils/notifications";

export type PollIntervalMinutes = 0 | 2 | 5 | 10 | 15;

export interface NotificationPreferences {
  desktopEnabled: boolean;
  pollIntervalMinutes: PollIntervalMinutes;
  autoMarkReadOnOpen: boolean;
  desktopCategories: Record<DesktopNotificationCategory, boolean>;
}

const PREFS_STORAGE_KEY = "kioku-notification-prefs";
const LAST_ID_STORAGE_PREFIX = "kioku-notif-last-id:";
const VALID_POLL_INTERVALS = new Set<PollIntervalMinutes>([0, 2, 5, 10, 15]);
const FOCUS_THROTTLE_MS = 60_000;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  desktopEnabled: true,
  pollIntervalMinutes: 5,
  autoMarkReadOnOpen: false,
  desktopCategories: {
    airing: true,
    activity: true,
    follows: true,
    forum: true,
    media: true,
  },
};

function loadPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    const rawCategories: Partial<Record<DesktopNotificationCategory, boolean>> =
      parsed.desktopCategories ?? {};
    const rawInterval = Number(parsed.pollIntervalMinutes) as PollIntervalMinutes;

    return {
      desktopEnabled:
        typeof parsed.desktopEnabled === "boolean"
          ? parsed.desktopEnabled
          : DEFAULT_NOTIFICATION_PREFERENCES.desktopEnabled,
      pollIntervalMinutes: VALID_POLL_INTERVALS.has(rawInterval)
        ? rawInterval
        : DEFAULT_NOTIFICATION_PREFERENCES.pollIntervalMinutes,
      autoMarkReadOnOpen:
        typeof parsed.autoMarkReadOnOpen === "boolean"
          ? parsed.autoMarkReadOnOpen
          : DEFAULT_NOTIFICATION_PREFERENCES.autoMarkReadOnOpen,
      desktopCategories: {
        airing:
          typeof rawCategories.airing === "boolean"
            ? rawCategories.airing
            : DEFAULT_NOTIFICATION_PREFERENCES.desktopCategories.airing,
        activity:
          typeof rawCategories.activity === "boolean"
            ? rawCategories.activity
            : DEFAULT_NOTIFICATION_PREFERENCES.desktopCategories.activity,
        follows:
          typeof rawCategories.follows === "boolean"
            ? rawCategories.follows
            : DEFAULT_NOTIFICATION_PREFERENCES.desktopCategories.follows,
        forum:
          typeof rawCategories.forum === "boolean"
            ? rawCategories.forum
            : DEFAULT_NOTIFICATION_PREFERENCES.desktopCategories.forum,
        media:
          typeof rawCategories.media === "boolean"
            ? rawCategories.media
            : DEFAULT_NOTIFICATION_PREFERENCES.desktopCategories.media,
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function getStoredLastNotifiedId(viewerId: number): number | null {
  try {
    const raw = localStorage.getItem(`${LAST_ID_STORAGE_PREFIX}${viewerId}`);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredLastNotifiedId(viewerId: number, id: number): void {
  try {
    localStorage.setItem(`${LAST_ID_STORAGE_PREFIX}${viewerId}`, String(id));
  } catch {
    // Ignore storage quota errors
  }
}

export interface RefreshUnreadOptions {
  force?: boolean;
  suppressDesktop?: boolean;
}

export interface NotificationContextValue {
  unreadCount: number;
  viewerId: number | null;
  isRefreshing: boolean;
  isMarkingRead: boolean;
  lastCheckedAt: number | null;
  preferences: NotificationPreferences;
  updatePreferences: (patch: Partial<NotificationPreferences>) => void;
  updateDesktopCategory: (
    category: DesktopNotificationCategory,
    enabled: boolean,
  ) => void;
  refreshUnreadCount: (options?: RefreshUnreadOptions) => Promise<number>;
  markAllRead: () => Promise<NotificationPage | null>;
  recordSeenNotifications: (items: NotificationItem[]) => void;
  syncUnreadCount: (count: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(loadPreferences);

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const viewerIdRef = useRef<number | null>(viewerId);
  viewerIdRef.current = viewerId;

  const prevUnreadCountRef = useRef<number | null>(null);
  const lastCheckedAtRef = useRef<number | null>(lastCheckedAt);
  lastCheckedAtRef.current = lastCheckedAt;

  const inFlightRefreshRef = useRef<Promise<number> | null>(null);

  const updatePreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setPreferences((prev) => {
        const next: NotificationPreferences = {
          ...prev,
          ...patch,
          desktopCategories: patch.desktopCategories
            ? { ...prev.desktopCategories, ...patch.desktopCategories }
            : prev.desktopCategories,
        };
        try {
          localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    [],
  );

  const updateDesktopCategory = useCallback(
    (category: DesktopNotificationCategory, enabled: boolean) => {
      setPreferences((prev) => {
        const next: NotificationPreferences = {
          ...prev,
          desktopCategories: {
            ...prev.desktopCategories,
            [category]: enabled,
          },
        };
        try {
          localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    [],
  );

  const recordSeenNotifications = useCallback((items: NotificationItem[]) => {
    const activeViewerId = viewerIdRef.current;
    if (activeViewerId === null || items.length === 0) return;
    const current = getStoredLastNotifiedId(activeViewerId) ?? 0;
    const nextMax = getMaxNotificationId(items, current);
    if (nextMax > current) {
      setStoredLastNotifiedId(activeViewerId, nextMax);
    }
  }, []);

  const syncUnreadCount = useCallback((count: number) => {
    const normalized = Math.max(0, count);
    prevUnreadCountRef.current = normalized;
    setUnreadCount(normalized);
  }, []);

  const refreshUnreadCount = useCallback(
    async (_options?: RefreshUnreadOptions): Promise<number> => {
      if (!isAuthenticatedRef.current) return 0;

      if (inFlightRefreshRef.current) {
        return inFlightRefreshRef.current;
      }

      const promise = (async () => {
        setIsRefreshing(true);
        try {
          const result = await fetchUnreadNotificationCount();
          if (!isAuthenticatedRef.current) return 0;

          const nextViewerId = result.viewerId;
          const nextUnread = Math.max(0, result.unreadCount);

          viewerIdRef.current = nextViewerId;
          setViewerId(nextViewerId);
          setUnreadCount(nextUnread);

          const now = Date.now();
          lastCheckedAtRef.current = now;
          setLastCheckedAt(now);

          const storedLastId = getStoredLastNotifiedId(nextViewerId);
          if (storedLastId === null) {
            try {
              const seedPage = await fetchNotifications({
                page: 1,
                perPage: 1,
                resetNotificationCount: false,
              });
              if (isAuthenticatedRef.current) {
                const maxId = getMaxNotificationId(seedPage.notifications, 0);
                setStoredLastNotifiedId(nextViewerId, maxId);
              }
            } catch (seedError) {
              console.error("Failed to seed last notification ID:", seedError);
            }
          }

          prevUnreadCountRef.current = nextUnread;
          return nextUnread;
        } catch (error) {
          console.error("Failed to refresh unread notifications:", error);
          return prevUnreadCountRef.current ?? 0;
        } finally {
          setIsRefreshing(false);
          inFlightRefreshRef.current = null;
        }
      })();

      inFlightRefreshRef.current = promise;
      return promise;
    },
    [],
  );

  const markAllRead = useCallback(async (): Promise<NotificationPage | null> => {
    if (!isAuthenticatedRef.current) return null;
    setIsMarkingRead(true);
    try {
      const page = await fetchNotifications({
        page: 1,
        perPage: 25,
        resetNotificationCount: true,
      });
      if (!isAuthenticatedRef.current) return null;

      syncUnreadCount(0);
      recordSeenNotifications(page.notifications);
      clearAniListCache("viewer");
      return page;
    } finally {
      setIsMarkingRead(false);
    }
  }, [recordSeenNotifications, syncUnreadCount]);

  // Initial fetch on login and full reset on logout
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      prevUnreadCountRef.current = null;
      viewerIdRef.current = null;
      lastCheckedAtRef.current = null;
      setViewerId(null);
      setUnreadCount(0);
      setLastCheckedAt(null);
      return;
    }

    void refreshUnreadCount({ force: true, suppressDesktop: true });
  }, [authLoading, isAuthenticated, refreshUnreadCount]);

  // Interval polling
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      preferences.pollIntervalMinutes === 0
    ) {
      return;
    }

    const intervalMs = preferences.pollIntervalMinutes * 60_000;
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "hidden" &&
        !preferencesRef.current.desktopEnabled
      ) {
        return;
      }
      void refreshUnreadCount();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    authLoading,
    isAuthenticated,
    preferences.pollIntervalMinutes,
    refreshUnreadCount,
  ]);

  // Window focus and tab visibility refresh (throttled)
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      preferences.pollIntervalMinutes === 0
    ) {
      return;
    }

    const handleResume = () => {
      if (document.visibilityState === "hidden") return;
      if (preferencesRef.current.pollIntervalMinutes === 0) return;

      const last = lastCheckedAtRef.current ?? 0;
      if (Date.now() - last < FOCUS_THROTTLE_MS) return;

      void refreshUnreadCount();
    };

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);
    return () => {
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [
    authLoading,
    isAuthenticated,
    preferences.pollIntervalMinutes,
    refreshUnreadCount,
  ]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      viewerId,
      isRefreshing,
      isMarkingRead,
      lastCheckedAt,
      preferences,
      updatePreferences,
      updateDesktopCategory,
      refreshUnreadCount,
      markAllRead,
      recordSeenNotifications,
      syncUnreadCount,
    }),
    [
      unreadCount,
      viewerId,
      isRefreshing,
      isMarkingRead,
      lastCheckedAt,
      preferences,
      updatePreferences,
      updateDesktopCategory,
      refreshUnreadCount,
      markAllRead,
      recordSeenNotifications,
      syncUnreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationsContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationsContext must be used within a NotificationProvider",
    );
  }
  return context;
}
