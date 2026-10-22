import { Device, useColorScheme } from "scripting"
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

export function palette(s: ColorScheme = Device.colorScheme): Palette {
  return s === "dark" ? DARK : LIGHT
}

/** 仅调试/预览用：强制指定配色，传 null 恢复跟随系统。 */
let schemeOverride: ColorScheme | null = null

export function setSchemeOverride(s: ColorScheme | null) {
  schemeOverride = s
}

/** 跟随系统亮暗切换。每个渲染页/组件开头调一次。 */
export function usePalette(): Palette {
  const sys = useColorScheme()
  return palette(schemeOverride ?? sys)
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

export function rjCode(id: number) {
  return "RJ" + String(id).padStart(8, "0")
}
