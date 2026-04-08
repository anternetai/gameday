import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PATCH /api/tasks/reorder — bulk update sort_order
// Body: { taskIds: string[] } — ordered array of task IDs (0-based index becomes sort_order)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { taskIds } = body as { taskIds: string[] }

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds (non-empty array) is required" },
        { status: 400 }
      )
    }

    // Update sort_order for each task based on its index in the array
    const updates = taskIds.map((id: string, index: number) =>
      supabase
        .from("daily_tasks")
        .update({ sort_order: index })
        .eq("id", id)
    )

    const results = await Promise.all(updates)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) {
      return NextResponse.json(
        { error: firstError.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
