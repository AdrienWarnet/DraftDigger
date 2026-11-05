import { POSITIONS, type Position } from '../../engine/types'

/**
 * Emplacement que le sélecteur est en train de remplir, encodé dans l'URL (`#/draft/choisir/<cible>`) :
 * un allié à un poste, un ennemi à un poste, ou un nouvel ennemi sans poste.
 */
export type PickerTarget =
  | { team: 'ally'; position: Position }
  | { team: 'enemy'; position: Position }
  | { team: 'enemy'; position: 'new' }

export const PICKER_PARAM = 'choisir'

export function encodePickerTarget(target: PickerTarget): string {
  if (target.team === 'ally') return `allie-${target.position}`
  return target.position === 'new' ? 'ennemi-nouveau' : `ennemi-${target.position}`
}

/** Cible lue dans l'URL, ou `null` si elle est absente ou invalide. */
export function parsePickerTarget(params: string[]): PickerTarget | null {
  if (params[0] !== PICKER_PARAM || !params[1]) return null
  const match = /^(allie|ennemi)-(.+)$/.exec(params[1])
  if (!match) return null
  const [, team, rest] = match
  if (team === 'ennemi' && rest === 'nouveau') return { team: 'enemy', position: 'new' }
  if (!isPosition(rest)) return null
  return team === 'allie' ? { team: 'ally', position: rest } : { team: 'enemy', position: rest }
}

function isPosition(value: string | undefined): value is Position {
  return (POSITIONS as readonly (string | undefined)[]).includes(value)
}
