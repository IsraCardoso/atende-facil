/** Helpers para extrair mensagens legíveis de respostas de erro da API. */
import type { ApiResponse } from "./api-client";

type ApiErrorBody = Readonly<{
  error: string;
  code?: string;
}>;

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  WHATSAPP_PLATFORM_UNAVAILABLE:
    "Integração WhatsApp indisponível neste ambiente. Verifique EVOLUTION_API_URL e EVOLUTION_API_KEY ou contate o administrador.",
  EVOLUTION_PROVISION_FAILED:
    "Não foi possível provisionar a instância na Evolution API. Tente novamente ou contate o suporte.",
  EVOLUTION_REQUEST_FAILED: "Falha ao comunicar com a Evolution API. Tente novamente em instantes.",
  WHATSAPP_NOT_FOUND: "Instância WhatsApp não encontrada.",
  WHATSAPP_INVALID_PROVIDER: "Provedor WhatsApp inválido.",
  WHATSAPP_PAIRING_NOT_SUPPORTED: "Pareamento QR não suportado para este provedor.",
  WHATSAPP_CONFIG_INVALID: "Configuração da instância WhatsApp inválida.",
  AUTH_FORBIDDEN: "Você não tem permissão para esta ação.",
  AUTH_UNAUTHORIZED: "Sessão expirada. Faça login novamente.",
  INTERNAL_UNEXPECTED_ERROR:
    "Erro interno no servidor. Verifique se as migrations do banco estão aplicadas (`bun run db:migrate`) e reinicie a API.",
};

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const record = data as ApiErrorBody;
  return typeof record.error === "string";
}

export function mapApiErrorCodeToMessage(code: string | undefined, fallback: string): string {
  if (!code) {
    return fallback;
  }

  const mapped = ERROR_MESSAGES[code];
  if (mapped) {
    return mapped;
  }

  if (code.startsWith("EVOLUTION_")) {
    return ERROR_MESSAGES.EVOLUTION_REQUEST_FAILED ?? fallback;
  }

  return fallback;
}

export function getApiErrorMessage(response: ApiResponse<unknown>): string {
  if (response.ok) {
    return "";
  }

  const data = response.data;
  if (isApiErrorBody(data)) {
    return mapApiErrorCodeToMessage(data.code, data.error);
  }

  if (response.status === 403) {
    return ERROR_MESSAGES.AUTH_FORBIDDEN ?? "Acesso negado.";
  }

  if (response.status === 401) {
    return ERROR_MESSAGES.AUTH_UNAUTHORIZED ?? "Não autorizado.";
  }

  if (response.status >= 500) {
    return (
      ERROR_MESSAGES.INTERNAL_UNEXPECTED_ERROR ??
      "Erro interno no servidor. Tente novamente em instantes."
    );
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}

export type { ApiErrorBody };
