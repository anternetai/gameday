"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TaskSuggestion {
  title: string
  category: "HFH" | "SQUEEGEE" | "PERSONAL" | "CADENCE"
  xp_value: number
}

interface ContextData {
  morning_prompt: string
  evening_prompt: string
  task_suggestions: TaskSuggestion[]
  fetched_at: string
}

interface ContextResponse {
  context: ContextData
  cached: boolean
  fetched_at: string
}

// ─── Category badge colours ────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  HFH: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  SQUEEGEE: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  PERSONAL: "bg-zinc-500/15 text-zinc-300 border-zinc-600/20",
  CADENCE: "bg-orange-500/15 text-orange-300 border-orange-500/20",
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ContextPanelProps {
  /** YYYY-MM-DD — controls which context to load and which date to assign added tasks */
  date: string
  /** Called after a task suggestion is successfully added */
  onTaskAdded?: () => void
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ContextPanel({ date, onTaskAdded }: ContextPanelProps) {
  const [context, setContext] = useState<ContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [addingTask, setAddingTask] = useState<string | null>(null) // track which task is being added
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // ── Fetch context ────────────────────────────────────────────────────────────
  const fetchContext = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        let res: Response

        if (forceRefresh) {
          res = await fetch("/api/context/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date }),
          })
        } else {
          res = await fetch(`/api/context/today?date=${date}`)
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data: ContextResponse = await res.json()
        setContext(data.context)
        // Reset added-task tracking when context changes
        setAddedTasks(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load context")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [date]
  )

  useEffect(() => {
    fetchContext(false)
  }, [fetchContext])

  // ── Add suggestion as task ───────────────────────────────────────────────────
  async function handleAddTask(suggestion: TaskSuggestion) {
    const key = suggestion.title
    if (addedTasks.has(key) || addingTask === key) return

    setAddingTask(key)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          category: suggestion.category,
          xp_value: suggestion.xp_value,
          task_date: date,
          source: "context_engine",
        }),
      })

      if (res.ok) {
        setAddedTasks((prev) => new Set([...prev, key]))
        onTaskAdded?.()
      }
    } catch {
      // Silent — button just stays available to retry
    } finally {
      setAddingTask(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Empty state — no error, just nothing returned
  if (!loading && !error && !context) return null

  return (
    <div
      className={cn(
        "rounded-xl border border-orange-500/10",
        "bg-gradient-to-r from-orange-500/5 to-violet-500/5",
        "transition-all duration-200"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span>AI Morning Brief</span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        <button
          onClick={() => fetchContext(true)}
          disabled={refreshing || loading}
          className={cn(
            "flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/50",
            (refreshing || loading) && "opacity-40 pointer-events-none"
          )}
          title="Refresh context"
        >
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Body (collapsible) ───────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-2">
              <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-full" />
              <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-4/5" />
              <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-2/3" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <p className="text-xs text-zinc-500 italic">
              Context unavailable — {error}
            </p>
          )}

          {/* Content */}
          {!loading && context && (
            <>
              {/* Morning prompt */}
              {context.morning_prompt && (
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {context.morning_prompt}
                </p>
              )}

              {/* Suggested tasks */}
              {context.task_suggestions && context.task_suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                    Suggested tasks
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {context.task_suggestions.map((suggestion) => {
                      const key = suggestion.title
                      const isAdded = addedTasks.has(key)
                      const isAdding = addingTask === key

                      return (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-2 group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Category badge */}
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0",
                                CATEGORY_STYLES[suggestion.category] ??
                                  CATEGORY_STYLES.PERSONAL
                              )}
                            >
                              {suggestion.category}
                            </span>
                            {/* Task title */}
                            <span className="text-sm text-zinc-300 truncate">
                              {suggestion.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* XP value */}
                            <span className="text-[11px] text-orange-400/70 tabular-nums">
                              +{suggestion.xp_value} XP
                            </span>

                            {/* Add button */}
                            <button
                              onClick={() => handleAddTask(suggestion)}
                              disabled={isAdded || isAdding}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                                isAdded
                                  ? "bg-green-500/20 text-green-400 cursor-default"
                                  : "bg-zinc-700/50 text-zinc-400 hover:bg-orange-500/20 hover:text-orange-300",
                                isAdding && "opacity-60 pointer-events-none"
                              )}
                              title={isAdded ? "Added" : "Add to today"}
                            >
                              {isAdding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isAdded ? (
                                <span className="text-[10px] font-bold">✓</span>
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Fetched-at timestamp */}
              {context.fetched_at && (
                <p className="text-[10px] text-zinc-600">
                  Updated{" "}
                  {new Date(context.fetched_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
