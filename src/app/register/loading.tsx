import { Skeleton } from "@/components/ui/skeleton"

export default function RegisterLoading() {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Preview (solo desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 to-zinc-800 p-8">
        <div className="w-full max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8 bg-zinc-700" />
          <Skeleton className="h-64 w-full rounded-2xl bg-zinc-700/50" />
        </div>
      </div>
      
      {/* Panel derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Formulario skeleton */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          
          <div className="flex justify-center">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}
