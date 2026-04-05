import { useAuth } from "../auth/AuthContext";
import { Navigate } from "react-router-dom";

function RoleRoute({ allowed, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowed.includes(user.role))
    return <Navigate to="/login" replace />;

  return children;
}

export default RoleRoute;
