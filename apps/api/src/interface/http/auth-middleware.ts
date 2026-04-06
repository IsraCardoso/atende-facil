import { createAppError } from "../../application/errors/app-error";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { JwtTokenClaims } from "../../domain/ports";

function extractBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw createAppError("AUTH_UNAUTHORIZED", "Token Bearer ausente.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw createAppError("AUTH_UNAUTHORIZED", "Header Authorization inválido.");
  }

  return token;
}

export async function authenticateRequest(
  request: Request,
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase,
): Promise<JwtTokenClaims> {
  const token = extractBearerToken(request);
  return verifyAccessTokenUseCase.execute(token);
}

export { extractBearerToken };
