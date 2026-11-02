import { Fragment, useState } from 'react'
import { useApp, edit, toast, term } from '../lib/app'
import type { Mode, FieldDef } from '../lib/config'
import { Btn, Field, PageHead, Toggle, Seg, Status } from '../ui/kit'
import { Icon } from '../ui/icons'
import { FieldInput } from '../screens/Masters'
import { SPECS } from '../screens/Generic'
import { inr0 } from '../lib/fmt'

const MODES: Mode[] = ['counter', 'books', 'owner']
const ICONS = ['receipt', 'file', 'box', 'book', 'users', 'chart', 'tag', 'cart', 'truck', 'spark', 'printer', 'shield', 'wallet', 'gift', 'flow']
const ROUTES = ['owner', 'approvals', 'billing', 'held', 'returns', 'pipeline', 'invoices', 'quotes', 'po', 'grn', 'stock', 'items', 'transfers', 'vouchers', 'daybook', 'ledgers', 'trial', 'pnl', 'bankrec', 'gstr', 'parties', 'leads', 'collections', 'reports', 'ask', 'sync', 'users', 'printing']
const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]] }
const Sec = ({ title, sub, children, act }: { title: string; sub?: string; children: React.ReactNode; act?: React.ReactNode }) => (
  <section className="mx-5 mb-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-[15px]">{title}</h2>{act}</div>{sub && <p className="text-[13px] muted max-w-3xl">{sub}</p>}<div className="mt-2">{children}</div></section>
)

export function MenuBuilder() {
  const c = useApp((s) => s.draft)
  const [pm, setPm] = useState<Mode>('books')
  const [drag, setDrag] = useState<[number, number] | null>(null)
  const preview = c.menu.map((g) => ({ ...g, items: g.items.filter((i) => i.visible && i.modes.includes(pm) && c.modules.find((m) => m.id === i.module)?.on) })).filter((g) => g.items.length)
  return (
    <>
      <PageHead title="Menu builder" sub="Rename, reorder, hide, regroup and assign menu items by role. Items from switched-off modules disappear on their own. Drag a row or use the arrows. Tokens like {customer} follow your Terms." crumbs={['Admin Studio', 'Menu']}>
        <Btn icon="plus" onClick={() => edit((x) => x.menu.push({ id: 'g' + Date.now(), label: 'New group', items: [] }))}>Add group</Btn>
      </PageHead>
      <div className="grid xl:grid-cols-[1fr_260px] gap-5 mx-5 pb-6">
        <div className="space-y-3">
          {c.menu.map((g, gi) => (
            <section key={g.id} className="panel" aria-label={g.label}>
              <header className="flex items-center gap-2 px-3 h-10 border-b border-rule bg-wash rounded-t-lg">
                <input aria-label="Group name" className="bg-transparent font-semibold outline-none focus:underline w-48" value={g.label} onChange={(e) => edit((x) => (x.menu[gi].label = e.target.value))} />
                <span className="text-xs muted">{g.items.length} items</span><span className="flex-1" />
                <button aria-label="Move group up" className="btn btn-ghost btn-sm" disabled={gi === 0} onClick={() => edit((x) => move(x.menu, gi, -1))}><Icon n="arrowup" size={12} /></button>
                <button aria-label="Move group down" className="btn btn-ghost btn-sm" disabled={gi === c.menu.length - 1} onClick={() => edit((x) => move(x.menu, gi, 1))}><Icon n="arrowdown" size={12} /></button>
                <button aria-label="Delete group" className="btn btn-ghost btn-sm" disabled={g.items.length > 0} title={g.items.length ? 'Move its items out first' : ''} onClick={() => edit((x) => x.menu.splice(gi, 1))}><Icon n="trash" size={12} /></button>
              </header>
              <ul>
                {g.items.map((it, ii) => (
                  <li key={it.id} draggable onDragStart={() => setDrag([gi, ii])} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (!drag) return; edit((x) => { const [it2] = x.menu[drag[0]].items.splice(drag[1], 1); x.menu[gi].items.splice(ii, 0, it2) }); setDrag(null) }} className={`flex items-center gap-2 px-3 h-10 border-b border-rule last:border-0 text-[13px] ${it.visible ? '' : 'opacity-55'}`}>
                    <span className="cursor-grab muted" aria-hidden><Icon n="grip" size={14} /></span>
                    <select aria-label="Icon" className="inp w-24 h-7 px-1" value={it.icon} onChange={(e) => edit((x) => (x.menu[gi].items[ii].icon = e.target.value))}>{ICONS.concat(ICONS.includes(it.icon) ? [] : [it.icon]).map((i) => <option key={i}>{i}</option>)}</select>
                    <input aria-label="Label" className="inp h-7 w-52" value={it.label} onChange={(e) => edit((x) => (x.menu[gi].items[ii].label = e.target.value))} />
                    <span className="text-xs muted w-28 truncate hidden 2xl:block">{term(c, it.label)}</span>
                    <span className="flex gap-1" role="group" aria-label="Visible to">{MODES.map((m) => <button key={m} aria-pressed={it.modes.includes(m)} onClick={() => edit((x) => { const a = x.menu[gi].items[ii].modes; x.menu[gi].items[ii].modes = a.includes(m) ? a.filter((y) => y !== m) : [...a, m] })} className={`chip h-6 ${it.modes.includes(m) ? 'bg-neel text-onneel border-neel' : 'bg-sheet muted'}`}>{m}</button>)}</span>
                    <span className="flex-1" />
                    <select aria-label="Move to group" className="inp w-28 h-7" value={g.id} onChange={(e) => edit((x) => { const [it2] = x.menu[gi].items.splice(ii, 1); x.menu.find((q) => q.id === e.target.value)!.items.push(it2) })}>{c.menu.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</select>
                    <button aria-label="Move up" className="btn btn-ghost btn-sm" disabled={ii === 0} onClick={() => edit((x) => move(x.menu[gi].items, ii, -1))}><Icon n="arrowup" size={12} /></button>
                    <button aria-label="Move down" className="btn btn-ghost btn-sm" disabled={ii === g.items.length - 1} onClick={() => edit((x) => move(x.menu[gi].items, ii, 1))}><Icon n="arrowdown" size={12} /></button>
                    <Toggle on={it.visible} label={`Show ${it.label}`} onChange={(v) => edit((x) => (x.menu[gi].items[ii].visible = v))} />
                  </li>
                ))}
                {g.items.length === 0 && <li className="px-3 py-3 text-[13px] muted">Empty group. Add a screen below or drag an item here.</li>}
              </ul>
              <footer className="px-3 py-2 border-t border-rule"><select aria-label="Add a screen to this group" className="inp w-64 h-7" value="" onChange={(e) => { if (!e.target.value) return; const r = e.target.value; edit((x) => x.menu[gi].items.push({ id: r + Date.now(), label: SPECS[r]?.title ?? r[0].toUpperCase() + r.slice(1), route: r, icon: 'file', module: x.menu.flatMap((q) => q.items).find((i) => i.route === r)?.module ?? 'reports', visible: true, modes: ['books'] })) }}><option value="">Add a screen to this group</option>{ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}</select></footer>
            </section>
          ))}
        </div>
        <aside className="xl:sticky xl:top-3 h-fit"><div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium">Live menu</span></div><Seg<Mode> label="Preview role" value={pm} onChange={setPm} opts={MODES.map((m) => ({ id: m, label: m }))} />
          <div className="panel mt-2 py-2 text-[13px] max-h-[600px] scroll">{preview.map((g) => <div key={g.id} className="mb-1.5"><div className="px-3 text-[11px] font-medium muted">{term(c, g.label)}</div>{g.items.map((i) => <div key={i.id} className="px-3 h-7 flex items-center gap-2"><Icon n={i.icon} size={14} />{term(c, i.label)}</div>)}</div>)}{preview.length === 0 && <p className="px-3 muted">No items for this role.</p>}</div></aside>
      </div>
    </>
  )
}

export function Modules() {
  const c = useApp((s) => s.draft)
  const [open, setOpen] = useState<string | null>('pos')
  const tenantPlan = 'Business'
  const rank = { Core: 0, Business: 1, Enterprise: 2 } as const
  const on = c.modules.filter((m) => m.on).length
  return (
    <>
      <PageHead title="Modules and feature matrix" sub={`${on} of ${c.modules.length} modules on. Tenant plan: ${tenantPlan}. Modules above the plan cannot be switched on until the plan changes.`} crumbs={['Admin Studio', 'Modules']} />
      <div className="mx-5 pb-6 panel overflow-hidden">
        <table className="tbl">
          <thead><tr><th className="w-8" /><th>Module</th><th>Release</th><th>Plan</th><th>Features on</th><th className="text-right w-20">Module</th></tr></thead>
          <tbody>{c.modules.map((m, mi) => {
            const above = rank[m.plan] > rank[tenantPlan]
            return (<Fragment key={m.id}>
              <tr className={m.on ? '' : 'opacity-60'}>
                <td><button aria-label={`Expand ${m.name}`} aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}><Icon n={open === m.id ? 'down' : 'right'} size={14} /></button></td>
                <td className="font-medium">{m.name}{m.locked && <Icon n="lock" size={12} className="inline ml-1.5 muted" />}</td>
                <td><span className="chip">{m.release}</span></td>
                <td><span className={`chip ${above ? 'border-haldi' : ''}`}>{m.plan}{above ? ', upgrade' : ''}</span></td>
                <td className="num text-left">{m.features.filter((f) => f.on).length} / {m.features.length}</td>
                <td className="text-right"><Toggle on={m.on} disabled={m.locked || (above && !m.on)} label={`Module ${m.name}`} onChange={(v) => { edit((x) => { x.modules[mi].on = v }); if (!v) toast(`${m.name} hidden from every menu. Data stays safe.`, 'info') }} /></td>
              </tr>
              {open === m.id && <tr><td /><td colSpan={5} className="py-2"><div className="flex flex-wrap gap-2 py-1">{m.features.map((f, fi) => <label key={f.id} className={`flex items-center gap-2 border border-rule rounded px-2.5 h-8 text-[13px] ${m.on ? '' : 'opacity-50'}`}><Toggle on={f.on} disabled={!m.on} label={f.name} onChange={(v) => edit((x) => (x.modules[mi].features[fi].on = v))} />{f.name}</label>)}</div></td></tr>}
            </Fragment>)
          })}</tbody>
        </table>
      </div>
    </>
  )
}

const TRIG = ['Invoice is 7 days overdue', 'Stock falls below reorder level', 'Bill saved with discount above 10%', 'Purchase order created', 'Cheque due tomorrow', 'New lead received', 'Sync conflict detected']
const COND = ['Consent: WhatsApp allowed', 'Outside quiet hours', 'Item has a preferred supplier', 'Cashier is not a manager', 'Amount above ₹50,000', 'Customer is not high risk']
const ACT = ['Send WhatsApp reminder with UPI link', 'Create task for salesperson', 'Create draft purchase order', 'Notify owner', 'Request approval from manager', 'Hold bill until approved', 'Assign to resolver']
export function Designer() {
  const c = useApp((s) => s.draft)
  const [wi, setWi] = useState(0)
  const [pi, setPi] = useState(0)
  const [dry, setDry] = useState<string[] | null>(null)
  const w = c.workflows[wi]
  const p = c.pipelines[pi]
  return (
    <>
      <PageHead title="Workflows and pipelines" sub="Sentence-style builder with a dry run. Pipelines define the stages of a document or lead flow, and the app reads them." crumbs={['Admin Studio', 'Workflows']} />
      <Sec title="Pipeline designer" act={<Btn className="btn-sm" icon="plus" onClick={() => edit((x) => x.pipelines.push({ id: 'p' + Date.now(), name: 'New pipeline', stages: [{ id: 's' + Date.now(), name: 'Start', kind: 'start' }, { id: 'e' + Date.now(), name: 'Done', kind: 'end' }] }))}>New pipeline</Btn>}>
        <div className="panel p-4">
          <div className="flex gap-3 items-center mb-3"><Seg label="Pipeline" value={String(pi)} onChange={(v) => setPi(+v)} opts={c.pipelines.map((x, i) => ({ id: String(i), label: x.name }))} /><input aria-label="Pipeline name" className="inp w-56" value={p.name} onChange={(e) => edit((x) => (x.pipelines[pi].name = e.target.value))} /></div>
          <ol className="flex gap-2 items-stretch overflow-x-auto pb-2">
            {p.stages.map((s, si) => (
              <li key={s.id} className="flex items-center gap-2 shrink-0">
                <div className="panel w-44 p-2 space-y-1.5 bg-wash">
                  <input aria-label="Stage name" className="inp h-7 font-medium" value={s.name} onChange={(e) => edit((x) => (x.pipelines[pi].stages[si].name = e.target.value))} />
                  <select aria-label="Stage kind" className="inp h-7" value={s.kind} onChange={(e) => edit((x) => (x.pipelines[pi].stages[si].kind = e.target.value as never))}><option value="start">Start</option><option value="step">Step</option><option value="approval">Needs approval</option><option value="end">End</option></select>
                  <div className="flex justify-between"><button aria-label="Move left" className="btn btn-ghost btn-sm" disabled={si === 0} onClick={() => edit((x) => move(x.pipelines[pi].stages, si, -1))}><Icon n="arrowup" size={12} className="-rotate-90" /></button><button aria-label="Move right" className="btn btn-ghost btn-sm" disabled={si === p.stages.length - 1} onClick={() => edit((x) => move(x.pipelines[pi].stages, si, 1))}><Icon n="arrowdown" size={12} className="-rotate-90" /></button><button aria-label="Remove stage" className="btn btn-ghost btn-sm" disabled={p.stages.length <= 2} onClick={() => edit((x) => x.pipelines[pi].stages.splice(si, 1))}><Icon n="trash" size={12} /></button></div>
                </div>
                {si < p.stages.length - 1 && <Icon n="right" className="muted" />}
              </li>
            ))}
            <li className="shrink-0 flex items-center"><Btn icon="plus" onClick={() => edit((x) => x.pipelines[pi].stages.splice(x.pipelines[pi].stages.length - 1, 0, { id: 's' + Date.now(), name: 'New stage', kind: 'step' }))}>Stage</Btn></li>
          </ol>
          <p className="text-xs muted">The Sales pipeline screen shows these stages as columns the moment you edit them.</p>
        </div>
      </Sec>
      <Sec title="Workflow builder" act={<Btn className="btn-sm" icon="plus" onClick={() => { edit((x) => x.workflows.push({ id: 'w' + Date.now(), name: 'New workflow', trigger: TRIG[0], conditions: [], actions: [ACT[0]], on: false })); setWi(c.workflows.length) }}>New workflow</Btn>}>
        <div className="grid lg:grid-cols-[220px_1fr] gap-3">
          <ul className="panel h-fit">{c.workflows.map((x, i) => <li key={x.id}><button onClick={() => { setWi(i); setDry(null) }} aria-current={i === wi} className={`w-full text-left px-3 h-9 flex items-center justify-between text-[13px] ${i === wi ? 'bg-neel/10 text-neel font-medium' : 'hover:bg-wash'}`}>{x.name}<span className={`size-2 rounded-full ${x.on ? 'bg-mehndi' : 'bg-rule'}`} /></button></li>)}</ul>
          {w && <div className="panel p-4 space-y-3">
            <div className="flex items-center gap-3"><input aria-label="Workflow name" className="inp w-64 font-medium" value={w.name} onChange={(e) => edit((x) => (x.workflows[wi].name = e.target.value))} /><span className="flex-1" /><span className="text-xs muted">{w.on ? 'On' : 'Off'}</span><Toggle on={w.on} label="Workflow on" onChange={(v) => edit((x) => (x.workflows[wi].on = v))} /></div>
            <div className="flex items-center gap-2 text-[13px]"><b className="w-16">When</b><select aria-label="Trigger" className="inp flex-1" value={w.trigger} onChange={(e) => edit((x) => (x.workflows[wi].trigger = e.target.value))}>{TRIG.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="text-[13px] flex gap-2"><b className="w-16 pt-1">Only if</b><div className="flex-1 space-y-1.5 border-l-2 border-rule pl-3">{w.conditions.map((cd, i) => <div key={i} className="flex gap-2"><select aria-label="Condition" className="inp" value={cd} onChange={(e) => edit((x) => (x.workflows[wi].conditions[i] = e.target.value))}>{COND.map((t) => <option key={t}>{t}</option>)}</select><button aria-label="Remove condition" onClick={() => edit((x) => x.workflows[wi].conditions.splice(i, 1))}><Icon n="x" size={14} /></button></div>)}<Btn className="btn-sm" icon="plus" onClick={() => edit((x) => x.workflows[wi].conditions.push(COND[0]))}>Condition</Btn></div></div>
            <div className="text-[13px] flex gap-2"><b className="w-16 pt-1">Then</b><div className="flex-1 space-y-1.5 border-l-2 border-neel pl-3">{w.actions.map((cd, i) => <div key={i} className="flex gap-2"><select aria-label="Action" className="inp" value={cd} onChange={(e) => edit((x) => (x.workflows[wi].actions[i] = e.target.value))}>{ACT.map((t) => <option key={t}>{t}</option>)}</select><button aria-label="Remove action" disabled={w.actions.length <= 1} onClick={() => edit((x) => x.workflows[wi].actions.splice(i, 1))}><Icon n="x" size={14} /></button></div>)}<Btn className="btn-sm" icon="plus" onClick={() => edit((x) => x.workflows[wi].actions.push(ACT[0]))}>Action</Btn></div></div>
            <div className="flex gap-2 border-t border-rule pt-3"><Btn icon="play" onClick={() => setDry([`Trigger "${w.trigger}" matched sample: INV/26-27/00988, Rajesh Nair Interiors.`, ...w.conditions.map((x, i) => `Condition "${x}" ${i % 3 === 2 ? 'failed. Run would stop here.' : 'passed.'}`), ...w.actions.map((x) => `Would run: ${x}. Dry run, nothing sent.`)])}>Dry run on sample data</Btn><Btn kind="danger" onClick={() => { edit((x) => x.workflows.splice(wi, 1)); setWi(0) }}>Delete</Btn></div>
            {dry && <ol className="text-[13px] space-y-1 panel p-3 bg-wash" aria-label="Dry run result">{dry.map((d, i) => <li key={i} className="flex gap-2"><span className="num muted w-4">{i + 1}</span>{d}</li>)}</ol>}
          </div>}
        </div>
      </Sec>
    </>
  )
}

const ROLES = ['Cashier', 'Store manager', 'Accountant', 'CA', 'Owner']
export function Chains() {
  const c = useApp((s) => s.draft)
  const [amt, setAmt] = useState('60000')
  return (
    <>
      <PageHead title="Approval chains" sub="Who must approve what, in what order, above which amount. Test a chain with a sample amount." crumbs={['Admin Studio', 'Approvals']}><Btn icon="plus" onClick={() => edit((x) => x.approvals.push({ id: 'a' + Date.now(), name: 'New chain', doc: 'Sales invoice', rule: 'Value above limit', steps: [{ role: 'Store manager', limit: 10000 }], on: false }))}>New chain</Btn></PageHead>
      <div className="mx-5 pb-6 space-y-3 max-w-4xl">
        {c.approvals.map((a, ai) => {
          const need = a.steps.filter((s) => (+amt || 0) > s.limit || s.limit === 0)
          return (
            <article key={a.id} className="panel p-4 space-y-3">
              <div className="flex items-center gap-3"><input aria-label="Chain name" className="inp w-56 font-medium" value={a.name} onChange={(e) => edit((x) => (x.approvals[ai].name = e.target.value))} /><select aria-label="Document" className="inp w-40" value={a.doc} onChange={(e) => edit((x) => (x.approvals[ai].doc = e.target.value))}>{['Sales invoice', 'Journal', 'Purchase order', 'Credit note', 'Payment voucher'].map((d) => <option key={d}>{d}</option>)}</select><input aria-label="Rule" className="inp flex-1" value={a.rule} onChange={(e) => edit((x) => (x.approvals[ai].rule = e.target.value))} /><Toggle on={a.on} label={`Chain ${a.name} on`} onChange={(v) => edit((x) => (x.approvals[ai].on = v))} /></div>
              <ol className="flex items-center gap-2 flex-wrap">{a.steps.map((s, si) => <li key={si} className="flex items-center gap-2"><div className="border border-rule rounded p-2 bg-wash text-[13px] space-y-1"><div className="text-xs muted">Step {si + 1}</div><select aria-label="Approver role" className="inp h-7 w-36" value={s.role} onChange={(e) => edit((x) => (x.approvals[ai].steps[si].role = e.target.value))}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select><label className="flex items-center gap-1 text-xs">Above ₹<input aria-label="Limit" type="number" className="inp num h-7 w-24" value={s.limit} onChange={(e) => edit((x) => (x.approvals[ai].steps[si].limit = +e.target.value))} /></label><button className="text-xs text-sindoor" disabled={a.steps.length <= 1} onClick={() => edit((x) => x.approvals[ai].steps.splice(si, 1))}>Remove</button></div>{si < a.steps.length - 1 && <Icon n="right" className="muted" />}</li>)}<li><Btn className="btn-sm" icon="plus" onClick={() => edit((x) => x.approvals[ai].steps.push({ role: 'Owner', limit: 0 }))}>Step</Btn></li></ol>
              <div className="text-xs muted flex items-center gap-2 border-t border-rule pt-2">Test amount ₹<input aria-label="Test amount" className="inp num h-7 w-28" value={amt} onChange={(e) => setAmt(e.target.value)} /> {a.on ? (need.length ? <>needs <b className="text-ink">{need.map((s) => s.role).join(' then ')}</b></> : 'needs no approval') : 'chain is off'}<span className="flex-1" /><button className="text-sindoor" onClick={() => edit((x) => x.approvals.splice(ai, 1))}>Delete chain</button></div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function Numbering() {
  const c = useApp((s) => s.draft)
  const sample = (n: (typeof c.numbering)[number]) => n.prefix + String(n.start).padStart(n.padding, '0')
  return (
    <>
      <PageHead title="Document numbering" sub="Series per document and branch. GST invoice numbers must be at most 16 characters, so longer series are blocked." crumbs={['Admin Studio', 'Numbering']}><Btn icon="plus" onClick={() => edit((x) => x.numbering.push({ id: 'n' + Date.now(), doc: 'Delivery challan', prefix: 'DC/', padding: 4, start: 1, reset: 'yearly', branchWise: true }))}>New series</Btn></PageHead>
      <div className="mx-5 pb-6 panel overflow-auto">
        <table className="tbl"><thead><tr><th>Document</th><th>Prefix</th><th>Digits</th><th>Next number</th><th>Resets</th><th>Per branch</th><th>Next will read</th><th /></tr></thead>
          <tbody>{c.numbering.map((n, i) => { const long = sample(n).length > 16; return (
            <tr key={n.id}><td><input aria-label="Document" className="inp h-7 w-40" value={n.doc} onChange={(e) => edit((x) => (x.numbering[i].doc = e.target.value))} /></td>
              <td><input aria-label="Prefix" className="inp h-7 w-32 num text-left" value={n.prefix} onChange={(e) => edit((x) => (x.numbering[i].prefix = e.target.value))} /></td>
              <td><input aria-label="Digits" type="number" min={1} max={10} className="inp h-7 w-16 num" value={n.padding} onChange={(e) => edit((x) => (x.numbering[i].padding = Math.max(1, +e.target.value)))} /></td>
              <td><input aria-label="Next number" type="number" min={1} className="inp h-7 w-24 num" value={n.start} onChange={(e) => edit((x) => (x.numbering[i].start = Math.max(1, +e.target.value)))} /></td>
              <td><select aria-label="Reset" className="inp h-7 w-24" value={n.reset} onChange={(e) => edit((x) => (x.numbering[i].reset = e.target.value as never))}><option>never</option><option>yearly</option><option>monthly</option></select></td>
              <td><Toggle on={n.branchWise} label="Per branch" onChange={(v) => edit((x) => (x.numbering[i].branchWise = v))} /></td>
              <td><span className="num text-left font-medium">{sample(n)}</span>{long && n.doc.toLowerCase().includes('invoice') && <div role="alert" className="text-xs text-sindoor">{sample(n).length} characters. GST allows 16.</div>}</td>
              <td><button aria-label="Delete series" onClick={() => edit((x) => x.numbering.splice(i, 1))}><Icon n="trash" size={14} /></button></td></tr>) })}</tbody></table>
        <p className="text-xs muted p-3">Gap report: no gaps in the published series. Numbers already issued are never reused or renumbered.</p>
      </div>
    </>
  )
}

export function Forms() {
  const c = useApp((s) => s.draft)
  const [ent, setEnt] = useState('item')
  const [nf, setNf] = useState({ label: '', type: 'text' as FieldDef['type'], options: '' })
  const fs = c.fields[ent]
  const add = () => {
    if (!nf.label.trim()) return toast('Give the field a label.', 'err')
    edit((x) => x.fields[ent].push({ id: 'cf' + Date.now(), label: nf.label.trim(), type: nf.type, required: false, visible: true, custom: true, options: nf.type === 'select' ? nf.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined }))
    setNf({ label: '', type: 'text', options: '' }); toast('Field added to the form. It is in the draft preview now.', 'info')
  }
  return (
    <>
      <PageHead title="Form and field designer" sub="Show, require, rename and add fields. Statutory fields are locked. The form on the right is the real form the app uses." crumbs={['Admin Studio', 'Forms']}><Seg label="Form" value={ent} onChange={setEnt} opts={[{ id: 'item', label: term(c, '{item}') }, { id: 'party', label: 'Party' }, { id: 'invoice', label: 'Invoice' }]} /></PageHead>
      <div className="grid xl:grid-cols-[1fr_340px] gap-5 mx-5 pb-6">
        <div className="panel overflow-auto"><table className="tbl"><thead><tr><th>Label</th><th>Type</th><th>Show</th><th>Required</th><th /></tr></thead><tbody>{fs.map((f, i) => (
          <tr key={f.id}><td><input aria-label="Field label" className="inp h-7" value={f.label} onChange={(e) => edit((x) => (x.fields[ent][i].label = e.target.value))} />{f.locked && <span className="text-[11px] muted"><Icon n="lock" size={10} className="inline mr-1" />Statutory, locked</span>}</td><td className="text-xs muted capitalize">{f.type}{f.options ? ` (${f.options.length})` : ''}</td>
            <td><Toggle on={f.visible} disabled={f.locked} label={`Show ${f.label}`} onChange={(v) => edit((x) => { x.fields[ent][i].visible = v; if (!v) x.fields[ent][i].required = false })} /></td>
            <td><Toggle on={f.required} disabled={f.locked || !f.visible} label={`Require ${f.label}`} onChange={(v) => edit((x) => (x.fields[ent][i].required = v))} /></td>
            <td className="whitespace-nowrap"><button aria-label="Move up" disabled={i === 0} onClick={() => edit((x) => move(x.fields[ent], i, -1))}><Icon n="arrowup" size={13} /></button> <button aria-label="Move down" disabled={i === fs.length - 1} onClick={() => edit((x) => move(x.fields[ent], i, 1))}><Icon n="arrowdown" size={13} /></button> {f.custom && <button aria-label="Delete field" onClick={() => edit((x) => x.fields[ent].splice(i, 1))}><Icon n="trash" size={13} /></button>}</td></tr>))}</tbody></table>
          <div className="p-3 border-t border-rule flex gap-2 items-end flex-wrap"><Field label="New field label"><input className="inp w-44" value={nf.label} onChange={(e) => setNf({ ...nf, label: e.target.value })} /></Field><Field label="Type"><select className="inp w-28" value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value as never })}>{['text', 'number', 'date', 'select', 'yesno'].map((t) => <option key={t}>{t}</option>)}</select></Field>{nf.type === 'select' && <Field label="Options, comma separated"><input className="inp w-48" value={nf.options} onChange={(e) => setNf({ ...nf, options: e.target.value })} /></Field>}<Btn kind="primary" icon="plus" onClick={add}>Add field</Btn></div></div>
        <div className="panel p-4 h-fit space-y-3"><h2 className="font-semibold">Form preview</h2>{fs.filter((f) => f.visible).map((f) => <FieldInput key={f.id} f={f} v="" onChange={() => {}} />)}{fs.filter((f) => f.visible).length === 0 && <p className="text-[13px] muted">No visible fields. This form is hidden from users.</p>}</div>
      </div>
    </>
  )
}
export { Status, inr0 }
