import type { FC } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navBaseClass =
	"rounded-md px-3 py-2 text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200";

const activeNavClass = "bg-accent/20 text-accent ring-1 ring-accent/50";

function navClassName({ isActive }: { isActive: boolean }) {
	return `${navBaseClass} ${isActive ? activeNavClass : ""}`;
}

export const AppLayout: FC = () => {
	return (
		<main className="min-h-screen">
			<div className="mx-auto w-full overflow-hidden text-slate-100 shadow-glow backdrop-blur">
				<header>
					<nav className="mt-4 flex gap-2 lg:hidden" aria-label="Workspace">
						<NavLink to="/" end className={navClassName}>
							Swagger Minifier
						</NavLink>
						<NavLink to="/swagger-compare" className={navClassName}>
							Swagger Compare
						</NavLink>
						<NavLink to="/permission-diff" className={navClassName}>
							Permission Diff
						</NavLink>
					</nav>
				</header>

				<div className="lg:flex">
					<aside className="hidden w-64 shrink-0 border-r border-slate-700/70 bg-slate-900/70 lg:block">
						<nav className="flex flex-col gap-2 p-4" aria-label="Main">
							<NavLink to="/" end className={navClassName}>
								Swagger Minifier
							</NavLink>
							<NavLink to="/swagger-compare" className={navClassName}>
								Swagger Compare
							</NavLink>
							<NavLink to="/permission-diff" className={navClassName}>
								Permission Diff
							</NavLink>
						</nav>
					</aside>

					<div className="min-w-0 flex-1">
						<Outlet />
					</div>
				</div>
			</div>
		</main>
	);
};
