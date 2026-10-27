import { describe, expect, it } from "vitest";
import { loadFixture, readFixture } from "./__fixtures__";
import { compareOpenApiRawJson } from "./openApiCompare";
import { createOpenApiWorkerClient } from "./openApiWorkerClient";
import { createOpenApiTaskRunner, shouldRunOffThread } from "./openApiWorkerTasks";
import {
	buildEndpointIndex,
	DEFAULT_MINIFY_OPTIONS,
	minifySwaggerWithOptions,
} from "./swaggerMinifier";

const rawJson = readFixture("openapi3");
const doc = loadFixture("openapi3");
const labels = { labelA: "v1", labelB: "v2" };

describe("createOpenApiTaskRunner", () => {
	it("matches the synchronous lib functions", () => {
		const run = createOpenApiTaskRunner();
		const index = run("index", { rawJson });
		expect(index.endpoints).toEqual(buildEndpointIndex(doc));
		expect(index.fullSpecSize.bytes).toBe(JSON.stringify(doc).length);

		const endpointIds = index.endpoints.slice(0, 2).map((item) => item.id);
		const minified = run("minify", { rawJson, endpointIds, options: DEFAULT_MINIFY_OPTIONS });
		const expected = minifySwaggerWithOptions(endpointIds, doc, DEFAULT_MINIFY_OPTIONS);
		expect(JSON.parse(minified.compact)).toEqual(expected);
		expect(minified.output).toBe(JSON.stringify(expected, null, 2));
		expect(minified.size.tokens).toBe(Math.ceil(minified.compact.length / 4));

		expect(run("compare", { rawA: rawJson, rawB: rawJson, ...labels })).toEqual(
			compareOpenApiRawJson(rawJson, rawJson, labels),
		);
	});

	it("throws on a spec it can't parse", () => {
		const run = createOpenApiTaskRunner();
		expect(() => run("index", { rawJson: "{" })).toThrow(/Invalid JSON/);
	});
});

describe("createOpenApiWorkerClient (in-thread fallback)", () => {
	it("runs tasks when Worker is unavailable", async () => {
		const client = createOpenApiWorkerClient();
		const index = await client.run("index", { rawJson });
		expect(index?.endpoints).toEqual(buildEndpointIndex(doc));
	});

	it("resolves superseded requests of the same kind with null", async () => {
		const client = createOpenApiWorkerClient();
		const ids = buildEndpointIndex(doc).map((item) => item.id);
		const request = (endpointIds: string[]) =>
			client.run("minify", { rawJson, endpointIds, options: DEFAULT_MINIFY_OPTIONS });
		const [first, second, latest] = await Promise.all([
			request(ids.slice(0, 1)),
			request(ids.slice(0, 2)),
			request(ids.slice(0, 3)),
		]);
		expect(first).toBeNull();
		expect(second).toBeNull();
		expect(Object.keys(JSON.parse(latest?.compact ?? "{}").paths).length).toBeGreaterThan(0);
	});

	it("rejects with the task's error", async () => {
		const client = createOpenApiWorkerClient();
		await expect(client.run("index", { rawJson: "{" })).rejects.toThrow(/Invalid JSON/);
	});

	it("drops pending tasks on dispose", async () => {
		const client = createOpenApiWorkerClient();
		const pending = client.run("index", { rawJson });
		client.dispose();
		await expect(pending).resolves.toBeNull();
	});
});

describe("shouldRunOffThread", () => {
	it("keeps small specs on the main thread", () => {
		expect(shouldRunOffThread(rawJson.length)).toBe(false);
		expect(shouldRunOffThread(5 * 1024 * 1024)).toBe(true);
	});
});
