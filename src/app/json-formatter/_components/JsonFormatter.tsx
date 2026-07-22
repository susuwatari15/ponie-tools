import type { FC } from "react";
import type { UseJsonFormatter } from "../_hooks/useJsonFormatter";
import { JsonInputPane } from "./JsonInputPane";
import { JsonOutputPane } from "./JsonOutputPane";

export const JsonFormatter: FC<{ m: UseJsonFormatter }> = ({ m }) => (
	<div className="grid gap-4 lg:grid-cols-2">
		<JsonInputPane m={m} />
		<JsonOutputPane m={m} />
	</div>
);
