import { useState } from 'react'
import { useApp, runChecks, publish, rollback, safeMode, pendingChanges, discardDraft } from '../lib/app'
import { Btn, Modal, PageHead, Confirm } from '../ui/kit'
import { Icon } from '../ui/icons'

function Checks() {
  const c = useApp((s) => s.draft)
  const checks = runChecks(c)
  return (
    <ul className="space-y-1.5" aria-label="Publish checks">
      {checks.map((k) => (
        <li key={k.id} className="flex gap-2 text-[13px]"><span className={k.ok ? 'text-mehndi' : 'text-sindoor'}><Icon n={k.ok ? 'tick' : 'warn'} size={15} /></span><div><div className="font-medium">{k.label}</div><div className={`text-xs ${k.ok ? 'muted' : 'text-sindoor'}`}>{k.detail}</div></div></li>
      ))}
    </ul>
  )
}
export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useApp((s) => s.draft)
  const [note, setNote] = useState('')
  const pend = pendingChanges()
  const blocked = runChecks(c).some((k) => !k.ok)
  return (
    <Modal open={open} onClose={onClose} title="Review and publish" foot={<><Btn onClick={onClose}>Keep editing</Btn><Btn kind="primary" disabled={blocked || !pend.length} onClick={() => { if (publish(note)) { setNote(''); onClose() } }}>{blocked ? 'Blocked by checks' : 'Publish to all branches'}</Btn></>}>
      <div className="space-y-3">
        <div><div className="text-xs font-medium mb-1">Changed</div><div className="flex flex-wrap gap-1">{pend.map((p) => <span key={p} className="chip">{p}</span>)}</div></div>
        <Checks />
        <label className="block"><span className="text-xs font-medium">Note for the change tape</span><input className="inp mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this change?" /></label>
        <p className="text-xs muted">Publishing is versioned and can be rolled back. Open drafts at the counter are not interrupted.</p>
      </div>
    </Modal>
  )
}
export function ChangeTape() {
  const s = useApp((x) => x)
  const [note, setNote] = useState('')
  const [safe, setSafe] = useState(false)
  const pend = pendingChanges()
  const blocked = runChecks(s.draft).some((k) => !k.ok)
  return (
    <>
      <PageHead title="Change tape" sub="Every change is validated, versioned, previewed, then published, with rollback. This is the tape for your configuration." crumbs={['Admin Studio', 'Change tape']}><Btn kind="danger" icon="shield" onClick={() => setSafe(true)}>Safe mode reset</Btn></PageHead>
      <div className="grid xl:grid-cols-[380px_1fr] gap-5 mx-5 pb-6">
        <div className="space-y-4">
          <section className="panel p-4 space-y-3"><h2 className="font-semibold">Pre-publish checks</h2><Checks />
            <p className="text-xs muted">Publishing is blocked if contrast, text expansion or keyboard-path checks fail. Try a light custom accent to see it block.</p></section>
          <section className="panel p-4 space-y-3"><h2 className="font-semibold">Publish</h2>
            <div className="flex flex-wrap gap-1 min-h-6">{pend.length ? pend.map((p) => <span key={p} className="chip border-haldi">{p}</span>) : <span className="text-[13px] muted">No unpublished changes.</span>}</div>
            <input aria-label="Note" className="inp" placeholder="Note, for example: Onam theme" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2"><Btn onClick={discardDraft} disabled={!pend.length}>Discard</Btn><Btn kind="primary" className="flex-1 justify-center" disabled={!pend.length || blocked} onClick={() => { if (publish(note)) setNote('') }}>{blocked ? 'Blocked by checks' : `Publish v${s.version + 1}`}</Btn></div></section>
        </div>
        <section className="panel" aria-label="Version history">
          <h2 className="px-4 py-3 font-semibold border-b border-rule">Version history</h2>
          <ol className="font-[family-name:var(--font-num)]">
            {pend.length > 0 && <li className="px-4 py-2.5 border-b border-rule draft-edge tape-line"><div className="flex justify-between"><span className="font-medium font-sans">Draft</span><span className="text-xs muted font-sans">Not published</span></div><div className="text-xs font-sans muted">{pend.join(', ')}</div></li>}
            {s.changes.map((ch) => (
              <li key={ch.id} className="px-4 py-2.5 border-b border-rule last:border-0 flex items-start gap-3">
                <span className="w-10 text-[13px] font-medium">v{ch.version}</span>
                <div className="flex-1 min-w-0 font-sans text-[13px]"><div>{ch.note}</div><div className="text-xs muted">{ch.summary.join(', ')} · {ch.by} · {ch.at}</div></div>
                <Btn className="btn-sm" onClick={() => rollback(ch)} disabled={ch.version === s.version}>{ch.version === s.version ? 'Live' : 'Roll back'}</Btn>
              </li>
            ))}
            <li className="px-4 py-2.5 flex gap-3 items-start"><span className="w-10 text-[13px] font-medium">v1</span><div className="font-sans text-[13px]"><div>Platform default with Textile and apparel pack</div><div className="text-xs muted">Installed at tenant creation</div></div></li>
          </ol>
        </section>
      </div>
      <Confirm open={safe} danger action="Reset to default" title="Reset this tenant to the platform default?" body={<p>Theme, menu, modules, terms, layouts, numbering and fields return to the default. Business data, the audit trail and period locks are not touched. This is recorded on the tape and can be rolled back.</p>} onNo={() => setSafe(false)} onYes={() => { safeMode(); setSafe(false) }} />
    </>
  )
}
