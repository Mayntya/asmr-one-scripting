import { HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import type { Work } from "../lib/api"
import { shape } from "../lib/theme"

const DEFAULT_W = 340
const PAD = 16

const RED = "#A81C4B"
const INK = "#12100F"
const MUTED = "rgba(18,16,15,0.52)"

/** 波形柱：确定性伪随机，同一个作品每次画出来一样。 */
function bars(seed: number, count: number): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const a = Math.sin((i + 1) * 12.9898 + seed * 0.731)
    const b = Math.sin((i + 1) * 4.1414 + seed * 1.937)
    const v = (Math.abs(a * 0.6 + b * 0.4) * 0.82 + 0.18) % 1
    out.push(2 + Math.round(v * 24))
  }
  return out
}

function Waveform({ seed }: { seed: number }) {
  const hs = bars(seed, 30)
  return (
    <HStack spacing={2} alignment="center">
      {hs.map((h, i) => {
        const k = i / (hs.length - 1)
        const alpha = 1 - k * 0.86
        return (
          <Rectangle
            key={i}
            fill={`rgba(168,28,75,${alpha.toFixed(2)})` as any}
            frame={{ width: 3, height: h }}
            clipShape="capsule"
          />
        )
      })}
    </HStack>
  )
}

export function ShareCard({
  work,
  cover,
  width = DEFAULT_W,
  signature = "ASMR One",
}: {
  work: Work
  cover?: UIImage
  width?: number
  signature?: string
}) {
  const INNER = width - PAD * 2
  const COVER_H = Math.round((INNER * 3) / 4)
  const code = `RJ${String(work.id).padStart(8, "0")}`
  const sub = work.vas.length > 0 ? `${work.circle} | ${work.vas.join("、")}` : work.circle
  const src: any = cover != null ? { image: cover } : { imageUrl: work.cover }

  return (
    <VStack
      spacing={0}
      padding={PAD}
      background="#FFFFFF"
      clipShape={shape(24)}
      shadow={{ color: "rgba(0,0,0,0.16)", radius: 26, y: 10 }}
      frame={{ width }}
    >
      <Image
        {...src}
        resizable
        aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
        frame={{ width: INNER, height: COVER_H }}
        clipShape={shape(16)}
        shadow={{ color: "rgba(0,0,0,0.28)", radius: 14, y: 6 }}
        placeholder={<Rectangle fill="#EEE9EC" frame={{ width: INNER, height: COVER_H }} />}
      />

      <VStack spacing={14} padding={{ top: 18 }} frame={{ maxWidth: Infinity }}>
        <HStack
          spacing={6}
          padding={{ horizontal: 14, vertical: 7 }}
          background={RED}
          clipShape="capsule"
          shadow={{ color: "rgba(168,28,75,0.32)", radius: 10, y: 4 }}
        >
          <Image systemName="waveform" font="caption" fontWeight="bold" foregroundStyle="#FFFFFF" />
          <Text font="caption" fontWeight="bold" foregroundStyle="#FFFFFF">
            {code}
          </Text>
        </HStack>

        <Text
          font="headline"
          fontWeight="bold"
          foregroundStyle={INK}
          multilineTextAlignment="center"
          lineLimit={2}
          frame={{ maxWidth: Infinity }}
        >
          {work.title}
        </Text>

        <Text
          font="subheadline"
          foregroundStyle={MUTED}
          multilineTextAlignment="center"
          lineLimit={1}
          frame={{ maxWidth: Infinity }}
        >
          {sub}
        </Text>

        <Text font="footnote" fontWeight="semibold" foregroundStyle={RED} multilineTextAlignment="center">
          A S M R . O N E
        </Text>

        <Rectangle fill="rgba(18,16,15,0.10)" frame={{ maxWidth: Infinity, height: 0.5 }} />

        <HStack spacing={10} frame={{ maxWidth: Infinity }}>
          <Waveform seed={work.id} />
          <Spacer />
          <HStack spacing={7}>
            <ZStack
              frame={{ width: 26, height: 26 }}
              background={{
                colors: ["#FB7299", "#A81C4B"],
                startPoint: "topLeading",
                endPoint: "bottomTrailing",
              }}
              clipShape="circle"
            >
              <Text font="caption2" fontWeight="bold" foregroundStyle="#FFFFFF">
                A
              </Text>
            </ZStack>
            <Text font="caption" fontWeight="semibold" foregroundStyle={INK} lineLimit={1}>
              {signature}
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </VStack>
  )
}
