import { useApp, go, set, toast } from '../lib/app'
import { GODOWNS } from '../lib/data'
import { inr0, inr, dmy } from '../lib/fmt'
import { Bal, useT, Status } from '../ui/kit'
import { Icon } from '../ui/icons'
import { ctx } from './ctx'

export function Margin() {
  const s = useApp((x) => x)
  const sel = ctx.use((x) => x)
  const t = useT()
  const mode = s.mode
  const party = sel.kind === 'party' ? s.parties.find((p) => p.id === sel.id) : undefined
  const item = sel.kind === 'item' ? s.items.find((p) => p.id === sel.id) : undefined
  return (
    <aside aria-label="The Margin" className="w-[272px] shrink-0 border-l border-rule bg-sheet scroll text-[13px] hidden xl:block">
      <div className="h-9 px-3 flex items-center justify-between border-b border-rule">
        <span className="font-semibold text-xs">The Margin</span>
        <button className="btn btn-ghost btn-sm" aria-label="Hide Margin" onClick={() => set({ margin: false })}><Icon n="x" size={12} /></button>
      </div>
      {!party && !item && <p className="p-3 muted">Pick a line, {t('{customer}').toLowerCase()} or row. Balance, stock, the pricing rule that won and recent history show here.</p>}
      {party && (
        <div className="p-3 space-y-3">
          <div>
            <div className="font-semibold text-sm">{party.name}</div>
            <div className="muted text-xs">{party.city || 'Counter sale'} {party.phone && '· ' + party.phone}</div>
          </div>
          {party.id !== 'c0' && (
            <>
              <div>
                <div className="text-xs muted">Balance</div>
                <div className="text-lg"><Bal v={party.balance} ctx="dues" party /></div>
              </div>
              {party.limit > 0 && (
                <div>
                  <div className="flex justify-between text-xs"><span className="muted">Credit limit</span><span className="num">{inr0(party.limit)}</span></div>
                  <div className="h-1.5 rounded bg-wash mt-1" role="meter" aria-valuenow={Math.max(0, party.balance)} aria-valuemax={party.limit} aria-label="Credit used">
                    <div className="h-full rounded" style={{ width: Math.min(100, (Math.max(0, party.balance) / party.limit) * 100) + '%', background: party.balance > party.limit ? 'var(--sindoor)' : 'var(--neel)' }} />
                  </div>
                  {party.balance > party.limit && <p className="text-xs mt-1" style={{ boxShadow: 'inset 0 -2px 0 var(--haldi)' }}>Over the limit by {inr0(party.balance - party.limit)}.</p>}
                </div>
              )}
              <dl className="text-xs grid grid-cols-2 gap-y-1">
                <dt className="muted">Last payment</dt><dd className="text-right">{party.lastPay ? dmy(party.lastPay) : 'None'}</dd>
                <dt className="muted">Overdue</dt><dd className="text-right">{party.overdueDays ? party.overdueDays + ' days' : 'No'}</dd>
                <dt className="muted">Risk</dt><dd className="text-right capitalize">{party.risk}</dd>
                <dt className="muted">WhatsApp</dt><dd className="text-right">{party.consent ? 'Opted in' : 'No consent'}</dd>
              </dl>
              <div>
                <div className="text-xs muted mb-1">Recent bills</div>
                {s.invoices.filter((i) => i.partyId === party.id).slice(0, 3).map((i) => (
                  <div key={i.id} className="flex justify-between text-xs py-0.5"><span>{i.no.slice(-5)} · {dmy(i.date)}</span><span className="num">{inr0(i.total)}</span></div>
                ))}
              </div>
              <button className="btn w-full justify-center" onClick={() => { ctx.set({ id: party.id }); go('parties') }}>Open {t('{customer}')} 360</button>
            </>
          )}
        </div>
      )}
      {item && (
        <div className="p-3 space-y-3">
          <div>
            <div className="font-semibold text-sm leading-snug">{item.name}</div>
            <div className="muted text-xs">{item.code} · HSN {item.hsn} · GST {item.gst}%</div>
          </div>
          <div>
            <div className="text-xs muted mb-1">Stock by {t('{godown}').toLowerCase()}</div>
            {GODOWNS.map((g) => (
              <div key={g.id} className="flex justify-between text-xs py-0.5"><span>{g.name}</span><span className="num">{item.stock[g.id]} {item.unit}</span></div>
            ))}
            <div className="flex justify-between text-xs py-0.5 border-t border-rule mt-1 font-medium"><span>Total</span><span className="num">{Object.values(item.stock).reduce((a, b) => a + b, 0)} {item.unit}</span></div>
          </div>
          <div className="text-xs space-y-0.5">
            <div className="muted">Why this rate</div>
            <div>Item standard rate {inr(item.rate)}, MRP {inr(item.mrp)}. No party rate or scheme applies.</div>
          </div>
          {mode !== 'counter' ? (
            <dl className="text-xs grid grid-cols-2 gap-y-1 border-t border-rule pt-2">
              <dt className="muted">Last purchase</dt><dd className="num text-right">{inr(item.cost)}</dd>
              <dt className="muted">Margin</dt><dd className="num text-right">{(((item.rate - item.cost) / item.rate) * 100).toFixed(1)}%</dd>
            </dl>
          ) : null}
          {item.expiry && <div className="text-xs"><Status s={`Batch ${item.batch}`} /> expires {dmy(item.expiry)}</div>}
          <button className="btn w-full justify-center" onClick={() => { toast(`Added ${item.name.slice(0, 30)} to a draft purchase order.`); }}>Add to draft purchase order</button>
        </div>
      )}
    </aside>
  )
}
