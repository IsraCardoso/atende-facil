import { createDatabaseConnection, createDatabaseUrl } from "db";

import { createFlowResolverService } from "./application/services/flow-resolver-service";
import {
  createCreateScheduleUseCase,
  createDeleteScheduleUseCase,
  createListSchedulesUseCase,
  createUpdateScheduleUseCase,
} from "./application/use-cases/schedules";
import { createAuthModule } from "./infrastructure/auth";
import { loadApiEnvironment } from "./infrastructure/config/env";
import { createConversationModule } from "./infrastructure/conversation";
import { createFlowModule } from "./infrastructure/flow";
import { createStructuredAppLoggerAdapter } from "./infrastructure/logger";
import { createJsonLogger, type StructuredLogger } from "./infrastructure/logger/json-logger";
import { createDrizzleFlowScheduleRepository } from "./infrastructure/repositories/drizzle-flow-schedule-repository";
import { createInMemoryFlowScheduleRepository } from "./infrastructure/repositories/in-memory-flow-schedule-repository";
import { createWhatsAppModule } from "./infrastructure/whatsapp";
import { createApiServer } from "./interface/http/create-api-server";
import { startApiServer } from "./interface/http/start-api-server";

export type ApiRuntime = Readonly<{
  app: ReturnType<typeof createApiServer>;
  logger: StructuredLogger;
}>;

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

  const flowResolver = createFlowResolverService({
    scheduleRepository,
    flowRepository: flowModule.flowRepository,
    tenantRepository: authModule.tenantRepository,
  });

  const whatsappModule = createWhatsAppModule({
    logger: appLoggerPort,
    db,
    flowResolver,
  });

  const conversationModule = createConversationModule({
    sessionRepository: whatsappModule.sessionRepository,
    instanceRepository: whatsappModule.instanceRepository,
    logger: appLoggerPort,
    chatwootAccessConfig: {
      chatwootAppUrl: env.chatwootAppUrl ?? "http://localhost:3000",
      chatwootSsoSecret: env.chatwootSsoSecret,
      chatwootAccountId: env.chatwootAccountId ?? "1",
    },
    db,
  });

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
    },
    conversation: {
      syncChatwootMessage: conversationModule.syncChatwootMessage,
      syncChatwootStatus: conversationModule.syncChatwootStatus,
      listConversations: conversationModule.listConversations,
      getConversation: conversationModule.getConversation,
      chatwootAccess: conversationModule.chatwootAccess,
      connectionManager: conversationModule.connectionManager,
      authTokenPort: authModule.authTokenPort,
      chatwootWebhookToken: env.chatwootWebhookToken ?? "",
      logger: appLoggerPort,
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
