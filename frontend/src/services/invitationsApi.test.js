import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/http", () => ({
  default: { get: vi.fn() },
}));

import http from "../api/http";
import { fetchMyInvitations } from "./invitationsApi";

describe("invitationsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchMyInvitations", () => {
    it("returns invitations data", async () => {
      const data = [{ _id: "inv1", status: "PENDING" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchMyInvitations();
      expect(http.get).toHaveBeenCalledWith("/invitations/me");
      expect(result).toEqual(data);
    });

    it("re-throws on error", async () => {
      http.get.mockRejectedValue(new Error("Unauthorized"));
      await expect(fetchMyInvitations()).rejects.toThrow("Unauthorized");
    });
  });
});
