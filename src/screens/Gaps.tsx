import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp, set, toast } from '../lib/app'
import { inr, inr0, today, dmy } from '../lib/fmt'
import { Btn, PageHead, Field, Seg, Tabs, Toggle, Money, Status, DataTable, Empty, type Col } from '../ui/kit'
import { USERS } from '../shell/ctx'
import type { Item, Party } from '../lib/data'

type Row = { id: string; [k: string]: string | number }
const R = (id: string, o: Record<string, string | number>): Row => ({ id, ...o })
const EMPTY: Row[] = []
const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10) }
const master = (title: string, sub: string, fields: { id: string; label: string; req?: boolean; type?: 'text' | 'number' | 'select'; opts?: string[] }[], cols: [string, string, ('num' | 'money' | 'status')?][], seed: Row[]) => ({ title, sub, group: 'Masters', newLabel: `New ${title.toLowerCase().replace(/s$/, '')}`, editable: true, fields, cols: [...cols, ['status', 'State', 'status'] as [string, string, 'status']], defaults: { status: 'Active' }, flow: [{ from: 'Active', to: 'Inactive', label: 'Deactivate' }, { from: 'Inactive', to: 'Active', label: 'Reactivate' }], filterKey: 'status', seed })

export const MORE_SPECS = {
  areas: master('Areas and routes', 'Group customers by area for delivery routes, salesman targets and collection rounds.', [{ id: 'name', label: 'Area or route', req: true }, { id: 'city', label: 'City', req: true }, { id: 'day', label: 'Visit day', type: 'select', opts: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }], [['name', 'Area'], ['city', 'City'], ['day', 'Visit day'], ['parties', 'Customers', 'num']], [R('ar1', { name: 'MG Road and Ernakulam South', city: 'Kochi', day: 'Monday', parties: 64, status: 'Active' }), R('ar2', { name: 'Kakkanad and Infopark', city: 'Kochi', day: 'Wednesday', parties: 41, status: 'Active' }), R('ar3', { name: 'Mananchira and Palayam', city: 'Kozhikode', day: 'Friday', parties: 52, status: 'Active' })]),
  salesmen: master('Salesmen', 'Counter staff and field salesmen. Commission and targets feed the incentive report.', [{ id: 'name', label: 'Name', req: true }, { id: 'phone', label: 'Mobile', req: true }, { id: 'comm', label: 'Commission %', type: 'number' }, { id: 'area', label: 'Area' }], [['name', 'Salesman'], ['phone', 'Mobile'], ['comm', 'Commission %', 'num'], ['area', 'Area']], [R('sm1', { name: 'Salim K', phone: '98950 11223', comm: 1.5, area: 'Counter', status: 'Active' }), R('sm2', { name: 'Divya P', phone: '94960 55102', comm: 1, area: 'Counter', status: 'Active' }), R('sm3', { name: 'Rekha S', phone: '99460 21877', comm: 2, area: 'Kozhikode route', status: 'Active' })]),
  pricecat: master('Price categories', 'Retail, wholesale and staff rates. The pricing order picks the category rate before the item standard rate.', [{ id: 'name', label: 'Category', req: true }, { id: 'adj', label: 'Adjustment % from standard rate', type: 'number', req: true }, { id: 'tax', label: 'Rates include GST', type: 'select', opts: ['Yes', 'No'] }], [['name', 'Category'], ['adj', 'Adjustment %', 'num'], ['tax', 'Includes GST']], [R('pc1', { name: 'Retail', adj: 0, tax: 'Yes', status: 'Active' }), R('pc2', { name: 'Wholesale', adj: -12, tax: 'No', status: 'Active' }), R('pc3', { name: 'Staff', adj: -20, tax: 'Yes', status: 'Active' })]),
  godowns: master('Godowns and vans', 'Stock locations. A van is a godown that moves, so its stock is counted at the end of each trip.', [{ id: 'name', label: 'Name', req: true }, { id: 'kind', label: 'Type', type: 'select', opts: ['Showroom', 'Godown', 'Van'], req: true }, { id: 'branch', label: 'Branch', type: 'select', opts: ['Kochi Main', 'Kozhikode'] }], [['name', 'Location'], ['kind', 'Type'], ['branch', 'Branch']], [R('gd1', { name: 'Kochi showroom', kind: 'Showroom', branch: 'Kochi Main', status: 'Active' }), R('gd2', { name: 'Kochi godown', kind: 'Godown', branch: 'Kochi Main', status: 'Active' }), R('gd3', { name: 'Kozhikode store', kind: 'Showroom', branch: 'Kozhikode', status: 'Active' }), R('gd4', { name: 'Delivery van KL-07-AX-4412', kind: 'Van', branch: 'Kochi Main', status: 'Active' })]),
  counters: master('Counters', 'Billing counters with their default printer, price category and cash drawer.', [{ id: 'name', label: 'Counter', req: true }, { id: 'printer', label: 'Receipt printer', type: 'select', opts: ['Epson TM-T82 (USB)', 'TVS RP3160 (USB)', 'None'] }, { id: 'cat', label: 'Price category', type: 'select', opts: ['Retail', 'Wholesale', 'Staff'] }], [['name', 'Counter'], ['printer', 'Printer'], ['cat', 'Price category']], [R('ct1', { name: 'Counter 1', printer: 'Epson TM-T82 (USB)', cat: 'Retail', status: 'Active' }), R('ct2', { name: 'Counter 2', printer: 'TVS RP3160 (USB)', cat: 'Retail', status: 'Active' }), R('ct3', { name: 'Wholesale desk', printer: 'None', cat: 'Wholesale', status: 'Active' })]),
  costcentres: master('Cost centres', 'Tag vouchers by branch, department or project to see profit for each.', [{ id: 'name', label: 'Cost centre', req: true }, { id: 'parent', label: 'Under' }], [['name', 'Cost centre'], ['parent', 'Under']], [R('cc1', { name: 'Kochi Main', parent: 'Primary', status: 'Active' }), R('cc2', { name: 'Kozhikode', parent: 'Primary', status: 'Active' }), R('cc3', { name: 'Onam festival stall', parent: 'Kochi Main', status: 'Active' })]),
  acgroups: master('Account groups', 'The tree that ledgers sit under. Statutory groups are fixed and cannot be removed.', [{ id: 'name', label: 'Group', req: true }, { id: 'parent', label: 'Under', type: 'select', opts: ['Assets', 'Liabilities', 'Income', 'Expenses', 'Current assets', 'Current liabilities'], req: true }, { id: 'nature', label: 'Nature', type: 'select', opts: ['Debit', 'Credit'] }], [['name', 'Group'], ['parent', 'Under'], ['nature', 'Nature']], [R('ag1', { name: 'Cash and bank', parent: 'Current assets', nature: 'Debit', status: 'Active' }), R('ag2', { name: 'Duties and taxes', parent: 'Current liabilities', nature: 'Credit', status: 'Active' }), R('ag3', { name: 'Direct expenses', parent: 'Expenses', nature: 'Debit', status: 'Active' })]),
  cards: master('Card and UPI settlement', 'Card machines and UPI handles with their charge rate and the bank that receives settlements.', [{ id: 'name', label: 'Machine or handle', req: true }, { id: 'bank', label: 'Settles to', type: 'select', opts: ['HDFC Bank current A/c 5010', 'Federal Bank A/c 2271'], req: true }, { id: 'rate', label: 'Charge %', type: 'number' }], [['name', 'Machine or handle'], ['bank', 'Settles to'], ['rate', 'Charge %', 'num']], [R('cd1', { name: 'HDFC POS machine 4417', bank: 'HDFC Bank current A/c 5010', rate: 1.8, status: 'Active' }), R('cd2', { name: 'UPI malabarhome@hdfcbank', bank: 'HDFC Bank current A/c 5010', rate: 0, status: 'Active' })]),
  privilege: master('Privilege cards', 'Loyalty card tiers with the points earned and the discount allowed.', [{ id: 'name', label: 'Tier', req: true }, { id: 'earn', label: 'Points per ₹100', type: 'number', req: true }, { id: 'disc', label: 'Discount %', type: 'number' }], [['name', 'Tier'], ['earn', 'Points per ₹100', 'num'], ['disc', 'Discount %', 'num'], ['members', 'Members', 'num']], [R('pv1', { name: 'Silver', earn: 1, disc: 0, members: 318, status: 'Active' }), R('pv2', { name: 'Gold', earn: 2, disc: 3, members: 96, status: 'Active' }), R('pv3', { name: 'Platinum', earn: 3, disc: 5, members: 14, status: 'Active' })]),
  units: master('Units and conversions', 'Pieces, metres, boxes and their conversions, so a box of 12 can be sold as pieces.', [{ id: 'name', label: 'Unit', req: true }, { id: 'base', label: 'Base unit', req: true }, { id: 'factor', label: 'Equals', type: 'number', req: true }], [['name', 'Unit'], ['base', 'Base unit'], ['factor', 'Equals', 'num']], [R('un1', { name: 'Box of 12', base: 'Pcs', factor: 12, status: 'Active' }), R('un2', { name: 'Bundle of 6 mundu', base: 'Pcs', factor: 6, status: 'Active' }), R('un3', { name: 'Thaan (cloth roll)', base: 'Mtr', factor: 40, status: 'Active' })]),

  estimates: { title: 'Estimates', sub: 'Non-tax quotes handed over at the counter. Convert to a tax invoice when the customer agrees.', group: 'Sales', newLabel: 'New estimate', fields: [{ id: 'party', label: 'Customer', from: 'customers', type: 'select', req: true }, { id: 'value', label: 'Estimate value', type: 'number', req: true }, { id: 'valid', label: 'Valid until', type: 'date', req: true }], cols: [['no', 'Estimate'], ['party', 'Customer'], ['date', 'Date', 'date'], ['valid', 'Valid until', 'date'], ['value', 'Value', 'money'], ['status', 'State', 'status']], filterKey: 'status', cancelable: true, flow: [{ from: 'Open', to: 'Converted', label: 'Convert to invoice' }], defaults: { status: 'Open' }, seed: [R('es1', { no: 'EST/0412', party: 'Anitha Menon', date: d(1), valid: d(-6), value: 18400, status: 'Open' }), R('es2', { no: 'EST/0411', party: 'Hotel Sea Pearl', date: d(4), valid: d(-3), value: 96200, status: 'Open' }), R('es3', { no: 'EST/0408', party: 'Joseph Mathew', date: d(11), valid: d(4), value: 7250, status: 'Converted' })] },
  challans: { title: 'Delivery challans', sub: 'Goods sent before billing. Each challan is billed later, in full or in parts, and stock leaves on dispatch.', group: 'Sales', newLabel: 'New challan', fields: [{ id: 'party', label: 'Customer', from: 'customers', type: 'select', req: true }, { id: 'item', label: 'Item', from: 'items', type: 'select', req: true }, { id: 'qty', label: 'Quantity', type: 'number', req: true }, { id: 'vehicle', label: 'Vehicle number' }], cols: [['no', 'Challan'], ['party', 'Customer'], ['item', 'Item'], ['qty', 'Qty', 'num'], ['vehicle', 'Vehicle'], ['date', 'Date', 'date'], ['status', 'State', 'status']], filterKey: 'status', cancelable: true, flow: [{ from: 'Dispatched', to: 'Delivered', label: 'Mark delivered' }, { from: 'Delivered', to: 'Billed', label: 'Bill it' }], defaults: { status: 'Dispatched' }, seed: [R('dc1', { no: 'DC/0218', party: 'Rajesh Nair Interiors', item: 'Curtain cloth, blackout 54 in', qty: 60, vehicle: 'KL-07-AX-4412', date: d(2), status: 'Dispatched' }), R('dc2', { no: 'DC/0217', party: 'Hotel Sea Pearl', item: 'Bedsheet, double, cotton', qty: 40, vehicle: 'KL-07-AX-4412', date: d(6), status: 'Delivered' })] },
  sorders: { title: 'Sales orders', sub: 'Confirmed customer orders. Stock is reserved when the order is confirmed and released on cancel.', group: 'Sales', newLabel: 'New sales order', fields: [{ id: 'party', label: 'Customer', from: 'customers', type: 'select', req: true }, { id: 'value', label: 'Order value', type: 'number', req: true }, { id: 'due', label: 'Delivery by', type: 'date', req: true }], cols: [['no', 'Order'], ['party', 'Customer'], ['date', 'Date', 'date'], ['due', 'Delivery by', 'date'], ['value', 'Value', 'money'], ['status', 'State', 'status']], filterKey: 'status', cancelable: true, flow: [{ from: 'Draft', to: 'Confirmed', label: 'Confirm and reserve stock' }, { from: 'Confirmed', to: 'Delivered', label: 'Deliver' }, { from: 'Delivered', to: 'Invoiced', label: 'Create invoice' }], defaults: { status: 'Draft' }, seed: [R('so1', { no: 'SO/0094', party: 'Rajesh Nair Interiors', date: d(3), due: d(-4), value: 142000, status: 'Confirmed' }), R('so2', { no: 'SO/0093', party: 'Hotel Sea Pearl', date: d(8), due: d(1), value: 61800, status: 'Delivered' })] },
  stockjn: { title: 'Stock journals', sub: 'Damage, shortage, excess, packing and godown moves. Each posting changes stock on hand straight away.', group: 'Stock', newLabel: 'New stock journal', fields: [{ id: 'kind', label: 'Type', type: 'select', opts: ['Damage', 'Shortage', 'Excess', 'Packing', 'Godown move'], req: true }, { id: 'item', label: 'Item', from: 'items', type: 'select', req: true }, { id: 'qty', label: 'Quantity', type: 'number', req: true }, { id: 'reason', label: 'Reason', req: true }], cols: [['no', 'Journal'], ['kind', 'Type'], ['item', 'Item'], ['qty', 'Qty', 'num'], ['reason', 'Reason'], ['date', 'Date', 'date'], ['status', 'State', 'status']], filterKey: 'kind', defaults: { status: 'Posted' }, seed: [R('sj1', { no: 'SJ/0031', kind: 'Damage', item: 'Bedsheet, double, cotton', qty: 2, reason: 'Water damage in godown', date: d(3), status: 'Posted' }), R('sj2', { no: 'SJ/0030', kind: 'Excess', item: 'Linen shirt, slim fit, indigo', qty: 1, reason: 'Found at count', date: d(7), status: 'Posted' })], after: (row: Row) => { const q = +row.qty; if (!(q > 0)) return 'Quantity must be above zero.'; const sign = row.kind === 'Excess' ? 1 : row.kind === 'Damage' || row.kind === 'Shortage' ? -1 : 0; if (sign) set((s) => ({ items: s.items.map((it) => (it.name === row.item ? { ...it, stock: { ...it.stock, show: (it.stock.show ?? 0) + sign * q } } : it)) })); return `${row.kind} posted. ${sign ? `Stock of ${row.item} ${sign > 0 ? 'up' : 'down'} by ${q}.` : 'No change to total stock.'}` } },
  fixedassets: { title: 'Fixed assets', sub: 'Assets with yearly depreciation. Posting depreciation moves value from the asset to the expense ledger.', group: 'Books', newLabel: 'New asset', editable: true, fields: [{ id: 'name', label: 'Asset', req: true }, { id: 'cost', label: 'Cost', type: 'number', req: true }, { id: 'rate', label: 'Depreciation % a year', type: 'number', req: true }, { id: 'bought', label: 'Bought on', type: 'date', req: true }], cols: [['name', 'Asset'], ['bought', 'Bought', 'date'], ['cost', 'Cost', 'money'], ['rate', 'Rate %', 'num'], ['wdv', 'Written-down value', 'money'], ['status', 'State', 'status']], defaults: { status: 'In use' }, flow: [{ from: 'In use', to: 'Sold', label: 'Mark sold' }], seed: [R('fa1', { name: 'Showroom air conditioners (4)', bought: '2025-04-12', cost: 224000, rate: 15, wdv: 190400, status: 'In use' }), R('fa2', { name: 'Billing computers and printers', bought: '2025-06-02', cost: 148000, rate: 40, wdv: 104000, status: 'In use' }), R('fa3', { name: 'Delivery van KL-07-AX-4412', bought: '2024-09-18', cost: 785000, rate: 15, wdv: 612000, status: 'In use' })] },
  periodclose: { title: 'Period closing', sub: 'Lock a month once it is reconciled. Locked months reject new and back-dated vouchers.', group: 'Books', fields: [], cols: [['period', 'Period'], ['checks', 'Checks passed'], ['by', 'Closed by'], ['status', 'State', 'status']], flow: [{ from: 'Open', to: 'Locked', label: 'Lock this month' }, { from: 'Locked', to: 'Open', label: 'Reopen (owner only)' }], seed: [R('pcl1', { period: 'August 2026', checks: 'Bank reconciled, GST filed', by: 'Jose Varghese', status: 'Locked' }), R('pcl2', { period: 'September 2026', checks: 'Bank reconciled, GST filed', by: 'Jose Varghese', status: 'Locked' }), R('pcl3', { period: 'October 2026', checks: '2 bank lines unmatched', by: '', status: 'Open' })] },
  chequeprint: { title: 'Cheque printing', sub: 'Print supplier cheques on your bank\'s leaf. Layout is set once per bank.', group: 'Bank and GST', newLabel: 'New cheque', fields: [{ id: 'payee', label: 'Payee', from: 'suppliers', type: 'select', req: true }, { id: 'amount', label: 'Amount', type: 'number', req: true }, { id: 'bank', label: 'Bank', type: 'select', opts: ['HDFC Bank current A/c 5010', 'Federal Bank A/c 2271'], req: true }, { id: 'date', label: 'Cheque date', type: 'date', req: true }], cols: [['no', 'Cheque'], ['payee', 'Payee'], ['bank', 'Bank'], ['date', 'Date', 'date'], ['amount', 'Amount', 'money'], ['status', 'State', 'status']], defaults: { status: 'Ready' }, flow: [{ from: 'Ready', to: 'Printed', label: 'Mark printed' }, { from: 'Printed', to: 'Cleared', label: 'Mark cleared' }], cancelable: true, seed: [R('cq1', { no: '004412', payee: 'Kairali Weaves', bank: 'HDFC Bank current A/c 5010', date: d(1), amount: 86400, status: 'Printed' })] },
  segments: { title: 'Segments', sub: 'Saved customer groups built from rules. Campaigns send only to people who agreed to messages.', group: 'People', newLabel: 'New segment', editable: true, fields: [{ id: 'name', label: 'Segment', req: true }, { id: 'rule', label: 'Rule', type: 'select', opts: ['Bought in last 90 days', 'Spent over ₹25,000 in a year', 'No purchase in 6 months', 'Dues over 30 days', 'Birthday this month'], req: true }, { id: 'area', label: 'Area', type: 'select', opts: ['Any', 'Kochi', 'Kozhikode'] }], cols: [['name', 'Segment'], ['rule', 'Rule'], ['area', 'Area'], ['size', 'People', 'num'], ['reach', 'Can be messaged', 'num']], defaults: { status: 'Active', size: 0, reach: 0 }, seed: [R('sg1', { name: 'High value', rule: 'Spent over ₹25,000 in a year', area: 'Any', size: 58, reach: 41, status: 'Active' }), R('sg2', { name: 'We miss you', rule: 'No purchase in 6 months', area: 'Any', size: 96, reach: 63, status: 'Active' })], after: (row: Row) => { const n = 20 + (String(row.name).length * 7) % 80; set((s) => ({ rows: { ...s.rows, segments: (s.rows.segments ?? []).map((r) => (r.id === row.id ? { ...r, size: n, reach: Math.round(n * 0.7) } : r)) } })); return `Segment saved. About ${n} people match.` } },
  consent: { title: 'Consent register', sub: 'Who agreed to what, when and how. A withdrawal stops every campaign at once.', group: 'People', cols: [['party', 'Customer'], ['channel', 'Channel'], ['how', 'Given how'], ['date', 'Date', 'date'], ['status', 'State', 'status']], filterKey: 'status', flow: [{ from: 'Agreed', to: 'Withdrawn', label: 'Record withdrawal' }, { from: 'Withdrawn', to: 'Agreed', label: 'Record fresh consent' }], seed: [R('cn1', { party: 'Anitha Menon', channel: 'WhatsApp', how: 'Ticked at billing', date: d(40), status: 'Agreed' }), R('cn2', { party: 'Hotel Sea Pearl', channel: 'WhatsApp', how: 'Signed form', date: d(200), status: 'Agreed' }), R('cn3', { party: 'Joseph Mathew', channel: 'WhatsApp', how: 'Replied STOP', date: d(9), status: 'Withdrawn' })] },
  utm: { title: 'Campaign links', sub: 'Tagged links so sales from ads and messages are credited to the right campaign.', group: 'People', newLabel: 'New link', fields: [{ id: 'name', label: 'Campaign', req: true }, { id: 'url', label: 'Page or product link', req: true }, { id: 'source', label: 'Source', type: 'select', opts: ['whatsapp', 'instagram', 'facebook', 'sms'], req: true }], cols: [['name', 'Campaign'], ['source', 'Source'], ['link', 'Tagged link'], ['clicks', 'Clicks', 'num']], defaults: { status: 'Active', clicks: 0 }, seed: [R('ul1', { name: 'Festive sarees', source: 'instagram', link: 'https://example.shop/sarees?utm_source=instagram&utm_campaign=festive-sarees', clicks: 1180, status: 'Active' })], after: (row: Row) => { set((s) => ({ rows: { ...s.rows, utm: (s.rows.utm ?? []).map((r) => (r.id === row.id ? { ...r, link: `${row.url}${String(row.url).includes('?') ? '&' : '?'}utm_source=${row.source}&utm_campaign=${String(row.name).toLowerCase().replace(/\W+/g, '-')}` } : r)) } })); return 'Tagged link created. Copy it from the row.' } },
  triggers: { title: 'Automation triggers', sub: 'When this happens, do that. Messages respect consent and the 24-hour rule.', group: 'Automation', newLabel: 'New trigger', editable: true, fields: [{ id: 'when', label: 'When', type: 'select', opts: ['A bill is saved', 'A payment is overdue 7 days', 'A customer has a birthday', 'Stock falls under reorder level'], req: true }, { id: 'then', label: 'Then', type: 'select', opts: ['Send bill on WhatsApp', 'Send payment reminder', 'Send birthday offer', 'Create draft purchase order'], req: true }, { id: 'name', label: 'Name', req: true }], cols: [['name', 'Trigger'], ['when', 'When'], ['then', 'Then'], ['runs', 'Runs this month', 'num']], defaults: { status: 'Active', runs: 0 }, flow: [{ from: 'Active', to: 'Paused', label: 'Pause' }, { from: 'Paused', to: 'Active', label: 'Resume' }], seed: [R('tr1', { name: 'Bill on WhatsApp', when: 'A bill is saved', then: 'Send bill on WhatsApp', runs: 312, status: 'Active' }), R('tr2', { name: 'Overdue nudge', when: 'A payment is overdue 7 days', then: 'Send payment reminder', runs: 27, status: 'Active' })] },
}

/* ---------- Day close ---------- */
const NOTES = [2000, 500, 200, 100, 50, 20, 10]
export function DayClose() {
  const cash = useApp((s) => s.ledgers.find((l) => l.name === 'Cash in hand')?.bal ?? 0)
  const hist = (useApp((s) => s.rows.dayclose) ?? EMPTY) as Row[]
  const [n, setN] = useState<Record<number, string>>({})
  const [coins, setCoins] = useState('0')
  const [why, setWhy] = useState('')
  const [err, setErr] = useState('')
  const counted = NOTES.reduce((a, k) => a + k * (+n[k] || 0), 0) + (+coins || 0)
  const diff = counted - cash
  const closed = hist.some((h) => h.date === today())
  const close = () => {
    if (!counted) return setErr('Count the cash first. Enter the number of each note.')
    if (Math.abs(diff) >= 1 && !why.trim()) return setErr(`The count is ${inr0(Math.abs(diff))} ${diff > 0 ? 'over' : 'short'}. Write the reason before closing.`)
    set((s) => ({ rows: { ...s.rows, dayclose: [{ id: 'dc' + Date.now(), date: today(), expected: cash, counted, diff, why: why || 'Matched', by: 'Anwar Sadiq', status: 'Closed' }, ...((s.rows.dayclose ?? []) as Row[])] } }))
    setErr(''); toast(`Day closed. Cash ${diff === 0 ? 'matches' : diff > 0 ? `over by ${inr0(diff)}` : `short by ${inr0(-diff)}`}.`)
  }
  return (
    <div className="flex-1 min-h-0 scroll">
      <PageHead title="Day close" crumbs={['Counter', 'Day close']} sub="Count the drawer, compare with the books, and close the day. Closing stops new bills dated today." />
      <div className="px-5 pb-6 grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="panel p-4">
          <h2 className="font-medium mb-2">Cash count</h2>
          <div className="grid grid-cols-[80px_90px_1fr] gap-x-3 gap-y-1.5 items-center text-[13px]">
            {NOTES.map((k) => <><span key={'a' + k} className="num">₹{k}</span><input key={'b' + k} aria-label={`Number of ₹${k} notes`} inputMode="numeric" className="inp num h-8 text-right" value={n[k] ?? ''} onChange={(e) => setN({ ...n, [k]: e.target.value.replace(/\D/g, '') })} placeholder="0" /><span key={'c' + k} className="num muted text-right">{inr0(k * (+n[k] || 0))}</span></>)}
            <span>Coins</span><input aria-label="Coins total" inputMode="numeric" className="inp num h-8 text-right" value={coins} onChange={(e) => setCoins(e.target.value.replace(/\D/g, ''))} /><span className="num muted text-right">{inr0(+coins || 0)}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="panel p-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="muted">Cash in books</span><span className="num">{inr0(cash)}</span></div>
            <div className="flex justify-between"><span className="muted">Counted</span><span className="num">{inr0(counted)}</span></div>
            <div className={`flex justify-between font-semibold ${diff === 0 ? 'text-mehndi' : 'text-sindoor'}`}><span>{diff === 0 ? 'Matches' : diff > 0 ? 'Over by' : 'Short by'}</span><span className="num">{inr0(Math.abs(diff))}</span></div>
            {Math.abs(diff) >= 1 && <Field label="Reason for the difference" req><input className="inp" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Change given short on bill 01041" /></Field>}
            {err && <p role="alert" className="text-xs text-sindoor">{err}</p>}
            <Btn kind="primary" className="w-full justify-center" disabled={closed} onClick={close}>{closed ? 'Today is closed' : 'Close the day'}</Btn>
          </div>
        </div>
        <div className="lg:col-span-2"><h2 className="font-medium mb-2">Earlier closes</h2>
          {hist.length === 0 ? <Empty text="No day has been closed yet." /> : <table className="w-full text-[13px]"><thead><tr className="text-left muted text-xs"><th>Date</th><th className="text-right">Expected</th><th className="text-right">Counted</th><th className="text-right">Difference</th><th>Note</th></tr></thead><tbody>{hist.map((h) => <tr key={h.id} className="border-t border-rule"><td className="py-1.5">{dmy(String(h.date))}</td><td className="text-right num">{inr0(+h.expected)}</td><td className="text-right num">{inr0(+h.counted)}</td><td className="text-right num">{inr0(+h.diff)}</td><td>{h.why}</td></tr>)}</tbody></table>}</div>
      </div>
    </div>
  )
}

/* ---------- User rights matrix ---------- */
const ACTS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export']
const DEFAULT_RIGHTS: Record<string, string> = { Owner: 'VCEDAX', Accountant: 'VCEX', Cashier: 'VC', 'Super admin': 'VCEDAX' }
export function Rights() {
  const menu = useApp((s) => s.draft.menu)
  const saved = (useApp((s) => s.rows.rights) ?? EMPTY) as Row[]
  const roles = USERS.map((u) => u.role)
  const [role, setRole] = useState(roles[2])
  const [q, setQ] = useState('')
  const screens = menu.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))).filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
  const get = (route: string) => String(saved.find((r) => r.id === `${role}|${route}`)?.v ?? (role === 'Cashier' ? (['billing', 'held', 'returns', 'ask'].includes(route) ? 'VC' : '') : DEFAULT_RIGHTS[role]))
  const toggle = (route: string, a: string) => {
    if (role === 'Super admin') return toast('Super admin always has full rights.', 'info')
    const k = a === 'Export' ? 'X' : a[0] === 'D' ? 'D' : a[0] === 'A' ? 'A' : a[0] === 'E' ? 'E' : a[0]
    const cur = get(route)
    let nx = cur.includes(k) ? cur.replace(k, '') : cur + k
    if (k !== 'V' && nx.length && !nx.includes('V')) nx = 'V' + nx
    if (k === 'V' && !nx.includes('V')) nx = ''
    set((s) => ({ rows: { ...s.rows, rights: [...((s.rows.rights ?? []) as Row[]).filter((r) => r.id !== `${role}|${route}`), { id: `${role}|${route}`, v: nx }] } }))
  }
  const letter = (a: string) => (a === 'Export' ? 'X' : a[0])
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Rights matrix" crumbs={['Tools', 'Rights matrix']} sub="Choose what each role can see and do on every screen. Taking away View hides the screen.">
        <Btn onClick={() => { set((s) => ({ rows: { ...s.rows, rights: ((s.rows.rights ?? []) as Row[]).filter((r) => !String(r.id).startsWith(role + '|')) } })); toast(`${role} is back to the standard rights.`) }}>Reset {role}</Btn>
      </PageHead>
      <div className="px-5 pb-3 flex items-center gap-3 flex-wrap"><Seg label="Role" value={role} onChange={setRole} opts={roles.map((r) => ({ id: r, label: r }))} /><input aria-label="Search screens" className="inp w-56" placeholder="Search screens" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex-1 scroll px-5 pb-6"><table className="w-full text-[13px]"><thead className="sticky top-0 bg-sheet"><tr className="text-left muted text-xs"><th className="py-1">Screen</th><th>Group</th>{ACTS.map((a) => <th key={a} className="text-center w-16">{a}</th>)}</tr></thead>
        <tbody>{screens.map((i) => { const v = get(i.route); return <tr key={i.id} className="border-t border-rule"><td className="py-1.5">{i.label.replace(/\{|\}/g, '')}</td><td className="muted">{i.group}</td>{ACTS.map((a) => <td key={a} className="text-center"><input type="checkbox" aria-label={`${role}: ${a} on ${i.label.replace(/\{|\}/g, '')}`} checked={v.includes(letter(a))} onChange={() => toggle(i.route, a)} /></td>)}</tr> })}</tbody></table></div>
    </div>
  )
}

/* ---------- Barcode labels ---------- */
function Bars({ code }: { code: string }) {
  const bits = useMemo(() => { let b = '11010010000'; for (const ch of code) { const n = ch.charCodeAt(0); b += (n % 2 ? '1011' : '1101') + ((n >> 1) % 2 ? '001' : '0011') + ((n >> 2) % 3 === 0 ? '10' : '1') }; return b + '1100011101011' }, [code])
  let x = 0
  return <svg viewBox={`0 0 ${bits.length} 30`} preserveAspectRatio="none" style={{ width: '100%', height: 26 }} aria-label={`Barcode ${code}`}>{[...bits].map((c, i) => { x = i; return c === '1' ? <rect key={i} x={x} y={0} width={1} height={30} fill="#000" /> : null })}</svg>
}
export function Labels() {
  const items = useApp((s) => s.items)
  const c = useApp((s) => s.published)
  const [sel, setSel] = useState<Record<string, number>>({})
  const [size, setSize] = useState<'50x25' | '38x25'>('50x25')
  const [o, setO] = useState({ name: true, price: true, mrp: true, shop: true })
  const [q, setQ] = useState('')
  const shop = c.branches[0].display
  const list = items.filter((i) => (i.name + i.code + i.barcode).toLowerCase().includes(q.toLowerCase()))
  const chosen = items.filter((i) => sel[i.id] > 0)
  const total = chosen.reduce((a, i) => a + sel[i.id], 0)
  const labels = chosen.flatMap((i) => Array.from({ length: sel[i.id] }, (_, k) => ({ i, k })))
  const w = size === '50x25' ? '50mm' : '38mm'
  const sheet = <div className="label-sheet" style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>{labels.map(({ i, k }) => <div key={i.id + k} style={{ width: w, height: '25mm', padding: '1.5mm', boxSizing: 'border-box', border: '1px dotted #bbb', fontSize: 8, lineHeight: 1.15, background: '#fff', color: '#000', overflow: 'hidden' }}>{o.shop && <div style={{ fontWeight: 700 }}>{shop}</div>}{o.name && <div>{i.name.slice(0, 34)}</div>}<Bars code={i.barcode} /><div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-num), monospace' }}><span>{i.barcode}</span><span>{o.mrp && `MRP ₹${i.mrp}`}</span></div>{o.price && <div style={{ fontWeight: 700, fontSize: 10 }}>Our price ₹{i.rate}</div>}</div>)}</div>
  const host = typeof document !== 'undefined' ? (document.getElementById('print-root') ?? (() => { const h = document.createElement('div'); h.id = 'print-root'; document.body.appendChild(h); return h })()) : null
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Barcode labels" crumbs={['Stock', 'Barcode labels']} sub="Pick items and copies, choose the label size, and print on the label printer or a sticker sheet.">
        <Btn kind="primary" icon="printer" disabled={!total} onClick={() => { document.body.dataset.printfmt = 'labels'; window.print() }}>Print {total || ''} label{total === 1 ? '' : 's'}</Btn>
      </PageHead>
      <div className="px-5 pb-3 flex items-center gap-4 flex-wrap text-[13px]">
        <Seg label="Label size" value={size} onChange={setSize} opts={[{ id: '50x25', label: '50 × 25 mm' }, { id: '38x25', label: '38 × 25 mm' }]} />
        {(['name', 'price', 'mrp', 'shop'] as const).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><Toggle label={`Show ${k}`} on={o[k]} onChange={(v) => setO({ ...o, [k]: v })} /><span>{k === 'shop' ? 'Shop name' : k === 'mrp' ? 'MRP' : k[0].toUpperCase() + k.slice(1)}</span></span>)}
        <input aria-label="Search items" className="inp w-52" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn className="btn-sm" onClick={() => setSel(Object.fromEntries(items.filter((i) => Object.values(i.stock).reduce((a, b) => a + b, 0) > 0).slice(0, 6).map((i) => [i.id, 1])))}>One each for first 6 in stock</Btn>
      </div>
      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_380px] gap-4 px-5 pb-5">
        <div className="scroll panel"><table className="w-full text-[13px]"><thead className="sticky top-0 bg-sheet"><tr className="text-left muted text-xs"><th className="p-2">Item</th><th>Barcode</th><th className="text-right">Price</th><th className="text-right pr-2 w-24">Copies</th></tr></thead><tbody>{list.map((i) => <tr key={i.id} className="border-t border-rule"><td className="p-2">{i.name}</td><td className="num muted">{i.barcode}</td><td className="text-right num">{inr0(i.rate)}</td><td className="pr-2 text-right"><input aria-label={`Copies of ${i.name}`} inputMode="numeric" className="inp num h-7 w-16 text-right" value={sel[i.id] ?? ''} placeholder="0" onChange={(e) => setSel({ ...sel, [i.id]: Math.min(500, +e.target.value.replace(/\D/g, '') || 0) })} /></td></tr>)}</tbody></table></div>
        <div className="scroll panel p-3"><div className="text-xs muted mb-2">Preview · {total} label{total === 1 ? '' : 's'}</div>{total ? <div style={{ transform: 'scale(.9)', transformOrigin: 'top left' }}>{sheet}</div> : <Empty text="Enter copies against an item to see its label." />}</div>
      </div>
      {host && total > 0 && createPortal(sheet, host)}
    </div>
  )
}

/* ---------- Data import ---------- */
const TARGETS: Record<string, { id: string; label: string; req?: boolean; hints: string[] }[]> = {
  Items: [{ id: 'name', label: 'Item name', req: true, hints: ['name', 'item', 'description', 'product'] }, { id: 'code', label: 'Item code', hints: ['code', 'sku', 'itemcode'] }, { id: 'barcode', label: 'Barcode', hints: ['barcode', 'ean'] }, { id: 'hsn', label: 'HSN', hints: ['hsn'] }, { id: 'gst', label: 'GST %', hints: ['gst', 'tax'] }, { id: 'mrp', label: 'MRP', hints: ['mrp'] }, { id: 'rate', label: 'Selling rate', req: true, hints: ['rate', 'price', 'sprice', 'sale'] }, { id: 'cost', label: 'Cost', hints: ['cost', 'purchase', 'prate'] }, { id: 'qty', label: 'Opening stock', hints: ['qty', 'stock', 'opening'] }],
  Customers: [{ id: 'name', label: 'Name', req: true, hints: ['name', 'party', 'customer', 'account'] }, { id: 'phone', label: 'Mobile', req: true, hints: ['mobile', 'phone', 'contact'] }, { id: 'gstin', label: 'GSTIN', hints: ['gstin', 'gst no'] }, { id: 'city', label: 'City', hints: ['city', 'place', 'area'] }, { id: 'balance', label: 'Opening balance (Dr)', hints: ['balance', 'opening', 'outstanding'] }],
}
const SAMPLE: Record<string, string> = {
  Items: 'Item Name,Code,Barcode,HSN,GST,MRP,Sale Price,Purchase Rate,Opening Qty\nKasavu mundu, cream 2 m,KM-210,8905100210,5007,5,1250,1050,720,24\nCotton towel 30x60,TW-044,8905100044,6302,5,399,329,210,60\nBedsheet double, floral,BS-118,8905100118,6302,12,1899,1599,980,\nSilk saree Kanchi,SR-901,,5007,5,,18500,14200,3\nSchool uniform shirt,UN-300,8905100300,6105,12,549,449,260,120',
  Customers: 'Party,Mobile,GSTIN,Place,Opening\nSreedevi Textiles,98470 99120,32AAHFS4410K1ZP,Thrissur,45200\nBabu Joseph,9946123456,,Kochi,0\nCity Hostel Mess,94470 21876,32AABCC9981Q1ZR,Kozhikode,12800\nAnitha Menon,98470 12345,,Kochi,0\nBad Row,12345,27AAAA,Pune,abc',
}
const parseCsv = (t: string) => t.trim().split(/\r?\n/).map((l) => { const out: string[] = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = '' } else cur += ch } out.push(cur.trim()); return out })
export function ImportData() {
  const items = useApp((s) => s.items)
  const parties = useApp((s) => s.parties)
  const log = (useApp((s) => s.rows.imports) ?? EMPTY) as Row[]
  const [target, setTarget] = useState<'Items' | 'Customers'>('Items')
  const [src, setSrc] = useState('Easy Biz export')
  const [text, setText] = useState('')
  const [map, setMap] = useState<Record<string, number>>({})
  const [step, setStep] = useState(0)
  const grid = useMemo(() => (text.trim() ? parseCsv(text) : []), [text])
  const head = grid[0] ?? []
  const fields = TARGETS[target]
  const load = (t: string) => { setText(t); const g = parseCsv(t); const m: Record<string, number> = {}; TARGETS[target].forEach((f) => { const i = g[0].findIndex((h) => f.hints.some((x) => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').includes(x))); if (i >= 0) m[f.id] = i }); setMap(m); setStep(1) }
  const val = useMemo(() => {
    const seen = new Set<string>(); const ok: Record<string, string>[] = []; const bad: { line: number; why: string }[] = []
    grid.slice(1).forEach((r, i) => {
      const rec: Record<string, string> = {}; fields.forEach((f) => { rec[f.id] = map[f.id] != null ? (r[map[f.id]] ?? '') : '' })
      let why = ''
      fields.filter((f) => f.req).forEach((f) => { if (!rec[f.id]) why ||= `${f.label} is empty` })
      if (target === 'Items') { if (rec.rate && isNaN(+rec.rate)) why ||= 'Selling rate is not a number'; if (rec.barcode && (seen.has(rec.barcode) || items.some((x) => x.barcode === rec.barcode))) why ||= 'Barcode already exists' ; if (rec.gst && ![0, 3, 5, 12, 18, 28].includes(+rec.gst)) why ||= `GST ${rec.gst}% is not a valid slab` }
      else { const ph = rec.phone.replace(/\D/g, ''); if (ph && ph.length !== 10) why ||= 'Mobile must have 10 digits'; if (ph && (seen.has(ph) || parties.some((x) => x.phone.replace(/\D/g, '') === ph))) why ||= 'Mobile already belongs to a customer'; if (rec.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(rec.gstin)) why ||= 'GSTIN format is wrong'; if (rec.balance && isNaN(+rec.balance)) why ||= 'Opening balance is not a number'; seen.add(ph) }
      if (rec.barcode) seen.add(rec.barcode)
      why ? bad.push({ line: i + 2, why }) : ok.push(rec)
    })
    return { ok, bad }
  }, [grid, map, target, items, parties, fields])
  const run = () => {
    if (target === 'Items') {
      const add: Item[] = val.ok.map((r, i) => ({ id: 'imp' + Date.now() + i, code: r.code || 'IMP-' + (i + 1), barcode: r.barcode || '', name: r.name, hsn: r.hsn || '', gst: +r.gst || 5, unit: 'Pcs', mrp: +r.mrp || +r.rate, rate: +r.rate, cost: +r.cost || 0, stock: { show: +r.qty || 0 }, reorder: 0, brand: '', category: 'Imported', supplierId: '' } as unknown as Item))
      set((s) => ({ items: [...s.items, ...add] }))
    } else {
      const add: Party[] = val.ok.map((r, i) => { const ph = r.phone.replace(/\D/g, ''); return { id: 'imp' + Date.now() + i, name: r.name, kind: 'customer', city: r.city || '', phone: `${ph.slice(0, 5)} ${ph.slice(5)}`, gstin: (r.gstin || '').toUpperCase(), balance: +r.balance || 0, limit: 0, risk: 'low', lastPay: '', overdueDays: 0, consent: false } as Party })
      set((s) => ({ parties: [...s.parties, ...add] }))
    }
    set((s) => ({ rows: { ...s.rows, imports: [{ id: 'im' + Date.now(), when: today(), what: target, src, ok: val.ok.length, bad: val.bad.length, status: 'Done' }, ...((s.rows.imports ?? []) as Row[])] } }))
    toast(`${val.ok.length} ${target.toLowerCase()} imported. ${val.bad.length ? `${val.bad.length} rows skipped, listed in the log.` : ''}`)
    setStep(3)
  }
  const steps = ['Choose data', 'Match columns', 'Check rows', 'Done']
  return (
    <div className="flex-1 min-h-0 scroll">
      <PageHead title="Import data" crumbs={['Tools', 'Import data']} sub="Bring items and customers from Easy Biz, Tally or any spreadsheet saved as CSV. Nothing is imported until the check passes." />
      <div className="px-5 pb-6 max-w-4xl space-y-4">
        <ol className="flex gap-2 text-xs">{steps.map((s, i) => <li key={s} className={`px-2 py-1 rounded ${i === step ? 'bg-neel text-white' : i < step ? 'bg-mehndi/20' : 'bg-wash muted'}`}>{i + 1}. {s}</li>)}</ol>
        {step === 0 && <div className="panel p-4 space-y-3"><div className="flex gap-4 flex-wrap items-end"><Field label="What are you importing?"><Seg label="Target" value={target} onChange={(v) => setTarget(v)} opts={[{ id: 'Items', label: 'Items' }, { id: 'Customers', label: 'Customers' }]} /></Field><Field label="Coming from"><select className="inp" value={src} onChange={(e) => setSrc(e.target.value)}><option>Easy Biz export</option><option>Tally export</option><option>Other spreadsheet</option></select></Field></div>
          <Field label="CSV file" hint="First row must be the column names."><input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()) }} /></Field>
          <div className="flex gap-2"><Btn onClick={() => load(SAMPLE[target])}>Use a sample file</Btn></div></div>}
        {step === 1 && <div className="panel p-4 space-y-3"><p className="text-sm">{grid.length - 1} rows found. Match each field to a column in your file.</p><div className="grid sm:grid-cols-2 gap-3">{fields.map((f) => <Field key={f.id} label={f.label} req={f.req}><select className="inp" value={map[f.id] ?? ''} onChange={(e) => setMap({ ...map, [f.id]: e.target.value === '' ? (undefined as unknown as number) : +e.target.value })}><option value="">Do not import</option>{head.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>)}</div><div className="flex gap-2"><Btn onClick={() => setStep(0)}>Back</Btn><Btn kind="primary" onClick={() => setStep(2)}>Check rows</Btn></div></div>}
        {step === 2 && <div className="panel p-4 space-y-3"><div className="flex gap-6 text-sm"><span className="text-mehndi font-medium">{val.ok.length} ready</span><span className={val.bad.length ? 'text-sindoor font-medium' : 'muted'}>{val.bad.length} with problems</span></div>{val.bad.length > 0 && <table className="w-full text-[13px]"><tbody>{val.bad.map((b) => <tr key={b.line} className="border-t border-rule"><td className="py-1 w-20">Line {b.line}</td><td>{b.why}</td></tr>)}</tbody></table>}<p className="text-xs muted">Rows with problems are skipped. Fix them in the file and import again.</p><div className="flex gap-2"><Btn onClick={() => setStep(1)}>Back</Btn><Btn kind="primary" disabled={!val.ok.length} onClick={run}>Import {val.ok.length} {target.toLowerCase()}</Btn></div></div>}
        {step === 3 && <div className="panel p-4 space-y-2"><p className="font-medium">Import finished.</p><div className="flex gap-2"><Btn onClick={() => { setStep(0); setText('') }}>Import another file</Btn></div></div>}
        <div><h2 className="font-medium mb-2">Import log</h2>{log.length === 0 ? <Empty text="No imports yet." /> : <table className="w-full text-[13px]"><thead><tr className="text-left muted text-xs"><th>Date</th><th>Data</th><th>Source</th><th className="text-right">Imported</th><th className="text-right">Skipped</th></tr></thead><tbody>{log.map((l) => <tr key={l.id} className="border-t border-rule"><td className="py-1">{dmy(String(l.when))}</td><td>{l.what}</td><td>{l.src}</td><td className="text-right num">{l.ok}</td><td className="text-right num">{l.bad}</td></tr>)}</tbody></table>}</div>
      </div>
    </div>
  )
}

/* ---------- Return from bill ---------- */
export function ReturnFromBill() {
  const invoices = useApp((s) => s.invoices)
  const returned = (useApp((s) => s.rows.returned) ?? EMPTY) as Row[]
  const cns = (useApp((s) => s.rows.returns) ?? EMPTY) as Row[]
  const [tab, setTab] = useState('new')
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<string>('')
  const [qty, setQty] = useState<Record<number, string>>({})
  const [reason, setReason] = useState('Size or fit')
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Account'>('Cash')
  const [err, setErr] = useState('')
  const found = invoices.filter((i) => i.status === 'posted' && (i.no + i.partyName).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
  const inv = invoices.find((i) => i.id === pick)
  const done = (idx: number) => returned.filter((r) => r.inv === inv?.id && r.line === idx).reduce((a, r) => a + +r.qty, 0)
  const rows = inv?.lines.map((l, i) => ({ l, i, left: l.qty - done(i) })) ?? []
  const value = rows.reduce((a, { l, i }) => a + (+qty[i] || 0) * l.rate * (1 - l.disc / 100) * (1 + l.gst / 100), 0)
  const post = () => {
    if (!inv) return
    const bad = rows.find(({ i, left }) => (+qty[i] || 0) > left)
    if (bad) return setErr(`${bad.l.name}: only ${bad.left} left to return on this bill.`)
    if (!value) return setErr('Enter a return quantity against at least one line.')
    if (mode === 'Account' && inv.partyId === 'c0') return setErr('A walk-in bill cannot be credited to an account. Refund by cash or UPI.')
    const v = Math.round(value)
    const no = 'CN/' + String(27 + cns.length).padStart(4, '0')
    set((s) => ({
      items: s.items.map((it) => { const q = rows.filter(({ l, i }) => l.itemId === it.id && +qty[i] > 0).reduce((a, { i }) => a + +qty[i], 0); return q ? { ...it, stock: { ...it.stock, show: (it.stock.show ?? 0) + q } } : it }),
      parties: s.parties.map((p) => (p.id === inv.partyId && mode === 'Account' ? { ...p, balance: p.balance - v } : p)),
      ledgers: s.ledgers.map((l) => (mode === 'Cash' && l.name === 'Cash in hand' ? { ...l, bal: l.bal - v } : mode === 'UPI' && l.name.startsWith('HDFC') ? { ...l, bal: l.bal - v } : l)),
      rows: { ...s.rows, returned: [...rows.filter(({ i }) => +qty[i] > 0).map(({ i }) => ({ id: 'rt' + Date.now() + i, inv: inv.id, line: i, qty: +qty[i] })), ...((s.rows.returned ?? []) as Row[])], returns: [{ id: 'cn' + Date.now(), no, bill: inv.no, date: today(), reason, value: v, status: 'Posted' }, ...((s.rows.returns ?? []) as Row[])] },
    }))
    setErr(''); setQty({}); setPick(''); setTab('list'); toast(`${no} posted. ${inr0(v)} ${mode === 'Account' ? 'credited to the account' : 'refunded by ' + mode.toLowerCase()}. Stock is back on the shelf.`)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Returns and credit notes" crumbs={['Counter', 'Returns']} sub="Pick the original bill, choose what comes back, post a credit note. Stock, cash and the customer's balance move together." />
      <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'new', label: 'Return against a bill' }, { id: 'list', label: 'Credit notes', badge: cns.length }]} /></div>
      <div className="flex-1 scroll p-5">
        {tab === 'list' ? (cns.length === 0 ? <Empty text="No credit notes yet." /> : <DataTable name="credit notes" rows={cns as (Row & { id: string })[]} cols={[{ key: 'no', label: 'Credit note' }, { key: 'bill', label: 'Against bill' }, { key: 'date', label: 'Date', render: (r) => dmy(String(r.date)) }, { key: 'reason', label: 'Reason' }, { key: 'value', label: 'Value', num: true, total: true, render: (r) => inr0(+r.value) }, { key: 'status', label: 'State', render: (r) => <Status s={String(r.status)} /> }] as Col<Row>[]} />)
          : !inv ? (
            <div className="max-w-xl space-y-2"><input autoFocus aria-label="Find the original bill" className="inp" placeholder="Bill number or customer name" value={q} onChange={(e) => setQ(e.target.value)} />
              <ul className="divide-y divide-rule panel">{found.map((i) => <li key={i.id}><button className="w-full text-left px-3 py-2 flex justify-between hover:bg-wash" onClick={() => setPick(i.id)}><span><span className="num font-medium">{i.no}</span><span className="muted text-xs block">{i.partyName} · {dmy(i.date)}</span></span><Money v={i.total} /></button></li>)}{!found.length && <li className="p-4 text-center muted text-sm">No posted bill matches "{q}".</li>}</ul></div>
          ) : (
            <div className="max-w-3xl space-y-3"><div className="flex justify-between items-center"><div><b className="num">{inv.no}</b> <span className="muted">· {inv.partyName} · {dmy(inv.date)}</span></div><Btn className="btn-sm" onClick={() => { setPick(''); setQty({}) }}>Choose another bill</Btn></div>
              <table className="w-full text-[13px]"><thead><tr className="text-left muted text-xs"><th>Item</th><th className="text-right">Sold</th><th className="text-right">Returned</th><th className="text-right w-28">Return now</th><th className="text-right">Credit</th></tr></thead><tbody>{rows.map(({ l, i, left }) => <tr key={i} className="border-t border-rule"><td className="py-1.5">{l.name}</td><td className="text-right num">{l.qty}</td><td className="text-right num">{l.qty - left}</td><td className="text-right"><input aria-label={`Return quantity for ${l.name}`} disabled={left === 0} inputMode="numeric" className="inp num h-7 w-20 text-right" value={qty[i] ?? ''} onChange={(e) => setQty({ ...qty, [i]: e.target.value.replace(/\D/g, '') })} placeholder="0" /></td><td className="text-right num">{inr0((+qty[i] || 0) * l.rate * (1 - l.disc / 100) * (1 + l.gst / 100))}</td></tr>)}</tbody></table>
              <div className="flex gap-4 flex-wrap items-end"><Field label="Reason"><select className="inp" value={reason} onChange={(e) => setReason(e.target.value)}><option>Size or fit</option><option>Damaged</option><option>Wrong item</option><option>Customer changed mind</option></select></Field><Field label="Refund as"><Seg label="Refund as" value={mode} onChange={setMode} opts={[{ id: 'Cash', label: 'Cash' }, { id: 'UPI', label: 'UPI' }, { id: 'Account', label: 'Credit to account' }]} /></Field><div className="flex-1" /><div className="text-right"><div className="text-xs muted">Credit note value incl. GST</div><div className="text-2xl font-semibold num">{inr(Math.round(value), 0)}</div></div></div>
              {err && <p role="alert" className="text-xs text-sindoor">{err}</p>}<Btn kind="primary" onClick={post}>Post credit note</Btn></div>
          )}
      </div>
    </div>
  )
}
