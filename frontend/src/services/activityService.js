import http from "../api/http";

export async function fetchActivities() {
  const res = await http.get("/activities");
  return res.data;
}

export async function fetchActivitiesPage(params) {
  const res = await http.get("/activities", { params });
  const items = res.data?.data ?? res.data ?? [];
  return {
    data: Array.isArray(items) ? items : [],
    total: res.data?.total ?? (Array.isArray(items) ? items.length : 0),
    page: res.data?.page ?? 1,
    limit: res.data?.limit ?? (Array.isArray(items) ? items.length : 0),
  };
}

export async function createActivity(payload) {
  const res = await http.post("/activities", payload);
  return res.data;
}

export async function fetchActivityById(id) {
  const res = await http.get(`/activities/${id}`);
  return res.data;
}