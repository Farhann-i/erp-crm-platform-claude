import { createStore } from '../lib/store'
export const ctx = createStore<{ kind: 'none' | 'item' | 'party' | 'doc'; id: string; palette: boolean; pulse: boolean; notif: boolean; docId: string }>('ctx', { kind: 'none', id: '', palette: false, pulse: false, notif: false, docId: '' }, [])
export const select = (kind: 'item' | 'party' | 'doc', id: string) => ctx.set({ kind, id })
