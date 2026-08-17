/** Gera nome de instância Evolution único por tenant — gerenciado pela plataforma. */
export function buildEvolutionInstanceName(tenantSlug: string): string {
  const normalized = tenantSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base = normalized.length > 0 ? normalized : "tenant";
  return `af-${base}`.slice(0, 64);
}
