import { NextRequest, NextResponse } from "next/server"
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_TOKEN,
  ADMIN_PASSPHRASE,
} from "@/lib/auth/admin"

export async function POST(request: NextRequest) {
  let passphrase = ""
  try {
    const body = await request.json()
    passphrase = typeof body?.passphrase === "string" ? body.passphrase : ""
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (passphrase !== ADMIN_PASSPHRASE) {
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json({ error: "nope" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, ADMIN_COOKIE_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}
