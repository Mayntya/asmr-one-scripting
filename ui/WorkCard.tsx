import { HStack, Image, NavigationLink, Rectangle, Spacer, Text, VStack } from "scripting"
import type { Work } from "../lib/api"
import { formatDuration } from "../lib/api"
import { cvTone, tagTone } from "../lib/palette"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { TagLink } from "./TagChip"
import { WorkDetail } from "./WorkDetail"

export function WorkCard({ work }: { work: Work }) {
  const T = usePalette()
  const tags = work.tags.slice(0, 2)
  const rest = work.tags.length - tags.length
  const cv = work.vas.slice(0, 1)
  const cvRest = work.vas.length - cv.length

  return (
    <VStack spacing={0} background={T.card} clipShape={shape(16)} frame={{ maxWidth: Infinity }} alignment="leading">
      <NavigationLink destination={<WorkDetail work={work} />} buttonStyle="plain">
        <HStack spacing={12} padding={12} frame={{ maxWidth: Infinity }} alignment="top">
          <Image
            imageUrl={work.thumb}
            resizable
            scaleToFill
            aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
            frame={{ width: 76, height: 57 }}
            clipShape={shape(16)}
            placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: 76, height: 57 }} />}
          />
          <VStack alignment="leading" spacing={4} frame={{ maxWidth: Infinity }}>
            <HStack spacing={8} frame={{ maxWidth: Infinity }}>
              <Text font="caption2" fontWeight="semibold" foregroundStyle={T.accentText}>
                {rjCode(work.id)}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                {work.circle}
              </Text>
              <Spacer />
              <Text font="caption2" foregroundStyle={T.accentText}>
                {formatDuration(work.duration)}
              </Text>
            </HStack>
            <Text font="footnote" lineLimit={2} multilineTextAlignment="leading" frame={{ maxWidth: Infinity, alignment: "leading" }}>
              {work.title}
            </Text>
            <HStack spacing={8} frame={{ maxWidth: Infinity }}>
              <Text font="caption2" foregroundStyle={T.faint}>
                {`★ ${work.rate.toFixed(2)}`}
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                {`${(work.dlCount / 1000).toFixed(0)}k DL`}
              </Text>
              <Spacer />
              <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
                {work.release}
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </NavigationLink>

      {work.tags.length > 0 || work.vas.length > 0 ? (
        <HStack spacing={6} padding={{ horizontal: 12, bottom: 10 }} frame={{ maxWidth: Infinity }}>
          {tags.map((t) => (
            <TagLink key={t} text={t} tone={tagTone(t)} kind="tag" />
          ))}
          {rest > 0 ? (
            <Text font="caption2" foregroundStyle={T.faint}>
              {`+${rest}`}
            </Text>
          ) : null}
          <Spacer />
          {cv.map((v) => (
            <TagLink key={v} text={v} tone={cvTone(v)} kind="cv" />
          ))}
          {cvRest > 0 ? (
            <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
              {`+${cvRest}`}
            </Text>
          ) : null}
        </HStack>
      ) : null}
    </VStack>
  )
}
