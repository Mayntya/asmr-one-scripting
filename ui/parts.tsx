import { HStack, Image, Navigation, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import type { Color, VirtualNode } from "scripting"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"

export function PageHeader({
  title,
  right,
  onRight,
  back,
  trailing,
}: {
  title: string
  right?: string
  onRight?: () => void
  back?: boolean
  /** 右侧额外控件（圆形按钮之类），排在 right 文字后面。 */
  trailing?: any
}) {
  const T = usePalette()
  const dismiss = Navigation.useDismiss()
  return (
    <ZStack frame={{ maxWidth: Infinity, minHeight: 40 }}>
      <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
        {title}
      </Text>
      <HStack spacing={10} frame={{ maxWidth: Infinity }} alignment="center">
        {back === true ? (
          <HStack
            frame={{ width: 36, height: 36 }}
            contentShape="circle"
            onTapGesture={() => dismiss()}
            background={T.veil}
            clipShape="circle"
            shadow={LIFT}
          >
            <Image systemName="chevron.left" font="title3" fontWeight="semibold" foregroundStyle={T.text} />
          </HStack>
        ) : null}
        <Spacer />
        {right != null ? (
          <Text
            font="body"
            fontWeight="semibold"
            foregroundStyle={T.accentText}
            contentShape="rect"
            onTapGesture={() => onRight?.()}
          >
            {right}
          </Text>
        ) : null}
        {trailing ?? null}
      </HStack>
    </ZStack>
  )
}

export function SectionLabel({ text, right }: { text: string; right?: string }) {  const T = usePalette()
  return (
    <HStack frame={{ maxWidth: Infinity }} padding={{ top: 4 }} alignment="center">
      <Text font="title3" fontWeight="bold" foregroundStyle={T.text}>
        {text}
      </Text>
      <Spacer />
      {right != null ? (
        <Text font="footnote" foregroundStyle={T.faint}>
          {right}
        </Text>
      ) : null}
    </HStack>
  )
}

export function Stat({ value, label }: { value: string; label: string }) {
  const T = usePalette()
  return (
    <VStack alignment="leading" spacing={1} frame={{ maxWidth: Infinity }}>
      <Text font="title" fontWeight="bold" foregroundStyle={T.accentText}>
        {value}
      </Text>
      <Text font="caption2" foregroundStyle={T.faint}>
        {label}
      </Text>
    </VStack>
  )
}

export function Meter({ ratio, height = 3 }: { ratio: number; height?: number }) {
  const T = usePalette()
  const w = Math.max(0, Math.min(1, ratio))
  return (
    <HStack spacing={0} frame={{ maxWidth: Infinity }}>
      <Rectangle fill={T.accentText} frame={{ width: Math.max(1, 300 * w), height }} clipShape="capsule" />
      <Rectangle fill={T.rowBgHi} frame={{ maxWidth: "infinity", height }} clipShape="capsule" />
    </HStack>
  )
}

export function Badge({ n, hot }: { n: number; hot?: boolean }) {
  const T = usePalette()
  const on = hot === true || n <= 3
  return (
    <Text
      font="caption2"
      fontWeight="bold"
      foregroundStyle={on ? T.onAccent : T.sub}
      frame={{ width: 24, height: 20 }}
      background={on ? T.accentText : T.rowBgHi}
      clipShape={{ type: "rect", cornerRadius: 5 }}
      multilineTextAlignment="center"
    >
      {String(n)}
    </Text>
  )
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {  const T = usePalette()
  return (
    <VStack spacing={10} padding={{ top: 80 }} frame={{ maxWidth: Infinity }}>
      <Image systemName={icon} font="largeTitle" foregroundStyle={T.cardHi} />
      <Text font="footnote" foregroundStyle={T.sub} multilineTextAlignment="center">
        {text}
      </Text>
    </VStack>
  )
}

/** 分组小标题：Apple 设置页那种全大写灰字。 */
export function GroupLabel({ text }: { text: string }) {
  const T = usePalette()
  return (
    <Text
      font="footnote"
      foregroundStyle={T.faint}
      padding={{ horizontal: 4, top: 6 }}
      frame={{ maxWidth: Infinity, alignment: "leading" }}
    >
      {text}
    </Text>
  )
}

/** 一组圆角列表。行间分隔线由 ListRow 自己画。 */
export function ListCard({ children }: { children: any }) {
  const T = usePalette()
  return (
    <VStack spacing={0} background={T.card} clipShape={shape(16)} frame={{ maxWidth: Infinity }}>
      {children}
    </VStack>
  )
}

export function ListRow({
  icon,
  imageUrl,
  title,
  detail,
  value,
  chevron,
  last,
  danger,
  onTap,
}: {
  icon?: string
  /** 左侧改用封面缩略图（横图比例，不用方块）。 */
  imageUrl?: string
  title: string
  detail?: string
  value?: string
  chevron?: boolean
  last?: boolean
  danger?: boolean
  onTap?: () => void
}) {
  const T = usePalette()
  return (
    <VStack spacing={0} frame={{ maxWidth: Infinity }}>
      <HStack
        spacing={12}
        padding={{ horizontal: 14, vertical: 12 }}
        frame={{ maxWidth: Infinity }}
        alignment="center"
        contentShape="rect"
        onTapGesture={onTap}
      >
        {imageUrl != null ? (
          <Image
            imageUrl={imageUrl}
            resizable
            scaleToFill
            frame={{ width: 40, height: 30 }}
            clipShape={shape(7)}
          />
        ) : icon != null ? (
          <Image
            systemName={icon}
            font="footnote"
            fontWeight="semibold"
            foregroundStyle={danger === true ? T.accent : T.accentText}
            frame={{ width: 29, height: 29 }}
            background={danger === true ? T.accentSoft : T.cardHi}
            clipShape={shape(7)}
            multilineTextAlignment="center"
          />
        ) : null}
        <VStack alignment="leading" spacing={1}>
          <Text font="body" foregroundStyle={danger === true ? T.accent : T.text} lineLimit={1}>
            {title}
          </Text>
          {detail != null ? (
            <Text font="caption2" foregroundStyle={T.faint} lineLimit={1}>
              {detail}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        {value != null ? (
          <Text font="body" foregroundStyle={T.faint} lineLimit={1}>
            {value}
          </Text>
        ) : null}
        {chevron === true ? (
          <Image systemName="chevron.right" font="caption2" fontWeight="semibold" foregroundStyle={T.faint} />
        ) : null}
      </HStack>
      {last === true ? null : (
        <Rectangle
          fill={T.border}
          frame={{ maxWidth: "infinity", height: 0.5 }}
          padding={{ leading: imageUrl != null || icon != null ? 55 : 14 }}
        />
      )}
    </VStack>
  )
}

const SHADE: Color = "rgba(0, 0, 0, 0.28)"
/** 玻璃控件的投影，弹层和胶囊共用。 */
export const LIFT = { color: "rgba(0, 0, 0, 0.38)" as Color, radius: 26, y: 9 }

/** 自绘确认弹层。系统 confirmationDialog 在这个 App 里会把导航栈顶掉，
 *  还会被渲染到屏幕最底部，所以自己画。父视图必须是 ZStack。
 *  造型跟 iOS 26 对齐：一块玻璃卡片 + 两个独立胶囊玻璃按钮。 */
export function ConfirmLayer({
  title,
  message,
  action = "删除",
  danger = true,
  onAction,
  onCancel,
}: {
  title: string
  message: string
  action?: string
  danger?: boolean
  onAction: () => void
  onCancel: () => void
}) {
  const T = usePalette()
  const veil: Color = T.veil
  const lift = LIFT
  const pill = (label: string, color: Color, fn: () => void) => (
    <HStack
      frame={{ maxWidth: Infinity, minHeight: 50 }}
      contentShape="rect"
      onTapGesture={fn}
      background={veil}
      clipShape={shape(25)}
      shadow={lift}
    >
      <Text font="body" fontWeight="semibold" foregroundStyle={color}>
        {label}
      </Text>
    </HStack>
  )
  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }}>
      <Rectangle
        fill={SHADE}
        ignoresSafeArea
        frame={{ maxWidth: Infinity, maxHeight: Infinity }}
        onTapGesture={onCancel}
      />
      <VStack spacing={10} frame={{ maxWidth: 296 }}>
        <VStack
          alignment="leading"
          spacing={7}
          padding={{ horizontal: 22, vertical: 20 }}
          frame={{ maxWidth: Infinity }}
          background={veil}
          clipShape={shape(28)}
          shadow={lift}
        >
          <Text
            font="headline"
            fontWeight="semibold"
            foregroundStyle={T.text}
            multilineTextAlignment="leading"
          >
            {title}
          </Text>
          <Text font="subheadline" foregroundStyle={T.subText} multilineTextAlignment="leading">
            {message}
          </Text>
        </VStack>
        {pill(action, danger ? T.accent : T.accentText, onAction)}
        {pill("取消", T.text, onCancel)}
      </VStack>
    </ZStack>
  )
}
