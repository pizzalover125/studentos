import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.tests"

export default class extends Controller {
  static targets = [
    "list", "form", "title", "subject", "date", "notes", "error", "storageWarning",
    "modal", "modalTitle", "modalSubject", "modalDate", "modalNotes", "modalError", "confirmModal"
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
    const date = this.dateTarget.value
    const notes = this.notesTarget.value.trim()

    if (!title || !date) {
      this.errorTarget.textContent = "Title and date are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), title, subject, date, notes })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
    this.render()
  }

  openEditor(event) {
    const id = event.currentTarget.dataset.id
    const item = readStorage(KEY).find(test => test.id === id)
    if (!item) return

    this.populateSubject()
    this.editingId = id
    this.modalTitleTarget.value = item.title
    this.modalSubjectTarget.value = item.subject || ""
    this.modalDateTarget.value = item.date
    this.modalNotesTarget.value = item.notes || ""
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
    this.modalDateTarget.value = ""
    this.modalNotesTarget.value = ""
    this.modalErrorTarget.textContent = ""
  }

  closeEditorOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.closeEditor()
  }

  saveEdit() {
    if (!this.editingId) return

    const title = this.modalTitleTarget.value.trim()
    const subject = this.modalSubjectTarget.value
    const date = this.modalDateTarget.value
    const notes = this.modalNotesTarget.value.trim()

    if (!title || !date) {
      this.modalErrorTarget.textContent = "Title and date are required."
      return
    }

    const items = readStorage(KEY)
    const item = items.find(test => test.id === this.editingId)
    if (!item) return

    item.title = title
    item.subject = subject
    item.date = date
    item.notes = notes
    writeStorage(KEY, items)
    this.closeEditor()
    this.render()
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

  deleteFromModal() {
    if (!this.editingId) return
    writeStorage(KEY, readStorage(KEY).filter(test => test.id !== this.editingId))
    this.closeDeleteConfirm()
    this.closeEditor()
    this.render()
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No tests yet. Add your next exam.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry" data-id="${item.id}" data-action="click->tests#openEditor">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.title)}</span>
          ${item.subject ? `<span class="entry__meta">${escapeHtml(item.subject)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(item.date)}</span>
          ${item.notes ? `<span class="entry__meta">${escapeHtml(item.notes)}</span>` : ""}
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
