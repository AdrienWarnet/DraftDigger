import type { GameCatalog } from '../../data/catalog'
import {
  moveSlot,
  removeAlternative,
  removeFirstItemOption,
  removeSlot,
} from '../../engine/buildEditing'
import { BUILD_EDITOR_LIMITS, PROVISIONAL_ALTERNATIVE } from '../../engine/config'
import type { Build } from '../../engine/types'
import { GameIcon } from '../components/GameIcon'
import type { EditorSheet } from './editorSheet'
import styles from './BuildEditorItems.module.css'

type BuildEditorItemsProps = {
  build: Build
  catalog: GameCatalog
  change: (fn: (b: Build) => Build) => void
  openSheet: (sheet: EditorSheet) => void
}

/** Partie « items » de l'éditeur : options de premier item et ordre d'achat avec alternatives. */
export function BuildEditorItems({ build, catalog, change, openSheet }: BuildEditorItemsProps) {
  const item = (id: string) => {
    const found = catalog.itemsById.get(id)
    return found ? { name: found.name, icon: found.image } : null
  }
  const name = (id: string) => catalog.itemsById.get(id)?.name ?? `Item ${id} (inconnu)`

  return (
    <>
      <section className={styles.section} aria-labelledby="editeur-premier-item">
        <h3 id="editeur-premier-item" className={styles.sectionTitle}>
          Premier item
        </h3>
        <p className={styles.hint}>1 à 3 options : l'app choisira selon la partie.</p>
        <ul className={styles.list}>
          {build.firstItemOptions.map((option, index) => (
            <li key={option.itemId} className={styles.row}>
              <button
                type="button"
                className={styles.item}
                onClick={() => openSheet({ kind: 'firstItem', target: index })}
                aria-label={`${name(option.itemId)}, changer`}
              >
                <GameIcon
                  entry={item(option.itemId)}
                  fallbackId={option.itemId}
                  size={40}
                  label=""
                />
                <span className={styles.itemName}>{name(option.itemId)}</span>
              </button>
              {build.firstItemOptions.length > 1 && (
                <IconButton
                  label={`Retirer ${name(option.itemId)}`}
                  onClick={() => change((b) => removeFirstItemOption(b, index))}
                  icon="remove"
                />
              )}
            </li>
          ))}
        </ul>
        {build.firstItemOptions.length < BUILD_EDITOR_LIMITS.firstItemOptions && (
          <AddButton onClick={() => openSheet({ kind: 'firstItem', target: 'new' })}>
            Ajouter une option
          </AddButton>
        )}
      </section>

      <section className={styles.section} aria-labelledby="editeur-ordre">
        <h3 id="editeur-ordre" className={styles.sectionTitle}>
          Ordre des items
        </h3>
        <p className={styles.hint}>
          Dans l'ordre d'achat. Chaque item peut avoir jusqu'à 3 alternatives selon la partie.
        </p>
        <ol className={styles.list}>
          {build.itemOrder.map((slot, index) => (
            <li key={`${slot.slot}-${slot.default}`} className={styles.slot}>
              <div className={styles.slotHeader}>
                <span className={styles.slotNumber}>Item {slot.slot}</span>
                <span className={styles.slotActions}>
                  <IconButton
                    label={`Acheter ${name(slot.default)} plus tôt`}
                    onClick={() => change((b) => moveSlot(b, index, -1))}
                    icon="up"
                    disabled={index === 0}
                  />
                  <IconButton
                    label={`Acheter ${name(slot.default)} plus tard`}
                    onClick={() => change((b) => moveSlot(b, index, 1))}
                    icon="down"
                    disabled={index === build.itemOrder.length - 1}
                  />
                  {build.itemOrder.length > 1 && (
                    <IconButton
                      label={`Retirer l'item ${slot.slot}`}
                      onClick={() => change((b) => removeSlot(b, index))}
                      icon="remove"
                    />
                  )}
                </span>
              </div>
              <button
                type="button"
                className={styles.item}
                onClick={() => openSheet({ kind: 'slot', target: index })}
                aria-label={`Item ${slot.slot} : ${name(slot.default)}, changer`}
              >
                <GameIcon entry={item(slot.default)} fallbackId={slot.default} size={40} label="" />
                <span className={styles.itemName}>{name(slot.default)}</span>
              </button>
              {slot.alternatives.length > 0 && (
                <ul
                  className={styles.alternatives}
                  aria-label={`Alternatives à ${name(slot.default)}`}
                >
                  {slot.alternatives.map((alt, altIndex) => (
                    <li key={alt.itemId} className={styles.row}>
                      <button
                        type="button"
                        className={styles.alternative}
                        onClick={() =>
                          openSheet({ kind: 'alternative', slot: index, target: altIndex })
                        }
                        aria-label={`Alternative ${name(alt.itemId)}, changer`}
                      >
                        <span className={styles.or}>ou</span>
                        <GameIcon
                          entry={item(alt.itemId)}
                          fallbackId={alt.itemId}
                          size={28}
                          label=""
                        />
                        <span className={styles.altText}>
                          <span className={styles.itemName}>{name(alt.itemId)}</span>
                          <span className={styles.condition}>
                            {alt.explain === PROVISIONAL_ALTERNATIVE.explain
                              ? 'Condition à préciser (en retard pour l’instant)'
                              : alt.explain}
                          </span>
                        </span>
                      </button>
                      <IconButton
                        label={`Retirer l'alternative ${name(alt.itemId)}`}
                        onClick={() => change((b) => removeAlternative(b, index, altIndex))}
                        icon="remove"
                      />
                    </li>
                  ))}
                </ul>
              )}
              {slot.alternatives.length < BUILD_EDITOR_LIMITS.alternativesPerSlot && (
                <AddButton
                  small
                  onClick={() => openSheet({ kind: 'alternative', slot: index, target: 'new' })}
                >
                  Ajouter une alternative
                </AddButton>
              )}
            </li>
          ))}
        </ol>
        {build.itemOrder.length < BUILD_EDITOR_LIMITS.slots && (
          <AddButton onClick={() => openSheet({ kind: 'slot', target: 'new' })}>
            Ajouter un item
          </AddButton>
        )}
      </section>
    </>
  )
}

function AddButton({
  onClick,
  children,
  small = false,
}: {
  onClick: () => void
  children: string
  small?: boolean
}) {
  return (
    <button type="button" className={styles.add} data-small={small || undefined} onClick={onClick}>
      <span aria-hidden="true">+</span> {children}
    </button>
  )
}

const ICON_PATHS = {
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  remove: 'M6 6l12 12M18 6L6 18',
} as const

function IconButton({
  label,
  onClick,
  icon,
  disabled = false,
}: {
  label: string
  onClick: () => void
  icon: keyof typeof ICON_PATHS
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={ICON_PATHS[icon]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
