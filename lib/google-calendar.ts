import { google } from "googleapis"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
]

export interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO string
  end: string     // ISO string
  allDay: boolean
  location?: string
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/google/callback`
  )
}

export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = createOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expiry_date: number
}> {
  const oauth2Client = createOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing tokens from Google OAuth response")
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expiry_date: number
}> {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token")
  }

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date ?? Date.now() + 3600 * 1000,
  }
}

export async function getCalendarEvents(
  accessToken: string,
  date: string  // YYYY-MM-DD
): Promise<CalendarEvent[]> {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  // Build timeMin / timeMax for the full day in America/New_York.
  // We use the calendar API's timeZone param so Google handles DST correctly.
  const timeMin = `${date}T00:00:00`
  const timeMax = `${date}T23:59:59`

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    timeZone: "America/New_York",
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  })

  const items = response.data.items ?? []

  return items.map((item) => {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime)
    const start = item.start?.dateTime ?? item.start?.date ?? ""
    const end = item.end?.dateTime ?? item.end?.date ?? ""

    return {
      id: item.id ?? crypto.randomUUID(),
      title: item.summary ?? "(No title)",
      start,
      end,
      allDay: isAllDay,
      location: item.location ?? undefined,
    }
  })
}
