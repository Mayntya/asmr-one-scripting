import { HStack, Image, Spacer, Text, VStack, useEffect, useState } from "scripting"
import type { Work } from "../lib/api"
import { fetchWikiWork, workRj } from "../lib/wiki"
import type { WikiWork } from "../lib/wiki"
import { glass, shape, usePalette } from "../lib/theme"

/** 按字数截断，但尽量切在标点上，别把句子断在括号里。 */
function clip(s: string, n: number): string {
  if (s.length <= n) return s
  const head = s.slice(0, n)
  const cut = Math.max(
    head.lastIndexOf("。"),
    head.lastIndexOf("！"),
    head.lastIndexOf("？"),
    head.lastIndexOf("，")
  )
  const base = cut > n * 0.55 ? head.slice(0, cut) : head
  return base.replace(/[\s、，。（(「]+$/, "") + "…"
}

/** 详情页的中文补充信息，数据来自 J-ASMR Wiki（命中才显示）。 */
export function WikiCard({ work }: { work: Work }) {
  const T = usePalette()
  const [data, setData] = useState<WikiWork | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    fetchWikiWork(workRj(work.id))
      .then((w) => {
        if (!live) return
        setData(w)
        setLoaded(true)
      })
      .catch(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [work.id])

  if (!loaded || data == null) return null

  const sameTitle = data.title.replace(/\s/g, "") === work.title.replace(/\s/g, "")
  const hasBody = data.desc.length > 0 || data.highlights.length > 0
  if (!hasBody) return null

  // lineLimit 只裁显示不改高度，收起的正文会和下面的要点叠在一起，所以自己截字。
  const desc = open ? data.desc : clip(data.desc, 110)

  return (
    <VStack
      alignment="leading"
      spacing={10}
      padding={16}
      glassEffect={glass(18)}
      background={T.glassBg}
      clipShape={shape(18)}
      frame={{ maxWidth: Infinity }}
    >
      <HStack spacing={6} frame={{ maxWidth: Infinity }}>
        <Text font="caption" fontWeight="semibold" foregroundStyle={T.accent}>
          中文简介
        </Text>
        <Spacer />
        <Text font="caption2" foregroundStyle={T.faint}>
          J-ASMR Wiki
        </Text>
      </HStack>

      {sameTitle ? null : (
        <Text font="headline" fontWeight="semibold" foregroundStyle={T.text} lineLimit={3} multilineTextAlignment="leading">
          {data.title}
        </Text>
      )}

      {data.desc.length > 0 ? (
        <Text
          font="subheadline"
          foregroundStyle={T.sub}
          multilineTextAlignment="leading"
          frame={{ maxWidth: Infinity, alignment: "leading" }}
          onTapGesture={() => setOpen(!open)}
        >
          {desc}
        </Text>
      ) : null}

      {open && data.highlights.length > 0 ? (
        <VStack alignment="leading" spacing={6} frame={{ maxWidth: Infinity }}>
          {data.highlights.map((h) => (
            <HStack key={h} spacing={6} alignment="top" frame={{ maxWidth: Infinity }}>
              <Image systemName="checkmark" font="caption2" foregroundStyle={T.accent} />
              <Text
                font="caption"
                foregroundStyle={T.sub}
                multilineTextAlignment="leading"
                frame={{ maxWidth: Infinity, alignment: "leading" }}
              >
                {h}
              </Text>
            </HStack>
          ))}
        </VStack>
      ) : null}

      <HStack spacing={8} frame={{ maxWidth: Infinity }}>
        {data.format.length > 0 ? (
          <Text font="caption2" foregroundStyle={T.faint}>
            {data.format}
          </Text>
        ) : null}
        {data.size.length > 0 ? (
          <Text font="caption2" foregroundStyle={T.faint}>
            {`· ${data.size}`}
          </Text>
        ) : null}
        <Spacer />
        {data.desc.length > 60 ? (
          <Text font="caption2" fontWeight="semibold" foregroundStyle={T.accent} onTapGesture={() => setOpen(!open)}>
            {open ? "收起" : "展开"}
          </Text>
        ) : null}
      </HStack>
    </VStack>
  )
}
