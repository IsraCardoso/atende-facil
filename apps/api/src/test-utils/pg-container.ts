/** Helper para testes de integração com PostgreSQL efêmero via Testcontainers. */

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
  container: StartedPostgreSqlContainer;
  teardown: () => Promise<void>;
}>;

const MIGRATIONS_FOLDER = resolve(__dirname, "../../../../packages/db/drizzle");

export function isDockerAvailable(): boolean {
  if (process.env.SKIP_INTEGRATION_TESTS === "true") {
    return false;
  }
  try {
    execSync("docker ps", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export async function startTestDatabase(): Promise<TestDatabaseContext> {
  if (!process.env.DOCKER_HOST && process.platform === "win32") {
    process.env.DOCKER_HOST = "npipe:////./pipe/dockerDesktopLinuxEngine";
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
