import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.volunteer"

export default class extends Controller {
  static targets = [
    "list", "form", "organization", "description", "date", "hours",
    "error", "totalHours", "storageWarning"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.render()
  }

  add() {
    this.formTarget.hidden = false
    this.organizationTarget.focus()
  }

  cancel() {
    this.formTarget.hidden = true
    this.clearForm()
    this.errorTarget.textContent = ""
  }

  save() {
    const organization = this.organizationTarget.value.trim()
    const description = this.descriptionTarget.value.trim()
    const date = this.dateTarget.value.trim()
    const hours = this.hoursTarget.value.trim()

    if (!organization || !date || !hours) {
      this.errorTarget.textContent = "Organization, date, and hours are required."
      return
    }

    const items = readStorage(KEY)
    items.push({ id: Date.now().toString(), organization, description, date, hours })
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
    const total = items.reduce((sum, i) => sum + parseFloat(i.hours || 0), 0)
    this.totalHoursTarget.textContent = total % 1 === 0 ? String(total) : total.toFixed(1)

    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No volunteer hours yet. Log your first session.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div class="entry">
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.organization)}</span>
          ${item.description ? `<span class="entry__meta">${escapeHtml(item.description)}</span>` : ""}
          <span class="entry__meta">${escapeHtml(item.date)}</span>
        </div>
        <div class="entry__actions">
          <span class="hours-badge">${escapeHtml(item.hours)} hr${parseFloat(item.hours) !== 1 ? "s" : ""}</span>
          <button class="btn btn--link-danger" data-id="${item.id}" data-action="volunteer#delete">Delete</button>
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.organizationTarget.value = ""
    this.descriptionTarget.value = ""
    this.dateTarget.value = ""
    this.hoursTarget.value = ""
  }
}
