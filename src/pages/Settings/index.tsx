import { useState } from "react";
import { Check, Palette, UserRound, Info, Settings2, ExternalLink } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";

import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../../components/ui/LoginModal";
import PageHeader from "../../components/layout/PageHeader";

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

export default function Settings() {
  const { isAuthenticated, logout } = useAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [theme, setTheme] = useState<Theme>(getSavedTheme);

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
                <button onClick={logout} className="button-secondary">
                  Sign Out
                </button>
              ) : (
                <button
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

                <span className="settings-about__version">v0.1.0</span>
              </div>

              <div className="settings-about__links">
                <button
                  className="settings-about__link"
                  onClick={() => open("https://github.com/vorlie/kioku")}
                >
                  <ExternalLink size={14} /> 
                  GitHub
                </button>

                <button
                  className="settings-about__link"
                  onClick={() => open("https://anilist.co")}
                >
                  <ExternalLink size={14} /> 
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
