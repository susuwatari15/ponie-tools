import type { ChangeEvent, FC } from "react";
import type { EndpointItem } from "../../types/openapi";
import type { ParsedOpenApiInput } from "../../utils/openApiInput";
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
	onSaveToLocalStorage: () => void;
	savedToStorage: boolean;
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
	onSaveToLocalStorage,
	savedToStorage,
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
	<section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-panel/75">
		<div className="border-b border-slate-700/70 p-3">
			<SwaggerInputModeToggle
				inputMode={inputMode}
				onModeChange={onInputModeChange}
			/>

			{inputMode === "manual" ? (
				<SwaggerManualJsonInput
					rawJson={rawJson}
					onRawJsonChange={onRawJsonChange}
					onFileUpload={onFileUpload}
					onSaveToLocalStorage={onSaveToLocalStorage}
					savedToStorage={savedToStorage}
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
				/>
			)}

			<SwaggerParseStatus
				error={parsed.error}
				endpointCount={allEndpoints.length}
				hasDoc={Boolean(parsed.doc)}
			/>
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
