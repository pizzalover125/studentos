import { Controller } from "@hotwired/stimulus"

const KEY = "student_os.theme"
const DEFAULT_THEME_ID = "indigo"
const DEFAULT_MODE = "light"
const DEFAULT_FONT_ID = "sans"
const THEMES = [
  { id: "indigo", accent: "#4f46e5", hover: "#4338ca" },
  { id: "blue", accent: "#2563eb", hover: "#1d4ed8" },
  { id: "cyan", accent: "#0891b2", hover: "#0e7490" },
  { id: "teal", accent: "#0d9488", hover: "#0f766e" },
  { id: "emerald", accent: "#059669", hover: "#047857" },
  { id: "green", accent: "#16a34a", hover: "#15803d" },
  { id: "lime", accent: "#65a30d", hover: "#4d7c0f" },
  { id: "yellow", accent: "#ca8a04", hover: "#a16207" },
  { id: "amber", accent: "#d97706", hover: "#b45309" },
  { id: "orange", accent: "#ea580c", hover: "#c2410c" },
  { id: "red", accent: "#dc2626", hover: "#b91c1c" },
  { id: "rose", accent: "#e11d48", hover: "#be123c" },
  { id: "pink", accent: "#db2777", hover: "#be185d" },
  { id: "fuchsia", accent: "#c026d3", hover: "#a21caf" },
  { id: "purple", accent: "#9333ea", hover: "#7e22ce" },
  { id: "violet", accent: "#7c3aed", hover: "#6d28d9" }
]
const FONTS = [
  { id: "sans", css: "'Inter', system-ui, sans-serif" },
  { id: "modern", css: "'Space Grotesk', system-ui, sans-serif" },
  { id: "serif", css: "'Lora', Georgia, serif" },
  { id: "classic", css: "'Merriweather', Georgia, serif" },
  { id: "mono", css: "'JetBrains Mono', ui-monospace, monospace" },
  { id: "pixel", css: "'Press Start 2P', monospace" }
]

export default class extends Controller {
  static targets = ["modal", "option", "modeOption", "fontOption", "error"]

  connect() {
    const stored = this.readStorage()
    this.selectedThemeId = this.validThemeId(stored?.themeId) || DEFAULT_THEME_ID
    this.selectedMode = this.validMode(stored?.mode || this.legacyMode(stored?.darkMode)) || DEFAULT_MODE
    this.selectedFontId = this.validFontId(stored?.fontId) || DEFAULT_FONT_ID
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    this.handleSystemModeChange = () => {
      if (this.selectedMode === "system") this.applyCurrentTheme()
    }
    this.mediaQuery.addEventListener("change", this.handleSystemModeChange)
    this.applyCurrentTheme()
  }

  disconnect() {
    this.mediaQuery?.removeEventListener("change", this.handleSystemModeChange)
  }

  open() {
    this.openSnapshot = {
      themeId: this.selectedThemeId,
      mode: this.selectedMode,
      fontId: this.selectedFontId
    }
    this.skipRevertOnClose = false
    this.markSelectedTheme()
    this.markSelectedMode()
    this.markSelectedFont()
    this.errorTarget.textContent = ""
    this.modalTarget.hidden = false
    this.optionTargets[0]?.focus()
  }

  close() {
    if (!this.skipRevertOnClose && this.openSnapshot) {
      this.selectedThemeId = this.openSnapshot.themeId
      this.selectedMode = this.openSnapshot.mode
      this.selectedFontId = this.openSnapshot.fontId
      this.applyCurrentTheme()
    }

    this.modalTarget.hidden = true
    this.errorTarget.textContent = ""
    this.openSnapshot = null
    this.skipRevertOnClose = false
  }

  closeOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.close()
  }

  selectTheme(event) {
    this.selectedThemeId = event.currentTarget.dataset.themeId
    this.markSelectedTheme()
    this.applyCurrentTheme()
  }

  selectMode(event) {
    this.selectedMode = this.validMode(event.currentTarget.dataset.mode) || DEFAULT_MODE
    this.markSelectedMode()
    this.applyCurrentTheme()
  }

  selectFont(event) {
    this.selectedFontId = this.validFontId(event.currentTarget.dataset.fontId) || DEFAULT_FONT_ID
    this.markSelectedFont()
    this.applyCurrentTheme()
  }

  save() {
    const theme = this.currentTheme()
    if (!theme) {
      this.errorTarget.textContent = "Please select a theme."
      return
    }

    this.applyTheme(theme.accent, theme.hover, this.selectedMode, this.selectedFontId)
    this.writeStorage({ themeId: theme.id, mode: this.selectedMode, fontId: this.selectedFontId })
    this.skipRevertOnClose = true
    this.close()
  }

  reset() {
    this.selectedThemeId = DEFAULT_THEME_ID
    this.selectedMode = DEFAULT_MODE
    this.selectedFontId = DEFAULT_FONT_ID
    const theme = this.currentTheme()
    this.applyTheme(theme.accent, theme.hover, DEFAULT_MODE, DEFAULT_FONT_ID)
    this.removeStorage()
    this.skipRevertOnClose = true
    this.close()
  }

  applyCurrentTheme() {
    const theme = this.currentTheme()
    this.applyTheme(theme.accent, theme.hover, this.selectedMode, this.selectedFontId)
  }

  applyTheme(accent, accentHover, mode, fontId) {
    const root = document.documentElement
    const resolvedMode = mode === "system"
      ? (this.mediaQuery.matches ? "dark" : "light")
      : mode
    const font = this.currentFont(fontId)

    root.style.setProperty("--accent", accent)
    root.style.setProperty("--accent-hover", accentHover)
    root.style.setProperty("--font", font.css)
    root.dataset.themeMode = resolvedMode
    root.dataset.themePreference = mode
    root.dataset.themeFont = font.id
  }

  currentTheme() {
    return THEMES.find(theme => theme.id === this.selectedThemeId) || THEMES[0]
  }

  currentFont(fontId = this.selectedFontId) {
    return FONTS.find(font => font.id === fontId) || FONTS[0]
  }

  validThemeId(value) {
    return THEMES.some(theme => theme.id === value) ? value : null
  }

  markSelectedTheme() {
    this.optionTargets.forEach(option => {
      const selected = option.dataset.themeId === this.selectedThemeId
      option.classList.toggle("theme-option--selected", selected)
      option.setAttribute("aria-pressed", selected ? "true" : "false")
    })
  }

  markSelectedMode() {
    this.modeOptionTargets.forEach(option => {
      const selected = option.dataset.mode === this.selectedMode
      option.classList.toggle("theme-mode-option--selected", selected)
      option.setAttribute("aria-pressed", selected ? "true" : "false")
    })
  }

  markSelectedFont() {
    this.fontOptionTargets.forEach(option => {
      const selected = option.dataset.fontId === this.selectedFontId
      option.classList.toggle("theme-font-option--selected", selected)
      option.setAttribute("aria-pressed", selected ? "true" : "false")
    })
  }

  validMode(value) {
    return ["light", "dark", "system"].includes(value) ? value : null
  }

  validFontId(value) {
    return FONTS.some(font => font.id === value) ? value : null
  }

  legacyMode(darkModeValue) {
    if (typeof darkModeValue !== "boolean") return null
    return darkModeValue ? "dark" : "light"
  }

  readStorage() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  writeStorage(payload) {
    try {
      localStorage.setItem(KEY, JSON.stringify(payload))
    } catch {
      // noop: theme still applies for this page
    }
  }

  removeStorage() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // noop
    }
  }
}
