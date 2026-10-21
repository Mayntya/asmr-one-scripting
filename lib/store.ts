import type { Work } from "./api"
import { fetchCloudFavorites, isLoggedIn, onWorksLoaded, pushCloudFavorite } from "./api"

export interface HistoryItem {
  work: Work
  trackTitle: string
  /** 上次播到的曲目，用于点击时直接续播 */
  trackKey?: string
  index?: number
  duration?: number
  at: number
}

export interface ListenRecord {
  key: string
  workId: number
  workTitle: string
  circle: string
  tags: string[]
  vas: string[]
  trackTitle: string
  cover: string
  seconds: number
  plays: number
  lastAt: number
}

export type LikeKind = "tag" | "cv" | "circle"

/** 收藏的标签 / CV / 社团。作品收藏单独在 favorites 里。 */
export interface LikedItem {
  kind: LikeKind
  value: string
  at: number
}

interface LibraryData {
  favorites: Work[]
  liked: LikedItem[]
  history: HistoryItem[]
  tracks: ListenRecord[]
  hours: number[]
  totalSeconds: number
  works: Work[]
  progress: Record<string, number>
}

function emptyData(): LibraryData {
  return {
    favorites: [],
    liked: [],
    history: [],
    tracks: [],
    hours: new Array(24).fill(0),
    totalSeconds: 0,
    works: [],
    progress: {},
  }
}

const FILE = FileManager.documentsDirectory + "asmr-library.json"

class Library {
  data: LibraryData = emptyData()
  private listeners = new Set<() => void>()
  private pending = 0

  constructor() {
    this.load()
  }

  private load() {
    try {
      if (!FileManager.existsSync(FILE)) return
      const raw = FileManager.readAsStringSync(FILE)
      const parsed = JSON.parse(raw)
      const base = emptyData()
      this.data = {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : base.favorites,
        liked: Array.isArray(parsed.liked)
          ? parsed.liked.filter(
              (it: any) =>
                it != null &&
                typeof it.value === "string" &&
                (it.kind === "tag" || it.kind === "cv" || it.kind === "circle")
            )
          : base.liked,
        history: Array.isArray(parsed.history) ? parsed.history : base.history,
        tracks: Array.isArray(parsed.tracks) ? parsed.tracks : base.tracks,
        hours:
          Array.isArray(parsed.hours) && parsed.hours.length === 24 ? parsed.hours.map((n: any) => Number(n) || 0) : base.hours,
        totalSeconds: Number(parsed.totalSeconds ?? 0) || 0,
        works: Array.isArray(parsed.works) ? parsed.works : [],
        progress: parsed.progress != null && typeof parsed.progress === "object" ? parsed.progress : {},
      }
    } catch {
      this.data = emptyData()
    }
  }

  private save(notify = true) {
    try {
      FileManager.writeAsStringSync(FILE, JSON.stringify(this.data))
    } catch {}
    if (notify) for (const fn of this.listeners) fn()
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  get favorites(): Work[] {
    return this.data.favorites
  }

  get history(): HistoryItem[] {
    return this.data.history
  }

  /* ---- 标签 / CV 收藏 ---- */

  get liked(): LikedItem[] {
    return this.data.liked
  }

  likedOf(kind: LikeKind): LikedItem[] {
    return this.data.liked.filter((it) => it.kind === kind)
  }

  isLiked(kind: LikeKind, value: string): boolean {
    return this.data.liked.some((it) => it.kind === kind && it.value === value)
  }

  /** 返回切换后的状态：true 表示现在已收藏。 */
  toggleLike(kind: LikeKind, value: string): boolean {
    const has = this.isLiked(kind, value)
    if (has) {
      this.data.liked = this.data.liked.filter((it) => !(it.kind === kind && it.value === value))
      this.save()
      return false
    }
    this.data.liked = [{ kind, value, at: Date.now() }, ...this.data.liked]
    this.save()
    return true
  }

  clearLiked(kind?: LikeKind) {
    this.data.liked = kind == null ? [] : this.data.liked.filter((it) => it.kind !== kind)
    this.save()
  }

  get tracks(): ListenRecord[] {
    return this.data.tracks
  }

  get hours(): number[] {
    return this.data.hours
  }

  get totalSeconds(): number {
    return this.data.totalSeconds
  }

  /** 浏览过的作品总集，标签页 / CV 页的数据源。 */
  get cachedWorks(): Work[] {
    return this.data.works
  }

  cacheWorks(list: Work[]) {
    if (list.length === 0) return
    const map = new Map<number, Work>()
    for (const w of this.data.works) map.set(w.id, w)
    let added = 0
    for (const w of list) {
      if (map.has(w.id)) continue
      map.set(w.id, w)
      added += 1
    }
    if (added === 0) return
    this.data.works = Array.from(map.values()).slice(-2500)
    this.save(false)
  }

  worksWithTag(tag: string): Work[] {
    return this.data.works.filter((w) => w.tags.indexOf(tag) >= 0)
  }

  worksWithCv(name: string): Work[] {
    return this.data.works.filter((w) => w.vas.indexOf(name) >= 0)
  }

  tagsOf(tag: string): number {
    return this.worksWithTag(tag).length
  }

  /** 上次听到哪里（秒）。 */
  trackProgress(key: string): number {
    const t = this.data.progress[key]
    return typeof t === "number" && isFinite(t) ? t : 0
  }

  setTrackProgress(key: string, seconds: number) {
    const old = this.data.progress[key] ?? -1
    if (Math.abs(old - seconds) < 2) return
    this.data.progress[key] = Math.max(0, seconds)
    this.save(false)
  }

  clearTrackProgress(key: string) {
    if (this.data.progress[key] == null) return
    delete this.data.progress[key]
    this.save(false)
  }

  get rawSize(): number {
    try {
      if (!FileManager.existsSync(FILE)) return 0
      return FileManager.readAsStringSync(FILE).length
    } catch {
      return 0
    }
  }

  isFavorite(id: number): boolean {
    return this.data.favorites.some((w) => w.id === id)
  }

  toggleFavorite(work: Work): boolean {
    if (this.isFavorite(work.id)) {
      this.data.favorites = this.data.favorites.filter((w) => w.id !== work.id)
      this.save()
      pushCloudFavorite([work.id], false)
      return false
    }
    this.data.favorites = [work, ...this.data.favorites]
    this.save()
    pushCloudFavorite([work.id], true)
    return true
  }

  /** 和服务端收藏夹双向对齐：云端有的收进来，本地有云端没的推上去。 */
  async syncCloud(): Promise<boolean> {
    if (!isLoggedIn()) return false
    try {
      const remote = await fetchCloudFavorites()
      const remoteIds = new Set(remote.map((w) => w.id))
      const local = this.data.favorites
      const localIds = new Set(local.map((w) => w.id))

      const merged = [...local]
      for (const w of remote) if (!localIds.has(w.id)) merged.push(w)
      this.data.favorites = merged
      this.save()

      const toPush = local.filter((w) => !remoteIds.has(w.id)).map((w) => w.id)
      if (toPush.length > 0) await pushCloudFavorite(toPush, true)
      return true
    } catch {
      return false
    }
  }

  pushHistory(work: Work, track: { title: string; key: string; duration?: number }, index: number) {
    this.data.history = [
      {
        work,
        trackTitle: track.title,
        trackKey: track.key,
        index,
        duration: track.duration ?? 0,
        at: Date.now(),
      },
      ...this.data.history.filter((h) => h.work.id !== work.id),
    ].slice(0, 80)
    this.save()
  }

  removeHistory(workId: number) {
    this.data.history = this.data.history.filter((h) => h.work.id !== workId)
    this.save()
  }

  clearHistory() {
    this.data.history = []
    this.save()
  }

  clearFavorites() {
    this.data.favorites = []
    this.save()
  }

  clearStats() {
    this.data.tracks = []
    this.data.hours = new Array(24).fill(0)
    this.data.totalSeconds = 0
    this.save()
  }

  /** 累加实际收听秒数。player 每秒调用，靠 pending 减少写盘次数。 */
  addListen(work: Work, trackTitle: string, trackKey: string, seconds: number) {
    if (seconds <= 0) return
    const hour = new Date().getHours()

    this.data.totalSeconds += seconds
    this.data.hours[hour] = (this.data.hours[hour] ?? 0) + seconds

    const found = this.data.tracks.find((t) => t.key === trackKey)
    if (found != null) {
      found.seconds += seconds
      found.lastAt = Date.now()
    } else {
      this.data.tracks = [
        {
          key: trackKey,
          workId: work.id,
          workTitle: work.title,
          circle: work.circle,
          tags: work.tags.slice(0, 12),
          vas: work.vas,
          trackTitle,
          cover: work.thumb,
          seconds,
          plays: 1,
          lastAt: Date.now(),
        },
        ...this.data.tracks,
      ]
    }

    this.pending += 1
    if (this.pending >= 12) {
      this.pending = 0
      this.save(false)
    }
  }

  /** 一首曲目开始播放时记一次播放次数。 */
  countPlay(trackKey: string) {
    const found = this.data.tracks.find((t) => t.key === trackKey)
    if (found != null) {
      found.plays += 1
      found.lastAt = Date.now()
      this.save(false)
    }
  }

  flush() {
    this.pending = 0
    this.save(false)
  }
}

export const library = new Library()

onWorksLoaded((list) => library.cacheWorks(list))
