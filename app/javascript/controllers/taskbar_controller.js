import { Controller } from "@hotwired/stimulus"

const POMODORO_STATE_KEY = "student_os.pomodoro_taskbar"
const POMODORO_SETTINGS_KEY = "student_os.pomodoro_settings"
const DEFAULT_WORK_MINUTES = 25
const DEFAULT_PLAY_MINUTES = 5

export default class extends Controller {
  static targets = ["pomodoro", "clock", "decisionModal"]

  connect() {
    this.onStorage = () => this.refresh()
    this.refresh()
    this.intervalId = setInterval(() => this.refresh(), 1000)
    window.addEventListener("storage", this.onStorage)
  }

  disconnect() {
    if (this.intervalId) clearInterval(this.intervalId)
    window.removeEventListener("storage", this.onStorage)
  }

  refresh() {
    this.renderClock()

    const current = this.currentPomodoroState()
    this.renderPomodoro(current)
    this.syncDecisionModal(current)
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
    this.clockTarget.textContent = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    })
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
    let seconds = Math.max(0, storedSeconds - elapsed)

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

    if (!awaitingAcknowledgement && running && phase === "work" && seconds === 0) {
      awaitingAcknowledgement = true
    }

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
    return {
      phase,
      remainingSeconds,
      running,
      awaitingAcknowledgement,
      updatedAt: Date.now()
    }
  }

  writePomodoroState(state) {
    localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent("pomodoro:state-sync"))
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
}
