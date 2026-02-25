// src/auth/RequireRole.jsx
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { getStoredUser } from "./authService";

export default function RequireRole({ allowed = [], children }) {
  const location = useLocation();
  const user = getStoredUser();
  const role = user?.role;

  if (!role) return <Navigate to="/login" replace />;

  if (!allowed.includes(role)) {
    return (
      <Navigate
        to="/not-authorized"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children ? children : <Outlet />;
}