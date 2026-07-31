/** Erros de aplicação tipados com código e detalhes estruturados. Usados em toda camada de application e interface. */
type AppErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_UNAUTHORIZED"
  | "AUTH_FORBIDDEN"
  | "AUTH_TENANT_REQUIRED"
  | "TENANT_NOT_FOUND"
  | "TENANT_SLUG_ALREADY_EXISTS"
  | "TENANT_CONTEXT_CONFLICT"
  | "USER_NOT_FOUND"
  | "USER_EMAIL_ALREADY_EXISTS"
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_INVALID_TRANSITION"
  | "FLOW_NOT_FOUND"
  | "FLOW_INVALID_TRANSITION"
  | "FLOW_VALIDATION_FAILED"
  | "WHATSAPP_INSTANCE_NOT_FOUND"
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_LAST_ADMIN"
  | "MEMBERSHIP_SELF_ACTION_FORBIDDEN"
  | "AUTH_TENANT_AMBIGUOUS"
  | "REQUEST_VALIDATION_ERROR"
  | "INTERNAL_UNEXPECTED_ERROR";

type AppErrorDetails = Readonly<Record<string, unknown>>;

type AppErrorInput = Readonly<{
  code: AppErrorCode;
  message: string;
  httpStatus: number;
  details?: AppErrorDetails;
  cause?: unknown;
}>;

type AppErrorPayload = Readonly<{
  error: string;
  code: AppErrorCode;
  details?: AppErrorDetails;
}>;

const appErrorStatusByCode: Readonly<Record<AppErrorCode, number>> = {
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_UNAUTHORIZED: 401,
  AUTH_FORBIDDEN: 403,
  AUTH_TENANT_REQUIRED: 400,
  TENANT_NOT_FOUND: 404,
  TENANT_SLUG_ALREADY_EXISTS: 409,
  TENANT_CONTEXT_CONFLICT: 403,
  USER_NOT_FOUND: 404,
  USER_EMAIL_ALREADY_EXISTS: 409,
  CONVERSATION_NOT_FOUND: 404,
  CONVERSATION_INVALID_TRANSITION: 422,
  FLOW_NOT_FOUND: 404,
  FLOW_INVALID_TRANSITION: 422,
  FLOW_VALIDATION_FAILED: 422,
  WHATSAPP_INSTANCE_NOT_FOUND: 404,
  MEMBERSHIP_NOT_FOUND: 404,
  MEMBERSHIP_LAST_ADMIN: 409,
  MEMBERSHIP_SELF_ACTION_FORBIDDEN: 403,
  AUTH_TENANT_AMBIGUOUS: 409,
  REQUEST_VALIDATION_ERROR: 400,
  INTERNAL_UNEXPECTED_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details: AppErrorDetails | undefined;

  constructor(input: AppErrorInput) {
    super(input.message, {
      cause: input.cause,
    });
    this.name = "AppError";
    this.code = input.code;
    this.httpStatus = input.httpStatus;
    this.details = input.details;
  }
}

function createAppError(
  code: AppErrorCode,
  message: string,
  details?: AppErrorDetails,
  cause?: unknown,
): AppError {
  const errorInput: AppErrorInput = {
    code,
    message,
    httpStatus: appErrorStatusByCode[code],
    ...(details !== undefined ? { details } : {}),
    ...(cause !== undefined ? { cause } : {}),
  };

  return new AppError(errorInput);
}

function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

function toAppErrorPayload(error: AppError): AppErrorPayload {
  if (!error.details) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  return {
    error: error.message,
    code: error.code,
    details: error.details,
  };
}

export type { AppErrorCode, AppErrorDetails, AppErrorInput, AppErrorPayload };
export { appErrorStatusByCode, createAppError, isAppError, toAppErrorPayload };
