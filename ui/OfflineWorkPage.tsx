import { HStack, Image, Navigation, Rectangle, ScrollView, Text, VStack, ZStack, useEffect, useState } from "scripting"
import { formatDuration } from "../lib/api"
import { fmtBytes, offlineOf, removeOffline, removeTrack, subscribeOffline } from "../lib/downloads"
import type { OfflineWork } from "../lib/downloads"
import { shape, usePalette } from "../lib/theme"
import { ConfirmLayer, GroupLabel, ListCard, ListRow, PageHeader } from "./parts"

/** 一部作品的离线缓存详情：先看作品，再点进来看具体是哪几轨。
 *  删掉最后一轨时整条记录会消失，这里顺手把自己关掉。 */
export function OfflineWorkPage({ workId }: { workId: number }) {
  const T = usePalette()
  const dismiss = Navigation.useDismiss()
  const [w, setW] = useState<OfflineWork | null>(() => offlineOf(workId))
  const [ask, setAsk] = useState<string | null>(null)

  useEffect(() => {
    const up = () => setW(offlineOf(workId))
    up()
    return subscribeOffline(up)
  }, [])

  useEffect(() => {
    if (w == null) dismiss()
  }, [w])

  if (w == null) {
    return <Rectangle fill={T.bg} ignoresSafeArea frame={{ maxWidth: Infinity, maxHeight: Infinity }} />
  }

  const hit = ask != null && ask !== "all" ? w.tracks.find((t) => t.key === ask) : null

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }}>
      <ScrollView
        navigationBarVisibility="hidden"
        background={<Rectangle fill={T.bg} ignoresSafeArea />}
      >
        <VStack
          spacing={12}
          padding={{ horizontal: 16, top: 8, bottom: 60 }}
          frame={{ maxWidth: Infinity }}
        >
          <PageHeader title="离线缓存" back />

          <HStack spacing={12} frame={{ maxWidth: Infinity }} alignment="center">
            <Image
              imageUrl={w.cover}
              resizable
              scaleToFill
              aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
              frame={{ width: 108, height: 81 }}
              clipShape={shape(12)}
              placeholder={<Rectangle fill={T.cardHi} frame={{ width: 108, height: 81 }} />}
            />
            <VStack alignment="leading" spacing={4} frame={{ maxWidth: Infinity, alignment: "leading" }}>
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text} lineLimit={3} multilineTextAlignment="leading">
                {w.title}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                {w.circle}
              </Text>
              <Text font="caption2" foregroundStyle={T.accentText}>
                {`${w.tracks.length} 轨 · ${fmtBytes(w.bytes)}`}
              </Text>
            </VStack>
          </HStack>

          <GroupLabel text="已下载的音轨" />
          <ListCard>
            {w.tracks.map((t, i) => (
              <ListRow
                key={t.key}
                icon="waveform"
                title={t.title}
                detail={[t.duration > 0 ? formatDuration(t.duration) : null, fmtBytes(t.bytes)]
                  .filter((x) => x != null)
                  .join(" · ")}
                last={i === w.tracks.length - 1}
                onTap={() => setAsk(t.key)}
              />
            ))}
          </ListCard>

          <ListCard>
            <ListRow
              icon="trash"
              title="删除整部缓存"
              detail={`释放 ${fmtBytes(w.bytes)}`}
              danger
              last
              onTap={() => setAsk("all")}
            />
          </ListCard>

          <Text
            font="caption2"
            foregroundStyle={T.faint}
            padding={{ horizontal: 4 }}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
          >
            点一条就删那一条，剩下的照常能听。
          </Text>
        </VStack>
      </ScrollView>

      {ask != null ? (
        <ConfirmLayer
          title={hit != null ? "删除这段音频？" : "删除整部缓存？"}
          message={
            hit != null
              ? `${hit.title}（${fmtBytes(hit.bytes)}）会从本机删掉。`
              : `${w.tracks.length} 轨音频会从本机删掉，释放 ${fmtBytes(w.bytes)}。`
          }
          onAction={() => {
            if (ask === "all") removeOffline(workId)
            else removeTrack(workId, ask)
            setAsk(null)
          }}
          onCancel={() => setAsk(null)}
        />
      ) : null}
    </ZStack>
  )
}
