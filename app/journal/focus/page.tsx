import { Suspense } from "react"
import { FocusWriterLoader } from "./focus-writer-loader"

export default function FocusPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-zinc-950" />}>
      <FocusWriterLoader />
    </Suspense>
  )
}
