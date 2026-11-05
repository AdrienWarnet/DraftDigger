/**
 * Types du domaine (contrats entre les couches, voir docs/TICKETS.md section 3).
 * Aucune dépendance : ce fichier est importable partout.
 */

export const POSITIONS = ['top', 'jungle', 'mid', 'bot', 'support'] as const
export type Position = (typeof POSITIONS)[number]

/** Intensité d'une menace : 0 = aucune, 3 = très forte. */
export type ThreatLevel = 0 | 1 | 2 | 3

export const THREAT_KEYS = ['cc', 'burst', 'engage', 'heal', 'tank'] as const
export type ThreatKey = (typeof THREAT_KEYS)[number]
export type Threats = Record<ThreatKey, ThreatLevel>

export type Champion = {
  id: string // "Yorick"
  name: string
  image: string // URL
  tags: string[] // tags Data Dragon : Fighter, Tank, Mage...
  /** Répartition des dégâts infligés ; la somme vaut 1. */
  damage: { ad: number; ap: number; true: number }
  threats: Threats
}
