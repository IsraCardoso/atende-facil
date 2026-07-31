import { createDatabaseConnection, createDatabaseUrl } from "db";

import { createFlowResolverService } from "./application/services/flow-resolver-service";
import { createGetChatwootSsoUrlUseCase } from "./application/use-cases/get-chatwoot-sso-url-use-case";
import { createGetIntegrationOperationalSummaryUseCase } from "./application/use-cases/integration";
import {
  createCreateScheduleUseCase,
  createDeleteScheduleUseCase,
  createListSchedulesUseCase,
  createUpdateScheduleUseCase,
} from "./application/use-cases/schedules";
import {
  createDeactivateWhatsAppIntegrationUseCase,
  createDisconnectWhatsAppUseCase,
  createGetWhatsAppConnectionStatusUseCase,
  createListWhatsAppInstancesUseCase,
  createStartWhatsAppPairingUseCase,
  createUpsertWhatsAppInstanceUseCase,
} from "./application/use-cases/whatsapp-integration";
import type { WhatsAppProvider } from "./domain/whatsapp-types";
import { createAuthModule } from "./infrastructure/auth";
import { createValkeyCacheAdapterFromUrl } from "./infrastructure/cache";
import type { ChatwootHttpConfig } from "./infrastructure/chatwoot/chatwoot-http-adapter";
import { createChatwootPlatformAdapter } from "./infrastructure/chatwoot/chatwoot-platform-adapter";
import { createChatwootPortFactory } from "./infrastructure/chatwoot/chatwoot-port-factory";
import type { ApiEnvironment } from "./infrastructure/config/env";
import { loadApiEnvironment } from "./infrastructure/config/env";
import { resolvePublicApiUrlForWebhooks } from "./infrastructure/config/resolve-public-api-url";
import { createConversationModule } from "./infrastructure/conversation";
import { createFlowModule } from "./infrastructure/flow";
import { createStructuredAppLoggerAdapter } from "./infrastructure/logger";
import { createJsonLogger, type StructuredLogger } from "./infrastructure/logger/json-logger";
import { createDrizzleFlowScheduleRepository } from "./infrastructure/repositories/drizzle-flow-schedule-repository";
import { createDrizzleTenantIntegrationRepository } from "./infrastructure/repositories/drizzle-tenant-integration-repository";
import { createInMemoryFlowScheduleRepository } from "./infrastructure/repositories/in-memory-flow-schedule-repository";
import { createInMemoryTenantIntegrationRepository } from "./infrastructure/repositories/in-memory-tenant-integration-repository";
import { createWhatsAppModule } from "./infrastructure/whatsapp";
import { createEvolutionInstanceProvisioner } from "./infrastructure/whatsapp/evolution-instance-provisioner";
import {
  describeEvolutionPlatformAvailability,
  toEvolutionPlatformConfig,
} from "./infrastructure/whatsapp/evolution-platform-config";
import { resolveProviderBundle } from "./infrastructure/whatsapp/provider-factory";
import { createApiServer } from "./interface/http/create-api-server";
import { startApiServer } from "./interface/http/start-api-server";

export type ApiRuntime = Readonly<{
  app: ReturnType<typeof createApiServer>;
  logger: StructuredLogger;
}>;

function buildGlobalChatwootConfig(environment: ApiEnvironment): ChatwootHttpConfig | undefined {
  if (
    !environment.chatwootApiUrl ||
    !environment.chatwootApiToken ||
    !environment.chatwootAccountId ||
    !environment.chatwootInboxId
  ) {
    return undefined;
  }

  return {
    apiUrl: environment.chatwootApiUrl,
    apiToken: environment.chatwootApiToken,
    accountId: environment.chatwootAccountId,
    inboxId: environment.chatwootInboxId,
  };
}

export function bootstrapApi(): ApiRuntime {
  const env = loadApiEnvironment();
  const logger = createJsonLogger({
    environment: env.nodeEnv,
    minimumLevel: env.logLevel,
  });
  const appLoggerPort = createStructuredAppLoggerAdapter(logger);

  const { db } = createDatabaseConnection(createDatabaseUrl(env.databaseUrl));

  const authModule = createAuthModule({
    environment: env,
    logger,
    db,
  });
  const flowModule = createFlowModule({ db });

  const scheduleRepository = db
    ? createDrizzleFlowScheduleRepository(db)
    : createInMemoryFlowScheduleRepository();

  const flowResolverCache = createValkeyCacheAdapterFromUrl({
    valkeyUrl: env.redisUrl,
    namespace: "api:flow-resolver",
  });

  const flowResolver = createFlowResolverService({
    scheduleRepository,
    flowRepository: flowModule.flowRepository,
    tenantRepository: authModule.tenantRepository,
    cache: flowResolverCache,
  });

  const tenantIntegrationRepository = db
    ? createDrizzleTenantIntegrationRepository(db)
    : createInMemoryTenantIntegrationRepository();

  const globalChatwootConfig = buildGlobalChatwootConfig(env);
  const resolveChatwootPort = createChatwootPortFactory({
    integrationRepository: tenantIntegrationRepository,
    ...(globalChatwootConfig ? { globalFallbackConfig: globalChatwootConfig } : {}),
    allowInMemoryFallback: env.nodeEnv === "development",
  });

  const whatsappModule = createWhatsAppModule({
    logger: appLoggerPort,
    db,
    redisUrl: env.redisUrl,
    flowResolver,
    devMockWhatsappSend: env.devMockWhatsappSend,
    resolveChatwootPort,
  });

  const evolutionPlatform = toEvolutionPlatformConfig(env);
  const platformDiagnostics = describeEvolutionPlatformAvailability(env);
  const publicApiUrlForWebhooks = resolvePublicApiUrlForWebhooks(env);
  const resolveWhatsAppConnection = (provider: WhatsAppProvider) =>
    resolveProviderBundle(provider).connection;
  const evolutionProvisioner =
    evolutionPlatform !== null ? createEvolutionInstanceProvisioner(evolutionPlatform) : null;

  const whatsappIntegration = {
    listInstances: createListWhatsAppInstancesUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      publicApiUrl: publicApiUrlForWebhooks,
    }),
    upsertInstance: createUpsertWhatsAppInstanceUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      evolutionPlatform,
      evolutionProvisioner,
      publicApiUrl: publicApiUrlForWebhooks,
    }),
    getConnectionStatus: createGetWhatsAppConnectionStatusUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      evolutionPlatform,
      resolveConnection: resolveWhatsAppConnection,
    }),
    startPairing: createStartWhatsAppPairingUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      evolutionPlatform,
      resolveConnection: resolveWhatsAppConnection,
    }),
    disconnect: createDisconnectWhatsAppUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      evolutionPlatform,
      resolveConnection: resolveWhatsAppConnection,
    }),
    deactivate: createDeactivateWhatsAppIntegrationUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      evolutionPlatform,
      evolutionProvisioner,
      resolveConnection: resolveWhatsAppConnection,
    }),
    getOperationalSummary: createGetIntegrationOperationalSummaryUseCase({
      instanceRepository: whatsappModule.instanceRepository,
      flowRepository: flowModule.flowRepository,
      evolutionPlatform,
      platformDiagnostics,
      resolveConnection: resolveWhatsAppConnection,
    }),
  };

  const conversationModule = createConversationModule({
    sessionRepository: whatsappModule.sessionRepository,
    instanceRepository: whatsappModule.instanceRepository,
    logger: appLoggerPort,
    chatwootAccessConfig: {
      chatwootAppUrl: env.chatwootAppUrl,
      chatwootAccountId: env.chatwootAccountId ?? "1",
    },
    db,
  });

  // Login único: só disponível quando há Platform App token. Sem ele, o painel
  // continua funcionando com deep link e o atendente loga no Chatwoot manualmente.
  const getChatwootSsoUrl =
    env.chatwootApiUrl && env.chatwootPlatformToken
      ? createGetChatwootSsoUrlUseCase({
          userRepository: authModule.userRepository,
          chatwootPlatform: createChatwootPlatformAdapter({
            apiUrl: env.chatwootApiUrl,
            platformToken: env.chatwootPlatformToken,
            accountId: env.chatwootAccountId ?? "1",
          }),
          logger: appLoggerPort,
        })
      : undefined;

  const createSchedule = createCreateScheduleUseCase({
    scheduleRepository,
    flowRepository: flowModule.flowRepository,
  });
  const listSchedules = createListSchedulesUseCase({ scheduleRepository });
  const updateSchedule = createUpdateScheduleUseCase({ scheduleRepository });
  const deleteSchedule = createDeleteScheduleUseCase({ scheduleRepository });

  const app = createApiServer({
    environment: env,
    logger,
    auth: authModule,
    whatsapp: {
      instanceRepository: whatsappModule.instanceRepository,
      processIncomingMessage: whatsappModule.processIncomingMessage,
      logger: appLoggerPort,
      integration: whatsappIntegration,
    },
    conversation: {
      syncChatwootMessage: conversationModule.syncChatwootMessage,
      syncChatwootStatus: conversationModule.syncChatwootStatus,
      listConversations: conversationModule.listConversations,
      getConversation: conversationModule.getConversation,
      chatwootAccess: conversationModule.chatwootAccess,
      sessionRepository: conversationModule.sessionRepository,
      connectionManager: conversationModule.connectionManager,
      authTokenPort: authModule.authTokenPort,
      chatwootWebhookToken: env.chatwootWebhookToken ?? "",
      logger: appLoggerPort,
      ...(getChatwootSsoUrl ? { getChatwootSsoUrl } : {}),
    },
    flow: {
      createFlow: flowModule.createFlow,
      updateFlowDefinition: flowModule.updateFlowDefinition,
      getFlow: flowModule.getFlow,
      listFlows: flowModule.listFlows,
      deleteFlow: flowModule.deleteFlow,
      publishFlow: flowModule.publishFlow,
      activateFlow: flowModule.activateFlow,
      deactivateFlow: flowModule.deactivateFlow,
      archiveFlow: flowModule.archiveFlow,
      validateFlow: flowModule.validateFlow,
    },
    schedule: {
      createSchedule,
      listSchedules,
      updateSchedule,
      deleteSchedule,
    },
    tenant: {
      tenantRepository: authModule.tenantRepository,
    },
  });

  startApiServer({
    app,
    environment: env,
    logger,
  });

  return {
    app,
    logger,
  };
}

bootstrapApi();
