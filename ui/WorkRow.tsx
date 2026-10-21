import { HStack, Image, NavigationLink, Rectangle, Spacer, Text, VStack } from "scripting"
import type { Work } from "../lib/api"
import { formatDuration } from "../lib/api"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { WorkDetail } from "./WorkDetail"

export function WorkRow({ work, subtitle }: { work: Work; subtitle?: string }) {
  const T = usePalette()
  return (
    <NavigationLink
      destination={<WorkDetail work={work} />}
      contentShape="rect"
    >
      <HStack spacing={10} padding={{ vertical: 4 }}>
        <Image
          imageUrl={work.thumb}
          resizable
          scaleToFill
          aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
          frame={{ width: 68, height: 51 }}
          clipShape={shape(8)}
          placeholder={<Rectangle fill="systemGray5" frame={{ width: 68, height: 51 }} />}
        />
        <VStack alignment="leading" spacing={3}>
          <Text font="footnote" lineLimit={2} multilineTextAlignment="leading">
            {work.title}
          </Text>
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1} multilineTextAlignment="leading">
            {subtitle != null ? subtitle : work.circle}
          </Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="leading">
            {formatDuration(work.duration)}
            {work.rate > 0 ? `  ·  ★${work.rate.toFixed(1)}` : ""}
            {`  ·  ${work.dlCount >= 1000 ? Math.round(work.dlCount / 1000) + "k" : work.dlCount} DL`}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    </NavigationLink>
  )
}
