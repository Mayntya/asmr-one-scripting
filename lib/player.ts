import type { TrackNode, Work } from "./api"
import { fetchText, findSubtitle, getTracks } from "./api"
import type { LrcCue } from "./lrc"
import { parseLrc } from "./lrc"
import { library } from "./store"
import { loadSession, saveSession } from "./session"


export interface PlayerState {
  work: Work | null
  tracks: TrackNode[]
  index: number
  playing: boolean
  loading: boolean
  error: string | null
  time: number
  duration: number
  subtitleOn: boolean
  subtitleLoading: boolean
  lrc: LrcCue[]
}

class PlayerController {
  private ap = new AVPlayer()
  private listeners = new Set<() => void>()
  private sessionReady = false
  private remoteReady = false
  private lastTickAt = 0
  private pendingSeek: number | null = null
  private lastSavedAt = 0
  private lastNowPlaying = ""
  private artwork: UIImage | null = null
  private artworkKey = ""
  private loaded = false

  state: PlayerState = {
    work: null,
    tracks: [],
    index: 0,
    playing: false,
    loading: false,
    error: null,
    time: 0,
    duration: 0,
    subtitleOn: false,
    subtitleLoading: false,
    lrc: [],
  }

  constructor() {
    this.ap.volume = 1
    this.ap.onReadyToPlay = () => {
      this.state.loading = false
      this.state.duration = this.ap.duration || this.state.duration
      const track = this.current
      if (track != null && this.state.work != null) {
        library.pushHistory(this.state.work, track, this.state.index)
        library.countPlay(track.key)
      }
      if (this.pendingSeek != null) {
        const at = this.pendingSeek
        this.pendingSeek = null
        this.ap.currentTime = at
        this.state.time = at
      }
      this.lastTickAt = Date.now()
      this.syncBackground()
      this.syncNowPlaying(true)
      this.persist()
      this.emit()
    }
    this.ap.onTimeControlStatusChanged = () => {
      this.state.playing = this.ap.timeControlStatus === 2
      this.syncBackground()
      this.syncNowPlaying(true)
      this.persist()
      this.emit()
    }
    this.ap.onEnded = () => {
      if (this.state.work != null && this.current != null) library.clearTrackProgress(this.current.key)
      this.next()
    }
    this.ap.onError = (message: string) => {
      this.state.loading = false
      this.state.playing = false
      this.state.error = message
      this.emit()
    }
  }

  get current(): TrackNode | null {
    const t = this.state.tracks[this.state.index]
    return t ?? null
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }

  /** 把当前会话写到盘上，下次启动接着来。 */
  private persist() {
    const work = this.state.work
    if (work == null || this.state.tracks.length === 0) return
    saveSession({
      work,
      tracks: this.state.tracks,
      index: this.state.index,
      time: this.state.time,
      subtitleOn: this.state.subtitleOn,
    })
  }

  /** 启动时恢复上一次的曲目与时间点（不自动播）。 */
  restore(): boolean {
    const s = loadSession()
    if (s == null) return false
    this.state.work = s.work
    this.state.tracks = s.tracks
    this.state.index = s.index
    this.state.time = s.time
    this.state.duration = s.tracks[s.index]?.duration ?? 0
    this.state.subtitleOn = s.subtitleOn
    this.state.playing = false
    this.state.loading = false
    this.state.error = null
    this.loaded = false
    const track = s.tracks[s.index]
    if (track != null && s.time > 3) library.setTrackProgress(track.key, s.time)
    this.loadSubtitle(s.work)
    this.loadArtwork(s.work)
    this.emit()
    return true
  }

  /** 暂停就释放保活；keepAlive 只在进后台时申请。 */
  private syncBackground() {
    try {
      if (!this.state.playing) BackgroundKeeper.stopKeepAlive()
    } catch {}
  }

  /** 进后台时调用。 */
  async keepAlive() {
    if (!this.state.playing) return false
    try {
      return await BackgroundKeeper.keepAlive()
    } catch {
      return false
    }
  }

  releaseKeepAlive() {
    try {
      BackgroundKeeper.stopKeepAlive()
    } catch {}
  }

  /** 诊断日志：只在出错时落盘，不挡播放。 */
  private note(msg: string) {
    try {
      const f = FileManager.appGroupDocumentsDirectory + "asmr-player.log"
      const prev = FileManager.existsSync(f) ? FileManager.readAsStringSync(f) : ""
      FileManager.writeAsStringSync(f, (prev + new Date().toISOString() + " " + msg + "\n").slice(-4000))
    } catch {}
  }

  private async prepareSession() {
    if (this.sessionReady) {
      this.setupRemote()
      return
    }
    try {
      await SharedAudioSession.setCategory("playback", ["allowBluetoothA2DP", "allowAirPlay"])
      await SharedAudioSession.setActive(true)
      this.sessionReady = true
    } catch (e: any) {
      // 之前这里把 ready 置在了 try 之前，一次失败就永不再试——锁屏信息就是这没的
      this.sessionReady = false
      this.note("audio session failed: " + String(e?.message ?? e))
    }
    this.setupRemote()
  }

  private setupRemote() {
    if (this.remoteReady) return
    try {
      MediaPlayer.setAvailableCommands([
        "play",
        "pause",
        "togglePausePlay",
        "nextTrack",
        "previousTrack",
        "skipForward",
        "skipBackward",
      ])
      MediaPlayer.commandHandler = (command: any, event: any) => {
        if (command === "play") {
          if (!this.state.playing) this.toggle()
        } else if (command === "pause") {
          if (this.state.playing) this.toggle()
        } else if (command === "togglePausePlay") {
          this.toggle()
        } else if (command === "nextTrack") {
          this.next()
        } else if (command === "previousTrack") {
          this.prev()
        } else if (command === "skipForward" || command === "skipBackward") {
          const step = Number(event?.interval ?? 15) || 15
          const dir = command === "skipForward" ? 1 : -1
          const target = Math.max(0, Math.min(this.state.duration || 1e9, this.state.time + dir * step))
          this.seek(target)
        }
      }
      this.remoteReady = true
    } catch (e: any) {
      this.remoteReady = false
      this.note("remote setup failed: " + String(e?.message ?? e))
    }
  }

  /** 锁屏封面，拉一次存着。 */
  private async loadArtwork(work: Work) {
    const url = work.cover || work.thumb
    if (url === this.artworkKey) return
    this.artworkKey = url
    this.artwork = null
    if (url.length === 0) return
    try {
      this.artwork = await UIImage.fromURL(url)
    } catch {
      this.artwork = null
    }
    this.lastNowPlaying = ""
    this.syncNowPlaying(true)
  }

  /** 锁屏 / 控制中心的播放信息。 */
  private syncNowPlaying(force = false) {
    const work = this.state.work
    const track = this.current
    try {
      if (work == null || track == null) {
        MediaPlayer.nowPlayingInfo = null
        return
      }
      const stamp = `${work.id}|${this.state.index}|${this.state.playing ? 1 : 0}|${Math.floor(this.state.time)}|${Math.floor(
        this.state.duration
      )}`
      if (!force && stamp === this.lastNowPlaying) return
      this.lastNowPlaying = stamp
      MediaPlayer.nowPlayingInfo = {
        title: track.title || work.title,
        artist: work.circle,
        albumTitle: work.title,
        playbackRate: this.state.playing ? 1 : 0,
        elapsedPlaybackTime: Math.max(0, Math.floor(this.state.time)),
        playbackDuration: Math.max(0, Math.floor(this.state.duration)),
        artwork: this.artwork ?? undefined,
      }
      MediaPlayer.playbackState = this.state.playing
        ? MediaPlayerPlaybackState.playing
        : MediaPlayerPlaybackState.paused
    } catch (e: any) {
      // 锁屏信息设置失败不影响播放
      this.note("now playing failed: " + String(e?.message ?? e))
    }
  }

  /** 界面重新出现时强制推一次，iOS 偶尔会丢掉第一次注册。 */
  refreshNowPlaying() {
    this.lastNowPlaying = ""
    this.syncNowPlaying(true)
  }

  playList(work: Work, tracks: TrackNode[], index: number, nodes?: TrackNode[]) {
    const sameWork = this.state.work != null && this.state.work.id === work.id
    this.state.work = work
    this.state.tracks = tracks
    this.state.error = null
    if (!sameWork) {
      this.state.lrc = []
      this.loadSubtitle(work, nodes)
      this.loadArtwork(work)
    }
    this.load(index, true)
  }

  private async loadSubtitle(work: Work, nodes?: TrackNode[]) {
    this.state.subtitleLoading = true
    this.emit()
    try {
      const tree = nodes ?? (await getTracks(work.id))
      const sub = findSubtitle(tree)
      if (sub == null || sub.url == null) {
        this.state.lrc = []
        this.state.subtitleLoading = false
        this.emit()
        return
      }
      const raw = await fetchText(sub.url)
      this.state.lrc = parseLrc(raw)
      this.state.subtitleLoading = false
      this.emit()
    } catch {
      this.state.lrc = []
      this.state.subtitleLoading = false
      this.emit()
    }
  }

  toggleSubtitle() {
    this.state.subtitleOn = !this.state.subtitleOn
    this.emit()
  }

  private async load(index: number, autoplay: boolean) {
    const track = this.state.tracks[index]
    if (track == null) return

    if (this.current != null && this.state.time > 5) {
      library.setTrackProgress(this.current.key, this.state.time)
    }

    this.state.index = index
    this.state.loading = true
    this.state.time = 0
    this.state.duration = track.duration || 0
    this.state.error = null
    this.lastNowPlaying = ""

    // 断点：3 秒以内算没听，最后 5 秒算听完
    const resume = library.trackProgress(track.key)
    const total = track.duration || 0
    this.pendingSeek = resume > 3 && (total <= 0 || resume < total - 5) ? resume : null
    if (this.pendingSeek != null) this.state.time = this.pendingSeek

    this.emit()

    await this.prepareSession()

    const url = track.url ?? track.lowUrl
    if (url == null) {
      this.state.loading = false
      this.state.error = "该曲目没有可播放的地址"
      this.emit()
      return
    }

    const ok = this.ap.setSource(url)
    if (!ok) {
      this.state.loading = false
      this.state.error = "无法加载音频"
      this.emit()
      return
    }
    this.loaded = true

    if (autoplay) {
      this.ap.play()
      this.state.playing = true
    }
    this.syncBackground()
    this.persist()
    this.emit()
  }

  toggle() {
    if (this.state.tracks.length === 0) return
    // 从上一会话恢复过来时还没有音源，先真正加载一次
    if (!this.loaded) {
      this.load(this.state.index, true)
      return
    }
    if (this.state.playing) {
      this.ap.pause()
      this.state.playing = false
    } else {
      this.prepareSession()
      this.ap.play()
      this.state.playing = true
    }
    this.syncBackground()
    this.syncNowPlaying(true)
    this.persist()
    this.emit()
  }

  next() {
    if (this.state.tracks.length === 0) return
    const next = (this.state.index + 1) % this.state.tracks.length
    this.load(next, true)
  }

  prev() {
    if (this.state.tracks.length === 0) return
    const prev = (this.state.index - 1 + this.state.tracks.length) % this.state.tracks.length
    this.load(prev, true)
  }

  jumpTo(index: number) {
    if (index < 0 || index >= this.state.tracks.length) return
    this.load(index, true)
  }

  seek(seconds: number) {
    this.ap.currentTime = seconds
    this.state.time = seconds
    const track = this.current
    if (track != null) library.setTrackProgress(track.key, seconds)
    this.syncNowPlaying(true)
    this.persist()
    this.emit()
  }

  tick() {
    if (this.state.tracks.length === 0) return
    const now = Date.now()
    const dt = this.lastTickAt > 0 ? (now - this.lastTickAt) / 1000 : 0
    this.lastTickAt = now

    if (this.state.playing && this.state.work != null && this.current != null) {
      if (dt > 0 && dt < 5) library.addListen(this.state.work, this.current.title, this.current.key, dt)
    }

    const t = this.ap.currentTime
    const d = this.ap.duration
    let changed = false
    if (Math.abs(t - this.state.time) > 0.4) {
      this.state.time = t
      changed = true
    }
    if (d > 0 && Math.abs(d - this.state.duration) > 0.5) {
      this.state.duration = d
      changed = true
    }

    if (this.state.playing && this.current != null && now - this.lastSavedAt > 5000) {
      this.lastSavedAt = now
      library.setTrackProgress(this.current.key, t)
      this.persist()
    }

    if (this.state.playing) this.syncNowPlaying()

    if (changed) this.emit()
  }
}

export const player = new PlayerController()
