import type { Champion } from '../../engine/types'
import styles from './DraftCell.module.css'

type DraftCellProps = {
  champion: Champion | null
  /** Côté de la draft : l'icône est à l'extérieur, le nom vers le centre. */
  side: 'ally' | 'enemy'
  /** Texte de la case vide. */
  emptyLabel: string
  /** Description complète pour les lecteurs d'écran (ex : « Allié Top : Yorick, changer »). */
  ariaLabel: string
  /** Case du joueur : bordure dorée. */
  highlighted?: boolean
  onPick: () => void
}

/** Une case de la draft face à face. Tap : choisir, changer ou retirer le champion. */
export function DraftCell({
  champion,
  side,
  emptyLabel,
  ariaLabel,
  highlighted = false,
  onPick,
}: DraftCellProps) {
  return (
    <button
      type="button"
      className={styles.cell}
      data-side={side}
      data-highlighted={highlighted || undefined}
      onClick={onPick}
      aria-label={ariaLabel}
    >
      {champion ? (
        <img
          className={styles.icon}
          src={champion.image}
          alt=""
          width={40}
          height={40}
          decoding="async"
        />
      ) : (
        <span className={styles.placeholder} aria-hidden="true">
          +
        </span>
      )}
      <span className={champion ? styles.name : styles.empty} translate="no">
        {champion ? champion.name : emptyLabel}
      </span>
    </button>
  )
}
