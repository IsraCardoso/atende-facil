import { describe, expect, it } from "vitest";

import { createContainer, createToken } from "./container";

describe("container", () => {
  it("should instantiate singleton lazily and reuse the same instance", () => {
    const container = createContainer();
    const singletonToken = createToken<Readonly<{ id: number }>>("singleton-service");
    let factoryCallCount = 0;

    container.registerSingleton(singletonToken, () => {
      factoryCallCount += 1;

      return {
        id: factoryCallCount,
      };
    });

    expect(factoryCallCount).toBe(0);

    const firstInstance = container.resolve(singletonToken);
    const secondInstance = container.resolve(singletonToken);

    expect(factoryCallCount).toBe(1);
    expect(firstInstance).toBe(secondInstance);
  });

  it("should create a new instance for transient registrations", () => {
    const container = createContainer();
    const transientToken = createToken<Readonly<{ id: number }>>("transient-service");
    let factoryCallCount = 0;

    container.registerTransient(transientToken, () => {
      factoryCallCount += 1;

      return {
        id: factoryCallCount,
      };
    });

    const firstInstance = container.resolve(transientToken);
    const secondInstance = container.resolve(transientToken);

    expect(factoryCallCount).toBe(2);
    expect(firstInstance).not.toBe(secondInstance);
    expect(firstInstance.id).toBe(1);
    expect(secondInstance.id).toBe(2);
  });
});
