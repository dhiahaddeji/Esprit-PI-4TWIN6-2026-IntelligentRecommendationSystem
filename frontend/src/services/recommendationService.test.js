import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API module before importing the service
const mockAPI = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock("../api", () => ({ default: mockAPI }));

import {
  runRecommendation,
  getRecommendations,
  updateRecommendations,
} from "./recommendationService";

describe("recommendationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── runRecommendation ─────────────────────────────────────────────────

  describe("runRecommendation", () => {
    it("posts to /recommendations/:activityId and returns data", async () => {
      const expected = { ranked: [{ employeeId: "emp-1", score: 0.9 }] };
      mockAPI.post.mockResolvedValue({ data: expected });

      const result = await runRecommendation("activity-id-1");

      expect(mockAPI.post).toHaveBeenCalledWith("/recommendations/activity-id-1");
      expect(result).toEqual(expected);
    });

    it("re-throws error on network failure", async () => {
      mockAPI.post.mockRejectedValue(new Error("Network error"));
      await expect(runRecommendation("activity-id-1")).rejects.toThrow("Network error");
    });
  });

  // ── getRecommendations ────────────────────────────────────────────────

  describe("getRecommendations", () => {
    it("gets /recommendations/:activityId and returns data", async () => {
      const expected = {
        activityId: "activity-id-1",
        list: [{ employeeId: "emp-1", score: 0.8 }],
        hrValidated: false,
      };
      mockAPI.get.mockResolvedValue({ data: expected });

      const result = await getRecommendations("activity-id-1");

      expect(mockAPI.get).toHaveBeenCalledWith("/recommendations/activity-id-1");
      expect(result).toEqual(expected);
    });

    it("re-throws error when request fails", async () => {
      mockAPI.get.mockRejectedValue(new Error("404 not found"));
      await expect(getRecommendations("bad-id")).rejects.toThrow("404 not found");
    });
  });

  // ── updateRecommendations ─────────────────────────────────────────────

  describe("updateRecommendations", () => {
    it("puts to /recommendations/:activityId with employee list", async () => {
      const employees = [{ employeeId: "emp-1" }, { employeeId: "emp-2" }];
      const expected = { updated: true };
      mockAPI.put.mockResolvedValue({ data: expected });

      const result = await updateRecommendations("activity-id-1", employees);

      expect(mockAPI.put).toHaveBeenCalledWith("/recommendations/activity-id-1", {
        employees,
      });
      expect(result).toEqual(expected);
    });

    it("handles empty employee list", async () => {
      mockAPI.put.mockResolvedValue({ data: { updated: true } });
      await updateRecommendations("activity-id-1", []);
      expect(mockAPI.put).toHaveBeenCalledWith(
        "/recommendations/activity-id-1",
        { employees: [] },
      );
    });

    it("re-throws error on failure", async () => {
      mockAPI.put.mockRejectedValue(new Error("Forbidden"));
      await expect(updateRecommendations("activity-id-1", [])).rejects.toThrow("Forbidden");
    });
  });
});
