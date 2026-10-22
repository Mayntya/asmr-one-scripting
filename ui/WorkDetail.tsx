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
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { cvTone, tagTone } from "../lib/palette"
import { TagLink } from "./TagChip"
import { PlayerPage } from "./PlayerView"
import { ShareCardSheet } from "./ShareCardSheet"

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

  return (
    <ScrollView navigationTitle="" navigationBarTitleDisplayMode="inline" background={<Rectangle fill={T.bg} ignoresSafeArea />}>
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
            clipShape={shape(16)}
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
            <Rectangle fill={T.rowBgHi} frame={{ width: 52, height: 52 }} clipShape={shape(26)} />
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
            <Rectangle fill={T.rowBgHi} frame={{ width: 52, height: 52 }} clipShape={shape(26)} />
            <Image systemName="square.and.arrow.up" font="body" foregroundStyle={T.text} />
          </ZStack>
        </HStack>

        <VStack
          alignment="leading"
          spacing={12}
          padding={16}
          glassEffect={glass(18)}
          background={T.glassBg}
          border={{ style: T.rowBgHi, width: 0.6 }}
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

        <HStack frame={{ maxWidth: Infinity }} alignment="center">
          <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
            曲目
          </Text>
          <Spacer />
          <Text font="caption2" foregroundStyle={T.faint}>
            {loading ? "读取中…" : `${audio.length} 轨`}
          </Text>
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
              clipShape={shape(12)}
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
            </HStack>
          )
        )}
      </VStack>
    </ScrollView>
  )
}
