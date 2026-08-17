import { hashPassword, verifyPassword } from "better-auth/crypto";

import type { PasswordHasherPort } from "../../domain/ports";

export function createBetterAuthPasswordHasherAdapter(): PasswordHasherPort {
  return {
    async hash(plainText: string): Promise<string> {
      return hashPassword(plainText);
    },
    async verify(plainText: string, hash: string): Promise<boolean> {
      return verifyPassword({
        hash,
        password: plainText,
      });
    },
  };
}
