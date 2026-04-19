const CHAT_URL = "https://api.openai.com/v1/chat/completions"
export const CHAT_MODEL = "gpt-4o-mini"

interface ChatOptions {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  responseFormat?: "json_object" | "text"
}

export async function chat({
  system,
  user,
  maxTokens = 2000,
  temperature = 0.7,
  responseFormat,
}: ChatOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set")

  const body: Record<string, unknown> = {
    model: CHAT_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }
  if (responseFormat === "json_object") {
    body.response_format = { type: "json_object" }
  }

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return data.choices?.[0]?.message?.content?.trim() ?? ""
}
