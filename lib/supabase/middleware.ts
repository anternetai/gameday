import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_TOKEN } from "@/lib/auth/admin"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const hasAdminBypass = adminCookie === ADMIN_COOKIE_TOKEN

  if (hasAdminBypass) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/today", request.url))
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/today", request.url))
  }

  return supabaseResponse
}
