import { duplicateBuild } from './buildList'
import { EXPORT_REMINDER_DAYS } from './config'
import { validateBuild } from './buildSchema'
import type { Build } from './types'

/**
 * Format d'échange des builds (export / import en fichier JSON).
 * Versionné comme le stockage, pour pouvoir relire d'anciens fichiers plus tard.
 */
export const BUILD_EXPORT_FORMAT = { app: 'DraftDigger', type: 'builds', schemaVersion: 1 } as const

export type BuildExport = typeof BUILD_EXPORT_FORMAT & { exportedAt: string; builds: Build[] }

export function createBuildExport(builds: readonly Build[], now = new Date()): BuildExport {
  return { ...BUILD_EXPORT_FORMAT, exportedAt: now.toISOString(), builds: [...builds] }
}

/** Nom de fichier : `draftdigger-builds-2026-11-06.json`, ou `draftdigger-duelliste.json` pour un seul build. */
export function exportFileName(builds: readonly Build[], now = new Date()): string {
  const date = now.toISOString().slice(0, 10)
  if (builds.length !== 1) return `draftdigger-builds-${date}.json`
  const slug = builds[0]!.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `draftdigger-${slug || 'build'}.json`
}

export type ImportedBuildError = { index: number; name: string | null; errors: string[] }

export type ParsedImport =
  { ok: true; builds: Build[]; invalid: ImportedBuildError[] } | { ok: false; error: string }

/**
 * Lit un fichier importé. Accepte un export DraftDigger, une liste de builds ou un build seul.
 * Chaque build est validé ; les builds invalides sont listés à part (les autres restent importables).
 */
export function parseBuildImport(text: string): ParsedImport {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un fichier JSON lisible." }
  }
  let entries: unknown[]
  if (Array.isArray(json)) entries = json
  else if (isRecord(json) && Array.isArray(json.builds)) {
    if (
      json.app === BUILD_EXPORT_FORMAT.app &&
      json.schemaVersion !== BUILD_EXPORT_FORMAT.schemaVersion
    ) {
      return {
        ok: false,
        error: `Ce fichier vient d'une version de l'app non prise en charge (format ${String(json.schemaVersion)}).`,
      }
    }
    entries = json.builds
  } else if (isRecord(json) && 'runes' in json) entries = [json]
  else return { ok: false, error: 'Ce fichier ne contient pas de builds DraftDigger.' }

  const builds: Build[] = []
  const invalid: ImportedBuildError[] = []
  entries.forEach((entry, index) => {
    const result = validateBuild(entry)
    if (result.ok) builds.push(result.value)
    else {
      const name = isRecord(entry) && typeof entry.name === 'string' ? entry.name : null
      invalid.push({ index, name, errors: result.errors })
    }
  })
  if (builds.length === 0 && invalid.length === 0) {
    return { ok: false, error: 'Ce fichier ne contient aucun build.' }
  }
  return { ok: true, builds, invalid }
}

/** En cas de build déjà présent (même id) : le remplacer, ou garder les deux. */
export type ConflictChoice = 'replace' | 'keepBoth'

/** Builds importés dont l'id existe déjà dans l'app. */
export function findConflicts(existing: readonly Build[], incoming: readonly Build[]): Build[] {
  const ids = new Set(existing.map((b) => b.id))
  return incoming.filter((b) => ids.has(b.id))
}

/**
 * Builds à enregistrer pour un import.
 * « Garder les deux » : un build en conflit devient une copie (nouvel id, nom numéroté, non favori).
 */
export function prepareImport(
  existing: readonly Build[],
  incoming: readonly Build[],
  choice: ConflictChoice,
  newId: () => string,
): Build[] {
  const existingIds = new Set(existing.map((b) => b.id))
  const names = existing.map((b) => b.name)
  return incoming.map((build) => {
    if (!existingIds.has(build.id) || choice === 'replace') return build
    const copy = duplicateBuild(build, newId(), names)
    names.push(copy.name)
    return copy
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Rappel d'export : des builds ont changé depuis le dernier export, et aucun export n'a été fait
 * depuis `EXPORT_REMINDER_DAYS` jours (ou jamais). `ignoredIds` : builds à ne pas compter
 * (le build d'exemple livré avec l'app).
 */
export function shouldRemindExport(
  builds: readonly Build[],
  lastExportAt: Date | null,
  now: Date,
  ignoredIds: readonly string[] = [],
): boolean {
  const unexported = builds.some(
    (b) =>
      !ignoredIds.includes(b.id) &&
      (!lastExportAt || Date.parse(b.updatedAt) > lastExportAt.getTime()),
  )
  if (!unexported) return false
  if (!lastExportAt) return true
  return now.getTime() - lastExportAt.getTime() >= EXPORT_REMINDER_DAYS * 24 * 60 * 60 * 1000
}
