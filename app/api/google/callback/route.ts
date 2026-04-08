import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens } from "@/lib/google-calendar"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // user_id

    if (!code || !state) {
      return NextResponse.redirect(`${BASE_URL}/settings?calendar=error`)
    }

    // Verify the state param matches the authenticated user to prevent
    // an attacker from storing tokens under another user's ID.
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== state) {
      console.error("[Google Callback] State mismatch or unauthenticated:", {
        stateUserId: state,
        authUserId: user?.id ?? "none",
      })
      return NextResponse.redirect(`${BASE_URL}/settings?calendar=error`)
    }

    const tokens = await exchangeCodeForTokens(code)

    const { error } = await supabase
      .from("google_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(tokens.expiry_date).toISOString(),
          calendar_id: "primary",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (error) {
      console.error("[Google Callback] Supabase upsert error:", error)
      return NextResponse.redirect(`${BASE_URL}/settings?calendar=error`)
    }

    return NextResponse.redirect(`${BASE_URL}/settings?calendar=connected`)
  } catch (err) {
    console.error("[Google Callback] Error:", err)
    return NextResponse.redirect(`${BASE_URL}/settings?calendar=error`)
  }
}
