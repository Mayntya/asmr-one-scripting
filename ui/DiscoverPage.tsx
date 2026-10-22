import {
  Button,
  HStack,
  Image,
  ProgressView,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  TextField,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import type { SortKey, Work } from "../lib/api"
import { searchWorks } from "../lib/api"
import { shape, usePalette } from "../lib/theme"
import {
  CIRCLE_H,
  CV_H,
  LANE_H,
  TAG_H,
  BigTag,
  CircleTile,
  CvBubble,
  LaneCard,
  ThemeBanner,
  pickTheme,
  rankNames,
  seededSample,
} from "./HomeSections"
import type { ThemeDef } from "./HomeSections"
import { PosterCard } from "./Poster"
import { WorkRowBig } from "./WorkRowBig"
import { SectionLabel } from "./parts"

const PAGE_SIZE = 20

const ORDERS: { key: SortKey; label: string }[] = [
  { key: "release", label: "最新" },
  { key: "dl_count", label: "热门" },
  { key: "rating", label: "评分" },
]

/** 请求序号，防止慢的旧请求盖掉新结果。 */
let searchSeq = 0
let debounceId: any = null

export function DiscoverPage({ onClose }: { onClose: () => void }) {
  const T = usePalette()
  const [input, setInput] = useState("")
  const [keyword, setKeyword] = useState("")
  const [order, setOrder] = useState<SortKey>("release")
  const [works, setWorks] = useState<Work[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 每次打开换一批：主题和标签都按这个种子挑。 */
  const [seed] = useState(() => Math.floor(Math.random() * 1000000))
  const [pool, setPool] = useState<Work[]>([])
  const [fresh, setFresh] = useState<Work[]>([])
  const [best, setBest] = useState<Work[]>([])
  const [theme, setTheme] = useState<ThemeDef | null>(null)
  const [themeWorks, setThemeWorks] = useState<Work[]>([])

  const load = async (kw: string, o: SortKey, p: number) => {
    const mine = ++searchSeq
    setLoading(true)
    setError(null)
    try {
      const res = await searchWorks(kw, p, o, PAGE_SIZE)
      if (mine !== searchSeq) return
      setWorks((prev) => (p === 1 ? res.works : [...prev, ...res.works]))
      setTotal(res.total)
      setPage(p)
    } catch (e: any) {
      if (mine !== searchSeq) return
      setError(String(e?.message ?? e))
    } finally {
      if (mine === searchSeq) setLoading(false)
    }
  }

  const loadHome = async () => {
    const themeP = pickTheme()
    try {
      const [dl, rel, rt] = await Promise.all([
        searchWorks("", 1, "dl_count", 100),
        searchWorks("", 1, "release", 12),
        searchWorks("", 1, "rating", 12),
      ])
      setPool(dl.works)
      setFresh(rel.works)
      setBest(rt.works)
      const picked = await themeP
      if (picked != null) {
        setTheme(picked.theme)
        setThemeWorks(picked.works)
      }
    } catch {}
  }

  useEffect(() => {
    loadHome()
    load("", "release", 1)
  }, [])

  const submit = (kw: string) => {
    if (debounceId != null) {
      clearTimeout(debounceId)
      debounceId = null
    }
    setKeyword(kw)
    load(kw, order, 1)
  }

  const onType = (v: string) => {
    setInput(v)
    if (debounceId != null) clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      debounceId = null
      submit(v.trim())
    }, 420)
  }

  const hot = pool.slice(0, 12)
  const cvs = rankNames(pool, "vas", 14)
  const circles = rankNames(pool, "circle", 10)
  const tags = seededSample(rankNames(pool, "tags", 40), 16, seed)
  const shelves = [
    { title: "最新上架", works: fresh },
    { title: "评分最高", works: best },
  ].filter((s) => s.works.length > 0)

  const row = (title: string, right: string | undefined, h: number, children: any) => (
    <VStack spacing={10} frame={{ maxWidth: Infinity }}>
      <SectionLabel text={title} right={right} />
      <ScrollView axes="horizontal" frame={{ height: h }}>
        <HStack spacing={12}>{children}</HStack>
      </ScrollView>
    </VStack>
  )

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }} background={T.bg}>
      <Rectangle fill={T.bg} ignoresSafeArea />
      <ScrollView navigationBarVisibility="hidden">
        <VStack spacing={16} padding={{ horizontal: 16, top: 8, bottom: 150 }} frame={{ maxWidth: Infinity }}>
        <HStack frame={{ maxWidth: Infinity, minHeight: 46 }} alignment="center">
          <Text font="largeTitle" fontWeight="bold" foregroundStyle={T.text}>
            浏览
          </Text>
          <Spacer />
          <Text
            font="body"
            fontWeight="semibold"
            foregroundStyle={T.accentText}
            contentShape="rect"
            onTapGesture={() => onClose()}
          >
            完成
          </Text>
        </HStack>

        <HStack
          spacing={8}
          padding={{ horizontal: 12, vertical: 10 }}
          background={T.card}
          border={{ style: T.border, width: 0.6 }}
          clipShape={shape(16)}
          frame={{ maxWidth: Infinity }}
        >
          <Image systemName="magnifyingglass" font="subheadline" foregroundStyle={T.sub} />
          <ZStack frame={{ maxWidth: Infinity, height: 22 }} alignment="leading">
            {input.length === 0 ? (
              <Text font="subheadline" foregroundStyle={T.sub} lineLimit={1}>
                标题 / 社团 / 声优，或 $tag:耳かき$
              </Text>
            ) : null}
            <TextField
              title=""
              value={input}
              onChanged={(v: string) => onType(v)}
              onSubmit={() => submit(input.trim())}
              submitLabel="search"
              foregroundStyle={T.text}
              frame={{ maxWidth: Infinity }}
            />
          </ZStack>
          {input.length > 0 ? (
            <Image
              systemName="xmark.circle.fill"
              font="subheadline"
              foregroundStyle={T.faint}
              onTapGesture={() => {
                setInput("")
                submit("")
              }}
            />
          ) : null}
        </HStack>

        {keyword.length === 0 ? (
          <VStack spacing={24} frame={{ maxWidth: Infinity }}>
            {hot.length > 0 ? row("热门", "按下载量", LANE_H, hot.map((w) => <LaneCard key={w.id} work={w} />)) : null}

            {theme != null && themeWorks.length > 0 ? <ThemeBanner theme={theme} works={themeWorks} /> : null}

            {best.length > 0 ? row("本周最佳", "按评分", LANE_H, best.map((w) => <LaneCard key={w.id} work={w} />)) : null}

            {cvs.length > 0
              ? row("热门 CV", "点进去看全部", CV_H, cvs.map((c) => <CvBubble key={c.name} name={c.name} count={c.count} />))
              : null}

            {circles.length > 0
              ? row("社团", undefined, CIRCLE_H, circles.map((c) => <CircleTile key={c.name} name={c.name} count={c.count} />))
              : null}

            {tags.length > 0
              ? row("分类浏览", "随手点一个", TAG_H, tags.map((t) => <BigTag key={t.name} name={t.name} />))
              : null}

            <VStack spacing={22} frame={{ maxWidth: Infinity }}>
              {shelves.map((sec) => (
                <VStack key={sec.title} spacing={12} frame={{ maxWidth: Infinity }}>
                  <SectionLabel text={sec.title} />
                  <ScrollView axes="horizontal" frame={{ height: 212 }}>
                    <HStack spacing={12}>
                      {sec.works.map((w) => (
                        <PosterCard key={w.id} work={w} />
                      ))}
                    </HStack>
                  </ScrollView>
                </VStack>
              ))}
            </VStack>
          </VStack>
        ) : null}

        <HStack spacing={8} frame={{ maxWidth: Infinity }}>
          {ORDERS.map((o) => (
            <Text
              font="subheadline"
              fontWeight="semibold"
              foregroundStyle={order === o.key ? T.text : T.sub}
              padding={{ horizontal: 14, vertical: 7 }}
              background={order === o.key ? T.accent : T.card}
              clipShape={{ type: "rect", cornerRadius: 9 }}
              contentShape="rect"
              onTapGesture={() => {
                if (o.key === order) return
                setOrder(o.key)
                load(keyword, o.key, 1)
              }}
            >
              {o.label}
            </Text>
          ))}
          <Spacer />
          <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
            {keyword.length > 0 ? `“${keyword}” · ${total}` : `${total.toLocaleString()} 部`}
          </Text>
        </HStack>

        <VStack spacing={8} frame={{ maxWidth: Infinity }}>
          {works.map((w) => (
            <WorkRowBig work={w} />
          ))}
        </VStack>

        {loading ? (
          <HStack spacing={8} alignment="center" padding={{ vertical: 10 }}>
            <ProgressView />
            <Text font="caption" foregroundStyle={T.sub}>
              加载中…
            </Text>
          </HStack>
        ) : null}

        {error != null ? (
          <VStack spacing={8}>
            <Text font="footnote" foregroundStyle={T.accentText} multilineTextAlignment="center">
              {error}
            </Text>
            <Button title="重试" action={() => load(keyword, order, 1)} />
          </VStack>
        ) : null}

        {!loading && works.length > 0 && works.length < total ? (
          <Text
            font="footnote"
            fontWeight="semibold"
            foregroundStyle={T.onAccent}
            padding={{ vertical: 12 }}
            frame={{ maxWidth: Infinity }}
            background={T.accent}
            clipShape={shape(16)}
            contentShape="rect"
            onTapGesture={() => load(keyword, order, page + 1)}
          >
            加载更多
          </Text>
        ) : null}
        </VStack>
      </ScrollView>
    </ZStack>
  )
}
