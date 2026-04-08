// lib/context/crm.ts
// Queries Dr. Squeegee CRM data from Supabase for daily context.

import { createClient } from "@/lib/supabase/server"

export interface CrmContext {
  todayJobs: Record<string, unknown>[]
  pendingQuotes: Record<string, unknown>[]
  recentActivity: Record<string, unknown>[]
}

export async function getCrmContext(date: string): Promise<CrmContext> {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return { todayJobs: [], pendingQuotes: [], recentActivity: [] }
  }

  const [jobsResult, quotesResult, activityResult] = await Promise.allSettled([
    supabase
      .from("squeegee_jobs")
      .select("*")
      .eq("appointment_date", date),

    supabase
      .from("squeegee_quotes")
      .select("*")
      .eq("status", "sent"),

    supabase
      .from("squeegee_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const todayJobs =
    jobsResult.status === "fulfilled" && !jobsResult.value.error
      ? (jobsResult.value.data ?? [])
      : []

  const pendingQuotes =
    quotesResult.status === "fulfilled" && !quotesResult.value.error
      ? (quotesResult.value.data ?? [])
      : []

  const recentActivity =
    activityResult.status === "fulfilled" && !activityResult.value.error
      ? (activityResult.value.data ?? [])
      : []

  return { todayJobs, pendingQuotes, recentActivity }
}
