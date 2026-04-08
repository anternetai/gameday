import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const FALLBACK_USER_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "date query parameter is required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id ?? FALLBACK_USER_ID

    const { data: entry, error } = await supabase
      .from("daily_journal")
      .select("morning_entry, evening_entry, entry_date")
      .eq("user_id", userId)
      .eq("entry_date", date)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: entry ?? null })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { entry_date, morning_entry, evening_entry } = body

    if (!entry_date) {
      return NextResponse.json({ error: "entry_date is required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id ?? FALLBACK_USER_ID

    const { data: entry, error } = await supabase
      .from("daily_journal")
      .upsert(
        {
          user_id: userId,
          entry_date,
          morning_entry: morning_entry ?? null,
          evening_entry: evening_entry ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entry_date" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
