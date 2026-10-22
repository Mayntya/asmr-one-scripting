import {
  HStack,
  Image,
  Navigation,
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
import type { TrackNode, Work } from "../lib/api"
import { flattenAudio, formatDuration, getTracks } from "../lib/api"
import { library } from "../lib/store"
import { player } from "../lib/player"
import { cancelTrack, cancelWork, enqueueTrack, fmtBytes, isTrackOffline, lastDownloadError, offlineNodes, offlineOf, removeOffline, removeTrack, subscribeOffline, taskOf, workProgress } from "../lib/downloads"
import type { OfflineWork, WorkProgress } from "../lib/downloads"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { cvTone, tagTone } from "../lib/palette"
import { TagLink } from "./TagChip"
import { PlayerPage } from "./PlayerView"
import { ShareCardSheet } from "./ShareCardSheet"
import { DownloadSheet } from "./DownloadSheet"
import { TrackBadge } from "./TrackBadge"
import { ConfirmLayer } from "./parts"

type Row =
  | { kind: "folder"; title: string; count: number }
  | { kind: "audio"; track: TrackNode; index: number }

function buildRows(nodes: TrackNode[], counter: { n: number }, out: Row[]): Row[] {
  for (const n of nodes) {
    if (n.type === "folder") {
      const before = counter.n
      const start = out.length
      buildRows(n.children, counter, out)
      out.splice(start, 0, { kind: "folder", title: n.title, count: counter.n - before })
    } else if (n.type === "audio" && n.url) {
      out.push({ kind: "audio", track: n, index: counter.n })
      counter.n += 1
    }
  }
  return out
}

export function WorkDetail({ work }: { work: Work }) {
  const T = usePalette()
  const [tracks, setTracks] = useState<TrackNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fav, setFav] = useState<boolean>(library.isFavorite(work.id))
  const [off, setOff] = useState<OfflineWork | null>(offlineOf(work.id))
  const [prog, setProg] = useState<WorkProgress | null>(workProgress(work.id))
  const [, setTick] = useState(0)
  const [ask, setAsk] = useState<"del" | "cancel" | null>(null)

  useEffect(() => {
    const up = () => {
      setOff(offlineOf(work.id))
      setProg(workProgress(work.id))
      setTick((n) => n + 1)
    }
    up()
    return subscribeOffline(up)
  }, [work.id])

  useEffect(() => {
    let alive = true
    getTracks(work.id)
      .then((list) => {
        if (!alive) return
        setTracks(list)
        setLoading(false)
      })
      .catch((e: any) => {
        if (!alive) return
        // 断网但下过：用缓存里的曲目表撑着
        const local = offlineNodes(work.id)
        if (local.length > 0) {
          setTracks(local)
          setLoading(false)
          return
        }
        setError(String(e?.message ?? e))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const audio = flattenAudio(tracks)
  const rows = buildRows(tracks, { n: 0 }, [])

  const play = (track: TrackNode) => {
    const idx = audio.findIndex((a) => a.key === track.key)
    player.playList(work, audio, idx < 0 ? 0 : idx, tracks)
    Navigation.present({ element: <PlayerPage /> })
  }

  const onTrackChip = (t: TrackNode) => {
    if (taskOf(work.id, t.key) != null) {
      cancelTrack(work.id, t.key)
      return
    }
    if (isTrackOffline(work.id, t.key)) {
      removeTrack(work.id, t.key)
      return
    }
    enqueueTrack(work, t)
  }

  /** 轨道右侧的下载状态徽章。 */
  const trackBadge = (key: string) => {
    const t = taskOf(work.id, key)
    if (t != null) return <TrackBadge state={t.state === "running" ? "running" : "queued"} ratio={t.ratio} />
    return <TrackBadge state={isTrackOffline(work.id, key) ? "done" : "idle"} />
  }

  const busy = prog != null
  const pct =
    prog != null && prog.total > 0 ? Math.min(99, Math.floor((prog.done / prog.total) * 100)) : 0
  const chipLabel = busy
    ? `${pct}%`
    : off != null
      ? off.bytes > 0
        ? fmtBytes(off.bytes)
        : "下载"
      : "下载"
  const chipIcon = busy ? "arrow.down" : off != null && off.bytes > 0 ? "checkmark" : "arrow.down.to.line"
  const chipHot = busy || (off != null && off.bytes > 0)

  const onChip = () => {
    if (busy) {
      setAsk("cancel")
      return
    }
    if (audio.length > 0) Navigation.present({ element: <DownloadSheet work={work} tracks={tracks} /> })
  }

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }}>
    <ScrollView
      navigationTitle=""
      navigationBarTitleDisplayMode="inline"
      background={<Rectangle fill={T.bg} ignoresSafeArea />}
    >
      <VStack spacing={20} padding={{ horizontal: 16, top: 10, bottom: 160 }} frame={{ maxWidth: Infinity }}>
        <Image
          imageUrl={work.cover}
          resizable
          scaleToFill
          aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
          frame={{ maxWidth: "infinity", height: 258 }}
          clipShape={shape(20)}
          placeholder={<Rectangle fill={T.card} frame={{ maxWidth: "infinity", height: 258 }} />}
          shadow={{ color: "rgba(0,0,0,0.7)", radius: 26, y: 12 }}
        />

        <VStack alignment="leading" spacing={6} frame={{ maxWidth: Infinity }}>
          <Text font="caption2" fontWeight="bold" foregroundStyle={T.accentText}>
            {rjCode(work.id)}
          </Text>
          <Text font="title2" fontWeight="bold" foregroundStyle={T.text} multilineTextAlignment="leading">
            {work.title}
          </Text>
          <Text font="subheadline" foregroundStyle={T.sub} multilineTextAlignment="leading">
            {work.circle}
          </Text>
        </VStack>

        <HStack spacing={10} frame={{ maxWidth: Infinity }} alignment="center">
          <HStack
            spacing={8}
            padding={{ horizontal: 20, vertical: 15 }}
            frame={{ maxWidth: Infinity }}
            background={T.accent}
            clipShape={shape(26)}
            contentShape="rect"
            onTapGesture={() => {
              if (audio.length === 0) return
              player.playList(work, audio, 0, tracks)
              Navigation.present({ element: <PlayerPage /> })
            }}
          >
            <Image systemName="play.fill" font="subheadline" fontWeight="bold" foregroundStyle={T.onAccent} />
            <Text font="subheadline" fontWeight="bold" foregroundStyle={T.onAccent}>
              播放全部
            </Text>
          </HStack>
          <ZStack
            frame={{ width: 52, height: 52 }}
            mask={<Rectangle fill="#FFFFFF" clipShape={shape(26)} />}
            contentShape="circle"
            onTapGesture={() => setFav(library.toggleFavorite(work))}
          >
            <Rectangle fill={T.veil} frame={{ width: 52, height: 52 }} clipShape={shape(26)} />
            <Image
              systemName={fav ? "heart.fill" : "heart"}
              font="body"
              foregroundStyle={fav ? T.accent : T.text}
            />
          </ZStack>
          <ZStack
            frame={{ width: 52, height: 52 }}
            mask={<Rectangle fill="#FFFFFF" clipShape={shape(26)} />}
            contentShape="circle"
            onTapGesture={() => Navigation.present({ element: <ShareCardSheet work={work} /> })}
          >
            <Rectangle fill={T.veil} frame={{ width: 52, height: 52 }} clipShape={shape(26)} />
            <Image systemName="square.and.arrow.up" font="body" foregroundStyle={T.text} />
          </ZStack>
        </HStack>

        <VStack
          alignment="leading"
          spacing={12}
          padding={16}
          glassEffect={glass(18)}
          background={T.glassBg}
          clipShape={shape(18)}
          frame={{ maxWidth: Infinity }}
        >
          <HStack spacing={8} frame={{ maxWidth: Infinity }}>
            <Text font="subheadline" foregroundStyle={T.sub}>
              {formatDuration(work.duration)}
            </Text>
            <Spacer />
            <Image systemName="star.fill" font="caption2" foregroundStyle={T.accent} />
            <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text}>
              {work.rate.toFixed(2)}
            </Text>
            <Text font="caption2" foregroundStyle={T.faint}>
              {`(${work.rateCount})`}
            </Text>
          </HStack>

          <HStack spacing={6} frame={{ maxWidth: Infinity }}>
            <Text font="caption" foregroundStyle={T.sub}>
              {`${work.dlCount.toLocaleString()} DL`}
            </Text>
            <Text font="caption" foregroundStyle={T.faint}>
              ·
            </Text>
            <Text font="caption" foregroundStyle={T.sub}>
              {work.release}
            </Text>
            <Spacer />
          </HStack>

          {work.vas.length > 0 ? (
            <VStack alignment="leading" spacing={6} frame={{ maxWidth: Infinity }}>
              <Text font="caption2" foregroundStyle={T.faint}>
                CV
              </Text>
              <HStack spacing={6}>
                {work.vas.slice(0, 3).map((v) => (
                  <TagLink key={v} text={v} tone={cvTone(v)} kind="cv" />
                ))}
                {work.vas.length > 3 ? (
                  <Text font="caption2" foregroundStyle={T.faint}>
                    {`+${work.vas.length - 3}`}
                  </Text>
                ) : null}
                <Spacer />
              </HStack>
            </VStack>
          ) : null}

          {work.tags.length > 0 ? (
            <HStack spacing={6}>
              {work.tags.slice(0, 4).map((t) => (
                <TagLink key={t} text={t} tone={tagTone(t)} kind="tag" />
              ))}
              {work.tags.length > 4 ? (
                <Text font="caption2" foregroundStyle={T.faint}>
                  {`+${work.tags.length - 4}`}
                </Text>
              ) : null}
              <Spacer />
            </HStack>
          ) : null}
        </VStack>

        <HStack frame={{ maxWidth: Infinity }} alignment="center" spacing={8}>
          <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
            曲目
          </Text>
          <Spacer />
          <Text font="caption2" foregroundStyle={T.faint}>
            {loading ? "读取中…" : `${audio.length} 轨`}
          </Text>
          <HStack
            spacing={4}
            padding={{ horizontal: 9, vertical: 4 }}
            background={T.veil}
            clipShape={shape(11)}
            contentShape="rect"
            onTapGesture={onChip}
          >
            <Image
              systemName={chipIcon}
              font="caption2"
              fontWeight="semibold"
              foregroundStyle={chipHot ? T.accentText : T.sub}
            />
            <Text font="caption2" fontWeight="semibold" foregroundStyle={chipHot ? T.accentText : T.sub}>
              {chipLabel}
            </Text>
          </HStack>
        </HStack>

        {loading ? (
          <HStack spacing={8} padding={{ vertical: 14 }}>
            <ProgressView />
            <Text font="caption" foregroundStyle={T.sub}>
              正在读取曲目…
            </Text>
          </HStack>
        ) : null}

        {error != null ? (
          <Text font="footnote" foregroundStyle={T.accentText}>
            {error}
          </Text>
        ) : null}

        {(() => {
          const e = lastDownloadError()
          return e != null && e.workId === work.id && (prog == null || prog.running + prog.queued === 0) ? (
            <Text font="caption2" foregroundStyle={T.accentText}>
              {`下载中断：${e.message}`}
            </Text>
          ) : null
        })()}

        {rows.map((row) =>
          row.kind === "folder" ? (
            <HStack spacing={8} padding={{ top: 12, bottom: 2 }} frame={{ maxWidth: Infinity }} alignment="center">
              <Image systemName="folder" font="caption" foregroundStyle={T.faint} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text}>
                {row.title}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                {`${row.count} 轨`}
              </Text>
              <Spacer />
            </HStack>
          ) : (
            <HStack
              spacing={12}
              padding={{ horizontal: 12, vertical: 13 }}
              background={T.rowBg}
              border={{ style: T.border, width: 0.5 }}
              clipShape={shape(16)}
              frame={{ maxWidth: Infinity }}
              contentShape="rect"
              onTapGesture={() => play(row.track)}
            >
              <Text
                font="caption"
                fontWeight="medium"
                foregroundStyle={T.faint}
                multilineTextAlignment="center"
                frame={{ width: 22 }}
              >
                {row.index + 1}
              </Text>
              <Text
                font="subheadline"
                foregroundStyle={T.subText}
                multilineTextAlignment="leading"
                lineLimit={2}
                frame={{ maxWidth: Infinity, alignment: "leading" }}
              >
                {row.track.title.replace(/\.mp3$/i, "")}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                {formatDuration(row.track.duration)}
              </Text>
              <HStack
                spacing={0}
                frame={{ width: 34, height: 34 }}
                contentShape="rect"
                onTapGesture={() => onTrackChip(row.track)}
              >
                {trackBadge(row.track.key)}
              </HStack>
            </HStack>
          )
        )}
      </VStack>
    </ScrollView>

      {ask != null ? (
        <ConfirmLayer
          title="停止下载？"
          message={`已经下完的 ${prog?.done ?? 0} 轨会留在本机，排队中的取消掉。`}
          action="停止"
          onAction={() => {
            cancelWork(work.id)
            setAsk(null)
          }}
          onCancel={() => setAsk(null)}
        />
      ) : null}
    </ZStack>
  )
}
