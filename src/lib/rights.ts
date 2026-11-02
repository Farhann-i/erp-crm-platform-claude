import { createContext, useContext } from 'react'
import { useApp, get } from './app'
import { auth, USERS } from '../shell/ctx'

export type Act = 'V' | 'C' | 'E' | 'D' | 'A' | 'X'
export const ACT_LABEL: Record<Act, string> = { V: 'View', C: 'Create', E: 'Edit', D: 'Delete', A: 'Approve', X: 'Export' }
export const RouteCtx = createContext('')

const CASHIER = ['billing', 'held', 'returns', 'dayclose', 'ask', 'stock']
const NO_ACCOUNTANT = ['rights', 'users', 'audit', 'licence']
export function defaultRights(role: string, route: string): string {
  if (role === 'Super admin' || role === 'Owner') return 'VCEDAX'
  if (role === 'Accountant') return NO_ACCOUNTANT.includes(route) ? '' : 'VCEX'
  if (role === 'Cashier') return CASHIER.includes(route) ? (route === 'stock' ? 'V' : 'VC') : ''
  return ''
}
type RR = { id: string; v: string | number }[]
export function rightsFor(role: string, route: string, saved?: RR): string {
  if (role === 'Super admin') return 'VCEDAX'
  const s = saved?.find((r) => r.id === `${role}|${route}`)
  return s ? String(s.v) : defaultRights(role, route)
}
export const roleOf = () => USERS.find((u) => u.id === auth.get().user)?.role ?? ''
export function canNow(route: string, act: Act) {
  return rightsFor(roleOf(), route, get().rows.rights as RR | undefined).includes(act)
}
export function useRole() {
  const id = auth.use((s) => s.user)
  return USERS.find((u) => u.id === id)?.role ?? ''
}
/** Hook used by screens: can(act) for the screen being shown. */
export function useCan(routeOverride?: string) {
  const ctx = useContext(RouteCtx)
  const route = routeOverride ?? ctx
  const role = useRole()
  const saved = useApp((s) => s.rows.rights) as RR | undefined
  const has = (act: Act) => !route || rightsFor(role, route, saved).includes(act)
  return Object.assign(has, { role, route })
}
export function useCanSee() {
  const role = useRole()
  const saved = useApp((s) => s.rows.rights) as RR | undefined
  return (route: string) => rightsFor(role, route, saved).includes('V')
}
