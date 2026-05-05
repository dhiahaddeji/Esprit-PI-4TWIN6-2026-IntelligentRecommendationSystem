import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import http from "./http";
import { getUsers, createUser, updateUser, deleteUser, getUserById } from "./users";

describe("users api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getUsers fetches from /admin/users", async () => {
    http.get.mockResolvedValue({ data: [{ _id: "u1" }] });
    const result = await getUsers();
    expect(http.get).toHaveBeenCalledWith("/admin/users");
    expect(result).toEqual([{ _id: "u1" }]);
  });

  it("createUser posts to /admin/create-user", async () => {
    http.post.mockResolvedValue({ data: { _id: "u1" } });
    const result = await createUser({ name: "Alice", email: "a@a.com" });
    expect(http.post).toHaveBeenCalledWith("/admin/create-user", { name: "Alice", email: "a@a.com" });
    expect(result).toEqual({ _id: "u1" });
  });

  it("updateUser patches /admin/update-user/:id", async () => {
    http.patch.mockResolvedValue({ data: { _id: "u1", name: "Updated" } });
    const result = await updateUser("u1", { name: "Updated" });
    expect(http.patch).toHaveBeenCalledWith("/admin/update-user/u1", { name: "Updated" });
    expect(result).toEqual({ _id: "u1", name: "Updated" });
  });

  it("deleteUser deletes /admin/delete-user/:id", async () => {
    http.delete.mockResolvedValue({ data: { deleted: true } });
    const result = await deleteUser("u1");
    expect(http.delete).toHaveBeenCalledWith("/admin/delete-user/u1");
    expect(result).toEqual({ deleted: true });
  });

  it("getUserById fetches /admin/user/:id", async () => {
    http.get.mockResolvedValue({ data: { _id: "u1" } });
    const result = await getUserById("u1");
    expect(http.get).toHaveBeenCalledWith("/admin/user/u1");
    expect(result).toEqual({ _id: "u1" });
  });
});
