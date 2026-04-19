import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      )
    }

    const incoming = await request.formData()
    const file = incoming.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "empty audio" }, { status: 400 })
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "audio exceeds 25MB limit" },
        { status: 413 }
      )
    }

    const outgoing = new FormData()
    outgoing.append("file", file, file.name || "recording.webm")
    outgoing.append("model", "whisper-1")
    outgoing.append("response_format", "json")

    const upstream = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: outgoing,
      }
    )

    if (!upstream.ok) {
      const err = await upstream.text()
      return NextResponse.json(
        { error: `transcription failed: ${upstream.status} ${err.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const data = (await upstream.json()) as { text?: string }
    return NextResponse.json({ text: data.text ?? "" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
