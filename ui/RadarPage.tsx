import { HStack, Image, LazyVGrid, NavigationLink, Rectangle, ScrollView, Spacer, Text, VStack } from "scripting"
import { circleTone, tagTone, toneColors } from "../lib/palette"
import { fmtHM, topCircles, topTags } from "../lib/stats"
import { shape, usePalette } from "../lib/theme"
import { EmptyState, GroupLabel, ListCard, PageHeader } from "./parts"
import { TagPage } from "./TagPage"

export function RadarPage() {
  const T = usePalette()
  const dark = T.scheme === "dark"
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
                  {circles.map((item, i) => {
                    const c = toneColors(circleTone(item.name), dark)
                    return (
                      <VStack spacing={0} frame={{ maxWidth: Infinity }}>
                        <NavigationLink destination={<TagPage kind="circle" value={item.name} />} buttonStyle="plain">
                          <HStack
                            spacing={10}
                            padding={{ horizontal: 14, vertical: 12 }}
                            frame={{ maxWidth: Infinity }}
                            alignment="center"
                            contentShape="rect"
                          >
                            <Rectangle fill={c.fg} frame={{ width: 8, height: 8 }} clipShape="capsule" />
                            <Text
                              font="body"
                              lineLimit={1}
                              foregroundStyle={T.text}
                              frame={{ maxWidth: Infinity, alignment: "leading" }}
                            >
                              {item.name}
                            </Text>
                            <Text font="caption2" foregroundStyle={T.faint}>
                              {`${item.works} 部`}
                            </Text>
                            <Text font="footnote" foregroundStyle={T.sub}>
                              {fmtHM(item.seconds)}
                            </Text>
                            <Image systemName="chevron.right" font="caption2" foregroundStyle={T.faint} />
                          </HStack>
                        </NavigationLink>
                        {i === circles.length - 1 ? null : (
                          <Rectangle
                            fill={T.border}
                            frame={{ maxWidth: "infinity", height: 0.5 }}
                            padding={{ leading: 32 }}
                          />
                        )}
                      </VStack>
                    )
                  })}
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
              {tags.map((tag) => {
                const c = toneColors(tagTone(tag.name), dark)
                return (
                  <NavigationLink
                    key={tag.name}
                    destination={<TagPage kind="tag" value={tag.name} />}
                    buttonStyle="plain"
                  >
                    <HStack
                      spacing={6}
                      padding={{ horizontal: 12, vertical: 10 }}
                      background={c.bg}
                      clipShape={shape(10)}
                      frame={{ maxWidth: Infinity }}
                      contentShape="rect"
                    >
                      <Text font="caption" lineLimit={1} foregroundStyle={c.fg} frame={{ maxWidth: Infinity, alignment: "leading" }}>
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
        )}
      </VStack>
    </ScrollView>
  )
}
