import { HStack, LazyVGrid, Rectangle, ScrollView, Spacer, Text, VStack } from "scripting"
import { fmtHM, topCircles, topTags } from "../lib/stats"
import { shape, usePalette } from "../lib/theme"
import { EmptyState, GroupLabel, ListCard, PageHeader } from "./parts"

export function RadarPage() {
  const T = usePalette()
  const circles = topCircles(10)
  const tags = topTags(20)

  return (
    <ScrollView navigationBarVisibility="hidden" background={<Rectangle fill={T.bg} ignoresSafeArea />}>
      <VStack spacing={10} padding={{ horizontal: 16, top: 8, bottom: 60 }} frame={{ maxWidth: Infinity }}>
        <PageHeader title="口味" back />

        {tags.length === 0 ? (
          <EmptyState icon="slider.horizontal.3" text="听几部作品，这里会按社团和标签归好类。" />
        ) : (
          <>
            {circles.length > 0 ? (
              <>
                <GroupLabel text="常听的社团" />
                <ListCard>
                  {circles.map((c, i) => (
                    <VStack spacing={0} frame={{ maxWidth: Infinity }}>
                      <HStack
                        spacing={12}
                        padding={{ horizontal: 14, vertical: 12 }}
                        frame={{ maxWidth: Infinity }}
                        alignment="center"
                      >
                        <Text font="body" lineLimit={1} foregroundStyle={T.text}>
                          {c.name}
                        </Text>
                        <Spacer />
                        <Text font="caption2" foregroundStyle={T.faint}>
                          {`${c.works} 部`}
                        </Text>
                        <Text font="footnote" foregroundStyle={T.sub}>
                          {fmtHM(c.seconds)}
                        </Text>
                      </HStack>
                      {i === circles.length - 1 ? null : (
                        <Rectangle
                          fill={T.border}
                          frame={{ maxWidth: "infinity", height: 0.5 }}
                          padding={{ leading: 14 }}
                        />
                      )}
                    </VStack>
                  ))}
                </ListCard>
              </>
            ) : null}

            <GroupLabel text="常听的标签" />

            <LazyVGrid
              columns={[
                { size: { type: "flexible" }, spacing: 8 },
                { size: { type: "flexible" }, spacing: 8 },
              ]}
              spacing={8}
            >
              {tags.map((t) => (
                <HStack
                  spacing={6}
                  padding={{ horizontal: 12, vertical: 10 }}
                  background={T.card}
                  clipShape={shape(10)}
                  frame={{ maxWidth: Infinity }}
                >
                  <Text font="caption" lineLimit={1} frame={{ maxWidth: Infinity, alignment: "leading" }}>
                    {t.name}
                  </Text>
                  <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                    {fmtHM(t.seconds)}
                  </Text>
                </HStack>
              ))}
            </LazyVGrid>
          </>
        )}
      </VStack>
    </ScrollView>
  )
}
