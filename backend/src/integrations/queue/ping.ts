import { eq } from "drizzle-orm";
import { Queue, Worker, type Job } from "bullmq";

import { db } from "@/integrations/drizzle/client";
import { queuePing } from "@/integrations/drizzle/schema";
import { logger } from "@/lib/logger";
import { onShutdown } from "@/lib/shutdown";

import { createQueueConnection } from "./connection";

export const PING_QUEUE_NAME = "ping";

export type PingJobData = {
  message: string;
};

let pingQueue: Queue<PingJobData> | null = null;
let pingWorker: Worker<PingJobData> | null = null;
let queueConnection: ReturnType<typeof createQueueConnection> | null = null;
let workerConnection: ReturnType<typeof createQueueConnection> | null = null;

function getQueueConnection() {
  if (!queueConnection) {
    queueConnection = createQueueConnection();
    onShutdown(async () => {
      await queueConnection?.quit();
      queueConnection = null;
    });
  }
  return queueConnection;
}

export function getPingQueue(): Queue<PingJobData> {
  if (!pingQueue) {
    pingQueue = new Queue<PingJobData>(PING_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    onShutdown(async () => {
      await pingQueue?.close();
      pingQueue = null;
    });
  }
  return pingQueue;
}

export async function enqueuePing(message: string): Promise<{ jobId: string }> {
  const job = await getPingQueue().add("ping", { message });
  if (!job.id) throw new Error("Failed to enqueue ping job");
  return { jobId: job.id };
}

async function processPing(job: Job<PingJobData>): Promise<{ id: string }> {
  const [row] = await db
    .insert(queuePing)
    .values({ message: job.data.message })
    .returning({ id: queuePing.id });

  if (!row) throw new Error("Failed to insert queue_ping row");
  logger.info({ jobId: job.id, pingId: row.id }, "ping job completed");
  return row;
}

/** Start the in-process ping worker (registers graceful shutdown drain). */
export function startPingWorker(): Worker<PingJobData> {
  if (pingWorker) return pingWorker;

  workerConnection = createQueueConnection();
  pingWorker = new Worker<PingJobData>(PING_QUEUE_NAME, processPing, {
    connection: workerConnection,
    concurrency: 1,
  });

  pingWorker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "ping job failed");
  });

  onShutdown(async () => {
    await pingWorker?.close();
    pingWorker = null;
    await workerConnection?.quit();
    workerConnection = null;
  });

  return pingWorker;
}

/** Wait until a ping job completes and return the DB row written by the worker. */
export async function waitForPingJob(
  jobId: string,
  timeoutMs = 15_000,
): Promise<{ id: string; message: string; createdAt: Date }> {
  startPingWorker();
  const queue = getPingQueue();
  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`ping job not found: ${jobId}`);

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await job.getState();
    if (state === "completed") {
      const returnvalue = job.returnvalue as { id?: string } | undefined;
      if (returnvalue?.id) {
        const [row] = await db.select().from(queuePing).where(eq(queuePing.id, returnvalue.id));
        if (row) return row;
      }
      const [byMessage] = await db
        .select()
        .from(queuePing)
        .where(eq(queuePing.message, job.data.message))
        .limit(1);
      if (byMessage) return byMessage;
    }
    if (state === "failed") {
      throw new Error(`ping job failed: ${job.failedReason ?? "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  throw new Error(`ping job timed out after ${timeoutMs}ms`);
}

export async function closePingQueueResources(): Promise<void> {
  await pingWorker?.close();
  pingWorker = null;
  await pingQueue?.close();
  pingQueue = null;
  await workerConnection?.quit();
  workerConnection = null;
  await queueConnection?.quit();
  queueConnection = null;
}
