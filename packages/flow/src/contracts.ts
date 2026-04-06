import type { FlowEvent, ProcessResult } from "./types";

type FlowEventPublisherPort = Readonly<{
  publish: (event: FlowEvent) => Promise<void>;
}>;

type FlowExecutionObserverPort = Readonly<{
  onProcessed: (result: ProcessResult) => Promise<void> | void;
}>;

export type { FlowEventPublisherPort, FlowExecutionObserverPort };
