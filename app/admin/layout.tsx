"use client";

import type React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AuthService } from "@/lib/services/auth-service";
import type { Usuario } from "@/lib/types";

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

