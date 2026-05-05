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
  getRecommendation,
  hrUpdateRecommendationList,
  hrValidateAndForward,
  managerConfirmParticipants,
  managerNotifyEmployees,
  employeeListInvitations,
  employeeGetInvitation,
  employeeRespond,
  employeeParticipationStatus,
} from "./activitiesApi";

describe("activitiesApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exports ACTIVITY_STATUS constants", () => {
    expect(ACTIVITY_STATUS.DRAFT).toBe("DRAFT");
    expect(ACTIVITY_STATUS.NOTIFIED).toBe("NOTIFIED");
  });

  describe("getManagers", () => {
    it("returns managers", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "m1" }] });
      const result = await getManagers();
      expect(result).toHaveLength(1);
    });

    it("returns empty array for non-array", async () => {
      http.get.mockResolvedValue({ data: "invalid" });
      const result = await getManagers();
      expect(result).toEqual([]);
    });
  });

  describe("getEmployees", () => {
    it("returns employees", async () => {
      http.get.mockResolvedValue({ data: [{ _id: "e1" }] });
      const result = await getEmployees();
      expect(result).toHaveLength(1);
    });
  });

  describe("getUserById", () => {
    it("fetches user by id", async () => {
      http.get.mockResolvedValue({ data: { _id: "u1" } });
      const result = await getUserById("u1");
      expect(result).toEqual({ _id: "u1" });
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
      http.get.mockResolvedValue({ data: {} });
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
      expect(result).toEqual({ _id: "a1" });
    });
  });

  describe("hrRunAI", () => {
    it("runs AI", async () => {
      http.post.mockResolvedValue({ data: { list: [] } });
      const result = await hrRunAI("a1");
      expect(result).toEqual({ list: [] });
    });

    it("throws when activityId missing", async () => {
      await expect(hrRunAI(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("getRecommendation", () => {
    it("gets recommendation", async () => {
      http.get.mockResolvedValue({ data: { list: [] } });
      const result = await getRecommendation("a1");
      expect(result).toEqual({ list: [] });
    });

    it("throws when activityId missing", async () => {
      await expect(getRecommendation(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("hrUpdateRecommendationList", () => {
    it("updates list", async () => {
      http.patch.mockResolvedValue({ data: { updated: true } });
      const result = await hrUpdateRecommendationList("a1", []);
      expect(result).toEqual({ updated: true });
    });

    it("throws when activityId missing", async () => {
      await expect(hrUpdateRecommendationList(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("hrValidateAndForward", () => {
    it("validates and forwards", async () => {
      http.patch.mockResolvedValue({ data: { validated: true } });
      const result = await hrValidateAndForward("a1");
      expect(result).toEqual({ validated: true });
    });

    it("throws when activityId missing", async () => {
      await expect(hrValidateAndForward(null)).rejects.toThrow("Missing activityId");
    });
  });

  describe("managerConfirmParticipants", () => {
    it("confirms participants", async () => {
      http.patch.mockResolvedValue({ data: { confirmed: true } });
      await managerConfirmParticipants("a1", ["e1"]);
      expect(http.patch).toHaveBeenCalledWith("/activities/a1/confirm", { participants: ["e1"] });
    });

    it("handles null participants", async () => {
      http.patch.mockResolvedValue({ data: {} });
      await managerConfirmParticipants("a1", null);
      expect(http.patch).toHaveBeenCalledWith("/activities/a1/confirm", { participants: [] });
    });

    it("throws when activityId missing", async () => {
      await expect(managerConfirmParticipants(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("managerNotifyEmployees", () => {
    it("notifies employees", async () => {
      http.post.mockResolvedValue({ data: { notified: true } });
      await managerNotifyEmployees("a1", ["e1"]);
      expect(http.post).toHaveBeenCalledWith("/invitations/a1/notify", { employeeIds: ["e1"] });
    });

    it("handles null employeeIds", async () => {
      http.post.mockResolvedValue({ data: {} });
      await managerNotifyEmployees("a1", null);
      expect(http.post).toHaveBeenCalledWith("/invitations/a1/notify", { employeeIds: [] });
    });

    it("throws when activityId missing", async () => {
      await expect(managerNotifyEmployees(null, [])).rejects.toThrow("Missing activityId");
    });
  });

  describe("employeeListInvitations", () => {
    it("returns invitations", async () => {
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
    it("gets invitation", async () => {
      http.get.mockResolvedValue({ data: { _id: "inv1" } });
      const result = await employeeGetInvitation("inv1");
      expect(result).toEqual({ _id: "inv1" });
    });

    it("throws when id missing", async () => {
      await expect(employeeGetInvitation(null)).rejects.toThrow("Missing invitation id");
    });
  });

  describe("employeeRespond", () => {
    it("responds to invitation", async () => {
      http.patch.mockResolvedValue({ data: { responded: true } });
      const result = await employeeRespond("inv1", { decision: "ACCEPTED", justification: "ok" });
      expect(result).toEqual({ responded: true });
    });

    it("throws when invitationId missing", async () => {
      await expect(employeeRespond(null, { decision: "ACCEPTED" })).rejects.toThrow("Missing invitation id");
    });
  });

  describe("employeeParticipationStatus", () => {
    it("returns participations", async () => {
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
