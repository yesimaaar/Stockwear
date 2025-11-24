import { Suspense } from "react";
import { SleepModeGuard } from "@/components/auth/sleep-mode-guard";
import { AdminLayoutClient } from "./admin-layout-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<SleepModeGuard>
			<Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>}>
				<AdminLayoutClient>{children}</AdminLayoutClient>
			</Suspense>
		</SleepModeGuard>
	);
}
