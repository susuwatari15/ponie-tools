import { Download } from "lucide-react";
import type { FC } from "react";

type SwaggerUrlFetchFormProps = {
	swaggerUrl: string;
	onSwaggerUrlChange: (value: string) => void;
	username: string;
	onUsernameChange: (value: string) => void;
	password: string;
	onPasswordChange: (value: string) => void;
	isFetchingUrl: boolean;
	urlFetchError: string;
	onFetchFromUrl: () => void;
};

export const SwaggerUrlFetchForm: FC<SwaggerUrlFetchFormProps> = ({
	swaggerUrl,
	onSwaggerUrlChange,
	username,
	onUsernameChange,
	password,
	onPasswordChange,
	isFetchingUrl,
	urlFetchError,
	onFetchFromUrl,
}) => (
	<div className="rounded-md border border-slate-700 bg-slate-900/60 p-2">
		<div className="grid grid-cols-1 gap-2">
			<input
				value={swaggerUrl}
				onChange={(event) => onSwaggerUrlChange(event.target.value)}
				placeholder="Swagger URL (https://...)"
				className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
			/>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				<input
					value={username}
					onChange={(event) => onUsernameChange(event.target.value)}
					placeholder="Username"
					className="rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
				/>
				<input
					value={password}
					onChange={(event) => onPasswordChange(event.target.value)}
					placeholder="Password"
					type="password"
					className="rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accent"
				/>
				<button
					type="button"
					onClick={onFetchFromUrl}
					disabled={isFetchingUrl || !swaggerUrl.trim()}
					className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Download className="h-4 w-4" />
					{isFetchingUrl ? "Loading..." : "Load from URL"}
				</button>
			</div>
		</div>

		{urlFetchError ? (
			<p className="mt-2 text-xs text-rose-300">{urlFetchError}</p>
		) : null}
	</div>
);
