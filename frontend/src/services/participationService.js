import http from "../api/http";

export async function fetchMyParticipations() {
  const res = await http.get("/participations/me");
  return res.data; // doit être un tableau
}