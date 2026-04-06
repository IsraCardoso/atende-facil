import { describe, expect, it } from "vitest";

import { resolveProviderBundle } from "./provider-factory";

describe("ProviderFactory", () => {
  it("should resolve evolution bundle", () => {
    const bundle = resolveProviderBundle("evolution");
    expect(bundle.sender).toBeDefined();
    expect(bundle.normalizer).toBeDefined();
    expect(bundle.verifier).toBeDefined();
  });

  it("should resolve meta bundle", () => {
    const bundle = resolveProviderBundle("meta");
    expect(bundle.sender).toBeDefined();
    expect(bundle.normalizer).toBeDefined();
    expect(bundle.verifier).toBeDefined();
  });

  it("should resolve zapi bundle", () => {
    const bundle = resolveProviderBundle("zapi");
    expect(bundle.sender).toBeDefined();
    expect(bundle.normalizer).toBeDefined();
    expect(bundle.verifier).toBeDefined();
  });

  it("should resolve uazapi bundle", () => {
    const bundle = resolveProviderBundle("uazapi");
    expect(bundle.sender).toBeDefined();
    expect(bundle.normalizer).toBeDefined();
    expect(bundle.verifier).toBeDefined();
  });
});
