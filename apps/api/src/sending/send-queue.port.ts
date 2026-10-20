export const SEND_QUEUE = Symbol('SEND_QUEUE');

export interface SendJob {
  resultId: string;
  /** epoch ms at which the message should be sent */
  sendAt: number;
}

export interface SendQueue {
  enqueue(jobs: SendJob[]): Promise<void>;
}

/** Default no-op queue so the app boots before the BullMQ worker (Task 13) overrides it. */
export class NoopSendQueue implements SendQueue {
  public readonly enqueued: SendJob[] = [];
  async enqueue(jobs: SendJob[]): Promise<void> {
    this.enqueued.push(...jobs);
  }
}
