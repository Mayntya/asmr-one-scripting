import { Image, NavigationLink, Rectangle, Text, VStack } from "scripting"
import type { Work } from "../lib/api"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"
import { WorkDetail } from "./WorkDetail"

const W = 168
const H = 126

/** Apple Podcasts 那种横向大封面卡。 */
export function PosterCard({ work }: { work: Work }) {
  const T = usePalette()
  return (
    <NavigationLink destination={<WorkDetail work={work} />} buttonStyle="plain">
      <VStack alignment="leading" spacing={7} frame={{ width: W }}>
        <Image
          imageUrl={work.cover || work.thumb}
          resizable
          scaleToFill
          aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
          frame={{ width: W, height: H }}
          clipShape={shape(12)}
          placeholder={<Rectangle fill={T.rowBgHi} frame={{ width: W, height: H }} />}
        />
        <Text
          font="subheadline"
          fontWeight="semibold"
          foregroundStyle={T.text}
          lineLimit={2}
          multilineTextAlignment="leading"
          frame={{ width: W, alignment: "leading" }}
        >
          {work.title}
        </Text>
        <Text
          font="caption2"
          foregroundStyle={T.faint}
          lineLimit={1}
          multilineTextAlignment="leading"
          frame={{ width: W, alignment: "leading" }}
        >
          {work.circle}
        </Text>
      </VStack>
    </NavigationLink>
  )
}
