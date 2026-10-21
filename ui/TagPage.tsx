import { HStack, Image, ProgressView, Rectangle, ScrollView, Spacer, Text, VStack, ZStack, useEffect, useState } from "scripting"
import type { SortKey, Work } from "../lib/api"
import { searchWorks } from "../lib/api"
import { circleTone, cvTone, tagTone, toneColors } from "../lib/palette"
import { library } from "../lib/store"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { EmptyState, PageHeader } from "./parts"
import { WorkCard } from "./WorkCard"

const PAGE_SIZE = 20

const ORDERS: { key: SortKey; label: string }[] = [
  { key: "release", label: "最新" },
  { key: "dl_count", label: "最热" },
  { key: "rating", label: "评分" },
]

/** 请求序号，慢的旧请求不许盖掉新结果。 */
let tagSeq = 0

export type TagKind = "tag" | "cv" | "circle"

/** 页面右上角的心形收藏按钮。标签 / CV / 社团共用。 */
function LikeButton({ kind, value }: { kind: TagKind; value: string }) {
  const T = usePalette()
  const [on, setOn] = useState(library.isLiked(kind, value))
  return (
    <ZStack
      frame={{ width: 38, height: 38 }}
      background={on ? T.accentSoft : T.glassBg}
      border={{ style: on ? T.accent : T.border, width: 0.6 }}
      clipShape="circle"
      contentShape="circle"
      onTapGesture={() => setOn(library.toggleLike(kind, value))}
    >
      <Image
        systemName={on ? "heart.fill" : "heart"}
        font="subheadline"
        fontWeight="semibold"
        foregroundStyle={on ? T.accent : T.text}
      />
    </ZStack>
  )
}

export function TagPage({ kind, value }: { kind: TagKind; value: string }) {
  const T = usePalette()
  const [order, setOrder] = useState<SortKey>("release")
  const [works, setWorks] = useState<Work[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tone = kind === "tag" ? tagTone(value) : kind === "cv" ? cvTone(value) : circleTone(value)
  const query = kind === "tag" ? `$tag:${value}$` : kind === "cv" ? `$va:${value}$` : `$circle:${value}$`

  const load = async (p: number, o: SortKey) => {
    const mine = ++tagSeq
    setLoading(true)
    setError(null)
    try {
      const res = await searchWorks(query, p, o, PAGE_SIZE)
      if (mine !== tagSeq) return
      setWorks((prev) => (p === 1 ? res.works : [...prev, ...res.works]))
      setTotal(res.total)
      setPage(p)
    } catch (e: any) {
      if (mine !== tagSeq) return
      setError(String(e?.message ?? e))
    } finally {
      if (mine === tagSeq) setLoading(false)
    }
  }

  useEffect(() => {
    load(1, "release")
  }, [])

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }} background={T.bg}>
      <Rectangle fill={T.bg} ignoresSafeArea />
      <ScrollView navigationBarVisibility="hidden">
      <VStack spacing={10} padding={{ horizontal: 16, top: 8, bottom: 150 }} frame={{ maxWidth: Infinity }}>
        <PageHeader
          title={value}
          back
          trailing={kind === "circle" ? undefined : <LikeButton kind={kind} value={value} />}
        />

        <HStack spacing={8}>
          <Text
            font="caption2"
            fontWeight="semibold"
            foregroundStyle={toneColors(tone, T.scheme === "dark").fg}
            padding={{ horizontal: 8, vertical: 3 }}
            background={toneColors(tone, T.scheme === "dark").bg}
            clipShape={{ type: "rect", cornerRadius: 6 }}
          >
            {kind === "tag" ? "标签" : kind === "cv" ? "CV" : "社团"}
          </Text>
          <Text font="caption2" foregroundStyle={T.faint}>
            {total > 0 ? `共 ${total} 部` : loading ? "查询中…" : ""}
          </Text>
          <Spacer />
        </HStack>

        <HStack spacing={8} padding={{ top: 2 }}>
          {ORDERS.map((o) => {
            const on = o.key === order
            return (
              <Text
                key={o.key}
                font="caption"
                fontWeight={on ? "semibold" : "regular"}
                foregroundStyle={on ? T.text : T.sub}
                padding={{ horizontal: 12, vertical: 6 }}
                background={on ? T.accentText : T.card}
                clipShape={shape(10)}
                contentShape="rect"
                onTapGesture={() => {
                  if (on) return
                  setOrder(o.key)
                  load(1, o.key)
                }}
              >
                {o.label}
              </Text>
            )
          })}
          <Spacer />
        </HStack>

        {error != null ? (
          <Text font="footnote" foregroundStyle={T.accentText} multilineTextAlignment="center">
            {error}
          </Text>
        ) : null}

        {!loading && works.length === 0 && error == null ? (
          <EmptyState
            icon={kind === "tag" ? "tag.slash" : kind === "cv" ? "person.crop.circle.badge.questionmark" : "building.2"}
            text="没有找到作品。"
          />
        ) : (
          <VStack spacing={8} frame={{ maxWidth: Infinity }}>
            {works.map((w) => (
              <WorkCard key={w.id} work={w} />
            ))}
          </VStack>
        )}

        {loading && works.length === 0 ? (
          <HStack spacing={8} alignment="center" padding={{ vertical: 10 }}>
            <ProgressView />
            <Text font="caption" foregroundStyle={T.sub}>
              加载中…
            </Text>
          </HStack>
        ) : null}

        {!loading && works.length > 0 && works.length < total ? (
          <Text
            font="footnote"
            fontWeight="semibold"
            foregroundStyle={T.onAccent}
            padding={{ vertical: 12 }}
            frame={{ maxWidth: Infinity }}
            background={T.accentText}
            clipShape={shape(12)}
            contentShape="rect"
            onTapGesture={() => load(page + 1, order)}
          >
            加载更多
          </Text>
        ) : null}
      </VStack>
      </ScrollView>
    </ZStack>
  )
}
