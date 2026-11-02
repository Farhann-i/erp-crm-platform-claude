import type { Branch, Config } from '../lib/config'
import { inr } from '../lib/fmt'

export function PrintPreview({ c, b, opts }: { c: Config; b: Branch; opts?: { dup?: boolean; tagline?: boolean; gstin?: boolean } }) {
  const o = { dup: false, tagline: true, gstin: true, ...opts }
  return (
    <div className="flex gap-6 flex-wrap items-start">
      <figure className="m-0">
        <div className="w-[230px] bg-white text-[#1c2340] border border-rule p-3 text-[11px] font-[family-name:var(--font-num)] shadow-sm" style={{ color: '#1c2340' }}>
          <div className="text-center font-semibold text-[13px]">{b.display}</div>
          {o.tagline && <div className="text-center text-[10px]">{b.tagline}</div>}
          {o.gstin && <div className="text-center text-[10px]">GSTIN {b.gstin}</div>}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between"><span>Bill INV/26-27/01043</span><span>Today</span></div>
          <div className="mt-1 space-y-0.5"><div className="flex justify-between"><span>Linen shirt × 1</span><span>{inr(1749)}</span></div><div className="flex justify-between"><span>Cotton kurta × 2</span><span>{inr(2398)}</span></div></div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between font-semibold text-[12px]"><span>Total</span><span>{inr(4147)}</span></div>
          <div className="text-center mt-2 text-[10px]">Thank you. Visit again.</div>
          {o.dup && <div className="text-center mt-1 text-[10px] tracking-wide">DUPLICATE</div>}
        </div>
        <figcaption className="text-xs muted mt-1">Receipt, 80 mm. Uses the display name.</figcaption>
      </figure>
      <figure className="m-0">
        <div className="w-[300px] h-[210px] bg-white border border-rule p-3 text-[10px] relative shadow-sm overflow-hidden" style={{ color: '#1c2340' }}>
          <div className="flex justify-between items-start"><div><div className="font-semibold text-[12px]">{b.legal}</div><div>{b.tagline}, {b.city}</div>{o.gstin && <div>GSTIN {b.gstin}</div>}</div><div className="text-right"><div className="font-semibold text-[12px]">TAX INVOICE</div><div>INV/26-27/01043</div></div></div>
          <div className="border-t border-gray-300 my-2" />
          <table className="w-full"><thead><tr className="text-left"><th>Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead><tbody><tr><td>Linen shirt</td><td>6205</td><td className="text-right">1</td><td className="text-right">{inr(1749)}</td></tr><tr><td>Cotton kurta</td><td>6104</td><td className="text-right">2</td><td className="text-right">{inr(2398)}</td></tr></tbody></table>
          <div className="absolute bottom-2 right-3 text-right font-semibold text-[11px]">Total {inr(4147)}</div>
          {o.dup && <div className="absolute inset-0 grid place-items-center text-4xl font-semibold text-gray-300 -rotate-12 pointer-events-none">DUPLICATE</div>}
        </div>
        <figcaption className="text-xs muted mt-1">A4 tax invoice. The legal name stays on statutory documents.</figcaption>
      </figure>
    </div>
  )
}
