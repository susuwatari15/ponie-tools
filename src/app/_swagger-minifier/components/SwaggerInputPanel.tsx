import type { ChangeEvent, FC } from "react";
import { GitCompare } from "lucide-react";
import type { EndpointItem } from "@/types/openapi";
import type { ParsedOpenApiInput } from "@/lib/openApiInput";
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
	swaggerUrl: string;
	onSwaggerUrlChange: (value: string) => void;
	username: string;
	onUsernameChange: (value: string) => void;
	password: string;
	onPasswordChange: (value: string) => void;
	isFetchingUrl: boolean;
	urlFetchError: string;
	onFetchFromUrl: () => void;
	parsed: ParsedOpenApiInput;
	allEndpoints: EndpointItem[];
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
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
	swaggerUrl,
	onSwaggerUrlChange,
	username,
	onUsernameChange,
	password,
	onPasswordChange,
	isFetchingUrl,
	urlFetchError,
	onFetchFromUrl,
	parsed,
	allEndpoints,
	searchQuery,
	onSearchQueryChange,
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
					swaggerUrl={swaggerUrl}
					onSwaggerUrlChange={onSwaggerUrlChange}
					username={username}
					onUsernameChange={onUsernameChange}
					password={password}
					onPasswordChange={onPasswordChange}
					isFetchingUrl={isFetchingUrl}
					urlFetchError={urlFetchError}
					onFetchFromUrl={onFetchFromUrl}
					rawJson={rawJson}
					onSnapshotSaved={onSnapshotSaved}
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
			selectedCount={selectedCount}
			totalEndpoints={allEndpoints.length}
			visibleAllSelected={visibleAllSelected}
			onToggleSelectAllVisible={onToggleSelectAllVisible}
			canToggleVisible={filteredEndpoints.length > 0}
		/>

		<SwaggerEndpointList
			endpoints={filteredEndpoints}
			selectedIds={selectedIds}
			onToggleSelection={onToggleSelection}
		/>
	</section>
);
