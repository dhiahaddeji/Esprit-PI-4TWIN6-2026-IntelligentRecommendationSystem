// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { getStoredUser } from "../auth/authService";
import "../styles/sidebar.css";

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR:         "Responsable RH",
  MANAGER:    "Manager",
  EMPLOYEE:   "Employé",
};

export default function Sidebar() {
  let user = null;
  try { user = getStoredUser(); } catch {}

  const role = user?.role || null;
  const cls  = ({ isActive }) => "menuItem" + (isActive ? " active" : "");

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
        <NavLink className={cls} to="/dashboard">📊 Tableau de bord</NavLink>

        {/* ── SUPERADMIN ─────────────────────────── */}
        {role === "SUPERADMIN" && (
          <>
            <div className="menuSection">Administration</div>
            <NavLink className={cls} to="/admin/create-user">➕ Créer un compte</NavLink>
            <NavLink className={cls} to="/admin/users">👥 Liste des comptes</NavLink>
          </>
        )}

        {/* ── HR ────────────────────────────────── */}
        {role === "HR" && (
          <>
            <div className="menuSection">Ressources Humaines</div>
            <NavLink className={cls} to="/hr/employees">👥 Employés</NavLink>
            <NavLink className={cls} to="/hr/activities">📅 Activités</NavLink>
            <NavLink className={cls} to="/hr/activities/new">➕ Créer une activité</NavLink>
            <NavLink className={cls} to="/hr/departments">🏢 Départements</NavLink>
            <NavLink className={cls} to="/admin/users">📋 Liste des comptes</NavLink>
            <div className="menuSection">Intelligence IA</div>
            <NavLink className={cls} to="/hr/skills-dashboard">📊 Dashboard compétences</NavLink>
            <NavLink className={cls} to="/hr/ai-chat">🤖 Assistant IA</NavLink>
          </>
        )}

        {/* ── MANAGER ───────────────────────────── */}
        {role === "MANAGER" && (
          <>
            <div className="menuSection">Manager</div>
            <NavLink className={cls} to="/manager/inbox">📥 Approbations</NavLink>
            <NavLink className={cls} to="/admin/users">📋 Liste des comptes</NavLink>
            <div className="menuSection">Compétences</div>
            <NavLink className={cls} to="/manager/skills">🎯 Validation compétences</NavLink>
            <NavLink className={cls} to="/hr/skills-dashboard">📊 Dashboard compétences</NavLink>
          </>
        )}

        {/* ── EMPLOYEE ──────────────────────────── */}
        {role === "EMPLOYEE" && (
          <>
            <div className="menuSection">Mon espace</div>
            <NavLink className={cls} to="/employee/invitations">🔔 Mes invitations</NavLink>
            <NavLink className={cls} to="/employee/participations">✅ Mes participations</NavLink>
            <div className="menuSection">Profil</div>
            <NavLink className={cls} to="/employee/skills">🎯 Mes compétences</NavLink>
          </>
        )}

        {/* ── Common ────────────────────────────── */}
        <div className="menuSection">Mon compte</div>
        <NavLink className={cls} to="/me">👤 Mon profil</NavLink>
      </nav>

      {role && (
        <div className="sidebarFooter">
          <span className="roleTag">{ROLE_LABELS[role] || role}</span>
        </div>
      )}
    </aside>
  );
}
