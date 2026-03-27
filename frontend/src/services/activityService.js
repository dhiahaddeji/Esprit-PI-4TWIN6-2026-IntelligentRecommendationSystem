import http from "../api/http";

export async function fetchActivities() {
  const res = await http.get("/activities");
  return res.data;
}

export async function createActivity(payload) {
  const res = await http.post("/activities", payload);
  return res.data;
}

export async function fetchActivityById(id) {
  const res = await http.get(`/activities/${id}`);
  return res.data;
}