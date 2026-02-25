function RoleRoute({ allowed, children }) {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowed.includes(user.role))
    return <Navigate to="/login" replace />;

  return children;
}
