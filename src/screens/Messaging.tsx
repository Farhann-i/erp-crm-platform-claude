import { useEffect, useRef, useState } from 'react'
import { createStore } from '../lib/store'
import { useApp, toast, set as setApp } from '../lib/app'
import { inr0, compact } from '../lib/fmt'
import { Btn, PageHead, Tabs, Field, Drawer, Modal, Empty, Spark, Status, Seg } from '../ui/kit'
import { Icon } from '../ui/icons'

type St = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
interface Msg { id: string; from: 'me' | 'them'; text: string; at: string; st?: St; tpl?: string }
interface Thread { id: string; partyId?: string; name: string; phone: string; msgs: Msg[]; owner: string; open: boolean; lastIn: number }
interface Tpl { id: string; name: string; cat: 'Utility' | 'Marketing' | 'Authentication'; body: string; status: 'Approved' | 'In review' | 'Rejected' }
interface Camp { id: string; name: string; channel: 'WhatsApp' | 'Meta ad'; segment: string; tpl: string; budget: number; state: 'Draft' | 'Scheduled' | 'Running' | 'Completed'; sent: number; delivered: number; read: number; clicks: number; conv: number; sales: number; spend: number; trend: number[]; at: string }
interface WA { connected: boolean; waba: string; phone: string; quality: 'High' | 'Medium'; tier: string; meta: boolean; adAcct: string; threads: Thread[]; tpls: Tpl[]; camps: Camp[] }
const hm = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
const NOW = Date.now()
const seed: WA = {
  connected: false, waba: '', phone: '', quality: 'High', tier: '1,000 conversations a day', meta: false, adAcct: '',
  threads: [
    { id: 't1', partyId: 'c1', name: 'Anitha Menon', phone: '98470 12345', owner: 'Divya', open: true, lastIn: NOW - 3 * 3600e3, msgs: [{ id: 'a', from: 'them', text: 'Is the cream kasavu available in stock?', at: '10:12' }] },
    { id: 't2', name: 'Hotel Sea Pearl', phone: '94470 21876', owner: 'Rekha', open: true, lastIn: NOW - 5 * 3600e3, msgs: [{ id: 'a', from: 'them', text: 'Please send the statement for October', at: '09:40' }] },
    { id: 't3', name: 'Joseph Mathew', phone: '99461 33290', owner: 'Rekha', open: false, lastIn: NOW - 30 * 3600e3, msgs: [{ id: 'a', from: 'them', text: 'Payment done by UPI', at: 'Yesterday' }, { id: 'b', from: 'me', text: 'Received, thank you Joseph.', at: 'Yesterday', st: 'read' }] },
  ],
  tpls: [
    { id: 'p1', name: 'bill_receipt', cat: 'Utility', body: 'Hi {{1}}, your bill {{2}} for ₹{{3}} is ready. Thank you for shopping at {{4}}.', status: 'Approved' },
    { id: 'p2', name: 'payment_reminder', cat: 'Utility', body: 'Hi {{1}}, ₹{{2}} is pending on bill {{3}}. Pay by UPI to {{4}}.', status: 'Approved' },
    { id: 'p3', name: 'onam_preview', cat: 'Marketing', body: 'Onam collection is in, {{1}}. Show this message for 10% off till {{2}}.', status: 'Approved' },
    { id: 'p4', name: 'we_miss_you', cat: 'Marketing', body: 'We miss you, {{1}}. Here is 5% off your next visit.', status: 'In review' },
  ],
  camps: [
    { id: 'k1', name: 'Onam collection preview', channel: 'WhatsApp', segment: 'High value', tpl: 'onam_preview', budget: 4000, state: 'Completed', sent: 214, delivered: 203, read: 151, clicks: 62, conv: 19, sales: 84600, spend: 3210, trend: [4, 9, 16, 21, 24, 26, 28], at: '12 Oct' },
    { id: 'k2', name: 'Festive sarees · Instagram', channel: 'Meta ad', segment: 'Kochi, 25–45, women', tpl: '–', budget: 15000, state: 'Running', sent: 48200, delivered: 48200, read: 0, clicks: 1180, conv: 41, sales: 158300, spend: 9420, trend: [2, 5, 9, 12, 18, 22, 27], at: '20 Oct' },
  ],
}
const wa = createStore<WA>('erp-wa', seed, ['connected', 'waba', 'phone', 'meta', 'adAcct', 'threads', 'tpls', 'camps'])
const upd = (fn: (s: WA) => Partial<WA>) => wa.set(fn)

function Connect({ meta }: { meta?: boolean }) {
  const [step, setStep] = useState(0)
  const [v, setV] = useState({ waba: 'Kerala Textile House', phone: '98470 00112', otp: '', acct: 'act_4471029385' })
  const [err, setErr] = useState('')
  const steps = meta ? ['Sign in to Meta', 'Choose ad account', 'Connected'] : ['Business account', 'Verify number', 'Webhook and templates', 'Connected']
  const next = () => {
    setErr('')
    if (!meta && step === 1 && v.otp !== '123456') return setErr('That code is not right. In this prototype the code is 123456.')
    if (step === steps.length - 2) {
      upd(() => (meta ? { meta: true, adAcct: v.acct } : { connected: true, waba: v.waba, phone: v.phone }))
      toast(meta ? 'Meta ad account connected (simulated).' : 'WhatsApp Business connected (simulated).')
    }
    setStep(step + 1)
  }
  return (
    <div className="max-w-xl mx-auto mt-8 panel p-5">
      <div className="text-xs px-2 py-1 bg-haldi/20 rounded mb-3">Simulated connection. No call goes to Meta. Every step behaves as the live flow will.</div>
      <h2 className="text-lg font-semibold">{meta ? 'Connect your Meta ad account' : 'Connect WhatsApp Business'}</h2>
      <ol className="flex gap-2 text-xs my-3">{steps.map((s, i) => <li key={s} className={`px-2 py-1 rounded ${i === step ? 'bg-neel text-white' : i < step ? 'bg-mehndi/20' : 'bg-wash muted'}`}>{i + 1}. {s}</li>)}</ol>
      {meta ? (
        step === 0 ? <p className="text-sm">Sign in with the Facebook account that manages your ads. Only ad reports are read. Nothing is posted.</p>
          : step === 1 ? <Field label="Ad account"><select className="inp" value={v.acct} onChange={(e) => setV({ ...v, acct: e.target.value })}><option value="act_4471029385">Kerala Textile House · act_4471029385</option><option value="act_9920114477">Kochi Silks promo · act_9920114477</option></select></Field>
            : <p className="text-sm">Connected to {v.acct}. Campaign dashboards now show reach, clicks, conversions and attributed sales.</p>
      ) : step === 0 ? (
        <div className="space-y-3"><Field label="WhatsApp Business account name"><input className="inp" value={v.waba} onChange={(e) => setV({ ...v, waba: e.target.value })} /></Field><Field label="Business phone number" hint="Must not be linked to a personal WhatsApp account."><input className="inp num" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field></div>
      ) : step === 1 ? (
        <Field label={`Code sent to ${v.phone}`} error={err}><input autoFocus inputMode="numeric" maxLength={6} className="inp num w-40" value={v.otp} onChange={(e) => setV({ ...v, otp: e.target.value })} placeholder="123456" /></Field>
      ) : step === 2 ? (
        <ul className="text-sm space-y-1"><li>✓ Webhook receives replies and delivery receipts</li><li>✓ 4 starter templates submitted for review</li><li>✓ Opt-in is read from each customer's consent flag</li></ul>
      ) : <p className="text-sm">{v.waba} is live on {v.phone}. Message limit: {seed.tier}.</p>}
      <div className="flex justify-end gap-2 mt-4">{step < steps.length - 1 && <Btn kind="primary" onClick={next}>{step === steps.length - 2 ? 'Finish connecting' : 'Continue'}</Btn>}</div>
    </div>
  )
}

const TICK: Record<St, string> = { sending: '…', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' }
export function Inbox() {
  const s = wa.use((x) => x)
  const parties = useApp((x) => x.parties)
  const [tab, setTab] = useState('chats')
  const [sel, setSel] = useState('t1')
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [newTpl, setNewTpl] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const th = s.threads.find((t) => t.id === sel)
  useEffect(() => { end.current && (end.current.parentElement!.scrollTop = end.current.offsetTop) }, [sel, th?.msgs.length])
  if (!s.connected) return <div className="flex-1 min-h-0 scroll"><PageHead title="Unified inbox" sub="Connect WhatsApp Business to send and receive from here." crumbs={['People', 'Inbox']} /><Connect /></div>
  const inWindow = th ? Date.now() - th.lastIn < 24 * 3600e3 : false
  const patch = (id: string, m: string, st: St) => upd((x) => ({ threads: x.threads.map((t) => ({ ...t, msgs: t.msgs.map((g) => (g.id === m ? { ...g, st } : g)) })) }))
  const send = (body: string, tpl?: string) => {
    if (!th || !body.trim()) return
    const party = parties.find((p) => p.id === th.partyId)
    if (party && !party.consent) return toast(`${party.name} has not agreed to WhatsApp messages.`, 'warn')
    const id = 'm' + Date.now()
    upd((x) => ({ threads: x.threads.map((t) => (t.id === th.id ? { ...t, msgs: [...t.msgs, { id, from: 'me', text: body, at: hm(), st: 'sending', tpl }] } : t)) }))
    setText('')
    setTimeout(() => patch(th.id, id, 'sent'), 500)
    setTimeout(() => patch(th.id, id, 'delivered'), 1500)
    setTimeout(() => patch(th.id, id, 'read'), 3500)
    if (/statement|stock|price/i.test(th.msgs.at(-1)?.text ?? '') === false && Math.random() > 0.5) setTimeout(() => { upd((x) => ({ threads: x.threads.map((t) => (t.id === th.id ? { ...t, lastIn: Date.now(), msgs: [...t.msgs, { id: 'r' + Date.now(), from: 'them', text: 'Thank you, will visit this weekend.', at: hm() }] } : t)) })); toast(`${th.name} replied.`) }, 6000)
  }
  const list = s.threads.filter((t) => filter === 'all' || t.open)
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Unified inbox" sub={`${s.waba} · ${s.phone} · quality ${s.quality}. Delivery here is simulated.`} crumbs={['People', 'Inbox']}>
        <Btn icon="plug" onClick={() => { upd(() => ({ connected: false })); toast('WhatsApp disconnected.') }}>Disconnect</Btn>
      </PageHead>
      <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'chats', label: 'Conversations', badge: s.threads.filter((t) => t.open).length }, { id: 'tpl', label: 'Templates', badge: s.tpls.length }]} /></div>
      {tab === 'tpl' ? (
        <div className="p-5 scroll flex-1">
          <div className="flex justify-between mb-3"><p className="text-sm muted">Messages outside the 24-hour window must use an approved template.</p><Btn kind="primary" icon="plus" onClick={() => setNewTpl(true)}>New template</Btn></div>
          <ul className="grid gap-3 md:grid-cols-2">{s.tpls.map((t) => (
            <li key={t.id} className="panel p-3"><div className="flex justify-between"><b className="num">{t.name}</b><Status s={t.status} /></div><div className="text-xs muted">{t.cat}</div><p className="text-sm mt-2">{t.body}</p>
              {t.status === 'In review' && <Btn className="btn-sm mt-2" onClick={() => { upd((x) => ({ tpls: x.tpls.map((p) => (p.id === t.id ? { ...p, status: 'Approved' } : p)) })); toast(`${t.name} approved (simulated Meta review).`) }}>Simulate Meta approval</Btn>}</li>))}</ul>
          {newTpl && <NewTpl onClose={() => setNewTpl(false)} />}
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr] max-md:grid-cols-1">
          <div className="border-r border-rule scroll">
            <div className="p-2"><Seg label="Show" value={filter} onChange={setFilter} opts={[{ id: 'open', label: 'Open' }, { id: 'all', label: 'All' }]} /></div>
            {list.length === 0 && <Empty text="No open conversations." />}
            {list.map((t) => <button key={t.id} onClick={() => setSel(t.id)} className={`w-full text-left px-3 py-2 border-b border-rule ${sel === t.id ? 'bg-wash' : ''}`}><div className="flex justify-between"><b className="text-[13px]">{t.name}</b><span className="text-xs muted">{t.msgs.at(-1)?.at}</span></div><div className="text-xs muted truncate">{t.msgs.at(-1)?.text}</div><div className="text-[11px] muted">{t.owner}{t.open ? '' : ' · resolved'}</div></button>)}
          </div>
          {th ? (
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-rule flex justify-between items-center"><div><b>{th.name}</b><div className="text-xs muted">{th.phone}{th.partyId ? ' · linked customer' : ' · not in customers'}</div></div>
                <div className="flex gap-2">{!th.partyId && <Btn className="btn-sm" onClick={() => { const id = 'c' + Date.now(); setApp((x) => ({ parties: [...x.parties, { id, name: th.name, kind: 'customer', city: 'Kochi', phone: th.phone, gstin: '', balance: 0, limit: 0, risk: 'low', lastPay: '', overdueDays: 0, consent: true }] })); upd((x) => ({ threads: x.threads.map((t) => (t.id === th.id ? { ...t, partyId: id } : t)) })); toast(`${th.name} saved as a customer.`) }}>Save as customer</Btn>}
                  <Btn className="btn-sm" onClick={() => upd((x) => ({ threads: x.threads.map((t) => (t.id === th.id ? { ...t, open: !t.open } : t)) }))}>{th.open ? 'Mark resolved' : 'Reopen'}</Btn></div></div>
              <div className="flex-1 scroll p-4 space-y-2 bg-wash">{th.msgs.map((m) => <div key={m.id} className={`max-w-[70%] px-3 py-1.5 rounded text-[13px] ${m.from === 'me' ? 'ml-auto bg-neel text-white' : 'bg-sheet'}`}>{m.text}<div className="text-[10px] opacity-70 text-right">{m.at} {m.st && <span aria-label={m.st}>{TICK[m.st]}</span>}</div></div>)}<div ref={end} /></div>
              <div className="p-3 border-t border-rule">
                {!inWindow && <p className="text-xs px-2 py-1 bg-haldi/20 rounded mb-2">The 24-hour reply window has closed. Send an approved template to start again.</p>}
                <div className="flex gap-2">
                  <input aria-label="Message" disabled={!inWindow} className="inp" placeholder={inWindow ? 'Type a message' : 'Pick a template'} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(text)} />
                  <select aria-label="Template" className="inp w-44" value="" onChange={(e) => { const t = s.tpls.find((p) => p.id === e.target.value); if (t) send(t.body.replace('{{1}}', th.name.split(' ')[0]).replace(/\{\{\d\}\}/g, '…'), t.name) }}><option value="">Send template…</option>{s.tpls.filter((t) => t.status === 'Approved').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <Btn kind="primary" icon="chat" disabled={!inWindow} onClick={() => send(text)}>Send</Btn>
                </div>
              </div>
            </div>
          ) : <Empty text="Pick a conversation." />}
        </div>
      )}
    </div>
  )
}

function NewTpl({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({ name: '', cat: 'Marketing', body: '' })
  const [e, setE] = useState('')
  return (
    <Modal open onClose={onClose} title="New template" foot={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => {
      if (!/^[a-z0-9_]+$/.test(v.name)) return setE('Use lowercase letters, digits and underscores only, for example diwali_offer.')
      if (v.body.trim().length < 10) return setE('Write the message text. Use {{1}} where the customer name goes.')
      upd((x) => ({ tpls: [...x.tpls, { id: 'p' + Date.now(), name: v.name, cat: v.cat as Tpl['cat'], body: v.body, status: 'In review' }] })); toast('Template sent for review.'); onClose()
    }}>Submit for review</Btn></>}>
      <div className="space-y-3">
        <Field label="Template name" req><input autoFocus className="inp num" value={v.name} onChange={(x) => setV({ ...v, name: x.target.value })} /></Field>
        <Field label="Category"><select className="inp" value={v.cat} onChange={(x) => setV({ ...v, cat: x.target.value })}><option>Marketing</option><option>Utility</option><option>Authentication</option></select></Field>
        <Field label="Message" req><textarea className="inp h-24" value={v.body} onChange={(x) => setV({ ...v, body: x.target.value })} /></Field>
        {e && <p role="alert" className="text-xs text-sindoor">{e}</p>}
      </div>
    </Modal>
  )
}

const rate = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : '–')
export function Campaigns() {
  const s = wa.use((x) => x)
  const parties = useApp((x) => x.parties)
  const [tab, setTab] = useState('over')
  const [open, setOpen] = useState<Camp | null>(null)
  const [adding, setAdding] = useState(false)
  const consented = parties.filter((p) => p.kind === 'customer' && p.consent && p.id !== 'c0').length
  if (!s.connected && !s.meta) return <div className="flex-1 min-h-0 scroll"><PageHead title="Campaigns" sub="Connect WhatsApp Business or a Meta ad account to run and measure campaigns." crumbs={['People', 'Campaigns']} /><div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-6 px-5"><ConnectCard title="WhatsApp Business" body="Send template campaigns to customers who agreed." go={() => toast('Open Inbox to connect WhatsApp.')} /><div><Connect meta /></div></div></div>
  const T = s.camps.reduce((a, c) => ({ spend: a.spend + c.spend, sent: a.sent + c.sent, clicks: a.clicks + c.clicks, conv: a.conv + c.conv, sales: a.sales + c.sales }), { spend: 0, sent: 0, clicks: 0, conv: 0, sales: 0 })
  const sync = () => { upd((x) => ({ camps: x.camps.map((c) => (c.state === 'Running' || c.state === 'Scheduled' ? { ...c, state: 'Running', delivered: c.delivered + Math.round(c.sent * 0.05) + 10, clicks: c.clicks + 25, conv: c.conv + 2, sales: c.sales + 7800, spend: Math.min(c.budget, c.spend + 600), trend: [...c.trend.slice(1), c.trend.at(-1)! + 3] } : c)) })); toast('Insights refreshed from Meta (simulated).') }
  const kpi = (l: string, v: string, d?: string) => <div className="panel p-3"><div className="text-xs muted">{l}</div><div className="text-xl font-semibold num">{v}</div>{d && <div className="text-xs muted">{d}</div>}</div>
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHead title="Campaigns" sub={`Meta account ${s.meta ? s.adAcct : 'not connected'} · WhatsApp ${s.connected ? 'connected' : 'not connected'}. Numbers are simulated.`} crumbs={['People', 'Campaigns']}>
        <Btn icon="sync" onClick={sync}>Refresh insights</Btn><Btn kind="primary" icon="plus" onClick={() => setAdding(true)}>New campaign</Btn>
      </PageHead>
      <div className="px-5"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'over', label: 'Dashboard' }, { id: 'list', label: 'Campaigns', badge: s.camps.length }, ...(s.meta ? [] : [{ id: 'meta', label: 'Connect Meta' }])]} /></div>
      <div className="flex-1 scroll p-5">
        {tab === 'meta' ? <Connect meta /> : tab === 'over' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{kpi('Spend', inr0(T.spend))}{kpi('Reach', compact(T.sent))}{kpi('Clicks', compact(T.clicks), `${rate(T.clicks, T.sent)} click rate`)}{kpi('Conversions', String(T.conv), `${rate(T.conv, T.clicks)} of clicks`)}{kpi('Attributed sales', inr0(T.sales))}{kpi('Return on spend', T.spend ? (T.sales / T.spend).toFixed(1) + '×' : '–')}</div>
            <div className="panel p-3"><div className="font-medium mb-2">Conversions by day</div><div className="flex gap-6 flex-wrap">{s.camps.map((c) => <div key={c.id}><div className="text-xs muted">{c.name}</div><Spark data={c.trend} w={200} h={40} /></div>)}</div></div>
            <p className="text-xs muted">Sales are matched when a bill is raised for a customer within 7 days of the message or a click, using their phone number or UTM code. {consented} customers can be messaged.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]"><thead><tr className="text-left muted text-xs"><th>Campaign</th><th>Channel</th><th>State</th><th className="text-right">Reach</th><th className="text-right">Clicks</th><th className="text-right">Conv.</th><th className="text-right">Sales</th><th className="text-right">Spend</th></tr></thead>
            <tbody>{s.camps.map((c) => <tr key={c.id} className="border-t border-rule cursor-pointer hover:bg-wash" onClick={() => setOpen(c)}><td className="py-2 font-medium">{c.name}</td><td>{c.channel}</td><td><Status s={c.state} /></td><td className="text-right num">{compact(c.sent)}</td><td className="text-right num">{c.clicks}</td><td className="text-right num">{c.conv}</td><td className="text-right num">{inr0(c.sales)}</td><td className="text-right num">{inr0(c.spend)}</td></tr>)}</tbody></table>
        )}
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} wide>
        {open && (() => { const c = s.camps.find((x) => x.id === open.id)!; const f = [['Sent', c.sent], ['Delivered', c.delivered], ['Read', c.read], ['Clicked', c.clicks], ['Bought', c.conv]] as [string, number][]; return (
          <div className="space-y-4"><div className="flex gap-2 items-center"><Status s={c.state} /><span className="text-xs muted">{c.channel} · {c.segment} · starts {c.at}</span></div>
            <div className="space-y-1">{f.map(([l, n]) => <div key={l} className="flex items-center gap-2 text-[13px]"><span className="w-20 muted">{l}</span><div className="flex-1 h-4 bg-wash rounded"><div className="h-4 bg-neel rounded" style={{ width: `${Math.max(2, (n / Math.max(...f.map((z) => z[1]), 1)) * 100)}%` }} /></div><span className="w-14 text-right num">{n}</span></div>)}</div>
            <dl className="grid grid-cols-2 gap-2 text-[13px]"><dt className="muted">Click rate</dt><dd>{rate(c.clicks, c.delivered)}</dd><dt className="muted">Conversion rate</dt><dd>{rate(c.conv, c.clicks)}</dd><dt className="muted">Attributed sales</dt><dd className="num">{inr0(c.sales)}</dd><dt className="muted">Spend / budget</dt><dd className="num">{inr0(c.spend)} / {inr0(c.budget)}</dd><dt className="muted">Cost per sale</dt><dd className="num">{c.conv ? inr0(c.spend / c.conv) : '–'}</dd></dl>
            <div className="flex gap-2">{c.state === 'Draft' && <Btn kind="primary" onClick={() => { upd((x) => ({ camps: x.camps.map((k) => (k.id === c.id ? { ...k, state: 'Running', sent: 120, delivered: 112, read: 61, clicks: 14, conv: 3, sales: 11200, spend: 400, trend: [1, 2, 3, 3, 3, 3, 3] } : k)) })); toast('Campaign sending (simulated).') }}>Send now</Btn>}
              {c.state === 'Running' && <Btn onClick={() => { upd((x) => ({ camps: x.camps.map((k) => (k.id === c.id ? { ...k, state: 'Completed' } : k)) })); toast('Campaign stopped.') }}>Stop campaign</Btn>}</div></div>) })()}
      </Drawer>
      {adding && <NewCamp consented={consented} onClose={() => setAdding(false)} />}
    </div>
  )
}

function ConnectCard({ title, body, go }: { title: string; body: string; go: () => void }) {
  return <div className="panel p-5"><h2 className="font-semibold">{title}</h2><p className="text-sm muted my-2">{body}</p><Btn onClick={go}>Connect</Btn></div>
}

function NewCamp({ consented, onClose }: { consented: number; onClose: () => void }) {
  const s = wa.use((x) => x)
  const [v, setV] = useState({ name: '', channel: 'WhatsApp', segment: 'Bought in last 90 days', tpl: 'onam_preview', budget: '5000', when: 'now' })
  const [e, setE] = useState<Record<string, string>>({})
  const go = () => {
    const er: Record<string, string> = {}
    if (!v.name.trim()) er.name = 'Name the campaign.'
    if (v.channel === 'WhatsApp' && !s.connected) er.channel = 'Connect WhatsApp Business first, in the Inbox.'
    if (v.channel === 'Meta ad' && !s.meta) er.channel = 'Connect the Meta ad account first.'
    if (!(+v.budget > 0)) er.budget = 'Enter a budget above zero.'
    setE(er)
    if (Object.keys(er).length) return
    upd((x) => ({ camps: [{ id: 'k' + Date.now(), name: v.name, channel: v.channel as Camp['channel'], segment: v.segment, tpl: v.tpl, budget: +v.budget, state: v.when === 'now' ? 'Running' : 'Draft', sent: v.when === 'now' ? (v.channel === 'WhatsApp' ? consented : 800) : 0, delivered: 0, read: 0, clicks: 0, conv: 0, sales: 0, spend: 0, trend: [0, 0, 0, 0, 0, 0, 0], at: 'Today' }, ...x.camps] }))
    toast(v.when === 'now' ? 'Campaign started. Refresh insights to see results.' : 'Saved as draft.'); onClose()
  }
  return (
    <Drawer open onClose={onClose} title="New campaign" foot={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={go}>{v.when === 'now' ? 'Start campaign' : 'Save draft'}</Btn></>}>
      <div className="space-y-3">
        <Field label="Campaign name" req error={e.name}><input autoFocus className="inp" value={v.name} onChange={(x) => setV({ ...v, name: x.target.value })} /></Field>
        <Field label="Channel" error={e.channel}><Seg label="Channel" value={v.channel as 'WhatsApp'} onChange={(x) => setV({ ...v, channel: x })} opts={[{ id: 'WhatsApp', label: 'WhatsApp' }, { id: 'Meta ad' as 'WhatsApp', label: 'Meta ad' }]} /></Field>
        <Field label="Audience" hint={v.channel === 'WhatsApp' ? `${consented} customers have agreed to messages. Others are skipped.` : 'Meta builds the audience from this description.'}><select className="inp" value={v.segment} onChange={(x) => setV({ ...v, segment: x.target.value })}><option>Bought in last 90 days</option><option>High value</option><option>Lapsed 6 months</option><option>Wedding season</option></select></Field>
        {v.channel === 'WhatsApp' && <Field label="Template"><select className="inp" value={v.tpl} onChange={(x) => setV({ ...v, tpl: x.target.value })}>{s.tpls.filter((t) => t.status === 'Approved' && t.cat !== 'Authentication').map((t) => <option key={t.id}>{t.name}</option>)}</select></Field>}
        <Field label="Budget (₹)" error={e.budget}><input type="number" min={0} className="inp num" value={v.budget} onChange={(x) => setV({ ...v, budget: x.target.value })} /></Field>
        <Field label="When"><Seg label="When" value={v.when as 'now'} onChange={(x) => setV({ ...v, when: x })} opts={[{ id: 'now', label: 'Start now' }, { id: 'draft' as 'now', label: 'Save as draft' }]} /></Field>
      </div>
    </Drawer>
  )
}
export { Icon }
