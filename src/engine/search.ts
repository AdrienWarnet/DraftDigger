/**
 * Recherche tolérante pour les sélecteurs (champions, items) :
 * ignore la casse, les accents, les apostrophes et la ponctuation.
 * « mord » → Mordekaiser, « seraph » → Séraphine, « kais » → Kai'Sa, « mundo » → Dr. Mundo.
 */

/** "Kai'Sa" → "kai sa", "Maître Yi" → "maitre yi". */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

type IndexedEntry<T> = { item: T; label: string; compacts: string[]; words: string[] }

export type Search<T> = (query: string) => T[]

/**
 * Prépare la recherche une seule fois pour une liste.
 * `terms` donne les textes recherchables d'un élément (ex : nom affiché et id Data Dragon) ;
 * le premier sert aussi au tri alphabétique.
 *
 * Classement : 1) un terme commence par la saisie, 2) un mot d'un terme commence par la saisie,
 * 3) un terme contient la saisie. À rang égal, ordre alphabétique.
 */
export function createSearch<T>(items: readonly T[], terms: (item: T) => string[]): Search<T> {
  const entries: IndexedEntry<T>[] = items.map((item) => {
    const normalized = terms(item).map(normalizeSearchText)
    return {
      item,
      label: normalized[0] ?? '',
      compacts: normalized.map((t) => t.replace(/ /g, '')),
      words: normalized.flatMap((t) => t.split(' ')),
    }
  })
  const alphabetical = [...entries].sort((a, b) => a.label.localeCompare(b.label, 'fr'))

  return (query) => {
    const q = normalizeSearchText(query).replace(/ /g, '')
    if (!q) return alphabetical.map((e) => e.item)

    const ranked: { entry: IndexedEntry<T>; rank: number }[] = []
    for (const entry of alphabetical) {
      const rank = rankEntry(entry, q)
      if (rank !== null) ranked.push({ entry, rank })
    }
    // Tri stable : l'ordre alphabétique est conservé à rang égal.
    return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.entry.item)
  }
}

function rankEntry(entry: IndexedEntry<unknown>, q: string): number | null {
  if (entry.compacts.some((c) => c.startsWith(q))) return 0
  if (entry.words.some((w) => w.startsWith(q))) return 1
  if (entry.compacts.some((c) => c.includes(q))) return 2
  return null
}
