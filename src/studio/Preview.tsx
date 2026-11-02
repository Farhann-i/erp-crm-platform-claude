import { useMemo, useState } from 'react'
import { useApp, themeVars, labelOf, term, set } from '../lib/app'
import type { Lang, Mode } from '../lib/config'
import { Seg, Bal } from '../ui/kit'
import { Icon } from '../ui/icons'

const MODES: Mode[] = ['counter', 'books', 'owner']
export function PreviewDock() {
  const c = useApp((s) => s.draft)
  const night = useApp((s) => s.night)
  const [mode, setMode] = useState<Mode>('books')
  const v = themeVars(c, night)
  const menu = useMemo(() => c.menu.map((g) => ({ ...g, items: g.items.filter((i) => i.visible && i.modes.includes(mode) && c.modules.find((m) => m.id === i.module)?.on) })).filter((g) => g.items.length), [c, mode])
  const style = { ['--neel' as string]: v.accent, ['--on-neel' as string]: v.on, ['--cotton' as string]: v.cotton, ['--sheet' as string]: v.sheet, ['--ink' as string]: v.ink, ['--rule' as string]: v.rule, ['--radius' as string]: c.theme.radius + 'px', background: v.cotton, color: v.ink } as React.CSSProperties
  const lang = c.lang
  return (
    <aside aria-label="Live preview" className="w-[330px] shrink-0 border-l border-rule bg-sheet flex flex-col min-h-0">
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-rule">
        <div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold">Live preview</h2><span className="chip border-haldi">Draft</span></div>
        <Seg<Mode> label="Preview as" value={mode} onChange={setMode} opts={MODES.map((m) => ({ id: m, label: m }))} />
        <div className="flex items-center gap-2 text-xs"><span className="muted">Language</span><Seg<Lang> label="Preview language" value={lang} onChange={(l) => set((s) => ({ draft: { ...s.draft, lang: l } }))} opts={[{ id: 'en', label: 'EN' }, { id: 'ml', label: 'മലയാളം' }, { id: 'hi', label: 'हिन्दी' }]} /></div>
      </div>
      <div className="flex-1 min-h-0 scroll p-3">
        <div inert className="rounded-lg overflow-hidden border border-rule text-[12px] select-none" style={style}>
          <div className="h-9 px-3 flex items-center gap-2" style={{ background: v.accent, color: v.on }}>
            <span className="size-5 rounded grid place-items-center text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, currentColor 20%, transparent)' }}>{c.company.display.slice(0, 1)}</span>
            <div className="leading-tight min-w-0"><div className="font-semibold truncate">{c.branches[0].display}</div><div className="text-[10px] opacity-80 truncate">{c.company.tagline}</div></div>
          </div>
          <div className="flex min-h-[250px]">
            {mode !== 'counter' && <div className="w-[118px] shrink-0 py-1.5 border-r" style={{ background: v.sheet, borderColor: v.rule }}>
              {menu.slice(0, 5).map((g) => <div key={g.id} className="mb-1"><div className="px-2 text-[9.5px] font-medium opacity-65">{labelOf(c, { label: g.label })}</div>{g.items.slice(0, 3).map((i) => <div key={i.id} className="px-2 h-5 flex items-center gap-1 truncate"><Icon n={i.icon} size={10} /><span className="truncate">{labelOf(c, i)}</span></div>)}</div>)}
            </div>}
            <div className="flex-1 p-2 space-y-2 min-w-0">
              {mode === 'counter' && <div className="flex gap-1 flex-wrap">{menu.flatMap((g) => g.items).slice(0, 3).map((i) => <span key={i.id} className="px-2 h-6 grid place-items-center rounded text-[11px]" style={i.route === c.homes.counter ? { background: v.accent, color: v.on } : { border: `1px solid ${v.rule}` }}>{labelOf(c, i)}</span>)}</div>}
              <div className="p-2 border space-y-1.5" style={{ background: v.sheet, borderColor: v.rule, borderRadius: c.theme.radius * 2 }}>
                <div className="font-medium">{term(c, '{customer}')}: Anitha Menon</div><div className="flex justify-end"><Bal v={12400} ctx="acct" party /></div>
                <div className="flex justify-between opacity-80"><span>{term(c, '{item}')}: {c.pack === 'gym' ? 'Monthly membership' : c.pack === 'pharmacy' ? 'Paracetamol 650 mg' : c.pack === 'cafeteria' ? 'Masala chai' : 'Linen shirt'}</span><span className="num">₹2,299.00</span></div>
                <div className="flex gap-1.5 pt-1"><span className="px-2 h-6 grid place-items-center font-medium whitespace-nowrap" style={{ background: v.accent, color: v.on, borderRadius: c.theme.radius }}>{term(c, 'Save {bill}')}</span><span className="px-2 h-6 grid place-items-center" style={{ border: `1px solid ${v.rule}`, borderRadius: c.theme.radius }}>Hold</span></div>
              </div>
              <div className="flex gap-1"><span className="chip" style={{ borderColor: 'var(--haldi)', background: v.sheet }}>Draft</span><span className="chip" style={{ background: v.sheet }}>Posted</span></div>
            </div>
          </div>
        </div>
        <p className="text-[11.5px] muted mt-2">Reads the draft config: theme, terms, language, menu and Dr/Cr scope. Nothing here is live until you publish.</p>
      </div>
    </aside>
  )
}
