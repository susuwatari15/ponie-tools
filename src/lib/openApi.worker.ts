import {
	createOpenApiTaskRunner,
	type OpenApiWorkerMessage,
	type OpenApiWorkerReply,
} from "./openApiWorkerTasks";

/** The DOM lib has no `DedicatedWorkerGlobalScope`, so type just what is used. */
const scope = self as unknown as {
	onmessage: ((event: MessageEvent<OpenApiWorkerMessage>) => void) | null;
	postMessage: (reply: OpenApiWorkerReply) => void;
};

const run = createOpenApiTaskRunner();

scope.onmessage = ({ data }) => {
	try {
		scope.postMessage({ id: data.id, ok: true, result: run(data.kind, data.request) });
	} catch (error) {
		scope.postMessage({
			id: data.id,
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
