import { Skeleton } from "@/components/ui/skeleton"

export default function EmpleadoLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Camera/Recognition card */}
            <div className="rounded-xl border bg-card">
              <div className="p-4 border-b">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </div>
              <div className="p-4">
                {/* Camera preview placeholder - altura fija para evitar CLS */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
                <div className="flex gap-3 mt-4 justify-center">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </div>

            {/* Search card */}
            <div className="rounded-xl border bg-card p-4">
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

          {/* Sidebar - Recommendations */}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
