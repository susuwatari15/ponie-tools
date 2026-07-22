import type { FC } from "react";
import type { UseEpochConverter } from "../_hooks/useEpochConverter";
import { DateToEpochCard } from "./DateToEpochCard";
import { EpochToDateCard } from "./EpochToDateCard";
import { LiveEpochBanner } from "./LiveEpochBanner";
import { PeriodBoundariesCard } from "./PeriodBoundariesCard";

export const EpochConverter: FC<{ m: UseEpochConverter }> = ({ m }) => (
	<div className="space-y-5">
		<LiveEpochBanner m={m} />
		<EpochToDateCard m={m} />
		<DateToEpochCard m={m} />
		<PeriodBoundariesCard m={m} />
	</div>
);
