import { defineConfig } from "drizzle-kit";

declare const process:
  | Readonly<{
      env?: Record<string, string | undefined>;
    }>
  | undefined;

const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/spec_driven_dev";
const databaseUrl = process?.env?.DATABASE_URL ?? defaultDatabaseUrl;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
