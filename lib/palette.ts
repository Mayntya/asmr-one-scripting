/** 标签 / CV 的稳定配色：同一个名字永远是同一个颜色。 */

export interface Tone {
  fg: any
  bg: any
  /** 亮色主题下的深色字 */
  fgLight: any
  bgLight: any
}

function t(fg: string, fgLight: string): Tone {
  return {
    fg,
    bg: toRgba(fg, 0.16),
    fgLight,
    bgLight: toRgba(fgLight, 0.12),
  }
}

function toRgba(hex: string, a: number) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const TONES: Tone[] = [
  t("#FF6B60", "#D93A2E"),
  t("#FFA93C", "#C07000"),
  t("#EFD44C", "#9C7C00"),
  t("#7FD98A", "#2E9C42"),
  t("#4FD8A8", "#12996E"),
  t("#46C8E0", "#1291A8"),
  t("#6AA8FF", "#3A72D6"),
  t("#8E8CFF", "#5A57D6"),
  t("#B98CFF", "#8A52D6"),
  t("#F07CD0", "#C2409F"),
  t("#FF7AA8", "#D63A72"),
  t("#D9B36C", "#9C7430"),
]

function hashOf(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function tagTone(name: string): Tone {
  return TONES[hashOf("T:" + name) % TONES.length]
}

export function cvTone(name: string): Tone {
  return TONES[hashOf("V:" + name) % TONES.length]
}

export function circleTone(name: string): Tone {
  return TONES[hashOf("C:" + name) % TONES.length]
}

/** 按当前主题取前景/背景。 */
export function toneColors(tone: Tone, dark: boolean) {
  return dark ? { fg: tone.fg, bg: tone.bg } : { fg: tone.fgLight, bg: tone.bgLight }
}
