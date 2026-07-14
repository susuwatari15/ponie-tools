import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	DEFAULT_PROFILE_COLOR,
	PROFILE_COLORS,
	type SwaggerProfile,
} from "@/lib/swaggerProfilesStorage";

const profileSchema = z.object({
	name: z.string().min(1, "Name is required.").max(60, "Name is too long."),
	color: z.string().min(1, "Color is required."),
	url: z.string(),
	username: z.string(),
	password: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileWriteResult =
	| { ok: true; profile: SwaggerProfile }
	| { ok: false; error: string };

type ProfileManagerModalProps = {
	profiles: SwaggerProfile[];
	selectedProfileId: string | null;
	onClose: () => void;
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

const inputClass =
	"w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100";

const labelClass =
	"text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500";

const emptyForm: ProfileFormValues = {
	name: "",
	color: DEFAULT_PROFILE_COLOR,
	url: "",
	username: "",
	password: "",
};

export const ProfileManagerModal: FC<ProfileManagerModalProps> = ({
	profiles,
	selectedProfileId,
	onClose,
	onSelectProfile,
	onCreateProfile,
	onEditProfile,
	onDeleteProfile,
}) => {
	const [mounted, setMounted] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [submitError, setSubmitError] = useState("");

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: emptyForm,
	});
	const selectedColor = form.watch("color");

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	if (!mounted) return null;

	const openCreate = () => {
		setEditingId(null);
		setSubmitError("");
		form.reset(emptyForm);
		setIsFormOpen(true);
	};

	const openEdit = (profile: SwaggerProfile) => {
		setEditingId(profile.id);
		setSubmitError("");
		form.reset({
			name: profile.name,
			color: profile.color,
			url: profile.url,
			username: profile.username,
			password: profile.password,
		});
		setIsFormOpen(true);
	};

	const closeForm = () => {
		setIsFormOpen(false);
		setEditingId(null);
		setSubmitError("");
		form.reset(emptyForm);
	};

	const submit = async (values: ProfileFormValues) => {
		const result = editingId
			? await onEditProfile(editingId, values)
			: await onCreateProfile(values);

		if (!result.ok) {
			setSubmitError(
				result.error === "quota"
					? "Browser storage is full. Remove old profiles."
					: "Could not save profile.",
			);
			return;
		}
		closeForm();
	};

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Manage profiles"
		>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
			/>
			<div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
				<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700/70">
					<h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
						Manage profiles
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{profiles.length === 0 ? (
						<p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
							No profiles yet. Create one to save credentials.
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{profiles.map((profile) => {
								const isActive = profile.id === selectedProfileId;
								return (
									<li
										key={profile.id}
										className={`flex items-center gap-3 rounded-md border px-3 py-2 transition ${
											isActive
												? "border-accent/70 bg-accent/10"
												: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40"
										}`}
									>
										<span
											className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
											style={{ backgroundColor: profile.color }}
											aria-hidden
										/>
										<div className="min-w-0 flex-1">
											<p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
												{profile.name}
											</p>
											<p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
												{profile.url || "(no url)"}
												{profile.username ? ` · ${profile.username}` : ""}
											</p>
										</div>
										<button
											type="button"
											onClick={() =>
												onSelectProfile(isActive ? null : profile.id)
											}
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
												isActive
													? "border-accent/70 bg-accent/15 text-sky-800 dark:text-sky-200"
													: "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
											}`}
										>
											{isActive ? (
												<>
													<Check className="h-3.5 w-3.5" /> Selected
												</>
											) : (
												"Select"
											)}
										</button>
										<button
											type="button"
											onClick={() => openEdit(profile)}
											className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
											aria-label={`Edit ${profile.name}`}
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
										<button
											type="button"
											onClick={() => onDeleteProfile(profile.id)}
											className="rounded-md p-1.5 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
											aria-label={`Delete ${profile.name}`}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									</li>
								);
							})}
						</ul>
					)}

					{isFormOpen ? (
						<form
							className="mt-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40"
							onSubmit={form.handleSubmit(submit)}
						>
							<p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
								{editingId ? "Edit profile" : "New profile"}
							</p>

							<label className="flex flex-col gap-1">
								<span className={labelClass}>Name</span>
								<input
									type="text"
									autoComplete="off"
									{...form.register("name")}
									className={inputClass}
								/>
								{form.formState.errors.name?.message ? (
									<span className="text-[11px] text-amber-700 dark:text-amber-300">
										{form.formState.errors.name.message}
									</span>
								) : null}
							</label>

							<div className="flex flex-col gap-1">
								<span className={labelClass}>Color</span>
								<div className="flex flex-wrap gap-2">
									{PROFILE_COLORS.map((color) => {
										const isChosen = selectedColor === color;
										return (
											<button
												key={color}
												type="button"
												onClick={() =>
													form.setValue("color", color, {
														shouldDirty: true,
													})
												}
												className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-slate-50 transition dark:ring-offset-slate-950 ${
													isChosen
														? "ring-2 ring-slate-900 dark:ring-slate-100"
														: "ring-1 ring-black/10"
												}`}
												style={{ backgroundColor: color }}
												aria-label={`Select color ${color}`}
												aria-pressed={isChosen}
											/>
										);
									})}
								</div>
							</div>

							<label className="flex flex-col gap-1">
								<span className={labelClass}>Swagger URL</span>
								<input
									type="text"
									autoComplete="off"
									placeholder="https://..."
									{...form.register("url")}
									className={inputClass}
								/>
							</label>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label className="flex flex-col gap-1">
									<span className={labelClass}>Username</span>
									<input
										type="text"
										autoComplete="off"
										{...form.register("username")}
										className={inputClass}
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className={labelClass}>Password</span>
									<input
										type="password"
										autoComplete="off"
										{...form.register("password")}
										className={inputClass}
									/>
								</label>
							</div>

							{submitError ? (
								<p className="text-[11px] text-amber-700 dark:text-amber-300">
									{submitError}
								</p>
							) : null}

							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={closeForm}
									className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="inline-flex items-center gap-2 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
								>
									<Check className="h-4 w-4" />
									{editingId ? "Save changes" : "Create profile"}
								</button>
							</div>
						</form>
					) : (
						<button
							type="button"
							onClick={openCreate}
							className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-400"
						>
							<Plus className="h-4 w-4" />
							Add profile
						</button>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};
