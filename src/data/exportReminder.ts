/** Date du dernier export de builds, gardée dans le stockage local (simple confort d'affichage). */
const KEY = 'draftdigger:dernier-export'

export function getLastExportAt(): Date | null {
  try {
    const value = localStorage.getItem(KEY)
    const time = value ? Date.parse(value) : NaN
    return Number.isNaN(time) ? null : new Date(time)
  } catch {
    return null
  }
}

export function markExported(now = new Date()) {
  try {
    localStorage.setItem(KEY, now.toISOString())
  } catch {
    // stockage indisponible : le rappel reviendra, sans conséquence
  }
}
