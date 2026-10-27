import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
	return (
		<div className="mx-auto w-full max-w-2xl p-4 sm:p-6 sm:pt-14">
			<Card>
				<EmptyState
					icon={Compass}
					title="404 — nothing at this path"
					description="The page may have moved, or the link is mistyped. Every tool is one ⌘K away."
					action={
						<Link
							href="/"
							className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
						>
							<ArrowLeft className="h-4 w-4" aria-hidden />
							Back to Home
						</Link>
					}
				/>
			</Card>
		</div>
	);
}
