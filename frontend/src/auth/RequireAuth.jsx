// src/auth/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { LS_TOKEN, getStoredUser } from "./authService";

// Routes exemptées des redirections onboarding
const ONBOARDING_ROUTES = ["/change-password", "/complete-profile"];

export default function RequireAuth({ children }) {
  const token = localStorage.getItem(LS_TOKEN);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const user = getStoredUser();

  // Ne pas boucler si on est déjà sur une page d'onboarding
  const isOnboarding = ONBOARDING_ROUTES.includes(location.pathname);

  if (!isOnboarding && user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (!isOnboarding && !user?.mustChangePassword && user?.isProfileComplete === false) {
    // Seuls les non-admins doivent compléter leur profil
    if (user?.role !== "SUPERADMIN") {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return children;
}
