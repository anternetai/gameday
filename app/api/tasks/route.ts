import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { title, category, scheduled_time, xp_value, task_date } = body

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    })

    // Determine the max sort_order for the target date so new tasks appear at the end
    const targetDate = task_date ?? today
    const { data: existingTasks } = await supabase
      .from("daily_tasks")
      .select("sort_order")
      .eq("task_date", targetDate)
      .order("sort_order", { ascending: false, nullsFirst: false })
      .limit(1)

    const nextSortOrder =
      existingTasks && existingTasks.length > 0 && existingTasks[0].sort_order != null
        ? existingTasks[0].sort_order + 1
        : 0

    const newTask = {
      task_date: targetDate,
      title: title.trim(),
      category: category ?? "PERSONAL",
      scheduled_time: scheduled_time ?? null,
      xp_value: typeof xp_value === "number" ? xp_value : 25,
      completed: false,
      completed_at: null,
      sort_order: nextSortOrder,
      source: "manual",
      source_id: null,
      notes: null,
    }

    const { data: task, error } = await supabase
      .from("daily_tasks")
      .insert(newTask)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
