import { readFileSync } from "node:fs";
import type { OpenApiDocument } from "@/types/openapi";

/** Test-only fixtures. Read from disk so the raw text (line numbers, duplicate keys) is preserved. */
export type FixtureName = "openapi3" | "swagger2" | "duplicate-keys";

export function readFixture(name: FixtureName): string {
	return readFileSync(new URL(`./${name}.json`, import.meta.url), "utf8");
}

/** A fresh parsed copy on every call, so a test can mutate it freely. */
export function loadFixture(name: FixtureName): OpenApiDocument {
	return JSON.parse(readFixture(name)) as OpenApiDocument;
}
