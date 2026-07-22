"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { RefreshCw, Save } from "lucide-react";
import type { FC } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { parseOpenApiInput } from "@/lib/openApiInput";
import { addSnapshot } from "@/lib/swaggerSavedSnapshotsStorage";
import { writeRawJsonToStorage } from "@/lib/swaggerRawJsonStorage";

const snapshotSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120, "Name is too long."),
});

type SnapshotFormValues = z.infer<typeof snapshotSchema>;

type SaveSnapshotFormProps = {
  rawJson: string;
  onSaved?: () => void;
  profileName?: string;
  profileColor?: string;
};

function buildDefaultName(profileName?: string): string {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const trimmed = profileName?.trim();
  return trimmed ? `${trimmed} - ${timestamp}` : timestamp;
}

export const SaveSnapshotForm: FC<SaveSnapshotFormProps> = ({
  rawJson,
  onSaved,
  profileName,
  profileColor,
}) => {
  const { toast } = useToast();
  const form = useForm<SnapshotFormValues>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: { name: buildDefaultName(profileName) },
  });

  // Re-initialize the snapshot name whenever the selected profile changes.
  useEffect(() => {
    form.setValue("name", buildDefaultName(profileName), { shouldValidate: true });
    form.clearErrors("name");
  }, [profileName, form]);

  async function submit(values: SnapshotFormValues) {
    const parsed = parseOpenApiInput(rawJson);
    if (parsed.error || !parsed.doc) {
      toast(parsed.error || "Invalid OpenAPI JSON.", "error");
      return;
    }

    const result = await addSnapshot({
      name: values.name,
      rawJson,
      profileName: profileName?.trim() || undefined,
      profileColor: profileColor || undefined,
    });
    if (!result.ok) {
      toast(
        result.error === "quota"
          ? "Browser storage is full. Remove old snapshots or use a smaller spec."
          : "Could not save snapshot.",
        "error",
      );
      return;
    }

    await writeRawJsonToStorage(rawJson);
    toast("Snapshot saved", "success");
    onSaved?.();
  }

  const renewName = () => {
    form.setValue("name", buildDefaultName(profileName), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.clearErrors("name");
  };

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={form.handleSubmit((values) => submit(values))}
    >
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Snapshot name
      </label>
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex min-w-[200px] flex-1 overflow-hidden rounded-lg border border-line bg-surface transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <input
            type="text"
            {...form.register("name")}
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 font-mono text-xs text-fg outline-none"
          />
          <button
            type="button"
            onClick={renewName}
            title="Set name to current date and time"
            className="inline-flex shrink-0 items-center gap-1 border-l border-line bg-raised px-2.5 text-[10px] font-medium text-muted transition hover:text-fg"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Renew
          </button>
        </div>
        <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
          Save snapshot
        </Button>
      </div>
      {form.formState.errors.name?.message ? (
        <p className="text-xs text-amber-600 dark:text-amber-300">
          {form.formState.errors.name.message}
        </p>
      ) : null}
    </form>
  );
};
