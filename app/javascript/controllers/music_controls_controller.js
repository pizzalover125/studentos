import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  play() {
    this.dispatchCommand("play")
  }

  pause() {
    this.dispatchCommand("pause")
  }

  next() {
    this.dispatchCommand("next")
  }

  toggle() {
    this.dispatchCommand("toggle")
  }

  dispatchCommand(action) {
    window.dispatchEvent(new CustomEvent("music:command", { detail: { action } }))
  }
}
