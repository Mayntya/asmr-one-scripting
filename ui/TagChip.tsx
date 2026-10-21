import { NavigationLink, Text } from "scripting"
import { toneColors } from "../lib/palette"
import type { Tone } from "../lib/palette"
import { usePalette } from "../lib/theme"
import { TagPage } from "./TagPage"

export function Chip({ text, tone }: { text: string; tone: Tone }) {
  const T = usePalette()
  const c = toneColors(tone, T.scheme === "dark")
  return (
    <Text
      font="caption2"
      fontWeight="medium"
      foregroundStyle={c.fg}
      padding={{ horizontal: 7, vertical: 3 }}
      background={c.bg}
      clipShape={{ type: "rect", cornerRadius: 6 }}
      lineLimit={1}
    >
      {text}
    </Text>
  )
}

export function TagLink({ text, tone, kind }: { text: string; tone: Tone; kind: "tag" | "cv" }) {
  return (
    <NavigationLink destination={<TagPage kind={kind} value={text} />} buttonStyle="plain">
      <Chip text={text} tone={tone} />
    </NavigationLink>
  )
}
