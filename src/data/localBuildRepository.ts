import exampleBuildJson from '../../data/builds/example.json'
import { validateBuild } from '../engine/buildSchema'
import { POSITIONS, type Build, type Position } from '../engine/types'
import {
  BuildStorageError,
  BuildValidationError,
  type BuildList,
  type BuildRepository,
  type InvalidBuild,
} from './buildRepository'
import type { KeyValueStorage } from './ddragon'

/** Clé des builds dans le stockage local. */
export const BUILDS_STORAGE_KEY = 'draftdigger:builds'
/** Version du format stocké. À incrémenter avec une migration si le format de `Build` change. */
export const BUILDS_SCHEMA_VERSION = 1

type StoredFile = { schemaVersion: number; builds: unknown[] }

type Options = {
  storage: KeyValueStorage
  /** Builds chargés au tout premier lancement (stockage vide). Par défaut : le build d'exemple. */
  seed?: unknown[]
  now?: () => Date
}

/** Implémentation de `BuildRepository` sur le stockage local du navigateur. */
export function createLocalBuildRepository({
  storage,
  seed = [exampleBuildJson],
  now = () => new Date(),
}: Options): BuildRepository {
  /** Lit le fichier ; au premier lancement, l'initialise avec les builds de départ. */
  function readFile(): StoredFile {
    let raw: string | null
    try {
      raw = storage.getItem(BUILDS_STORAGE_KEY)
    } catch (error) {
      throw new BuildStorageError('Stockage local inaccessible.', { cause: error })
    }
    if (raw === null) {
      const file = { schemaVersion: BUILDS_SCHEMA_VERSION, builds: [...seed] }
      writeFile(file)
      return file
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (
        isRecord(parsed) &&
        parsed.schemaVersion === BUILDS_SCHEMA_VERSION &&
        Array.isArray(parsed.builds)
      ) {
        return { schemaVersion: BUILDS_SCHEMA_VERSION, builds: parsed.builds }
      }
    } catch {
      // illisible : traité ci-dessous
    }
    // Sauvegarde illisible ou d'un format inconnu : on la met de côté avant de repartir de zéro,
    // pour ne jamais perdre de données sans trace.
    backup(raw)
    const file = { schemaVersion: BUILDS_SCHEMA_VERSION, builds: [] }
    writeFile(file)
    return file
  }

  function writeFile(file: StoredFile) {
    try {
      storage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(file))
    } catch (error) {
      throw new BuildStorageError('Impossible d’enregistrer les builds (stockage plein ?).', {
        cause: error,
      })
    }
  }

  function backup(raw: string) {
    try {
      storage.setItem(`${BUILDS_STORAGE_KEY}:sauvegarde-illisible:${now().toISOString()}`, raw)
    } catch {
      // tant pis : rien de plus à faire
    }
  }

  function readAll(): { file: StoredFile; list: BuildList } {
    const file = readFile()
    const builds: Build[] = []
    const invalid: InvalidBuild[] = []
    for (const entry of file.builds) {
      const result = validateBuild(entry)
      if (result.ok) builds.push(result.value)
      else
        invalid.push({ id: field(entry, 'id'), name: field(entry, 'name'), errors: result.errors })
    }
    builds.sort(compareBuilds)
    return { file, list: { builds, invalid } }
  }

  /** Remplace les builds valides en conservant tels quels les builds invalides. */
  function writeBuilds(file: StoredFile, builds: Build[]) {
    const invalidEntries = file.builds.filter((entry) => !validateBuild(entry).ok)
    writeFile({ schemaVersion: BUILDS_SCHEMA_VERSION, builds: [...builds, ...invalidEntries] })
  }

  return {
    async list() {
      return readAll().list
    },

    async listByChampion(championId, position) {
      return readAll().list.builds.filter(
        (b) => b.championId === championId && (position === undefined || b.position === position),
      )
    },

    async get(id) {
      return readAll().list.builds.find((b) => b.id === id) ?? null
    },

    async save(input, options = {}) {
      const { file, list } = readAll()
      const existing = list.builds.find((b) => b.id === input.id)
      const candidate: Build = {
        ...input,
        updatedAt: options.keepUpdatedAt ? input.updatedAt : now().toISOString(),
        order:
          existing &&
          existing.championId === input.championId &&
          existing.position === input.position
            ? input.order
            : nextOrder(list.builds, input.championId, input.position),
      }
      const result = validateBuild(candidate)
      if (!result.ok) throw new BuildValidationError(result.errors)
      const saved = result.value
      const sameGroup = (b: Build) =>
        b.championId === saved.championId && b.position === saved.position
      const builds = (
        existing ? list.builds.map((b) => (b.id === saved.id ? saved : b)) : [...list.builds, saved]
      ).map((b) =>
        // Un seul favori par champion et par poste.
        saved.favorite && b.id !== saved.id && sameGroup(b) && b.favorite
          ? { ...b, favorite: false }
          : b,
      )
      writeBuilds(file, builds)
      return saved
    },

    async delete(id) {
      const { file, list } = readAll()
      writeBuilds(
        file,
        list.builds.filter((b) => b.id !== id),
      )
    },
  }
}

/** Identifiant unique pour un nouveau build. */
export function createBuildId(): string {
  // randomUUID n'existe qu'en HTTPS (ou localhost) : secours pour `npm run dev:phone` en wifi.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

let defaultRepository: BuildRepository | null = null

/** Le dépôt de builds de l'app (stockage local du navigateur). */
export function getBuildRepository(): BuildRepository {
  defaultRepository ??= createLocalBuildRepository({ storage: localStorage })
  return defaultRepository
}

/**
 * Demande au navigateur de ne pas effacer les données de l'app en cas de manque de place.
 * Sans effet si le navigateur ne le permet pas.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

function nextOrder(builds: Build[], championId: string, position: Position): number {
  const orders = builds
    .filter((b) => b.championId === championId && b.position === position)
    .map((b) => b.order)
  return orders.length === 0 ? 0 : Math.max(...orders) + 1
}

function compareBuilds(a: Build, b: Build): number {
  return (
    a.championId.localeCompare(b.championId) ||
    POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) ||
    Number(b.favorite ?? false) - Number(a.favorite ?? false) ||
    a.order - b.order ||
    a.name.localeCompare(b.name, 'fr')
  )
}

function field(entry: unknown, key: string): string | null {
  return isRecord(entry) && typeof entry[key] === 'string' ? entry[key] : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
