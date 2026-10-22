import {
  HStack,
  Image,
  Navigation,
  NavigationStack,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  useState,
} from "scripting"
import type { TrackNode, Work } from "../lib/api"
import type { DlGroup } from "../lib/downloads"
import { enqueueTracks, fmtBytes, groupTracks, isTrackOffline } from "../lib/downloads"
import { shape, usePalette } from "../lib/theme"

/** 同一份音声常有 mp3 / wav 两套，目录里还可能分「SE 有り / SE 無し」。
 *  默认每种目录只勾体积最小的一套，用户自己再改。 */
function defaultSel(groups: DlGroup[], workId: number): Set<string> {
  const byDir = new Map<string, DlGroup[]>()
  for (const g of groups) {
    const arr = byDir.get(g.dir) ?? []
    arr.push(g)
    byDir.set(g.dir, arr)
  }
  const out = new Set<string>()
  for (const gs of byDir.values()) {
    const fresh = gs.filter((g) => g.audio && g.tracks.some((t) => !isTrackOffline(workId, t.key)))
    if (fresh.length === 0) continue
    const mp3 = fresh.find((g) => g.ext === "mp3")
    const pick = mp3 ?? fresh.reduce((a, b) => (b.bytes < a.bytes ? b : a))
    out.add(pick.id)
  }
  return out
}

export function DownloadSheet({ work, tracks }: { work: Work; tracks: TrackNode[] }) {
  const T = usePalette()
  const dismiss = Navigation.useDismiss()
  const groups = groupTracks(tracks)
  const [sel, setSel] = useState<Set<string>>(() => defaultSel(groups, work.id))

  const chosen = groups.filter((g) => sel.has(g.id))
  const chosenTracks = chosen.flatMap((g) => g.tracks).filter((t) => !isTrackOffline(work.id, t.key))
  const chosenBytes = chosen.reduce((n, g) => n + g.bytes, 0)

  const toggle = (id: string) => {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSel(next)
  }

  const start = () => {
    if (chosenTracks.length === 0) return
    enqueueTracks(work, chosenTracks)
    dismiss()
  }

  const allOn = groups.every((g) => sel.has(g.id))

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
            mask={<Rectangle fill="#FFFFFF" clipShape={shape(17)} />}
            contentShape="circle"
            onTapGesture={() => dismiss()}
          >
            <Rectangle fill={T.veil} frame={{ width: 34, height: 34 }} clipShape={shape(17)} />
            <Image systemName="xmark" font="footnote" fontWeight="bold" foregroundStyle={T.text} />
          </ZStack>
          <Spacer />
          <Text font="headline" fontWeight="semibold" foregroundStyle={T.text}>
            选择下载
          </Text>
          <Spacer />
          <HStack
            spacing={0}
            padding={{ horizontal: 12, vertical: 7 }}
            background={T.veil}
            clipShape={shape(14)}
            contentShape="rect"
            onTapGesture={() => setSel(allOn ? new Set() : new Set(groups.map((g) => g.id)))}
          >
            <Text font="footnote" fontWeight="semibold" foregroundStyle={T.subText}>
              {allOn ? "清空" : "全选"}
            </Text>
          </HStack>
        </HStack>

        <ScrollView>
          <VStack spacing={10} padding={{ horizontal: 16, top: 8, bottom: 24 }} frame={{ maxWidth: Infinity }}>
            {groups.length > 1 ? (
              <Text font="caption" foregroundStyle={T.faint} multilineTextAlignment="leading" frame={{ maxWidth: Infinity, alignment: "leading" }}>
                同一个音声常有 mp3 和 wav 两套，选一套就够，别重复下。
              </Text>
            ) : null}

            {groups.map((g) => {
              const on = sel.has(g.id)
              const have = g.tracks.filter((t) => isTrackOffline(work.id, t.key)).length
              const kind = g.audio ? g.ext.toUpperCase() : `${g.ext.toUpperCase()} 视频`
              const title = g.dir === "" ? kind : g.dir
              const tail = `${g.tracks.length} 轨 · ${fmtBytes(g.bytes)}${have > 0 ? ` · 已有 ${have} 轨` : ""}`
              const sub = g.dir === "" ? tail : `${kind} · ${tail}`
              return (
                <HStack
                  key={g.id}
                  spacing={12}
                  padding={{ horizontal: 14, vertical: 13 }}
                  background={T.rowBg}
                  border={{ style: T.border, width: 0.5 }}
                  clipShape={shape(16)}
                  frame={{ maxWidth: Infinity }}
                  contentShape="rect"
                  onTapGesture={() => toggle(g.id)}
                >
                  <ZStack frame={{ width: 22, height: 22 }} mask={<Rectangle fill="#FFFFFF" clipShape={shape(11)} />}>
                    <Rectangle
                      fill={on ? T.accent : T.bg}
                      frame={{ width: 22, height: 22 }}
                      clipShape={shape(11)}
                      border={{ style: T.sub, width: 1 }}
                    />
                    {on ? (
                      <Image systemName="checkmark" font="caption2" fontWeight="bold" foregroundStyle={T.onAccent} />
                    ) : null}
                  </ZStack>
                  <VStack alignment="leading" spacing={3} frame={{ maxWidth: Infinity, alignment: "leading" }}>
                    <Text
                      font="subheadline"
                      fontWeight="semibold"
                      foregroundStyle={T.text}
                      multilineTextAlignment="leading"
                      lineLimit={2}
                      frame={{ maxWidth: Infinity, alignment: "leading" }}
                    >
                      {title}
                    </Text>
                    <Text
                      font="caption2"
                      foregroundStyle={T.faint}
                      multilineTextAlignment="leading"
                      frame={{ maxWidth: Infinity, alignment: "leading" }}
                    >
                      {sub}
                    </Text>
                  </VStack>
                </HStack>
              )
            })}
          </VStack>
        </ScrollView>

        <HStack padding={{ horizontal: 16, bottom: 12, top: 6 }} frame={{ maxWidth: Infinity }}>
          <ZStack
            frame={{ maxWidth: Infinity, height: 50 }}
            mask={<Rectangle fill="#FFFFFF" clipShape={shape(25)} />}
            contentShape="rect"
            onTapGesture={chosenTracks.length > 0 ? start : undefined}
          >
            <Rectangle
              fill={chosenTracks.length > 0 ? T.accent : T.cardHi}
              frame={{ maxWidth: Infinity, height: 50 }}
              clipShape={shape(25)}
            />
            <HStack spacing={6}>
              <Image
                systemName="arrow.down"
                font="footnote"
                fontWeight="bold"
                foregroundStyle={chosenTracks.length > 0 ? T.onAccent : T.faint}
              />
              <Text
                font="subheadline"
                fontWeight="bold"
                foregroundStyle={chosenTracks.length > 0 ? T.onAccent : T.faint}
              >
                {chosenTracks.length > 0
                  ? `下载 ${chosenTracks.length} 轨 · ${fmtBytes(chosenBytes)}`
                  : "还没选中东西"}
              </Text>
            </HStack>
          </ZStack>
        </HStack>
      </VStack>
    </NavigationStack>
  )
}
