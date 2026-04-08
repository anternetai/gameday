"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { JournalPanel } from "@/components/journal-panel"
import { MobileNav } from "@/components/mobile-nav"

function getLocalDate(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

function formatDateLabel(dateStr: string): string {
  const today = getLocalDate(0)
  if (dateStr === today) return "Today"
  if (dateStr === getLocalDate(-1)) return "Yesterday"
  if (dateStr === getLocalDate(1)) return "Tomorrow"
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

export default function JournalPage() {
  const searchParams = useSearchParams()
  const today = getLocalDate(0)
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? today)

  function navigateDay(delta: number) {
    const current = new Date(selectedDate + "T12:00:00")
    current.setDate(current.getDate() + delta)
    setSelectedDate(current.toISOString().split("T")[0])
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/today"
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={cn(
              "text-sm font-medium min-w-[120px] text-center",
              selectedDate === today ? "text-orange-400" : "text-zinc-300"
            )}>
              {formatDateLabel(selectedDate)}
            </span>
            <button
              onClick={() => navigateDay(1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-14" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-6">Journal</h1>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <JournalPanel date={selectedDate} />
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
