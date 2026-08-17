import type { FlowEvent, ProcessResult } from "./types";

/** Ports opcionais do flow engine. Permitem observar execução e publicar eventos sem acoplar a infraestrutura. */
type FlowEventPublisherPort = Readonly<{
  publish: (event: FlowEvent) => Promise<void>;
}>;

type FlowExecutionObserverPort = Readonly<{
  onProcessed: (result: ProcessResult) => Promise<void> | void;
}>;

export type { FlowEventPublisherPort, FlowExecutionObserverPort };
