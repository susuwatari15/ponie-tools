import type { ChangeEvent, FC } from "react";
import { GitCompare } from "lucide-react";
import type { EndpointItem, HttpMethod } from "@/types/openapi";
import type { ParsedOpenApiInput } from "@/lib/openApiInput";
import type { SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import { panelClasses } from "../styles";
import { SwaggerEndpointList } from "./SwaggerEndpointList";
import { SwaggerEndpointSearch } from "./SwaggerEndpointSearch";
import { SwaggerInputModeToggle } from "./SwaggerInputModeToggle";
import { SwaggerManualJsonInput } from "./SwaggerManualJsonInput";
import { SwaggerParseStatus } from "./SwaggerParseStatus";
import { SwaggerUrlFetchForm } from "./SwaggerUrlFetchForm";

type SwaggerInputPanelProps = {
	inputMode: "manual" | "url";
	onInputModeChange: (mode: "manual" | "url") => void;
	rawJson: string;
	onRawJsonChange: (value: string) => void;
	onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
	onSnapshotSaved?: () => void;
	onNavigateToCompareLatest?: () => void;
	isFetchingUrl: boolean;
	urlFetchError: string;
	extensionAvailable: boolean;
	onFetchFromUrl: () => void;
	profiles: SwaggerProfile[];
	selectedProfile: SwaggerProfile | null;
	onSelectProfile: (id: string | null) => void;
	onCreateProfile: (input: {
		name: string;
		color: string;
		url: string;
		username: string;
		password: string;
	}) =>
		| { ok: true; profile: SwaggerProfile }
		| { ok: false; error: string };
	onEditProfile: (
		id: string,
		patch: Partial<Omit<SwaggerProfile, "id">>,
	) =>
		| { ok: true; profile: SwaggerProfile }
		| { ok: false; error: string };
	onDeleteProfile: (id: string) => void;
	parsed: ParsedOpenApiInput;
	allEndpoints: EndpointItem[];
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	selectedMethods: HttpMethod[];
	onToggleMethod: (method: HttpMethod) => void;
	selectedCount: number;
	visibleAllSelected: boolean;
	onToggleSelectAllVisible: () => void;
	filteredEndpoints: EndpointItem[];
	selectedIds: Set<string>;
	onToggleSelection: (id: string) => void;
};

export const SwaggerInputPanel: FC<SwaggerInputPanelProps> = ({
	inputMode,
	onInputModeChange,
	rawJson,
	onRawJsonChange,
	onFileUpload,
	onSnapshotSaved,
	onNavigateToCompareLatest,
	isFetchingUrl,
	urlFetchError,
	extensionAvailable,
	onFetchFromUrl,
	profiles,
	selectedProfile,
	onSelectProfile,
	onCreateProfile,
	onEditProfile,
	onDeleteProfile,
	parsed,
	allEndpoints,
	searchQuery,
	onSearchQueryChange,
	selectedMethods,
	onToggleMethod,
	selectedCount,
	visibleAllSelected,
	onToggleSelectAllVisible,
	filteredEndpoints,
	selectedIds,
	onToggleSelection,
}) => (
	<section className={`flex min-h-[640px] flex-col overflow-hidden rounded-xl border ${panelClasses}`}>
		<div className="border-b border-slate-200 p-3 dark:border-slate-700/70">
			<SwaggerInputModeToggle
				inputMode={inputMode}
				onModeChange={onInputModeChange}
			/>

			{inputMode === "manual" ? (
				<SwaggerManualJsonInput
					rawJson={rawJson}
					onRawJsonChange={onRawJsonChange}
					onFileUpload={onFileUpload}
					onSnapshotSaved={onSnapshotSaved}
				/>
			) : (
				<SwaggerUrlFetchForm
					isFetchingUrl={isFetchingUrl}
					urlFetchError={urlFetchError}
					extensionAvailable={extensionAvailable}
					onFetchFromUrl={onFetchFromUrl}
					rawJson={rawJson}
					onSnapshotSaved={onSnapshotSaved}
					profiles={profiles}
					selectedProfile={selectedProfile}
					onSelectProfile={onSelectProfile}
					onCreateProfile={onCreateProfile}
					onEditProfile={onEditProfile}
					onDeleteProfile={onDeleteProfile}
				/>
			)}

			<SwaggerParseStatus
				error={parsed.error}
				endpointCount={allEndpoints.length}
				hasDoc={Boolean(parsed.doc)}
			/>

			{onNavigateToCompareLatest ? (
				<div className="mt-3 flex flex-wrap">
					<button
						type="button"
						onClick={onNavigateToCompareLatest}
						className="inline-flex items-center gap-2 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
					>
						<GitCompare className="h-4 w-4 shrink-0" aria-hidden />
						Compare to latest version
					</button>
				</div>
			) : null}
		</div>

		<SwaggerEndpointSearch
			searchQuery={searchQuery}
			onSearchQueryChange={onSearchQueryChange}
			selectedMethods={selectedMethods}
			onToggleMethod={onToggleMethod}
			selectedCount={selectedCount}
			totalEndpoints={allEndpoints.length}
			visibleAllSelected={visibleAllSelected}
			onToggleSelectAllVisible={onToggleSelectAllVisible}
			canToggleVisible={filteredEndpoints.length > 0}
			endpoints={allEndpoints}
		/>

		<SwaggerEndpointList
			endpoints={filteredEndpoints}
			selectedIds={selectedIds}
			onToggleSelection={onToggleSelection}
		/>
	</section>
);
