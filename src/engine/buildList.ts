import { MAX_BUILD_NAME_LENGTH, POSITIONS, type Build, type Position } from './types'

/** Builds d'un champion, regroupés par poste (postes dans l'ordre Top → Support). */
export type ChampionBuildGroup = {
  championId: string
  positions: { position: Position; builds: Build[] }[]
}

export type BuildFilter = { championId?: string | null; position?: Position | null }

export function filterBuilds(builds: readonly Build[], filter: BuildFilter): Build[] {
  return builds.filter(
    (b) =>
      (!filter.championId || b.championId === filter.championId) &&
      (!filter.position || b.position === filter.position),
  )
}

/**
 * Regroupe par champion puis par poste ; dans chaque groupe, le favori d'abord puis l'ordre de création.
 * `championName` sert au tri alphabétique des champions (nom affiché, pas l'id).
 */
export function groupBuilds(
  builds: readonly Build[],
  championName: (championId: string) => string = (id) => id,
): ChampionBuildGroup[] {
  const byChampion = new Map<string, Build[]>()
  for (const build of builds) {
    const list = byChampion.get(build.championId) ?? []
    list.push(build)
    byChampion.set(build.championId, list)
  }
  return [...byChampion.entries()]
    .sort(([a], [b]) => championName(a).localeCompare(championName(b), 'fr'))
    .map(([championId, list]) => ({
      championId,
      positions: POSITIONS.map((position) => ({
        position,
        builds: list.filter((b) => b.position === position).sort(compareInGroup),
      })).filter((group) => group.builds.length > 0),
    }))
}

/**
 * Copie d'un build : nouvel id, nom numéroté (« Duelliste » → « Duelliste 2 », puis « Duelliste 3 »…)
 * sans reprendre un nom existant, en restant sous la longueur maximale. Placée à la fin à
 * l'enregistrement, jamais favorite (le favori reste l'original).
 */
export function duplicateBuild(
  build: Build,
  newId: string,
  existingNames: readonly string[] = [],
): Build {
  const taken = new Set(existingNames)
  const base = build.name.replace(/ \d+$/, '')
  let name = ''
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`
    name = `${base.slice(0, MAX_BUILD_NAME_LENGTH - suffix.length).trimEnd()}${suffix}`
    if (!taken.has(name)) break
  }
  return { ...structuredClone(build), id: newId, name, favorite: false }
}

/** Dans un groupe (champion + poste) : le favori d'abord, puis l'ordre de création. */
export function compareInGroup(a: Build, b: Build): number {
  return Number(b.favorite ?? false) - Number(a.favorite ?? false) || a.order - b.order
}
