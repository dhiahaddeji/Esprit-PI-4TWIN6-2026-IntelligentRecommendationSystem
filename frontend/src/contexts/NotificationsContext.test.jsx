import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { NotificationsProvider, useNotifications, NOTIF_META } from "./NotificationsContext";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: false,
    active: false,
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function NotifConsumer() {
  const { notifications, unread, markRead, markAllRead, toasts, dismissToast } = useNotifications();
  return (
    <div>
      <span data-testid="unread">{unread}</span>
      <span data-testid="count">{notifications.length}</span>
      <span data-testid="toasts">{toasts.length}</span>
      <button onClick={() => markRead("notif-1")}>Mark Read</button>
      <button onClick={() => markAllRead()}>Mark All Read</button>
    </div>
  );
}

describe("NotificationsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], unread: 0 }),
    });
  });

  it("provides default empty notifications", async () => {
    await act(async () => {
      render(
        <NotificationsProvider>
          <NotifConsumer />
        </NotificationsProvider>
      );
    });

    expect(screen.getByTestId("unread").textContent).toBe("0");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("throws when useNotifications used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<NotifConsumer />)).toThrow();
    spy.mockRestore();
  });

  it("markRead decrements unread count", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [{ _id: "notif-1", read: false }], unread: 1 }),
    });

    localStorage.setItem("access_token", "test-token");

    await act(async () => {
      render(
        <NotificationsProvider>
          <NotifConsumer />
        </NotificationsProvider>
      );
    });

    // Wait for fetch to complete
    await act(async () => {
      await new Promise(r => setTimeout(r, 200));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /mark read/i }));
    });

    expect(screen.getByTestId("unread").textContent).toBe("0");
  });

  it("markAllRead sets unread to 0", async () => {
    await act(async () => {
      render(
        <NotificationsProvider>
          <NotifConsumer />
        </NotificationsProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));
    });

    expect(screen.getByTestId("unread").textContent).toBe("0");
  });
});

describe("NOTIF_META", () => {
  it("has expected notification types", () => {
    expect(NOTIF_META.skill_submitted).toBeDefined();
    expect(NOTIF_META.skill_validated).toBeDefined();
    expect(NOTIF_META.activity_invitation).toBeDefined();
    expect(NOTIF_META.new_message).toBeDefined();
  });

  it("each type has icon, color, and label", () => {
    Object.values(NOTIF_META).forEach(meta => {
      expect(meta.icon).toBeDefined();
      expect(meta.color).toBeDefined();
      expect(meta.label).toBeDefined();
    });
  });
});
