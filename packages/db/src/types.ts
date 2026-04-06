/** Branded types de infraestrutura de dados. DatabaseUrl e ValkeyUrl previnem mistura acidental de connection strings. */
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type DatabaseUrl = Brand<string, "DatabaseUrl">;
type ValkeyUrl = Brand<string, "ValkeyUrl">;

type DatabaseConfiguration = Readonly<{
  databaseUrl: DatabaseUrl;
  valkeyUrl: ValkeyUrl;
}>;

type QueryResultRow = Readonly<Record<string, unknown>>;

export type { DatabaseConfiguration, DatabaseUrl, QueryResultRow, ValkeyUrl };
