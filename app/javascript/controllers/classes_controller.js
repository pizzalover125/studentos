import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.classes"

export default class extends Controller {
  static targets = ["list", "form", "name", "description", "error", "storageWarning"]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

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
    const description = this.descriptionTarget.value.trim()

    if (!name) {
      this.errorTarget.textContent = "Class name is required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), name, description })
    writeStorage(KEY, items)

    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
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
      this.listTarget.innerHTML = `<p class="empty-state">No classes yet. Add your first class.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.name)}</span>
          ${item.description ? `<span class="entry__meta">${escapeHtml(item.description)}</span>` : ""}
        </div>
        <div class="entry__actions">
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="classes#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.nameTarget.value = ""
    this.descriptionTarget.value = ""
  }
}
