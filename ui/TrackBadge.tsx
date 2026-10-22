import { Circle, Image, Rectangle, ZStack } from "scripting"
import { shape, usePalette } from "../lib/theme"

export type BadgeState = "idle" | "queued" | "running" | "done"

/** 单轨的下载状态徽章。全部用形状自绘——SF Symbol 的 circle 系列在彩色底上圆边发脏。 */
export function TrackBadge({
  state,
  ratio = 0,
  size = 20,
}: {
  state: BadgeState
  ratio?: number
  size?: number
}) {
  const T = usePalette()
  if (state === "done") {
    return (
      <ZStack frame={{ width: size, height: size }}>
        <Rectangle fill={T.accent} frame={{ width: size, height: size }} clipShape={shape(size / 2)} />
        <Image systemName="checkmark" font="caption2" fontWeight="bold" foregroundStyle={T.onAccent} />
      </ZStack>
    )
  }
  if (state === "idle") {
    return (
      <ZStack frame={{ width: size, height: size }}>
        <Circle
          stroke={{ shapeStyle: T.faint, strokeStyle: { lineWidth: 1.5 } }}
          frame={{ width: size, height: size }}
        />
        <Image systemName="arrow.down" font="caption2" fontWeight="semibold" foregroundStyle={T.faint} />
      </ZStack>
    )
  }
  const arc = state === "running" ? Math.min(0.98, Math.max(0.04, ratio)) : 0
  return (
    <ZStack frame={{ width: size, height: size }}>
      <Circle
        stroke={{ shapeStyle: T.border, strokeStyle: { lineWidth: 2 } }}
        frame={{ width: size, height: size }}
      />
      {arc > 0 ? (
        <Circle
          stroke={{ shapeStyle: T.accent, strokeStyle: { lineWidth: 2, lineCap: "round" } }}
          trim={{ from: 0, to: arc }}
          rotationEffect={-90}
          frame={{ width: size, height: size }}
        />
      ) : (
        <Image systemName="clock" font="caption2" fontWeight="semibold" foregroundStyle={T.sub} />
      )}
    </ZStack>
  )
}
