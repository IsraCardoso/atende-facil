import { afterEach, describe, expect, it, vi } from "vitest";

import { createEvolutionInstanceProvisioner } from "./evolution-instance-provisioner";

const platform = {
  apiUrl: "http://localhost:8081",
  apiKey: "atende-facil-evo-key",
};

describe("createEvolutionInstanceProvisioner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call delete endpoint when removing evolution instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    const provisioner = createEvolutionInstanceProvisioner(platform);
    await provisioner.removeEvolutionInstance("af-demo");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8081/instance/delete/af-demo",
      expect.objectContaining({ method: "DELETE" }),
    );

    globalThis.fetch = originalFetch;
  });

  it("should treat 404 as success when deleting missing instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    const provisioner = createEvolutionInstanceProvisioner(platform);
    await expect(provisioner.removeEvolutionInstance("af-demo")).resolves.toBeUndefined();

    globalThis.fetch = originalFetch;
  });
});
