import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

import MainLayout from "./layout/MainLayout";

// ✅ navigation clavier
import useKeyboardNavigation from "./hooks/useKeyboardNavigation";

// Public pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotAuthorized from "./pages/NotAuthorized";
import GitHubCallback from "./pages/GitHubCallback";
import ChangePassword from "./pages/ChangePassword";
import CompleteProfile from "./pages/CompleteProfile";

// Common pages
import Inbox from "./pages/Inbox";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Teams from "./pages/Teams";
import MyProfile from "./pages/MyProfile";
import MyActivities from "./pages/MyActivities";
import Skills from "./pages/skills";

// HR pages
import HRActivities from "./pages/hr/HRActivities";
import HRCreateActivity from "./pages/hr/HRCreateActivity";
import HRActivityWorkflow from "./pages/hr/HRActivityWorkflow";
import HREmployees from "./pages/hr/HREmployees";
import HREmployeeDetail from "./pages/hr/HREmployeeDetail";
import HRDepartments from "./pages/hr/HRDepartments";
import HRChat from "./pages/hr/HRChat";
import HRSkillsDashboard from "./pages/hr/HRSkillsDashboard";

// Manager pages
import ManagerInbox from "./pages/manager/ManagerInbox";
import ManagerReviewActivity from "./pages/manager/ManagerReviewActivity";
import ManagerSkillApproval from "./pages/manager/ManagerSkillApproval";

// Employee pages
import EmployeeInvitations from "./pages/employee/EmployeeInvitations";
import EmployeeInvitationDetail from "./pages/employee/EmployeeInvitationDetail";
import MyParticipationStatus from "./pages/employee/MyParticipationStatus";
import EmployeeSkills from "./pages/employee/EmployeeSkills";

// Admin pages
import CreateUser from "./pages/superadmin/CreateUser";
import UsersList from "./pages/superadmin/UsersList";
import EditUser from "./pages/superadmin/EditUser";
import AdminLogs from "./pages/superadmin/AdminLogs";

export default function App() {

  // ✅ activation navigation clavier globale
  useKeyboardNavigation();

  return (
    <Routes>

      {/* ---------------- PUBLIC ROUTES ---------------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* GitHub OAuth callback (public — pas de layout) */}
      <Route path="/auth/callback" element={<GitHubCallback />} />

      {/* Onboarding — nécessite un token mais pas le layout complet */}
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* ---------------- PROTECTED ROUTES ---------------- */}
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Shared (HR/ADMIN/MANAGER) */}
        <Route
          path="users"
          element={
            <RequireRole allowed={["SUPERADMIN", "HR", "MANAGER"]}>
              <Users />
            </RequireRole>
          }
        />

        <Route
          path="teams"
          element={
            <RequireRole allowed={["SUPERADMIN", "HR", "MANAGER"]}>
              <Teams />
            </RequireRole>
          }
        />

        {/* Admin-only */}
        <Route
          path="roles"
          element={
            <RequireRole allowed={["SUPERADMIN"]}>
              <Roles />
            </RequireRole>
          }
        />

        {/* Messaging — all roles */}
        <Route path="inbox" element={<Inbox />} />

        {/* Personal */}
        <Route path="me" element={<MyProfile />} />
        <Route path="my-activities" element={<MyActivities />} />

        {/* Employee skills */}
        <Route
          path="skills"
          element={
            <RequireRole allowed={["EMPLOYEE"]}>
              <Skills />
            </RequireRole>
          }
        />

        {/* ---------------- HR ROUTES ---------------- */}

        <Route
          path="hr/activities"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HRActivities />
            </RequireRole>
          }
        />

        <Route
          path="hr/activities/new"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HRCreateActivity />
            </RequireRole>
          }
        />

        <Route
          path="hr/activities/:id"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HRActivityWorkflow />
            </RequireRole>
          }
        />

        <Route
          path="hr/employees"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HREmployees />
            </RequireRole>
          }
        />

        <Route
          path="hr/employees/:id"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HREmployeeDetail />
            </RequireRole>
          }
        />

        <Route
          path="hr/departments"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HRDepartments />
            </RequireRole>
          }
        />

        {/* ---------------- HR ROUTES (AI + Skills Dashboard) ---------------- */}

        <Route
          path="hr/ai-chat"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN"]}>
              <HRChat />
            </RequireRole>
          }
        />

        <Route
          path="hr/skills-dashboard"
          element={
            <RequireRole allowed={["HR", "SUPERADMIN", "MANAGER"]}>
              <HRSkillsDashboard />
            </RequireRole>
          }
        />

        {/* ---------------- MANAGER ROUTES ---------------- */}

        <Route
          path="manager/inbox"
          element={
            <RequireRole allowed={["MANAGER", "SUPERADMIN"]}>
              <ManagerInbox />
            </RequireRole>
          }
        />

        <Route
          path="manager/activities/:id"
          element={
            <RequireRole allowed={["MANAGER", "SUPERADMIN"]}>
              <ManagerReviewActivity />
            </RequireRole>
          }
        />

        <Route
          path="manager/skills"
          element={
            <RequireRole allowed={["MANAGER", "SUPERADMIN"]}>
              <ManagerSkillApproval />
            </RequireRole>
          }
        />

        {/* ---------------- EMPLOYEE ROUTES ---------------- */}

        <Route
          path="employee/invitations"
          element={
            <RequireRole allowed={["EMPLOYEE"]}>
              <EmployeeInvitations />
            </RequireRole>
          }
        />

        <Route
          path="employee/invitations/:id"
          element={
            <RequireRole allowed={["EMPLOYEE"]}>
              <EmployeeInvitationDetail />
            </RequireRole>
          }
        />

        <Route
          path="employee/participations"
          element={
            <RequireRole allowed={["EMPLOYEE"]}>
              <MyParticipationStatus />
            </RequireRole>
          }
        />

        <Route
          path="employee/skills"
          element={
            <RequireRole allowed={["EMPLOYEE"]}>
              <EmployeeSkills />
            </RequireRole>
          }
        />

        {/* ---------------- ADMIN ROUTES ---------------- */}

        <Route
          path="admin/create-user"
          element={
            <RequireRole allowed={["SUPERADMIN"]}>
              <CreateUser />
            </RequireRole>
          }
        />

        <Route
          path="admin/users"
          element={
            <RequireRole allowed={["SUPERADMIN", "HR", "MANAGER"]}>
              <UsersList />
            </RequireRole>
          }
        />

        <Route
          path="admin/edit-user/:id"
          element={
            <RequireRole allowed={["SUPERADMIN"]}>
              <EditUser />
            </RequireRole>
          }
        />

        <Route
          path="admin/logs"
          element={
            <RequireRole allowed={["SUPERADMIN"]}>
              <AdminLogs />
            </RequireRole>
          }
        />

        {/* fallback inside protected layout */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Route>

      {/* fallback global */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}