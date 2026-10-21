import {
  Device,
  HStack,
  Image,
  ImageRenderer,
  Navigation,
  NavigationStack,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import type { Color } from "scripting"
import type { Work } from "../lib/api"
import { usePalette } from "../lib/theme"
import type { CardVariant } from "./ShareCard"
import { ShareCard } from "./ShareCard"

const VARIANTS: { key: CardVariant; label: string }[] = [
  { key: "poster", label: "海报" },
  { key: "classic", label: "经典" },
]

export function ShareCardSheet({ work }: { work: Work }) {
  const T = usePalette()
  const dismiss = Navigation.useDismiss()
  const [cover, setCover] = useState<UIImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [variant, setVariant] = useState<CardVariant>("poster")

  useEffect(() => {
    let alive = true
    UIImage.fromURL(work.cover).then((u) => {
      if (alive && u != null) setCover(u)
    })
    return () => {
      alive = false
    }
  }, [work.cover])

  const cardW = Math.min(370, Device.screen.width - 44)
  const card = () => <ShareCard work={work} cover={cover ?? undefined} width={cardW} variant={variant} />

  async function save() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const data = await ImageRenderer.toPNGData(card(), { scale: 3, opaque: true })
      const ok = await Photos.savePhoto(data, { fileName: `RJ${work.id}.png` })
      setMsg(ok ? "存进相册了" : "没存成，去设置里看看相册权限")
    } catch {
      setMsg("导出失败了")
    }
    setBusy(false)
  }

  async function share() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const img = await ImageRenderer.toUIImage(card(), { scale: 3, opaque: true })
      await ShareSheet.present([img])
    } catch {
      setMsg("导出失败了")
    }
    setBusy(false)
  }

  return (
    <NavigationStack navigationBarVisibility="hidden" navigationBarBackButtonHidden>
      <VStack
        spacing={0}
        frame={{ maxWidth: Infinity, maxHeight: Infinity }}
        background={T.bg}
        safeAreaPadding={{ top: true, bottom: true }}
      >
        <HStack spacing={0} padding={{ horizontal: 16, vertical: 6 }} frame={{ maxWidth: Infinity }}>
          <ZStack
            frame={{ width: 34, height: 34 }}
            background={T.rowBg}
            clipShape="circle"
            contentShape="circle"
            onTapGesture={() => dismiss()}
          >
            <Image systemName="xmark" font="footnote" fontWeight="bold" foregroundStyle={T.text} />
          </ZStack>
          <Spacer />
          <Text font="headline" fontWeight="semibold" foregroundStyle={T.text}>
            分享卡片
          </Text>
          <Spacer />
          <ZStack frame={{ width: 34, height: 34 }} />
        </HStack>

        <ScrollView>
          <VStack
            spacing={14}
            padding={{ horizontal: 16, top: 10, bottom: 20 }}
            frame={{ maxWidth: Infinity }}
          >
            <HStack spacing={8} padding={{ top: 4 }} frame={{ maxWidth: Infinity }}>
              {VARIANTS.map((v) => (
                <ZStack
                  key={v.key}
                  padding={{ horizontal: 14, vertical: 7 }}
                  frame={{ height: 32 }}
                  background={variant === v.key ? T.accent : T.rowBg}
                  clipShape="capsule"
                  contentShape="capsule"
                  onTapGesture={() => setVariant(v.key)}
                >
                  <Text
                    font="footnote"
                    fontWeight="semibold"
                    foregroundStyle={variant === v.key ? T.onAccent : T.subText}
                  >
                    {v.label}
                  </Text>
                </ZStack>
              ))}
              <Spacer />
            </HStack>

            <ShareCard work={work} cover={cover ?? undefined} width={cardW} variant={variant} />
            {msg != null ? (
              <Text font="footnote" foregroundStyle={T.subText}>
                {msg}
              </Text>
            ) : null}
          </VStack>
        </ScrollView>

        <HStack spacing={10} padding={{ horizontal: 16, bottom: 12 }} frame={{ maxWidth: Infinity }}>
          <Pill
            label="保存图片"
            primary
            bg={T.accent}
            text={T.onAccent}
            disabled={busy}
            onTap={save}
          />
          <Pill label="分享" primary={false} bg={T.rowBg} text={T.text} disabled={busy} onTap={share} />
        </HStack>
      </VStack>
    </NavigationStack>
  )
}

function Pill({
  label,
  primary,
  bg,
  text,
  disabled,
  onTap,
}: {
  label: string
  primary: boolean
  bg: Color
  text: Color
  disabled: boolean
  onTap: () => void
}) {
  return (
    <ZStack
      frame={{ maxWidth: Infinity, height: 46 }}
      contentShape="rect"
      onTapGesture={disabled ? undefined : onTap}
    >
      <Rectangle fill={bg} clipShape="capsule" opacity={primary ? 1 : 1} />
      <Text
        font="headline"
        fontWeight="semibold"
        foregroundStyle={text}
        opacity={disabled ? 0.5 : 1}
      >
        {label}
      </Text>
    </ZStack>
  )
}
