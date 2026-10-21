import {
  Button,
  Group,
  HStack,
  Image,
  Navigation,
  NavigationLink,
  ProgressView,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import { flattenAudio, formatDuration, getTracks } from "../lib/api"
import type { HistoryItem, LikedItem, LikeKind } from "../lib/store"
import { library } from "../lib/store"
import { player } from "../lib/player"
import { circleTone, cvTone, tagTone, toneColors } from "../lib/palette"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { WorkCard } from "./WorkCard"
import { WorkDetail } from "./WorkDetail"
import { PlayerPage } from "./PlayerView"
import { TagPage } from "./TagPage"
import { PageHeader } from "./parts"

function useLibraryVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const unsub = library.subscribe(() => setV((x) => x + 1))
    return () => unsub()
  }, [])
  return v
}

function stamp(ms: number) {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function dayStart(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function groupByDay(items: HistoryItem[]) {
  const today = dayStart(Date.now())
  const day = 86400000
  const out = [
    { title: "今天", items: [] as HistoryItem[] },
    { title: "昨天", items: [] as HistoryItem[] },
    { title: "本周", items: [] as HistoryItem[] },
    { title: "更早", items: [] as HistoryItem[] },
  ]
  for (const it of items) {
    const diff = Math.round((today - dayStart(it.at)) / day)
    const i = diff <= 0 ? 0 : diff === 1 ? 1 : diff < 7 ? 2 : 3
    out[i].items.push(it)
  }
  return out.filter((g) => g.items.length > 0)
}

function Empty({ icon, text }: { icon: string; text: string }) {
  const T = usePalette()
  return (
    <VStack spacing={10} padding={{ top: 70 }} frame={{ maxWidth: Infinity }}>
      <Image systemName={icon} font="largeTitle" foregroundStyle={T.cardHi} />
      <Text font="footnote" foregroundStyle={T.sub} multilineTextAlignment="center">
        {text}
      </Text>
    </VStack>
  )
}

export function FavoritesPage({
  onClose,
  initialSeg = "works",
}: {
  onClose: () => void
  initialSeg?: LikeKind | "works"
}) {
  const T = usePalette()
  useLibraryVersion()
  const [seg, setSeg] = useState<LikeKind | "works">(initialSeg)
  const favs = library.favorites
  const tags = library.likedOf("tag")
  const cvs = library.likedOf("cv")

  useEffect(() => {
    library.syncCloud()
  }, [])

  const SEGS: { key: LikeKind | "works"; label: string; n: number }[] = [
    { key: "works", label: "作品", n: favs.length },
    { key: "tag", label: "标签", n: tags.length },
    { key: "cv", label: "CV", n: cvs.length },
  ]

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }} background={T.bg}>
      <Rectangle fill={T.bg} ignoresSafeArea />
      <ScrollView navigationBarVisibility="hidden">
      <VStack spacing={12} padding={{ horizontal: 16, top: 8, bottom: 150 }} frame={{ maxWidth: Infinity }}>
        <PageHeader title="资料库" right="完成" onRight={onClose} />

        <HStack spacing={8} frame={{ maxWidth: Infinity }}>
          {SEGS.map((s) => {
            const on = s.key === seg
            return (
              <Text
                key={s.key}
                font="subheadline"
                fontWeight="semibold"
                foregroundStyle={on ? T.onAccent : T.sub}
                padding={{ horizontal: 14, vertical: 7 }}
                background={on ? T.accent : T.card}
                clipShape={{ type: "rect", cornerRadius: 9 }}
                contentShape="rect"
                onTapGesture={() => setSeg(s.key)}
              >
                {s.n > 0 ? `${s.label} ${s.n}` : s.label}
              </Text>
            )
          })}
          <Spacer />
        </HStack>

        {seg === "works" ? (
          favs.length === 0 ? (
            <Empty icon="heart.slash" text="还没有收藏的作品。作品页点一下心就进来了。" />
          ) : (
            <VStack spacing={8} frame={{ maxWidth: Infinity }}>
              {favs.map((w) => (
                <WorkCard key={w.id} work={w} />
              ))}
            </VStack>
          )
        ) : (
          <LikedList
            kind={seg}
            items={seg === "tag" ? tags : cvs}
            emptyText={
              seg === "tag"
                ? "还没收藏标签。进任意标签页，点右上角的心。"
                : "还没收藏 CV。进任意 CV 页，点右上角的心。"
            }
          />
        )}
      </VStack>
      </ScrollView>
    </ZStack>
  )
}

/** 收藏的标签 / CV 列表，点进对应页面。 */
function LikedList({ kind, items, emptyText }: { kind: LikeKind; items: LikedItem[]; emptyText: string }) {
  const T = usePalette()
  if (items.length === 0) return <Empty icon="heart.slash" text={emptyText} />

  return (
    <VStack spacing={8} frame={{ maxWidth: Infinity }}>
      {items.map((it) => {
        const tone = kind === "cv" ? cvTone(it.value) : kind === "circle" ? circleTone(it.value) : tagTone(it.value)
        const c = toneColors(tone, T.scheme === "dark")
        return (
          <NavigationLink
            key={`${it.kind}-${it.value}`}
            destination={<TagPage kind={it.kind} value={it.value} />}
            buttonStyle="plain"
          >
            <HStack
              spacing={11}
              padding={{ horizontal: 12, vertical: 11 }}
              background={T.card}
              clipShape={shape(12)}
              frame={{ maxWidth: Infinity }}
            >
              <ZStack frame={{ width: 30, height: 30 }} background={c.bg} clipShape={shape(8)}>
                <Image
                  systemName={kind === "cv" ? "mic.fill" : kind === "circle" ? "building.2.fill" : "number"}
                  font="caption"
                  fontWeight="semibold"
                  foregroundStyle={c.fg}
                />
              </ZStack>
              <Text font="subheadline" fontWeight="medium" foregroundStyle={T.text} lineLimit={1}>
                {it.value}
              </Text>
              <Spacer />
              <Image systemName="chevron.right" font="caption2" fontWeight="semibold" foregroundStyle={T.faint} />
            </HStack>
          </NavigationLink>
        )
      })}
    </VStack>
  )
}

export function HistoryPage({ onClose }: { onClose: () => void }) {
  const T = usePalette()
  useLibraryVersion()
  const items = library.history
  const [busy, setBusy] = useState(0)
  const [clearAsk, setClearAsk] = useState(false)

  async function resume(h: HistoryItem) {
    if (busy !== 0) return
    const cur = player.state.work
    if (cur != null && cur.id === h.work.id) {
      Navigation.present({ element: <PlayerPage /> })
      return
    }
    setBusy(h.work.id)
    try {
      const nodes = await getTracks(h.work.id)
      const audio = flattenAudio(nodes)
      if (audio.length === 0) {
        Navigation.present({ element: <WorkDetail work={h.work} /> })
        return
      }
      const found = h.trackKey != null ? audio.findIndex((t) => t.key === h.trackKey) : -1
      const i = found >= 0 ? found : Math.min(Math.max(h.index ?? 0, 0), audio.length - 1)
      player.playList(h.work, audio, i, nodes)
      Navigation.present({ element: <PlayerPage /> })
    } catch {
      Navigation.present({ element: <WorkDetail work={h.work} /> })
    } finally {
      setBusy(0)
    }
  }

  const groups = groupByDay(items)

  return (
    <ScrollView
      navigationBarVisibility="hidden"
      background={<Rectangle fill={T.bg} ignoresSafeArea />}
      confirmationDialog={{
        title: "清除最近播放？",
        isPresented: clearAsk,
        onChanged: (v: boolean) => setClearAsk(v),
        actions: (
          <Group>
            <Button
              title="清除"
              role="destructive"
              action={() => {
                library.clearHistory()
                setClearAsk(false)
              }}
            />
            <Button title="取消" role="cancel" action={() => setClearAsk(false)} />
          </Group>
        ),
      }}
    >
      <VStack spacing={14} padding={{ horizontal: 16, top: 8, bottom: 150 }} frame={{ maxWidth: Infinity }}>
        <PageHeader
          title="最近播放"
          right={items.length > 0 ? "清除" : ""}
          onRight={() => setClearAsk(true)}
        />

        {items.length === 0 ? (
          <Empty icon="clock" text="还没有播放记录。随便点一部听听。" />
        ) : (
          <VStack spacing={14} frame={{ maxWidth: Infinity }}>
            {groups.map((g) => (
              <VStack key={g.title} spacing={8} frame={{ maxWidth: Infinity }}>
                <HStack padding={{ horizontal: 4 }} frame={{ maxWidth: Infinity }}>
                  <Text font="caption" fontWeight="semibold" foregroundStyle={T.sub}>
                    {g.title}
                  </Text>
                  <Spacer />
                  <Text font="caption2" foregroundStyle={T.faint}>
                    {`${g.items.length} 部`}
                  </Text>
                </HStack>

                {g.items.map((h) => {
                  const prog = h.trackKey != null ? library.trackProgress(h.trackKey) : 0
                  const total = h.duration ?? 0
                  const ratio = total > 0 ? Math.min(1, Math.max(0, prog / total)) : 0
                  return (
                    <VStack
                      key={`${h.work.id}-${h.at}`}
                      spacing={8}
                      padding={10}
                      background={T.card}
                      clipShape={shape(14)}
                      frame={{ maxWidth: Infinity }}
                      contentShape="rect"
                      onTapGesture={() => resume(h)}
                      contextMenu={{
                        menuItems: (
                          <Group>
                            <Button
                              title="接着听"
                              action={() => resume(h)}
                            />
                            <Button
                              title="查看详情"
                              action={() => Navigation.present({ element: <WorkDetail work={h.work} /> })}
                            />
                            <Button
                              title="删除记录"
                              role="destructive"
                              action={() => library.removeHistory(h.work.id)}
                            />
                          </Group>
                        ),
                      }}
                    >
                      <HStack spacing={10} frame={{ maxWidth: Infinity }}>
                        <Image
                          imageUrl={h.work.thumb}
                          resizable
                          scaleToFill
                          aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
                          frame={{ width: 60, height: 45 }}
                          clipShape={shape(10)}
                          placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: 60, height: 45 }} />}
                        />
                        <VStack alignment="leading" spacing={3} frame={{ maxWidth: Infinity }}>
                          <Text
                            font="footnote"
                            fontWeight="semibold"
                            lineLimit={1}
                            frame={{ maxWidth: Infinity, alignment: "leading" }}
                          >
                            {h.trackTitle}
                          </Text>
                          <Text
                            font="caption2"
                            foregroundStyle={T.faint}
                            lineLimit={1}
                            frame={{ maxWidth: Infinity, alignment: "leading" }}
                          >
                            {h.work.title}
                          </Text>
                        </VStack>
                        {busy === h.work.id ? (
                          <ProgressView />
                        ) : (
                          <Text font="caption2" foregroundStyle={T.accentText}>
                            {stamp(h.at)}
                          </Text>
                        )}
                      </HStack>

                      {total > 0 ? (
                        <HStack spacing={8} frame={{ maxWidth: Infinity }}>
                          <ZStack alignment="leading" frame={{ width: 120, height: 3 }}>
                            <Rectangle
                              fill={T.rowBgHi}
                              frame={{ width: 120, height: 3 }}
                              clipShape={shape(2)}
                            />
                            <Rectangle
                              fill={T.accent}
                              frame={{ width: Math.max(3, 120 * ratio), height: 3 }}
                              clipShape={shape(2)}
                            />
                          </ZStack>
                          <Spacer />
                          <Text font="caption2" foregroundStyle={T.faint}>
                            {`${formatDuration(prog)} / ${formatDuration(total)}`}
                          </Text>
                        </HStack>
                      ) : null}
                    </VStack>
                  )
                })}
              </VStack>
            ))}

            <Text font="caption2" foregroundStyle={T.faint} multilineTextAlignment="center" frame={{ maxWidth: Infinity }}>
              点一下接着听 · 长按管理
            </Text>
          </VStack>
        )}
      </VStack>
    </ScrollView>
  )
}
