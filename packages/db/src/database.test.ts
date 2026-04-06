import { describe, expect, it } from "vitest";

import { validateDatabaseConnection } from "./database";

describe("validateDatabaseConnection", () => {
  it("should validate successfully when query runner can execute a query", async () => {
    await expect(
      validateDatabaseConnection({
        async execute() {
          return [];
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("should map query errors to explicit db connection message", async () => {
    await expect(
      validateDatabaseConnection({
        async execute() {
          throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
        },
      }),
    ).rejects.toThrowError("Falha de conexão com DB: connect ECONNREFUSED 127.0.0.1:5432.");
  });
});
