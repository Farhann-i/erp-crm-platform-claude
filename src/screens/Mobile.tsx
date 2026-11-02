import { useState } from 'react'
import { useApp, set, toast, go, setMode } from '../lib/app'
import { inr0, today } from '../lib/fmt'
import { Icon } from '../ui/icons'
import { Bal, Status, Toggle, Spark } from '../ui/kit'
import { decide } from './DaySheet'

type Tab = 'day' | 'approve' | 'order' | 'stock' | 'collect'
export function Phone({ full }: { full?: boolean }) {
  const [tab, setTab] = useState<Tab>('day')
  const s = useApp((x) => x)
  const c = s.draft
  const body = tab === 'day' ? <Day /> : tab === 'approve' ? <Appr /> : tab === 'order' ? <Order /> : tab === 'stock' ? <StockM /> : <Collect />
  const nav: [Tab, string, string][] = [['day', 'Day sheet', 'sheet'], ['approve', 'Approvals', 'check'], ['order', 'Order', 'cart'], ['stock', 'Stock', 'box'], ['collect', 'Collect', 'wallet']]
  const inner = (
    <div className="h-full flex flex-col bg-cotton text-[14px]">
      <header className="shrink-0 px-4 h-12 flex items-center justify-between" style={{ background: 'var(--neel)', color: 'var(--on-neel)' }}>
        <div className="font-semibold truncate">{c.branches[0].display}</div>
        <div className="flex items-center gap-2 text-xs"><span className="size-2 rounded-full" style={{ background: s.offline ? 'color-mix(in srgb, var(--on-neel) 60%, transparent)' : '#62b58d' }} />{s.offline ? `Working locally${s.pending ? ` · ${s.pending} waiting` : ''}` : 'In sync'}
          <button aria-label="Toggle theme" onClick={() => set({ night: !s.night })}><Icon n={s.night ? 'sun' : 'moon'} /></button></div>
      </header>
      <div className="flex-1 scroll p-3">{body}</div>
      <nav aria-label="Mobile" className="shrink-0 grid grid-cols-5 bg-sheet border-t border-rule pb-1">
        {nav.map(([id, l, ic]) => <button key={id} onClick={() => setTab(id)} aria-current={tab === id} className={`h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] ${tab === id ? 'text-neel font-medium' : 'muted'}`}><Icon n={ic} size={20} />{l}</button>)}
      </nav>
    </div>
  )
  if (full) return <div className="h-full">{inner}</div>
  return (
    <div className="flex-1 scroll p-5">
      <h1 className="text-xl font-semibold">Phone view</h1>
      <p className="text-[13px] muted mb-4 max-w-xl">The installed mobile app, shown at 390 px. It is the same structure in one column. Open this page on a narrow window to see it full screen. Offline orders queue and sync later.</p>
      <div className="flex gap-6 items-start flex-wrap">
        <div className="w-[390px] h-[780px] rounded-[28px] border-[6px] border-ink/80 overflow-hidden shadow-xl">{inner}</div>
        <div className="panel p-4 max-w-xs text-[13px] space-y-2"><div className="flex items-center justify-between"><span>Simulate offline</span><Toggle on={s.offline} label="Simulate offline" onChange={(v) => set({ offline: v })} /></div><p className="muted text-xs">Capture an order while offline and watch the waiting count rise. Turn offline off and press Sync in the Pulse on desktop.</p></div>
      </div>
    </div>
  )
}
const Card = ({ children }: { children: React.ReactNode }) => <div className="panel p-3 mb-2.5">{children}</div>
function Day() {
  const s = useApp((x) => x)
  const sales = s.invoices.filter((i) => i.date === today() && i.status === 'posted')
  const tot = sales.reduce((a, i) => a + i.total, 0)
  const cash = s.ledgers.filter((l) => l.group === 'Cash and bank').reduce((a, l) => a + l.bal, 0)
  const owe = s.parties.filter((p) => p.kind === 'customer' && p.balance > 0).reduce((a, p) => a + p.balance, 0)
  return (
    <>
      <Card><div className="text-xs muted">What came in today</div><div className="text-3xl font-semibold num text-left">{inr0(tot)}</div><div className="flex items-center justify-between text-xs muted mt-1"><span>{sales.length} bills</span><Spark data={[3, 5, 4, 6, 5, 7, 8]} w={110} /></div></Card>
      <Card><div className="flex justify-between"><span className="muted text-xs">Cash and bank</span><span className="num font-medium">{inr0(cash)}</span></div><div className="flex justify-between mt-1"><span className="muted text-xs">Customers owe you</span><span className="num font-medium">{inr0(owe)}</span></div></Card>
      <Card><div className="text-xs muted mb-1">What needs you</div>{s.approvals.filter((a) => a.status === 'pending').slice(0, 2).map((a) => <div key={a.id} className="py-1.5 border-b border-rule last:border-0"><div className="text-[13px]">{a.title}</div><div className="text-xs muted">{inr0(a.amount)} · {a.by}</div></div>)}</Card>
    </>
  )
}
function Appr() {
  const a = useApp((x) => x.approvals).filter((x) => x.status === 'pending')
  return (
    <>
      {a.length === 0 && <p className="muted text-center py-10">All caught up.</p>}
      {a.map((x) => <Card key={x.id}><div className="chip mb-1">{x.kind}</div><div className="font-medium">{x.title}</div><p className="text-xs muted mt-1">{x.detail}</p><div className="grid grid-cols-2 gap-2 mt-3"><button className="btn btn-lg justify-center btn-danger" onClick={() => decide(x.id, 'rejected')}>Reject</button><button className="btn btn-lg btn-primary justify-center" onClick={() => decide(x.id, 'approved')}>Approve</button></div></Card>)}
    </>
  )
}
function Order() {
  const s = useApp((x) => x)
  const [pid, setPid] = useState('c1')
  const [lines, setLines] = useState<Record<string, number>>({})
  const total = Object.entries(lines).reduce((a, [id, q]) => a + q * (s.items.find((i) => i.id === id)?.rate ?? 0), 0)
  return (
    <>
      <select aria-label="Customer" className="inp h-11 text-[15px] mb-2" value={pid} onChange={(e) => setPid(e.target.value)}>{s.parties.filter((p) => p.kind === 'customer' && p.id !== 'c0').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="text-xs muted mb-2 px-1">Balance <Bal v={s.parties.find((p) => p.id === pid)!.balance} ctx="dues" party /></div>
      {s.items.slice(0, 6).map((i) => <div key={i.id} className="panel p-2.5 mb-2 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-[13px] truncate">{i.name}</div><div className="text-xs muted">{inr0(i.rate)} · van stock {i.stock.god}</div></div><button aria-label="Less" className="size-9 border border-rule rounded" onClick={() => setLines({ ...lines, [i.id]: Math.max(0, (lines[i.id] ?? 0) - 1) })}>−</button><span className="num w-6 text-center">{lines[i.id] ?? 0}</span><button aria-label="More" className="size-9 border border-rule rounded" onClick={() => setLines({ ...lines, [i.id]: (lines[i.id] ?? 0) + 1 })}>+</button></div>)}
      <button className="btn btn-primary btn-lg w-full justify-center mt-2" disabled={!total} onClick={() => { set((st) => ({ pending: st.offline ? st.pending + 1 : st.pending, rows: { ...st.rows, orders: [{ id: 'o' + Date.now(), total }, ...((st.rows.orders as never as object[]) ?? [])] as never } })); setLines({}); toast(s.offline ? 'Order saved on the phone. It will sync when you are online.' : 'Order sent to the branch.') }}>Save order {total ? inr0(total) : ''}</button>
    </>
  )
}
function StockM() {
  const items = useApp((x) => x.items)
  const [q, setQ] = useState('')
  const r = items.filter((i) => (i.name + i.code).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="flex gap-2 mb-2"><input aria-label="Search stock" className="inp h-11" placeholder="Search item or scan" value={q} onChange={(e) => setQ(e.target.value)} /><button aria-label="Scan with camera" className="btn h-11 px-3" onClick={() => { setQ(items[2].code); toast('Camera scan simulated. No camera was used.', 'info') }}><Icon n="camera" size={18} /></button></div>
      {r.map((i) => <Card key={i.id}><div className="text-[13px] font-medium">{i.name}</div><div className="text-xs muted">{i.code} · {inr0(i.rate)}</div><div className="grid grid-cols-3 gap-1 mt-2 text-xs"><div>Showroom<div className="num text-left font-medium">{i.stock.show}</div></div><div>Godown<div className="num text-left font-medium">{i.stock.god}</div></div><div>Kozhikode<div className="num text-left font-medium">{i.stock.kkd}</div></div></div></Card>)}
    </>
  )
}
function Collect() {
  const p = useApp((x) => x.parties).filter((x) => x.kind === 'customer' && x.balance > 0).sort((a, b) => b.overdueDays - a.overdueDays)
  return <>{p.map((x) => <Card key={x.id}><div className="flex justify-between"><span className="font-medium">{x.name}</span>{x.overdueDays > 30 && <Status s="Overdue" />}</div><div className="text-lg"><Bal v={x.balance} ctx="dues" party /></div><a className="btn btn-sm mt-2" href={`tel:${x.phone.replace(/\s/g, '')}`}>Call {x.phone}</a></Card>)}</>
}
export { setMode }
