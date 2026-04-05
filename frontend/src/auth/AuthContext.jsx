/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import * as auth from "./authService";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.getStoredUser());

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

      /** Appelé depuis ChangePassword — met à jour le flag en mémoire */
      changePassword: async (newPassword) => {
        const res = await auth.changePassword(newPassword);
        // Mettre à jour le flag localement sans nouvel appel /me
        const updated = { ...user, mustChangePassword: false };
        localStorage.setItem(auth.LS_USER, JSON.stringify(updated));
        setUser(updated);
        return res;
      },

      /** Appelé depuis CompleteProfile */
      completeProfile: async (formData) => {
        const res = await auth.completeProfile(formData);
        if (res.user) {
          const updated = { ...user, ...res.user, isProfileComplete: true };
          localStorage.setItem(auth.LS_USER, JSON.stringify(updated));
          setUser(updated);
        }
        return res;
      },

      /** Mise à jour directe du state utilisateur (ex: retour GitHub callback) */
      setUserFromStorage: () => {
        const stored = auth.getStoredUser();
        setUser(stored);
      },
    }),
    [user],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
