import type { FC, ReactNode } from "react";
import { Content } from "./Content";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarProvider";

type AppShellProps = {
	children: ReactNode;
};

export const AppShell: FC<AppShellProps> = ({ children }) => {
	return (
		<SidebarProvider>
			<main className="min-h-screen text-slate-900 dark:text-slate-100">
				<div className="mx-auto w-full overflow-hidden shadow-glow backdrop-blur dark:shadow-glow">
					<Header />
					<div className="lg:flex">
						<Sidebar />
						<Content>
							{children}
						</Content>
					</div>
				</div>
			</main>
		</SidebarProvider>
	);
};

