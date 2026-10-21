import { Rectangle, VStack, ZStack } from "scripting"
import type { Mesh } from "../lib/artwork"
import { deepBase } from "../lib/artwork"

type RGBA = `rgba(${number},${number},${number},${number})`

function rgba(hex: string, a: number): RGBA {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})` as RGBA
}

/**
 * 四色 mesh 背景：封面取色的四个 blob 摊在四角，叠一条自上而下的暗角。
 * 参考 BitChord 的 MeshGradientBackground。
 */
export function MeshBackdrop({ mesh, dim = 0.12 }: { mesh: Mesh; dim?: number }) {
  const anchors = [
    { x: 0.16, y: 0.16 },
    { x: 0.86, y: 0.26 },
    { x: 0.82, y: 0.86 },
    { x: 0.12, y: 0.78 },
  ]
  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} ignoresSafeArea>
      <Rectangle fill={deepBase(mesh[0])} />
      {mesh.map((c, i) => (
        <Rectangle
          key={i}
          fill={{
            stops: [
              { location: 0, color: rgba(c, 0.95) },
              { location: 0.55, color: rgba(c, 0.45) },
              { location: 1, color: rgba(c, 0) },
            ],
            center: anchors[i],
            startRadius: 0,
            endRadius: 420,
          }}
        />
      ))}
      <Rectangle fill={rgba(mesh[0], 0.16)} />
      <Rectangle
        fill={{
          colors: [`rgba(0,0,0,${dim * 0.35})`, `rgba(0,0,0,${dim + 0.18})`] as RGBA[],
          startPoint: "top",
          endPoint: "bottom",
        }}
      />
    </ZStack>
  )
}

/** 预览用：不需要网络的固定网格。 */
export function MeshBackdropDemo({ mesh }: { mesh: Mesh }) {
  return (
    <VStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <MeshBackdrop mesh={mesh} />
    </VStack>
  )
}
