"use client";

import type { FC, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navClassName } from "./nav-styles";

type NavLinkProps = {
	href: string;
	end?: boolean;
	children: ReactNode;
	className?: string;
};

export const NavLink: FC<NavLinkProps> = ({ href, end, children }) => {
	const pathname = usePathname();
	const isActive = end ? pathname === href : pathname.startsWith(href);

	return (
		<Link href={href} className={navClassName({ isActive })}>
			{children}
		</Link>
	);
};
