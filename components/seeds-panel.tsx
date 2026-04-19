"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  Copy,
  Check,
  Archive,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Seed {
  id: string
  entry_date: string
  kind: "tweet" | "hook" | "script" | "question" | "insight"
  content: string
  source_snippet: string | null
  status: "new" | "saved" | "used" | "discarded"
  created_at: string
}

interface SeedsPanelProps {
  date: string
}

const KIND_META: Record<
  Seed["kind"],
  { label: string; accent: string; dot: string }
> = {
  tweet: {
    label: "Tweet",
    accent: "text-sky-300 border-sky-500/20 bg-sky-500/5",
    dot: "bg-sky-400",
  },
  hook: {
    label: "Hook",
    accent: "text-orange-300 border-orange-500/20 bg-orange-500/5",
    dot: "bg-orange-400",
  },
  script: {
    label: "Script",
    accent: "text-violet-300 border-violet-500/20 bg-violet-500/5",
    dot: "bg-violet-400",
  },
  question: {
    label: "Question",
    accent: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    dot: "bg-emerald-400",
  },
  insight: {
    label: "Insight",
    accent: "text-amber-300 border-amber-500/20 bg-amber-500/5",
    dot: "bg-amber-400",
  },
}

export function SeedsPanel({ date }: SeedsPanelProps) {
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchSeeds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/seeds?date=${date}`)
      const data = await res.json()
      const filtered = (data.seeds ?? []).filter(
        (s: Seed) => s.status !== "discarded"
      )
      setSeeds(filtered)
    } catch {
      setSeeds([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchSeeds()
  }, [fetchSeeds])

  async function extract() {
    setExtracting(true)
    setError(null)
    try {
      const res = await fetch("/api/seeds/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: date }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "Extraction failed")
      } else {
        await fetchSeeds()
      }
    } catch {
      setError("Extraction failed")
    } finally {
      setExtracting(false)
    }
  }

  async function updateStatus(id: string, status: Seed["status"]) {
    setSeeds((prev) =>
      status === "discarded"
        ? prev.filter((s) => s.id !== id)
        : prev.map((s) => (s.id === id ? { ...s, status } : s))
    )
    try {
      await fetch("/api/seeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
    } catch {
      fetchSeeds()
    }
  }

  async function copySeed(seed: Seed) {
    try {
      await navigator.clipboard.writeText(seed.content)
      setCopiedId(seed.id)
      setTimeout(() => setCopiedId((id) => (id === seed.id ? null : id)), 1500)
      if (seed.status === "new") {
        updateStatus(seed.id, "saved")
      }
    } catch {
      /* clipboard blocked */
    }
  }

  const hasSeeds = seeds.length > 0
  const isEmpty = !loading && !hasSeeds

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-300">
            Content Seeds
          </h2>
          {hasSeeds && (
            <span className="text-[11px] text-zinc-600 ml-1">
              {seeds.length}
            </span>
          )}
        </div>
        <button
          onClick={extract}
          disabled={extracting}
          className={cn(
            "flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors",
            "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {extracting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Extracting…
            </>
          ) : hasSeeds ? (
            <>
              <RefreshCw className="w-3 h-3" />
              Re-extract
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Extract
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {isEmpty && !error && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          Write a few paragraphs above, then hit <span className="text-zinc-400 font-medium">Extract</span> to mine tweets, hooks, and script ideas from your entry.
        </p>
      )}

      {/* Seeds list */}
      {hasSeeds && (
        <div className="flex flex-col gap-2">
          {seeds.map((seed) => {
            const meta = KIND_META[seed.kind]
            return (
              <div
                key={seed.id}
                className={cn(
                  "group rounded-lg border p-3 flex flex-col gap-2 transition-colors",
                  "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border",
                      meta.accent
                    )}
                  >
                    <span
                      className={cn("w-1 h-1 rounded-full", meta.dot)}
                    />
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copySeed(seed)}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Copy"
                    >
                      {copiedId === seed.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => updateStatus(seed.id, "discarded")}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                      title="Discard"
                    >
                      <Archive className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {seed.content}
                </p>
                {seed.source_snippet && (
                  <p className="text-[11px] text-zinc-600 italic border-l-2 border-zinc-800 pl-2 leading-relaxed">
                    &ldquo;{seed.source_snippet}&rdquo;
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
