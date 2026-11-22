// Tiny localStorage-backed stores. useSyncExternalStore renders the fallback on the server and
// during hydration, then the saved value, so there are no hydration mismatches.
import {useSyncExternalStore} from 'react';
import type {Level} from './questions';
import type {PlanInput} from './plan';
import type {Progress} from './srs';
import type {Diagram} from './canvas';

export type Store<T> = {get: () => T; set: (v: T) => void; use: () => T};

function createStore<T>(key: string, fallback: T): Store<T> {
  let cache: {v: T} | null = null;
  const listeners = new Set<() => void>();
  const get = (): T => {
    if (!cache) {
      try {
        const raw = window.localStorage.getItem(key);
        cache = {v: raw === null ? fallback : (JSON.parse(raw) as T)};
      } catch {
        cache = {v: fallback}; // blocked storage or bad JSON: behave as if nothing was saved
      }
    }
    return cache.v;
  };
  const set = (v: T) => {
    cache = {v};
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // private mode / quota: keep the in-memory value for this page view
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, get, () => fallback);
  return {get, set, use};
}

export const levelStore = createStore<Level | null>('deih.level', null);
export const mockModeStore = createStore<boolean>('deih.mockMode', false);
export const progressStore = createStore<Record<string, true>>('deih.progress', {});
export const plannerStore = createStore<Partial<PlanInput> | null>('deih.planner', null);
export const flashcardStore = createStore<Progress>('deih.flashcards', {});
export const newCardsStore = createStore<{day: string; count: number}>('deih.flashcards.new', {
  day: '',
  count: 0,
});
export const radarStore = createStore<Record<string, number>>('deih.radar', {});
export const canvasStore = createStore<Diagram>('deih.canvas', {boxes: [], edges: [], checks: []});
