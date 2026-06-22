/** Middleware de rate limiting usando fixed-window counter. Retorna 429 quando limite excedido (RN-025). */
import { Elysia } from "elysia";

type RateLimitConfig = Readonly<{
  windowMs: number;
  maxRequests: number;
}>;

type WindowEntry = {
  count: number;
  resetAt: number;
};

export function createInMemoryRateLimiter() {
  const windows = new Map<string, WindowEntry>();

  return {
    check(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterSeconds: number } {
      const now = Date.now();
      const entry = windows.get(key);

      if (!entry || now >= entry.resetAt) {
        windows.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (entry.count >= config.maxRequests) {
        const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
        return { allowed: false, retryAfterSeconds };
      }

      entry.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

function extractClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

const RATE_LIMITS: Readonly<Record<string, RateLimitConfig>> = {
  login: { windowMs: 60_000, maxRequests: 5 },
  webhook: { windowMs: 60_000, maxRequests: 100 },
  flow: { windowMs: 60_000, maxRequests: 30 },
  whatsapp: { windowMs: 60_000, maxRequests: 10 },
};

export function resolveRateLimitCategory(path: string, method: string): string | null {
  if (path.includes("/auth/login") && method === "POST") {
    return "login";
  }
  if (path.includes("/webhook")) {
    return "webhook";
  }
  if (path.includes("/flows")) {
    return "flow";
  }
  if (
    path.includes("/integrations/whatsapp/instances") &&
    (path.endsWith("/pair") || path.endsWith("/status"))
  ) {
    return "whatsapp";
  }
  return null;
}

/** Plugin Elysia de rate limiting. Aplica limites diferenciados por categoria de rota. */
export function rateLimitPlugin() {
  const limiter = createInMemoryRateLimiter();

  return new Elysia({ name: "rate-limit" }).onBeforeHandle(({ request, set }) => {
    const url = new URL(request.url);
    const category = resolveRateLimitCategory(url.pathname, request.method);

    if (!category) {
      return;
    }

    const config = RATE_LIMITS[category];
    if (!config) {
      return;
    }

    const ip = extractClientIp(request);
    const key = `rl:${category}:${ip}`;
    const result = limiter.check(key, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.retryAfterSeconds),
          },
        },
      );
    }
  });
}

export { RATE_LIMITS, type RateLimitConfig };
