'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MultiAccountService } from '@/features/auth/services/multi-account-service'

export function StoreGuard({ children }: { children: React.ReactNode }) {
    // TEMPORARY: Bypass all checks to allow app to load
    // This allows you to run the SQL script and fix the database.
    // We will re-enable this after the database is fixed.

    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        MultiAccountService.startTokenListener()
        // Also save the current account immediately if user is already logged in
        MultiAccountService.saveCurrentAccount()
    }, [])

    return <>{children}</>
}
