import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

import MainLayout from "./layout/MainLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Teams from "./pages/Teams";
import MyProfile from "./pages/MyProfile";
import MyActivities from "./pages/MyActivities";
import NotAuthorized from "./pages/NotAuthorized";

import HRActivities from "./pages/hr/HRActivities";
import HRCreateActivity from "./pages/hr/HRCreateActivity";
import HRActivityWorkflow from "./pages/hr/HRActivityWorkflow";
import HREmployees from "./pages/hr/HREmployees";
import HREmployeeDetail from "./pages/hr/HREmployeeDetail";

import ManagerInbox from "./pages/manager/ManagerInbox";
import ManagerReviewActivity from "./pages/manager/ManagerReviewActivity";

import EmployeeInvitations from "./pages/employee/EmployeeInvitations";
import EmployeeInvitationDetail from "./pages/employee/EmployeeInvitationDetail";
import MyParticipationStatus from "./pages/employee/MyParticipationStatus";

import Skills from "./pages/skills";

// Pages admin
import CreateUser from "./pages/superadmin/CreateUser";
import UsersList from "./pages/superadmin/UsersList";
import EditUser from "./pages/superadmin/EditUser"; // ✅ NOUVEAU : Import du composant EditUser

export default function App() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* Routes protégées */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="users" element={<RequireRole allowed={["ADMIN", "HR", "MANAGER"]}><Users /></RequireRole>} />
        <Route path="teams" element={<RequireRole allowed={["ADMIN", "HR", "MANAGER"]}><Teams /></RequireRole>} />
        <Route path="roles" element={<RequireRole allowed={["ADMIN"]}><Roles /></RequireRole>} />
        
        <Route path="me" element={<MyProfile />} />
        <Route path="my-activities" element={<MyActivities />} />
        <Route path="skills" element={<RequireRole allowed={["EMPLOYEE"]}><Skills /></RequireRole>} />

        {/* Routes HR */}
        <Route path="hr/activities" element={<RequireRole allowed={["HR", "ADMIN", "MANAGER"]}><HRActivities /></RequireRole>} />
        <Route path="hr/activities/new" element={<RequireRole allowed={["HR", "ADMIN", "MANAGER"]}><HRCreateActivity /></RequireRole>} />
        <Route path="hr/activities/:id" element={<RequireRole allowed={["HR", "ADMIN", "MANAGER"]}><HRActivityWorkflow /></RequireRole>} />
        <Route path="hr/employees" element={<RequireRole allowed={["HR", "ADMIN", "MANAGER"]}><HREmployees /></RequireRole>} />
        <Route path="hr/employees/:id" element={<RequireRole allowed={["HR", "ADMIN", "MANAGER"]}><HREmployeeDetail /></RequireRole>} />

        {/* Routes Manager */}
        <Route path="manager/inbox" element={<RequireRole allowed={["MANAGER", "ADMIN"]}><ManagerInbox /></RequireRole>} />
        <Route path="manager/activities/:id" element={<RequireRole allowed={["MANAGER", "ADMIN"]}><ManagerReviewActivity /></RequireRole>} />

        {/* Routes Employee */}
        <Route path="employee/invitations" element={<RequireRole allowed={["EMPLOYEE", "ADMIN", "MANAGER"]}><EmployeeInvitations /></RequireRole>} />
        <Route path="employee/invitations/:id" element={<RequireRole allowed={["EMPLOYEE", "ADMIN", "MANAGER"]}><EmployeeInvitationDetail /></RequireRole>} />
        <Route path="employee/participations" element={<RequireRole allowed={["EMPLOYEE", "ADMIN", "MANAGER"]}><MyParticipationStatus /></RequireRole>} />

        {/* ✅ CORRECTION : Routes ADMIN avec la bonne syntaxe */}
        <Route path="admin/create-user" element={
          <RequireRole allowed={["ADMIN"]}>
            <CreateUser />
          </RequireRole>
        } />
        
        <Route path="admin/users" element={
          <RequireRole allowed={["ADMIN"]}>
            <UsersList />
          </RequireRole>
        } />

        {/* ✅ NOUVEAU : Route pour modifier un utilisateur */}
        <Route path="admin/edit-user/:id" element={
          <RequireRole allowed={["ADMIN"]}>
            <EditUser />
          </RequireRole>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}