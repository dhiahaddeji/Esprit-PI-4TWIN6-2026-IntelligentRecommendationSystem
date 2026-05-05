import { describe, it, expect } from "vitest";
import { ROLE, canAccess, isManager, isHR, isEmployee } from "./permissions";

describe("permissions", () => {
  describe("ROLE constants", () => {
    it("has expected role values", () => {
      expect(ROLE.ADMIN).toBe("ADMIN");
      expect(ROLE.HR).toBe("HR");
      expect(ROLE.MANAGER).toBe("MANAGER");
      expect(ROLE.EMPLOYEE).toBe("EMPLOYEE");
    });
  });

  describe("canAccess", () => {
    it("returns false when userRole is null", () => {
      expect(canAccess(null, ["HR"])).toBe(false);
    });

    it("returns false when userRole is undefined", () => {
      expect(canAccess(undefined, ["HR"])).toBe(false);
    });

    it("returns true for MANAGER regardless of allowed list", () => {
      expect(canAccess("MANAGER", ["HR"])).toBe(true);
      expect(canAccess("MANAGER", [])).toBe(true);
      expect(canAccess("MANAGER", ["EMPLOYEE"])).toBe(true);
    });

    it("returns true when role is in allowed list", () => {
      expect(canAccess("HR", ["HR", "SUPERADMIN"])).toBe(true);
    });

    it("returns false when role is not in allowed list", () => {
      expect(canAccess("EMPLOYEE", ["HR", "SUPERADMIN"])).toBe(false);
    });

    it("returns false for empty allowed list (non-manager)", () => {
      expect(canAccess("HR", [])).toBe(false);
    });
  });

  describe("isManager", () => {
    it("returns true for MANAGER role", () => {
      expect(isManager("MANAGER")).toBe(true);
    });

    it("returns false for other roles", () => {
      expect(isManager("HR")).toBe(false);
      expect(isManager("EMPLOYEE")).toBe(false);
      expect(isManager(null)).toBe(false);
    });
  });

  describe("isHR", () => {
    it("returns true for HR role", () => {
      expect(isHR("HR")).toBe(true);
    });

    it("returns false for other roles", () => {
      expect(isHR("MANAGER")).toBe(false);
      expect(isHR("EMPLOYEE")).toBe(false);
    });
  });

  describe("isEmployee", () => {
    it("returns true for EMPLOYEE role", () => {
      expect(isEmployee("EMPLOYEE")).toBe(true);
    });

    it("returns false for other roles", () => {
      expect(isEmployee("HR")).toBe(false);
      expect(isEmployee("MANAGER")).toBe(false);
    });
  });
});
