"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Sun, Moon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface JournalPanelProps {
  date: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function JournalPanel({ date }: JournalPanelProps) {
  const [morning, setMorning] = useState("")
  const [evening, setEvening] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const lastSaved = useRef({ morning: "", evening: "" })

  // Load entry when date changes
  useEffect(() => {
    setLoaded(false)
    setMorning("")
    setEvening("")
    lastSaved.current = { morning: "", evening: "" }

    fetch(`/api/journal?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entry) {
          const m = data.entry.morning_entry ?? ""
          const e = data.entry.evening_entry ?? ""
          setMorning(m)
          setEvening(e)
          lastSaved.current = { morning: m, evening: e }
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [date])

  const debouncedMorning = useDebounce(morning, 800)
  const debouncedEvening = useDebounce(evening, 800)

  const save = useCallback(
    async (m: string, e: string) => {
      if (!loaded) return
      if (m === lastSaved.current.morning && e === lastSaved.current.evening)
        return

      setSaving(true)
      try {
        await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry_date: date,
            morning_entry: m || null,
            evening_entry: e || null,
          }),
        })
        lastSaved.current = { morning: m, evening: e }
        setSavedAt(Date.now())
      } catch {
        // silent fail
      } finally {
        setSaving(false)
      }
    },
    [date, loaded]
  )

  // Auto-save on debounced changes
  useEffect(() => {
    if (!loaded) return
    save(debouncedMorning, debouncedEvening)
  }, [debouncedMorning, debouncedEvening, save, loaded])

  const hour = new Date().getHours()
  const isEvening = hour >= 17

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Journal</h2>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          {saving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving…</span>
            </>
          ) : savedAt ? (
            <span className="text-zinc-700">Saved</span>
          ) : null}
        </div>
      </div>

      {/* Morning prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          <Sun className="w-3 h-3 text-orange-400" />
          What needs to happen today?
        </label>
        <textarea
          value={morning}
          onChange={(e) => setMorning(e.target.value)}
          placeholder="Set your intentions…"
          rows={3}
          disabled={!loaded}
          className={cn(
            "w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5",
            "text-sm text-zinc-100 placeholder:text-zinc-700 outline-none",
            "focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/10",
            "transition-all duration-200 leading-relaxed",
            !loaded && "opacity-50",
            isEvening && "border-zinc-800/50"
          )}
        />
      </div>

      {/* Evening prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          <Moon className="w-3 h-3 text-violet-400" />
          How did today go?
        </label>
        <textarea
          value={evening}
          onChange={(e) => setEvening(e.target.value)}
          placeholder="Reflect on your day…"
          rows={3}
          disabled={!loaded}
          className={cn(
            "w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5",
            "text-sm text-zinc-100 placeholder:text-zinc-700 outline-none",
            "focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10",
            "transition-all duration-200 leading-relaxed",
            !loaded && "opacity-50",
            !isEvening && "border-zinc-800/50"
          )}
        />
      </div>
    </div>
  )
}
