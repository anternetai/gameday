"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, Zap, Flame, CalendarDays, ChevronDown, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { TaskList, type Task } from "@/components/task-list"
import { RingProgress } from "@/components/ring-progress"
import { WeekStrip } from "@/components/week-strip"
import { AddTaskBar } from "@/components/add-task-bar"
import { JournalPanel } from "@/components/journal-panel"
import { DayComplete } from "@/components/day-complete"
import { DailyTimeline, type CalendarEvent } from "@/components/daily-timeline"
import { ContextPanel } from "@/components/context-panel"
import { MobileNav } from "@/components/mobile-nav"
import { LoadingSkeleton } from "@/components/loading-skeleton"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayStat {
  date: string
  total: number
  completed: number
  xp: number
  pct: number
}

interface StatsResponse {
  stats: {
    total_xp: number
    current_streak: number
    longest_streak: number
    last_completed_date: string | null
  }
  weekly: {
    completed: number
    total: number
    xp: number
    byDate: Record<string, { total: number; completed: number; xp: number }>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalDate(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

function formatDateLabel(dateStr: string): string {
  const today = getLocalDate(0)
  const yesterday = getLocalDate(-1)
  const tomorrow = getLocalDate(1)

  if (dateStr === today) return "Today"
  if (dateStr === yesterday) return "Yesterday"
  if (dateStr === tomorrow) return "Tomorrow"

  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function buildWeekStatsFromByDate(
  byDate: Record<string, { total: number; completed: number; xp: number }>,
  anchor: string
): DayStat[] {
  const anchorDate = new Date(anchor + "T12:00:00")
  const days: DayStat[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchorDate)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const entry = byDate[dateStr] ?? { total: 0, completed: 0, xp: 0 }
    days.push({
      date: dateStr,
      ...entry,
      pct:
        entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
    })
  }
  return days
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const today = getLocalDate(0)

  const [selectedDate, setSelectedDate] = useState(today)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const [statsData, setStatsData] = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [showDayComplete, setShowDayComplete] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)

  // ── Fetch tasks for selected date ──────────────────────────────────────────
  const fetchTasks = useCallback(async (date: string) => {
    setTasksLoading(true)
    try {
      const res = await fetch(`/api/tasks/today?date=${date}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      setTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [])

  // ── Fetch calendar events ──────────────────────────────────────────────────
  const fetchCalendarEvents = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/calendar/events?date=${date}`)
      const data = await res.json()
      setCalendarEvents(data.events ?? [])
      setCalendarConnected(data.connected ?? false)
    } catch {
      setCalendarEvents([])
      setCalendarConnected(false)
    }
  }, [])

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/tasks/stats")
      const data: StatsResponse = await res.json()
      setStatsData(data)
    } catch {
      // silent
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks(selectedDate)
    fetchCalendarEvents(selectedDate)
  }, [selectedDate, fetchTasks, fetchCalendarEvents])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs / textareas
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Escape still works to close open state
        if (e.key === "Escape") {
          setShowAddTask(false)
          setShowDayComplete(false)
        }
        return
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        setShowAddTask((v) => !v)
      }

      if (e.key === "Escape") {
        setShowAddTask(false)
        setShowDayComplete(false)
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        fetchTasks(selectedDate)
        fetchStats()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedDate, fetchTasks, fetchStats])

  // ── Computed stats ─────────────────────────────────────────────────────────
  const completedTasks = tasks.filter((t) => t.completed)
  const totalTasks = tasks.length
  const pct =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0
  const todayXp = completedTasks.reduce((sum, t) => sum + (t.xp_value ?? 0), 0)

  const weekStats: DayStat[] = statsData
    ? buildWeekStatsFromByDate(statsData.weekly.byDate, today)
    : []

  const streak = statsData?.stats.current_streak ?? 0
  const totalXp = statsData?.stats.total_xp ?? 0

  // ── Day navigation ─────────────────────────────────────────────────────────
  function navigateDay(delta: number) {
    const current = new Date(selectedDate + "T12:00:00")
    current.setDate(current.getDate() + delta)
    setSelectedDate(current.toISOString().split("T")[0])
  }

  // ── All-complete handler ───────────────────────────────────────────────────
  function handleAllComplete() {
    setShowDayComplete(true)
    fetchStats()
  }

  // ── Task added ─────────────────────────────────────────────────────────────
  function handleTaskAdded(task: Task) {
    setTasks((prev) => [...prev, task])
    setShowAddTask(false)
  }

  // ── Tasks changed (from TaskList) ─────────────────────────────────────────
  function handleTasksChange(updated: Task[]) {
    setTasks(updated)

    // Check if all complete after change
    const allDone =
      updated.length > 0 && updated.every((t) => t.completed)
    if (allDone) handleAllComplete()
  }

  const isToday = selectedDate === today

  // Show full-page skeleton on very first load (both tasks and stats still loading)
  const initialLoading = tasksLoading && statsLoading

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo + title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Game Day</span>
          </div>

          {/* Day navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className={cn(
                "text-sm font-medium min-w-[80px] text-center",
                isToday ? "text-orange-400" : "text-zinc-300"
              )}
            >
              {formatDateLabel(selectedDate)}
            </span>
            <button
              onClick={() => navigateDay(1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              disabled={selectedDate >= today}
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4",
                  selectedDate >= today && "opacity-30"
                )}
              />
            </button>
          </div>

          {/* Right header actions */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <Link
              href="/settings"
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Add task button */}
            <button
              onClick={() => setShowAddTask((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-150",
                showAddTask
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add task</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      {initialLoading ? (
        <LoadingSkeleton />
      ) : null}
      <main className={cn("max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8 pb-20 lg:pb-8", initialLoading && "hidden")}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">

          {/* ── Left column: tasks + timeline ─────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* AI Context Panel — morning brief + task suggestions */}
            {isToday && (
              <ContextPanel
                date={selectedDate}
                onTaskAdded={() => fetchTasks(selectedDate)}
              />
            )}

            {/* Progress card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-4">
              <RingProgress pct={pct} xp={todayXp} />
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Task count */}
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-0.5">
                    Progress
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-none">
                    {completedTasks.length}
                    <span className="text-zinc-600 font-normal">
                      /{totalTasks}
                    </span>{" "}
                    <span className="text-sm font-normal text-zinc-400">
                      tasks
                    </span>
                  </p>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-semibold tabular-nums text-white">
                      {streak}
                    </span>{" "}
                    day streak
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-semibold tabular-nums text-white">
                      {totalXp.toLocaleString()}
                    </span>{" "}
                    total XP
                  </div>
                </div>
              </div>
            </div>

            {/* Task list */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-300">Tasks</h2>
                {tasksLoading && (
                  <span className="text-[11px] text-zinc-600">Loading…</span>
                )}
              </div>

              {!tasksLoading && (
                <TaskList
                  tasks={tasks}
                  onTasksChange={handleTasksChange}
                  onAllComplete={handleAllComplete}
                  onAddTask={() => setShowAddTask(true)}
                />
              )}

              {/* Add task bar — shown inline below task list */}
              <div className="mt-3">
                <AddTaskBar
                  onTaskAdded={handleTaskAdded}
                  taskDate={selectedDate}
                />
              </div>
            </div>

            {/* ── Timeline: desktop always visible, mobile collapsible ──────── */}
            {/* Desktop: rendered inline in left column */}
            <div className="hidden lg:block rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-zinc-300">Timeline</h2>
                </div>
                {calendarConnected && (
                  <span className="text-[10px] text-emerald-500/70">Calendar synced</span>
                )}
              </div>
              <DailyTimeline
                events={calendarEvents}
                tasks={tasks}
                currentDate={selectedDate}
                calendarConnected={calendarConnected}
              />
            </div>

            {/* Mobile: collapsible */}
            <div className="lg:hidden rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <button
                onClick={() => setTimelineOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-300">Timeline</span>
                  {calendarConnected && (
                    <span className="text-[10px] text-emerald-500/70">synced</span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-zinc-500 transition-transform duration-200",
                    timelineOpen && "rotate-180"
                  )}
                />
              </button>
              {timelineOpen && (
                <div className="border-t border-zinc-800/60">
                  <DailyTimeline
                    events={calendarEvents}
                    tasks={tasks}
                    currentDate={selectedDate}
                    calendarConnected={calendarConnected}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: week strip + journal ─────────────────────────── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-[72px]">

            {/* Week strip */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-300">
                  This Week
                </h2>
                {!statsLoading && statsData && (
                  <span className="text-[11px] text-zinc-500">
                    {statsData.weekly.xp} XP
                  </span>
                )}
              </div>
              {statsLoading ? (
                <div className="h-20 rounded-lg bg-zinc-800/50 animate-pulse" />
              ) : (
                <WeekStrip
                  weekStats={weekStats}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
            </div>

            {/* Journal */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <JournalPanel date={selectedDate} />
            </div>
          </div>
        </div>
      </main>

      {/* ── Day complete overlay ───────────────────────────────────────────── */}
      {showDayComplete && (
        <DayComplete
          xpEarned={todayXp}
          onDismiss={() => setShowDayComplete(false)}
        />
      )}

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <MobileNav />
    </div>
  )
}
