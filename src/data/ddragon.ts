import type {
  DDragonData,
  RawChampion,
  RawItem,
  RawRuneTree,
  RawSummonerSpell,
} from './ddragonTypes'

export const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com'
export const DDRAGON_LOCALE = 'fr_FR'

/** Clé du cache dans le stockage local. Une seule version est gardée. */
export const DDRAGON_CACHE_KEY = 'draftdigger:ddragon'
/** À incrémenter si le format de `DDragonData` change : l'ancien cache sera ignoré. */
const CACHE_FORMAT = 1
/** Au-delà, on considère le réseau indisponible (connexion très lente en partie). */
const DEFAULT_TIMEOUT_MS = 8000

type DataFile = 'champion' | 'item' | 'runesReforged' | 'summoner'

export const ddragonUrls = {
  versions: () => `${DDRAGON_BASE_URL}/api/versions.json`,
  data: (version: string, file: DataFile) =>
    `${DDRAGON_BASE_URL}/cdn/${version}/data/${DDRAGON_LOCALE}/${file}.json`,
  championImage: (version: string, file: string) =>
    `${DDRAGON_BASE_URL}/cdn/${version}/img/champion/${file}`,
  itemImage: (version: string, file: string) =>
    `${DDRAGON_BASE_URL}/cdn/${version}/img/item/${file}`,
  summonerSpellImage: (version: string, file: string) =>
    `${DDRAGON_BASE_URL}/cdn/${version}/img/spell/${file}`,
  runeIcon: (icon: string) => `${DDRAGON_BASE_URL}/cdn/img/${icon}`,
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export type DDragonDeps = {
  fetch: typeof fetch
  /** `null` si le stockage local est indisponible (navigation privée stricte...). */
  storage: KeyValueStorage | null
  timeoutMs?: number
}

export type DDragonLoadResult = {
  data: DDragonData
  source: 'network' | 'cache'
  /**
   * `true` si le dernier patch n'a pas pu être vérifié ou téléchargé :
   * les données viennent du cache et peuvent dater d'un patch précédent.
   */
  stale: boolean
}

export class DDragonError extends Error {
  override name = 'DDragonError'
}

/**
 * Charge les données du dernier patch.
 * - Version inchangée depuis le dernier chargement : seul `versions.json` est téléchargé.
 * - Nouvelle version : les 4 fichiers sont téléchargés et remplacent le cache.
 * - Réseau indisponible : le cache est utilisé (`stale: true`) ; sans cache, `DDragonError`.
 */
export async function loadDDragon(deps: DDragonDeps = defaultDeps()): Promise<DDragonLoadResult> {
  const cached = deps.storage ? readCache(deps.storage) : null

  let latestVersion: string
  try {
    latestVersion = await fetchLatestVersion(deps)
  } catch (error) {
    if (cached) return { data: cached, source: 'cache', stale: true }
    throw new DDragonError('Data Dragon injoignable et aucune donnée en cache.', { cause: error })
  }

  if (cached?.version === latestVersion) return { data: cached, source: 'cache', stale: false }

  try {
    const data = await fetchPatchData(latestVersion, deps)
    if (deps.storage) writeCache(deps.storage, data)
    return { data, source: 'network', stale: false }
  } catch (error) {
    if (cached) return { data: cached, source: 'cache', stale: true }
    throw new DDragonError(`Téléchargement du patch ${latestVersion} impossible.`, {
      cause: error,
    })
  }
}

export async function fetchLatestVersion(deps: DDragonDeps): Promise<string> {
  const versions = await fetchJson(ddragonUrls.versions(), deps)
  if (!Array.isArray(versions) || typeof versions[0] !== 'string') {
    throw new DDragonError('Liste des versions Data Dragon invalide.')
  }
  return versions[0]
}

async function fetchPatchData(version: string, deps: DDragonDeps): Promise<DDragonData> {
  const [champions, items, runeTrees, summonerSpells] = await Promise.all([
    fetchJson(ddragonUrls.data(version, 'champion'), deps),
    fetchJson(ddragonUrls.data(version, 'item'), deps),
    fetchJson(ddragonUrls.data(version, 'runesReforged'), deps),
    fetchJson(ddragonUrls.data(version, 'summoner'), deps),
  ])
  const data = {
    version,
    champions: dataField(champions) as Record<string, RawChampion>,
    items: dataField(items) as Record<string, RawItem>,
    runeTrees: runeTrees as RawRuneTree[],
    summonerSpells: dataField(summonerSpells) as Record<string, RawSummonerSpell>,
  }
  if (!isDDragonData(data)) throw new DDragonError(`Fichiers du patch ${version} inattendus.`)
  return data
}

async function fetchJson(url: string, deps: DDragonDeps): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const response = await deps.fetch(url, { signal: controller.signal })
    if (!response.ok) throw new DDragonError(`HTTP ${response.status} sur ${url}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function dataField(file: unknown): unknown {
  return isRecord(file) ? file.data : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Vérification de forme minimale : protège contre un cache corrompu ou un fichier inattendu. */
function isDDragonData(value: unknown): value is DDragonData {
  return (
    isRecord(value) &&
    typeof value.version === 'string' &&
    isRecord(value.champions) &&
    isRecord(value.items) &&
    Array.isArray(value.runeTrees) &&
    isRecord(value.summonerSpells)
  )
}

function readCache(storage: KeyValueStorage): DDragonData | null {
  try {
    const raw = storage.getItem(DDRAGON_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.format !== CACHE_FORMAT || !isDDragonData(parsed.data)) {
      return null
    }
    return parsed.data
  } catch {
    return null // cache illisible : on repart du réseau
  }
}

function writeCache(storage: KeyValueStorage, data: DDragonData) {
  try {
    storage.setItem(DDRAGON_CACHE_KEY, JSON.stringify({ format: CACHE_FORMAT, data }))
  } catch (error) {
    // Stockage plein ou bloqué : l'app fonctionne quand même, sans cache.
    console.warn('Cache Data Dragon non enregistré.', error)
  }
}

function defaultDeps(): DDragonDeps {
  let storage: KeyValueStorage | null = null
  try {
    storage = globalThis.localStorage ?? null
  } catch {
    storage = null
  }
  return { fetch: globalThis.fetch.bind(globalThis), storage }
}
