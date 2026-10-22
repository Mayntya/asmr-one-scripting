import type { TrackNode, Work } from "./api"

/**
 * 离线缓存。文件放 App Group（不进 iCloud 同步，也不出现在「文件」App 里），
 * 索引只记相对路径，删掉目录就是彻底删除。
 *
 * 队列：一轨一个任务，最多同时跑 MAX_CONCURRENT 个，其余自动排队。
 */
const ROOT = FileManager.appGroupDocumentsDirectory + "/asmr-offline"
const INDEX_KEY = "asmr_offline_index"
const MAX_CONCURRENT = 3

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

export interface WorkProgress {
  workId: number
  title: string
  total: number
  done: number
  running: number
  queued: number
}

interface Task {
  id: string
  workId: number
  key: string
  title: string
  duration: number
  url: string
  dest: string
  rel: string
  state: "queued" | "running"
  ratio: number
  work: Work
  cancel: () => void
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
let tasks: Task[] = []
let batches = new Map<number, { title: string; total: number; done: number }>()
let lastError: { workId: number; message: string } | null = null
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

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function offlineList(): OfflineWork[] {
  return index.slice().sort((a, b) => b.at - a.at)
}

export function offlineOf(workId: number): OfflineWork | null {
  return index.find((w) => w.id === workId) ?? null
}

export function offlineBytes(): number {
  return index.reduce((n, w) => n + w.bytes, 0)
}

export function isOffline(workId: number): boolean {
  return offlineOf(workId) != null
}

/** 重新读一遍索引（外部改过存储后用）。 */
export function refreshOffline() {
  index = readIndex()
  emit()
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

export function isTrackOffline(workId: number, trackKey: string): boolean {
  return offlinePath(workId, trackKey) != null
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

/** 音频取真实扩展名；mp4 这类视频也照实返回，别冒充 mp3。 */
export function audioExt(title: string): string {
  const m = title.match(/\.([a-z0-9]{1,5})$/i)
  return m != null ? m[1].toLowerCase() : "mp3"
}

export const AUDIO_EXTS = ["mp3", "wav", "flac", "m4a", "ogg", "opus", "aac", "ape"]

function isAudioExt(ext: string): boolean {
  return AUDIO_EXTS.includes(ext)
}

function fileNameFor(track: TrackNode): string {
  const base = track.key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)
  return `${base}.${audioExt(track.title)}`
}

/** ——— 版本分组：目录 × 格式，用来让用户挑着下 ——— */

export interface DlGroup {
  id: string
  /** 目录路径，根目录为空串 */
  dir: string
  ext: string
  tracks: TrackNode[]
  bytes: number
  duration: number
  /** 是不是真音频（mp4 之类算 false，默认不选） */
  audio: boolean
}

export function groupTracks(nodes: TrackNode[]): DlGroup[] {
  const map = new Map<string, DlGroup>()
  const walk = (ns: TrackNode[], path: string[]) => {
    for (const n of ns) {
      if (n.type === "folder") {
        walk(n.children, [...path, n.title])
      } else if (n.type === "audio" && (n.url != null || n.lowUrl != null)) {
        const ext = audioExt(n.title)
        const dir = normDir(path).join(" / ")
        const id = dir + "|" + ext
        let g = map.get(id)
        if (g == null) {
          g = { id, dir, ext, tracks: [], bytes: 0, duration: 0, audio: isAudioExt(ext) }
          map.set(id, g)
        }
        g.tracks.push(n)
        g.bytes += n.size ?? 0
        g.duration += n.duration ?? 0
      }
    }
  }
  walk(nodes, [])
  return [...map.values()]
}

/** 目录层里任何一段只要是在说格式（/mp3、/1_wav、/2_mp3、/音声（WAV））就剔掉，
 *  否则同一内容的 mp3 / wav 两套会被当成两个不同版本。 */
const FMT_WORD = /(mp3|wav|flac|m4a|ogg|aac|opus|ape)/i

function normDir(path: string[]): string[] {
  return path.filter((p) => !(p.length <= 14 && FMT_WORD.test(p)))
}

/** ——— 队列 ——— */

function downloadOne(
  url: string,
  dest: string,
  onProgress: (got: number, expect: number) => void,
  onCancelable: (cancel: () => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let task: URLSessionDownloadTask
    try {
      task = BackgroundURLSession.startDownload({ url, destination: dest, headers: {} })
    } catch (e: any) {
      reject(e)
      return
    }
    onCancelable(() => {
      try {
        task.cancel()
      } catch {}
    })
    let lastPush = 0
    task.onProgress = (d) => {
      const now = Date.now()
      if (now - lastPush < 200) return
      lastPush = now
      onProgress(d.totalBytesWritten, d.totalBytesExpectedToWrite)
    }
    task.onFinishDownload = (err, details) => {
      if (err != null) reject(err)
      else if (details.destination == null) reject(new Error("下载未落盘"))
      else resolve()
    }
    task.resume()
  })
}

function upsertTrack(work: Work, t: { key: string; title: string; duration: number; rel: string }, bytes: number) {
  let e = index.find((w) => w.id === work.id)
  if (e == null) {
    e = {
      id: work.id,
      title: work.title,
      circle: work.circle,
      cover: work.cover,
      duration: work.duration,
      bytes: 0,
      at: Date.now(),
      tracks: [],
    }
    index = [e, ...index]
  }
  e.tracks = [
    ...e.tracks.filter((x) => x.key !== t.key),
    { key: t.key, title: t.title, duration: t.duration, file: t.rel, bytes },
  ]
  e.bytes = e.tracks.reduce((n, x) => n + x.bytes, 0)
  e.at = Date.now()
  persist()
}

function runningCount(): number {
  return tasks.reduce((n, t) => (t.state === "running" ? n + 1 : n), 0)
}

function pump() {
  for (const t of tasks) {
    if (runningCount() >= MAX_CONCURRENT) break
    if (t.state === "queued") start(t)
  }
}

function finishTask(task: Task) {
  tasks = tasks.filter((t) => t.id !== task.id)
  const b = batches.get(task.workId)
  if (b != null) {
    b.done += 1
    if (b.done >= b.total) batches.delete(task.workId)
  }
  emit()
  pump()
}

function start(task: Task) {
  task.state = "running"
  task.ratio = 0
  emit()
  downloadOne(
    task.url,
    task.dest,
    (got, expect) => {
      task.ratio = expect > 0 ? Math.min(1, got / expect) : 0
      emit()
    },
    (cancel) => {
      task.cancel = cancel
    }
  )
    .then(() => {
      const sz = fileSize(task.dest)
      upsertTrack(task.work, task, sz)
      finishTask(task)
    })
    .catch((e: any) => {
      // 已经在 tasks 里被移除的，就是用户主动取消，不报错
      if (!tasks.some((t) => t.id === task.id)) {
        pump()
        return
      }
      lastError = { workId: task.workId, message: String(e?.message ?? e) }
      finishTask(task)
    })
}

function makeDir(workId: number) {
  try {
    if (!FileManager.existsSync(ROOT)) FileManager.createDirectorySync(ROOT, true)
    const dir = ROOT + "/" + workId
    if (!FileManager.existsSync(dir)) FileManager.createDirectorySync(dir, true)
  } catch {}
}

/** 入队一批曲目，返回真正加进去的数量。 */
export function enqueueTracks(work: Work, tracks: TrackNode[]): number {
  lastError = null
  const pending: TrackNode[] = []
  for (const t of tracks) {
    if ((t.url ?? t.lowUrl) == null) continue
    if (isTrackOffline(work.id, t.key)) continue
    if (tasks.some((x) => x.workId === work.id && x.key === t.key)) continue
    pending.push(t)
  }
  if (pending.length === 0) return 0
  makeDir(work.id)

  const b = batches.get(work.id) ?? { title: work.title, total: 0, done: 0 }
  b.total += pending.length
  batches.set(work.id, b)

  for (const t of pending) {
    const name = fileNameFor(t)
    const rel = String(work.id) + "/" + name
    tasks.push({
      id: `${work.id}:${t.key}`,
      workId: work.id,
      key: t.key,
      title: t.title,
      duration: t.duration ?? 0,
      url: (t.url ?? t.lowUrl) as string,
      dest: ROOT + "/" + rel,
      rel,
      state: "queued",
      ratio: 0,
      work,
      cancel: () => {},
    })
  }
  emit()
  pump()
  return pending.length
}

export function enqueueTrack(work: Work, track: TrackNode): number {
  return enqueueTracks(work, [track])
}

export function cancelTrack(workId: number, key: string) {
  const t = tasks.find((x) => x.workId === workId && x.key === key)
  if (t == null) return
  t.cancel()
  tasks = tasks.filter((x) => x !== t)
  const b = batches.get(workId)
  if (b != null) {
    b.done += 1
    if (b.done >= b.total) batches.delete(workId)
  }
  emit()
  pump()
}

export function cancelWork(workId: number) {
  const hit = tasks.filter((x) => x.workId === workId)
  if (hit.length === 0) return
  for (const t of hit) t.cancel()
  tasks = tasks.filter((x) => x.workId !== workId)
  batches.delete(workId)
  emit()
  pump()
}

export function taskOf(workId: number, key: string): { state: "queued" | "running"; ratio: number } | null {
  const t = tasks.find((x) => x.workId === workId && x.key === key)
  return t == null ? null : { state: t.state, ratio: t.ratio }
}

export function workProgress(workId: number): WorkProgress | null {
  const b = batches.get(workId)
  if (b == null) return null
  const mine = tasks.filter((t) => t.workId === workId)
  return {
    workId,
    title: b.title,
    total: b.total,
    done: b.done,
    running: mine.reduce((n, t) => (t.state === "running" ? n + 1 : n), 0),
    queued: mine.reduce((n, t) => (t.state === "queued" ? n + 1 : n), 0),
  }
}

export function activeJobs(): WorkProgress[] {
  const out: WorkProgress[] = []
  for (const [workId, b] of batches) {
    const mine = tasks.filter((t) => t.workId === workId)
    out.push({
      workId,
      title: b.title,
      total: b.total,
      done: b.done,
      running: mine.reduce((n, t) => (t.state === "running" ? n + 1 : n), 0),
      queued: mine.reduce((n, t) => (t.state === "queued" ? n + 1 : n), 0),
    })
  }
  return out
}

export function lastDownloadError(): { workId: number; message: string } | null {
  return lastError
}

export function removeTrack(workId: number, key: string) {
  const w = index.find((x) => x.id === workId)
  if (w == null) return
  const t = w.tracks.find((x) => x.key === key)
  if (t == null) return
  try {
    FileManager.removeSync(ROOT + "/" + t.file)
  } catch {}
  w.tracks = w.tracks.filter((x) => x.key !== key)
  w.bytes = w.tracks.reduce((n, x) => n + x.bytes, 0)
  if (w.tracks.length === 0) index = index.filter((x) => x.id !== workId)
  persist()
  emit()
}

export function removeOffline(workId: number) {
  cancelWork(workId)
  index = index.filter((w) => w.id !== workId)
  persist()
  try {
    FileManager.removeSync(ROOT + "/" + workId)
  } catch {}
  emit()
}

export function removeAllOffline() {
  for (const t of tasks) t.cancel()
  tasks = []
  batches = new Map()
  index = []
  persist()
  try {
    FileManager.removeSync(ROOT)
  } catch {}
  emit()
}
