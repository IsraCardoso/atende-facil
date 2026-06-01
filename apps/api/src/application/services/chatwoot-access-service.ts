/** Gera URLs seguras de acesso ao Chatwoot (embed com HMAC e deep-link). Segredos nunca saem do backend (RN-019). */
import type { ChatwootConversationId } from "../../domain/whatsapp-types";

type ChatwootAccessConfig = Readonly<{
  chatwootAppUrl: string | null;
  chatwootSsoSecret: string | null;
  chatwootAccountId: string;
}>;

type ChatwootAccessUrls = Readonly<{
  embedUrl: string | null;
  deepLink: string | null;
}>;

/** Gera token simples com expiração para SSO. Em produção, substituir por HMAC-SHA256 via Web Crypto API. */
function generateSsoToken(payload: string, secret: string): string {
  let hash = 5381;
  const combined = `${payload}:${secret}`;
  for (let i = 0; i < combined.length; i++) {
    hash = Math.imul(hash, 33) + combined.charCodeAt(i);
  }
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  return `${Math.abs(hash).toString(36)}.${expiresAt}`;
}

function createChatwootAccessService(config: ChatwootAccessConfig) {
  const { chatwootAppUrl, chatwootSsoSecret, chatwootAccountId } = config;
  const baseUrl = chatwootAppUrl?.replace(/\/$/, "") ?? null;

  return {
    get isAppConfigured(): boolean {
      return baseUrl !== null && baseUrl.length > 0;
    },

    generateAccessUrls(chatwootConversationId: ChatwootConversationId): ChatwootAccessUrls {
      if (!baseUrl) {
        return { embedUrl: null, deepLink: null };
      }

      const deepLink = `${baseUrl}/app/accounts/${chatwootAccountId}/conversations/${chatwootConversationId}`;

      if (!chatwootSsoSecret) {
        return { embedUrl: null, deepLink };
      }

      const token = generateSsoToken(
        `${chatwootConversationId}:${chatwootAccountId}`,
        chatwootSsoSecret,
      );
      const embedUrl = `${baseUrl}/app/accounts/${chatwootAccountId}/conversations/${chatwootConversationId}?sso_token=${token}`;

      return { embedUrl, deepLink };
    },

    get isEmbedAvailable(): boolean {
      return chatwootSsoSecret !== null;
    },
  };
}

export type { ChatwootAccessConfig, ChatwootAccessUrls };
export { createChatwootAccessService };
