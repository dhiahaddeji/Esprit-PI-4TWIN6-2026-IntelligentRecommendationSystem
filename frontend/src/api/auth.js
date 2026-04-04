import http from "./http";

export const authApi = {
  login: (payload) => http.post("/auth/login", payload), // {email,password} -> {accessToken,user}
  googleLogin: (payload) => http.post("/auth/google", payload), // {credential} or {code} -> {accessToken,user}
  me: () => http.get("/auth/me"), // -> user
  logout: () => http.post("/auth/logout"),
};
