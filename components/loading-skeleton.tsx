"use client"

import { cn } from "@/lib/utils"

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-zinc-800/60",
        className
      )}
    />
  )
}

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
      {/* Drag handle */}
      <SkeletonBlock className="w-3.5 h-3.5 shrink-0" />
      {/* Checkbox */}
      <SkeletonBlock className="w-[18px] h-[18px] rounded-full shrink-0" />
      {/* Title */}
      <SkeletonBlock className="flex-1 h-3.5" />
      {/* Category pill */}
      <SkeletonBlock className="w-12 h-4 rounded shrink-0" />
      {/* XP */}
      <SkeletonBlock className="w-8 h-3.5 shrink-0" />
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Progress card skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-4">
            {/* Ring */}
            <SkeletonBlock className="w-32 h-32 rounded-full shrink-0" />
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-6 w-28" />
              <div className="flex gap-4">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            </div>
          </div>

          {/* Task list skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <SkeletonBlock className="h-4 w-12" />
            </div>
            <div className="flex flex-col gap-1.5">
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
            </div>
          </div>

          {/* Timeline skeleton */}
          <div className="hidden lg:block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <SkeletonBlock className="h-4 w-16 mb-4" />
            <SkeletonBlock className="h-48 w-full rounded-lg" />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Week strip skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <SkeletonBlock className="h-4 w-20 mb-3" />
            <SkeletonBlock className="h-20 w-full rounded-lg" />
          </div>

          {/* Journal skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <SkeletonBlock className="h-4 w-16 mb-3" />
            <SkeletonBlock className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
