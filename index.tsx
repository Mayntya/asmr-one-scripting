import { AppEvents, Label, Navigation, NavigationStack, Script, TabView, useEffect, useState } from "scripting"
import { player } from "./lib/player"
import { refreshAccount } from "./lib/api"
import { library } from "./lib/store"
import { usePalette } from "./lib/theme"
import { DiscoverPage } from "./ui/DiscoverPage"
import { FavoritesPage, HistoryPage } from "./ui/LibraryPage"
import { MiniPlayer } from "./ui/PlayerView"
import { ProfilePage } from "./ui/ProfilePage"

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** App 重挂（modal 重建）时别把 tab 重置回首页。 */
let currentTab = 0

function App() {
  const T = usePalette()
  const [tab, setTab] = useState(currentTab)
  const dismiss = Navigation.useDismiss()

  useEffect(() => {
    let alive = true
    const loop = async () => {
      while (alive) {
        await sleep(1000)
        player.tick()
      }
    }
    loop()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onPhase = (phase: string) => {
      if (phase === "background") {
        player.keepAlive()
      } else if (phase === "active") {
        player.releaseKeepAlive()
      }
    }
    try {
      AppEvents.scenePhase.addListener(onPhase)
    } catch {}
    return () => {
      try {
        AppEvents.scenePhase.removeListener(onPhase)
      } catch {}
    }
  }, [])

  return (
    <TabView
      tabIndex={tab}
      onTabIndexChanged={(i: number) => {
        currentTab = i
        setTab(i)
      }}
      tint={T.accent}
    >
      <NavigationStack
        tabItem={<Label title="浏览" systemImage="square.grid.2x2" />}
        safeAreaInset={{ bottom: { content: <MiniPlayer /> } }}
      >
        <DiscoverPage onClose={() => dismiss()} />
      </NavigationStack>
      <NavigationStack
        tabItem={<Label title="资料库" systemImage="square.stack.fill" />}
        safeAreaInset={{ bottom: { content: <MiniPlayer /> } }}
      >
        <FavoritesPage onClose={() => dismiss()} />
      </NavigationStack>
      <NavigationStack
        tabItem={<Label title="最近播放" systemImage="clock" />}
        safeAreaInset={{ bottom: { content: <MiniPlayer /> } }}
      >
        <HistoryPage onClose={() => dismiss()} />
      </NavigationStack>
      <NavigationStack
        tabItem={<Label title="我的" systemImage="person.crop.circle" />}
        safeAreaInset={{ bottom: { content: <MiniPlayer /> } }}
      >
        <ProfilePage onClose={() => dismiss()} />
      </NavigationStack>
    </TabView>
  )
}

let uiOpen = false

function openUI() {
  if (uiOpen) return
  uiOpen = true
  Navigation.present({ element: <App />, modalPresentationStyle: "fullScreen" })
    .then(() => {
      uiOpen = false
      // 关界面的时侯还在放 -> 变成后台常驻；否则真的结束
      if (player.state.playing) {
        Script.minimize()
      } else {
        Script.exit()
      }
    })
    .catch(() => {
      uiOpen = false
    })
}

function run() {
  refreshAccount()
  library.syncCloud()
  player.restore()
  openUI()
  // 让入口保持挂起，实例不因 run 返回而被回收
  return new Promise<void>(() => {})
}

Script.onResume(() => {
  if (!uiOpen) openUI()
})
