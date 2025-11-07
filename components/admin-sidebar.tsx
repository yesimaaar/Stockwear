"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	BarChart3,
	Boxes,
	Clock,
	Cog,
	Layers3,
	Package,
	Settings,
	Shirt,
	Users
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
	{ href: "/admin", icon: BarChart3, label: "Dashboard" },
	{ href: "/admin/almacenes", icon: Boxes, label: "Almacenes" },
	{ href: "/admin/categorias", icon: Layers3, label: "Categorías" },
	{ href: "/admin/productos", icon: Package, label: "Productos y Stock" },
	{ href: "/admin/tallas", icon: Shirt, label: "Tallas" },
	{ href: "/admin/usuarios", icon: Users, label: "Usuarios" },
	{ href: "/admin/reportes", icon: BarChart3, label: "Reportes" },
	{ href: "/admin/historial", icon: Clock, label: "Historial" },
	{ href: "/admin/configuracion", icon: Settings, label: "Configuración" }
] as const;

type SidebarMode = "closed" | "condensed" | "open" | "hover";

const SIDEBAR_WIDTH: Record<SidebarMode, string> = {
	closed: "w-[68px]",
	condensed: "w-[84px]",
	hover: "w-[84px]",
	open: "w-64"
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

export function AdminSidebar() {
	const pathname = usePathname();
	const isDesktop = useIsDesktop();
	const [sidebarMode, setSidebarMode] = useState<SidebarMode>("condensed");

	useEffect(() => {
		setSidebarMode((previous) => {
			if (!isDesktop) {
				return "closed";
			}
			return previous === "closed" ? "condensed" : previous;
		});
	}, [isDesktop]);

	const hoverEnabled = sidebarMode === "hover" && isDesktop;
	const showLabels = sidebarMode === "open";
	const tooltipsEnabled =
		isDesktop && (sidebarMode === "closed" || sidebarMode === "condensed");

	const wrapperClass = useMemo(
		() =>
			cn(
				"group/sidebar relative z-20 hidden flex-col border-r border-border/60 bg-background/70 backdrop-blur-xl transition-all duration-200 lg:flex lg:sticky lg:top-0 lg:h-screen",
				SIDEBAR_WIDTH[sidebarMode],
				hoverEnabled && "lg:hover:w-64"
			),
		[hoverEnabled, sidebarMode]
	);

	return (
		<>
			<aside className={wrapperClass}>
				<div className="hidden items-center justify-center px-3 pb-2 pt-5 lg:flex">
					<Link
						href="/admin"
						className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
					>
						<div className="relative h-6 w-6">
							<Image
								src="/stockwear-icon.png"
								alt="StockWear"
								fill
								sizes="100%"
								className="object-contain"
							/>
						</div>
					</Link>
				</div>
				<TooltipProvider delayDuration={120}>
					<nav className="flex-1 overflow-y-auto pb-4 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<ul className="flex list-none flex-col items-center gap-1.5 p-0">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href;
							const linkContent = (
								<Link
									href={item.href}
									className={cn(
										"group flex h-12 items-center justify-center rounded-xl border border-transparent bg-muted/10 text-muted-foreground transition-all duration-200",
										hoverEnabled &&
											"lg:group-hover/sidebar:w-64 lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:gap-3 lg:group-hover/sidebar:px-4 lg:group-hover/sidebar:bg-muted/20",
										isActive && "border-primary/40 bg-primary/10 text-primary",
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
								<li key={item.href} className="w-full px-3">
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

				<div className="flex justify-center border-t border-border/50 px-3 py-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
								<Cog className="h-5 w-5" />
								<span className="sr-only">Cambiar modo</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="center" side="top" className="w-44">
							{(
								["closed", "condensed", "hover", "open"] satisfies SidebarMode[]
							).map((mode) => (
								<DropdownMenuItem
									key={mode}
									onSelect={() => setSidebarMode(mode)}
									className={cn(
										"flex items-center justify-between",
										sidebarMode === mode && "text-primary"
									)}
								>
									<span className="capitalize">{mode}</span>
									<div
										className={cn(
											"h-2 w-2 rounded-full",
											sidebarMode === mode ? "bg-primary" : "bg-muted"
										)}
									/>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</aside>

			<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 px-2 pb-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
				<ul className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;

						return (
							<li key={item.href} className="flex min-w-[78px] flex-none justify-center">
								<Link
									href={item.href}
									className={cn(
										"flex w-full flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
										isActive && "bg-primary/10 text-primary"
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
