import type { FC } from "react";
import type { SwaggerMinifierProps } from "../../types/openapi";
import { useSwaggerMinifier } from "../../hooks/useSwaggerMinifier";
import { SwaggerCompressedOutput } from "./SwaggerCompressedOutput";
import { SwaggerInputPanel } from "./SwaggerInputPanel";
import { SwaggerMinifierHeader } from "./SwaggerMinifierHeader";

const SwaggerMinifier: FC<SwaggerMinifierProps> = ({
	initialJson = "",
	className = "",
}) => {
	const m = useSwaggerMinifier(initialJson);

	return (
		<div
			className={`w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 text-slate-100 shadow-glow backdrop-blur ${className}`}
		>
			<SwaggerMinifierHeader />

			<div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:p-6">
				<SwaggerInputPanel
					inputMode={m.inputMode}
					onInputModeChange={m.setInputMode}
					rawJson={m.rawJson}
					onRawJsonChange={m.setRawJson}
					onFileUpload={m.onFileUpload}
					onSaveToLocalStorage={m.onSaveToLocalStorage}
					savedToStorage={m.savedToStorage}
					swaggerUrl={m.swaggerUrl}
					onSwaggerUrlChange={m.setSwaggerUrl}
					username={m.username}
					onUsernameChange={m.setUsername}
					password={m.password}
					onPasswordChange={m.setPassword}
					isFetchingUrl={m.isFetchingUrl}
					urlFetchError={m.urlFetchError}
					onFetchFromUrl={m.onFetchFromUrl}
					parsed={m.parsed}
					allEndpoints={m.allEndpoints}
					searchQuery={m.searchQuery}
					onSearchQueryChange={m.setSearchQuery}
					selectedCount={m.selectedCount}
					visibleAllSelected={m.visibleAllSelected}
					onToggleSelectAllVisible={m.toggleSelectAllVisible}
					filteredEndpoints={m.filteredEndpoints}
					selectedIds={m.selectedIds}
					onToggleSelection={m.toggleSelection}
				/>

				<SwaggerCompressedOutput
					hasParseError={Boolean(m.parsed.error)}
					selectedCount={m.selectedCount}
					minifiedOutput={m.minifiedOutput}
					copied={m.copied}
					onCopy={m.onCopy}
				/>
			</div>
		</div>
	);
};

export default SwaggerMinifier;
