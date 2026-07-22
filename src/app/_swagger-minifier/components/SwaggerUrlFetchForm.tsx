"use client";

import { Download, ExternalLink, Users } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import type { SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import { ProfileManagerModal } from "./ProfileManagerModal";
import { SaveSnapshotForm } from "./SaveSnapshotForm";

function buildAuthUrl(url: string, username: string, password: string): string {
  try {
    const parsed = new URL(url);
    if (username || password) {
      parsed.username = encodeURIComponent(username);
      parsed.password = encodeURIComponent(password);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

type ProfileWriteResult =
  | { ok: true; profile: SwaggerProfile }
  | { ok: false; error: string };

type SwaggerUrlFetchFormProps = {
  isFetchingUrl: boolean;
  urlFetchError: string;
  extensionAvailable: boolean;
  onFetchFromUrl: () => void;
  rawJson: string;
  onSnapshotSaved?: () => void;
  profiles: SwaggerProfile[];
  selectedProfile: SwaggerProfile | null;
  onSelectProfile: (id: string | null) => void;
  onCreateProfile: (input: {
    name: string;
    color: string;
    url: string;
    username: string;
    password: string;
  }) => Promise<ProfileWriteResult>;
  onEditProfile: (
    id: string,
    patch: Partial<Omit<SwaggerProfile, "id">>,
  ) => Promise<ProfileWriteResult>;
  onDeleteProfile: (id: string) => void;
};

export const SwaggerUrlFetchForm: FC<SwaggerUrlFetchFormProps> = ({
  isFetchingUrl,
  urlFetchError,
  extensionAvailable,
  onFetchFromUrl,
  rawJson,
  onSnapshotSaved,
  profiles,
  selectedProfile,
  onSelectProfile,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
}) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const profileUrl = selectedProfile?.url ?? "";
  const username = selectedProfile?.username ?? "";
  const password = selectedProfile?.password ?? "";
  const hasUrl = Boolean(profileUrl.trim());

  return (
    <div className="rounded-lg border border-line bg-raised/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="swagger-profile-select">
            Credential profile
          </label>
          <Select
            id="swagger-profile-select"
            value={selectedProfile?.id ?? ""}
            onChange={(event) => onSelectProfile(event.target.value || null)}
            adornment={
              selectedProfile ? (
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: selectedProfile.color }}
                  aria-hidden
                />
              ) : undefined
            }
          >
            <option value="">Select a profile…</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={() => setIsManagerOpen(true)}
          leftIcon={<Users className="h-4 w-4" />}
        >
          Profiles
        </Button>
      </div>

      {extensionAvailable ? (
        <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          Browser extension connected — fetching uses your browser session.
        </p>
      ) : null}

      {selectedProfile ? (
        hasUrl ? (
          <a
            href={profileUrl}
            className="mt-2 block truncate text-[11px] text-muted hover:text-fg"
            target="_blank"
            rel="noopener noreferrer"
          >
            {profileUrl}
          </a>
        ) : (
          <p className="mt-2 truncate text-[11px] text-muted">
            This profile has no Swagger URL set.
          </p>
        )
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="primary"
          onClick={onFetchFromUrl}
          disabled={isFetchingUrl || !hasUrl}
          leftIcon={
            isFetchingUrl ? (
              <Spinner className="text-white" />
            ) : (
              <Download className="h-4 w-4" />
            )
          }
        >
          {isFetchingUrl ? "Loading…" : "Load from URL"}
        </Button>
        <a
          href={buildAuthUrl(profileUrl, username, password)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!hasUrl}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg transition hover:border-muted/50 hover:bg-raised ${
            !hasUrl ? "pointer-events-none opacity-45" : ""
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Open in browser
        </a>
      </div>

      {urlFetchError ? (
        <p className="mt-2 rounded-md border border-del/40 bg-del/10 px-2 py-1.5 text-xs text-del">
          {urlFetchError}
        </p>
      ) : null}

      {rawJson.trim() ? (
        <SaveSnapshotForm
          rawJson={rawJson}
          onSaved={onSnapshotSaved}
          profileName={selectedProfile?.name}
          profileColor={selectedProfile?.color}
        />
      ) : null}

      {isManagerOpen ? (
        <ProfileManagerModal
          profiles={profiles}
          selectedProfileId={selectedProfile?.id ?? null}
          onClose={() => setIsManagerOpen(false)}
          onSelectProfile={onSelectProfile}
          onCreateProfile={onCreateProfile}
          onEditProfile={onEditProfile}
          onDeleteProfile={onDeleteProfile}
        />
      ) : null}
    </div>
  );
};
