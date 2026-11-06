import { useMemo, useState } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr, today, dmy } from '../lib/fmt'
import { Btn, PageHead, Field, Empty } from '../ui/kit'
import { logHist } from '../ui/History'

type Row = Record<string, string | number>
const EMPTY: Row[] = []

/* ---------- Audit tamper check (IAM-11) ---------- */
async function sha(t: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('') }
type Ent = { key: string; text: string }
export function AuditCheck() {
  const inv = useApp((s) => s.invoices); const vou = useApp((s) => s.vouchers); const rows = useApp((s) => s.rows)
  const seal = (useApp((s) => s.rows.auditseal) ?? EMPTY)[0]
  const ents: Ent[] = useMemo(() => [
    ...inv.filter((i) => i.status !== 'draft').map((i) => ({ key: 'inv:' + i.id, text: [i.no, i.date, i.partyId, i.total, i.sub, i.tax, i.status].join('|') })),
    ...vou.filter((v) => v.status !== 'draft').map((v) => ({ key: 'vou:' + v.id, text: [v.no, v.date, v.type, v.status, v.lines.map((l) => `${l.ledger}:${l.dr}:${l.cr}`).join(',')].join('|') })),
    ...Object.keys(rows).filter((k) => k.startsWith('hist:')).flatMap((k) => rows[k].map((r) => ({ key: 'h:' + r.id, text: [r.ref, r.at, r.by, r.what, r.chg].join('|') }))),
  ].sort((a, b) => a.key.localeCompare(b.key)), [inv, vou, rows])
  const [res, setRes] = useState<null | { ok: boolean; checked: number; fresh: number; bad: string[]; head: string }>(null); const [busy, setBusy] = useState(false)
  const chain = async (list: Ent[]) => { let prev = ''; const out: string[] = []; for (const e of list) { prev = await sha(prev + e.key + e.text); out.push(prev) } return out }
  const doSeal = async () => { setBusy(true); const h = await chain(ents); set((s) => ({ rows: { ...s.rows, auditseal: [{ id: 's', at: new Date().toLocaleString('en-IN'), keys: JSON.stringify(ents.map((e) => e.key)), hashes: JSON.stringify(h), n: ents.length }] as never } })); setRes(null); setBusy(false); toast(`Sealed ${ents.length} records. Any later change to them will be caught.`) }
  const verify = async () => {
    if (!seal) return; setBusy(true)
    const keys = JSON.parse(String(seal.keys)) as string[]; const hashes = JSON.parse(String(seal.hashes)) as string[]
    const byKey = new Map(ents.map((e) => [e.key, e])); const bad: string[] = []; let prev = ''; let broken = false
    for (let i = 0; i < keys.length; i++) { const e = byKey.get(keys[i]); if (!e) { bad.push(`${keys[i]} is missing`); broken = true; continue } prev = await sha(prev + e.key + e.text); if (prev !== hashes[i] && !broken) { bad.push(`${label(keys[i])} was changed`); broken = true; } else if (prev !== hashes[i]) { /* later links break once one is wrong */ } }
    // also check each record alone, so every changed record is named
    const own: string[] = []; for (let i = 0; i < keys.length; i++) { const e = byKey.get(keys[i]); if (!e) continue; const a = await sha(i === 0 ? '' + e.key + e.text : hashes[i - 1] + e.key + e.text); if (a !== hashes[i]) own.push(`${label(keys[i])} was changed`) }
    const names = [...new Set([...own, ...bad.filter((x) => x.endsWith('missing'))])]
    setRes({ ok: names.length === 0, checked: keys.length, fresh: ents.length - keys.length, bad: names, head: hashes[hashes.length - 1] ?? '' }); setBusy(false)
  }
  const label = (k: string) => k.startsWith('inv:') ? `Bill ${inv.find((i) => 'inv:' + i.id === k)?.no ?? k}` : k.startsWith('vou:') ? `Voucher ${vou.find((v) => 'vou:' + v.id === k)?.no ?? k}` : 'A history entry'
  const tamper = () => { const i = inv.find((x) => x.status === 'posted'); if (!i) return; set((s) => ({ invoices: s.invoices.map((x) => (x.id === i.id ? { ...x, total: x.total + 1 } : x)) })); toast(`Test only: ${i.no} total raised by ₹1 behind the app's back. Now verify.`, 'warn') }
  const untamper = () => { const i = inv.find((x) => x.status === 'posted'); if (!i) return; set((s) => ({ invoices: s.invoices.map((x) => (x.id === i.id ? { ...x, total: x.total - 1 } : x)) })); toast('Test change undone.') }
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Audit trail check" crumbs={['Books', 'Audit check']} sub="Each record is chained to the one before it by a fingerprint (SHA-256). Change any sealed record and the check names it." />
    <div className="px-5 pb-6 max-w-3xl space-y-4"><div className="panel p-3 text-[13px] space-y-2"><p>{ents.length} records can be sealed: posted bills, vouchers and change history.</p><p className="muted">{seal ? `Last sealed ${seal.at} with ${seal.n} records.` : 'Not sealed yet.'}</p><div className="flex gap-2"><Btn kind="primary" needs="E" disabled={busy} onClick={doSeal}>Seal now</Btn><Btn disabled={!seal || busy} onClick={verify}>Verify</Btn></div></div>
      {res && <div role="status" className={`panel p-3 text-[13px] ${res.ok ? 'border-mehndi' : 'border-sindoor'}`}><b className={res.ok ? 'text-mehndi' : 'text-sindoor'}>{res.ok ? 'No sealed record has changed.' : 'Sealed records do not match.'}</b><p className="mt-1">{res.checked} sealed records checked. {res.fresh > 0 ? `${res.fresh} newer records are not sealed yet.` : 'Nothing newer.'}</p>{res.bad.length > 0 && <ul className="list-disc ml-5 mt-1 text-sindoor">{res.bad.map((b) => <li key={b}>{b}</li>)}</ul>}<p className="text-xs muted mt-1 break-all">Latest fingerprint {res.head.slice(0, 32)}…</p></div>}
      <details className="text-[13px]"><summary className="cursor-pointer muted">Test the check</summary><div className="panel p-3 mt-2 space-y-2"><p className="text-xs muted">Changes one bill's total by ₹1 without leaving a history entry, the way someone editing the database directly would. Seal first, then change, then verify.</p><div className="flex gap-2"><Btn onClick={tamper}>Change a bill by ₹1</Btn><Btn onClick={untamper}>Undo test change</Btn></div></div></details>
      <p className="text-xs muted">A fingerprint check shows a record changed. It cannot say who did it, and in this prototype the seal is stored beside the data. In production the seal is kept outside the working database.</p></div></div>
}

/* ---------- Exchange difference (ACC-20) ---------- */
const FX = ['USD', 'EUR', 'GBP', 'AED', 'SAR']
export function Forex() {
  const vou = useApp((s) => s.vouchers); const cfg = (useApp((s) => s.rows['cfg:currency']) ?? EMPTY)[0]
  const [cur, setCur] = useState('USD'); const [amt, setAmt] = useState('2500'); const [r1, setR1] = useState('83.10'); const [r2, setR2] = useState('84.35'); const [kind, setKind] = useState('Receipt against a sales invoice'); const [ref, setRef] = useState('EXP/26-27/0004')
  const a = +amt, x = +r1, y = +r2; const bad = !(a > 0 && x > 0 && y > 0) ? 'Enter the amount and both rates.' : ''
  const recv = kind.startsWith('Receipt'); const diff = Math.round(a * (y - x) * 100) / 100; const gain = recv ? diff > 0 : diff < 0; const amount = Math.abs(diff)
  const past = vou.filter((v) => v.narration.startsWith('Exchange difference'))
  const post = () => {
    if (bad || amount === 0) return
    const no = 'JV-FX-' + String(past.length + 1).padStart(3, '0')
    const lines = gain ? [{ ledger: 'HDFC Bank', dr: amount, cr: 0 }, { ledger: 'Exchange difference', dr: 0, cr: amount }] : [{ ledger: 'Exchange difference', dr: amount, cr: 0 }, { ledger: 'HDFC Bank', dr: 0, cr: amount }]
    set((s) => ({ vouchers: [{ id: 'v' + Date.now(), no, type: 'Journal', date: today(), narration: `Exchange difference ${ref}: ${cur} ${a} at ${x} then ${y}`, status: 'posted' as const, by: 'Rekha (accountant)', lines }, ...s.vouchers],
      ledgers: [...(s.ledgers.some((l) => l.name === 'Exchange difference') ? s.ledgers : [...s.ledgers, { id: 'lfx', name: 'Exchange difference', group: 'Indirect income', bal: 0 }])].map((l) => { const z = lines.find((q) => q.ledger === l.name); return z ? { ...l, bal: l.bal + z.dr - z.cr } : l }) }))
    toast(`${no} posted: exchange ${gain ? 'gain' : 'loss'} of ${inr(amount)}.`)
  }
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Exchange differences" crumbs={['Books', 'Exchange differences']} sub="When a foreign invoice is settled at a different rate, the rupee difference is a gain or a loss. Post it here." />
    <div className="px-5 pb-6 max-w-2xl space-y-4">{cfg && cfg.multi === 0 && <p role="alert" className="panel p-3 text-[13px]">Foreign currency is switched off in settings. <button className="underline" onClick={() => go('currency')}>Open currency settings</button></p>}
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Settlement"><select className="inp" value={kind} onChange={(e) => setKind(e.target.value)}><option>Receipt against a sales invoice</option><option>Payment against a purchase invoice</option></select></Field><Field label="Invoice number"><input className="inp" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <Field label="Currency"><select className="inp" value={cur} onChange={(e) => setCur(e.target.value)}>{FX.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label={`Amount (${cur})`} error={bad}><input className="inp num" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <Field label="Rate on the invoice date (₹)"><input className="inp num" inputMode="decimal" value={r1} onChange={(e) => setR1(e.target.value)} /></Field><Field label="Rate on the settlement date (₹)"><input className="inp num" inputMode="decimal" value={r2} onChange={(e) => setR2(e.target.value)} /></Field></div>
      {!bad && <div className="panel p-3 text-[13px] space-y-1"><div className="flex justify-between"><span>Booked at invoice rate</span><span className="num">{inr(a * x)}</span></div><div className="flex justify-between"><span>Settled at today's rate</span><span className="num">{inr(a * y)}</span></div><div className={`flex justify-between font-semibold ${amount === 0 ? '' : gain ? 'text-mehndi' : 'text-sindoor'}`}><span>{amount === 0 ? 'No difference' : gain ? 'Exchange gain' : 'Exchange loss'}</span><span className="num">{inr(amount)}</span></div></div>}
      <Btn kind="primary" needs="C" disabled={!!bad || amount === 0} onClick={post}>Post exchange {gain ? 'gain' : 'loss'}</Btn>
      <section><h2 className="font-semibold text-[13px] mb-1">Posted</h2>{past.length === 0 ? <Empty text="No exchange differences posted yet." /> : <table className="tbl"><tbody>{past.map((v) => <tr key={v.id}><td className="num">{v.no}</td><td>{dmy(v.date)}</td><td>{v.narration.replace('Exchange difference ', '')}</td><td className="num text-right">{inr(v.lines[0].dr || v.lines[0].cr)}</td></tr>)}</tbody></table>}</section></div></div>
}
export { logHist }
