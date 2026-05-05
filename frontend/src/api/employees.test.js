import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./http", () => ({
  default: { get: vi.fn() },
}));

import http from "./http";
import { fetchEmployees, fetchEmployeeById } from "./employees";

describe("employees api", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchEmployees", () => {
    it("returns paginated employees", async () => {
      const data = { data: [{ _id: "e1" }], total: 1, page: 1, limit: 10 };
      http.get.mockResolvedValue({ data });
      const result = await fetchEmployees({ page: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("handles flat array response", async () => {
      const data = [{ _id: "e1" }, { _id: "e2" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchEmployees({});
      expect(result.data).toHaveLength(2);
    });

    it("handles non-array response", async () => {
      http.get.mockResolvedValue({ data: null });
      const result = await fetchEmployees({});
      expect(result.data).toEqual([]);
    });
  });

  describe("fetchEmployeeById", () => {
    it("fetches employee by id", async () => {
      http.get.mockResolvedValue({ data: { _id: "e1", name: "Alice" } });
      const result = await fetchEmployeeById("e1");
      expect(http.get).toHaveBeenCalledWith("/users/e1");
      expect(result).toEqual({ _id: "e1", name: "Alice" });
    });
  });
});
