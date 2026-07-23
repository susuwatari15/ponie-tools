"use client";

import type { FC } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { JsonFormatter } from "./_components/JsonFormatter";
import { useJsonFormatter } from "./_hooks/useJsonFormatter";

const JsonFormatterPage: FC = () => {
	const m = useJsonFormatter();

	return (
		<div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
			<PageHeader
				eyebrow="// json · tools"
				title="JSON Formatter & Validator"
				description="Beautify, minify, validate and explore JSON — entirely in your browser."
			/>
			<JsonFormatter m={m} />
		</div>
	);
};

export default JsonFormatterPage;
