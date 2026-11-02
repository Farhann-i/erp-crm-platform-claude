import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, go, set, setMode, term } from '../lib/app'
import { tr } from '../lib/i18n'
import { Icon } from '../ui/icons'
import { ctx } from './ctx'
import type { Mode } from '../lib/config'

interface Res { id: string; label: string; hint: string; icon: string; run: () => void }
export function Palette() {
  const open = ctx.use((s) => s.palette)
  const s = useApp((x) => x)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const c = s.draft
  const close = () => ctx.set({ palette: false })
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => ref.current?.focus(), 0) } }, [open])
  const res = useMemo(() => {
    const out: Res[] = []
    const modeOf = (m: Mode) => s.mode === m
    c.menu.forEach((g) => g.items.forEach((it) => {
      if (!it.visible || !c.modules.find((m) => m.id === it.module)?.on) return
      if (!it.modes.includes(s.mode)) return
      out.push({ id: 'm' + it.id, label: term(c, tr(c.lang, it.label)), hint: term(c, g.label), icon: it.icon, run: () => go(it.route) })
    }))
    ;(['counter', 'books', 'owner', 'studio'] as Mode[]).forEach((m) => !modeOf(m) && out.push({ id: 'mode' + m, label: `Switch to ${m} mode`, hint: 'Action', icon: 'swap', run: () => setMode(m) }))
    out.push({ id: 'night', label: s.night ? 'Switch to Day theme' : 'Switch to Night theme', hint: 'Action', icon: 'moon', run: () => set({ night: !s.night }) })
    out.push({ id: 'studio', label: 'Open Admin Studio', hint: 'Action', icon: 'settings', run: () => setMode('studio') })
    ;[['studio/theme', 'Studio: Theme'], ['studio/menu', 'Studio: Menu builder'], ['studio/modules', 'Studio: Modules and features'], ['studio/workflows', 'Studio: Workflow and pipeline designer'], ['studio/forms', 'Studio: Form and field designer'], ['studio/layouts', 'Studio: Layouts'], ['studio/identity', 'Studio: Shop identity']].forEach(([r, l]) => out.push({ id: r, label: l, hint: 'Studio', icon: 'settings', run: () => { set({ mode: 'studio' }); go(r) } }))
    s.parties.slice(0, 20).forEach((p) => out.push({ id: p.id, label: p.name, hint: p.kind === 'customer' ? term(c, '{customer}') : term(c, '{supplier}'), icon: 'users', run: () => { ctx.set({ kind: 'party', id: p.id }); go('parties') } }))
    s.items.forEach((p) => out.push({ id: p.id, label: p.name, hint: p.code, icon: 'tag', run: () => { ctx.set({ kind: 'item', id: p.id }); go(s.mode === 'books' ? 'items' : 'stock') } }))
    s.invoices.slice(0, 12).forEach((p) => out.push({ id: p.id, label: p.no + ' ' + p.partyName, hint: 'Document', icon: 'file', run: () => go('invoices') }))
    return out
  }, [s.mode, s.draft, s.night, s.parties, s.items, s.invoices])
  const n = q.trim().toLowerCase()
  const shown = (n ? res.filter((r) => (r.label + ' ' + r.hint).toLowerCase().includes(n)) : res.slice(0, 9)).slice(0, 9)
  const list: Res[] = n && c.modules.find((m) => m.id === 'ai')?.on && s.aiOn ? [...shown, { id: 'ask', label: `Ask: "${q}"`, hint: 'Runs on this PC', icon: 'spark', run: () => { ctx.set({ docId: q }); go('ask') } }] : shown
  if (!open) return null
  const pick = (r?: Res) => { if (r) { close(); r.run() } }
  return (
    <div className="fixed inset-0 z-[55] bg-ink/40 grid place-items-start justify-center pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-[560px] max-w-[95vw] panel shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-rule h-11">
          <Icon n="search" className="muted" />
          <input ref={ref} role="combobox" aria-expanded aria-controls="pal-list" aria-activedescendant={'pal' + i} className="flex-1 bg-transparent outline-none text-[14px]" placeholder="Go to a screen, find a record, run an action, or ask" value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((i + 1) % Math.max(1, list.length)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((i - 1 + list.length) % Math.max(1, list.length)) }
            if (e.key === 'Enter') pick(list[i])
          }} />
          <span className="kbd">Esc</span>
        </div>
        <ul id="pal-list" role="listbox" className="max-h-[360px] scroll py-1">
          {list.map((r, k) => (
            <li key={r.id} id={'pal' + k} role="option" aria-selected={k === i} onMouseEnter={() => setI(k)} onClick={() => pick(r)} className={`px-3 h-9 flex items-center gap-3 cursor-pointer ${k === i ? 'bg-neel text-onneel' : ''}`}>
              <Icon n={r.icon} /><span className="flex-1 truncate">{r.label}</span><span className="text-xs opacity-75">{r.hint}</span>
            </li>
          ))}
          {list.length === 0 && <li className="p-4 text-[13px] muted">Nothing found for "{q}". Your role may not include that screen.</li>}
        </ul>
      </div>
    </div>
  )
}
