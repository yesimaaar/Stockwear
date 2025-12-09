'use client'

/**
 * StoreGuard - Temporarily simplified to fix auth loop issues
 * Multi-account functionality disabled until core auth is stable
 */
export function StoreGuard({ children }: { children: React.ReactNode }) {
    // Bypass all multi-account logic - just render children
    return <>{children}</>
}
