/**
 * Emite a URL de login único no Chatwoot para o usuário autenticado no Atende Fácil.
 *
 * O espelho no Chatwoot é provisionado sob demanda no primeiro acesso (lazy) e o vínculo
 * fica persistido em users.chatwoot_user_id — assim usuários que já existiam antes da
 * federação também passam a funcionar, sem migração de dados.
 *
 * O token da URL é de uso único: o caller deve pedir uma nova a cada abertura.
 */
import type { UserRole } from "../../domain";
import type { TenantId, UserId } from "../../domain/auth-types";
import type { AppLoggerPort, UserRepositoryPort } from "../../domain/ports";
import type { ChatwootPlatformPortResolver } from "../../domain/ports/chatwoot-platform-ports";

type GetChatwootSsoUrlInput = Readonly<{
  userId: UserId;
  role: UserRole;
  correlationId: string;
  tenantId: TenantId;
  /** Caminho relativo dentro do Chatwoot para onde redirecionar após o login. */
  redirectPath?: string | undefined;
}>;

type GetChatwootSsoUrlOutput = Readonly<{
  ssoUrl: string | null;
  reason?: string;
}>;

type GetChatwootSsoUrlUseCase = Readonly<{
  execute: (input: GetChatwootSsoUrlInput) => Promise<GetChatwootSsoUrlOutput>;
}>;

type GetChatwootSsoUrlUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  resolveChatwootPlatform: ChatwootPlatformPortResolver;
  logger: AppLoggerPort;
}>;

/**
 * Todo espelho entra no Chatwoot como "agent", nunca "administrator" — mesmo para admin do
 * Atende Fácil. `POST /auth/register-tenant` é público e concede "admin" a qualquer
 * autocadastro; mapear isso para administrator no Chatwoot compartilhado seria escalação de
 * privilégio via autocadastro. Promoção a administrator do Chatwoot é ação manual do operador.
 */
function toChatwootRole(_role: UserRole): "agent" | "administrator" {
  return "agent";
}

/** Senha aleatória do espelho. O login acontece só por SSO, então ela nunca é usada. */
function generateMirrorPassword(): string {
  return `Af-${crypto.randomUUID()}`;
}

function appendRedirect(ssoUrl: string, redirectPath: string | undefined): string {
  if (!redirectPath) {
    return ssoUrl;
  }

  const url = new URL(ssoUrl);
  url.searchParams.set("redirect_url", redirectPath);
  return url.toString();
}

export function createGetChatwootSsoUrlUseCase(
  dependencies: GetChatwootSsoUrlUseCaseDependencies,
): GetChatwootSsoUrlUseCase {
  const { userRepository, resolveChatwootPlatform, logger } = dependencies;

  async function ensureChatwootUserId(
    userId: UserId,
    role: UserRole,
    chatwootPlatform: Awaited<ReturnType<ChatwootPlatformPortResolver>>,
  ): Promise<string> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error("Usuário autenticado não encontrado para federar no Chatwoot.");
    }

    if (user.chatwootUserId) {
      return user.chatwootUserId;
    }

    const chatwootUserId = await chatwootPlatform.createUser({
      email: user.email,
      displayName: user.displayName,
      password: generateMirrorPassword(),
    });

    // Persiste o vínculo ANTES de addUserToAccount: se o bind à conta falhar, o próximo
    // acesso reconhece o espelho existente e não tenta criar de novo com o mesmo e-mail
    // (o que o Chatwoot rejeitaria). O preço é que uma falha aqui deixa o usuário criado
    // mas sem membership na conta — recuperável manualmente pelo operador, nunca travado.
    await userRepository.setChatwootUserId(userId, chatwootUserId);

    await chatwootPlatform.addUserToAccount({
      chatwootUserId,
      role: toChatwootRole(role),
    });

    return chatwootUserId;
  }

  return {
    async execute(input: GetChatwootSsoUrlInput): Promise<GetChatwootSsoUrlOutput> {
      try {
        const chatwootPlatform = await resolveChatwootPlatform(input.tenantId);
        const chatwootUserId = await ensureChatwootUserId(
          input.userId,
          input.role,
          chatwootPlatform,
        );
        const ssoUrl = await chatwootPlatform.createSsoUrl(chatwootUserId);

        return { ssoUrl: appendRedirect(ssoUrl, input.redirectPath) };
      } catch (error: unknown) {
        // Falha de SSO degrada para o deep link: o atendente ainda alcança o Chatwoot.
        logger.warn("Falha ao emitir SSO do Chatwoot", {
          correlationId: input.correlationId,
          tenantId: input.tenantId,
          context: {
            userId: input.userId,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        return {
          ssoUrl: null,
          reason: "Não foi possível emitir o login único do Chatwoot.",
        };
      }
    },
  };
}

export type {
  GetChatwootSsoUrlInput,
  GetChatwootSsoUrlOutput,
  GetChatwootSsoUrlUseCase,
  GetChatwootSsoUrlUseCaseDependencies,
};
