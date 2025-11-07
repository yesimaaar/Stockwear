"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AdminSectionLayoutProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	sidebar?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function AdminSectionLayout({
	title,
	description,
	actions,
	sidebar,
	children,
	className
}: AdminSectionLayoutProps) {
	return (
		<div className={cn("flex flex-col gap-6 lg:flex-row lg:gap-10", className)}>
			{sidebar ? (
				<aside className="hidden w-full max-w-[18rem] flex-none space-y-4 rounded-3xl border border-border bg-background p-5 shadow-sm lg:block">
					{sidebar}
				</aside>
			) : null}
			<section className="flex-1 space-y-6">
				<header className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card px-5 py-5 shadow-sm lg:flex-row lg:items-center lg:px-8 lg:py-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground lg:text-3xl">{title}</h1>
						{description ? (
							<p className="mt-1 text-sm text-muted-foreground lg:text-base">{description}</p>
						) : null}
					</div>
					{actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
				</header>
				<div className="space-y-6">{children}</div>
			</section>
		</div>
	);
}

export default AdminSectionLayout;
