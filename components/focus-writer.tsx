"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Play, Pause, RotateCcw, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DailyPrompt } from "@/components/daily-prompt"
import { VoiceInput } from "@/components/voice-input"

interface FocusWriterProps {
  date: string
}

const PRESETS = [30, 45, 60] as const

type TimerState =
  | { kind: "idle" }
  | { kind: "running"; endsAt: number; totalSec: number; remainingSec: number }
  | { kind: "paused"; remainingSec: number; totalSec: number }
  | { kind: "done"; totalSec: number }

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
}

function wordCount(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function FocusWriter({ date }: FocusWriterProps) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const lastSaved = useRef<string>("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [timer, setTimer] = useState<TimerState>({ kind: "idle" })
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [eveningText, setEveningText] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/journal?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entry) {
          const m = data.entry.morning_entry ?? ""
          setText(m)
          lastSaved.current = m
          setEveningText(data.entry.evening_entry ?? null)
        }
        setLoaded(true)
        setTimeout(() => textareaRef.current?.focus(), 50)
      })
      .catch(() => setLoaded(true))
  }, [date])

  const debouncedText = useDebounce(text, 1200)

  const save = useCallback(
    async (value: string) => {
      if (!loaded) return
      if (value === lastSaved.current) return
      setSaving(true)
      try {
        await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry_date: date,
            morning_entry: value || null,
            evening_entry: eveningText,
          }),
        })
        lastSaved.current = value
        setSavedAt(Date.now())
      } catch {
        /* noop */
      } finally {
        setSaving(false)
      }
    },
    [date, loaded, eveningText]
  )

  useEffect(() => {
    if (!loaded) return
    save(debouncedText)
  }, [debouncedText, save, loaded])

  useEffect(() => {
    if (timer.kind !== "running") return
    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev.kind !== "running") return prev
        const remaining = Math.max(
          0,
          Math.round((prev.endsAt - Date.now()) / 1000)
        )
        if (remaining <= 0) {
          return { kind: "done", totalSec: prev.totalSec }
        }
        return { ...prev, remainingSec: remaining }
      })
    }, 500)
    return () => clearInterval(id)
  }, [timer.kind])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (timer.kind === "running") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [timer.kind])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement
        if (target.tagName === "TEXTAREA") return
        handleExit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.kind])

  function enterBrowserFullscreen() {
    const el = document.documentElement
    if (
      !document.fullscreenElement &&
      typeof el.requestFullscreen === "function"
    ) {
      el.requestFullscreen().catch(() => {
        /* user denied or unsupported — fixed inset-0 still covers viewport */
      })
    }
  }

  function startTimer(minutes: number) {
    const totalSec = minutes * 60
    setTimer({
      kind: "running",
      endsAt: Date.now() + totalSec * 1000,
      totalSec,
      remainingSec: totalSec,
    })
    enterBrowserFullscreen()
    textareaRef.current?.focus()
  }

  function pauseTimer() {
    setTimer((prev) => {
      if (prev.kind !== "running") return prev
      return {
        kind: "paused",
        remainingSec: prev.remainingSec,
        totalSec: prev.totalSec,
      }
    })
  }

  function resumeTimer() {
    setTimer((prev) => {
      if (prev.kind !== "paused") return prev
      return {
        kind: "running",
        endsAt: Date.now() + prev.remainingSec * 1000,
        totalSec: prev.totalSec,
        remainingSec: prev.remainingSec,
      }
    })
    textareaRef.current?.focus()
  }

  function resetTimer() {
    setTimer({ kind: "idle" })
  }

  function insertTranscribed(transcribed: string) {
    const ta = textareaRef.current
    const addition = transcribed.trim()
    if (!addition) return

    setText((prev) => {
      const start = ta?.selectionStart ?? prev.length
      const end = ta?.selectionEnd ?? prev.length
      const before = prev.slice(0, start)
      const after = prev.slice(end)
      const needsSpaceBefore = before.length > 0 && !/\s$/.test(before)
      const needsSpaceAfter = after.length > 0 && !/^\s/.test(after)
      const insert =
        (needsSpaceBefore ? " " : "") +
        addition +
        (needsSpaceAfter ? " " : "")
      const next = before + insert + after

      requestAnimationFrame(() => {
        if (!ta) return
        const caret = before.length + insert.length
        ta.focus()
        ta.setSelectionRange(caret, caret)
      })

      return next
    })
  }

  function exitBrowserFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {
        /* noop */
      })
    }
  }

  async function handleExit() {
    if (timer.kind === "running") {
      setShowExitConfirm(true)
      return
    }
    if (text !== lastSaved.current) {
      await save(text)
    }
    exitBrowserFullscreen()
    router.push(`/journal?date=${date}`)
  }

  async function confirmExit() {
    if (text !== lastSaved.current) {
      await save(text)
    }
    exitBrowserFullscreen()
    router.push(`/journal?date=${date}`)
  }

  const words = wordCount(text)
  const isTimerActive = timer.kind === "running" || timer.kind === "paused"
  const isDone = timer.kind === "done"
  const progressPct =
    timer.kind === "running" || timer.kind === "paused"
      ? Math.min(
          100,
          Math.max(
            0,
            ((timer.totalSec - timer.remainingSec) / timer.totalSec) * 100
          )
        )
      : timer.kind === "done"
      ? 100
      : 0

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col text-white">
      {/* Subtle progress bar — full width, top edge */}
      {(isTimerActive || isDone) && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-900 z-10">
          <div
            className={cn(
              "h-full transition-all duration-500",
              isDone ? "bg-emerald-500" : "bg-orange-500/70"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Top bar — minimal */}
      <header className="h-12 px-4 flex items-center justify-between shrink-0 text-zinc-600">
        <button
          onClick={handleExit}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
          aria-label="Exit focus mode"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Timer display */}
        <div className="flex items-center gap-2 text-[13px] font-mono tabular-nums">
          {timer.kind === "idle" && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-700 text-[11px] uppercase tracking-wider mr-1">
                Focus
              </span>
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => startTimer(m)}
                  className="px-2 py-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors text-[12px]"
                >
                  {m}m
                </button>
              ))}
              <button
                onClick={enterBrowserFullscreen}
                className="ml-1 w-7 h-7 flex items-center justify-center rounded-md text-zinc-600 hover:text-white hover:bg-zinc-900 transition-colors"
                aria-label="Fullscreen"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {timer.kind === "running" && (
            <>
              <span className="text-orange-400/80">
                {formatClock(timer.remainingSec)}
              </span>
              <button
                onClick={pauseTimer}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
                aria-label="Pause"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {timer.kind === "paused" && (
            <>
              <span className="text-zinc-500">
                {formatClock(timer.remainingSec)}
              </span>
              <button
                onClick={resumeTimer}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
                aria-label="Resume"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetTimer}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
                aria-label="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {timer.kind === "done" && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-[12px] uppercase tracking-wider">
                Session complete
              </span>
              <button
                onClick={resetTimer}
                className="px-2 py-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors text-[12px]"
              >
                Again
              </button>
            </div>
          )}
        </div>

        {/* Save status — mirrors timer side, kept subtle */}
        <div className="w-8 h-8 flex items-center justify-center">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              saving
                ? "bg-orange-500/60 animate-pulse"
                : savedAt
                ? "bg-emerald-500/40"
                : "bg-zinc-800"
            )}
            aria-label={saving ? "Saving" : savedAt ? "Saved" : "Idle"}
          />
        </div>
      </header>

      {/* Writing canvas */}
      <main className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-3xl px-6 sm:px-10 py-8 sm:py-14 flex flex-col gap-4">
          <DailyPrompt date={date} variant="focus" />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!loaded}
            placeholder={loaded ? "Start writing…" : "Loading…"}
            spellCheck={true}
            className={cn(
              "w-full flex-1 resize-none bg-transparent outline-none border-0",
              "text-zinc-100 placeholder:text-zinc-700",
              "text-lg sm:text-xl leading-relaxed tracking-[-0.005em]",
              "caret-orange-500",
              "font-serif",
              !loaded && "opacity-50"
            )}
            style={{ minHeight: "calc(100vh - 260px)" }}
          />
        </div>
      </main>

      {/* Bottom bar — word count + voice */}
      <footer className="h-14 px-6 flex items-center justify-between shrink-0 text-[11px] text-zinc-700 font-mono tabular-nums">
        <span>{words} {words === 1 ? "word" : "words"}</span>
        <span className="hidden sm:inline">Esc to exit · autosaves</span>
        <VoiceInput onTranscribed={insertTranscribed} disabled={!loaded} />
      </footer>

      {/* Exit confirm */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center z-20 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">
              Leave focus session?
            </h2>
            <p className="text-sm text-zinc-400">
              Timer is still running. Your writing is saved, but the session
              won't count as complete.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Keep writing
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
