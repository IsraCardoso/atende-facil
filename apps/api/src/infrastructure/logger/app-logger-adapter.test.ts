import { describe, expect, it, vi } from "vitest";

import { createTenantId } from "../../domain";
import { createStructuredAppLoggerAdapter } from "./app-logger-adapter";

describe("createStructuredAppLoggerAdapter", () => {
  it("should forward correlationId, tenantId and context", () => {
    const infoSpy = vi.fn();
    const adapter = createStructuredAppLoggerAdapter({
      debug: vi.fn(),
      info: infoSpy,
      warn: vi.fn(),
      error: vi.fn(),
    });

    adapter.info("Evento de teste", {
      correlationId: "corr-logger-1",
      tenantId: createTenantId("tenant-logger-1"),
      context: {
        action: "unit-test",
      },
    });

    expect(infoSpy).toHaveBeenCalledWith("Evento de teste", {
      correlationId: "corr-logger-1",
      tenantId: "tenant-logger-1",
      context: {
        action: "unit-test",
      },
    });
  });
});
