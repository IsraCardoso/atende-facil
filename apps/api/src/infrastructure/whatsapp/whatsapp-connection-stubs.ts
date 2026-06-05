/** Stubs de conexão para provedores sem pareamento QR na v1. */
import type { WhatsAppConnectionPort } from "../../domain/ports/whatsapp-ports";

function createUnsupportedPairingConnection(
  getStatus: WhatsAppConnectionPort["getStatus"],
): WhatsAppConnectionPort {
  return {
    getStatus,
    async startPairing() {
      throw new Error("WHATSAPP_PAIRING_NOT_SUPPORTED");
    },
    async disconnect() {
      /* noop */
    },
  };
}

export function createMetaConnectionAdapter(): WhatsAppConnectionPort {
  return createUnsupportedPairingConnection(async () => ({
    status: "disconnected",
    reason: "Meta Cloud API: configure credenciais e valide o webhook.",
  }));
}

export function createZapiConnectionAdapter(): WhatsAppConnectionPort {
  return createUnsupportedPairingConnection(async () => ({
    status: "error",
    reason: "Z-API: pareamento via UI ainda não disponível.",
  }));
}

export function createUazapiConnectionAdapter(): WhatsAppConnectionPort {
  return createUnsupportedPairingConnection(async () => ({
    status: "error",
    reason: "Uazapi: pareamento via UI ainda não disponível.",
  }));
}
