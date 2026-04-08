"use client"

import { useEffect, useRef } from "react"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
}

const COLORS = [
  "#f97316", // orange
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#3b82f6", // blue
  "#fbbf24", // amber
]

interface DayCompleteProps {
  xpEarned: number
  onDismiss: () => void
}

export function DayComplete({ xpEarned, onDismiss }: DayCompleteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = (canvas.width = window.innerWidth)
    const H = (canvas.height = window.innerHeight)

    // Spawn particles
    const count = 120
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
      opacity: 1,
    }))

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, W, H)

      particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0.05)

      for (const p of particlesRef.current) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color

        // Draw a small rectangle confetti piece
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()

        // Update
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08 // gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed

        if (p.y > H * 0.75) {
          p.opacity -= 0.015
        }
      }

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Canvas for confetti */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Card */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-5 rounded-2xl",
          "border border-zinc-700/60 bg-zinc-900/90 backdrop-blur-md",
          "px-10 py-10 shadow-2xl shadow-black/60",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        {/* Trophy icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl scale-150" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Day Complete
          </h2>
          <p className="text-base text-zinc-400 font-medium">Full send.</p>
        </div>

        {/* XP earned */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-sm font-semibold tabular-nums">
            +{xpEarned} XP earned
          </span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className={cn(
            "mt-1 px-6 py-2.5 rounded-lg text-sm font-medium",
            "bg-zinc-800 text-zinc-300 border border-zinc-700",
            "hover:bg-zinc-700 hover:text-white transition-all duration-150",
            "active:scale-95"
          )}
        >
          Back to work
        </button>
      </div>
    </div>
  )
}
