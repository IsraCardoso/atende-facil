/** Rotas de webhook WhatsApp. Recebe payloads de qualquer provider, valida assinatura, normaliza e processa via use case. */
import { Elysia } from "elysia";

import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  MetaChallengeInput,
  MetaChallengeResult,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import type { WhatsAppInstanceConfig, WhatsAppProvider } from "../../domain/whatsapp-types";
import { createWhatsAppInstanceId, isValidWhatsAppProvider } from "../../domain/whatsapp-types";
import { resolveProviderBundle } from "../../infrastructure/whatsapp";
import { resolveMetaChallenge } from "../../infrastructure/whatsapp/meta-adapter";
import { resolveCorrelationId } from "./correlation-id";

type ProcessIncomingMessagePort = Readonly<{
  execute: (
    input: Readonly<{
      tenantId: string;
      instanceConfig: WhatsAppInstanceConfig;
      message: Readonly<{
        messageId: string & { readonly __brand: "WhatsAppMessageId" };
        from: string & { readonly __brand: "Phone" };
        text: string;
        timestamp: number;
        provider: WhatsAppProvider;
        rawPayload: Readonly<Record<string, unknown>>;
      }>;
      correlationId: string;
    }>,
  ) => Promise<Readonly<{ processed: boolean }>>;
}>;

type CreateWebhookRoutesInput = Readonly<{
  instanceRepository: WhatsAppInstanceRepositoryPort;
  processIncomingMessage: ProcessIncomingMessagePort;
  logger: AppLoggerPort;
}>;

function buildInstanceConfig(
  provider: WhatsAppProvider,
  config: Readonly<Record<string, unknown>>,
): WhatsAppInstanceConfig {
  switch (provider) {
    case "evolution":
    case "zapi":
    case "uazapi":
    case "meta":
      return { provider, config } as unknown as WhatsAppInstanceConfig;
    default: {
      const Exhaustive: never = provider;
      throw new Error(`Provider não suportado: ${Exhaustive}`);
    }
  }
}

/** Cria rotas POST (inbound webhook) e GET (Meta challenge verification) sob /webhook/:tenantId/whatsapp/:instanceId. */
export function createWebhookRoutes(input: CreateWebhookRoutesInput) {
  const { instanceRepository, processIncomingMessage, logger } = input;

  return new Elysia({ prefix: "/webhook" })
    .post("/:tenantId/whatsapp/:instanceId", async ({ params, body, request, set }) => {
      const correlationId = resolveCorrelationId(request);
      const { tenantId, instanceId } = params;

      const instance = await instanceRepository.findByTenantAndId(
        tenantId,
        createWhatsAppInstanceId(instanceId),
      );

      if (!instance || !instance.active) {
        set.status = 404;
        return { error: "Instância não encontrada ou inativa." };
      }

      if (!isValidWhatsAppProvider(instance.provider)) {
        set.status = 400;
        return { error: "Provider não suportado." };
      }

      const provider = instance.provider;
      const bundle = resolveProviderBundle(provider);
      const instanceConfig = buildInstanceConfig(provider, instance.config);

      const headers: Readonly<Record<string, string | undefined>> = {};
      for (const [key, value] of request.headers.entries()) {
        (headers as Record<string, string | undefined>)[key] = value;
      }

      const verification = bundle.verifier.verify({
        headers,
        query: {},
        body,
        instanceConfig,
      });

      if (!verification.valid) {
        logger.warn("Webhook rejeitado por verificação.", {
          correlationId,
          tenantId: tenantId as string & { readonly __brand: "TenantId" },
          context: { reason: verification.reason },
        });
        set.status = 401;
        return { error: "Verificação de webhook falhou." };
      }

      const canonical = bundle.normalizer.normalize(body);
      if (!canonical) {
        set.status = 200;
        return { status: "ignored" };
      }

      await processIncomingMessage.execute({
        tenantId,
        instanceConfig,
        message: canonical,
        correlationId,
      });

      set.status = 200;
      return { status: "ok" };
    })
    .get("/:tenantId/whatsapp/:instanceId", async ({ params, query, set }) => {
      const { tenantId, instanceId } = params;

      const instance = await instanceRepository.findByTenantAndId(
        tenantId,
        createWhatsAppInstanceId(instanceId),
      );

      if (!instance || !instance.active || instance.provider !== "meta") {
        set.status = 404;
        return "Not Found";
      }

      const metaConfig = instance.config as Readonly<Record<string, unknown>>;
      const expectedToken =
        typeof metaConfig.verifyToken === "string" ? metaConfig.verifyToken : "";

      const challengeInput: MetaChallengeInput = {
        mode: typeof query["hub.mode"] === "string" ? query["hub.mode"] : undefined,
        verifyToken:
          typeof query["hub.verify_token"] === "string" ? query["hub.verify_token"] : undefined,
        challenge: typeof query["hub.challenge"] === "string" ? query["hub.challenge"] : undefined,
        expectedVerifyToken: expectedToken,
      };

      const result: MetaChallengeResult = resolveMetaChallenge(challengeInput);

      if (result.valid) {
        set.status = 200;
        set.headers["content-type"] = "text/plain";
        return result.challenge;
      }

      set.status = 403;
      return "Forbidden";
    });
}

export type { CreateWebhookRoutesInput };
