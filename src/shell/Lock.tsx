import { useEffect, useRef, useState } from 'react'
import { useApp, themeVars, setMode, get, set } from '../lib/app'
import { totp, verifyCode, rowFor } from '../lib/totp'
import { auth, USERS, DEMO_PIN, signIn, signOut, type User } from './ctx'
import { Icon } from '../ui/icons'

export function SignIn() {
  const c = useApp((s) => s.draft)
  const night = useApp((s) => s.night)
  const [who, setWho] = useState<User | null>(null)
  const [otp, setOtp] = useState(false)
  const finish = (u: User) => { signIn(u.id); setMode(u.start) }
  const v = themeVars(c, night)
  return (
    <div className="h-full grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" style={{ background: 'var(--cotton)' }}>
      <section className="hidden md:flex flex-col justify-between p-10" style={{ background: v.accent, color: v.on }} aria-label="Shop">
        <div className="text-sm opacity-85">{c.branches[0].legal}</div>
        <div><h1 className="text-4xl font-semibold leading-tight">{c.company.display}</h1><p className="mt-2 text-lg opacity-85 max-w-sm">{c.company.tagline}</p></div>
        <div className="text-xs opacity-80 max-w-sm">Runs on this computer first. Bills, stock and books keep working without internet and sync when it returns.</div>
      </section>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {!who ? <>
            <h2 className="text-xl font-semibold">Who is signing in?</h2>
            <p className="text-sm muted mb-4">Choose your name. Prototype users, no real accounts.</p>
            <ul className="panel divide-y divide-rule">{USERS.map((u) => <li key={u.id}><button onClick={() => setWho(u)} className="w-full h-14 px-4 flex items-center gap-3 text-left hover:bg-wash"><span className="size-8 rounded-full grid place-items-center text-sm font-semibold bg-neel text-onneel" aria-hidden>{u.name[0]}</span><span className="flex-1"><span className="block font-medium">{u.name}</span><span className="text-xs muted">{u.role}</span></span><Icon n="right" size={14} className="muted" /></button></li>)}</ul>
          </> : otp ? <OtpChallenge user={who} onBack={() => { setOtp(false); setWho(null) }} onOk={() => finish(who)} /> : <PinPad user={who} onBack={() => setWho(null)} onOk={() => (rowFor(get().rows, who.id) ? setOtp(true) : finish(who))} />}
        </div>
      </main>
    </div>
  )
}

export function PinPad({ user, onOk, onBack }: { user: User; onOk: () => void; onBack?: () => void }) {
  const [pin, setPin] = useState('')
  const [bad, setBad] = useState(0)
  const [wait, setWait] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t) }, [wait])
  const push = (d: string) => {
    if (wait > 0) return
    const n = (pin + d).slice(0, 4)
    setPin(n)
    if (n.length === 4) {
      if (n === DEMO_PIN) onOk()
      else { const b = bad + 1; setBad(b); setPin(''); if (b >= 3) { setWait(10); setBad(0) } }
    }
  }
  const msg = wait > 0 ? `Too many wrong PINs. Try again in ${wait} s.` : bad > 0 ? `That PIN is not right. ${3 - bad} ${3 - bad === 1 ? 'try' : 'tries'} left.` : 'Enter your 4-digit PIN.'
  return (
    <div ref={ref} tabIndex={-1} className="outline-none" onKeyDown={(e) => { if (/^\d$/.test(e.key)) push(e.key); else if (e.key === 'Backspace') setPin(pin.slice(0, -1)) }}>
      <div className="flex items-center gap-3 mb-4"><span className="size-10 rounded-full grid place-items-center font-semibold bg-neel text-onneel" aria-hidden>{user.name[0]}</span><div><div className="font-semibold">{user.name}</div><div className="text-xs muted">{user.role}</div></div></div>
      <div className="flex gap-3 mb-2" role="img" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map((i) => <span key={i} className={`size-3.5 rounded-full border ${i < pin.length ? 'bg-ink border-ink' : 'border-ink/50'}`} />)}</div>
      <p className={`text-sm mb-3 ${bad || wait ? 'text-sindoor' : 'muted'}`} role="status">{msg} <span className="muted">Demo PIN: {DEMO_PIN}</span></p>
      <div className="grid grid-cols-3 gap-2">{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} className="btn btn-lg justify-center text-lg" disabled={wait > 0} onClick={() => push(d)}>{d}</button>)}
        <button className="btn btn-lg justify-center" onClick={onBack ?? signOut}>{onBack ? 'Back' : 'Sign out'}</button><button className="btn btn-lg justify-center text-lg" disabled={wait > 0} onClick={() => push('0')}>0</button><button className="btn btn-lg justify-center" aria-label="Delete last digit" onClick={() => setPin(pin.slice(0, -1))}>⌫</button></div>
    </div>
  )
}

export function LockScreen() {
  const id = auth.use((s) => s.user)
  const user = USERS.find((u) => u.id === id)!
  return (
    <div role="dialog" aria-modal="true" aria-label="Screen locked" className="fixed inset-0 z-[80] grid place-items-center p-6" style={{ background: 'var(--cotton)' }}>
      <div className="w-full max-w-xs"><div className="flex items-center gap-2 mb-5 text-sm muted"><Icon n="lock" size={15} />Locked. Your open bills are kept.</div><PinPad user={user} onOk={() => auth.set({ locked: false })} /></div>
    </div>
  )
}

export function OtpChallenge({ user, onOk, onBack }: { user: User; onOk: () => void; onBack: () => void }) {
  const [c, setC] = useState(''); const [err, setErr] = useState(''); const [tries, setTries] = useState(0); const [demo, setDemo] = useState('')
  const row = rowFor(get().rows, user.id)
  useEffect(() => { if (!row) return; const f = () => totp(String(row.secret)).then(setDemo); f(); const t = setInterval(f, 1000); return () => clearInterval(t) }, [row])
  const submit = async () => {
    if (!row || tries >= 5) return
    const code = c.trim().toLowerCase()
    if (/^\d{6}$/.test(code) && (await verifyCode(String(row.secret), code))) return onOk()
    const rc = String(row.rc ?? '').split(',').filter(Boolean)
    if (rc.includes(code)) { set((s) => ({ rows: { ...s.rows, 'cfg:2fa': (s.rows['cfg:2fa'] ?? []).map((r) => (r.id === user.id ? { ...r, rc: rc.filter((x) => x !== code).join(',') } : r)) } })); return onOk() }
    setTries(tries + 1); setC(''); setErr(tries + 1 >= 5 ? 'Too many wrong codes. Go back and sign in again.' : `That code is not right. ${4 - tries} ${4 - tries === 1 ? 'try' : 'tries'} left. Codes change every 30 seconds.`)
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <h2 className="text-xl font-semibold">Second step</h2>
      <p className="text-sm muted mb-3">Enter the 6-digit code from your authenticator app, or one recovery code.</p>
      <label htmlFor="otp" className="text-[13px] font-medium">Code</label>
      <input id="otp" autoFocus autoComplete="one-time-code" inputMode="numeric" className="inp h-11 num text-lg tracking-widest" value={c} onChange={(e) => setC(e.target.value)} aria-describedby="otp-m" />
      <p id="otp-m" role="status" className={`text-sm mt-2 ${err ? 'text-sindoor' : 'muted'}`}>{err || 'Prototype: the demo authenticator code is shown below.'}</p>
      <p className="text-xs muted mt-1">Demo authenticator: <b className="num">{demo}</b></p>
      <div className="flex gap-2 mt-4"><button type="button" className="btn btn-lg" onClick={onBack}>Back</button><button type="submit" className="btn btn-lg btn-primary" disabled={!c.trim() || tries >= 5}>Verify</button></div>
    </form>
  )
}
