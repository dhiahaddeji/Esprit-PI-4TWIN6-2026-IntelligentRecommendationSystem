import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./http", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import http from "./http";
import { activitiesApi } from "./activities";

describe("activitiesApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listMy gets /activities", async () => {
    http.get.mockResolvedValue({ data: [] });
    await activitiesApi.listMy();
    expect(http.get).toHaveBeenCalledWith("/activities");
  });

  it("create posts to /activities", async () => {
    http.post.mockResolvedValue({ data: { _id: "a1" } });
    await activitiesApi.create({ title: "Test" });
    expect(http.post).toHaveBeenCalledWith("/activities", { title: "Test" });
  });

  it("getById gets /activities/:id", async () => {
    http.get.mockResolvedValue({ data: { _id: "a1" } });
    await activitiesApi.getById("a1");
    expect(http.get).toHaveBeenCalledWith("/activities/a1");
  });

  it("update puts to /activities/:id", async () => {
    http.put.mockResolvedValue({ data: {} });
    await activitiesApi.update("a1", { title: "Updated" });
    expect(http.put).toHaveBeenCalledWith("/activities/a1", { title: "Updated" });
  });

  it("runAI posts to /activities/:id/recommend", async () => {
    http.post.mockResolvedValue({ data: {} });
    await activitiesApi.runAI("a1");
    expect(http.post).toHaveBeenCalledWith("/activities/a1/recommend");
  });

  it("forwardToManager posts to /activities/:id/forward", async () => {
    http.post.mockResolvedValue({ data: {} });
    await activitiesApi.forwardToManager("a1");
    expect(http.post).toHaveBeenCalledWith("/activities/a1/forward");
  });

  it("managerConfirm posts to /activities/:id/manager-confirm", async () => {
    http.post.mockResolvedValue({ data: {} });
    await activitiesApi.managerConfirm("a1", { participants: ["e1"] });
    expect(http.post).toHaveBeenCalledWith("/activities/a1/manager-confirm", { participants: ["e1"] });
  });

  it("notifyEmployees posts to /activities/:id/notify", async () => {
    http.post.mockResolvedValue({ data: {} });
    await activitiesApi.notifyEmployees("a1");
    expect(http.post).toHaveBeenCalledWith("/activities/a1/notify");
  });
});
