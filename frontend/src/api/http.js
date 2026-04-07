// src/api/http.js

import axios from "axios";
import { LS_TOKEN, logout } from "../auth/authService";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const http = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise = null;

function needsRefresh(url = "") {
  return ![
    "/auth/login",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
  ].some((path) => url.includes(path));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then((res) => {
        const token = res?.data?.accessToken;
        if (token) localStorage.setItem(LS_TOKEN, token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/* ---------------------------------- */
/* Interceptor token                  */
/* ---------------------------------- */

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(LS_TOKEN);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config;

    if (status === 401 && original && !original._retry && needsRefresh(original.url)) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers = {
            ...original.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return http(original);
        }
      } catch {
        // Fall through to logout
      }
    }

    if (status === 401) {
      logout();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export default http;