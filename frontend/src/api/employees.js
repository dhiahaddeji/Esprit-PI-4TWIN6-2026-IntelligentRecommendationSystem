import http from "./http"; // ton axios instance avec token

export async function fetchEmployees(params) {
  const { data } = await http.get("/users/employees", { params });
  const items = data?.data ?? data ?? [];
  return {
    data: Array.isArray(items) ? items : [],
    total: data?.total ?? (Array.isArray(items) ? items.length : 0),
    page: data?.page ?? 1,
    limit: data?.limit ?? (Array.isArray(items) ? items.length : 0),
  };
}

export async function fetchEmployeeById(id) {
  const { data } = await http.get(`/users/${id}`);
  return data;
}