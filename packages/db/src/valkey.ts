import { createClient } from "redis";

import type { ValkeyUrl } from "./types";

type ValkeyClient = Readonly<{
  isOpen: boolean;
  connect: () => Promise<unknown>;
  ping: () => Promise<string>;
  quit: () => Promise<string>;
}>;

type ValkeyClientFactory = (url: ValkeyUrl) => ValkeyClient;

function defaultValkeyClientFactory(url: ValkeyUrl): ValkeyClient {
  return createClient({
    url,
  });
}

async function closeValkeyClient(client: ValkeyClient): Promise<void> {
  if (!client.isOpen) {
    return;
  }

  await client.quit();
}

export async function validateValkeyConnection(
  valkeyUrl: ValkeyUrl,
  clientFactory: ValkeyClientFactory = defaultValkeyClientFactory,
): Promise<void> {
  const client = clientFactory(valkeyUrl);

  try {
    await client.connect();
    const pingResponse = await client.ping();

    if (pingResponse !== "PONG") {
      throw new Error(`Resposta inesperada no ping do Valkey: ${pingResponse}.`);
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "erro desconhecido";
    throw new Error(`Falha de conexão com Valkey: ${reason}.`);
  } finally {
    await closeValkeyClient(client);
  }
}

export type { ValkeyClient, ValkeyClientFactory };
