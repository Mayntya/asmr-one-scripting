import { HStack, Image, Rectangle, ScrollView, Spacer, Text, VStack, ZStack } from "scripting"
import { NIGHT_HOURS, fmtHM, hourLabel, totals, topLoops, topVas } from "../lib/stats"
import { shape, usePalette } from "../lib/theme"
import { EmptyState, GroupLabel, ListCard, PageHeader } from "./parts"

function Bar({ seconds, max, night }: { seconds: number; max: number; night: boolean }) {
  const T = usePalette()
  const h = seconds <= 0 ? 3 : Math.max(4, Math.round((seconds / max) * 96))
  return (
    <VStack spacing={0} alignment="center" frame={{ maxWidth: Infinity }}>
      <Rectangle
        fill={seconds <= 0 ? T.rowBgHi : night ? T.accent : T.faint}
        frame={{ maxWidth: "infinity", height: h }}
        clipShape={{ type: "rect", cornerRadius: 2 }}
      />
    </VStack>
  )
}

export function StatsPage() {
  const T = usePalette()
  const t = totals()
  const loops = topLoops(1)[0]
  const vas = topVas(3)
  const max = Math.max(1, ...t.hours)

  return (
    <ScrollView navigationBarVisibility="hidden" background={<Rectangle fill={T.bg} ignoresSafeArea />}>
      <VStack spacing={10} padding={{ horizontal: 16, top: 8, bottom: 60 }} frame={{ maxWidth: Infinity }}>
        <PageHeader title="收听" back />

        {t.seconds <= 0 ? (
          <EmptyState icon="waveform" text="还没有收听记录。放一轨，这里就有了。" />
        ) : (
          <>
            <VStack
              alignment="leading"
              spacing={3}
              padding={{ horizontal: 16, vertical: 16 }}
              frame={{ maxWidth: Infinity, alignment: "leading" }}
              background={T.card}
              clipShape={shape(12)}
            >
              <Text font="footnote" foregroundStyle={T.faint}>
                累计收听
              </Text>
              <Text font="largeTitle" fontWeight="bold" foregroundStyle={T.text}>
                {fmtHM(t.seconds)}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                {`${t.workCount} 部作品 · ${t.trackCount} 个单集 · ${t.playCount} 次播放`}
              </Text>
            </VStack>

            <GroupLabel text="时段" />
            <VStack
              spacing={10}
              padding={16}
              background={T.card}
              clipShape={shape(12)}
              frame={{ maxWidth: Infinity }}
            >
              <HStack spacing={6} frame={{ maxWidth: Infinity }}>
                <Text font="caption2" foregroundStyle={T.faint}>
                  一天里听得最多的是
                </Text>
                <Text font="caption2" fontWeight="semibold" foregroundStyle={T.accentText}>
                  {`${hourLabel(t.peakHour)}:00`}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {fmtHM(t.peakSeconds)}
                </Text>
              </HStack>

              <HStack spacing={3} alignment="bottom" frame={{ height: 104, maxWidth: Infinity }} padding={{ top: 6 }}>
                {t.hours.map((s, i) => (
                  <Bar seconds={s} max={max} night={NIGHT_HOURS.includes(i)} />
                ))}
              </HStack>

              <HStack spacing={0} frame={{ maxWidth: Infinity }}>
                {["00", "06", "12", "18", "24"].map((l) => (
                  <VStack alignment="leading" frame={{ maxWidth: "infinity" }}>
                    <Text font="caption2" foregroundStyle={T.faint}>
                      {l}
                    </Text>
                  </VStack>
                ))}
              </HStack>

              <HStack spacing={6} alignment="center">
                <Rectangle fill={T.accent} frame={{ width: 8, height: 8 }} clipShape="capsule" />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {`22:00 – 04:00，占 ${Math.round(t.nightRatio * 100)}%`}
                </Text>
              </HStack>
            </VStack>

            {loops != null ? (
              <>
                <GroupLabel text="最常播放" />
                <ListCard>
                  <HStack spacing={12} padding={{ horizontal: 14, vertical: 12 }} frame={{ maxWidth: Infinity }}>
                    <ZStack
                      frame={{ width: 29, height: 29 }}
                      background={T.accentSoft}
                      clipShape={shape(7)}
                    >
                      <Image systemName="repeat" font="footnote" fontWeight="semibold" foregroundStyle={T.accentText} />
                    </ZStack>
                    <VStack alignment="leading" spacing={2}>
                      <Text font="body" lineLimit={1} foregroundStyle={T.text}>
                        {loops.trackTitle}
                      </Text>
                      <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                        {`播放 ${loops.plays} 次 · ${fmtHM(loops.seconds)}`}
                      </Text>
                    </VStack>
                    <Spacer />
                  </HStack>
                </ListCard>
              </>
            ) : null}

            {vas.length > 0 ? (
              <>
                <GroupLabel text="常听的声优" />
                <ListCard>
                  {vas.map((v, i) => (
                    <VStack spacing={0} frame={{ maxWidth: Infinity }}>
                      <HStack
                        spacing={12}
                        padding={{ horizontal: 14, vertical: 12 }}
                        frame={{ maxWidth: Infinity }}
                        alignment="center"
                      >
                        <Text
                          font="footnote"
                          fontWeight="semibold"
                          foregroundStyle={T.accentText}
                          frame={{ width: 29, height: 29 }}
                          background={T.cardHi}
                          clipShape={shape(7)}
                          multilineTextAlignment="center"
                        >
                          {String(i + 1)}
                        </Text>
                        <Text font="body" lineLimit={1} foregroundStyle={T.text}>
                          {v.name}
                        </Text>
                        <Spacer />
                        <Text font="footnote" foregroundStyle={T.faint}>
                          {fmtHM(v.seconds)}
                        </Text>
                      </HStack>
                      {i === vas.length - 1 ? null : (
                        <Rectangle
                          fill={T.border}
                          frame={{ maxWidth: "infinity", height: 0.5 }}
                          padding={{ leading: 55 }}
                        />
                      )}
                    </VStack>
                  ))}
                </ListCard>
              </>
            ) : null}
          </>
        )}
      </VStack>
    </ScrollView>
  )
}
