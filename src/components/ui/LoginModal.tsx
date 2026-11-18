import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { openUrl } from "@tauri-apps/plugin-opener";

interface LoginModalProps {
  onClose: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "An unknown error occurred.";

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login, startOAuth, checkOAuthToken, stopOAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleOAuthLogin = async () => {
    setIsLoading(true);
    setError("");
    setStatus("Starting authentication server...");
    try {
      const authUrl = await startOAuth();
      setStatus("Opening browser for authorization...");
      await openUrl(authUrl);
      setStatus("Waiting for authorization...");
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const token = await checkOAuthToken();
          if (token) {
            clearInterval(interval);
            setStatus("Token received, signing in...");
            await login(token);
            await stopOAuth();
            setIsLoading(false);
            onClose();
          } else if (attempts >= 60) {
            clearInterval(interval);
            setError("Authentication timed out. Please try again.");
            await stopOAuth();
            setIsLoading(false);
          }
        } catch (err) {
          clearInterval(interval);
          setError(`Failed to check authentication status: ${errorMessage(err)}`);
          await stopOAuth();
          setIsLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError(`OAuth sign-in could not start: ${errorMessage(err)}`);
      setIsLoading(false);
      await stopOAuth();
    }
  };

  const manualLogin = async (token: string) => {
    setIsLoading(true);
    setError("");
    try {
      await login(token);
      onClose();
    } catch {
      setError("Failed to login. Please check your token and make sure it's valid.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancel = async () => {
    await stopOAuth();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        void cancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading]);

  return (
    <div className="modal-backdrop" onClick={() => !isLoading && void cancel()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="modal-header">
          <h2 id="login-modal-title" className="modal-title">Sign in with AniList</h2>
          {!isLoading && (
            <button type="button" className="modal-close-btn" onClick={() => void cancel()} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {error && <div className="modal-error-banner" role="alert">{error}</div>}

        {/* Modal Main Body Content */}
        {!isLoading ? (
          <div className="modal-body">
            <div className="login-option">
              <p className="login-option__title">Quick Sign In (Recommended):</p>
              <p className="login-option__desc">
                Click the button below to sign in automatically via your browser.
              </p>
              <button type="button" className="button-primary" style={{ width: "100%" }} onClick={handleOAuthLogin}>
                Sign In with AniList
              </button>
            </div>

            <div className="login-divider" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-size-small)" }}>
              — or —
            </div>

            <div className="login-option">
              <p className="login-option__title">Manual Token Entry:</p>
              <p className="login-option__desc">
                If automatic sign-in doesn't work, you can manually enter your access token.
              </p>
              <ManualTokenForm onSubmit={manualLogin} />
            </div>

            <button type="button" className="button-secondary" style={{ width: "100%", marginTop: "var(--space-2)" }} onClick={() => void cancel()}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="modal-loading-pane">
            <Loader2 size={32} className="modal-loading-pane__spinner" aria-hidden="true" />
            <p className="modal-loading-pane__status">{status || "Signing in..."}</p>
            <p className="modal-loading-pane__hint">
              This window will close automatically when complete.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function ManualTokenForm({ onSubmit }: { onSubmit: (token: string) => Promise<void> }) {
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(token);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="login-form">
      <div className="login-form__field" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <label htmlFor="manual-access-token" className="form-label" style={{ fontSize: "var(--font-size-small)", fontWeight: "var(--font-weight-medium)" }}>
          Access Token
        </label>
        <input
          id="manual-access-token"
          className="form-input form-input--dark"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your AniList access token here"
          style={{ width: "100%" }}
        />
      </div>
      <button
        className="button-secondary"
        type="submit"
        disabled={isSubmitting || !token}
        style={{ width: "100%", marginTop: "var(--space-2)" }}
      >
        {isSubmitting ? "Signing in..." : "Sign In with Token"}
      </button>
    </form>
  );
}