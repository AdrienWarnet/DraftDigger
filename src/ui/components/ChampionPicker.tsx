import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createSearch } from '../../engine/search'
import type { Champion } from '../../engine/types'
import styles from './ChampionPicker.module.css'

type ChampionPickerProps = {
  champions: readonly Champion[]
  onSelect: (champion: Champion) => void
  /** Libellé du champ de recherche (lu par les lecteurs d'écran). */
  label?: string
  /** Place le curseur dans la recherche à l'ouverture (ouvre le clavier sur mobile). */
  autoFocus?: boolean
  /** Champions choisis récemment (T7.3), affichés en tête tant qu'aucune recherche n'est tapée. */
  recentIds?: readonly string[]
}

/**
 * Choisir un champion en 2 ou 3 touches : on tape le début du nom, puis on touche
 * l'icône (ou « Entrée » pour le premier résultat, mis en évidence).
 */
export function ChampionPicker({
  champions,
  onSelect,
  label = 'Rechercher un champion',
  autoFocus = true,
  recentIds = [],
}: ChampionPickerProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const statusId = useId()
  const search = useMemo(() => createSearch(champions, (c) => [c.name, c.id]), [champions])
  const results = useMemo(() => search(query), [search, query])
  const first = query.trim() ? results[0] : undefined
  const recent = useMemo(() => {
    const byId = new Map(champions.map((c) => [c.id, c]))
    return recentIds.flatMap((id) => byId.get(id) ?? [])
  }, [champions, recentIds])
  const showRecent = recent.length > 0 && !query.trim()

  // Le sélecteur s'ouvre à la demande du joueur : on place directement le curseur dans la recherche.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && results[0]) {
      event.preventDefault()
      onSelect(results[0])
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.searchBar}>
        <input
          ref={inputRef}
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un champion…"
          aria-label={label}
          aria-describedby={statusId}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
        />
        <p id={statusId} className={styles.status} aria-live="polite">
          {results.length === 0
            ? `Aucun champion ne correspond à « ${query.trim()} ».`
            : first
              ? `${results.length} résultat${results.length > 1 ? 's' : ''} : Entrée choisit ${first.name}.`
              : `${results.length} champions`}
        </p>
      </div>

      {showRecent && (
        <section className={styles.section} aria-label="Récents">
          <h3 className={styles.sectionTitle}>Récents</h3>
          <ChampionGrid champions={recent} first={undefined} onSelect={onSelect} />
        </section>
      )}
      <section className={styles.section} aria-label="Tous les champions">
        {showRecent && <h3 className={styles.sectionTitle}>Tous les champions</h3>}
        <ChampionGrid champions={results} first={first} onSelect={onSelect} />
      </section>
    </div>
  )
}

function ChampionGrid({
  champions,
  first,
  onSelect,
}: {
  champions: readonly Champion[]
  first: Champion | undefined
  onSelect: (champion: Champion) => void
}) {
  return (
    <ul className={styles.grid}>
      {champions.map((champion) => (
        <li key={champion.id}>
          <button
            type="button"
            className={styles.cell}
            data-first={champion === first || undefined}
            onClick={() => onSelect(champion)}
          >
            <img
              className={styles.icon}
              src={champion.image}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
            />
            <span className={styles.name} translate="no">
              {champion.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
