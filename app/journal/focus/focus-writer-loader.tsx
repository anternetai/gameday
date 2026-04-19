"use client"

import { useSearchParams } from "next/navigation"
import { FocusWriter } from "@/components/focus-writer"

function getLocalDate(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export function FocusWriterLoader() {
  const searchParams = useSearchParams()
  const date = searchParams.get("date") ?? getLocalDate(0)
  return <FocusWriter date={date} />
}
