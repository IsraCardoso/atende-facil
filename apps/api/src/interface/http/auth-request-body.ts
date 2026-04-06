import type {
  CreateUserInput,
  LoginInput,
  RegisterTenantInput,
} from "../../application/dtos/auth-dtos";
import { createAppError } from "../../application/errors/app-error";
import {
  createEmailAddress,
  createUserRole,
  type EmailAddress,
  requireNonEmptyString,
  type TenantId,
  type UserRole,
} from "../../domain";

type RequestBody = Readonly<Record<string, unknown>>;

function toRequestBody(rawValue: unknown): RequestBody {
  if (typeof rawValue === "object" && rawValue !== null) {
    return rawValue as RequestBody;
  }

  throw createAppError("REQUEST_VALIDATION_ERROR", "Body inválido: esperado objeto JSON.");
}

function readRequiredString(body: RequestBody, fieldName: string): string {
  const rawValue = body[fieldName];

  if (typeof rawValue !== "string") {
    throw createAppError("REQUEST_VALIDATION_ERROR", `Campo obrigatório inválido: ${fieldName}.`);
  }

  try {
    return requireNonEmptyString(rawValue, fieldName);
  } catch (error: unknown) {
    throw createAppError(
      "REQUEST_VALIDATION_ERROR",
      `Campo obrigatório inválido: ${fieldName}.`,
      undefined,
      error,
    );
  }
}

function readOptionalString(body: RequestBody, fieldName: string): string | undefined {
  const rawValue = body[fieldName];

  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (typeof rawValue !== "string") {
    throw createAppError("REQUEST_VALIDATION_ERROR", `Campo opcional inválido: ${fieldName}.`);
  }

  return rawValue.trim() || undefined;
}

function parseEmail(rawValue: string, fieldName: string): EmailAddress {
  try {
    return createEmailAddress(rawValue);
  } catch (error: unknown) {
    throw createAppError(
      "REQUEST_VALIDATION_ERROR",
      `Campo inválido: ${fieldName}.`,
      undefined,
      error,
    );
  }
}

function parseRole(rawValue: string, fieldName: string): UserRole {
  try {
    return createUserRole(rawValue);
  } catch (error: unknown) {
    throw createAppError(
      "REQUEST_VALIDATION_ERROR",
      `Campo inválido: ${fieldName}.`,
      undefined,
      error,
    );
  }
}

export function parseRegisterTenantInput(rawBody: unknown): RegisterTenantInput {
  const body = toRequestBody(rawBody);

  return {
    tenantName: readRequiredString(body, "tenantName"),
    tenantSlug: readRequiredString(body, "tenantSlug"),
    adminDisplayName: readRequiredString(body, "adminDisplayName"),
    adminEmail: parseEmail(readRequiredString(body, "adminEmail"), "adminEmail"),
    adminPassword: readRequiredString(body, "adminPassword"),
  };
}

export function parseLoginInput(rawBody: unknown): LoginInput {
  const body = toRequestBody(rawBody);
  const tenantSlug = readOptionalString(body, "tenantSlug");

  return {
    email: parseEmail(readRequiredString(body, "email"), "email"),
    password: readRequiredString(body, "password"),
    ...(tenantSlug !== undefined ? { tenantSlug } : {}),
  };
}

export function parseCreateUserInput(
  rawBody: unknown,
  tenantId: TenantId,
  actorRole: UserRole,
): CreateUserInput {
  const body = toRequestBody(rawBody);

  return {
    tenantId,
    actorRole,
    displayName: readRequiredString(body, "displayName"),
    email: parseEmail(readRequiredString(body, "email"), "email"),
    password: readRequiredString(body, "password"),
    role: parseRole(readRequiredString(body, "role"), "role"),
  };
}
