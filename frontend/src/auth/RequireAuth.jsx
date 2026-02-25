// src/auth/RequireAuth.jsx
import { Navigate } from "react-router-dom";
import { LS_TOKEN } from "./authService";

export default function RequireAuth({ children }) {
  const token = localStorage.getItem(LS_TOKEN);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}