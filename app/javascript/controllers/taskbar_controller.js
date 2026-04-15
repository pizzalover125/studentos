import { Controller } from "@hotwired/stimulus"

const POMODORO_STATE_KEY = "student_os.pomodoro_taskbar"
const POMODORO_SETTINGS_KEY = "student_os.pomodoro_settings"
const MUSIC_STATE_KEY = "student_os.music_taskbar"
const THEME_SETTINGS_KEY = "student_os.theme"
const DEFAULT_WORK_MINUTES = 25
const DEFAULT_PLAY_MINUTES = 5
const DEFAULT_MUSIC_TITLE = "Lo-fi radio"
const DEFAULT_CLOCK_SETTINGS = {
  includeDate: true,
  includeSeconds: false,
  includeAmPm: true,
  militaryTime: false
}
const LOFI_SOURCES = [
  { url: "https://soundcloud.com/chillhopdotcom" },
  { url: "https://soundcloud.com/chilledcow" },
  { url: "https://soundcloud.com/thebootlegboy" },
  { url: "https://soundcloud.com/college-music" },
  { url: "https://soundcloud.com/inneroceanrecords" },
  { url: "https://soundcloud.com/steezyasfuck" },
  { url: "https://soundcloud.com/relaxdaily" },
  { url: "https://soundcloud.com/ambition" },
  { url: "https://soundcloud.com/mrsuicidesheep" }
]
const MAX_RANDOM_RETRIES = 6

export default class extends Controller {
  static targets = ["pomodoro", "clock", "decisionModal", "musicFrame", "musicTitle"]

  connect() {
    this.onStorage = () => this.refresh()
    this.onMusicCommand = event => this.handleMusicCommand(event.detail?.action)
    this.refresh()
    this.intervalId = setInterval(() => this.refresh(), 1000)
    window.addEventListener("storage", this.onStorage)
    window.addEventListener("music:command", this.onMusicCommand)
    this.ensureMusicPlayer()
  }

  disconnect() {
    if (this.intervalId) clearInterval(this.intervalId)
    if (this.widgetApiIntervalId) clearInterval(this.widgetApiIntervalId)
    window.removeEventListener("storage", this.onStorage)
    window.removeEventListener("music:command", this.onMusicCommand)
    this.unbindMusicEvents()
  }

  refresh() {
    this.renderClock()
    const current = this.currentPomodoroState()
    this.renderPomodoro(current)
    this.syncDecisionModal(current)
    this.renderMusicUi()
  }

  startPlayTime() {
    const state = this.buildPomodoroState("play", this.playDurationSeconds(), true, false)
    this.writePomodoroState(state)
    this.refresh()
  }

  stopPomodoro() {
    const state = this.buildPomodoroState("work", this.workDurationSeconds(), false, false)
    this.writePomodoroState(state)
    this.refresh()
  }

  renderClock() {
    const now = new Date()
    const settings = this.readClockSettings()
    const time = this.formattedTime(now, settings)
    const date = now.toLocaleDateString([], {
      month: "short",
      day: "numeric"
    })
    this.clockTarget.textContent = settings.includeDate ? `${date} ${time}` : time
  }

  currentPomodoroState() {
    const state = this.readStorage(POMODORO_STATE_KEY, null)
    if (!state || typeof state !== "object" || Array.isArray(state)) return null

    const now = Date.now()
    const phase = state.phase === "play" ? "play" : "work"
    const running = Boolean(state.running)
    let awaitingAcknowledgement = Boolean(state.awaitingAcknowledgement)
    const storedSeconds = Number.parseInt(state.remainingSeconds, 10)
    const updatedAt = Number.parseInt(state.updatedAt, 10)

    if (!Number.isFinite(storedSeconds) || storedSeconds < 0) return null

    const elapsed = running && Number.isFinite(updatedAt) ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : 0
    const seconds = Math.max(0, storedSeconds - elapsed)

    if (running && phase === "work" && seconds === 0) {
      const transitioned = this.buildPomodoroState("work", 0, false, true)
      this.writePomodoroState(transitioned)
      return { ...transitioned }
    }

    if (running && phase === "play" && seconds === 0) {
      const overflow = Math.max(0, elapsed - storedSeconds)
      const workSeconds = Math.max(0, this.workDurationSeconds() - overflow)
      const transitioned = this.buildPomodoroState("work", workSeconds, workSeconds > 0, workSeconds === 0)
      this.writePomodoroState(transitioned)
      return { ...transitioned }
    }

    if (!running && awaitingAcknowledgement && phase !== "work") {
      const fixed = this.buildPomodoroState("work", 0, false, true)
      this.writePomodoroState(fixed)
      return { ...fixed }
    }

    if (!running && !awaitingAcknowledgement) return null
    if (!awaitingAcknowledgement && running && phase === "work" && seconds === 0) awaitingAcknowledgement = true

    return {
      phase,
      running,
      awaitingAcknowledgement,
      remainingSeconds: seconds,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : now
    }
  }

  renderPomodoro(state) {
    if (!state) {
      this.pomodoroTarget.hidden = true
      return
    }

    const mm = String(Math.floor(state.remainingSeconds / 60)).padStart(2, "0")
    const ss = String(state.remainingSeconds % 60).padStart(2, "0")
    const phase = state.phase === "play" ? "Play" : "Work"
    const suffix = state.awaitingAcknowledgement ? " !" : ""

    this.pomodoroTarget.textContent = `Pomodoro ${phase}: ${mm}:${ss}${suffix}`
    this.pomodoroTarget.hidden = false
  }

  syncDecisionModal(state) {
    if (!this.hasDecisionModalTarget) return
    this.decisionModalTarget.hidden = !(state && state.awaitingAcknowledgement)
  }

  readPomodoroSettings() {
    const fallback = { workMinutes: DEFAULT_WORK_MINUTES, playMinutes: DEFAULT_PLAY_MINUTES }
    const parsed = this.readStorage(POMODORO_SETTINGS_KEY, fallback)
    const workMinutes = this.validMinutes(parsed?.workMinutes) || DEFAULT_WORK_MINUTES
    const playMinutes = this.validMinutes(parsed?.playMinutes) || DEFAULT_PLAY_MINUTES
    return { workMinutes, playMinutes }
  }

  workDurationSeconds() {
    return this.readPomodoroSettings().workMinutes * 60
  }

  playDurationSeconds() {
    return this.readPomodoroSettings().playMinutes * 60
  }

  validMinutes(value) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
  }

  buildPomodoroState(phase, remainingSeconds, running, awaitingAcknowledgement) {
    return { phase, remainingSeconds, running, awaitingAcknowledgement, updatedAt: Date.now() }
  }

  writePomodoroState(state) {
    localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent("pomodoro:state-sync"))
  }

  ensureMusicPlayer() {
    if (!this.hasMusicFrameTarget || this.musicWidgetReady) return

    if (window.SC?.Widget) {
      this.setupMusicWidget()
      return
    }

    if (this.widgetApiIntervalId) return
    this.widgetApiIntervalId = setInterval(() => {
      if (!window.SC?.Widget) return
      clearInterval(this.widgetApiIntervalId)
      this.widgetApiIntervalId = null
      this.setupMusicWidget()
    }, 250)
  }

  setupMusicWidget() {
    this.musicWidget = window.SC.Widget(this.musicFrameTarget)
    this.bindMusicEvents()
    this.musicWidgetReady = true

    const state = this.readMusicState()
    const sourceIsSupported = LOFI_SOURCES.some(source => source.url === state.sourceUrl)
    const alreadyInitialized = this.musicFrameTarget.dataset.musicInitialized === "true"

    if (alreadyInitialized) {
      this.syncMusicTitleFromWidget()
      this.renderMusicUi()
      return
    }

    if (state.initialized && state.sourceUrl && sourceIsSupported) {
      this.loadSource(state.sourceUrl, state.playing)
      return
    }

    this.loadRandomSource(true)
  }

  bindMusicEvents() {
    if (!this.musicWidget || !window.SC?.Widget?.Events) return

    this.musicWidget.bind(window.SC.Widget.Events.READY, () => {
      this.musicFrameTarget.dataset.musicInitialized = "true"
      this.syncMusicTitleFromWidget()
    })

    this.musicWidget.bind(window.SC.Widget.Events.PLAY, () => {
      this.writeMusicState({ playing: true })
      this.syncMusicTitleFromWidget()
    })

    this.musicWidget.bind(window.SC.Widget.Events.PAUSE, () => {
      this.writeMusicState({ playing: false })
    })

    this.musicWidget.bind(window.SC.Widget.Events.FINISH, () => {
      this.loadRandomSource(true)
    })
  }

  unbindMusicEvents() {
    if (!this.musicWidget || !window.SC?.Widget?.Events) return
    this.musicWidget.unbind(window.SC.Widget.Events.READY)
    this.musicWidget.unbind(window.SC.Widget.Events.PLAY)
    this.musicWidget.unbind(window.SC.Widget.Events.PAUSE)
    this.musicWidget.unbind(window.SC.Widget.Events.FINISH)
  }

  loadRandomSource(autoplay) {
    this.randomAttempts = 0
    this.excludedSourceUrls = []
    this.loadRandomSourceWithRetry(autoplay)
  }

  loadRandomSourceWithRetry(autoplay) {
    if (this.randomAttempts >= MAX_RANDOM_RETRIES) return
    this.randomAttempts += 1

    const state = this.readMusicState()
    const source = this.randomSource(state.sourceUrl, this.excludedSourceUrls || [])
    if (!source) return

    this.excludedSourceUrls = [...(this.excludedSourceUrls || []), source.url]
    this.loadSource(source.url, autoplay)
  }

  loadSource(sourceUrl, autoplay) {
    if (!this.musicWidget) return

    this.musicWidget.load(sourceUrl, {
      auto_play: false,
      hide_related: false,
      show_comments: false,
      show_user: true,
      show_reposts: false,
      visual: false
    }, () => {
      this.pickRandomTrackInCurrentSource(autoplay, sourceUrl)
    })
  }

  pickRandomTrackInCurrentSource(autoplay, sourceUrl) {
    if (!this.musicWidget) return

    this.musicWidget.getSounds(sounds => {
      const items = Array.isArray(sounds) ? sounds : []
      const state = this.readMusicState()
      const previousTrackUrl = state.trackUrl || null
      const candidates = items.filter(sound => this.trackUrl(sound) !== previousTrackUrl)

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)]
        const chosenIndex = items.indexOf(chosen)
        if (chosenIndex >= 0) this.musicWidget.skip(chosenIndex)
      } else if (items.length === 0 || this.randomAttempts < MAX_RANDOM_RETRIES) {
        this.loadRandomSourceWithRetry(autoplay)
        return
      }

      if (autoplay) this.musicWidget.play()

      this.writeMusicState({ initialized: true, sourceUrl, playing: autoplay })
      setTimeout(() => this.syncMusicTitleFromWidget(), 300)
    })
  }

  syncMusicTitleFromWidget() {
    if (!this.musicWidget) return

    this.musicWidget.getCurrentSound(sound => {
      const title = sound?.title?.trim()
      const artist = sound?.user?.username?.trim()
      const label = [title, artist].filter(Boolean).join(" — ")
      const trackUrl = this.trackUrl(sound)
      if (label) this.writeMusicState({ title: label, trackUrl })
    })
  }

  renderMusicUi() {
    if (!this.hasMusicTitleTarget) return
    const state = this.readMusicState()
    this.musicTitleTarget.textContent = state.title || DEFAULT_MUSIC_TITLE
  }

  randomSource(excludedUrl, excludedUrls = []) {
    const excluded = new Set([excludedUrl, ...excludedUrls].filter(Boolean))
    const pool = LOFI_SOURCES.filter(source => !excluded.has(source.url))
    const candidates = pool.length > 0 ? pool : LOFI_SOURCES
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  readMusicState() {
    return this.readStorage(MUSIC_STATE_KEY, {
      initialized: false,
      sourceUrl: null,
      title: DEFAULT_MUSIC_TITLE,
      playing: false,
      trackUrl: null
    })
  }

  writeMusicState(partial) {
    const next = { ...this.readMusicState(), ...partial }
    localStorage.setItem(MUSIC_STATE_KEY, JSON.stringify(next))
    this.renderMusicUi()
  }

  handleMusicCommand(action) {
    switch (action) {
    case "play":
      this.musicWidget?.play()
      break
    case "pause":
      this.musicWidget?.pause()
      break
    case "toggle":
      if (!this.musicWidget) break
      this.musicWidget.isPaused(paused => {
        if (paused) this.musicWidget.play()
        else this.musicWidget.pause()
      })
      break
    case "next":
      this.loadRandomSource(true)
      break
    default:
      break
    }
  }

  readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      return parsed ?? fallback
    } catch {
      localStorage.removeItem(key)
      return fallback
    }
  }

  trackUrl(sound) {
    return sound?.permalink_url || sound?.uri || null
  }

  readClockSettings() {
    const stored = this.readStorage(THEME_SETTINGS_KEY, null)
    const clock = stored?.clock || {}

    return {
      includeDate: typeof clock.includeDate === "boolean" ? clock.includeDate : DEFAULT_CLOCK_SETTINGS.includeDate,
      includeSeconds: typeof clock.includeSeconds === "boolean" ? clock.includeSeconds : DEFAULT_CLOCK_SETTINGS.includeSeconds,
      includeAmPm: typeof clock.includeAmPm === "boolean" ? clock.includeAmPm : DEFAULT_CLOCK_SETTINGS.includeAmPm,
      militaryTime: typeof clock.militaryTime === "boolean" ? clock.militaryTime : DEFAULT_CLOCK_SETTINGS.militaryTime
    }
  }

  formattedTime(now, settings) {
    const formatter = new Intl.DateTimeFormat([], {
      hour: settings.militaryTime ? "2-digit" : "numeric",
      minute: "2-digit",
      second: settings.includeSeconds ? "2-digit" : undefined,
      hour12: !settings.militaryTime
    })
    const parts = formatter.formatToParts(now)
    const visibleParts = settings.includeAmPm ? parts : parts.filter(part => part.type !== "dayPeriod")
    return visibleParts.map(part => part.value).join("").trim()
  }
}
