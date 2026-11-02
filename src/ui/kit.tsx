import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp, term, toasts, toast } from '../lib/app'
import { tr } from '../lib/i18n'
import { inr, inr0 } from '../lib/fmt'
import { Icon } from './icons'

export function useT() {
  const c = useApp((s) => s.draft)
  return (s: string) => term(c, tr(c.lang, s))
}

/* Dr / Cr (CUS-017) */
export function Bal({ v, ctx = 'other', dec = 0, party = false }: { v: number; ctx?: 'acct' | 'dues' | 'other'; dec?: number; party?: boolean }) {
  const mode = useApp((s) => s.draft.drcr)
  const t = useT()
  if (Math.abs(v) < 0.005) return <span className="num muted">{inr(0, dec)}</span>
  const dr = v > 0
  const coloured = mode === 'everywhere' || (mode === 'accounting' && ctx === 'acct')
  const words = mode !== 'everywhere' && (ctx === 'dues' || party) && mode !== 'letters'
  const col = coloured ? (dr ? 'text-sindoor' : 'text-mehndi') : ''
  return (
    <span className="inline-flex items-baseline justify-end gap-1">
      <span className={`num ${col}`}>{inr(Math.abs(v), dec)}</span>
      <span className={`text-[11px] font-medium ${col}`}>{dr ? 'Dr' : 'Cr'}</span>
      {words && <span className="text-[11.5px] muted">{t(dr ? 'owes you' : 'you owe')}</span>}
    </span>
  )
}
export function Money({ v, dec = 0, className = '' }: { v: number; dec?: number; className?: string }) {
  return <span className={`num ${className}`}>{dec ? inr(v, dec) : inr0(v)}</span>
}

const TONES: Record<string, string> = {
  posted: '', draft: 'border-haldi', cancelled: 'text-sindoor border-sindoor line-through', pending: 'border-haldi', approved: 'text-mehndi border-mehndi', rejected: 'text-sindoor border-sindoor',
  open: 'border-haldi', paid: 'text-mehndi border-mehndi', overdue: 'text-sindoor border-sindoor', reversed: 'text-sindoor border-sindoor', ok: 'text-mehndi border-mehndi', warn: 'border-haldi', err: 'text-sindoor border-sindoor', imported: 'muted', implemented: 'text-mehndi border-mehndi', partial: 'border-haldi', 'not': 'text-sindoor border-sindoor', failed: 'text-sindoor border-sindoor', active: 'text-mehndi border-mehndi', resolved: 'text-mehndi border-mehndi',
}
export function Status({ s }: { s: string }) {
  const k = s.toLowerCase()
  const tone = TONES[k.split(' ')[0]] ?? ''
  return <span className={`chip ${tone}`}>{k === 'draft' && <span className="size-1.5 rounded-full bg-haldi" />}{s}</span>
}

export function PageHead({ title, sub, children, crumbs }: { title: string; sub?: string; children?: ReactNode; crumbs?: string[] }) {
  return (
    <div className="flex items-end justify-between gap-4 px-5 pt-4 pb-3 flex-wrap">
      <div className="min-w-0">
        {crumbs && <nav aria-label="Breadcrumb" className="text-xs muted mb-0.5">{crumbs.join(' / ')}</nav>}
        <h1 className="text-xl font-semibold leading-tight truncate">{title}</h1>
        {sub && <p className="text-[13px] muted mt-0.5 max-w-3xl">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  )
}

export function Btn({ icon, children, kind = '', ...p }: { icon?: string; kind?: 'primary' | 'danger' | 'ghost' | ''; children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn ${kind ? 'btn-' + kind : ''} ${p.className ?? ''}`
  return (
    <button type="button" {...p} className={cls}>
      {icon && <Icon n={icon} size={14} />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, req }: { label: string; error?: string; hint?: string; children: ReactNode; req?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1">{label}{req && <span className="text-sindoor" aria-hidden> *</span>}</span>
      {children}
      {error ? <span role="alert" className="block text-xs text-sindoor mt-1">{error}</span> : hint ? <span className="block text-xs muted mt-1">{hint}</span> : null}
    </label>
  )
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-5 w-9 rounded-full border transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-neel border-neel' : 'bg-wash border-rule'}`}>
      <span className={`absolute top-0.5 size-3.5 rounded-full transition-all ${on ? 'left-[18px] bg-onneel' : 'left-0.5 bg-ink/50'}`} />
    </button>
  )
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; badge?: string | number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-rule px-5 scroll">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`h-9 px-3 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px ${value === t.id ? 'border-neel text-neel' : 'border-transparent muted hover:text-ink'}`}>
          {t.label}{t.badge !== undefined && <span className="ml-1.5 chip">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export function Seg<T extends string>({ value, onChange, opts, label }: { value: T; onChange: (v: T) => void; opts: { id: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex border border-rule rounded p-0.5 bg-wash">
      {opts.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`h-6 px-2.5 text-xs font-medium rounded-[3px] ${value === o.id ? 'bg-sheet shadow-sm text-neel' : 'muted'}`}>{o.label}</button>
      ))}
    </div>
  )
}

export function Drawer({ open, onClose, title, children, foot, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className={`slide-in h-full bg-sheet border-l border-rule shadow-2xl flex flex-col ${wide ? 'w-[620px]' : 'w-[440px]'} max-w-full`}>
        <header className="flex items-center justify-between px-5 h-12 border-b border-rule shrink-0">
          <h2 className="font-semibold">{title}</h2>
          <button aria-label="Close" className="btn btn-ghost btn-sm" onClick={onClose}><Icon n="x" /></button>
        </header>
        <div className="flex-1 scroll p-5">{children}</div>
        {foot && <footer className="px-5 py-3 border-t border-rule flex justify-end gap-2 shrink-0">{foot}</footer>}
      </aside>
    </div>
  )
}
export function Modal({ open, onClose, title, children, foot }: { open: boolean; onClose: () => void; title: string; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-[460px] max-w-full bg-sheet border border-rule rounded-lg shadow-2xl">
        <h2 className="px-5 pt-4 font-semibold text-base">{title}</h2>
        <div className="px-5 py-3 text-[13px]">{children}</div>
        <div className="px-5 pb-4 flex justify-end gap-2">{foot}</div>
      </div>
    </div>
  )
}
export function Confirm({ open, title, body, action, danger, onYes, onNo, reason }: { open: boolean; title: string; body: ReactNode; action: string; danger?: boolean; onYes: (reason: string) => void; onNo: () => void; reason?: boolean }) {
  const [r, setR] = useState('')
  const [err, setErr] = useState('')
  return (
    <Modal open={open} onClose={onNo} title={title} foot={<><Btn onClick={onNo}>Keep as is</Btn><Btn kind={danger ? 'danger' : 'primary'} onClick={() => { if (reason && !r.trim()) return setErr('Give a reason. It is saved in the audit trail.'); onYes(r); setR(''); setErr('') }}>{action}</Btn></>}>
      <div className="space-y-3">{body}{reason && <Field label="Reason" error={err} req><input autoFocus className="inp" value={r} onChange={(e) => setR(e.target.value)} aria-invalid={!!err} /></Field>}</div>
    </Modal>
  )
}

export function Toasts() {
  const list = toasts.use((s) => s.list)
  return (
    <div className="fixed bottom-12 right-4 z-[60] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`slide-in panel shadow-xl px-3 py-2.5 flex items-start gap-2 text-[13px] border-l-4 ${t.tone === 'ok' ? 'border-l-mehndi' : t.tone === 'err' ? 'border-l-sindoor' : t.tone === 'warn' ? 'border-l-haldi' : 'border-l-neel'}`}>
          <span className="flex-1">{t.text}</span>
          {t.undo && <button className="font-medium text-neel" onClick={() => { t.undo?.(); toasts.set((s) => ({ list: s.list.filter((x) => x.id !== t.id) })) }}>Undo</button>}
        </div>
      ))}
    </div>
  )
}

export function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="py-10 px-4 text-center text-[13px] muted">
      <p>{text}</p>
      {action && <Btn kind="primary" className="mt-3" onClick={onAction}>{action}</Btn>}
    </div>
  )
}

export function Spark({ data, w = 90, h = 22, color = 'var(--neel)' }: { data: number[]; w?: number; h?: number; color?: string }) {
  const max = Math.max(...data, 1), min = Math.min(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ')
  return <svg width={w} height={h} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>
}

/* The Tape */
export interface TapeLine { ledger: string; dr: number; cr: number }
export function Tape({ lines, title = 'The Tape', note }: { lines: TapeLine[]; title?: string; note?: string }) {
  const dr = lines.reduce((a, l) => a + l.dr, 0), cr = lines.reduce((a, l) => a + l.cr, 0)
  const ok = Math.abs(dr - cr) < 0.01
  return (
    <section aria-label="Accounting preview" className="border-t border-rule bg-sheet shrink-0">
      <div className="flex items-stretch">
        <div className="px-4 py-1.5 w-28 shrink-0 border-r border-rule">
          <div className="text-xs font-semibold">{title}</div>
          <div className="text-[11px] muted">Posts on save</div>
        </div>
        <div className="flex-1 min-w-0 py-1 px-3 max-h-[84px] scroll font-[family-name:var(--font-num)] text-[12px]">
          {lines.length === 0 ? <div className="muted py-1.5">{note ?? 'Entries appear here as you build the document.'}</div> : lines.map((l, i) => (
            <div key={l.ledger + i} className="tape-line flex gap-3 leading-5">
              <span className={`w-6 ${l.dr ? 'text-sindoor' : 'text-mehndi'} font-medium`}>{l.dr ? 'Dr' : 'Cr'}</span>
              <span className="flex-1 truncate">{l.ledger}</span>
              <span className="w-24 text-right">{l.dr ? inr(l.dr) : ''}</span>
              <span className="w-24 text-right">{l.cr ? inr(l.cr) : ''}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-1.5 w-52 shrink-0 border-l border-rule text-[12px] font-[family-name:var(--font-num)]">
          <div className="flex justify-between"><span className="muted">Debit</span><span>{inr(dr)}</span></div>
          <div className="flex justify-between"><span className="muted">Credit</span><span>{inr(cr)}</span></div>
          <div className={`text-[11px] font-sans font-medium ${ok ? 'text-mehndi' : 'text-sindoor'}`}>{lines.length ? (ok ? 'Balanced' : `Difference ${inr(Math.abs(dr - cr))}`) : ''}</div>
        </div>
      </div>
    </section>
  )
}

/* DataTable */
export interface Col<T> { key: string; label: string; render?: (r: T) => ReactNode; get?: (r: T) => string | number; num?: boolean; off?: boolean; total?: boolean }
export function DataTable<T extends { id: string }>({ cols, rows, onOpen, bulk, filter, pageSize = 12, name, empty, toolbar, dense }: {
  cols: Col<T>[]; rows: T[]; onOpen?: (r: T) => void; bulk?: { label: string; icon?: string; run: (ids: string[]) => void }[]; filter?: { label: string; get: (r: T) => string; opts: string[] }; pageSize?: number; name: string; empty?: string; toolbar?: ReactNode; dense?: boolean
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 } | null>(null)
  const [f, setF] = useState('All')
  const [page, setPage] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [hid, setHid] = useState<string[]>(cols.filter((c) => c.off).map((c) => c.key))
  const [colMenu, setColMenu] = useState(false)
  const vis = cols.filter((c) => !hid.includes(c.key))
  const val = (c: Col<T>, r: T) => (c.get ? c.get(r) : ((r as Record<string, unknown>)[c.key] as string | number)) ?? ''
  const data = useMemo(() => {
    let d = rows
    if (f !== 'All' && filter) d = d.filter((r) => filter.get(r) === f)
    if (q) { const n = q.toLowerCase(); d = d.filter((r) => cols.some((c) => String(val(c, r)).toLowerCase().includes(n))) }
    if (sort) { const c = cols.find((x) => x.key === sort.k)!; d = [...d].sort((a, b) => { const x = val(c, a), y = val(c, b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.d }) }
    return d
  }, [rows, q, sort, f]) // eslint-disable-line
  const pages = Math.max(1, Math.ceil(data.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const slice = data.slice(cur * pageSize, cur * pageSize + pageSize)
  const allSel = slice.length > 0 && slice.every((r) => sel.includes(r.id))
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="flex flex-col min-h-0" ref={ref}>
      <div className="flex items-center gap-2 px-5 pb-2 flex-wrap">
        <div className="relative">
          <Icon n="search" size={14} className="absolute left-2 top-2 muted" />
          <input aria-label={`Search ${name}`} className="inp pl-7 w-56" placeholder={`Search ${name}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
        </div>
        {filter && (
          <div role="group" aria-label={filter.label} className="flex gap-1">
            {['All', ...filter.opts].map((o) => <button key={o} aria-pressed={f === o} onClick={() => { setF(o); setPage(0) }} className={`chip h-7 px-2.5 ${f === o ? 'bg-neel text-onneel border-neel' : 'bg-sheet'}`}>{o}</button>)}
          </div>
        )}
        <div className="flex-1" />
        {sel.length > 0 && bulk?.map((b) => <Btn key={b.label} icon={b.icon} onClick={() => { b.run(sel); setSel([]) }}>{b.label} ({sel.length})</Btn>)}
        {toolbar}
        <div className="relative">
          <Btn icon="layers" onClick={() => setColMenu(!colMenu)} aria-expanded={colMenu}>Columns</Btn>
          {colMenu && (
            <div className="absolute right-0 top-8 z-20 panel shadow-xl p-2 w-48">
              {cols.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-[13px] py-1 px-1">
                  <input type="checkbox" checked={!hid.includes(c.key)} onChange={() => setHid(hid.includes(c.key) ? hid.filter((x) => x !== c.key) : [...hid, c.key])} />{c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="scroll flex-1 min-h-0 mx-5 border border-rule rounded-lg bg-sheet">
        <table className={`tbl ${dense ? '' : ''}`}>
          <thead>
            <tr>
              {bulk && <th className="w-8"><input aria-label="Select all on page" type="checkbox" checked={allSel} onChange={() => setSel(allSel ? sel.filter((s) => !slice.some((r) => r.id === s)) : [...new Set([...sel, ...slice.map((r) => r.id)])])} /></th>}
              {vis.map((c) => (
                <th key={c.key} className={c.num ? 'text-right' : ''} aria-sort={sort?.k === c.key ? (sort.d === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button className="inline-flex items-center gap-1 font-medium" onClick={() => setSort(sort?.k === c.key ? (sort.d === 1 ? { k: c.key, d: -1 } : null) : { k: c.key, d: 1 })}>
                    {c.label}{sort?.k === c.key && <Icon n={sort.d === 1 ? 'arrowup' : 'arrowdown'} size={11} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} aria-selected={sel.includes(r.id)} className={onOpen ? 'cursor-pointer' : ''} onClick={() => onOpen?.(r)} tabIndex={onOpen ? 0 : undefined} onKeyDown={(e) => e.key === 'Enter' && onOpen?.(r)}>
                {bulk && <td onClick={(e) => e.stopPropagation()}><input aria-label="Select row" type="checkbox" checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((s) => s !== r.id) : [...sel, r.id])} /></td>}
                {vis.map((c) => <td key={c.key} className={c.num ? 'num' : ''}>{c.render ? c.render(r) : String(val(c, r))}</td>)}
              </tr>
            ))}
          </tbody>
          {data.length > 0 && vis.some((c) => c.total) && (
            <tfoot>
              <tr className="sticky bottom-0 bg-sheet font-medium">
                {bulk && <td className="border-t border-rule" />}
                {vis.map((c, i) => <td key={c.key} className={`border-t border-rule ${c.num ? 'num' : ''}`}>{c.total ? inr0(data.reduce((a, r) => a + Number(val(c, r)), 0)) : i === 0 ? `Total (${data.length})` : ''}</td>)}
              </tr>
            </tfoot>
          )}
        </table>
        {data.length === 0 && <Empty text={empty ?? 'Nothing matches these filters.'} action={q || f !== 'All' ? 'Clear filters' : undefined} onAction={() => { setQ(''); setF('All') }} />}
      </div>
      <div className="flex items-center justify-between px-5 py-2 text-xs muted">
        <span>{data.length} of {rows.length} shown{sel.length ? `, ${sel.length} selected` : ''}</span>
        <div className="flex items-center gap-1">
          <Btn className="btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Btn>
          <span className="px-2">Page {cur + 1} of {pages}</span>
          <Btn className="btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Btn>
        </div>
      </div>
    </div>
  )
}

export function Restricted({ what }: { what: string }) {
  return (
    <div className="m-5 panel p-6 max-w-lg">
      <div className="flex items-center gap-2 font-semibold"><Icon n="lock" /> Not available for this role</div>
      <p className="text-[13px] muted mt-2">{what}</p>
    </div>
  )
}
export { toast }
