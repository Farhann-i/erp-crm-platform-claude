import { useEffect, useMemo, useState } from 'react'
import { useApp, set, toast, nextNo, bumpNo, go } from '../lib/app'
import { today, inr, inr0, dmy } from '../lib/fmt'
import type { Voucher } from '../lib/data'
import { Btn, Tape, Field, Bal, Status, PageHead, Seg, Empty } from '../ui/kit'
import { Icon } from '../ui/icons'

const TYPES = ['Payment', 'Receipt', 'Journal', 'Contra', 'Debit note', 'Credit note'] as const
type VT = (typeof TYPES)[number]
const KEYS: Record<VT, string> = { Payment: 'F5', Receipt: 'F6', Journal: 'F7', Contra: 'F8', 'Debit note': 'F9', 'Credit note': 'F10' }
const DOCS: Record<string, string> = { Payment: 'Payment voucher', Receipt: 'Receipt voucher', 'Credit note': 'Credit note' }
interface L { side: 'Dr' | 'Cr'; ledger: string; amt: string }
const preset = (t: VT): L[] => (t === 'Payment' ? [{ side: 'Dr', ledger: '', amt: '' }, { side: 'Cr', ledger: 'Cash in hand', amt: '' }] : t === 'Receipt' ? [{ side: 'Dr', ledger: 'Cash in hand', amt: '' }, { side: 'Cr', ledger: '', amt: '' }] : t === 'Contra' ? [{ side: 'Dr', ledger: '', amt: '' }, { side: 'Cr', ledger: '', amt: '' }] : [{ side: 'Dr', ledger: '', amt: '' }, { side: 'Cr', ledger: '', amt: '' }])

export function useLedgerOptions() {
  const ledgers = useApp((s) => s.ledgers)
  const parties = useApp((s) => s.parties)
  return useMemo(() => [...ledgers.map((l) => ({ name: l.name, bal: l.bal, group: l.group })), ...parties.filter((p) => p.id !== 'c0').map((p) => ({ name: p.name, bal: p.balance, group: p.kind === 'customer' ? 'Sundry debtors' : 'Sundry creditors' }))], [ledgers, parties])
}

export function VoucherEntry() {
  const [type, setType] = useState<VT>('Payment')
  const [lines, setLines] = useState<L[]>(preset('Payment'))
  const [date, setDate] = useState(today())
  const [narr, setNarr] = useState('')
  const [pdc, setPdc] = useState('')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const opts = useLedgerOptions()
  const vouchers = useApp((s) => s.vouchers)
  const no = useApp((s) => { const d = DOCS[type]; const n = s.published.numbering.find((x) => x.doc === d); return n ? n.prefix + String(n.start).padStart(n.padding, '0') : type.slice(0, 2).toUpperCase() + '-' + String(vouchers.length + 40).padStart(4, '0') })
  const a2 = useApp((s) => s.published.approvals.find((a) => a.id === 'a2'))
  const num = (l: L) => parseFloat(l.amt) || 0
  const dr = lines.filter((l) => l.side === 'Dr').reduce((a, l) => a + num(l), 0)
  const cr = lines.filter((l) => l.side === 'Cr').reduce((a, l) => a + num(l), 0)
  const balanced = dr > 0 && Math.abs(dr - cr) < 0.005
  const upd = (i: number, p: Partial<L>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)))
  const pick = (t: VT) => { setType(t); setLines(preset(t)); setErrs({}) }
  const balOf = (n: string) => opts.find((o) => o.name === n)?.bal

  const post = () => {
    const e: Record<string, string> = {}
    lines.forEach((l, i) => { if (!l.ledger) e['l' + i] = 'Choose a ledger.'; if (!(num(l) > 0)) e['a' + i] = 'Enter an amount above zero.' })
    if (date < '2026-04-01') e.date = 'This period is locked. Posting is not allowed before 01-04-26.'
    if (!balanced) e.bal = `Debit ${inr(dr)} and credit ${inr(cr)} must match before posting.`
    if (type === 'Contra' && lines.some((l) => l.ledger && !/cash|bank/i.test(l.ledger))) e.bal = 'A contra voucher moves money between cash and bank ledgers only.'
    setErrs(e)
    if (Object.keys(e).length) return toast('Posting stopped. Fix the marked fields.', 'err')
    const needsApproval = type === 'Journal' && a2?.on && dr > (a2.steps[0]?.limit ?? 1e9)
    if (needsApproval) {
      set((s) => ({ approvals: [{ id: 'ap' + Date.now(), kind: 'Journal', title: `${no} ${narr || 'Journal'}`, by: 'Rekha (accountant)', amount: dr, detail: lines.map((l) => `${l.side} ${l.ledger} ${inr0(num(l))}`).join('; '), due: 'Tomorrow', status: 'pending' }, ...s.approvals] }))
      toast('Journal is above the CA limit. Sent for approval, not posted.', 'warn'); setLines(preset(type)); setNarr('')
      return
    }
    const v: Voucher = { id: 'v' + Date.now(), no, type, date, narration: narr || '-', status: 'posted', by: 'Rekha (accountant)', lines: lines.map((l) => ({ ledger: l.ledger, dr: l.side === 'Dr' ? num(l) : 0, cr: l.side === 'Cr' ? num(l) : 0 })) }
    set((s) => ({
      vouchers: [v, ...s.vouchers],
      ledgers: s.ledgers.map((l) => { const x = v.lines.find((y) => y.ledger === l.name); return x ? { ...l, bal: l.bal + x.dr - x.cr } : l }),
      parties: s.parties.map((p) => { const x = v.lines.find((y) => y.ledger === p.name); return x ? { ...p, balance: p.balance + x.dr - x.cr } : p }),
      pending: s.offline ? s.pending + 1 : s.pending,
    }))
    if (DOCS[type]) bumpNo(DOCS[type])
    toast(`${no} posted. ${lines.length} entries added to the day book.`)
    setLines(preset(type)); setNarr(''); setPdc('')
  }
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); post() }
      const t = TYPES.find((x) => KEYS[x] === ev.key)
      if (t) { ev.preventDefault(); pick(t) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  const tape = lines.filter((l) => l.ledger && num(l) > 0).map((l) => ({ ledger: l.ledger, dr: l.side === 'Dr' ? num(l) : 0, cr: l.side === 'Cr' ? num(l) : 0 }))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 scroll">
        <PageHead title={`${type} voucher`} sub="One form for every voucher type. Switch with the function keys. Post is enabled when debit equals credit." crumbs={['Books', 'Voucher entry']}>
          <Btn needs="C" kind="primary" icon="save" disabled={!balanced} onClick={post}>Post voucher <span className="kbd text-ink">Ctrl+S</span></Btn>
        </PageHead>
        <div className="px-5 flex gap-1 flex-wrap mb-3" role="tablist" aria-label="Voucher type">
          {TYPES.map((t) => <button key={t} role="tab" aria-selected={type === t} onClick={() => pick(t)} className={`h-8 px-3 rounded border text-[13px] ${type === t ? 'bg-neel text-onneel border-neel' : 'bg-sheet border-rule hover:bg-wash'}`}>{t} <span className="text-[10px] opacity-70">{KEYS[t]}</span></button>)}
        </div>
        <div className="mx-5 panel p-4 draft-edge">
          <div className="grid grid-cols-4 gap-4 max-w-3xl">
            <Field label="Voucher number"><input className="inp num text-left" readOnly value={no} /></Field>
            <Field label="Date" error={errs.date} req><input type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errs.date} /></Field>
            {(type === 'Payment' || type === 'Receipt') && <Field label="Cheque due date" hint="Post-dated cheque reminder"><input type="date" className="inp" value={pdc} onChange={(e) => setPdc(e.target.value)} /></Field>}
          </div>
          <table className="tbl mt-4">
            <thead><tr><th className="w-20">Dr or Cr</th><th>Ledger</th><th className="w-48 text-right">Balance now</th><th className="w-40 text-right">Amount</th><th className="w-8" /></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const b = balOf(l.ledger)
                return (
                  <tr key={i}>
                    <td><select aria-label={`Side line ${i + 1}`} className="inp h-7" value={l.side} onChange={(e) => upd(i, { side: e.target.value as 'Dr' | 'Cr' })}><option>Dr</option><option>Cr</option></select></td>
                    <td><select aria-label={`Ledger line ${i + 1}`} aria-invalid={!!errs['l' + i]} className="inp h-7" value={l.ledger} onChange={(e) => upd(i, { ledger: e.target.value })}><option value="">Choose ledger</option>{[...new Set(opts.map((o) => o.group))].map((g) => <optgroup key={g} label={g}>{opts.filter((o) => o.group === g).map((o) => <option key={o.name}>{o.name}</option>)}</optgroup>)}</select>{errs['l' + i] && <div role="alert" className="text-xs text-sindoor">{errs['l' + i]}</div>}</td>
                    <td className="text-right">{b !== undefined && <Bal v={b} ctx="acct" />}</td>
                    <td><input aria-label={`Amount line ${i + 1}`} aria-invalid={!!errs['a' + i]} type="number" min={0} className="inp num h-7 text-right" value={l.amt} onChange={(e) => upd(i, { amt: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && i === lines.length - 1 && balanced === false) setLines([...lines, { side: dr > cr ? 'Cr' : 'Dr', ledger: '', amt: String(Math.abs(dr - cr) || '') }]) }} />{errs['a' + i] && <div role="alert" className="text-xs text-sindoor text-left">{errs['a' + i]}</div>}</td>
                    <td>{lines.length > 2 && <button aria-label="Remove line" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Icon n="x" size={13} /></button>}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={3} className="font-medium">Totals</td><td className="num font-medium">Dr {inr(dr)}<br />Cr {inr(cr)}</td><td /></tr></tfoot>
          </table>
          <div className="flex items-center gap-2 mt-2"><Btn icon="plus" className="btn-sm" onClick={() => setLines([...lines, { side: dr > cr ? 'Cr' : 'Dr', ledger: '', amt: String(Math.abs(dr - cr) || '') }])}>Add line</Btn><span className="text-xs muted">Enter on the last amount adds a balancing line.</span></div>
          {errs.bal && <p role="alert" className="text-xs text-sindoor mt-2">{errs.bal}</p>}
          <div className="mt-3 max-w-xl"><Field label="Narration"><input className="inp" value={narr} onChange={(e) => setNarr(e.target.value)} placeholder="Cheque number, bill reference or reason" /></Field></div>
          <p className="text-xs muted mt-3">Audit: posted vouchers cannot be edited or deleted. Corrections are made by reversal. Created by Rekha, {dmy(today())}.</p>
        </div>
        <div className="px-5 py-4"><div className="flex items-center justify-between mb-1"><h2 className="font-semibold">Recent vouchers</h2><Btn className="btn-sm" onClick={() => go('daybook')}>Open day book</Btn></div>
          <div className="panel"><table className="tbl"><tbody>{vouchers.slice(0, 5).map((v) => <tr key={v.id}><td className="num text-left w-24">{v.no}</td><td className="w-20">{v.type}</td><td className="w-24">{dmy(v.date)}</td><td className="truncate">{v.narration}</td><td className="num">{inr0(v.lines.reduce((a, l) => a + l.dr, 0))}</td><td><Status s={v.status} /></td></tr>)}</tbody></table></div></div>
      </div>
      <Tape lines={tape} />
    </div>
  )
}
export { Seg, Empty }
