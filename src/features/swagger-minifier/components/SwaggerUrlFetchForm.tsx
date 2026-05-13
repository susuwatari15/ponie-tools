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
	<div className="rounded-md border border-slate-300 bg-slate-100/80 p-2 dark:border-slate-700 dark:bg-slate-900/60">
		<div className="grid grid-cols-1 gap-2">
			<input
				value={swaggerUrl}
				onChange={(event) => onSwaggerUrlChange(event.target.value)}
				placeholder="Swagger URL (https://...)"
				className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
			/>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				<input
					value={username}
					onChange={(event) => onUsernameChange(event.target.value)}
					placeholder="Username"
					className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
				/>
				<input
					value={password}
					onChange={(event) => onPasswordChange(event.target.value)}
					placeholder="Password"
					type="password"
					className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100"
				/>
				<button
					type="button"
					onClick={onFetchFromUrl}
					disabled={isFetchingUrl || !swaggerUrl.trim()}
					className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-400 bg-slate-200 px-3 py-2 text-xs text-slate-800 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
				>
					<Download className="h-4 w-4" />
					{isFetchingUrl ? "Loading..." : "Load from URL"}
				</button>
			</div>
		</div>

		{urlFetchError ? (
			<p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{urlFetchError}</p>
		) : null}
	</div>
);
