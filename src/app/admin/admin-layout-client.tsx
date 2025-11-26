"use client";

import type React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, AlertTriangle, Bell, Loader2, RefreshCcw, Moon, Sun, PanelLeft, ShoppingCart, ArrowLeft, Plus, User, Trash2, Package, Users, Store, Layers3 } from "lucide-react";

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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AuthService } from "@/features/auth/services/auth-service";
import { MultiAccountService, type SavedAccount } from "@/features/auth/services/multi-account-service";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import AdminSidebar, { type AdminSidebarProps, type SidebarMode } from "@/components/domain/admin-sidebar";
import HeaderSearchBar from "@/components/domain/header-search-bar";
import { cn } from "@/lib/utils";
import { OPEN_QUICK_CART_EVENT } from "@/lib/events";

const SEARCHABLE_MODULES = [
    { label: "Stock", icon: Package, href: "/admin/productos" },
    { label: "Usuarios", icon: Users, href: "/admin/usuarios" },
    { label: "Almacenes", icon: Store, href: "/admin/almacenes" },
    { label: "Categorías", icon: Layers3, href: "/admin/categorias" },
];

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme, setTheme, resolvedTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    // Inicializar sidebar en modo condensado para evitar CLS
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>("condensed");
    const [user, setUser] = useState<Usuario | null>(null);
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);

    // Search state
    const [searchTerm, setSearchTerm] = useState("");
    const [searchModule, setSearchModule] = useState<string>("/admin/productos");
    const [searchPanelOpen, setSearchPanelOpen] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    // Notifications state
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);
    const [notificationsBadge, setNotificationsBadge] = useState<number | null>(null);
    const [formattedUpdatedAt, setFormattedUpdatedAt] = useState<string | null>(null);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    // Mobile menu state
    const [mobileMenuView, setMobileMenuView] = useState<"main" | "notifications">("main");

    useEffect(() => {
        setMounted(true);
        // Load dismissed notifications from local storage
        const savedDismissed = localStorage.getItem("dismissedNotifications");
        if (savedDismissed) {
            try {
                setDismissedIds(JSON.parse(savedDismissed));
            } catch (e) {
                console.error("Error parsing dismissed notifications", e);
            }
        }
    }, []);

    useEffect(() => {
        AuthService.getCurrentUser().then(setUser);
        setAccounts(MultiAccountService.getAccounts());

        // Load initial search param
        const q = searchParams.get("q");
        if (q) setSearchTerm(q);
    }, [searchParams]);

    // Click outside search panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setSearchPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadNotifications = useCallback(async () => {
        if (!user?.tiendaId) return;

        console.log("[Notifications] Loading notifications for store:", user.tiendaId);
        setNotificationsLoading(true);
        setNotificationsError(null);
        try {
            // Fetch products with their stock entries
            // Increased limit to ensure we catch all low stock items
            const { data, error } = await supabase
                .from('productos')
                .select('id, nombre, stockMinimo, stock(cantidad)')
                .eq('tienda_id', user.tiendaId)
                .eq('estado', 'activo')
                .limit(5000);

            if (error) throw error;

            console.log("[Notifications] Fetched products:", data?.length);

            const currentLowStockIds = new Set<string>();

            const alerts = (data || [])
                .map((p: any) => {
                    // Check if any stock entry is below minimum
                    // This matches the logic in ProductosPage (stockBajo count)
                    const hasLowStockVariant = p.stock?.some((s: any) => (s.cantidad || 0) < p.stockMinimo);

                    // Also calculate total for meta info
                    const totalStock = p.stock?.reduce((sum: number, s: any) => sum + (s.cantidad || 0), 0) || 0;

                    return {
                        ...p,
                        isLowStock: hasLowStockVariant,
                        stock_actual: totalStock
                    };
                })
                .filter(p => p.isLowStock)
                .map(p => {
                    const notificationId = `stock-${p.id}`;
                    currentLowStockIds.add(notificationId);
                    return {
                        id: notificationId,
                        title: "Stock bajo",
                        description: `El producto ${p.nombre} tiene variantes con pocas unidades.`,
                        productId: p.id,
                        meta: {
                            stockActual: p.stock_actual,
                            stockMinimo: p.stockMinimo
                        }
                    };
                })
                .filter(n => !dismissedIds.includes(n.id));

            console.log("[Notifications] Generated alerts:", alerts.length);
            console.log("[Notifications] Dismissed IDs:", dismissedIds);

            // Cleanup dismissed IDs that are no longer low stock
            const newDismissedIds = dismissedIds.filter(id => currentLowStockIds.has(id));
            if (newDismissedIds.length !== dismissedIds.length) {
                console.log("[Notifications] Cleaning up dismissed IDs. Old:", dismissedIds.length, "New:", newDismissedIds.length);
                setDismissedIds(newDismissedIds);
                localStorage.setItem(`dismissedNotifications_${user.tiendaId}`, JSON.stringify(newDismissedIds));
            }

            setNotifications(alerts);
            setNotificationsBadge(alerts.length > 0 ? alerts.length : null);
            setFormattedUpdatedAt(new Date().toLocaleTimeString());
        } catch (error: any) {
            console.error("Error loading notifications", error.message || error);
            setNotificationsError("No se pudieron cargar las notificaciones");
        } finally {
            setNotificationsLoading(false);
        }
    }, [user, dismissedIds]);

    useEffect(() => {
        if (user?.tiendaId) {
            // Load dismissed notifications from local storage specific to this store
            const savedDismissed = localStorage.getItem(`dismissedNotifications_${user.tiendaId}`);
            if (savedDismissed) {
                try {
                    setDismissedIds(JSON.parse(savedDismissed));
                } catch (e) {
                    console.error("Error parsing dismissed notifications", e);
                }
            }
            void loadNotifications();
        }

        // Listen for refresh events
        const handleRefresh = () => {
            if (user?.tiendaId) {
                void loadNotifications();
            }
        };

        window.addEventListener("REFRESH_NOTIFICATIONS", handleRefresh);
        return () => {
            window.removeEventListener("REFRESH_NOTIFICATIONS", handleRefresh);
        };
    }, [loadNotifications, user]);

    const handleDismissNotification = (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        if (!user?.tiendaId) return;

        const newDismissed = [...dismissedIds, notificationId];
        setDismissedIds(newDismissed);
        localStorage.setItem(`dismissedNotifications_${user.tiendaId}`, JSON.stringify(newDismissed));

        // Optimistically remove from current view
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        setNotifications(updatedNotifications);
        setNotificationsBadge(updatedNotifications.length > 0 ? updatedNotifications.length : null);
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        const params = new URLSearchParams();
        params.set("q", searchTerm);
        router.push(`${searchModule}?${params.toString()}`);
        setSearchPanelOpen(false);
    };

    const handleSwitchAccount = async (accountId: string) => {
        await MultiAccountService.switchAccount(accountId);
    };

    const handleRemoveAccount = (e: React.MouseEvent, accountId: string) => {
        e.stopPropagation();
        MultiAccountService.removeAccount(accountId);
        setAccounts(MultiAccountService.getAccounts());
    };

    const handleAddAccount = async () => {
        // Logic to add account - usually redirect to login with a flag or similar
        // For now, we'll just logout locally to allow login
        await AuthService.logout();
        router.push("/login");
    };

    const handleLogout = async () => {
        await AuthService.logout();
        router.push("/login");
    };

    const handleNotificationClick = (productId: string) => {
        router.push(`/admin/productos?id=${productId}`); // Adjust as needed
        setNotificationsOpen(false);
        setMobileMenuView("main");
    };

    const canShowSearchModules = searchTerm.length > 0;
    const canSubmitSearch = searchTerm.length > 0;
    const selectedModule = SEARCHABLE_MODULES.find(m => m.href === searchModule);

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* ... rest of the layout ... */}
            <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
                <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
                    {/* ... header content ... */}
                    <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6 lg:px-10">
                        {/* ... header items ... */}
                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button type="button" className="hidden lg:inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground transition hover:text-foreground" aria-label="Configurar sidebar">
                                        <PanelLeft className="h-5 w-5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sidebar</p>
                                    {(["closed", "condensed", "hover", "open"] as SidebarMode[]).map(mode => (
                                        <DropdownMenuItem key={mode} onSelect={e => { e.preventDefault(); setSidebarMode(mode); }} className={cn("flex items-center justify-between", sidebarMode === mode && "text-primary")}>
                                            <span className="capitalize">{mode}</span>
                                            <span className={cn("h-2 w-2 rounded-full", sidebarMode === mode ? "bg-primary" : "bg-muted")} />
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
                                    onChange={(next) => {
                                        setSearchTerm(next);
                                        if (canShowSearchModules) setSearchPanelOpen(true);
                                        if (next.trim() === "" && !canShowSearchModules) {
                                            const newParams = new URLSearchParams(searchParams.toString());
                                            newParams.delete("q");
                                            router.push(`${pathname}?${newParams.toString()}`);
                                        }
                                    }}
                                    onFocus={() => { if (canShowSearchModules) setSearchPanelOpen(true); }}
                                    placeholder="Search"
                                    className="w-full"
                                    aria-label="Buscar en módulos"
                                />
                                {searchPanelOpen && canShowSearchModules && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                                        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Módulos</p>
                                            <span className="text-[11px] text-muted-foreground">Selecciona dónde buscar</span>
                                        </div>
                                        <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto">
                                            {SEARCHABLE_MODULES.map(module => {
                                                const Icon = module.icon;
                                                const checked = searchModule === module.href;
                                                return (
                                                    <li key={module.href}>
                                                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted/60">
                                                            <Checkbox checked={checked} onCheckedChange={state => { if (state) setSearchModule(module.href); }} className="h-4 w-4 rounded-md" />
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                            <span className="flex-1 truncate">{module.label}</span>
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <div className="border-t border-border/80 px-4 py-3">
                                            <Button type="submit" className="w-full rounded-xl" disabled={!canSubmitSearch}>Buscar en {selectedModule?.label ?? "Stockwear"}</Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Desktop icons */}
                        <div className="hidden lg:flex items-center gap-2">
                            {/* Notifications */}
                            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                                <PopoverTrigger asChild>
                                    <button type="button" className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10" aria-label="Abrir notificaciones">
                                        <Bell className="h-5 w-5" />
                                        {notificationsBadge && (
                                            <span className="absolute right-2 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">{notificationsBadge}</span>
                                        )}
                                        <span className="sr-only">Abrir notificaciones</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[320px] p-0">
                                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                                            <p className="text-xs text-muted-foreground">
                                                {notificationsLoading ? "Buscando alertas de inventario…" :
                                                    notifications.length === 0 ? "Sin novedades de stock" :
                                                        notifications.length === 1 ? "1 alerta pendiente" :
                                                            `${notifications.length} alertas pendientes`}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { void loadNotifications(); }} disabled={notificationsLoading} title="Actualizar notificaciones">
                                                <span className="sr-only">Actualizar notificaciones</span>
                                                {notificationsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                            </Button>
                                            {dismissedIds.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        setDismissedIds([]);
                                                        localStorage.removeItem(`dismissedNotifications_${user?.tiendaId}`);
                                                        void loadNotifications();
                                                    }}
                                                    title="Restaurar descartadas"
                                                >
                                                    <span className="sr-only">Restaurar descartadas</span>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="max-h-80 divide-y divide-border overflow-auto">
                                        {notificationsError ? (
                                            <div className="px-4 py-5 text-sm text-destructive">{notificationsError}</div>
                                        ) : notificationsLoading && notifications.length === 0 ? (
                                            <ul className="space-y-0">
                                                {Array.from({ length: 3 }).map((_, i) => (
                                                    <li key={i} className="flex items-start gap-3 px-4 py-4">
                                                        <span className="mt-1 h-7 w-7 rounded-full bg-muted" />
                                                        <div className="flex-1 space-y-2">
                                                            <div className="h-4 w-32 rounded bg-muted" />
                                                            <div className="h-3 w-48 rounded bg-muted/70" />
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : notifications.length === 0 ? (
                                            <div className="px-4 py-6 text-sm text-muted-foreground">No hay alertas de inventario en este momento.</div>
                                        ) : (
                                            <ul className="divide-y divide-border">
                                                {notifications.map(notification => (
                                                    <li key={notification.id} className="group flex items-start gap-3 px-4 py-4 hover:bg-muted/40 relative">
                                                        <span className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                                            <AlertTriangle className="h-4 w-4" />
                                                        </span>
                                                        <div className="flex-1 text-sm pr-6">
                                                            <p className="font-medium text-foreground">{notification.title}</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
                                                            {notification.meta && (
                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Stock {notification.meta.stockActual}</Badge>
                                                                    <Badge variant="outline" className="border-slate-200">Mínimo {notification.meta.stockMinimo}</Badge>
                                                                </div>
                                                            )}
                                                            <button type="button" onClick={() => handleNotificationClick(notification.productId)} className="mt-2 inline-flex text-xs font-semibold text-primary transition hover:underline">Revisar producto</button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDismissNotification(e, notification.id)}
                                                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                                                            title="Descartar notificación"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Descartar</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {formattedUpdatedAt && (
                                            <div className="border-t border-border px-4 py-2 text-right text-[11px] text-muted-foreground">Actualizado {formattedUpdatedAt}</div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Theme toggle desktop */}
                            <button type="button" onClick={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); }} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10" aria-label="Alternar tema">
                                {/* Usar placeholder del mismo tamaño para evitar CLS */}
                                <span className="h-5 w-5 flex items-center justify-center">
                                    {mounted ? (resolvedTheme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />) : <Sun className="h-5 w-5 opacity-0" />}
                                </span>
                            </button>

                            {/* Cart button */}
                            <button type="button" onClick={() => { if (typeof window !== "undefined") { window.dispatchEvent(new Event(OPEN_QUICK_CART_EVENT)); } }} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-foreground transition hover:bg-foreground/10" aria-label="Abrir carrito de facturación">
                                <ShoppingCart className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mobile user menu */}
                        <DropdownMenu onOpenChange={(open) => { if (!open) setMobileMenuView("main"); }}>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-indigo-200 via-purple-200 to-orange-100 text-sm font-medium uppercase text-foreground shadow">
                                    <Avatar className="h-9 w-9 border-2 border-white/80 text-base">
                                        <AvatarFallback className="text-sm font-semibold uppercase">{user?.nombre ? user.nombre.charAt(0) : "U"}</AvatarFallback>
                                    </Avatar>
                                    {notificationsBadge && (
                                        <span className="lg:hidden absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm ring-2 ring-background">{notificationsBadge}</span>
                                    )}
                                    <span className="sr-only">Abrir menú de usuario</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                {mobileMenuView === "main" ? (
                                    <>
                                        <DropdownMenuLabel>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold leading-none text-foreground">{user?.nombre}</p>
                                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        {accounts.length > 0 && accounts.some(a => a.id !== user?.id) && (
                                            <>
                                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Cambiar cuenta</DropdownMenuLabel>
                                                {accounts.filter(a => a.id !== user?.id).map((account) => (
                                                    <DropdownMenuItem
                                                        key={account.id}
                                                        onSelect={() => handleSwitchAccount(account.id)}
                                                        className="gap-2 justify-between group/item cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-sm font-medium truncate">{account.nombre}</span>
                                                                <span className="text-xs text-muted-foreground truncate">{account.email}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleRemoveAccount(e, account.id)}
                                                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-opacity"
                                                            title="Quitar cuenta"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                            </>
                                        )}

                                        <DropdownMenuItem className="gap-2" onSelect={() => void handleAddAccount()}>
                                            <Plus className="h-4 w-4" />
                                            <span>Agregar cuenta</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />

                                        {/* Mobile notifications trigger */}
                                        <div className="lg:hidden">
                                            <DropdownMenuItem className="gap-2" onSelect={(e) => { e.preventDefault(); setMobileMenuView("notifications"); }}>
                                                <Bell className="h-4 w-4" />
                                                <span>Notificaciones</span>
                                                {notificationsBadge && (
                                                    <Badge variant="destructive" className="ml-auto mr-2 h-5 px-1.5 text-[10px]">{notificationsBadge}</Badge>
                                                )}
                                            </DropdownMenuItem>
                                        </div>

                                        {/* Mobile theme toggle */}
                                        <DropdownMenuItem className="gap-2" onSelect={e => { e.preventDefault(); setTheme(resolvedTheme === "dark" ? "light" : "dark"); }}>
                                            {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                            <span>Cambiar tema</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={e => { e.preventDefault(); void handleLogout(); }}>
                                            <LogOut className="h-4 w-4" />
                                            Cerrar sesión
                                        </DropdownMenuItem>

                                    </>

                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 border-b border-border px-2 py-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuView("main")}>
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-sm font-semibold">Notificaciones</span>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {notificationsLoading ? (
                                                <div className="flex h-20 items-center justify-center">
                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                                                    No hay notificaciones
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-border/60">
                                                    {notifications.map((notification) => (
                                                        <li key={notification.id} className="group flex gap-3 px-4 py-3 transition hover:bg-muted/50 relative">
                                                            <span className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                                                <AlertTriangle className="h-4 w-4" />
                                                            </span>
                                                            <div className="flex-1 text-sm pr-8">
                                                                <p className="font-medium text-foreground">{notification.title}</p>
                                                                <p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
                                                                {notification.meta && (
                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Stock {notification.meta.stockActual}</Badge>
                                                                        <Badge variant="outline" className="border-slate-200">Mínimo {notification.meta.stockMinimo}</Badge>
                                                                    </div>
                                                                )}
                                                                <button type="button" onClick={() => handleNotificationClick(notification.productId)} className="mt-2 inline-flex text-xs font-semibold text-primary transition hover:underline">Revisar producto</button>
                                                            </div>
                                                            <button
                                                                onClick={(e) => handleDismissNotification(e, notification.id)}
                                                                className="absolute right-2 top-2 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                                title="Descartar notificación"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">Descartar</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {formattedUpdatedAt && (
                                                <div className="border-t border-border px-4 py-2 text-right text-[11px] text-muted-foreground">Actualizado {formattedUpdatedAt}</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

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
