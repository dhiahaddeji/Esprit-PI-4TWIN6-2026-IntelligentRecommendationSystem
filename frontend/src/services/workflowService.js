import http from "../api/http";

export const ACTIVITY_STATUS = {
  DRAFT: "DRAFT",
  AI_SUGGESTED: "AI_SUGGESTED",
  HR_VALIDATED: "HR_VALIDATED",
  SENT_TO_MANAGER: "SENT_TO_MANAGER",
  MANAGER_CONFIRMED: "MANAGER_CONFIRMED",
  NOTIFIED: "NOTIFIED",
};

/* ---------------- USERS ---------------- */
export async function getManagers() {
  const { data } = await http.get("/users/managers");
  return Array.isArray(data) ? data : [];
}

export async function getEmployees() {
  const { data } = await http.get("/users/employees");
  return Array.isArray(data) ? data : [];
}

export async function getUserById(id) {
  if (!id) throw new Error("Missing user id");
  const { data } = await http.get(`/users/${id}`);
  return data;
}

/* ---------------- ACTIVITIES ---------------- */
export async function fetchActivities() {
  const { data } = await http.get("/activities");
  return Array.isArray(data) ? data : [];
}

export async function fetchActivityById(id) {
  if (!id) throw new Error("Missing activity id");
  const { data } = await http.get(`/activities/${id}`);
  return data;
}

/* ✅ ALIAS pour anciens imports */
export const listActivitiesForRole = fetchActivities;
export const getActivityById = fetchActivityById;

/* ---------------- HR FLOW ---------------- */
export async function hrCreateActivity(payload) {
  const { data } = await http.post("/activities", payload);
  return data;
}

export async function hrRunAI(activityId) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.post(`/recommendations/${activityId}/run-ai`);
  return data;
}

export async function hrUpdateRecommendationList(activityId, list) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.patch(`/recommendations/${activityId}`, { list });
  return data;
}

export async function hrValidateAndForward(activityId) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.patch(`/recommendations/${activityId}/validate`);
  return data;
}

export async function getRecommendation(activityId) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.get(`/recommendations/${activityId}`);
  return data;
}

/* ---------------- MANAGER FLOW ---------------- */
export async function managerConfirmParticipants(activityId, participantIds) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.patch(`/activities/${activityId}/confirm`, {
    participants: participantIds || [],
  });
  return data;
}

export async function managerNotifyEmployees(activityId, employeeIds) {
  if (!activityId) throw new Error("Missing activityId");
  const { data } = await http.post(`/invitations/${activityId}/notify`, {
    employeeIds: employeeIds || [],
  });
  return data;
}

/* ---------------- EMPLOYEE FLOW ---------------- */
export async function employeeListInvitations() {
  const { data } = await http.get("/invitations/me");
  return Array.isArray(data) ? data : [];
}

export async function employeeGetInvitation(id) {
  if (!id) throw new Error("Missing invitation id");
  const { data } = await http.get(`/invitations/${id}`);
  return data;
}

export async function employeeRespond(invitationId, { decision, justification }) {
  if (!invitationId) throw new Error("Missing invitation id");
  const { data } = await http.patch(`/invitations/${invitationId}/respond`, {
    decision,
    justification,
  });
  return data;
}

export async function employeeParticipationStatus() {
  const { data } = await http.get("/participations/me");
  return Array.isArray(data) ? data : [];
}