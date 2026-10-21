import { HStack, Image, NavigationLink, Rectangle, Spacer, Text, VStack } from "scripting"
import type { Work } from "../lib/api"
import { formatDuration } from "../lib/api"
import { tagTone } from "../lib/palette"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { TagLink } from "./TagChip"
import { WorkDetail } from "./WorkDetail"

/** 比 WorkCard 大一档的列表行：大封面 + 大标题。 */
export function WorkRowBig({ work }: { work: Work }) {
  const T = usePalette()
  const tags = work.tags.slice(0, 2)
  const rest = work.tags.length - tags.length

  return (
    <VStack alignment="leading" spacing={0} background={T.card} clipShape={shape(14)} frame={{ maxWidth: Infinity }}>
      <NavigationLink destination={<WorkDetail work={work} />} buttonStyle="plain">
        <HStack spacing={12} padding={10} frame={{ maxWidth: Infinity }} alignment="top">
          <Image
            imageUrl={work.cover || work.thumb}
            resizable
            scaleToFill
            aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
            frame={{ width: 100, height: 75 }}
            clipShape={shape(10)}
            placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: 100, height: 75 }} />}
          />
          <VStack alignment="leading" spacing={4} frame={{ maxWidth: Infinity }}>
            <Text
              font="subheadline"
              fontWeight="semibold"
              lineLimit={2}
              multilineTextAlignment="leading"
              frame={{ maxWidth: Infinity, alignment: "leading" }}
            >
              {work.title}
            </Text>
            <Text
              font="caption2"
              foregroundStyle={T.faint}
              lineLimit={1}
              multilineTextAlignment="leading"
              frame={{ maxWidth: Infinity, alignment: "leading" }}
            >
              {work.circle}
            </Text>
            <HStack spacing={8} frame={{ maxWidth: Infinity }}>
              <Text font="caption2" fontWeight="semibold" foregroundStyle={T.accentText}>
                {formatDuration(work.duration)}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                {`★ ${work.rate.toFixed(2)}`}
              </Text>
              <Spacer />
              <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                {`${(work.dlCount / 1000).toFixed(0)}k DL`}
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </NavigationLink>

      {tags.length > 0 ? (
        <HStack spacing={6} padding={{ horizontal: 10, bottom: 10 }} frame={{ maxWidth: Infinity }}>
          {tags.map((t) => (
            <TagLink key={t} text={t} tone={tagTone(t)} kind="tag" />
          ))}
          {rest > 0 ? (
            <Text font="caption2" foregroundStyle={T.faint}>
              {`+${rest}`}
            </Text>
          ) : null}
          <Spacer />
        </HStack>
      ) : null}
    </VStack>
  )
}
