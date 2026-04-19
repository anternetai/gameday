const DB_NAME = "gameday-vault"
const STORE = "handles"
const KEY = "journalDir"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function"
  )
}

export async function getSavedHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === "undefined") return null
  try {
    const db = await openDB()
    return await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly")
        const req = tx.objectStore(STORE).get(KEY)
        req.onsuccess = () =>
          resolve((req.result as FileSystemDirectoryHandle) ?? null)
        req.onerror = () => reject(req.error)
      }
    )
  } catch {
    return null
  }
}

export async function saveHandle(h: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(h, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearHandle(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* noop */
  }
}

export async function verifyWritePermission(
  handle: FileSystemDirectoryHandle,
  requestIfMissing: boolean
): Promise<boolean> {
  const opts = { mode: "readwrite" as const }
  const current = await handle.queryPermission(opts)
  if (current === "granted") return true
  if (!requestIfMissing) return false
  const next = await handle.requestPermission(opts)
  return next === "granted"
}

export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("File System Access API not supported in this browser")
  }
  const handle = await window.showDirectoryPicker({
    id: "gameday-journal-vault",
    mode: "readwrite",
    startIn: "documents",
  })
  await saveHandle(handle)
  return handle
}

export async function writeEntryToVault(
  handle: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  const ok = await verifyWritePermission(handle, true)
  if (!ok) throw new Error("Write permission denied")
  const fileHandle = await handle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(content)
  } finally {
    await writable.close()
  }
}
