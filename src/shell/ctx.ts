import { createStore } from '../lib/store'
export const ctx = createStore<{ kind: 'none' | 'item' | 'party' | 'doc'; id: string; palette: boolean; pulse: boolean; notif: boolean; docId: string }>('ctx', { kind: 'none', id: '', palette: false, pulse: false, notif: false, docId: '' }, [])
export const select = (kind: 'item' | 'party' | 'doc', id: string) => ctx.set({ kind, id })

import type { Mode } from '../lib/config'
export interface User { id: string; name: string; role: string; modes: Mode[]; start: Mode }
export const USERS: User[] = [
  { id: 'u1', name: 'Anwar Sadiq', role: 'Owner', modes: ['owner', 'books', 'counter', 'studio'], start: 'owner' },
  { id: 'u2', name: 'Jose Varghese', role: 'Accountant', modes: ['books', 'owner'], start: 'books' },
  { id: 'u3', name: 'Meera Nair', role: 'Cashier', modes: ['counter'], start: 'counter' },
  { id: 'u4', name: 'Farhan I', role: 'Super admin', modes: ['studio', 'owner', 'books', 'counter'], start: 'studio' },
]
export const DEMO_PIN = '1234'
const saved = (() => { try { return sessionStorage.getItem('erp-user') } catch { return null } })()
export const auth = createStore<{ user: string | null; locked: boolean }>('auth', { user: saved, locked: false }, [])
export const signIn = (id: string) => { try { sessionStorage.setItem('erp-user', id) } catch { /* private mode */ } auth.set({ user: id, locked: false }) }
export const signOut = () => { try { sessionStorage.removeItem('erp-user') } catch { /* ignore */ } auth.set({ user: null, locked: false }) }
export const lock = () => auth.set({ locked: true })
