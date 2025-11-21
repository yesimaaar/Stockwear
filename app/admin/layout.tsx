"use client";

import type React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as LucideIcons from "lucide-react";
const { LogOut, AlertTriangle, Bell, Loader2, RefreshCcw, Moon, PanelLeft, ShoppingCart } = LucideIcons;

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AuthService } from "@/lib/services/auth-service";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import type { AdminSidebarProps, SidebarMode } from "@/components/admin-sidebar";
import HeaderSearchBar from "@/components/header-search-bar";
import { cn } from "@/lib/utils";
import { OPEN_QUICK_CART_EVENT } from "@/lib/events";

type InventoryNotification = {
	id: string;
	title: string;
	description: string;
	productId: number;
	meta?: {
		stockMinimo: number;
		stockActual: number;
	};
};

const SEARCHABLE_MODULES = ADMIN_NAV_ITEMS.filter((module) =>
	["/admin", "/admin/productos", "/admin/historial"].includes(module.href)
);

const DEFAULT_SEARCH_MODULE = "/admin"

const AdminSidebar = dynamic<AdminSidebarProps>(() => import("@/components/admin-sidebar"), {
	ssr: false,
	loading: () => (
		<div className="hidden h-screen w-[68px] flex-col border-r border-border bg-background px-3 py-5 lg:flex">
			<div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
			<div className="mt-6 space-y-3">
				{Array.from({ length: 7 }).map((_, index) => (
					<div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />
				))}
			</div>
		</div>
	),
});

export default function AdminLayout({
	children
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [user, setUser] = useState<Usuario | null>(null);
	const [loading, setLoading] = useState(true);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const [notificationsError, setNotificationsError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const { resolvedTheme, setTheme } = useTheme();
	const [sidebarMode, setSidebarMode] = useState<SidebarMode>("condensed");
	const searchWrapperRef = useRef<HTMLDivElement | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [searchModule, setSearchModule] = useState(() => {
		const isSearchable = SEARCHABLE_MODULES.some(m => m.href === pathname);
		return isSearchable ? pathname : DEFAULT_SEARCH_MODULE;
	});
	const [searchPanelOpen, setSearchPanelOpen] = useState(false);
	const canShowSearchModules = pathname === "/admin";

	useEffect(() => {
		const loadUser = async () => {
			const currentUser = await AuthService.getCurrentUser();
			if (!currentUser || currentUser.rol !== "admin") {
				router.push("/login");
				return;
			}

			// Si el usuario no tiene tienda asignada, redirigir al registro de tienda
			if (!currentUser.tiendaId) {
				router.push("/register-store");
				return;
			}

			setUser(currentUser);
			setLoading(false);
		};

		void loadUser();
	}, [router]);

	const loadNotifications = useCallback(async () => {
		if (!user?.tiendaId) {
			return
		}
		setNotificationsLoading(true);
		setNotificationsError(null);
		try {
			const { data: productos, error: productosError } = await supabase
				.from("productos")
				.select("id,nombre,estado,\"stockMinimo\"")
				.eq("estado", "activo")
				.eq("tienda_id", user.tiendaId)
				.order("nombre", { ascending: true })
				.limit(500);

			if (productosError) {
				throw productosError;
			}

			const productIds = (productos ?? []).map((producto) => producto.id);
			let stockRows: Array<{ productoId: number; cantidad: number }> = [];

			if (productIds.length > 0) {
				const { data: stockData, error: stockError } = await supabase
					.from("stock")
					.select("\"productoId\",cantidad")
					.eq("tienda_id", user.tiendaId)
					.in("productoId", productIds)
					.limit(5000);

				if (stockError) {
					throw stockError;
				}

				stockRows = stockData ?? [];
			}

			const totalsByProduct = stockRows.reduce<Record<number, number>>((acc, item) => {
				const totalActual = acc[item.productoId] ?? 0;
				acc[item.productoId] = totalActual + (item.cantidad ?? 0);
				return acc;
			}, {});

			const lowStockNotifications = (productos ?? [])
				.map<InventoryNotification | null>((producto) => {
					const min = Number(producto.stockMinimo ?? 0);
					if (min <= 0) {
						return null;
					}

					const stockActual = totalsByProduct[producto.id] ?? 0;
					if (stockActual >= min) {
						return null;
					}

					return {
						id: `low-stock-${producto.id}`,
						title: producto.nombre ?? `Producto #${producto.id}`,
						description: `Stock actual ${stockActual} / mínimo ${min}`,
						productId: producto.id,
						meta: {
							stockActual,
							stockMinimo: min
						},
					};
				})
				.filter((item): item is InventoryNotification => Boolean(item))
				.sort((a, b) => (a.meta?.stockActual ?? 0) - (b.meta?.stockActual ?? 0));

			setNotifications(lowStockNotifications);
			setLastUpdated(new Date());
		} catch (error) {
			console.error("No se pudieron cargar las notificaciones", error);
			setNotificationsError("No se pudieron cargar las alertas de inventario.");
		} finally {
			setNotificationsLoading(false);
		}
	}, [user?.tiendaId]);

	useEffect(() => {
		if (!user) {
			return;
		}

		void loadNotifications();
	}, [user, loadNotifications]);

	const notificationsBadge = useMemo(() => {
		const total = notifications.length;
		if (total === 0) {
			return null;
		}

		return total > 9 ? "9+" : `${total}`;
	}, [notifications]);

	const formattedUpdatedAt = useMemo(() => {
		if (!lastUpdated) {
			return null;
		}

		return new Intl.DateTimeFormat("es-CO", {
			hour: "2-digit",
			minute: "2-digit"
		}).format(lastUpdated);
	}, [lastUpdated]);

	const trimmedSearchValue = searchTerm.trim();
	const selectedModule = useMemo(
		() => SEARCHABLE_MODULES.find((module) => module.href === searchModule) ?? SEARCHABLE_MODULES[0] ?? ADMIN_NAV_ITEMS[0],
		[searchModule]
	);
	const searchTargetHref = canShowSearchModules ? selectedModule?.href : pathname ?? selectedModule?.href;
	const canSubmitSearch = Boolean(searchTargetHref) && trimmedSearchValue.length > 0;

	const handleSearchSubmit = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (!canSubmitSearch || !searchTargetHref) {
				return;
			}
			const query = new URLSearchParams({ q: trimmedSearchValue }).toString();
			const separator = searchTargetHref.includes("?") ? "&" : "?";
			void router.push(`${searchTargetHref}${separator}${query}`);
			setSearchPanelOpen(false);
		},
		[canSubmitSearch, router, searchTargetHref, trimmedSearchValue]
	);

	useEffect(() => {
		if (!canShowSearchModules && searchPanelOpen) {
			setSearchPanelOpen(false);
		}
	}, [canShowSearchModules, searchPanelOpen]);

	useEffect(() => {
		if (!searchPanelOpen) {
			return;
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (!searchWrapperRef.current?.contains(event.target as Node)) {
				setSearchPanelOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [searchPanelOpen]);

	const handleNotificationClick = (productId: number) => {
		setNotificationsOpen(false);
		void router.push(`/admin/productos?edit=${productId}`);
	};

	const handleLogout = async () => {
		await AuthService.logout();
		router.push("/login");
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="text-muted-foreground">Cargando...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col lg:flex-row">
			<div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
				<header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
					<div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6 lg:px-10">
						<div className="flex items-center gap-3">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
										aria-label="Configurar sidebar"
									>
										<PanelLeft className="h-5 w-5" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-48">
									<p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Sidebar
									</p>
									{(
										["closed", "condensed", "hover", "open"] satisfies SidebarMode[]
									).map((mode) => (
										<DropdownMenuItem
											key={mode}
											onSelect={(event) => {
												event.preventDefault();
												setSidebarMode(mode);
											}}
											className={cn(
												"flex items-center justify-between",
												sidebarMode === mode && "text-primary"
											)}
										>
											<span className="capitalize">{mode}</span>
											<span
												className={cn(
													"h-2 w-2 rounded-full",
													sidebarMode === mode ? "bg-primary" : "bg-muted"
												)}
											/>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<div className="hidden h-6 w-px bg-border/60 lg:block" />
						</div>
						<div ref={searchWrapperRef} className="relative flex flex-1 items-center">
							<form onSubmit={handleSearchSubmit} className="relative w-full">
								<HeaderSearchBar
									value={searchTerm}
									onChange={(nextValue) => {
										setSearchTerm(nextValue);
										if (canShowSearchModules) {
											setSearchPanelOpen(true);
										}
									}}
									onFocus={() => {
										if (canShowSearchModules) {
											setSearchPanelOpen(true);
										}
									}}
									placeholder="Search"
									className="w-full"
									aria-label="Buscar en módulos"
								/>
								{searchPanelOpen && canShowSearchModules ? (
									<div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
										<div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
											<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
												Módulos
											</p>
											<span className="text-[11px] text-muted-foreground">Selecciona dónde buscar</span>
										</div>
										<ul className="max-h-56 divide-y divide-border/60 overflow-y-auto">
											{SEARCHABLE_MODULES.map((module) => {
												const Icon = module.icon;
												const checked = searchModule === module.href;
												return (
													<li key={module.href}>
														<label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted/60">
															<Checkbox
																checked={checked}
																onCheckedChange={(state) => {
																	if (state) {
																		setSearchModule(module.href);
																	}
																}}
																className="h-4 w-4 rounded-md"
															/>
															<Icon className="h-4 w-4 text-muted-foreground" />
															<span className="flex-1 truncate">{module.label}</span>
														</label>
													</li>
												);
											})}
										</ul>
										<div className="border-t border-border/80 px-4 py-3">
											<Button type="submit" className="w-full rounded-xl" disabled={!canSubmitSearch}>
												Buscar en {selectedModule?.label ?? "Stockwear"}
											</Button>
										</div>
									</div>
								) : null}
							</form>
						</div>
						<div className="flex items-center gap-2">
							<Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
								<PopoverTrigger asChild>
									<button
										type="button"
										className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10"
									>
										<Bell className="h-5 w-5" />
										{notificationsBadge ? (
											<span className="absolute right-2 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
												{notificationsBadge}
											</span>
										) : null}
										<span className="sr-only">Abrir notificaciones</span>
									</button>
								</PopoverTrigger>
								<PopoverContent align="end" className="w-[320px] p-0">
									<div className="flex items-center justify-between border-b border-border px-4 py-3">
										<div>
											<p className="text-sm font-semibold text-foreground">Notificaciones</p>
											<p className="text-xs text-muted-foreground">
												{notificationsLoading
													? "Buscando alertas de inventario…"
													: notifications.length === 0
														? "Sin novedades de stock"
														: notifications.length === 1
															? "1 alerta pendiente"
															: `${notifications.length} alertas pendientes`}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											onClick={() => {
												void loadNotifications();
											}}
											disabled={notificationsLoading}
											title="Actualizar notificaciones"
										>
											<span className="sr-only">Actualizar notificaciones</span>
											{notificationsLoading ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<RefreshCcw className="h-4 w-4" />
											)}
										</Button>
									</div>
									<div className="max-h-80 divide-y divide-border overflow-auto">
										{notificationsError ? (
											<div className="px-4 py-5 text-sm text-destructive">{notificationsError}</div>
										) : notificationsLoading && notifications.length === 0 ? (
											<ul className="space-y-0">
												{Array.from({ length: 3 }).map((_, index) => (
													<li key={index} className="flex items-start gap-3 px-4 py-4">
														<span className="mt-1 h-7 w-7 rounded-full bg-muted" />
														<div className="flex-1 space-y-2">
															<div className="h-4 w-32 rounded bg-muted" />
															<div className="h-3 w-48 rounded bg-muted/70" />
														</div>
													</li>
												))}
											</ul>
										) : notifications.length === 0 ? (
											<div className="px-4 py-6 text-sm text-muted-foreground">
												No hay alertas de inventario en este momento.
											</div>
										) : (
											<ul>
												{notifications.map((notification) => (
													<li key={notification.id} className="flex items-start gap-3 px-4 py-4 hover:bg-muted/40">
														<span className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-700">
															<AlertTriangle className="h-4 w-4" />
														</span>
														<div className="flex-1 text-sm">
															<p className="font-medium text-foreground">{notification.title}</p>
															<p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
															{notification.meta ? (
																<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
																	<Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
																		Stock {notification.meta.stockActual}
																	</Badge>
																	<Badge variant="outline" className="border-slate-200">
																		Mínimo {notification.meta.stockMinimo}
																	</Badge>
																</div>
															) : null}
															<button
																type="button"
																onClick={() => handleNotificationClick(notification.productId)}
																className="mt-2 inline-flex text-xs font-semibold text-primary transition hover:underline"
															>
																Revisar producto
															</button>
														</div>
													</li>
												))}
											</ul>
										)}
									</div>
									{formattedUpdatedAt ? (
										<div className="border-t border-border px-4 py-2 text-right text-[11px] text-muted-foreground">
											Actualizado {formattedUpdatedAt}
										</div>
									) : null}
								</PopoverContent>
							</Popover>
							<button
								type="button"
								onClick={() => {
									if (typeof window !== "undefined") {
										window.dispatchEvent(new Event(OPEN_QUICK_CART_EVENT));
									}
								}}
								className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10"
								aria-label="Abrir carrito de facturación"
							>
								<ShoppingCart className="h-5 w-5" />
							</button>
							<button
								type="button"
								onClick={() => {
									setTheme(resolvedTheme === "dark" ? "light" : "dark");
								}}
								className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10"
								aria-label="Alternar tema"
							>
								<Moon className="h-5 w-5" />
							</button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-indigo-200 via-purple-200 to-orange-100 text-sm font-medium uppercase text-foreground shadow"
									>
										<Avatar className="h-9 w-9 border-2 border-white/80 text-base">
											<AvatarFallback className="text-sm font-semibold uppercase">
												{user?.nombre ? user.nombre.charAt(0) : "U"}
											</AvatarFallback>
										</Avatar>
										<span className="sr-only">Abrir menú de usuario</span>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel>
										<div className="space-y-1">
											<p className="text-sm font-semibold leading-none text-foreground">{user?.nombre}</p>
											<p className="text-xs text-muted-foreground">{user?.email}</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="gap-2 text-destructive focus:text-destructive"
										onSelect={(event) => {
											event.preventDefault();
											void handleLogout();
										}}
									>
										<LogOut className="h-4 w-4" />
										Cerrar sesión
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</header>
				<main className="mx-auto w-full flex-1 space-y-7 px-4 pt-7 pb-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
					{children}
				</main>
			</div>
			<div className="lg:order-first lg:flex-none">
				<AdminSidebar sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />
			</div>
		</div>
	);
}

