// src/auth/authService.js

import axios from "axios";

// À adapter selon ton environnement
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";  


const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Si tu utilises cookies httpOnly + credentials plus tard :
  // withCredentials: true,
});

export const LS_TOKEN = "access_token";
export const LS_USER = "user";

export async function login({ email, password }) {
  try {
    const response = await api.post("/auth/login", { email, password });
    
    const { accessToken, user } = response.data;
    
    localStorage.setItem(LS_TOKEN, accessToken);
    localStorage.setItem(LS_USER, JSON.stringify(user));
    
    return { accessToken, user };
  } catch (err) {
    // Très important : regarde ce que le backend renvoie vraiment
    console.error("Login error:", err.response?.data, err.message);
    
    const message = err.response?.data?.message 
      || err.response?.data?.error 
      || "Échec de connexion";
      
    throw new Error(message);
  }
}

// export les autres fonctions si besoin (logout, getStoredUser, etc.)
export function getStoredUser() {
  const raw = localStorage.getItem(LS_USER);
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
  // optionnel : api.post("/auth/logout") si tu en as un
}