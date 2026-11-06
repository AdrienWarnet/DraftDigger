import type { Build } from './types'

/**
 * Ce que le patch courant connaît. Le catalogue de l'app (src/data/catalog.ts) a déjà cette forme ;
 * le moteur n'en dépend pas pour rester testable seul.
 */
export type PatchIndex = {
  version: string
  championsById: ReadonlyMap<string, unknown>
  itemsById: ReadonlyMap<string, unknown>
  treesById: ReadonlyMap<string, unknown>
  /** `row` : 0 = rune clé, 1 à 3 = runes mineures. */
  runesById: ReadonlyMap<string, { treeId: string; row: number }>
  summonerSpellsById: ReadonlyMap<string, unknown>
  /** Fragments possibles par ligne (3 lignes). */
  shardRows: readonly { shards: readonly { id: string }[] }[]
}

export type PatchIssueKind = 'champion' | 'item' | 'runeTree' | 'rune' | 'shard' | 'summonerSpell'

export type PatchIssue = {
  /** Champ concerné dans le build, ex : `itemOrder[0].alternatives[0].itemId`. */
  path: string
  kind: PatchIssueKind
  id: string
  /** `unknown` : absent du patch ; `misplaced` : existe mais pas à cet endroit (rune déplacée…). */
  problem: 'unknown' | 'misplaced'
  message: string
}

const KIND_LABELS: Record<PatchIssueKind, string> = {
  champion: 'Champion',
  item: 'Item',
  runeTree: 'Arbre de runes',
  rune: 'Rune',
  shard: 'Fragment',
  summonerSpell: "Sort d'invocateur",
}

/**
 * Liste les ids du build qui n'existent plus dans le patch courant (item supprimé, rune renommée…),
 * ainsi que les runes ou fragments qui ne sont plus à leur place. Liste vide = build utilisable tel quel.
 */
export function validateBuildAgainstData(build: Build, patch: PatchIndex): PatchIssue[] {
  const issues: PatchIssue[] = []
  const unknown = (kind: PatchIssueKind, id: string, path: string) =>
    issues.push({
      path,
      kind,
      id,
      problem: 'unknown',
      message: `${KIND_LABELS[kind]} ${id} introuvable dans le patch ${patch.version}.`,
    })
  const misplaced = (kind: PatchIssueKind, id: string, path: string, detail: string) =>
    issues.push({
      path,
      kind,
      id,
      problem: 'misplaced',
      message: `${KIND_LABELS[kind]} ${nameOf(id, kind === 'shard' ? shardsById : patch.runesById)} : ${detail}.`,
    })
  const shardsById = new Map(patch.shardRows.flatMap((r) => r.shards).map((s) => [s.id, s]))

  if (!patch.championsById.has(build.championId))
    unknown('champion', build.championId, 'championId')

  // Runes : chaque rune doit exister, dans le bon arbre et à la bonne ligne.
  const { runes } = build
  const primaryOk = patch.treesById.has(runes.primaryTree)
  const secondaryOk = patch.treesById.has(runes.secondaryTree)
  if (!primaryOk) unknown('runeTree', runes.primaryTree, 'runes.primaryTree')
  if (!secondaryOk) unknown('runeTree', runes.secondaryTree, 'runes.secondaryTree')

  const checkRune = (id: string, path: string, treeId: string, treeOk: boolean, rows: number[]) => {
    const rune = patch.runesById.get(id)
    if (!rune) return unknown('rune', id, path)
    if (treeOk && rune.treeId !== treeId) {
      return misplaced(
        'rune',
        id,
        path,
        `n'appartient plus à l'arbre ${nameOf(treeId, patch.treesById)}`,
      )
    }
    if (!rows.includes(rune.row)) misplaced('rune', id, path, "n'est plus à cette ligne de l'arbre")
  }
  checkRune(runes.keystone, 'runes.keystone', runes.primaryTree, primaryOk, [0])
  runes.primarySlots.forEach((id, i) =>
    checkRune(id, `runes.primarySlots[${i}]`, runes.primaryTree, primaryOk, [i + 1]),
  )
  runes.secondarySlots.forEach((id, i) =>
    checkRune(id, `runes.secondarySlots[${i}]`, runes.secondaryTree, secondaryOk, [1, 2, 3]),
  )
  const [first, second] = runes.secondarySlots.map((id) => patch.runesById.get(id)?.row)
  if (first !== undefined && first === second) {
    misplaced(
      'rune',
      runes.secondarySlots[1]!,
      'runes.secondarySlots[1]',
      "est sur la même ligne que l'autre rune secondaire",
    )
  }

  runes.shards.forEach((id, i) => {
    const row = patch.shardRows[i]
    if (!row) return
    const knownAnywhere = patch.shardRows.some((r) => r.shards.some((s) => s.id === id))
    if (!knownAnywhere) unknown('shard', id, `runes.shards[${i}]`)
    else if (!row.shards.some((s) => s.id === id)) {
      misplaced('shard', id, `runes.shards[${i}]`, `n'est pas disponible sur la ligne ${i + 1}`)
    }
  })

  build.summonerSpells.forEach((id, i) => {
    if (!patch.summonerSpellsById.has(id)) unknown('summonerSpell', id, `summonerSpells[${i}]`)
  })

  const checkItem = (id: string, path: string) => {
    if (!patch.itemsById.has(id)) unknown('item', id, path)
  }
  build.firstItemOptions.forEach((o, i) => checkItem(o.itemId, `firstItemOptions[${i}].itemId`))
  build.itemOrder.forEach((slot, i) => {
    checkItem(slot.default, `itemOrder[${i}].default`)
    slot.alternatives.forEach((alt, j) =>
      checkItem(alt.itemId, `itemOrder[${i}].alternatives[${j}].itemId`),
    )
  })

  return issues
}

/** Nom affichable d'un élément connu (s'il en a un), sinon son id. */
function nameOf(id: string, map: ReadonlyMap<string, unknown>): string {
  const entry = map.get(id)
  return typeof entry === 'object' &&
    entry !== null &&
    'name' in entry &&
    typeof entry.name === 'string'
    ? entry.name
    : id
}

export type BuildAlert = { build: Build; issues: PatchIssue[] }

/** Builds qui ont au moins un élément introuvable ou déplacé dans le patch courant. */
export function buildAlerts(builds: readonly Build[], patch: PatchIndex): BuildAlert[] {
  return builds
    .map((build) => ({ build, issues: validateBuildAgainstData(build, patch) }))
    .filter((alert) => alert.issues.length > 0)
}
