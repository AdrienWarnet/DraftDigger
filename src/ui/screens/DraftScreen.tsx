import { useState } from 'react'
import {
  enemyLayout,
  hasDraftContent,
  MAX_ENEMIES,
  pickedChampionIds,
  type Draft,
} from '../../engine/draft'
import { POSITIONS, type Champion, type Position } from '../../engine/types'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { ChampionPicker } from '../components/ChampionPicker'
import { ConfirmPanel } from '../components/ConfirmPanel'
import { DraftCell } from '../components/DraftCell'
import { Sheet } from '../components/Sheet'
import { Tabs } from '../components/Tabs'
import { useCatalog } from '../data/gameDataContext'
import { POSITION_LABELS } from '../labels'
import { goBack, navigate, useRouteParams } from '../navigation/useRoute'
import {
  encodePickerTarget,
  parsePickerTarget,
  PICKER_PARAM,
  type PickerTarget,
} from './draftPickerTarget'
import styles from './DraftScreen.module.css'

export function DraftScreen() {
  const { champions, championsById, positionRates } = useCatalog()
  const draft = useDraftStore((s) => s.draft)
  const setPlayerPosition = useDraftStore((s) => s.setPlayerPosition)
  const setAlly = useDraftStore((s) => s.setAlly)
  const addEnemy = useDraftStore((s) => s.addEnemy)
  const replaceEnemy = useDraftStore((s) => s.replaceEnemy)
  const removeEnemy = useDraftStore((s) => s.removeEnemy)
  const moveEnemy = useDraftStore((s) => s.moveEnemy)
  const unlockEnemy = useDraftStore((s) => s.unlockEnemy)
  const startNewGame = useDraftStore((s) => s.newGame)
  const hasItems = useDraftStore((s) => s.ownedItemIds.length > 0)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const layout = enemyLayout(draft, positionRates)
  const target = validTarget(parsePickerTarget(useRouteParams()), draft)
  const champion = (id: string | null | undefined) => (id ? (championsById.get(id) ?? null) : null)
  const enemyAt = (position: Position) => {
    const index = layout[position]
    return index === null ? null : (draft.enemies[index] ?? null)
  }

  const openPicker = (t: PickerTarget) => navigate('draft', PICKER_PARAM, encodePickerTarget(t))
  const closePicker = () => goBack('draft')

  /** Champion actuellement dans la case ciblée (pour « changer » ou « retirer »). */
  const currentId = (() => {
    if (!target) return null
    if (target.team === 'ally') return draft.allies[target.position]
    return target.position === 'new' ? null : (enemyAt(target.position)?.championId ?? null)
  })()

  function handleSelect(selected: Champion) {
    if (!target) return
    if (target.team === 'ally') setAlly(target.position, selected.id)
    else if (target.position === 'new') addEnemy(selected.id)
    else {
      const index = layout[target.position]
      if (index === null) addEnemy(selected.id, target.position)
      else replaceEnemy(index, selected.id)
    }
    closePicker()
  }

  function handleRemove() {
    if (!target) return
    if (target.team === 'ally') setAlly(target.position, null)
    else if (target.position !== 'new') {
      const index = layout[target.position]
      if (index !== null) removeEnemy(index)
    }
    closePicker()
  }

  // Un champion déjà pris ailleurs n'est pas proposé (sauf celui de la case modifiée).
  const picked = pickedChampionIds(draft)
  const available = champions.filter((c) => !picked.has(c.id) || c.id === currentId)
  const currentName = champion(currentId)?.name

  /** Ennemi ouvert dans le sélecteur : son poste peut être corrigé. */
  const editedEnemy = (() => {
    if (target?.team !== 'enemy' || target.position === 'new') return null
    const index = layout[target.position]
    const pick = index === null ? null : draft.enemies[index]
    if (index === null || !pick) return null
    return {
      index,
      position: target.position,
      name: champion(pick.championId)?.name ?? pick.championId,
      guessed: pick.lockedPosition === null,
    }
  })()

  return (
    <>
      <section className={styles.section} aria-labelledby="draft-poste">
        <h2 id="draft-poste" className={styles.sectionTitle}>
          Ton poste
        </h2>
        <Tabs<Position>
          label="Ton poste"
          value={draft.playerPosition}
          onChange={setPlayerPosition}
          options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))}
        />
      </section>

      <section className={styles.board} aria-label="Draft">
        <div className={styles.headers} aria-hidden="true">
          <span className={styles.allyHeader}>Ton équipe</span>
          <span className={styles.enemyHeader}>Ennemis</span>
        </div>
        {POSITIONS.map((position) => {
          const isPlayer = position === draft.playerPosition
          const ally = champion(draft.allies[position])
          const enemyPick = enemyAt(position)
          const enemy = champion(enemyPick?.championId)
          const label = POSITION_LABELS[position]
          const isOpponent = isPlayer && enemy !== null
          const guessed = enemyPick !== null && enemyPick.lockedPosition === null
          const hint = [isOpponent && 'vis-à-vis', guessed && 'deviné'].filter(Boolean).join(', ')
          return (
            <div key={position} className={styles.row} data-player={isPlayer || undefined}>
              <DraftCell
                side="ally"
                champion={ally}
                emptyLabel={isPlayer ? 'Toi' : 'Choisir'}
                highlight={isPlayer ? 'player' : undefined}
                ariaLabel={`${isPlayer ? 'Ton champion' : 'Allié'} ${label} : ${ally ? `${ally.name}, changer` : 'choisir'}`}
                onPick={() => openPicker({ team: 'ally', position })}
              />
              <span className={styles.position}>{label}</span>
              <DraftCell
                side="enemy"
                champion={enemy}
                emptyLabel="Choisir"
                highlight={isOpponent ? 'opponent' : undefined}
                hint={hint || undefined}
                ariaLabel={`${isOpponent ? 'Ton vis-à-vis' : 'Ennemi'} ${label} : ${enemy ? `${enemy.name}${guessed ? ' (poste deviné)' : ''}, changer` : 'choisir'}`}
                onPick={() => openPicker({ team: 'enemy', position })}
              />
            </div>
          )
        })}
      </section>

      <div className={styles.footer}>
        <p className="muted">
          {draft.enemies.length === 0
            ? "Ajoute les ennemis dans n'importe quel ordre : l'app devine leur poste. Touche une case ennemie pour corriger."
            : `${draft.enemies.length} ennemi${draft.enemies.length > 1 ? 's' : ''} sur ${MAX_ENEMIES}.`}
        </p>
        {draft.enemies.length < MAX_ENEMIES && (
          <Button
            variant="secondary"
            block
            onClick={() => openPicker({ team: 'enemy', position: 'new' })}
          >
            Ajouter un ennemi
          </Button>
        )}
        {(hasDraftContent(draft) || hasItems) &&
          (confirmingReset ? (
            <ConfirmPanel
              message="Effacer cette draft et tes items ? Ton poste et ton champion sont gardés."
              confirmLabel="Nouvelle partie"
              onCancel={() => setConfirmingReset(false)}
              onConfirm={() => {
                startNewGame()
                setConfirmingReset(false)
              }}
            />
          ) : (
            <Button variant="ghost" block onClick={() => setConfirmingReset(true)}>
              Nouvelle partie
            </Button>
          ))}
      </div>

      {target && (
        <Sheet
          title={pickerTitle(target, draft)}
          onClose={closePicker}
          action={
            currentName && (
              <Button variant="ghost" onClick={handleRemove} aria-label={`Retirer ${currentName}`}>
                Retirer
              </Button>
            )
          }
        >
          {editedEnemy && (
            <section className={styles.enemyPosition} aria-labelledby="poste-ennemi">
              <h3 id="poste-ennemi" className={styles.sectionTitle}>
                Poste de {editedEnemy.name}
              </h3>
              <Tabs<Position>
                label={`Poste de ${editedEnemy.name}`}
                value={editedEnemy.position}
                onChange={(to) => {
                  moveEnemy(editedEnemy.position, to, positionRates)
                  closePicker()
                }}
                options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))}
              />
              <div className={styles.positionStatus}>
                <p className="muted">
                  {editedEnemy.guessed
                    ? "Poste deviné par l'app. Choisis le bon poste si besoin."
                    : 'Poste fixé par toi.'}
                </p>
                {!editedEnemy.guessed && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      unlockEnemy(editedEnemy.index)
                      closePicker()
                    }}
                  >
                    Laisser deviner
                  </Button>
                )}
              </div>
            </section>
          )}
          <ChampionPicker champions={available} onSelect={handleSelect} autoFocus={!editedEnemy} />
        </Sheet>
      )}
    </>
  )
}

/** Ignore une cible qui ne correspond plus à rien (ex : équipe ennemie complète). */
function validTarget(target: PickerTarget | null, draft: Draft): PickerTarget | null {
  if (
    target?.team === 'enemy' &&
    target.position === 'new' &&
    draft.enemies.length >= MAX_ENEMIES
  ) {
    return null
  }
  return target
}

function pickerTitle(target: PickerTarget, draft: Draft): string {
  if (target.team === 'ally') {
    return target.position === draft.playerPosition
      ? 'Ton champion'
      : `Allié ${POSITION_LABELS[target.position]}`
  }
  return target.position === 'new'
    ? 'Ajouter un ennemi'
    : `Ennemi ${POSITION_LABELS[target.position]}`
}
