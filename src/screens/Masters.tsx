import { useState } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import type { FieldDef } from '../lib/config'
import { GODOWNS, type Item, type Party } from '../lib/data'
import { inr, inr0, dmy, today } from '../lib/fmt'
import { HistoryList, logHist, diff, useDraft, DraftNote } from '../ui/History'
import { Btn, DataTable, Drawer, Field, PageHead, Tabs, Bal, Status, Money, useT, Spark, Toggle } from '../ui/kit'
import { Icon } from '../ui/icons'
import { ctx, select } from '../shell/ctx'

export function FieldInput({ f, v, onChange, err }: { f: FieldDef; v: string; onChange: (v: string) => void; err?: string }) {
  return (
    <Field label={f.label} req={f.required} error={err}>
      {f.type === 'select' ? <select className="inp" value={v} aria-invalid={!!err} onChange={(e) => onChange(e.target.value)}><option value="">Choose</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
        : f.type === 'yesno' ? <select className="inp" value={v} onChange={(e) => onChange(e.target.value)}><option value="">Not set</option><option>Yes</option><option>No</option></select>
        : <input className="inp" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={v} aria-invalid={!!err} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}
export function EntityForm({ entity, init, onSave, onCancel, saveLabel, draftKey }: { entity: string; init: Record<string, string>; onSave: (v: Record<string, string>) => void; onCancel: () => void; saveLabel: string; draftKey?: string }) {
  const fields = useApp((s) => s.draft.fields[entity] ?? []).filter((f) => f.visible)
  const [v, setV] = useState(init)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const dr = useDraft(draftKey ?? '', v, setV, init)
  const submit = () => {
    const e: Record<string, string> = {}
    fields.forEach((f) => { if (f.required && !(v[f.id] ?? '').trim()) e[f.id] = `${f.label} is required.` })
    if (v.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin)) e.gstin = 'GSTIN should be 15 characters, like 32AABCM4417K1ZP.'
    if (v.hsn && !/^\d{4,8}$/.test(v.hsn)) e.hsn = 'HSN is 4 to 8 digits.'
    setErrs(e)
    if (Object.keys(e).length) return toast('Some fields need attention.', 'err')
    if (draftKey) dr.clear()
    onSave(v)
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-3">
      {fields.map((f) => <FieldInput key={f.id} f={f} v={v[f.id] ?? ''} onChange={(x) => setV({ ...v, [f.id]: x })} err={errs[f.id]} />)}
      {draftKey && <DraftNote at={dr.at} restored={dr.restored} onDiscard={() => { dr.clear(); setV(init) }} />}
      <div className="flex justify-end gap-2 pt-2"><Btn onClick={() => { if (draftKey) dr.clear(); onCancel() }}>Cancel</Btn><Btn kind="primary" type="submit">{saveLabel}</Btn></div>
    </form>
  )
}

const stockOf = (i: Item) => Object.values(i.stock).reduce((a, b) => a + b, 0)

export function ItemMaster() {
  const items = useApp((s) => s.items)
  const t = useT()
  const pack = useApp((s) => s.draft.pack)
  const iLayout = useApp((s) => s.draft.layouts.items)
  const [open, setOpen] = useState<string | null>(null)
  const [tab, setTab] = useState('identity')
  const cur = items.find((i) => i.id === open)
  const val = (i: Item): Record<string, string> => ({ name: i.name, hsn: i.hsn, gst: String(i.gst), unit: i.unit, mrp: String(i.mrp), ...(i.extra ?? {}) })
  const save = (id: string | 'new', v: Record<string, string>) => {
    const base = { name: v.name, hsn: v.hsn, gst: +v.gst, unit: v.unit || 'Pcs', mrp: +v.mrp || 0 }
    const extra: Record<string, string> = {}
    Object.keys(v).forEach((k) => { if (!['name', 'hsn', 'gst', 'unit', 'mrp'].includes(k)) extra[k] = v[k] })
    if (id === 'new') {
      const it: Item = { id: 'i' + Date.now(), code: 'NEW-' + String(items.length + 1).padStart(4, '0'), barcode: '8901' + Date.now().toString().slice(-9), rate: base.mrp, cost: Math.round(base.mrp * 0.65), stock: { show: 0, god: 0, kkd: 0 }, reorder: 0, brand: '-', category: 'General', supplierId: 's1', ...base, extra }
      set({ items: [it, ...items] }); logHist('items', it.id, 'Created', [['Name', '', it.name], ['MRP', '', String(it.mrp)]]); toast(`${it.name} added with code ${it.code}.`)
    } else { const before = items.find((i) => i.id === id); if (before) { const d = diff(val(before), v, { name: 'Name', hsn: 'HSN', gst: 'GST %', unit: 'Unit', mrp: 'MRP' }); if (d.length) logHist('items', id, 'Edited', d) } set({ items: items.map((i) => (i.id === id ? { ...i, ...base, extra: { ...i.extra, ...extra } } : i)) }); toast('Changes saved. A new revision is in the item history.') }
    setOpen(null)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title={`${t('{item}')} master`} sub="Identity, units, tax, barcodes and stock in one record. Fields follow your Admin Studio form design." crumbs={['Stock', `${t('{item}')} master`]}>
        <Btn needs="C" kind="primary" icon="plus" onClick={() => { setOpen('new'); setTab('identity') }}>New {t('{item}').toLowerCase()}</Btn>
      </PageHead>
      {iLayout === 'cards' ? (
        <div className="flex-1 scroll px-5 pb-6 grid gap-3 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))' }}>
          {items.map((r) => (
            <button key={r.id} onClick={() => { setOpen(r.id); setTab('identity'); select('item', r.id) }} className="panel p-3 text-left hover:border-neel">
              <div className="text-xs muted">{r.code} · {r.category}</div>
              <div className="font-medium text-[14px] mt-0.5">{r.name}</div>
              <div className="flex justify-between mt-2 text-[13px]"><span>{inr0(r.rate)}</span><span className={stockOf(r) < r.reorder ? 'text-red-700' : 'muted'}>{stockOf(r)} {r.unit}</span></div>
              <div className="text-xs muted mt-1">GST {r.gst}%{stockOf(r) < r.reorder ? ' · below reorder' : ''}</div>
            </button>))}
        </div>
      ) : (
      <DataTable name={t('{items}').toLowerCase()} rows={items} onOpen={(r) => { setOpen(r.id); setTab('identity'); select('item', r.id) }} filter={{ label: 'Category', get: (r) => r.category, opts: [...new Set(items.map((i) => i.category))] }}
        bulk={[{ label: 'Raise rates 5%', icon: 'trend', run: (ids) => { items.filter((i) => ids.includes(i.id)).forEach((i) => logHist('items', i.id, 'Rate raised 5% in bulk', [['Rate', String(i.rate), String(Math.round(i.rate * 1.05))]])); set({ items: items.map((i) => (ids.includes(i.id) ? { ...i, rate: Math.round(i.rate * 1.05) } : i)) }); toast(`Rates raised for ${ids.length} ${t('{items}').toLowerCase()}.`) } }]}
        cols={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'brand', label: 'Brand' }, { key: 'category', label: 'Category' }, { key: 'hsn', label: 'HSN', off: true }, { key: 'gst', label: 'GST %', num: true, render: (r) => r.gst + '%' }, { key: 'rate', label: 'Rate', num: true, render: (r) => inr0(r.rate) }, { key: 'stock', label: 'Stock', num: true, get: stockOf, render: (r) => `${stockOf(r)} ${r.unit}` }]} />
      )}
      <Drawer wide open={!!open} onClose={() => setOpen(null)} title={open === 'new' ? `New ${t('{item}').toLowerCase()}` : cur?.name ?? ''}>
        {open === 'new' ? <EntityForm entity="item" draftKey="item-new" init={{ gst: '5', unit: 'Pcs' }} onSave={(v) => save('new', v)} onCancel={() => setOpen(null)} saveLabel="Create item" />
          : cur && (
            <div className="-m-5">
              <Tabs value={tab} onChange={setTab} tabs={[{ id: 'identity', label: 'Identity' }, { id: 'units', label: 'Units' }, { id: 'variants', label: 'Variants' }, { id: 'stock', label: 'Stock' }, { id: 'history', label: 'History' }, ...(pack === 'textile' ? [{ id: 'rolls', label: 'Rolls' }] : [])]} />
              <div className="p-5">
                {tab === 'identity' && <EntityForm entity="item" init={val(cur)} onSave={(v) => save(cur.id, v)} onCancel={() => setOpen(null)} saveLabel="Save changes" />}
                {tab === 'units' && <Units it={cur} />}
                {tab === 'variants' && <Matrix it={cur} />}
                {tab === 'stock' && <div className="space-y-2">{GODOWNS.map((g) => <div key={g.id} className="flex justify-between border-b border-rule py-1.5"><span>{g.name}</span><span className="num">{cur.stock[g.id]} {cur.unit}</span></div>)}<div className="flex justify-between font-medium py-1"><span>Total</span><span className="num">{stockOf(cur)} {cur.unit}</span></div><p className="text-xs muted">Barcode {cur.barcode}. Reorder level {cur.reorder}.</p></div>}
                {tab === 'rolls' && <Rolls it={cur} />}
                {tab === 'history' && <HistoryList kind="items" id={cur.id} first={{ at: 'Before history was kept', by: 'Opening data', what: `Opening record, rate ${cur.rate}` }} />}
              </div>
            </div>
          )}
      </Drawer>
    </div>
  )
}
function Units({ it }: { it: Item }) {
  const [u, setU] = useState([{ n: it.unit, f: 1, s: true, p: true }, { n: 'Box', f: 6, s: false, p: true }, { n: 'Dozen', f: 12, s: false, p: false }])
  return (
    <div>
      <table className="tbl"><thead><tr><th>Unit</th><th className="text-right">= {it.unit}</th><th>Sale</th><th>Purchase</th><th /></tr></thead><tbody>
        {u.map((x, i) => <tr key={i}><td><input className="inp h-7" aria-label="Unit name" value={x.n} onChange={(e) => setU(u.map((y, k) => (k === i ? { ...y, n: e.target.value } : y)))} /></td><td><input type="number" className="inp num h-7 text-right" aria-label="Factor" disabled={i === 0} value={x.f} onChange={(e) => setU(u.map((y, k) => (k === i ? { ...y, f: +e.target.value } : y)))} /></td><td><input type="radio" name="s" checked={x.s} onChange={() => setU(u.map((y, k) => ({ ...y, s: k === i })))} aria-label="Default sale unit" /></td><td><input type="radio" name="p" checked={x.p} onChange={() => setU(u.map((y, k) => ({ ...y, p: k === i })))} aria-label="Default purchase unit" /></td><td>{i > 0 && <button aria-label="Remove unit" onClick={() => setU(u.filter((_, k) => k !== i))}><Icon n="x" size={13} /></button>}</td></tr>)}
      </tbody></table>
      <Btn className="btn-sm mt-2" icon="plus" disabled={u.length >= 12} onClick={() => setU([...u, { n: '', f: 1, s: false, p: false }])}>Add unit ({u.length} of 12)</Btn>
      <p className="text-xs muted mt-2">Up to 12 units per item. Billing converts automatically and shows the converted quantity.</p>
    </div>
  )
}
function Matrix({ it }: { it: Item }) {
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'], cols = ['Indigo', 'White', 'Mustard', 'Charcoal']
  const [m, setM] = useState<Record<string, string>>(() => Object.fromEntries(cols.flatMap((c, ci) => sizes.map((s, si) => [`${c}|${s}`, String(it.rate + si * 50)]))))
  return (
    <div>
      <div className="flex gap-2 mb-2"><Btn className="btn-sm" onClick={() => { const f = m['Indigo|S']; setM(Object.fromEntries(Object.keys(m).map((k) => [k, f]))) }}>Fill all from first cell</Btn><Btn className="btn-sm" onClick={() => { const o = { ...m }; sizes.forEach((s) => { cols.forEach((c) => (o[`${c}|${s}`] = m[`Indigo|${s}`])) }); setM(o) }}>Fill down</Btn></div>
      <table className="tbl"><thead><tr><th>Colour</th>{sizes.map((s) => <th key={s} className="text-right">{s}</th>)}</tr></thead><tbody>{cols.map((c) => <tr key={c}><td className="font-medium">{c}</td>{sizes.map((s) => <td key={s} className="p-1"><input aria-label={`${c} ${s} price`} className="inp num h-7 text-right w-20" value={m[`${c}|${s}`]} onChange={(e) => setM({ ...m, [`${c}|${s}`]: e.target.value })} /></td>)}</tr>)}</tbody></table>
      <p className="text-xs muted mt-2">Cells hold selling price here. Code, barcode and reorder level can be switched on per cell. {cols.length * sizes.length} variants will be created.</p>
      <Btn kind="primary" className="mt-2" onClick={() => toast(`${cols.length * sizes.length} variants saved for ${it.code}.`)}>Save variants</Btn>
    </div>
  )
}
function Rolls({ it }: { it: Item }) {
  const [rolls, setRolls] = useState([{ no: 'R-2210', len: 48, left: 31.5 }, { no: 'R-2214', len: 50, left: 50 }, { no: 'R-2198', len: 46, left: 8.25 }])
  const [cut, setCut] = useState('')
  return (
    <div>
      <table className="tbl"><thead><tr><th>Roll</th><th className="text-right">Length (m)</th><th className="text-right">Remaining (m)</th><th /></tr></thead><tbody>{rolls.map((r, i) => <tr key={r.no}><td>{r.no}</td><td className="num">{r.len}</td><td className="num">{r.left}</td><td><Btn className="btn-sm" disabled={!+cut || +cut > r.left} onClick={() => { setRolls(rolls.map((x, k) => (k === i ? { ...x, left: +(x.left - +cut).toFixed(2) } : x))); toast(`Cut ${cut} m from ${r.no}. ${(r.left - +cut).toFixed(2)} m left.`); setCut('') }}>Cut</Btn></td></tr>)}</tbody></table>
      <div className="mt-3 max-w-48"><Field label="Cut length (m)"><input className="inp num" type="number" value={cut} onChange={(e) => setCut(e.target.value)} /></Field></div>
      <p className="text-xs muted mt-2">Provisional design: roll and cut handling is still marked [CONFIRM] in the SRS. {it.name.slice(0, 0)}</p>
    </div>
  )
}

export function StockOnHand() {
  const items = useApp((s) => s.items)
  const layout = useApp((s) => s.draft.layouts.stock)
  const t = useT()
  if (layout === 'cards') return (
    <div className="flex-1 scroll">
      <PageHead title="Stock on hand" sub={`Card view, set in Admin Studio under Layouts. ${items.length} ${t('{items}').toLowerCase()}.`} crumbs={['Stock']} />
      <div className="px-5 pb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>
        {items.map((i) => { const q = stockOf(i), low = q < i.reorder; return (
          <button key={i.id} onClick={() => select('item', i.id)} className="panel p-3 text-left hover:border-neel">
            <div className="text-[13px] font-medium leading-snug line-clamp-2 min-h-9">{i.name}</div>
            <div className="flex items-baseline justify-between mt-2"><span className="text-2xl font-semibold num">{q}<span className="text-xs muted ml-1">{i.unit}</span></span>{low ? <Status s="Reorder" /> : <span className="text-xs muted">OK</span>}</div>
            <div className="grid grid-cols-3 gap-1 text-[11px] muted mt-2">{GODOWNS.map((g) => <div key={g.id}><div className="truncate">{g.name.split(' ')[1]}</div><div className="num text-left text-ink">{i.stock[g.id]}</div></div>)}</div>
          </button>) })}
      </div>
    </div>
  )
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Stock on hand" sub={`By ${t('{godown}').toLowerCase()}. Click a row and the Margin shows its history and rate.`} crumbs={['Stock']} />
      <DataTable name={t('{items}').toLowerCase()} rows={items} onOpen={(r) => select('item', r.id)} filter={{ label: 'Status', get: (r) => (stockOf(r) < r.reorder ? 'Below reorder' : 'OK'), opts: ['Below reorder', 'OK'] }}
        cols={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, ...GODOWNS.map((g) => ({ key: g.id, label: g.name, num: true, get: (r: Item) => r.stock[g.id] })), { key: 'tot', label: 'Total', num: true, get: stockOf }, { key: 'value', label: 'Value at cost', num: true, total: true, get: (r: Item) => stockOf(r) * r.cost, render: (r: Item) => inr0(stockOf(r) * r.cost) }, { key: 'st', label: 'State', get: (r: Item) => (stockOf(r) < r.reorder ? 'Reorder' : 'OK'), render: (r: Item) => (stockOf(r) < r.reorder ? <Status s="Reorder" /> : <span className="muted text-xs">OK</span>) }]} />
    </div>
  )
}

/* Party 360 */
export function Parties() {
  const s = useApp((x) => x)
  const t = useT()
  const sel = ctx.use((x) => x.id)
  const layout = s.draft.layouts.party
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState('timeline')
  const p = s.parties.find((x) => x.id === sel && s.parties.some((y) => y.id === sel))
  const list = s.parties.filter((x) => x.id !== 'c0')
  const open = (id: string) => { ctx.set({ kind: 'party', id }); setTab('timeline') }
  return (
    <div className="flex-1 min-h-0 flex">
      <div className={`${p ? 'w-[380px] border-r border-rule' : 'flex-1'} shrink-0 min-h-0 flex flex-col`}>
        <PageHead title={`${t('{customer}')} and ${t('{supplier}').toLowerCase()} 360`} crumbs={['People']}><Btn needs="C" kind="primary" icon="plus" onClick={() => setAdding(true)}>New party</Btn></PageHead>
        {layout === 'cards' ? (
          <div className="scroll flex-1 px-5 pb-5 grid gap-3 content-start" style={{ gridTemplateColumns: p ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {list.map((x) => <button key={x.id} onClick={() => open(x.id)} aria-pressed={x.id === sel} className={`panel p-3 text-left hover:border-neel ${x.id === sel ? 'border-neel' : ''}`}><div className="font-medium">{x.name}</div><div className="text-xs muted">{x.city} · {x.kind === 'customer' ? t('{customer}') : t('{supplier}')}</div><div className="mt-2"><Bal v={x.balance} ctx="dues" party /></div></button>)}
          </div>
        ) : (
          <DataTable name="parties" rows={list} onOpen={(r) => open(r.id)} filter={{ label: 'Type', get: (r) => (r.kind === 'customer' ? t('{customer}') : t('{supplier}')), opts: [t('{customer}'), t('{supplier}')] }} pageSize={p ? 9 : 12}
            cols={[{ key: 'name', label: 'Name' }, { key: 'city', label: 'City', off: !!p }, { key: 'phone', label: 'Mobile', off: true }, { key: 'balance', label: 'Balance', num: true, render: (r) => <Bal v={r.balance} ctx="dues" party />, get: (r) => r.balance }, { key: 'risk', label: 'Risk', off: !!p, render: (r) => (r.risk === 'high' ? <Status s="High" /> : <span className="text-xs muted capitalize">{r.risk}</span>) }]} />
        )}
      </div>
      {p && <Party360 p={p} tab={tab} setTab={setTab} />}
      <Drawer open={adding} onClose={() => setAdding(false)} title="New party">
        <EntityForm entity="party" draftKey="party-new" init={{}} saveLabel="Create party" onCancel={() => setAdding(false)} onSave={(v) => {
          const np: Party = { id: 'c' + Date.now(), name: v.name, kind: 'customer', city: v.city ?? '', phone: v.phone ?? '', gstin: v.gstin ?? '', balance: 0, limit: +(v.limit ?? 0), risk: 'low', lastPay: '', overdueDays: 0, consent: v.consent === 'Yes', extra: v }
          set({ parties: [...s.parties, np] }); logHist('parties', np.id, 'Created', [['Name', '', np.name]]); setAdding(false); open(np.id); toast(`${np.name} created. Party 360 is open.`)
        }} />
      </Drawer>
    </div>
  )
}
function Party360({ p, tab, setTab }: { p: Party; tab: string; setTab: (t: string) => void }) {
  const s = useApp((x) => x)
  const t = useT()
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<string[]>([])
  const inv = s.invoices.filter((i) => i.partyId === p.id)
  const vch = s.vouchers.filter((v) => v.lines.some((l) => l.ledger === p.name))
  const events = [...inv.map((i) => ({ d: i.date, k: 'Invoice', text: `${i.no} for ${inr0(i.total)}`, tone: '' })), ...vch.map((v) => ({ d: v.date, k: 'Payment', text: `${v.no} ${v.narration}`, tone: 'ok' })), ...(p.consent ? [{ d: p.lastPay || today(), k: 'WhatsApp', text: 'Statement shared (delivery simulated)', tone: '' }] : []), ...(p.overdueDays > 30 ? [{ d: today(), k: 'Task', text: 'Call to collect promise-to-pay', tone: 'warn' }] : [])].sort((a, b) => b.d.localeCompare(a.d))
  const pct = p.limit ? Math.min(100, (Math.max(0, p.balance) / p.limit) * 100) : 0
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-cotton">
      <div className="px-5 pt-4 pb-3 bg-sheet border-b border-rule">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><button className="text-xs muted" onClick={() => ctx.set({ id: '' })}>Back to list</button><h2 className="text-xl font-semibold">{p.name}</h2><div className="text-xs muted">{p.city} · {p.phone} {p.gstin && `· ${p.gstin}`}</div></div>
          <div className="text-right"><div className="text-xs muted">Balance</div><div className="text-2xl"><Bal v={p.balance} ctx="dues" party /></div></div>
        </div>
        <div className="flex items-center gap-6 mt-3 flex-wrap">
          {p.limit > 0 && <div className="w-56"><div className="flex justify-between text-xs"><span className="muted">Credit limit</span><span className="num">{inr0(p.limit)}</span></div><div className="h-1.5 bg-wash rounded mt-1"><div className="h-full rounded" style={{ width: pct + '%', background: pct >= 100 ? 'var(--sindoor)' : 'var(--neel)' }} /></div></div>}
          <div className="text-xs"><span className="muted">Risk </span><span className="capitalize font-medium">{p.risk}</span>{p.risk === 'high' && <span>, {p.overdueDays} days overdue</span>}</div>
          <div className="text-xs"><span className="muted">WhatsApp </span>{p.consent ? 'Opted in' : 'No consent'}</div>
          <span className="flex-1" />
          <Btn onClick={() => { const amt = Math.min(Math.max(0, p.balance), 10000); if (!amt) return toast('Nothing is owed.', 'info'); logHist('parties', p.id, 'Quick receipt posted', [['Balance', String(p.balance), String(p.balance - amt)]]); set((x) => ({ parties: x.parties.map((y) => (y.id === p.id ? { ...y, balance: y.balance - amt, overdueDays: 0 } : y)), vouchers: [{ id: 'v' + Date.now(), no: 'RV-QUICK', type: 'Receipt', date: today(), narration: 'Quick receipt from Party 360', status: 'posted', by: 'Rekha (accountant)', lines: [{ ledger: 'Cash in hand', dr: amt, cr: 0 }, { ledger: p.name, dr: 0, cr: amt }] }, ...x.vouchers] })); toast(`Receipt of ${inr0(amt)} posted. Balance updated.`) }}>Receive payment</Btn>
          <Btn kind="primary" onClick={() => go('billing')}>New bill</Btn>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'timeline', label: 'Timeline', badge: events.length }, { id: 'bills', label: 'Outstanding bills' }, { id: 'bought', label: `${t('{items}')} bought` }, { id: 'notes', label: 'Notes' }, { id: 'history', label: 'Change history' }]} />
      <div className="flex-1 scroll p-5">
        {tab === 'timeline' && <ol className="space-y-0 max-w-2xl">{events.length === 0 && <li className="muted text-[13px]">No activity yet. Create a bill or log a call.</li>}{events.map((e, i) => <li key={i} className="flex gap-3 pb-3"><span className="text-xs muted w-16 pt-0.5">{dmy(e.d)}</span><span className={`size-2 rounded-full mt-1.5 ${e.tone === 'ok' ? 'bg-mehndi' : e.tone === 'warn' ? 'bg-haldi' : 'bg-neel'}`} /><div className="text-[13px]"><span className="chip mr-2">{e.k}</span>{e.text}</div></li>)}</ol>}
        {tab === 'history' && <HistoryList kind="parties" id={p.id} />}
        {tab === 'bills' && <table className="tbl panel"><thead><tr><th>Bill</th><th>Date</th><th className="text-right">Total</th><th className="text-right">Due</th><th /></tr></thead><tbody>{inv.filter((i) => i.total > i.paid && i.status === 'posted').map((i) => <tr key={i.id}><td className="num text-left">{i.no}</td><td>{dmy(i.date)}</td><td className="num">{inr0(i.total)}</td><td className="num">{inr0(i.total - i.paid)}</td><td><Status s={Date.now() - new Date(i.date).getTime() > 6 * 864e5 ? 'Overdue' : 'Open'} /></td></tr>)}</tbody></table>}
        {tab === 'bought' && <table className="tbl panel"><tbody>{[...new Set(inv.flatMap((i) => i.lines.map((l) => l.name)))].map((n) => <tr key={n}><td>{n}</td></tr>)}</tbody></table>}
        {tab === 'notes' && <div className="max-w-xl space-y-2"><div className="flex gap-2"><input className="inp" aria-label="Add note" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} /><Btn kind="primary" disabled={!note} onClick={() => { setNotes([note, ...notes]); setNote('') }}>Add</Btn></div>{notes.map((n, i) => <div key={i} className="panel p-2 text-[13px]">{n}</div>)}</div>}
      </div>
    </div>
  )
}
export { Money, Spark, Toggle }
