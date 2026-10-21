import { Button, Group, Rectangle, ScrollView, Text, VStack, useState } from "scripting"
import { library } from "../lib/store"
import { fmtHM, totals } from "../lib/stats"
import { shape, usePalette } from "../lib/theme"
import { GroupLabel, ListCard, ListRow, PageHeader } from "./parts"

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function dayOf(at: number | undefined): string | null {
  if (at == null || at <= 0) return null
  const d = new Date(at)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function StoragePage() {
  const T = usePalette()
  const t = totals()
  const size = library.rawSize
  const hisCount = library.history.length
  const recCount = library.tracks.length
  const [ask, setAsk] = useState<"history" | "stats" | null>(null)

  const lastAt = library.history.reduce<number>((m, h) => (h.at > m ? h.at : m), 0)
  const lastSeen = dayOf(lastAt)

  return (
    <ScrollView
      navigationBarVisibility="hidden"
      background={<Rectangle fill={T.bg} ignoresSafeArea />}
      confirmationDialog={{
        title: ask === "history" ? "清除最近播放？" : "清除收听记录？",
        message: (
          <Text>
            {ask === "history"
              ? "列表会清空，收藏不受影响。"
              : `会删掉 ${recCount} 条收听记录，累计时长一起归零。`}
          </Text>
        ),
        isPresented: ask != null,
        onChanged: (v: boolean) => {
          if (!v) setAsk(null)
        },
        actions: (
          <Group>
            <Button
              title="清除"
              role="destructive"
              action={() => {
                if (ask === "history") library.clearHistory()
                if (ask === "stats") library.clearStats()
                setAsk(null)
              }}
            />
            <Button title="取消" role="cancel" action={() => setAsk(null)} />
          </Group>
        ),
      }}
    >
      <VStack
        spacing={10}
        padding={{ horizontal: 16, top: 8, bottom: 60 }}
        frame={{ maxWidth: Infinity }}
      >
        <PageHeader title="存储" back />

        <VStack
          alignment="leading"
          spacing={3}
          padding={{ horizontal: 16, vertical: 16 }}
          frame={{ maxWidth: Infinity, alignment: "leading" }}
          background={T.card}
          clipShape={shape(12)}
        >
          <Text font="footnote" foregroundStyle={T.faint}>
            本机数据
          </Text>
          <Text font="largeTitle" fontWeight="bold" foregroundStyle={T.text}>
            {fmtBytes(size)}
          </Text>
          <Text font="caption2" foregroundStyle={T.faint}>
            {`${t.workCount} 部作品 · ${recCount} 条收听记录`}
          </Text>
        </VStack>

        <GroupLabel text="播放记录" />
        <ListCard>
          <ListRow
            icon="clock"
            title="最近播放"
            detail={lastSeen != null ? `上次 ${lastSeen}` : "还没有记录"}
            value={`${hisCount} 条`}
            chevron
            onTap={() => hisCount > 0 && setAsk("history")}
          />
          <ListRow
            icon="waveform"
            title="收听记录"
            detail={recCount > 0 ? `共 ${fmtHM(t.seconds)}` : "还没有记录"}
            value={`${recCount} 条`}
            chevron
            onTap={() => recCount > 0 && setAsk("stats")}
          />
          <ListRow
            icon="heart"
            title="收藏"
            detail="在作品页点心形图标记"
            value={`${library.favorites.length} 部`}
            last
          />
        </ListCard>

        <Text
          font="caption2"
          foregroundStyle={T.faint}
          padding={{ horizontal: 4, top: 6 }}
          frame={{ maxWidth: Infinity, alignment: "leading" }}
        >
          音频与封面都在线播放，不占本机空间。这里只存播放记录本身。
        </Text>
      </VStack>
    </ScrollView>
  )
}
