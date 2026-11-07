import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { filterItems, ITEM_CATEGORY_FILTERS } from '../../engine/itemFilters'
import { createSearch } from '../../engine/search'
import type { Item } from '../../engine/types'
import styles from './ItemPicker.module.css'

type ItemPickerProps = {
  items: readonly Item[]
  onSelect: (item: Item) => void
  /** Ids à ne pas proposer (ex : items déjà dans le slot). */
  excludedIds?: readonly string[]
  /** Items proposés en premier, tant qu'aucune recherche ni filtre n'est actif (ex : ton build). */
  suggestedIds?: readonly string[]
  suggestedLabel?: string
  autoFocus?: boolean
}

/**
 * Choisir un item : recherche (nom, abréviations, nom anglais), filtres par catégorie.
 * Par défaut seuls les items complets sont listés (items finaux, de départ, bottes).
 */
export function ItemPicker({
  items,
  onSelect,
  excludedIds = [],
  suggestedIds = [],
  suggestedLabel = 'Suggestions',
  autoFocus = true,
}: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [withComponents, setWithComponents] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const statusId = useId()

  const available = useMemo(
    () =>
      filterItems(items, { completedOnly: !withComponents, category }).filter(
        (i) => !excludedIds.includes(i.id),
      ),
    [items, withComponents, category, excludedIds],
  )
  const search = useMemo(() => createSearch(available, (i) => [i.name, ...i.aliases]), [available])
  const results = useMemo(() => search(query), [search, query])
  const first = query.trim() ? results[0] : undefined
  const suggested = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]))
    return suggestedIds.flatMap((id) => byId.get(id) ?? [])
  }, [items, suggestedIds])
  const showSuggested = suggested.length > 0 && !query.trim() && category === null

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
          placeholder="Rechercher un item…"
          aria-label="Rechercher un item"
          aria-describedby={statusId}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
        />
        <div className={styles.filters} role="group" aria-label="Filtrer par catégorie">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            Tous
          </button>
          {ITEM_CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={styles.chip}
              aria-pressed={category === filter.id}
              onClick={() => setCategory(category === filter.id ? null : filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={withComponents}
            onChange={(e) => setWithComponents(e.target.checked)}
          />
          Afficher aussi les composants
        </label>
        <p id={statusId} className={styles.status} aria-live="polite">
          {results.length === 0
            ? 'Aucun item ne correspond.'
            : first
              ? `${results.length} résultat${results.length > 1 ? 's' : ''} : Entrée choisit ${first.name}.`
              : `${results.length} items`}
        </p>
      </div>

      {showSuggested && (
        <section className={styles.section} aria-label={suggestedLabel}>
          <h3 className={styles.sectionTitle}>{suggestedLabel}</h3>
          <ItemGrid items={suggested} first={undefined} onSelect={onSelect} />
        </section>
      )}
      <section className={styles.section} aria-label="Tous les items">
        {showSuggested && <h3 className={styles.sectionTitle}>Tous les items</h3>}
        <ItemGrid items={results} first={first} onSelect={onSelect} />
      </section>
    </div>
  )
}

function ItemGrid({
  items,
  first,
  onSelect,
}: {
  items: readonly Item[]
  first: Item | undefined
  onSelect: (item: Item) => void
}) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={styles.cell}
            data-first={item === first || undefined}
            onClick={() => onSelect(item)}
          >
            <img
              className={styles.icon}
              src={item.image}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
            />
            <span className={styles.name}>{item.name}</span>
            <span className={styles.cost}>{item.cost}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
