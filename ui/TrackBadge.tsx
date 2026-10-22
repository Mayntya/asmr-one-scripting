import { Circle, Path2D, PathShape, Rectangle, ZStack } from "scripting"
import { shape, usePalette } from "../lib/theme"

export type BadgeState = "idle" | "queued" | "running" | "done"

/** 单轨的下载状态徽章。
 *  箭头、勾、圆环全部是矢量形状，一个 SF Symbol 都不用——字形的圆弧在彩色底上会发虚，
 *  也就是「图标没抠干净」的来源。 */
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
  // 20pt 直径配 5pt 环宽，跟 iOS 活动圆环一个比例；大尺寸反过来变细，不然就是个甜甜圈
  const w = size <= 24 ? Math.max(2, size / 4) : Math.max(3, size / 10)
  const ring = { width: size, height: size }
  const line = size * 0.12

  if (state === "done") {
    const mark = new Path2D((p) => {
      p.move({ x: size * 0.27, y: size * 0.52 })
      p.addLine({ x: size * 0.44, y: size * 0.7 })
      p.addLine({ x: size * 0.74, y: size * 0.31 })
    })
    return (
      <ZStack frame={ring}>
        <Rectangle fill={T.accent} frame={ring} clipShape={shape(size / 2)} />
        <PathShape
          path={mark}
          stroke={{ shapeStyle: T.onAccent, strokeStyle: { lineWidth: line, lineCap: "round", lineJoin: "round" } }}
          frame={ring}
        />
      </ZStack>
    )
  }

  if (state === "idle") {
    const arrow = new Path2D((p) => {
      p.move({ x: size / 2, y: size * 0.2 })
      p.addLine({ x: size / 2, y: size * 0.62 })
      p.move({ x: size * 0.28, y: size * 0.46 })
      p.addLine({ x: size / 2, y: size * 0.66 })
      p.addLine({ x: size * 0.72, y: size * 0.46 })
    })
    return (
      <ZStack frame={ring}>
        <PathShape
          path={arrow}
          stroke={{ shapeStyle: T.faint, strokeStyle: { lineWidth: line, lineCap: "round", lineJoin: "round" } }}
          frame={ring}
        />
      </ZStack>
    )
  }

  const arc = state === "running" ? Math.min(1, Math.max(0.02, ratio)) : 0
  return (
    <ZStack frame={ring}>
      <Circle stroke={{ shapeStyle: T.rowBgHi, strokeStyle: { lineWidth: w } }} frame={ring} />
      {arc > 0 ? (
        <Circle
          stroke={{ shapeStyle: T.accent, strokeStyle: { lineWidth: w, lineCap: "round" } }}
          trim={{ from: 0, to: arc }}
          rotationEffect={-90}
          frame={ring}
        />
      ) : (
        <Rectangle
          fill={T.sub}
          frame={{ width: size * 0.24, height: size * 0.24 }}
          clipShape={shape(size / 2)}
        />
      )}
    </ZStack>
  )
}
