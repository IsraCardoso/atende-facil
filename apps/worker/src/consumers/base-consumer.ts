/** Contrato base para consumers de filas BullMQ. Define interface padrao para processamento de jobs. */
import type { Job } from "bullmq";

type ConsumerConfig = Readonly<{
  queueName: string;
  concurrency: number;
}>;

type BaseConsumer<TData = unknown, TResult = void> = Readonly<{
  getConfig: () => ConsumerConfig;
  processJob: (job: Job<TData>) => Promise<TResult>;
  onFailed: (job: Job<TData> | undefined, error: Error) => void;
}>;

export type { BaseConsumer, ConsumerConfig };
