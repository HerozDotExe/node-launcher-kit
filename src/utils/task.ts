import pQueue from "p-queue";

export class Task<T> {
  controller: AbortController;
  concurrency: number;
  queue?: pQueue;

  done: number;
  total: number;
  progressCallback: (done: number, total: number) => void;

  constructor(concurrency: number) {
    this.controller = new AbortController();
    this.concurrency = concurrency;
    this.queue = new pQueue({ concurrency: this.concurrency });
    this.done = 0;
    this.total = 0;
  }

  async _run(
    f: (element: unknown, signal: AbortSignal) => Promise<void>,
    data: T[],
  ) {
    try {
      for (const element of data) {
        this.queue.add(() => {
          f(element, this.controller.signal);
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") throw error;
      return;
    }

    this.queue.on("completed", () => {
      this.done++;
      this.progressCallback(this.done, this.total);
    });

    await this.queue.onIdle();
  }

  cancel() {
    this.queue.clear();
    this.controller.abort();
  }
}

// const t = new Task<{ url: string; path: string }>(5);

// class DownloadPool<T> extends Task<T> {}

// const dp = new DownloadPool<{ url: string; path: string }>(5);
