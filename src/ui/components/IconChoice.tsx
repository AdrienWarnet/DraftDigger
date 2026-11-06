import type { IconEntry } from '../../data/runes'
import { GameIcon } from './GameIcon'
import styles from './IconChoice.module.css'

type IconChoiceProps = {
  options: readonly IconEntry[]
  /** Ids choisis (une ou plusieurs options peuvent l'être). */
  selected: readonly string[]
  onToggle: (id: string) => void
  size: number
  shape?: 'square' | 'round'
  /** Nom du groupe pour les lecteurs d'écran (ex : « Rune clé »). */
  label: string
  /** Affiche le nom de l'option choisie sous la rangée. */
  showSelectedName?: boolean
}

/**
 * Rangée d'icônes à toucher (arbres, runes, fragments, sorts), comme dans le client du jeu :
 * l'option choisie est entourée d'or, les autres s'estompent dès qu'un choix est fait.
 */
export function IconChoice({
  options,
  selected,
  onToggle,
  size,
  shape = 'round',
  label,
  showSelectedName = false,
}: IconChoiceProps) {
  const hasSelection = options.some((o) => selected.includes(o.id))
  const names = options.filter((o) => selected.includes(o.id)).map((o) => o.name)
  return (
    <div className={styles.choice} role="group" aria-label={label}>
      <div className={styles.options} data-has-selection={hasSelection || undefined}>
        {options.map((option, index) => {
          const isSelected = selected.includes(option.id)
          return (
            <button
              key={`${option.id}-${index}`}
              type="button"
              className={styles.option}
              data-shape={shape}
              aria-pressed={isSelected}
              aria-label={option.name}
              title={option.name}
              onClick={() => onToggle(option.id)}
            >
              <GameIcon entry={option} size={size} shape={shape} label="" />
            </button>
          )
        })}
      </div>
      {showSelectedName && (
        <p className={styles.name} aria-hidden="true">
          {names.length > 0 ? names.join(', ') : ' '}
        </p>
      )}
    </div>
  )
}
