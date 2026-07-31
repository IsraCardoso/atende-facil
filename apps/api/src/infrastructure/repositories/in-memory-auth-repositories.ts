import type { TenantEntity, TenantMembershipEntity, UserEntity } from "../../domain";
import type {
  MembershipRepositoryPort,
  TenantRepositoryPort,
  UserRepositoryPort,
} from "../../domain/ports";

type InMemoryAuthRepositories = Readonly<{
  userRepository: UserRepositoryPort;
  tenantRepository: TenantRepositoryPort;
  membershipRepository: MembershipRepositoryPort;
}>;

function createUserRepository(store: {
  usersById: Map<string, UserEntity>;
  userIdByEmail: Map<string, string>;
}): UserRepositoryPort {
  return {
    async create(user: UserEntity): Promise<UserEntity> {
      if (store.usersById.has(user.id)) {
        throw new Error("Usuário já cadastrado para o id informado.");
      }

      if (store.userIdByEmail.has(user.email)) {
        throw new Error("Usuário já cadastrado para o e-mail informado.");
      }

      store.usersById.set(user.id, user);
      store.userIdByEmail.set(user.email, user.id);
      return user;
    },
    async findById(userId) {
      return store.usersById.get(userId) ?? null;
    },
    async findByEmail(email) {
      const userId = store.userIdByEmail.get(email);

      if (!userId) {
        return null;
      }

      return store.usersById.get(userId) ?? null;
    },
    async setChatwootUserId(userId, chatwootUserId): Promise<void> {
      const user = store.usersById.get(userId);

      if (!user) {
        throw new Error("Usuário não encontrado para vincular ao Chatwoot.");
      }

      store.usersById.set(userId, { ...user, chatwootUserId, updatedAt: new Date() });
    },
  };
}

function createTenantRepository(store: {
  tenantsById: Map<string, TenantEntity>;
  tenantIdBySlug: Map<string, string>;
}): TenantRepositoryPort {
  return {
    async create(tenant: TenantEntity): Promise<TenantEntity> {
      if (store.tenantsById.has(tenant.id)) {
        throw new Error("Tenant já cadastrado para o id informado.");
      }

      if (store.tenantIdBySlug.has(tenant.slug)) {
        throw new Error("Tenant já cadastrado para o slug informado.");
      }

      store.tenantsById.set(tenant.id, tenant);
      store.tenantIdBySlug.set(tenant.slug, tenant.id);
      return tenant;
    },
    async findById(tenantId) {
      return store.tenantsById.get(tenantId) ?? null;
    },
    async findBySlug(slug) {
      const tenantId = store.tenantIdBySlug.get(slug);

      if (!tenantId) {
        return null;
      }

      return store.tenantsById.get(tenantId) ?? null;
    },

    async updateTimezone(tenantId, timezone) {
      const tenant = store.tenantsById.get(tenantId);
      if (tenant) {
        store.tenantsById.set(tenantId, { ...tenant, timezone, updatedAt: new Date() });
      }
    },
  };
}

function createTenantUserKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

function createMembershipRepository(store: {
  membershipsById: Map<string, TenantMembershipEntity>;
  membershipIdByTenantUser: Map<string, string>;
  membershipIdsByUser: Map<string, string[]>;
}): MembershipRepositoryPort {
  return {
    async create(membership: TenantMembershipEntity): Promise<TenantMembershipEntity> {
      if (store.membershipsById.has(membership.id)) {
        throw new Error("Membership já cadastrada para o id informado.");
      }

      const tenantUserKey = createTenantUserKey(membership.tenantId, membership.userId);

      if (store.membershipIdByTenantUser.has(tenantUserKey)) {
        throw new Error("Membership já cadastrada para o vínculo tenant/usuário informado.");
      }

      store.membershipsById.set(membership.id, membership);
      store.membershipIdByTenantUser.set(tenantUserKey, membership.id);

      const membershipIds = store.membershipIdsByUser.get(membership.userId) ?? [];
      membershipIds.push(membership.id);
      store.membershipIdsByUser.set(membership.userId, membershipIds);

      return membership;
    },
    async findByUserAndTenant(userId, tenantId) {
      const membershipId = store.membershipIdByTenantUser.get(
        createTenantUserKey(tenantId, userId),
      );

      if (!membershipId) {
        return null;
      }

      return store.membershipsById.get(membershipId) ?? null;
    },
    async listByUserId(userId) {
      const membershipIds = store.membershipIdsByUser.get(userId) ?? [];
      return membershipIds
        .map((membershipId) => store.membershipsById.get(membershipId))
        .filter((membership): membership is TenantMembershipEntity => membership !== undefined);
    },
  };
}

export function createInMemoryAuthRepositories(): InMemoryAuthRepositories {
  const usersById = new Map<string, UserEntity>();
  const userIdByEmail = new Map<string, string>();
  const tenantsById = new Map<string, TenantEntity>();
  const tenantIdBySlug = new Map<string, string>();
  const membershipsById = new Map<string, TenantMembershipEntity>();
  const membershipIdByTenantUser = new Map<string, string>();
  const membershipIdsByUser = new Map<string, string[]>();

  return {
    userRepository: createUserRepository({
      usersById,
      userIdByEmail,
    }),
    tenantRepository: createTenantRepository({
      tenantsById,
      tenantIdBySlug,
    }),
    membershipRepository: createMembershipRepository({
      membershipsById,
      membershipIdByTenantUser,
      membershipIdsByUser,
    }),
  };
}

export type { InMemoryAuthRepositories };
