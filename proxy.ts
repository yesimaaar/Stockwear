import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  console.log("Proxy Middleware running for:", request.nextUrl.pathname)
  console.log("Proxy Cookies:", request.cookies.getAll().map(c => c.name))
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/tfhub-proxy/).*)",
  ],
}
