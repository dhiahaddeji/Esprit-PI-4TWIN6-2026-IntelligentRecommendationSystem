import http from "./http";

export const rolesApi = {
  list: () => http.get("/roles"),
  updateRole: (roleId, payload) => http.put(`/roles/${roleId}`, payload),
};
