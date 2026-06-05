/** Resolve PUBLIC_API_URL para webhooks alcançáveis pelo container Evolution em dev local. */
import type { ApiEnvironment } from "./env";

function parseHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLoopbackUrl(url: string): boolean {
  const hostname = parseHostname(url);
  return hostname !== null && isLoopbackHost(hostname);
}

export function resolvePublicApiUrlForWebhooks(environment: ApiEnvironment): string {
  const trimmed = environment.publicApiUrl.trim().replace(/\/$/, "");

  if (environment.nodeEnv !== "development") {
    return trimmed;
  }

  const evolutionUrl = environment.evolutionApiUrl;
  if (!evolutionUrl || !isLoopbackUrl(evolutionUrl) || !isLoopbackUrl(trimmed)) {
    return trimmed;
  }

  const parsed = new URL(trimmed);
  parsed.hostname = "host.docker.internal";
  return parsed.origin;
}
