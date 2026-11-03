import { useState } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr0, dmy, today, downloadCsv } from '../lib/fmt'
import { Btn, DataTable, PageHead, Status, Tabs, Toggle, Bal, useT, Seg, Empty } from '../ui/kit'
import { PrintPreview } from '../ui/PrintPreview'
import { Icon } from '../ui/icons'
import { decide } from './DaySheet'
import { ctx } from '../shell/ctx'

export function Approvals() {
  const s = useApp((x) => x)
  const [f, setF] = useState('pending')
  const list = s.approvals.filter((a) => f === 'all' || a.status === f)
  return (
    <div className="flex-1 scroll">
      <PageHead title="Approvals" sub="Everything waiting on a person. Chains come from Admin Studio. Answers can also come from WhatsApp (simulated)." crumbs={['Home', 'Approvals']}>
        <Seg label="Filter" value={f} onChange={setF} opts={[{ id: 'pending', label: `Pending (${s.approvals.filter((a) => a.status === 'pending').length})` }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }, { id: 'all', label: 'All' }]} />
      </PageHead>
      <div className="px-5 pb-6 max-w-4xl space-y-2">
        {list.length === 0 && <div className="panel"><Empty text="Nothing here. New requests appear when a cashier or accountant goes past a limit." /></div>}
        {list.map((a) => {
          const chain = s.draft.approvals.find((c) => c.doc.toLowerCase().includes(a.kind.toLowerCase().split(' ')[0]) || c.name.toLowerCase().includes(a.kind.toLowerCase()))
          return (
            <article key={a.id} className={`panel p-4 flex gap-4 items-start ${a.status === 'pending' ? 'draft-edge' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5"><span className="chip">{a.kind}</span><Status s={a.status} /></div>
                <h2 className="font-medium text-[14px]">{a.title}</h2>
                <p className="text-[13px] muted mt-0.5">{a.detail}</p>
                <div className="text-xs muted mt-1">Asked by {a.by} · {inr0(a.amount)} · due {a.due}{chain && <> · chain: {chain.steps.map((x) => x.role).join(' then ')}</>}</div>
              </div>
              {a.status === 'pending' ? <div className="flex gap-2 shrink-0"><Btn needs="A" onClick={() => decide(a.id, 'rejected')}>Reject</Btn><Btn needs="A" kind="primary" onClick={() => decide(a.id, 'approved')}>Approve</Btn></div> : <Btn className="btn-sm" onClick={() => set({ approvals: s.approvals.map((x) => (x.id === a.id ? { ...x, status: 'pending' } : x)) })}>Reopen</Btn>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function Sync() {
  const s = useApp((x) => x)
  const resolve = (id: string, status: 'kept mine' | 'took theirs') => { set({ conflicts: s.conflicts.map((c) => (c.id === id ? { ...c, status } : c)) }); toast(`Conflict resolved: ${status}. Both branches will converge on the next sync.`) }
  return (
    <div className="flex-1 scroll">
      <PageHead title="Sync and conflicts" sub="Each branch owns its own documents. Other branches see read-only copies. Only edits to shared records can conflict." crumbs={['Tools', 'Sync']} />
      <div className="px-5 pb-6 grid lg:grid-cols-[1fr_320px] gap-4">
        <section aria-label="Conflict queue" className="panel"><h2 className="px-4 py-3 font-semibold border-b border-rule">Conflict review queue</h2>
          {s.conflicts.map((c) => (
            <div key={c.id} className={`px-4 py-3 border-b border-rule last:border-0 ${c.status === 'open' ? 'draft-edge' : ''}`}>
              <div className="flex justify-between"><div className="font-medium text-[13px]">{c.doc}</div><Status s={c.status === 'open' ? 'Open' : 'Resolved'} /></div>
              <div className="text-xs muted">Edited at {c.branch}. Field: {c.field}</div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-[13px]"><div className="border border-rule rounded p-2"><div className="text-xs muted">This branch</div><div className="num text-left">{c.mine}</div></div><div className="border border-rule rounded p-2"><div className="text-xs muted">{c.branch}</div><div className="num text-left">{c.theirs}</div></div></div>
              {c.status === 'open' ? <div className="flex gap-2 mt-2"><Btn onClick={() => resolve(c.id, 'kept mine')}>Keep this branch</Btn><Btn onClick={() => resolve(c.id, 'took theirs')}>Take {c.branch}</Btn></div> : <div className="text-xs muted mt-2">Resolved: {c.status}</div>}
            </div>
          ))}
        </section>
        <section className="panel p-4 space-y-3 text-[13px] h-fit"><h2 className="font-semibold">Devices and branches</h2>
          {[['Kochi Main (this PC)', 'Now'], ['Kochi counter 2', '1 min ago'], ['Kozhikode', '4 min ago'], ['Thrissur', s.offline ? 'Offline' : '6 min ago']].map(([n, t]) => <div key={n} className="flex justify-between"><span>{n}</span><span className="muted">{t}</span></div>)}
          <div className="flex justify-between border-t border-rule pt-2"><span>Waiting to sync</span><span className="num">{s.pending}</span></div>
          <p className="text-xs muted">Billing never waits for sync. Changes queue and send when a connection returns.</p>
        </section>
      </div>
    </div>
  )
}

import { VoiceButton, Rate } from './Phase5'
export function Ask() {
  const s = useApp((x) => x)
  const mode = s.mode
  const seed = ctx.use((x) => x.docId)
  const [q, setQ] = useState(seed || '')
  const [log, setLog] = useState<{ q: string; a: React.ReactNode }[]>([])
  const [draft, setDraft] = useState(false)
  const answer = (text: string): React.ReactNode => {
    const n = text.toLowerCase()
    if (/profit|cost|margin/.test(n) && mode === 'counter') return <p>Cashier role cannot see profit or cost, so I cannot answer that. Ask the owner or manager.</p>
    if (/owe|overdue|due/.test(n)) { const top = s.parties.filter((p) => p.kind === 'customer' && p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 3); return <div><p>Three largest customer balances:</p><ul className="list-disc ml-5">{top.map((p) => <li key={p.id}>{p.name}: {inr0(p.balance)} owes you, {p.overdueDays} days late</li>)}</ul><Cite t={`Sources: ${top.length} party ledgers, as of today`} /></div> }
    if (/stock|low|running/.test(n)) { const low = s.items.filter((i) => Object.values(i.stock).reduce((a, b) => a + b, 0) < i.reorder * 1.3 && i.reorder > 0); return <div><p>{low.length} items are near or below reorder level:</p><ul className="list-disc ml-5">{low.slice(0, 4).map((i) => <li key={i.id}>{i.name}</li>)}</ul><Cite t="Sources: item master, stock by godown" /></div> }
    if (/sale|sold|today|briefing/.test(n)) { const t = s.invoices.filter((i) => i.date === today() && i.status === 'posted'); return <div><p>Today there are {t.length} posted bills worth {inr0(t.reduce((a, i) => a + i.total, 0))}. {s.approvals.filter((a) => a.status === 'pending').length} approvals are waiting for you.</p><Cite t="Sources: sales register for today, approvals inbox" /></div> }
    if (/bill|invoice|create|make/.test(n)) { setDraft(true); return <p>I prepared a draft bill below. Nothing is saved until you confirm.</p> }
    return <p>I can answer questions about sales, dues, stock and approvals, or draft a bill. Try "who owes us the most".</p>
  }
  const send = () => { if (!q.trim()) return; setLog([{ q, a: answer(q) }, ...log]); setQ('') }
  return (
    <div className="flex-1 scroll">
      <PageHead title="Ask assistant" crumbs={['Automation', 'Ask']} sub="Answers cite the records they used. Changes appear as draft cards and need your confirmation.">
        <span className="chip border-mehndi text-mehndi"><Icon n="shield" size={12} /> Runs on this PC</span>
      </PageHead>
      {!s.aiOn && <div className="mx-5 mb-3 panel p-3 text-[13px]">The assistant is switched off by an administrator (kill switch in Admin Studio).</div>}
      <div className="px-5 pb-6 max-w-3xl space-y-3">
        <div className="flex gap-2"><input className="inp h-10" aria-label="Ask a question" placeholder="Who owes us the most? What is running out? Make a bill for Anitha Menon." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} /><VoiceButton onText={(t) => { setLog((l) => [{ q: t, a: answer(t) }, ...l]) }} /><Btn kind="primary" className="btn-lg" onClick={send}>Ask</Btn></div>
        <div className="flex gap-2 flex-wrap">{['Who owes us the most?', 'What is running out?', 'Summarise today', 'Show profit this month', 'Create a bill for Anitha Menon'].map((x) => <button key={x} className="chip h-7 px-3 bg-sheet hover:bg-wash" onClick={() => { setLog([{ q: x, a: answer(x) }, ...log]) }}>{x}</button>)}</div>
        {draft && (
          <div className="panel draft-edge p-4"><div className="flex justify-between"><h2 className="font-semibold">Draft bill for Anitha Menon</h2><Status s="Draft" /></div>
            <table className="tbl mt-2"><tbody><tr><td>Cotton kurta, block print, mustard</td><td className="num">2 × ₹1,199</td></tr><tr><td>Cotton stole, ikat, rust</td><td className="num">1 × ₹449</td></tr></tbody></table>
            <div className="text-xs muted mt-2">Tape: Dr Anitha Menon ₹2,847 · Cr Sales ₹2,712 · Cr Output GST ₹135</div>
            <div className="flex gap-2 mt-3 justify-end"><Btn onClick={() => { setDraft(false); toast('Draft discarded.', 'info') }}>Discard</Btn><Btn kind="primary" onClick={() => { setDraft(false); toast('Draft sent to the billing screen for review. Nothing was posted.'); go('billing') }}>Confirm and open in billing</Btn></div></div>
        )}
        {log.map((l, i) => <div key={i} className="space-y-1"><div className="text-xs muted">You asked</div><div className="font-medium text-[13px]">{l.q}</div><div className="panel p-3 text-[13px]">{l.a}<Rate q={l.q} /></div></div>)}
        <p className="text-xs muted">Prototype note: answers are scripted from your demo data. No model is running.</p>
      </div>
    </div>
  )
}
const Cite = ({ t }: { t: string }) => <div className="text-xs muted mt-1.5 border-t border-rule pt-1">{t}</div>

export function Pipeline() {
  const c = useApp((x) => x.draft)
  const rows = useApp((x) => x.rows)
  const [pid, setPid] = useState('p1')
  const pl = c.pipelines.find((p) => p.id === pid) ?? c.pipelines[0]
  const seed: Record<string, { id: string; t: string; v: number; st: number }[]> = {
    p1: [{ id: 'a', t: 'Resort at Munnar, bedding', v: 320000, st: 0 }, { id: 'b', t: 'Hotel Sea Pearl, sheets', v: 148200, st: 1 }, { id: 'c', t: 'Sreejith Builders, towels', v: 96400, st: 2 }, { id: 'd', t: 'Lakshmi Handlooms, stoles', v: 74200, st: 3 }, { id: 'e', t: 'Joseph Mathew, mundu', v: 8900, st: 4 }],
    p2: [{ id: 'a', t: 'PO/0219 Kanchi Silk', v: 382000, st: 0 }, { id: 'b', t: 'PO/0218 Welspun', v: 71000, st: 1 }, { id: 'c', t: 'PO/0217 Kanchi Silk', v: 184800, st: 2 }],
    p3: [{ id: 'a', t: 'Meera Pillai', v: 78000, st: 0 }, { id: 'b', t: 'Anand Hospital canteen', v: 128000, st: 1 }, { id: 'c', t: 'Resort at Munnar', v: 320000, st: 2 }],
  }
  const key = 'pipe-' + pl.id
  const cards = ((rows[key] as never) ?? seed[pl.id] ?? []) as { id: string; t: string; v: number; st: number }[]
  const move = (id: string, d: number) => { set((s) => ({ rows: { ...s.rows, [key]: cards.map((x) => (x.id === id ? { ...x, st: Math.min(pl.stages.length - 1, Math.max(0, x.st + d)) } : x)) as never } })); toast(d > 0 ? 'Converted to the next document. Source stays linked.' : 'Moved back one stage.', 'info') }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Pipelines" sub="Stages come from the pipeline designer in Admin Studio. Rename or add a stage there and it changes here." crumbs={['Sales', 'Pipeline']}>
        <Seg label="Pipeline" value={pl.id} onChange={setPid} opts={c.pipelines.map((p) => ({ id: p.id, label: p.name }))} />
      </PageHead>
      <div className="flex-1 scroll px-5 pb-5"><div className="flex gap-3 min-h-full">
        {pl.stages.map((st, i) => { const cs = cards.filter((x) => Math.min(x.st, pl.stages.length - 1) === i); return (
          <section key={st.id} aria-label={st.name} className="w-64 shrink-0 bg-wash rounded-lg p-2 flex flex-col gap-2">
            <header className="flex justify-between px-1.5 pt-1"><h2 className="font-semibold text-[13px]">{st.name}{st.kind === 'approval' && <span className="chip ml-2">Approval</span>}</h2><span className="text-xs muted num">{inr0(cs.reduce((a, x) => a + x.v, 0))}</span></header>
            {cs.map((x) => <article key={x.id} className="panel p-2.5 text-[13px]"><div className="font-medium">{x.t}</div><div className="num text-left text-xs muted">{inr0(x.v)}</div><div className="flex gap-1 mt-2"><Btn className="btn-sm" disabled={i === 0} onClick={() => move(x.id, -1)}>Back</Btn><Btn className="btn-sm" kind="primary" disabled={i === pl.stages.length - 1} onClick={() => move(x.id, 1)}>{i === pl.stages.length - 2 ? 'Finish' : 'Convert'}</Btn></div></article>)}
            {cs.length === 0 && <p className="text-xs muted px-2 py-3">Nothing at this stage.</p>}
          </section>) })}
      </div></div>
    </div>
  )
}

export function Printing() {
  const c = useApp((x) => x.draft)
  const [bid, setBid] = useState(c.branches[0].id)
  const [o, setO] = useState({ dup: false, tagline: true, gstin: true })
  const b = c.branches.find((x) => x.id === bid) ?? c.branches[0]
  return (
    <div className="flex-1 scroll">
      <PageHead title="Print templates" sub="One template for every output. Thermal and A4 preview side by side." crumbs={['Tools', 'Print templates']}><Btn icon="printer" onClick={() => toast('Test page sent to the printer (simulated).', 'info')}>Print test page</Btn></PageHead>
      <div className="px-5 pb-6 grid lg:grid-cols-[260px_1fr] gap-5">
        <div className="panel p-4 space-y-3 text-[13px] h-fit">
          <label className="block"><span className="text-xs font-medium">Branch</span><select className="inp mt-1" value={bid} onChange={(e) => setBid(e.target.value)}>{c.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          {([['dup', 'Duplicate watermark'], ['tagline', 'Show tagline'], ['gstin', 'Show GSTIN']] as const).map(([k, l]) => <div key={k} className="flex justify-between items-center"><span>{l}</span><Toggle on={o[k]} label={l} onChange={(v) => setO({ ...o, [k]: v })} /></div>)}
          <p className="text-xs muted">Name, tagline and legal name are edited in Admin Studio, Shop identity.</p>
        </div>
        <div className="panel p-5"><PrintPreview c={c} b={b} opts={o} /></div>
      </div>
    </div>
  )
}

const PERMS = ['See cost and profit', 'Give discount above 10%', 'Post vouchers', 'Cancel posted bills', 'See other branches', 'Export reports', 'Change prices']
const ROLES = ['Owner', 'Manager', 'Accountant', 'Cashier', 'Godown keeper', 'CA (read-only)']
const BASE = [[1, 1, 1, 0, 0, 0], [1, 1, 0, 0, 0, 0], [1, 1, 1, 0, 0, 1], [1, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 1], [1, 1, 1, 0, 0, 1], [1, 1, 0, 0, 0, 0]]
export function Users() {
  const stored = useApp((x) => x.rows.roles as never) as number[][] | undefined
  const m = stored ?? BASE
  const [as, setAs] = useState('Cashier')
  const ri = ROLES.indexOf(as)
  const toggle = (p: number, r: number) => { if (r === 0) return; const n = m.map((x) => [...x]); n[p][r] = n[p][r] ? 0 : 1; set((s) => ({ rows: { ...s.rows, roles: n as never } })); toast(`${ROLES[r]}: "${PERMS[p]}" ${n[p][r] ? 'allowed' : 'removed'}.`, 'info') }
  return (
    <div className="flex-1 scroll">
      <PageHead title="Users and roles" crumbs={['Tools', 'Users']} sub="Permission matrix with a masking preview. Masked fields leave no gap, label or hint." />
      <div className="px-5 pb-6 grid xl:grid-cols-[1fr_340px] gap-5">
        <div className="panel overflow-auto"><table className="tbl"><thead><tr><th>Permission</th>{ROLES.map((r) => <th key={r} className="text-center">{r}</th>)}</tr></thead><tbody>{PERMS.map((p, i) => <tr key={p}><td>{p}</td>{ROLES.map((r, k) => <td key={r} className="text-center"><input type="checkbox" aria-label={`${r}: ${p}`} checked={!!m[i][k]} disabled={k === 0} onChange={() => toggle(i, k)} /></td>)}</tr>)}</tbody></table>
          <p className="text-xs muted p-3">Owner permissions are fixed. Field masking and the audit trail cannot be weakened here.</p></div>
        <div className="panel p-4 h-fit"><div className="flex items-center justify-between mb-2"><h2 className="font-semibold">View as role</h2><select className="inp w-36" aria-label="View as" value={as} onChange={(e) => setAs(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
          <table className="tbl"><thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th>{m[0][ri] ? <th className="text-right">Cost</th> : null}{m[0][ri] ? <th className="text-right">Margin</th> : null}</tr></thead><tbody><tr><td>Linen shirt</td><td className="num">24</td><td className="num">₹1,749</td>{m[0][ri] ? <td className="num">₹1,120</td> : null}{m[0][ri] ? <td className="num">36%</td> : null}</tr></tbody></table>
          <p className="text-xs muted mt-2">{m[0][ri] ? `${as} can see cost and margin.` : `${as} sees no cost or margin column at all, in screens, prints, exports or assistant answers.`}</p></div>
      </div>
    </div>
  )
}

export function Ledgers() {
  const l = useApp((x) => x.ledgers)
  return (
    <div className="flex-1 min-h-0 flex flex-col"><PageHead title="Ledgers" crumbs={['Books']} sub="Dr and Cr carry colour here because these are accounting views." />
      <DataTable name="ledgers" rows={l} filter={{ label: 'Group', get: (r) => r.group, opts: [...new Set(l.map((x) => x.group))] }} cols={[{ key: 'name', label: 'Ledger' }, { key: 'group', label: 'Group' }, { key: 'bal', label: 'Closing balance', num: true, render: (r) => <Bal v={r.bal} ctx="acct" dec={2} /> }]} /></div>
  )
}

export function Gstr() {
  const s = useApp((x) => x)
  const inv = s.invoices.filter((i) => i.status === 'posted')
  const [done, setDone] = useState(false)
  const checks = [['Every invoice has a valid HSN', true], ['GSTIN format valid for B2B parties', true], ['Place of supply set on all documents', true], ['Credit notes linked to original invoices', true], ['E-invoice IRN for invoices above threshold', s.rows.einv ? !(s.rows.einv as never as { status: string }[]).some((r) => r.status !== 'Generated') : false]] as [string, boolean][]
  const b2b = inv.filter((i) => s.parties.find((p) => p.id === i.partyId)?.gstin)
  return (
    <div className="flex-1 scroll">
      <PageHead title="GST returns" crumbs={['Bank and GST', 'GSTR-1 and 3B']} sub="Prepare, validate, export. Portal filing is not performed from this prototype.">
        <Btn icon="download" onClick={() => { const blob = new Blob([JSON.stringify({ gstin: s.draft.company.gstin, fp: '102026', b2b: b2b.map((i) => ({ inum: i.no, idt: i.date, val: i.total })) }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gstr1-offline.json'; a.click(); toast('Offline-tool JSON exported.') }}>Export JSON for offline tool</Btn>
        <Btn kind="primary" disabled={!checks.every((c) => c[1])} title={checks.every((c) => c[1]) ? '' : 'Fix validation first'} onClick={() => { setDone(true); toast('Marked ready for filing by your CA. Nothing was sent to the portal.', 'info') }}>{done ? 'Ready for CA' : 'Mark ready for CA'}</Btn>
      </PageHead>
      <div className="px-5 pb-6 grid lg:grid-cols-2 gap-5">
        <section className="panel p-4"><h2 className="font-semibold mb-2">GSTR-1 summary, October</h2><dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]"><dt className="muted">B2B invoices</dt><dd className="num">{b2b.length}</dd><dt className="muted">B2C invoices</dt><dd className="num">{inv.length - b2b.length}</dd><dt className="muted">Taxable value</dt><dd className="num">{inr0(inv.reduce((a, i) => a + i.sub, 0))}</dd><dt className="muted">Output tax</dt><dd className="num">{inr0(inv.reduce((a, i) => a + i.tax, 0))}</dd></dl><Btn className="btn-sm mt-3" onClick={() => go('reports')}>Open GST by rate</Btn></section>
        <section className="panel p-4"><h2 className="font-semibold mb-2">Validation report</h2><ul className="space-y-1.5 text-[13px]">{checks.map(([l, ok]) => <li key={l} className="flex gap-2"><span className={ok ? 'text-mehndi' : 'text-sindoor'}><Icon n={ok ? 'tick' : 'warn'} size={14} /></span>{l}{!ok && <button className="text-neel underline ml-auto" onClick={() => go('einv')}>Fix in queue</button>}</li>)}</ul></section>
      </div>
    </div>
  )
}
export { downloadCsv, dmy, Tabs, useT }
