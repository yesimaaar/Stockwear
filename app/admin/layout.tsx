"use client";

import type React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
const { LogOut, Bell, AlertTriangle, Loader2, RefreshCcw } = LucideIcons;

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const AdminSidebar = dynamic(() => import("@/components/admin-sidebar"), {
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
	const [user, setUser] = useState<Usuario | null>(null);
	const [loading, setLoading] = useState(true);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const [notificationsError, setNotificationsError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	useEffect(() => {
		const loadUser = async () => {
			const currentUser = await AuthService.getCurrentUser();
			if (!currentUser || currentUser.rol !== "admin") {
				router.push("/login");
				return;
			}
			setUser(currentUser);
			setLoading(false);
		};

		void loadUser();
	}, [router]);

	const loadNotifications = useCallback(async () => {
		setNotificationsLoading(true);
		setNotificationsError(null);
		try {
			const { data: productos, error: productosError } = await supabase
				.from("productos")
				.select("id,nombre,estado,\"stockMinimo\"")
				.eq("estado", "activo")
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
	}, []);

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
				<header className="sticky top-0 z-40 border-b border-border bg-card">
					<div className="flex h-12 w-full items-center justify-between gap-3 px-5 lg:px-10">
						<div className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
								<div className="relative h-6 w-6">
									<Image
										src="/stockwear-icon.png"
										alt="StockWear"
										fill
										sizes="100%"
										className="object-contain"
									/>
								</div>
							</div>
							<div className="leading-tight">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stockwear</p>
								<p className="text-base font-semibold text-foreground">Panel de Administración</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="relative h-10 w-10 rounded-full border border-border bg-background shadow-sm"
									>
										<Bell className="h-5 w-5 text-muted-foreground" />
										{notificationsBadge ? (
											<span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
												{notificationsBadge}
											</span>
										) : null}
										<span className="sr-only">Abrir notificaciones</span>
									</Button>
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
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-10 w-10 rounded-full border border-border bg-background shadow-sm"
									>
										<Avatar className="h-8 w-8">
											<AvatarFallback className="text-sm font-medium uppercase">
												{user?.nombre ? user.nombre.charAt(0) : "U"}
											</AvatarFallback>
										</Avatar>
										<span className="sr-only">Abrir menú de usuario</span>
									</Button>
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
				<AdminSidebar />
			</div>
		</div>
	);
}

