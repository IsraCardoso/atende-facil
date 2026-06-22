/** Credenciais globais da Evolution API — gerenciadas pela plataforma Atende Fácil (RN-029). */
type EvolutionPlatformConfig = Readonly<{
  apiUrl: string;
  apiKey: string;
}>;

export type { EvolutionPlatformConfig };
