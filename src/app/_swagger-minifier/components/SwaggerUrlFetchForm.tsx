import { Download, ExternalLink, Users } from "lucide-react";
import { type FC, useState } from "react";
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
    <div className="rounded-md border border-slate-300 bg-slate-100/80 p-2 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label className="sr-only" htmlFor="swagger-profile-select">
              Credential profile
            </label>
            <div className="relative min-w-0 flex-1">
              {selectedProfile ? (
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: selectedProfile.color }}
                  aria-hidden
                />
              ) : null}
              <select
                id="swagger-profile-select"
                value={selectedProfile?.id ?? ""}
                onChange={(event) =>
                  onSelectProfile(event.target.value || null)
                }
                className={`w-full rounded-md border border-slate-300 bg-white py-2 pr-3 text-xs text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100 ${
                  selectedProfile ? "pl-7" : "pl-3"
                }`}
              >
                <option value="">Select a profile…</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsManagerOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-400 bg-slate-200 px-3 py-2 text-xs text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
            >
              <Users className="h-4 w-4" />
              Profiles
            </button>
          </div>
        </div>

        {extensionAvailable ? (
          <p className="px-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            Browser extension: connected — fetching uses your browser session.
          </p>
        ) : null}

        {selectedProfile ? (
          hasUrl ? (
            <a href={profileUrl} className="truncate px-1 text-[11px] text-slate-500 dark:text-slate-400" target="_blank" rel="noopener noreferrer">
              {profileUrl}
            </a>
          ) : (
            <p className="truncate px-1 text-[11px] text-slate-500 dark:text-slate-400">
              This profile has no Swagger URL set.
            </p>
          )
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onFetchFromUrl}
            disabled={isFetchingUrl || !hasUrl}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-400 bg-slate-200 px-3 py-2 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
          >
            <Download className="h-4 w-4" />
            {isFetchingUrl ? "Loading..." : "Load from URL"}
          </button>
          <a
            href={buildAuthUrl(profileUrl, username, password)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-400 bg-slate-200 px-3 py-2 text-xs text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400 ${!hasUrl ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={!hasUrl}
          >
            <ExternalLink className="h-4 w-4" />
            Open in browser
          </a>
        </div>
      </div>

      {urlFetchError ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
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
