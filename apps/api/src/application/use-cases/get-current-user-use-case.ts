/** Use case que retorna perfil do usuário autenticado com suas memberships. Usa cache para reduzir queries. */
import { toSafeUserProfile } from "../../domain";
import type { MembershipRepositoryPort, UserRepositoryPort } from "../../domain/ports";
import type { GetCurrentUserInput, GetCurrentUserOutput } from "../dtos/auth-dtos";
import { createAppError } from "../errors/app-error";
import type { IdentityCacheService, RbacPolicyService } from "../services";

type GetCurrentUserUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  identityCacheService: IdentityCacheService;
  rbacPolicyService: RbacPolicyService;
}>;

type GetCurrentUserUseCase = Readonly<{
  execute: (input: GetCurrentUserInput) => Promise<GetCurrentUserOutput>;
}>;

export function createGetCurrentUserUseCase(
  dependencies: GetCurrentUserUseCaseDependencies,
): GetCurrentUserUseCase {
  const { userRepository, membershipRepository, identityCacheService, rbacPolicyService } =
    dependencies;

  return {
    async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
      return identityCacheService.getOrLoad(
        {
          tenantId: input.tenantId,
          userId: input.userId,
          correlationId: input.correlationId,
        },
        async () => {
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

          rbacPolicyService.assertAllowed(activeMembership.role, "auth.users.read-current");
          const memberships = await membershipRepository.listByUserId(input.userId);

          return {
            user: toSafeUserProfile(user),
            memberships,
          };
        },
      );
    },
  };
}

export type { GetCurrentUserUseCase, GetCurrentUserUseCaseDependencies };
