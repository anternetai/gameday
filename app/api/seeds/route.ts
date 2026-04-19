import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const FALLBACK_USER_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const status = searchParams.get("status")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? FALLBACK_USER_ID

    let query = supabase
      .from("content_seeds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (date) query = query.eq("entry_date", date)
    if (status) query = query.eq("status", status)

    const { data, error } = await query.limit(200)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ seeds: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body ?? {}
    if (typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }
    if (!["new", "saved", "used", "discarded"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 })
    }

    const supabase = await createClient()
    const patch: { status: string; used_at?: string } = { status }
    if (status === "used") patch.used_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("content_seeds")
      .update(patch)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ seed: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
