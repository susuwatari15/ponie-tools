const navBaseClass =
	"group inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 text-muted hover:bg-raised hover:text-fg";

const activeNavClass =
	"bg-accent/12 text-accent ring-1 ring-accent/30 hover:bg-accent/15 hover:text-accent";

export function navClassName({ isActive }: { isActive: boolean }) {
	return `${navBaseClass} ${isActive ? activeNavClass : ""}`;
}
