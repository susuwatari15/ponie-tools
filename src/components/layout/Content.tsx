import type { FC, ReactNode } from "react";

type ContentProps = {
	children: ReactNode;
	className?: string;
};

export const Content: FC<ContentProps> = ({ children, className = "" }) => {
	return <div className={`min-w-0 flex-1 ${className}`.trim()}>{children}</div>;
};
