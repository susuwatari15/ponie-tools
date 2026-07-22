import type { FC, ReactNode } from "react";
import { CommandBarProvider } from "./CommandBar";
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
			<CommandBarProvider>
				<div className="flex min-h-screen flex-col text-fg">
					<Header />
					<div className="flex flex-1">
						<Sidebar />
						<Content>{children}</Content>
					</div>
				</div>
			</CommandBarProvider>
		</SidebarProvider>
	);
};
