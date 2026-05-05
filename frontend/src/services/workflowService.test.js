import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import http from "../api/http";
import {
  ACTIVITY_STATUS,
  getManagers,
  getEmployees,
  getUserById,
  fetchActivities,
  fetchActivityById,
  hrCreateActivity,
  hrRunAI,
  hrUpdateRecommendationList,
  hrValidateAndForward,
  getRecommendation,
  managerConfirmParticipants,
  managerNotifyEmployees,
  employeeListInvitations,
  employeeGetInvitation,
  employeeRespond,
  employeeParticipationStatus,
} from "./workflowService";

describe("workflowService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("ACTIVITY_STATUS constants", () => {
    it("has expected status values", () => {
      expect(ACTIVITY_STATUS.DRAFT).toBe("DRAFT");
      expect(ACTIVITY_STATUS.AI_SUGGESTED).toBe("AI_SUGGESTED");
      expect(ACTIVITY_STATUS.SENT_TO_MANAGER).toBe("SENT_TO_MANAGER");
    });
  });

  describe("getManagers", () => {
    it("returns managers array", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "m1", role: "MANAGER" }] });
      const result = await getManagers();
      expect(result).toHaveLength(1);
    });

    it("returns empty array for non-array response", async () => {
      http.get.mockResolvedValue({ data: null });
      const result = await getManagers();
      expect(result).toEqual([]);
    });
  });

  describe("getEmployees", () => {
    it("returns employees array", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "e1" }] });
      const result = await getEmployees();
      expect(result).toHaveLength(1);
    });
  });

  describe("getUserById", () => {
    it("fetches user by id", async () => {
      const user = { _id: "u1", name: "Alice" };
      http.get.mockResolvedValue({ data: user });
      const result = await getUserById("u1");
      expect(http.get).toHaveBeenCalledWith("/users/u1");
      expect(result).toEqual(user);
    });

    it("throws when id is missing", async () => {
      await expect(getUserById(null)).rejects.toThrow("Missing user id");
    });
  });

  describe("fetchActivities", () => {
    it("returns activities", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "a1" }] });
      const result = await fetchActivities();
      expect(result).toHaveLength(1);
    });

    it("returns empty array for non-array", async () => {
      http.get.mockResolvedValue({ data: null });
      const result = await fetchActivities();
      expect(result).toEqual([]);
    });
  });

  describe("fetchActivityById", () => {
    it("fetches activity by id", async () => {
      http.get.mockResolvedValue({ data: { _id: "a1" } });
      const result = await fetchActivityById("a1");
      expect(result).toEqual({ _id: "a1" });
    });

    it("throws when id is missing", async () => {
      await expect(fetchActivityById(null)).rejects.toThrow("Missing activity id");
    });
  });

  describe("hrCreateActivity", () => {
    it("creates activity", async () => {
      http.post.mockResolvedValue({ data: { _id: "a1" } });
      const result = await hrCreateActivity({ title: "Test" });
      expect(http.post).toHaveBeenCalledWith("/activities", { title: "Test" });
      expect(result).toEqual({ _id: "a1" });
    });
  });

  describe("hrRunAI", () => {
    it("runs AI for activity", async () => {
      http.post.mockResolvedValue({ data: { list: [] } });
      const result = await hrRunAI("a1");
      expect(http.post).toHaveBeenCalledWith("/recommendations/a1/run-ai");
      expect(result).toEqual({ list: [] });
    });

    it("throws when activityId is missing", async () => {
      await expect(hrRunAI(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("hrUpdateRecommendationList", () => {
    it("updates recommendation list", async () => {
      http.patch.mockResolvedValue({ data: { updated: true } });
      const result = await hrUpdateRecommendationList("a1", [{ employeeId: "e1" }]);
      expect(http.patch).toHaveBeenCalledWith("/recommendations/a1", { list: [{ employeeId: "e1" }] });
      expect(result).toEqual({ updated: true });
    });

    it("throws when activityId is missing", async () => {
      await expect(hrUpdateRecommendationList(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("hrValidateAndForward", () => {
    it("validates and forwards", async () => {
      http.patch.mockResolvedValue({ data: { validated: true } });
      const result = await hrValidateAndForward("a1");
      expect(http.patch).toHaveBeenCalledWith("/recommendations/a1/validate");
      expect(result).toEqual({ validated: true });
    });

    it("throws when activityId is missing", async () => {
      await expect(hrValidateAndForward(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("getRecommendation", () => {
    it("gets recommendation for activity", async () => {
      http.get.mockResolvedValue({ data: { list: [] } });
      const result = await getRecommendation("a1");
      expect(http.get).toHaveBeenCalledWith("/recommendations/a1");
      expect(result).toEqual({ list: [] });
    });

    it("throws when activityId is missing", async () => {
      await expect(getRecommendation(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("managerConfirmParticipants", () => {
    it("confirms participants", async () => {
      http.patch.mockResolvedValue({ data: { confirmed: true } });
      const result = await managerConfirmParticipants("a1", ["e1", "e2"]);
      expect(http.patch).toHaveBeenCalledWith("/activities/a1/confirm", { participants: ["e1", "e2"] });
      expect(result).toEqual({ confirmed: true });
    });

    it("handles empty participants", async () => {
      http.patch.mockResolvedValue({ data: {} });
      await managerConfirmParticipants("a1", []);
      expect(http.patch).toHaveBeenCalledWith("/activities/a1/confirm", { participants: [] });
    });

    it("throws when activityId is missing", async () => {
      await expect(managerConfirmParticipants(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("managerNotifyEmployees", () => {
    it("notifies employees", async () => {
      http.post.mockResolvedValue({ data: { notified: true } });
      const result = await managerNotifyEmployees("a1", ["e1"]);
      expect(http.post).toHaveBeenCalledWith("/invitations/a1/notify", { employeeIds: ["e1"] });
      expect(result).toEqual({ notified: true });
    });

    it("throws when activityId is missing", async () => {
      await expect(managerNotifyEmployees(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("employeeListInvitations", () => {
    it("returns invitations array", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "inv1" }] });
      const result = await employeeListInvitations();
      expect(result).toHaveLength(1);
    });

    it("returns empty array for non-array", async () => {
      http.get.mockResolvedValue({ data: null });
      const result = await employeeListInvitations();
      expect(result).toEqual([]);
    });
  });

  describe("employeeGetInvitation", () => {
    it("gets invitation by id", async () => {
      http.get.mockResolvedValue({ data: { _id: "inv1" } });
      const result = await employeeGetInvitation("inv1");
      expect(result).toEqual({ _id: "inv1" });
    });

    it("throws when id is missing", async () => {
      await expect(employeeGetInvitation(null)).rejects.toThrow("Missing invitation id");
    });
  });

  describe("employeeRespond", () => {
    it("responds to invitation", async () => {
      http.patch.mockResolvedValue({ data: { responded: true } });
      const result = await employeeRespond("inv1", { decision: "ACCEPTED", justification: "" });
      expect(http.patch).toHaveBeenCalledWith("/invitations/inv1/respond", {
        decision: "ACCEPTED",
        justification: "",
      });
      expect(result).toEqual({ responded: true });
    });

    it("throws when invitationId is missing", async () => {
      await expect(employeeRespond(null, { decision: "ACCEPTED" })).rejects.toThrow("Missing invitation id");
    });
  });

  describe("employeeParticipationStatus", () => {
    it("returns participations array", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "p1" }] });
      const result = await employeeParticipationStatus();
      expect(result).toHaveLength(1);
    });

    it("returns empty array for non-array", async () => {
      http.get.mockResolvedValue({ data: null });
      const result = await employeeParticipationStatus();
      expect(result).toEqual([]);
    });
  });
});
