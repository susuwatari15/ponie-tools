import type { FC } from "react";
import { cn } from "@/components/ui/cn";

type InputMode = "manual" | "url";

type SwaggerInputModeToggleProps = {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
};

const OPTIONS: { value: InputMode; label: string }[] = [
  { value: "manual", label: "Paste / Upload" },
  { value: "url", label: "Fetch from URL" },
];

export const SwaggerInputModeToggle: FC<SwaggerInputModeToggleProps> = ({
  inputMode,
  onModeChange,
}) => (
  <div
    className="mb-3 inline-flex rounded-lg border border-line bg-raised/60 p-0.5"
    role="tablist"
    aria-label="Input mode"
  >
    {OPTIONS.map(({ value, label }) => {
      const active = inputMode === value;
      return (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onModeChange(value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            active
              ? "bg-surface text-fg shadow-sm"
              : "text-muted hover:text-fg",
          )}
        >
          {label}
        </button>
      );
    })}
  </div>
);
