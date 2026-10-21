/** 封面取色 → 四色 mesh 渐变背景。参考 BitChord / Apple Music 的 Now Playing。 */

export type Mesh = [string, string, string, string]

const FALLBACK: Mesh = ["#5B2A86", "#C2255E", "#3A4E8C", "#FB7299"]

const cache = new Map<string, Mesh>()
const inflight = new Map<string, Promise<Mesh>>()

type HSL = [number, number, number]

function rgbToHsl(r: number, g: number, b: number): HSL {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = Math.max(0, Math.min(1, s))
  const ll = Math.max(0, Math.min(1, l))
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const f = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    let v: number
    if (tt < 1 / 6) v = p + (q - p) * 6 * tt
    else if (tt < 1 / 2) v = q
    else if (tt < 2 / 3) v = p + (q - p) * (2 / 3 - tt) * 6
    else v = p
    return Math.round(v * 255)
  }
  const to2 = (n: number) => n.toString(16).padStart(2, "0")
  return `#${to2(f(hh + 1 / 3))}${to2(f(hh))}${to2(f(hh - 1 / 3))}`
}

/** 提饱和、压亮度，让任何封面都能出浓郁的 blob。 */
function tuned(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const [h, s, l] = rgbToHsl(r, g, b)
  return hslToHex(h, Math.min(0.86, s * 1.2 + 0.12), Math.max(0.36, Math.min(0.62, l)))
}

function near(a: HSL, b: HSL): boolean {
  const gap = Math.abs(a[0] - b[0])
  return Math.min(gap, 360 - gap) < 26 && Math.abs(a[2] - b[2]) < 0.1
}

function build(hexes: string[]): Mesh {
  const kept: { hex: string; hsl: HSL }[] = []
  for (const hex of hexes) {
    const hsl = rgbToHsl(
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255
    )
    if (kept.some((k) => near(k.hsl, hsl))) continue
    kept.push({ hex, hsl })
  }
  if (kept.length === 0) return FALLBACK

  const seed = kept.slice()
  let step = 1
  while (kept.length < 4) {
    const src = seed[kept.length % seed.length].hsl
    const hex = hslToHex(src[0] + 42 * step, Math.min(0.9, src[1] + 0.05 * step), Math.max(0.28, Math.min(0.64, src[2] + 0.14 * step)))
    kept.push({
      hex,
      hsl: rgbToHsl(
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255
      ),
    })
    step++
  }
  return [tuned(kept[0].hex), tuned(kept[1].hex), tuned(kept[2].hex), tuned(kept[3].hex)]
}

export function meshFor(url: string | undefined | null): Mesh {
  if (!url) return FALLBACK
  return cache.get(url) ?? FALLBACK
}

export function loadMesh(url: string | undefined | null): Promise<Mesh> {
  if (!url) return Promise.resolve(FALLBACK)
  const hit = cache.get(url)
  if (hit) return Promise.resolve(hit)
  const ongoing = inflight.get(url)
  if (ongoing) return ongoing

  const task = (async () => {
    try {
      const img = await UIImage.fromURL(url)
      if (img == null) return FALLBACK
      // 缩到 96px 再取色：够准，也够快。
      const small = img.preparingThumbnail({ width: 96, height: 96 }) ?? img
      const dom = small.dominantColors(12)
      const hexes = dom
        .filter((d) => d.color.alpha > 0.5)
        .sort((a, b) => b.fraction - a.fraction)
        .map((d) => d.color.hex.slice(0, 7))
      const mesh = build(hexes)
      cache.set(url, mesh)
      return mesh
    } catch {
      return FALLBACK
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, task)
  return task
}

/** 给 base 层用的深色底：取第一色的极暗版本。 */
export function deepBase(hex: string): `#${string}` {
  const [h, s, l] = rgbToHsl(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  )
  return hslToHex(h, Math.min(1, s * 0.9), Math.min(0.2, l * 0.5)) as `#${string}`
}
