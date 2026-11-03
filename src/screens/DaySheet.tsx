import { useMemo } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr0, compact, today, dmy } from '../lib/fmt'
import { Bal, Btn, Spark, Status, PageHead, useT } from '../ui/kit'
import { ctx } from '../shell/ctx'
import { WidgetStrip } from './Phase5b'

export function decide(id: string, status: 'approved' | 'rejected') {
  set((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, status } : a)), notices: [{ id: 'n' + Date.now(), text: `Request ${status}: ${s.approvals.find((a) => a.id === id)?.title}`, at: 'Just now', read: false }, ...s.notices] }))
  toast(status === 'approved' ? 'Approved. The requester is notified.' : 'Rejected. The requester sees your decision.', status === 'approved' ? 'ok' : 'warn')
}
export function DaySheet() {
  const s = useApp((x) => x)
  const t = useT()
  const layout = s.draft.layouts.day
  const sales = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const iso = d.toISOString().slice(0, 10); return s.invoices.filter((x) => x.date === iso && x.status === 'posted').reduce((a, x) => a + x.total, 0) }), [s.invoices])
  const todaySales = sales[6]
  const cash = s.ledgers.filter((l) => l.group === 'Cash and bank')
  const byBranch = s.draft.branches.map((b) => ({ b, v: s.invoices.filter((x) => x.date === today() && x.branch === b.name && x.status === 'posted').reduce((a, x) => a + x.total, 0) }))
  const dues = s.parties.filter((p) => p.kind === 'customer' && p.balance > 0).sort((a, b) => b.overdueDays - a.overdueDays).slice(0, 5)
  const pay = s.parties.filter((p) => p.kind === 'supplier' && p.balance < 0).sort((a, b) => a.balance - b.balance)
  const low = s.items.filter((i) => Object.values(i.stock).reduce((a, x) => a + x, 0) < i.reorder * 1.3 && i.reorder > 0).slice(0, 5)
  const pend = s.approvals.filter((a) => a.status === 'pending')
  const conf = s.conflicts.filter((c) => c.status === 'open')
  const yesterday = sales[5]
  const Sec = ({ n, q, children, act }: { n?: string; q: string; children: React.ReactNode; act?: React.ReactNode }) => (
    <section className="py-3 border-b border-rule last:border-0" aria-label={q}>
      <div className="flex items-center justify-between mb-1.5"><h2 className="font-semibold text-[15px]">{q}</h2>{act}</div>
      {children}
    </section>
  )
  const A = (
    <>
      <Sec q="What came in today" act={<Btn className="btn-sm" onClick={() => go('reports')}>Open sales register</Btn>}>
        <div className="flex items-end gap-6 flex-wrap">
          <div><div className="text-3xl font-semibold num text-left">{inr0(todaySales)}</div><div className="text-xs muted">Sales today, {s.invoices.filter((x) => x.date === today() && x.status === 'posted').length} bills</div></div>
          <div className="text-xs"><Spark data={sales} w={140} h={32} /><div className="muted">{todaySales >= yesterday ? 'Up' : 'Down'} {inr0(Math.abs(todaySales - yesterday))} on yesterday</div></div>
          <div className="flex gap-6">{cash.map((c) => <div key={c.id} className="text-xs"><div className="muted truncate max-w-40">{c.name.replace(' current A/c 5010', '').replace(' A/c 2271', '')}</div><div className="text-base font-medium"><Bal v={c.bal} ctx="other" /></div></div>)}</div>
        </div>
        <table className="tbl mt-2"><tbody>{byBranch.map(({ b, v }) => <tr key={b.id}><td className="w-48">{b.name}</td><td className="num w-32">{inr0(v)}</td><td className="muted text-xs">{b.display}</td></tr>)}</tbody></table>
      </Sec>
      <Sec q={`Who owes us`} act={<Btn className="btn-sm" onClick={() => go('collections')}>Collections</Btn>}>
        <table className="tbl"><tbody>{dues.map((p) => (
          <tr key={p.id}><td><button className="font-medium hover:underline" onClick={() => { ctx.set({ kind: 'party', id: p.id }); go('parties') }}>{p.name}</button></td><td className="text-right"><Bal v={p.balance} ctx="dues" /></td><td className="w-28 text-xs">{p.overdueDays ? <Status s={`${p.overdueDays} days late`} /> : <span className="muted">Not due</span>}</td><td className="w-24 text-right"><Btn className="btn-sm" disabled={!p.consent} title={p.consent ? '' : 'No WhatsApp consent'} onClick={() => toast(`Reminder drafted for ${p.name} with a UPI link. Delivery is simulated.`, 'info')}>Remind</Btn></td></tr>
        ))}</tbody></table>
      </Sec>
    </>
  )
  const B = (
    <>
      <Sec q="What we owe, next 7 days"><table className="tbl"><tbody>{pay.map((p) => <tr key={p.id}><td>{p.name}</td><td className="text-right"><Bal v={p.balance} ctx="dues" /></td><td className="w-28 text-xs muted">Due in {2 + (p.name.length % 5)} days</td></tr>)}</tbody></table></Sec>
      <Sec q={`What is running out`} act={<Btn className="btn-sm" onClick={() => go('reorder')}>Reorder suggestions</Btn>}>
        {low.length === 0 ? <p className="text-[13px] muted">Every {t('{item}').toLowerCase()} is above its reorder level.</p> : <table className="tbl"><tbody>{low.map((i) => { const q = Object.values(i.stock).reduce((a, x) => a + x, 0); return <tr key={i.id}><td className="truncate max-w-64">{i.name}</td><td className="num w-28">{q} / {i.reorder} {i.unit}</td><td className="w-32 text-right"><Btn className="btn-sm" onClick={() => { set((st) => ({ rows: { ...st.rows, po: [{ id: 'po' + Date.now(), no: 'Draft', supplier: st.parties.find((p) => p.id === i.supplierId)?.name ?? '', items: i.name, value: i.reorder * 2 * i.cost, status: 'Draft', date: today() }, ...(st.rows.po ?? [])] } })); toast(`Draft purchase order for ${i.name.slice(0, 28)} created.`) }}>Draft PO</Btn></td></tr> })}</tbody></table>}
      </Sec>
      <Sec q="What needs you" act={<Btn className="btn-sm" onClick={() => go('approvals')}>Open inbox</Btn>}>
        {pend.length + conf.length === 0 && <p className="text-[13px] muted">Nothing is waiting on you.</p>}
        {pend.slice(0, 3).map((a) => <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-rule last:border-0 text-[13px]"><div className="flex-1 min-w-0"><div className="truncate">{a.title}</div><div className="text-xs muted">{a.by} · {inr0(a.amount)} · {a.due}</div></div><Btn className="btn-sm" onClick={() => decide(a.id, 'rejected')}>Reject</Btn><Btn kind="primary" className="btn-sm" onClick={() => decide(a.id, 'approved')}>Approve</Btn></div>)}
        {conf.length > 0 && <div className="flex items-center justify-between pt-2 text-[13px]"><span>{conf.length} sync conflicts between branches</span><Btn className="btn-sm" onClick={() => go('sync')}>Resolve</Btn></div>}
      </Sec>
    </>
  )
  return (
    <div className="flex-1 scroll">
      <PageHead title={`Good morning. ${s.draft.company.display}`} sub={`${dmy(today())}. Every figure opens its source. Read it as questions, top to bottom.`} crumbs={['Home', 'Day sheet']}>
        <Btn icon="spark" onClick={() => go('ask')}>Read the daily briefing</Btn>
      </PageHead>
      <WidgetStrip />
      <div className={`mx-5 mb-6 panel px-5 ${layout === 'split' ? 'grid lg:grid-cols-2 gap-x-8' : ''}`}>
        {layout === 'split' ? <><div>{A}</div><div>{B}</div></> : <>{A}{B}</>}
      </div>
    </div>
  )
}
