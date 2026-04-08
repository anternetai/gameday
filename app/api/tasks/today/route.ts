import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const today = dateParam ?? new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    })

    // Fetch today's tasks
    const { data: tasks, error } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("task_date", today)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("scheduled_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-seed from task_templates if no tasks exist for today
    if (!tasks || tasks.length === 0) {
      try {
        const dayOfWeek = new Date(today + "T12:00:00").getDay() // 0=Sun ... 6=Sat

        const { data: templates, error: templatesError } = await supabase
          .from("task_templates")
          .select("*")
          .eq("active", true)

        // If table doesn't exist, just return empty
        if (templatesError) {
          if (
            templatesError.code === "42P01" ||
            templatesError.message?.includes("does not exist")
          ) {
            return NextResponse.json({ tasks: [] })
          }
          return NextResponse.json(
            { error: templatesError.message },
            { status: 500 }
          )
        }

        if (templates && templates.length > 0) {
          const matchingTemplates = templates.filter((t) => {
            const days: number[] = t.days_of_week ?? []
            return days.includes(dayOfWeek)
          })

          if (matchingTemplates.length > 0) {
            const newTasks = matchingTemplates.map((t, index) => ({
              task_date: today,
              title: t.title,
              category: t.category ?? "DAILY",
              scheduled_time: t.scheduled_time ?? null,
              xp_value: t.xp_value ?? 25,
              completed: false,
              completed_at: null,
              sort_order: index,
              source: "template",
              source_id: t.id,
              notes: t.notes ?? null,
            }))

            const { data: inserted, error: insertError } = await supabase
              .from("daily_tasks")
              .insert(newTasks)
              .select()

            if (insertError) {
              return NextResponse.json(
                { error: insertError.message },
                { status: 500 }
              )
            }

            return NextResponse.json({ tasks: inserted ?? [] })
          }
        }
      } catch {
        // task_templates table may not exist yet — return empty gracefully
      }

      return NextResponse.json({ tasks: [] })
    }

    return NextResponse.json({ tasks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
