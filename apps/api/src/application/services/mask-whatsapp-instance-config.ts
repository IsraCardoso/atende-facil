/** Mascara segredos de config antes de expor na API (RN-029). */
import type { WhatsAppProvider } from "../../domain/whatsapp-types";

const SECRET_KEYS = new Set(["apiKey", "accessToken", "token", "clientToken", "apiToken"]);

function maskSecretValue(value: string): string {
  if (value.length <= 4) {
    return "••••";
  }
  return `••••${value.slice(-4)}`;
}

export function maskWhatsAppInstanceConfig(
  provider: WhatsAppProvider,
  config: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && SECRET_KEYS.has(key)) {
      masked[key] = maskSecretValue(value);
      masked[`has${key.charAt(0).toUpperCase()}${key.slice(1)}`] = true;
      continue;
    }
    masked[key] = value;
  }

  if (provider === "evolution") {
    masked.platformManaged = true;
    delete masked.apiKey;
    delete masked.apiUrl;
  }

  return masked;
}
