import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Titlebar from "./Titlebar";

export default function Layout() {
  return (
    <div className="app-container">
      {/* 1. Standard application bar stays locked at the absolute window top */}
      <Titlebar />
      
      {/* 2. Main app structural container split below it */}
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}