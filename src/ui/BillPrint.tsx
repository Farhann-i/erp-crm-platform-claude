import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createStore } from '../lib/store'
import { useApp } from '../lib/app'
import type { Invoice, Party } from '../lib/data'
import type { Branch } from '../lib/config'
import { inr } from '../lib/fmt'
import { Modal, Btn, Seg, Toggle } from './kit'

export const printStore = createStore<{ inv: Invoice | null; reprint: boolean }>('erp-print', { inv: null, reprint: false }, [])
export const openPrint = (inv: Invoice, reprint = false) => printStore.set({ inv, reprint })
export const usePrint = () => printStore.use((s) => s)

type Fmt = 'thermal' | 'a4' | 'a5'
const dmyOf = (iso: string) => iso.split('-').reverse().join('-')

const words = (n: number) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (x: number) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''))
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x))
  let r = Math.round(n), out = ''
  const cr = Math.floor(r / 1e7); r %= 1e7
  const lk = Math.floor(r / 1e5); r %= 1e5
  const th = Math.floor(r / 1e3); r %= 1e3
  if (cr) out += three(cr) + ' Crore '
  if (lk) out += two(lk) + ' Lakh '
  if (th) out += two(th) + ' Thousand '
  if (r) out += three(r)
  return (out.trim() || 'Zero') + ' Rupees Only'
}

export function taxSplit(inv: Invoice, party?: Party, home = '32') {
  const inter = !!party?.gstin && !party.gstin.startsWith(home)
  const rows = inv.lines.map((l) => { const taxable = l.qty * l.rate * (1 - l.disc / 100); return { l, taxable, tax: (taxable * l.gst) / 100 } })
  const slabs = [...new Set(rows.map((r) => r.l.gst))].sort((a, b) => a - b).map((g) => {
    const rs = rows.filter((r) => r.l.gst === g)
    return { g, taxable: rs.reduce((a, r) => a + r.taxable, 0), tax: rs.reduce((a, r) => a + r.tax, 0) }
  })
  const raw = inv.sub + inv.tax
  return { inter, rows, slabs, round: inv.total - raw }
}

export function BillDoc({ inv, b, party, fmt, dup, opts }: { inv: Invoice; b: Branch; party?: Party; fmt: Fmt; dup: boolean; opts: { tagline: boolean; words: boolean; terms: boolean } }) {
  const x = taxSplit(inv, party)
  const walk = !party || party.id === 'c0'
  if (fmt === 'thermal') {
    return (
      <div className="bill-doc thermal" style={{ width: '72mm', fontSize: 11, color: '#111', background: '#fff', padding: '3mm', fontFamily: 'var(--font-num), monospace' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{b.display}</div>
        {opts.tagline && <div style={{ textAlign: 'center' }}>{b.tagline}, {b.city}</div>}
        <div style={{ textAlign: 'center' }}>GSTIN {b.gstin}</div>
        <hr style={{ borderTop: '1px dashed #444', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{inv.no}</span><span>{dmyOf(inv.date)}</span></div>
        <div>{walk ? 'Walk-in customer' : party!.name + (party!.phone ? ' · ' + party!.phone : '')}</div>
        {!walk && party!.gstin && <div>GSTIN {party!.gstin}</div>}
        <hr style={{ borderTop: '1px dashed #444', margin: '4px 0' }} />
        {x.rows.map(({ l }, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <div>{l.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l.qty} {l.unit} × {inr(l.rate)}{l.disc ? ` −${l.disc}%` : ''}</span><span>{inr(l.qty * l.rate * (1 - l.disc / 100))}</span></div>
          </div>
        ))}
        <hr style={{ borderTop: '1px dashed #444', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxable</span><span>{inr(inv.sub)}</span></div>
        {x.slabs.map((s) => x.inter
          ? <div key={s.g} style={{ display: 'flex', justifyContent: 'space-between' }}><span>IGST {s.g}%</span><span>{inr(s.tax)}</span></div>
          : <div key={s.g}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST {s.g / 2}%</span><span>{inr(s.tax / 2)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST {s.g / 2}%</span><span>{inr(s.tax / 2)}</span></div></div>)}
        {Math.abs(x.round) > 0.004 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Round off</span><span>{inr(x.round)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 3 }}><span>TOTAL</span><span>{inr(inv.total, 2)}</span></div>
        <div>Paid by {inv.pay}{inv.total - inv.paid > 0.5 ? ` · Due ${inr(inv.total - inv.paid)}` : ''}</div>
        <hr style={{ borderTop: '1px dashed #444', margin: '4px 0' }} />
        <div style={{ textAlign: 'center' }}>Thank you. Visit again.</div>
        {dup && <div style={{ textAlign: 'center', fontWeight: 700, letterSpacing: 2, marginTop: 3 }}>** DUPLICATE COPY **</div>}
      </div>
    )
  }
  const w = fmt === 'a4' ? '190mm' : '135mm'
  return (
    <div className="bill-doc sheet" style={{ width: w, minHeight: fmt === 'a4' ? '270mm' : '190mm', background: '#fff', color: '#111', padding: '8mm', fontSize: fmt === 'a4' ? 12 : 10.5, position: 'relative', boxSizing: 'border-box' }}>
      {dup && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 72, fontWeight: 700, color: 'rgba(0,0,0,.07)', transform: 'rotate(-24deg)', pointerEvents: 'none' }}>DUPLICATE</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{b.legal}</div>
          {opts.tagline && <div>{b.tagline}, {b.city}, Kerala</div>}
          <div>GSTIN {b.gstin} · State code 32</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>TAX INVOICE</div>
          <div className="num">{inv.no}</div><div>Date {dmyOf(inv.date)}</div><div>{dup ? 'Duplicate for customer' : 'Original for recipient'}</div>
        </div>
      </div>
      <div style={{ border: '1px solid #bbb', padding: '6px 8px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div><div style={{ fontSize: 10, color: '#666' }}>BILL TO</div><div style={{ fontWeight: 600 }}>{walk ? 'Walk-in customer' : party!.name}</div>{!walk && <div>{party!.city}{party!.phone ? ' · ' + party!.phone : ''}</div>}{!walk && party!.gstin && <div>GSTIN {party!.gstin}</div>}</div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#666' }}>PLACE OF SUPPLY</div><div>{x.inter ? 'Other state (IGST)' : 'Kerala (32)'}</div><div>Branch {inv.branch}</div></div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '1.5px solid #111', textAlign: 'left' }}><th style={{ padding: '3px 2px' }}>#</th><th>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Disc</th><th style={{ textAlign: 'right' }}>Taxable</th><th style={{ textAlign: 'right' }}>GST</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>{x.rows.map(({ l, taxable, tax }, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '3px 2px' }}>{i + 1}</td><td>{l.name}</td><td style={{ textAlign: 'right' }} className="num">{l.qty} {l.unit}</td><td style={{ textAlign: 'right' }} className="num">{inr(l.rate)}</td><td style={{ textAlign: 'right' }} className="num">{l.disc ? l.disc + '%' : '–'}</td><td style={{ textAlign: 'right' }} className="num">{inr(taxable)}</td><td style={{ textAlign: 'right' }} className="num">{l.gst}%</td><td style={{ textAlign: 'right' }} className="num">{inr(taxable + tax)}</td></tr>
        ))}</tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 10, alignItems: 'flex-start' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr style={{ borderBottom: '1px solid #111' }}><th style={{ textAlign: 'left', paddingRight: 10 }}>GST slab</th><th style={{ textAlign: 'right', paddingRight: 10 }}>Taxable</th>{x.inter ? <th style={{ textAlign: 'right' }}>IGST</th> : <><th style={{ textAlign: 'right', paddingRight: 10 }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></>}</tr></thead>
          <tbody>{x.slabs.map((s) => <tr key={s.g}><td>{s.g}%</td><td style={{ textAlign: 'right', paddingRight: 10 }} className="num">{inr(s.taxable)}</td>{x.inter ? <td style={{ textAlign: 'right' }} className="num">{inr(s.tax)}</td> : <><td style={{ textAlign: 'right', paddingRight: 10 }} className="num">{inr(s.tax / 2)}</td><td style={{ textAlign: 'right' }} className="num">{inr(s.tax / 2)}</td></>}</tr>)}</tbody>
        </table>
        <div style={{ minWidth: 190 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxable value</span><span className="num">{inr(inv.sub)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST</span><span className="num">{inr(inv.tax)}</span></div>
          {Math.abs(x.round) > 0.004 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Round off</span><span className="num">{inr(x.round)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, borderTop: '1.5px solid #111', marginTop: 3, paddingTop: 3 }}><span>Total</span><span className="num">{inr(inv.total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Received ({inv.pay})</span><span className="num">{inr(inv.paid)}</span></div>
          {inv.total - inv.paid > 0.5 && <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Balance due</span><span className="num">{inr(inv.total - inv.paid)}</span></div>}
        </div>
      </div>
      {opts.words && <div style={{ marginTop: 8 }}><b>Amount in words:</b> {words(inv.total)}</div>}
      {opts.terms && <div style={{ marginTop: 14, fontSize: 10, color: '#444' }}>Goods once sold are exchanged within 7 days with this bill. Subject to Kochi jurisdiction. This is a computer-generated invoice.</div>}
      <div style={{ position: 'absolute', right: '8mm', bottom: '8mm', textAlign: 'right', fontSize: 11 }}><div style={{ height: 28 }} />For {b.legal}<br />Authorised signatory</div>
    </div>
  )
}

export function PrintDialog() {
  const { inv, reprint } = usePrint()
  const c = useApp((s) => s.published)
  const parties = useApp((s) => s.parties)
  const [fmt, setFmt] = useState<Fmt>('thermal')
  const [dup, setDup] = useState(false)
  const [o, setO] = useState({ tagline: true, words: true, terms: true })
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => { setDup(reprint) }, [reprint, inv])
  useEffect(() => {
    let h = document.getElementById('print-root')
    if (!h) { h = document.createElement('div'); h.id = 'print-root'; document.body.appendChild(h) }
    setHost(h)
  }, [])
  if (!inv) return null
  const b = c.branches.find((x) => x.name === inv.branch) ?? c.branches[0]
  const party = parties.find((p) => p.id === inv.partyId)
  const doc = <BillDoc inv={inv} b={b} party={party} fmt={fmt} dup={dup} opts={o} />
  const phone = party?.phone?.replace(/\D/g, '')
  return (
    <>
      <Modal open onClose={() => printStore.set({ inv: null, reprint: false })} title={`${inv.no} · ${reprint ? 'Reprint' : 'Print'}`}
        foot={<><Btn onClick={() => printStore.set({ inv: null, reprint: false })}>Done</Btn>
          {phone && <Btn icon="chat" onClick={() => window.open(`https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(`${inv.no} for ${inr(inv.total)} from ${b.display}. Thank you.`)}`, '_blank', 'noopener')}>Share on WhatsApp</Btn>}
          <Btn kind="primary" icon="printer" onClick={() => { const t = document.title; document.title = inv.no.replace(/\//g, '-'); document.body.dataset.printfmt = fmt; window.print(); document.title = t }}>Print {dup ? 'duplicate' : ''}</Btn></>}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Seg label="Paper" value={fmt} onChange={setFmt} opts={[{ id: 'thermal', label: 'Receipt 80 mm' }, { id: 'a5', label: 'A5' }, { id: 'a4', label: 'A4 invoice' }]} />
          </div>
          <div className="flex gap-4 flex-wrap text-[13px]">
            <span className="inline-flex items-center gap-1.5"><Toggle label="Duplicate copy" on={dup} onChange={setDup} /><span>Duplicate copy</span></span>
            <span className="inline-flex items-center gap-1.5"><Toggle label="Tagline" on={o.tagline} onChange={(v) => setO({ ...o, tagline: v })} /><span>Tagline</span></span>
            <span className="inline-flex items-center gap-1.5"><Toggle label="Amount in words" on={o.words} onChange={(v) => setO({ ...o, words: v })} /><span>Amount in words</span></span>
            <span className="inline-flex items-center gap-1.5"><Toggle label="Terms" on={o.terms} onChange={(v) => setO({ ...o, terms: v })} /><span>Terms</span></span>
          </div>
          <div className="scroll max-h-[48vh] bg-[#e9e9ee] p-3 flex justify-center border border-rule rounded"><div className="shadow-md origin-top" style={{ transform: fmt === 'a4' ? 'scale(.62)' : fmt === 'a5' ? 'scale(.8)' : 'none', transformOrigin: 'top center', height: fmt === 'a4' ? 600 : undefined }}>{doc}</div></div>
          <p className="text-xs muted">The browser print dialog opens next. Choose the receipt printer or "Save as PDF". The legal name shows on A4 and A5 invoices, the display name on receipts.</p>
        </div>
      </Modal>
      {host && createPortal(doc, host)}
    </>
  )
}
