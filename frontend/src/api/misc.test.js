import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import http from "./http";
import { invitationsApi } from "./invitations";
import { rolesApi } from "./roles";
import { teamsApi } from "./teams";

describe("invitationsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("myInvitations gets /me/invitations", async () => {
    http.get.mockResolvedValue({ data: [] });
    await invitationsApi.myInvitations();
    expect(http.get).toHaveBeenCalledWith("/me/invitations");
  });

  it("invitationById gets /me/invitations/:id", async () => {
    http.get.mockResolvedValue({ data: {} });
    await invitationsApi.invitationById("inv1");
    expect(http.get).toHaveBeenCalledWith("/me/invitations/inv1");
  });

  it("accept posts to /me/invitations/:id/accept", async () => {
    http.post.mockResolvedValue({ data: {} });
    await invitationsApi.accept("inv1");
    expect(http.post).toHaveBeenCalledWith("/me/invitations/inv1/accept");
  });

  it("decline posts to /me/invitations/:id/decline", async () => {
    http.post.mockResolvedValue({ data: {} });
    await invitationsApi.decline("inv1", { reason: "busy" });
    expect(http.post).toHaveBeenCalledWith("/me/invitations/inv1/decline", { reason: "busy" });
  });

  it("myParticipations gets /me/participations", async () => {
    http.get.mockResolvedValue({ data: [] });
    await invitationsApi.myParticipations();
    expect(http.get).toHaveBeenCalledWith("/me/participations");
  });
});

describe("rolesApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list gets /roles", async () => {
    http.get.mockResolvedValue({ data: [] });
    await rolesApi.list();
    expect(http.get).toHaveBeenCalledWith("/roles");
  });

  it("updateRole puts to /roles/:id", async () => {
    http.put.mockResolvedValue({ data: {} });
    await rolesApi.updateRole("r1", { name: "Admin" });
    expect(http.put).toHaveBeenCalledWith("/roles/r1", { name: "Admin" });
  });
});

describe("teamsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list gets /teams", async () => {
    http.get.mockResolvedValue({ data: [] });
    await teamsApi.list();
    expect(http.get).toHaveBeenCalledWith("/teams");
  });

  it("create posts to /teams", async () => {
    http.post.mockResolvedValue({ data: { _id: "t1" } });
    await teamsApi.create({ name: "Team A" });
    expect(http.post).toHaveBeenCalledWith("/teams", { name: "Team A" });
  });

  it("update puts to /teams/:id", async () => {
    http.put.mockResolvedValue({ data: {} });
    await teamsApi.update("t1", { name: "Updated" });
    expect(http.put).toHaveBeenCalledWith("/teams/t1", { name: "Updated" });
  });

  it("remove deletes /teams/:id", async () => {
    http.delete.mockResolvedValue({ data: {} });
    await teamsApi.remove("t1");
    expect(http.delete).toHaveBeenCalledWith("/teams/t1");
  });
});
