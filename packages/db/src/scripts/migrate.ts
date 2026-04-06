import { migrate } from "drizzle-orm/postgres-js/migrator";

import { loadDatabaseConfiguration } from "../config";
import {
  closeDatabaseConnection,
  createDatabaseConnection,
  createQueryRunner,
  validateDatabaseConnection,
} from "../database";

async function runMigrations(): Promise<void> {
  const configuration = loadDatabaseConfiguration();
  const connection = createDatabaseConnection(configuration.databaseUrl);

  try {
    await migrate(connection.db, {
      migrationsFolder: "drizzle",
    });

    await validateDatabaseConnection(createQueryRunner(connection.sqlClient));
  } finally {
    await closeDatabaseConnection(connection);
  }
}

await runMigrations();
