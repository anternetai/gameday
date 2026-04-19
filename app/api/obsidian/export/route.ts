import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const FALLBACK_USER_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

interface Seed {
  kind: "tweet" | "hook" | "script" | "question" | "insight"
  content: string
  source_snippet: string | null
  status: string
}

function buildMarkdown(params: {
  date: string
  morning: string | null
  evening: string | null
  seeds: Seed[]
}): string {
  const { date, morning, evening, seeds } = params
  const wordCount = [morning, evening]
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  const lines: string[] = []
  lines.push("---")
  lines.push(`date: ${date}`)
  lines.push(`source: gameday`)
  lines.push(`words: ${wordCount}`)
  lines.push(`seeds: ${seeds.length}`)
  lines.push(`tags: [journal, gameday]`)
  lines.push("---")
  lines.push("")
  lines.push(`# ${date}`)
  lines.push("")

  if (morning?.trim()) {
    lines.push("## Morning — Intentions")
    lines.push("")
    lines.push(morning.trim())
    lines.push("")
  }

  if (evening?.trim()) {
    lines.push("## Evening — Reflection")
    lines.push("")
    lines.push(evening.trim())
    lines.push("")
  }

  const active = seeds.filter((s) => s.status !== "discarded")
  if (active.length > 0) {
    lines.push("## Content Seeds")
    lines.push("")
    const byKind: Record<string, Seed[]> = {}
    for (const s of active) {
      byKind[s.kind] ??= []
      byKind[s.kind].push(s)
    }
    const order = ["insight", "tweet", "hook", "script", "question"]
    for (const kind of order) {
      const list = byKind[kind]
      if (!list || list.length === 0) continue
      lines.push(`### ${kind.charAt(0).toUpperCase() + kind.slice(1)}s`)
      lines.push("")
      for (const s of list) {
        lines.push(`- ${s.content.replace(/\n/g, "\n  ")}`)
        if (s.source_snippet) {
          lines.push(`  > ${s.source_snippet}`)
        }
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const format = searchParams.get("format") ?? "download"
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? FALLBACK_USER_ID

    const [{ data: entry }, { data: seeds }] = await Promise.all([
      supabase
        .from("daily_journal")
        .select("morning_entry, evening_entry")
        .eq("user_id", userId)
        .eq("entry_date", date)
        .maybeSingle(),
      supabase
        .from("content_seeds")
        .select("kind, content, source_snippet, status")
        .eq("user_id", userId)
        .eq("entry_date", date)
        .order("created_at", { ascending: true }),
    ])

    const markdown = buildMarkdown({
      date,
      morning: entry?.morning_entry ?? null,
      evening: entry?.evening_entry ?? null,
      seeds: (seeds ?? []) as Seed[],
    })

    if (format === "raw") {
      return NextResponse.json({ markdown, filename: `${date}.md` })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${date}.md"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
