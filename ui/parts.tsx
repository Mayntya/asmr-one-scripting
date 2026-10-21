import { HStack, Image, Navigation, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import type { VirtualNode } from "scripting"
import { glass, glassCircle, rjCode, shape, usePalette } from "../lib/theme"

export function PageHeader({
  title,
  right,
  onRight,
  back,
}: {
  title: string
  right?: string
  onRight?: () => void
  back?: boolean
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
          <ZStack
            frame={{ width: 38, height: 38 }}
            background={T.glassBg}
            border={{ style: T.border, width: 0.6 }}
            clipShape="circle"
            contentShape="circle"
            onTapGesture={() => dismiss()}
          >
            <Image systemName="chevron.left" font="subheadline" fontWeight="semibold" foregroundStyle={T.text} />
          </ZStack>
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
    <VStack spacing={0} background={T.card} clipShape={shape(12)} frame={{ maxWidth: Infinity }}>
      {children}
    </VStack>
  )
}

export function ListRow({
  icon,
  title,
  detail,
  value,
  chevron,
  last,
  danger,
  onTap,
}: {
  icon?: string
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
        {icon != null ? (
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
          padding={{ leading: icon != null ? 55 : 14 }}
        />
      )}
    </VStack>
  )
}
