import { Button, Group, Rectangle, ScrollView, Text, VStack, useEffect, useState } from "scripting"
import { library } from "../lib/store"
import { fmtHM, totals } from "../lib/stats"
import { shape, usePalette } from "../lib/theme"
import { fmtBytes, offlineBytes, offlineList, removeAllOffline, removeOffline, subscribeOffline } from "../lib/downloads"
import type { OfflineWork } from "../lib/downloads"
import { GroupLabel, ListCard, ListRow, PageHeader } from "./parts"

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
  const [ask, setAsk] = useState<string | null>(null)
  const [offWorks, setOffWorks] = useState<OfflineWork[]>(offlineList())
  const offBytes = offlineBytes()

  useEffect(() => {
    const up = () => setOffWorks(offlineList())
    up()
    return subscribeOffline(up)
  }, [])

  const dialogTitle =
    ask === "history"
      ? "清除最近播放？"
      : ask === "stats"
      ? "清除收听记录？"
      : ask === "all"
      ? "清空离线缓存？"
      : "删除这部缓存？"

  const dialogMessage =
    ask === "history"
      ? "列表会清空，收藏不受影响。"
      : ask === "stats"
      ? `会删掉 ${recCount} 条收听记录，累计时长一起归零。`
      : ask === "all"
      ? `会删掉 ${offWorks.length} 部作品的音频文件，释放 ${fmtBytes(offBytes)}。`
      : "这一部作品的音频会从本机删除。"

  const lastAt = library.history.reduce<number>((m, h) => (h.at > m ? h.at : m), 0)
  const lastSeen = dayOf(lastAt)

  return (
    <ScrollView
      navigationBarVisibility="hidden"
      background={<Rectangle fill={T.bg} ignoresSafeArea />}
      confirmationDialog={{
        title: dialogTitle,
        message: <Text>{dialogMessage}</Text>,
        isPresented: ask != null,
        onChanged: (v: boolean) => {
          if (!v) setAsk(null)
        },
        actions: (
          <Group>
            <Button
              title={ask === "history" || ask === "stats" ? "清除" : "删除"}
              role="destructive"
              action={() => {
                if (ask === "history") library.clearHistory()
                else if (ask === "stats") library.clearStats()
                else if (ask === "all") removeAllOffline()
                else if (ask != null) removeOffline(Number(ask.slice(5)))
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
            {fmtBytes(size + offBytes)}
          </Text>
          <Text font="caption2" foregroundStyle={T.faint}>
            {`${t.workCount} 部作品 · ${recCount} 条收听记录`}
          </Text>
          <Text font="caption2" foregroundStyle={T.faint}>
            {offWorks.length > 0 ? `含离线音频 ${fmtBytes(offBytes)}` : "还没有离线缓存"}
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

        <GroupLabel text="离线缓存" />
        {offWorks.length === 0 ? (
          <Text
            font="footnote"
            foregroundStyle={T.faint}
            padding={{ horizontal: 4, vertical: 6 }}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
          >
            在作品详情页点一下「下载」，整部音频就存到本机。
          </Text>
        ) : (
          <ListCard>
            {offWorks.map((w, i) => (
              <ListRow
                key={String(w.id)}
                icon="arrow.down.circle.fill"
                title={w.title}
                detail={`${w.tracks.length} 轨${dayOf(w.at) != null ? " · " + dayOf(w.at) : ""}`}
                value={fmtBytes(w.bytes)}
                last={i === offWorks.length - 1}
                onTap={() => setAsk(`work:${w.id}`)}
              />
            ))}
          </ListCard>
        )}

        {offWorks.length > 0 ? (
          <ListCard>
            <ListRow
              icon="trash"
              title="清空离线缓存"
              detail={`释放 ${fmtBytes(offBytes)}`}
              danger
              last
              onTap={() => setAsk("all")}
            />
          </ListCard>
        ) : null}

        <Text
          font="caption2"
          foregroundStyle={T.faint}
          padding={{ horizontal: 4, top: 6 }}
          frame={{ maxWidth: Infinity, alignment: "leading" }}
        >
          离线音频存在脚本自己的缓存目录里，不进 iCloud，也不在「文件」App 里出现。作品页点「下载」才会占地方。
        </Text>
      </VStack>
    </ScrollView>
  )
}
