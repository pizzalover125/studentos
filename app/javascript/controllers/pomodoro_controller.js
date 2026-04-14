import { Controller } from "@hotwired/stimulus"

const SETTINGS_KEY = "student_os.pomodoro_settings"
const TASKBAR_KEY = "student_os.pomodoro_taskbar"
const DEFAULT_WORK_MINUTES = 25
const DEFAULT_PLAY_MINUTES = 5

export default class extends Controller {
  static targets = [
    "display", "phaseLabel", "timerCore", "toggleButton",
    "settingsModal", "workMinutes", "playMinutes", "settingsError"
  ]

  connect() {
    this.intervalId = null
    this.alertIntervalId = null
    this.audioContext = null
    this.onStateSync = () => this.syncFromStorage()
    window.addEventListener("pomodoro:state-sync", this.onStateSync)
    const settings = this.loadSettings()
    this.workDurationMinutes = settings.workMinutes
    this.playDurationMinutes = settings.playMinutes
    const runtime = this.loadRuntimeState()
    this.awaitingAcknowledgement = runtime.awaitingAcknowledgement
    this.phase = runtime.phase
    this.remainingSeconds = runtime.remainingSeconds
    this.render()
    if (runtime.running) {
      this.start()
    } else {
      this.updateButtons()
    }
  }

  disconnect() {
    const wasRunning = Boolean(this.intervalId)
    window.removeEventListener("pomodoro:state-sync", this.onStateSync)
    this.stopAlertTone()
    if (wasRunning) {
      this.persistTaskbarState({ running: true, updatedAt: Date.now() })
    } else {
      this.persistTaskbarState()
    }
    this.clearTimer()
  }

  syncFromStorage() {
    const runtime = this.loadRuntimeState()
    const wasAwaiting = this.awaitingAcknowledgement

    this.awaitingAcknowledgement = runtime.awaitingAcknowledgement
    this.phase = runtime.phase
    this.remainingSeconds = runtime.remainingSeconds

    if (wasAwaiting && !this.awaitingAcknowledgement) {
      this.stopAlertTone()
    }

    if (runtime.running) {
      if (!this.intervalId) {
        this.start()
      } else {
        this.render()
        this.updateButtons()
      }
      return
    }

    this.clearTimer()
    if (!this.awaitingAcknowledgement) this.stopAlertTone()
    this.render()
    this.updateButtons()
  }

  start() {
    if (this.intervalId) return
    if (this.awaitingAcknowledgement) return
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = this.phaseDurationSeconds()
      this.render()
    }

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds <= 1) {
        if (this.phase === "work") {
          this.handleWorkCompleted()
        } else {
          this.switchPhase()
        }
        return
      }
      this.remainingSeconds -= 1
      this.render()
    }, 1000)

    this.updateButtons()
  }

  toggle() {
    if (this.awaitingAcknowledgement) return
    if (this.intervalId) {
      this.pause()
    } else {
      this.start()
    }
  }

  pause() {
    this.clearTimer()
    this.updateButtons()
  }

  reset() {
    this.clearTimer()
    this.stopAlertTone()
    this.awaitingAcknowledgement = false
    this.phase = "work"
    this.remainingSeconds = this.phaseDurationSeconds()
    this.render()
    this.updateButtons()
  }

  clearTimer() {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  switchPhase() {
    this.phase = this.phase === "work" ? "play" : "work"
    this.remainingSeconds = this.phaseDurationSeconds()
    this.render()
  }

  handleWorkCompleted() {
    this.clearTimer()
    this.awaitingAcknowledgement = true
    this.remainingSeconds = 0
    this.startAlertTone()
    this.render()
    this.updateButtons()
  }

  openSettings() {
    this.workMinutesTarget.value = String(this.workDurationMinutes)
    this.playMinutesTarget.value = String(this.playDurationMinutes)
    this.settingsErrorTarget.textContent = ""
    this.settingsModalTarget.hidden = false
    this.workMinutesTarget.focus()
  }

  closeSettings() {
    this.settingsModalTarget.hidden = true
    this.settingsErrorTarget.textContent = ""
  }

  closeSettingsOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.closeSettings()
  }

  saveSettings() {
    const workMinutes = this.validMinutes(this.workMinutesTarget.value)
    const playMinutes = this.validMinutes(this.playMinutesTarget.value)

    if (!workMinutes || !playMinutes) {
      this.settingsErrorTarget.textContent = "Work and play minutes must be whole numbers greater than 0."
      return
    }

    this.workDurationMinutes = workMinutes
    this.playDurationMinutes = playMinutes
    this.writeSettings()
    this.reset()
    this.closeSettings()
  }

  validMinutes(value) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
  }

  phaseDurationSeconds() {
    return this.phase === "work"
      ? this.workDurationMinutes * 60
      : this.playDurationMinutes * 60
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return { workMinutes: DEFAULT_WORK_MINUTES, playMinutes: DEFAULT_PLAY_MINUTES }
      const parsed = JSON.parse(raw)
      const workMinutes = this.validMinutes(parsed?.workMinutes) || DEFAULT_WORK_MINUTES
      const playMinutes = this.validMinutes(parsed?.playMinutes) || DEFAULT_PLAY_MINUTES
      return { workMinutes, playMinutes }
    } catch {
      localStorage.removeItem(SETTINGS_KEY)
      return { workMinutes: DEFAULT_WORK_MINUTES, playMinutes: DEFAULT_PLAY_MINUTES }
    }
  }

  loadRuntimeState() {
    const fallback = {
      phase: "work",
      remainingSeconds: this.workDurationMinutes * 60,
      running: false,
      awaitingAcknowledgement: false
    }

    try {
      const raw = localStorage.getItem(TASKBAR_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback

      let phase = parsed.phase === "play" ? "play" : "work"
      let remainingSeconds = Number.parseInt(parsed.remainingSeconds, 10)
      if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) return fallback

      let running = Boolean(parsed.running)
      let awaitingAcknowledgement = Boolean(parsed.awaitingAcknowledgement)
      const updatedAt = Number.parseInt(parsed.updatedAt, 10)

      if (running && Number.isFinite(updatedAt)) {
        const elapsed = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000))
        remainingSeconds -= elapsed

        if (phase === "work" && remainingSeconds <= 0) {
          phase = "work"
          remainingSeconds = 0
          running = false
          awaitingAcknowledgement = true
        } else if (phase === "play" && remainingSeconds <= 0) {
          const overflow = Math.abs(remainingSeconds)
          phase = "work"
          remainingSeconds = Math.max(0, (this.workDurationMinutes * 60) - overflow)
          running = true
        }
      }

      return { phase, remainingSeconds, running, awaitingAcknowledgement }
    } catch {
      localStorage.removeItem(TASKBAR_KEY)
      return fallback
    }
  }

  writeSettings() {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ workMinutes: this.workDurationMinutes, playMinutes: this.playDurationMinutes })
    )
  }

  persistTaskbarState(overrides = {}) {
    const payload = {
      phase: this.phase,
      remainingSeconds: this.remainingSeconds,
      running: Boolean(this.intervalId),
      awaitingAcknowledgement: this.awaitingAcknowledgement,
      updatedAt: Date.now(),
      ...overrides
    }
    localStorage.setItem(TASKBAR_KEY, JSON.stringify(payload))
  }

  startAlertTone() {
    if (this.alertIntervalId) return
    this.playBeep()
    this.alertIntervalId = setInterval(() => this.playBeep(), 1200)
  }

  stopAlertTone() {
    if (!this.alertIntervalId) return
    clearInterval(this.alertIntervalId)
    this.alertIntervalId = null
  }

  playBeep() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass()
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume()
    }

    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.02
    oscillator.connect(gain)
    gain.connect(this.audioContext.destination)

    const now = this.audioContext.currentTime
    oscillator.start(now)
    oscillator.stop(now + 0.08)
  }

  updateButtons() {
    const running = Boolean(this.intervalId)
    this.toggleButtonTarget.disabled = this.awaitingAcknowledgement
    this.toggleButtonTarget.textContent = running ? "Pause" : "Start"
    this.persistTaskbarState()
  }

  render() {
    this.phaseLabelTarget.textContent = this.awaitingAcknowledgement
      ? "Work complete — click timer"
      : (this.phase === "work" ? "Work" : "Play")
    this.timerCoreTarget.classList.toggle("timer-core--alert", this.awaitingAcknowledgement)
    const minutes = Math.floor(this.remainingSeconds / 60)
    const seconds = this.remainingSeconds % 60
    const mm = String(minutes).padStart(2, "0")
    const ss = String(seconds).padStart(2, "0")
    this.displayTarget.textContent = `${mm}:${ss}`
    this.persistTaskbarState()
  }
}
