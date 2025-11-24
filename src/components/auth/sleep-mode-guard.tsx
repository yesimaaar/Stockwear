"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/features/auth/services/auth-service"
import { useToast } from "@/hooks/use-toast"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"

export function SleepModeGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        const checkSleep = async () => {
            try {
                const user = await AuthService.getCurrentUser()
                if (!user) return

                // Check if user is owner
                // We need to fetch all users to find the owner, or check if user is admin and created first
                // For efficiency, let's assume if we are in sleep mode, we should check ownership strictly
                // But AuthService.checkSleepMode only checks time.

                // Optimization: First check if sleep mode is active for the store
                const tiendaId = await getCurrentTiendaId()
                const { isSleepMode, message } = await AuthService.checkSleepMode(tiendaId)

                if (isSleepMode) {
                    // If sleep mode is active, check if user is owner
                    // We can reuse the logic from AuthService or duplicate it here.
                    // Ideally AuthService should have an isOwner(userId) method.
                    // For now, let's fetch users and check.
                    const users = await AuthService.getAll()
                    if (users.length > 0) {
                        const owner = users.reduce((prev, curr) =>
                            new Date(prev.createdAt).getTime() < new Date(curr.createdAt).getTime() ? prev : curr
                            , users[0])

                        if (user.id !== owner.id) {
                            // User is NOT owner, and it is sleep time.
                            // Logout and redirect
                            await AuthService.logout()
                            toast({
                                title: "Modo de descanso activo",
                                description: message || "Es hora de dormir, puedes continuar mañana a las 7:00 AM",
                                variant: "destructive",
                                duration: 10000,
                            })
                            router.push("/login")
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking sleep mode", error)
            }
        }

        // Check immediately
        checkSleep()

        // Check every minute
        const interval = setInterval(checkSleep, 60000)

        return () => clearInterval(interval)
    }, [router, toast])

    return <>{children}</>
}
