import { useApp, set, toast } from '../lib/app'
import { Icon } from '../ui/icons'
import { Btn, Toggle } from '../ui/kit'
import { ctx } from './ctx'

export function Pulse() {
  const s = useApp((x) => x)
  const open = ctx.use((x) => x.pulse)
  const openConf = s.conflicts.filter((c) => c.status === 'open').length
  const label = openConf ? 'Needs attention' : s.offline ? (s.pending ? `Waiting to sync (${s.pending})` : 'Working locally') : 'In sync'
  return (
    <div className="relative">
      <button onClick={() => ctx.set({ pulse: !open, notif: false })} aria-expanded={open} aria-label={`The Pulse: ${label}`} className="h-7 px-2 rounded flex items-center gap-2 text-xs hover:bg-white/10">
        <span className={`size-2 rounded-full ${openConf ? 'bg-haldi' : s.offline ? 'bg-white/60' : 'bg-mehndi'}`} style={{ background: openConf ? 'var(--haldi)' : s.offline ? 'color-mix(in srgb, var(--on-neel) 60%, transparent)' : '#62b58d' }} />
        <span className="hidden xl:inline whitespace-nowrap">{label}</span>
        <Icon n="db" size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-80 panel shadow-2xl z-50 text-ink text-[13px]" style={{ color: 'var(--ink)' }}>
          <div className="px-3 py-2 border-b border-rule font-semibold">The Pulse</div>
          <ul className="p-3 space-y-2">
            {[['Local database', 'Healthy. Integrity check passed 02:10', 'ok'], ['Sync', s.offline ? `Offline by choice. ${s.pending} waiting` : 'Last synced 1 min ago with Kozhikode and Thrissur', 'ok'], ['Backup', 'Last backup 8 hours ago, 412 MB, D:\\Backups', 'ok'], ['Printer', 'TVS RP3160 thermal, ready', 'ok'], ['Scanner', 'Zebra DS2208 connected', 'ok'], ['Licence', 'Business plan, renews in 214 days', 'ok']].map(([k, v]) => (
              <li key={k} className="flex gap-2"><span className="size-1.5 rounded-full bg-mehndi mt-1.5 shrink-0" /><div><div className="font-medium">{k}</div><div className="muted text-xs">{v}</div></div></li>
            ))}
            {openConf > 0 && <li className="flex gap-2"><span className="size-1.5 rounded-full bg-haldi mt-1.5 shrink-0" /><div><div className="font-medium">{openConf} sync conflicts</div><div className="muted text-xs">Two branches edited the same record. Billing is not affected.</div></div></li>}
          </ul>
          <div className="px-3 py-2 border-t border-rule flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs"><Toggle on={s.offline} label="Simulate offline" onChange={(v) => { set({ offline: v, pending: v ? s.pending : 0 }); toast(v ? 'Offline simulated. Billing keeps working and changes queue.' : 'Back online. Queue synced.', 'info') }} />Simulate offline</span>
            <Btn className="btn-sm" onClick={() => { set({ pending: 0 }); toast('Sync cycle finished (simulated).', 'info') }}>Sync now</Btn>
          </div>
          <p className="px-3 pb-2 text-[11px] muted">Demo states only. No cloud, printer or scanner is contacted.</p>
        </div>
      )}
    </div>
  )
}
export function Notifications() {
  const n = useApp((x) => x.notices)
  const open = ctx.use((x) => x.notif)
  const unread = n.filter((x) => !x.read).length
  return (
    <div className="relative">
      <button className="p-1.5 rounded hover:bg-white/10 relative" aria-label={`Notifications, ${unread} unread`} onClick={() => ctx.set({ notif: !open, pulse: false })}>
        <Icon n="bell" />{unread > 0 && <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-haldi" style={{ background: 'var(--haldi)' }} />}
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-80 panel shadow-2xl z-50 text-[13px]" style={{ color: 'var(--ink)' }}>
          <div className="px-3 py-2 border-b border-rule flex justify-between items-center"><span className="font-semibold">Notifications</span><button className="text-neel text-xs font-medium" onClick={() => set({ notices: n.map((x) => ({ ...x, read: true })) })}>Mark all read</button></div>
          {n.map((x) => <div key={x.id} className={`px-3 py-2 border-b border-rule last:border-0 ${x.read ? 'muted' : ''}`}><div>{x.text}</div><div className="text-[11px] muted">{x.at}</div></div>)}
        </div>
      )}
    </div>
  )
}
