// lib/context/slack.ts
// Fetches recent messages from key Slack channels for daily context

export interface SlackMessage {
  channel: string
  text: string
  ts: string
}

export interface SlackContext {
  unreadCount: number
  recentMessages: SlackMessage[]
}

const DAILY_OPS_CHANNEL = "C0AHU0LBSSJ"
const CHANNELS = [{ id: DAILY_OPS_CHANNEL, name: "daily-ops" }]

export async function getSlackContext(): Promise<SlackContext> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return { unreadCount: 0, recentMessages: [] }
  }

  const recentMessages: SlackMessage[] = []

  // Look back 24 hours
  const oldest = String(Math.floor(Date.now() / 1000) - 24 * 60 * 60)

  for (const channel of CHANNELS) {
    try {
      const res = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldest}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // No caching — always fresh context
          cache: "no-store",
        }
      )

      if (!res.ok) continue

      const data = await res.json()

      if (!data.ok || !Array.isArray(data.messages)) continue

      for (const msg of data.messages) {
        // Skip bot messages and join/leave events
        if (msg.subtype) continue
        if (!msg.text) continue

        recentMessages.push({
          channel: channel.name,
          text: String(msg.text).slice(0, 300), // cap message length
          ts: String(msg.ts),
        })
      }
    } catch {
      // Silently skip this channel — context degrades gracefully
    }
  }

  // Sort by ts descending (newest first)
  recentMessages.sort((a, b) => Number(b.ts) - Number(a.ts))

  return {
    unreadCount: recentMessages.length,
    recentMessages: recentMessages.slice(0, 20),
  }
}
