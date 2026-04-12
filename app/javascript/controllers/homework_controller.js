import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.homework"
const STATUS_NOT_STARTED = "not_started"
const STATUS_PENDING = "pending"
const STATUS_COMPLETED = "completed"
const STATUS_OPTIONS = [
  { value: STATUS_NOT_STARTED, label: "Not Started" },
  { value: STATUS_PENDING, label: "Pending" },
  { value: STATUS_COMPLETED, label: "Completed" }
]

export default class extends Controller {
  static targets = [
    "list", "form", "title", "subject", "dueDate", "estimateMinutes", "error", "storageWarning",
    "modal", "modalTitle", "modalSubject", "modalDueDate", "modalEstimateMinutes", "modalError", "confirmModal"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.editingId = null
    this.populateSubject()
    this.render()
  }

  populateSubject() {
    const classes = readStorage("student_os.classes")
    const selects = [this.subjectTarget, this.modalSubjectTarget]
    selects.forEach(select => {
      while (select.options.length > 1) select.remove(1)
    })

    if (classes.length === 0) {
      selects.forEach(select => {
        const opt = document.createElement("option")
        opt.value = ""
        opt.textContent = "No classes added yet"
        opt.disabled = true
        select.appendChild(opt)
      })
      return
    }

    classes.forEach(cls => {
      selects.forEach(select => {
        const opt = document.createElement("option")
        opt.value = cls.name
        opt.textContent = cls.name
        select.appendChild(opt)
      })
    })
  }

  openEditor(event) {
    const id = event.currentTarget.dataset.id
    const item = readStorage(KEY).find(homework => homework.id === id)
    if (!item) return

    this.populateSubject()
    this.editingId = id
    this.modalTitleTarget.value = item.title
    this.modalSubjectTarget.value = item.subject || ""
    this.modalDueDateTarget.value = item.due_date
    this.modalEstimateMinutesTarget.value = item.estimate_minutes || ""
    this.modalErrorTarget.textContent = ""
    this.modalTarget.hidden = false
    this.modalTitleTarget.focus()
  }

  closeEditor() {
    this.closeDeleteConfirm()
    this.modalTarget.hidden = true
    this.editingId = null
    this.modalTitleTarget.value = ""
    this.modalSubjectTarget.value = ""
    this.modalDueDateTarget.value = ""
    this.modalEstimateMinutesTarget.value = ""
    this.modalErrorTarget.textContent = ""
  }

  closeEditorOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.closeEditor()
  }

  requestDeleteConfirmation() {
    if (!this.editingId) return
    this.confirmModalTarget.hidden = false
  }

  closeDeleteConfirm() {
    this.confirmModalTarget.hidden = true
  }

  closeDeleteConfirmOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.closeDeleteConfirm()
  }

  saveEdit() {
    if (!this.editingId) return

    const title = this.modalTitleTarget.value.trim()
    const subject = this.modalSubjectTarget.value
    const dueDate = this.modalDueDateTarget.value
    const estimateMinutes = this.normalizeEstimateMinutes(this.modalEstimateMinutesTarget.value)

    if (!title || !dueDate) {
      this.modalErrorTarget.textContent = "Title and due date are required."
      return
    }

    const items = readStorage(KEY)
    const item = items.find(homework => homework.id === this.editingId)
    if (!item) return

    item.title = title
    item.subject = subject
    item.due_date = dueDate
    item.estimate_minutes = estimateMinutes
    writeStorage(KEY, items)
    this.closeEditor()
    this.render()
  }

  deleteFromModal() {
    if (!this.editingId) return

    writeStorage(KEY, readStorage(KEY).filter(homework => homework.id !== this.editingId))
    this.closeDeleteConfirm()
    this.closeEditor()
    this.render()
  }

  add() {
    this.populateSubject()
    this.formTarget.hidden = false
    this.titleTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const title = this.titleTarget.value.trim()
    const subject = this.subjectTarget.value
    const dueDate = this.dueDateTarget.value
    const estimateMinutes = this.normalizeEstimateMinutes(this.estimateMinutesTarget.value)

    if (!title || !dueDate) {
      this.errorTarget.textContent = "Title and due date are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), title, subject, due_date: dueDate, estimate_minutes: estimateMinutes, status: STATUS_NOT_STARTED })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  updateStatus(event) {
    const id = event.currentTarget.dataset.id
    const nextStatus = event.currentTarget.value
    const items = readStorage(KEY)
    const item = items.find(i => i.id === id)
    if (item) item.status = this.normalizeStatus(nextStatus)
    writeStorage(KEY, items)
    this.render()
  }

  stopRowEdit(event) {
    event.stopPropagation()
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No homework yet. Add your first assignment.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => {
      const status = this.normalizeStatus(item.status)
      return `
      <div class="entry ${status === STATUS_COMPLETED ? "entry--done" : ""}" data-id="${item.id}" data-action="click->homework#openEditor">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="entry__meta">${escapeHtml(item.subject)}</span>` : ""}
          <span class="entry__meta">Due ${escapeHtml(item.due_date)}</span>
          ${item.estimate_minutes ? `<span class="entry__meta">Estimated ${escapeHtml(String(item.estimate_minutes))} min</span>` : ""}
        </div>
        <div class="entry__actions">
          <div class="entry__status">
            <select
              id="homework_status_${item.id}"
              class="status-select ${this.statusSelectClass(status)}"
              data-id="${item.id}"
              data-action="click->homework#stopRowEdit change->homework#updateStatus"
              aria-label="Update status for ${escapeHtml(item.title)}"
            >
              ${this.statusOptions(status)}
            </select>
          </div>
        </div>
      </div>
    `
    }).join("")}</div>`
  }

  clearForm() {
    this.titleTarget.value = ""
    this.subjectTarget.value = ""
    this.dueDateTarget.value = ""
    this.estimateMinutesTarget.value = ""
  }

  normalizeStatus(status) {
    if (status === STATUS_COMPLETED || status === "done") return STATUS_COMPLETED
    if (status === STATUS_PENDING) return STATUS_PENDING
    return STATUS_NOT_STARTED
  }

  statusSelectClass(status) {
    if (status === STATUS_COMPLETED) return "status-select--completed"
    if (status === STATUS_PENDING) return "status-select--pending"
    return "status-select--not-started"
  }

  statusOptions(selectedStatus) {
    return STATUS_OPTIONS
      .map(option => `<option value="${option.value}"${option.value === selectedStatus ? " selected" : ""}>${option.label}</option>`)
      .join("")
  }

  normalizeEstimateMinutes(value) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return ""
    return String(parsed)
  }
}
