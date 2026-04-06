import { loadDatabaseConfiguration } from "../config";
import { validateValkeyConnection } from "../valkey";

async function validate(): Promise<void> {
  const configuration = loadDatabaseConfiguration();
  await validateValkeyConnection(configuration.valkeyUrl);
}

await validate();
