import {
  HStack,
  Image,
  NavigationLink,
  Rectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import { library } from "../lib/store"
import { authUser, onAuthChange } from "../lib/api"
import { fmtHM, totals } from "../lib/stats"
import { usePalette } from "../lib/theme"
import { GroupLabel, ListCard, ListRow, PageHeader } from "./parts"
import { StatsPage } from "./StatsPage"
import { RadarPage } from "./RadarPage"
import { StoragePage } from "./StoragePage"
import { LoginPage } from "./LoginPage"

function useVersion() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const unsub = library.subscribe(() => setV((x) => x + 1))
    return () => unsub()
  }, [])
  return v
}

/** 把一行列表包成可跳转的行。 */
function Link({ to, row }: { to: ReturnType<typeof StatsPage> | any; row: ReturnType<typeof ListRow> | any }) {
  return (
    <NavigationLink destination={to} buttonStyle="plain">
      {row}
    </NavigationLink>
  )
}

export function ProfilePage({ onClose }: { onClose: () => void }) {
  const T = usePalette()
  useVersion()
  const t = totals()
  const size = library.rawSize
  const [user, setUser] = useState<string | null>(authUser())
  useEffect(() => onAuthChange(() => setUser(authUser())), [])

  return (
    <ZStack frame={{ maxWidth: Infinity, maxHeight: Infinity }} background={T.bg}>
      <Rectangle fill={T.bg} ignoresSafeArea />
      <ScrollView navigationBarVisibility="hidden">
        <VStack
          spacing={10}
          padding={{ horizontal: 16, top: 8, bottom: 150 }}
          frame={{ maxWidth: Infinity }}
        >
          <PageHeader title="我的" right="完成" onRight={onClose} />

          <VStack
            alignment="leading"
            spacing={4}
            padding={{ horizontal: 16, vertical: 16 }}
            frame={{ maxWidth: Infinity, alignment: "leading" }}
            background={T.card}
            clipShape={{ type: "rect", cornerRadius: 12 }}
          >
            <Text font="footnote" foregroundStyle={T.faint}>
              累计收听
            </Text>
            <Text font="largeTitle" fontWeight="bold" foregroundStyle={T.text}>
              {t.seconds > 0 ? fmtHM(t.seconds) : "0 分钟"}
            </Text>
            <Text font="caption2" foregroundStyle={T.faint}>
              {`${t.workCount} 部作品 · ${t.trackCount} 个单集`}
            </Text>
          </VStack>

          <GroupLabel text="收听" />
          <ListCard>
            <Link
              to={<StatsPage />}
              row={
                <ListRow
                  icon="waveform"
                  title="收听"
                  detail="时长、时段、最常播放的单集"
                  chevron
                />
              }
            />
            <Link
              to={<RadarPage />}
              row={
                <ListRow
                  icon="slider.horizontal.3"
                  title="口味"
                  detail="常听的社团和标签"
                  chevron
                  last
                />
              }
            />
          </ListCard>

          <GroupLabel text="本机" />
          <ListCard>
            <Link
              to={<StoragePage />}
              row={
                <ListRow
                  icon="internaldrive"
                  title="存储"
                  detail="播放记录与本机数据"
                  value={size > 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : undefined}
                  chevron
                />
              }
            />
            <Link
              to={<LoginPage />}
              row={
                <ListRow
                  icon="person.crop.circle"
                  title="账号"
                  detail={user != null ? `${user} · asmr.one` : "未登录"}
                  chevron
                  last
                />
              }
            />
          </ListCard>

          <HStack spacing={0} padding={{ horizontal: 4, top: 10 }} frame={{ maxWidth: Infinity }}>
            <VStack alignment="leading" spacing={3}>
              <Text font="caption2" foregroundStyle={T.faint}>
                ASMR One
              </Text>
              <Text font="caption2" foregroundStyle={T.faint}>
                音频与封面均在线播放，不占本机空间。
              </Text>
            </VStack>
            <Spacer />
          </HStack>
        </VStack>
      </ScrollView>
    </ZStack>
  )
}
