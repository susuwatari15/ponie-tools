import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { Content } from "./Content";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export const AppLayout: FC = () => {
	return (
		<main className="min-h-screen text-slate-900 dark:text-slate-100">
			<div className="mx-auto w-full overflow-hidden shadow-glow backdrop-blur dark:shadow-glow">
				<Header />

				<div className="lg:flex">
					<Sidebar />

					<Content>
						<Outlet />
					</Content>
				</div>
			</div>
		</main>
	);
};
