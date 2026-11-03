import { useState } from 'react'
import { useApp, set, toast } from '../lib/app'
import { Btn, PageHead, Field, Toggle, Seg } from '../ui/kit'
import { useCan } from '../lib/rights'

type Fd = { id: string; label: string; type: 'toggle' | 'select' | 'number' | 'text'; opts?: string[]; min?: number; max?: number; help?: string; def: string | number | boolean }
type Sec = { title: string; fields: Fd[] }
export interface SettingDef { title: string; sub: string; group: string; sections: Sec[]; note?: string }
const T = (id: string, label: string, def = false, help?: string): Fd => ({ id, label, type: 'toggle', def, help })
const S = (id: string, label: string, opts: string[], def?: string, help?: string): Fd => ({ id, label, type: 'select', opts, def: def ?? opts[0], help })
const N = (id: string, label: string, def: number, min = 0, max = 100000, help?: string): Fd => ({ id, label, type: 'number', def, min, max, help })
const X = (id: string, label: string, def = '', help?: string): Fd => ({ id, label, type: 'text', def, help })

export const SETTINGS: Record<string, SettingDef> = {
  company: { title: 'Company and branch settings', sub: 'Legal identity used on statutory documents.', group: 'Setup', sections: [{ title: 'Company', fields: [X('legal', 'Legal name', 'Malabar Textiles and Home Private Limited'), X('gstin', 'GSTIN', '32AABCM4417K1ZP'), S('state', 'State', ['Kerala (32)', 'Tamil Nadu (33)', 'Karnataka (29)']), S('fy', 'Financial year starts', ['April', 'January']), S('cur', 'Base currency', ['INR ₹'])] }, { title: 'Branch defaults', fields: [S('branch', 'Default branch for new users', ['Kochi Main', 'Kozhikode']), T('sep', 'Separate numbering for each branch', true)] }] },
  fyperiod: { title: 'Financial year and period lock', sub: 'Decide how far back anyone may post.', group: 'Setup', sections: [{ title: 'Back-dating', fields: [N('days', 'Allow back-dated entries up to (days)', 7, 0, 365, 'Zero means today only.'), T('reason', 'Ask for a reason on back-dated entries', true), T('lockgst', 'Lock a month automatically after its GST return is filed', true)] }] },
  entitlements: { title: 'Plan entitlements', sub: 'What each plan includes. Admin Studio uses this when a module is switched on.', group: 'Platform', sections: [{ title: 'Core', fields: [N('ucore', 'Users included', 5, 1, 50), T('offline', 'Offline billing', true)] }, { title: 'Business', fields: [N('ubus', 'Users included', 15, 1, 200), T('ai', 'Assistant', true), T('wa', 'Official WhatsApp channel', true)] }, { title: 'Enterprise', fields: [N('uent', 'Users included', 100, 1, 5000), T('api', 'API and webhooks', true), T('sso', 'Single sign-on', false)] }] },
  releases: { title: 'Release channels', sub: 'How updates reach each tenant.', group: 'Platform', sections: [{ title: 'Rollout', fields: [S('chan', 'Channel', ['Stable', 'Early access']), N('pct', 'Roll out to this share of tenants (%)', 10, 1, 100), T('auto', 'Install updates outside shop hours', true), X('win', 'Quiet window', '23:00 to 05:00')] }] },
  support: { title: 'Support access', sub: 'Support sees settings and logs, never business data, and only for a limited time.', group: 'Platform', sections: [{ title: 'Time-limited grant', fields: [S('dur', 'Access lasts', ['1 hour', '4 hours', '24 hours']), T('logs', 'Allow reading diagnostics', true), T('data', 'Allow reading business data', false, 'Off by default and cannot be switched on without the owner.')] }] },
  delegation: { title: 'Delegation matrix', sub: 'Which settings a tenant admin may change without the platform team.', group: 'Platform', sections: [{ title: 'Tenant admin may change', fields: [T('theme', 'Theme and layout', true), T('menu', 'Menu order and names', true), T('wf', 'Workflows', true), T('fields', 'Custom fields', true), T('tax', 'Tax rules', false), T('plan', 'Plan and modules', false)] }] },
  invtypes: { title: 'Invoice types', sub: 'Which document types the counter and books can issue.', group: 'Setup', sections: [{ title: 'Enabled', fields: [T('tax', 'Tax invoice', true), T('bos', 'Bill of supply', true), T('pro', 'Proforma invoice', true), T('est', 'Estimate', true), T('exp', 'Export invoice', false)] }, { title: 'Default', fields: [S('def', 'Default for new bills', ['Tax invoice', 'Bill of supply', 'Estimate']), S('walk', 'Walk-in customer bills', ['Tax invoice', 'Bill of supply'])] }] },
  pinvtypes: { title: 'Purchase invoice types', sub: 'Document types accepted for purchases.', group: 'Setup', sections: [{ title: 'Enabled', fields: [T('tax', 'Tax invoice', true), T('rcm', 'Reverse charge self-invoice', true), T('imp', 'Import bill of entry', false)] }] },
  scopes: { title: 'Limits and scopes', sub: 'Narrow a role by branch, godown, price category and amount.', group: 'Identity', sections: [{ title: 'Cashier', fields: [S('cb', 'Branch', ['Own branch only', 'All branches']), S('cg', 'Godown', ['Showroom only', 'All godowns']), N('cd', 'Highest discount without approval (%)', 10, 0, 100), N('cr', 'Refund limit without approval (₹)', 2000, 0, 1000000)] }, { title: 'Accountant', fields: [N('ap', 'Largest voucher without approval (₹)', 500000, 0, 100000000), T('bk', 'May post back-dated vouchers', false)] }] },
  security: { title: 'Session and security', sub: 'Sign-in rules for every user in the company.', group: 'Identity', sections: [{ title: 'Sign-in', fields: [N('pw', 'Minimum password length', 10, 8, 64), T('tfa', 'Require second step for Owner and Accountant', true), N('idle', 'Lock screen after idle minutes', 10, 1, 240), N('sess', 'Sign out after hours', 12, 1, 72), X('ip', 'Allowed IP range', 'Any')] }] },
  shortcuts: { title: 'Shortcut profiles', sub: 'Choose the keyboard set that suits the team.', group: 'Setup', sections: [{ title: 'Profile', fields: [S('prof', 'Profile', ['Easy Biz familiar', 'Tally familiar', 'Standard']), T('fkeys', 'Function keys for counter actions', true), T('hints', 'Show shortcut hints in buttons', true)] }] },
  valuation: { title: 'Stock valuation', sub: 'How stock is costed and what happens when it runs out.', group: 'Setup', sections: [{ title: 'Method', fields: [S('method', 'Costing method', ['Weighted average', 'FIFO', 'Last purchase price']), S('neg', 'Billing with no stock', ['Warn and continue', 'Block', 'Allow silently']), T('batch', 'Cost each batch separately', false)] }] },
  matchrules: { title: 'Bank matching rules', sub: 'How statement lines are matched to books.', group: 'Banking', sections: [{ title: 'Rules', fields: [T('amt', 'Match on exact amount and date', true), T('ref', 'Match on cheque or UPI reference', true), N('tol', 'Date tolerance (days)', 2, 0, 15), N('rs', 'Amount tolerance (₹)', 0, 0, 100)] }] },
  bankfeed: { title: 'Connected banking feed', sub: 'Statement lines pulled in automatically. Simulated here.', group: 'Banking', sections: [{ title: 'Feed', fields: [S('prov', 'Provider', ['Not connected', 'HDFC statement API (simulated)', 'Federal Bank API (simulated)']), S('freq', 'Refresh', ['Daily', 'Every 4 hours'])] }] },
  taxpack: { title: 'Tax rule pack', sub: 'GST rates, HSN and e-invoice rules update as a pack.', group: 'GST', sections: [{ title: 'Pack', fields: [X('ver', 'Installed version', '2026.10 (rates as of 22 Sep 2026)'), T('auto', 'Check for updates weekly', true), T('notes', 'Show what changed before applying', true)] }] },
  taxscen: { title: 'Tax scenarios', sub: 'Special cases that change how tax is calculated.', group: 'GST', sections: [{ title: 'Switch on only what applies', fields: [T('rcm', 'Reverse charge', true), T('comp', 'Composition scheme', false), T('sez', 'SEZ supplies', false), T('exp', 'Exports with or without payment', false), T('tcs', 'TCS on sales', false)] }] },
  interest: { title: 'Interest on overdue', sub: 'Charge or compute interest on late payments.', group: 'Books', sections: [{ title: 'Rule', fields: [N('rate', 'Interest per year (%)', 18, 0, 60), N('grace', 'Grace days', 15, 0, 90), T('auto', 'Add to the statement automatically', false)] }] },
  currency: { title: 'Currencies', sub: 'Foreign currency invoices and exchange differences.', group: 'Books', sections: [{ title: 'Currency', fields: [T('multi', 'Allow foreign currency', false), S('base', 'Base currency', ['INR ₹']), S('gl', 'Exchange gain or loss ledger', ['Exchange difference', 'Other income'])] }] },
  postingmap: { title: 'Posting map', sub: 'Which ledger each business event posts to. Preview shows the entry before you save.', group: 'Books', sections: [{ title: 'Sales and purchase', fields: [S('sales', 'Sales ledger', ['Sales', 'Sales (retail)']), S('purch', 'Purchase ledger', ['Purchases']), S('round', 'Round-off ledger', ['Round off']), S('disc', 'Discount allowed', ['Discount allowed', 'Sales'])] }] },
  loyaltycfg: { title: 'Loyalty programme', sub: 'Points earned and redeemed at the counter.', group: 'People', sections: [{ title: 'Points', fields: [N('earn', 'Points per ₹100', 1, 0, 20), N('exp', 'Points expire after (days)', 365, 30, 1825), N('min', 'Smallest redemption (points)', 100, 1, 10000), T('birth', 'Double points in birthday month', true)] }] },
  creditctrl: { title: 'Credit control', sub: 'Stop or warn when a customer is over limit or overdue.', group: 'People', sections: [{ title: 'Rules', fields: [S('over', 'Over credit limit', ['Warn', 'Ask manager', 'Block']), N('days', 'Block new credit when overdue beyond (days)', 60, 0, 365), T('wa', 'Send a reminder at 7 days', true)] }] },
  botrules: { title: 'Ordering bot rules', sub: 'What the WhatsApp ordering bot may do. Test it in the transcript below the rules.', group: 'Integrations', sections: [{ title: 'Rules', fields: [T('stock', 'Answer stock questions', true), T('price', 'Quote prices', true), T('order', 'Take orders as drafts', true), N('human', 'Hand over to a person after unanswered messages', 2, 1, 10)] }] },
  upi: { title: 'UPI and payment settings', sub: 'Collection handle and confirmation behaviour.', group: 'Integrations', sections: [{ title: 'UPI', fields: [X('vpa', 'UPI handle', 'malabarhome@hdfcbank'), T('dyn', 'Dynamic QR with amount', true), T('conf', 'Confirm receipt before saving the bill', true)] }] },
  providers: { title: 'SMS and email providers', sub: 'Where messages are sent from. Simulated.', group: 'Integrations', sections: [{ title: 'Providers', fields: [S('sms', 'SMS', ['Not connected', 'Provider A (simulated)']), S('mail', 'Email', ['Not connected', 'SMTP (simulated)']), X('from', 'Sender name', 'MALABR')] }] },
  mcp: { title: 'MCP server access', sub: 'Let approved assistants read reports through a scoped key.', group: 'Integrations', sections: [{ title: 'Access', fields: [T('on', 'Enable MCP server', false), S('scope', 'Scope', ['Reports only', 'Reports and masters']), T('mask', 'Mask cost and margin', true)] }] },
  marketplace: { title: 'Marketplace connectors', sub: 'Stock and order sync with online marketplaces. Simulated.', group: 'Integrations', sections: [{ title: 'Connectors', fields: [T('amz', 'Amazon seller', false), T('fk', 'Flipkart seller', false), T('shop', 'Shopify store', false), S('sync', 'Stock sync', ['Every 15 minutes', 'Hourly'])] }] },
  courier: { title: 'Courier connectors', sub: 'Book shipments and track them from the invoice. Simulated.', group: 'Integrations', sections: [{ title: 'Couriers', fields: [T('dtdc', 'DTDC', false), T('dlv', 'Delhivery', false), T('ind', 'India Post', true), T('track', 'Send tracking link on WhatsApp', true)] }] },
  aimodels: { title: 'Model manager', sub: 'Which model answers, and where it runs.', group: 'Assistant', sections: [{ title: 'Model', fields: [S('where', 'Runs on', ['Cloud', 'This computer (small model)', 'Shared box in the shop']), S('size', 'Model size', ['Small', 'Medium']), T('fallback', 'Fall back to cloud when the device is slow', true)] }] },
  aitier: { title: 'Hardware tier', sub: 'What this computer can run. Measured on first start.', group: 'Assistant', sections: [{ title: 'Recommendation', fields: [X('ram', 'Memory found', '4 GB'), S('tier', 'Recommended', ['Cloud only', 'Small local model']), T('ovr', 'Use my choice instead', false)] }] },
  aiprivacy: { title: 'Assistant privacy and kill switch', sub: 'Control what leaves the shop.', group: 'Assistant', sections: [{ title: 'Privacy', fields: [T('on', 'Assistant switched on', true), T('cost', 'Hide cost and margin from the cashier role', true), T('log', 'Keep a log of questions', true), T('send', 'Send anonymous usage to improve answers', false)] }] },
  aibox: { title: 'Shared assistant box', sub: 'One machine in the shop serves all counters.', group: 'Assistant', sections: [{ title: 'Box', fields: [X('addr', 'Address on the shop network', '192.168.1.40'), T('on', 'Use the shared box', false)] }] },
  backupcfg: { title: 'Backup schedule', sub: 'When and where copies are kept.', group: 'Tools', sections: [{ title: 'Schedule', fields: [S('when', 'Backs up', ['Every night at 11 pm', 'Every 4 hours', 'On day close']), S('dest', 'Keep a copy on', ['This computer', 'External drive', 'Cloud (simulated)']), N('keep', 'Keep copies for (days)', 30, 1, 365), T('enc', 'Encrypt copies', true)] }] },
  retention: { title: 'Retention', sub: 'How long records are kept before anonymising.', group: 'Tools', sections: [{ title: 'Periods', fields: [N('fin', 'Financial records (years)', 8, 6, 20, 'The law requires at least six.'), N('mkt', 'Marketing data after last purchase (years)', 3, 1, 10), N('logs', 'Audit log (years)', 8, 1, 20)] }] },
  telemetry: { title: 'Crash reports and telemetry', sub: 'Your choice. Business data is never sent.', group: 'Tools', sections: [{ title: 'Consent', fields: [T('crash', 'Send crash reports', false), T('use', 'Send anonymous usage counts', false), T('remote', 'Allow remote assistance when I ask for it', true)] }] },
  packcfg: { title: 'Pack selection', sub: 'Industry pack for this tenant. Change it in Admin Studio to apply terms, themes and workflows.', group: 'Platform', sections: [{ title: 'Pack', fields: [S('pack', 'Active pack', ['Textile', 'Pharmacy', 'Cafeteria', 'General retail', 'Hardware', 'Grocery', 'Gym']), T('keep', 'Keep my menu changes when switching', true)] }] },
}

export function SettingsPage({ route }: { route: string }) {
  const def = SETTINGS[route]
  const can = useCan()
  const saved = useApp((s) => s.rows['cfg:' + route])
  const base: Record<string, string | number | boolean> = Object.fromEntries(def.sections.flatMap((s) => s.fields.map((f) => [f.id, f.def])))
  const { id: _id, ...stored } = (saved?.[0] ?? {}) as Record<string, string | number | boolean>
  const [v, setV] = useState<Record<string, string | number | boolean>>({ ...base, ...stored })
  const [err, setErr] = useState<Record<string, string>>({})
  const dirty = JSON.stringify({ ...base, ...stored }) !== JSON.stringify(v)
  const save = () => {
    const e: Record<string, string> = {}
    def.sections.forEach((s) => s.fields.forEach((f) => { if (f.type === 'number') { const n = +v[f.id]; if (isNaN(n) || n < (f.min ?? 0) || n > (f.max ?? 1e9)) e[f.id] = `Enter a number from ${f.min ?? 0} to ${f.max}.` } if (f.type === 'text' && !String(v[f.id]).trim()) e[f.id] = 'This cannot be empty.' }))
    setErr(e)
    if (Object.keys(e).length) return toast('Fix the highlighted fields first.', 'warn')
    set((s) => ({ rows: { ...s.rows, ['cfg:' + route]: [{ id: 'cfg', ...v } as never] } }))
    toast(`${def.title} saved.`)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title={def.title} sub={def.sub} crumbs={[def.group, def.title]} />
      <div className="flex-1 scroll px-5 pb-6 space-y-4 max-w-3xl">
        {def.sections.map((s) => (
          <section key={s.title} className="panel p-4 space-y-3"><h2 className="font-medium">{s.title}</h2>
            {s.fields.map((f) => f.type === 'toggle'
              ? <div key={f.id} className="flex items-start gap-3"><Toggle label={f.label} on={!!v[f.id]} disabled={!can('E')} onChange={(x) => setV({ ...v, [f.id]: x })} /><div><div className="text-[13px]">{f.label}</div>{f.help && <div className="text-xs muted">{f.help}</div>}</div></div>
              : <Field key={f.id} label={f.label} hint={f.help} error={err[f.id]}>
                {f.type === 'select' ? <select disabled={!can('E')} className="inp max-w-sm" value={String(v[f.id])} onChange={(e) => setV({ ...v, [f.id]: e.target.value })}>{f.opts!.map((o) => <option key={o}>{o}</option>)}</select>
                  : <input disabled={!can('E')} aria-invalid={!!err[f.id]} className={`inp max-w-sm ${f.type === 'number' ? 'num' : ''}`} type={f.type === 'number' ? 'number' : 'text'} value={String(v[f.id])} onChange={(e) => setV({ ...v, [f.id]: f.type === 'number' ? e.target.value : e.target.value })} />}
              </Field>)}
          </section>))}
      </div>
      <div className="px-5 py-2 border-t border-rule flex items-center gap-3 bg-sheet"><span className="text-xs muted flex-1">{dirty ? 'You have unsaved changes.' : 'Everything is saved.'}</span><Btn disabled={!dirty} onClick={() => { setV({ ...base, ...stored }); setErr({}) }}>Discard</Btn><Btn needs="E" kind="primary" disabled={!dirty} onClick={save}>Save changes</Btn></div>
    </div>
  )
}
export { Seg }
