/**
 * Notes de test (T7.1) : le joueur note ce qui cloche pendant et après la partie. Une ligne
 * « partie en cours » peut être insérée pour donner le contexte (champion, ennemis, items, reco).
 */

export type GameSnapshot = {
  now: Date
  /** Ex : « Yorick (Top) ». */
  player: string
  /** Ex : « Égalité ». */
  situation: string
  /** Ex : « Top Mordekaiser ». */
  enemies: readonly string[]
  items: readonly string[]
  /** Prochain item recommandé (et son alternative), ou `null`. */
  nextItem: string | null
  alternative: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Bloc de contexte inséré dans les notes, ex : « [07/11 16:20] Yorick (Top), Égalité … ». */
export function gameSnapshotText(s: GameSnapshot): string {
  const when = `${pad(s.now.getDate())}/${pad(s.now.getMonth() + 1)} ${pad(s.now.getHours())}:${pad(s.now.getMinutes())}`
  const reco = s.nextItem
    ? `${s.nextItem}${s.alternative ? ` (ou ${s.alternative})` : ''}`
    : 'aucune'
  return [
    `[${when}] ${s.player}, ${s.situation}`,
    `Ennemis : ${s.enemies.length > 0 ? s.enemies.join(', ') : 'aucun'}`,
    `Items : ${s.items.length > 0 ? s.items.join(', ') : 'aucun'}`,
    `Reco : ${reco}`,
    'Note : ',
  ].join('\n')
}

/** Ajoute un bloc en fin de notes, séparé du texte précédent par une ligne vide. */
export function appendBlock(notes: string, block: string): string {
  const trimmed = notes.replace(/\s+$/, '')
  return trimmed ? `${trimmed}\n\n${block}` : block
}

/** Nom du fichier exporté, ex : `draftdigger-notes-2026-11-07.txt`. */
export function notesFileName(now: Date): string {
  return `draftdigger-notes-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
