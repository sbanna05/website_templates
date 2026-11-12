// Everything the app keeps lives in this browser's localStorage under the
// keys below. Nothing is sent anywhere. The Privacy & data dialog lists
// these entries and can delete each one.

export const STORAGE_ENTRIES = [
  {
    key: 'design-for-you.design.v1',
    id: 'design',
    label: 'Your scenes',
    description: 'The blocks, sizes, colours and materials in your room and outfit.'
  },
  {
    key: 'design-for-you.palettes.v1',
    id: 'palettes',
    label: 'Your palettes',
    description: 'Palettes you named and saved.'
  },
  {
    key: 'design-for-you.prefs.v1',
    id: 'prefs',
    label: 'Preferences',
    description: 'Your working colour, snap setting and last-used mode.'
  }
]

const keyFor = (id) => STORAGE_ENTRIES.find((entry) => entry.id === id).key

/** Reads and parses a saved entry. Returns `fallback` if it is missing, corrupt or blocked. */
export function readStored(id, fallback = null) {
  try {
    const raw = localStorage.getItem(keyFor(id))
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** Saves an entry. Returns false when the browser refuses (private mode, full quota). */
export function writeStored(id, value) {
  try {
    localStorage.setItem(keyFor(id), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStored(id) {
  try {
    localStorage.removeItem(keyFor(id))
  } catch {
    // Storage is unavailable, so there is nothing to remove.
  }
}

/** Size in bytes of each saved entry (0 when nothing is saved). */
export function storedSizes() {
  return Object.fromEntries(STORAGE_ENTRIES.map((entry) => {
    let bytes = 0
    try {
      const raw = localStorage.getItem(entry.key)
      if (raw !== null) bytes = new Blob([raw]).size
    } catch {
      bytes = 0
    }
    return [entry.id, bytes]
  }))
}
