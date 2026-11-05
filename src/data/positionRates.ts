import positionsJson from '../../data/defaults/champion-positions.json'
import type { PositionRates } from '../engine/positions'
import { POSITIONS, type Position } from '../engine/types'

/**
 * Taux de jeu par poste (data/defaults/champion-positions.json, généré par
 * `npm run update-positions` depuis Meraki Analytics). Sert à deviner le poste des ennemis.
 */
export const DEFAULT_POSITION_RATES: PositionRates = parsePositionRates(positionsJson)

/** Patch des données de postes (ex : « 16.3 »). */
export const POSITION_RATES_PATCH: string =
  typeof positionsJson.patch === 'string' ? positionsJson.patch : 'inconnu'

/** Valide le fichier ; une entrée invalide est ignorée avec un avertissement. */
export function parsePositionRates(
  json: unknown,
  warn: (message: string) => void = (m) => console.warn(`[postes] ${m}`),
): PositionRates {
  const rates: PositionRates = {}
  const source = isRecord(json) && isRecord(json.rates) ? json.rates : null
  if (!source) {
    warn('champion-positions.json : « rates » manquant, postes ennemis non devinés.')
    return rates
  }
  for (const [championId, byPosition] of Object.entries(source)) {
    if (!isRecord(byPosition)) {
      warn(`champion-positions.json : « ${championId} » ignoré.`)
      continue
    }
    const entry: Partial<Record<Position, number>> = {}
    for (const [position, rate] of Object.entries(byPosition)) {
      if (
        (POSITIONS as readonly string[]).includes(position) &&
        typeof rate === 'number' &&
        rate >= 0
      ) {
        entry[position as Position] = rate
      } else {
        warn(`champion-positions.json : « ${championId}.${position} » ignoré.`)
      }
    }
    rates[championId] = entry
  }
  return rates
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
