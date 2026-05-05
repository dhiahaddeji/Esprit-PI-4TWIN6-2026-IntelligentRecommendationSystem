import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/http", () => ({
  default: { get: vi.fn() },
}));

import http from "../api/http";
import { fetchManagers, fetchEmployees, fetchUsers } from "./usersService";

describe("usersService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchManagers", () => {
    it("returns managers data", async () => {
      const data = [{ _id: "m1", role: "MANAGER" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchManagers();
      expect(http.get).toHaveBeenCalledWith("/users/managers");
      expect(result).toEqual(data);
    });
  });

  describe("fetchEmployees", () => {
    it("returns employees data", async () => {
      const data = [{ _id: "e1", role: "EMPLOYEE" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchEmployees();
      expect(http.get).toHaveBeenCalledWith("/users/employees");
      expect(result).toEqual(data);
    });
  });

  describe("fetchUsers", () => {
    it("returns all users", async () => {
      const data = [{ _id: "u1" }, { _id: "u2" }];
      http.get.mockResolvedValue({ data });
      const result = await fetchUsers();
      expect(http.get).toHaveBeenCalledWith("/users");
      expect(result).toEqual(data);
    });
  });
});
