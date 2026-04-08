"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Layers, Tag, Zap } from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"

interface CalendarStatus {
  connected: boolean
  loading: boolean
}

// ── Inner component that uses useSearchParams ─────────────────────────────────
function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [calStatus, setCalStatus] = useState<CalendarStatus>({ connected: false, loading: true })
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    fetch(`/api/calendar/events?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        setCalStatus({ connected: data.connected ?? false, loading: false })
      })
      .catch(() => {
        setCalStatus({ connected: false, loading: false })
      })
  }, [])

  const calParam = searchParams.get("calendar")

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch("/api/calendar/disconnect", { method: "DELETE" })
      setCalStatus({ connected: false, loading: false })
    } catch {
      // silent
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/today")}
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Settings</span>
          </div>
        </div>
      </header>

      {/* Connection toasts */}
      {calParam === "connected" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Google Calendar connected successfully.
          </div>
        </div>
      )}

      {calParam === "error" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            Something went wrong connecting Google Calendar. Please try again.
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6 flex flex-col gap-6">

        {/* ── Google Calendar ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Google Calendar</h2>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {calStatus.loading ? (
              <div className="h-16 animate-pulse bg-zinc-800/30" />
            ) : calStatus.connected ? (
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-zinc-200">Connected</span>
                  <span className="text-xs text-zinc-500">Primary calendar</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span className="text-sm text-zinc-400">Not connected</span>
                </div>
                <Link
                  href="/api/google/auth"
                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  Connect
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-600 mt-2 px-1">
            Shows your Google Calendar events on the daily timeline. Read-only access.
          </p>
        </section>

        {/* ── Task Templates ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Task Templates</h2>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center">
            <p className="text-sm text-zinc-600">Coming soon</p>
            <p className="text-xs text-zinc-700 mt-1">
              Auto-seed daily tasks from recurring templates by day of week.
            </p>
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Categories</h2>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center">
            <p className="text-sm text-zinc-600">Coming soon</p>
            <p className="text-xs text-zinc-700 mt-1">
              Customize task category colors, labels, and XP weights.
            </p>
          </div>
        </section>

      </main>
      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <MobileNav />
    </div>
  )
}

// ── Page export wrapped in Suspense (required for useSearchParams) ─────────────
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
