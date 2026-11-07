import type { Position, Situation } from '../engine/types'

/** Libellés affichés des postes. */
export const POSITION_LABELS: Record<Position, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  bot: 'Bot',
  support: 'Support',
}

/** Libellés de la situation en partie (T6.2). */
export const SITUATION_LABELS: Record<Situation, string> = {
  ahead: 'Devant',
  even: 'Égalité',
  behind: 'En retard',
}
