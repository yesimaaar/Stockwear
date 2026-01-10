import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-[420px] w-full rounded-3xl" />
            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="rounded-xl border border-border bg-card">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <Skeleton className="h-12 w-12 rounded-lg" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-48" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-5 w-24" />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <Skeleton className="ml-auto h-4 w-24" />
                                        <Skeleton className="ml-auto h-6 w-16" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                    <Skeleton className="h-9 w-9 rounded-md" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
