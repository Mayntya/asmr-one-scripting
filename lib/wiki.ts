/**
 * J-ASMR Wiki（j-asmr-wiki.com/zh）数据源。
 *
 * 站内是 Next.js SSR，中文标题 / AI 中文简介 / 编辑理由都在 HTML 里，
 * 没有公开 API，所以直接抓 HTML 正则解析。全部结果落磁盘缓存，
 * 作品条目大量可能不存在（站里只收了一千部左右），命中与否都缓存。
 */
import { fetch } from "scripting"

const HOST = "https://www.j-asmr-wiki.com"

/** 脚本运行环境（scripting-ts run）下没有 FileManager，退回内存缓存。 */
function rootDir(): string | null {
  try {
    const fm: any = FileManager as any
    const dir = fm?.appGroupDocumentsDirectory
    return typeof dir === "string" && dir.length > 0 ? dir + "/asmr-wiki" : null
  } catch {
    return null
  }
}

const memCache = new Map<string, any>()

const DAY = 86400_000
const WORK_TTL = 30 * DAY
const MISS_TTL = 3 * DAY
const COLL_TTL = 1 * DAY
const INDEX_TTL = 6 * 3600_000

export interface WikiWork {
  rj: string
  /** 中文标题 */
  title: string
  /** 原文（日文）标题，用于对照 */
  jpTitle: string
  /** 中文简介 */
  desc: string
  /** 编辑列出的看点 */
  highlights: string[]
  format: string
  size: string
  r18: boolean
  saved: number
}

export interface WikiCollection {
  slug: string
  title: string
  blurb: string
  count: number
  saved: number
}

export interface WikiPick {
  rj: string
  title: string
  why: string
}

export interface WikiCollectionDetail {
  slug: string
  title: string
  intro: string
  picks: WikiPick[]
  saved: number
}

function readCache<T>(file: string, ttl: number): T | null {
  try {
    const dir = rootDir()
    const obj: any = dir == null ? memCache.get(file) : (() => {
      const path = dir + "/" + file
      if (!FileManager.existsSync(path)) return null
      return JSON.parse(FileManager.readAsStringSync(path))
    })()
    if (obj == null) return null
    if (typeof obj.saved !== "number" || Date.now() - obj.saved > ttl) return null
    return obj as T
  } catch {
    return null
  }
}

function writeCache(file: string, obj: any) {
  try {
    const dir = rootDir()
    if (dir == null) {
      memCache.set(file, obj)
      return
    }
    if (!FileManager.existsSync(dir)) FileManager.createDirectorySync(dir, true)
    FileManager.writeAsStringSync(dir + "/" + file, JSON.stringify(obj))
  } catch {
    memCache.set(file, obj)
  }
}

/** Wikitext 里全是实体，统一在这里还原。 */
function decode(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function getHtml(path: string): Promise<string | null> {
  try {
    const res = await fetch(HOST + path, {
      headers: {
        Accept: "text/html",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/** 本地作品 id（432317）↔ DLsite RJ 号（RJ432317）。 */
export function workRj(id: number | string): string {
  const d = String(id).replace(/\D/g, "")
  // DLsite：老作品 6 位（RJ432317），新作品 8 位（RJ011712782）
  return "RJ" + (d.length >= 7 ? d.padStart(8, "0") : d)
}

export function rjText(rj: string): string {
  return rj.toUpperCase()
}

/** 站内正文只保留 <main> 之前的那一段就够，减小误匹配。 */
function bodyOf(html: string): string {
  const cut = html.indexOf("<footer")
  const s = html.indexOf("<main")
  if (s < 0) return html
  return html.slice(s, cut > s ? cut : undefined)
}

export async function fetchWikiWork(rj: string): Promise<WikiWork | null> {
  const key = rjText(rj)
  const cacheName = `work-${key}.json`
  const cached = readCache<WikiWork>(cacheName, WORK_TTL)
  if (cached) return cached.rj.length > 0 ? cached : null
  const miss = readCache<WikiWork>(cacheName, MISS_TTL)
  if (miss) return null
  const html = await getHtml(`/zh/works/${key}`)
  if (html == null) return null

  const body = bodyOf(html)
  const h1 = /<h1 class="text-3xl[^"]*">([\s\S]*?)<\/h1>/.exec(body)
  if (!h1) {
    writeCache(cacheName, { rj: "", saved: Date.now() })
    return null
  }

  const jp = /<h1 class="text-3xl[\s\S]*?<\/h1>\s*<p class="mt-1[^"]*">([\s\S]*?)<\/p>/.exec(body)
  const desc = /关于本作品<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(body)
  const ul = /您会喜欢的理由<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/.exec(body)
  const flat = body.replace(/<!--[\s\S]*?-->/g, "")
  const fmt = /格式:\s*([^<]+)<\/span>/.exec(flat)
  const size = /大小:\s*([^<]+)<\/span>/.exec(flat)

  const highlights: string[] = []
  if (ul) {
    const re = /<li[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/li>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(ul[1])) && highlights.length < 6) {
      const t = decode(m[1])
      if (t.length > 0) highlights.push(t)
    }
  }

  const work: WikiWork = {
    rj: key,
    title: decode(h1[1]),
    jpTitle: jp ? decode(jp[1]) : "",
    desc: desc ? decode(desc[1]) : "",
    highlights,
    format: fmt ? decode(fmt[1]) : "",
    size: size ? decode(size[1]) : "",
    r18: /R18<\/?span|>R18</.test(body),
    saved: Date.now(),
  }
  writeCache(cacheName, work)
  return work
}

export async function fetchCollections(): Promise<WikiCollection[]> {
  const cached = readCache<{ items: WikiCollection[]; saved: number }>("collections.json", INDEX_TTL)
  if (cached) return cached.items

  const html = await getHtml("/zh/features")
  if (html == null) return []

  const items: WikiCollection[] = []
  // 卡片：<a href="/zh/features/<slug>">…</a>，里面带标题与摘要
  const re = /<a[^>]+href="\/zh\/features\/([a-z0-9-]+)"[\s\S]*?<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const slug = m[1]
    if (items.some((it) => it.slug === slug)) continue
    const block = m[0]
    const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(block)
    const p = /<p[^>]*>([\s\S]*?)<\/p>/.exec(block)
    const cnt = /(\d+)\s*部作品/.exec(block.replace(/<[^>]+>/g, " "))
    if (!h3) continue
    const count = cnt ? Number(cnt[1]) : 0
    if (count === 0) continue
    items.push({
      slug,
      title: decode(h3[1]),
      blurb: p ? decode(p[1]) : "",
      count,
      saved: 0,
    })
  }
  writeCache("collections.json", { items, saved: Date.now() })
  return items
}

export async function fetchCollection(slug: string): Promise<WikiCollectionDetail | null> {
  const cacheName = `col-${slug}.json`
  const cached = readCache<WikiCollectionDetail>(cacheName, COLL_TTL)
  if (cached) return cached

  const html = await getHtml(`/zh/features/${slug}`)
  if (html == null) return null
  const body = bodyOf(html)

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(body)
  if (!h1) return null

  // 每部作品都带一个 /zh/works/RJxxxx 链接，随后是「为何推荐」段落。
  const picks: WikiPick[] = []
  const seen = new Set<string>()
  const linkRe = /<a[^>]+href="\/zh\/works\/(RJ[0-9A-Z]+)"/g
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(body))) {
    const rj = m[1].toUpperCase()
    if (seen.has(rj)) continue
    seen.add(rj)
    const after = body.slice(m.index, m.index + 3000)
    const why = /为何推荐<\/h4>\s*<div[^>]*>([\s\S]*?)<\/div>/.exec(after)
    const h3s: string[] = []
    const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/g
    let h3m: RegExpExecArray | null
    while ((h3m = h3Re.exec(after))) {
      const t = decode(h3m[1]).replace(/^#\d+\.\s*/, "")
      if (t.length > 0) h3s.push(t)
    }
    const title = h3s.find((t) => !t.startsWith("Best for")) ?? ""
    picks.push({ rj, title, why: why ? decode(why[1]).replace(/^["“]+/, "").replace(/["”]+$/, "").trim() : "" })
  }

  const detail: WikiCollectionDetail = {
    slug,
    title: decode(h1[1]),
    intro: "",
    picks,
    saved: Date.now(),
  }
  writeCache(cacheName, detail)
  return detail
}
