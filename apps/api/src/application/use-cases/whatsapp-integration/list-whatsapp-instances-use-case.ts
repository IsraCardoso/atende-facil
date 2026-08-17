/** Lista instâncias WhatsApp do tenant com config mascarada (RN-029). */

import type { WhatsAppInstanceRepositoryPort } from "../../../domain/ports/whatsapp-ports";
import type { MaskedWhatsAppInstanceDto } from "../../../domain/whatsapp-connection-types";
import { mapWhatsAppInstanceToDto } from "./map-instance-dto";

type ListWhatsAppInstancesInput = Readonly<{
  tenantId: string;
}>;

type ListWhatsAppInstancesOutput = Readonly<{
  instances: readonly MaskedWhatsAppInstanceDto[];
}>;

type ListWhatsAppInstancesUseCase = Readonly<{
  execute: (input: ListWhatsAppInstancesInput) => Promise<ListWhatsAppInstancesOutput>;
}>;

export function createListWhatsAppInstancesUseCase(deps: {
  instanceRepository: WhatsAppInstanceRepositoryPort;
  publicApiUrl: string;
}): ListWhatsAppInstancesUseCase {
  return {
    async execute(input: ListWhatsAppInstancesInput): Promise<ListWhatsAppInstancesOutput> {
      const rows = await deps.instanceRepository.listByTenant(input.tenantId);
      return {
        instances: rows.map((row) => mapWhatsAppInstanceToDto(row, deps.publicApiUrl)),
      };
    },
  };
}

export type {
  ListWhatsAppInstancesInput,
  ListWhatsAppInstancesOutput,
  ListWhatsAppInstancesUseCase,
};
