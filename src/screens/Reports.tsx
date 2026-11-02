import { useMemo, useState } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr, inr0, dmy, downloadCsv, today } from '../lib/fmt'
import type { Invoice } from '../lib/data'
import { Btn, DataTable, Drawer, PageHead, Bal, Status, useT, Seg, type Col } from '../ui/kit'

type Row = { id: string; [k: string]: string | number }
const REPORTS: [string, string][] = [['sales', 'Sales register'], ['stock', 'Stock valuation'], ['ageing', 'Customer ageing'], ['payables', 'Supplier payables'], ['daybook', 'Day book'], ['trial', 'Trial balance'], ['pnl', 'Profit and loss'], ['balance', 'Balance sheet'], ['cashflow', 'Cash flow'], ['stockledger', 'Stock ledger'], ['gst', 'GST by rate']]

export function ReportViewer({ initial = 'sales' }: { initial?: string }) {
  const s = useApp((x) => x)
  const t = useT()
  const [rep, setRep] = useState(initial)
  const [from, setFrom] = useState('2026-04-01')
  const [to, setTo] = useState(today())
  const [group, setGroup] = useState('none')
  const [drill, setDrill] = useState<Invoice | null>(null)
  const [views, setViews] = useState<{ n: string; rep: string; group: string }[]>(() => s.rows.views as never ?? [{ n: 'Branch sales this month', rep: 'sales', group: 'branch' }])
  const inRange = <T extends { date: string }>(a: T[]) => a.filter((x) => x.date >= from && x.date <= to)
  const { cols, rows }: { cols: Col<Row>[]; rows: Row[] } = useMemo(() => {
    const inv = inRange(s.invoices).filter((i) => i.status !== 'draft')
    if (rep === 'sales') {
      if (group !== 'none') {
        const k = (i: Invoice) => (group === 'branch' ? i.branch : group === 'party' ? i.partyName : group === 'pay' ? i.pay : i.date.slice(0, 7))
        const m = new Map<string, Row>()
        inv.filter((i) => i.status === 'posted').forEach((i) => { const r = m.get(k(i)) ?? { id: k(i), g: k(i), bills: 0, sub: 0, tax: 0, total: 0 }; r.bills = +r.bills + 1; r.sub = +r.sub + i.sub; r.tax = +r.tax + i.tax; r.total = +r.total + i.total; m.set(k(i), r) })
        return { cols: [{ key: 'g', label: 'Group' }, { key: 'bills', label: 'Bills', num: true, total: true }, { key: 'sub', label: 'Taxable', num: true, total: true, render: (r) => inr0(+r.sub) }, { key: 'tax', label: 'GST', num: true, total: true, render: (r) => inr0(+r.tax) }, { key: 'total', label: 'Total', num: true, total: true, render: (r) => inr0(+r.total) }], rows: [...m.values()] }
      }
      return { cols: [{ key: 'no', label: 'Bill' }, { key: 'date', label: 'Date', render: (r) => dmy(String(r.date)) }, { key: 'party', label: t('{customer}') }, { key: 'branch', label: 'Branch' }, { key: 'pay', label: 'Payment', off: true }, { key: 'sub', label: 'Taxable', num: true, total: true, render: (r) => inr0(+r.sub), off: true }, { key: 'tax', label: 'GST', num: true, total: true, render: (r) => inr0(+r.tax) }, { key: 'total', label: 'Total', num: true, total: true, render: (r) => inr0(+r.total) }, { key: 'status', label: 'State', render: (r) => <Status s={String(r.status)} /> }], rows: inv.map((i) => ({ id: i.id, no: i.no, date: i.date, party: i.partyName, branch: i.branch, pay: i.pay, sub: i.sub, tax: i.tax, total: i.total, status: i.status })) }
    }
    if (rep === 'stock') return { cols: [{ key: 'name', label: t('{item}') }, { key: 'qty', label: 'Qty', num: true }, { key: 'cost', label: 'Cost', num: true, render: (r) => inr0(+r.cost) }, { key: 'val', label: 'Value', num: true, total: true, render: (r) => inr0(+r.val) }], rows: s.items.map((i) => { const q = Object.values(i.stock).reduce((a, b) => a + b, 0); return { id: i.id, name: i.name, qty: q, cost: i.cost, val: q * i.cost } }) }
    if (rep === 'ageing' || rep === 'payables') {
      const isC = rep === 'ageing'
      return { cols: [{ key: 'name', label: 'Party' }, { key: 'b0', label: '0 to 30', num: true, render: (r) => inr0(+r.b0) }, { key: 'b1', label: '31 to 60', num: true, render: (r) => inr0(+r.b1) }, { key: 'b2', label: 'Over 60', num: true, render: (r) => inr0(+r.b2) }, { key: 'bal', label: 'Balance', num: true, total: true, render: (r) => <Bal v={isC ? +r.bal : -Math.abs(+r.bal)} ctx="dues" /> }], rows: s.parties.filter((p) => (isC ? p.kind === 'customer' && p.balance > 0 : p.kind === 'supplier')).map((p) => { const b = Math.abs(p.balance), d = p.overdueDays; return { id: p.id, name: p.name, b0: d <= 30 ? b : 0, b1: d > 30 && d <= 60 ? b : 0, b2: d > 60 ? b : 0, bal: b } }) }
    }
    if (rep === 'daybook') return { cols: [{ key: 'no', label: 'Voucher' }, { key: 'date', label: 'Date', render: (r) => dmy(String(r.date)) }, { key: 'type', label: 'Type' }, { key: 'particulars', label: 'Particulars' }, { key: 'dr', label: 'Debit', num: true, total: true, render: (r) => inr0(+r.dr) }, { key: 'status', label: 'State', render: (r) => <Status s={String(r.status)} /> }], rows: inRange(s.vouchers).map((v) => ({ id: v.id, no: v.no, date: v.date, type: v.type, particulars: v.lines.map((l) => l.ledger).join(' / '), dr: v.lines.reduce((a, l) => a + l.dr, 0), status: v.status })) }
    if (rep === 'trial') return { cols: [{ key: 'name', label: 'Ledger' }, { key: 'group', label: 'Group' }, { key: 'dr', label: 'Debit', num: true, total: true, render: (r) => (+r.dr ? inr(+r.dr) : '') }, { key: 'cr', label: 'Credit', num: true, total: true, render: (r) => (+r.cr ? inr(+r.cr) : '') }], rows: s.ledgers.map((l) => ({ id: l.id, name: l.name, group: l.group, dr: l.bal > 0 ? l.bal : 0, cr: l.bal < 0 ? -l.bal : 0 })) }
    if (rep === 'balance') {
      const g = (n: string) => s.ledgers.filter((l) => l.group === n)
      const profit = -s.ledgers.filter((l) => l.group === 'Income' || l.group === 'Expenses').reduce((a, l) => a + l.bal, 0)
      const stockVal = s.items.reduce((a, i) => a + Object.values(i.stock).reduce((x, y) => x + y, 0) * i.cost, 0)
      const L: Row[] = [...g('Capital').map((l) => ({ id: l.id, name: l.name, side: 'Liabilities', amt: -l.bal })), { id: 'pl', name: 'Net profit for the period', side: 'Liabilities', amt: profit }, ...g('Current liabilities').map((l) => ({ id: l.id, name: l.name, side: 'Liabilities', amt: -l.bal })), ...g('Duties and taxes').map((l) => ({ id: l.id, name: l.name + ' (net)', side: 'Liabilities', amt: -l.bal }))]
      const A: Row[] = [...g('Cash and bank').map((l) => ({ id: l.id, name: l.name, side: 'Assets', amt: l.bal })), ...g('Current assets').map((l) => ({ id: l.id, name: l.name, side: 'Assets', amt: l.bal })), { id: 'stk', name: 'Closing stock at cost', side: 'Assets', amt: stockVal }]
      const tl = L.reduce((a, r) => a + +r.amt, 0), ta = A.reduce((a, r) => a + +r.amt, 0)
      return { cols: [{ key: 'side', label: 'Side' }, { key: 'name', label: 'Account' }, { key: 'amt', label: 'Amount', num: true, render: (r) => inr0(+r.amt) }], rows: [...L, { id: 'tl', name: 'Total liabilities', side: '', amt: tl }, ...A, { id: 'ta', name: 'Total assets', side: '', amt: ta }, { id: 'df', name: Math.abs(ta - tl) < 1 ? 'Balanced' : 'Difference (open stock and drawings are not carried in the prototype)', side: '', amt: ta - tl }] }
    }
    if (rep === 'cashflow') {
      const rec = new Map<string, { inn: number; out: number }>()
      s.vouchers.filter((v) => v.status === 'posted').forEach((v) => { const cb = v.lines.filter((l) => /cash|bank|hdfc|federal/i.test(l.ledger)); const inn = cb.reduce((a, l) => a + l.dr, 0), out = cb.reduce((a, l) => a + l.cr, 0); if (inn || out) { const r = rec.get(v.type) ?? { inn: 0, out: 0 }; rec.set(v.type, { inn: r.inn + inn, out: r.out + out }) } })
      const rows: Row[] = [...rec.entries()].map(([k, v]) => ({ id: k, kind: k, inn: v.inn, out: v.out, net: v.inn - v.out }))
      const cl = s.ledgers.filter((l) => l.group === 'Cash and bank').reduce((a, l) => a + l.bal, 0)
      return { cols: [{ key: 'kind', label: 'Voucher type' }, { key: 'inn', label: 'Cash in', num: true, total: true, render: (r) => inr0(+r.inn) }, { key: 'out', label: 'Cash out', num: true, total: true, render: (r) => inr0(+r.out) }, { key: 'net', label: 'Net', num: true, total: true, render: (r) => inr0(+r.net) }], rows: [...rows, { id: 'cl', kind: 'Closing cash and bank in books', inn: 0, out: 0, net: cl }] }
    }
    if (rep === 'stockledger') {
      const out = new Map<string, { id: string; date: string; no: string; qty: number }[]>()
      s.invoices.filter((i) => i.status === 'posted').forEach((i) => i.lines.forEach((l) => { const a = out.get(l.itemId) ?? []; a.push({ id: i.id, date: i.date, no: i.no, qty: l.qty }); out.set(l.itemId, a) }))
      const rows: Row[] = []
      out.forEach((mv, itemId) => { const it = s.items.find((x) => x.id === itemId); if (!it) return; const now = Object.values(it.stock).reduce((a, b) => a + b, 0); let run = now + mv.reduce((a, m) => a + m.qty, 0); rows.push({ id: 'o' + itemId, item: it.name, date: '', doc: 'Opening balance', inn: run, out: 0, bal: run }); [...mv].sort((a, b) => a.date.localeCompare(b.date)).forEach((m, k) => { run -= m.qty; rows.push({ id: m.id + itemId + k, item: it.name, date: m.date, doc: m.no, inn: 0, out: m.qty, bal: run }) }) })
      return { cols: [{ key: 'item', label: t('{item}') }, { key: 'date', label: 'Date', render: (r) => (r.date ? dmy(String(r.date)) : '') }, { key: 'doc', label: 'Document' }, { key: 'inn', label: 'In', num: true, render: (r) => (+r.inn ? String(r.inn) : '') }, { key: 'out', label: 'Out', num: true, render: (r) => (+r.out ? String(r.out) : '') }, { key: 'bal', label: 'Balance', num: true }], rows }
    }
    if (rep === 'pnl') {
      const inc = s.ledgers.filter((l) => l.group === 'Income'), ex = s.ledgers.filter((l) => l.group === 'Expenses')
      return { cols: [{ key: 'name', label: 'Account' }, { key: 'side', label: 'Side' }, { key: 'amt', label: 'Amount', num: true, total: false, render: (r) => inr0(+r.amt) }], rows: [...ex.map((l) => ({ id: l.id, name: l.name, side: 'Expense', amt: l.bal })), ...inc.map((l) => ({ id: l.id, name: l.name, side: 'Income', amt: -l.bal })), { id: 'np', name: 'Net profit', side: 'Result', amt: inc.reduce((a, l) => a - l.bal, 0) - ex.reduce((a, l) => a + l.bal, 0) }] }
    }
    const m = new Map<number, Row>()
    inv.filter((i) => i.status === 'posted').forEach((i) => i.lines.forEach((l) => { const r = m.get(l.gst) ?? { id: 'g' + l.gst, rate: l.gst + '%', taxable: 0, cgst: 0, sgst: 0 }; const net = l.qty * l.rate * (1 - l.disc / 100); r.taxable = +r.taxable + net; r.cgst = +r.cgst + (net * l.gst) / 200; r.sgst = +r.sgst + (net * l.gst) / 200; m.set(l.gst, r) }))
    return { cols: [{ key: 'rate', label: 'GST rate' }, { key: 'taxable', label: 'Taxable value', num: true, total: true, render: (r) => inr0(+r.taxable) }, { key: 'cgst', label: 'CGST', num: true, total: true, render: (r) => inr0(+r.cgst) }, { key: 'sgst', label: 'SGST', num: true, total: true, render: (r) => inr0(+r.sgst) }], rows: [...m.values()] }
  }, [rep, from, to, group, s.invoices, s.vouchers, s.ledgers, s.items, s.parties])
  const title = REPORTS.find((r) => r[0] === rep)![1]
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title={title} crumbs={['Reports']} sub={`${dmy(from)} to ${dmy(to)}. Totals stay pinned. Click a row to open its source.`}>
        <Btn needs="X" icon="download" onClick={() => downloadCsv(`${rep}-${to}.csv`, cols.map((c) => c.label), rows.map((r) => cols.map((c) => r[c.key] ?? '')))}>Export CSV</Btn>
      </PageHead>
      <div className="px-5 pb-3 flex items-center gap-3 flex-wrap text-xs">
        <label className="flex items-center gap-1.5"><span className="muted">Report</span><select className="inp w-44" value={rep} onChange={(e) => { setRep(e.target.value); setGroup('none') }}>{REPORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
        <label className="flex items-center gap-1.5"><span className="muted">From</span><input type="date" className="inp w-36" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex items-center gap-1.5"><span className="muted">To</span><input type="date" className="inp w-36" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {rep === 'sales' && <label className="flex items-center gap-1.5"><span className="muted">Group by</span><select className="inp w-32" value={group} onChange={(e) => setGroup(e.target.value)}><option value="none">No grouping</option><option value="branch">Branch</option><option value="party">{t('{customer}')}</option><option value="pay">Payment mode</option><option value="month">Month</option></select></label>}
        <span className="flex-1" />
        <label className="flex items-center gap-1.5"><span className="muted">Saved views</span><select className="inp w-48" value="" onChange={(e) => { const v = views.find((x) => x.n === e.target.value); if (v) { setRep(v.rep); setGroup(v.group) } }}><option value="">Choose a view</option>{views.map((v) => <option key={v.n}>{v.n}</option>)}</select></label>
        <Btn className="btn-sm" onClick={() => { const n = `${title}${group !== 'none' ? ' by ' + group : ''}`; const nv = [...views.filter((v) => v.n !== n), { n, rep, group }]; setViews(nv); set((st) => ({ rows: { ...st.rows, views: nv as never } })); toast(`View "${n}" saved.`) }}>Save view</Btn>
      </div>
      <DataTable name="rows" rows={rows} cols={cols} pageSize={14} onOpen={(r) => { const i = s.invoices.find((x) => x.id === r.id); if (i) setDrill(i); else if (rep === 'ageing' || rep === 'payables') go('parties'); else toast('This row has no single source document. Use grouping off to drill down.', 'info') }} />
      <Drawer open={!!drill} onClose={() => setDrill(null)} title={drill?.no ?? ''}>
        {drill && <div className="space-y-3 text-[13px]"><div className="flex justify-between"><span>{drill.partyName}</span><Status s={drill.status} /></div><div className="muted text-xs">{drill.branch} · {dmy(drill.date)} · {drill.by}</div>
          <table className="tbl"><tbody>{drill.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td className="num">{l.qty}</td><td className="num">{inr0(l.qty * l.rate)}</td></tr>)}</tbody></table>
          <div className="flex justify-between border-t border-rule pt-2 font-medium"><span>Total incl. GST</span><span className="num">{inr(drill.total)}</span></div></div>}
      </Drawer>
    </div>
  )
}
export { Seg }
