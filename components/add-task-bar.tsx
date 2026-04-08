"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORY_MAP: Record<string, string> = {
  "@hfh": "HFH",
  "@squeegee": "SQUEEGEE",
  "@daily": "DAILY",
  "@personal": "PERSONAL",
  "@cadence": "CADENCE",
}

interface AddTaskBarProps {
  onTaskAdded: (task: {
    id: string
    title: string
    category: string
    xp_value: number
    completed: boolean
    sort_order: number
    task_date: string
    scheduled_time: string | null
    notes: string | null
    completed_at: string | null
    source: string
    source_id: string | null
    created_at: string
  }) => void
  taskDate?: string
}

function parseInput(raw: string): {
  title: string
  category: string
  xp_value: number
} {
  let title = raw.trim()
  let category = "DAILY"
  let xp_value = 25

  // Extract category tag like @hfh, @personal, etc.
  const catMatch = title.match(/(@\w+)/i)
  if (catMatch) {
    const tag = catMatch[1].toLowerCase()
    if (CATEGORY_MAP[tag]) {
      category = CATEGORY_MAP[tag]
      title = title.replace(catMatch[1], "").trim()
    }
  }

  // Extract XP like "25xp" or "50 xp"
  const xpMatch = title.match(/(\d+)\s*xp/i)
  if (xpMatch) {
    xp_value = parseInt(xpMatch[1], 10)
    title = title.replace(xpMatch[0], "").trim()
  }

  // Clean up extra spaces
  title = title.replace(/\s+/g, " ").trim()

  return { title, category, xp_value }
}

export function AddTaskBar({ onTaskAdded, taskDate }: AddTaskBarProps) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const trimmed = value.trim()
    if (!trimmed || loading) return

    setLoading(true)
    const { title, category, xp_value } = parseInput(trimmed)

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          xp_value,
          task_date: taskDate,
        }),
      })

      const data = await res.json()
      if (data.task) {
        onTaskAdded(data.task)
        setValue("")
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 px-0 py-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5",
          "focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20",
          "transition-all duration-200"
        )}
      >
        <Plus className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder='Add a task... (try "gym @personal 25xp")'
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
          disabled={loading}
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />
        ) : value.trim() ? (
          <button
            onClick={submit}
            className="text-[11px] text-orange-400 font-medium hover:text-orange-300 transition-colors shrink-0"
          >
            Enter
          </button>
        ) : null}
      </div>
      <p className="text-[10px] text-zinc-700 mt-1.5 px-1">
        Tip: use @hfh, @squeegee, @personal, @cadence or &quot;50xp&quot; to set category &amp; XP
      </p>
    </div>
  )
}
