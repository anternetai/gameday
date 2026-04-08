// lib/context/gmail.ts
// Fetches unread/important emails for daily context.
// Uses a simple Bearer token approach — OAuth wiring comes later.

export interface EmailSummary {
  subject: string
  from: string
}

export interface GmailContext {
  unreadCount: number
  importantEmails: EmailSummary[]
}

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

export async function getGmailContext(): Promise<GmailContext> {
  const token = process.env.GMAIL_ACCESS_TOKEN
  if (!token) {
    return { unreadCount: 0, importantEmails: [] }
  }

  try {
    // List unread + important messages
    const listRes = await fetch(
      `${GMAIL_BASE}/messages?q=is:unread+is:important&maxResults=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )

    if (!listRes.ok) {
      return { unreadCount: 0, importantEmails: [] }
    }

    const listData = await listRes.json()
    const messages: Array<{ id: string }> = listData.messages ?? []

    if (messages.length === 0) {
      return { unreadCount: 0, importantEmails: [] }
    }

    // Fetch subject + sender for each message (parallel, bounded)
    const emailResults = await Promise.allSettled(
      messages.slice(0, 10).map((msg) => fetchEmailHeader(msg.id, token))
    )

    const importantEmails: EmailSummary[] = []
    for (const result of emailResults) {
      if (result.status === "fulfilled" && result.value) {
        importantEmails.push(result.value)
      }
    }

    return {
      unreadCount: listData.resultSizeEstimate ?? importantEmails.length,
      importantEmails,
    }
  } catch {
    return { unreadCount: 0, importantEmails: [] }
  }
}

async function fetchEmailHeader(
  messageId: string,
  token: string
): Promise<EmailSummary | null> {
  try {
    const res = await fetch(
      `${GMAIL_BASE}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    const headers: Array<{ name: string; value: string }> =
      data.payload?.headers ?? []

    const subject =
      headers.find((h) => h.name === "Subject")?.value ?? "(no subject)"
    const from =
      headers.find((h) => h.name === "From")?.value ?? "(unknown sender)"

    return { subject, from }
  } catch {
    return null
  }
}
