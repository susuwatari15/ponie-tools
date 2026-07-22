import type { FC } from "react";
import type { UsePxRem } from "../_hooks/usePxRem";
import { ConverterCard } from "./ConverterCard";
import { ReferenceTables } from "./ReferenceTables";

export const PxRemConverter: FC<{ m: UsePxRem }> = ({ m }) => (
	<div className="space-y-5">
		<ConverterCard m={m} />
		<ReferenceTables m={m} />
	</div>
);
