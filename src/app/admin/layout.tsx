import { Suspense } from "react";
import { SleepModeGuard } from "@/components/auth/sleep-mode-guard";
import { AdminLayoutClient } from "./admin-layout-client";
import AdminLoading from "./loading";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<SleepModeGuard>
			<Suspense fallback={<AdminLoading />}>
				<AdminLayoutClient>{children}</AdminLayoutClient>
			</Suspense>
		</SleepModeGuard>
	);
}
