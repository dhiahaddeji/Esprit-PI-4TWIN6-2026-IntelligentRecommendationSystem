import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AccessibilityWidget from "../components/AccessibilityWidget";

import "../styles/layout.css";

export default function MainLayout() {
  return (
    <div className="layout">

      {/* Skip link pour navigation clavier */}
      <a href="#mainContent" className="skipLink">
        Aller au contenu principal
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="layoutMain">
        <Topbar />

        <main
          id="mainContent"
          className="layoutContent"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      {/* Accessibility widget — floating, persisted */}
      <AccessibilityWidget />
    </div>
  );
}