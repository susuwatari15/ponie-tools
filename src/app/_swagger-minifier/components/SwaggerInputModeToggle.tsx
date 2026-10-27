import type { FC } from "react";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";

type InputMode = "manual" | "url";

type SwaggerInputModeToggleProps = {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
};

const OPTIONS: SegmentedOption<InputMode>[] = [
  { value: "manual", label: "Paste / Upload" },
  { value: "url", label: "Fetch from URL" },
];

export const SwaggerInputModeToggle: FC<SwaggerInputModeToggleProps> = ({
  inputMode,
  onModeChange,
}) => (
  <SegmentedControl
    value={inputMode}
    onChange={onModeChange}
    options={OPTIONS}
    label="Input mode"
    className="mb-3"
  />
);
