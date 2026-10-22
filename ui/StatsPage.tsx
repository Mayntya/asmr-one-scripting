import {
  GeometryReader,
  HStack,
  Image,
  LazyVGrid,
  NavigationLink,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "scripting"
import type { Work } from "../lib/api"
import { circleTone, cvTone, tagTone, toneColors } from "../lib/palette"
import { NIGHT_HOURS, fmtHM, hourLabel, topCircles, topLoops, topTags, topVas, totals } from "../lib/stats"
import type { ListenRecord } from "../lib/store"
import { library } from "../lib/store"
import { shape, usePalette } from "../lib/theme"
import { EmptyState, GroupLabel, ListCard, PageHeader } from "./parts"
import { TagPage } from "./TagPage"
import { WorkDetail } from "./WorkDetail"

const BAR_H = 86

/** 用收听记录拼出作品对象，缓存里有真身就用真身。 */
function workOf(rec: ListenRecord): Work {
  const hit = library.cachedWorks.find((w) => w.id === rec.workId)
  if (hit != null) return hit
  return {
    id: rec.workId,
    title: rec.workTitle,
    circle: rec.circle,
    vas: rec.vas,
    tags: rec.tags,
    duration: 0,
    nsfw: false,
    rate: 0,
    rateCount: 0,
    dlCount: 0,
    release: "",
    cover: rec.cover,
    thumb: rec.cover,
    samCover: rec.cover,
  }
}

/** 24 小时分布。深夜那六根用强调色，其余用暗轨色；空小时也给 2pt，免得断成虚线。 */
function HourBars({ hours }: { hours: number[] }) {
  const T = usePalette()
  const max = Math.max(1, ...hours)
  return (
    <HStack alignment="bottom" spacing={2} frame={{ maxWidth: Infinity, height: BAR_H }}>
      {hours.map((s, h) => {
        const night = NIGHT_HOURS.includes(h)
        const hh = Math.max(s > 0 ? 4 : 2, Math.round((s / max) * BAR_H))
        return (
          <Rectangle
            key={h}
            fill={night ? T.accent : T.rowBgHi}
            frame={{ maxWidth: Infinity, height: hh }}
            clipShape={shape(3)}
          />
        )
      })}
    </HStack>
  )
}

/** 一条按实际宽度算的比例条。外层宽度由 GeometryReader 量，不靠猜。 */
function RatioBar({ ratio, color }: { ratio: number; color: any }) {
  const T = usePalette()
  const w = Math.max(0, Math.min(1, ratio))
  return (
    <VStack spacing={0} frame={{ maxWidth: Infinity, height: 4 }}>
      <GeometryReader>
        {(p) => (
          <HStack
            spacing={0}
            frame={{ width: p.size.width, height: 4, alignment: "leading" }}
            background={T.rowBgHi}
            clipShape="capsule"
          >
            <Rectangle fill={color} frame={{ width: Math.max(4, p.size.width * w), height: 4 }} />
          </HStack>
        )}
      </GeometryReader>
    </VStack>
  )
}

export function StatsPage() {
  const T = usePalette()
  const dark = T.scheme === "dark"
  const t = totals()
  const loops = topLoops(1)[0]
  const circles = topCircles(10)
  const vas = topVas(5)
  const tags = topTags(20)
  const maxCircle = Math.max(1, circles.length > 0 ? circles[0].seconds : 1)

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
              spacing={12}
              padding={16}
              frame={{ maxWidth: Infinity }}
              background={T.card}
              clipShape={shape(16)}
            >
              <VStack alignment="leading" spacing={3} frame={{ maxWidth: Infinity, alignment: "leading" }}>
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

              <HourBars hours={t.hours} />

              <HStack spacing={0} frame={{ maxWidth: Infinity }}>
                <Text font="caption2" foregroundStyle={T.faint}>
                  {"00"}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {"06"}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {"12"}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {"18"}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {"23"}
                </Text>
              </HStack>

              <HStack spacing={6} alignment="center" frame={{ maxWidth: Infinity }}>
                <Rectangle fill={T.accent} frame={{ width: 6, height: 6 }} clipShape="capsule" />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {`深夜 22–04 占 ${Math.round(t.nightRatio * 100)}%`}
                </Text>
                <Spacer />
                <Text font="caption2" foregroundStyle={T.faint}>
                  {`最常在 ${hourLabel(t.peakHour)}:00`}
                </Text>
              </HStack>
            </VStack>

            {loops != null ? (
              <>
                <GroupLabel text="最常播放" />
                <ListCard>
                  <NavigationLink destination={<WorkDetail work={workOf(loops)} />} buttonStyle="plain">
                    <HStack
                      spacing={12}
                      padding={{ horizontal: 14, vertical: 12 }}
                      frame={{ maxWidth: Infinity }}
                      alignment="center"
                      contentShape="rect"
                    >
                      <ZStack
                        frame={{ width: 29, height: 29 }}
                        background={toneColors(tagTone(loops.trackTitle), dark).bg}
                        clipShape={shape(7)}
                      >
                        <Image
                          systemName="repeat"
                          font="footnote"
                          fontWeight="semibold"
                          foregroundStyle={toneColors(tagTone(loops.trackTitle), dark).fg}
                        />
                      </ZStack>
                      <VStack alignment="leading" spacing={2} frame={{ maxWidth: Infinity, alignment: "leading" }}>
                        <Text font="body" lineLimit={1} foregroundStyle={T.text} frame={{ maxWidth: Infinity, alignment: "leading" }}>
                          {loops.trackTitle}
                        </Text>
                        <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                          {`播放 ${loops.plays} 次 · ${fmtHM(loops.seconds)}`}
                        </Text>
                      </VStack>
                      <Image systemName="chevron.right" font="caption2" foregroundStyle={T.faint} />
                    </HStack>
                  </NavigationLink>
                </ListCard>
              </>
            ) : null}

            {circles.length > 0 ? (
              <>
                <GroupLabel text="常听的社团" />
                <ListCard>
                  {circles.map((item, i) => {
                    const c = toneColors(circleTone(item.name), dark)
                    return (
                      <VStack spacing={0} frame={{ maxWidth: Infinity }}>
                        <NavigationLink destination={<TagPage kind="circle" value={item.name} />} buttonStyle="plain">
                          <VStack
                            spacing={8}
                            padding={{ horizontal: 14, vertical: 12 }}
                            frame={{ maxWidth: Infinity }}
                            contentShape="rect"
                          >
                            <HStack spacing={8} frame={{ maxWidth: Infinity }} alignment="center">
                              <Rectangle fill={c.fg} frame={{ width: 8, height: 8 }} clipShape="capsule" />
                              <Text
                                font="body"
                                lineLimit={1}
                                foregroundStyle={T.text}
                                frame={{ maxWidth: Infinity, alignment: "leading" }}
                              >
                                {item.name}
                              </Text>
                              <Text font="footnote" foregroundStyle={T.sub}>
                                {fmtHM(item.seconds)}
                              </Text>
                              <Image systemName="chevron.right" font="caption2" foregroundStyle={T.faint} />
                            </HStack>
                            <RatioBar ratio={item.seconds / maxCircle} color={c.fg} />
                          </VStack>
                        </NavigationLink>
                        {i === circles.length - 1 ? null : (
                          <Rectangle fill={T.border} frame={{ maxWidth: "infinity", height: 0.5 }} />
                        )}
                      </VStack>
                    )
                  })}
                </ListCard>
              </>
            ) : null}

            {vas.length > 0 ? (
              <>
                <GroupLabel text="常听的声优" />
                <ListCard>
                  {vas.map((v, i) => {
                    const c = toneColors(cvTone(v.name), dark)
                    return (
                      <VStack spacing={0} frame={{ maxWidth: Infinity }}>
                        <NavigationLink destination={<TagPage kind="cv" value={v.name} />} buttonStyle="plain">
                          <HStack
                            spacing={12}
                            padding={{ horizontal: 14, vertical: 12 }}
                            frame={{ maxWidth: Infinity }}
                            alignment="center"
                            contentShape="rect"
                          >
                            <Text
                              font="footnote"
                              fontWeight="semibold"
                              foregroundStyle={c.fg}
                              frame={{ width: 29, height: 29 }}
                              background={c.bg}
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
                            <Image systemName="chevron.right" font="caption2" foregroundStyle={T.faint} />
                          </HStack>
                        </NavigationLink>
                        {i === vas.length - 1 ? null : (
                          <Rectangle
                            fill={T.border}
                            frame={{ maxWidth: "infinity", height: 0.5 }}
                            padding={{ leading: 55 }}
                          />
                        )}
                      </VStack>
                    )
                  })}
                </ListCard>
              </>
            ) : null}

            {tags.length > 0 ? (
              <>
                <GroupLabel text="常听的标签" />
                <LazyVGrid
                  columns={[
                    { size: { type: "flexible" }, spacing: 8 },
                    { size: { type: "flexible" }, spacing: 8 },
                  ]}
                  spacing={8}
                >
                  {tags.map((tag) => {
                    const c = toneColors(tagTone(tag.name), dark)
                    return (
                      <NavigationLink key={tag.name} destination={<TagPage kind="tag" value={tag.name} />} buttonStyle="plain">
                        <HStack
                          spacing={6}
                          padding={{ horizontal: 12, vertical: 10 }}
                          background={c.bg}
                          clipShape={shape(10)}
                          frame={{ maxWidth: Infinity }}
                          contentShape="rect"
                        >
                          <Text
                            font="caption"
                            lineLimit={1}
                            foregroundStyle={c.fg}
                            frame={{ maxWidth: Infinity, alignment: "leading" }}
                          >
                            {tag.name}
                          </Text>
                          <Text font="caption2" foregroundStyle={c.fg} opacity={0.65} lineLimit={1}>
                            {fmtHM(tag.seconds)}
                          </Text>
                        </HStack>
                      </NavigationLink>
                    )
                  })}
                </LazyVGrid>
              </>
            ) : null}
          </>
        )}
      </VStack>
    </ScrollView>
  )
}
