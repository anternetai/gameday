// app/api/context/today/route.ts
// GET /api/context/today?date=YYYY-MM-DD
// Returns cached context if fresh (<4h), otherwise builds fresh.

import { NextRequest, NextResponse } from "next/server"
import {
  buildDailyContext,
  getCachedContext,
  isCacheStale,
} from "@/lib/context/engine"

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") ?? getTodayET()

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      )
    }

    // Check cache
    const cached = await getCachedContext(date)

    if (cached && cached.fetched_at && !isCacheStale(cached.fetched_at, 4)) {
      return NextResponse.json({
        context: cached,
        cached: true,
        fetched_at: cached.fetched_at,
      })
    }

    // Build fresh context
    const context = await buildDailyContext(date)

    return NextResponse.json({
      context,
      cached: false,
      fetched_at: context.fetched_at,
    })
  } catch (err) {
    console.error("[api/context/today] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
