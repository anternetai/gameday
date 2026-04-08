import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const USER_ID = "anthony"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { completed } = body
    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed (boolean) is required" },
        { status: 400 }
      )
    }

    // Fetch the current task to get XP and current state
    const { data: currentTask, error: fetchError } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Update the task
    const { data: task, error: updateError } = await supabase
      .from("daily_tasks")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update user_stats: adjust XP
    const xpDelta = completed ? currentTask.xp_value : -currentTask.xp_value

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    })

    // Fetch current user_stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", USER_ID)
      .single()

    if (stats) {
      const newTotalXp = Math.max(0, (stats.total_xp ?? 0) + xpDelta)

      // Streak logic: only update when completing (not uncompleting)
      let newStreak = stats.current_streak ?? 0
      let newLongest = stats.longest_streak ?? 0

      if (completed) {
        const lastDate = stats.last_completed_date
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
          timeZone: "America/New_York",
        })

        if (!lastDate || lastDate === yesterdayStr || lastDate === today) {
          if (lastDate !== today) {
            newStreak = (stats.current_streak ?? 0) + 1
          }
        } else {
          newStreak = 1
        }
        newLongest = Math.max(newStreak, stats.longest_streak ?? 0)
      }

      await supabase
        .from("user_stats")
        .update({
          total_xp: newTotalXp,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_completed_date: completed ? today : stats.last_completed_date,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", USER_ID)
    } else {
      // Upsert: create stats row for first time
      await supabase.from("user_stats").upsert({
        user_id: USER_ID,
        total_xp: Math.max(0, xpDelta),
        current_streak: completed ? 1 : 0,
        longest_streak: completed ? 1 : 0,
        last_completed_date: completed ? today : null,
        updated_at: new Date().toISOString(),
      })
    }

    // Check if all tasks for the task's date are complete
    const taskDate = currentTask.task_date ?? today
    const { data: todayTasks } = await supabase
      .from("daily_tasks")
      .select("completed")
      .eq("task_date", taskDate)

    const allComplete =
      Array.isArray(todayTasks) &&
      todayTasks.length > 0 &&
      todayTasks.every((t) => t.completed === true)

    return NextResponse.json({ task, allComplete })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
