const correlationIdHeaderName = "x-correlation-id";
const systemCorrelationId = "system";

function createFallbackCorrelationId(): string {
  return `generated-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRuntimeCorrelationId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return createFallbackCorrelationId();
}

export function resolveCorrelationId(request: Request): string {
  const correlationIdFromHeader = request.headers.get(correlationIdHeaderName)?.trim();

  if (correlationIdFromHeader) {
    return correlationIdFromHeader;
  }

  return createRuntimeCorrelationId();
}

export { correlationIdHeaderName, systemCorrelationId };
