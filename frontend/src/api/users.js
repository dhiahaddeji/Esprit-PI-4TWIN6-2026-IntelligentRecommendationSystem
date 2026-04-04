// src/api/users.js
import http from "./http";

export async function getUsers() {
  const { data } = await http.get("/admin/users");
  return data;
}

export async function createUser(payload) {
  const { data } = await http.post("/admin/create-user", payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await http.patch(`/admin/update-user/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  const { data } = await http.delete(`/admin/delete-user/${id}`);
  return data;
}

export async function getUserById(id) {
  const { data } = await http.get(`/admin/user/${id}`);
  return data;
}