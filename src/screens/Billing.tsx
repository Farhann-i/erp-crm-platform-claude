import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, set, get, toast, go, nextNo, bumpNo } from '../lib/app'
import { calc, type Item, type Line, type Invoice } from '../lib/data'
import { inr, inr0, today } from '../lib/fmt'
import { Btn, Tape, Modal, Money, Field, useT, Bal, Status, type TapeLine } from '../ui/kit'
import { Icon } from '../ui/icons'
import { ctx, select } from '../shell/ctx'
import { openPrint } from '../ui/BillPrint'

const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const COLOURS = ['Indigo', 'White', 'Mustard']
const MATRIX_CATS = ['Shirts', 'Kurtas', 'Jeans', 'Uniform']

function lineFrom(it: Item, qty = 1, label = ''): Line {
  return { itemId: it.id, name: it.name + label, qty, unit: it.unit, rate: it.rate, disc: 0, gst: it.gst, cost: it.cost, rule: it.category === 'Fees' ? 'Fee schedule' : 'Item standard rate' }
}
export function useBill() {
  const bill = useApp((s) => s.bill)
  const items = useApp((s) => s.items)
  const parties = useApp((s) => s.parties)
  const upd = (fn: (l: Line[]) => Line[]) => set((s) => ({ bill: { ...s.bill, lines: fn(s.bill.lines) } }))
  const party = parties.find((p) => p.id === bill.partyId)!
  return {
    bill, party, items, parties, totals: calc(bill.lines),
    add(it: Item, qty = 1, label = '') {
      const key = it.id + label
      upd((ls) => { const i = ls.findIndex((l) => l.itemId + (l.name.slice(it.name.length)) === key); if (i >= 0 && !label) return ls.map((l, k) => (k === i ? { ...l, qty: l.qty + qty } : l)); return [...ls, lineFrom(it, qty, label)] })
      select('item', it.id)
      const stock = Object.values(it.stock).reduce((a, b) => a + b, 0)
      if (stock <= 0) toast(`${it.name.slice(0, 32)} has no stock. Billing continues, stock will go negative.`, 'warn')
    },
    qty: (i: number, q: number) => upd((ls) => ls.map((l, k) => (k === i ? { ...l, qty: Math.max(0, q) } : l)).filter((l) => l.qty > 0)),
    disc: (i: number, d: number) => upd((ls) => ls.map((l, k) => (k === i ? { ...l, disc: Math.min(100, Math.max(0, d)), rule: d > 0 ? `Manual discount ${d}%` : 'Item standard rate' } : l))),
    remove: (i: number) => upd((ls) => ls.filter((_, k) => k !== i)),
    setParty: (id: string) => { set((s) => ({ bill: { ...s.bill, partyId: id } })); select('party', id) },
    clear: () => set({ bill: { partyId: 'c0', lines: [], note: '' } }),
  }
}
export function tapeFor(lines: Line[], partyName: string, pays: { cash: number; upi: number; card: number; credit: number }): TapeLine[] {
  const c = calc(lines)
  if (!lines.length) return []
  const out: TapeLine[] = []
  if (pays.cash) out.push({ ledger: 'Cash in hand', dr: pays.cash, cr: 0 })
  if (pays.upi) out.push({ ledger: 'HDFC Bank current A/c 5010 (UPI)', dr: pays.upi, cr: 0 })
  if (pays.card) out.push({ ledger: 'Card settlement receivable', dr: pays.card, cr: 0 })
  if (pays.credit) out.push({ ledger: partyName, dr: pays.credit, cr: 0 })
  out.push({ ledger: 'Sales', dr: 0, cr: +c.sub.toFixed(2) })
  out.push({ ledger: 'Output CGST', dr: 0, cr: +(c.tax / 2).toFixed(2) })
  out.push({ ledger: 'Output SGST', dr: 0, cr: +(c.tax / 2).toFixed(2) })
  if (Math.abs(c.round) > 0.004) out.push({ ledger: 'Round off', dr: c.round < 0 ? -c.round : 0, cr: c.round > 0 ? c.round : 0 })
  return out
}

/* shared search with suggestions, Enter accepts the first */
function ItemSearch({ onPick, big, inputRef }: { onPick: (it: Item) => void; big?: boolean; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const items = useApp((s) => s.items)
  const t = useT()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const n = q.trim().toLowerCase()
  const res = n ? items.filter((x) => (x.name + x.code + x.barcode + x.brand).toLowerCase().includes(n)).slice(0, 6) : []
  const pick = (it?: Item) => { if (it) { onPick(it); setQ(''); setI(0) } }
  return (
    <div className="relative">
      <div className="relative">
        <Icon n="barcode" size={big ? 20 : 15} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
        <input ref={inputRef} aria-label="Scan or search item" autoFocus className={`inp ${big ? 'h-12 text-base pl-11' : 'pl-8'}`} placeholder={`Scan barcode or type ${t('{item}').toLowerCase()} code, name or brand`} value={q}
          onChange={(e) => { setQ(e.target.value); setI(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, res.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)) }
            if (e.key === 'Enter') pick(res[i])
          }} />
      </div>
      {res.length > 0 && (
        <ul role="listbox" className="absolute z-20 left-0 right-0 top-full mt-1 panel shadow-xl overflow-hidden">
          {res.map((r, k) => {
            const stock = Object.values(r.stock).reduce((a, b) => a + b, 0)
            return (
              <li key={r.id} role="option" aria-selected={k === i} onMouseEnter={() => setI(k)} onMouseDown={() => pick(r)} className={`px-3 h-9 flex items-center gap-3 text-[13px] cursor-pointer ${k === i ? 'bg-neel text-onneel' : ''}`}>
                <span className="flex-1 truncate">{r.name}</span><span className="text-xs opacity-80">{r.code}</span><span className="num w-20">{inr0(r.rate)}</span><span className="text-xs w-16 text-right opacity-80">{stock} {r.unit}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PartyPick({ compact }: { compact?: boolean }) {
  const b = useBill()
  const t = useT()
  const [adding, setAdding] = useState(false)
  const p = b.party
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <label className="flex items-center gap-2">
        <span className="muted">{t('{customer}')}</span>
        <select aria-label={t('{customer}')} className={`inp ${compact ? 'w-40' : 'w-52'}`} value={b.bill.partyId} onChange={(e) => b.setParty(e.target.value)}>
          {b.parties.filter((x) => x.kind === 'customer').map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ''}</option>)}
        </select>
      </label>
      <Btn className="btn-sm" icon="plus" onClick={() => setAdding(true)}>New</Btn>
      {!compact && p.id !== 'c0' && <span className="muted">{p.phone}{p.gstin ? ` · ${p.gstin}` : ''} · owes {inr0(p.balance)}{p.limit ? ` of ${inr0(p.limit)}` : ''}</span>}
      {adding && <QuickCustomer onClose={() => setAdding(false)} onSaved={(id) => { b.setParty(id); setAdding(false) }} />}
    </div>
  )
}

const STATES: Record<string, string> = { '32': 'Kerala', '33': 'Tamil Nadu', '29': 'Karnataka', '27': 'Maharashtra', '07': 'Delhi', '24': 'Gujarat' }
export function QuickCustomer({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const parties = useApp((s) => s.parties)
  const [v, setV] = useState({ name: '', phone: '', gstin: '', city: '', limit: '0', consent: true })
  const [e, setE] = useState<Record<string, string>>({})
  const save = () => {
    const er: Record<string, string> = {}
    const ph = v.phone.replace(/\D/g, '')
    if (!v.name.trim()) er.name = 'Enter the customer name.'
    if (ph.length !== 10) er.phone = 'Enter a 10-digit mobile number.'
    else if (parties.some((x) => x.phone.replace(/\D/g, '') === ph)) er.phone = `This number already belongs to ${parties.find((x) => x.phone.replace(/\D/g, '') === ph)!.name}.`
    if (v.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin.toUpperCase())) er.gstin = 'GSTIN has 15 characters, for example 32AAFPN8821M1ZK.'
    setE(er)
    if (Object.keys(er).length) return
    const id = 'c' + Date.now()
    const party = { id, name: v.name.trim(), kind: 'customer' as const, city: v.city.trim() || 'Kochi', phone: `${ph.slice(0, 5)} ${ph.slice(5)}`, gstin: v.gstin.toUpperCase(), balance: 0, limit: +v.limit || 0, risk: 'low' as const, lastPay: '', overdueDays: 0, consent: v.consent }
    set((s) => ({ parties: [...s.parties, party] }))
    toast(`${party.name} added.`)
    onSaved(id)
  }
  return (
    <Modal open onClose={onClose} title="New customer" foot={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save and use on this bill</Btn></>}>
      <div className="space-y-3" onKeyDown={(k) => k.key === 'Enter' && save()}>
        <Field label="Name" req error={e.name}><input autoFocus className="inp" value={v.name} onChange={(x) => setV({ ...v, name: x.target.value })} placeholder="Anitha Menon" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile" req error={e.phone}><input inputMode="tel" className="inp num" value={v.phone} onChange={(x) => setV({ ...v, phone: x.target.value })} placeholder="98470 12345" /></Field>
          <Field label="City"><input className="inp" value={v.city} onChange={(x) => setV({ ...v, city: x.target.value })} placeholder="Kochi" /></Field>
        </div>
        <Field label="GSTIN (for business invoices)" error={e.gstin} hint={v.gstin.length >= 2 ? `State: ${STATES[v.gstin.slice(0, 2)] ?? 'check the first two digits'}. Other states get IGST.` : 'Leave blank for a consumer bill.'}><input className="inp num uppercase" maxLength={15} value={v.gstin} onChange={(x) => setV({ ...v, gstin: x.target.value })} placeholder="32AAFPN8821M1ZK" /></Field>
        <Field label="Credit limit (₹)"><input type="number" min={0} className="inp num" value={v.limit} onChange={(x) => setV({ ...v, limit: x.target.value })} /></Field>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={v.consent} onChange={(x) => setV({ ...v, consent: x.target.checked })} />Customer agreed to receive bills and offers on WhatsApp</label>
      </div>
    </Modal>
  )
}

function RuleMark({ l }: { l: Line }) {
  const [o, setO] = useState(false)
  return (
    <span className="relative">
      <button aria-label="Why this rate" aria-expanded={o} onClick={() => setO(!o)} className="muted hover:text-neel ml-1 align-middle"><Icon n="warn" size={11} /></button>
      {o && <span role="tooltip" className="absolute z-20 right-0 top-5 w-56 panel shadow-xl p-2 text-xs text-left font-sans whitespace-normal"><b>{l.rule}</b><br />Checked in order: party rate, price category, quantity slab, scheme, item standard.</span>}
    </span>
  )
}

function VariantPicker({ it, onClose }: { it: Item; onClose: () => void }) {
  const b = useBill()
  const [m, setM] = useState<Record<string, number>>({})
  const total = Object.values(m).reduce((a, x) => a + (x || 0), 0)
  return (
    <Modal open onClose={onClose} title={`Sizes and colours: ${it.name.slice(0, 36)}`} foot={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!total} onClick={() => { Object.entries(m).forEach(([k, q]) => q && b.add(it, q, ` · ${k.replace('|', ' / ')}`)); onClose() }}>Add {total} pieces</Btn></>}>
      <table className="tbl"><thead><tr><th></th>{SIZES.map((s) => <th key={s} className="text-center">{s}</th>)}</tr></thead>
        <tbody>{COLOURS.map((c) => <tr key={c}><td className="font-medium">{c}</td>{SIZES.map((s) => <td key={s} className="p-1"><input aria-label={`${c} ${s}`} type="number" min={0} className="inp num w-full text-center" value={m[`${s}|${c}`] ?? ''} onChange={(e) => setM({ ...m, [`${s}|${c}`]: +e.target.value })} /></td>)}</tr>)}</tbody></table>
      <p className="text-xs muted mt-2">Type quantities in the cells you need. Tab moves right. Each filled cell becomes one line.</p>
    </Modal>
  )
}

function Totals({ big }: { big?: boolean }) {
  const b = useBill()
  const t = useT()
  const n = b.bill.lines.reduce((a, l) => a + l.qty, 0)
  return (
    <div className="text-right">
      <div className="text-xs muted">{b.bill.lines.length} lines, {n} units</div>
      <dl className="text-[13px] grid grid-cols-[1fr_auto] gap-x-6 justify-end ml-auto w-56 my-1">
        <dt className="muted text-left">Subtotal</dt><dd className="num">{inr(b.totals.sub)}</dd>
        <dt className="muted text-left">CGST + SGST</dt><dd className="num">{inr(b.totals.tax)}</dd>
        <dt className="muted text-left">Round off</dt><dd className="num">{b.totals.round.toFixed(2)}</dd>
      </dl>
      <div className={`${big ? 'text-[44px]' : 'text-[28px]'} font-semibold leading-none num`} aria-live="polite" aria-label={`${t('Total')} ${inr0(b.totals.total)}`}>{inr0(b.totals.total)}</div>
    </div>
  )
}

export function Tender({ onClose }: { onClose: () => void }) {
  const b = useBill()
  const mode = useApp((s) => s.mode)
  const approvalOn = useApp((s) => s.draft.approvals.find((a) => a.id === 'a1')?.on)
  const total = b.totals.total
  const [p, setP] = useState({ cash: total, upi: 0, card: 0, credit: 0 })
  const sum = p.cash + p.upi + p.card + p.credit
  const rem = total - sum
  const walk = b.party.id === 'c0'
  const [err, setErr] = useState('')
  const over = !walk && b.party.limit > 0 && b.party.balance + p.credit > b.party.limit
  const bigDisc = b.bill.lines.some((l) => l.disc > 10)
  const save = () => {
    if (!b.bill.lines.length) return setErr('Add at least one line before saving.')
    if (Math.abs(rem) > 0.5) return setErr(rem > 0 ? `${inr0(rem)} is still unassigned. Use "Put rest on cash" or add a payment.` : `Payments exceed the total by ${inr0(-rem)}.`)
    if (p.credit > 0 && walk) return setErr('Credit needs a named customer. Pick one at the top of the bill.')
    if (bigDisc && approvalOn && mode === 'counter') {
      set((s) => ({ held: [...s.held, { id: 'h' + Date.now(), partyId: b.bill.partyId, lines: s.bill.lines, at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }], approvals: [{ id: 'ap' + Date.now(), kind: 'Discount', title: `Bill discount above 10% for ${b.party.name}`, by: 'Divya (cashier)', amount: total, detail: `${b.bill.lines.length} lines. Held at the counter until approved.`, due: 'Today', status: 'pending' }, ...s.approvals] }))
      b.clear(); onClose()
      return toast('Discount is above 10%. The bill is held and a request went to the manager.', 'warn')
    }
    const no = nextNo('Sales invoice')
    const inv: Invoice = { id: 'inv' + Date.now(), no, date: today(), partyId: b.bill.partyId, partyName: b.party.name, branch: 'Kochi Main', lines: b.bill.lines, sub: b.totals.sub, tax: b.totals.tax, total, paid: sum - p.credit, status: 'posted', pay: [p.cash && 'Cash', p.upi && 'UPI', p.card && 'Card', p.credit && 'Credit'].filter(Boolean).join(' + '), by: mode === 'counter' ? 'Divya (cashier)' : 'Salim (manager)' }
    set((s) => ({
      invoices: [inv, ...s.invoices],
      items: s.items.map((it) => { const q = inv.lines.filter((l) => l.itemId === it.id).reduce((a, l) => a + l.qty, 0); return q ? { ...it, stock: { ...it.stock, show: it.stock.show - q } } : it }),
      parties: s.parties.map((x) => (x.id === inv.partyId && p.credit ? { ...x, balance: x.balance + p.credit } : x)),
      ledgers: s.ledgers.map((l) => (l.name === 'Cash in hand' ? { ...l, bal: l.bal + p.cash } : l.name.startsWith('HDFC') ? { ...l, bal: l.bal + p.upi } : l)),
      pending: s.offline ? s.pending + 1 : s.pending,
    }))
    bumpNo('Sales invoice')
    b.clear(); onClose()
    openPrint(inv)
    toast(`${no} saved. ${inr0(total)} received${p.credit ? `, ${inr0(p.credit)} on credit` : ''}.${get().offline ? ' Waiting to sync.' : ''}`)
  }
  const row = (k: keyof typeof p, label: string, icon: string, dis = false) => (
    <div className="flex items-center gap-3">
      <Icon n={icon} className="muted" /><span className="w-16 text-[13px]">{label}</span>
      <input aria-label={`${label} amount`} disabled={dis} type="number" min={0} className="inp num h-9 text-right" value={p[k] || ''} placeholder="0" onChange={(e) => setP({ ...p, [k]: +e.target.value })} />
    </div>
  )
  return (
    <Modal open onClose={onClose} title="Tender" foot={<><Btn onClick={onClose}>Back to bill</Btn><Btn kind="primary" className="btn-lg" onClick={save}>Save bill and print</Btn></>}>
      <div onKeyDown={(e) => e.key === 'Enter' && save()} className="space-y-3">
        <div className="flex justify-between items-baseline"><span className="muted">Amount due</span><span className="text-3xl font-semibold num">{inr0(total)}</span></div>
        {row('cash', 'Cash', 'wallet')}{row('upi', 'UPI', 'qr')}{row('card', 'Card', 'card')}{row('credit', 'Credit', 'book', walk)}
        {walk && <p className="text-xs muted">Credit is off for a walk-in customer.</p>}
        {p.upi > 0 && <div className="flex items-center gap-3 p-2 border border-rule rounded"><Qr /><div className="text-xs muted">Demo QR for {inr0(p.upi)}. No payment is collected in this prototype.</div></div>}
        <div className="flex justify-between items-center border-t border-rule pt-2">
          <span className={rem === 0 ? 'text-mehndi font-medium' : 'font-medium'}>{rem === 0 ? 'Fully tendered' : rem > 0 ? `Remaining ${inr0(rem)}` : `Excess ${inr0(-rem)}`}</span>
          <div className="flex gap-1"><Btn className="btn-sm" onClick={() => setP({ ...p, cash: Math.max(0, p.cash + rem) })}>Put rest on cash</Btn>{!walk && <Btn className="btn-sm" onClick={() => setP({ ...p, credit: Math.max(0, p.credit + rem) })}>Rest on credit</Btn>}</div>
        </div>
        {over && <p className="text-xs px-2 py-1 bg-haldi/20 rounded">Credit takes {b.party.name} over the limit of {inr0(b.party.limit)}. Allowed here, flagged for the manager.</p>}
        {bigDisc && approvalOn && mode === 'counter' && <p className="text-xs px-2 py-1 bg-haldi/20 rounded">A line has a discount above 10%. Saving will hold the bill for manager approval.</p>}
        {err && <p role="alert" className="text-xs text-sindoor">{err}</p>}
      </div>
    </Modal>
  )
}
function Qr() {
  const cells = Array.from({ length: 169 }, (_, i) => ((i * 7 + (i >> 3) * 13) % 5 < 2) || [0, 1, 2, 12, 13, 14, 26, 156, 157, 168].includes(i))
  return <svg width="64" height="64" viewBox="0 0 13 13" aria-label="Demo UPI QR">{cells.map((c, i) => c && <rect key={i} x={i % 13} y={Math.floor(i / 13)} width="1" height="1" fill="currentColor" />)}</svg>
}

function HeldList({ onClose }: { onClose: () => void }) {
  const held = useApp((s) => s.held)
  const parties = useApp((s) => s.parties)
  return (
    <Modal open onClose={onClose} title="Held bills" foot={<Btn onClick={onClose}>Close</Btn>}>
      {held.length === 0 ? <p className="muted">No held bills. Press F4 on a bill to hold it.</p> : held.map((h) => (
        <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-rule">
          <div><div className="font-medium">{parties.find((p) => p.id === h.partyId)?.name}</div><div className="text-xs muted">{h.lines.length} lines · held {h.at}</div></div>
          <div className="flex items-center gap-2"><Money v={calc(h.lines).total} /><Btn kind="primary" className="btn-sm" onClick={() => { set((s) => ({ bill: { partyId: h.partyId, lines: h.lines, note: '' }, held: s.held.filter((x) => x.id !== h.id) })); onClose(); toast('Bill recalled.', 'info') }}>Recall</Btn></div>
        </div>
      ))}
    </Modal>
  )
}

export function HeldScreen() {
  const held = useApp((s) => s.held)
  const parties = useApp((s) => s.parties)
  return (
    <div className="p-5 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Held bills</h1>
      <p className="text-[13px] muted mb-3">Visible from any terminal on this branch. Recall puts the bill back in the billing screen.</p>
      <div className="panel">{held.length === 0 && <p className="p-4 muted text-[13px]">Nothing on hold.</p>}{held.map((h) => (
        <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-rule last:border-0 draft-edge">
          <div><div className="font-medium">{parties.find((p) => p.id === h.partyId)?.name}</div><div className="text-xs muted">{h.lines.length} lines · held {h.at}</div></div>
          <div className="flex items-center gap-3"><Money v={calc(h.lines).total} /><Btn kind="primary" onClick={() => { set((s) => ({ bill: { partyId: h.partyId, lines: h.lines, note: '' }, held: s.held.filter((x) => x.id !== h.id) })); go('billing') }}>Recall</Btn></div>
        </div>
      ))}</div>
    </div>
  )
}

export function Billing() {
  const c = useApp((s) => s.draft)
  const mode = useApp((s) => s.mode)
  const variant = mode === 'counter' ? c.layouts.cashier : c.layouts.books
  const b = useBill()
  const [tender, setTender] = useState(false)
  const [held, setHeld] = useState(false)
  const [vp, setVp] = useState<Item | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const hold = () => {
    if (!b.bill.lines.length) return toast('Nothing to hold yet.', 'info')
    set((s) => ({ held: [...s.held, { id: 'h' + Date.now(), partyId: s.bill.partyId, lines: s.bill.lines, at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }] }))
    b.clear(); toast('Bill held. Recall it from Held bills.', 'info')
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2' || e.key === 'F6') { e.preventDefault(); if (b.bill.lines.length) setTender(true); else toast('Add an item first.', 'info') }
      if (e.key === 'F4') { e.preventDefault(); hold() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  const [pays] = useState({ cash: 0, upi: 0, card: 0, credit: 0 })
  const tp = b.party.id === 'c0' ? { ...pays, cash: b.totals.total } : { ...pays, credit: b.totals.total }
  const tape = tapeFor(b.bill.lines, b.party.name, tp)
  const onPick = (it: Item) => (variant === 'ledger' && MATRIX_CATS.includes(it.category) ? setVp(it) : b.add(it))
  const demoScan = () => { const it = b.items[Math.floor(Math.random() * b.items.length)]; b.add(it); toast(`Scanned ${it.code} (simulated scanner).`, 'info') }
  const Scan = <Btn icon="scan" className="btn-sm" onClick={demoScan}>Simulate scan</Btn>
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {variant === 'ledger' && <LedgerSheet onPick={onPick} tender={() => setTender(true)} hold={hold} scan={Scan} inputRef={ref} showHeld={() => setHeld(true)} />}
      {variant === 'receipt' && <ReceiptRail onPick={b.add} tender={() => setTender(true)} hold={hold} scan={Scan} />}
      {variant === 'counter' && <CounterLane onPick={b.add} tender={() => setTender(true)} hold={hold} scan={Scan} showHeld={() => setHeld(true)} />}
      {variant === 'tile' && <TilePos onPick={b.add} tender={() => setTender(true)} hold={hold} scan={Scan} />}
      {mode !== 'counter' && <Tape lines={tape} note="Add a line to see the entries this bill will post." />}
      {tender && <Tender onClose={() => setTender(false)} />}
      {held && <HeldList onClose={() => setHeld(false)} />}
      {vp && <VariantPicker it={vp} onClose={() => setVp(null)} />}
    </div>
  )
}
type VP = { onPick: (it: Item) => void; tender: () => void; hold: () => void; scan: React.ReactNode; showHeld?: () => void; inputRef?: React.RefObject<HTMLInputElement | null> }

function LedgerSheet({ onPick, tender, hold, scan, inputRef, showHeld }: VP) {
  const b = useBill()
  const t = useT()
  const mode = useApp((s) => s.mode)
  const held = useApp((s) => s.held.length)
  const no = useApp((s) => s.published.numbering.find((n) => n.doc === 'Sales invoice'))
  const cost = mode !== 'counter'
  const [recent, setRecent] = useState(false)
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-5 pt-3 pb-2 flex items-center gap-4 flex-wrap border-b border-rule bg-sheet">
        <div><div className="text-xs muted">Sales invoice</div><div className="font-semibold num text-left draft-edge pl-2">{no ? no.prefix + String(no.start).padStart(no.padding, '0') : 'New'}</div></div>
        <div className="text-xs"><div className="muted">Date</div><div>{today().split('-').reverse().join('-')}</div></div>
        <PartyPick />
        <label className="text-xs flex items-center gap-2"><span className="muted">Price category</span><select className="inp w-28"><option>Retail</option><option>Wholesale</option><option>Staff</option></select></label>
        <label className="text-xs flex items-center gap-2"><span className="muted">{t('{salesperson}')}</span><select className="inp w-32"><option>Salim</option><option>Divya</option></select></label>
        <span className="flex-1" />{scan}
        <Btn icon="printer" onClick={() => setRecent(true)}>Recent bills</Btn>
        <Btn icon="pause" onClick={showHeld}>Held ({held})</Btn>
        {recent && <RecentBills onClose={() => setRecent(false)} />}
      </div>
      <div className="px-5 py-2 bg-sheet border-b border-rule"><ItemSearch onPick={onPick} inputRef={inputRef} /></div>
      <div className="flex-1 min-h-0 scroll bg-sheet">
        <table className="tbl">
          <thead><tr><th className="w-10">#</th><th>{t('{item}')}</th><th className="text-right w-24">Qty</th><th className="w-20">Unit</th><th className="text-right w-28">Rate</th><th className="text-right w-20">Disc %</th><th className="text-right w-16">GST</th><th className="text-right w-32">Amount</th>{cost && <th className="text-right w-20">Margin</th>}<th className="w-8" /></tr></thead>
          <tbody>
            {b.bill.lines.map((l, i) => {
              const net = l.qty * l.rate * (1 - l.disc / 100)
              const below = l.rate * (1 - l.disc / 100) < l.cost
              return (
                <tr key={i} onClick={() => select('item', l.itemId)}>
                  <td className="muted">{i + 1}</td>
                  <td><span style={below ? { boxShadow: 'inset 0 -2px 0 var(--haldi)' } : undefined}>{l.name}</span>{below && cost && <span className="text-xs ml-2 muted">Below cost</span>}</td>
                  <td><input aria-label={`Quantity line ${i + 1}`} type="number" className="inp num h-6 text-right" value={l.qty} onChange={(e) => b.qty(i, +e.target.value)} /></td>
                  <td>{l.unit}{l.unit === 'Box' && <span className="text-xs muted ml-1">={l.qty * 6} Pcs</span>}</td>
                  <td className="num">{inr(l.rate)}<RuleMark l={l} /></td>
                  <td><input aria-label={`Discount line ${i + 1}`} type="number" className="inp num h-6 text-right" value={l.disc || ''} placeholder="0" onChange={(e) => b.disc(i, +e.target.value)} /></td>
                  <td className="num">{l.gst}%</td>
                  <td className="num font-medium">{inr(net)}</td>
                  {cost && <td className="num muted">{net ? (((net - l.cost * l.qty) / net) * 100).toFixed(0) + '%' : ''}</td>}
                  <td><button aria-label="Remove line" className="muted hover:text-sindoor" onClick={() => b.remove(i)}><Icon n="x" size={13} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {b.bill.lines.length === 0 && <p className="p-8 text-center text-[13px] muted">Scan a barcode or type above. Enter accepts the first match. Shirts, kurtas and jeans open the size and colour grid.</p>}
      </div>
      <div className="px-5 py-3 bg-sheet border-t border-rule flex items-end justify-between gap-4">
        <div className="flex gap-2"><Btn icon="pause" onClick={hold}>Hold <span className="kbd">F4</span></Btn><Btn icon="trash" kind="danger" disabled={!b.bill.lines.length} onClick={() => { const old = b.bill; b.clear(); toast('Bill cleared.', 'info', () => set({ bill: old })) }}>Clear</Btn></div>
        <Totals />
        <Btn kind="primary" className="btn-lg" disabled={!b.bill.lines.length} onClick={tender}>{t('Save {bill}')} <span className="kbd text-ink">F2</span></Btn>
      </div>
    </div>
  )
}

function Lines({ big }: { big?: boolean }) {
  const b = useBill()
  return (
    <ul className="divide-y divide-rule">
      {b.bill.lines.map((l, i) => (
        <li key={i} className={`flex items-center gap-3 px-4 ${big ? 'py-3' : 'py-2'}`} onClick={() => select('item', l.itemId)}>
          <div className="flex-1 min-w-0"><div className={`${big ? 'text-[15px]' : 'text-[13px]'} truncate`}>{l.name}</div><div className="text-xs muted num text-left">{inr0(l.rate)} × {l.qty}{l.disc ? ` · ${l.disc}% off` : ''}</div></div>
          <div className="flex items-center border border-rule rounded">
            <button aria-label="Decrease" className="size-7 grid place-items-center hover:bg-wash" onClick={() => b.qty(i, l.qty - 1)}><Icon n="minus" size={13} /></button>
            <span className="num w-8 text-center">{l.qty}</span>
            <button aria-label="Increase" className="size-7 grid place-items-center hover:bg-wash" onClick={() => b.qty(i, l.qty + 1)}><Icon n="plus" size={13} /></button>
          </div>
          <span className={`num font-medium ${big ? 'w-28 text-lg' : 'w-20'}`}>{inr0(l.qty * l.rate * (1 - l.disc / 100))}</span>
        </li>
      ))}
    </ul>
  )
}

function ReceiptRail({ onPick, tender, hold, scan }: VP) {
  const b = useBill()
  const t = useT()
  const [cat, setCat] = useState('All')
  const cats = ['All', ...new Set(b.items.map((i) => i.category))]
  const list = b.items.filter((i) => cat === 'All' || i.category === cat)
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
        <div className="flex gap-2 items-center"><div className="flex-1"><ItemSearch onPick={onPick} /></div>{scan}</div>
        <div className="flex gap-1 flex-wrap">{cats.map((x) => <button key={x} aria-pressed={cat === x} onClick={() => setCat(x)} className={`chip h-7 px-3 ${cat === x ? 'bg-neel text-onneel border-neel' : 'bg-sheet'}`}>{x}</button>)}</div>
        <div className="scroll flex-1 panel">
          <table className="tbl"><thead><tr><th>{t('{item}')}</th><th className="text-right">Rate</th><th className="text-right">Stock</th><th className="w-16" /></tr></thead><tbody>
            {list.map((i) => <tr key={i.id} onClick={() => select('item', i.id)}><td>{i.name}</td><td className="num">{inr0(i.rate)}</td><td className="num muted">{Object.values(i.stock).reduce((a, x) => a + x, 0)} {i.unit}</td><td><Btn className="btn-sm" onClick={() => onPick(i)}>Add</Btn></td></tr>)}
          </tbody></table>
        </div>
      </div>
      <div className="w-[340px] shrink-0 border-l border-rule bg-sheet flex flex-col" aria-label="Receipt">
        <div className="px-4 py-3 border-b border-dashed border-rule text-center"><div className="font-semibold">Receipt</div><PartyPick compact /></div>
        <div className="flex-1 scroll"><Lines />{b.bill.lines.length === 0 && <p className="p-6 text-center text-[13px] muted">The receipt builds as you add items.</p>}</div>
        <div className="p-4 border-t border-dashed border-rule space-y-3"><Totals /><div className="flex gap-2"><Btn icon="pause" onClick={hold}>Hold</Btn><Btn kind="primary" className="btn-lg flex-1 justify-center" disabled={!b.bill.lines.length} onClick={tender}>{t('Tender')}</Btn></div></div>
      </div>
    </div>
  )
}

function CounterLane({ onPick, tender, hold, scan, showHeld }: VP) {
  const b = useBill()
  const t = useT()
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-4 flex gap-3 items-center bg-sheet border-b border-rule"><div className="flex-1"><ItemSearch big onPick={onPick} /></div>{scan}<Btn icon="pause" onClick={showHeld}>Held</Btn></div>
        <div className="flex-1 scroll bg-sheet"><Lines big />{b.bill.lines.length === 0 && <div className="p-12 text-center"><Icon n="scan" size={40} className="mx-auto muted" /><p className="mt-3 text-base">Scan the first item</p><p className="text-[13px] muted">Or type a code or name. Enter adds the first match.</p></div>}</div>
      </div>
      <div className="w-[360px] shrink-0 border-l border-rule bg-cotton p-5 flex flex-col gap-4">
        <div className="panel p-3"><PartyPick compact />{b.party.id !== 'c0' && <div className="text-xs mt-2 muted">Last bill 6 days ago. Usually buys sarees and mundu.</div>}</div>
        <div className="flex-1" />
        <Totals big />
        <Btn kind="primary" className="btn-lg h-14 text-lg justify-center" disabled={!b.bill.lines.length} onClick={tender}>{t('Tender')} <span className="kbd text-ink">F6</span></Btn>
        <div className="flex gap-2"><Btn className="flex-1 justify-center" icon="pause" onClick={hold}>Hold <span className="kbd">F4</span></Btn><Btn className="flex-1 justify-center" icon="undo" onClick={() => go('returns')}>Return</Btn></div>
      </div>
    </div>
  )
}

function TilePos({ onPick, tender, hold, scan }: VP) {
  const b = useBill()
  const t = useT()
  const [cat, setCat] = useState('All')
  const [disp, setDisp] = useState(false)
  const cats = ['All', ...new Set(b.items.map((i) => i.category))]
  const list = b.items.filter((i) => cat === 'All' || i.category === cat)
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
        <div className="flex gap-2 items-center"><div className="flex-1"><ItemSearch big onPick={onPick} /></div>{scan}<Btn icon="panel" onClick={() => setDisp(true)}>Customer display</Btn></div>
        <div className="flex gap-1.5 flex-wrap">{cats.map((x) => <button key={x} aria-pressed={cat === x} onClick={() => setCat(x)} className={`chip h-8 px-4 text-[13px] ${cat === x ? 'bg-neel text-onneel border-neel' : 'bg-sheet'}`}>{x}</button>)}</div>
        <div className="scroll flex-1 grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
          {list.map((i) => (
            <button key={i.id} onClick={() => onPick(i)} className="panel p-3 text-left hover:border-neel flex flex-col justify-between min-h-[92px]">
              <span className="text-[13px] font-medium leading-snug line-clamp-2">{i.name}</span>
              <span className="flex justify-between items-end mt-2"><span className="num font-semibold">{inr0(i.rate)}</span><span className="text-[11px] muted">{i.unit}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div className="w-[360px] shrink-0 border-l border-rule bg-sheet flex flex-col">
        <div className="px-4 py-2 border-b border-rule flex justify-between items-center"><span className="font-semibold">Current bill</span><PartyPick compact /></div>
        <div className="flex-1 scroll"><Lines />{b.bill.lines.length === 0 && <p className="p-6 text-center text-[13px] muted">Tap a tile to add it.</p>}</div>
        <div className="p-4 border-t border-rule space-y-3"><Totals /><div className="flex gap-2"><Btn icon="pause" onClick={hold}>Hold</Btn><Btn kind="primary" className="btn-lg h-12 flex-1 justify-center text-base" disabled={!b.bill.lines.length} onClick={tender}>{t('Tender')} {inr0(b.totals.total)}</Btn></div></div>
      </div>
      {disp && <CustomerDisplay onClose={() => setDisp(false)} />}
    </div>
  )
}
export function CustomerDisplay({ onClose }: { onClose: () => void }) {
  const b = useBill()
  const c = useApp((s) => s.draft)
  const br = c.branches[0]
  return (
    <Modal open onClose={onClose} title="Customer display preview" foot={<Btn onClick={onClose}>Close preview</Btn>}>
      <div className="rounded-lg p-4 border border-rule" style={{ background: 'var(--neel)', color: 'var(--on-neel)' }}>
        <div className="text-sm opacity-90">{br.display}</div>
        <div className="mt-2 text-xs opacity-80">{b.bill.lines.length ? '' : br.tagline}</div>
        {b.bill.lines.slice(-4).map((l, i) => <div key={i} className="flex justify-between text-base py-0.5"><span className="truncate">{l.name.slice(0, 28)} × {l.qty}</span><span className="num">{inr0(l.qty * l.rate)}</span></div>)}
        <div className="mt-3 flex justify-between items-baseline border-t border-white/30 pt-2"><span>Total</span><span className="text-4xl font-semibold num">{inr0(b.totals.total)}</span></div>
      </div>
      <p className="text-xs muted mt-2">Mirrors the bill. Shows no cost or staff data. Uses the shop display name and theme.</p>
    </Modal>
  )
}
export { Bal, Status, Field }

function RecentBills({ onClose }: { onClose: () => void }) {
  const inv = useApp((s) => s.invoices)
  const [q, setQ] = useState('')
  const rows = inv.filter((i) => (i.no + i.partyName).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <Modal open onClose={onClose} title="Recent bills" foot={<Btn onClick={onClose}>Close</Btn>}>
      <input aria-label="Search bills" autoFocus className="inp mb-2" placeholder="Search by bill number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="divide-y divide-rule">
        {rows.map((i) => <li key={i.id} className="flex items-center justify-between py-2 text-[13px]"><div><div className="num font-medium">{i.no}</div><div className="text-xs muted">{i.partyName} · {i.date.split('-').reverse().join('-')}</div></div><div className="flex items-center gap-3"><Money v={i.total} /><Btn className="btn-sm" icon="printer" onClick={() => { onClose(); openPrint(i, true) }}>Reprint</Btn></div></li>)}
        {!rows.length && <li className="py-4 text-center muted text-sm">No bill matches "{q}".</li>}
      </ul>
    </Modal>
  )
}
