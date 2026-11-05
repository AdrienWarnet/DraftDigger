import tagThreatsJson from '../../data/defaults/champion-tags.json'
import { THREAT_KEYS, type Champion, type ThreatLevel, type Threats } from '../engine/types'
import { ddragonUrls } from './ddragon'
import type { DDragonData, RawChampion } from './ddragonTypes'

/** Menaces apportées par chaque tag Data Dragon (data/defaults/champion-tags.json). */
export type TagThreats = Record<string, Partial<Threats>>

/**
 * Valeurs par défaut volontairement grossières : Data Dragon ne donne que des classes
 * génériques. Les corrections par champion passent par data/overrides/champions.json (T1.4).
 * TODO(joueur) : ajuster data/defaults/champion-tags.json si les valeurs par défaut gênent.
 */
export const DEFAULT_TAG_THREATS: TagThreats = parseTagThreats(tagThreatsJson)

/** Valide le fichier de menaces par tag ; l'erreur désigne le champ en cause. */
export function parseTagThreats(json: unknown): TagThreats {
  if (!isRecord(json))
    throw new Error('champion-tags.json : un objet { tag: menaces } est attendu.')
  const result: TagThreats = {}
  for (const [tag, threats] of Object.entries(json)) {
    if (!isRecord(threats)) throw new Error(`champion-tags.json : « ${tag} » doit être un objet.`)
    const parsed: Partial<Threats> = {}
    for (const [key, value] of Object.entries(threats)) {
      if (!(THREAT_KEYS as readonly string[]).includes(key)) {
        throw new Error(
          `champion-tags.json : « ${tag}.${key} » inconnu (attendu : ${THREAT_KEYS.join(', ')}).`,
        )
      }
      if (!isThreatLevel(value)) {
        throw new Error(`champion-tags.json : « ${tag}.${key} » doit valoir 0, 1, 2 ou 3.`)
      }
      parsed[key as keyof Threats] = value
    }
    result[tag] = parsed
  }
  return result
}

/** Part AD / AP depuis `info.attack` et `info.magic`, normalisée pour sommer à 1. */
export function championDamage(info: RawChampion['info']): Champion['damage'] {
  const total = info.attack + info.magic
  if (total <= 0) return { ad: 0.5, ap: 0.5, true: 0 }
  return { ad: info.attack / total, ap: info.magic / total, true: 0 }
}

/** Menaces par défaut : pour chaque menace, la valeur la plus forte parmi les tags du champion. */
export function defaultThreats(
  tags: string[],
  tagThreats: TagThreats = DEFAULT_TAG_THREATS,
): Threats {
  const threats: Threats = { cc: 0, burst: 0, engage: 0, heal: 0, tank: 0 }
  for (const tag of tags) {
    const fromTag = tagThreats[tag]
    if (!fromTag) continue
    for (const key of THREAT_KEYS) {
      const value = fromTag[key]
      if (value !== undefined && value > threats[key]) threats[key] = value
    }
  }
  return threats
}

export function toChampion(
  raw: RawChampion,
  version: string,
  tagThreats: TagThreats = DEFAULT_TAG_THREATS,
): Champion {
  return {
    id: raw.id,
    name: raw.name,
    image: ddragonUrls.championImage(version, raw.image.full),
    tags: [...raw.tags],
    damage: championDamage(raw.info),
    threats: defaultThreats(raw.tags, tagThreats),
  }
}

/** Tous les champions du patch, triés par nom (ordre alphabétique français). */
export function buildChampions(
  data: Pick<DDragonData, 'version' | 'champions'>,
  tagThreats: TagThreats = DEFAULT_TAG_THREATS,
): Champion[] {
  return Object.values(data.champions)
    .map((raw) => toChampion(raw, data.version, tagThreats))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isThreatLevel(value: unknown): value is ThreatLevel {
  return value === 0 || value === 1 || value === 2 || value === 3
}
