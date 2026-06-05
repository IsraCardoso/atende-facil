/** Carrega credenciais globais da Evolution a partir do ambiente. */
import type { EvolutionPlatformConfig } from "../../domain/whatsapp-platform-types";
import type { ApiEnvironment } from "../config/env";

type RuntimeEnvMap = Readonly<Record<string, string | undefined>>;

declare const process:
  | Readonly<{
      env?: Record<string, string | undefined>;
    }>
  | undefined;

function getRuntimeEnvMap(): RuntimeEnvMap {
  return process?.env ?? {};
}

function readEnv(name: string, source: RuntimeEnvMap): string | undefined {
  const value = source[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function loadEvolutionPlatformConfig(
  source: RuntimeEnvMap = getRuntimeEnvMap(),
): EvolutionPlatformConfig | null {
  const apiUrl = readEnv("EVOLUTION_API_URL", source);
  const apiKey = readEnv("EVOLUTION_API_KEY", source);

  if (!apiUrl || !apiKey) {
    return null;
  }

  return { apiUrl, apiKey };
}

export function toEvolutionPlatformConfig(
  environment: ApiEnvironment,
): EvolutionPlatformConfig | null {
  if (!environment.evolutionApiUrl || !environment.evolutionApiKey) {
    return null;
  }

  return {
    apiUrl: environment.evolutionApiUrl,
    apiKey: environment.evolutionApiKey,
  };
}

type EvolutionPlatformDiagnostics = Readonly<{
  available: boolean;
  reason?: string;
}>;

export function describeEvolutionPlatformAvailability(
  environment: ApiEnvironment,
): EvolutionPlatformDiagnostics {
  const missing: string[] = [];

  if (!environment.evolutionApiUrl) {
    missing.push("EVOLUTION_API_URL");
  }
  if (!environment.evolutionApiKey) {
    missing.push("EVOLUTION_API_KEY");
  }

  if (missing.length === 0) {
    return { available: true };
  }

  return {
    available: false,
    reason: `${missing.join(" e ")} ausente(s) no ambiente da API.`,
  };
}
