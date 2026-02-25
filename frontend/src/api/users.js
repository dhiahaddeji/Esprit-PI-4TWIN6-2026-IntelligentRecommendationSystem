import http from "./http";

export const usersApi = {
  list: (params) => http.get("/users", { params }),
  create: (payload) => http.post("/users", payload),
  update: (id, payload) => http.put(`/users/${id}`, payload),
  remove: (id) => http.delete(`/users/${id}`),
};
