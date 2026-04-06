/** Factory de providers WhatsApp. Resolve o bundle correto via switch exaustivo — erro de compilação se um provider for esquecido. */
import type { ProviderBundle } from "../../domain/ports/whatsapp-ports";
import type { WhatsAppProvider } from "../../domain/whatsapp-types";
import { createEvolutionAdapter } from "./evolution-adapter";
import { createMetaAdapter } from "./meta-adapter";
import { createUazapiAdapter } from "./uazapi-adapter";
import { createZapiAdapter } from "./zapi-adapter";

function assertNeverProvider(value: never): never {
  throw new Error(`Provider não suportado: ${JSON.stringify(value)}`);
}

/** Resolve sender, normalizer e verifier para o provider dado. @throws {Error} Se provider não suportado (compilação impede via never). */
export function resolveProviderBundle(provider: WhatsAppProvider): ProviderBundle {
  switch (provider) {
    case "evolution":
      return createEvolutionAdapter();
    case "meta":
      return createMetaAdapter();
    case "zapi":
      return createZapiAdapter();
    case "uazapi":
      return createUazapiAdapter();
    default:
      return assertNeverProvider(provider);
  }
}
