"use client"

import { cn } from "@/lib/utils"

interface DayStat {
  date: string
  total: number
  completed: number
  xp: number
  pct: number
}

interface WeekStripProps {
  weekStats: DayStat[]
  selectedDate: string
  onSelectDate: (date: string) => void
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function WeekStrip({
  weekStats,
  selectedDate,
  onSelectDate,
}: WeekStripProps) {
  const today = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    .split("T")[0]

  const totalXp = weekStats.reduce((sum, d) => sum + d.xp, 0)
  const totalCompleted = weekStats.reduce((sum, d) => sum + d.completed, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1.5 h-16">
        {weekStats.map((day) => {
          const isToday = day.date === today
          const isSelected = day.date === selectedDate
          const dayIndex = new Date(day.date + "T12:00:00").getDay()
          const label = DAY_LABELS[dayIndex]
          const barHeight = day.total > 0 ? Math.max(4, (day.pct / 100) * 40) : 4

          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className="flex flex-col items-center gap-1 flex-1 group"
            >
              {/* Bar container */}
              <div className="relative w-full flex items-end" style={{ height: 44 }}>
                {/* Background track */}
                <div className="w-full rounded-sm bg-zinc-800 absolute bottom-0" style={{ height: 40 }} />
                {/* Fill bar */}
                <div
                  className={cn(
                    "w-full rounded-sm absolute bottom-0 transition-all duration-500",
                    day.pct === 100
                      ? "bg-emerald-500"
                      : isToday
                      ? "bg-orange-500"
                      : isSelected
                      ? "bg-zinc-400"
                      : "bg-zinc-600"
                  )}
                  style={{ height: barHeight }}
                />
                {/* Selection ring */}
                {isSelected && (
                  <div className="absolute -inset-0.5 rounded ring-1 ring-orange-500 pointer-events-none" />
                )}
              </div>
              {/* Day label */}
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide transition-colors",
                  isToday ? "text-orange-400" : isSelected ? "text-white" : "text-zinc-500",
                  "group-hover:text-zinc-300"
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Weekly summary */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800 pt-2">
        <span>{totalCompleted} tasks this week</span>
        <span className="text-orange-400 font-medium">{totalXp} XP</span>
      </div>
    </div>
  )
}
