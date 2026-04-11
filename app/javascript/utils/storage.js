export function storageAvailable() {
  try {
    localStorage.setItem("__test__", "1")
    localStorage.removeItem("__test__")
    return true
  } catch {
    return false
  }
}

export function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

export function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
