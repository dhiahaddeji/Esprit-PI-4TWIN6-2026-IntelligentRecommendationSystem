import http from "./http";

export const teamsApi = {
  list: () => http.get("/teams"),
  create: (payload) => http.post("/teams", payload),
  update: (id, payload) => http.put(`/teams/${id}`, payload),
  remove: (id) => http.delete(`/teams/${id}`),
};
