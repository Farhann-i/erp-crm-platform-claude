import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr0, today } from '../lib/fmt'
import { Btn, PageHead, Field, Empty } from '../ui/kit'
import { useBill } from './Billing'
import type { Item } from '../lib/data'
import { SPECS } from './Generic'

const EMPTY: never[] = []
const VRE = /^(.*) - (\S+) \/ (.+)$/

/* ---------- Variant matrix generator (MST-09) ---------- */
export function VariantMatrix() {
  const items = useApp((s) => s.items); const branch = useApp((s) => s.branchId)
  const [base, setBase] = useState('Cotton shirt, formal'); const [sizes, setSizes] = useState('S, M, L, XL'); const [cols, setCols] = useState('White, Sky blue, Navy')
  const [mrp, setMrp] = useState('1299'); const [rate, setRate] = useState('999'); const [cost, setCost] = useState('640'); const [open, setOpen] = useState('5'); const [off, setOff] = useState<string[]>([])
  const S = [...new Set(sizes.split(',').map((x) => x.trim()).filter(Boolean))]; const C = [...new Set(cols.split(',').map((x) => x.trim()).filter(Boolean))]
  const combos = S.flatMap((a) => C.map((b) => `${a}|${b}`)).filter((k) => !off.includes(k))
  const exists = (n: string) => items.some((i) => i.name.toLowerCase() === n.toLowerCase())
  const err = !base.trim() ? 'Enter the item name.' : S.length * C.length > 60 ? 'That is more than 60 variants. Reduce sizes or colours.' : !(+mrp > 0 && +rate > 0) ? 'Enter MRP and selling rate.' : +rate > +mrp ? 'Selling rate is above MRP.' : ''
  const create = () => {
    const tpl = items[0]; const stamp = Date.now()
    const made: Item[] = combos.filter((k) => !exists(`${base.trim()} - ${k.replace('|', ' / ')}`)).map((k, i) => { const [a, b] = k.split('|'); const code = `${base.trim().slice(0, 3).toUpperCase()}-${a}-${b.slice(0, 3).toUpperCase()}`; return { ...tpl, id: `v${stamp}${i}`, code, barcode: String(890000000000 + ((stamp + i * 7919) % 99999999999)).slice(0, 13), name: `${base.trim()} - ${a} / ${b}`, mrp: +mrp, rate: +rate, cost: +cost, stock: { [branch]: +open || 0 }, reorder: 3, batch: undefined, expiry: undefined } })
    if (!made.length) return toast('Every variant already exists.', 'warn')
    set((s) => ({ items: [...made, ...s.items] })); toast(`${made.length} variants created. Open Size and colour picker to bill them.`)
  }
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Variant matrix" crumbs={['Masters', 'Variants']} sub="Enter sizes and colours once. One item is made for every pair, each with its own code and barcode." />
    <div className="px-5 pb-6 max-w-3xl space-y-4"><div className="grid sm:grid-cols-2 gap-3">
      <Field label="Item name" req error={err}><input className="inp" value={base} onChange={(e) => setBase(e.target.value)} /></Field>
      <Field label="Opening stock for each variant"><input className="inp num" inputMode="numeric" value={open} onChange={(e) => setOpen(e.target.value)} /></Field>
      <Field label="Sizes" hint="Separate with commas"><input className="inp" value={sizes} onChange={(e) => setSizes(e.target.value)} /></Field>
      <Field label="Colours" hint="Separate with commas"><input className="inp" value={cols} onChange={(e) => setCols(e.target.value)} /></Field>
      <Field label="MRP (₹)"><input className="inp num" inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} /></Field>
      <Field label="Selling rate (₹)"><input className="inp num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
      <Field label="Cost (₹)"><input className="inp num" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></Field></div>
      {S.length > 0 && C.length > 0 && <div><div className="text-[13px] font-medium mb-1">Tick the combinations you stock</div><div className="overflow-auto"><table className="tbl"><thead><tr><th /> {C.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{S.map((a) => <tr key={a}><th scope="row">{a}</th>{C.map((b) => { const k = `${a}|${b}`; const dup = exists(`${base.trim()} - ${a} / ${b}`); return <td key={b} className="text-center"><input type="checkbox" aria-label={`${a} ${b}`} disabled={dup} checked={!off.includes(k) && !dup} onChange={(e) => setOff(e.target.checked ? off.filter((x) => x !== k) : [...off, k])} />{dup && <span className="text-xs muted block">exists</span>}</td> })}</tr>)}</tbody></table></div></div>}
      <div className="flex items-center gap-3"><Btn kind="primary" disabled={!!err || !combos.length} needs="C" onClick={create}>Create {combos.length} variants</Btn><span className="text-xs muted">Stock goes to the current branch.</span></div></div></div>
}

/* ---------- Size and colour picker (SAL-25) ---------- */
export function SizeColour() {
  const items = useApp((s) => s.items); const bill = useBill()
  const fam = useMemo(() => { const m = new Map<string, Item[]>(); items.forEach((i) => { const x = VRE.exec(i.name); if (x) m.set(x[1], [...(m.get(x[1]) ?? []), i]) }); return m }, [items])
  const names = [...fam.keys()]; const [sel, setSel] = useState(''); const [q, setQ] = useState<Record<string, string>>({})
  const cur = sel && fam.has(sel) ? sel : names[0]
  if (!names.length) return <div className="flex-1 scroll"><PageHead title="Size and colour picker" crumbs={['Sales', 'Size and colour']} /><div className="px-5"><Empty text="No items with sizes and colours yet." action="Create variants" onAction={() => go('variants')} /></div></div>
  const v = fam.get(cur)!; const sizes = [...new Set(v.map((i) => VRE.exec(i.name)![2]))]; const cols = [...new Set(v.map((i) => VRE.exec(i.name)![3]))]
  const at = (s: string, c: string) => v.find((i) => { const x = VRE.exec(i.name)!; return x[2] === s && x[3] === c })
  const total = Object.values(q).reduce((a, b) => a + (+b || 0), 0)
  const stock = (i: Item) => Object.values(i.stock).reduce((a, b) => a + b, 0)
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Size and colour picker" crumbs={['Sales', 'Size and colour']} sub="Type a quantity in each cell, then add them to the bill in one go. Small figures show stock." />
    <div className="px-5 pb-6 space-y-3"><Field label="Item"><select className="inp max-w-sm" value={cur} onChange={(e) => { setSel(e.target.value); setQ({}) }}>{names.map((n) => <option key={n}>{n}</option>)}</select></Field>
      <div className="overflow-auto"><table className="tbl"><thead><tr><th />{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{sizes.map((s) => <tr key={s}><th scope="row">{s}</th>{cols.map((c) => { const it = at(s, c); if (!it) return <td key={c} className="muted text-center">–</td>; return <td key={c}><input aria-label={`${s} ${c} quantity`} className="inp num w-16 text-center" inputMode="numeric" value={q[it.id] ?? ''} onChange={(e) => setQ({ ...q, [it.id]: e.target.value.replace(/\D/g, '') })} /><div className={`text-[11px] text-center ${stock(it) <= 0 ? 'text-sindoor' : 'muted'}`}>{stock(it)} in stock</div></td> })}</tr>)}</tbody></table></div>
      <div className="flex items-center gap-3"><Btn kind="primary" disabled={!total} onClick={() => { v.forEach((i) => { const n = +(q[i.id] ?? 0); if (n > 0) bill.add(i, n) }); toast(`${total} pieces added to the bill.`); setQ({}); go('billing') }}>Add {total || ''} to bill</Btn><span className="text-xs muted">Rate {inr0(v[0].rate)} each</span></div></div></div>
}

/* ---------- Voice ---------- */
type SR = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: (e: { error: string }) => void; onend: () => void }
const srCtor = () => (typeof window === 'undefined' ? undefined : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition)) as (new () => SR) | undefined
export function VoiceButton({ onText, lang = 'en-IN' }: { onText: (t: string) => void; lang?: string }) {
  const [on, setOn] = useState(false); const r = useRef<SR | null>(null); const C = srCtor()
  const toggle = () => {
    if (on) { r.current?.stop(); return }
    const x = new C!(); x.lang = lang; x.interimResults = false
    x.onresult = (e) => onText(Array.from(e.results as never as { 0: { transcript: string } }[]).map((y) => y[0].transcript).join(' '))
    x.onerror = (e) => toast(e.error === 'not-allowed' ? 'Microphone is blocked. Allow it in the browser address bar.' : `Voice stopped: ${e.error}.`, 'warn')
    x.onend = () => setOn(false); r.current = x; setOn(true); x.start()
  }
  return <Btn disabled={!C} aria-pressed={on} aria-label={on ? 'Stop listening' : 'Speak'} title={C ? 'Push to talk' : 'Voice input needs Chrome or Edge. You can type instead.'} onClick={toggle} className={on ? '!bg-sindoor !text-white' : ''}>{on ? 'Listening…' : 'Speak'}</Btn>
}

/* ---------- Voice billing (AI-06) ---------- */
const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12 }
const STOP = new Set(['of', 'the', 'a', 'an', 'x', 'pcs', 'piece', 'pieces', 'meter', 'meters', 'metre', 'metres', 'nos', 'kg', 'box', 'boxes', 'add', 'bill', 'make', 'for'])
const toks = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w))
function score(q: string[], name: string) { const n = toks(name); if (!q.length) return 0; return q.filter((w) => n.some((x) => x === w || (w.length >= 3 && x.startsWith(w)) || (x.length >= 3 && w.startsWith(x)))).length / q.length }
export function parseVoiceBill(text: string, items: Item[], parties: { id: string; name: string; kind: string }[]) {
  const [lhs, who] = text.split(/\s+for\s+(?=[^,]*$)/i)
  const lines = lhs.replace(/^(add|make|bill|create)\s+/i, '').split(/,|\band\b/i).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = /^(\d+(?:\.\d+)?|[a-z]+)\s+(.*)$/i.exec(p); const qty = m ? (NUM[m[1].toLowerCase()] ?? +m[1]) : 1; const q = toks(m && (NUM[m[1].toLowerCase()] || +m[1]) ? m[2] : p)
    const best = items.map((i) => ({ i, s: score(q, i.name) })).sort((a, b) => b.s - a.s)[0]
    return { said: p, qty: qty > 0 ? qty : 1, item: best && best.s >= 0.5 ? best.i : undefined, conf: best?.s ?? 0 }
  })
  const pq = toks(who ?? ''); const pb = who ? parties.filter((p) => p.kind === 'customer').map((p) => ({ p, s: score(pq, p.name) })).sort((a, b) => b.s - a.s)[0] : undefined
  return { lines, party: pb && pb.s >= 0.5 ? pb.p : undefined, who }
}
export function VoiceBilling() {
  const items = useApp((s) => s.items); const parties = useApp((s) => s.parties); const bill = useBill()
  const [t, setT] = useState(''); const [res, setRes] = useState<ReturnType<typeof parseVoiceBill> | null>(null)
  const run = (x: string) => { setT(x); setRes(x.trim() ? parseVoiceBill(x, items, parties) : null) }
  const ok = res?.lines.filter((l) => l.item) ?? []
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Voice billing" crumbs={['Counter', 'Voice billing']} sub="Say or type the bill. Nothing is added until you confirm what was understood." />
    <div className="px-5 pb-6 max-w-2xl space-y-3"><div className="flex gap-2"><input className="inp h-10" aria-label="What to bill" placeholder="For example: 2 cotton kurta and 1 stole for Anitha Menon" value={t} onChange={(e) => run(e.target.value)} /><VoiceButton onText={run} /></div>
      {res && (res.lines.length === 0 ? <Empty text="I could not find any items in that. Say a quantity and an item name." /> : <div className="panel draft-edge p-3 space-y-2"><div className="text-[13px]">Customer: <b>{res.party?.name ?? (res.who ? `"${res.who}" not found, walk-in will be used` : 'Walk-in customer')}</b></div>
        <table className="tbl"><thead><tr><th>You said</th><th>Understood as</th><th className="text-right">Qty</th></tr></thead><tbody>{res.lines.map((l, i) => <tr key={i}><td>{l.said}</td><td>{l.item ? <>{l.item.name} <span className="muted text-xs">{Math.round(l.conf * 100)}% match</span></> : <span className="text-sindoor">No matching item</span>}</td><td className="num">{l.qty}</td></tr>)}</tbody></table>
        <div className="flex justify-end gap-2"><Btn onClick={() => run('')}>Discard</Btn><Btn kind="primary" disabled={!ok.length} onClick={() => { if (res.party) bill.setParty(res.party.id); ok.forEach((l) => bill.add(l.item!, l.qty)); toast(`${ok.length} lines added to the bill. Nothing is posted yet.`); go('billing') }}>Confirm and open in billing</Btn></div></div>)}
      <p className="text-xs muted">Speech uses the browser's recogniser (Chrome or Edge). Matching is by words in the item name, not a language model.</p></div></div>
}

/* ---------- Camera scan (MB-06) ---------- */
export function CameraScan() {
  const items = useApp((s) => s.items); const bill = useBill(); const vid = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null)
  const [msg, setMsg] = useState('Camera is off.'); const [code, setCode] = useState(''); const [hit, setHit] = useState<Item | null | 'none'>(null)
  const BD = (typeof window !== 'undefined' ? (window as unknown as { BarcodeDetector?: new (o: object) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector : undefined)
  const look = (c: string) => { const x = c.trim(); if (!x) return; const i = items.find((y) => y.barcode === x || y.code.toLowerCase() === x.toLowerCase()); setHit(i ?? 'none') }
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setMsg('Camera is off.') }
  useEffect(() => stop, [])
  const start = async () => {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); stream.current = s; if (vid.current) { vid.current.srcObject = s; await vid.current.play() } setMsg(BD ? 'Point at a barcode.' : 'This browser cannot read barcodes from the camera. Type the number below.')
      if (BD) { const d = new BD({ formats: ['ean_13', 'code_128', 'qr_code', 'upc_a'] }); const t = setInterval(async () => { if (!stream.current || !vid.current) return clearInterval(t); const r = await d.detect(vid.current).catch(() => []); if (r[0]) { setCode(r[0].rawValue); look(r[0].rawValue); stop(); clearInterval(t) } }, 400) } }
    catch (e) { setMsg((e as Error).name === 'NotAllowedError' ? 'Camera is blocked. Allow it in the browser address bar, or type the barcode below.' : 'No camera found. Type the barcode below.') }
  }
  const stk = hit && hit !== 'none' ? Object.values(hit.stock).reduce((a, b) => a + b, 0) : 0
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Camera scan" crumbs={['Counter', 'Scan']} sub="Scan a barcode to see stock and price, or add it to the bill." />
    <div className="px-5 pb-6 max-w-md space-y-3"><div className="panel overflow-hidden"><video ref={vid} muted playsInline className="w-full aspect-video bg-black" aria-label="Camera preview" /><div className="p-2 flex items-center justify-between text-[13px]"><span role="status">{msg}</span>{stream.current ? <Btn onClick={stop}>Stop camera</Btn> : <Btn kind="primary" onClick={start}>Start camera</Btn>}</div></div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); look(code) }}><input className="inp num" aria-label="Barcode number" placeholder="Barcode or item code" value={code} onChange={(e) => setCode(e.target.value)} /><Btn type="submit">Look up</Btn></form>
      {hit === 'none' && <p role="alert" className="text-sm text-sindoor">No item has that barcode. Check the number or add the item in Items.</p>}
      {hit && hit !== 'none' && <div className="panel p-3 space-y-1"><div className="font-medium">{hit.name}</div><div className="text-[13px] muted">{hit.code} · HSN {hit.hsn} · GST {hit.gst}%</div><div className="flex justify-between text-[13px]"><span>Rate {inr0(hit.rate)}</span><span className={stk <= 0 ? 'text-sindoor' : ''}>{stk} in stock</span></div><div className="flex gap-2 pt-1"><Btn kind="primary" onClick={() => { bill.add(hit, 1); toast('Added to the bill.') }}>Add to bill</Btn><Btn onClick={() => { setHit(null); setCode('') }}>Scan next</Btn></div></div>}</div></div>
}

/* ---------- Forecast (AI-07) ---------- */
export function Forecast() {
  const inv = useApp((s) => s.invoices)
  const d = useMemo(() => {
    const posted = inv.filter((i) => i.status === 'posted'); const now = new Date(today()).getTime(); const W = 8
    const wk = Array(W).fill(0); posted.forEach((i) => { const k = Math.floor((now - new Date(i.date).getTime()) / (7 * 864e5)); if (k >= 0 && k < W) wk[W - 1 - k] += i.total })
    const xs = wk.map((_, i) => i); const mx = (W - 1) / 2; const my = wk.reduce((a, b) => a + b, 0) / W
    const sl = xs.reduce((a, x) => a + (x - mx) * (wk[x] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0); const ic = my - sl * mx
    const fc = [0, 1, 2, 3].map((i) => Math.max(0, Math.round(ic + sl * (W + i))))
    const dow = Array(7).fill(0); posted.forEach((i) => { dow[new Date(i.date).getDay()] += i.total }); const dt = dow.reduce((a, b) => a + b, 0) || 1; const bi = dow.indexOf(Math.max(...dow))
    const sold: Record<string, number> = {}; posted.filter((i) => now - new Date(i.date).getTime() <= 30 * 864e5).forEach((i) => i.lines.forEach((l) => { sold[l.itemId] = (sold[l.itemId] ?? 0) + l.qty }))
    return { wk, fc, sl, my, day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bi], dayShare: dow[bi] / dt, sold, nonzero: wk.filter((x) => x > 0).length }
  }, [inv])
  const items = useApp((s) => s.items)
  const risk = items.map((i) => { const per = (d.sold[i.id] ?? 0) / 30; const st = Object.values(i.stock).reduce((a, b) => a + b, 0); return { i, per, st, days: per > 0 ? st / per : Infinity } }).filter((x) => x.days <= 21).sort((a, b) => a.days - b.days).slice(0, 8)
  const max = Math.max(1, ...d.wk, ...d.fc); const bw = 36
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Sales forecast" crumbs={['Reports', 'Forecast']} sub="A straight-line trend over the last 8 weeks, with the numbers behind it. It is not a model, and it does not know about festivals." />
    <div className="px-5 pb-6 max-w-3xl space-y-4">{d.nonzero < 4 && <div role="status" className="panel p-3 text-[13px]">Only {d.nonzero} of the last 8 weeks have bills. The forecast will be rough until there is more history.</div>}
      <figure className="panel p-3"><svg viewBox={`0 0 ${12 * (bw + 6)} 150`} className="w-full" role="img" aria-label={`Weekly sales, 8 weeks actual then 4 weeks forecast. Next week forecast ${inr0(d.fc[0])}.`}>{[...d.wk, ...d.fc].map((v, i) => { const h = (v / max) * 110; const f = i >= 8; return <g key={i}><rect x={i * (bw + 6) + 3} y={120 - h} width={bw} height={h} rx={3} fill={f ? 'none' : 'var(--neel)'} stroke="var(--neel)" strokeWidth={f ? 1.5 : 0} strokeDasharray={f ? '4 3' : undefined} /><text x={i * (bw + 6) + 3 + bw / 2} y={136} fontSize="9" textAnchor="middle" fill="currentColor">{f ? `+${i - 7}` : `-${8 - i}`}</text></g> })}</svg><figcaption className="text-xs muted">Solid: actual weeks, oldest left. Dashed: forecast, weeks ahead.</figcaption></figure>
      <table className="tbl"><thead><tr><th>Next weeks</th><th className="text-right">Forecast</th></tr></thead><tbody>{d.fc.map((v, i) => <tr key={i}><td>Week +{i + 1}</td><td className="num">{inr0(v)}</td></tr>)}</tbody></table>
      <section className="panel p-3 text-[13px] space-y-1"><h2 className="font-semibold">What drives it</h2><p>Trend: sales are {d.sl >= 0 ? 'rising' : 'falling'} about {inr0(Math.abs(d.sl))} a week on an average of {inr0(d.my)}.</p><p>{d.day} is the strongest day, with {(d.dayShare * 100).toFixed(0)}% of all sales.</p></section>
      <section><h2 className="font-semibold text-[13px] mb-1">Items likely to run out within 3 weeks</h2>{risk.length === 0 ? <p className="text-[13px] muted">None, at the last 30 days' pace.</p> : <table className="tbl"><thead><tr><th>Item</th><th className="text-right">In stock</th><th className="text-right">Sells a day</th><th className="text-right">Cover</th></tr></thead><tbody>{risk.map((x) => <tr key={x.i.id}><td>{x.i.name}</td><td className="num">{x.st}</td><td className="num">{x.per.toFixed(1)}</td><td className={`num ${x.days < 7 ? 'text-sindoor' : ''}`}>{x.days < 1 ? 'Out now' : `${Math.round(x.days)} days`}</td></tr>)}</tbody></table>}</section></div></div>
}
export { EMPTY }

/* ---------- Answer rating (AI-14) ---------- */
export function Rate({ q }: { q: string }) {
  const [st, setSt] = useState<'' | 'up' | 'bad' | 'sent'>(''); const [note, setNote] = useState('')
  if (st === 'up') return <p className="text-xs muted mt-1" role="status">Thanks, noted as helpful.</p>
  if (st === 'sent') return <p className="text-xs muted mt-1" role="status">Sent to the Answer review queue.</p>
  if (st === 'bad') return <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); set((x) => ({ rows: { ...x.rows, aieval: [...(x.rows.aieval ?? SPECS.aieval.seed ?? []), { id: 'ae' + Date.now(), q, rating: 'Wrong', note: note.trim(), status: 'To review' }] as never } })); setSt('sent'); toast('Sent for review. The team will check it.', 'info') }}><input autoFocus className="inp" aria-label="What was wrong with this answer" placeholder="What was wrong? (optional)" value={note} onChange={(e) => setNote(e.target.value)} /><Btn type="submit" kind="primary">Send report</Btn><Btn onClick={() => setSt('')}>Cancel</Btn></form>
  return <div className="flex gap-2 mt-2" role="group" aria-label="Rate this answer"><Btn className="btn-sm" onClick={() => setSt('up')}>Helpful</Btn><Btn className="btn-sm" onClick={() => setSt('bad')}>Not right</Btn></div>
}
