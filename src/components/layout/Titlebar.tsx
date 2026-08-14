import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import Logo from "./Logo";
export default function Titlebar() {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div data-tauri-drag-region className="custom-titlebar">
      <div className="titlebar-logo">
        <Logo className="titlebar-logo--icon" />
        <span>Kioku</span>
      </div>
      <div className="titlebar-actions">
        <button className="titlebar-btn" onClick={handleMinimize}>
          <Minus size={14} />
        </button>
        <button className="titlebar-btn" onClick={handleMaximize}>
          <Square size={12} />
        </button>
        <button
          className="titlebar-btn titlebar-btn--close"
          onClick={handleClose}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
