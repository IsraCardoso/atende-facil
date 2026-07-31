/**
 * Monta caminhos de acesso ao Chatwoot (deep link e caminho relativo da conversa).
 *
 * A AUTENTICAÇÃO não acontece aqui: quem emite o login único é a Platform API do Chatwoot,
 * via get-chatwoot-sso-url-use-case. Este serviço só resolve para ONDE ir depois do login.
 */
import type { ChatwootConversationId } from "../../domain/whatsapp-types";

type ChatwootAccessConfig = Readonly<{
  chatwootAppUrl: string | null;
  chatwootAccountId: string;
}>;

type ChatwootAccessUrls = Readonly<{
  embedUrl: string | null;
  deepLink: string | null;
}>;

type ChatwootPortalUrl = Readonly<{
  portalUrl: string | null;
}>;

function createChatwootAccessService(config: ChatwootAccessConfig) {
  const { chatwootAppUrl, chatwootAccountId } = config;
  const baseUrl = chatwootAppUrl?.replace(/\/$/, "") ?? null;

  /** Caminho relativo da conversa — usado como redirect_url do SSO. */
  function conversationPath(chatwootConversationId: ChatwootConversationId): string {
    return `/app/accounts/${chatwootAccountId}/conversations/${chatwootConversationId}`;
  }

  const dashboardPath = `/app/accounts/${chatwootAccountId}/dashboard`;

  return {
    get isAppConfigured(): boolean {
      return baseUrl !== null && baseUrl.length > 0;
    },

    // O caller SEM SSO deve tratar embedUrl===null explicitamente (não renderizar um iframe
    // não-autenticado). Só quem tem SSO substitui embedUrl pela URL de login único.
    generateAccessUrls(chatwootConversationId: ChatwootConversationId): ChatwootAccessUrls {
      if (!baseUrl) {
        return { embedUrl: null, deepLink: null };
      }

      return {
        embedUrl: null,
        deepLink: `${baseUrl}${conversationPath(chatwootConversationId)}`,
      };
    },

    conversationPath,

    get dashboardPath(): string {
      return dashboardPath;
    },

    generatePortalUrl(): ChatwootPortalUrl {
      if (!baseUrl) {
        return { portalUrl: null };
      }
      return {
        portalUrl: `${baseUrl}${dashboardPath}`,
      };
    },
  };
}

export type { ChatwootAccessConfig, ChatwootAccessUrls, ChatwootPortalUrl };
export { createChatwootAccessService };
