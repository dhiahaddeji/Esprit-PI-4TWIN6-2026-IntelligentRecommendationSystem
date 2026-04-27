import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../styles/layout.css";

const AccessibilityWidget = lazy(() => import("../components/AccessibilityWidget"));

export default function MainLayout() {
  return (
    <div className="layout">

      {/* Skip link pour navigation clavier */}
      <a href="#mainContent" className="skipLink">
        Aller au contenu principal
      </a>

      <Sidebar />

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

      {/* Deferred — not needed for initial render */}
      <Suspense fallback={null}>
        <AccessibilityWidget />
      </Suspense>
    </div>
  );
}
