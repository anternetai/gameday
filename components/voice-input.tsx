"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type RecorderState = "idle" | "recording" | "transcribing"

interface VoiceInputProps {
  onTranscribed: (text: string) => void
  disabled?: boolean
  className?: string
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

export function VoiceInput({
  onTranscribed,
  disabled,
  className,
}: VoiceInputProps) {
  const [state, setState] = useState<RecorderState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
    }
  }, [])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType ?? "audio/webm",
        })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (blob.size < 500) {
          setState("idle")
          return
        }
        await transcribe(blob, mimeType)
      }
      recorder.start()
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsed(0)
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
      setState("recording")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "mic unavailable"
      setError(msg.includes("denied") ? "Mic permission denied" : msg)
      setState("idle")
    }
  }

  function stop() {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state !== "inactive") {
      setState("transcribing")
      rec.stop()
    }
  }

  async function transcribe(blob: Blob, mimeType?: string) {
    try {
      const ext = (mimeType ?? "audio/webm").includes("mp4") ? "m4a" : "webm"
      const file = new File([blob], `recording.${ext}`, {
        type: mimeType ?? "audio/webm",
      })
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "transcription failed")
      const text = (data.text ?? "").trim()
      if (text) onTranscribed(text)
      setState("idle")
    } catch (e) {
      setError(e instanceof Error ? e.message : "transcription failed")
      setState("idle")
    }
  }

  const isRecording = state === "recording"
  const isTranscribing = state === "transcribing"

  function fmt(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, "0")}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isRecording && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>{fmt(elapsed)}</span>
        </div>
      )}

      <button
        type="button"
        onClick={isRecording ? stop : start}
        disabled={disabled || isTranscribing}
        className={cn(
          "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150",
          isRecording
            ? "bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25"
            : isTranscribing
            ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
        aria-label={
          isRecording
            ? "Stop recording"
            : isTranscribing
            ? "Transcribing"
            : "Record voice"
        }
        title={
          isRecording
            ? "Stop & transcribe"
            : isTranscribing
            ? "Transcribing…"
            : "Record voice (inserts text)"
        }
      >
        {isRecording ? (
          <Square className="w-3.5 h-3.5 fill-current" />
        ) : isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        {isRecording && (
          <span className="absolute inset-0 rounded-full border border-red-500/40 animate-ping" />
        )}
      </button>

      {error && (
        <span className="text-[11px] text-red-300 max-w-[180px] truncate">
          {error}
        </span>
      )}
    </div>
  )
}
