import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";



const savedTheme = localStorage.getItem("theme");
if (savedTheme === "catppuccin" 
  || savedTheme === "espresso" 
  || savedTheme === "latte" 
  || savedTheme === "anilist-dark" 
  || savedTheme === "anilist-light"
  || savedTheme === "black") {
  document.documentElement.dataset.theme = savedTheme;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
