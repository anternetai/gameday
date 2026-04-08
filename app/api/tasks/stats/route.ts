import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const USER_ID = "anthony"

export async function GET() {
  try {
    const supabase = await createClient()

    // Build last 7 days date strings in ET (oldest → newest)
    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(
        d.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
      )
    }

    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    // Fetch all tasks for the last 7 days in one query
    const { data: tasks, error: tasksError } = await supabase
      .from("daily_tasks")
      .select("task_date, completed, xp_value")
      .gte("task_date", startDate)
      .lte("task_date", endDate)

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    // Aggregate by date
    const byDate: Record<
      string,
      { total: number; completed: number; xp: number }
    > = {}
    for (const d of dates) {
      byDate[d] = { total: 0, completed: 0, xp: 0 }
    }

    let weeklyTotal = 0
    let weeklyCompleted = 0
    let weeklyXp = 0

    for (const task of tasks ?? []) {
      const d = task.task_date as string
      if (!byDate[d]) continue

      byDate[d].total += 1
      weeklyTotal += 1

      if (task.completed) {
        byDate[d].completed += 1
        byDate[d].xp += task.xp_value ?? 0
        weeklyCompleted += 1
        weeklyXp += task.xp_value ?? 0
      }
    }

    // Fetch user_stats
    const { data: userStats } = await supabase
      .from("user_stats")
      .select("total_xp, current_streak, longest_streak, last_completed_date")
      .eq("user_id", USER_ID)
      .single()

    return NextResponse.json({
      stats: userStats ?? {
        total_xp: 0,
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
      },
      weekly: {
        completed: weeklyCompleted,
        total: weeklyTotal,
        xp: weeklyXp,
        byDate,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
