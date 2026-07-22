"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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

const labelClass = "font-mono text-[10px] uppercase tracking-widest text-muted";

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
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [submitError, setSubmitError] = useState("");

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: emptyForm,
	});
	const selectedColor = form.watch("color");

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

	return (
		<Modal open onClose={onClose} eyebrow="// credentials" title="Manage profiles">
			<div className="max-h-[60vh] overflow-y-auto scroll-ide">
				{profiles.length === 0 ? (
					<p className="py-6 text-center text-xs text-muted">
						No profiles yet. Create one to save credentials.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{profiles.map((profile) => {
							const isActive = profile.id === selectedProfileId;
							return (
								<li
									key={profile.id}
									className={cn(
										"flex items-center gap-3 rounded-lg border px-3 py-2 transition",
										isActive
											? "border-accent/60 bg-accent/10"
											: "border-line bg-raised/50",
									)}
								>
									<span
										className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
										style={{ backgroundColor: profile.color }}
										aria-hidden
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium text-fg">
											{profile.name}
										</p>
										<p className="truncate text-[11px] text-muted">
											{profile.url || "(no url)"}
											{profile.username ? ` · ${profile.username}` : ""}
										</p>
									</div>
									<Button
										size="sm"
										variant={isActive ? "primary" : "secondary"}
										onClick={() => onSelectProfile(isActive ? null : profile.id)}
										leftIcon={isActive ? <Check className="h-3.5 w-3.5" /> : undefined}
									>
										{isActive ? "Selected" : "Select"}
									</Button>
									<IconButton label={`Edit ${profile.name}`} onClick={() => openEdit(profile)}>
										<Pencil className="h-3.5 w-3.5" />
									</IconButton>
									<IconButton
										label={`Delete ${profile.name}`}
										tone="danger"
										onClick={() => onDeleteProfile(profile.id)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</IconButton>
								</li>
							);
						})}
					</ul>
				)}

				{isFormOpen ? (
					<form
						className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-raised/50 p-3"
						onSubmit={form.handleSubmit(submit)}
					>
						<p className="text-xs font-semibold text-fg">
							{editingId ? "Edit profile" : "New profile"}
						</p>

						<label className="flex flex-col gap-1">
							<span className={labelClass}>Name</span>
							<Input type="text" autoComplete="off" {...form.register("name")} />
							{form.formState.errors.name?.message ? (
								<span className="text-[11px] text-amber-600 dark:text-amber-300">
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
												form.setValue("color", color, { shouldDirty: true })
											}
											className={cn(
												"h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition",
												isChosen ? "ring-2 ring-fg" : "ring-1 ring-black/10",
											)}
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
							<Input
								type="text"
								autoComplete="off"
								placeholder="https://…"
								{...form.register("url")}
							/>
						</label>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="flex flex-col gap-1">
								<span className={labelClass}>Username</span>
								<Input type="text" autoComplete="off" {...form.register("username")} />
							</label>
							<label className="flex flex-col gap-1">
								<span className={labelClass}>Password</span>
								<Input type="password" autoComplete="off" {...form.register("password")} />
							</label>
						</div>

						{submitError ? (
							<p className="text-[11px] text-amber-600 dark:text-amber-300">
								{submitError}
							</p>
						) : null}

						<div className="flex justify-end gap-2">
							<Button variant="ghost" onClick={closeForm}>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="primary"
								leftIcon={<Check className="h-4 w-4" />}
							>
								{editingId ? "Save changes" : "Create profile"}
							</Button>
						</div>
					</form>
				) : (
					<Button
						className="mt-4"
						onClick={openCreate}
						leftIcon={<Plus className="h-4 w-4" />}
					>
						Add profile
					</Button>
				)}
			</div>
		</Modal>
	);
};
