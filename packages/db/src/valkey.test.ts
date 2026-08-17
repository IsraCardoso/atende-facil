import { describe, expect, it } from "vitest";

import type { ValkeyUrl } from "./types";
import { validateValkeyConnection } from "./valkey";

type MutableValkeyClient = {
  isOpen: boolean;
  connect: () => Promise<void>;
  ping: () => Promise<string>;
  quit: () => Promise<string>;
};

function createValkeyUrl(value: string): ValkeyUrl {
  return value as ValkeyUrl;
}

describe("validateValkeyConnection", () => {
  it("should connect, ping and close successfully", async () => {
    let didConnect = false;
    let didClose = false;
    const fakeClient: MutableValkeyClient = {
      isOpen: false,
      async connect() {
        didConnect = true;
        this.isOpen = true;
      },
      async ping() {
        return "PONG";
      },
      async quit() {
        didClose = true;
        this.isOpen = false;
        return "OK";
      },
    };

    await expect(
      validateValkeyConnection(createValkeyUrl("redis://localhost:6379"), () => fakeClient),
    ).resolves.toBeUndefined();

    expect(didConnect).toBe(true);
    expect(didClose).toBe(true);
  });

  it("should map connection failures to explicit valkey message", async () => {
    const fakeClient: MutableValkeyClient = {
      isOpen: false,
      async connect() {
        throw new Error("ECONNREFUSED");
      },
      async ping() {
        return "PONG";
      },
      async quit() {
        this.isOpen = false;
        return "OK";
      },
    };

    await expect(
      validateValkeyConnection(createValkeyUrl("redis://localhost:6379"), () => fakeClient),
    ).rejects.toThrowError("Falha de conexão com Valkey: ECONNREFUSED.");
  });
});
