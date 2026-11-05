import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createSearch } from '../../engine/search'
import type { Champion } from '../../engine/types'
import styles from './ChampionPicker.module.css'

type ChampionPickerProps = {
  champions: readonly Champion[]
  onSelect: (champion: Champion) => void
  /** Libellé du champ de recherche (lu par les lecteurs d'écran). */
  label?: string
}

/**
 * Choisir un champion en 2 ou 3 touches : on tape le début du nom, puis on touche
 * l'icône (ou « Entrée » pour le premier résultat, mis en évidence).
 */
export function ChampionPicker({
  champions,
  onSelect,
  label = 'Rechercher un champion',
}: ChampionPickerProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const statusId = useId()
  const search = useMemo(() => createSearch(champions, (c) => [c.name, c.id]), [champions])
  const results = useMemo(() => search(query), [search, query])
  const first = query.trim() ? results[0] : undefined

  // Le sélecteur s'ouvre à la demande du joueur : on place directement le curseur dans la recherche.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

      <ul className={styles.grid}>
        {results.map((champion) => (
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
    </div>
  )
}
