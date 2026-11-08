import { useApp, set } from './app'
export interface UnitDef { n: string; f: number; s: boolean; p: boolean }
const EMPTY: Record<string, string | number>[] = []
/** Per-item units are kept in rows.itemunits as "Box:6:1:1;Dozen:12:1:0" (name:factor:sale:purchase). */
export const parseUnits = (v: unknown): UnitDef[] => String(v ?? '').split(';').filter(Boolean).map((x) => { const [n, f, s, p] = x.split(':'); return { n, f: +f || 1, s: s !== '0', p: p !== '0' } })
export const packUnits = (u: UnitDef[]) => u.filter((x) => x.n.trim()).map((x) => `${x.n.trim()}:${x.f}:${x.s ? 1 : 0}:${x.p ? 1 : 0}`).join(';')
export function useItemUnits(itemId: string): UnitDef[] {
  const rows = useApp((s) => s.rows.itemunits) ?? EMPTY
  return parseUnits(rows.find((r) => r.id === itemId)?.units)
}
export function useAllUnits() { return useApp((s) => s.rows.itemunits) ?? EMPTY }
export function saveUnits(itemId: string, u: UnitDef[]) {
  set((s) => ({ rows: { ...s.rows, itemunits: [...(s.rows.itemunits ?? []).filter((r) => r.id !== itemId), { id: itemId, units: packUnits(u) }] } }))
}
