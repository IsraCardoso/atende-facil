import type { IdentityCacheService } from "../services";

export function createIdentityCacheServiceStub(
  overrides: Partial<IdentityCacheService> = {},
): IdentityCacheService {
  const defaultService: IdentityCacheService = {
    async getOrLoad(_input, loader) {
      return loader();
    },
    async invalidate() {
      return undefined;
    },
  };

  return {
    ...defaultService,
    ...overrides,
  };
}
