/** Helper para testes de integração com PostgreSQL — usa Docker Compose local ou Testcontainers (CI). */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import {
  closeDatabaseConnection,
  createDatabaseConnection,
  type DatabaseUrl,
  type PostgresJsDatabase,
  runDrizzleMigrations,
  schema,
} from "db";

type TestDatabaseContext = Readonly<{
  db: PostgresJsDatabase<typeof schema>;
  connectionUrl: string;
  container: StartedPostgreSqlContainer | null;
  teardown: () => Promise<void>;
}>;

const MIGRATIONS_FOLDER = resolve(__dirname, "../../../../packages/db/drizzle");

export function isDockerAvailable(): boolean {
  if (process.env.SKIP_INTEGRATION_TESTS === "true") {
    return false;
  }
  // Se DATABASE_URL disponível, o Docker Compose está rodando localmente
  if (process.env.DATABASE_URL) {
    return true;
  }
  if (!process.env.DOCKER_HOST && process.platform === "win32") {
    process.env.DOCKER_HOST = "npipe:////./pipe/docker_engine";
  }
  try {
    execSync("docker ps", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export async function startTestDatabase(): Promise<TestDatabaseContext> {
  // Estratégia 1: usar PostgreSQL do Docker Compose já rodando localmente
  const existingUrl = process.env.DATABASE_URL;
  if (existingUrl) {
    const connection = createDatabaseConnection(existingUrl as DatabaseUrl);
    await runDrizzleMigrations(connection.db, { migrationsFolder: MIGRATIONS_FOLDER });
    return {
      db: connection.db,
      connectionUrl: existingUrl,
      container: null,
      async teardown() {
        await closeDatabaseConnection(connection);
      },
    };
  }

  // Estratégia 2: Testcontainers (CI sem Docker Compose)
  if (!process.env.DOCKER_HOST && process.platform === "win32") {
    process.env.DOCKER_HOST = "npipe:////./pipe/docker_engine";
  }

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test")
    .withPassword("test")
    .start();

  const connectionUrl = container.getConnectionUri();
  const connection = createDatabaseConnection(connectionUrl as DatabaseUrl);

  await runDrizzleMigrations(connection.db, { migrationsFolder: MIGRATIONS_FOLDER });

  return {
    db: connection.db,
    connectionUrl,
    container,
    async teardown() {
      await closeDatabaseConnection(connection);
      await container.stop();
    },
  };
}

export type { TestDatabaseContext };
