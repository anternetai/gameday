import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGoogleAuthUrl } from "@/lib/google-calendar"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"))
    }

    const authUrl = getGoogleAuthUrl(user.id)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate auth URL" },
      { status: 500 }
    )
  }
}
