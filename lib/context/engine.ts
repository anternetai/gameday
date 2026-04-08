// lib/context/engine.ts
// Orchestrates all context sources, synthesizes via Gemini, caches in Supabase.

import { createClient } from "@/lib/supabase/server"
import { getCrmContext } from "./crm"
import { getPortalContext } from "./portal"
import { getSlackContext } from "./slack"
import { getGmailContext } from "./gmail"
import { getObsidianContext } from "./obsidian"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TaskSuggestion {
  title: string
  category: "HFH" | "SQUEEGEE" | "PERSONAL" | "CADENCE"
  xp_value: number
}

export interface DailyContextResult {
  morning_prompt: string
  evening_prompt: string
  task_suggestions: TaskSuggestion[]
  crm_jobs: unknown
  portal_updates: unknown
  slack_summary: unknown
  email_summary: unknown
  obsidian_notes: string | null
  fetched_at: string
}

// ─── Gemini synthesis ──────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash-lite"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function buildGeminiPrompt(contextData: Record<string, unknown>): string {
  return `You are a daily planning assistant for Anthony, a solopreneur who runs:
- Dr. Squeegee (pressure washing company in Charlotte, NC)
- HomeField Hub (AI lead generation agency)
- Cadence (AI sales coaching app, in development)

Based on today's context, generate:
1. A morning briefing (2-3 sentences summarizing what's on his plate today)
2. 3-5 suggested tasks based on what needs attention
3. An evening journal prompt that references specific things from the day

Today's context:
${JSON.stringify(contextData, null, 2)}

Respond ONLY with valid JSON — no markdown, no code fences, no explanation outside the JSON:
{
  "morning_prompt": "...",
  "task_suggestions": [{ "title": "...", "category": "HFH|SQUEEGEE|PERSONAL|CADENCE", "xp_value": 25 }],
  "evening_prompt": "..."
}`
}

interface GeminiSynthesis {
  morning_prompt: string
  task_suggestions: TaskSuggestion[]
  evening_prompt: string
}

async function callGemini(contextData: Record<string, unknown>): Promise<GeminiSynthesis | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildGeminiPrompt(contextData) }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("[context/engine] Gemini API error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    if (!rawText) return null

    // Strip markdown code fences if Gemini wraps its JSON.
    // Trim first so leading/trailing newlines don't block the regex.
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()

    const parsed = JSON.parse(cleaned) as GeminiSynthesis

    // Validate shape
    if (
      typeof parsed.morning_prompt !== "string" ||
      typeof parsed.evening_prompt !== "string" ||
      !Array.isArray(parsed.task_suggestions)
    ) {
      return null
    }

    return parsed
  } catch (err) {
    console.error("[context/engine] Gemini parse error:", err)
    return null
  }
}

// ─── Fallback prompts (used when Gemini is unavailable) ────────────────────────

function buildFallbackSynthesis(contextData: Record<string, unknown>): GeminiSynthesis {
  const crmJobs = (contextData.crm as { todayJobs?: unknown[] })?.todayJobs ?? []
  const jobCount = Array.isArray(crmJobs) ? crmJobs.length : 0

  return {
    morning_prompt: jobCount > 0
      ? `You have ${jobCount} Dr. Squeegee job${jobCount !== 1 ? "s" : ""} scheduled today. Check your pipeline and stay on top of follow-ups.`
      : "No jobs scheduled today — good day to focus on HomeField Hub pipeline and outreach.",
    task_suggestions: [
      { title: "Review Dr. Squeegee pipeline", category: "SQUEEGEE", xp_value: 15 },
      { title: "Check HomeField Hub lead inbox", category: "HFH", xp_value: 20 },
      { title: "Daily review + plan tomorrow", category: "PERSONAL", xp_value: 10 },
    ],
    evening_prompt: "What was the one thing you did today that moved the needle? What will you do differently tomorrow?",
  }
}

// ─── Main orchestrator ─────────────────────────────────────────────────────────

export async function buildDailyContext(date: string): Promise<DailyContextResult> {
  // 1. Fetch all sources in parallel
  const [crm, portal, slack, gmail, obsidian] = await Promise.all([
    getCrmContext(date),
    getPortalContext(),
    getSlackContext(),
    getGmailContext(),
    getObsidianContext(date),
  ])

  // 2. Bundle context data for Gemini
  const contextData: Record<string, unknown> = {
    date,
    crm,
    portal,
    slack,
    gmail,
    obsidian_notes: obsidian.dailyNote,
  }

  // 3. Synthesize with Gemini (fall back gracefully)
  const gemini = (await callGemini(contextData)) ?? buildFallbackSynthesis(contextData)

  const result: DailyContextResult = {
    morning_prompt: gemini.morning_prompt,
    evening_prompt: gemini.evening_prompt,
    task_suggestions: gemini.task_suggestions,
    crm_jobs: crm,
    portal_updates: portal,
    slack_summary: slack,
    email_summary: gmail,
    obsidian_notes: obsidian.dailyNote,
    fetched_at: new Date().toISOString(),
  }

  // 4. Cache in Supabase (upsert — don't crash if it fails)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.from("daily_context").upsert(
        {
          user_id: user.id,
          context_date: date,
          calendar_events: null, // not wired yet
          crm_jobs: crm,
          portal_updates: portal,
          email_summary: gmail,
          slack_summary: slack,
          obsidian_notes: obsidian.dailyNote,
          ai_morning_prompt: gemini.morning_prompt,
          ai_evening_prompt: gemini.evening_prompt,
          ai_task_suggestions: gemini.task_suggestions,
          fetched_at: result.fetched_at,
        },
        { onConflict: "user_id,context_date" }
      )
    }
  } catch (err) {
    // Cache failure is non-fatal — return result anyway
    console.error("[context/engine] Cache write failed:", err)
  }

  return result
}

// ─── Cache reader ──────────────────────────────────────────────────────────────

export async function getCachedContext(
  date: string
): Promise<DailyContextResult | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from("daily_context")
      .select("*")
      .eq("user_id", user.id)
      .eq("context_date", date)
      .single()

    if (error || !data) return null

    return {
      morning_prompt: data.ai_morning_prompt ?? "",
      evening_prompt: data.ai_evening_prompt ?? "",
      task_suggestions: (data.ai_task_suggestions as TaskSuggestion[]) ?? [],
      crm_jobs: data.crm_jobs,
      portal_updates: data.portal_updates,
      slack_summary: data.slack_summary,
      email_summary: data.email_summary,
      obsidian_notes: data.obsidian_notes,
      fetched_at: data.fetched_at,
    }
  } catch {
    return null
  }
}

// ─── Cache age check ───────────────────────────────────────────────────────────

export function isCacheStale(fetchedAt: string, maxAgeHours = 4): boolean {
  const fetched = new Date(fetchedAt).getTime()
  const ageMs = Date.now() - fetched
  return ageMs > maxAgeHours * 60 * 60 * 1000
}
