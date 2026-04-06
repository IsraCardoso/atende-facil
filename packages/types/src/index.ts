type TenantId = string & { readonly _brand: "TenantId" };
type CorrelationId = string & { readonly _brand: "CorrelationId" };
type Email = string & { readonly _brand: "Email" };

function createTenantId(rawValue: string): TenantId {
  if (!rawValue.trim()) {
    throw new Error("TenantId inválido: valor vazio.");
  }

  return rawValue as TenantId;
}

function createCorrelationId(rawValue: string): CorrelationId {
  if (!rawValue.trim()) {
    throw new Error("CorrelationId inválido: valor vazio.");
  }

  return rawValue as CorrelationId;
}

function createEmail(rawValue: string): Email {
  const normalizedEmail = rawValue.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new Error(`Email inválido: ${rawValue}.`);
  }

  return normalizedEmail as Email;
}

export type { CorrelationId, Email, TenantId };
export { createCorrelationId, createEmail, createTenantId };
