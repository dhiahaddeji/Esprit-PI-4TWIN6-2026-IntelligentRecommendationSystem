const useMock = (import.meta.env.VITE_USE_MOCK || "false") === "true";

const mockActivities = [
  { id: "A1", title: "Formation IFRS 17", status: "AI_SUGGESTED", managerName: "Manager 1", date: "2026-03-01", seats: 5 },
  { id: "A2", title: "Audit interne", status: "SENT_TO_MANAGER", managerName: "Manager 2", date: "2026-03-08", seats: 3 },
];

const mockRecommendations = [
  { employeeId: "E1", name: "Employee One", score: 0.92, reason: "Strong skills match" },
  { employeeId: "E2", name: "Employee Two", score: 0.86, reason: "Good experience fit" },
];

const mockInvitations = [
  { id: "I1", activityId: "A2", title: "Audit interne", status: "PENDING", date: "2026-03-08" },
];

export async function safeCall(apiFn, fallback) {
  if (!useMock) return apiFn();

  // mock mode: return fallback with same shape as axios
  return { data: fallback };
}

export const mocks = {
  activities: mockActivities,
  recommendations: mockRecommendations,
  invitations: mockInvitations,
  participations: [{ id: "P1", title: "Audit interne", status: "PENDING" }],
};
