import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Public routes that don't require registration
const publicRoutes = ['/', '/contact', '/terms', '/privacy']
const apiRoutes = ['/api']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseResponse = await updateSession(request)

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return supabaseResponse
  }

  // Allow API routes
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // For all other routes, we'll check registration status client-side
  // The actual redirect will be handled by client-side components
  // This middleware just allows the request through
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
















