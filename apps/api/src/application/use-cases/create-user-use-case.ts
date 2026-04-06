import {
  createTenantMembershipEntity,
  createTenantMembershipId,
  createUserEntity,
  createUserId,
  requireNonEmptyString,
  toSafeUserProfile,
} from "../../domain";
import type {
  MembershipRepositoryPort,
  PasswordHasherPort,
  UserRepositoryPort,
} from "../../domain/ports";
import type { CreateUserInput, CreateUserOutput } from "../dtos/auth-dtos";
import { createAppError } from "../errors/app-error";
import { requireAllowedRole } from "../services";

type IdGenerator = () => string;

type CreateUserUseCaseDependencies = Readonly<{
  userRepository: UserRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
  passwordHasher: PasswordHasherPort;
  idGenerator?: IdGenerator;
}>;

type CreateUserUseCase = Readonly<{
  execute: (input: CreateUserInput) => Promise<CreateUserOutput>;
}>;

function defaultIdGenerator(): string {
  return crypto.randomUUID();
}

export function createCreateUserUseCase(
  dependencies: CreateUserUseCaseDependencies,
): CreateUserUseCase {
  const {
    userRepository,
    membershipRepository,
    passwordHasher,
    idGenerator = defaultIdGenerator,
  } = dependencies;

  return {
    async execute(input: CreateUserInput): Promise<CreateUserOutput> {
      requireAllowedRole({
        currentRole: input.actorRole,
        allowedRoles: ["admin"],
      });

      const existingUser = await userRepository.findByEmail(input.email);

      if (existingUser) {
        throw createAppError("USER_EMAIL_ALREADY_EXISTS", "O e-mail informado já está em uso.");
      }

      let password: string;

      try {
        password = requireNonEmptyString(input.password, "CreateUser.password");
      } catch (error: unknown) {
        throw createAppError(
          "REQUEST_VALIDATION_ERROR",
          "Senha inválida para criação de usuário.",
          undefined,
          error,
        );
      }

      const passwordHash = await passwordHasher.hash(password);
      const createdEntities = (() => {
        try {
          const user = createUserEntity({
            id: createUserId(idGenerator()),
            email: input.email,
            displayName: input.displayName,
            passwordHash,
          });

          const membership = createTenantMembershipEntity({
            id: createTenantMembershipId(idGenerator()),
            tenantId: input.tenantId,
            userId: user.id,
            role: input.role,
            status: "active",
          });

          return {
            user,
            membership,
          };
        } catch (error: unknown) {
          throw createAppError(
            "REQUEST_VALIDATION_ERROR",
            "Payload de criação de usuário inválido.",
            undefined,
            error,
          );
        }
      })();
      const { user, membership } = createdEntities;

      await userRepository.create(user);
      await membershipRepository.create(membership);

      return {
        user: toSafeUserProfile(user),
        membership,
      };
    },
  };
}

export type { CreateUserUseCase, CreateUserUseCaseDependencies };
