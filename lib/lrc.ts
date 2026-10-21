/** LRC 字幕解析。 */

export interface LrcCue {
  t: number
  text: string
}

const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(raw: string): LrcCue[] {
  const out: LrcCue[] = []
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const stamps: number[] = []
    STAMP.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = STAMP.exec(line)) != null) {
      const min = Number(m[1])
      const sec = Number(m[2])
      const frac = m[3] != null ? Number("0." + m[3]) : 0
      stamps.push(min * 60 + sec + frac)
    }
    if (stamps.length === 0) continue
    STAMP.lastIndex = 0
    const text = line.replace(STAMP, "").trim()
    if (text.length === 0) continue
    for (const t of stamps) out.push({ t, text })
  }
  out.sort((a, b) => a.t - b.t)
  return out
}

/** 解析 `01:23:45.678` / `23:45.678` 这种时间戳。 */
function stampToSec(s: string): number {
  const m = s.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/)
  if (m == null) return 0
  const h = m[1] != null ? Number(m[1]) : 0
  const min = Number(m[2])
  const sec = Number(m[3])
  const ms = Number((m[4] + "000").slice(0, 3))
  return h * 3600 + min * 60 + sec + ms / 1000
}

/** WebVTT / SRT：都是“一块一条，首行是 起始 --> 结束”。 */
export function parseTimedText(raw: string): LrcCue[] {
  const out: LrcCue[] = []
  const blocks = raw.replace(/\r/g, "").replace(/\uFEFF/g, "").split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0)
    const arrow = lines.findIndex((l) => l.includes("-->"))
    if (arrow < 0) continue
    const start = lines[arrow].split("-->")[0].trim()
    const text = lines
      .slice(arrow + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .replace(/\{[^}]*\}/g, "")
      .trim()
    if (text.length === 0) continue
    out.push({ t: stampToSec(start), text })
  }
  out.sort((a, b) => a.t - b.t)
  return out
}

/** 按扩展名（不认就猜）选解析器。 */
export function parseSubtitle(raw: string, name: string): LrcCue[] {
  const low = name.toLowerCase()
  if (low.endsWith(".lrc")) return parseLrc(raw)
  if (low.endsWith(".vtt") || low.endsWith(".srt")) return parseTimedText(raw)
  if (raw.includes("-->")) return parseTimedText(raw)
  return parseLrc(raw)
}

/** 返回当前时间所在字幕行的下标，没有则 -1。 */export function cueIndexAt(cues: LrcCue[], time: number): number {
  if (cues.length === 0) return -1
  let lo = 0
  let hi = cues.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cues[mid].t <= time + 0.15) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
