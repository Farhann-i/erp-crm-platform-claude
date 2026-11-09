import { useState, useMemo } from 'react'
import { useApp, set, toast } from '../lib/app'
import { inr0, today } from '../lib/fmt'
import { Btn, PageHead, Field, Tabs, Empty } from '../ui/kit'

type Row = Record<string, string | number>
const EMPTY: Row[] = []
const useRows = (k: string) => useApp((s) => s.rows[k]) ?? EMPTY
const put = (k: string, fn: (r: Row[]) => Row[]) => set((s) => ({ rows: { ...s.rows, [k]: fn(s.rows[k] ?? []) } }))
const uid = (p: string) => p + Date.now().toString(36) + Math.floor(Math.random() * 99)
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-sm muted max-w-2xl">{children}</p>

/* ---------- Restaurant ---------- */
interface Dish { n: string; p: number; st: 'Kitchen' | 'Tandoor' | 'Bar'; ing: [string, number][] }
const DISHES: Dish[] = [
  { n: 'Chicken biriyani', p: 220, st: 'Kitchen', ing: [['Rice (kg)', 0.15], ['Chicken (kg)', 0.2]] }, { n: 'Tandoori chicken', p: 320, st: 'Tandoor', ing: [['Chicken (kg)', 0.35]] },
  { n: 'Butter naan', p: 40, st: 'Tandoor', ing: [['Flour (kg)', 0.1]] }, { n: 'Veg fried rice', p: 150, st: 'Kitchen', ing: [['Rice (kg)', 0.15]] },
  { n: 'Fresh lime', p: 45, st: 'Bar', ing: [['Lime (nos)', 2]] }, { n: 'Filter coffee', p: 30, st: 'Bar', ing: [['Milk (l)', 0.15]] },
]
const STOCK0: [string, number][] = [['Rice (kg)', 20], ['Chicken (kg)', 12], ['Flour (kg)', 15], ['Lime (nos)', 60], ['Milk (l)', 20]]
const TABLES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
const MODES: Record<string, { label: string; charge: (sub: number) => number; why: string }> = {
  dine: { label: 'Dine-in', charge: (s) => Math.round(s * 0.05), why: 'Service charge 5%' }, take: { label: 'Takeaway', charge: () => 10, why: 'Packing charge' }, del: { label: 'Delivery', charge: () => 30, why: 'Delivery fee' },
}
function Restaurant() {
  const orders = useRows('rorders'), tickets = useRows('ktickets'), off = useRows('soldout'), ing = useRows('ingstock'), sales = useRows('rsales')
  const [t, setT] = useState('T1'), [mode, setMode] = useState('dine'), [note, setNote] = useState(''), [happy, setHappy] = useState(false), [mv, setMv] = useState('')
  const stock = (k: string) => +(ing.find((r) => r.id === k)?.qty ?? STOCK0.find((x) => x[0] === k)![1])
  const lines = orders.filter((o) => o.table === t)
  const price = (d: Dish) => (happy && d.st === 'Bar' ? Math.round(d.p * 0.8) : d.p)
  const sub = lines.reduce((a, l) => a + +l.price * +l.qty, 0), svc = lines.length ? MODES[mode].charge(sub) : 0, gst = Math.round((sub + svc) * 0.05)
  const add = (d: Dish) => put('rorders', (o) => { const i = o.findIndex((x) => x.table === t && x.dish === d.n && x.note === note && !x.sent); return i >= 0 ? o.map((x, k) => (k === i ? { ...x, qty: +x.qty + 1 } : x)) : [...o, { id: uid('o'), table: t, dish: d.n, qty: 1, price: price(d), note, sent: 0, course: 1 }] })
  const send = () => { const fresh = lines.filter((l) => !l.sent); const by: Record<string, string[]> = {}; fresh.forEach((l) => { const st = DISHES.find((d) => d.n === l.dish)!.st; (by[st] ??= []).push(`${l.qty}× ${l.dish}${l.note ? ` (${l.note})` : ''}`) })
    put('ktickets', (k) => [...Object.entries(by).map(([st, it]) => ({ id: uid('k'), table: t, station: st, items: it.join('; '), status: 'New' })), ...k]); put('rorders', (o) => o.map((x) => (x.table === t && !x.sent ? { ...x, sent: 1 } : x))); toast(`Sent to ${Object.keys(by).join(' and ')}.`) }
  const settle = () => {
    const use: Record<string, number> = {}; lines.forEach((l) => DISHES.find((d) => d.n === l.dish)!.ing.forEach(([k, q]) => { use[k] = (use[k] ?? 0) + q * +l.qty }))
    put('ingstock', () => STOCK0.map(([k]) => ({ id: k, qty: +(stock(k) - (use[k] ?? 0)).toFixed(2) }))); put('rsales', (s) => [{ id: uid('s'), table: t, mode: MODES[mode].label, total: sub + svc + gst, at: today() }, ...s]); put('rorders', (o) => o.filter((x) => x.table !== t)); toast(`${t} settled for ${inr0(sub + svc + gst)}. Ingredient stock reduced.`) }
  const move = () => { if (!mv || mv === t) return; put('rorders', (o) => o.map((x) => (x.table === t ? { ...x, table: mv } : x))); toast(`${t} moved to ${mv}${orders.some((x) => x.table === mv) ? ' and merged with its open order' : ''}.`); setT(mv); setMv('') }
  return <div className="grid xl:grid-cols-[1fr_340px] gap-5 max-w-6xl">
    <div className="space-y-3"><Note>Pick a table, tap dishes, send to the kitchen, then settle. Settling reduces ingredient stock using each dish's recipe. Service, packing and delivery charges follow the order type.</Note>
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Tables">{TABLES.map((x) => { const n = orders.filter((o) => o.table === x).length; return <button key={x} aria-pressed={t === x} onClick={() => setT(x)} className={`panel px-3 py-2 min-w-16 text-left ${t === x ? 'border-neel ring-1 ring-neel' : ''}`}><div className="font-medium">{x}</div><div className="text-[11px] muted">{n ? `${n} lines` : 'Free'}</div></button> })}</div>
      <div className="flex gap-3 items-end flex-wrap"><Field label="Note for kitchen"><input className="inp w-56" placeholder="Less spicy, extra cheese" value={note} onChange={(e) => setNote(e.target.value)} /></Field><label className="text-[13px] flex items-center gap-2"><input type="checkbox" checked={happy} onChange={(e) => setHappy(e.target.checked)} />Happy hour: drinks 20% off</label></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{DISHES.map((d) => { const out = off.some((x) => x.id === d.n) || d.ing.some(([k, q]) => stock(k) < q); return <button key={d.n} disabled={out} onClick={() => add(d)} className="panel p-3 text-left hover:bg-wash disabled:opacity-50"><div className="text-[13px] font-medium">{d.n}</div><div className="text-xs muted">{d.st} · {inr0(price(d))}</div>{out && <div className="text-xs text-sindoor">{off.some((x) => x.id === d.n) ? 'Sold out' : 'Low ingredients'}</div>}</button> })}</div>
      <details className="panel p-3 text-[13px]"><summary className="cursor-pointer">Availability and ingredient stock</summary><div className="grid sm:grid-cols-2 gap-4 mt-2"><div className="space-y-1">{DISHES.map((d) => <label key={d.n} className="flex items-center gap-2"><input type="checkbox" checked={off.some((x) => x.id === d.n)} onChange={() => put('soldout', (s) => (s.some((x) => x.id === d.n) ? s.filter((x) => x.id !== d.n) : [...s, { id: d.n }]))} />Sold out: {d.n}</label>)}</div><div className="space-y-1">{STOCK0.map(([k]) => <div key={k} className="flex justify-between"><span>{k}</span><span className={`num ${stock(k) < 2 ? 'text-sindoor' : ''}`}>{stock(k)}</span></div>)}</div></div></details></div>
    <div className="space-y-3"><div className="panel p-3 space-y-2"><div className="flex justify-between items-center"><b>{t}</b><select aria-label="Order type" className="inp h-8 w-32" value={mode} onChange={(e) => setMode(e.target.value)}>{Object.entries(MODES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select></div>
      {lines.length === 0 ? <p className="text-xs muted">No order on {t}. Tap a dish.</p> : lines.map((l) => <div key={String(l.id)} className="text-[13px] flex justify-between gap-2"><span>{l.qty}× {l.dish}{l.note ? <span className="muted"> ({l.note})</span> : null}{l.sent ? <span className="chip ml-1">Sent</span> : null}</span><span className="num">{inr0(+l.price * +l.qty)}</span></div>)}
      {lines.length > 0 && <div className="border-t border-rule pt-2 text-[13px] space-y-0.5"><div className="flex justify-between"><span>Items</span><span className="num">{inr0(sub)}</span></div><div className="flex justify-between"><span>{MODES[mode].why}</span><span className="num">{inr0(svc)}</span></div><div className="flex justify-between"><span>GST 5%</span><span className="num">{inr0(gst)}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span className="num">{inr0(sub + svc + gst)}</span></div></div>}
      <div className="flex gap-2"><Btn disabled={!lines.some((l) => !l.sent)} onClick={send}>Send to kitchen</Btn><Btn kind="primary" disabled={!lines.length} onClick={settle}>Settle</Btn></div>
      <div className="flex gap-2 items-center"><select aria-label="Move to table" className="inp h-8" value={mv} onChange={(e) => setMv(e.target.value)}><option value="">Move or merge into…</option>{TABLES.filter((x) => x !== t).map((x) => <option key={x}>{x}</option>)}</select><Btn disabled={!mv || !lines.length} onClick={move}>Move</Btn></div></div>
      {sales.length > 0 && <div className="text-xs muted">Settled today: {sales.length} bills, {inr0(sales.reduce((a, s) => a + +s.total, 0))}</div>}
      <div className="text-xs muted">GST at 5% without input credit; confirm service charge treatment with your accountant.</div></div></div>
}
function Kitchen() {
  const tk = useRows('ktickets'), [st, setSt] = useState('Kitchen')
  const list = tk.filter((k) => k.station === st && k.status !== 'Served')
  return <div className="max-w-3xl space-y-3"><Note>Each station sees only its own tickets. Move a ticket from New to Ready, then Served when the waiter takes it.</Note>
    <div className="flex gap-1.5" role="group" aria-label="Station">{['Kitchen', 'Tandoor', 'Bar'].map((s) => <button key={s} aria-pressed={st === s} onClick={() => setSt(s)} className={`panel px-3 py-1.5 text-[13px] ${st === s ? 'border-neel ring-1 ring-neel' : ''}`}>{s} ({tk.filter((k) => k.station === s && k.status !== 'Served').length})</button>)}</div>
    {list.length === 0 ? <Empty text={`No open tickets for ${st}. Send an order from the Restaurant desk.`} /> : <div className="grid sm:grid-cols-2 gap-3">{list.map((k) => <div key={String(k.id)} className="panel p-3 space-y-1"><div className="flex justify-between"><b>{k.table}</b><span className="chip">{k.status}</span></div><div className="text-[13px]">{k.items}</div><Btn className="btn-sm" kind="primary" onClick={() => put('ktickets', (a) => a.map((x) => (x.id === k.id ? { ...x, status: k.status === 'New' ? 'Ready' : 'Served' } : x)))}>{k.status === 'New' ? 'Mark ready' : 'Mark served'}</Btn></div>)}</div>}</div>
}

/* ---------- Supermarket ---------- */
const PLU = [['4011', 'Banana (kg)', 58], ['4093', 'Tomato (kg)', 42], ['4160', 'Onion (kg)', 36], ['9001', 'Matta rice loose (kg)', 64]] as const
function Weigh() {
  const [plu, setPlu] = useState('4011'), [w, setW] = useState('0.750'), p = PLU.find((x) => x[0] === plu)
  return <div className="max-w-md space-y-3"><Note>Type the PLU code and the weight from the scale. The price is worked out and a label is ready to print. A real scale needs a hardware test; here the weight is typed.</Note>
    <div className="panel p-3 grid grid-cols-2 gap-2"><Field label="PLU code"><input className="inp num" aria-label="PLU code" value={plu} onChange={(e) => setPlu(e.target.value)} list="plus" /></Field><datalist id="plus">{PLU.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</datalist><Field label="Weight (kg)"><input className="inp num" type="number" step="0.005" value={w} onChange={(e) => setW(e.target.value)} /></Field></div>
    {!p ? <p role="alert" className="text-xs text-sindoor">PLU {plu} is not in the list.</p> : <div className="panel p-4 text-center space-y-1 font-mono" aria-label="Label preview"><div className="font-semibold">{p[1]}</div><div className="text-xs">{w} kg × ₹{p[2]}/kg</div><div className="text-xl font-bold">{inr0(Math.round(+w * p[2] * 100) / 100)}</div><div className="text-[10px] tracking-[0.3em]">||| || ||| | ||| {plu}</div><div className="text-[10px]">Packed {today()}</div></div>}</div>
}
function Offers() {
  const items = useApp((s) => s.items).slice(0, 6), [cart, setCart] = useState<Record<string, number>>({}), [rule, setRule] = useState('b2g1')
  const lines = items.filter((i) => cart[i.id]).map((i) => { const q = cart[i.id], gross = i.rate * q; const free = rule === 'b2g1' ? Math.floor(q / 3) : 0, pct = rule === 'pct' && q >= 2 ? 10 : 0; const off = rule === 'b2g1' ? free * i.rate : Math.round(gross * pct / 100); return { i, q, gross, off } })
  const tot = lines.reduce((a, l) => a + l.gross - l.off, 0), saved = lines.reduce((a, l) => a + l.off, 0)
  return <div className="max-w-lg space-y-3"><Note>Offers apply by themselves as items are added, and the saving is shown on the line.</Note>
    <Field label="Offer in force"><select className="inp w-64" value={rule} onChange={(e) => setRule(e.target.value)}><option value="b2g1">Buy 2, get 1 free</option><option value="pct">10% off when you take 2 or more</option><option value="none">No offer</option></select></Field>
    <div className="panel divide-y divide-rule">{items.map((i) => <div key={i.id} className="flex items-center gap-2 px-3 py-2 text-[13px]"><span className="flex-1 truncate">{i.name}</span><span className="num muted">{inr0(i.rate)}</span><button aria-label={`Remove one ${i.name}`} className="size-7 border border-rule rounded" onClick={() => setCart({ ...cart, [i.id]: Math.max(0, (cart[i.id] ?? 0) - 1) })}>−</button><span className="num w-5 text-center">{cart[i.id] ?? 0}</span><button aria-label={`Add one ${i.name}`} className="size-7 border border-rule rounded" onClick={() => setCart({ ...cart, [i.id]: (cart[i.id] ?? 0) + 1 })}>+</button></div>)}</div>
    <div className="panel p-3 text-[13px] space-y-1">{lines.map((l) => <div key={l.i.id} className="flex justify-between"><span>{l.q}× {l.i.name}{l.off > 0 && <span className="chip ml-1 border-mehndi text-mehndi">Offer −{inr0(l.off)}</span>}</span><span className="num">{inr0(l.gross - l.off)}</span></div>)}<div className="flex justify-between font-semibold border-t border-rule pt-1"><span>Total {saved > 0 && <span className="text-mehndi font-normal">(you save {inr0(saved)})</span>}</span><span className="num">{inr0(tot)}</span></div></div></div>
}
function NearExpiry() {
  const rows = useApp((s) => s.rows.expiry) as { id: string; name: string; batch: string; exp: string; qty: number }[] | undefined, [pct, setPct] = useState('30'), applied = useRows('expmark')
  const list = (rows ?? []).map((r) => ({ r, days: Math.round((new Date(r.exp).getTime() - new Date(today()).getTime()) / 864e5) })).filter((x) => x.days >= 0 && x.days <= 30)
  return <div className="max-w-3xl space-y-3"><Note>Batches expiring within 30 days. Mark them down so they sell first. Expired batches are never offered at billing.</Note>
    {!rows ? <Empty text="No batch data yet. Open Expiry and ageing once to load the sample batches, then return here." /> : list.length === 0 ? <Empty text="Nothing expires in the next 30 days." /> : <><table className="tbl"><thead><tr><th>Item</th><th>Batch</th><th>Expires</th><th className="text-right">Days</th><th className="text-right">Qty</th><th /></tr></thead><tbody>{list.map(({ r, days }) => <tr key={r.id}><td>{r.name}</td><td>{r.batch}</td><td>{r.exp}</td><td className={`num ${days <= 7 ? 'text-sindoor' : ''}`}>{days}</td><td className="num">{r.qty}</td><td>{applied.some((a) => a.id === r.id) ? <span className="chip border-mehndi text-mehndi">Marked down {applied.find((a) => a.id === r.id)!.pct}%</span> : null}</td></tr>)}</tbody></table>
      <div className="flex items-end gap-2"><Field label="Markdown %"><input className="inp num w-24" type="number" min={5} max={90} value={pct} onChange={(e) => setPct(e.target.value)} /></Field><Btn kind="primary" disabled={!(+pct > 0 && +pct < 100)} onClick={() => { put('expmark', (a) => [...a.filter((x) => !list.some((l) => l.r.id === x.id)), ...list.map((l) => ({ id: l.r.id, pct: +pct }))]); toast(`${list.length} batches marked down ${pct}%.`) }}>Mark down {list.length} batches</Btn></div></>}</div>
}
function Repack() {
  const items = useApp((s) => s.items), [bulk, setBulk] = useState(items[0]?.id ?? ''), [qty, setQty] = useState('25'), [pack, setPack] = useState('0.5'), done = useRows('repacks')
  const it = items.find((i) => i.id === bulk), n = Math.floor(+qty / +pack) || 0, unit = it ? Math.round((it.cost * +pack + 2) * 100) / 100 : 0
  return <div className="max-w-xl space-y-3"><Note>Break a bulk bag into small packs. Each pack carries the bulk cost per kilo plus ₹2 for the pouch.</Note>
    <div className="panel p-3 grid grid-cols-3 gap-2"><Field label="Bulk item"><select className="inp" value={bulk} onChange={(e) => setBulk(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field><Field label="Bulk quantity"><input className="inp num" type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field><Field label="Pack size"><select className="inp" value={pack} onChange={(e) => setPack(e.target.value)}>{['0.25', '0.5', '1'].map((x) => <option key={x}>{x}</option>)}</select></Field></div>
    <div className="panel p-3 text-[13px] flex justify-between"><span>{n} packs of {pack}</span><span className="num">cost {inr0(unit)} each</span></div>
    <Btn kind="primary" disabled={!it || n < 1} onClick={() => { put('repacks', (r) => [{ id: uid('rp'), item: it!.name, packs: n, size: pack, cost: unit, at: today() }, ...r]); toast(`${n} packs created from ${qty}.`) }}>Create {n} packs</Btn>
    {done.length > 0 && <table className="tbl"><tbody>{done.slice(0, 5).map((d) => <tr key={String(d.id)}><td>{d.item}</td><td className="num">{d.packs} × {d.size}</td><td className="num">{inr0(+d.cost)}</td><td className="muted">{d.at}</td></tr>)}</tbody></table>}</div>
}
function ShelfLabels() {
  const items = useApp((s) => s.items), base = useRows('labelbase'), run = useRows('labelruns')
  const changed = items.filter((i) => { const b = base.find((x) => x.id === i.id); return b ? +b.rate !== i.rate : false })
  const first = base.length === 0
  return <div className="max-w-2xl space-y-3"><Note>Print shelf labels only for items whose price changed since the last label run.</Note>
    {first ? <><Empty text="No label run yet. Record the current prices as the starting point." /><Btn kind="primary" onClick={() => put('labelbase', () => items.map((i) => ({ id: i.id, rate: i.rate })))}>Record current prices</Btn></> : changed.length === 0 ? <Empty text="No price has changed since the last run." /> : <table className="tbl"><thead><tr><th>Item</th><th className="text-right">Old</th><th className="text-right">New</th></tr></thead><tbody>{changed.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{inr0(+base.find((x) => x.id === i.id)!.rate)}</td><td className="num font-medium">{inr0(i.rate)}</td></tr>)}</tbody></table>}
    {!first && <Btn kind="primary" disabled={!changed.length} onClick={() => { put('labelruns', (r) => [{ id: uid('lr'), n: changed.length, at: new Date().toLocaleString('en-IN') }, ...r]); put('labelbase', () => items.map((i) => ({ id: i.id, rate: i.rate }))); toast(`${changed.length} labels sent to the label printer (preview only).`) }}>Print {changed.length} labels</Btn>}
    {run.length > 0 && <p className="text-xs muted">Last run: {run[0].n} labels, {run[0].at}.</p>}</div>
}
function Points() {
  const parties = useApp((s) => s.parties).filter((p) => p.kind === 'customer'), pts = useRows('points'), [pid, setPid] = useState(parties[0]?.id ?? ''), [amt, setAmt] = useState('1200'), [red, setRed] = useState('0')
  const bal = (id: string) => +(pts.find((p) => p.id === id)?.pts ?? 120), cur = bal(pid), earn = Math.floor(+amt / 100) * 1, tier = cur >= 500 ? 'Gold' : cur >= 200 ? 'Silver' : 'Member'
  const disc = Math.min(+red, cur, Math.floor(+amt / 2)), pay = Math.max(0, +amt - disc)
  return <div className="max-w-lg space-y-3"><Note>1 point for every ₹100 spent. 1 point is worth ₹1 when redeemed, up to half the bill. Balances start from a sample of 120.</Note>
    <div className="panel p-3 grid grid-cols-3 gap-2"><Field label="Customer"><select className="inp" value={pid} onChange={(e) => setPid(e.target.value)}>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Bill (₹)"><input className="inp num" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field><Field label="Redeem points"><input className="inp num" type="number" min={0} value={red} onChange={(e) => setRed(e.target.value)} /></Field></div>
    <div className="panel p-3 text-[13px] space-y-0.5"><div className="flex justify-between"><span>Balance · {tier}</span><span className="num">{cur} points</span></div><div className="flex justify-between"><span>Redeemed</span><span className="num">−{inr0(disc)}</span></div><div className="flex justify-between font-semibold"><span>To pay</span><span className="num">{inr0(pay)}</span></div><div className="flex justify-between muted"><span>Points earned on this bill</span><span className="num">+{Math.floor(pay / 100)}</span></div></div>
    {+red > cur && <p role="alert" className="text-xs text-sindoor">Only {cur} points are available.</p>}
    <Btn kind="primary" disabled={!(+amt > 0) || +red > cur} onClick={() => { put('points', (p) => [...p.filter((x) => x.id !== pid), { id: pid, pts: cur - disc + Math.floor(pay / 100) }]); toast(`Bill closed. Balance is now ${cur - disc + Math.floor(pay / 100)} points.`); setRed('0') }}>Close bill and update points</Btn><span className="hidden">{earn}</span></div>
}

const TABS: [string, string, React.ReactNode, string][] = [
  ['rest', 'Restaurant desk', <Restaurant />, 'Restaurant'], ['kds', 'Kitchen screen', <Kitchen />, 'Restaurant'],
  ['plu', 'Weighing and PLU', <Weigh />, 'Supermarket'], ['offers', 'Offers at billing', <Offers />, 'Supermarket'], ['exp', 'Near expiry', <NearExpiry />, 'Supermarket'], ['repack', 'Repack', <Repack />, 'Supermarket'], ['labels', 'Shelf labels', <ShelfLabels />, 'Supermarket'], ['points', 'Loyalty at counter', <Points />, 'Supermarket'],
]
export function Shop() {
  const [tab, setTab] = useState('rest'), cur = useMemo(() => TABS.find((t) => t[0] === tab)!, [tab])
  return <div className="flex-1 min-h-0 flex flex-col"><PageHead title="Restaurant and supermarket" crumbs={['Counter', 'Restaurant and supermarket']} sub="Working tools for restaurants and supermarkets. What you save here stays with this company on this device." />
    <div className="px-5 overflow-x-auto"><Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t[0], label: `${t[3]}: ${t[1]}` }))} /></div>
    <div className="flex-1 scroll p-5">{cur[2]}</div></div>
}
