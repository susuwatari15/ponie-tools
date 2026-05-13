const navBaseClass =
	"inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

const activeNavClass =
	"bg-accent/15 text-sky-700 ring-1 ring-accent/40 dark:bg-accent/20 dark:text-accent dark:ring-accent/50";

export function navClassName({ isActive }: { isActive: boolean }) {
	return `${navBaseClass} ${isActive ? activeNavClass : ""}`;
}
