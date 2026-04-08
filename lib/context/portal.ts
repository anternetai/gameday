// lib/context/portal.ts
// Queries HomeField Hub portal data from Supabase for daily context.

import { createClient } from "@/lib/supabase/server"

export interface PortalContext {
  pipeline: Record<string, number>
  recentLeads: Record<string, unknown>[]
  upcomingDemos: Record<string, unknown>[]
}

export async function getPortalContext(): Promise<PortalContext> {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return { pipeline: {}, recentLeads: [], upcomingDemos: [] }
  }

  const [pipelineResult, leadsResult, demosResult] = await Promise.allSettled([
    supabase
      .from("agency_clients")
      .select("stage")
      .is("deleted_at", null),

    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("dialer_leads")
      .select("*")
      .eq("demo_booked", true)
      .gte("demo_date", new Date().toISOString().split("T")[0])
      .limit(5),
  ])

  // Aggregate pipeline counts by stage
  const pipeline: Record<string, number> = {}
  if (pipelineResult.status === "fulfilled" && !pipelineResult.value.error) {
    for (const row of pipelineResult.value.data ?? []) {
      const stage = String(row.stage ?? "unknown")
      pipeline[stage] = (pipeline[stage] ?? 0) + 1
    }
  }

  const recentLeads =
    leadsResult.status === "fulfilled" && !leadsResult.value.error
      ? (leadsResult.value.data ?? [])
      : []

  const upcomingDemos =
    demosResult.status === "fulfilled" && !demosResult.value.error
      ? (demosResult.value.data ?? [])
      : []

  return { pipeline, recentLeads, upcomingDemos }
}
