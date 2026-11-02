import { useSyncExternalStore } from 'react'

export function createStore<T extends object>(key: string, init: T, persist: (keyof T)[]) {
  let state: T = init
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = { ...init, ...JSON.parse(raw) }
  } catch {
    /* ignore corrupt storage */
  }
  const subs = new Set<() => void>()
  const save = () => {
    try {
      const o: Partial<T> = {}
      persist.forEach((k) => (o[k] = state[k]))
      localStorage.setItem(key, JSON.stringify(o))
    } catch {
      /* quota */
    }
  }
  return {
    get: () => state,
    set(p: Partial<T> | ((s: T) => Partial<T>)) {
      state = { ...state, ...(typeof p === 'function' ? p(state) : p) }
      save()
      subs.forEach((f) => f())
    },
    reset() {
      localStorage.removeItem(key)
      state = init
      subs.forEach((f) => f())
    },
    use<R>(sel: (s: T) => R): R {
      return useSyncExternalStore(
        (f) => (subs.add(f), () => subs.delete(f)),
        () => sel(state),
      )
    },
  }
}
