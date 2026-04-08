// app/api/context/refresh/route.ts
// POST /api/context/refresh
// Force-refreshes today's context, ignoring any cached version.

import { NextRequest, NextResponse } from "next/server"
import { buildDailyContext } from "@/lib/context/engine"

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  })
}

export async function POST(request: NextRequest) {
  try {
    // Allow caller to specify a date, default to today ET
    let date = getTodayET()
    try {
      const body = await request.json()
      if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        date = body.date
      }
    } catch {
      // No body or invalid JSON — use today
    }

    const context = await buildDailyContext(date)

    return NextResponse.json({
      context,
      cached: false,
      fetched_at: context.fetched_at,
    })
  } catch (err) {
    console.error("[api/context/refresh] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
