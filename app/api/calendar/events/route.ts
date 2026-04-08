import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCalendarEvents, refreshAccessToken } from "@/lib/google-calendar"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ events: [], connected: false, error: "Invalid date" })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ events: [], connected: false })
    }

    // Load tokens from DB
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json({ events: [], connected: false })
    }

    let accessToken: string = tokenRow.access_token

    // Refresh if expired (with 60s buffer)
    const expiry = new Date(tokenRow.token_expiry).getTime()
    const isExpired = Date.now() >= expiry - 60_000

    if (isExpired) {
      try {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token)
        accessToken = refreshed.access_token

        // Persist refreshed token
        await supabase
          .from("google_tokens")
          .update({
            access_token: refreshed.access_token,
            token_expiry: new Date(refreshed.expiry_date).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
      } catch (refreshErr) {
        console.error("[Calendar Events] Token refresh failed:", refreshErr)
        return NextResponse.json({ events: [], connected: false })
      }
    }

    // Fetch events
    const events = await getCalendarEvents(accessToken, date)

    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error("[Calendar Events] Error:", err)
    return NextResponse.json({ events: [], connected: false })
  }
}
