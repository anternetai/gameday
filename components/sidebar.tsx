"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, BookOpen, Settings, Zap, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  // Don't show sidebar on login page
  if (pathname === "/login") return null

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-zinc-800/60 bg-zinc-950 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-zinc-800/60">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight text-white">Game Day</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-orange-400" : "text-zinc-500")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-5 py-4 border-t border-zinc-800/60">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Game Day v1.0</p>
      </div>
    </aside>
  )
}
