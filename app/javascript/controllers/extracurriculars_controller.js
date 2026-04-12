import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.extracurriculars"
const LOGS_KEY = "student_os.extracurricular_logs"

export default class extends Controller {
  static targets = [
    "listView", "list", "form", "name", "role", "notes", "error", "storageWarning",
    "detail", "detailTitle", "detailRole", "detailTotal",
    "logList", "logForm", "logDescription", "logDate", "logHours", "logError"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.currentId = null
    this.renderList()
  }

  // --- List view ---

  add() {
    this.formTarget.hidden = false
    this.nameTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const name = this.nameTarget.value.trim()
    const role = this.roleTarget.value.trim()
    const notes = this.notesTarget.value.trim()

    if (!name) {
      this.errorTarget.textContent = "Name is required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), name, role, notes })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.renderList()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    writeStorage(LOGS_KEY, readStorage(LOGS_KEY).filter(l => l.extracurricular_id !== id))
    this.renderList()
  }

  stopRowOpen(event) {
    event.stopPropagation()
  }

  showDetail(event) {
    this.currentId = event.currentTarget.dataset.id
    this.listViewTarget.hidden = true
    this.detailTarget.hidden = false
    this.renderDetail()
  }

  backToList() {
    this.detailTarget.hidden = true
    this.listViewTarget.hidden = false
    this.currentId = null
    this.renderList()
  }

  // --- Detail view ---

  addLog() {
    this.logFormTarget.hidden = false
    this.logDescriptionTarget.focus()
  }

  cancelLog() {
    this.logFormTarget.hidden = true
    this.clearLogForm()
    this.logErrorTarget.textContent = ""
  }

  saveLog() {
    const description = this.logDescriptionTarget.value.trim()
    const date = this.logDateTarget.value.trim()
    const hours = this.logHoursTarget.value.trim()

    if (!date || !hours) {
      this.logErrorTarget.textContent = "Date and hours are required."
      return
    }

    const logs = readStorage(LOGS_KEY)
    logs.push({ id: Date.now().toString(), extracurricular_id: this.currentId, description, date, hours })
    writeStorage(LOGS_KEY, logs)

    this.logFormTarget.hidden = true
    this.clearLogForm()
    this.logErrorTarget.textContent = ""
    this.renderDetail()
  }

  deleteLog(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(LOGS_KEY, readStorage(LOGS_KEY).filter(l => l.id !== id))
    this.renderDetail()
  }

  // --- Renderers ---

  renderList() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No extracurriculars yet. Add your first activity.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry entry--clickable" data-id="${item.id}" data-action="click->extracurriculars#showDetail">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.name)}</span>
          ${item.role ? `<span class="entry__meta">${escapeHtml(item.role)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="click->extracurriculars#stopRowOpen extracurriculars#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  renderDetail() {
    const activity = readStorage(KEY).find(i => i.id === this.currentId)
    if (!activity) { this.backToList(); return }

    this.detailTitleTarget.textContent = activity.name
    this.detailRoleTarget.textContent = activity.role || ""

    const logs = readStorage(LOGS_KEY).filter(l => l.extracurricular_id === this.currentId)
    const total = logs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0)
    const totalDisplay = total % 1 === 0 ? String(total) : total.toFixed(1)
    this.detailTotalTarget.textContent = `${totalDisplay} hrs total`

    if (logs.length === 0) {
      this.logListTarget.innerHTML = `<p class="empty-state">No logs yet. Add your first session.</p>`
      return
    }
    this.logListTarget.innerHTML = `<div class="entry-list">${logs.map(log => `
      <div class="entry">
        <div class="entry__body">
          ${log.description ? `<span class="entry__title">${escapeHtml(log.description)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(log.date)}</span>
        </div>
        <div class="entry__actions">
          <span class="hours-badge">${escapeHtml(log.hours)} hr${parseFloat(log.hours) !== 1 ? "s" : ""}</span>
          <button class="btn btn--link-danger" data-id="${log.id}" data-action="extracurriculars#deleteLog">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.nameTarget.value = ""
    this.roleTarget.value = ""
    this.notesTarget.value = ""
  }

  clearLogForm() {
    this.logDescriptionTarget.value = ""
    this.logDateTarget.value = ""
    this.logHoursTarget.value = ""
  }
}
