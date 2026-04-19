import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAnthropic, HAIKU_MODEL } from "@/lib/anthropic"

const FALLBACK_USER_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

const SYSTEM_PROMPT = `You generate a single thought-provoking writing prompt for Anthony, a founder running an AI lead-gen agency and a pressure washing business, who is trying to sharpen his thinking and produce original content (videos, scripts, tweets).

A great prompt:
- Is specific, not generic. Not "what did you learn today." More like "what did a customer say this week that you couldn't fully answer?"
- Forces him to look at HIS actual week, not generic wisdom.
- Creates a tension or contradiction worth exploring.
- Can be answered in 15-45 minutes of honest writing.
- Is one sentence, possibly with a tight follow-up.
- Never feels like a self-help cliché.

If yesterday's entry or recent context is provided, mine it for a thread he left dangling, a contradiction, or an unexamined assumption — and turn that into today's prompt. Do not echo his words back; deepen them.

Return ONLY the prompt itself. No preamble, no quotes, no explanation.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const date = typeof body?.date === "string" ? body.date : null

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? FALLBACK_USER_ID

    let yesterdayDate: string | null = null
    if (date) {
      const d = new Date(date + "T12:00:00")
      d.setDate(d.getDate() - 1)
      yesterdayDate = d.toISOString().split("T")[0]
    }

    const { data: recent } = await supabase
      .from("daily_journal")
      .select("entry_date, morning_entry, evening_entry")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .limit(3)

    const yesterday = recent?.find((r) => r.entry_date === yesterdayDate)
    const mostRecent = recent?.[0]
    const seed = yesterday ?? mostRecent

    const context = seed
      ? `\n\nRecent entry (${seed.entry_date}):\n${[
          seed.morning_entry,
          seed.evening_entry,
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 4000)}`
      : ""

    const anthropic = getAnthropic()
    const completion = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate today's prompt.${context || "\n\n(No recent entries to mine — pick something sharp and specific to a founder/creator's week.)"}`,
        },
      ],
    })

    const text = completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^["'\u201C\u201D]|["'\u201C\u201D]$/g, "")

    if (!text) {
      return NextResponse.json(
        { error: "No prompt generated" },
        { status: 502 }
      )
    }

    return NextResponse.json({ prompt: text, source: seed ? "personal" : "fallback" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
