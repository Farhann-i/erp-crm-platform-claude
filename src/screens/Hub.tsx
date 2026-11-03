import { useState } from 'react'
import { useApp, go } from '../lib/app'
import { useCanSee } from '../lib/rights'
import { Seg, PageHead, Empty } from '../ui/kit'
import { Icon } from '../ui/icons'
import { SPECS } from './Generic'
import { SETTINGS } from './Settings'
import { inr0 } from '../lib/fmt'

export function Hub() {
  const c = useApp((s) => s.draft)
  const mode = useApp((s) => s.mode)
  const rows = useApp((s) => s.rows)
  const inv = useApp((s) => s.invoices)
  const parties = useApp((s) => s.parties)
  const items = useApp((s) => s.items)
  const approvals = useApp((s) => s.approvals)
  const see = useCanSee()
  const groups = c.menu.map((g) => ({ ...g, items: g.items.filter((i) => i.visible && see(i.route) && i.modes.includes(mode) && c.modules.find((m) => m.id === i.module)?.on) })).filter((g) => g.items.length)
  const [gid, setGid] = useState(groups.find((g) => g.id === 'sales')?.id ?? groups[0]?.id)
  const g = groups.find((x) => x.id === gid) ?? groups[0]
  const count = (route: string): string => {
    if (route === 'invoices') return `${inv.length} bills`
    if (route === 'approvals') return `${approvals.filter((a) => a.status === 'pending').length} waiting`
    if (route === 'items' || route === 'stock') return `${items.length} items`
    if (route === 'parties') return `${parties.length} parties`
    if (SPECS[route]) return `${(rows[route] ?? SPECS[route].seed).length} records`
    if (SETTINGS[route]) return rows['cfg:' + route] ? 'Customised' : 'Standard'
    return ''
  }
  const open = approvals.filter((a) => a.status === 'pending').length
  const total = inv.reduce((a, i) => a + i.total, 0)
  return (
    <div className="flex-1 min-h-0 scroll">
      <PageHead title="Desks" crumbs={['Home', 'Desks']} sub="Each desk groups the screens for one kind of work, with a live count so you can see what needs attention." />
      <div className="px-5 pb-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="panel p-3"><div className="text-xs muted">Bills saved</div><div className="text-xl font-semibold num">{inv.length}</div><div className="text-xs muted num">{inr0(total)} billed</div></div>
          <button className="panel p-3 text-left" onClick={() => go('approvals')}><div className="text-xs muted">Waiting for approval</div><div className="text-xl font-semibold num">{open}</div><div className="text-xs muted">Open the approvals inbox</div></button>
          <div className="panel p-3"><div className="text-xs muted">Parties on file</div><div className="text-xl font-semibold num">{parties.length}</div><div className="text-xs muted">{parties.filter((p) => p.consent).length} can be messaged</div></div>
        </div>
        <Seg label="Desk" value={g?.id ?? ''} onChange={setGid} opts={groups.map((x) => ({ id: x.id, label: x.label }))} />
        {!g ? <Empty text="Your role has no screens here." /> : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{g.items.map((i) => (
            <li key={i.id}><button onClick={() => go(i.route)} className="panel p-3 w-full text-left flex items-center gap-3 hover:bg-wash"><Icon n={i.icon} className="muted" /><span className="flex-1 text-[13px] font-medium">{i.label.replace(/\{|\}/g, '')}</span><span className="text-xs muted num">{count(i.route)}</span></button></li>))}</ul>
        )}
      </div>
    </div>
  )
}
