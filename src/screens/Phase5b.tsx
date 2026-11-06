import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApp, set, toast, get } from '../lib/app'
import { inr0, today } from '../lib/fmt'
import { Btn, PageHead, Field, Empty, Toggle, Seg } from '../ui/kit'
import { auth, USERS } from '../shell/ctx'
import { PinPad, OtpChallenge } from '../shell/Lock'
import { totp, verifyCode, newSecret, newRecovery, rowFor } from '../lib/totp'

type Row = Record<string, string | number>
const EMPTY: Row[] = []
const setRows = (k: string, f: (r: Row[]) => Row[]) => set((s) => ({ rows: { ...s.rows, [k]: f(s.rows[k] ?? []) } }))
const whoNow = () => USERS.find((u) => u.id === auth.get().user)?.name ?? 'System'

/* ---------- Two-step sign-in setup (IAM-04) ---------- */
export function TwoFactor() {
  const uid = auth.use((s) => s.user) ?? ''; const user = USERS.find((u) => u.id === uid)
  const rows = useApp((s) => s.rows['cfg:2fa']) ?? EMPTY; const mine = rows.find((r) => r.id === uid)
  const [pend, setPend] = useState(''); const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [now, setNow] = useState(''); const [rc, setRc] = useState<string[]>([]); const [off, setOff] = useState(false)
  const secret = pend || String(mine?.secret ?? '')
  useEffect(() => { if (!secret) return; const f = () => totp(secret).then(setNow); f(); const t = setInterval(f, 1000); return () => clearInterval(t) }, [secret])
  const on = mine?.on === '1'
  const enable = async () => { if (!(await verifyCode(pend, code.trim()))) return setErr('That code is not right. Codes change every 30 seconds.'); const r = newRecovery(); setRc(r); setRows('cfg:2fa', (x) => [...x.filter((y) => y.id !== uid), { id: uid, secret: pend, on: '1', rc: r.join(',') }]); setPend(''); setCode(''); setErr(''); toast('Two-step sign-in is on.') }
  const disable = async () => { if (!(await verifyCode(String(mine?.secret), code.trim()))) return setErr('Enter a current code to switch it off.'); setRows('cfg:2fa', (x) => x.filter((y) => y.id !== uid)); setCode(''); setErr(''); setOff(false); toast('Two-step sign-in is off.', 'warn') }
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Two-step sign-in" crumbs={['Tools', 'Two-step sign-in']} sub={`For ${user?.name ?? 'you'}. After your PIN you also enter a 6-digit code that changes every 30 seconds.`} />
    <div className="px-5 pb-6 max-w-lg space-y-3">
      {!on && !pend && <div className="panel p-4 space-y-2"><p className="text-[13px]">Status: <b>Off</b></p><Btn kind="primary" needs="E" onClick={() => setPend(newSecret())}>Set up</Btn></div>}
      {pend && <div className="panel p-4 space-y-3"><p className="text-[13px]">Add this key to an authenticator app (Google Authenticator, Authy, Microsoft Authenticator), choosing time-based.</p><div className="num text-lg tracking-wider select-all bg-wash rounded p-2" aria-label="Setup key">{pend.replace(/(.{4})/g, '$1 ').trim()}</div><p className="text-xs muted">Prototype: the code your app would show right now is <b className="num">{now}</b>.</p>
        <Field label="Enter the 6-digit code to confirm" error={err}><input className="inp num w-40" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field><div className="flex gap-2"><Btn onClick={() => { setPend(''); setErr('') }}>Cancel</Btn><Btn kind="primary" disabled={code.length !== 6} onClick={enable}>Turn on</Btn></div></div>}
      {on && !pend && <div className="panel p-4 space-y-2"><p className="text-[13px]">Status: <b className="text-mehndi">On</b> · {String(mine?.rc ?? '').split(',').filter(Boolean).length} recovery codes left</p>{!off ? <Btn needs="E" onClick={() => setOff(true)}>Turn off</Btn> : <div className="space-y-2"><Field label="Enter a current code to confirm" error={err}><input className="inp num w-40" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field><div className="flex gap-2"><Btn onClick={() => { setOff(false); setErr('') }}>Cancel</Btn><Btn kind="danger" disabled={code.length !== 6} onClick={disable}>Turn off two-step</Btn></div></div>}</div>}
      {rc.length > 0 && <div role="status" className="panel p-4"><h2 className="font-semibold text-[13px] mb-1">Recovery codes</h2><p className="text-xs muted mb-2">Keep these somewhere safe. Each works once, if you lose your phone. They are not shown again.</p><ul className="num grid grid-cols-2 gap-1 text-[13px]">{rc.map((x) => <li key={x}>{x}</li>)}</ul></div>}</div></div>
}

/* ---------- Studio step-up sign-in (AS-09) ---------- */
export function StudioGate({ children }: { children: ReactNode }) {
  const uid = auth.use((s) => s.user) ?? ''; const user = USERS.find((u) => u.id === uid)
  const key = 'erp-studio-ok'; const rows = useApp((s) => s.rows)
  const [ok, setOk] = useState(() => { try { return sessionStorage.getItem(key) === uid } catch { return false } }); const [otp, setOtp] = useState(false)
  const pass = () => { try { sessionStorage.setItem(key, uid) } catch { /* private mode */ } setOk(true) }
  if (ok || !user) return <>{children}</>
  return <div className="flex-1 grid place-items-center p-6"><div className="w-full max-w-xs"><h1 className="text-lg font-semibold">Admin Studio</h1><p className="text-sm muted mb-4">Studio changes how the whole company works. Confirm it is you.</p>{otp ? <OtpChallenge user={user} onBack={() => setOtp(false)} onOk={pass} /> : <PinPad user={user} onBack={() => history.back()} onOk={() => (rowFor(rows, uid) ? setOtp(true) : pass())} />}</div></div>
}

/* ---------- Rule builder and dry-run (WFL-02, WFL-03) ---------- */
const TRIG = ['A bill is saved', 'A payment is late', 'Stock changes', 'A customer is added']
const FIELDS: [string, string, string][] = [['disc', 'Discount %', '12'], ['total', 'Bill value (₹)', '85000'], ['late', 'Days overdue', '9'], ['stock', 'Stock on hand', '4'], ['bal', 'Customer balance (₹)', '40000']]
const OPS = ['>', '≥', '<', '=']; const ACTS = ['Ask the manager to approve', 'Send a WhatsApp reminder', 'Tell the owner', 'Hold the bill']
const cmp = (a: number, op: string, b: number) => (op === '>' ? a > b : op === '≥' ? a >= b : op === '<' ? a < b : a === b)
const SEED_RULES: Row[] = [{ id: 'r1', name: 'Big discount needs approval', trig: TRIG[0], field: 'disc', op: '>', val: 10, act: ACTS[0], on: 1 }, { id: 'r2', name: 'Late payment reminder', trig: TRIG[1], field: 'late', op: '≥', val: 7, act: ACTS[1], on: 1 }]
export function RuleBuilder() {
  const saved = useApp((s) => s.rows.wfrules); const rules = saved ?? SEED_RULES; const vers = useApp((s) => s.rows.wfver) ?? EMPTY
  const commit = (next: Row[], what: string) => { set((st) => ({ rows: { ...st.rows, wfrules: next, wfver: [...(st.rows.wfver ?? []), { id: 'v' + Date.now(), at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), by: whoNow(), what, snap: JSON.stringify(next) }] } })) }
  const inv = useApp((s) => s.invoices)
  const [f, setF] = useState({ name: '', trig: TRIG[0], field: 'disc', op: '>', val: '', act: ACTS[0] }); const [e, setE] = useState('')
  const [sc, setSc] = useState<Record<string, string>>(Object.fromEntries(FIELDS.map((x) => [x[0], x[2]]))); const [ran, setRan] = useState(false)
  const lab = (k: string) => FIELDS.find((x) => x[0] === k)![1]
  const add = () => { if (!f.name.trim()) return setE('Name the rule.'); if (f.val === '' || isNaN(+f.val)) return setE('Enter a number to compare with.'); setE(''); commit([...rules, { id: 'r' + Date.now(), ...f, val: +f.val, on: 1 }], `Added rule: ${f.name}`); setF({ ...f, name: '', val: '' }); toast('Rule saved. Test it below.') }
  const load = (id: string) => { const i = inv.find((x) => x.id === id); if (!i) return; const d = i.lines.reduce((a, l) => a + l.disc * l.qty * l.rate, 0) / (i.lines.reduce((a, l) => a + l.qty * l.rate, 0) || 1); setSc({ ...sc, disc: d.toFixed(1), total: String(Math.round(i.total)) }); setRan(false) }
  const res = rules.map((r) => { const v = +sc[String(r.field)]; const hit = r.on === 1 && cmp(v, String(r.op), +r.val); return { r, v, hit } })
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Rule builder" crumbs={['Automation', 'Rule builder']} sub="Write a rule as a sentence, then test it on sample numbers. A test changes nothing." />
    <div className="px-5 pb-6 max-w-3xl space-y-5">
      <section className="panel p-3 space-y-3"><h2 className="font-semibold text-[13px]">New rule</h2><Field label="Name" error={e}><input className="inp" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-2 text-[13px]"><span>When</span><select aria-label="When" className="inp w-auto" value={f.trig} onChange={(x) => setF({ ...f, trig: x.target.value })}>{TRIG.map((x) => <option key={x}>{x}</option>)}</select><span>and</span><select aria-label="Field" className="inp w-auto" value={f.field} onChange={(x) => setF({ ...f, field: x.target.value })}>{FIELDS.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select><select aria-label="Comparison" className="inp w-16" value={f.op} onChange={(x) => setF({ ...f, op: x.target.value })}>{OPS.map((x) => <option key={x}>{x}</option>)}</select><input aria-label="Value" className="inp num w-24" inputMode="decimal" value={f.val} onChange={(x) => setF({ ...f, val: x.target.value })} /><span>then</span><select aria-label="Then" className="inp w-auto" value={f.act} onChange={(x) => setF({ ...f, act: x.target.value })}>{ACTS.map((x) => <option key={x}>{x}</option>)}</select></div><Btn kind="primary" needs="C" onClick={add}>Save rule</Btn></section>
      <section><h2 className="font-semibold text-[13px] mb-1">Rules</h2><ul className="panel divide-y divide-rule">{rules.map((r) => <li key={String(r.id)} className="p-2.5 flex items-center gap-3 text-[13px]"><div className="flex-1"><div className="font-medium">{r.name}</div><div className="muted text-xs">When {String(r.trig).toLowerCase()} and {lab(String(r.field)).toLowerCase()} {r.op} {r.val}, then {String(r.act).toLowerCase()}.</div></div><Toggle on={r.on === 1} label={`${r.name} on`} onChange={(v) => commit(rules.map((x) => (x.id === r.id ? { ...x, on: v ? 1 : 0 } : x)), `${v ? 'Switched on' : 'Switched off'}: ${r.name}`)} /><Btn className="btn-sm" needs="D" aria-label={`Delete ${r.name}`} onClick={() => commit(rules.filter((x) => x.id !== r.id), `Deleted rule: ${r.name}`)}>Delete</Btn></li>)}</ul></section>
      <section><h2 className="font-semibold text-[13px] mb-1">Versions</h2>{vers.length === 0 ? <p className="text-[13px] muted">No changes yet. Each save, switch or delete is kept here and can be restored.</p> : <ol className="panel divide-y divide-rule">{[...vers].reverse().map((v, i) => <li key={String(v.id)} className="p-2.5 flex items-center gap-3 text-[13px]"><div className="flex-1"><b>{v.what}</b><div className="muted text-xs">{v.by} · {v.at} · {(JSON.parse(String(v.snap)) as Row[]).length} rules</div></div>{i === 0 ? <span className="text-xs muted">Current</span> : <Btn className="btn-sm" needs="E" onClick={() => commit(JSON.parse(String(v.snap)) as Row[], `Restored version from ${v.at}`)}>Restore</Btn>}</li>)}</ol>}</section>
      <section className="panel p-3 space-y-3"><h2 className="font-semibold text-[13px]">Test on sample numbers</h2><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{FIELDS.map(([k, l]) => <Field key={k} label={l}><input className="inp num" inputMode="decimal" value={sc[k]} onChange={(x) => { setSc({ ...sc, [k]: x.target.value }); setRan(false) }} /></Field>)}</div>
        <div className="flex gap-2 items-center flex-wrap"><select aria-label="Fill from a bill" className="inp w-auto" defaultValue="" onChange={(x) => load(x.target.value)}><option value="" disabled>Fill from a recent bill…</option>{inv.slice(0, 12).map((i) => <option key={i.id} value={i.id}>{i.no} · {inr0(i.total)}</option>)}</select><Btn kind="primary" onClick={() => setRan(true)}>Run test</Btn></div>
        {ran && <ol className="text-[13px] space-y-1.5" aria-live="polite">{res.map(({ r, v, hit }) => <li key={String(r.id)} className={`p-2 rounded border ${hit ? 'border-mehndi bg-mehndi/10' : 'border-rule'}`}><b>{r.name}</b>: {r.on !== 1 ? 'switched off, skipped.' : <>{lab(String(r.field))} is {v}. Is {v} {r.op} {r.val}? <b>{hit ? 'Yes' : 'No'}</b>. {hit ? <>It would: {String(r.act).toLowerCase()}. <span className="muted">Not done, this is a test.</span></> : 'Nothing happens.'}</>}</li>)}</ol>}</section></div></div>
}

/* ---------- Widget designer (AS-17) ---------- */
export const WIDGETS: Record<string, [string, () => string]> = {
  sales: ['Sales today', () => inr0(get().invoices.filter((i) => i.date === today() && i.status === 'posted').reduce((a, i) => a + i.total, 0))],
  cash: ['Cash and bank', () => inr0(get().ledgers.filter((l) => l.group === 'Cash and bank').reduce((a, l) => a + l.bal, 0))],
  owed: ['Customers owe', () => inr0(get().parties.filter((p) => p.kind === 'customer' && p.balance > 0).reduce((a, p) => a + p.balance, 0))],
  low: ['Items to reorder', () => String(get().items.filter((i) => i.reorder > 0 && Object.values(i.stock).reduce((a, b) => a + b, 0) <= i.reorder).length)],
  appr: ['Waiting for you', () => String(get().approvals.filter((a) => a.status === 'pending').length)],
  bills: ['Bills today', () => String(get().invoices.filter((i) => i.date === today() && i.status === 'posted').length)],
}
const DEF = ['sales', 'cash', 'owed', 'appr']
const order = (rows?: Row[]) => (rows?.[0] ? String(rows[0].order).split(',').filter((x) => x in WIDGETS) : DEF)
export function WidgetStrip() {
  const rows = useApp((s) => s.rows['cfg:widgets']); useApp((s) => s.invoices); useApp((s) => s.ledgers); useApp((s) => s.parties); useApp((s) => s.items); useApp((s) => s.approvals)
  if (!rows?.[0]) return null
  return <div className="px-5 pb-3 flex gap-3 flex-wrap" aria-label="Your widgets">{order(rows).map((k) => <div key={k} className="panel px-3 py-2 min-w-32"><div className="text-xs muted">{WIDGETS[k][0]}</div><div className="num text-lg font-semibold text-left">{WIDGETS[k][1]()}</div></div>)}</div>
}
export function WidgetDesigner() {
  const rows = useApp((s) => s.rows['cfg:widgets']); const cur = order(rows); useApp((s) => s.invoices); useApp((s) => s.ledgers)
  const [list, setList] = useState(cur); const dirty = list.join() !== cur.join() || !rows?.[0]
  const mv = (i: number, d: number) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setList(n) }
  const off = Object.keys(WIDGETS).filter((k) => !list.includes(k))
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Day sheet widgets" crumbs={['Studio', 'Widgets']} sub="Choose the figures shown at the top of the Owner Day sheet, and their order." />
    <div className="px-5 pb-6 grid lg:grid-cols-2 gap-5 max-w-4xl"><section><h2 className="font-semibold text-[13px] mb-1">Shown</h2><ol className="panel divide-y divide-rule">{list.map((k, i) => <li key={k} className="p-2 flex items-center gap-2 text-[13px]"><span className="flex-1">{WIDGETS[k][0]}</span><Btn className="btn-sm" aria-label={`Move ${WIDGETS[k][0]} up`} disabled={i === 0} onClick={() => mv(i, -1)}>Up</Btn><Btn className="btn-sm" aria-label={`Move ${WIDGETS[k][0]} down`} disabled={i === list.length - 1} onClick={() => mv(i, 1)}>Down</Btn><Btn className="btn-sm" aria-label={`Hide ${WIDGETS[k][0]}`} onClick={() => setList(list.filter((x) => x !== k))}>Hide</Btn></li>)}{list.length === 0 && <li className="p-3 muted text-[13px]">Nothing shown.</li>}</ol>
        {off.length > 0 && <><h2 className="font-semibold text-[13px] mt-3 mb-1">Available</h2><ul className="panel divide-y divide-rule">{off.map((k) => <li key={k} className="p-2 flex items-center gap-2 text-[13px]"><span className="flex-1">{WIDGETS[k][0]}</span><Btn className="btn-sm" aria-label={`Show ${WIDGETS[k][0]}`} onClick={() => setList([...list, k])}>Show</Btn></li>)}</ul></>}
        <div className="mt-3 flex gap-2"><Btn kind="primary" needs="E" disabled={!dirty} onClick={() => { setRows('cfg:widgets', () => [{ id: 'w', order: list.join(',') }]); toast('Saved. The Owner Day sheet now shows these.') }}>Save to Day sheet</Btn><Btn disabled={!rows?.[0]} onClick={() => { setRows('cfg:widgets', () => []); setList(DEF) }}>Remove widgets</Btn></div></section>
      <section><h2 className="font-semibold text-[13px] mb-1">Preview</h2><div className="flex gap-3 flex-wrap">{list.map((k) => <div key={k} className="panel px-3 py-2 min-w-32"><div className="text-xs muted">{WIDGETS[k][0]}</div><div className="num text-lg font-semibold text-left">{WIDGETS[k][1]()}</div></div>)}</div></section></div></div>
}

/* ---------- LAN terminals and numbering leases (SY-04) ---------- */
const LEASES: Row[] = [
  { id: 'l1', term: 'Counter 1 (this PC)', from: 501, to: 600, used: 38, state: 'Active', seen: 'Online now' },
  { id: 'l2', term: 'Counter 2', from: 601, to: 700, used: 100, state: 'Used up', seen: 'Online now' },
  { id: 'l3', term: 'Van tablet', from: 701, to: 750, used: 12, state: 'Active', seen: 'Offline for 2 days' },
]
export function Leases() {
  const rows = useApp((s) => s.rows.leases) ?? LEASES
  const [size, setSize] = useState('50'); const next = Math.max(...rows.map((r) => +r.to)) + 1
  const upd = (id: string, p: Row) => setRows('leases', () => rows.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const voided = rows.filter((r) => r.state === 'Reclaimed').reduce((a, r) => a + (+r.to - +r.from + 1 - +r.used), 0)
  return <div className="flex-1 min-h-0 scroll"><PageHead title="LAN terminals and number leases" crumbs={['Tools', 'Number leases']} sub="Each terminal is given a block of bill numbers so two counters never use the same one, even offline." />
    <div className="px-5 pb-6 max-w-3xl space-y-4"><table className="tbl"><thead><tr><th>Terminal</th><th>Block</th><th>Used</th><th>State</th><th>Last seen</th><th /></tr></thead><tbody>{rows.map((r) => { const n = +r.to - +r.from + 1; const pct = Math.round((+r.used / n) * 100); return <tr key={String(r.id)}><td>{r.term}</td><td className="num">INV/26-27/{String(r.from).padStart(4, '0')} to {String(r.to).padStart(4, '0')}</td><td><div className="w-28 h-2 bg-wash rounded" role="img" aria-label={`${r.used} of ${n} used`}><div className="h-2 rounded" style={{ width: pct + '%', background: pct > 90 ? 'var(--sindoor)' : 'var(--neel)' }} /></div><span className="text-xs muted num">{r.used}/{n}</span></td><td>{r.state}</td><td className="text-xs">{r.seen}</td><td className="text-right space-x-1">{r.state === 'Used up' && <Btn className="btn-sm" needs="E" onClick={() => { const a = next, b = next + +size - 1; setRows('leases', () => [...rows.map((x) => (x.id === r.id ? { ...x, state: 'Closed' } : x)), { id: 'l' + Date.now(), term: r.term, from: a, to: b, used: 0, state: 'Active', seen: 'Online now' }]); toast(`${r.term} given numbers ${a} to ${b}.`) }}>Give next block</Btn>}{String(r.seen).startsWith('Offline') && r.state === 'Active' && <Btn className="btn-sm" needs="E" onClick={() => { upd(String(r.id), { state: 'Reclaimed' }); toast(`Unused numbers taken back. ${n - +r.used} will appear in the gap report as voided.`, 'warn') }}>Take back</Btn>}</td></tr> })}</tbody></table>
      <div className="flex items-end gap-3"><Field label="Next block size"><select className="inp w-28" value={size} onChange={(e) => setSize(e.target.value)}>{['25', '50', '100'].map((x) => <option key={x}>{x}</option>)}</select></Field><p className="text-xs muted pb-2">Next free number: {String(next).padStart(4, '0')}</p></div>
      {voided > 0 && <p role="status" className="panel p-3 text-[13px]">{voided} numbers were taken back unused. The numbering gap report lists them as voided, with the date.</p>}</div></div>
}

/* ---------- Consolidation (PLT-07, RPT-10) ---------- */
const SISTERS = [{ n: 'Malabar Home Textiles, Kozhikode (sample)', sales: 4180000, cogs: 3020000, rec: 612000, pay: 488000, cash: 236000 }, { n: 'Kochi Wholesale Traders (sample)', sales: 2760000, cogs: 2140000, rec: 344000, pay: 301000, cash: 98000 }]
export function Consolidate() {
  const s = useApp((x) => x); const [ic, setIc] = useState('250000'); const [pick, setPick] = useState([true, true])
  const mine = useMemo(() => { const p = s.invoices.filter((i) => i.status === 'posted'); return { n: s.draft.company.display + ' (this company)', sales: p.reduce((a, i) => a + i.sub, 0), cogs: p.reduce((a, i) => a + i.lines.reduce((b, l) => b + l.qty * l.cost, 0), 0), rec: s.parties.filter((x) => x.kind === 'customer' && x.balance > 0).reduce((a, x) => a + x.balance, 0), pay: -s.parties.filter((x) => x.kind === 'supplier' && x.balance < 0).reduce((a, x) => a + x.balance, 0), cash: s.ledgers.filter((l) => l.group === 'Cash and bank').reduce((a, l) => a + l.bal, 0) } }, [s.invoices, s.parties, s.ledgers, s.draft.company.display])
  const cos = [mine, ...SISTERS.filter((_, i) => pick[i])]; const el = Math.max(0, +ic || 0)
  const sum = (k: 'sales' | 'cogs' | 'rec' | 'pay' | 'cash') => cos.reduce((a, c) => a + c[k], 0)
  const rowsT: [string, 'sales' | 'cogs' | 'rec' | 'pay' | 'cash', number][] = [['Sales', 'sales', -el], ['Cost of goods', 'cogs', -el], ['Receivables', 'rec', 0], ['Payables', 'pay', 0], ['Cash and bank', 'cash', 0]]
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Consolidation" crumbs={['Reports', 'Consolidation']} sub="Add up companies that share an owner and take out what they sold to each other. Only this company is real data, the other two are samples." />
    <div className="px-5 pb-6 max-w-4xl space-y-3"><div className="flex flex-wrap gap-4 items-end">{SISTERS.map((c, i) => <label key={c.n} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={pick[i]} onChange={(e) => setPick(pick.map((x, j) => (j === i ? e.target.checked : x)))} />{c.n}</label>)}<Field label="Sales between these companies (₹)" hint="Removed from sales and cost of goods"><input className="inp num w-40" inputMode="numeric" value={ic} onChange={(e) => setIc(e.target.value.replace(/\D/g, ''))} /></Field></div>
      <div className="overflow-auto"><table className="tbl"><thead><tr><th>₹</th>{cos.map((c) => <th key={c.n} className="text-right">{c.n.replace(/ \(.*\)/, '')}</th>)}<th className="text-right">Between companies</th><th className="text-right">Consolidated</th></tr></thead><tbody>{rowsT.map(([l, k, e]) => <tr key={k}><td>{l}</td>{cos.map((c) => <td key={c.n} className="num">{inr0(c[k])}</td>)}<td className="num">{e ? inr0(e) : '–'}</td><td className="num font-semibold">{inr0(sum(k) + e)}</td></tr>)}<tr className="font-semibold"><td>Gross profit</td>{cos.map((c) => <td key={c.n} className="num">{inr0(c.sales - c.cogs)}</td>)}<td className="num">–</td><td className="num">{inr0(sum('sales') - sum('cogs'))}</td></tr></tbody></table></div></div></div>
}

/* ---------- Numbering gap report (PLT-03) ---------- */
export function NumGaps() {
  const inv = useApp((s) => s.invoices); const lease = useApp((s) => s.rows.leases)
  const by = useMemo(() => { const m = new Map<string, number[]>(); inv.forEach((i) => { const x = /^(.*?)(\d+)$/.exec(i.no); if (x) m.set(x[1], [...(m.get(x[1]) ?? []), +x[2]]) }); return [...m].map(([p, ns]) => { const s = new Set(ns); const lo = Math.min(...ns), hi = Math.max(...ns); const gaps: number[] = []; for (let n = lo; n <= hi; n++) if (!s.has(n)) gaps.push(n); return { p, lo, hi, count: ns.length, gaps } }) }, [inv])
  const voided = (lease ?? []).filter((r) => r.state === 'Reclaimed')
  return <div className="flex-1 min-h-0 scroll"><PageHead title="Numbering gap report" crumbs={['Books', 'Number gaps']} sub="Every missing number in a series needs a reason. Cancelled bills keep their number and are not gaps." />
    <div className="px-5 pb-6 max-w-3xl space-y-3">{by.length === 0 ? <Empty text="No numbered bills yet." /> : <table className="tbl"><thead><tr><th>Series</th><th>Range</th><th className="text-right">Bills</th><th>Missing numbers</th></tr></thead><tbody>{by.map((x) => <tr key={x.p}><td className="num">{x.p}</td><td className="num">{x.lo} to {x.hi}</td><td className="num">{x.count}</td><td>{x.gaps.length ? <span className="text-sindoor">{x.gaps.slice(0, 12).join(', ')}{x.gaps.length > 12 ? ` and ${x.gaps.length - 12} more` : ''}</span> : <span className="text-mehndi">None. Series is unbroken.</span>}</td></tr>)}</tbody></table>}
      {voided.length > 0 && <section><h2 className="font-semibold text-[13px] mb-1">Voided by taking back a lease</h2><ul className="panel divide-y divide-rule text-[13px]">{voided.map((r) => <li key={String(r.id)} className="p-2">{r.term}: {+r.used + +r.from} to {r.to} unused, voided {today()}</li>)}</ul></section>}</div></div>
}
export { Seg }
