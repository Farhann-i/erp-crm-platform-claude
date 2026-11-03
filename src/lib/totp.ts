const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32dec(s: string) {
  let bits = ''
  for (const ch of s.replace(/=+$/, '')) bits += B32.indexOf(ch).toString(2).padStart(5, '0')
  const out: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return new Uint8Array(out)
}
/** RFC 6238 time-based one-time code, 6 digits, 30 second step. */
export async function totp(secret: string, t = Date.now()) {
  const key = await crypto.subtle.importKey('raw', b32dec(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const c = Math.floor(t / 30000)
  const buf = new ArrayBuffer(8); const dv = new DataView(buf)
  dv.setUint32(0, Math.floor(c / 2 ** 32)); dv.setUint32(4, c >>> 0)
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const o = h[19] & 15
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1e6).padStart(6, '0')
}
export async function verifyCode(secret: string, code: string) {
  for (const d of [-1, 0, 1]) if ((await totp(secret, Date.now() + d * 30000)) === code) return true
  return false
}
export const newSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => B32[b % 32]).join('')
export const newRecovery = () => Array.from({ length: 5 }, () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => '0123456789abcdefghjkmnpqrstuvwxyz'[b % 33]).join('').replace(/(.{4})/, '$1-'))
export const rowFor = (rows: Record<string, Record<string, string | number>[]>, uid: string) => (rows['cfg:2fa'] ?? []).find((r) => r.id === uid && r.on === '1')
