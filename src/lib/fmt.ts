export function inr(n: number, dec = 2): string {
  const neg = n < 0
  const [i, d] = Math.abs(n).toFixed(dec).split('.')
  let r = i
  if (i.length > 3) {
    const last = i.slice(-3)
    const rest = i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    r = rest + ',' + last
  }
  return (neg ? '-' : '') + '₹' + r + (dec ? '.' + d : '')
}
export const inr0 = (n: number) => inr(n, 0)
export function compact(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L'
  return inr0(n)
}
export const today = () => new Date().toISOString().slice(0, 10)
export function dmy(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y.slice(2)}`
}
function lum(hex: string) {
  const h = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
export const onColor = (bg: string) => (contrast(bg, '#ffffff') >= contrast(bg, '#14182e') ? '#ffffff' : '#14182e')
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
export function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob([[head, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
}
