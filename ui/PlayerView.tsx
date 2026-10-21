import {
  Device,
  DragGesture,
  HStack,
  Image,
  Navigation,
  NavigationStack,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import type { PlayerState } from "../lib/player"
import { player } from "../lib/player"
import { cueIndexAt } from "../lib/lrc"
import { formatDuration } from "../lib/api"
import { library } from "../lib/store"
import { glass, glassCircle, shape, usePalette } from "../lib/theme"
import type { Mesh } from "../lib/artwork"
import { loadMesh, meshFor } from "../lib/artwork"
import { MeshBackdrop } from "./MeshBackdrop"
import { WorkDetail } from "./WorkDetail"

/** 播放页永远压在 mesh 背景上，所以这一套白字不跟主题走。 */
const ON = {
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.72)",
  faint: "rgba(255,255,255,0.46)",
  glass: "rgba(255,255,255,0.14)",
  glassHi: "rgba(255,255,255,0.22)",
  border: "rgba(255,255,255,0.18)",
  accent: "#FFA6C4",
} as const

export function usePlayerState(): PlayerState {
  const [state, setState] = useState<PlayerState>({ ...player.state })
  useEffect(() => {
    const unsub = player.subscribe(() => setState({ ...player.state }))
    return () => unsub()
  }, [])
  return state
}

export function MiniPlayer() {
  const T = usePalette()
  const state = usePlayerState()
  const work = state.work
  if (work == null) return <VStack />
  const track = state.tracks[state.index]
  const pct = state.duration > 0 ? Math.min(1, state.time / state.duration) : 0
  const barW = Device.screen.width - 24

  return (
    <VStack padding={{ horizontal: 12, bottom: 8 }} frame={{ maxWidth: Infinity }}>
      <VStack
        spacing={0}
        glassEffect={glass(20)}
        background={T.rowBgHi}
        border={{ style: T.border, width: 0.6 }}
        clipShape={shape(20)}
        frame={{ maxWidth: Infinity }}
      >
        <HStack
          spacing={10}
          padding={{ horizontal: 10, vertical: 9 }}
          contentShape="rect"
          onTapGesture={() => {
            Navigation.present({ element: <PlayerPage /> })
          }}
        >
          <Image
            imageUrl={work.thumb}
            resizable
            scaleToFill
            aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
            frame={{ width: 52, height: 39 }}
            clipShape={shape(10)}
            placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: 52, height: 39 }} />}
          />
          <VStack alignment="leading" spacing={2} frame={{ maxWidth: Infinity }}>
            <Text
              font="footnote"
              fontWeight="semibold"
              foregroundStyle={T.text}
              lineLimit={1}
              frame={{ maxWidth: Infinity, alignment: "leading" }}
            >
              {track?.title ?? work.title}
            </Text>
            <Text
              font="caption2"
              foregroundStyle={T.sub}
              lineLimit={1}
              frame={{ maxWidth: Infinity, alignment: "leading" }}
            >
              {`${formatDuration(state.time)} / ${formatDuration(state.duration)}`}
            </Text>
          </VStack>
          <Image
            systemName="backward.fill"
            font="footnote"
            foregroundStyle={T.text}
            padding={8}
            contentShape="circle"
            onTapGesture={() => player.prev()}
          />
          <Image
            systemName={state.playing ? "pause.fill" : "play.fill"}
            font="title3"
            foregroundStyle={T.accent}
            padding={8}
            contentShape="circle"
            onTapGesture={() => player.toggle()}
          />
          <Image
            systemName="forward.fill"
            font="footnote"
            foregroundStyle={T.text}
            padding={8}
            contentShape="circle"
            onTapGesture={() => player.next()}
          />
        </HStack>
        <HStack spacing={0} frame={{ width: barW, height: 2 }} background={T.border}>
          <Rectangle fill={T.accent} frame={{ width: Math.max(2, barW * pct), height: 2 }} />
        </HStack>
      </VStack>
    </VStack>
  )
}

/** 无拇指的细滑杆：按下时轨道变粗，松手落回。 */
function Scrubber({
  time,
  duration,
  onSeek,
}: {
  time: number
  duration: number
  onSeek: (t: number) => void
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const barW = Device.screen.width - 44
  const base = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
  const pct = dragging == null ? base : dragging
  const h = dragging == null ? 4 : 8
  const clamp = (x: number) => Math.min(1, Math.max(0, x / barW))
  const fillW = Math.max(2, barW * pct)

  return (
    <ZStack
      frame={{ width: barW, height: 24 }}
      contentShape="rect"
      gesture={DragGesture({ minDistance: 0 })
        .onChanged((d) => setDragging(clamp(d.location.x)))
        .onEnded((d) => {
          onSeek(clamp(d.location.x) * duration)
          setDragging(null)
        })}
    >
      <HStack
        spacing={0}
        frame={{ width: barW, height: h }}
        background="rgba(255,255,255,0.26)"
        clipShape="capsule"
        animation={{ animation: Animation.easeOut(0.18), value: h }}
      >
        <Rectangle fill={ON.text} frame={{ width: fillW, height: h }} clipShape="capsule" />
      </HStack>
    </ZStack>
  )
}

export function PlayerPage() {
  const T = usePalette()
  const state = usePlayerState()
  const dismiss = Navigation.useDismiss()
  const [tick, setTick] = useState(0)
  const work = state.work
  const track = state.tracks[state.index]

  const [mesh, setMesh] = useState<Mesh>(() => meshFor(work?.cover))
  // 进/出播放页各推一次锁屏信息，免得系统把首次注册丢了
  useEffect(() => {
    player.refreshNowPlaying()
    return () => {
      player.refreshNowPlaying()
    }
  }, [])

  useEffect(() => {
    let alive = true
    const cover = work?.cover
    if (cover != null) {
      loadMesh(cover).then((m) => {
        if (alive) setMesh(m)
      })
    }
    return () => {
      alive = false
    }
  }, [work?.cover])

  const hasSubtitle = state.lrc.length > 0 || state.subtitleLoading
  const subtitleOpen = hasSubtitle && state.subtitleOn
  const nextList = state.tracks.slice(state.index + 1, state.index + 1 + (subtitleOpen ? 1 : 3))

  if (work == null) {
    return (
      <NavigationStack navigationTitle="播放器" navigationBarTitleDisplayMode="inline">
        <VStack
          spacing={16}
          padding={{ horizontal: 20, top: 40 }}
          background={<Rectangle fill={T.bg} ignoresSafeArea />}
        >
          <Text foregroundStyle={T.sub}>还没有在播放的内容</Text>
        </VStack>
      </NavigationStack>
    )
  }

  const duration = state.duration > 0 ? state.duration : track?.duration ?? 0
  const fav = tick >= 0 && library.isFavorite(work.id)

  const cueAt = cueIndexAt(state.lrc, state.time)
  const curLine = cueAt >= 0 ? state.lrc[cueAt].text : ""
  const prevLine = cueAt > 0 ? state.lrc[cueAt - 1].text : ""
  const nextLine = cueAt >= 0 && cueAt + 1 < state.lrc.length ? state.lrc[cueAt + 1].text : ""

  return (
    <NavigationStack
      navigationTitle=""
      navigationBarTitleDisplayMode="inline"
      navigationBarVisibility="hidden"
      navigationBarBackButtonHidden
    >
      <VStack
        spacing={0}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        safeAreaPadding={{ top: true }}
        background={<MeshBackdrop mesh={mesh} />}
      >
        {/* 顶部胶囊 */}
        <VStack frame={{ maxWidth: Infinity }} padding={{ horizontal: 18, top: 6, bottom: 2 }}>
          <ZStack
            frame={{ maxWidth: Infinity }}
            padding={{ horizontal: 16, vertical: 9 }}
            glassEffect={glass(26)}
            background={ON.glass}
            border={{ style: ON.border, width: 0.6 }}
            clipShape={shape(26)}
          >
            <VStack
              spacing={0}
              padding={{ horizontal: 26, vertical: 2 }}
              contentShape="rect"
              onTapGesture={() =>
                Navigation.present({
                  element: (
                    <NavigationStack navigationTitle="" navigationBarTitleDisplayMode="inline">
                      <WorkDetail work={work} />
                    </NavigationStack>
                  ),
                })
              }
            >
              <Text font="caption2" foregroundStyle={ON.faint}>
                正在播放
              </Text>
              <Text font="caption" fontWeight="semibold" foregroundStyle={ON.text} lineLimit={1}>
                {work.circle}
              </Text>
            </VStack>
            <HStack frame={{ maxWidth: Infinity }}>
              <Image
                systemName="chevron.down"
                font="subheadline"
                fontWeight="semibold"
                foregroundStyle={ON.text}
                padding={6}
                contentShape="rect"
                onTapGesture={() => dismiss()}
              />
              <Spacer />
              <Image
                systemName={fav ? "heart.fill" : "heart"}
                font="subheadline"
                fontWeight="semibold"
                foregroundStyle={fav ? ON.accent : ON.text}
                padding={6}
                contentShape="rect"
                onTapGesture={() => {
                  library.toggleFavorite(work)
                  setTick(tick + 1)
                }}
              />
            </HStack>
          </ZStack>
        </VStack>

        <ScrollView
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
          animation={{ animation: Animation.smooth({ duration: 0.32 }), value: subtitleOpen ? 1 : 0 }}
        >
          <VStack spacing={20} padding={{ horizontal: 22, top: 12, bottom: 44 }} frame={{ maxWidth: Infinity }}>
            <Image
              imageUrl={work.cover}
              resizable
              aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
              frame={{ maxWidth: "infinity", height: 250 }}
              clipShape={shape(22)}
              placeholder={
                <Rectangle fill={ON.glass} frame={{ maxWidth: "infinity", height: 250 }} clipShape={shape(22)} />
              }
              shadow={{ color: "rgba(0,0,0,0.55)", radius: 34, y: 16 }}
            />

            <HStack spacing={12} frame={{ maxWidth: Infinity }} alignment="top">
              <VStack alignment="leading" spacing={4} frame={{ maxWidth: Infinity }}>
                <Text
                  font="title3"
                  fontWeight="bold"
                  foregroundStyle={ON.text}
                  multilineTextAlignment="leading"
                  lineLimit={2}
                  frame={{ maxWidth: Infinity, alignment: "leading" }}
                >
                  {track?.title ?? work.title}
                </Text>
                <Text
                  font="subheadline"
                  foregroundStyle={ON.sub}
                  lineLimit={1}
                  frame={{ maxWidth: Infinity, alignment: "leading" }}
                >
                  {work.circle}
                </Text>
              </VStack>
              <Image
                systemName={state.subtitleOn ? "captions.bubble.fill" : "captions.bubble"}
                font="body"
                foregroundStyle={state.subtitleOn && hasSubtitle ? ON.accent : ON.text}
                opacity={hasSubtitle ? 1 : 0.4}
                frame={{ width: 46, height: 46 }}
                glassEffect={glassCircle()}
                background={ON.glass}
                border={{ style: ON.border, width: 0.6 }}
                clipShape="circle"
                contentShape="circle"
                onTapGesture={() => {
                  if (hasSubtitle) player.toggleSubtitle()
                }}
              />
              <Image
                systemName="list.bullet"
                font="body"
                foregroundStyle={ON.text}
                frame={{ width: 46, height: 46 }}
                glassEffect={glassCircle()}
                background={ON.glass}
                border={{ style: ON.border, width: 0.6 }}
                clipShape="circle"
                contentShape="circle"
                onTapGesture={() => Navigation.present({ element: <QueuePage /> })}
              />
            </HStack>

            <VStack spacing={2} frame={{ maxWidth: Infinity }}>
              <Scrubber time={state.time} duration={duration} onSeek={(t) => player.seek(t)} />
              <HStack frame={{ maxWidth: Infinity }}>
                <Text font="caption2" foregroundStyle={ON.sub}>
                  {formatDuration(state.time)}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={ON.sub}>
                  {`-${formatDuration(Math.max(0, duration - state.time))}`}
                </Text>
              </HStack>
            </VStack>

            <HStack spacing={26} alignment="center" frame={{ maxWidth: Infinity }}>
              <Image
                systemName="gobackward.15"
                font="title3"
                foregroundStyle={ON.text}
                frame={{ width: 46, height: 46 }}
                contentShape="circle"
                onTapGesture={() => player.seek(Math.max(0, state.time - 15))}
              />
              <Image
                systemName="backward.fill"
                font="title2"
                foregroundStyle={ON.text}
                frame={{ width: 46, height: 46 }}
                contentShape="circle"
                onTapGesture={() => player.prev()}
              />
              <Image
                systemName={state.playing ? "pause.fill" : "play.fill"}
                font="largeTitle"
                foregroundStyle="#1B1017"
                frame={{ width: 82, height: 82 }}
                background="rgba(255,255,255,0.95)"
                clipShape="circle"
                shadow={{ color: "rgba(0,0,0,0.3)", radius: 18, y: 8 }}
                contentShape="circle"
                onTapGesture={() => player.toggle()}
              />
              <Image
                systemName="forward.fill"
                font="title2"
                foregroundStyle={ON.text}
                frame={{ width: 46, height: 46 }}
                contentShape="circle"
                onTapGesture={() => player.next()}
              />
              <Image
                systemName="goforward.15"
                font="title3"
                foregroundStyle={ON.text}
                frame={{ width: 46, height: 46 }}
                contentShape="circle"
                onTapGesture={() => player.seek(Math.min(duration, state.time + 15))}
              />
            </HStack>

            {subtitleOpen ? (
              <VStack
                spacing={8}
                padding={14}
                glassEffect={glass(20)}
                background={ON.glass}
                border={{ style: ON.border, width: 0.6 }}
                clipShape={shape(20)}
                frame={{ maxWidth: Infinity }}
              >
                {state.subtitleLoading ? (
                  <Text font="caption" foregroundStyle={ON.sub} multilineTextAlignment="center">
                    字幕载入中…
                  </Text>
                ) : (
                  <VStack spacing={6} frame={{ maxWidth: Infinity, minHeight: 58 }} padding={{ vertical: 2 }}>
                    <Text font="caption2" foregroundStyle={ON.faint} multilineTextAlignment="center" lineLimit={1}>
                      {prevLine}
                    </Text>
                    <Text
                      font="subheadline"
                      fontWeight="semibold"
                      foregroundStyle={ON.text}
                      multilineTextAlignment="center"
                      lineLimit={2}
                    >
                      {curLine}
                    </Text>
                    <Text font="caption2" foregroundStyle={ON.faint} multilineTextAlignment="center" lineLimit={1}>
                      {nextLine}
                    </Text>
                  </VStack>
                )}
              </VStack>
            ) : null}

            {state.error != null ? (
              <Text font="footnote" foregroundStyle={ON.accent} multilineTextAlignment="center">
                {state.error}
              </Text>
            ) : null}

            {nextList.length > 0 ? (
              <VStack spacing={8} frame={{ maxWidth: Infinity }} padding={{ top: 2 }}>
                <Text
                  font="caption2"
                  foregroundStyle={ON.faint}
                  multilineTextAlignment="leading"
                  frame={{ maxWidth: Infinity, alignment: "leading" }}
                >
                  接下来
                </Text>
                {nextList.map((t, k) => (
                  <HStack
                    key={t.key}
                    spacing={10}
                    padding={{ horizontal: 14, vertical: 14 }}
                    background={ON.glass}
                    border={{ style: ON.border, width: 0.6 }}
                    clipShape={shape(14)}
                    frame={{ maxWidth: Infinity }}
                    contentShape="rect"
                    onTapGesture={() => player.jumpTo(state.index + 1 + k)}
                  >
                    <Text font="caption2" fontWeight="semibold" foregroundStyle={ON.accent}>
                      {String(state.index + 2 + k).padStart(2, "0")}
                    </Text>
                    <Text
                      font="footnote"
                      fontWeight="medium"
                      foregroundStyle={ON.sub}
                      multilineTextAlignment="leading"
                      lineLimit={1}
                      frame={{ maxWidth: Infinity, alignment: "leading" }}
                    >
                      {t.title}
                    </Text>
                    <Text font="caption2" foregroundStyle={ON.faint}>
                      {formatDuration(t.duration)}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            ) : null}
          </VStack>
        </ScrollView>
      </VStack>
    </NavigationStack>
  )
}

export function QueuePage() {
  const T = usePalette()
  const state = usePlayerState()
  const dismiss = Navigation.useDismiss()

  return (
    <NavigationStack navigationTitle="播放队列" navigationBarTitleDisplayMode="inline">
      <ScrollView background={<Rectangle fill={T.bg} ignoresSafeArea />}>
        <VStack spacing={8} padding={{ horizontal: 14, top: 10, bottom: 40 }} frame={{ maxWidth: Infinity }}>
          {state.tracks.length === 0 ? (
            <Text font="footnote" foregroundStyle={T.sub} multilineTextAlignment="center" padding={{ top: 24 }}>
              队列是空的
            </Text>
          ) : null}
          {state.tracks.map((t, i) => {
            const on = i === state.index
            return (
              <HStack
                key={t.key}
                spacing={12}
                padding={{ horizontal: 14, vertical: 12 }}
                background={on ? T.accentSoft : T.glassBg}
                border={{
                  style: on ? "rgba(251,114,153,0.35)" : T.glassBg,
                  width: 0.6,
                }}
                clipShape={shape(14)}
                frame={{ maxWidth: Infinity }}
                contentShape="rect"
                onTapGesture={() => {
                  player.jumpTo(i)
                  dismiss()
                }}
              >
                <ZStack frame={{ width: 26, height: 26 }}>
                  {on ? (
                    <Image systemName="waveform" font="caption" foregroundStyle={T.accent} />
                  ) : (
                    <Text font="caption2" foregroundStyle={T.faint}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                  )}
                </ZStack>
                <VStack alignment="leading" spacing={3} frame={{ maxWidth: Infinity }}>
                  <Text
                    font="subheadline"
                    fontWeight={on ? "semibold" : "regular"}
                    foregroundStyle={on ? T.text : T.subText}
                    multilineTextAlignment="leading"
                    lineLimit={2}
                    frame={{ maxWidth: Infinity, alignment: "leading" }}
                  >
                    {t.title}
                  </Text>
                  <Text font="caption2" foregroundStyle={on ? T.accent : T.faint}>
                    {formatDuration(t.duration)}
                  </Text>
                </VStack>
              </HStack>
            )
          })}
        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}
