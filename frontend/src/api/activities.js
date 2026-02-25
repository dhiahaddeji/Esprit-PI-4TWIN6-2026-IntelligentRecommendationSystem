import http from "./http";

export const activitiesApi = {
  listMy: () => http.get("/activities"),                      // HR: list created / Manager: assigned / Employee: visible
  create: (payload) => http.post("/activities", payload),
  getById: (id) => http.get(`/activities/${id}`),
  update: (id, payload) => http.put(`/activities/${id}`, payload),

  runAI: (id) => http.post(`/activities/${id}/recommend`),    // HR: AI suggestions
  updateFinalList: (id, payload) => http.put(`/activities/${id}/recommendations`, payload), // HR modifies list
  forwardToManager: (id) => http.post(`/activities/${id}/forward`),

  managerConfirm: (id, payload) => http.post(`/activities/${id}/manager-confirm`, payload),
  notifyEmployees: (id) => http.post(`/activities/${id}/notify`),
};
