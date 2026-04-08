// lib/context/obsidian.ts
// Reads Anthony's Obsidian daily note from the local vault.
// Only works when running locally — gracefully returns null on Vercel.

import fs from "fs/promises"
import path from "path"

export interface ObsidianContext {
  dailyNote: string | null
}

export async function getObsidianContext(date: string): Promise<ObsidianContext> {
  // Vault path — Windows Google Drive sync location
  const vaultBase = "G:/My Drive/Meridian Vault (1)/Daily"
  const fileName = `${date}.md`
  const filePath = path.join(vaultBase, fileName)

  try {
    const content = await fs.readFile(filePath, "utf-8")
    return { dailyNote: content }
  } catch {
    // File doesn't exist, vault not mounted (Vercel), or permission denied — all fine
    return { dailyNote: null }
  }
}
