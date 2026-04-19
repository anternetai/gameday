import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set")
  }
  client = new Anthropic({ apiKey })
  return client
}

export const HAIKU_MODEL = "claude-haiku-4-5-20251001"
