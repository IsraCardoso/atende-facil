#!/usr/bin/env node
/** Wrapper cross-platform para o CLI OpenSpec local (Windows-safe). */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules", "@fission-ai", "openspec", "bin", "openspec.js");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [cli, ...args], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

process.exit(result.status ?? 1);
