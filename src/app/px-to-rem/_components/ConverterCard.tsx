import { ArrowLeftRight, Copy } from "lucide-react";
import type { FC } from "react";
import { Card, IconButton, Input, cn } from "@/components/ui";
import type { UsePxRem } from "../_hooks/usePxRem";

type FieldProps = {
	label: string;
	value: string;
	onChange: (raw: string) => void;
	onCopy: () => void;
	unit: string;
	accent?: boolean;
};

const ConverterField: FC<FieldProps> = ({
	label,
	value,
	onChange,
	onCopy,
	unit,
	accent = false,
}) => (
	<div className="flex-1"> 
		<div className="relative">
			<IconButton
				label={`Copy ${label} value`}
				onClick={onCopy}
				className="absolute left-1.5 top-1/2 h-7 w-7 -translate-y-1/2 border-transparent bg-transparent"
			>
				<Copy className="h-4 w-4" />
			</IconButton>
			<Input
				type="number"
				inputMode="decimal"
				min={0}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-label={`${label} in ${unit}`}
				className={cn(
					"pl-11 pr-12 text-lg",
					accent && "font-medium text-accent",
				)}
			/>
			<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
				{unit}
			</span>
		</div>
	</div>
);

export const ConverterCard: FC<{ m: UsePxRem }> = ({ m }) => (
	<Card className="space-y-5">
		<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
			<ConverterField
				label="Pixels"
				value={m.pxValue}
				onChange={m.setPx}
				onCopy={() => m.copy(m.pxValue, "px")}
				unit="px"
			/>
			<div
				className="flex items-center justify-center text-muted"
				aria-hidden
			>
				<span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised">
					<ArrowLeftRight className="h-4 w-4" />
				</span>
			</div>
			<ConverterField
				label="REM"
				value={m.remValue}
				onChange={m.setRem}
				onCopy={() => m.copy(m.remValue, "rem")}
				unit="rem"
				accent
			/>
		</div>

		<p className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm text-muted">
			Calculation based on a root font-size of
			<Input
				type="number"
				inputMode="decimal"
				min={1}
				value={m.baseValue}
				onChange={(e) => m.setBase(e.target.value)}
				aria-label="Root font size in pixels"
				style={{ width: 72 }}
				className="h-8 px-2 py-1 text-center text-sm"
			/>
			pixel.
		</p>
	</Card>
);
