"use client";

import { Download, ExternalLink, KeyRound, Users } from "lucide-react";
import { type FC, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { isUrlCoveredByExtension } from "@/lib/swaggerExtensionBridge";
import {
  needsSessionPassword,
  type ProfileInput,
  type SwaggerProfile,
} from "@/lib/swaggerProfilesStorage";

// Both forms use react-hook-form + zod, which Turbopack can't tree-shake (~300 KB),
// and neither shows before a spec or the profile manager is opened.
const SaveSnapshotForm = dynamic(
  () => import("./SaveSnapshotForm").then((mod) => mod.SaveSnapshotForm),
  { loading: () => <Skeleton className="mt-3 h-[60px]" /> },
);
const ProfileManagerModal = dynamic(() =>
  import("./ProfileManagerModal").then((mod) => mod.ProfileManagerModal),
);

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
  /** Extension `host_permissions`; null when unknown (older build). */
  extensionHosts: string[] | null;
  onFetchFromUrl: () => void;
  rawJson: string;
  onSnapshotSaved?: () => void;
  profiles: SwaggerProfile[];
  selectedProfile: SwaggerProfile | null;
  onSelectProfile: (id: string | null) => void;
  onCreateProfile: (input: ProfileInput) => Promise<ProfileWriteResult>;
  onEditProfile: (
    id: string,
    patch: Partial<Omit<SwaggerProfile, "id">>,
  ) => Promise<ProfileWriteResult>;
  onDeleteProfile: (id: string) => void;
  /** A pasted URL with no matching profile; opens the profile form prefilled. */
  pendingProfileUrl: string | null;
  onClearPendingProfileUrl: () => void;
  /** Sets the in-memory password of an "ask each session" profile. */
  onSetSessionPassword: (id: string, password: string) => void;
};

export const SwaggerUrlFetchForm: FC<SwaggerUrlFetchFormProps> = ({
  isFetchingUrl,
  urlFetchError,
  extensionAvailable,
  extensionHosts,
  onFetchFromUrl,
  rawJson,
  onSnapshotSaved,
  profiles,
  selectedProfile,
  onSelectProfile,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
  pendingProfileUrl,
  onClearPendingProfileUrl,
  onSetSessionPassword,
}) => {
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [sessionPasswordDraft, setSessionPasswordDraft] = useState("");
  const showManager = isManagerOpen || Boolean(pendingProfileUrl);

  const closeManager = () => {
    setIsManagerOpen(false);
    onClearPendingProfileUrl();
  };

  const profileUrl = selectedProfile?.url ?? "";
  const username = selectedProfile?.username ?? "";
  const password = selectedProfile?.password ?? "";
  const hasUrl = Boolean(profileUrl.trim());
  const viaExtension =
    extensionAvailable && isUrlCoveredByExtension(profileUrl, extensionHosts);
  const askForPassword = selectedProfile ? needsSessionPassword(selectedProfile) : false;

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

      {hasUrl ? (
        viaExtension ? (
          <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
            Fetches through the browser extension, using your browser session.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-muted">
            {extensionAvailable
              ? "This host isn't on the extension's allowlist, so it fetches"
              : "Fetches"}{" "}
            through the server route (<code className="font-mono">/api/fetch-swagger</code>)
            with the profile&apos;s basic auth.
            {extensionAvailable
              ? ""
              : " Install the browser extension to use your browser session instead."}
          </p>
        )
      ) : null}

      {selectedProfile && askForPassword ? (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!sessionPasswordDraft) return;
            onSetSessionPassword(selectedProfile.id, sessionPasswordDraft);
            setSessionPasswordDraft("");
          }}
        >
          <label className="sr-only" htmlFor="swagger-session-password">
            Password for {selectedProfile.name}
          </label>
          <Input
            id="swagger-session-password"
            type="password"
            autoComplete="off"
            value={sessionPasswordDraft}
            onChange={(event) => setSessionPasswordDraft(event.target.value)}
            placeholder={`Password for ${selectedProfile.username} (this session only)`}
            icon={<KeyRound className="h-3.5 w-3.5" />}
            className="text-xs"
          />
          <Button type="submit" size="sm" disabled={!sessionPasswordDraft}>
            Use
          </Button>
        </form>
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

      {showManager ? (
        <ProfileManagerModal
          profiles={profiles}
          selectedProfileId={selectedProfile?.id ?? null}
          initialUrl={pendingProfileUrl ?? undefined}
          onClose={closeManager}
          onSelectProfile={onSelectProfile}
          onCreateProfile={onCreateProfile}
          onEditProfile={onEditProfile}
          onDeleteProfile={onDeleteProfile}
          extensionAvailable={extensionAvailable}
        />
      ) : null}
    </div>
  );
};
