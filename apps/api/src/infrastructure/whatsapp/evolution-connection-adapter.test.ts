import { afterEach, describe, expect, it, vi } from "vitest";
import { createEvolutionConnectionAdapter } from "./evolution-connection-adapter";

const evolutionConfig = {
  provider: "evolution" as const,
  config: {
    instanceName: "af-demo",
    apiUrl: "http://localhost:8081",
    apiKey: "test-key",
  },
};

describe("EvolutionConnectionAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should normalize open state to connected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 }),
    );

    const adapter = createEvolutionConnectionAdapter();
    const result = await adapter.getStatus(evolutionConfig);

    expect(result.status).toBe("connected");
  });

  it("should return qr base64 when pairing starts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ base64: "data:image/png;base64,abc123" }), {
        status: 200,
      }),
    );

    const adapter = createEvolutionConnectionAdapter();
    const result = await adapter.startPairing(evolutionConfig);

    expect(result.qrBase64).toBe("abc123");
    expect(result.expiresAt).toBeGreaterThan(Date.now());
  });
});
