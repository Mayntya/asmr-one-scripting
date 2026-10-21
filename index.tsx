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
let uiToken = 0

/** 启动轨迹落盘，出问题直接读这个文件，别猜。 */
function log(msg: string) {
  try {
    const f = FileManager.appGroupDocumentsDirectory + "/asmr-launch.log"
    const prev = FileManager.existsSync(f) ? FileManager.readAsStringSync(f) : ""
    FileManager.writeAsStringSync(f, (prev + new Date().toISOString() + " " + msg + "\n").slice(-4000))
  } catch {}
}

function openUI(why: string, attempt = 0) {
  if (uiOpen) {
    log(why + ": skipped, already open")
    return
  }
  uiOpen = true
  const token = ++uiToken
  log(why + ": present #" + attempt)
  Navigation.present({ element: <App />, modalPresentationStyle: "fullScreen" })
    .then(() => {
      log(why + ": dismissed")
      if (token === uiToken) uiOpen = false
      // 关界面的时候还在放 -> 变成后台常驻；否则真的结束
      if (player.state.playing) {
        Script.minimize()
      } else {
        Script.exit()
      }
    })
    .catch((e: any) => {
      log(why + ": present failed " + String(e?.message ?? e))
      if (token === uiToken) uiOpen = false
      // 宿主没立好时第一次 present 会被吃掉，稍后退一点再来
      if (attempt < 2) sleep(250).then(() => openUI(why, attempt + 1))
    })
}

async function run() {
  log("run: start")
  refreshAccount()
  library.syncCloud()
  player.restore()
  // 刚进脚本时宿主还没把 scene 立起来，present 太早会被静默吞掉——只留个后台图标
  await sleep(120)
  openUI("run")
  log("run: openUI returned")
  // 让入口保持挂起，实例不因 run 返回而被回收
  return new Promise<void>(() => {})
}

Script.onResume(() => {
  log("resume")
  // 被唤回时本来就没有可见界面；标志位归零，否则一次没 resolve 的 present 就再也不弹了
  uiOpen = false
  openUI("resume")
})

run()
