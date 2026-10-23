import { Device, useEffect, useState, useColorScheme } from "scripting"
import type { Color, ColorScheme } from "scripting"

/** 一套配色。所有颜色都从 palette / usePalette 拿，不要写死。 */
export type Palette = {
  scheme: ColorScheme
  accent: Color
  accentText: Color
  accentSoft: Color
  onAccent: Color
  bg: Color
  card: Color
  cardHi: Color
  cardLo: Color
  sub: Color
  faint: Color
  text: Color
  subText: Color
  rowBg: Color
  rowBgHi: Color
  border: Color
  glassBg: Color
  /** 浮层/玻璃控件底：弹层、胶囊按钮、圆形返回键都用它。 */
  veil: Color
  chrome: Color
}

const DARK: Palette = {
  scheme: "dark",
  accent: "#FB7299",
  accentText: "#FF8FB3",
  accentSoft: "rgba(251, 114, 153, 0.16)",
  onAccent: "#FFFFFF",
  bg: "#120A10",
  card: "#18181B",
  cardHi: "#232327",
  cardLo: "#111113",
  sub: "rgba(235, 235, 245, 0.55)",
  faint: "rgba(235, 235, 245, 0.32)",
  text: "#FFFFFF",
  subText: "rgba(255, 255, 255, 0.86)",
  rowBg: "rgba(255, 255, 255, 0.085)",
  rowBgHi: "rgba(255, 255, 255, 0.13)",
  border: "rgba(255, 255, 255, 0.16)",
  glassBg: "rgba(255, 255, 255, 0.06)",
  veil: "rgba(44, 36, 46, 0.74)",
  chrome: "rgba(22, 15, 20, 0.80)",
}

const LIGHT: Palette = {
  scheme: "light",
  accent: "#FB7299",
  accentText: "#C2255E",
  accentSoft: "rgba(251, 114, 153, 0.20)",
  onAccent: "#FFFFFF",
  bg: "#EFEBEF",
  card: "#FFFFFF",
  cardHi: "#E7E0E7",
  cardLo: "#F7F4F7",
  sub: "rgba(20, 20, 24, 0.78)",
  faint: "rgba(20, 20, 24, 0.62)",
  text: "#0B0B0F",
  subText: "rgba(11, 11, 15, 0.90)",
  rowBg: "rgba(0, 0, 0, 0.05)",
  rowBgHi: "rgba(0, 0, 0, 0.085)",
  border: "rgba(0, 0, 0, 0.14)",
  glassBg: "rgba(255, 255, 255, 0.74)",
  veil: "rgba(255, 255, 255, 0.82)",
  chrome: "rgba(255, 255, 255, 0.88)",
}

/* ======================= 外观：模式 + 色调 ======================= */

export type ThemeMode = "system" | "light" | "dark"

export type AccentPreset = {
  key: string
  name: string
  /** 色相 0-360 */
  hue: number
  /** 饱和度 0-1 */
  sat: number
}

/** 预设色调。`pink` 就是原装那套，直接走 DARK/LIGHT，一个色值都不动。 */
export const ACCENTS: AccentPreset[] = [
  { key: "pink", name: "樱粉", hue: 344, sat: 0.95 },
  { key: "rose", name: "玫红", hue: 351, sat: 0.78 },
  { key: "coral", name: "珊瑚", hue: 8, sat: 0.84 },
  { key: "orange", name: "橘橙", hue: 28, sat: 0.88 },
  { key: "amber", name: "琥珀", hue: 42, sat: 0.86 },
  { key: "green", name: "森绿", hue: 148, sat: 0.60 },
  { key: "teal", name: "青碧", hue: 178, sat: 0.66 },
  { key: "blue", name: "海蓝", hue: 212, sat: 0.80 },
  { key: "indigo", name: "靛青", hue: 246, sat: 0.70 },
  { key: "purple", name: "紫罗兰", hue: 276, sat: 0.64 },
  { key: "gray", name: "石墨", hue: 220, sat: 0.07 },
]

/** 自定义色调在存储里的写法：「h:212」。 */
export const CUSTOM_PREFIX = "h:"

const MODE_KEY = "asmr.theme.mode"
const ACCENT_KEY = "asmr.theme.accent"

function readSetting<T>(key: string): T | null {
  try {
    const v = Storage.get<T>(key)
    return v === undefined ? null : v
  } catch {
    return null
  }
}

function writeSetting(key: string, value: string) {
  try {
    Storage.set(key, value)
  } catch {}
}

let mode: ThemeMode = (() => {
  const v = readSetting<string>(MODE_KEY)
  return v === "light" || v === "dark" || v === "system" ? v : "system"
})()

let accentRaw: string = readSetting<string>(ACCENT_KEY) ?? "pink"

const watchers = new Set<() => void>()

function announce() {
  for (const fn of watchers) fn()
}

export function themeMode(): ThemeMode {
  return mode
}

export function setThemeMode(m: ThemeMode) {
  if (m === mode) return
  mode = m
  writeSetting(MODE_KEY, m)
  announce()
}

/** 当前色调。`h:212` 这种自定义写法会被解析成预设形状。 */
export function currentAccent(): AccentPreset {
  if (accentRaw.startsWith(CUSTOM_PREFIX)) {
    const hue = Number(accentRaw.slice(CUSTOM_PREFIX.length))
    return {
      key: accentRaw,
      name: "自定义",
      hue: Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 344,
      sat: 0.74,
    }
  }
  return ACCENTS.find((a) => a.key === accentRaw) ?? ACCENTS[0]
}

export function accentKey(): string {
  return accentRaw
}

/** 传预设 key，或 `h:212` 这种自定义色相。 */
export function setAccent(key: string) {
  if (key === accentRaw) return
  accentRaw = key
  writeSetting(ACCENT_KEY, key)
  announce()
}

/* ---- 色彩派生 ---- */

function hsl(h: number, s: number, l: number, a = 1): Color {
  const hh = ((h % 360) + 360) % 360
  const ss = Math.max(0, Math.min(1, s))
  const ll = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hh < 60) {
    r = c
    g = x
  } else if (hh < 120) {
    r = x
    g = c
  } else if (hh < 180) {
    g = c
    b = x
  } else if (hh < 240) {
    g = x
    b = c
  } else if (hh < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const byte = (v: number) => Math.round((v + m) * 255)
  if (a >= 1) {
    return ("#" + [r, g, b].map((v) => byte(v).toString(16).padStart(2, "0")).join("")) as Color
  }
  return `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${a})` as Color
}

/** 换了色调之后，底色跟着色相走一点，不然只有按钮变色，整页还是原来那副样子。 */
function tinted(base: Palette, p: AccentPreset): Palette {
  const dark = base.scheme === "dark"
  const sat = p.sat
  const accentL = dark ? 0.66 : sat < 0.2 ? 0.44 : 0.56
  return {
    ...base,
    accent: hsl(p.hue, sat, accentL),
    accentText: dark ? hsl(p.hue, Math.min(1, sat + 0.12), 0.74) : hsl(p.hue, sat, sat < 0.2 ? 0.26 : 0.40),
    accentSoft: hsl(p.hue, sat, dark ? 0.64 : 0.58, dark ? 0.18 : 0.20),
    onAccent: "#FFFFFF",
    bg: dark ? hsl(p.hue, Math.min(0.34, sat * 0.46), 0.055) : hsl(p.hue, Math.min(0.15, sat * 0.22), 0.945),
    card: dark ? hsl(p.hue, Math.min(0.13, sat * 0.18), 0.10) : "#FFFFFF",
    cardHi: dark
      ? hsl(p.hue, Math.min(0.12, sat * 0.17), 0.145)
      : hsl(p.hue, Math.min(0.13, sat * 0.20), 0.895),
    cardLo: dark ? hsl(p.hue, Math.min(0.17, sat * 0.24), 0.065) : hsl(p.hue, Math.min(0.10, sat * 0.15), 0.965),
    veil: dark ? hsl(p.hue, 0.10, 0.16, 0.74) : base.veil,
    chrome: dark ? hsl(p.hue, 0.12, 0.085, 0.80) : base.chrome,
  }
}

export function palette(s: ColorScheme = Device.colorScheme, accent?: AccentPreset): Palette {
  const base = s === "dark" ? DARK : LIGHT
  const a = accent ?? currentAccent()
  return a.key === "pink" ? base : tinted(base, a)
}

/** 仅调试/预览用：强制指定配色，传 null 恢复跟随设置。 */
let schemeOverride: ColorScheme | null = null

export function setSchemeOverride(s: ColorScheme | null) {
  schemeOverride = s
}

/** 每页开头调一次。模式/色调一变，所有用它的地方一起重绘。 */
export function usePalette(): Palette {
  const sys = useColorScheme()
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = () => bump((n) => n + 1)
    watchers.add(fn)
    return () => {
      watchers.delete(fn)
    }
  }, [])
  const scheme: ColorScheme = schemeOverride ?? (mode === "system" ? sys : mode)
  return palette(scheme)
}

/* ---- 旧的固定色，仅作为兜底；新代码一律用 usePalette() ---- */
export const ACCENT = "#FB7299"
export const ACCENT_TEXT = "#FF8FB3"
export const ACCENT_SOFT = "rgba(251, 114, 153, 0.16)"
export const BG = "#120A10"
export const CARD = "#18181B"
export const CARD_HI = "#232327"
export const CARD_LO = "#111113"
export const SUB = "rgba(235, 235, 245, 0.55)"
export const FAINT = "rgba(235, 235, 245, 0.32)"

export function shape(radius = 16) {
  return { type: "rect" as const, cornerRadius: radius }
}

/** Liquid Glass。返回 Shape 传给 glassEffect —— 注意不能包成 {glass, shape}，
 * 那样 shape 会被忽略变成直角，而且 UIGlass.tint() 会让整个视图树白屏（已实测）。
 * 圆形要传 radius = 圆径/2。 */
export function glass(radius = 20) {
  return shape(radius)
}

export function glassCircle() {
  return "circle" as any
}

/** DLsite 的 RJ 号：老作品 6 位（RJ432317），新作品补到 8 位（RJ011712782）。 */
export function rjCode(id: number) {
  const d = String(id).replace(/\D/g, "")
  return "RJ" + (d.length >= 7 ? d.padStart(8, "0") : d)
}
