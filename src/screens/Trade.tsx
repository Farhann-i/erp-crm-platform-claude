import { useState, useMemo, useEffect } from 'react'
import QRCode from 'qrcode'
import { useApp, set, toast } from '../lib/app'
import { inr0, today } from '../lib/fmt'
import { Btn, PageHead, Field, Tabs, Empty } from '../ui/kit'
import { logHist } from '../ui/History'
import type { Item } from '../lib/data'

type Row = Record<string, string | number>
const EMPTY: Row[] = []
const useRows = (k: string) => useApp((s) => s.rows[k]) ?? EMPTY
const put = (k: string, fn: (r: Row[]) => Row[]) => set((s) => ({ rows: { ...s.rows, [k]: fn(s.rows[k] ?? []) } }))
const uid = (p: string) => p + Date.now().toString(36) + Math.floor(Math.random() * 99)
const stockOf = (i: Item) => Object.values(i.stock).reduce((a, b) => a + b, 0)
const VRE = /^(.*) - (\S+) \/ (.+)$/
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-sm muted max-w-2xl">{children}</p>

/* ---------- Textile ---------- */
const ROLLS: Row[] = [{ id: 'r1', roll: 'KS-0412', fabric: 'Kasavu cotton', len: 40, left: 40 }, { id: 'r2', roll: 'LN-0107', fabric: 'Linen blend', len: 30, left: 22.5 }, { id: 'r3', roll: 'SK-0033', fabric: 'Mysore silk', len: 18, left: 18 }]
function Rolls() {
  const stored = useRows('rolls'), rolls = stored.length ? stored : ROLLS, cuts = useRows('cuts')
  const [id, setId] = useState('r1'), [len, setLen] = useState('2.5'), [to, setTo] = useState('')
  const cur = rolls.find((r) => r.id === id) ?? rolls[0], left = +cur.left - (+len || 0)
  const cut = () => { put('rolls', () => rolls.map((r) => (r.id === cur.id ? { ...r, left: +(+r.left - +len).toFixed(2) } : r))); put('cuts', (c) => [{ id: uid('c'), roll: String(cur.roll), len: +len, to: to || 'Counter sale', at: new Date().toLocaleString('en-IN') }, ...c]); toast(`${len} m cut from ${cur.roll}. ${left.toFixed(2)} m left.`) }
  const [nr, setNr] = useState({ roll: '', fabric: '', len: '' })
  return <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
    <div className="space-y-3"><Note>Each roll has its own length. A cut reduces that roll and is kept in the cut history. A piece under 1 metre is marked as a remnant.</Note>
      <table className="tbl"><thead><tr><th>Roll</th><th>Fabric</th><th className="text-right">Left (m)</th><th /></tr></thead><tbody>{rolls.map((r) => <tr key={String(r.id)}><td>{r.roll}</td><td>{r.fabric}</td><td className="num">{r.left} of {r.len}</td><td>{+r.left > 0 && +r.left < 1 ? <span className="chip border-haldi">Remnant</span> : +r.left <= 0 ? <span className="chip">Finished</span> : null}</td></tr>)}</tbody></table>
      <div className="panel p-3 grid grid-cols-3 gap-2 items-end"><Field label="Roll"><input className="inp" aria-label="Roll number" placeholder="KS-0500" value={nr.roll} onChange={(e) => setNr({ ...nr, roll: e.target.value })} /></Field><Field label="Fabric"><input className="inp" aria-label="Fabric name" placeholder="Cotton" value={nr.fabric} onChange={(e) => setNr({ ...nr, fabric: e.target.value })} /></Field><Field label="Length (m)"><input className="inp num" type="number" aria-label="Roll length" value={nr.len} onChange={(e) => setNr({ ...nr, len: e.target.value })} /></Field>
        <Btn disabled={!nr.roll.trim() || !(+nr.len > 0)} onClick={() => { put('rolls', () => [...rolls, { id: uid('r'), roll: nr.roll.trim(), fabric: nr.fabric.trim() || 'Fabric', len: +nr.len, left: +nr.len }]); setNr({ roll: '', fabric: '', len: '' }); toast('Roll added.') }}>Add roll</Btn></div></div>
    <div className="space-y-3"><div className="panel p-3 grid grid-cols-3 gap-2 items-end"><Field label="Roll"><select className="inp" value={cur.id} onChange={(e) => setId(e.target.value)}>{rolls.map((r) => <option key={String(r.id)} value={String(r.id)}>{r.roll}</option>)}</select></Field><Field label="Cut length (m)"><input className="inp num" type="number" step="0.1" value={len} onChange={(e) => setLen(e.target.value)} /></Field><Field label="For"><input className="inp" placeholder="Customer or order" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <div className="col-span-3 flex items-center gap-3"><Btn kind="primary" disabled={!(+len > 0) || left < 0} onClick={cut}>Record cut</Btn><span className={`text-xs ${left < 0 ? 'text-sindoor' : left > 0 && left < 1 ? 'text-haldi' : 'muted'}`} role={left < 0 ? 'alert' : undefined}>{left < 0 ? `Only ${cur.left} m left on this roll.` : `${left.toFixed(2)} m will be left${left > 0 && left < 1 ? ' (remnant)' : ''}.`}</span></div></div>
      <h3 className="font-medium text-[13px]">Cut history</h3>{cuts.length === 0 ? <Empty text="No cuts yet. Record one and it appears here." /> : <table className="tbl"><tbody>{cuts.slice(0, 10).map((c) => <tr key={String(c.id)}><td>{c.roll}</td><td className="num">{c.len} m</td><td>{c.to}</td><td className="muted">{c.at}</td></tr>)}</tbody></table>}</div></div>
}
function Seasons() {
  const items = useApp((s) => s.items), tags = useRows('seasons')
  const [season, setSeason] = useState('Onam 2026'), [pct, setPct] = useState('20'), [pick, setPick] = useState('')
  const of = (id: string) => String(tags.find((t) => t.id === id)?.season ?? '')
  const names = [...new Set(tags.map((t) => String(t.season)))]
  const tagged = items.filter((i) => of(i.id) === season)
  const apply = () => { set((s) => ({ items: s.items.map((i) => (of(i.id) === season ? { ...i, rate: Math.round(i.rate * (1 - +pct / 100)) } : i)) })); tagged.forEach((i) => logHist('items', i.id, `Season markdown ${pct}% (${season})`, [['Rate', String(i.rate), String(Math.round(i.rate * (1 - +pct / 100)))]])); toast(`${tagged.length} items marked down ${pct}% for ${season}.`) }
  return <div className="max-w-3xl space-y-3"><Note>Tag items with a season or collection, then mark the whole season down in one step at season end. Each change is in the item's history.</Note>
    <div className="panel p-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"><Field label="Season name"><input className="inp" value={season} onChange={(e) => setSeason(e.target.value)} list="seasons" /></Field><datalist id="seasons">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <Field label="Add an item to it"><select className="inp" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose an item</option>{items.filter((i) => of(i.id) !== season).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
      <Btn disabled={!pick || !season.trim()} onClick={() => { put('seasons', (t) => [...t.filter((x) => x.id !== pick), { id: pick, season: season.trim() }]); setPick('') }}>Tag item</Btn></div>
    {tagged.length === 0 ? <Empty text={`Nothing is tagged ${season || 'yet'}. Add an item above.`} /> : <table className="tbl"><thead><tr><th>Item</th><th className="text-right">Rate</th><th className="text-right">Stock</th><th /></tr></thead><tbody>{tagged.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{inr0(i.rate)}</td><td className="num">{stockOf(i)} {i.unit}</td><td><button className="text-xs underline" onClick={() => put('seasons', (t) => t.filter((x) => x.id !== i.id))}>Remove</button></td></tr>)}</tbody></table>}
    <div className="flex items-end gap-2"><Field label="Markdown %"><input className="inp num w-24" type="number" min={1} max={90} value={pct} onChange={(e) => setPct(e.target.value)} /></Field><Btn kind="primary" disabled={!tagged.length || !(+pct > 0 && +pct < 100)} onClick={apply}>Mark down {tagged.length} items</Btn></div></div>
}
function JobWork() {
  const jobs = useRows('jobwork'), [f, setF] = useState({ to: 'Latha Tailors, Eroor', material: 'Cotton 60s', issued: '60', pcs: '40' }), [rec, setRec] = useState<Record<string, string>>({})
  return <div className="max-w-3xl space-y-3"><Note>Send fabric to a tailor or processor, and book the garments back. Wastage is the fabric used beyond what the pieces should need.</Note>
    <div className="panel p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"><Field label="Send to"><input className="inp" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field><Field label="Material"><input className="inp" value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} /></Field><Field label="Issued (m)"><input className="inp num" type="number" value={f.issued} onChange={(e) => setF({ ...f, issued: e.target.value })} /></Field><Field label="Pieces expected"><input className="inp num" type="number" value={f.pcs} onChange={(e) => setF({ ...f, pcs: e.target.value })} /></Field>
      <Btn kind="primary" disabled={!f.to.trim() || !(+f.issued > 0) || !(+f.pcs > 0)} onClick={() => { put('jobwork', (j) => [{ id: uid('j'), no: 'JW-' + String(j.length + 1).padStart(3, '0'), to: f.to, material: f.material, issued: +f.issued, pcs: +f.pcs, got: 0, status: 'Out', date: today() }, ...j]); toast('Job work order created.') }}>Issue material</Btn></div>
    {jobs.length === 0 ? <Empty text="No job work orders. Issue material above." /> : <table className="tbl"><thead><tr><th>No</th><th>With</th><th>Material</th><th className="text-right">Issued</th><th className="text-right">Pieces</th><th>Status</th><th /></tr></thead><tbody>{jobs.map((j) => { const per = +j.issued / +j.pcs, w = +j.got > 0 ? Math.max(0, +j.issued - +j.got * (per * 0.96)) : 0; return <tr key={String(j.id)}><td>{j.no}</td><td>{j.to}</td><td>{j.material}</td><td className="num">{j.issued} m</td><td className="num">{j.got} of {j.pcs}</td><td>{j.status}{+j.got > 0 && <span className="text-xs muted ml-1">wastage {w.toFixed(1)} m</span>}</td>
      <td>{j.status !== 'Closed' && <span className="flex gap-1"><input aria-label={`Pieces received ${j.no}`} className="inp num h-7 w-16" type="number" value={rec[String(j.id)] ?? ''} placeholder="Pcs" onChange={(e) => setRec({ ...rec, [String(j.id)]: e.target.value })} /><Btn className="btn-sm" disabled={!(+(rec[String(j.id)] ?? 0) > 0)} onClick={() => { const n = Math.min(+j.pcs, +j.got + +rec[String(j.id)]); put('jobwork', (a) => a.map((x) => (x.id === j.id ? { ...x, got: n, status: n >= +j.pcs ? 'Closed' : 'Part received' } : x))); setRec({ ...rec, [String(j.id)]: '' }) }}>Receive</Btn></span>}</td></tr> })}</tbody></table>}</div>
}
const AGENTS = [['Mathew Agencies', 2.5], ['Jose Broker', 1.5]] as const
function Agents() {
  const inv = useApp((s) => s.invoices), link = useRows('invagent'), paid = useRows('commpaid'), vou = useApp((s) => s.vouchers)
  const ag = (id: string) => String(link.find((l) => l.id === id)?.agent ?? '')
  const rate = (a: string) => AGENTS.find((x) => x[0] === a)?.[1] ?? 0
  const recent = inv.filter((i) => i.status === 'posted').slice(0, 12)
  const due = (a: string) => recent.filter((i) => ag(i.id) === a && !paid.some((p) => p.id === i.id)).reduce((s, i) => s + Math.round(i.paid * rate(a) / 100), 0)
  const pay = (a: string) => { const amt = due(a); if (!amt) return; const no = 'PV-COM-' + String(paid.filter((p) => p.agent === a).length + vou.length + 1).padStart(3, '0')
    const lines = [{ ledger: 'Commission expense', dr: amt, cr: 0 }, { ledger: 'HDFC Bank', dr: 0, cr: amt }]
    set((s) => ({ vouchers: [{ id: 'v' + Date.now(), no, type: 'Payment', date: today(), narration: `Commission to ${a}`, status: 'posted' as const, by: 'Rekha (accountant)', lines }, ...s.vouchers], ledgers: (s.ledgers.some((l) => l.name === 'Commission expense') ? s.ledgers : [...s.ledgers, { id: 'lcom', name: 'Commission expense', group: 'Indirect expenses', bal: 0 }]).map((l) => { const z = lines.find((q) => q.ledger === l.name); return z ? { ...l, bal: l.bal + z.dr - z.cr } : l }) }))
    put('commpaid', (p) => [...p, ...recent.filter((i) => ag(i.id) === a && !paid.some((x) => x.id === i.id)).map((i) => ({ id: i.id, agent: a, amt: Math.round(i.paid * rate(a) / 100) }))]); toast(`${no} posted: ${inr0(amt)} commission to ${a}.`) }
  return <div className="max-w-3xl space-y-3"><Note>Link an invoice to an agent. Commission is on the amount actually received. Paying it posts a payment voucher.</Note>
    <table className="tbl"><thead><tr><th>Invoice</th><th>Party</th><th className="text-right">Received</th><th>Agent</th><th className="text-right">Commission</th></tr></thead><tbody>{recent.map((i) => { const a = ag(i.id), done = paid.some((p) => p.id === i.id); return <tr key={i.id}><td>{i.no}</td><td>{i.partyName}</td><td className="num">{inr0(i.paid)}</td>
      <td><select aria-label={`Agent for ${i.no}`} disabled={done} className="inp h-7" value={a} onChange={(e) => put('invagent', (l) => [...l.filter((x) => x.id !== i.id), { id: i.id, agent: e.target.value }])}><option value="">None</option>{AGENTS.map((x) => <option key={x[0]}>{x[0]}</option>)}</select></td><td className="num">{a ? inr0(Math.round(i.paid * rate(a) / 100)) : ''}{done && <span className="chip ml-1">Paid</span>}</td></tr> })}</tbody></table>
    <div className="flex gap-2 flex-wrap">{AGENTS.map((x) => <Btn key={x[0]} disabled={!due(x[0])} onClick={() => pay(x[0])}>Pay {x[0]} {due(x[0]) ? inr0(due(x[0])) : ''}</Btn>)}</div></div>
}
function Exchange() {
  const inv = useApp((s) => s.invoices).filter((i) => i.status === 'posted').slice(0, 15), items = useApp((s) => s.items), done = useRows('exchanges')
  const [iid, setIid] = useState(inv[0]?.id ?? ''), [li, setLi] = useState(0), [to, setTo] = useState(''), [why, setWhy] = useState('Size does not fit')
  const cur = inv.find((i) => i.id === iid), line = cur?.lines[li], within = cur ? (new Date(today()).getTime() - new Date(cur.date).getTime()) / 864e5 : 0
  const nw = items.find((i) => i.id === to), diff = nw && line ? Math.round(nw.rate * 1.05) - Math.round(line.rate * 1.05) : 0
  return <div className="max-w-2xl space-y-3"><Note>Exchange within 7 days of the sale. The returned piece goes back to stock and the new one is billed. Only the price difference is collected or refunded.</Note>
    <div className="panel p-3 grid sm:grid-cols-2 gap-2"><Field label="Original invoice"><select className="inp" value={iid} onChange={(e) => { setIid(e.target.value); setLi(0) }}>{inv.map((i) => <option key={i.id} value={i.id}>{i.no} · {i.partyName}</option>)}</select></Field><Field label="Item returned"><select className="inp" value={li} onChange={(e) => setLi(+e.target.value)}>{cur?.lines.map((l, k) => <option key={k} value={k}>{l.name}</option>)}</select></Field>
      <Field label="Exchange for"><select className="inp" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose an item</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} · {inr0(i.rate)}</option>)}</select></Field><Field label="Reason"><select className="inp" value={why} onChange={(e) => setWhy(e.target.value)}>{['Size does not fit', 'Colour not liked', 'Defect', 'Gift exchange'].map((x) => <option key={x}>{x}</option>)}</select></Field></div>
    {within > 7 && <p role="alert" className="text-xs text-sindoor">This sale is {Math.round(within)} days old. Exchange needs approval after 7 days.</p>}
    {nw && <div className="panel p-3 text-[13px] flex justify-between"><span>{diff > 0 ? 'Customer pays' : diff < 0 ? 'Refund as credit note' : 'Even exchange'}</span><span className="num font-medium">{inr0(Math.abs(diff))} <span className="muted font-normal">incl. GST</span></span></div>}
    <Btn kind="primary" disabled={!nw || !line} onClick={() => { put('exchanges', (e) => [{ id: uid('x'), inv: cur!.no, out: line!.name, into: nw!.name, diff, why, at: new Date().toLocaleString('en-IN') }, ...e]); logHist('invoices', cur!.id, `Exchange slip: ${line!.name} for ${nw!.name}`, [['Difference', '0', String(diff)]]); toast(`Exchange slip saved against ${cur!.no}.`); setTo('') }}>Save exchange slip</Btn>
    {done.length > 0 && <table className="tbl"><tbody>{done.slice(0, 6).map((d) => <tr key={String(d.id)}><td>{d.inv}</td><td>{d.out} for {d.into}</td><td className="num">{inr0(+d.diff)}</td><td className="muted">{d.at}</td></tr>)}</tbody></table>}</div>
}

/* ---------- Retail ---------- */
function VariantStock() {
  const items = useApp((s) => s.items)
  const fam = useMemo(() => { const m = new Map<string, Item[]>(); items.forEach((i) => { const x = VRE.exec(i.name); if (x) m.set(x[1], [...(m.get(x[1]) ?? []), i]) }); return [...m] }, [items])
  const [pick, setPick] = useState(0)
  if (!fam.length) return <Empty text="No variant items yet. Create them in Variant matrix and the stock grid appears here." />
  const [name, list] = fam[Math.min(pick, fam.length - 1)], sizes = [...new Set(list.map((i) => VRE.exec(i.name)![2]))], cols = [...new Set(list.map((i) => VRE.exec(i.name)![3]))]
  const q = (s: string, c: string) => { const i = list.find((x) => { const m = VRE.exec(x.name)!; return m[2] === s && m[3] === c }); return i ? stockOf(i) : null }
  return <div className="max-w-3xl space-y-3"><Note>Stock for one product by size and colour. Red cells are below the reorder level.</Note><Field label="Product"><select className="inp w-72" value={pick} onChange={(e) => setPick(+e.target.value)}>{fam.map(([n], k) => <option key={n} value={k}>{n}</option>)}</select></Field>
    <table className="tbl"><caption className="sr-only">{name} stock by size and colour</caption><thead><tr><th>Size</th>{cols.map((c) => <th key={c} className="text-right">{c}</th>)}<th className="text-right">Total</th></tr></thead><tbody>{sizes.map((s) => <tr key={s}><td>{s}</td>{cols.map((c) => { const v = q(s, c); const low = v !== null && v < (list[0].reorder || 5); return <td key={c} className={`num ${low ? 'text-sindoor font-medium' : ''}`}>{v ?? '–'}</td> })}<td className="num font-medium">{cols.reduce((a, c) => a + (q(s, c) ?? 0), 0)}</td></tr>)}</tbody><tfoot><tr><td>Total</td>{cols.map((c) => <td key={c} className="num font-medium">{sizes.reduce((a, s) => a + (q(s, c) ?? 0), 0)}</td>)}<td className="num font-medium">{list.reduce((a, i) => a + stockOf(i), 0)}</td></tr></tfoot></table></div>
}
const STAFF = ['Divya (cashier)', 'Salim (manager)']
function Targets() {
  const inv = useApp((s) => s.invoices), t = useRows('targets')
  const tgt = (n: string) => +(t.find((x) => x.id === n)?.target ?? 100000), rate = (n: string) => +(t.find((x) => x.id === n)?.rate ?? 1)
  const sold = (n: string) => inv.filter((i) => i.by === n && i.status === 'posted').reduce((a, i) => a + i.total, 0)
  return <div className="max-w-3xl space-y-3"><Note>Set a monthly target and an incentive rate per person. Incentive is paid on sales above the target.</Note>
    <table className="tbl"><thead><tr><th>Staff</th><th className="text-right">Target</th><th className="text-right">Incentive %</th><th className="text-right">Sold</th><th>Progress</th><th className="text-right">Incentive due</th></tr></thead><tbody>{STAFF.map((n) => { const s = sold(n), g = tgt(n), pct = Math.min(100, Math.round((s / g) * 100)), inc = Math.round(Math.max(0, s - g) * rate(n) / 100); return <tr key={n}><td>{n}</td>
      <td><input aria-label={`Target for ${n}`} className="inp num h-7 w-28 text-right" type="number" value={g} onChange={(e) => put('targets', (x) => [...x.filter((y) => y.id !== n), { id: n, target: +e.target.value, rate: rate(n) }])} /></td>
      <td><input aria-label={`Incentive rate for ${n}`} className="inp num h-7 w-16 text-right" type="number" step="0.5" value={rate(n)} onChange={(e) => put('targets', (x) => [...x.filter((y) => y.id !== n), { id: n, target: g, rate: +e.target.value }])} /></td>
      <td className="num">{inr0(s)}</td><td><div className="h-2 w-28 rounded bg-wash" role="img" aria-label={`${pct} percent of target`}><div className="h-2 rounded bg-neel" style={{ width: pct + '%' }} /></div><span className="text-xs muted">{pct}%</span></td><td className="num font-medium">{inr0(inc)}</td></tr> })}</tbody></table><p className="text-xs muted">Sold is the total of posted invoices by that person in the sample data.</p></div>
}
function PhoneBill() {
  const items = useApp((s) => s.items), [cart, setCart] = useState<Record<string, number>>({}), [vpa, setVpa] = useState('kochitextiles@okhdfc'), [qr, setQr] = useState('')
  const lines = items.filter((i) => cart[i.id]), total = lines.reduce((a, i) => a + Math.round(i.rate * (1 + i.gst / 100)) * cart[i.id], 0)
  const link = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent('Kochi Textiles')}&am=${total}&cu=INR&tn=${encodeURIComponent('Bill ' + today())}`
  useEffect(() => { if (total > 0 && /^[\w.-]+@[\w]+$/.test(vpa)) QRCode.toDataURL(link, { margin: 1, width: 220 }).then(setQr).catch(() => setQr('')); else setQr('') }, [link, total, vpa])
  return <div className="max-w-md space-y-3"><Note>One-column billing for a phone. Add items, then show the QR for the customer to pay by any UPI app. This QR is real, but payment is not confirmed here: mark it paid yourself when the money arrives.</Note>
    <Field label="Your UPI ID"><input className="inp" aria-label="UPI ID" value={vpa} onChange={(e) => setVpa(e.target.value)} /></Field>
    <div className="panel divide-y divide-rule">{items.slice(0, 8).map((i) => <div key={i.id} className="flex items-center gap-2 px-3 py-2 text-[13px]"><span className="flex-1 truncate">{i.name}</span><span className="num muted">{inr0(Math.round(i.rate * (1 + i.gst / 100)))}</span>
      <button aria-label={`Remove one ${i.name}`} className="size-7 border border-rule rounded" onClick={() => setCart({ ...cart, [i.id]: Math.max(0, (cart[i.id] ?? 0) - 1) })}>−</button><span className="num w-5 text-center">{cart[i.id] ?? 0}</span><button aria-label={`Add one ${i.name}`} className="size-7 border border-rule rounded" onClick={() => setCart({ ...cart, [i.id]: (cart[i.id] ?? 0) + 1 })}>+</button></div>)}</div>
    <div className="panel p-3 flex items-center gap-4"><div className="flex-1"><div className="text-xs muted">Total with GST</div><div className="num text-xl font-semibold">{inr0(total)}</div></div>{qr ? <img src={qr} alt={`UPI QR for ${inr0(total)}`} width={110} height={110} /> : <div className="text-xs muted w-28">{total ? 'Enter a valid UPI ID to see the QR.' : 'Add an item to see the QR.'}</div>}</div>
    <Btn kind="primary" disabled={!total} onClick={() => { toast(`${inr0(total)} marked as received by UPI.`); setCart({}) }}>Mark as paid</Btn></div>
}
function Catalogue() {
  const items = useApp((s) => s.items), [sel, setSel] = useState<string[]>([]), [phone, setPhone] = useState('9847012345'), [q, setQ] = useState('')
  const list = items.filter((i) => (i.name + i.category + (i.brand ?? '') + Object.values(i.extra ?? {}).join(' ')).toLowerCase().includes(q.toLowerCase()))
  const text = 'Kochi Textiles price list\n' + items.filter((i) => sel.includes(i.id)).map((i) => `${i.name}: ${inr0(i.rate)} / ${i.unit}`).join('\n')
  return <div className="max-w-3xl space-y-3"><Note>Search by name, brand or any attribute such as size or finish, tick what you want to send, and share it on WhatsApp.</Note>
    <input aria-label="Search catalogue" className="inp w-72" placeholder="Search, for example: chrome" value={q} onChange={(e) => setQ(e.target.value)} />
    <table className="tbl"><thead><tr><th className="w-8" /><th>Item</th><th>Brand</th><th>Attributes</th><th className="text-right">Rate</th></tr></thead><tbody>{list.map((i) => <tr key={i.id}><td><input type="checkbox" aria-label={`Select ${i.name}`} checked={sel.includes(i.id)} onChange={() => setSel(sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id])} /></td><td>{i.name}</td><td>{i.brand}</td><td className="muted text-xs">{Object.entries(i.extra ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td><td className="num">{inr0(i.rate)}</td></tr>)}</tbody></table>
    {list.length === 0 && <Empty text={`No item matches "${q}". Clear the search to see everything.`} />}
    <div className="flex items-end gap-2"><Field label="WhatsApp number"><input className="inp w-40" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><a className={`btn btn-primary ${sel.length && /^\d{10}$/.test(phone) ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!sel.length} target="_blank" rel="noreferrer" href={`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`} onClick={() => toast('Opening WhatsApp with the list. Sending is up to you.')}>Share {sel.length} items</a></div></div>
}

/* ---------- Hardware ---------- */
function Sites() {
  const sites = useRows('sites'), parts = useRows('siteparts'), parties = useApp((s) => s.parties).filter((p) => p.kind === 'customer')
  const [f, setF] = useState({ party: parties[0]?.id ?? '', site: 'Greenview Apartments, Edappally', quote: '250000' }), [amt, setAmt] = useState<Record<string, string>>({})
  const done = (id: string) => parts.filter((p) => p.site === id).reduce((a, p) => a + +p.amt, 0)
  return <div className="max-w-3xl space-y-3"><Note>Quote a whole site once, then supply in parts. Each part is billed against the site and the balance of the quote stays visible.</Note>
    <div className="panel p-3 grid sm:grid-cols-4 gap-2 items-end"><Field label="Customer"><select className="inp" value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })}>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Site"><input className="inp" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} /></Field><Field label="Quoted (₹)"><input className="inp num" type="number" value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></Field>
      <Btn kind="primary" disabled={!f.site.trim() || !(+f.quote > 0)} onClick={() => { put('sites', (s) => [{ id: uid('s'), no: 'SITE-' + String(s.length + 1).padStart(3, '0'), party: parties.find((p) => p.id === f.party)?.name ?? '', site: f.site, quote: +f.quote }, ...s]); toast('Site quote created.') }}>Create site</Btn></div>
    {sites.length === 0 ? <Empty text="No sites yet. Create one above." /> : sites.map((s) => { const d = done(String(s.id)), left = +s.quote - d; return <div key={String(s.id)} className="panel p-3 space-y-2"><div className="flex justify-between text-[13px]"><span><b>{s.no}</b> · {s.party} · {s.site}</span><span className="num">{inr0(d)} of {inr0(+s.quote)}</span></div><div className="h-2 rounded bg-wash"><div className="h-2 rounded bg-neel" style={{ width: Math.min(100, Math.round((d / +s.quote) * 100)) + '%' }} /></div>
      <div className="flex gap-2 items-center"><input aria-label={`Supply amount for ${s.no}`} className="inp num h-8 w-32" type="number" placeholder="Part value" value={amt[String(s.id)] ?? ''} onChange={(e) => setAmt({ ...amt, [String(s.id)]: e.target.value })} /><Btn disabled={!(+(amt[String(s.id)] ?? 0) > 0)} onClick={() => { put('siteparts', (p) => [...p, { id: uid('p'), site: String(s.id), amt: +amt[String(s.id)], at: today() }]); setAmt({ ...amt, [String(s.id)]: '' }) }}>Bill a part</Btn><span className={`text-xs ${left < 0 ? 'text-sindoor' : 'muted'}`}>{left < 0 ? `${inr0(-left)} over the quote` : `${inr0(left)} still to supply`}</span></div></div> })}</div>
}
const VEH = ['KL-07-CD-4410 (Tata Ace)', 'KL-07-BX-2381 (Pickup)', 'KL-39-A-9912 (Lorry)']
function Loads() {
  const inv = useApp((s) => s.invoices).filter((i) => i.status === 'posted').slice(0, 10), loads = useRows('loads')
  const [v, setV] = useState(VEH[0]), [drv, setDrv] = useState('Basheer'), [sel, setSel] = useState<string[]>([]), taken = loads.flatMap((l) => String(l.invs).split(','))
  return <div className="max-w-3xl space-y-3"><Note>Group invoices into one vehicle load, then record who received the goods. Proof here is a name and time; a photo needs the phone app.</Note>
    <div className="panel p-3 grid sm:grid-cols-3 gap-2 items-end"><Field label="Vehicle"><select className="inp" value={v} onChange={(e) => setV(e.target.value)}>{VEH.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Driver"><input className="inp" value={drv} onChange={(e) => setDrv(e.target.value)} /></Field><Btn kind="primary" disabled={!sel.length || !drv.trim()} onClick={() => { put('loads', (l) => [{ id: uid('l'), no: 'LOAD-' + String(l.length + 1).padStart(3, '0'), vehicle: v, driver: drv, invs: sel.join(','), nos: inv.filter((i) => sel.includes(i.id)).map((i) => i.no.slice(-5)).join(', '), status: 'Out for delivery', proof: '' }, ...l]); setSel([]); toast('Load planned.') }}>Plan load ({sel.length})</Btn></div>
    <div className="panel divide-y divide-rule">{inv.filter((i) => !taken.includes(i.id)).map((i) => <label key={i.id} className="flex items-center gap-3 px-3 py-1.5 text-[13px]"><input type="checkbox" checked={sel.includes(i.id)} onChange={() => setSel(sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id])} /><span className="flex-1">{i.no} · {i.partyName}</span><span className="num">{inr0(i.total)}</span></label>)}</div>
    {loads.map((l) => <div key={String(l.id)} className="panel p-3 text-[13px] flex items-center gap-3 flex-wrap"><b>{l.no}</b><span className="flex-1">{l.vehicle} · {l.driver} · invoices {l.nos}</span>{l.status === 'Delivered' ? <span className="chip border-mehndi text-mehndi">Delivered, received by {l.proof}</span> : <ReceiveBox id={String(l.id)} />}</div>)}</div>
}
function ReceiveBox({ id }: { id: string }) {
  const [n, setN] = useState('')
  return <span className="flex gap-1"><input aria-label="Received by" className="inp h-7 w-32" placeholder="Received by" value={n} onChange={(e) => setN(e.target.value)} /><Btn className="btn-sm" disabled={!n.trim()} onClick={() => put('loads', (l) => l.map((x) => (x.id === id ? { ...x, status: 'Delivered', proof: n.trim() + ' at ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) } : x)))}>Mark delivered</Btn></span>
}
function RateList() {
  const items = useApp((s) => s.items), [txt, setTxt] = useState(''), [done, setDone] = useState(false)
  const parsed = useMemo(() => txt.split('\n').map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((r) => r.length >= 2 && r[0]).map(([code, cost]) => { const it = items.find((i) => i.code.toLowerCase() === code.toLowerCase() || i.barcode === code); return { code, cost: +cost, it, bad: !it || !(+cost > 0) } }), [txt, items])
  const good = parsed.filter((p) => !p.bad && p.it && p.cost !== p.it.cost)
  const sample = items.slice(0, 3).map((i) => `${i.code},${Math.round(i.cost * 1.06)}`).join('\n')
  return <div className="max-w-3xl space-y-3"><Note>Paste a supplier's rate list as code and new cost, one per line. You see every change before anything is saved. Pasting works from Excel as well.</Note>
    <textarea aria-label="Rate list" className="inp w-full h-28 font-mono text-xs" placeholder={'CODE,new cost\n' + sample} value={txt} onChange={(e) => { setTxt(e.target.value); setDone(false) }} /><Btn onClick={() => setTxt(sample)}>Use sample</Btn>
    {parsed.length > 0 && <table className="tbl"><thead><tr><th>Code</th><th>Item</th><th className="text-right">Old cost</th><th className="text-right">New cost</th><th className="text-right">Change</th></tr></thead><tbody>{parsed.map((p, k) => <tr key={k}><td>{p.code}</td><td>{p.it?.name ?? <span className="text-sindoor">Code not found</span>}</td><td className="num">{p.it ? inr0(p.it.cost) : ''}</td><td className="num">{p.cost > 0 ? inr0(p.cost) : <span className="text-sindoor">Not a number</span>}</td><td className={`num ${p.it && p.cost > p.it.cost ? 'text-sindoor' : 'text-mehndi'}`}>{p.it && p.cost > 0 ? ((p.cost / p.it.cost - 1) * 100).toFixed(1) + '%' : ''}</td></tr>)}</tbody></table>}
    <Btn kind="primary" disabled={!good.length || done} onClick={() => { set((s) => ({ items: s.items.map((i) => { const g = good.find((x) => x.it!.id === i.id); return g ? { ...i, cost: g.cost } : i }) })); good.forEach((g) => logHist('items', g.it!.id, 'Cost updated from supplier rate list', [['Cost', String(g.it!.cost), String(g.cost)]])); setDone(true); toast(`${good.length} costs updated.`) }}>Apply {good.length} changes</Btn>
    {parsed.some((p) => p.bad) && <p role="alert" className="text-xs text-sindoor">{parsed.filter((p) => p.bad).length} lines will be skipped because the code was not found or the cost is not a number.</p>}</div>
}

function Contractors() {
  const inv = useApp((s) => s.invoices), parties = useApp((s) => s.parties).filter((p) => p.kind === 'customer'), paid = useRows('rebates'), tag = useRows('contractors'), [rate, setRate] = useState('1')
  const is = (id: string) => tag.some((t) => t.id === id)
  const earned = (id: string) => Math.round(inv.filter((i) => i.partyId === id && i.status === 'posted').reduce((a, i) => a + i.paid, 0) * +rate / 100)
  const settled = (id: string) => paid.filter((p) => p.id === id).reduce((a, p) => a + +p.amt, 0)
  return <div className="max-w-3xl space-y-3"><Note>Mark customers who are contractors or plumbers. They earn a rebate on what they have paid. Settling a rebate records it; it is given as a credit on the next bill.</Note>
    <Field label="Rebate %"><input className="inp num w-24" type="number" step="0.5" min={0} value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
    <table className="tbl"><thead><tr><th>Customer</th><th>Contractor</th><th className="text-right">Rebate earned</th><th className="text-right">Settled</th><th /></tr></thead><tbody>{parties.map((p) => { const due = earned(p.id) - settled(p.id); return <tr key={p.id}><td>{p.name}</td><td><input type="checkbox" aria-label={`${p.name} is a contractor`} checked={is(p.id)} onChange={() => put('contractors', (t) => (is(p.id) ? t.filter((x) => x.id !== p.id) : [...t, { id: p.id }]))} /></td><td className="num">{is(p.id) ? inr0(earned(p.id)) : ''}</td><td className="num">{is(p.id) ? inr0(settled(p.id)) : ''}</td><td>{is(p.id) && <Btn className="btn-sm" disabled={due <= 0} onClick={() => { put('rebates', (r) => [...r, { id: p.id, amt: due, at: today() }]); toast(`${inr0(due)} rebate settled for ${p.name}.`) }}>Settle {due > 0 ? inr0(due) : ''}</Btn>}</td></tr> })}</tbody></table></div>
}
const TABS: [string, string, React.ReactNode, string][] = [
  ['rolls', 'Rolls and cuts', <Rolls />, 'Textile'], ['seasons', 'Seasons', <Seasons />, 'Textile'], ['jobwork', 'Job work', <JobWork />, 'Textile'], ['agents', 'Agent commission', <Agents />, 'Textile'], ['exchange', 'Exchange slip', <Exchange />, 'Textile'],
  ['varstock', 'Variant stock', <VariantStock />, 'Retail'], ['targets', 'Staff targets', <Targets />, 'Retail'], ['phone', 'Phone billing', <PhoneBill />, 'Retail'], ['catalogue', 'Catalogue share', <Catalogue />, 'Retail'],
  ['sites', 'Site billing', <Sites />, 'Hardware'], ['loads', 'Delivery loads', <Loads />, 'Hardware'], ['ratelist', 'Rate list import', <RateList />, 'Hardware'], ['contractors', 'Contractor rebate', <Contractors />, 'Hardware'],
]
export function Trade() {
  const [tab, setTab] = useState('rolls'), cur = TABS.find((t) => t[0] === tab)!
  return <div className="flex-1 min-h-0 flex flex-col"><PageHead title="Trade tools" crumbs={['Stock', 'Trade tools']} sub="Working tools for textile, retail and hardware shops. Everything saved here stays with this company on this device." />
    <div className="px-5 overflow-x-auto"><Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t[0], label: `${t[3]}: ${t[1]}` }))} /></div>
    <div className="flex-1 scroll p-5">{cur[2]}</div></div>
}
