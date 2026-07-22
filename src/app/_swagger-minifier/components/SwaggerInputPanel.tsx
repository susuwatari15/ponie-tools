import type { ChangeEvent, FC } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EndpointItem, HttpMethod } from "@/types/openapi";
import type { ParsedOpenApiInput } from "@/lib/openApiInput";
import type { SwaggerProfile } from "@/lib/swaggerProfilesStorage";
import { SwaggerEndpointList } from "./SwaggerEndpointList";
import { SwaggerEndpointSearch } from "./SwaggerEndpointSearch";
import { SwaggerInputModeToggle } from "./SwaggerInputModeToggle";
import { SwaggerManualJsonInput } from "./SwaggerManualJsonInput";
import { SwaggerParseStatus } from "./SwaggerParseStatus";
import { SwaggerUrlFetchForm } from "./SwaggerUrlFetchForm";

type ProfileWriteResult =
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: string };

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
	}) => Promise<ProfileWriteResult>;
	onEditProfile: (
		id: string,
		patch: Partial<Omit<SwaggerProfile, "id">>,
	) => Promise<ProfileWriteResult>;
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
	<Card flush className="flex min-h-[560px] flex-col overflow-hidden lg:min-h-0">
		<div className="border-b border-line p-4">
			<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
				// input
			</p>
			<SwaggerInputModeToggle inputMode={inputMode} onModeChange={onInputModeChange} />

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
				<div className="mt-3">
					<Button
						size="sm"
						onClick={onNavigateToCompareLatest}
						leftIcon={<GitCompare className="h-4 w-4" />}
					>
						Compare to latest version
					</Button>
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
	</Card>
);
