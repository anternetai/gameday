"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, BookOpen, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    label: "Today",
    href: "/today",
    icon: CalendarDays,
  },
  {
    label: "Journal",
    href: "/today#journal",
    icon: BookOpen,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <div className="flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/today"
              ? pathname === "/today"
              : pathname.startsWith(item.href.split("#")[0])

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150",
                isActive
                  ? "text-orange-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-150",
                  isActive && "scale-110"
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
