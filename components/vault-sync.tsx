"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FolderOpen,
  Save,
  Check,
  Loader2,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  clearHandle,
  getSavedHandle,
  isFileSystemAccessSupported,
  pickVaultDirectory,
  verifyWritePermission,
  writeEntryToVault,
} from "@/lib/vault-fs"

interface VaultSyncProps {
  date: string
}

type Status =
  | { kind: "unsupported" }
  | { kind: "unpaired" }
  | { kind: "paired"; name: string; needsPermission: boolean }

export function VaultSync({ date }: VaultSyncProps) {
  const [status, setStatus] = useState<Status>({ kind: "unpaired" })
  const [working, setWorking] = useState<false | "pair" | "save" | "unpair">(
    false
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)

  const refresh = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      setStatus({ kind: "unsupported" })
      return
    }
    const h = await getSavedHandle()
    if (!h) {
      setStatus({ kind: "unpaired" })
      setHandle(null)
      return
    }
    setHandle(h)
    const granted = await verifyWritePermission(h, false)
    setStatus({
      kind: "paired",
      name: h.name,
      needsPermission: !granted,
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function pair() {
    setWorking("pair")
    setError(null)
    try {
      const h = await pickVaultDirectory()
      setHandle(h)
      setStatus({ kind: "paired", name: h.name, needsPermission: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to pair"
      if (!msg.toLowerCase().includes("abort")) setError(msg)
    } finally {
      setWorking(false)
    }
  }

  async function unpair() {
    setWorking("unpair")
    setError(null)
    try {
      await clearHandle()
      setHandle(null)
      setStatus({ kind: "unpaired" })
    } finally {
      setWorking(false)
    }
  }

  async function saveToVault() {
    if (!handle) return
    setWorking("save")
    setError(null)
    try {
      const granted = await verifyWritePermission(handle, true)
      if (!granted) {
        setError("Write permission denied")
        return
      }
      const res = await fetch(
        `/api/obsidian/export?date=${date}&format=raw`
      )
      if (!res.ok) throw new Error(`export ${res.status}`)
      const data = (await res.json()) as { markdown: string; filename: string }
      await writeEntryToVault(handle, data.filename, data.markdown)
      setSaved(true)
      setStatus({
        kind: "paired",
        name: handle.name,
        needsPermission: false,
      })
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setWorking(false)
    }
  }

  if (status.kind === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
        <AlertTriangle className="w-3 h-3" />
        Vault auto-save needs Chrome or Edge — use Download for now.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300">
            <Link2 className="w-3.5 h-3.5 text-emerald-400/80" />
            Vault sync
          </div>
          {status.kind === "paired" ? (
            <p className="text-[11px] text-zinc-600 truncate">
              Paired: <span className="font-mono text-zinc-500">{status.name}</span>
              {status.needsPermission && (
                <span className="text-amber-400/80"> · click Save to re-grant</span>
              )}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-600">
              Pair your <span className="font-mono text-zinc-500">Meridian Vault (1)/Journal/</span> folder once.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status.kind === "unpaired" && (
            <button
              onClick={pair}
              disabled={!!working}
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors",
                "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30",
                "disabled:opacity-60"
              )}
            >
              {working === "pair" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FolderOpen className="w-3 h-3" />
              )}
              Pair folder
            </button>
          )}

          {status.kind === "paired" && (
            <>
              <button
                onClick={saveToVault}
                disabled={!!working}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors",
                  "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30",
                  "disabled:opacity-60"
                )}
              >
                {working === "save" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : saved ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save to vault
              </button>
              <button
                onClick={unpair}
                disabled={!!working}
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                title="Unpair"
              >
                <Unlink className="w-3 h-3" />
              </button>
            </>
          )}
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
