import {
  BUILD_EDITOR_LIMITS,
  DEFAULT_CONDITION_WEIGHT,
  NEW_BUILD_DEFAULTS,
  PROVISIONAL_ALTERNATIVE,
} from './config'
import type {
  Build,
  BuildRunes,
  Condition,
  ConditionPreset,
  ItemAlternative,
  ItemSlot,
  Position,
  WeightedCondition,
} from './types'

/**
 * Règles de saisie de l'éditeur de builds : chaque fonction renvoie un état toujours cohérent
 * avec la structure du jeu (une combinaison de runes invalide est impossible à saisir).
 * Une valeur vide (`''`) signifie « pas encore choisi ».
 */

/** Ligne d'une rune dans son arbre : 0 = rune clé, 1 à 3 = runes mineures. */
export type RuneLocator = (runeId: string) => { treeId: string; row: number } | undefined

export const EMPTY_RUNES: BuildRunes = {
  primaryTree: '',
  keystone: '',
  primarySlots: ['', '', ''],
  secondaryTree: '',
  secondarySlots: ['', ''],
  shards: ['', '', ''],
}

/** Nouveau build : identité donnée, runes et sorts à choisir, items par défaut. */
export function newBuild(
  id: string,
  championId: string,
  position: Position,
  now = new Date(),
): Build {
  return {
    id,
    name: '',
    championId,
    position,
    order: 0,
    updatedAt: now.toISOString(),
    runes: structuredClone(EMPTY_RUNES),
    summonerSpells: ['', ''],
    useWhen: [],
    firstItemOptions: [{ itemId: NEW_BUILD_DEFAULTS.firstItemId, useWhen: [] }],
    itemOrder: [{ slot: 1, default: NEW_BUILD_DEFAULTS.firstSlotItemId, alternatives: [] }],
  }
}

/** Changer d'arbre principal efface ses runes ; si c'était l'arbre secondaire, celui-ci est vidé. */
export function choosePrimaryTree(runes: BuildRunes, treeId: string): BuildRunes {
  if (runes.primaryTree === treeId) return runes
  const clashes = runes.secondaryTree === treeId
  return {
    ...runes,
    primaryTree: treeId,
    keystone: '',
    primarySlots: ['', '', ''],
    secondaryTree: clashes ? '' : runes.secondaryTree,
    secondarySlots: clashes ? ['', ''] : runes.secondarySlots,
  }
}

/** Rune clé : doit être une rune de la ligne 0 de l'arbre principal. */
export function chooseKeystone(runes: BuildRunes, runeId: string, locate: RuneLocator): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.primaryTree || rune.row !== 0) return runes
  return { ...runes, keystone: runeId }
}

/** Rune mineure principale : une par ligne (1 à 3) de l'arbre principal. */
export function choosePrimaryRune(
  runes: BuildRunes,
  runeId: string,
  locate: RuneLocator,
): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.primaryTree || rune.row < 1 || rune.row > 3) return runes
  const primarySlots = [...runes.primarySlots]
  primarySlots[rune.row - 1] = runeId
  return { ...runes, primarySlots }
}

/** Arbre secondaire : différent du principal ; en changer efface ses 2 runes. */
export function chooseSecondaryTree(runes: BuildRunes, treeId: string): BuildRunes {
  if (treeId === runes.primaryTree || treeId === runes.secondaryTree) return runes
  return { ...runes, secondaryTree: treeId, secondarySlots: ['', ''] }
}

/**
 * Runes secondaires : 2 runes de lignes différentes (1 à 3) de l'arbre secondaire, comme en jeu.
 * - Toucher une rune choisie la retire.
 * - Une rune de la même ligne qu'une rune choisie la remplace.
 * - Avec déjà 2 runes, la plus ancienne est remplacée.
 */
export function toggleSecondaryRune(
  runes: BuildRunes,
  runeId: string,
  locate: RuneLocator,
): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.secondaryTree || rune.row < 1 || rune.row > 3) return runes
  let chosen = runes.secondarySlots.filter(Boolean)
  if (chosen.includes(runeId)) {
    chosen = chosen.filter((id) => id !== runeId)
  } else {
    const sameRow = chosen.find((id) => locate(id)?.row === rune.row)
    if (sameRow) chosen = chosen.map((id) => (id === sameRow ? runeId : id))
    else chosen = [...chosen, runeId].slice(-2)
  }
  return { ...runes, secondarySlots: [chosen[0] ?? '', chosen[1] ?? ''] }
}

/** Fragment de la ligne `row` (0 à 2), parmi les fragments de cette ligne. */
export function chooseShard(
  runes: BuildRunes,
  row: number,
  shardId: string,
  shardRows: readonly (readonly string[])[],
): BuildRunes {
  if (!shardRows[row]?.includes(shardId)) return runes
  const shards = [...runes.shards]
  shards[row] = shardId
  return { ...runes, shards }
}

/**
 * Sorts d'invocateur : 2 sorts différents, choisis en touchant une grille.
 * Toucher un sort choisi le retire ; avec déjà 2 sorts, le plus ancien est remplacé.
 */
export function toggleSpell(spells: [string, string], spellId: string): [string, string] {
  let chosen = spells.filter(Boolean)
  chosen = chosen.includes(spellId)
    ? chosen.filter((id) => id !== spellId)
    : [...chosen, spellId].slice(-2)
  return [chosen[0] ?? '', chosen[1] ?? '']
}

/** Ce qui manque encore pour une page de runes et des sorts complets (vide = complet). */
export function missingChoices(build: Pick<Build, 'runes' | 'summonerSpells' | 'name'>): string[] {
  const { runes } = build
  const missing: string[] = []
  if (!build.name.trim()) missing.push('le nom')
  if (!runes.primaryTree) missing.push("l'arbre principal")
  else if (!runes.keystone) missing.push('la rune clé')
  if (runes.primaryTree && runes.primarySlots.some((id) => !id)) missing.push('3 runes principales')
  if (!runes.secondaryTree) missing.push("l'arbre secondaire")
  else if (runes.secondarySlots.some((id) => !id)) missing.push('2 runes secondaires')
  if (runes.shards.some((id) => !id)) missing.push('3 fragments')
  if (build.summonerSpells.some((id) => !id)) missing.push("2 sorts d'invocateur")
  return missing
}

// --- Items -------------------------------------------------------------------------

/** Emplacement visé dans une liste : un index existant ou `'new'` pour ajouter. */
export type ListTarget = number | 'new'

/** Option de premier item : ajout (3 max) ou remplacement ; un item déjà proposé est refusé. */
export function setFirstItemOption(build: Build, target: ListTarget, itemId: string): Build {
  const options = build.firstItemOptions
  if (options.some((o, i) => o.itemId === itemId && i !== target)) return build
  if (target === 'new') {
    if (options.length >= BUILD_EDITOR_LIMITS.firstItemOptions) return build
    return { ...build, firstItemOptions: [...options, { itemId, useWhen: [] }] }
  }
  if (!options[target]) return build
  return {
    ...build,
    firstItemOptions: options.map((o, i) => (i === target ? { ...o, itemId } : o)),
  }
}

/** Retire une option de premier item (il en reste toujours au moins une). */
export function removeFirstItemOption(build: Build, index: number): Build {
  if (build.firstItemOptions.length <= 1 || !build.firstItemOptions[index]) return build
  return { ...build, firstItemOptions: build.firstItemOptions.filter((_, i) => i !== index) }
}

/** Numérote les slots 1, 2, 3… dans leur ordre. */
function renumber(slots: ItemSlot[]): ItemSlot[] {
  return slots.map((slot, i) => ({ ...slot, slot: i + 1 }))
}

/** Item par défaut d'un slot : ajout d'un slot (6 max) ou remplacement. */
export function setSlotItem(build: Build, target: ListTarget, itemId: string): Build {
  const slots = build.itemOrder
  if (target === 'new') {
    if (slots.length >= BUILD_EDITOR_LIMITS.slots) return build
    return {
      ...build,
      itemOrder: renumber([...slots, { slot: 0, default: itemId, alternatives: [] }]),
    }
  }
  const slot = slots[target]
  if (!slot) return build
  // Un item devenu l'item par défaut n'est plus une alternative de ce slot.
  const alternatives = slot.alternatives.filter((a) => a.itemId !== itemId)
  return {
    ...build,
    itemOrder: slots.map((s, i) => (i === target ? { ...s, default: itemId, alternatives } : s)),
  }
}

/** Retire un slot (il en reste toujours au moins un) et renumérote les autres. */
export function removeSlot(build: Build, index: number): Build {
  if (build.itemOrder.length <= 1 || !build.itemOrder[index]) return build
  return { ...build, itemOrder: renumber(build.itemOrder.filter((_, i) => i !== index)) }
}

/** Décale un slot d'un cran dans l'ordre d'achat (`-1` = plus tôt). */
export function moveSlot(build: Build, index: number, direction: -1 | 1): Build {
  const target = index + direction
  const slots = [...build.itemOrder]
  if (!slots[index] || !slots[target]) return build
  ;[slots[index], slots[target]] = [slots[target]!, slots[index]!]
  return { ...build, itemOrder: renumber(slots) }
}

/**
 * Alternative d'un slot : ajout (3 max, avec une condition provisoire à préciser) ou remplacement
 * de l'item. Refusée si c'est l'item par défaut ou une autre alternative du slot.
 */
export function setAlternative(
  build: Build,
  slotIndex: number,
  target: ListTarget,
  itemId: string,
): Build {
  const slot = build.itemOrder[slotIndex]
  if (!slot || slot.default === itemId) return build
  if (slot.alternatives.some((a, i) => a.itemId === itemId && i !== target)) return build
  let alternatives = slot.alternatives
  if (target === 'new') {
    if (alternatives.length >= BUILD_EDITOR_LIMITS.alternativesPerSlot) return build
    alternatives = [
      ...alternatives,
      {
        itemId,
        when: PROVISIONAL_ALTERNATIVE.when.map((c) => ({ ...c }) as Condition),
        explain: PROVISIONAL_ALTERNATIVE.explain,
      },
    ]
  } else {
    if (!alternatives[target]) return build
    alternatives = alternatives.map((a, i) => (i === target ? { ...a, itemId } : a))
  }
  return {
    ...build,
    itemOrder: build.itemOrder.map((s, i) => (i === slotIndex ? { ...s, alternatives } : s)),
  }
}

export function removeAlternative(build: Build, slotIndex: number, altIndex: number): Build {
  const slot = build.itemOrder[slotIndex]
  if (!slot?.alternatives[altIndex]) return build
  const alternatives = slot.alternatives.filter((_, i) => i !== altIndex)
  return {
    ...build,
    itemOrder: build.itemOrder.map((s, i) => (i === slotIndex ? { ...s, alternatives } : s)),
  }
}

// --- Conditions (presets) -----------------------------------------------------------

export function sameCondition(a: Condition, b: Condition): boolean {
  return a.metric === b.metric && a.op === b.op && a.value === b.value
}

/** Preset correspondant exactement à une condition, ou `undefined` (« condition personnalisée »). */
export function findPreset(
  presets: readonly ConditionPreset[],
  condition: Condition,
): ConditionPreset | undefined {
  return presets.find((p) => sameCondition(p.condition, condition))
}

/**
 * Coche ou décoche un preset dans une liste pondérée (`useWhen` d'un build ou d'un premier item).
 * Coché : ajouté avec le poids par défaut et l'explication du preset (modifiables ensuite).
 */
export function toggleWeightedPreset(
  list: readonly WeightedCondition[],
  preset: ConditionPreset,
): WeightedCondition[] {
  if (list.some((w) => sameCondition(w.condition, preset.condition))) {
    return list.filter((w) => !sameCondition(w.condition, preset.condition))
  }
  return [
    ...list,
    {
      condition: { ...preset.condition },
      weight: DEFAULT_CONDITION_WEIGHT,
      explain: preset.explain,
    },
  ]
}

export function updateWeighted(
  list: readonly WeightedCondition[],
  index: number,
  change: Partial<Pick<WeightedCondition, 'weight' | 'explain'>>,
): WeightedCondition[] {
  return list.map((w, i) => (i === index ? { ...w, ...change } : w))
}

/** `true` si l'alternative a encore la condition provisoire posée à sa création. */
export function isProvisionalAlternative(alt: ItemAlternative): boolean {
  return alt.explain === PROVISIONAL_ALTERNATIVE.explain
}

/**
 * Coche ou décoche un preset dans les conditions d'une alternative (toutes doivent être vraies).
 * - La condition provisoire disparaît dès le premier vrai choix, avec son texte.
 * - La dernière condition ne peut pas être retirée (une alternative en a toujours au moins une).
 * - Sans texte personnel, l'explication suit le premier preset coché.
 */
export function toggleAlternativePreset(
  alt: ItemAlternative,
  preset: ConditionPreset,
  presets: readonly ConditionPreset[],
): ItemAlternative {
  const provisional = isProvisionalAlternative(alt)
  const current = provisional ? [] : alt.when
  const checked = current.some((c) => sameCondition(c, preset.condition))
  const when = checked
    ? current.filter((c) => !sameCondition(c, preset.condition))
    : [...current, { ...preset.condition }]
  if (when.length === 0) return alt
  const automatic =
    provisional || presets.some((p) => p.explain === alt.explain) || !alt.explain.trim()
  const firstPreset = findPreset(presets, when[0]!)
  return {
    ...alt,
    when,
    explain: automatic && firstPreset ? firstPreset.explain : alt.explain,
  }
}

/** Remplace l'alternative `altIndex` du slot `slotIndex`. */
export function updateAlternative(
  build: Build,
  slotIndex: number,
  altIndex: number,
  change: (alt: ItemAlternative) => ItemAlternative,
): Build {
  const slot = build.itemOrder[slotIndex]
  const alt = slot?.alternatives[altIndex]
  if (!slot || !alt) return build
  const alternatives = slot.alternatives.map((a, i) => (i === altIndex ? change(a) : a))
  return {
    ...build,
    itemOrder: build.itemOrder.map((s, i) => (i === slotIndex ? { ...s, alternatives } : s)),
  }
}

/** Libellé court d'une condition : celui du preset, sinon la condition brute. */
export function conditionLabel(presets: readonly ConditionPreset[], condition: Condition): string {
  return (
    findPreset(presets, condition)?.label ??
    `${condition.metric} ${condition.op} ${String(condition.value)}`
  )
}
