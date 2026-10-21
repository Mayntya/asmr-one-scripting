import type { TrackNode, Work } from "./api"

export interface SavedSession {
  work: Work
  tracks: TrackNode[]
  index: number
  time: number
  subtitleOn: boolean
}

const FILE = FileManager.documentsDirectory + "asmr-session.json"

export function saveSession(s: SavedSession | null) {
  try {
    if (s == null) {
      if (FileManager.existsSync(FILE)) FileManager.removeSync(FILE)
      return
    }
    FileManager.writeAsStringSync(FILE, JSON.stringify(s))
  } catch {}
}

export function loadSession(): SavedSession | null {
  try {
    if (!FileManager.existsSync(FILE)) return null
    const j: any = JSON.parse(FileManager.readAsStringSync(FILE))
    if (j == null || j.work == null || j.work.id == null) return null
    const tracks: TrackNode[] = Array.isArray(j.tracks) ? j.tracks : []
    if (tracks.length === 0) return null
    const index = Math.min(Math.max(Number(j.index ?? 0) | 0, 0), tracks.length - 1)
    return {
      work: j.work as Work,
      tracks,
      index,
      time: Number(j.time ?? 0),
      subtitleOn: j.subtitleOn === true,
    }
  } catch {
    return null
  }
}
