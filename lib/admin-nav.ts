import type { LucideIcon } from "lucide-react";
import {
	ArrowLeftRight,
	BarChart3,
	Boxes,
	Clock,
	Home,
	Layers3,
	Package,
	Shirt,
	Users
} from "lucide-react";

export type AdminNavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
	{ href: "/admin", icon: Home, label: "Inicio" },
	{ href: "/admin/almacenes", icon: Boxes, label: "Almacenes" },
	{ href: "/admin/categorias", icon: Layers3, label: "Categorías" },
	{ href: "/admin/productos", icon: Package, label: "Productos y Stock" },
	{ href: "/admin/movimientos", icon: ArrowLeftRight, label: "Movimientos" },
	{ href: "/admin/tallas", icon: Shirt, label: "Tallas" },
	{ href: "/admin/usuarios", icon: Users, label: "Usuarios" },
	{ href: "/admin/reportes", icon: BarChart3, label: "Reportes" },
	{ href: "/admin/historial", icon: Clock, label: "Historial" }
];
