"use client"

interface RingProgressProps {
  pct: number
  xp: number
}

export function RingProgress({ pct, xp }: RingProgressProps) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 relative w-32 h-32">
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="oklch(1 0 0 / 0.06)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="oklch(0.65 0.18 55)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{
            transition: "stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <span className="relative text-2xl font-bold tabular-nums leading-none">
        {pct}%
      </span>
      <span className="relative text-[11px] text-zinc-400 font-medium">
        {xp} XP
      </span>
    </div>
  )
}
