import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Notes de test du joueur (T7.1), gardées sur le téléphone jusqu'à ce qu'il les efface. */
type NotesStore = {
  text: string
  setText: (text: string) => void
  clear: () => void
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      text: '',
      setText: (text) => set({ text }),
      clear: () => set({ text: '' }),
    }),
    {
      name: 'draftdigger:notes',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ text: state.text }),
      merge: (persisted, current) =>
        typeof persisted === 'object' &&
        persisted !== null &&
        'text' in persisted &&
        typeof persisted.text === 'string'
          ? { ...current, text: persisted.text }
          : current,
    },
  ),
)
