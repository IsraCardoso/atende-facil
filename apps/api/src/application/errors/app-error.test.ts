import { describe, expect, it } from "vitest";

import {
  AppError,
  appErrorStatusByCode,
  createAppError,
  isAppError,
  toAppErrorPayload,
} from "./app-error";

describe("app-error", () => {
  it("should create app error using cataloged status code", () => {
    const error = createAppError("AUTH_INVALID_CREDENTIALS", "Credenciais invalidas.");

    expect(error.httpStatus).toBe(401);
    expect(error.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(isAppError(error)).toBe(true);
  });

  it("should include details in payload when available", () => {
    const error = createAppError("REQUEST_VALIDATION_ERROR", "Payload invalido.", {
      field: "email",
    });

    expect(toAppErrorPayload(error)).toEqual({
      error: "Payload invalido.",
      code: "REQUEST_VALIDATION_ERROR",
      details: {
        field: "email",
      },
    });
  });

  it("should expose payload without details when details are absent", () => {
    const error = new AppError({
      code: "AUTH_FORBIDDEN",
      message: "Acesso negado.",
      httpStatus: appErrorStatusByCode.AUTH_FORBIDDEN,
    });

    expect(toAppErrorPayload(error)).toEqual({
      error: "Acesso negado.",
      code: "AUTH_FORBIDDEN",
    });
  });

  it("should return false for non AppError values", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("error")).toBe(false);
  });
});
