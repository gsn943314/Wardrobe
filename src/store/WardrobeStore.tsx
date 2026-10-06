import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { deleteFile, deleteItemFiles } from '@/lib/files';
import type { Item, Outfit, Profile, TryOnResult } from '@/lib/types';

const STORAGE_KEY = 'wardrobe/v1';

type State = {
  loaded: boolean;
  items: Item[];
  outfits: Outfit[];
  profile: Profile;
};

type Action =
  | { type: 'load'; state: Omit<State, 'loaded'> }
  | { type: 'upsertItem'; item: Item }
  | { type: 'deleteItem'; id: string }
  | { type: 'upsertOutfit'; outfit: Outfit }
  | { type: 'deleteOutfit'; id: string }
  | { type: 'addResult'; outfitId: string; result: TryOnResult }
  | { type: 'deleteResult'; outfitId: string; resultId: string }
  | { type: 'setProfile'; profile: Partial<Profile> };

const initial: State = { loaded: false, items: [], outfits: [], profile: { turnDirection: 1 } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { ...action.state, loaded: true };
    case 'upsertItem': {
      const exists = state.items.some((i) => i.id === action.item.id);
      const items = exists ? state.items.map((i) => (i.id === action.item.id ? action.item : i)) : [action.item, ...state.items];
      return { ...state, items };
    }
    case 'deleteItem':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        // Keep outfits valid when one of their pieces disappears.
        outfits: state.outfits.map((o) => ({
          ...o,
          slots: Object.fromEntries(Object.entries(o.slots).filter(([, id]) => id !== action.id)),
          accessories: o.accessories.filter((id) => id !== action.id),
        })),
      };
    case 'upsertOutfit': {
      const exists = state.outfits.some((o) => o.id === action.outfit.id);
      const outfits = exists
        ? state.outfits.map((o) => (o.id === action.outfit.id ? action.outfit : o))
        : [action.outfit, ...state.outfits];
      return { ...state, outfits };
    }
    case 'deleteOutfit':
      return { ...state, outfits: state.outfits.filter((o) => o.id !== action.id) };
    case 'addResult':
      return {
        ...state,
        outfits: state.outfits.map((o) =>
          o.id === action.outfitId ? { ...o, results: [action.result, ...o.results], updatedAt: Date.now() } : o,
        ),
      };
    case 'deleteResult':
      return {
        ...state,
        outfits: state.outfits.map((o) =>
          o.id === action.outfitId ? { ...o, results: o.results.filter((r) => r.id !== action.resultId) } : o,
        ),
      };
    case 'setProfile':
      return { ...state, profile: { ...state.profile, ...action.profile } };
  }
}

type Store = State & {
  saveItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Item, 'id' | 'createdAt'>>): Item;
  deleteItem(id: string): void;
  saveOutfit(outfit: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt' | 'results'> & Partial<Outfit>): Outfit;
  deleteOutfit(id: string): void;
  addResult(outfitId: string, result: TryOnResult): void;
  deleteResult(outfitId: string, resultId: string): void;
  setProfile(profile: Partial<Profile>): void;
  getItem(id?: string): Item | undefined;
  getOutfit(id?: string): Outfit | undefined;
};

const StoreContext = createContext<Store | null>(null);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const data = raw ? JSON.parse(raw) : {};
        dispatch({
          type: 'load',
          state: {
            items: data.items ?? [],
            outfits: data.outfits ?? [],
            profile: { ...initial.profile, ...data.profile },
          },
        });
      })
      .catch(() => dispatch({ type: 'load', state: { items: [], outfits: [], profile: initial.profile } }));
  }, []);

  // Persist after changes, debounced so typing in forms doesn't hammer storage.
  useEffect(() => {
    if (!state.loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { items, outfits, profile } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items, outfits, profile })).catch(() => {});
    }, 300);
  }, [state]);

  const store = useMemo<Store>(() => {
    const now = () => Date.now();
    return {
      ...state,
      saveItem(input) {
        const item: Item = { ...input, id: input.id ?? randomUUID(), createdAt: input.createdAt ?? now(), updatedAt: now() };
        dispatch({ type: 'upsertItem', item });
        return item;
      },
      deleteItem(id) {
        deleteItemFiles(id);
        dispatch({ type: 'deleteItem', id });
      },
      saveOutfit(input) {
        const outfit: Outfit = {
          results: [],
          ...input,
          id: input.id ?? randomUUID(),
          createdAt: input.createdAt ?? now(),
          updatedAt: now(),
        };
        dispatch({ type: 'upsertOutfit', outfit });
        return outfit;
      },
      deleteOutfit(id) {
        state.outfits
          .find((o) => o.id === id)
          ?.results.forEach((r) => {
            // Demo results point at the user's base video itself; never delete that.
            if (r.videoUri !== r.baseVideoUri) deleteFile(r.videoUri);
          });
        dispatch({ type: 'deleteOutfit', id });
      },
      addResult(outfitId, result) {
        dispatch({ type: 'addResult', outfitId, result });
      },
      deleteResult(outfitId, resultId) {
        const r = state.outfits.find((o) => o.id === outfitId)?.results.find((x) => x.id === resultId);
        if (r && r.videoUri !== r.baseVideoUri) deleteFile(r.videoUri);
        dispatch({ type: 'deleteResult', outfitId, resultId });
      },
      setProfile(profile) {
        dispatch({ type: 'setProfile', profile });
      },
      getItem: (id) => state.items.find((i) => i.id === id),
      getOutfit: (id) => state.outfits.find((o) => o.id === id),
    };
  }, [state]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useWardrobe(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useWardrobe must be used inside WardrobeProvider');
  return store;
}
