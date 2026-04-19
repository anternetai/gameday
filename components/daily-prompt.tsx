"use client"

import { useState, useEffect } from "react"
import { Shuffle, Wand2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPromptForDate, getShufflePrompt } from "@/lib/prompts"

interface DailyPromptProps {
  date: string
  variant?: "default" | "focus"
}

export function DailyPrompt({ date, variant = "default" }: DailyPromptProps) {
  const [prompt, setPrompt] = useState<string>(() => getPromptForDate(date))
  const [personal, setPersonal] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrompt(getPromptForDate(date))
    setPersonal(null)
    setError(null)
  }, [date])

  function shuffle() {
    setPrompt(getShufflePrompt(prompt))
    setPersonal(null)
  }

  async function personalize() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/prompts/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed")
      setPersonal(data.prompt)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setLoading(false)
    }
  }

  const displayPrompt = personal ?? prompt
  const isPersonal = !!personal
  const isFocus = variant === "focus"

  return (
    <div
      className={cn(
        "rounded-xl transition-all",
        isFocus
          ? "border border-zinc-800/70 bg-zinc-900/30"
          : "border border-zinc-800 bg-zinc-900/50"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Wand2 className="w-3 h-3 text-amber-400/80" />
          <span>
            {isPersonal ? "Personal prompt" : "Today's prompt"}
          </span>
          {open ? (
            <ChevronUp className="w-3 h-3 text-zinc-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-zinc-600" />
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={shuffle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Shuffle prompt"
          >
            <Shuffle className="w-3 h-3" />
          </button>
          <button
            onClick={personalize}
            disabled={loading}
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors",
              "text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10",
              "disabled:opacity-60"
            )}
            title="Generate from your recent writing"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            Personal
          </button>
        </div>
      </div>

      {/* Prompt body */}
      {open && (
        <div className="px-4 pb-3.5 pt-0.5 flex flex-col gap-2">
          <p
            className={cn(
              "leading-relaxed text-zinc-200",
              isFocus ? "text-[15px] font-serif" : "text-sm"
            )}
          >
            {displayPrompt}
          </p>
          {error && (
            <p className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
