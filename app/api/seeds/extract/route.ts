import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { chat } from "@/lib/llm"

const FALLBACK_USER_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

const SYSTEM_PROMPT = `You are reading a raw morning writing session from Anthony — a founder and content creator. He's working on two businesses (an AI lead-generation agency for home service contractors, and a pressure washing company) and wants to sharpen his thinking and ship short-form content: videos, scripts, tweets.

Your job: extract 3-6 distinct content seeds that are actually PRESENT in his writing — his original takes, framings, observations, and questions. You are NOT generating new content or giving advice. You are mining what's already there.

Each seed must be one of:
- "tweet": a tight standalone take, under 260 characters, punchy
- "hook": a short-form video opener (1-2 lines that stop the scroll)
- "script": a 3-5 beat opener for a short video (bullet-style beats, not a full script)
- "question": a provocative question he could post or explore deeper
- "insight": a condensed original insight worth remembering

Rules:
- Only extract seeds rooted in HIS specific lived experience, angle, or contrarian take. Skip generic wisdom anyone could say.
- Rewrite for punch and clarity, but preserve his voice and position. Do not soften or generalize.
- Skip to-dos, personal admin, and vent-only passages with no reusable angle.
- If a passage is rich, you can extract MORE THAN ONE seed from it in different kinds.
- source_snippet: the exact passage (max 30 words) from his writing that seeded this — quoted verbatim.

Return strict JSON, no prose outside the JSON, matching:
{
  "seeds": [
    { "kind": "tweet|hook|script|question|insight", "content": "...", "source_snippet": "..." }
  ]
}`

interface ExtractedSeed {
  kind: "tweet" | "hook" | "script" | "question" | "insight"
  content: string
  source_snippet: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entryDate = typeof body?.entry_date === "string" ? body.entry_date : null
    if (!entryDate) {
      return NextResponse.json(
        { error: "entry_date is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? FALLBACK_USER_ID

    const { data: entry, error: entryError } = await supabase
      .from("daily_journal")
      .select("morning_entry, evening_entry")
      .eq("user_id", userId)
      .eq("entry_date", entryDate)
      .maybeSingle()

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 })
    }

    const text = [entry?.morning_entry, entry?.evening_entry]
      .filter(Boolean)
      .join("\n\n---\n\n")
      .trim()

    if (text.length < 80) {
      return NextResponse.json(
        {
          error:
            "Not enough writing yet — try at least a few paragraphs before extracting seeds.",
        },
        { status: 400 }
      )
    }

    const raw = await chat({
      system: SYSTEM_PROMPT,
      user: `Here is today's writing (${entryDate}). Extract content seeds as specified.\n\n---\n\n${text}`,
      maxTokens: 2000,
      responseFormat: "json_object",
    })

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse seeds from model response" },
        { status: 502 }
      )
    }

    let parsed: { seeds?: ExtractedSeed[] }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { error: "Model response was not valid JSON" },
        { status: 502 }
      )
    }

    const seeds = (parsed.seeds ?? []).filter(
      (s): s is ExtractedSeed =>
        !!s &&
        typeof s.content === "string" &&
        s.content.trim().length > 0 &&
        ["tweet", "hook", "script", "question", "insight"].includes(s.kind)
    )

    if (seeds.length === 0) {
      return NextResponse.json({ seeds: [] })
    }

    const rows = seeds.map((s) => ({
      user_id: userId,
      entry_date: entryDate,
      kind: s.kind,
      content: s.content.trim(),
      source_snippet: s.source_snippet?.slice(0, 500) ?? null,
      status: "new",
    }))

    const { data: inserted, error: insertError } = await supabase
      .from("content_seeds")
      .insert(rows)
      .select()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ seeds: inserted ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
