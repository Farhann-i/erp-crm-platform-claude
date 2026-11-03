import { useState, type ReactNode } from 'react'
import { useApp, set, toast, go } from '../lib/app'
import { inr0, today, downloadCsv } from '../lib/fmt'
import { Btn, PageHead, Modal, Field } from '../ui/kit'
import { Icon } from '../ui/icons'
import { SPECS } from './Generic'

const saveFile = (name: string, text: string, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500) }
const request = (kind: string, title: string, detail: string, amount = 0) => set((s) => ({ approvals: [{ id: 'ap' + Date.now(), kind, title, by: 'Anwar Sadiq', amount, detail, due: 'Today', status: 'pending' as const }, ...s.approvals] }))
type P = { onClose: () => void }
const Foot = ({ onClose, go: g, label, disabled }: { onClose: () => void; go: () => void; label: string; disabled?: boolean }) => <div className="flex justify-end gap-2 pt-3"><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={disabled} onClick={g}>{label}</Btn></div>

function PlanLimit({ onClose }: P) {
  return <div className="space-y-3 text-[13px]"><p>You are using <b className="num">15 of 15</b> users on the Business plan. Adding another needs a higher plan or a free seat.</p><div className="flex gap-2 flex-wrap"><Btn onClick={() => { onClose(); go('users') }}>Free a seat in Users</Btn><Btn kind="primary" onClick={() => { request('Plan', 'Upgrade to Enterprise plan', 'Requested from the plan limit prompt'); toast('Upgrade request sent to the owner.'); onClose() }}>Ask owner to upgrade</Btn></div></div>
}
function PriceProtect({ onClose }: P) {
  const items = useApp((s) => s.items)
  const [id, setId] = useState(items[0]?.id ?? ''); const [rate, setRate] = useState(''); const [why, setWhy] = useState('')
  const it = items.find((i) => i.id === id)
  const r = +rate; const below = it && r > 0 && r < it.cost
  return <div className="space-y-3"><Field label="Item"><select className="inp" value={id} onChange={(e) => setId(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field><Field label="Rate you want to bill at"><input className="inp num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
    {it && r > 0 && <p className={`text-xs px-2 py-1 rounded ${below ? 'bg-sindoor/10 text-sindoor' : 'bg-mehndi/15'}`}>{below ? `Below cost of ${inr0(it.cost)}. This bill would lose ${inr0(it.cost - r)} a piece.` : `Margin ${Math.round(((r - it.cost) / r) * 100)}%. No warning needed.`}</p>}
    {below && <Field label="Reason for the override" req><input className="inp" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>}
    <Foot onClose={onClose} label={below ? 'Ask manager to approve' : 'Use this rate'} disabled={!r || (!!below && !why.trim())} go={() => { if (below) request('Price', `Rate ${inr0(r)} below cost for ${it!.name}`, why, r); toast(below ? 'Request sent to the manager.' : 'Rate accepted.'); onClose() }} /></div>
}
function Override({ onClose }: P) {
  const [kind, setKind] = useState('Discount'); const [amt, setAmt] = useState(''); const [why, setWhy] = useState('')
  return <div className="space-y-3"><Field label="What needs an override"><select className="inp" value={kind} onChange={(e) => setKind(e.target.value)}><option>Discount</option><option>Credit limit</option><option>Refund</option></select></Field><Field label={kind === 'Discount' ? 'Discount %' : 'Amount (₹)'}><input className="inp num" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field><Field label="Reason" req><input className="inp" value={why} onChange={(e) => setWhy(e.target.value)} /></Field><Foot onClose={onClose} label="Send for approval" disabled={!(+amt > 0) || !why.trim()} go={() => { request(kind, `${kind} override ${amt}${kind === 'Discount' ? '%' : ''}`, why, kind === 'Discount' ? 0 : +amt); toast('Request is in the Approvals inbox.'); onClose() }} /></div>
}
function UpiConfirm({ onClose }: P) {
  const [ref, setRef] = useState(''); const [amt, setAmt] = useState(''); const [e, setE] = useState('')
  return <div className="space-y-3"><Field label="UPI reference (12 digits)" error={e}><input className="inp num" inputMode="numeric" value={ref} onChange={(x) => setRef(x.target.value)} /></Field><Field label="Amount received (₹)"><input className="inp num" inputMode="decimal" value={amt} onChange={(x) => setAmt(x.target.value)} /></Field><Foot onClose={onClose} label="Confirm received" go={() => { if (!/^\d{12}$/.test(ref.replace(/\s/g, ''))) return setE('A UPI reference has 12 digits.'); if (!(+amt > 0)) return setE('Enter the amount.'); set((s) => ({ ledgers: s.ledgers.map((l) => (l.name.startsWith('HDFC') ? { ...l, bal: l.bal + +amt } : l)) })); toast(`${inr0(+amt)} received by UPI, reference ${ref}.`); onClose() }} /></div>
}
function PayLink({ onClose }: P) {
  const inv = useApp((s) => s.invoices).filter((i) => i.total - i.paid > 0.5)
  const all = useApp((s) => s.invoices)
  const list = inv.length ? inv : all.slice(0, 5)
  const [id, setId] = useState(list[0]?.id ?? ''); const i = all.find((x) => x.id === id)
  const link = i ? `https://pay.example.shop/i/${i.no.replace(/\W+/g, '-').toLowerCase()}?amt=${Math.round(i.total - i.paid || i.total)}` : ''
  return <div className="space-y-3"><Field label="Bill"><select className="inp" value={id} onChange={(e) => setId(e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.no} · {x.partyName} · {inr0(x.total - x.paid || x.total)}</option>)}</select></Field><div className="panel p-2 text-xs break-all num">{link}</div><p className="text-xs muted">Simulated link. No payment gateway is contacted.</p><div className="flex gap-2 justify-end"><Btn onClick={onClose}>Close</Btn><Btn onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); toast('Link copied.') }}>Copy link</Btn><Btn kind="primary" icon="chat" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Pay here: ' + link)}`, '_blank', 'noopener')}>Send on WhatsApp</Btn></div></div>
}
function CardReceipt({ onClose }: P) {
  const [v, setV] = useState({ last4: '', code: '', amt: '' }); const [e, setE] = useState('')
  return <div className="space-y-3"><Field label="Last four digits of the card" error={e}><input className="inp num w-32" maxLength={4} inputMode="numeric" value={v.last4} onChange={(x) => setV({ ...v, last4: x.target.value })} /></Field><Field label="Approval code from the machine"><input className="inp num" value={v.code} onChange={(x) => setV({ ...v, code: x.target.value })} /></Field><Field label="Amount (₹)"><input className="inp num" inputMode="decimal" value={v.amt} onChange={(x) => setV({ ...v, amt: x.target.value })} /></Field><Foot onClose={onClose} label="Record card payment" go={() => { if (!/^\d{4}$/.test(v.last4)) return setE('Enter exactly four digits.'); if (!v.code.trim() || !(+v.amt > 0)) return setE('Approval code and amount are needed.'); set((s) => ({ ledgers: s.ledgers.map((l) => (l.name === 'Card settlement receivable' ? { ...l, bal: l.bal + +v.amt } : l)) })); toast(`Card payment of ${inr0(+v.amt)} recorded, settles to the bank in 2 days.`); onClose() }} /></div>
}
function DupBill({ onClose }: P) {
  const rows = useApp((s) => s.rows.pinv) ?? SPECS.pinv.seed
  const [sup, setSup] = useState(''); const [no, setNo] = useState('')
  const dup = sup && no && rows.find((r) => String(r.supplier).toLowerCase() === sup.toLowerCase() && String(r.sno).toLowerCase() === no.toLowerCase())
  return <div className="space-y-3"><Field label="Supplier"><input className="inp" value={sup} onChange={(e) => setSup(e.target.value)} /></Field><Field label="Supplier bill number"><input className="inp num" value={no} onChange={(e) => setNo(e.target.value)} /></Field>{sup && no && (dup ? <p role="alert" className="text-xs px-2 py-1 bg-sindoor/10 text-sindoor rounded">This bill is already entered as {String(dup.no)}. Posting it again would double the payable.</p> : <p className="text-xs px-2 py-1 bg-mehndi/15 rounded">No entry with this supplier and bill number.</p>)}<div className="flex justify-end gap-2"><Btn onClick={onClose}>Close</Btn>{dup && <Btn onClick={() => { onClose(); go('pinv') }}>Open the existing entry</Btn>}</div></div>
}
function PriceChange({ onClose }: P) {
  const items = useApp((s) => s.items); const [id, setId] = useState(items[0]?.id ?? ''); const [cost, setCost] = useState('')
  const it = items.find((i) => i.id === id); const pct = it && +cost > 0 ? Math.round(((+cost - it.cost) / it.cost) * 100) : 0
  return <div className="space-y-3"><Field label="Item"><select className="inp" value={id} onChange={(e) => setId(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field><Field label="New purchase cost (₹)" hint={it ? `Current cost ${inr0(it.cost)}` : ''}><input className="inp num" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>{+cost > 0 && <p className={`text-xs px-2 py-1 rounded ${Math.abs(pct) > 10 ? 'bg-haldi/25' : 'bg-wash'}`}>{pct >= 0 ? 'Up' : 'Down'} {Math.abs(pct)}% from the last cost.{Math.abs(pct) > 10 ? ' Check the supplier bill before updating selling prices.' : ''}</p>}<Foot onClose={onClose} label="Update cost" disabled={!(+cost > 0)} go={() => { set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, cost: +cost } : i)) })); toast('Cost updated. Selling prices were not changed.'); onClose() }} /></div>
}
function JsonExport({ onClose }: P) {
  const inv = useApp((s) => s.invoices); const parties = useApp((s) => s.parties); const [ran, setRan] = useState(false)
  const posted = inv.filter((i) => i.status === 'posted'); const gst = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
  const bad = posted.filter((i) => { const p = parties.find((x) => x.id === i.partyId); return p?.gstin && !gst.test(p.gstin) })
  const noHsn = posted.filter((i) => i.lines.some((l) => !l.itemId))
  return <div className="space-y-3 text-[13px]"><p>GSTR-1 for the current month: <b className="num">{posted.length}</b> invoices, <b className="num">{inr0(posted.reduce((a, i) => a + i.total, 0))}</b>.</p><Btn onClick={() => setRan(true)}>Check against the portal schema</Btn>{ran && <ul className="space-y-1"><li className={bad.length ? 'text-sindoor' : 'text-mehndi'}>{bad.length ? `${bad.length} invoices have a customer GSTIN in the wrong format.` : 'All customer GSTINs are well formed.'}</li><li className={noHsn.length ? 'text-sindoor' : 'text-mehndi'}>{noHsn.length ? `${noHsn.length} invoices have lines with no item.` : 'Every line has an item and HSN.'}</li></ul>}<div className="flex justify-end gap-2"><Btn onClick={onClose}>Close</Btn><Btn kind="primary" disabled={!ran || bad.length > 0} onClick={() => { saveFile(`GSTR1-${today()}.json`, JSON.stringify({ gstin: '32AABCM4417K1ZP', fp: today().slice(5, 7) + today().slice(0, 4), b2b: posted.map((i) => ({ inum: i.no, idt: i.date, val: i.total, txval: i.sub })) }, null, 2)); toast('GSTR-1 JSON downloaded.'); onClose() }}>Download JSON</Btn></div></div>
}
function Erasure({ onClose }: P) {
  const parties = useApp((s) => s.parties).filter((p) => p.id !== 'c0' && p.kind === 'customer'); const inv = useApp((s) => s.invoices)
  const [id, setId] = useState(parties[0]?.id ?? ''); const [typed, setTyped] = useState('')
  const p = parties.find((x) => x.id === id); const n = inv.filter((i) => i.partyId === id).length
  return <div className="space-y-3 text-[13px]"><Field label="Customer"><select className="inp" value={id} onChange={(e) => { setId(e.target.value); setTyped('') }}>{parties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>{p && <div className="panel p-3 space-y-1"><div className="font-medium">What will happen</div><div>Name, phone, GSTIN and city are replaced with "Erased customer".</div><div>Marketing consent is removed.</div><div className="muted">{n} bills stay for the tax record, shown under the erased name.{p.balance > 0 ? ` ${inr0(p.balance)} is still due, so erasure is blocked until it is cleared.` : ''}</div></div>}{p && p.balance <= 0 && <Field label={`Type "${p.name}" to confirm`}><input className="inp" value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>}<Foot onClose={onClose} label="Erase customer data" disabled={!p || p.balance > 0 || typed !== p.name} go={() => { set((s) => ({ parties: s.parties.map((x) => (x.id === id ? { ...x, name: 'Erased customer', phone: '', gstin: '', city: '', consent: false } : x)), invoices: s.invoices.map((i) => (i.partyId === id ? { ...i, partyName: 'Erased customer' } : i)) })); toast('Customer data erased. The bills remain for the tax record.'); onClose() }} /></div>
}
function Diagnostics({ onClose }: P) {
  const s = useApp((x) => x)
  return <div className="space-y-3 text-[13px]"><p>The bundle holds versions, settings, and error counts. It never holds names, amounts or bills.</p><ul className="list-disc ml-5 muted"><li>App version and browser</li><li>Configuration version {s.version}</li><li>Counts of records, not their content</li><li>Last 50 error messages</li></ul><Foot onClose={onClose} label="Create bundle" go={() => { saveFile(`diagnostics-${today()}.json`, JSON.stringify({ app: 'erp-proto', config: s.version, counts: { items: s.items.length, parties: s.parties.length, invoices: s.invoices.length }, ua: navigator.userAgent }, null, 2)); toast('Diagnostics bundle saved to your downloads.'); onClose() }} /></div>
}
function Remote({ onClose }: P) {
  const [dur, setDur] = useState('1 hour')
  return <div className="space-y-3 text-[13px]"><p>Support asks to view your screen and settings to fix an issue. They cannot see bills or amounts unless you allow it.</p><Field label="Allow for"><select className="inp" value={dur} onChange={(e) => setDur(e.target.value)}><option>1 hour</option><option>4 hours</option></select></Field><div className="flex justify-end gap-2"><Btn onClick={() => { toast('Declined. Support was told.'); onClose() }}>Decline</Btn><Btn kind="primary" onClick={() => { set((s) => ({ rows: { ...s.rows, remote: [{ id: 'rm' + Date.now(), when: today(), dur } as never, ...(s.rows.remote ?? [])] } })); toast(`Access allowed for ${dur}. You can end it from the top bar.`); onClose() }}>Allow for {dur}</Btn></div></div>
}
function FullExport({ onClose }: P) {
  const s = useApp((x) => x); const [sel, setSel] = useState({ items: true, parties: true, invoices: true, ledgers: true })
  return <div className="space-y-3 text-[13px]">{(Object.keys(sel) as (keyof typeof sel)[]).map((k) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={sel[k]} onChange={(e) => setSel({ ...sel, [k]: e.target.checked })} />{k[0].toUpperCase() + k.slice(1)} <span className="muted num">({(s[k] as unknown[]).length})</span></label>)}<Foot onClose={onClose} label="Download export" disabled={!Object.values(sel).some(Boolean)} go={() => { saveFile(`company-export-${today()}.json`, JSON.stringify(Object.fromEntries((Object.keys(sel) as (keyof typeof sel)[]).filter((k) => sel[k]).map((k) => [k, s[k]])), null, 2)); toast('Export downloaded. It is your data and can be opened anywhere.'); onClose() }} /></div>
}
function Templates({ onClose }: P) {
  return <div className="space-y-3 text-[13px]"><p>Fill these in Excel, save as CSV, and load them in Import data.</p><div className="flex gap-2 flex-wrap"><Btn icon="download" onClick={() => downloadCsv('items-template.csv', ['Item Name', 'Code', 'Barcode', 'HSN', 'GST', 'MRP', 'Sale Price', 'Purchase Rate', 'Opening Qty'], [['Example kurta', 'KU-001', '8905100001', '6104', 12, 1299, 1099, 640, 20]])}>Items template</Btn><Btn icon="download" onClick={() => downloadCsv('customers-template.csv', ['Party', 'Mobile', 'GSTIN', 'Place', 'Opening'], [['Example Traders', '98470 00000', '', 'Kochi', 0]])}>Customers template</Btn></div><div className="flex justify-end"><Btn onClick={onClose}>Close</Btn></div></div>
}
function ExportPrint({ onClose }: P) {
  const inv = useApp((s) => s.invoices)
  return <div className="space-y-3 text-[13px]"><p>Export the sales register ({inv.length} bills) or print it.</p><div className="flex gap-2 flex-wrap"><Btn icon="download" onClick={() => { downloadCsv(`sales-${today()}.csv`, ['Bill', 'Date', 'Customer', 'Total'], inv.map((i) => [i.no, i.date, i.partyName, i.total])); onClose() }}>Download CSV</Btn><Btn icon="printer" onClick={() => { onClose(); setTimeout(() => window.print(), 200) }}>Print this screen</Btn></div></div>
}
function Recovery({ onClose }: P) {
  const [key] = useState(() => Array.from({ length: 6 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-'))
  const [ok, setOk] = useState(false)
  return <div className="space-y-3 text-[13px]"><p>If every device is lost, this key is the only way to open your backups. Keep it somewhere safe, away from the computer.</p><div className="panel p-3 text-center text-lg font-semibold num tracking-wider select-all">{key}</div><label className="flex items-center gap-2"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />I have written this key down</label><div className="flex justify-end gap-2"><Btn icon="printer" onClick={() => window.print()}>Print</Btn><Btn kind="primary" disabled={!ok} onClick={() => { toast('Recovery key confirmed.'); onClose() }}>Done</Btn></div></div>
}

const PROMPTS: { id: string; title: string; refs: string; what: string; el: (p: P) => ReactNode }[] = [
  { id: 'planlimit', title: 'Plan limit reached', refs: 'PLT-05, WFL-08', what: 'Shown when a plan limit stops an action. Offers a way forward.', el: (p) => <PlanLimit {...p} /> },
  { id: 'priceprotect', title: 'Price protection warning', refs: 'SAL-26', what: 'Warns when a rate is below cost and asks for a reason.', el: (p) => <PriceProtect {...p} /> },
  { id: 'override', title: 'Discount and credit override', refs: 'SAL-16', what: 'Sends a request to the Approvals inbox.', el: (p) => <Override {...p} /> },
  { id: 'upi', title: 'UPI receipt confirmation', refs: 'INT-08', what: 'Checks the reference and posts the amount to the bank ledger.', el: (p) => <UpiConfirm {...p} /> },
  { id: 'paylink', title: 'Payment link', refs: 'INT-09', what: 'Makes a link for a bill to send on WhatsApp. Simulated gateway.', el: (p) => <PayLink {...p} /> },
  { id: 'card', title: 'Card receipt entry', refs: 'INT-10', what: 'Records a card payment from the machine slip.', el: (p) => <CardReceipt {...p} /> },
  { id: 'dupbill', title: 'Duplicate supplier bill warning', refs: 'PUR-10', what: 'Looks up the supplier bill number before posting.', el: (p) => <DupBill {...p} /> },
  { id: 'pricechange', title: 'Purchase price change alert', refs: 'PUR-09', what: 'Shows how much the cost moved and updates it.', el: (p) => <PriceChange {...p} /> },
  { id: 'json', title: 'Return JSON export', refs: 'GST-04', what: 'Checks the month against the schema and downloads GSTR-1.', el: (p) => <JsonExport {...p} /> },
  { id: 'erasure', title: 'Erasure with preview', refs: 'PV-02', what: 'Shows what will change, then anonymises a customer.', el: (p) => <Erasure {...p} /> },
  { id: 'diag', title: 'Diagnostics bundle', refs: 'PV-05', what: 'Downloads counts and versions, never business data.', el: (p) => <Diagnostics {...p} /> },
  { id: 'remote', title: 'Remote assistance consent', refs: 'PV-07', what: 'Asks before support can view the screen.', el: (p) => <Remote {...p} /> },
  { id: 'fullexport', title: 'Full company data export', refs: 'MIG-09', what: 'Download your own data in an open format.', el: (p) => <FullExport {...p} /> },
  { id: 'templates', title: 'Excel templates', refs: 'MIG-10', what: 'Blank files for importing items and customers.', el: (p) => <Templates {...p} /> },
  { id: 'exportprint', title: 'Export and print', refs: 'RPT-11', what: 'Download or print the sales register.', el: (p) => <ExportPrint {...p} /> },
  { id: 'recovery', title: 'Recovery key', refs: 'SY-08', what: 'Shows the key once and makes you confirm you saved it.', el: (p) => <Recovery {...p} /> },
]

export function Prompts() {
  const [open, setOpen] = useState('')
  const cur = PROMPTS.find((p) => p.id === open)
  return (
    <div className="flex-1 min-h-0 scroll">
      <PageHead title="Prompts and confirmations" crumbs={['Tools', 'Prompts']} sub="Every dialog the product shows at a decision point. Each one works: it checks input, shows the consequence, and changes data." />
      <ul className="px-5 pb-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{PROMPTS.map((p) => <li key={p.id} className="panel p-3 flex flex-col gap-2"><div className="flex justify-between gap-2"><b className="text-[13px]">{p.title}</b><span className="text-[11px] muted num whitespace-nowrap">{p.refs}</span></div><p className="text-xs muted flex-1">{p.what}</p><div><Btn className="btn-sm" icon="right" onClick={() => setOpen(p.id)}>Open</Btn></div></li>)}</ul>
      {cur && <Modal open onClose={() => setOpen('')} title={cur.title}>{cur.el({ onClose: () => setOpen('') })}</Modal>}
    </div>
  )
}
export { Icon }
