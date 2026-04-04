import http from "../api/http"; // your axios instance that adds Bearer token

export async function fetchMyInvitations() {
  const res = await http.get("/invitations/me");
  return res.data; // array
}