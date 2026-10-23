import {
  HStack,
  Rectangle,
  ScrollView,
  Slider,
  Spacer,
  Text,
  VStack,
  ZStack,
  useState,
} from "scripting"
import {
  ACCENTS,
  CUSTOM_PREFIX,
  accentKey,
  currentAccent,
  palette,
  setAccent,
  setThemeMode,
  shape,
  themeMode,
  usePalette,
} from "../lib/theme"
import type { AccentPreset, ThemeMode } from "../lib/theme"
import { GroupLabel, ListCard, ListRow, PageHeader } from "./parts"

const MODES: { key: ThemeMode; name: string; icon: string; detail: string }[] = [
  { key: "system", name: "跟随系统", icon: "circle.lefthalf.filled", detail: "系统切深色就跟着切" },
  { key: "light", name: "浅色", icon: "sun.max", detail: "一直用浅色" },
  { key: "dark", name: "深色", icon: "moon", detail: "一直用深色" },
]

export function AppearancePage() {
  const T = usePalette()
  const [, bump] = useState(0)
  const active = accentKey()
  const cur = currentAccent()
  const isCustom = cur.key.startsWith(CUSTOM_PREFIX)
  const [hue, setHue] = useState(cur.hue)

  const refresh = () => bump((n) => n + 1)
  const pick = (key: string) => {
    setAccent(key)
    const hit = ACCENTS.find((a) => a.key === key)
    if (hit != null) setHue(hit.hue)
    refresh()
  }

  /** 色块用同一套派生规则算色，跟实际界面完全一致。 */
  const swatchColor = (a: AccentPreset) => palette(T.scheme, a).accent

  const dot = (a: AccentPreset) => {
    const on = active === a.key
    return (
      <VStack key={a.key} spacing={6} contentShape="rect" onTapGesture={() => pick(a.key)}>
        <ZStack frame={{ width: 46, height: 46 }}>
          {on ? <Rectangle fill={T.rowBgHi} frame={{ width: 46, height: 46 }} clipShape="circle" /> : null}
          <Rectangle fill={swatchColor(a)} frame={{ width: 30, height: 30 }} clipShape="circle" />
        </ZStack>
        <Text font="caption2" foregroundStyle={on ? T.accentText : T.faint} lineLimit={1}>
          {a.name}
        </Text>
      </VStack>
    )
  }

  const customOn = isCustom
  const customColor = palette(T.scheme, { key: "live", name: "自定义", hue, sat: 0.74 }).accent

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }}>
      <ScrollView
        navigationBarVisibility="hidden"
        background={<Rectangle fill={T.bg} ignoresSafeArea />}
      >
        <VStack spacing={10} padding={{ horizontal: 16, top: 8, bottom: 60 }} frame={{ maxWidth: Infinity }}>
          <PageHeader title="外观" back />

          <GroupLabel text="外观模式" />
          <ListCard>
            {MODES.map((m, i) => (
              <ListRow
                key={m.key}
                icon={m.icon}
                title={m.name}
                detail={m.detail}
                checked={themeMode() === m.key}
                last={i === MODES.length - 1}
                onTap={() => {
                  setThemeMode(m.key)
                  refresh()
                }}
              />
            ))}
          </ListCard>

          <GroupLabel text="主题色调" />
          <ListCard>
            <VStack spacing={8} padding={{ horizontal: 12, top: 12, bottom: 14 }} frame={{ maxWidth: Infinity }}>
              {[ACCENTS.slice(0, 6), ACCENTS.slice(6)].map((row, i) => (
                <HStack key={i} spacing={10} frame={{ maxWidth: Infinity }}>
                  {row.map(dot)}
                  <Spacer />
                </HStack>
              ))}
            </VStack>
          </ListCard>

          <GroupLabel text="自定义色调" />
          <ListCard>
            <VStack spacing={10} padding={{ horizontal: 14, vertical: 14 }} frame={{ maxWidth: Infinity }}>
              <HStack spacing={10} frame={{ maxWidth: Infinity }} alignment="center">
                <Rectangle fill={customColor} frame={{ width: 26, height: 26 }} clipShape="circle" />
                <Text font="body" foregroundStyle={T.text}>
                  色相
                </Text>
                <Spacer />
                <Text font="footnote" foregroundStyle={T.faint}>
                  {`${Math.round(hue)}°`}
                </Text>
                {customOn ? (
                  <Text font="caption" fontWeight="semibold" foregroundStyle={T.accentText}>
                    使用中
                  </Text>
                ) : null}
              </HStack>
              <Slider
                min={0}
                max={360}
                step={1}
                value={hue}
                tint={T.accent}
                onChanged={(v: number) => setHue(v)}
                onEditingChanged={(editing: boolean) => {
                  if (!editing) pick(CUSTOM_PREFIX + Math.round(hue))
                }}
              />
            </VStack>
          </ListCard>

          <GroupLabel text="预览" />
          <VStack
            spacing={12}
            padding={16}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
            background={T.card}
            clipShape={shape(18)}
          >
            <HStack spacing={12} frame={{ maxWidth: Infinity }} alignment="center">
              <ZStack frame={{ width: 42, height: 42 }} background={T.accentSoft} clipShape={shape(11)}>
                <Text font="title3" fontWeight="bold" foregroundStyle={T.accentText}>
                  音
                </Text>
              </ZStack>
              <VStack alignment="leading" spacing={2}>
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={T.text}>
                  示例作品标题
                </Text>
                <Text font="caption2" foregroundStyle={T.faint}>
                  社团名 · 2026-09-26
                </Text>
              </VStack>
              <Spacer />
            </HStack>
            <HStack spacing={8} frame={{ maxWidth: Infinity }}>
              <Text
                font="footnote"
                fontWeight="semibold"
                foregroundStyle={T.onAccent}
                padding={{ horizontal: 16, vertical: 8 }}
                background={T.accent}
                clipShape="capsule"
              >
                播放
              </Text>
              <Text
                font="footnote"
                fontWeight="semibold"
                foregroundStyle={T.text}
                padding={{ horizontal: 16, vertical: 8 }}
                background={T.rowBg}
                clipShape="capsule"
              >
                收藏
              </Text>
              <Spacer />
              <Text font="caption2" foregroundStyle={T.faint}>
                当前模式：{themeMode() === "system" ? "跟随系统" : themeMode() === "light" ? "浅色" : "深色"}
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </ZStack>
  )
}
