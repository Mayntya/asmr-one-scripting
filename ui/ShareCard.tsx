import { HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import type { Work } from "../lib/api"
import { shape } from "../lib/theme"

const DEFAULT_W = 340
const PAD = 16

const RED = "#A81C4B"
const INK = "#12100F"
const MUTED = "rgba(18,16,15,0.52)"

const ACCENT = "#FF5C8D"
const DARK = "#151114"
const DARK_SOFT = "#211B1F"

export type CardVariant = "classic" | "poster"

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

function Waveform({ seed, color, count = 30 }: { seed: number; color: string; count?: number }) {
  const hs = bars(seed, count)
  return (
    <HStack spacing={2} alignment="center">
      {hs.map((h, i) => {
        const k = i / (hs.length - 1)
        const alpha = 1 - k * 0.7
        return (
          <Rectangle
            key={i}
            fill={`rgba(${color},${alpha.toFixed(2)})` as any}
            frame={{ width: 2.5, height: Math.round(h * 0.82) }}
            clipShape="capsule"
          />
        )
      })}
    </HStack>
  )
}

function coverSource(work: Work, cover?: UIImage): any {
  return cover != null ? { image: cover } : { imageUrl: work.cover }
}

function rjCode(work: Work): string {
  return `RJ${String(work.id).padStart(8, "0")}`
}

function credit(work: Work): string {
  return work.vas.length > 0 ? `${work.circle}｜${work.vas.join("、")}` : work.circle
}

/** 旧版：白底、居中、红色编号胶囊。 */
function ShareCardClassic({
  work,
  cover,
  width,
  signature,
}: {
  work: Work
  cover?: UIImage
  width: number
  signature: string
}) {
  const INNER = width - PAD * 2
  const COVER_H = Math.round((INNER * 3) / 4)

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
        {...coverSource(work, cover)}
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
            {rjCode(work)}
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
          {credit(work)}
        </Text>

        <Text font="footnote" fontWeight="semibold" foregroundStyle={RED} multilineTextAlignment="center">
          A S M R . O N E
        </Text>

        <Rectangle fill="rgba(18,16,15,0.10)" frame={{ maxWidth: Infinity, height: 0.5 }} />

        <HStack spacing={10} frame={{ maxWidth: Infinity }}>
          <Waveform seed={work.id} color="168,28,75" />
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

/** 新版：深底海报感，封面出血满幅，信息区左对齐，比经典款少一层内边距。 */
function ShareCardPoster({
  work,
  cover,
  width,
  signature,
}: {
  work: Work
  cover?: UIImage
  width: number
  signature: string
}) {
  const COVER_H = Math.round((width * 3) / 4)

  return (
    <VStack
      spacing={0}
      background={DARK}
      clipShape={shape(26)}
      shadow={{ color: "rgba(21,17,20,0.34)", radius: 28, y: 12 }}
      frame={{ width }}
    >
      <Image
        {...coverSource(work, cover)}
        resizable
        aspectRatio={{ value: 4 / 3, contentMode: "fill" }}
        frame={{ width, height: COVER_H }}
        placeholder={<Rectangle fill={DARK_SOFT} frame={{ width, height: COVER_H }} />}
      />

      <VStack
        spacing={0}
        padding={{ horizontal: 16, top: 15, bottom: 15 }}
        frame={{ maxWidth: Infinity }}
      >
        <HStack spacing={0} frame={{ maxWidth: Infinity }}>
          <Text font="caption2" fontWeight="bold" foregroundStyle="rgba(255,255,255,0.40)">
            A S M R . O N E
          </Text>
          <Spacer />
          <Text font="caption2" fontWeight="semibold" foregroundStyle="rgba(255,255,255,0.30)">
            {rjCode(work)}
          </Text>
        </HStack>

        <VStack spacing={7} padding={{ top: 10 }} frame={{ maxWidth: Infinity }}>
          <Text
            font="headline"
            fontWeight="bold"
            foregroundStyle="#FFFFFF"
            multilineTextAlignment="leading"
            lineLimit={2}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
          >
            {work.title}
          </Text>
          <Text
            font="subheadline"
            foregroundStyle="rgba(255,255,255,0.55)"
            multilineTextAlignment="leading"
            lineLimit={1}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
          >
            {credit(work)}
          </Text>
        </VStack>

        <HStack spacing={0} padding={{ top: 14 }} frame={{ maxWidth: Infinity }}>
          <Rectangle fill="rgba(255,255,255,0.12)" frame={{ maxWidth: Infinity, height: 0.5 }} />
        </HStack>

        <HStack spacing={10} padding={{ top: 12 }} frame={{ maxWidth: Infinity }}>
          <Waveform seed={work.id} color="255,92,141" count={24} />
          <Spacer />
          <HStack spacing={6}>
            <ZStack frame={{ width: 22, height: 22 }} background={ACCENT} clipShape="circle">
              <Text font="caption2" fontWeight="bold" foregroundStyle="#2A0E17">
                A
              </Text>
            </ZStack>
            <Text font="caption" fontWeight="semibold" foregroundStyle="rgba(255,255,255,0.74)" lineLimit={1}>
              {signature}
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </VStack>
  )
}

export function ShareCard({
  work,
  cover,
  width = DEFAULT_W,
  signature = "ASMR One",
  variant = "poster",
}: {
  work: Work
  cover?: UIImage
  width?: number
  signature?: string
  variant?: CardVariant
}) {
  if (variant === "classic") {
    return <ShareCardClassic work={work} cover={cover} width={width} signature={signature} />
  }
  return <ShareCardPoster work={work} cover={cover} width={width} signature={signature} />
}
