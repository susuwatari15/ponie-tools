"use client";

import type { FC } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { formatShortcut } from "./commandBarUtils";

export type ShortcutSection = {
	title: string;
	entries: { keys: string; label: string }[];
};

type ShortcutsModalProps = {
	open: boolean;
	onClose: () => void;
	sections: ShortcutSection[];
};

/** The `?` cheat sheet: global shortcuts plus whatever the current page registered. */
export const ShortcutsModal: FC<ShortcutsModalProps> = ({ open, onClose, sections }) => (
	<Modal
		open={open}
		onClose={onClose}
		eyebrow="// keyboard"
		title="Keyboard shortcuts"
		widthClassName="max-w-xl"
	>
		<div className="scroll-ide -mx-1 max-h-[65vh] space-y-5 overflow-y-auto px-1">
			{sections.map((section) => (
				<section key={section.title}>
					<h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
						{section.title}
					</h3>
					<ul className="divide-y divide-line rounded-lg border border-line">
						{section.entries.map((entry) => (
							<li
								key={`${entry.keys}|${entry.label}`}
								className="flex items-center justify-between gap-3 px-3 py-2"
							>
								<span className="text-sm text-fg">{entry.label}</span>
								<span className="flex shrink-0 items-center gap-1">
									{formatShortcut(entry.keys).map((key) => (
										<Kbd key={key}>{key}</Kbd>
									))}
								</span>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	</Modal>
);
