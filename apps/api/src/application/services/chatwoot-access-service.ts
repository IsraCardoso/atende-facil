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

  return {
    get isAppConfigured(): boolean {
      return baseUrl !== null && baseUrl.length > 0;
    },

    generateAccessUrls(chatwootConversationId: ChatwootConversationId): ChatwootAccessUrls {
      if (!baseUrl) {
        return { embedUrl: null, deepLink: null };
      }

      const conversationPath = this.conversationPath(chatwootConversationId);

      // embedUrl e deepLink apontam para o mesmo lugar; a diferença é o SSO que o caller
      // prefixa no embedUrl para o iframe abrir já autenticado.
      return {
        embedUrl: `${baseUrl}${conversationPath}`,
        deepLink: `${baseUrl}${conversationPath}`,
      };
    },

    /** Caminho relativo da conversa — usado como redirect_url do SSO. */
    conversationPath(chatwootConversationId: ChatwootConversationId): string {
      return `/app/accounts/${chatwootAccountId}/conversations/${chatwootConversationId}`;
    },

    get dashboardPath(): string {
      return `/app/accounts/${chatwootAccountId}/dashboard`;
    },

    generatePortalUrl(): ChatwootPortalUrl {
      if (!baseUrl) {
        return { portalUrl: null };
      }
      return {
        portalUrl: `${baseUrl}${this.dashboardPath}`,
      };
    },
  };
}

export type { ChatwootAccessConfig, ChatwootAccessUrls, ChatwootPortalUrl };
export { createChatwootAccessService };
