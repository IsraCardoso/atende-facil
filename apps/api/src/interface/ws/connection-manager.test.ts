import { describe, expect, it, vi } from "vitest";

import { createConnectionManager } from "./connection-manager";

function createFakeWs() {
  return { send: vi.fn() };
}

describe("ConnectionManager", () => {
  it("should add and broadcast to tenant connections", () => {
    const manager = createConnectionManager();
    const ws1 = createFakeWs();
    const ws2 = createFakeWs();

    manager.addConnection("tenant-1", ws1);
    manager.addConnection("tenant-1", ws2);
    expect(manager.getConnectionCount("tenant-1")).toBe(2);

    manager.broadcastToTenant("tenant-1", { type: "test" });

    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ type: "test" }));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ type: "test" }));
  });

  it("should isolate broadcasts by tenant", () => {
    const manager = createConnectionManager();
    const ws1 = createFakeWs();
    const ws2 = createFakeWs();

    manager.addConnection("tenant-1", ws1);
    manager.addConnection("tenant-2", ws2);

    manager.broadcastToTenant("tenant-1", { type: "event" });

    expect(ws1.send).toHaveBeenCalledOnce();
    expect(ws2.send).not.toHaveBeenCalled();
  });

  it("should remove connection without affecting others", () => {
    const manager = createConnectionManager();
    const ws1 = createFakeWs();
    const ws2 = createFakeWs();

    manager.addConnection("tenant-1", ws1);
    manager.addConnection("tenant-1", ws2);
    manager.removeConnection("tenant-1", ws1);

    expect(manager.getConnectionCount("tenant-1")).toBe(1);

    manager.broadcastToTenant("tenant-1", { type: "after-remove" });
    expect(ws1.send).not.toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalledOnce();
  });

  it("should clean up tenant entry when last connection removed", () => {
    const manager = createConnectionManager();
    const ws = createFakeWs();

    manager.addConnection("tenant-1", ws);
    manager.removeConnection("tenant-1", ws);

    expect(manager.getConnectionCount("tenant-1")).toBe(0);
  });

  it("should not throw when broadcasting to tenant with no connections", () => {
    const manager = createConnectionManager();
    expect(() => manager.broadcastToTenant("nonexistent", { type: "test" })).not.toThrow();
  });

  it("should isolate errors in broadcast — one failing ws does not block others", () => {
    const manager = createConnectionManager();
    const ws1 = {
      send: vi.fn(() => {
        throw new Error("fail");
      }),
    };
    const ws2 = createFakeWs();

    manager.addConnection("tenant-1", ws1);
    manager.addConnection("tenant-1", ws2);

    expect(() => manager.broadcastToTenant("tenant-1", { type: "test" })).not.toThrow();
    expect(ws2.send).toHaveBeenCalledOnce();
  });
});
