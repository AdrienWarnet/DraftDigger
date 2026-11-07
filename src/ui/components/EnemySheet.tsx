import { enemyLayout, pickedChampionIds } from '../../engine/draft'
import { POSITIONS, type Champion, type Position } from '../../engine/types'
import { useDraftStore } from '../../store/draftStore'
import { useCatalog } from '../data/gameDataContext'
import { POSITION_LABELS } from '../labels'
import { Button } from './Button'
import { ChampionPicker } from './ChampionPicker'
import styles from './EnemySheet.module.css'
import { Sheet } from './Sheet'
import { Tabs } from './Tabs'

type EnemySheetProps = {
  /** Ennemi à un poste, ou `'new'` pour en ajouter un sans poste (deviné). */
  target: Position | 'new'
  onClose: () => void
}

/**
 * Choisir, changer, retirer un ennemi ou corriger son poste. Utilisé dans la draft et pendant
 * la partie (T6.4) : la recommandation se recalcule dès que la draft change.
 */
export function EnemySheet({ target, onClose }: EnemySheetProps) {
  const { champions, championsById, positionRates } = useCatalog()
  const draft = useDraftStore((s) => s.draft)
  const addEnemy = useDraftStore((s) => s.addEnemy)
  const replaceEnemy = useDraftStore((s) => s.replaceEnemy)
  const removeEnemy = useDraftStore((s) => s.removeEnemy)
  const moveEnemy = useDraftStore((s) => s.moveEnemy)
  const unlockEnemy = useDraftStore((s) => s.unlockEnemy)

  const layout = enemyLayout(draft, positionRates)
  const index = target === 'new' ? null : layout[target]
  const pick = index === null ? null : (draft.enemies[index] ?? null)
  const current = pick ? (championsById.get(pick.championId) ?? null) : null
  const currentName = current?.name ?? pick?.championId

  // Un champion déjà pris ailleurs n'est pas proposé (sauf celui de la case modifiée).
  const picked = pickedChampionIds(draft)
  const available = champions.filter((c) => !picked.has(c.id) || c.id === pick?.championId)

  function handleSelect(selected: Champion) {
    if (target === 'new') addEnemy(selected.id)
    else if (index === null) addEnemy(selected.id, target)
    else replaceEnemy(index, selected.id)
    onClose()
  }

  function handleRemove() {
    if (index !== null) removeEnemy(index)
    onClose()
  }

  return (
    <Sheet
      title={target === 'new' ? 'Ajouter un ennemi' : `Ennemi ${POSITION_LABELS[target]}`}
      onClose={onClose}
      action={
        currentName && (
          <Button variant="ghost" onClick={handleRemove} aria-label={`Retirer ${currentName}`}>
            Retirer
          </Button>
        )
      }
    >
      {target !== 'new' && index !== null && pick && (
        <section className={styles.position} aria-labelledby="poste-ennemi">
          <h3 id="poste-ennemi" className={styles.title}>
            Poste de {currentName}
          </h3>
          <Tabs<Position>
            label={`Poste de ${currentName}`}
            value={target}
            onChange={(to) => {
              moveEnemy(target, to, positionRates)
              onClose()
            }}
            options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))}
          />
          <div className={styles.status}>
            <p className="muted">
              {pick.lockedPosition === null
                ? "Poste deviné par l'app. Choisis le bon poste si besoin."
                : 'Poste fixé par toi.'}
            </p>
            {pick.lockedPosition !== null && (
              <Button
                variant="ghost"
                onClick={() => {
                  unlockEnemy(index)
                  onClose()
                }}
              >
                Laisser deviner
              </Button>
            )}
          </div>
        </section>
      )}
      <ChampionPicker champions={available} onSelect={handleSelect} autoFocus={!pick} />
    </Sheet>
  )
}
