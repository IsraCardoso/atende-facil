import { describe, expect, it } from "vitest";

import { createPhone } from "../../domain/whatsapp-types";
import { createInMemorySessionLockAdapter } from "./session-lock-adapter";

describe("InMemorySessionLockAdapter", () => {
  it("should acquire lock when no lock exists", async () => {
    const adapter = createInMemorySessionLockAdapter();
    const phone = createPhone("5511999999999");

    const acquired = await adapter.acquire("tenant-1", phone, 10_000);

    expect(acquired).toBe(true);
  });

  it("should reject second acquire when lock is active", async () => {
    const adapter = createInMemorySessionLockAdapter();
    const phone = createPhone("5511999999999");

    await adapter.acquire("tenant-1", phone, 10_000);
    const secondAcquire = await adapter.acquire("tenant-1", phone, 10_000);

    expect(secondAcquire).toBe(false);
  });

  it("should allow acquire after release", async () => {
    const adapter = createInMemorySessionLockAdapter();
    const phone = createPhone("5511999999999");

    await adapter.acquire("tenant-1", phone, 10_000);
    await adapter.release("tenant-1", phone);
    const reAcquired = await adapter.acquire("tenant-1", phone, 10_000);

    expect(reAcquired).toBe(true);
  });

  it("should isolate locks by tenant and phone", async () => {
    const adapter = createInMemorySessionLockAdapter();
    const phone1 = createPhone("5511999999999");
    const phone2 = createPhone("5511888888888");

    await adapter.acquire("tenant-1", phone1, 10_000);

    const otherPhone = await adapter.acquire("tenant-1", phone2, 10_000);
    const otherTenant = await adapter.acquire("tenant-2", phone1, 10_000);

    expect(otherPhone).toBe(true);
    expect(otherTenant).toBe(true);
  });
});
