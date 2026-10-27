"use client";

import { ClipboardPaste, FileUp, Upload } from "lucide-react";
import { type ChangeEvent, type DragEvent, type FC, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import type { SwaggerProfile } from "@/lib/swaggerProfilesStorage";
/** Pulls in react-hook-form + zod, and only shows once a spec is pasted. */
const SaveSnapshotForm = dynamic(
  () => import("./SaveSnapshotForm").then((mod) => mod.SaveSnapshotForm),
  { loading: () => <Skeleton className="mt-3 h-[60px]" /> },
);

/** A paste that is nothing but one http(s) URL. */
const SINGLE_URL = /^https?:\/\/\S+$/i;

const ACCEPTED_FILE = /\.json$/i;

type SwaggerManualJsonInputProps = {
  rawJson: string;
  onRawJsonChange: (value: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (file: File) => Promise<void>;
  onPasteUrl: (url: string) => SwaggerProfile | null;
  onSnapshotSaved?: () => void;
};

export const SwaggerManualJsonInput: FC<SwaggerManualJsonInputProps> = ({
  rawJson,
  onRawJsonChange,
  onFileUpload,
  onFileDrop,
  onPasteUrl,
  onSnapshotSaved,
}) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/leave fire for every child crossed; count to know when we left.
  const dragDepth = useRef(0);

  /** Returns true when the text was a URL and has been routed to URL mode. */
  const routeUrl = (text: string): boolean => {
    const url = text.trim();
    if (!SINGLE_URL.test(url)) return false;
    const profile = onPasteUrl(url);
    toast(
      profile
        ? `URL matches profile “${profile.name}” — switched to Fetch from URL`
        : "Swagger URL pasted — save it as a profile to fetch it",
      "info",
    );
    return true;
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (routeUrl(text)) return;
      onRawJsonChange(text);
      toast("Pasted from clipboard", "success");
    } catch {
      toast("Clipboard unavailable — paste into the box instead", "error");
    }
  };

  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

  const onDragEnter = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const onDrop = async (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (!ACCEPTED_FILE.test(file.name) && file.type !== "application/json") {
      toast("Drop a .json swagger file", "error");
      return;
    }
    await onFileDrop(file);
    toast(`Loaded ${file.name}`, "success");
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
        <span className="text-[11px] text-muted">or drop a .json file</span>
      </div>

      <div
        className="relative"
        onDragEnter={onDragEnter}
        onDragOver={(event) => {
          if (hasFiles(event)) event.preventDefault();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Textarea
          value={rawJson}
          onChange={(event) => onRawJsonChange(event.target.value)}
          onPaste={(event) => {
            if (routeUrl(event.clipboardData.getData("text/plain"))) event.preventDefault();
          }}
          placeholder="Paste swagger.json (or its URL) here…"
          className={cn(
            "h-40 resize-none",
            isDragging && "!border-accent ring-2 ring-accent/25",
          )}
        />
        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent bg-accent/10 text-sm font-medium text-accent">
            <FileUp className="h-4 w-4" aria-hidden />
            Drop to load
          </div>
        ) : null}
      </div>

      <SaveSnapshotForm rawJson={rawJson} onSaved={onSnapshotSaved} />
    </>
  );
};
