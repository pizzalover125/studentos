import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.tests"

export default class extends Controller {
  static targets = ["list", "form", "title", "subject", "date", "notes", "error", "storageWarning"]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.populateSubject()
    this.render()
  }

  populateSubject() {
    const classes = readStorage("student_os.classes")
    const select = this.subjectTarget
    while (select.options.length > 1) select.remove(1)
    if (classes.length === 0) {
      const opt = document.createElement("option")
      opt.value = ""
      opt.textContent = "No classes added yet"
      opt.disabled = true
      select.appendChild(opt)
    } else {
      classes.forEach(cls => {
        const opt = document.createElement("option")
        opt.value = cls.name
        opt.textContent = cls.name
        select.appendChild(opt)
      })
    }
  }

  add() {
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
    const date = this.dateTarget.value
    const notes = this.notesTarget.value.trim()

    if (!title || !date) {
      this.errorTarget.textContent = "Title and date are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), title, subject, date, notes, status: "upcoming" })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  toggle(event) {
    const id = event.currentTarget.dataset.id
    const items = readStorage(KEY)
    const item = items.find(i => i.id === id)
    if (item) item.status = item.status === "done" ? "upcoming" : "done"
    writeStorage(KEY, items)
    this.render()
  }

  delete(event) {
    const id = event.currentTarget.dataset.id
    writeStorage(KEY, readStorage(KEY).filter(i => i.id !== id))
    this.render()
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No tests yet. Add your next exam.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry ${item.status === "done" ? "entry--done" : ""}">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="entry__meta">${escapeHtml(item.subject)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(item.date)}</span>
          ${item.notes ? `<span class="entry__meta">${escapeHtml(item.notes)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--ghost" data-id="${item.id}" data-action="tests#toggle">
            ${item.status === "done" ? "Undo" : "Done"}
          </button>
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="tests#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.titleTarget.value = ""
    this.subjectTarget.value = ""
    this.dateTarget.value = ""
    this.notesTarget.value = ""
  }
}
