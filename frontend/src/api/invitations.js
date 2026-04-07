import http from "./http";

export const invitationsApi = {
  myInvitations: () => http.get("/me/invitations"),
  invitationById: (id) => http.get(`/me/invitations/${id}`),
  accept: (id) => http.post(`/me/invitations/${id}/accept`),
  decline: (id, payload) => http.post(`/me/invitations/${id}/decline`, payload), // {reason}
  myParticipations: () => http.get("/me/participations"),
};
