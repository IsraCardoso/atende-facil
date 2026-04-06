import { toSafeUserProfile } from "../../domain";
import type { MembershipRepositoryPort, UserRepositoryPort } from "../../domain/ports";
import type { GetCurrentUserInput, GetCurrentUserOutput } from "../dtos/auth-dtos";
import { createAppError } from "../errors/app-error";

type GetCurrentUserUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
}>;

type GetCurrentUserUseCase = Readonly<{
  execute: (input: GetCurrentUserInput) => Promise<GetCurrentUserOutput>;
}>;

export function createGetCurrentUserUseCase(
  dependencies: GetCurrentUserUseCaseDependencies,
): GetCurrentUserUseCase {
  const { userRepository, membershipRepository } = dependencies;

  return {
    async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
      const user = await userRepository.findById(input.userId);

      if (!user) {
        throw createAppError("USER_NOT_FOUND", "Usuário autenticado não foi encontrado.");
      }

      const activeMembership = await membershipRepository.findByUserAndTenant(
        input.userId,
        input.tenantId,
      );

      if (!activeMembership || activeMembership.status !== "active") {
        throw createAppError(
          "AUTH_FORBIDDEN",
          "Usuário sem vínculo ativo para o tenant autenticado.",
        );
      }

      const memberships = await membershipRepository.listByUserId(input.userId);

      return {
        user: toSafeUserProfile(user),
        memberships,
      };
    },
  };
}

export type { GetCurrentUserUseCase, GetCurrentUserUseCaseDependencies };
