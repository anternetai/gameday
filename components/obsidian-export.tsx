"use client"

import { useState } from "react"
import { Download, Check, Loader2, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ObsidianExportProps {
  date: string
}

export function ObsidianExport({ date }: ObsidianExportProps) {
  const [busy, setBusy] = useState<false | "download" | "copy">(false)
  const [done, setDone] = useState<false | "download" | "copy">(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setBusy("download")
    setError(null)
    try {
      const res = await fetch(`/api/obsidian/export?date=${date}`)
      if (!res.ok) throw new Error(`export failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${date}.md`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDone("download")
      setTimeout(() => setDone(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    setBusy("copy")
    setError(null)
    try {
      const res = await fetch(`/api/obsidian/export?date=${date}&format=raw`)
      if (!res.ok) throw new Error(`export failed: ${res.status}`)
      const data = await res.json()
      await navigator.clipboard.writeText(data.markdown)
      setDone("copy")
      setTimeout(() => setDone(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-300">Export</h2>
          <p className="text-[11px] text-zinc-600">
            Drop into <span className="text-zinc-500 font-mono">Meridian Vault (1)/Journal/</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!!busy}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md transition-colors",
              "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white",
              "disabled:opacity-60"
            )}
          >
            {busy === "copy" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : done === "copy" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            Copy MD
          </button>
          <button
            onClick={handleDownload}
            disabled={!!busy}
            className={cn(
              "flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md transition-colors",
              "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 hover:text-white border border-violet-500/30",
              "disabled:opacity-60"
            )}
          >
            {busy === "download" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : done === "download" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Download .md
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
