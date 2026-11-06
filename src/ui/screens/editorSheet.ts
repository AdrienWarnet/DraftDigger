import type { ListTarget } from '../../engine/buildEditing'

/**
 * Panneau ouvert dans l'éditeur, encodé dans l'URL après le build
 * (`#/builds/nouveau/item/slot-2`) : le bouton retour d'Android le ferme.
 */
export type EditorSheet =
  | { kind: 'champion' }
  | { kind: 'firstItem'; target: ListTarget }
  | { kind: 'slot'; target: ListTarget }
  | { kind: 'alternative'; slot: number; target: ListTarget }

export function encodeEditorSheet(sheet: EditorSheet): string[] {
  const t = (target: ListTarget) => (target === 'new' ? 'nouveau' : String(target))
  switch (sheet.kind) {
    case 'champion':
      return ['champion']
    case 'firstItem':
      return ['item', `premier-${t(sheet.target)}`]
    case 'slot':
      return ['item', `slot-${t(sheet.target)}`]
    case 'alternative':
      return ['item', `alt-${sheet.slot}-${t(sheet.target)}`]
  }
}

/** Panneau lu dans l'URL, ou `null` s'il est absent ou invalide. */
export function parseEditorSheet(params: readonly string[]): EditorSheet | null {
  if (params[0] === 'champion') return { kind: 'champion' }
  if (params[0] !== 'item' || !params[1]) return null
  const target = (value: string | undefined): ListTarget | null =>
    value === 'nouveau' ? 'new' : value && /^\d$/.test(value) ? Number(value) : null
  const [kind, a, b] = params[1].split('-')
  if (kind === 'premier') {
    const t = target(a)
    return t === null ? null : { kind: 'firstItem', target: t }
  }
  if (kind === 'slot') {
    const t = target(a)
    return t === null ? null : { kind: 'slot', target: t }
  }
  if (kind === 'alt' && a && /^\d$/.test(a)) {
    const t = target(b)
    return t === null ? null : { kind: 'alternative', slot: Number(a), target: t }
  }
  return null
}
