import { Controller } from "@hotwired/stimulus"
import { readStorage, writeStorage, storageAvailable, escapeHtml } from "utils/storage"

const KEY = "student_os.classes"

export default class extends Controller {
  static targets = [
    "list", "form", "name", "description", "error", "storageWarning",
    "modal", "modalName", "modalDescription", "modalError", "confirmModal"
  ]

  connect() {
    if (!storageAvailable()) {
      this.storageWarningTarget.hidden = false
    }
    this.editingId = null
    this.draggingId = null
    this.suppressNextOpen = false
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

  openEditor(event) {
    if (this.suppressNextOpen) {
      this.suppressNextOpen = false
      return
    }

    const id = event.currentTarget.dataset.id
    const item = readStorage(KEY).find(cls => cls.id === id)
    if (!item) return

    this.editingId = id
    this.modalNameTarget.value = item.name
    this.modalDescriptionTarget.value = item.description || ""
    this.modalErrorTarget.textContent = ""
    this.modalTarget.hidden = false
    this.modalNameTarget.focus()
  }

  closeEditor() {
    this.closeDeleteConfirm()
    this.modalTarget.hidden = true
    this.editingId = null
    this.modalNameTarget.value = ""
    this.modalDescriptionTarget.value = ""
    this.modalErrorTarget.textContent = ""
  }

  closeEditorOnBackdrop(event) {
    if (event.target !== event.currentTarget) return
    this.closeEditor()
  }

  saveEdit() {
    if (!this.editingId) return

    const name = this.modalNameTarget.value.trim()
    const description = this.modalDescriptionTarget.value.trim()

    if (!name) {
      this.modalErrorTarget.textContent = "Class name is required."
      return
    }

    const items = readStorage(KEY)
    const item = items.find(cls => cls.id === this.editingId)
    if (!item) return

    item.name = name
    item.description = description
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
    writeStorage(KEY, readStorage(KEY).filter(cls => cls.id !== this.editingId))
    this.closeDeleteConfirm()
    this.closeEditor()
    this.render()
  }

  startDrag(event) {
    this.draggingId = event.currentTarget.dataset.id
    event.currentTarget.classList.add("entry--dragging")
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", this.draggingId)
  }

  dragOver(event) {
    event.preventDefault()
    const targetId = event.currentTarget.dataset.id
    if (!this.draggingId || this.draggingId === targetId) return
    event.currentTarget.classList.add("entry--drag-over")
    event.dataTransfer.dropEffect = "move"
  }

  dragLeave(event) {
    event.currentTarget.classList.remove("entry--drag-over")
  }

  drop(event) {
    event.preventDefault()
    const targetId = event.currentTarget.dataset.id
    const draggedId = this.draggingId || event.dataTransfer.getData("text/plain")
    this.reorderByIds(draggedId, targetId)
    this.suppressNextOpen = true
    setTimeout(() => { this.suppressNextOpen = false }, 0)
  }

  endDrag() {
    this.draggingId = null
    this.clearDragStyles()
  }

  reorderByIds(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) {
      this.clearDragStyles()
      return
    }

    const items = readStorage(KEY)
    const fromIndex = items.findIndex(cls => cls.id === draggedId)
    const toIndex = items.findIndex(cls => cls.id === targetId)
    if (fromIndex < 0 || toIndex < 0) {
      this.clearDragStyles()
      return
    }

    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    writeStorage(KEY, items)
    this.clearDragStyles()
    this.render()
  }

  clearDragStyles() {
    this.listTarget.querySelectorAll(".entry--drag-over").forEach(entry => entry.classList.remove("entry--drag-over"))
    this.listTarget.querySelectorAll(".entry--dragging").forEach(entry => entry.classList.remove("entry--dragging"))
  }

  render() {
    const items = readStorage(KEY)
    if (items.length === 0) {
      this.listTarget.innerHTML = `<p class="empty-state">No classes yet. Add your first class.</p>`
      return
    }
    this.listTarget.innerHTML = `<div class="entry-list">${items.map(item => `
      <div
        class="entry entry--clickable entry--draggable"
        draggable="true"
        data-id="${item.id}"
        data-action="click->classes#openEditor dragstart->classes#startDrag dragover->classes#dragOver dragleave->classes#dragLeave drop->classes#drop dragend->classes#endDrag"
      >
        <div class="entry__body">
          <span class="entry__title">${escapeHtml(item.name)}</span>
          ${item.description ? `<span class="entry__meta">${escapeHtml(item.description)}</span>` : ""}
        </div>
      </div>
    `).join("")}</div>`
  }

  clearForm() {
    this.nameTarget.value = ""
    this.descriptionTarget.value = ""
  }
}
