import { createStore } from './store'
import { defaultConfig, term, PACKS, PACK_HISTORY, PRESETS, type Config, type Mode, type PackId, type FieldDef } from './config'
import { SEED_ITEMS, SEED_PARTIES, SEED_LEDGERS, SEED_VOUCHERS, SEED_APPROVALS, SEED_CONFLICTS, SEED_NOTICES, seedInvoices, type Item, type Party, type Ledger, type Invoice, type Voucher, type Approval, type Conflict, type HeldBill, type Notice, type Line } from './data'
import { contrast, onColor, mix } from './fmt'
import { tr } from './i18n'

export interface Change { id: string; at: string; by: string; version: number; summary: string[]; note: string; snapshot: Config }
export interface AppState {
  published: Config; draft: Config; changes: Change[]; version: number
  mode: Mode; route: string; tabs: string[]; night: boolean; margin: boolean; branchId: string; fy: string
  items: Item[]; parties: Party[]; ledgers: Ledger[]; invoices: Invoice[]; vouchers: Voucher[]; approvals: Approval[]; conflicts: Conflict[]; held: HeldBill[]; notices: Notice[]
  rows: Record<string, Record<string, string | number>[]>
  bill: { partyId: string; lines: Line[]; note: string }
  offline: boolean; pending: number; aiOn: boolean
}
const cfg0 = defaultConfig()
const init: AppState = {
  published: cfg0, draft: cfg0, changes: [], version: 1,
  mode: 'owner', route: 'owner', tabs: ['owner'], night: false, margin: true, branchId: 'kochi', fy: '2026-27',
  items: SEED_ITEMS.textile, parties: SEED_PARTIES, ledgers: SEED_LEDGERS, invoices: seedInvoices(SEED_ITEMS.textile), vouchers: SEED_VOUCHERS, approvals: SEED_APPROVALS, conflicts: SEED_CONFLICTS, held: [], notices: SEED_NOTICES,
  rows: {}, bill: { partyId: 'c0', lines: [], note: '' }, offline: false, pending: 0, aiOn: true,
}
export const app = createStore<AppState>('erp-proto-v4', init, ['published', 'draft', 'changes', 'version', 'mode', 'night', 'margin', 'branchId', 'items', 'parties', 'ledgers', 'invoices', 'vouchers', 'approvals', 'conflicts', 'held', 'notices', 'rows', 'bill', 'offline', 'pending', 'aiOn'])
export const set = app.set
export const get = app.get
export const useApp = app.use

/* toast */
export interface Toast { id: number; text: string; tone: 'ok' | 'warn' | 'err' | 'info'; undo?: () => void }
export const toasts = createStore<{ list: Toast[] }>('toasts', { list: [] }, [])
let tid = 0
export function toast(text: string, tone: Toast['tone'] = 'ok', undo?: () => void) {
  const id = ++tid
  toasts.set((s) => ({ list: [...s.list, { id, text, tone, undo }] }))
  setTimeout(() => toasts.set((s) => ({ list: s.list.filter((t) => t.id !== id) })), 4500)
}

/* navigation */
export const MODE_HOME: Record<Mode, string> = { counter: 'billing', books: 'vouchers', owner: 'owner', studio: 'studio/overview' }
export const homeOf = (m: Mode) => (m === 'studio' ? MODE_HOME.studio : get().draft.homes?.[m] ?? MODE_HOME[m])
export function go(route: string) {
  const s = get()
  const base = route.split('/')[0]
  const tabs = route.startsWith('studio') ? s.tabs : s.tabs.includes(route) ? s.tabs : [...s.tabs, route].slice(-8)
  set({ route, tabs: base === 'studio' ? s.tabs : tabs })
  if (location.hash !== '#/' + route) location.hash = '/' + route
}
export function closeTab(r: string) {
  const s = get()
  const tabs = s.tabs.filter((t) => t !== r)
  set({ tabs })
  if (s.route === r) go(tabs[tabs.length - 1] ?? homeOf(s.mode))
}
export function setMode(m: Mode) {
  set({ mode: m })
  go(homeOf(m))
}
export function syncFromHash() {
  const r = location.hash.replace(/^#\//, '')
  if (r && r !== get().route) {
    const s = get()
    set({ route: r, tabs: s.tabs.includes(r) || r.startsWith('studio') ? s.tabs : [...s.tabs, r].slice(-8) })
  }
}

/* config drafting */
export const cfg = () => get().draft
export function edit(fn: (c: Config) => void) {
  const c: Config = JSON.parse(JSON.stringify(get().draft))
  fn(c)
  set({ draft: c })
}
const SECTIONS: [keyof Config, string][] = [['pack', 'Industry pack'], ['theme', 'Theme'], ['drcr', 'Dr and Cr colour'], ['layouts', 'Layouts'], ['terms', 'Terminology'], ['lang', 'Language'], ['company', 'Shop identity'], ['branches', 'Branch identity'], ['modules', 'Modules and features'], ['menu', 'Menu'], ['homes', 'Role home screens'], ['numbering', 'Document numbering'], ['pipelines', 'Pipelines'], ['workflows', 'Workflows'], ['approvals', 'Approval chains'], ['fields', 'Forms and fields']]
export function pendingChanges(): string[] {
  const { published, draft } = get()
  return SECTIONS.filter(([k]) => JSON.stringify(published[k]) !== JSON.stringify(draft[k])).map(([, l]) => l)
}
export function discardDraft() {
  set((s) => ({ draft: s.published }))
  toast('Draft discarded. The shell shows the published setup.', 'info')
}

export function themeVars(c: Config, night: boolean) {
  const p = PRESETS.find((x) => x.id === c.theme.preset) ?? PRESETS[0]
  const t = night ? p.night : p.day
  let accent = t.accent
  if (c.theme.custom) accent = night ? (contrast(c.theme.accent, '#151C33') >= 4.5 ? c.theme.accent : mix(c.theme.accent, '#ffffff', 0.6)) : c.theme.accent
  return { accent, cotton: t.cotton, sheet: t.sheet, ink: t.ink, rule: t.rule, on: onColor(accent), night }
}
export interface Check { id: string; label: string; ok: boolean; detail: string }
export function runChecks(c: Config): Check[] {
  const out: Check[] = []
  for (const night of [false, true]) {
    const v = themeVars(c, night)
    const a = contrast(v.accent, v.sheet), b = contrast(v.accent, v.on)
    out.push({ id: 'c' + night, label: `Contrast, ${night ? 'Night' : 'Day'} theme`, ok: a >= 4.5 && b >= 4.5, detail: `Accent on surface ${a.toFixed(1)}:1, label on accent ${b.toFixed(1)}:1. Needs 4.5:1.` })
  }
  const longest = c.menu.flatMap((g) => g.items.filter((i) => i.visible).map((i) => ({ label: i.label.replace(/\{(\w+)\}/g, (_, k) => c.terms[k] ?? k) }))).sort((x, y) => y.label.length - x.label.length)[0]
  const L = longest ? Math.ceil(longest.label.length * 1.4) : 0
  out.push({ id: 'te', label: 'Text expansion at 140%', ok: L <= 34 && c.company.display.length * 1.4 <= 52, detail: longest ? `Longest menu label "${longest.label}" grows to ${L} characters. Limit is 34.` : 'No labels.' })
  const vis = (m: Mode) => c.menu.flatMap((g) => g.items).filter((i) => i.visible && i.modes.includes(m) && c.modules.find((x) => x.id === i.module)?.on)
  const billing = vis('counter').some((i) => i.route === 'billing')
  const none = (['books', 'owner'] as Mode[]).filter((m) => vis(m).length === 0)
  out.push({ id: 'kb', label: 'Keyboard path', ok: billing && none.length === 0 && c.menu.length <= 12, detail: !billing ? 'Counter mode has no way to reach billing.' : none.length ? `${none.join(', ')} mode would have an empty menu.` : 'Every role reaches its home screen and billing by keyboard.' })
  const locked = c.modules.filter((m) => m.locked && !m.on)
  out.push({ id: 'gr', label: 'Guardrails intact', ok: locked.length === 0, detail: locked.length ? 'Platform and Identity modules cannot be switched off.' : 'Audit trail, masking, period locks and signed tax packs are untouched.' })
  const bad = ['item', 'party'].filter((e) => !c.fields[e].every((f) => !f.locked || (f.required && f.visible)))
  out.push({ id: 'rf', label: 'Statutory fields', ok: bad.length === 0, detail: bad.length ? 'HSN, GST rate and name must stay visible and required.' : 'HSN, GST rate and name are still required.' })
  const issues = pipelineIssues(c)
  out.push({ id: 'pl', label: 'Pipelines are valid', ok: issues.length === 0, detail: issues[0] ?? 'Every pipeline has one start, an end, named stages and reachable steps.' })
  const hm = (['counter', 'books', 'owner'] as const).filter((m) => !vis(m).some((i) => i.route === c.homes?.[m]))
  out.push({ id: 'hm', label: 'Role homes resolve', ok: hm.length === 0, detail: hm.length ? `The home screen for ${hm.join(', ')} is hidden or not in that menu.` : 'Each work mode opens on a screen it can reach.' })
  return out
}
export function pipelineIssues(c: Config): string[] {
  const out: string[] = []
  for (const p of c.pipelines) {
    const starts = p.stages.filter((s) => s.kind === 'start').length, ends = p.stages.filter((s) => s.kind === 'end').length
    if (starts !== 1) out.push(`${p.name}: needs exactly one Start stage (has ${starts}).`)
    if (ends < 1) out.push(`${p.name}: needs at least one End stage.`)
    if (p.stages[0] && p.stages[0].kind !== 'start') out.push(`${p.name}: the first stage must be the Start.`)
    if (p.stages.length && p.stages[p.stages.length - 1].kind !== 'end') out.push(`${p.name}: the last stage must be an End.`)
    const names = p.stages.map((s) => s.name.trim().toLowerCase())
    if (names.some((n) => !n)) out.push(`${p.name}: every stage needs a name.`)
    if (new Set(names).size !== names.length) out.push(`${p.name}: stage names must be unique.`)
    p.stages.forEach((s, i) => { if (s.back && p.stages.findIndex((x) => x.id === s.back) >= i) out.push(`${p.name}: "${s.name}" can only send back to an earlier stage.`) })
    p.stages.forEach((s, i) => { if (s.kind === 'end' && i < p.stages.length - 1) out.push(`${p.name}: "${s.name}" ends the flow but stages follow it.`) })
  }
  return out
}
export function publish(note: string): boolean {
  const s = get()
  const checks = runChecks(s.draft)
  if (checks.some((c) => !c.ok)) {
    toast('Publishing is blocked. Fix the failing checks first.', 'err')
    return false
  }
  const summary = pendingChanges()
  if (!summary.length) return false
  const version = s.version + 1
  const ch: Change = { id: 'ch' + version, at: new Date().toLocaleString('en-IN'), by: 'Super admin', version, summary, note: note || 'No note', snapshot: JSON.parse(JSON.stringify(s.draft)) }
  set({ published: s.draft, version, changes: [ch, ...s.changes] })
  toast(`Version ${version} published to all ${s.draft.branches.length} branches.`)
  return true
}
export function rollback(ch: Change) {
  const s = get()
  const version = s.version + 1
  const snap = JSON.parse(JSON.stringify(ch.snapshot))
  set({ published: snap, draft: snap, version, changes: [{ id: 'ch' + version, at: new Date().toLocaleString('en-IN'), by: 'Super admin', version, summary: ['Rollback'], note: `Rolled back to version ${ch.version}`, snapshot: snap }, ...s.changes] })
  toast(`Rolled back to version ${ch.version}.`, 'info')
}
export function safeMode() {
  const s = get()
  const d = defaultConfig()
  const version = s.version + 1
  set({ published: d, draft: d, version, changes: [{ id: 'ch' + version, at: new Date().toLocaleString('en-IN'), by: 'Super admin', version, summary: ['Safe mode reset'], note: 'Tenant reset to platform default', snapshot: d }, ...s.changes] })
  toast('Safe mode: tenant reset to the platform default. Data was not touched.', 'warn')
}
/** What installing a pack would change in the current draft, so the person can review it first. */
export function packPreview(id: PackId): [string, string, string][] {
  const pack = PACKS.find((p) => p.id === id)!, c = get().draft, base = defaultConfig().terms as Record<string, string>
  const out: [string, string, string][] = []
  Object.keys(base).forEach((k) => { const to = (pack.terms as Record<string, string>)[k] ?? base[k]; const from = c.terms[k] ?? base[k]; if (to !== from) out.push([`Word for "${base[k].toLowerCase()}"`, from, to]) })
  const pr = (x: string) => PRESETS.find((q) => q.id === x)?.name ?? x
  if (c.theme.preset !== pack.preset) out.push(['Theme', pr(c.theme.preset), pr(pack.preset)])
  if (c.layouts.cashier !== pack.cashier) out.push(['Cashier layout', c.layouts.cashier, pack.cashier])
  const now = new Set(c.modules.filter((m) => m.on).map((m) => m.id))
  c.modules.forEach((m) => { if (m.locked) return; const want = !pack.modulesOff.includes(m.id); if (want !== now.has(m.id)) out.push([`Module ${m.name}`, now.has(m.id) ? 'on' : 'off', want ? 'on' : 'off']) })
  ;(['item', 'party'] as const).forEach((e) => {
    const gone = c.fields[e].filter((f) => f.custom).map((f) => f.label), add = (pack.fields[e] ?? []).map((f) => f.label)
    gone.filter((x) => !add.includes(x)).forEach((x) => out.push([`${e === 'item' ? 'Item' : 'Party'} field`, x, 'removed']))
    add.filter((x) => !gone.includes(x)).forEach((x) => out.push([`${e === 'item' ? 'Item' : 'Party'} field`, 'none', x + ' added']))
  })
  out.push(['Demo items', `${get().items.length} items`, 'replaced with the pack demo set'])
  return out
}
/** Add the fields a newer pack version brings, keeping everything the tenant added. Demo data is untouched. */
export function upgradePack(id: PackId) {
  const pack = PACKS.find((p) => p.id === id)!
  const from = get().draft.packVer ?? '1.0.0'
  edit((c) => {
    c.packVer = pack.version
    ;(['item', 'party'] as const).forEach((e) => { (pack.fields[e] ?? []).forEach((f) => { if (!c.fields[e].some((x) => x.id === f.id)) c.fields[e].push({ ...f }) }) })
  })
  const note = PACK_HISTORY[id]?.find((h) => h.v === pack.version)?.note ?? ''
  set((s) => ({ rows: { ...s.rows, packlog: [{ id: 'pl' + Date.now(), pack: id, from, to: pack.version, at: new Date().toLocaleString('en-IN'), what: 'Upgraded. ' + note }, ...(s.rows.packlog ?? [])] } }))
  toast(`${pack.name} pack upgraded from v${from} to v${pack.version} in your draft. Review, then publish.`, 'info')
}
export function applyPack(id: PackId) {
  const pack = PACKS.find((p) => p.id === id)!
  edit((c) => {
    c.pack = id
    c.packVer = pack.version
    c.terms = { ...defaultConfig().terms, ...(pack.terms as Record<string, string>) }
    c.theme = { ...c.theme, preset: pack.preset, custom: false }
    c.layouts.cashier = pack.cashier
    c.modules.forEach((m) => { if (!m.locked) m.on = !pack.modulesOff.includes(m.id) })
    const keep = (arr: FieldDef[]) => arr.filter((f) => !f.custom)
    ;(['item', 'party'] as const).forEach((e) => { c.fields[e] = [...keep(c.fields[e]), ...(pack.fields[e] ?? [])] })
  })
  const items = SEED_ITEMS[id]
  set((s) => ({ items, invoices: seedInvoices(items), bill: { partyId: 'c0', lines: [], note: '' }, rows: { ...s.rows, packlog: [{ id: 'pl' + Date.now(), pack: id, from: '', to: pack.version, at: new Date().toLocaleString('en-IN'), what: 'Installed' }, ...(s.rows.packlog ?? [])], packsetup: (s.rows.packsetup ?? []).filter((r) => !String(r.id).startsWith(id + ':')) } }))
  toast(`${pack.name} pack v${pack.version} installed as a draft. Review, then publish.`, 'info')
}
export function nextNo(doc: string) {
  const n = get().published.numbering.find((x) => x.doc === doc)
  if (!n) return 'DRAFT'
  return n.prefix + String(n.start).padStart(n.padding, '0')
}
export function bumpNo(doc: string) {
  set((s) => {
    const c = JSON.parse(JSON.stringify(s.published)) as Config
    const d = JSON.parse(JSON.stringify(s.draft)) as Config
    ;[c, d].forEach((x) => { const n = x.numbering.find((y) => y.doc === doc); if (n) n.start += 1 })
    return { published: c, draft: d }
  })
}
/* terminology and menu helpers */
export const useCfg = () => useApp((s) => s.draft)
export { term } from './config'

export function labelOf(c: Config, i: { label: string; ml?: string; hi?: string }): string {
  const o = c.lang === 'ml' ? i.ml : c.lang === 'hi' ? i.hi : undefined
  return term(c, o || tr(c.lang, i.label))
}
