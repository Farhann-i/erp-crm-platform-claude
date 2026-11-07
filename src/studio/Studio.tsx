import { useState } from 'react'
import { useApp, set, go, edit, pendingChanges, runChecks, themeVars, applyPack, toast, discardDraft } from '../lib/app'
import { PRESETS, PACKS, PENDING_INDUSTRIES, LAYERS, GUARDRAILS, TERM_BASE, TRANS, type Lang } from '../lib/config'
import { contrast } from '../lib/fmt'
import { Btn, Seg, Toggle, Field, PageHead, Status, Bal, Modal } from '../ui/kit'
import { Icon } from '../ui/icons'
import { PrintPreview } from '../ui/PrintPreview'
import { MenuBuilder, Modules, Designer, Chains, Numbering, Forms } from './StudioBuild'
import { ChangeTape, PublishModal } from './StudioPublish'
import { PreviewDock } from './Preview'

const NAV: [string, string, string][] = [
  ['overview', 'Overview', 'dash'], ['packs', 'Industry packs', 'store'], ['theme', 'Theme', 'palette'], ['identity', 'Shop identity', 'building'], ['layouts', 'Layouts', 'layers'], ['terms', 'Terms and language', 'lang'],
  ['menu', 'Menu builder', 'menu'], ['modules', 'Modules and features', 'toggle'], ['workflows', 'Workflows and pipelines', 'workflow'], ['approvals', 'Approval chains', 'check'], ['numbering', 'Document numbering', 'order'], ['forms', 'Forms and fields', 'form'], ['changes', 'Change tape', 'history'],
]
export function Studio() {
  const route = useApp((s) => s.route)
  const version = useApp((s) => s.version)
  const draft = useApp((s) => s.draft)
  const pend = pendingChanges()
  const tab = route.split('/')[1] || 'overview'
  const [pub, setPub] = useState(false)
  const [dock, setDock] = useState(() => window.innerWidth >= 1280)
  const fails = runChecks(draft).filter((c) => !c.ok).length
  const body = { overview: <Overview />, packs: <Packs />, theme: <Theme />, identity: <Identity />, layouts: <Layouts />, terms: <Terms />, menu: <MenuBuilder />, modules: <Modules />, workflows: <Designer />, approvals: <Chains />, numbering: <Numbering />, forms: <Forms />, changes: <ChangeTape /> }[tab] ?? <Overview />
  return (
    <div className="flex-1 min-h-0 flex">
      <nav aria-label="Admin Studio" className="w-[216px] shrink-0 bg-sheet border-r border-rule py-3 scroll">
        <div className="px-4 pb-2"><div className="font-semibold">Admin Studio</div><div className="text-xs muted">Super admin · {draft.company.display}</div></div>
        {NAV.map(([id, l, ic]) => <button key={id} onClick={() => go('studio/' + id)} aria-current={tab === id ? 'page' : undefined} className={`w-full h-8 px-4 flex items-center gap-2.5 text-[13px] text-left relative ${tab === id ? 'bg-neel/10 text-neel font-medium' : 'hover:bg-wash'}`}>{tab === id && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-neel" />}<Icon n={ic} size={15} />{l}{id === 'changes' && pend.length > 0 && <span className="chip ml-auto border-haldi">{pend.length}</span>}</button>)}
        <div className="px-4 pt-4 text-[11px] muted">Live config v{version}. The app shell reads this same config, so edits show at once in preview.</div>
      </nav>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-10 shrink-0 bg-sheet border-b border-rule px-5 flex items-center gap-3 text-[13px]">
          <span className={`size-2 rounded-full ${pend.length ? 'bg-haldi' : 'bg-mehndi'}`} />
          <span>{pend.length ? `${pend.length} unpublished ${pend.length === 1 ? 'change' : 'changes'}` : 'Draft matches published v' + version}</span>
          {fails > 0 && pend.length > 0 && <span className="chip border-sindoor text-sindoor">{fails} check{fails > 1 ? 's' : ''} failing</span>}
          <span className="flex-1" />
          <Btn icon="panel" onClick={() => setDock(!dock)} aria-pressed={dock}>{dock ? 'Hide preview' : 'Live preview'}</Btn>
          <Btn disabled={!pend.length} onClick={discardDraft}>Discard draft</Btn>
          <Btn kind="primary" icon="upload" disabled={!pend.length} onClick={() => setPub(true)}>Review and publish</Btn>
        </div>
        <div className="flex-1 min-h-0 flex"><div className="flex-1 min-w-0 scroll">{body}</div>{dock && <PreviewDock />}</div>
      </div>
      <PublishModal open={pub} onClose={() => setPub(false)} />
    </div>
  )
}


const Sec = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <section className="mx-5 mb-5"><h2 className="font-semibold text-[15px]">{title}</h2>{sub && <p className="text-[13px] muted mb-2 max-w-3xl">{sub}</p>}<div className="mt-2">{children}</div></section>
)

function Overview() {
  const c = useApp((s) => s.draft)
  const del = useApp((s) => (s.rows.delegation as never) as Record<string, boolean> | undefined) ?? { Theme: true, 'Shop identity': true, Terms: false, Menu: false, Workflows: true, 'Document numbering': false }
  const ai = useApp((s) => s.aiOn)
  const pack = PACKS.find((p) => p.id === c.pack)!
  return (
    <>
      <PageHead title="Customisation control panel" sub="Everything the app shows is read from one tenant configuration. Change it here, preview it live, then publish with a version and a rollback." crumbs={['Admin Studio']} />
      <Sec title="Configuration layers" sub="Settings resolve in this order. A higher layer overrides a lower one only where the setting allows it.">
        <ol className="flex flex-wrap gap-0 panel overflow-hidden">
          {LAYERS.map((l, i) => <li key={l} className={`flex-1 min-w-32 px-3 py-2.5 text-[13px] border-r border-rule last:border-0 ${l === 'Tenant' ? 'bg-neel/10' : ''}`}><div className="text-xs muted">{i + 1}</div><div className="font-medium">{l}</div><div className="text-xs muted">{['Our defaults', pack.name, c.company.display, 'Legal entity', 'Per branch', 'Per role', 'Per person'][i]}</div></li>)}
        </ol>
      </Sec>
      <div className="grid xl:grid-cols-2 gap-x-5">
        <Sec title="Cannot be weakened by any setting" sub="These protect the books. They are locked for every tier, including super admin.">
          <ul className="panel divide-y divide-rule">{GUARDRAILS.map((g) => <li key={g} className="px-3 h-9 flex items-center gap-2 text-[13px]"><Icon n="lock" size={14} className="muted" />{g}<span className="ml-auto chip">Locked</span></li>)}</ul>
        </Sec>
        <Sec title="Delegate to the tenant admin console" sub="Choose which areas the client's own administrator may change. The rest stays with Super Admin Studio.">
          <ul className="panel divide-y divide-rule">{Object.entries(del).map(([k, v]) => <li key={k} className="px-3 h-9 flex items-center justify-between text-[13px]">{k}<Toggle on={v} label={`Delegate ${k}`} onChange={(x) => { set((s) => ({ rows: { ...s.rows, delegation: { ...del, [k]: x } as never } })); toast(`${k} ${x ? 'delegated to' : 'taken back from'} the tenant admin.`, 'info') }} /></li>)}</ul>
        </Sec>
      </div>
      <Sec title="Tenant" sub="Quick switches that are also available in their own tabs.">
        <div className="panel divide-y divide-rule text-[13px]">
          <div className="px-3 h-10 flex items-center justify-between"><span>Industry pack</span><span className="flex items-center gap-2">{pack.name} <span className="chip">v{pack.version}</span><Btn className="btn-sm" onClick={() => go('studio/packs')}>Change</Btn></span></div>
          <div className="px-3 h-10 flex items-center justify-between"><span>AI assistant kill switch</span><span className="flex items-center gap-2 text-xs muted">{ai ? 'Assistant on' : 'Assistant off'}<Toggle on={ai} label="AI assistant" onChange={(v) => { set({ aiOn: v }); toast(v ? 'Assistant enabled.' : 'Assistant switched off for every user.', v ? 'ok' : 'warn') }} /></span></div>
          <div className="px-3 h-10 flex items-center justify-between"><span>Open the app as this tenant</span><Btn className="btn-sm" onClick={() => { set({ mode: 'owner' }); go('owner') }}>Open Owner mode</Btn></div>
        </div>
      </Sec>
    </>
  )
}

function Packs() {
  const c = useApp((s) => s.draft)
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <>
      <PageHead title="Industry packs" sub="A pack bundles terminology, theme, modules, fields, forms and print templates and installs as one signed unit." crumbs={['Admin Studio', 'Packs']} />
      <div className="mx-5 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
        {PACKS.map((p) => {
          const pr = PRESETS.find((x) => x.id === p.preset)!
          const on = c.pack === p.id
          return (
            <article key={p.id} className={`panel p-4 flex flex-col gap-2 ${on ? 'border-neel ring-1 ring-neel' : ''}`}>
              <div className="flex items-start justify-between"><h3 className="font-semibold">{p.name}</h3>{on ? <span className="chip border-mehndi text-mehndi">Installed</span> : <span className="chip">v{p.version}</span>}</div>
              <p className="text-[13px] muted flex-1">{p.blurb}</p>
              <div className="flex gap-1">{[pr.day.accent, pr.day.cotton, pr.day.sheet, pr.night.cotton].map((x, i) => <span key={i} className="size-5 rounded border border-rule" style={{ background: x }} />)}<span className="text-xs muted ml-1">{pr.name} theme</span></div>
              <div className="text-xs"><span className="muted">Says: </span>{[p.terms.customer ?? 'Customer', p.terms.item ?? 'Item', p.terms.godown ?? 'Godown'].join(', ')}</div>
              <div className="text-xs muted">Signed unit · {Object.values(p.fields).flat().length} fields · {p.modulesOff.length ? `${p.modulesOff.length} module off` : 'all modules'} · {p.cashier === 'tile' ? 'Tile POS' : 'Counter lane'} default</div>
              <Btn kind={on ? '' : 'primary'} disabled={on} onClick={() => setConfirm(p.id)}>{on ? 'Installed' : 'Install as draft'}</Btn>
            </article>
          )
        })}
      </div>
      <Sec title="Pending industries" sub="Fourteen more are on the list. They are not drafted yet.">
        <div className="flex flex-wrap gap-1.5">{PENDING_INDUSTRIES.map((x) => <span key={x} className="chip h-7 px-3 bg-sheet">{x}</span>)}</div>
      </Sec>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Install this pack as a draft?" foot={<><Btn onClick={() => setConfirm(null)}>Cancel</Btn><Btn kind="primary" onClick={() => { applyPack(confirm as never); setConfirm(null) }}>Install as draft</Btn></>}>
        <p>Terminology, theme, modules, fields and the cashier layout change in your draft. Demo items for that industry are loaded. Nothing goes live until you publish, and you can roll back.</p>
      </Modal>
    </>
  )
}

function MiniApp({ night }: { night: boolean }) {
  const c = useApp((s) => s.draft)
  const v = themeVars(c, night)
  return (
    <div className="rounded-lg overflow-hidden border border-rule text-[12px]" style={{ background: v.cotton, color: v.ink, ['--ink' as string]: v.ink, ['--rule' as string]: v.rule, ['--neel' as string]: v.accent, ['--sheet' as string]: v.sheet }}>
      <div className="h-8 px-3 flex items-center justify-between" style={{ background: v.accent, color: v.on }}><b>{c.branches[0].display}</b><span className="opacity-80">Ctrl+K</span></div>
      <div className="flex"><div className="w-24 p-2 space-y-1.5 border-r" style={{ background: v.sheet, borderColor: v.rule }}>{['Day sheet', 'Billing', 'Vouchers'].map((x, i) => <div key={x} className="px-1.5 py-1 rounded" style={i === 1 ? { background: v.accent + '1f', color: v.accent, fontWeight: 600 } : {}}>{x}</div>)}</div>
        <div className="flex-1 p-3 space-y-2"><div className="rounded p-2 border" style={{ background: v.sheet, borderColor: v.rule, borderRadius: c.theme.radius * 2 }}><div className="flex justify-between"><span>Anitha Menon</span><b className="font-[family-name:var(--font-num)]">₹12,400 Dr</b></div><div className="mt-2 flex gap-2"><span className="px-2 py-1 font-medium" style={{ background: v.accent, color: v.on, borderRadius: c.theme.radius }}>Save bill</span><span className="px-2 py-1 border" style={{ borderColor: v.rule, borderRadius: c.theme.radius }}>Hold</span></div></div>
          <div className="flex gap-2"><span className="px-2 rounded-full border" style={{ borderColor: '#E8A317' }}>Draft</span><span className="px-2 rounded-full border" style={{ borderColor: v.rule }}>Posted</span></div></div></div>
    </div>
  )
}
function Theme() {
  const c = useApp((s) => s.draft)
  const night = useApp((s) => s.night)
  const cur = PRESETS.find((p) => p.id === c.theme.preset)!
  const v = themeVars(c, night)
  const ratio = contrast(v.accent, v.sheet)
  return (
    <>
      <PageHead title="Theme" sub="Pick a preset or build a custom one. Publishing is blocked if contrast fails in Day or Night." crumbs={['Admin Studio', 'Theme']}><Seg label="Preview theme" value={night ? 'n' : 'd'} onChange={(x) => set({ night: x === 'n' })} opts={[{ id: 'd', label: 'Day' }, { id: 'n', label: 'Night' }]} /></PageHead>
      <div className="grid xl:grid-cols-[1fr_420px] gap-x-5">
        <div>
          <Sec title="Presets">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              {PRESETS.map((p) => { const t = night ? p.night : p.day; const on = c.theme.preset === p.id && !c.theme.custom; return (
                <button key={p.id} aria-pressed={on} onClick={() => edit((x) => { x.theme.preset = p.id; x.theme.custom = false; x.theme.accent = p.day.accent })} className={`panel p-2.5 text-left hover:border-neel ${on ? 'border-neel ring-1 ring-neel' : ''}`}>
                  <div className="h-10 rounded flex overflow-hidden border border-rule"><span className="flex-1" style={{ background: t.accent }} /><span className="flex-1" style={{ background: t.sheet }} /><span className="flex-1" style={{ background: t.cotton }} /></div>
                  <div className="font-medium text-[13px] mt-1.5">{p.name}{p.id === 'neel' && <span className="chip ml-2">Default</span>}</div><div className="text-xs muted">{p.note}</div>
                </button>) })}
            </div>
          </Sec>
          <Sec title="Custom theme" sub="Start from the selected preset and change the accent, corner radius and density.">
            <div className="panel p-4 grid sm:grid-cols-2 gap-4 max-w-2xl">
              <Field label="Accent colour" hint={`Contrast on surface ${ratio.toFixed(1)}:1 in ${night ? 'Night' : 'Day'}. Needs 4.5:1.`} error={ratio < 4.5 ? 'Too light. Publishing will be blocked.' : undefined}>
                <div className="flex gap-2"><input type="color" aria-label="Accent colour picker" className="h-[30px] w-12 rounded border border-rule bg-sheet" value={c.theme.custom ? c.theme.accent : cur.day.accent} onChange={(e) => edit((x) => { x.theme.accent = e.target.value; x.theme.custom = true })} /><input className="inp num text-left" aria-label="Accent hex" value={c.theme.custom ? c.theme.accent : cur.day.accent} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && edit((x) => { x.theme.accent = e.target.value; x.theme.custom = true })} /></div>
              </Field>
              <Field label={`Corner radius, ${c.theme.radius} px`}><input type="range" min={0} max={12} className="w-full" value={c.theme.radius} onChange={(e) => edit((x) => (x.theme.radius = +e.target.value))} /></Field>
              <Field label="Density"><Seg label="Density" value={c.theme.density} onChange={(d) => edit((x) => (x.theme.density = d))} opts={[{ id: 'comfort', label: 'Comfort 40' }, { id: 'compact', label: 'Compact 32' }, { id: 'ledger', label: 'Ledger 28' }]} /></Field>
              <div className="flex items-end"><Btn onClick={() => edit((x) => { x.theme.custom = false; x.theme.accent = cur.day.accent; x.theme.radius = 4 })}>Reset to preset</Btn></div>
            </div>
          </Sec>
          <Sec title="Dr and Cr colour" sub="The letter Dr or Cr always shows. This controls where colour carries the meaning (CUS-017).">
            <div className="panel p-4 max-w-2xl space-y-2" role="radiogroup" aria-label="Dr and Cr colour">
              {([['accounting', 'Accounting views only', 'Ledgers, statements, vouchers and the Tape. In dues and the Margin, the words "owes you" and "you owe" carry the meaning.'], ['everywhere', 'Colour everywhere', 'Sindoor for Dr and Mehndi for Cr in every screen.'], ['letters', 'Letters only', 'No colour. Just Dr or Cr.']] as const).map(([id, l, d]) => (
                <label key={id} className={`flex gap-3 p-2.5 rounded border cursor-pointer ${c.drcr === id ? 'border-neel bg-neel/5' : 'border-rule'}`}><input type="radio" name="drcr" checked={c.drcr === id} onChange={() => edit((x) => (x.drcr = id))} /><span className="flex-1"><span className="font-medium text-[13px]">{l}</span><span className="block text-xs muted">{d}</span></span>
                  <span className="text-right text-[12px] space-y-0.5 shrink-0"><div><span className="muted mr-2">Ledger</span><Bal v={84250} ctx="acct" /></div><div><span className="muted mr-2">Dues</span><Bal v={12400} ctx="dues" party /></div></span></label>
              ))}
            </div>
          </Sec>
        </div>
        <div className="pr-5 xl:pt-4 space-y-3"><div className="text-xs font-medium">Live preview</div><MiniApp night={false} /><MiniApp night={true} /><p className="text-xs muted">Both themes are always shown here. The whole app also updates behind you.</p></div>
      </div>
    </>
  )
}

function Identity() {
  const c = useApp((s) => s.draft)
  const [bid, setBid] = useState(c.branches[0].id)
  const b = c.branches.find((x) => x.id === bid) ?? c.branches[0]
  const upB = (p: Partial<typeof b>) => edit((x) => { const y = x.branches.find((z) => z.id === bid)!; Object.assign(y, p) })
  return (
    <>
      <PageHead title="Shop identity" sub="Each client and branch has a legal name, display name and tagline. The legal name stays on statutory documents. The display name appears in the title bar and on receipts." crumbs={['Admin Studio', 'Shop identity']} />
      <div className="grid xl:grid-cols-[400px_1fr] gap-5 mx-5">
        <div className="space-y-4">
          <div className="panel p-4 space-y-3"><h2 className="font-semibold">Company</h2>
            <Field label="Legal name" hint="Statutory documents only"><input className="inp" value={c.company.legal} onChange={(e) => edit((x) => { x.company.legal = e.target.value })} /></Field>
            <Field label="Display name"><input className="inp" value={c.company.display} onChange={(e) => edit((x) => { x.company.display = e.target.value })} /></Field>
            <Field label="Tagline"><input className="inp" value={c.company.tagline} onChange={(e) => edit((x) => { x.company.tagline = e.target.value })} /></Field>
            <LogoField />
          </div>
          <div className="panel p-4 space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">Branch</h2><select aria-label="Branch" className="inp w-40" value={bid} onChange={(e) => setBid(e.target.value)}>{c.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
            <Field label="Legal name"><input className="inp" value={b.legal} onChange={(e) => upB({ legal: e.target.value })} /></Field>
            <Field label="Display name" error={!b.display.trim() ? 'A display name is needed for the title bar.' : undefined}><input className="inp" value={b.display} onChange={(e) => upB({ display: e.target.value })} /></Field>
            <Field label="Tagline"><input className="inp" value={b.tagline} onChange={(e) => upB({ tagline: e.target.value })} /></Field>
            <Field label="GSTIN"><input className="inp num text-left" value={b.gstin} onChange={(e) => upB({ gstin: e.target.value.toUpperCase() })} /></Field>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel p-4"><h2 className="font-semibold mb-3">Live print header</h2><PrintPreview c={c} b={b} /></div>
          <div className="panel p-4"><h2 className="font-semibold mb-2">Title bar</h2><div className="rounded h-10 px-3 flex items-center gap-2" style={{ background: 'var(--neel)', color: 'var(--on-neel)' }}><div className="size-6 rounded grid place-items-center text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--on-neel) 18%, transparent)' }}>{b.display.slice(0, 1)}</div><div className="leading-tight"><div className="text-[13px] font-semibold">{b.display}</div><div className="text-[10.5px] opacity-80">{b.tagline}</div></div></div></div>
        </div>
      </div>
    </>
  )
}

function Wire({ kind }: { kind: string }) {
  const g = 'currentColor'
  const box = (x: number, y: number, w: number, h: number, f = false) => <rect x={x} y={y} width={w} height={h} rx="2" fill={f ? g : 'none'} fillOpacity={f ? 0.25 : 0} stroke={g} strokeOpacity={f ? 0 : 0.5} />
  const lines = (x: number, y: number, n: number, w: number, step = 7) => Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * step} width={w} height="3" rx="1" fill={g} fillOpacity=".3" />)
  const c: Record<string, React.ReactNode> = {
    ledger: <>{box(2, 2, 116, 10)}{box(2, 15, 116, 52)}{lines(6, 20, 5, 100, 9)}{box(78, 70, 40, 9, true)}</>,
    receipt: <>{box(2, 2, 70, 77)}{lines(6, 8, 4, 56, 12)}{box(78, 2, 40, 77)}{lines(82, 10, 4, 28, 8)}{box(82, 62, 32, 10, true)}</>,
    counter: <>{box(2, 2, 76, 14)}{lines(6, 24, 4, 66, 12)}{box(84, 2, 34, 77)}{box(88, 60, 26, 14, true)}</>,
    tile: <>{[0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => <g key={r + '' + q}>{box(2 + q * 25, 4 + r * 25, 22, 22, true)}</g>))}{box(80, 2, 38, 77)}{box(84, 62, 30, 12, true)}</>,
    table: <>{box(2, 2, 116, 77)}{lines(6, 10, 7, 108, 10)}</>,
    cards: <>{[0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => <g key={r + '' + q}>{box(2 + q * 40, 4 + r * 25, 36, 21)}{lines(6 + q * 40, 10 + r * 25, 2, 24, 7)}</g>))}</>,
    sheet: <>{box(2, 2, 116, 77)}{[0, 1, 2, 3].map((i) => <g key={i}>{lines(8, 8 + i * 18, 1, 40)}{lines(8, 16 + i * 18, 1, 100)}</g>)}</>,
    list: <>{[0,1,2,3].map((i)=><g key={i}>{box(2, 2 + i*20, 116, 17)}{lines(6, 7 + i*20, 1, 70)}{box(94, 6 + i*20, 20, 9, true)}</g>)}</>,
    board: <>{[0,1,2].map((q)=><g key={q}>{box(2 + q*40, 2, 36, 77)}{lines(6 + q*40, 8, 1, 24)}{box(6 + q*40, 16, 28, 14, true)}{box(6 + q*40, 34, 28, 14)}</g>)}</>,
    split: <>{box(2, 2, 56, 77)}{box(62, 2, 56, 77)}{lines(6, 8, 5, 46, 13)}{lines(66, 8, 5, 46, 13)}</>,
  }
  return <svg viewBox="0 0 120 81" className="w-full h-auto" aria-hidden>{c[kind]}</svg>
}
function Layouts() {
  const c = useApp((s) => s.draft)
  const groups: { id: keyof typeof c.layouts; title: string; sub: string; who: string; opts: [string, string, string][]; open: string; mode: 'books' | 'counter' | 'owner' }[] = [
    { id: 'books', title: 'Billing for Books roles', sub: 'CUS-016', who: 'Accountants and managers', open: 'billing', mode: 'books', opts: [['ledger', 'Ledger sheet', 'Dense grid, header row, Margin and Tape.'], ['receipt', 'Receipt rail', 'Product list with a receipt that builds beside it.']] },
    { id: 'cashier', title: 'Billing for the cashier', sub: 'CUS-016', who: 'Cashiers and billing operators', open: 'billing', mode: 'counter', opts: [['counter', 'Counter lane', 'Barcode first, large lines and one big Tender button.'], ['tile', 'Tile POS', 'Category tiles, global search and a bill on the right.']] },
    { id: 'party', title: 'Customer and supplier list', sub: 'CUS-020', who: 'Books and Owner', open: 'parties', mode: 'books', opts: [['table', 'Table', 'Dense, sortable, filterable.'], ['cards', 'Cards', 'Names with balance at a glance.']] },
    { id: 'stock', title: 'Stock on hand', sub: 'CUS-020', who: 'Books and Owner', open: 'stock', mode: 'books', opts: [['table', 'Table', 'One row per item, stock per godown.'], ['cards', 'Cards', 'Totals and reorder state per item.']] },
    { id: 'approvals', title: 'Approvals', sub: 'CUS-020', who: 'Owner and approvers', open: 'approvals', mode: 'owner', opts: [['list', 'List', 'One card per request, newest first.'], ['board', 'Board', 'Pending, Approved and Rejected side by side.']] },
    { id: 'items', title: 'Item master', sub: 'CUS-020', who: 'Books and Owner', open: 'items', mode: 'books', opts: [['table', 'Table', 'Dense, sortable, bulk actions.'], ['cards', 'Cards', 'Code, rate and stock per item as tiles.']] },
    { id: 'day', title: 'Owner day sheet', sub: 'CUS-020', who: 'Owner', open: 'owner', mode: 'owner', opts: [['sheet', 'Single ruled sheet', 'Questions top to bottom.'], ['split', 'Two columns', 'Money in and out on the left, actions on the right.']] },
  ]
  return (
    <>
      <PageHead title="Layouts" sub="Where a screen has a credible alternative, the choice is a setting, not a design decision. Selecting an option switches the real screen at once." crumbs={['Admin Studio', 'Layouts']} />
      {groups.map((g) => (
        <Sec key={g.id} title={g.title} sub={`${g.sub} · ${g.who}`}>
          <div className="flex gap-3 flex-wrap items-stretch">
            {g.opts.map(([id, l, d]) => { const on = (c.layouts as Record<string, string>)[g.id] === id; return (
              <button key={id} aria-pressed={on} onClick={() => edit((x) => { (x.layouts as Record<string, string>)[g.id] = id })} className={`panel p-3 w-[250px] text-left hover:border-neel ${on ? 'border-neel ring-1 ring-neel text-neel' : ''}`}>
                <div className="bg-wash rounded p-2 mb-2 text-ink"><div className={on ? 'text-neel' : ''}><Wire kind={id} /></div></div>
                <div className="font-medium text-[13px] text-ink flex justify-between">{l}{on && <span className="chip border-neel text-neel">Selected</span>}</div><div className="text-xs muted">{d}</div>
              </button>) })}
            <div className="flex items-end"><Btn onClick={() => { set({ mode: g.mode }); go(g.open) }}>Open in the app</Btn></div>
          </div>
        </Sec>
      ))}
    </>
  )
}

function LogoField() {
  const c = useApp((s) => s.draft); const [err, setErr] = useState('')
  const pick = (f?: File) => {
    if (!f) return
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return setErr('Use a PNG, JPEG, WebP or SVG image.')
    if (f.size > 200 * 1024) return setErr(`That file is ${Math.round(f.size / 1024)} KB. Keep the logo under 200 KB.`)
    const r = new FileReader(); r.onload = () => { setErr(''); edit((x) => { x.company.logo = String(r.result) }); toast('Logo added to the draft. It shows on bills, the title bar and the sign-in screen once you publish.', 'info') }; r.readAsDataURL(f)
  }
  return (
    <Field label="Logo" hint="PNG, JPEG, WebP or SVG, under 200 KB. Prints in black and white on receipts." error={err}>
      <div className="flex items-center gap-3">{c.company.logo ? <img src={c.company.logo} alt="Current logo" className="h-12 max-w-32 object-contain border border-rule rounded bg-white p-1" /> : <span className="text-xs muted">No logo yet</span>}
        <input aria-label="Upload logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {c.company.logo && <Btn className="btn-sm" onClick={() => edit((x) => { delete x.company.logo })}>Remove</Btn>}</div>
    </Field>
  )
}
function Terms() {
  const c = useApp((s) => s.draft)
  const keys = Object.keys(TERM_BASE)
  return (
    <>
      <PageHead title="Terms and language" sub="Rename what the business calls things. The menu, forms and reports follow. Customer can become patient or guest. Godown can become store room." crumbs={['Admin Studio', 'Terms']} />
      <div className="grid xl:grid-cols-[1fr_380px] gap-5 mx-5">
        <div className="panel p-4 space-y-3"><div className="flex flex-wrap items-end gap-3"><Field label="Start from an industry dictionary" hint="Replaces the English words below. Nothing else changes."><select aria-label="Industry dictionary" className="inp w-56" value="" onChange={(e) => { const p = PACKS.find((x) => x.id === e.target.value); if (p) { edit((x) => { x.terms = { ...TERM_BASE, ...(p.terms as Record<string, string>) } }); toast(`${p.name} words loaded into the draft.`, 'info') } }}><option value="" disabled>Choose an industry…</option>{PACKS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>
          <table className="tbl"><thead><tr><th>Platform term</th><th>English</th><th>മലയാളം</th><th>हिन्दी</th></tr></thead><tbody>{keys.map((k) => { const en = c.terms[k] ?? TERM_BASE[k]; return <tr key={k}><td className="muted">{TERM_BASE[k]}</td><td><input className="inp h-7" aria-label={`Term for ${TERM_BASE[k]}`} value={c.terms[k] ?? ''} onChange={(e) => edit((x) => { x.terms[k] = e.target.value })} /></td>
            {(['ml', 'hi'] as const).map((l) => <td key={l}><input lang={l} className="inp h-7" aria-label={`${l === 'ml' ? 'Malayalam' : 'Hindi'} for ${TERM_BASE[k]}`} placeholder={TRANS[en]?.[l] ?? en} value={c.termsL?.[l]?.[k] ?? ''} onChange={(e) => edit((x) => { x.termsL = { ...x.termsL, [l]: { ...x.termsL?.[l], [k]: e.target.value } } })} /></td>)}</tr> })}</tbody></table>
          <p className="text-xs muted">Grey text is our default for that word. Type to override it. Review the Malayalam and Hindi with a native speaker before go-live.</p>
          <Btn className="mt-3" onClick={() => edit((x) => { x.terms = { ...TERM_BASE }; x.termsL = {} })}>Reset to platform terms</Btn></div>
        <div className="space-y-4">
          <div className="panel p-4"><h2 className="font-semibold mb-2">Language</h2><Seg<Lang> label="Language" value={c.lang} onChange={(l) => edit((x) => (x.lang = l))} opts={[{ id: 'en', label: 'English' }, { id: 'ml', label: 'മലയാളം' }, { id: 'hi', label: 'हिन्दी' }]} /><p className="text-xs muted mt-2">Menus and key buttons are translated in this prototype. Line height rises to 1.55 for Malayalam and Devanagari. Numbers keep lakh and crore grouping.</p></div>
          <div className="panel p-4 text-[13px] space-y-1"><h2 className="font-semibold mb-1">Sample</h2><div>Add {c.terms.customer?.toLowerCase()} · {c.terms.items} master</div><div>Move stock between {c.terms.godowns?.toLowerCase()}</div><div>{c.terms.supplier} payments due</div><div className="num text-left">₹12,45,300 · ₹1,24,53,000</div></div>
        </div>
      </div>
    </>
  )
}
export { Status }
