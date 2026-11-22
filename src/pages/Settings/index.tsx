import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  ExternalLink,
  Info,
  Loader2,
  Palette,
  Play,
  Settings2,
  UserRound,
} from "lucide-react";
import {
  useNotificationsContext,
  type PollIntervalMinutes,
} from "../../context/NotificationContext";
import { updateNotificationOptions, useViewer } from "../../hooks/useAniList";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../../components/ui/LoginModal";
import PageHeader from "../../components/layout/PageHeader";
import type {
  DesktopNotificationCategory,
  NotificationOption,
} from "../../types/anilist";
import type { TranslationType } from "../../types/playback";
import {
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendDesktopNotification,
  type DesktopPermissionState,
} from "../../utils/desktopNotifications";
import {
  ANILIST_NOTIFICATION_OPTION_META,
  DESKTOP_CATEGORY_LABELS,
  formatNotificationTypeEnumLabel,
} from "../../utils/notifications";
import { openExternalUrl } from "../../utils/safeUrl";

type Theme =
  | "catppuccin"
  | "espresso"
  | "latte"
  | "anilist-dark"
  | "anilist-light"
  | "black";

const THEMES: { id: Theme; label: string; description: string }[] = [
  {
    id: "espresso",
    label: "Espresso",
    description: "Warm dark",
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "Soft dark",
  },
  {
    id: "black",
    label: "OLED",
    description: "Pure black",
  },
  {
    id: "anilist-dark",
    label: "AniList Dark",
    description: "Classic AniList",
  },
  {
    id: "latte",
    label: "Latte",
    description: "Soft light",
  },
  {
    id: "anilist-light",
    label: "AniList Light",
    description: "Classic light",
  },
];

function getSavedTheme(): Theme {
  const theme = localStorage.getItem("theme");

  const validThemes: Theme[] = THEMES.map((theme) => theme.id);

  return validThemes.includes(theme as Theme) ? (theme as Theme) : "espresso";
}

const DESKTOP_CATEGORIES: DesktopNotificationCategory[] = [
  "airing",
  "activity",
  "follows",
  "forum",
  "media",
];

const OPTION_GROUP_ORDER = [
  "Activity",
  "Follows",
  "Forum",
  "Media & Library",
] as const;

export default function Settings() {
  const { isAuthenticated, logout } = useAuth();
  const { preferences, updatePreferences, updateDesktopCategory } =
    useNotificationsContext();
  const {
    viewer,
    isLoading: viewerLoading,
    error: viewerError,
  } = useViewer(isAuthenticated);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [audioPreference, setAudioPreference] = useState<TranslationType>(
    () => localStorage.getItem("playback-audio-preference") === "dub" ? "dub" : "sub",
  );
  const [autoPlayFromWatchNow, setAutoPlayFromWatchNow] = useState(
    () => localStorage.getItem("playback-auto-play") !== "false",
  );

  const [permissionState, setPermissionState] =
    useState<DesktopPermissionState>("prompt");
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const testTimerRef = useRef<number | null>(null);

  const [airingNotifications, setAiringNotifications] = useState(true);
  const [accountOptions, setAccountOptions] = useState<NotificationOption[]>(
    [],
  );
  const [isSavingAccountPrefs, setIsSavingAccountPrefs] = useState(false);
  const [accountSaveStatus, setAccountSaveStatus] = useState<string | null>(
    null,
  );
  const [accountSaveError, setAccountSaveError] = useState<string | null>(null);
  const accountTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void getDesktopNotificationPermission().then((status) => {
      if (active) setPermissionState(status);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
      if (accountTimerRef.current) window.clearTimeout(accountTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAiringNotifications(true);
      setAccountOptions([]);
      setAccountSaveStatus(null);
      setAccountSaveError(null);
      return;
    }

    if (viewer?.options) {
      if (typeof viewer.options.airingNotifications === "boolean") {
        setAiringNotifications(viewer.options.airingNotifications);
      }
      if (Array.isArray(viewer.options.notificationOptions)) {
        setAccountOptions(
          viewer.options.notificationOptions.filter(
            (opt) => opt.type !== "AIRING",
          ),
        );
      }
    }
  }, [isAuthenticated, viewer]);

  const groupedAccountOptions = useMemo(() => {
    const groups = new Map<
      string,
      Array<{
        option: NotificationOption;
        label: string;
        description: string;
      }>
    >();

    for (const option of accountOptions) {
      const meta = ANILIST_NOTIFICATION_OPTION_META[option.type];
      const groupName = meta?.group ?? "Media & Library";
      const label = meta?.label ?? formatNotificationTypeEnumLabel(option.type);
      const description =
        meta?.description ??
        `Receive AniList notifications for ${label.toLowerCase()}.`;

      const existing = groups.get(groupName) ?? [];
      existing.push({ option, label, description });
      groups.set(groupName, existing);
    }

    return OPTION_GROUP_ORDER.map((group) => ({
      group,
      items: groups.get(group) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [accountOptions]);

  const handleDesktopToggle = async (enabled: boolean) => {
    updatePreferences({ desktopEnabled: enabled });
    setTestFeedback(null);
    if (enabled) {
      const status = await requestDesktopNotificationPermission();
      setPermissionState(status);
    }
  };

  const handleSendTestNotification = async () => {
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    const status = await requestDesktopNotificationPermission();
    setPermissionState(status);
    if (status !== "granted") {
      setTestFeedback(
        status === "denied"
          ? "Permission blocked in OS settings"
          : "Desktop notifications unavailable here",
      );
      return;
    }

    const sent = await sendDesktopNotification(
      "Kioku",
      "Desktop notifications are working!",
    );
    setTestFeedback(sent ? "Test notification sent" : "Unable to send test");
    testTimerRef.current = window.setTimeout(() => {
      setTestFeedback(null);
    }, 3000);
  };

  const scheduleSavedBanner = () => {
    if (accountTimerRef.current) window.clearTimeout(accountTimerRef.current);
    setAccountSaveStatus("Saved to AniList");
    accountTimerRef.current = window.setTimeout(() => {
      setAccountSaveStatus(null);
    }, 2500);
  };

  const handleAiringAccountToggle = async (enabled: boolean) => {
    if (isSavingAccountPrefs) return;
    const prev = airingNotifications;
    setAiringNotifications(enabled);
    setIsSavingAccountPrefs(true);
    setAccountSaveError(null);
    setAccountSaveStatus(null);

    try {
      const updated = await updateNotificationOptions({
        airingNotifications: enabled,
      });
      if (typeof updated.airingNotifications === "boolean") {
        setAiringNotifications(updated.airingNotifications);
      }
      scheduleSavedBanner();
    } catch (err) {
      console.error("Failed to update airing notification option:", err);
      setAiringNotifications(prev);
      setAccountSaveError(
        "Unable to save notification preference to AniList.",
      );
    } finally {
      setIsSavingAccountPrefs(false);
    }
  };

  const handleAccountOptionToggle = async (
    optionType: string,
    enabled: boolean,
  ) => {
    if (isSavingAccountPrefs) return;
    const prevOptions = accountOptions;
    const nextOptions = accountOptions.map((opt) =>
      opt.type === optionType ? { ...opt, enabled } : opt,
    );

    setAccountOptions(nextOptions);
    setIsSavingAccountPrefs(true);
    setAccountSaveError(null);
    setAccountSaveStatus(null);

    try {
      const updated = await updateNotificationOptions({
        notificationOptions: nextOptions,
      });
      if (Array.isArray(updated.notificationOptions)) {
        setAccountOptions(
          updated.notificationOptions.filter((opt) => opt.type !== "AIRING"),
        );
      }
      scheduleSavedBanner();
    } catch (err) {
      console.error("Failed to update AniList notification options:", err);
      setAccountOptions(prevOptions);
      setAccountSaveError(
        "Unable to save notification preference to AniList.",
      );
    } finally {
      setIsSavingAccountPrefs(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);

    localStorage.setItem("theme", newTheme);

    document.documentElement.dataset.theme = newTheme;
  };

  return (
    <div className="settings-page">
      <PageHeader
        icon={<Settings2 />}
        title="Settings"
        subtitle="Manage your Kioku experience"
      />

      <div className="settings-content">
        {/* Appearance */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              <Palette size={18} />
            </div>

            <div>
              <h2 className="settings-section__title">Appearance</h2>

              <p className="settings-section__description">
                Customize how Kioku looks.
              </p>
            </div>
          </div>

          <div className="settings-panel">
            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">Theme</span>

                <span className="settings-row__description">
                  Choose your preferred color scheme.
                </span>
              </div>
            </div>

            <div className="settings-theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={theme === item.id}
                  className={`settings-theme ${
                    theme === item.id ? "settings-theme--active" : ""
                  }`}
                  onClick={() => handleThemeChange(item.id)}
                >
                  <div className="settings-theme__preview">
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="settings-theme__info">
                    <span className="settings-theme__name">{item.label}</span>

                    <span className="settings-theme__description">
                      {item.description}
                    </span>
                  </div>

                  {theme === item.id && (
                    <Check size={16} className="settings-theme__check" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              <Play size={18} />
            </div>

            <div>
              <h2 className="settings-section__title">Playback</h2>
              <p className="settings-section__description">
                Choose how playback starts from Watch Now.
              </p>
            </div>
          </div>

          <div className="settings-panel settings-panel--playback">
            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">Preferred audio</span>
                <span className="settings-row__description">
                  Use this audio by default when it is available.
                </span>
              </div>

              <select
                className="settings-select"
                aria-label="Preferred playback audio"
                value={audioPreference}
                onChange={(event) => {
                  const preference: TranslationType =
                    event.target.value === "dub" ? "dub" : "sub";
                  setAudioPreference(preference);
                  localStorage.setItem("playback-audio-preference", preference);
                }}
              >
                <option value="sub">Sub</option>
                <option value="dub">Dub</option>
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">Auto play from Watch Now</span>
                <span className="settings-row__description">
                  Match the title, select your next episode, and start playback automatically.
                </span>
              </div>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  aria-label="Auto play from Watch Now"
                  checked={autoPlayFromWatchNow}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setAutoPlayFromWatchNow(enabled);
                    localStorage.setItem("playback-auto-play", String(enabled));
                  }}
                />
                <span className="settings-toggle__track" aria-hidden="true">
                  <span />
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              <Bell size={18} />
            </div>

            <div>
              <h2 className="settings-section__title">Notifications</h2>
              <p className="settings-section__description">
                Configure desktop alerts and AniList notification preferences.
              </p>
            </div>
          </div>

          <div className="settings-panel settings-panel--notifications">
            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">Desktop notifications</span>
                <span className="settings-row__description">
                  Show native system notifications when new AniList alerts arrive.
                </span>
                {preferences.desktopEnabled && permissionState === "denied" && (
                  <span className="settings-status-note settings-status-note--warn">
                    Notification permission is denied. Enable notifications for Kioku in your OS settings.
                  </span>
                )}
                {preferences.desktopEnabled && permissionState === "unsupported" && (
                  <span className="settings-status-note">
                    System notifications are unavailable in this runtime.
                  </span>
                )}
                {testFeedback && (
                  <span className="settings-status-note">{testFeedback}</span>
                )}
              </div>

              <div className="settings-inline-actions">
                {preferences.desktopEnabled && (
                  <button
                    type="button"
                    className="button-secondary settings-mini-btn"
                    disabled={
                      permissionState === "denied" ||
                      permissionState === "unsupported"
                    }
                    onClick={() => void handleSendTestNotification()}
                  >
                    Send test
                  </button>
                )}

                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    aria-label="Desktop notifications"
                    checked={preferences.desktopEnabled}
                    onChange={(event) =>
                      void handleDesktopToggle(event.target.checked)
                    }
                  />
                  <span className="settings-toggle__track" aria-hidden="true">
                    <span />
                  </span>
                </label>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">Check interval</span>
                <span className="settings-row__description">
                  How often Kioku checks AniList for unread notifications in the background.
                </span>
              </div>

              <select
                className="settings-select"
                aria-label="Notification check interval"
                value={preferences.pollIntervalMinutes}
                onChange={(event) => {
                  const value = Number(
                    event.target.value,
                  ) as PollIntervalMinutes;
                  updatePreferences({ pollIntervalMinutes: value });
                }}
              >
                <option value={0}>Off (Manual only)</option>
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row__content">
                <span className="settings-row__title">
                  Auto-mark as read on open
                </span>
                <span className="settings-row__description">
                  Automatically clear your AniList unread count when opening Notifications. Off by default.
                </span>
              </div>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  aria-label="Auto-mark as read on open"
                  checked={preferences.autoMarkReadOnOpen}
                  onChange={(event) =>
                    updatePreferences({
                      autoMarkReadOnOpen: event.target.checked,
                    })
                  }
                />
                <span className="settings-toggle__track" aria-hidden="true">
                  <span />
                </span>
              </label>
            </div>

            {preferences.desktopEnabled && (
              <div className="settings-row settings-row--stacked">
                <div className="settings-row__content">
                  <span className="settings-row__title">
                    Desktop alert categories
                  </span>
                  <span className="settings-row__description">
                    Choose which notification categories trigger native OS alerts.
                  </span>
                </div>

                <div className="settings-chip-group">
                  {DESKTOP_CATEGORIES.map((category) => {
                    const active = preferences.desktopCategories[category];
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={active}
                        className={`settings-chip${active ? " settings-chip--active" : ""}`}
                        onClick={() => updateDesktopCategory(category, !active)}
                      >
                        {active && <Check size={13} aria-hidden="true" />}
                        {DESKTOP_CATEGORY_LABELS[category]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="settings-panel settings-panel--notifications">
            <div className="settings-subpanel-header">
              <div className="settings-row__content">
                <span className="settings-row__title">
                  AniList account preferences
                </span>
                <span className="settings-row__description">
                  Control which notifications AniList generates for your account.
                </span>
              </div>

              <div className="settings-inline-actions">
                {accountSaveStatus && (
                  <span className="settings-sync-status">
                    {accountSaveStatus}
                  </span>
                )}
                <span className="settings-sync-badge">Synced with AniList</span>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="settings-row">
                <span className="settings-row__description">
                  Sign in with AniList to manage your server-side notification settings.
                </span>
              </div>
            ) : viewerLoading && !viewer ? (
              <div className="settings-row">
                <span className="settings-loading-inline">
                  <Loader2
                    size={15}
                    className="notifications-spin"
                    aria-hidden="true"
                  />
                  Loading AniList notification preferences...
                </span>
              </div>
            ) : viewerError && !viewer ? (
              <div className="settings-row">
                <span className="settings-status-note settings-status-note--warn">
                  Unable to load AniList account notification preferences.
                </span>
              </div>
            ) : (
              <>
                {accountSaveError && (
                  <div className="settings-row">
                    <span className="settings-status-note settings-status-note--warn">
                      {accountSaveError}
                    </span>
                  </div>
                )}

                <div className="settings-row">
                  <div className="settings-row__content">
                    <span className="settings-row__title">Airing episodes</span>
                    <span className="settings-row__description">
                      Notify you when new episodes air for anime you are watching.
                    </span>
                  </div>

                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      aria-label="AniList airing episodes notifications"
                      disabled={isSavingAccountPrefs}
                      checked={airingNotifications}
                      onChange={(event) =>
                        void handleAiringAccountToggle(event.target.checked)
                      }
                    />
                    <span className="settings-toggle__track" aria-hidden="true">
                      <span />
                    </span>
                  </label>
                </div>

                {groupedAccountOptions.map(({ group, items }) => (
                  <div key={group} className="settings-option-group">
                    <div className="settings-option-group__label">{group}</div>
                    {items.map(({ option, label, description }) => (
                      <div key={option.type} className="settings-row">
                        <div className="settings-row__content">
                          <span className="settings-row__title">{label}</span>
                          <span className="settings-row__description">
                            {description}
                          </span>
                        </div>

                        <label className="settings-toggle">
                          <input
                            type="checkbox"
                            aria-label={label}
                            disabled={isSavingAccountPrefs}
                            checked={option.enabled}
                            onChange={(event) =>
                              void handleAccountOptionToggle(
                                option.type,
                                event.target.checked,
                              )
                            }
                          />
                          <span
                            className="settings-toggle__track"
                            aria-hidden="true"
                          >
                            <span />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Account */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              <UserRound size={18} />
            </div>

            <div>
              <h2 className="settings-section__title">AniList Account</h2>

              <p className="settings-section__description">
                Manage your AniList connection.
              </p>
            </div>
          </div>

          <div className="settings-panel">
            <div className="settings-account">
              <div className="settings-account__status">
                <div className="settings-row__content">
                  <span className="settings-row__title">
                    {isAuthenticated ? "AniList connected" : "Not connected"}
                  </span>

                  <span className="settings-row__description">
                    {isAuthenticated
                      ? "Your library is synced with AniList."
                      : "Connect your account to sync your library."}
                  </span>
                </div>
              </div>

              {isAuthenticated ? (
                <button type="button" onClick={logout} className="button-secondary">
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="button-primary"
                >
                  Sign In with AniList
                </button>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="settings-section">
          <div className="settings-section__header">
            <div className="settings-section__icon">
              <Info size={18} />
            </div>
            <div>
              <h2 className="settings-section__title">About</h2>
              <p className="settings-section__description">
                Information about Kioku.
              </p>
            </div>
          </div>

          <div className="settings-panel">
            <div className="settings-about">
              <div className="settings-about__identity">
                <div>
                  <span className="settings-about__name">Kioku</span>
                  <span className="settings-about__description">
                    A desktop client for managing your AniList library.
                  </span>
                </div>

                <span className="settings-about__version">v0.3.0</span>
              </div>

              <div className="settings-about__links">
                <button
                  type="button"
                  className="settings-about__link"
                  onClick={() => void openExternalUrl("https://github.com/vorlie/kioku")}
                >
                  <ExternalLink size={14} aria-hidden="true" /> 
                  GitHub
                </button>

                <button
                  type="button"
                  className="settings-about__link"
                  onClick={() => void openExternalUrl("https://anilist.co")}
                >
                  <ExternalLink size={14} aria-hidden="true" /> 
                  AniList
                </button>
              </div>

              <div className="settings-about__footer">
                <span>Built with Tauri 2 · React · TypeScript · Rust</span>
                <span>
                  Kioku is an independent third-party application and is not
                  affiliated with AniList.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}
