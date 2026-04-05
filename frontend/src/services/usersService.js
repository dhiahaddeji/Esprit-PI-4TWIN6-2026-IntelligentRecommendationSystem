import http from "../api/http";

export async function fetchManagers() {
  const res = await http.get("/users/managers");
  return res.data;
}

export async function fetchEmployees() {
  const res = await http.get("/users/employees");
  return res.data;
}
export async function fetchUsers() {
  const { data } = await http.get("/users");
  return data;
}