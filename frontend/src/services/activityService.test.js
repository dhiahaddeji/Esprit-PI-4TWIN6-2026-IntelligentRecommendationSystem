import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import http from "../api/http";
import {
  fetchActivities,
  fetchActivitiesPage,
  createActivity,
  fetchActivityById,
} from "./activityService";

describe("activityService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchActivities", () => {
    it("returns activities array", async () => {
      const data = [{ _id: "a1", title: "Formation" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchActivities();
      expect(http.get).toHaveBeenCalledWith("/activities");
      expect(result).toEqual(data);
    });
  });

  describe("fetchActivitiesPage", () => {
    it("returns paginated data with total", async () => {
      const data = { data: [{ _id: "a1" }], total: 10, page: 1, limit: 5 };
      http.get.mockResolvedValue({ data });
      const result = await fetchActivitiesPage({ page: 1, limit: 5 });
      expect(result.total).toBe(10);
      expect(result.data).toHaveLength(1);
    });

    it("handles flat array response", async () => {
      const data = [{ _id: "a1" }, { _id: "a2" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchActivitiesPage({});
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("handles empty response", async () => {
      http.get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 10 } });
      const result = await fetchActivitiesPage({});
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("createActivity", () => {
    it("posts activity and returns data", async () => {
      const payload = { title: "New Activity" };
      const created = { _id: "a1", ...payload };
      http.post.mockResolvedValue({ data: created });
      const result = await createActivity(payload);
      expect(http.post).toHaveBeenCalledWith("/activities", payload);
      expect(result).toEqual(created);
    });
  });

  describe("fetchActivityById", () => {
    it("fetches activity by id", async () => {
      const activity = { _id: "a1", title: "Formation" };
      http.get.mockResolvedValue({ data: activity });
      const result = await fetchActivityById("a1");
      expect(http.get).toHaveBeenCalledWith("/activities/a1");
      expect(result).toEqual(activity);
    });
  });
});
