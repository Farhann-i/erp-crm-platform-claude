import { useApp } from '../lib/app'
import { Restricted } from '../ui/kit'
import { Billing, HeldScreen } from './Billing'
import { DaySheet } from './DaySheet'
import { VoucherEntry } from './Voucher'
import { ItemMaster, StockOnHand, Parties } from './Masters'
import { ReportViewer } from './Reports'
import { Generic, SPECS } from './Generic'
import { Approvals, Sync, Ask, Pipeline, Printing, Users, Ledgers, Gstr } from './Special'
import { Phone } from './Mobile'

const REPORT_ROUTES: Record<string, string> = { reports: 'sales', invoices: 'sales', daybook: 'daybook', trial: 'trial', pnl: 'pnl', outstanding: 'ageing', payables: 'payables' }

export function Screen({ route }: { route: string }) {
  const c = useApp((s) => s.draft)
  const mode = useApp((s) => s.mode)
  const item = c.menu.flatMap((g) => g.items).find((i) => i.route === route)
  if (item) {
    const mod = c.modules.find((m) => m.id === item.module)
    if (!item.visible || !mod?.on) return <Restricted what={`${item.label.replace(/\{|\}/g, '')} is switched off in this tenant's setup. A super admin can enable it under Modules and features, within plan limits.`} />
    if (!item.modes.includes(mode)) return <Restricted what={`This screen is not part of the ${mode} role. Cost, profit and unauthorised financial information stay out of reach.`} />
  }
  if (REPORT_ROUTES[route]) return <ReportViewer key={route} initial={REPORT_ROUTES[route]} />
  switch (route) {
    case 'owner': return <DaySheet />
    case 'approvals': return <Approvals />
    case 'phone': return <Phone />
    case 'billing': return <Billing />
    case 'held': return <HeldScreen />
    case 'pipeline': return <Pipeline />
    case 'items': return <ItemMaster />
    case 'stock': return <StockOnHand />
    case 'vouchers': return <VoucherEntry />
    case 'ledgers': return <Ledgers />
    case 'gstr': return <Gstr />
    case 'parties': return <Parties />
    case 'sync': return <Sync />
    case 'ask': return <Ask />
    case 'printing': return <Printing />
    case 'users': return <Users />
  }
  if (SPECS[route]) return <Generic key={route} route={route} />
  return <Restricted what={`There is no screen at "${route}". Use the menu or press Ctrl+K.`} />
}
