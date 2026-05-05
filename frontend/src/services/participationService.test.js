import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/http", () => ({
  default: { get: vi.fn() },
}));

import http from "../api/http";
import { fetchMyParticipations } from "./participationService";

describe("participationService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchMyParticipations", () => {
    it("returns participations data", async () => {
      const data = [{ _id: "p1", status: "CONFIRMED" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchMyParticipations();
      expect(http.get).toHaveBeenCalledWith("/participations/me");
      expect(result).toEqual(data);
    });

    it("re-throws on error", async () => {
      http.get.mockRejectedValue(new Error("Forbidden"));
      await expect(fetchMyParticipations()).rejects.toThrow("Forbidden");
    });
  });
});
