/**
 * Port da Platform API do Chatwoot — espelho de usuários e emissão de SSO.
 * Mantém o domínio livre do transporte HTTP e do formato do Platform App token.
 */

type ChatwootPlatformCreateUserInput = Readonly<{
  email: string;
  displayName: string;
  /** Senha do espelho. Nunca é a senha do Atende Fácil: o acesso se dá só por SSO. */
  password: string;
}>;

type ChatwootPlatformAddUserInput = Readonly<{
  chatwootUserId: string;
  role: "agent" | "administrator";
}>;

type ChatwootPlatformPort = Readonly<{
  createUser: (input: ChatwootPlatformCreateUserInput) => Promise<string>;
  addUserToAccount: (input: ChatwootPlatformAddUserInput) => Promise<void>;
  /** Emite URL de login único. O token embutido é de uso ÚNICO — gerar por abertura. */
  createSsoUrl: (chatwootUserId: string) => Promise<string>;
}>;

export type { ChatwootPlatformAddUserInput, ChatwootPlatformCreateUserInput, ChatwootPlatformPort };
