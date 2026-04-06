import type { AppLoggerPort, LoggerMetadata } from "../../domain/ports";
import type { StructuredLogger } from "./json-logger";

function toStructuredLoggerMetadata(
  metadata: LoggerMetadata,
): Parameters<StructuredLogger["info"]>[1] {
  return {
    correlationId: metadata.correlationId,
    ...(metadata.tenantId ? { tenantId: metadata.tenantId } : {}),
    ...(metadata.context ? { context: metadata.context } : {}),
  };
}

export function createStructuredAppLoggerAdapter(logger: StructuredLogger): AppLoggerPort {
  return {
    debug(message: string, metadata: LoggerMetadata): void {
      logger.debug(message, toStructuredLoggerMetadata(metadata));
    },
    info(message: string, metadata: LoggerMetadata): void {
      logger.info(message, toStructuredLoggerMetadata(metadata));
    },
    warn(message: string, metadata: LoggerMetadata): void {
      logger.warn(message, toStructuredLoggerMetadata(metadata));
    },
    error(message: string, metadata: LoggerMetadata): void {
      logger.error(message, toStructuredLoggerMetadata(metadata));
    },
  };
}
