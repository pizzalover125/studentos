function namespacedKey(key) {
  const namespace = document.documentElement?.dataset?.storageNamespace
  return namespace ? `${key}.${namespace}` : key
}

export function storageAvailable() {
  try {
    const testKey = namespacedKey("__test__")
    localStorage.setItem(testKey, "1")
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export function readStorage(key) {
  const storageKey = namespacedKey(key)
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || []
  } catch {
    localStorage.removeItem(storageKey)
    return []
  }
}

export function writeStorage(key, data) {
  localStorage.setItem(namespacedKey(key), JSON.stringify(data))
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
