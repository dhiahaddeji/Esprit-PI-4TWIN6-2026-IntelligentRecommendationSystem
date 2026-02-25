import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // http://localhost:3000
  // withCredentials: true // 🔹 supprime si tu n’utilises pas de cookies
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  console.log("🔍 Token from localStorage:", token ? '✅ Found' : '❌ Not found');
  console.log("🔍 All localStorage keys:", Object.keys(localStorage));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Token added to request");
  } else {
    console.error("❌ No token found in localStorage!");
  }
  return config;
});

export default http;