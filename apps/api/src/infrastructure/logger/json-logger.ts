import type { LoggerLevel, RuntimeEnvironment } from "../config/env";

type LogContext = Readonly<Record<string, unknown>>;

type LoggerMetadata = Readonly<{
  correlationId: string;
  context?: LogContext;
}>;

type JsonLogEntry = Readonly<{
  timestamp: string;
  level: LoggerLevel;
  environment: RuntimeEnvironment;
  message: string;
  correlationId: string;
  context?: LogContext;
}>;

type JsonLoggerConfig = Readonly<{
  environment: RuntimeEnvironment;
  minimumLevel: LoggerLevel;
}>;

type StructuredLogger = Readonly<{
  debug: (message: string, metadata: LoggerMetadata) => void;
  info: (message: string, metadata: LoggerMetadata) => void;
  warn: (message: string, metadata: LoggerMetadata) => void;
  error: (message: string, metadata: LoggerMetadata) => void;
}>;

const loggerLevelOrder: Readonly<Record<LoggerLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type RuntimeProcess = Readonly<{
  stdout?: Readonly<{
    write: (chunk: string) => void;
  }>;
  stderr?: Readonly<{
    write: (chunk: string) => void;
  }>;
}>;

declare const process: RuntimeProcess | undefined;

function getRuntimeProcess(): RuntimeProcess | null {
  if (typeof process === "undefined") {
    return null;
  }

  return process;
}

function shouldEmitLog(minimumLevel: LoggerLevel, level: LoggerLevel): boolean {
  return loggerLevelOrder[level] >= loggerLevelOrder[minimumLevel];
}

function createLogEntry(
  config: JsonLoggerConfig,
  level: LoggerLevel,
  message: string,
  metadata: LoggerMetadata,
): JsonLogEntry {
  const baseEntry = {
    timestamp: new Date().toISOString(),
    level,
    environment: config.environment,
    message,
    correlationId: metadata.correlationId,
  };

  if (!metadata.context) {
    return baseEntry;
  }

  return {
    ...baseEntry,
    context: metadata.context,
  };
}

function writeJsonLog(level: LoggerLevel, payload: JsonLogEntry): void {
  const runtimeProcess = getRuntimeProcess();

  if (!runtimeProcess) {
    return;
  }

  const serializedPayload = `${JSON.stringify(payload)}\n`;
  const output =
    level === "error" || level === "warn" ? runtimeProcess.stderr : runtimeProcess.stdout;

  output?.write(serializedPayload);
}

export function createJsonLogger(config: JsonLoggerConfig): StructuredLogger {
  function emit(level: LoggerLevel, message: string, metadata: LoggerMetadata): void {
    if (!shouldEmitLog(config.minimumLevel, level)) {
      return;
    }

    const payload = createLogEntry(config, level, message, metadata);
    writeJsonLog(level, payload);
  }

  return {
    debug(message, metadata) {
      emit("debug", message, metadata);
    },
    info(message, metadata) {
      emit("info", message, metadata);
    },
    warn(message, metadata) {
      emit("warn", message, metadata);
    },
    error(message, metadata) {
      emit("error", message, metadata);
    },
  };
}

export type { JsonLoggerConfig, LoggerMetadata, StructuredLogger };
