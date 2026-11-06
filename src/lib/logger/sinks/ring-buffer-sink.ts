import {
	appendLogEntries,
	readLogEntries,
} from "../repositories/log-repository";
import type { LogEntry, LogSink } from "../types";

export const RING_SIZE = 500;
const FLUSH_DELAY_MS = 2000;
/** More than this waiting means the store is stuck: drop the oldest, never grow. */
const MAX_PENDING = 200;

type Store = {
	append: (entries: readonly LogEntry[], keep: number) => Promise<void>;
	read: () => Promise<LogEntry[]>;
};

export type RingBufferSink = LogSink & {
	/** Everything stored plus what has not been written yet, oldest first. Never rejects. */
	recent(): Promise<LogEntry[]>;
};

/**
 * The last `RING_SIZE` entries, kept across app restarts in a separate store
 * (see repositories/log-repository.ts). Writes are batched and async: `write`
 * only queues; the queue goes to disk after a short delay, at once for an
 * error (the app may be about to die), and on `flush`. A store failure drops
 * that batch — logging never retries forever and never throws.
 */
export function createRingBufferSink(
	store: Store = { append: appendLogEntries, read: readLogEntries },
	options: { keep?: number; delayMs?: number } = {},
): RingBufferSink {
	const keep = options.keep ?? RING_SIZE;
	const delayMs = options.delayMs ?? FLUSH_DELAY_MS;
	let pending: LogEntry[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	let chain: Promise<void> = Promise.resolve();

	function flush(): Promise<void> {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
		const batch = pending;
		pending = [];
		if (batch.length === 0) return chain;
		chain = chain.then(() => store.append(batch, keep)).catch(() => undefined);
		return chain;
	}

	return {
		write(entry) {
			pending.push(entry);
			if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);
			if (entry.level === "error") {
				void flush();
			} else if (timer === undefined) {
				timer = setTimeout(() => void flush(), delayMs);
				(timer as { unref?: () => void }).unref?.();
			}
		},
		flush,
		async recent() {
			await flush();
			try {
				return await store.read();
			} catch {
				return [];
			}
		},
	};
}
