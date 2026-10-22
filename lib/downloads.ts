import type { TrackNode, Work } from "./api"
import { flattenAudio } from "./api"

/**
 * 离线缓存。文件放 App Group（不进 iCloud 同步，也不出现在「文件」App 里），
 * 索引只记相对路径，删掉目录就是彻底删除。
 */
const ROOT = FileManager.appGroupDocumentsDirectory + "/asmr-offline"
const INDEX_KEY = "asmr_offline_index"

export interface OfflineTrack {
  key: string
  title: string
  duration: number
  /** 相对 ROOT 的路径 */
  file: string
  bytes: number
}

export interface OfflineWork {
  id: number
  title: string
  circle: string
  cover: string
  duration: number
  bytes: number
  at: number
  tracks: OfflineTrack[]
}

export interface DownloadJob {
  workId: number
  total: number
  done: number
  bytes: number
  /** 当前这一轨的完成比例 0~1，用来做平滑百分比 */
  curRatio: number
  running: boolean
  error: string | null
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function readIndex(): OfflineWork[] {
  try {
    const v = Storage.get<OfflineWork[]>(INDEX_KEY)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

let index: OfflineWork[] = readIndex()
let job: DownloadJob | null = null
let cancelFlag = false
let currentTask: URLSessionDownloadTask | null = null
const listeners = new Set<() => void>()

function persist() {
  try {
    Storage.set(INDEX_KEY, index)
  } catch {}
}

function emit() {
  for (const f of listeners) {
    try {
      f()
    } catch {}
  }
}

export function subscribeOffline(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function offlineList(): OfflineWork[] {
  return index.slice().sort((a, b) => b.at - a.at)
}

/** 重新读一遍索引（外部改过存储后用）。 */
export function refreshOffline() {
  index = readIndex()
  emit()
}

export function offlineOf(workId: number): OfflineWork | null {
  return index.find((w) => w.id === workId) ?? null
}

export function offlineJob(): DownloadJob | null {
  return job
}

export function offlineBytes(): number {
  return index.reduce((n, w) => n + w.bytes, 0)
}

export function isOffline(workId: number): boolean {
  return offlineOf(workId) != null
}

/** 播放用：命中本地文件就返回绝对路径，否则 null。 */
export function offlinePath(workId: number, trackKey: string): string | null {
  const w = offlineOf(workId)
  if (w == null) return null
  const t = w.tracks.find((x) => x.key === trackKey)
  if (t == null) return null
  const abs = ROOT + "/" + t.file
  try {
    return FileManager.existsSync(abs) ? abs : null
  } catch {
    return null
  }
}

/** 断网时用：从缓存索引凭空造一份曲目表，播放器会直接读本地文件。 */
export function offlineNodes(workId: number): TrackNode[] {
  const w = offlineOf(workId)
  if (w == null) return []
  return w.tracks.map((t) => ({
    key: t.key,
    title: t.title,
    type: "audio" as const,
    duration: t.duration,
    url: "offline://" + t.key,
    children: [],
  }))
}

function fileSize(path: string): number {
  try {
    return FileManager.statSync(path).size
  } catch {
    return 0
  }
}

const AUDIO_EXT = /\.(mp3|wav|flac|m4a|ogg|opus|aac|ape)$/i

function fileNameFor(track: TrackNode, seq: number): string {
  const m = track.title.match(AUDIO_EXT)
  const ext = m != null ? m[1].toLowerCase() : "mp3"
  const base = track.key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48)
  return `${String(seq).padStart(3, "0")}_${base}.${ext}`
}

function downloadOne(url: string, dest: string, onProgress: (got: number, expect: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {}
    let task: URLSessionDownloadTask
    try {
      task = BackgroundURLSession.startDownload({ url, destination: dest, headers })
    } catch (e: any) {
      reject(e)
      return
    }
    currentTask = task
    let lastPush = 0
    task.onProgress = (d) => {
      const now = Date.now()
      if (now - lastPush < 200) return
      lastPush = now
      onProgress(d.totalBytesWritten, d.totalBytesExpectedToWrite)
    }
    task.onFinishDownload = (err, details) => {
      currentTask = null
      if (err != null) reject(err)
      else if (details.destination == null) reject(new Error("下载未落盘"))
      else resolve()
    }
    task.resume()
  })
}

/** 下载整部作品。同一时间只跑一个任务，正在下的时候再点直接忽略。 */
export async function downloadWork(work: Work, nodes: TrackNode[]): Promise<void> {
  if (job != null && job.running) return
  const audio = flattenAudio(nodes)
  if (audio.length === 0) return

  try {
    if (!FileManager.existsSync(ROOT)) FileManager.createDirectorySync(ROOT, true)
  } catch {}

  cancelFlag = false
  job = { workId: work.id, total: audio.length, done: 0, bytes: 0, curRatio: 0, running: true, error: null }
  emit()

  const dirRel = String(work.id)
  const dir = ROOT + "/" + dirRel
  try {
    FileManager.createDirectorySync(dir, true)
  } catch {}

  const out: OfflineTrack[] = []
  let bytes = 0

  for (let i = 0; i < audio.length; i++) {
    if (cancelFlag || job == null) break
    const t = audio[i]
    const url = t.url ?? t.lowUrl
    if (url == null) continue
    const name = fileNameFor(t, i)
    const abs = dir + "/" + name
    if (job != null) job.curRatio = 0
    if (!FileManager.existsSync(abs)) {
      try {
        await downloadOne(url, abs, (got, expect) => {
          if (job != null) {
            job.bytes = bytes + got
            job.curRatio = expect > 0 ? Math.min(1, got / expect) : 0
            emit()
          }
        })
      } catch (e: any) {
        if (job != null) {
          job.running = false
          job.error = String(e?.message ?? e)
        }
        emit()
        return
      }
    }
    const sz = fileSize(abs)
    bytes += sz
    out.push({ key: t.key, title: t.title, duration: t.duration, file: dirRel + "/" + name, bytes: sz })
    if (job != null) {
      job.done = i + 1
      job.bytes = bytes
      job.curRatio = 0
      job.running = true
    }
    emit()
  }

  if (cancelFlag) {
    try {
      FileManager.removeSync(dir)
    } catch {}
    job = null
    cancelFlag = false
    emit()
    return
  }

  const entry: OfflineWork = {
    id: work.id,
    title: work.title,
    circle: work.circle,
    cover: work.cover,
    duration: work.duration,
    bytes,
    at: Date.now(),
    tracks: out,
  }
  index = [entry, ...index.filter((w) => w.id !== work.id)]
  persist()
  job = null
  emit()
}

export function cancelDownload() {
  cancelFlag = true
  try {
    currentTask?.cancel()
  } catch {}
  currentTask = null
}

export function removeOffline(workId: number) {
  index = index.filter((w) => w.id !== workId)
  persist()
  try {
    FileManager.removeSync(ROOT + "/" + workId)
  } catch {}
  if (job != null && job.workId === workId) job = null
  emit()
}

export function removeAllOffline() {
  index = []
  persist()
  try {
    FileManager.removeSync(ROOT)
  } catch {}
  job = null
  emit()
}
