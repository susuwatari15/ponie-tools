"use client";

import { ClipboardPaste, Upload } from "lucide-react";
import type { ChangeEvent, FC } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { SaveSnapshotForm } from "./SaveSnapshotForm";

type SwaggerManualJsonInputProps = {
  rawJson: string;
  onRawJsonChange: (value: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSnapshotSaved?: () => void;
};

export const SwaggerManualJsonInput: FC<SwaggerManualJsonInputProps> = ({
  rawJson,
  onRawJsonChange,
  onFileUpload,
  onSnapshotSaved,
}) => {
  const { toast } = useToast();

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onRawJsonChange(text);
      toast("Pasted from clipboard", "success");
    } catch {
      toast("Clipboard unavailable — paste into the box instead", "error");
    }
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handlePasteFromClipboard}
          leftIcon={<ClipboardPaste className="h-4 w-4" />}
        >
          Paste
        </Button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-fg transition hover:border-muted/50 hover:bg-raised">
          <Upload className="h-4 w-4" />
          Upload JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <Textarea
        value={rawJson}
        onChange={(event) => onRawJsonChange(event.target.value)}
        placeholder="Paste swagger.json here…"
        className="h-40 resize-none"
      />

      <SaveSnapshotForm rawJson={rawJson} onSaved={onSnapshotSaved} />
    </>
  );
};
