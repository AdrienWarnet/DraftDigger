import presetsJson from '../../data/presets/conditions.json'
import { validateConditionPreset } from '../engine/buildSchema'
import type { ConditionPreset } from '../engine/types'

/** Presets de conditions de l'éditeur (data/presets/conditions.json). */
export const DEFAULT_PRESETS: ConditionPreset[] = parsePresets(presetsJson)

/** Lit le fichier de presets ; un preset invalide est ignoré avec un avertissement qui le désigne. */
export function parsePresets(
  json: unknown,
  warn: (message: string) => void = (m) => console.warn(`[presets] ${m}`),
): ConditionPreset[] {
  const list =
    typeof json === 'object' && json !== null && 'presets' in json && Array.isArray(json.presets)
      ? (json.presets as unknown[])
      : null
  if (!list) {
    warn('conditions.json : « presets » manquant.')
    return []
  }
  const presets: ConditionPreset[] = []
  const ids = new Set<string>()
  list.forEach((entry, index) => {
    const result = validateConditionPreset(entry)
    if (!result.ok) {
      warn(`conditions.json : preset ${index + 1} ignoré (${result.errors.join(' ; ')}).`)
    } else if (ids.has(result.value.id)) {
      warn(`conditions.json : id « ${result.value.id} » en double, ignoré.`)
    } else {
      ids.add(result.value.id)
      presets.push(result.value)
    }
  })
  return presets
}
