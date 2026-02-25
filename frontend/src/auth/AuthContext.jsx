import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as auth from "./authService";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.getStoredUser());

  useEffect(() => {
    setUser(auth.getStoredUser());
  }, []);

  const value = useMemo(
    () => ({
      user,
      login: async (payload) => {
        const res = await auth.login(payload);
        setUser(res.user);
        return res;
      },
      register: async (payload) => {
        const res = await auth.register(payload);
        setUser(res.user);
        return res;
      },
      logout: () => {
        auth.logout();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
