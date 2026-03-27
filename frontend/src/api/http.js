// src/api/http.js

import axios from "axios";
import { LS_TOKEN } from "../auth/authService";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
});

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

export default http;