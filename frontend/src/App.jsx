import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import MainLayout from "./layout/MainLayout";

const KeyboardNavController = lazy(() => import("./components/KeyboardNavController"));

// Public pages
const Login               = lazy(() => import("./pages/Login"));
const Register            = lazy(() => import("./pages/Register"));
const NotAuthorized       = lazy(() => import("./pages/NotAuthorized"));
const GitHubCallback      = lazy(() => import("./pages/GitHubCallback"));
const ChangePassword      = lazy(() => import("./pages/ChangePassword"));
const CompleteProfile     = lazy(() => import("./pages/CompleteProfile"));

// Common pages
const Inbox               = lazy(() => import("./pages/Inbox"));
const Dashboard           = lazy(() => import("./pages/Dashboard"));
const Users               = lazy(() => import("./pages/Users"));
const Roles               = lazy(() => import("./pages/Roles"));
const Teams               = lazy(() => import("./pages/Teams"));
const MyProfile           = lazy(() => import("./pages/MyProfile"));
const MyActivities        = lazy(() => import("./pages/MyActivities"));
const Skills              = lazy(() => import("./pages/skills"));

// HR pages
const HRActivities        = lazy(() => import("./pages/hr/HRActivities"));
const HRCreateActivity    = lazy(() => import("./pages/hr/HRCreateActivity"));
const HRActivityWorkflow  = lazy(() => import("./pages/hr/HRActivityWorkflow"));
const HREmployees         = lazy(() => import("./pages/hr/HREmployees"));
const HREmployeeDetail    = lazy(() => import("./pages/hr/HREmployeeDetail"));
const HRDepartments       = lazy(() => import("./pages/hr/HRDepartments"));
const HRChat              = lazy(() => import("./pages/hr/HRChat"));
const HRSkillsDashboard   = lazy(() => import("./pages/hr/HRSkillsDashboard"));

// Manager pages
const ManagerInbox          = lazy(() => import("./pages/manager/ManagerInbox"));
const ManagerReviewActivity = lazy(() => import("./pages/manager/ManagerReviewActivity"));
const ManagerSkillApproval  = lazy(() => import("./pages/manager/ManagerSkillApproval"));

// Employee pages
const EmployeeInvitations     = lazy(() => import("./pages/employee/EmployeeInvitations"));
const EmployeeInvitationDetail = lazy(() => import("./pages/employee/EmployeeInvitationDetail"));
const MyParticipationStatus   = lazy(() => import("./pages/employee/MyParticipationStatus"));
const EmployeeSkills          = lazy(() => import("./pages/employee/EmployeeSkills"));

// Admin pages
const CreateUser = lazy(() => import("./pages/superadmin/CreateUser"));
const UsersList  = lazy(() => import("./pages/superadmin/UsersList"));
const EditUser   = lazy(() => import("./pages/superadmin/EditUser"));
const AdminLogs  = lazy(() => import("./pages/superadmin/AdminLogs"));

const PageLoader = (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={PageLoader}>
      {/* Deferred — keyboard nav does not affect initial render */}
      <Suspense fallback={null}>
        <KeyboardNavController />
      </Suspense>
      <Routes>

        {/* ---------------- PUBLIC ROUTES ---------------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        <Route path="/auth/callback" element={<GitHubCallback />} />
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

          <Route path="dashboard" element={<Dashboard />} />

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

          <Route
            path="roles"
            element={
              <RequireRole allowed={["SUPERADMIN"]}>
                <Roles />
              </RequireRole>
            }
          />

          <Route path="inbox" element={<Inbox />} />
          <Route path="me" element={<MyProfile />} />
          <Route path="my-activities" element={<MyActivities />} />

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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Suspense>
  );
}
