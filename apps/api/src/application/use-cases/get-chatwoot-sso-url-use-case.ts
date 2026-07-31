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
import type { UserId } from "../../domain/auth-types";
import type { AppLoggerPort, UserRepositoryPort } from "../../domain/ports";
import type { ChatwootPlatformPort } from "../../domain/ports/chatwoot-platform-ports";

type GetChatwootSsoUrlInput = Readonly<{
  userId: UserId;
  role: UserRole;
  correlationId: string;
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
  chatwootPlatform: ChatwootPlatformPort;
  logger: AppLoggerPort;
}>;

/** Papéis do Atende Fácil mapeados para os do Chatwoot, que só tem agent e administrator. */
function toChatwootRole(role: UserRole): "agent" | "administrator" {
  return role === "admin" ? "administrator" : "agent";
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
  const { userRepository, chatwootPlatform, logger } = dependencies;

  async function ensureChatwootUserId(userId: UserId, role: UserRole): Promise<string> {
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

    await chatwootPlatform.addUserToAccount({
      chatwootUserId,
      role: toChatwootRole(role),
    });

    await userRepository.setChatwootUserId(userId, chatwootUserId);

    return chatwootUserId;
  }

  return {
    async execute(input: GetChatwootSsoUrlInput): Promise<GetChatwootSsoUrlOutput> {
      try {
        const chatwootUserId = await ensureChatwootUserId(input.userId, input.role);
        const ssoUrl = await chatwootPlatform.createSsoUrl(chatwootUserId);

        return { ssoUrl: appendRedirect(ssoUrl, input.redirectPath) };
      } catch (error: unknown) {
        // Falha de SSO degrada para o deep link: o atendente ainda alcança o Chatwoot.
        logger.warn("Falha ao emitir SSO do Chatwoot", {
          correlationId: input.correlationId,
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
