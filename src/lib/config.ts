export type Mode = 'counter' | 'books' | 'owner' | 'studio'
export type PackId = 'textile' | 'pharmacy' | 'cafeteria' | 'school' | 'general' | 'hardware' | 'grocery' | 'gym'
export type Lang = 'en' | 'ml' | 'hi'

export interface MenuItem {
  id: string
  label: string
  route: string
  icon: string
  module: string
  visible: boolean
  modes: Mode[]
  key?: string
  ml?: string
  hi?: string
}
export interface MenuGroup { id: string; label: string; items: MenuItem[] }
export interface FieldDef { id: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'yesno'; required: boolean; visible: boolean; locked?: boolean; options?: string[]; custom?: boolean }
export interface Stage { id: string; name: string; kind: 'start' | 'step' | 'approval' | 'end'; sla?: number; owner?: string; back?: string; tone?: 'neutral' | 'haldi' | 'mehndi' | 'sindoor' }
export interface Pipeline { id: string; name: string; stages: Stage[] }
export interface Workflow { id: string; name: string; trigger: string; conditions: string[]; actions: string[]; on: boolean }
export interface Approval { id: string; name: string; doc: string; rule: string; steps: { role: string; limit: number }[]; on: boolean }
export interface Numbering { id: string; doc: string; prefix: string; padding: number; start: number; reset: 'never' | 'yearly' | 'monthly'; branchWise: boolean }
export interface Branch { id: string; name: string; legal: string; display: string; tagline: string; gstin: string; city: string }
export interface ModuleDef { id: string; name: string; release: 'R1' | 'R2' | 'R3' | 'R4' | 'R5'; plan: 'Core' | 'Business' | 'Enterprise'; on: boolean; locked?: boolean; features: { id: string; name: string; on: boolean }[] }

export interface Config {
  pack: PackId
  theme: { preset: string; accent: string; radius: number; density: 'comfort' | 'compact' | 'ledger'; custom: boolean }
  drcr: 'accounting' | 'everywhere' | 'letters'
  layouts: { books: 'ledger' | 'receipt'; cashier: 'counter' | 'tile'; party: 'table' | 'cards'; stock: 'table' | 'cards'; day: 'sheet' | 'split' }
  terms: Record<string, string>
  lang: Lang
  company: { legal: string; display: string; tagline: string; gstin: string }
  branches: Branch[]
  modules: ModuleDef[]
  menu: MenuGroup[]
  homes: Record<'counter' | 'books' | 'owner', string>
  numbering: Numbering[]
  pipelines: Pipeline[]
  workflows: Workflow[]
  approvals: Approval[]
  fields: Record<string, FieldDef[]>
}

export interface ThemePreset { id: string; name: string; note: string; day: { accent: string; cotton: string; sheet: string; ink: string; rule: string }; night: { accent: string; cotton: string; sheet: string; ink: string; rule: string } }
const night = (accent: string, cotton: string, sheet: string, rule: string) => ({ accent, cotton, sheet, ink: '#E6E9F2', rule })
export const PRESETS: ThemePreset[] = [
  { id: 'neel', name: 'Neel', note: 'Platform default. Indigo ink on cotton.', day: { accent: '#23307A', cotton: '#F2F3F0', sheet: '#FBFBFA', ink: '#1C2340', rule: '#D9DCD5' }, night: night('#8C9BFF', '#0E1324', '#151C33', '#2A3350') },
  { id: 'aushadhi', name: 'Aushadhi', note: 'Pharmacy. Clinical teal.', day: { accent: '#0B5F66', cotton: '#EFF4F4', sheet: '#FAFCFC', ink: '#12302F', rule: '#D2DEDD' }, night: night('#5CCFD0', '#0A1819', '#112527', '#223D3F') },
  { id: 'chai', name: 'Chai', note: 'Cafeteria. Roasted brown.', day: { accent: '#8A3B12', cotton: '#F6F1EA', sheet: '#FDFBF7', ink: '#2E1D12', rule: '#E2D8CB' }, night: night('#F0A367', '#1A110B', '#241810', '#40302300'.slice(0, 7)) },
  { id: 'slate', name: 'Slate', note: 'School. Calm blue-grey.', day: { accent: '#2B5A8C', cotton: '#EEF2F6', sheet: '#FAFBFD', ink: '#172233', rule: '#D3DBE5' }, night: night('#8DBDF0', '#0C131D', '#121C2A', '#233248') },
  { id: 'madder', name: 'Madder', note: 'Textile. Natural red dye.', day: { accent: '#9B2C3F', cotton: '#F5F1EF', sheet: '#FCFAF9', ink: '#2B1A1E', rule: '#E0D6D3' }, night: night('#F28B9C', '#1A0E11', '#25151A', '#42262D') },
  { id: 'rivet', name: 'Rivet', note: 'Hardware and sanitaryware. Steel teal.', day: { accent: '#1F4E5F', cotton: '#EEF2F3', sheet: '#FAFBFC', ink: '#14262D', rule: '#D2DCDF' }, night: night('#7CC4DA', '#0B1619', '#112027', '#223B44') },
  { id: 'kirana', name: 'Kirana', note: 'Grocery. Leaf green on warm paper.', day: { accent: '#2D6A3E', cotton: '#F2F4EE', sheet: '#FBFCF8', ink: '#1C2A20', rule: '#DADFD2' }, night: night('#7FD29A', '#0C150F', '#122019', '#243A2B') },
  { id: 'iron', name: 'Iron', note: 'Gym. Olive and chalk.', day: { accent: '#556B00', cotton: '#F3F3EC', sheet: '#FBFBF6', ink: '#23260F', rule: '#DDDDCF' }, night: night('#C5DD52', '#12140A', '#1B1E0F', '#32371D') },
  { id: 'graphite', name: 'Graphite', note: 'General retail. Neutral and quiet.', day: { accent: '#2F3A46', cotton: '#F1F2F3', sheet: '#FBFBFC', ink: '#1A2028', rule: '#D8DCE0' }, night: night('#B6C2D0', '#0F1216', '#171C22', '#2A323B') },
]

export const TERM_BASE: Record<string, string> = {
  customer: 'Customer', customers: 'Customers', supplier: 'Supplier', suppliers: 'Suppliers',
  godown: 'Godown', godowns: 'Godowns', item: 'Item', items: 'Items', invoice: 'Invoice', bill: 'Bill', salesperson: 'Salesperson',
}
export interface Pack { id: PackId; name: string; blurb: string; preset: string; terms: Partial<Record<string, string>>; cashier: 'counter' | 'tile'; modulesOff: string[]; fields: Record<string, FieldDef[]>; version: string }
const F = (id: string, label: string, type: FieldDef['type'], required = false, options?: string[]): FieldDef => ({ id, label, type, required, visible: true, options, custom: true })
export const PACKS: Pack[] = [
  { id: 'textile', name: 'Textile and apparel', blurb: 'Size and colour matrix, fabric rolls and cuts, brand views, schemes.', preset: 'neel', terms: {}, cashier: 'counter', modulesOff: [], version: '1.4.0', fields: { item: [F('roll', 'Fabric roll tracking', 'yesno'), F('fabric', 'Fabric', 'select', false, ['Cotton', 'Linen', 'Silk', 'Blend'])] } },
  { id: 'pharmacy', name: 'Pharmacy', blurb: 'Batch and expiry first billing, schedule drugs, doctor and patient details.', preset: 'aushadhi', terms: { customer: 'Patient', customers: 'Patients', supplier: 'Distributor', suppliers: 'Distributors', godown: 'Store room', godowns: 'Store rooms', item: 'Medicine', items: 'Medicines' }, cashier: 'counter', modulesOff: [], version: '1.1.0', fields: { item: [F('schedule', 'Drug schedule', 'select', true, ['OTC', 'H', 'H1', 'X']), F('salt', 'Composition', 'text')], party: [F('doctor', 'Referring doctor', 'text')] } },
  { id: 'cafeteria', name: 'Cafeteria', blurb: 'Table and tile POS, kitchen tickets, recipe-based stock.', preset: 'chai', terms: { customer: 'Guest', customers: 'Guests', item: 'Menu item', items: 'Menu items', godown: 'Kitchen store', godowns: 'Kitchen stores', invoice: 'Tax invoice' }, cashier: 'tile', modulesOff: ['purchase'], version: '0.9.0', fields: { item: [F('veg', 'Veg or non-veg', 'select', true, ['Veg', 'Non-veg', 'Egg']), F('prep', 'Prep time (min)', 'number')] } },
  { id: 'school', name: 'School', blurb: 'Fee schedules, recurring invoices, student ledgers and reminders.', preset: 'slate', terms: { customer: 'Student', customers: 'Students', item: 'Fee head', items: 'Fee heads', invoice: 'Fee receipt', bill: 'Fee receipt', supplier: 'Vendor', suppliers: 'Vendors' }, cashier: 'counter', modulesOff: ['inventory'], version: '0.8.0', fields: { party: [F('class', 'Class and section', 'text', true), F('guardian', 'Guardian', 'text', true)] } },
  { id: 'general', name: 'General retail', blurb: 'Variants, brands and price categories for mixed-goods shops, from home and kitchen to gifts.', preset: 'graphite', terms: {}, cashier: 'tile', modulesOff: [], version: '1.0.0', fields: { item: [F('brand', 'Brand', 'text'), F('warranty', 'Warranty (months)', 'number')] } },
  { id: 'hardware', name: 'Hardware and sanitaryware', blurb: 'Sizes and specs, brand and warranty, contractor price lists, bulk units and delivery challans.', preset: 'rivet', terms: { item: 'Product', items: 'Products', godown: 'Warehouse', godowns: 'Warehouses', salesperson: 'Counter staff' }, cashier: 'counter', modulesOff: [], version: '0.7.0', fields: { item: [F('spec', 'Size or specification', 'text'), F('brand', 'Brand', 'text'), F('warranty', 'Warranty (months)', 'number')], party: [F('site', 'Site or project', 'text')] } },
  { id: 'grocery', name: 'Groceries', blurb: 'Loose and packed goods, weighing scale, fast tile billing, expiry and daily price changes.', preset: 'kirana', terms: { item: 'Product', items: 'Products', godown: 'Back store', godowns: 'Back stores' }, cashier: 'tile', modulesOff: ['sales'], version: '0.6.0', fields: { item: [F('loose', 'Sold loose or packed', 'select', true, ['Loose', 'Packed']), F('shelf', 'Shelf life (days)', 'number')] } },
  { id: 'gym', name: 'Gym and fitness', blurb: 'Membership plans, recurring bills, renewals, trainer assignment and freeze or transfer of plans.', preset: 'iron', terms: { customer: 'Member', customers: 'Members', item: 'Plan', items: 'Plans', invoice: 'Membership bill', bill: 'Membership bill', godown: 'Store', godowns: 'Stores', salesperson: 'Trainer' }, cashier: 'counter', modulesOff: ['purchase', 'inventory'], version: '0.5.0', fields: { item: [F('validity', 'Validity (days)', 'number', true)], party: [F('trainer', 'Assigned trainer', 'text'), F('joined', 'Joining date', 'date', true), F('ends', 'Plan ends on', 'date')] } },
] as Pack[]
export const PENDING_INDUSTRIES = ['Clinic and hospital', 'Restaurant', 'Hotel', 'Salon and spa', 'Jewellery', 'Electronics', 'Supermarket', 'Auto spares', 'Bakery', 'Stationery', 'Footwear', 'Furniture', 'Agri inputs', 'Wholesale distribution']

const mi = (id: string, label: string, icon: string, module: string, modes: Mode[], route = id): MenuItem => ({ id, label, route, icon, module, visible: true, modes })
const B: Mode[] = ['books'], O: Mode[] = ['owner'], BO: Mode[] = ['books', 'owner'], ALL: Mode[] = ['books', 'owner', 'counter']
export const DEFAULT_MENU: MenuGroup[] = [
  { id: 'home', label: 'Home', items: [mi('owner', 'Day sheet', 'sheet', 'reports', O), mi('approvals', 'Approvals', 'check', 'workflows', BO), mi('phone', 'Phone view', 'phone', 'mobile', O), mi('desks', 'Desks', 'dash', 'reports', ['books', 'owner', 'counter'])] },
  { id: 'counter', label: 'Counter', items: [mi('billing', 'New {bill}', 'receipt', 'pos', ['books', 'counter']), mi('held', 'Held bills', 'pause', 'pos', ['books', 'counter']), mi('returns', 'Returns', 'undo', 'sales', ['books', 'counter']), mi('dayclose', 'Day close', 'check', 'pos', ['books', 'counter', 'owner'])] },
  { id: 'masters', label: 'Masters', items: [mi('areas', 'Areas and routes', 'list', 'masters', B), mi('salesmen', 'Salesmen', 'users', 'masters', B), mi('pricecat', 'Price categories', 'tag', 'masters', B), mi('godowns', 'Godowns and vans', 'truck', 'masters', B), mi('counters', 'Counters', 'receipt', 'masters', B), mi('costcentres', 'Cost centres', 'layers', 'masters', B), mi('acgroups', 'Account groups', 'ledger', 'masters', B), mi('cards', 'Card and UPI', 'card', 'masters', B), mi('privilege', 'Privilege cards', 'gift', 'masters', B), mi('units', 'Units', 'scale', 'masters', B), mi('brands', 'Brands', 'tag', 'masters', B), mi('taxcats', 'Tax categories', 'gst', 'masters', B), mi('slabs', 'Quantity slabs', 'scale', 'masters', B), mi('hsn', 'HSN and SAC', 'gst', 'masters', B), mi('customfields', 'Custom fields', 'form', 'masters', B), mi('tags', 'Tags and groups', 'tag', 'masters', B), mi('ledgerlist', 'Ledger list', 'ledger', 'masters', B)] },
  { id: 'sales', label: 'Sales', items: [mi('pipeline', 'Sales pipeline', 'flow', 'sales', BO), mi('invoices', '{invoice}s', 'file', 'sales', BO), mi('quotes', 'Quotations', 'quote', 'sales', B), mi('schemes', 'Schemes and offers', 'tag', 'sales', B), mi('recurring', 'Recurring invoices', 'repeat', 'sales', B), mi('estimates', 'Estimates', 'quote', 'sales', B), mi('sorders', 'Sales orders', 'order', 'sales', B), mi('challans', 'Delivery challans', 'truck', 'sales', B), mi('enquiries', 'Enquiries', 'funnel', 'sales', B), mi('proforma', 'Proforma invoices', 'file', 'sales', B), mi('pending', 'Pending orders', 'truck', 'sales', B), mi('commission', 'Commission rules', 'wallet', 'sales', B)] },
  { id: 'purchase', label: 'Purchase', items: [mi('po', 'Purchase orders', 'cart', 'purchase', B), mi('grn', 'Goods receipt', 'inbox', 'purchase', B), mi('pinv', 'Purchase invoices', 'file', 'purchase', B), mi('reorder', 'Reorder suggestions', 'alert', 'purchase', BO), mi('payables', 'Payables ageing', 'clock', 'purchase', BO), mi('pquotes', 'Purchase quotations', 'quote', 'purchase', B), mi('preturns', 'Purchase returns', 'undo', 'purchase', B), mi('landed', 'Landed cost', 'truck', 'purchase', B), mi('billcapture', 'Bill capture review', 'camera', 'purchase', B)] },
  { id: 'stock', label: 'Stock', items: [mi('stock', 'Stock on hand', 'box', 'inventory', BO), mi('items', '{item} master', 'tag', 'masters', B), mi('transfers', 'Transfers', 'truck', 'inventory', B), mi('counts', 'Stock count', 'scan', 'inventory', B), mi('expiry', 'Expiry and ageing', 'clock', 'inventory', B), mi('stockledger', 'Stock ledger', 'ledger', 'inventory', B), mi('stockjn', 'Stock journals', 'swap', 'inventory', B), mi('labels', 'Barcode labels', 'barcode', 'inventory', B), mi('kits', 'Kits and combos', 'box', 'inventory', B), mi('reservations', 'Reservations', 'lock', 'inventory', B), mi('countvar', 'Count variances', 'scan', 'inventory', B), mi('negstock', 'Negative stock', 'alert', 'inventory', B), mi('vanload', 'Van load and return', 'truck', 'inventory', B), mi('serials', 'Serial and warranty', 'barcode', 'inventory', B)] },
  { id: 'books', label: 'Books', items: [mi('vouchers', 'Voucher entry', 'book', 'accounts', B), mi('daybook', 'Day book', 'list', 'accounts', B), mi('ledgers', 'Ledgers', 'ledger', 'accounts', B), mi('trial', 'Trial balance', 'scale', 'accounts', B), mi('pnl', 'Profit and loss', 'trend', 'accounts', BO), mi('outstanding', 'Bill-wise outstanding', 'clock', 'accounts', B), mi('balance', 'Balance sheet', 'scale', 'accounts', B), mi('cashflow', 'Cash flow', 'trend', 'accounts', B), mi('fixedassets', 'Fixed assets', 'building', 'accounts', B), mi('periodclose', 'Period closing', 'lock', 'accounts', B), mi('budgets', 'Budgets', 'scale', 'accounts', B), mi('advances', 'Staff advances', 'wallet', 'accounts', B), mi('openbal', 'Opening balances', 'book', 'accounts', B)] },
  { id: 'comply', label: 'Bank and GST', items: [mi('bankrec', 'Bank reconciliation', 'bank', 'banking', B), mi('pdc', 'Post-dated cheques', 'cheque', 'banking', B), mi('gstr', 'GST returns', 'gst', 'gst', B), mi('einv', 'E-invoice and e-way bill', 'qr', 'gst', B), mi('gst2b', '2B reconciliation', 'scale', 'gst', B), mi('chequeprint', 'Cheque printing', 'cheque', 'banking', B), mi('matchrules', 'Bank matching rules', 'scale', 'banking', B), mi('bankfeed', 'Banking feed', 'bank', 'banking', B), mi('bankaccts', 'Bank accounts', 'bank', 'banking', B), mi('chequereg', 'Cheque register', 'cheque', 'banking', B), mi('loans', 'Loans and EMI', 'bank', 'banking', B), mi('upirec', 'UPI reconciliation', 'qr', 'banking', B), mi('cardrec', 'Card settlements', 'card', 'banking', B), mi('tds', 'TDS and TCS', 'gst', 'gst', B), mi('cacccess', 'Accountant access', 'users', 'gst', B)] },
  { id: 'people', label: 'People', items: [mi('parties', 'Party 360', 'users', 'crm', BO), mi('leads', 'Leads and enquiries', 'funnel', 'crm', BO), mi('collections', 'Collections', 'wallet', 'crm', BO), mi('campaigns', 'Campaigns', 'mega', 'crm', BO), mi('loyalty', 'Loyalty and vouchers', 'gift', 'crm', B), mi('inbox', 'Unified inbox', 'chat', 'integrations', BO), mi('segments', 'Segments', 'funnel', 'crm', B), mi('consent', 'Consent register', 'shield', 'crm', B), mi('utm', 'Campaign links', 'tag', 'crm', B), mi('loyaltycfg', 'Loyalty programme', 'gift', 'crm', B), mi('creditctrl', 'Credit control', 'wallet', 'crm', B), mi('tasks', 'Tasks and follow-ups', 'check', 'crm', B), mi('feedback', 'Feedback', 'chat', 'crm', B), mi('giftv', 'Gift vouchers', 'gift', 'crm', B), mi('dupes', 'Duplicate customers', 'copy', 'crm', B), mi('churn', 'Next best offer', 'spark', 'crm', B)] },
  { id: 'reports', label: 'Reports', items: [mi('reports', 'Report viewer', 'chart', 'reports', BO), mi('builder', 'Report builder', 'wrench', 'reports', B), mi('scheduled', 'Scheduled reports', 'clock', 'reports', B), mi('cashbook', 'Cash book', 'chart', 'reports', BO), mi('ledgerbook', 'Ledger book', 'chart', 'reports', BO), mi('trading', 'Trading account', 'chart', 'reports', BO), mi('modified', 'Modified transactions', 'chart', 'reports', BO), mi('rotation', 'Item rotation', 'chart', 'reports', BO), mi('dimension', 'Sales by branch and cost centre', 'chart', 'reports', BO), mi('voucherreg', 'Voucher register', 'chart', 'reports', BO), mi('stockageing', 'Stock ageing', 'chart', 'reports', BO), mi('lowstock', 'Low stock', 'chart', 'reports', BO), mi('hsnsum', 'HSN-wise summary', 'chart', 'reports', BO), mi('branchcmp', 'Branch comparison', 'chart', 'reports', BO), mi('profit', 'Profitability by item', 'chart', 'reports', BO), mi('weekday', 'Weekday pattern', 'chart', 'reports', BO), mi('basket', 'Basket analysis', 'chart', 'reports', BO), mi('points', 'Points statement', 'chart', 'reports', BO), mi('commrep', 'Commission report', 'chart', 'reports', BO)] },
  { id: 'auto', label: 'Automation', items: [mi('runs', 'Workflow runs', 'flow', 'workflows', B), mi('ask', 'Ask assistant', 'spark', 'ai', ALL), mi('integr', 'Integrations', 'plug', 'integrations', B), mi('hardware', 'Devices', 'printer', 'integrations', ['books', 'counter']), mi('triggers', 'Automation triggers', 'workflow', 'workflows', B), mi('botrules', 'Ordering bot rules', 'chat', 'integrations', B), mi('upi', 'UPI settings', 'qr', 'integrations', B), mi('providers', 'SMS and email', 'chat', 'integrations', B), mi('mcp', 'MCP access', 'plug', 'integrations', B), mi('marketplace', 'Marketplaces', 'cart', 'integrations', B), mi('courier', 'Couriers', 'truck', 'integrations', B), mi('aimodels', 'Model manager', 'spark', 'ai', B), mi('aitier', 'Hardware tier', 'db', 'ai', B), mi('aiprivacy', 'Assistant privacy', 'shield', 'ai', B), mi('aibox', 'Shared assistant box', 'db', 'ai', B), mi('workflows', 'Workflows', 'workflow', 'workflows', B), mi('wftemplates', 'Workflow templates', 'list', 'workflows', B), mi('anomalies', 'Anomaly inbox', 'alert', 'ai', B), mi('aieval', 'Answer review queue', 'check', 'ai', B), mi('apikeys', 'API keys and webhooks', 'key', 'integrations', B)] },
  { id: 'setup', label: 'Setup', items: [mi('company', 'Company and branches', 'building', 'platform', B), mi('fyperiod', 'Year and period lock', 'lock', 'platform', B), mi('invtypes', 'Invoice types', 'file', 'sales', B), mi('pinvtypes', 'Purchase invoice types', 'file', 'purchase', B), mi('valuation', 'Stock valuation', 'box', 'inventory', B), mi('postingmap', 'Posting map', 'ledger', 'accounts', B), mi('interest', 'Interest on overdue', 'trend', 'accounts', B), mi('currency', 'Currencies', 'swap', 'accounts', B), mi('taxscen', 'Tax scenarios', 'gst', 'gst', B), mi('taxpack', 'Tax rule pack', 'gst', 'gst', B), mi('shortcuts', 'Shortcut profiles', 'key', 'platform', B), mi('packcfg', 'Pack selection', 'layers', 'platform', B), mi('entitlements', 'Plan entitlements', 'badge', 'platform', B), mi('releases', 'Release channels', 'sync', 'platform', B), mi('support', 'Support access', 'eye', 'platform', B), mi('delegation', 'Delegation matrix', 'toggle', 'platform', B), mi('tenants', 'Tenants', 'building', 'platform', B), mi('licences', 'Licence history', 'badge', 'platform', B), mi('packlib', 'Packs and templates', 'layers', 'platform', B), mi('adminaudit', 'Admin Studio audit log', 'eye', 'platform', B)] },
  { id: 'tools', label: 'Tools', items: [mi('migration', 'Data migration', 'upload', 'migration', B), mi('sync', 'Sync and conflicts', 'sync', 'sync', B), mi('backup', 'Backup and restore', 'shield', 'sync', B), mi('users', 'Users and roles', 'key', 'iam', B), mi('rights', 'Rights matrix', 'lock', 'iam', B), mi('import', 'Import data', 'upload', 'migration', B), mi('audit', 'Audit log', 'eye', 'iam', B), mi('privacy', 'Privacy and operations', 'lock', 'privacy', B), mi('printing', 'Print templates', 'printer', 'printing', B), mi('licence', 'Licence and plan', 'badge', 'platform', B), mi('coverage', 'SRS coverage', 'list', 'platform', B), mi('scopes', 'Limits and scopes', 'key', 'iam', B), mi('security', 'Session and security', 'lock', 'iam', B), mi('backupcfg', 'Backup schedule', 'shield', 'sync', B), mi('retention', 'Retention', 'clock', 'privacy', B), mi('telemetry', 'Crash reports', 'eye', 'privacy', B), mi('roles', 'Roles', 'key', 'iam', B), mi('devices', 'Registered devices', 'phone', 'iam', B), mi('approvalrules', 'Approval rules', 'check', 'iam', B), mi('migsources', 'Migration sources', 'upload', 'migration', B), mi('migrecon', 'Reconciliation proof', 'scale', 'migration', B), mi('parallel', 'Parallel run', 'swap', 'migration', B), mi('restoretests', 'Restore tests', 'shield', 'sync', B), mi('datainv', 'Data inventory', 'list', 'privacy', B)] },
]

const mod = (id: string, name: string, release: ModuleDef['release'], plan: ModuleDef['plan'], features: string[], locked = false): ModuleDef => ({ id, name, release, plan, on: true, locked, features: features.map((f) => ({ id: f.toLowerCase().replace(/\W+/g, '-'), name: f, on: true })) })
export const DEFAULT_MODULES: ModuleDef[] = [
  mod('platform', 'Platform and tenancy', 'R1', 'Core', ['Licence and plan', 'Notification centre', 'Shortcut profiles', 'Financial year and period lock'], true),
  mod('iam', 'Identity and access', 'R1', 'Core', ['PIN sign-in', 'Role matrix', 'Field masking', 'Audit log'], true),
  mod('masters', 'Masters', 'R1', 'Core', ['Item master', 'Variant matrix', 'Units and conversions', 'Price categories', 'Custom fields']),
  mod('pos', 'Billing and POS', 'R1', 'Core', ['Billing grid', 'Fast POS', 'Held bills', 'Split tender', 'Customer display']),
  mod('sales', 'Sales documents', 'R1', 'Core', ['Quotation to invoice', 'Returns and credit notes', 'Schemes', 'Recurring invoices']),
  mod('purchase', 'Purchase', 'R1', 'Core', ['Order to receipt to invoice', 'Landed cost', 'Reorder suggestions', 'Bill capture (OCR)']),
  mod('inventory', 'Inventory', 'R1', 'Core', ['Godown stock', 'Batch and expiry', 'Transfers', 'Stock count', 'Fabric rolls']),
  mod('accounts', 'Accounts', 'R1', 'Core', ['Vouchers with Tape', 'Day book', 'Trial balance', 'Financial statements']),
  mod('banking', 'Banking and cheques', 'R1', 'Business', ['Bank reconciliation', 'Post-dated cheques', 'UPI reconciliation']),
  mod('gst', 'GST and compliance', 'R1', 'Core', ['GSTR-1 and 3B', 'E-invoice', 'E-way bill', '2B reconciliation'], false),
  mod('reports', 'Reports and dashboards', 'R1', 'Core', ['Report viewer', 'Day sheet', 'Saved views', 'Scheduled reports']),
  mod('printing', 'Printing', 'R1', 'Core', ['Template designer', 'Label designer', 'Thermal preview']),
  mod('sync', 'Sync and backup', 'R2', 'Business', ['Multi-branch sync', 'Conflict queue', 'Backup schedule', 'Restore drill']),
  mod('crm', 'CRM', 'R3', 'Business', ['Party 360', 'Leads', 'Collections autopilot', 'Loyalty', 'Campaigns']),
  mod('workflows', 'Workflows and approvals', 'R3', 'Business', ['Visual builder', 'Approval chains', 'Run log']),
  mod('integrations', 'Integrations', 'R3', 'Business', ['WhatsApp', 'Unified inbox', 'Payment links', 'Devices', 'API and webhooks']),
  mod('ai', 'AI assistant', 'R4', 'Enterprise', ['Ask panel', 'Draft and confirm', 'Daily briefing', 'Voice billing', 'Kill switch']),
  mod('migration', 'Migration', 'R1', 'Core', ['Import wizard', 'Reconciliation proof', 'Parallel run']),
  mod('privacy', 'Privacy and operations', 'R2', 'Core', ['Consent manager', 'Retention', 'Diagnostics']),
  mod('mobile', 'Mobile PWA', 'R2', 'Business', ['Owner day sheet', 'Order capture', 'Camera scan', 'Offline queue']),
]

export function defaultConfig(): Config {
  return {
    pack: 'textile',
    theme: { preset: 'neel', accent: '#23307A', radius: 4, density: 'compact', custom: false },
    drcr: 'accounting',
    layouts: { books: 'ledger', cashier: 'counter', party: 'table', stock: 'table', day: 'sheet' },
    terms: { ...TERM_BASE },
    lang: 'en',
    company: { legal: 'Malabar Textiles and Home Private Limited', display: 'Malabar Home', tagline: 'Weaves, linens and everyday wear since 1987', gstin: '32AABCM4417K1ZP' },
    branches: [
      { id: 'kochi', name: 'Kochi Main', legal: 'Malabar Textiles and Home Private Limited', display: 'Malabar Home Kochi', tagline: 'MG Road, Ernakulam', gstin: '32AABCM4417K1ZP', city: 'Kochi' },
      { id: 'kozhikode', name: 'Kozhikode', legal: 'Malabar Textiles and Home Private Limited', display: 'Malabar Home Calicut', tagline: 'Mittai Theruvu', gstin: '32AABCM4417K1ZP', city: 'Kozhikode' },
      { id: 'thrissur', name: 'Thrissur', legal: 'Malabar Home Retail LLP', display: 'Malabar Home Thrissur', tagline: 'Round South', gstin: '32AAHFM2210L1Z5', city: 'Thrissur' },
    ],
    modules: JSON.parse(JSON.stringify(DEFAULT_MODULES)),
    menu: JSON.parse(JSON.stringify(DEFAULT_MENU)),
    homes: { counter: 'billing', books: 'vouchers', owner: 'owner' },
    numbering: [
      { id: 'n1', doc: 'Sales invoice', prefix: 'INV/26-27/', padding: 5, start: 1043, reset: 'yearly', branchWise: true },
      { id: 'n2', doc: 'Purchase order', prefix: 'PO/', padding: 4, start: 219, reset: 'yearly', branchWise: false },
      { id: 'n3', doc: 'Receipt voucher', prefix: 'RV-', padding: 4, start: 311, reset: 'yearly', branchWise: true },
      { id: 'n4', doc: 'Payment voucher', prefix: 'PV-', padding: 4, start: 188, reset: 'yearly', branchWise: true },
      { id: 'n5', doc: 'Credit note', prefix: 'CN/', padding: 4, start: 27, reset: 'yearly', branchWise: true },
    ],
    pipelines: [
      { id: 'p1', name: 'Sales documents', stages: [{ id: 's1', name: 'Enquiry', kind: 'start', sla: 2, owner: 'Salesperson' }, { id: 's2', name: 'Quotation', kind: 'step', sla: 3, owner: 'Salesperson', back: 's1' }, { id: 's3', name: 'Order', kind: 'approval', sla: 2, owner: 'Store manager', back: 's2', tone: 'haldi' }, { id: 's4', name: 'Challan', kind: 'step', sla: 1, owner: 'Godown keeper' }, { id: 's5', name: 'Invoice', kind: 'end', owner: 'Accountant', tone: 'mehndi' }] },
      { id: 'p2', name: 'Purchase documents', stages: [{ id: 'q1', name: 'Purchase order', kind: 'start' }, { id: 'q2', name: 'Goods receipt', kind: 'step' }, { id: 'q3', name: 'Purchase invoice', kind: 'end' }] },
      { id: 'p3', name: 'Lead pipeline', stages: [{ id: 'l1', name: 'New', kind: 'start' }, { id: 'l2', name: 'Contacted', kind: 'step' }, { id: 'l3', name: 'Quoted', kind: 'step' }, { id: 'l4', name: 'Won', kind: 'end' }] },
    ],
    workflows: [
      { id: 'w1', name: 'Overdue reminder', trigger: 'Invoice is 7 days overdue', conditions: ['Consent: WhatsApp allowed', 'Outside quiet hours'], actions: ['Send WhatsApp reminder with UPI link', 'Create task for salesperson'], on: true },
      { id: 'w2', name: 'Low stock to draft PO', trigger: 'Stock falls below reorder level', conditions: ['Item has a preferred supplier'], actions: ['Create draft purchase order', 'Notify owner'], on: true },
      { id: 'w3', name: 'Large discount check', trigger: 'Bill saved with discount above 10%', conditions: ['Cashier is not a manager'], actions: ['Request approval from manager', 'Hold bill until approved'], on: false },
    ],
    approvals: [
      { id: 'a1', name: 'Bill discount', doc: 'Sales invoice', rule: 'Discount above 10 percent', steps: [{ role: 'Store manager', limit: 25000 }, { role: 'Owner', limit: 0 }], on: true },
      { id: 'a2', name: 'Journal voucher', doc: 'Journal', rule: 'Any journal over amount', steps: [{ role: 'CA', limit: 100000 }], on: true },
      { id: 'a3', name: 'Purchase order', doc: 'Purchase order', rule: 'Value above limit', steps: [{ role: 'Accountant', limit: 50000 }, { role: 'Owner', limit: 0 }], on: false },
    ],
    fields: {
      item: [
        { id: 'name', label: 'Item name', type: 'text', required: true, visible: true, locked: true },
        { id: 'hsn', label: 'HSN code', type: 'text', required: true, visible: true, locked: true },
        { id: 'gst', label: 'GST rate (%)', type: 'select', required: true, visible: true, locked: true, options: ['0', '5', '12', '18', '28'] },
        { id: 'unit', label: 'Primary unit', type: 'select', required: true, visible: true, options: ['Pcs', 'Mtr', 'Box', 'Kg'] },
        { id: 'mrp', label: 'MRP', type: 'number', required: false, visible: true },
        ...PACKS[0].fields.item,
      ],
      party: [
        { id: 'name', label: 'Name', type: 'text', required: true, visible: true, locked: true },
        { id: 'phone', label: 'Mobile', type: 'text', required: true, visible: true },
        { id: 'gstin', label: 'GSTIN', type: 'text', required: false, visible: true },
        { id: 'city', label: 'City', type: 'text', required: false, visible: true },
        { id: 'limit', label: 'Credit limit', type: 'number', required: false, visible: true },
        { id: 'consent', label: 'WhatsApp consent', type: 'yesno', required: false, visible: true },
      ],
      invoice: [
        { id: 'ref', label: 'Customer PO reference', type: 'text', required: false, visible: false },
        { id: 'vehicle', label: 'Vehicle number', type: 'text', required: false, visible: false },
      ],
    },
  }
}

export const GUARDRAILS = ['Field masking by role', 'Audit trail', 'Period locks', 'Posting immutability (reversals only)', 'Signed tax rule packs']
export const LAYERS = ['Platform default', 'Industry pack', 'Tenant', 'Company', 'Branch', 'Role', 'User']

export function term(cfg: Config, s: string): string {
  return s.replace(/\{(\w+)\}/g, (_, k, off) => { const v = cfg.terms[k] ?? TERM_BASE[k] ?? k; return off === 0 ? v : v.charAt(0).toLowerCase() + v.slice(1) })
}
