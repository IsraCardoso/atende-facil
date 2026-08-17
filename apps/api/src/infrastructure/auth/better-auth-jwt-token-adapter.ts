import { signJWT, verifyJWT } from "better-auth/crypto";

import { createTenantId, createUserId, createUserRole, requireNonEmptyString } from "../../domain";
import type { AuthTokenPort, JwtTokenClaims, JwtTokenIssueInput } from "../../domain/ports";

type BetterAuthJwtTokenAdapterConfig = Readonly<{
  secret: string;
  tokenTtlSeconds: number;
}>;

type JwtPayload = Readonly<Record<string, unknown>>;

function toStringValue(payload: JwtPayload, key: string): string {
  const value = payload[key];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new Error(`Claim JWT obrigatória ausente: ${key}.`);
}

function toNumberValue(payload: JwtPayload, key: string): number {
  const value = payload[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new Error(`Claim JWT obrigatória ausente: ${key}.`);
}

function parseClaims(payload: JwtPayload): JwtTokenClaims {
  return {
    sub: createUserId(toStringValue(payload, "sub")),
    tenantId: createTenantId(toStringValue(payload, "tenantId")),
    role: createUserRole(toStringValue(payload, "role")),
    iat: toNumberValue(payload, "iat"),
    exp: toNumberValue(payload, "exp"),
  };
}

function toSignPayload(input: JwtTokenIssueInput): JwtPayload {
  return {
    sub: input.sub,
    tenantId: input.tenantId,
    role: input.role,
  };
}

export function createBetterAuthJwtTokenAdapter(
  config: BetterAuthJwtTokenAdapterConfig,
): AuthTokenPort {
  const secret = requireNonEmptyString(config.secret, "AUTH_SECRET");

  if (!Number.isInteger(config.tokenTtlSeconds) || config.tokenTtlSeconds < 60) {
    throw new Error("AUTH_TOKEN_TTL_SECONDS inválido. Informe um inteiro maior ou igual a 60.");
  }

  return {
    async issue(claims: JwtTokenIssueInput): Promise<string> {
      const payload = toSignPayload(claims);
      return signJWT(payload, secret, config.tokenTtlSeconds);
    },
    async verify(token: string): Promise<JwtTokenClaims> {
      const normalizedToken = requireNonEmptyString(token, "JWT");
      const payload = await verifyJWT<JwtPayload>(normalizedToken, secret);

      if (!payload) {
        throw new Error("Token JWT inválido.");
      }

      return parseClaims(payload);
    },
  };
}

export type { BetterAuthJwtTokenAdapterConfig };
