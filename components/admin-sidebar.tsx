"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/ui/tooltip";


export type SidebarMode = "closed" | "condensed" | "open" | "hover";

export type AdminSidebarProps = {
	sidebarMode: SidebarMode;
	setSidebarMode: Dispatch<SetStateAction<SidebarMode>>;
};

const SIDEBAR_WIDTH: Record<SidebarMode, string> = {
	closed: "w-[54px]",
	condensed: "w-[60px]",
	hover: "w-[60px]",
	open: "w-48"
};

function useIsDesktop() {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 1024px)");
		const updateMatch = () => setIsDesktop(mediaQuery.matches);
		updateMatch();
		mediaQuery.addEventListener("change", updateMatch);
		return () => mediaQuery.removeEventListener("change", updateMatch);
	}, []);

	return isDesktop;
}

export function AdminSidebar({ sidebarMode, setSidebarMode }: AdminSidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const isDesktop = useIsDesktop();
	const prefetchedRoutesRef = useRef(new Set<string>());

	useEffect(() => {
		setSidebarMode((previous) => {
			if (!isDesktop) {
				return "closed";
			}
			return previous === "closed" ? "condensed" : previous;
		});
	}, [isDesktop, setSidebarMode]);

	const hoverEnabled = sidebarMode === "hover" && isDesktop;
	const showLabels = sidebarMode === "open";
	const tooltipsEnabled =
		isDesktop && (sidebarMode === "closed" || sidebarMode === "condensed");

	const prefetchRoute = useCallback(
		(href: string) => {
			if (!href) return;
			const current = prefetchedRoutesRef.current;
			if (current.has(href)) return;
			try {
				router.prefetch(href);
				current.add(href);
			} catch (error) {
				current.delete(href);
				if (process.env.NODE_ENV !== "production") {
					console.debug("No se pudo prefetch la ruta", href, error);
				}
			}
		},
		[router]
	);

	useEffect(() => {
		if (!isDesktop) return;
		let canceled = false;

		const prefetchAll = () => {
			if (canceled) return;
			for (const item of ADMIN_NAV_ITEMS) {
				prefetchRoute(item.href);
			}
		};

		const browserWindow = window as Window & {
			requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
			cancelIdleCallback?: (handle: number) => void;
		};

		if (typeof browserWindow.requestIdleCallback === "function") {
			const handle = browserWindow.requestIdleCallback(prefetchAll, { timeout: 1500 });
			return () => {
				canceled = true;
				browserWindow.cancelIdleCallback?.(handle);
			};
		}

		const timeout = window.setTimeout(prefetchAll, 400);
		return () => {
			canceled = true;
			window.clearTimeout(timeout);
		};
	}, [isDesktop, prefetchRoute]);

	const wrapperClass = useMemo(
		() =>
			cn(
				"group/sidebar relative z-20 hidden flex-col border-r border-border bg-card transition-all duration-200 lg:flex lg:sticky lg:top-0 lg:h-screen",
				SIDEBAR_WIDTH[sidebarMode],
				hoverEnabled && "lg:hover:w-48"
			),
		[hoverEnabled, sidebarMode]
	);

	return (
		<>
			<aside className={wrapperClass}>
				<div className="hidden px-3 pb-2 pt-5 lg:flex">
						<Link
							href="/admin"
							className={cn(
								"group/logo flex h-12 w-full items-center rounded-xl border border-transparent bg-card text-foreground transition-all duration-200 hover:bg-secondary",
								showLabels ? "justify-start gap-3 px-4" : "justify-center",
								hoverEnabled && "lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:gap-3 lg:group-hover/sidebar:px-4"
							)}
						>
							<span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-primary">
								<span className="relative h-6 w-6">
									<Image
										src="/stockwear-icon.png"
										alt="StockWear"
										fill
										sizes="100%"
										className="object-contain block dark:hidden"
									/>
									<Image
										src="/stockwear-icon-white.png"
										alt="StockWear"
										fill
										sizes="100%"
										className="hidden object-contain dark:block"
									/>
								</span>
							</span>
						<span
							className={cn(
								"text-lg font-semibold text-foreground transition-all duration-200",
								showLabels
									? "ml-2 opacity-100"
								: hoverEnabled
									? "hidden opacity-0 lg:group-hover/logo:inline lg:group-hover/logo:ml-2 lg:group-hover/logo:opacity-100 lg:group-hover/logo:text-foreground"
									: "hidden opacity-0"
							)}
						>
							Stockwear
						</span>
					</Link>
				</div>
				<TooltipProvider delayDuration={120}>
					<nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<ul className="flex list-none flex-col gap-1.5 p-0">
						{ADMIN_NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href;
							const linkContent = (
								<Link
									href={item.href}
									onMouseEnter={() => prefetchRoute(item.href)}
									onFocus={() => prefetchRoute(item.href)}
									className={cn(
										"group flex h-12 w-full items-center justify-center rounded-xl border border-transparent bg-card text-muted-foreground transition-all duration-200 hover:bg-secondary",
										hoverEnabled &&
											"lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:gap-3 lg:group-hover/sidebar:px-4 lg:group-hover/sidebar:bg-secondary",
										isActive && "border-primary/60 bg-primary/10 text-foreground dark:bg-primary/20",
										showLabels ? " justify-start gap-3 px-4" : ""
									)}
								>
									<Icon className="h-5 w-5" />
									<span
										className={cn(
											"text-sm font-medium transition-all duration-200",
											showLabels
												? "ml-3 opacity-100"
												: hoverEnabled
												? "hidden opacity-0 lg:group-hover/sidebar:inline lg:group-hover/sidebar:ml-3 lg:group-hover/sidebar:opacity-100"
												: "hidden opacity-0"
										)}
									>
										{item.label}
									</span>
								</Link>
							);

							return (
								<li key={item.href} className="w-full">
									{tooltipsEnabled ? (
										<Tooltip>
											<TooltipTrigger asChild>{linkContent}</TooltipTrigger>
											<TooltipContent side="right" className="hidden font-medium lg:block">
												{item.label}
											</TooltipContent>
										</Tooltip>
									) : (
										linkContent
									)}
								</li>
							);
						})}
					</ul>
					</nav>
				</TooltipProvider>

				<div className="border-t border-border px-3 py-4">
					<Link
						href="/admin/configuracion"
						className={cn(
							"inline-flex h-10 w-full items-center rounded-xl border border-border/60 bg-card text-sm font-medium text-foreground transition hover:bg-secondary",
							showLabels ? "justify-start gap-3 px-4" : "justify-center"
						)}
					>
						<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground">
							<Settings className="h-4 w-4" />
						</span>
						<span
							className={cn(
								"text-sm font-semibold text-foreground transition-all duration-200",
								showLabels
									? "opacity-100"
									: hoverEnabled
										? "hidden opacity-0 lg:group-hover/sidebar:inline lg:group-hover/sidebar:opacity-100"
										: "hidden opacity-0"
							)}
						>
							Configuración
						</span>
					</Link>
				</div>
			</aside>

			<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-2 pb-4 pt-3 lg:hidden">
				<ul className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					{ADMIN_NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;

						return (
							<li key={item.href} className="flex min-w-[78px] flex-none justify-center">
								<Link
									href={item.href}
									className={cn(
										"flex w-full flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
										isActive && "bg-primary text-primary-foreground"
									)}
								>
									<Icon className="h-5 w-5" />
									<span className="text-[0.68rem] leading-none text-center">
										{item.label}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>
		</>
	);
}

export default AdminSidebar;
