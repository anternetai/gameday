"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CalendarDays } from "lucide-react"
import type { Task } from "@/components/task-list"

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

interface DailyTimelineProps {
  events: CalendarEvent[]
  tasks: Task[]
  currentDate: string           // YYYY-MM-DD
  calendarConnected?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 6    // 6 AM
const HOUR_END   = 22   // 10 PM
const TOTAL_HOURS = HOUR_END - HOUR_START  // 16
const HOUR_HEIGHT = 56  // px per hour

function formatHour(h: number): string {
  if (h === 0)  return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// Returns minutes since midnight from an ISO datetime string
function isoToMinutes(iso: string): number {
  // If it's a date-only string (all-day), return 0
  if (!iso.includes("T")) return 0
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

// Returns minutes since midnight from a scheduled_time string like "09:30:00"
function timeStrToMinutes(timeStr: string): number {
  const parts = timeStr.split(":")
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

// Position in pixels from the top of the 6 AM start
function minutesToPx(minutes: number): number {
  const minutesFromStart = minutes - HOUR_START * 60
  return (minutesFromStart / 60) * HOUR_HEIGHT
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

// ── Event block ───────────────────────────────────────────────────────────────
interface EventBlockProps {
  top: number      // px
  height: number   // px
  label: string
  sublabel?: string
  variant: "calendar" | "task"
}

function EventBlock({ top, height, label, sublabel, variant }: EventBlockProps) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 rounded-md px-2 py-1 overflow-hidden pointer-events-none",
        variant === "calendar"
          ? "bg-blue-500/20 border border-blue-500/50"
          : "bg-orange-500/10 border border-orange-500/30"
      )}
      style={{ top, height: Math.max(height, 20) }}
    >
      <p
        className={cn(
          "text-[11px] font-medium leading-tight truncate",
          variant === "calendar" ? "text-blue-300" : "text-orange-300"
        )}
      >
        {label}
      </p>
      {sublabel && height >= 36 && (
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function DailyTimeline({
  events,
  tasks,
  currentDate,
  calendarConnected,
}: DailyTimelineProps) {
  const [nowMinutes, setNowMinutes] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Tick every minute to update current time indicator
  useEffect(() => {
    function tick() {
      const now = new Date()
      setNowMinutes(now.getHours() * 60 + now.getMinutes())
    }
    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [])

  // On mount: scroll so current hour is near the top (or 9 AM if not today)
  useEffect(() => {
    if (!scrollRef.current) return
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    const isToday = currentDate === today

    const scrollHour = isToday
      ? Math.max(HOUR_START, (nowMinutes ?? (9 * 60)) / 60 - 1)
      : 9

    const scrollPx = ((scrollHour - HOUR_START) / TOTAL_HOURS) * (TOTAL_HOURS * HOUR_HEIGHT)
    scrollRef.current.scrollTop = Math.max(0, scrollPx - 32)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })
  const isToday = currentDate === today

  // Determine if current time indicator should show
  const showNowLine =
    isToday &&
    nowMinutes !== null &&
    nowMinutes >= HOUR_START * 60 &&
    nowMinutes < HOUR_END * 60

  const nowLinePx = showNowLine
    ? minutesToPx(nowMinutes!)
    : null

  // Filter + position calendar events
  const timedEvents = events.filter((e) => !e.allDay)
  const allDayEvents = events.filter((e) => e.allDay)

  // Tasks with scheduled_time
  const timedTasks = tasks.filter((t) => t.scheduled_time)

  return (
    <div className="flex flex-col h-full">
      {/* All-day events strip */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-zinc-800 bg-zinc-900/20">
          {allDayEvents.map((e) => (
            <span
              key={e.id}
              className="text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded px-1.5 py-0.5 truncate max-w-[160px]"
            >
              {e.title}
            </span>
          ))}
        </div>
      )}

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800"
        style={{ maxHeight: "calc(100vh - 320px)", minHeight: 280 }}
      >
        {/* Inner container: exact pixel height */}
        <div
          className="relative"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Hour rows */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            const hour = HOUR_START + i
            const top = i * HOUR_HEIGHT
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start"
                style={{ top }}
              >
                {/* Time label */}
                <span className="w-11 shrink-0 text-[10px] text-zinc-600 text-right pr-2 leading-none mt-[-1px] select-none">
                  {formatHour(hour)}
                </span>
                {/* Hour line */}
                <div className="flex-1 h-px bg-zinc-800/60" />
              </div>
            )
          })}

          {/* Half-hour tick marks */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const top = i * HOUR_HEIGHT + HOUR_HEIGHT / 2
            return (
              <div
                key={`half-${i}`}
                className="absolute left-11 right-0 h-px bg-zinc-800/30"
                style={{ top }}
              />
            )
          })}

          {/* Events column — offset from labels */}
          <div className="absolute left-12 right-2 top-0 bottom-0">
            {/* Calendar events */}
            {timedEvents.map((event) => {
              const startMins = isoToMinutes(event.start)
              const endMins   = isoToMinutes(event.end)
              const clampedStart = clamp(startMins, HOUR_START * 60, HOUR_END * 60)
              const clampedEnd   = clamp(endMins,   HOUR_START * 60, HOUR_END * 60)

              if (clampedStart >= clampedEnd) return null

              const top    = minutesToPx(clampedStart)
              const height = minutesToPx(clampedEnd) - top

              // Format time range label
              const startLabel = new Date(event.start).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })

              return (
                <EventBlock
                  key={event.id}
                  top={top}
                  height={height}
                  label={event.title}
                  sublabel={`${startLabel}${event.location ? " · " + event.location : ""}`}
                  variant="calendar"
                />
              )
            })}

            {/* Task time blocks */}
            {timedTasks.map((task) => {
              const startMins = timeStrToMinutes(task.scheduled_time!)
              const endMins   = startMins + 30 // Default 30 min duration
              const clampedStart = clamp(startMins, HOUR_START * 60, HOUR_END * 60)
              const clampedEnd   = clamp(endMins,   HOUR_START * 60, HOUR_END * 60)

              if (clampedStart >= clampedEnd) return null

              const top    = minutesToPx(clampedStart)
              const height = minutesToPx(clampedEnd) - top

              return (
                <EventBlock
                  key={task.id}
                  top={top}
                  height={height}
                  label={task.title}
                  sublabel={task.category}
                  variant="task"
                />
              )
            })}

            {/* Current time indicator */}
            {nowLinePx !== null && (
              <div
                className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                style={{ top: nowLinePx }}
              >
                {/* Dot */}
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 -ml-1" />
                {/* Line */}
                <div className="flex-1 h-px bg-orange-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connect calendar prompt */}
      {!calendarConnected && (
        <div className="px-3 py-2.5 border-t border-zinc-800 bg-zinc-900/20">
          <a
            href="/api/google/auth"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
          >
            <CalendarDays className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            Connect Google Calendar
          </a>
        </div>
      )}
    </div>
  )
}
