import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApp, labelOf, set, go, closeTab, setMode, syncFromHash, themeVars, pendingChanges, toast, MODE_HOME } from '../lib/app'
import { PRESETS, type Mode, type MenuItem } from '../lib/config'
import { tr } from '../lib/i18n'
import { term } from '../lib/app'
import { Icon } from '../ui/icons'
import { Seg, Toasts, Btn, Status } from '../ui/kit'
import { PrintDialog } from '../ui/BillPrint'
import { useCanSee } from '../lib/rights'
import { ctx, auth, USERS, lock, signOut } from './ctx'
import { SignIn, LockScreen } from './Lock'
import { Margin } from './Margin'
import { Palette } from './Palette'
import { Pulse, Notifications } from './Pulse'
import { Screen } from '../screens'
import { Studio } from '../studio/Studio'
import { StudioGate } from '../screens/Phase5b'
import { Phone } from '../screens/Mobile'

export function useMenu() {
  const c = useApp((s) => s.draft)
  const mode = useApp((s) => s.mode)
  const see = useCanSee()
  return useMemo(() => c.menu.map((g) => ({ ...g, items: g.items.filter((i) => i.visible && see(i.route) && i.modes.includes(mode) && c.modules.find((m) => m.id === i.module)?.on) })).filter((g) => g.items.length), [c, mode, see])
}

const SHORTS: Record<Mode, [string, string][]> = {
  counter: [['F2', 'Save bill'], ['F4', 'Hold'], ['F6', 'Tender'], ['F8', 'Return'], ['Ctrl+K', 'Search']],
  books: [['Ctrl+S', 'Post'], ['F4', 'Hold'], ['Alt+C', 'New party'], ['Ctrl+K', 'Command palette'], ['Esc', 'Close panel']],
  owner: [['Ctrl+K', 'Ask or search'], ['G then A', 'Approvals'], ['Esc', 'Close panel']],
  studio: [['Ctrl+K', 'Jump to setting'], ['Ctrl+P', 'Publish']],
}

export default function Shell() {
  const s = useApp((x) => x)
  const c = s.draft
  const v = themeVars(c, s.night)
  const branch = c.branches.find((b) => b.id === s.branchId) ?? c.branches[0]
  const menu = useMenu()
  const narrow = useNarrow()
  const uid = auth.use((x) => x.user)
  const locked = auth.use((x) => x.locked)
  const user = USERS.find((u) => u.id === uid)
  const pending = pendingChanges()

  useEffect(() => {
    const el = document.documentElement
    el.className = `${s.night ? 'night' : ''} dens-${s.mode === 'counter' ? 'comfort' : c.theme.density}`
    el.lang = c.lang === 'en' ? 'en-IN' : c.lang
    const st = el.style
    st.setProperty('--neel', v.accent); st.setProperty('--on-neel', v.on); st.setProperty('--cotton', v.cotton); st.setProperty('--sheet', v.sheet); st.setProperty('--ink', v.ink); st.setProperty('--rule', v.rule); st.setProperty('--radius', c.theme.radius + 'px')
    document.title = `${branch.display}, ${term(c, tr(c.lang, 'Home'))}`
  }, [s.night, c, v.accent, s.mode, branch])
  useEffect(() => { if (user && !user.modes.includes(s.mode)) setMode(user.start) }, [user?.id])
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('mode')) set({ mode: q.get('mode') as Mode })
    if (q.get('night')) set({ night: q.get('night') === '1' })
    if (q.get('lang')) { const l = q.get('lang') as 'en'; set((st) => ({ draft: { ...st.draft, lang: l }, published: { ...st.published, lang: l } })) }
    syncFromHash()
    const h = () => syncFromHash()
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ctx.set((x) => ({ palette: !x.palette })) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && auth.get().user) { e.preventDefault(); lock() }
      if (e.key === 'Escape') ctx.set({ palette: false, pulse: false, notif: false })
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const [collapsed, setCollapsed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('erp-nav-shut') ?? 'null') ?? menu.map((g) => g.id).filter((id) => !['home', 'counter', 'sales', 'stock', 'books'].includes(id)) } catch { return [] } })
  const toggleGroup = (id: string) => setCollapsed((cur) => { const n = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; try { localStorage.setItem('erp-nav-shut', JSON.stringify(n)) } catch { /* ignore */ } return n })

  if (!user) return <SignIn />
  if (narrow) return <><Phone full /><Toasts /><PrintDialog /></>
  const studio = s.mode === 'studio'
  const counter = s.mode === 'counter'
  const label = (i: MenuItem) => labelOf(c, i)
  const known = menu.flatMap((g) => g.items).find((i) => i.route === s.route)
  return (
    <div className="h-full flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:bg-sheet focus:p-2">Skip to content</a>
      <header className="h-11 shrink-0 bg-neel text-onneel flex items-center gap-3 px-3" style={{ background: 'var(--neel)', color: 'var(--on-neel)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded grid place-items-center text-xs font-semibold shrink-0" style={{ background: 'color-mix(in srgb, var(--on-neel) 18%, transparent)' }} aria-hidden>{branch.display.slice(0, 1)}</div>
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold truncate">{branch.display}</div>
            <div className="text-[10.5px] opacity-80 truncate hidden md:block">{branch.tagline}</div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-1 text-xs opacity-90 ml-2">
          <Icon n="right" size={12} />
          <select aria-label="Branch" className="bg-transparent border-0 text-xs font-medium focus:outline-white" value={s.branchId} onChange={(e) => { set({ branchId: e.target.value }); toast(`Switched to ${c.branches.find((b) => b.id === e.target.value)?.name}. Open drafts are kept.`, 'info') }}>
            {c.branches.map((b) => <option key={b.id} value={b.id} className="text-black">{b.name}</option>)}
          </select>
          <Icon n="right" size={12} />
          <select aria-label="Financial year" className="bg-transparent border-0 text-xs font-medium" value={s.fy} onChange={(e) => set({ fy: e.target.value })}>
            {['2026-27', '2025-26', '2024-25'].map((y) => <option key={y} className="text-black" value={y}>FY {y.slice(2)}{y !== '2026-27' ? ' (locked)' : ''}</option>)}
          </select>
        </div>
        <button onClick={() => ctx.set({ palette: true })} className="flex-1 max-w-md mx-auto h-7 rounded flex items-center gap-2 px-2.5 text-xs text-left" style={{ background: 'color-mix(in srgb, var(--on-neel) 14%, transparent)' }} aria-label="Open command palette">
          <Icon n="search" size={13} /><span className="flex-1 truncate opacity-90">{tr(c.lang, 'Search or ask')}</span><span className="kbd" style={{ background: 'transparent', color: 'inherit', borderColor: 'color-mix(in srgb, var(--on-neel) 40%, transparent)' }}>Ctrl+K</span>
        </button>
        <Pulse />
        <Notifications />
        <button className="p-1.5 rounded hover:bg-white/10" aria-label={s.night ? 'Switch to Day theme' : 'Switch to Night theme'} onClick={() => set({ night: !s.night })}><Icon n={s.night ? 'sun' : 'moon'} /></button>
        <button className="p-1.5 rounded hover:bg-white/10" aria-label={`Lock screen, signed in as ${user.name}`} title="Lock (Ctrl+L)" onClick={lock}><Icon n="lock" /></button>
        <ModeSwitch allowed={user.modes} />
        <button className="text-xs underline opacity-90 whitespace-nowrap" onClick={signOut}>Sign out</button>
      </header>

      {pending.length > 0 && (
        <div className="shrink-0 px-3 h-8 flex items-center gap-3 text-[12.5px] border-b border-haldi bg-haldi/15">
          <span className="size-2 rounded-full bg-haldi" />
          <span>Previewing {pending.length} unpublished {pending.length === 1 ? 'change' : 'changes'}: {pending.join(', ')}. Only you see this.</span>
          <button className="font-medium text-neel underline" onClick={() => { setMode('studio'); go('studio/changes') }}>Review and publish</button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {!counter && !studio && (
          <nav aria-label="Main" className="w-[212px] shrink-0 border-r border-rule bg-sheet scroll py-2">
            {menu.map((g) => {
              const hasCur = g.items.some((i) => i.route === s.route)
              const shut = collapsed.includes(g.id) && !hasCur
              return (
              <div key={g.id} className="mb-1">
                <button aria-expanded={!shut} onClick={() => toggleGroup(g.id)} className="w-full flex items-center justify-between px-4 pt-1.5 pb-1 text-[11.5px] font-medium muted hover:text-ink"><span>{term(c, tr(c.lang, g.label))}</span><span className="flex items-center gap-1 num">{shut && <span>{g.items.length}</span>}<Icon n={shut ? 'right' : 'down'} size={12} /></span></button>
                {!shut && g.items.map((i) => {
                  const on = s.route === i.route
                  return (
                    <button key={i.id} onClick={() => go(i.route)} aria-current={on ? 'page' : undefined} className={`w-full flex items-center gap-2.5 h-8 px-4 text-[13px] text-left relative ${on ? 'bg-neel/10 font-medium text-neel' : 'hover:bg-wash'}`}>
                      {on && <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-neel rounded-r" />}
                      <Icon n={i.icon} size={15} /><span className="truncate">{label(i)}</span>
                    </button>
                  )
                })}
              </div>
              )
            })}
            <div className="px-4 pt-3 text-[11px] muted border-t border-rule mx-0 mt-3">Menu from {c.pack} pack, config v{s.version}</div>
          </nav>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          {counter && <CounterBar menu={menu.flatMap((g) => g.items)} />}
          {!counter && !studio && s.tabs.length > 0 && (
            <div role="tablist" aria-label="Open documents" className="h-8 shrink-0 flex items-end gap-px px-2 border-b border-rule bg-cotton scroll">
              {s.tabs.map((t) => {
                const mi = s.draft.menu.flatMap((g) => g.items).find((i) => i.route === t)
                const on = t === s.route
                return (
                  <div key={t} className={`flex items-center h-7 pl-3 pr-1 text-[12.5px] border border-b-0 rounded-t whitespace-nowrap ${on ? 'bg-sheet border-rule font-medium' : 'border-transparent muted hover:bg-wash'}`}>
                    <button role="tab" aria-selected={on} onClick={() => go(t)}>{mi ? label(mi) : t}</button>
                    {s.tabs.length > 1 && <button aria-label={`Close ${t}`} className="p-1 ml-1 rounded hover:bg-wash" onClick={() => closeTab(t)}><Icon n="x" size={11} /></button>}
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex-1 min-h-0 flex">
            <main id="main" className="flex-1 min-w-0 flex flex-col min-h-0 bg-cotton">
              {studio ? <StudioGate><Studio /></StudioGate> : <Screen route={known || s.route.startsWith('studio') ? s.route : s.route} />}
            </main>
            {!studio && s.margin && !['owner', 'phone', 'ask'].includes(s.route) && <Margin />}
          </div>
        </div>
      </div>
      <KeyBar mode={s.mode} />
      <Palette />
      <Toasts />
      <PrintDialog />
      {locked && <LockScreen />}
    </div>
  )
}

function useNarrow() {
  const [n, setN] = useState(window.innerWidth < 760)
  useEffect(() => {
    const h = () => setN(window.innerWidth < 760)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return n
}

function ModeSwitch({ allowed }: { allowed: Mode[] }) {
  const mode = useApp((s) => s.mode)
  const opts: [Mode, string][] = [['counter', 'Counter'], ['books', 'Books'], ['owner', 'Owner'], ['studio', 'Studio']]
  return (
    <div role="radiogroup" aria-label="Work mode" className="inline-flex rounded p-0.5" style={{ background: 'color-mix(in srgb, var(--on-neel) 14%, transparent)' }}>
      {opts.filter(([id]) => allowed.includes(id)).map(([id, l]) => (
        <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className="h-6 px-2.5 text-xs font-medium rounded-[3px]" style={mode === id ? { background: 'var(--on-neel)', color: 'var(--neel)' } : { color: 'var(--on-neel)' }}>{l}</button>
      ))}
    </div>
  )
}

function CounterBar({ menu }: { menu: MenuItem[] }) {
  const route = useApp((s) => s.route)
  const c = useApp((s) => s.draft)
  const held = useApp((s) => s.held.length)
  return (
    <div className="h-10 shrink-0 bg-sheet border-b border-rule flex items-center gap-1 px-3">
      {menu.map((i) => (
        <button key={i.id} onClick={() => go(i.route)} className={`h-8 px-3 rounded flex items-center gap-2 text-[13px] ${route === i.route ? 'bg-neel text-onneel' : 'hover:bg-wash'}`}>
          <Icon n={i.icon} size={15} />{labelOf(c, i)}{i.route === 'held' && held > 0 && <span className="chip">{held}</span>}
        </button>
      ))}
      <span className="flex-1" />
      <span className="text-xs muted">Cost, profit and balances are not shown in Counter mode.</span>
    </div>
  )
}

function KeyBar({ mode }: { mode: Mode }) {
  const offline = useApp((s) => s.offline)
  return (
    <footer className="h-7 shrink-0 border-t border-rule bg-sheet flex items-center gap-4 px-3 text-xs muted overflow-hidden">
      {SHORTS[mode].map(([k, l]) => <span key={k} className="whitespace-nowrap"><span className="kbd">{k}</span> {l}</span>)}
      <span className="flex-1" />
      <span className="whitespace-nowrap">{offline ? 'Working locally. Changes wait to sync.' : 'Local database safe. In sync.'}</span>
    </footer>
  )
}
export { MODE_HOME, PRESETS, Btn, Status }
export type { ReactNode }
