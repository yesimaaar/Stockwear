'use client'

import { useRouter, usePathname } from 'next/navigation'

export function StoreGuard({ children }: { children: React.ReactNode }) {
    // TEMPORARY: Bypass all checks to allow app to load
    // This allows you to run the SQL script and fix the database.
    // We will re-enable this after the database is fixed.

    const router = useRouter()
    const pathname = usePathname()

    return <>{children}</>
}
