import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../styles/layout.css";

export default function MainLayout() {
  return (
    <div className="layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="layoutMain">
        <Topbar />

        <main className="layoutContent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
