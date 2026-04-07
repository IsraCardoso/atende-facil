/** Repositorio Drizzle de usuarios. Persistencia real em PostgreSQL (RN-024). */
import { eq, type PostgresJsDatabase, type schema, usersTable } from "db";

import { createUserEntity, type UserEntity } from "../../domain/auth-entities";
import type { EmailAddress, UserId } from "../../domain/auth-types";
import type { UserRepositoryPort } from "../../domain/ports";

type UserRow = typeof usersTable.$inferSelect;

function mapRowToEntity(row: UserRow): UserEntity {
  return createUserEntity({
    id: row.id as UserId,
    email: row.email as EmailAddress,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function createDrizzleUserRepository(
  db: PostgresJsDatabase<typeof schema>,
): UserRepositoryPort {
  return {
    async create(user: UserEntity): Promise<UserEntity> {
      const rows = await db
        .insert(usersTable)
        .values({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Falha ao criar usuario: nenhuma linha retornada.");
      }

      return mapRowToEntity(row);
    },

    async findById(userId: UserId): Promise<UserEntity | null> {
      const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },

    async findByEmail(email: EmailAddress): Promise<UserEntity | null> {
      const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

      const row = rows[0];
      return row ? mapRowToEntity(row) : null;
    },
  };
}
