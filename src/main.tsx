import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";

const savedTheme = localStorage.getItem("theme");
const validThemes = new Set([
  "catppuccin",
  "espresso",
  "latte",
  "anilist-dark",
  "anilist-light",
  "black",
]);
document.documentElement.dataset.theme =
  savedTheme && validThemes.has(savedTheme) ? savedTheme : "espresso";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
