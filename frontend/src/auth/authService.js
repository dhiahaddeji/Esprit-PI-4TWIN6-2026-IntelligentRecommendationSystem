// src/auth/authService.js

import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const LS_TOKEN = "access_token";
export const LS_USER  = "user";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Injecter le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(LS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function extractErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

// ── Persistance ────────────────────────────────────────────────────────

function persistAuth({ accessToken, token, user }) {
  const finalToken = accessToken || token;
  if (finalToken) localStorage.setItem(LS_TOKEN, finalToken);
  if (user)       localStorage.setItem(LS_USER, JSON.stringify(user));
  return { accessToken: finalToken, user };
}

// ── Auth API ───────────────────────────────────────────────────────────

export async function login({ email, password }) {
  try {
    const res = await api.post("/auth/login", { email, password });
    return persistAuth(res.data);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Échec de connexion"));
  }
}

export async function register({ name, email, password, role }) {
  try {
    const res = await api.post("/auth/register", { name, email, password, role });
    return persistAuth(res.data);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Échec d'inscription"));
  }
}

/** Changer le mot de passe temporaire */
export async function changePassword(newPassword) {
  try {
    const res = await api.post("/auth/change-password", { newPassword });
    return res.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Échec du changement de mot de passe"));
  }
}

/** Compléter le profil (multipart/form-data) */
export async function completeProfile(formData) {
  try {
    const res = await api.post("/auth/complete-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Mettre à jour l'utilisateur en localStorage
    if (res.data.user) {
      const current = getStoredUser() || {};
      const updated = { ...current, ...res.data.user };
      localStorage.setItem(LS_USER, JSON.stringify(updated));
    }
    return res.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Échec de la complétion du profil"));
  }
}

// ── Helpers utilisateur ────────────────────────────────────────────────

export function getStoredUser() {
  const raw = localStorage.getItem(LS_USER);
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    const user = JSON.parse(raw);
    return {
      ...user,
      id: user.id || user.userId,
      userId: user.userId || user.id,
      role: user.role?.toUpperCase(),
    };
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem(LS_TOKEN);
}

export function logout() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}
