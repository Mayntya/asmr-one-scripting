import { Device, HStack, Image, NavigationLink, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import { searchWorks, type Work } from "../lib/api"
import { circleTone, cvTone, tagTone, toneColors } from "../lib/palette"
import { shape, usePalette } from "../lib/theme"
import { TagPage } from "./TagPage"
import { WorkDetail } from "./WorkDetail"

/* ---------------- 横向作品卡（4:3 封面，一排横滑用） ---------------- */

export const LANE_W = 208
export const LANE_H = 228

export function LaneCard({ work, width = LANE_W }: { work: Work; width?: number }) {
  const T = usePalette()
  const h = Math.round((width * 3) / 4)
  return (
    <NavigationLink destination={<WorkDetail work={work} />} buttonStyle="plain">
      <VStack alignment="leading" spacing={7} frame={{ width }}>
        <Image
          imageUrl={work.cover || work.thumb}
          resizable
          scaleToFill
          aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
          frame={{ width, height: h }}
          clipShape={shape(16)}
          placeholder={<Rectangle fill={T.rowBgHi} frame={{ width, height: h }} />}
        />
        <Text
          font="subheadline"
          fontWeight="semibold"
          foregroundStyle={T.text}
          lineLimit={2}
          multilineTextAlignment="leading"
          frame={{ width, alignment: "leading" }}
        >
          {work.title}
        </Text>
        <Text
          font="caption2"
          foregroundStyle={T.faint}
          lineLimit={1}
          multilineTextAlignment="leading"
          frame={{ width, alignment: "leading" }}
        >
          {work.vas[0] ?? work.circle}
        </Text>
      </VStack>
    </NavigationLink>
  )
}

/* ---------------- 主题集合（大图 + 三张小图） ---------------- */

export interface ThemeDef {
  title: string
  sub: string
  query: string
}

export const THEMES: ThemeDef[] = [
  { title: "女仆", sub: "メイド", query: "$tag:メイド$" },
  { title: "学生", sub: "学生", query: "$tag:学生$" },
  { title: "治愈", sub: "癒し", query: "$tag:癒し$" },
  { title: "掏耳", sub: "耳かき", query: "$tag:耳かき$" },
  { title: "舔耳", sub: "耳舐め", query: "$tag:耳舐め$" },
  { title: "姐姐", sub: "お姉さん", query: "$tag:お姉さん$" },
  { title: "妹妹", sub: "妹", query: "$tag:妹$" },
  { title: "病娇", sub: "ヤンデレ", query: "$tag:ヤンデレ$" },
  { title: "傲娇", sub: "ツンデレ", query: "$tag:ツンデレ$" },
  { title: "催眠", sub: "催眠", query: "$tag:催眠$" },
  { title: "护士", sub: "ナース", query: "$tag:ナース$" },
  { title: "巫女", sub: "巫女", query: "$tag:巫女$" },
  { title: "修女", sub: "シスター", query: "$tag:シスター$" },
  { title: "教师", sub: "女教師", query: "$tag:女教師$" },
  { title: "眼镜", sub: "メガネ", query: "$tag:メガネ$" },
  { title: "双马尾", sub: "ツインテール", query: "$tag:ツインテール$" },
  { title: "猫耳", sub: "猫耳", query: "$tag:猫耳$" },
  { title: "百合", sub: "百合", query: "$tag:百合$" },
  { title: "后宫", sub: "ハーレム", query: "$tag:ハーレム$" },
  { title: "亲吻", sub: "キス", query: "$tag:キス$" },
  { title: "逆推", sub: "逆レイプ", query: "$tag:逆レイプ$" },
  { title: "女装", sub: "女装", query: "$tag:女装$" },
  { title: "大小姐", sub: "お嬢様", query: "$tag:お嬢様$" },
  { title: "青梅", sub: "幼なじみ", query: "$tag:幼なじみ$" },
  { title: "方言", sub: "方言", query: "$tag:方言$" },
  { title: "人妻", sub: "人妻", query: "$tag:人妻$" },
  { title: "泳装", sub: "水着", query: "$tag:水着$" },
  { title: "责骂", sub: "言葉責め", query: "$tag:言葉責め$" },
  { title: "调教", sub: "調教", query: "$tag:調教$" },
  { title: "纯爱", sub: "純愛", query: "$tag:純愛$" },
  { title: "洗脑", sub: "洗脳", query: "$tag:洗脳$" },
  { title: "潮吹", sub: "潮吹き", query: "$tag:潮吹き$" },
  { title: "露出", sub: "露出", query: "$tag:露出$" },
  { title: "cosplay", sub: "コスプレ", query: "$tag:コスプレ$" },
  { title: "魔法少女", sub: "魔法少女", query: "$tag:魔法少女$" },
  { title: "中出", sub: "中出し", query: "$tag:中出し$" },
]

const RECENT_THEMES_KEY = "home.recentThemes"

function readRecentThemes(): string[] {
  try {
    return Storage.get<string[]>(RECENT_THEMES_KEY) ?? []
  } catch {
    return []
  }
}

/** 把刚用过的主题记到最后，下次先避开。 */
function rememberTheme(title: string) {
  const next = [title, ...readRecentThemes().filter((x) => x !== title)].slice(0, 10)
  try {
    Storage.set(RECENT_THEMES_KEY, next)
  } catch {}
}

/** 洗牌整个主题池，逐个试到能凑出三张卡为止。 */
export async function pickTheme(): Promise<{ theme: ThemeDef; works: Work[] } | null> {
  const recent = readRecentThemes()
  const fresh = THEMES.filter((t) => !recent.includes(t.title))
  const a = fresh.length >= 8 ? fresh.slice() : THEMES.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  for (const t of a.slice(0, 4)) {
    try {
      const r = await searchWorks(t.query, 1, "dl_count", 4)
      if (r.works.length >= 3) {
        rememberTheme(t.title)
        return { theme: t, works: r.works }
      }
    } catch {}
  }
  return null
}

const BANNER_H = 178

export function ThemeBanner({ theme, works }: { theme: ThemeDef; works: Work[] }) {
  const T = usePalette()
  const inner = Math.min(Device.screen.width, 560) - 32
  const cardW = Math.floor((inner - 16) / 3)
  const cardH = Math.round((cardW * 3) / 4)
  const hero = works[0]
  const heroUrl = hero == null ? "" : hero.cover || hero.thumb

  return (
    <VStack spacing={11} frame={{ maxWidth: Infinity }}>
      <NavigationLink destination={<TagPage kind="tag" value={theme.sub} />} buttonStyle="plain">
        <VStack
          frame={{ width: inner, height: BANNER_H }}
          clipShape={shape(18)}
          mask={<Rectangle fill="#FFFFFF" clipShape={shape(18)} />}
          spacing={0}
        >
          <ZStack frame={{ width: inner, height: BANNER_H }} alignment="bottomLeading">
            {heroUrl.length > 0 ? (
              <Image
                imageUrl={heroUrl}
                resizable
                scaleToFill
                aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
                frame={{ width: inner, height: BANNER_H }}
                clipShape={shape(18)}
                placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: inner, height: BANNER_H }} />}
              />
            ) : (
              <Rectangle fill={T.rowBgHi} frame={{ width: inner, height: BANNER_H }} />
            )}
            <Rectangle
              clipShape={shape(18)}
              fill={{
                colors: ["rgba(0,0,0,0.10)", "rgba(0,0,0,0.52)", "rgba(0,0,0,0.94)"],
                startPoint: "top",
                endPoint: "bottom",
              }}
            />
            <VStack
              alignment="leading"
              spacing={3}
              padding={{ horizontal: 16, bottom: 15 }}
              frame={{ width: inner, alignment: "leading" }}
            >
              <Text font="caption2" fontWeight="semibold" foregroundStyle="rgba(255,255,255,0.85)">
                {`主题 · ${theme.sub}`}
              </Text>
              <Text font="title2" fontWeight="bold" foregroundStyle="#FFFFFF">
                {`${theme.title}精选`}
              </Text>
            </VStack>
          </ZStack>
        </VStack>
      </NavigationLink>

      <HStack spacing={8} frame={{ maxWidth: Infinity }} alignment="top">
        {works.slice(1, 4).map((w) => (
          <NavigationLink key={w.id} destination={<WorkDetail work={w} />} buttonStyle="plain">
            <VStack alignment="leading" spacing={5} frame={{ width: cardW }}>
              <Image
                imageUrl={w.cover || w.thumb}
                resizable
                scaleToFill
                aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
                frame={{ width: cardW, height: cardH }}
                clipShape={shape(10)}
                placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: cardW, height: cardH }} />}
              />
              <Text
                font="caption2"
                foregroundStyle={T.sub}
                lineLimit={1}
                multilineTextAlignment="leading"
                frame={{ width: cardW, alignment: "leading" }}
              >
                {w.vas[0] ?? w.circle}
              </Text>
            </VStack>
          </NavigationLink>
        ))}
      </HStack>
    </VStack>
  )
}

/* ---------------- 热门 CV ---------------- */

export const CV_W = 78
export const CV_H = 126

export function CvBubble({ name, count }: { name: string; count: number }) {
  const T = usePalette()
  const c = toneColors(cvTone(name), T.scheme === "dark")
  return (
    <NavigationLink destination={<TagPage kind="cv" value={name} />} buttonStyle="plain">
      <VStack spacing={6} frame={{ width: CV_W }}>
        <ZStack frame={{ width: 64, height: 64 }} background={c.bg} clipShape="circle">
          <Text font="title2" fontWeight="bold" foregroundStyle={c.fg}>
            {name.slice(0, 1)}
          </Text>
        </ZStack>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle={T.text}
          lineLimit={2}
          multilineTextAlignment="center"
          frame={{ width: CV_W }}
        >
          {name}
        </Text>
        <Text
          font="caption2"
          foregroundStyle={T.faint}
          lineLimit={1}
          multilineTextAlignment="center"
          frame={{ width: CV_W }}
        >
          {`${count} 部`}
        </Text>
      </VStack>
    </NavigationLink>
  )
}

/* ---------------- 社团 ---------------- */

export const CIRCLE_H = 94
const CIRCLE_W = 158

export function CircleTile({ name, count }: { name: string; count: number }) {
  const T = usePalette()
  const c = toneColors(circleTone(name), T.scheme === "dark")
  return (
    <NavigationLink destination={<TagPage kind="circle" value={name} />} buttonStyle="plain">
      <VStack
        alignment="leading"
        spacing={4}
        padding={12}
        frame={{ width: CIRCLE_W, height: CIRCLE_H }}
        background={c.bg}
        border={{ style: T.border, width: 0.6 }}
        clipShape={shape(14)}
      >
        <Image systemName="building.2.fill" font="caption" foregroundStyle={c.fg} />
        <Spacer />
        <Text
          font="footnote"
          fontWeight="semibold"
          foregroundStyle={T.text}
          lineLimit={2}
          multilineTextAlignment="leading"
          frame={{ maxWidth: Infinity, alignment: "leading" }}
        >
          {name}
        </Text>
        <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
          {`${count} 部`}
        </Text>
      </VStack>
    </NavigationLink>
  )
}

/* ---------------- 分类标签 ---------------- */

export const TAG_H = 38

export function BigTag({ name }: { name: string }) {
  const T = usePalette()
  const c = toneColors(tagTone(name), T.scheme === "dark")
  return (
    <NavigationLink destination={<TagPage kind="tag" value={name} />} buttonStyle="plain">
      <Text
        font="subheadline"
        fontWeight="medium"
        foregroundStyle={c.fg}
        padding={{ horizontal: 13, vertical: 7 }}
        background={c.bg}
        clipShape={{ type: "rect", cornerRadius: 10 }}
        lineLimit={1}
      >
        {name}
      </Text>
    </NavigationLink>
  )
}

/* ---------------- 聚合工具 ---------------- */

export interface Ranked {
  name: string
  count: number
}

/** 统计作品里某个字段出现频次，取前 n。 */
export function rankNames(list: Work[], field: "vas" | "tags" | "circle", n: number): Ranked[] {
  const m = new Map<string, number>()
  for (const w of list) {
    if (field === "circle") {
      if (w.circle.length > 0) m.set(w.circle, (m.get(w.circle) ?? 0) + 1)
      continue
    }
    for (const k of w[field]) {
      if (k.length === 0) continue
      m.set(k, (m.get(k) ?? 0) + 1)
    }
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }))
}

/** 按种子洗牌，保证同一次打开里顺序稳定、下次打开换一批。 */
export function seededSample<T>(list: T[], n: number, seed: number): T[] {
  const a = list.slice()
  let s = (seed % 2147483646) + 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a.slice(0, n)
}
