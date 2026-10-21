import { library } from "./store"
import type { ListenRecord } from "./store"

export const NIGHT_HOURS = [22, 23, 0, 1, 2, 3]

export function fmtHM(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const hh = Math.floor(s / 3600)
  let h = hh
  let m = Math.round((s % 3600) / 60)
  if (m >= 60) {
    h += 1
    m = 0
  }
  if (h > 0) return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
  if (m > 0) return `${m} 分钟`
  return `${s} 秒`
}

export function fmtShort(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`
  return `${m}分`
}

export interface Totals {
  seconds: number
  nightSeconds: number
  nightRatio: number
  peakHour: number
  peakSeconds: number
  workCount: number
  trackCount: number
  playCount: number
  hours: number[]
}

export function totals(): Totals {
  const hours = library.hours.slice()
  const seconds = library.totalSeconds
  let night = 0
  for (const h of NIGHT_HOURS) night += hours[h] ?? 0
  let peakHour = 0
  let peakSeconds = 0
  for (let i = 0; i < 24; i++) {
    if ((hours[i] ?? 0) > peakSeconds) {
      peakSeconds = hours[i] ?? 0
      peakHour = i
    }
  }
  const records = library.tracks
  const workIds = new Set<number>()
  let plays = 0
  for (const r of records) {
    workIds.add(r.workId)
    plays += r.plays
  }
  return {
    seconds,
    nightSeconds: night,
    nightRatio: seconds > 0 ? night / seconds : 0,
    peakHour,
    peakSeconds,
    workCount: workIds.size,
    trackCount: records.length,
    playCount: plays,
    hours,
  }
}

export interface Bucket {
  name: string
  seconds: number
  works: number
  count: number
}

function push(map: Map<string, Bucket>, name: string, r: ListenRecord) {
  if (name.length === 0) return
  const found = map.get(name)
  if (found == null) {
    map.set(name, { name, seconds: r.seconds, works: 1, count: 1 })
  } else {
    found.seconds += r.seconds
    found.works += 1
  }
}

export function topCircles(limit: number): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of library.tracks) push(map, r.circle, r)
  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, limit)
}

export function topTags(limit: number): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of library.tracks) {
    for (const t of r.tags) push(map, t, r)
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, limit)
}

export function topVas(limit: number): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const r of library.tracks) {
    for (const v of r.vas) push(map, v, r)
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, limit)
}

export function topTracks(limit: number): ListenRecord[] {
  return library.tracks
    .slice()
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit)
}

export function topLoops(limit: number): ListenRecord[] {
  return library.tracks
    .slice()
    .sort((a, b) => b.plays - a.plays || b.seconds - a.seconds)
    .slice(0, limit)
}

export function hourLabel(h: number): string {
  return String(h).padStart(2, "0")
}
