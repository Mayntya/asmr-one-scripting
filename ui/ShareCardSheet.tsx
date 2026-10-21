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
import { ShareCard } from "./ShareCard"

export function ShareCardSheet({ work }: { work: Work }) {
  const T = usePalette()
  const dismiss = Navigation.useDismiss()
  const [cover, setCover] = useState<UIImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
  const card = () => <ShareCard work={work} cover={cover ?? undefined} />

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
            <ShareCard work={work} cover={cover ?? undefined} width={cardW} />
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
