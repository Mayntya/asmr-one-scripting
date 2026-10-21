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

/** 返回当前时间所在字幕行的下标，没有则 -1。 */
export function cueIndexAt(cues: LrcCue[], time: number): number {
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
