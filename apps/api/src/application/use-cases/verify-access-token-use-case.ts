import { requireNonEmptyString } from "../../domain";
import type { AuthTokenPort, JwtTokenClaims } from "../../domain/ports";
import { createAppError } from "../errors/app-error";

type VerifyAccessTokenUseCaseDependencies = Readonly<{
  authTokenPort: AuthTokenPort;
}>;

type VerifyAccessTokenUseCase = Readonly<{
  execute: (token: string) => Promise<JwtTokenClaims>;
}>;

export function createVerifyAccessTokenUseCase(
  dependencies: VerifyAccessTokenUseCaseDependencies,
): VerifyAccessTokenUseCase {
  const { authTokenPort } = dependencies;

  return {
    async execute(token: string): Promise<JwtTokenClaims> {
      const normalizedToken = requireNonEmptyString(token, "Authorization token");

      try {
        return await authTokenPort.verify(normalizedToken);
      } catch (error: unknown) {
        throw createAppError(
          "AUTH_UNAUTHORIZED",
          "Token ausente, inválido ou expirado.",
          undefined,
          error,
        );
      }
    },
  };
}

export type { VerifyAccessTokenUseCase, VerifyAccessTokenUseCaseDependencies };
