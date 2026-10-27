import { useEffect, useState } from "react";
import {
	createOpenApiTaskRunner,
	type OpenApiTaskKind,
	type OpenApiTaskRequest,
	type OpenApiTaskResult,
	type OpenApiTaskRunner,
	type OpenApiWorkerMessage,
	type OpenApiWorkerReply,
} from "./openApiWorkerTasks";

export type OpenApiWorkerClient = {
	/**
	 * Runs a task off the main thread. Resolves `null` when a newer task of the
	 * same kind was requested meanwhile, so callers only ever apply the latest.
	 */
	run<K extends OpenApiTaskKind>(
		kind: K,
		request: OpenApiTaskRequest<K>,
	): Promise<OpenApiTaskResult<K> | null>;
	/** Terminates the worker and drops pending tasks; the next `run` starts a fresh worker. */
	dispose(): void;
};

type PendingTask = {
	message: OpenApiWorkerMessage;
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
};

/**
 * One worker per client, spawned on the first `run`. Each kind has at most one
 * task posted at a time; newer ones wait (replacing any older waiter), so quick
 * selection changes don't pile up minify jobs. Without `Worker` support, or if
 * the worker fails to load, tasks run on the main thread instead.
 */
export function createOpenApiWorkerClient(): OpenApiWorkerClient {
	let worker: Worker | null = null;
	/** Set once the worker path is unavailable — tasks then run in-thread. */
	let inThreadRunner: OpenApiTaskRunner | null = null;
	let nextId = 0;
	const latestId = new Map<OpenApiTaskKind, number>();
	const posted = new Map<number, PendingTask>();
	const waiting = new Map<OpenApiTaskKind, PendingTask>();

	const finish = (reply: OpenApiWorkerReply) => {
		const task = posted.get(reply.id);
		if (!task) return;
		posted.delete(reply.id);
		const { id, kind } = task.message;
		if (latestId.get(kind) !== id) task.resolve(null);
		else if (reply.ok) task.resolve(reply.result);
		else task.reject(new Error(reply.error));

		const next = waiting.get(kind);
		if (next) {
			waiting.delete(kind);
			dispatch(next);
		}
	};

	const runInThread = (task: PendingTask) => {
		const run = (inThreadRunner ??= createOpenApiTaskRunner());
		const { id, kind, request } = task.message;
		// Deferred, so the caller's pending state can paint before the work blocks.
		setTimeout(() => {
			if (!posted.has(id)) return;
			try {
				finish({ id, ok: true, result: run(kind, request) });
			} catch (error) {
				finish({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
			}
		}, 0);
	};

	const spawn = (): Worker | null => {
		if (typeof Worker === "undefined") return null;
		try {
			const created = new Worker(new URL("./openApi.worker.ts", import.meta.url), {
				type: "module",
			});
			created.onmessage = (event: MessageEvent<OpenApiWorkerReply>) => finish(event.data);
			created.onerror = (event) => {
				// Failed to load or crashed: finish its tasks here and stop using workers.
				event.preventDefault();
				created.terminate();
				worker = null;
				inThreadRunner ??= createOpenApiTaskRunner();
				for (const task of posted.values()) runInThread(task);
			};
			return created;
		} catch {
			return null;
		}
	};

	const dispatch = (task: PendingTask) => {
		posted.set(task.message.id, task);
		if (!worker && !inThreadRunner) worker = spawn();
		if (worker) worker.postMessage(task.message);
		else runInThread(task);
	};

	return {
		run<K extends OpenApiTaskKind>(kind: K, request: OpenApiTaskRequest<K>) {
			const message = { id: ++nextId, kind, request } as OpenApiWorkerMessage;
			latestId.set(kind, message.id);
			return new Promise<OpenApiTaskResult<K> | null>((resolve, reject) => {
				const task: PendingTask = {
					message,
					resolve: resolve as (result: unknown) => void,
					reject,
				};
				const busy = [...posted.values()].some((item) => item.message.kind === kind);
				if (!busy) {
					dispatch(task);
					return;
				}
				waiting.get(kind)?.resolve(null);
				waiting.set(kind, task);
			});
		},
		dispose() {
			worker?.terminate();
			worker = null;
			for (const task of [...posted.values(), ...waiting.values()]) task.resolve(null);
			posted.clear();
			waiting.clear();
		},
	};
}

/** A worker client scoped to the calling component; the worker is terminated on unmount. */
export function useOpenApiWorker(): OpenApiWorkerClient {
	const [client] = useState(createOpenApiWorkerClient);
	useEffect(() => () => client.dispose(), [client]);
	return client;
}
