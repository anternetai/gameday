import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const USER_ID = "anthony"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch the task first so we can reclaim XP if it was completed
    const { data: task, error: fetchError } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("daily_tasks")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Reclaim XP from user_stats if the task was completed
    if (task.completed) {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("total_xp")
        .eq("user_id", USER_ID)
        .single()

      if (stats) {
        await supabase
          .from("user_stats")
          .update({
            total_xp: Math.max(0, (stats.total_xp ?? 0) - task.xp_value),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", USER_ID)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Only allow these fields to be updated via this route
    const allowedFields = [
      "title",
      "category",
      "scheduled_time",
      "notes",
      "sort_order",
    ]
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: task, error } = await supabase
      .from("daily_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
