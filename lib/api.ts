import { fetch } from "scripting"

/** asmr.one 主站 + 三条镜像网关，接口完全同构，音频同一个 CDN。 */
export const API_HOSTS = [
  "https://api.asmr.one",
  "https://api.asmr-300.com",
  "https://api.asmr-200.com",
  "https://api.asmr-100.com",
]

const HOST_KEY = "asmr_client_api_host"

let hostIdx = 0
try {
  const saved = Storage.get<number>(HOST_KEY)
  if (typeof saved === "number" && saved >= 0 && saved < API_HOSTS.length) hostIdx = saved
} catch {}

export function apiHost(): string {
  return API_HOSTS[hostIdx]
}

export function apiHostIndex(): number {
  return hostIdx
}

export function setApiHostIndex(i: number) {
  if (i < 0 || i >= API_HOSTS.length) return
  hostIdx = i
  try {
    Storage.set(HOST_KEY, i)
  } catch {}
}

/** ——— 账号 ——— */
const TOKEN_KEY = "asmr_client_token"
const NAME_KEY = "asmr_client_user"

let token: string | null = null
let userName: string | null = null
try {
  token = Storage.get<string>(TOKEN_KEY) ?? null
  userName = Storage.get<string>(NAME_KEY) ?? null
} catch {}

let authListeners: (() => void)[] = []

export function authToken(): string | null {
  return token
}

export function authUser(): string | null {
  return userName
}

export function isLoggedIn(): boolean {
  return token != null
}

export function onAuthChange(cb: () => void): () => void {
  authListeners.push(cb)
  return () => {
    authListeners = authListeners.filter((f) => f !== cb)
  }
}

function emitAuth() {
  for (const f of authListeners) {
    try {
      f()
    } catch {}
  }
}

/** 登录挂在 POST /api/auth/me 上（Kikoeru 那套的怪设计），body 是 name + password。 */
export async function loginAccount(name: string, password: string): Promise<string> {
  const res = await fetch(apiHost() + "/api/auth/me", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "" },
    body: JSON.stringify({ name, password }),
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  if (!res.ok) throw new Error(String(json?.error ?? json?.message ?? "登录失败 " + res.status))
  const tk = json?.token
  if (typeof tk !== "string" || tk.length < 10) throw new Error("服务端没给 token")
  token = tk
  userName = String(json?.user?.name ?? name)
  try {
    Storage.set(TOKEN_KEY, token)
    Storage.set(NAME_KEY, userName)
  } catch {}
  emitAuth()
  return userName
}

export function logoutAccount() {
  token = null
  userName = null
  try {
    Storage.remove(TOKEN_KEY)
    Storage.remove(NAME_KEY)
  } catch {}
  emitAuth()
}

/** 开机验一下 token 还算不算数。 */
export async function refreshAccount(): Promise<string | null> {
  if (token == null) return null
  try {
    const json = await apiFetch("/api/auth/me")
    if (json?.user?.loggedIn === true) {
      userName = String(json.user.name ?? userName ?? "")
      try {
        Storage.set(NAME_KEY, userName)
      } catch {}
      emitAuth()
      return userName
    }
    logoutAccount()
    return null
  } catch {
    return userName
  }
}

/** 拿不到就自动换下一路，成功的那一路会被记住。 */
async function apiFetch(path: string): Promise<any> {
  let lastErr: any = null
  for (let attempt = 0; attempt < API_HOSTS.length; attempt++) {
    const i = (hostIdx + attempt) % API_HOSTS.length
    const headers: Record<string, string> = { Accept: "application/json" }
    if (token != null) headers.Authorization = "Bearer " + token
    try {
      const res = await fetch(API_HOSTS[i] + path, { headers })
      if (!res.ok) throw new Error("HTTP " + res.status)
      const json = await res.json()
      if (i !== hostIdx) setApiHostIndex(i)
      return json
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error("连不上服务器，检查一下网络")
}

export { apiFetch }

export interface Work {
  id: number
  title: string
  circle: string
  vas: string[]
  tags: string[]
  duration: number
  nsfw: boolean
  rate: number
  rateCount: number
  dlCount: number
  release: string
  cover: string
  thumb: string
  samCover: string
}

export interface TrackNode {
  key: string
  title: string
  type: "folder" | "audio" | "image" | "other"
  duration: number
  url?: string
  lowUrl?: string
  size?: number
  children: TrackNode[]
}

function mapWork(w: any): Work {
  return {
    id: Number(w.id),
    title: String(w.title ?? ""),
    circle: String(w.circle?.name ?? ""),
    vas: (w.vas ?? []).map((v: any) => String(v.name)),
    tags: (w.tags ?? []).map((t: any) => String(t.i18n?.["zh-cn"]?.name ?? t.name)),
    duration: Number(w.duration ?? 0),
    nsfw: w.nsfw === true,
    rate: Number(w.rate_average_2dp ?? 0),
    rateCount: Number(w.rate_count ?? 0),
    dlCount: Number(w.dl_count ?? 0),
    release: String(w.release ?? ""),
    cover: `${apiHost()}/api/cover/${w.id}.jpg?type=main`,
    thumb: `${apiHost()}/api/cover/${w.id}.jpg?type=240x240`,
    samCover: `${apiHost()}/api/cover/${w.id}.jpg?type=sam`,
  }
}

export interface SearchResult {
  works: Work[]
  total: number
  page: number
}

export type SortKey = "release" | "dl_count" | "rating"

/** 每次拿到作品列表时通知外部（本地标签/CV 索引靠这个积累）。 */
let worksSink: ((list: Work[]) => void) | null = null

export function onWorksLoaded(cb: (list: Work[]) => void) {
  worksSink = cb
}

function emitWorks(list: Work[]) {
  if (worksSink == null || list.length === 0) return
  try {
    worksSink(list)
  } catch {}
}

export async function searchWorks(
  keyword: string,
  page: number,
  order: SortKey = "release",
  pageSize = 20
): Promise<SearchResult> {
  const kw = keyword.trim()
  const tail = `order=${order}&sort=desc&page=${page}&pageSize=${pageSize}`
  const path =
    kw.length === 0
      ? `/api/works?${tail}`
      : `/api/search/${encodeURIComponent(kw)}?${tail}&includeTranslationWorks=true`
  const json: any = await apiFetch(path)
  const works: Work[] = (json.works ?? []).map(mapWork)
  emitWorks(works)
  return {
    works,
    total: Number(json.pagination?.totalCount ?? 0),
    page,
  }
}

export async function getTracks(workId: number): Promise<TrackNode[]> {
  const json: any = await apiFetch(`/api/tracks/${workId}`)

  let seq = 0
  const map = (n: any): TrackNode => {
    seq += 1
    const type =
      n.type === "folder" ? "folder" : n.type === "audio" ? "audio" : n.type === "image" ? "image" : "other"
    return {
      key: String(n.hash ?? `n${seq}`),
      title: String(n.title ?? ""),
      type,
      duration: Number(n.duration ?? 0),
      url: n.mediaStreamUrl ? String(n.mediaStreamUrl) : undefined,
      lowUrl: n.streamLowQualityUrl ? String(n.streamLowQualityUrl) : undefined,
      size: Number(n.size ?? 0),
      children: (n.children ?? []).map(map),
    }
  }

  return (json ?? []).map(map)
}

export function flattenAudio(nodes: TrackNode[]): TrackNode[] {
  const out: TrackNode[] = []
  for (const n of nodes) {
    if (n.type === "folder") out.push(...flattenAudio(n.children))
    else if (n.type === "audio" && n.url) out.push(n)
  }
  return out
}

/** 字幕文件扩展名。 */
const SUB_EXT = /\.(lrc|srt|vtt|ass)$/i

function stripExt(title: string): string {
  return title.replace(/\.[^.]+$/, "").trim().toLowerCase()
}

/** 多语言目录里挑一份：简体 > 裸目录 > 繁体 > 英日。 */
function langScore(path: string): number {
  const p = path.toLowerCase()
  if (/简体|簡体|简中|chs|zh-cn|zh-hans/.test(p)) return 3
  if (/繁體|繁体|cht|zh-tw|zh-hant/.test(p)) return 1
  if (/english|英文|japanese|日本語|\.ja\.|\.en\./.test(p)) return 0
  return 2
}

interface NodeHit {
  node: TrackNode
  dir: string
}

function collect(nodes: TrackNode[], dir: string, kind: "audio" | "sub", out: NodeHit[]) {
  for (const n of nodes) {
    if (n.type === "folder") {
      collect(n.children, dir + n.title + "/", kind, out)
    } else if (kind === "audio") {
      if (n.type === "audio" && n.url != null) out.push({ node: n, dir })
    } else if (SUB_EXT.test(n.title) && n.url != null) {
      out.push({ node: n, dir })
    }
  }
}

/**
 * 给某一轨找它自己的字幕。asmr.one 上是**每轨一份**，常见命名：
 * `1.序章.mp3` ↔ `1.序章.mp3.vtt`，或与音频同名的 `1.序章.lrc`
 * （字幕常放在 LRC/ 、字幕（机翻）/ 之类另一层目录里）。
 */
export function pickSubtitle(nodes: TrackNode[], track: TrackNode): TrackNode | null {
  const subs: NodeHit[] = []
  collect(nodes, "", "sub", subs)
  if (subs.length === 0) return null
  const audios: NodeHit[] = []
  collect(nodes, "", "audio", audios)

  const self = audios.find((a) => a.node.key === track.key) ?? audios.find((a) => a.node.title === track.title)
  const dir = self != null ? self.dir : ""
  const tTitle = track.title.toLowerCase()
  const tBase = stripExt(track.title)

  let best: NodeHit | null = null
  let bestScore = -1e9
  for (const s of subs) {
    const name = s.node.title.toLowerCase()
    let score = 0
    if (name === tTitle || name.startsWith(tTitle + ".")) score += 20
    else if (tBase !== "" && stripExt(s.node.title) === tBase) score += 16
    if (dir !== "" && s.dir === dir) score += 5
    score += langScore(s.dir + s.node.title) * 0.1
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }

  if (best != null && bestScore >= 16) return best.node

  // 名字完全对不上（逐轨命名各异时）：按同目录顺序对齐
  const inDir = audios.filter((a) => a.dir === dir)
  const i = self != null ? inDir.findIndex((a) => a.node.key === (self as NodeHit).node.key) : -1
  if (i >= 0) {
    const sameDirSubs = subs.filter((s) => s.dir === dir)
    if (i < sameDirSubs.length) return sameDirSubs[i].node
    if (i < subs.length) return subs[i].node
  }
  return best != null && bestScore > 0 ? best.node : subs[0].node
}

/** 拉文本资源（字幕用）。 */
export async function fetchText(url: string): Promise<string> {
  const headers: Record<string, string> = {}
  if (token != null) headers["Authorization"] = "Bearer " + token
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error("HTTP " + res.status)
  return await res.text()
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => (n < 10 ? "0" + n : String(n))
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

/** ——— 云端收藏（asmr.one 的 __SYS_PLAYLIST_MARKED） ——— */

let markPlaylistId: string | null = null

async function defaultMarkPlaylistId(): Promise<string> {
  if (markPlaylistId != null) return markPlaylistId
  const json: any = await apiFetch("/api/playlist/get-default-mark-target-playlist")
  const id = String(json?.id ?? "")
  if (id.length < 10) throw new Error("拿不到收藏夹 id")
  markPlaylistId = id
  return id
}

/** 拉服务端全部收藏。未登录返回空数组。 */
export async function fetchCloudFavorites(): Promise<Work[]> {
  if (token == null) return []
  const pid = await defaultMarkPlaylistId()
  const out: Work[] = []
  for (let page = 1; page <= 20; page++) {
    const json: any = await apiFetch(`/api/playlist/get-playlist-works?id=${pid}&page=${page}&pageSize=100`)
    const works: any[] = Array.isArray(json?.works) ? json.works : []
    for (const w of works) out.push(mapWork(w))
    const total = Number(json?.pagination?.totalCount ?? 0)
    if (works.length === 0 || out.length >= total) break
  }
  emitWorks(out)
  return out
}

/** 把收藏变更推回服务端。失败不抛，只是返回 false。 */
export async function pushCloudFavorite(ids: number[], add: boolean): Promise<boolean> {
  if (token == null || ids.length === 0) return false
  try {
    const pid = await defaultMarkPlaylistId()
    const path = add ? "/api/playlist/add-works-to-playlist" : "/api/playlist/remove-works-from-playlist"
    const res = await fetch(apiHost() + path, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ id: pid, works: ids }),
    })
    return res.ok
  } catch {
    return false
  }
}
