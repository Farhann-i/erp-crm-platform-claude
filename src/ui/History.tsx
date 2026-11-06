import { useEffect, useRef, useState } from 'react'
import { useApp, set } from '../lib/app'
import { auth, USERS } from '../shell/ctx'

type Row = Record<string, string | number>
const EMPTY: Row[] = []
const nowTxt = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const who = () => USERS.find((u) => u.id === auth.get().user)?.name ?? 'System'

/** Record one change to an item, party or invoice. chg is a list of [field, before, after]. */
export function logHist(kind: 'items' | 'parties' | 'invoices', ref: string, what: string, chg: string[][] = []) {
  set((s) => ({ rows: { ...s.rows, ['hist:' + kind]: [...(s.rows['hist:' + kind] ?? []), { id: ref + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 6), ref, at: nowTxt(), by: who(), what, chg: JSON.stringify(chg) }] } }))
}
export const diff = (a: Record<string, string | number | undefined>, b: Record<string, string | number | undefined>, label: Record<string, string> = {}) =>
  Object.keys(b).filter((k) => String(a[k] ?? '') !== String(b[k] ?? '')).map((k) => [label[k] ?? k, String(a[k] ?? ''), String(b[k] ?? '')])

export function HistoryList({ kind, id, first }: { kind: 'items' | 'parties' | 'invoices'; id: string; first?: { at: string; by: string; what: string } }) {
  const all = useApp((s) => s.rows['hist:' + kind]) ?? EMPTY
  const list = [...all.filter((r) => r.ref === id)].reverse()
  return (
    <ol className="space-y-3 text-[13px] max-w-xl" aria-label="Change history">
      {list.map((h) => { const chg = JSON.parse(String(h.chg || '[]')) as string[][]; return (
        <li key={String(h.id)} className="border-l-2 border-rule pl-3"><div><b>{h.what}</b> <span className="muted text-xs">· {h.by} · {h.at}</span></div>
          {chg.map((c, i) => <div key={i} className="text-xs ml-1">{c[0]}: <s className="muted">{c[1] || 'empty'}</s> → <b>{c[2] || 'empty'}</b></div>)}</li>) })}
      {first && <li className="border-l-2 border-rule pl-3"><b>{first.what}</b> <span className="muted text-xs">· {first.by} · {first.at}</span></li>}
      {!list.length && !first && <li className="muted">No changes recorded yet.</li>}
    </ol>
  )
}

/** Keeps an unsaved form in the store, so a closed drawer or a refresh does not lose it. */
export function useDraft<T extends Record<string, string>>(key: string, value: T, apply: (v: T) => void, base: T) {
  const k = 'draft:' + key; const saved = useApp((s) => s.rows[k]?.[0]); const [at, setAt] = useState(''); const [restored, setRestored] = useState(false)
  const first = useRef(true)
  useEffect(() => { if (saved && first.current) { try { apply(JSON.parse(String(saved.json)) as T); setRestored(true); setAt(String(saved.at)) } catch { /* ignore bad draft */ } } first.current = false }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (first.current) return
    const t = setTimeout(() => {
      if (JSON.stringify(value) === JSON.stringify(base) || Object.values(value).every((x) => !x)) return
      const when = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      set((s) => ({ rows: { ...s.rows, [k]: [{ id: 'd', json: JSON.stringify(value), at: when }] } })); setAt(when)
    }, 500)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const clear = () => { set((s) => ({ rows: { ...s.rows, [k]: [] } })); setAt(''); setRestored(false) }
  return { at, restored, clear }
}
export function DraftNote({ at, restored, onDiscard }: { at: string; restored: boolean; onDiscard: () => void }) {
  if (!at && !restored) return null
  return <div role="status" className="text-xs muted flex items-center gap-2">{restored ? 'Your unsaved draft was restored.' : 'Draft saved'} {at && <span>at {at}.</span>}<button type="button" className="underline" onClick={onDiscard}>Discard draft</button></div>
}
