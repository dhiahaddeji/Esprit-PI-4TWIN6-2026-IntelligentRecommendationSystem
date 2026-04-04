import http from "./http"; // ton axios instance avec token

export async function fetchEmployees() {
  const { data } = await http.get("/employees"); 
  return data;
}

export async function fetchEmployeeById(id) {
  const { data } = await http.get(`/employees/${id}`);
  return data;
}