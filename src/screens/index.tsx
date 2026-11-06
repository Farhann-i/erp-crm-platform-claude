import { useApp } from '../lib/app'
import { Restricted } from '../ui/kit'
import { RouteCtx, useCan } from '../lib/rights'
import { Billing, HeldScreen } from './Billing'
import { DaySheet } from './DaySheet'
import { VoucherEntry } from './Voucher'
import { ItemMaster, StockOnHand, Parties } from './Masters'
import { ReportViewer } from './Reports'
import { Generic, SPECS } from './Generic'
import { Approvals, Sync, Ask, Pipeline, Printing, Users, Ledgers, Gstr } from './Special'
import { Phone } from './Mobile'
import { Hub } from './Hub'
import { Prompts } from './Prompts'
import { PackTools, Help, FirstRun, CustomerDisplay, ShareLink, Briefing, Attachments } from './Tools'
import { VariantMatrix, SizeColour, VoiceBilling, CameraScan, Forecast } from './Phase5'
import { TwoFactor, RuleBuilder, WidgetDesigner, Leases, Consolidate, NumGaps } from './Phase5b'
import { AuditCheck, Forex } from './Phase6'
import { SETTINGS, SettingsPage } from './Settings'
import { Inbox, Campaigns } from './Messaging'
import { DayClose, Rights, Labels, ImportData, ReturnFromBill } from './Gaps'

const REPORT_ROUTES: Record<string, string> = { reports: 'sales', invoices: 'sales', daybook: 'daybook', trial: 'trial', pnl: 'pnl', outstanding: 'ageing', payables: 'payables', balance: 'balance', cashbook: 'cashbook', ledgerbook: 'ledgerbook', trading: 'trading', modified: 'modified', rotation: 'rotation', dimension: 'dimension', voucherreg: 'voucherreg', stockageing: 'stockageing', lowstock: 'lowstock', hsnsum: 'hsnsum', branchcmp: 'branchcmp', profit: 'profit', weekday: 'weekday', basket: 'basket', points: 'points', commrep: 'commrep', cashflow: 'cashflow', stockledger: 'stockledger' }

export function Screen({ route }: { route: string }) {
  return <RouteCtx.Provider value={route}><Gate route={route} /></RouteCtx.Provider>
}

function Gate({ route }: { route: string }) {
  const can = useCan(route)
  const known = useApp((s) => s.draft.menu.some((g) => g.items.some((i) => i.route === route)))
  if (known && !can('V')) return <Restricted what={`Your role (${can.role}) has no View right on this screen. The owner can change this in Rights matrix.`} />
  return <Inner route={route} />
}

function Inner({ route }: { route: string }) {
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
    case 'returns': return <ReturnFromBill />
    case 'dayclose': return <DayClose />
    case 'rights': return <Rights />
    case 'labels': return <Labels />
    case 'import': return <ImportData />
    case 'inbox': return <Inbox />
    case 'campaigns': return <Campaigns />
  }
  if (route === 'desks') return <Hub />
  if (route === 'prompts') return <Prompts />
  const P5: Record<string, React.ReactElement> = { variants: <VariantMatrix />, sizecolour: <SizeColour />, voicebill: <VoiceBilling />, scan: <CameraScan />, forecast: <Forecast />, twofactor: <TwoFactor />, rules: <RuleBuilder />, widgets: <WidgetDesigner />, leases: <Leases />, consolidate: <Consolidate />, numgaps: <NumGaps />, auditcheck: <AuditCheck />, forex: <Forex /> }
  if (P5[route]) return P5[route]
  if (route === 'packtools') return <PackTools />
  if (route === 'help') return <Help />
  if (route === 'firstrun') return <FirstRun />
  if (route === 'display') return <CustomerDisplay />
  if (route === 'sharelink') return <ShareLink />
  if (route === 'briefing') return <Briefing />
  if (route === 'attachments') return <Attachments />
  if (SETTINGS[route]) return <SettingsPage key={route} route={route} />
  if (SPECS[route]) return <Generic key={route} route={route} />
  return <Restricted what={`There is no screen at "${route}". Use the menu or press Ctrl+K.`} />
}
