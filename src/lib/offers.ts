import { get, set } from './app'
import { SPECS } from '../screens/Generic'
import type { Item, Line } from './data'
import { today } from './fmt'

export type OfferRule = 'none' | 'b2g1' | 'pct'
export const OFFERS: Record<OfferRule, string> = { none: 'No offer', b2g1: 'Buy 2, get 1 free', pct: '10% off when you take 2 or more' }
export const offerRule = (): OfferRule => (String(get().rows.offercfg?.[0]?.rule ?? 'none') as OfferRule)
export const setOfferRule = (rule: OfferRule) => set((s) => ({ rows: { ...s.rows, offercfg: [{ id: 'rule', rule }] } }))

/** Apply the offer in force to one bill line. A manual discount always wins. */
export function applyOffer(l: Line): Line {
  if (l.rule.startsWith('Manual') || l.rule === 'Fee schedule' || l.rule.startsWith('Converted')) return l
  const r = offerRule()
  const free = r === 'b2g1' ? Math.floor(l.qty / 3) : 0
  const disc = r === 'b2g1' ? +((free / l.qty) * 100).toFixed(2) : r === 'pct' && l.qty >= 2 ? 10 : 0
  if (disc > 0) return { ...l, disc, rule: r === 'b2g1' ? `Offer: buy 2 get 1 (${free} free)` : 'Offer: 10% off for 2 or more' }
  return l.rule.startsWith('Offer') ? { ...l, disc: 0, rule: 'Item standard rate' } : l
}

export interface Batch { id: string; name: string; batch: string; exp: string; qty: number }
export const batchRows = (): Batch[] => ((get().rows.expiry as unknown as Batch[] | undefined) ?? (SPECS.expiry.seed as unknown as Batch[]))
/** Earliest-expiry batches that are still in date and have stock, for an item. Empty when the item is not batch-tracked. */
export function batchesFor(it: Item): { all: Batch[]; valid: Batch[] } {
  const all = batchRows().filter((b) => b.name === it.name)
  return { all, valid: all.filter((b) => b.exp >= today() && +b.qty > 0).sort((a, b) => a.exp.localeCompare(b.exp)) }
}
/** Split a quantity across batches, earliest expiry first, allowing for what is already on the bill. */
export function allocate(it: Item, qty: number, lines: Line[]): { parts: { batch: Batch; q: number }[]; short: number; expired: boolean } {
  const { all, valid } = batchesFor(it)
  let need = qty; const parts: { batch: Batch; q: number }[] = []
  for (const b of valid) {
    if (need <= 0) break
    const used = lines.filter((l) => l.itemId === it.id && l.batch === b.batch).reduce((a, l) => a + l.qty, 0)
    const free = +b.qty - used; if (free <= 0) continue
    const q = Math.min(free, need); parts.push({ batch: b, q }); need -= q
  }
  return { parts, short: need, expired: all.length > 0 && valid.length === 0 }
}
/** Take billed batch quantities off the batch register when a bill is saved. */
export function consumeBatches(lines: Line[]) {
  if (!lines.some((l) => l.batch)) return
  set((s) => ({ rows: { ...s.rows, expiry: batchRows().map((b) => { const q = lines.filter((l) => l.batch === b.batch && l.name.startsWith(b.name)).reduce((a, l) => a + l.qty, 0); return q ? { ...b, qty: Math.max(0, +b.qty - q) } : b }) as never } }))
}
