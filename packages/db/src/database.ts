import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { schema } from "./schema";
import type { DatabaseUrl, QueryResultRow } from "./types";

type DatabaseConnection = Readonly<{
  sqlClient: Sql<Record<string, never>>;
  db: PostgresJsDatabase<typeof schema>;
}>;

type DatabaseQueryRunner = Readonly<{
  execute: (query: string) => Promise<readonly QueryResultRow[]>;
}>;

function createQueryRunner(sqlClient: Sql<Record<string, never>>): DatabaseQueryRunner {
  return {
    async execute(query: string): Promise<readonly QueryResultRow[]> {
      const rows = await sqlClient.unsafe<QueryResultRow[]>(query);

      return rows;
    },
  };
}

export function createDatabaseConnection(databaseUrl: DatabaseUrl): DatabaseConnection {
  const sqlClient = postgres(databaseUrl, {
    max: 5,
    connect_timeout: 10,
    idle_timeout: 30,
  });

  return {
    sqlClient,
    db: drizzle(sqlClient, {
      schema,
    }),
  };
}

export async function validateDatabaseConnection(queryRunner: DatabaseQueryRunner): Promise<void> {
  try {
    await queryRunner.execute("select 1;");
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "erro desconhecido";
    throw new Error(`Falha de conexão com DB: ${reason}.`);
  }
}

export async function closeDatabaseConnection(connection: DatabaseConnection): Promise<void> {
  await connection.sqlClient.end({
    timeout: 5,
  });
}

export type { DatabaseConnection, DatabaseQueryRunner };
export { createQueryRunner };
