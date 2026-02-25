// src/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { getStoredUser } from "../auth/authService";
import "../styles/sidebar.css";

export default function Sidebar() {
  let user = null;

  try {
    user = getStoredUser();
  } catch (err) {
    console.error("Erreur getStoredUser:", err);
  }

  const role = user?.role || null;

  const cls = ({ isActive }) => "menuItem" + (isActive ? " active" : "");

  // Fonction pour afficher le rôle joliment (optionnel mais utile)
  const getRoleDisplay = () => {
    switch (role) {
      case "ADMIN": return "Admin";
      case "HR": return "RH";
      case "MANAGER": return "Manager";
      case "EMPLOYEE": return "Employé";
      default: return "Invité";
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandLogo">🛡️</div>
        <div>
          <div className="brandName">AssurReco</div>
          <div className="brandSub">Recommandation IA</div>
        </div>
      </div>

      <nav className="menu">
        <NavLink className={cls} to="/dashboard">
          Tableau de bord
        </NavLink>

        {/* ADMIN : affiche ses menus */}
        {role === "ADMIN" && (
          <>
            <div className="menuSection">Administration</div>
            <NavLink className={cls} to="/admin/create-user">
              Créer un compte
            </NavLink>
            <NavLink className={cls} to="/admin/users">
              Liste des comptes
            </NavLink>
          </>
        )}

        {/* HR */}
        {role === "HR" && (
          <>
            <div className="menuSection">HR</div>
            <NavLink className={cls} to="/hr/activities">
              Activités
            </NavLink>
            <NavLink className={cls} to="/hr/activities/new">
              Créer activité
            </NavLink>
          </>
        )}

        {/* MANAGER */}
        {role === "MANAGER" && (
          <>
            <div className="menuSection">Manager</div>
            <NavLink className={cls} to="/manager/inbox">
              Approbations
            </NavLink>
          </>
        )}

        {/* EMPLOYEE */}
        {role === "EMPLOYEE" && (
          <>
            <div className="menuSection">Employé</div>
            <NavLink className={cls} to="/employee/invitations">
              Notifications
            </NavLink>
            <NavLink className={cls} to="/employee/participations">
              Statut participation
            </NavLink>
          </>
        )}
      </nav>

      {role && (
        <div className="sidebarFooter">
          <span className="roleTag">{getRoleDisplay()}</span> {/* ← affichage propre */}
        </div>
      )}
    </aside>
  );
}