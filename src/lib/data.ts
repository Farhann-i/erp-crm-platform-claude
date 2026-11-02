import type { PackId } from './config'

export interface Item { id: string; code: string; barcode: string; name: string; hsn: string; gst: number; unit: string; mrp: number; rate: number; cost: number; stock: Record<string, number>; reorder: number; brand: string; category: string; supplierId: string; batch?: string; expiry?: string; extra?: Record<string, string> }
export interface Party { id: string; name: string; kind: 'customer' | 'supplier'; city: string; phone: string; gstin: string; balance: number; limit: number; risk: 'low' | 'medium' | 'high'; lastPay: string; overdueDays: number; consent: boolean; extra?: Record<string, string> }
export interface Ledger { id: string; name: string; group: string; bal: number }
export interface Line { itemId: string; name: string; qty: number; unit: string; rate: number; disc: number; gst: number; cost: number; rule: string }
export interface Invoice { id: string; no: string; date: string; partyId: string; partyName: string; branch: string; lines: Line[]; sub: number; tax: number; total: number; paid: number; status: 'posted' | 'draft' | 'cancelled'; pay: string; by: string }
export interface Voucher { id: string; no: string; type: string; date: string; lines: { ledger: string; dr: number; cr: number }[]; narration: string; status: 'posted' | 'draft' | 'reversed'; by: string }
export interface Approval { id: string; kind: string; title: string; by: string; amount: number; detail: string; due: string; status: 'pending' | 'approved' | 'rejected' }
export interface Conflict { id: string; doc: string; branch: string; field: string; mine: string; theirs: string; status: 'open' | 'kept mine' | 'took theirs' }
export interface HeldBill { id: string; partyId: string; lines: Line[]; at: string }
export interface Notice { id: string; text: string; at: string; read: boolean }

export const GODOWNS = [{ id: 'show', name: 'Kochi showroom' }, { id: 'god', name: 'Kochi godown' }, { id: 'kkd', name: 'Kozhikode store' }]
const st = (a: number, b: number, c: number) => ({ show: a, god: b, kkd: c })
const I = (id: string, code: string, name: string, hsn: string, gst: number, unit: string, mrp: number, rate: number, cost: number, stock: [number, number, number], reorder: number, brand: string, category: string, sup = 's1', more: Partial<Item> = {}): Item => ({ id, code, barcode: '890' + (1000000000 + id.charCodeAt(0) * 7919 + code.length * 104729 + name.length * 31).toString().slice(0, 10), name, hsn, gst, unit, mrp, rate, cost, stock: st(...stock), reorder, brand, category, supplierId: sup, ...more })

export const SEED_ITEMS: Record<PackId, Item[]> = {
  textile: [
    I('i1', 'KTN-0141', 'Kasavu cotton saree, off-white gold border', '5208', 5, 'Pcs', 3450, 2890, 2010, [14, 22, 6], 12, 'Balaramapuram', 'Sarees'),
    I('i2', 'MND-0207', 'Handloom mundu, double, 2.25 m', '5208', 5, 'Pcs', 1250, 980, 640, [40, 65, 18], 30, 'Kuthampully', 'Mundu'),
    I('i3', 'SHT-1122', 'Linen shirt, slim fit, indigo', '6205', 12, 'Pcs', 2299, 1749, 1120, [9, 30, 12], 15, 'Arrow Loom', 'Shirts'),
    I('i4', 'KRT-0315', 'Cotton kurta, block print, mustard', '6104', 5, 'Pcs', 1599, 1199, 760, [18, 26, 4], 15, 'Fabindia Select', 'Kurtas'),
    I('i5', 'FAB-0902', 'Pure silk fabric, 44 inch, maroon', '5007', 5, 'Mtr', 1890, 1540, 1180, [120, 340, 60], 100, 'Kanchi Weaves', 'Fabric', 's2'),
    I('i6', 'TWL-0044', 'Terry bath towel, 70x140 cm', '6302', 12, 'Pcs', 749, 599, 355, [8, 44, 20], 25, 'Welspun', 'Home linen', 's3'),
    I('i7', 'BED-0210', 'Double bed sheet set, 220 TC', '6302', 12, 'Box', 2490, 1990, 1260, [3, 11, 2], 8, 'Bombay Dyeing', 'Home linen', 's3'),
    I('i8', 'JNS-0551', 'Denim jeans, straight, stone wash', '6203', 12, 'Pcs', 2199, 1649, 990, [22, 40, 15], 20, 'Pepe', 'Jeans'),
    I('i9', 'SCF-0033', 'Cotton stole, ikat, rust', '6214', 5, 'Pcs', 599, 449, 260, [5, 12, 0], 10, 'Pochampally', 'Accessories', 's2'),
    I('i10', 'SKT-0420', 'School uniform shirt, white, size 32', '6205', 5, 'Pcs', 549, 449, 280, [60, 150, 40], 50, 'Raymond', 'Uniform'),
  ],
  pharmacy: [
    I('i1', 'MED-1001', 'Paracetamol 650 mg, strip of 15', '3004', 12, 'Strip', 32, 29, 21, [140, 400, 60], 120, 'Dolo', 'Analgesic', 's1', { batch: 'DL2451', expiry: '2027-03-31' }),
    I('i2', 'MED-1002', 'Amoxicillin 500 mg capsule, strip of 10', '3004', 12, 'Strip', 118, 106, 78, [30, 80, 20], 40, 'Mox', 'Antibiotic', 's1', { batch: 'MX0892', expiry: '2026-12-31' }),
    I('i3', 'MED-1003', 'Metformin 500 mg, strip of 20', '3004', 12, 'Strip', 46, 41, 29, [90, 150, 70], 80, 'Glycomet', 'Anti-diabetic', 's2', { batch: 'GM7731', expiry: '2027-08-31' }),
    I('i4', 'MED-1004', 'Cetirizine 10 mg, strip of 10', '3004', 12, 'Strip', 24, 21, 14, [8, 60, 30], 50, 'Okacet', 'Anti-allergic', 's1', { batch: 'OK1128', expiry: '2026-09-30' }),
    I('i5', 'MED-1005', 'Pantoprazole 40 mg, strip of 15', '3004', 12, 'Strip', 156, 138, 99, [55, 90, 40], 60, 'Pan', 'Gastric', 's2', { batch: 'PN4410', expiry: '2027-05-31' }),
    I('i6', 'MED-1006', 'Digital thermometer', '9025', 18, 'Pcs', 299, 249, 160, [12, 20, 6], 10, 'Omron', 'Devices', 's1'),
    I('i7', 'MED-1007', 'ORS powder, orange, 21 g', '3004', 12, 'Pcs', 22, 19, 13, [200, 300, 100], 150, 'Electral', 'Rehydration', 's1', { batch: 'EL9021', expiry: '2027-01-31' }),
    I('i8', 'MED-1008', 'Insulin glargine pen, 3 ml', '3004', 5, 'Pcs', 780, 702, 610, [6, 14, 4], 10, 'Lantus', 'Anti-diabetic', 's2', { batch: 'LN3381', expiry: '2026-11-30' }),
  ],
  cafeteria: [
    I('i1', 'BEV-001', 'Filter coffee', '2101', 5, 'Cup', 30, 30, 9, [200, 0, 0], 0, 'House', 'Beverages'),
    I('i2', 'BEV-002', 'Masala chai', '2101', 5, 'Cup', 20, 20, 5, [300, 0, 0], 0, 'House', 'Beverages'),
    I('i3', 'SNK-010', 'Ghee roast dosa', '1905', 5, 'Plate', 90, 90, 31, [60, 0, 0], 0, 'House', 'Breakfast'),
    I('i4', 'SNK-011', 'Medu vada, 2 pcs', '1905', 5, 'Plate', 50, 50, 16, [80, 0, 0], 0, 'House', 'Breakfast'),
    I('i5', 'MNS-021', 'Kerala meals, full', '9963', 5, 'Plate', 140, 140, 58, [100, 0, 0], 0, 'House', 'Meals'),
    I('i6', 'MNS-022', 'Chicken biryani', '9963', 5, 'Plate', 220, 220, 92, [45, 0, 0], 0, 'House', 'Meals'),
    I('i7', 'DST-030', 'Palada payasam', '2106', 5, 'Cup', 70, 70, 22, [40, 0, 0], 0, 'House', 'Dessert'),
    I('i8', 'BEV-005', 'Fresh lime soda', '2202', 12, 'Glass', 45, 45, 11, [90, 0, 0], 0, 'House', 'Beverages'),
  ],
  school: [
    I('i1', 'FEE-TUI', 'Tuition fee, term 2', '9992', 0, 'Term', 18500, 18500, 0, [0, 0, 0], 0, 'Academic', 'Fees'),
    I('i2', 'FEE-TRN', 'Transport fee, monthly', '9966', 0, 'Month', 1800, 1800, 0, [0, 0, 0], 0, 'Transport', 'Fees'),
    I('i3', 'FEE-LAB', 'Laboratory fee, annual', '9992', 0, 'Year', 2400, 2400, 0, [0, 0, 0], 0, 'Academic', 'Fees'),
    I('i4', 'FEE-EXM', 'Examination fee', '9992', 0, 'Term', 950, 950, 0, [0, 0, 0], 0, 'Academic', 'Fees'),
    I('i5', 'FEE-UNI', 'Uniform set', '6211', 5, 'Set', 2650, 2650, 1700, [40, 0, 0], 20, 'Store', 'Store'),
    I('i6', 'FEE-BKS', 'Textbook set, class 6', '4901', 0, 'Set', 3150, 3150, 2500, [25, 0, 0], 15, 'Store', 'Store'),
  ],
  general: [
    I('i1', 'GEN-0101', 'Steel water bottle, 750 ml, matte black', '7323', 18, 'Pcs', 899, 699, 430, [24, 60, 18], 20, 'Milton', 'Kitchen', 's1'),
    I('i2', 'GEN-0215', 'Mixer grinder, 750 W, 3 jars', '8509', 18, 'Pcs', 4290, 3390, 2480, [6, 14, 4], 6, 'Preethi', 'Appliances', 's2'),
    I('i3', 'GEN-0330', 'Cotton bedsheet set, king, floral', '6302', 12, 'Set', 1590, 1190, 720, [14, 30, 8], 12, 'Spaces', 'Home', 's3'),
    I('i4', 'GEN-0507', 'School bag, 28 L, navy', '4202', 18, 'Pcs', 1490, 1090, 640, [12, 33, 9], 12, 'Wildcraft', 'Bags', 's1'),
    I('i5', 'GEN-0802', 'Table lamp, LED, warm white', '9405', 12, 'Pcs', 799, 599, 340, [16, 28, 7], 10, 'Wipro', 'Lighting', 's3'),
    I('i6', 'GEN-0915', 'Non-stick tawa, 28 cm', '7615', 18, 'Pcs', 749, 549, 310, [20, 44, 12], 15, 'Prestige', 'Kitchen', 's1'),
    I('i7', 'GEN-0120', 'Gift hamper box, medium', '4819', 12, 'Pcs', 450, 350, 190, [30, 50, 10], 20, 'House', 'Gifts', 's2'),
    I('i8', 'GEN-0044', 'Plastic storage box set, 3 pcs', '3924', 18, 'Set', 599, 449, 260, [18, 40, 10], 15, 'Cello', 'Home', 's2'),
  ],
  hardware: [
    I('i1', 'SAN-0101', 'Wall-hung closet, white, soft close', '6910', 18, 'Pcs', 11990, 9490, 6900, [4, 9, 2], 4, 'Hindware', 'Sanitaryware', 's1'),
    I('i2', 'SAN-0215', 'Single-lever basin mixer, chrome', '8481', 18, 'Pcs', 3490, 2790, 1760, [10, 24, 6], 8, 'Jaquar', 'Faucets', 's2'),
    I('i3', 'SAN-0330', 'Overhead rain shower, 8 inch', '8481', 18, 'Pcs', 2290, 1790, 1100, [7, 18, 3], 6, 'Cera', 'Faucets', 's2'),
    I('i4', 'TIL-0507', 'Vitrified tile 600x600, ivory', '6907', 18, 'Box', 1420, 1180, 790, [60, 220, 30], 50, 'Kajaria', 'Tiles', 's1'),
    I('i5', 'ELE-0802', 'Ceiling fan, 1200 mm, brown', '8414', 18, 'Pcs', 3299, 2650, 1950, [11, 19, 5], 10, 'Orient', 'Electricals', 's3'),
    I('i6', 'ELE-0915', 'LED batten 20 W, cool white', '9405', 12, 'Pcs', 499, 369, 215, [48, 120, 40], 60, 'Philips', 'Electricals', 's3'),
    I('i7', 'HWR-0120', 'Stainless sink, single bowl', '7324', 18, 'Pcs', 5890, 4690, 3100, [2, 8, 1], 4, 'Nirali', 'Kitchen', 's1'),
    I('i8', 'PIP-0044', 'CPVC pipe 1 inch, 3 m', '3917', 18, 'Pcs', 389, 310, 205, [90, 400, 120], 150, 'Astral', 'Plumbing', 's2'),
  ],
  grocery: [
    I('i1', 'GRC-001', 'Matta rice, 5 kg', '1006', 0, 'Pkt', 395, 365, 318, [30, 80, 0], 40, 'Kerala Rice', 'Staples', 's1'),
    I('i2', 'GRC-002', 'Coconut oil, 1 L', '1513', 5, 'Pcs', 245, 225, 196, [40, 90, 0], 50, 'KLF Nirmal', 'Oils', 's1'),
    I('i3', 'GRC-003', 'Tea dust, 1 kg', '0902', 5, 'Pkt', 360, 330, 285, [25, 50, 0], 30, 'Wagh Bakri', 'Beverages', 's2'),
    I('i4', 'GRC-004', 'Sugar, loose', '1701', 5, 'Kg', 46, 44, 39, [120, 400, 0], 150, 'Loose', 'Staples', 's1'),
    I('i5', 'GRC-005', 'Toor dal, loose', '0713', 0, 'Kg', 168, 156, 138, [60, 220, 0], 80, 'Loose', 'Pulses', 's1'),
    I('i6', 'GRC-006', 'Bread, sandwich, 400 g', '1905', 0, 'Pcs', 45, 42, 36, [30, 0, 0], 20, 'Modern', 'Bakery', 's2', { expiry: '2026-11-05' }),
    I('i7', 'GRC-007', 'Milk, toned, 500 ml', '0401', 0, 'Pkt', 29, 28, 25, [80, 0, 0], 60, 'Milma', 'Dairy', 's2', { expiry: '2026-11-03' }),
    I('i8', 'GRC-008', 'Detergent powder, 1 kg', '3402', 18, 'Pkt', 135, 118, 96, [35, 70, 0], 30, 'Surf', 'Household', 's1'),
  ],
  gym: [
    I('i1', 'GYM-M01', 'Monthly membership', '9997', 18, 'Month', 1500, 1500, 0, [0, 0, 0], 0, 'Plans', 'Membership'),
    I('i2', 'GYM-Q03', 'Quarterly membership', '9997', 18, 'Quarter', 4000, 3800, 0, [0, 0, 0], 0, 'Plans', 'Membership'),
    I('i3', 'GYM-Y12', 'Annual membership', '9997', 18, 'Year', 13500, 12500, 0, [0, 0, 0], 0, 'Plans', 'Membership'),
    I('i4', 'GYM-PT10', 'Personal training, 10 sessions', '9997', 18, 'Pack', 8000, 7500, 0, [0, 0, 0], 0, 'Training', 'Training'),
    I('i5', 'GYM-LK1', 'Locker rental, monthly', '9972', 18, 'Month', 300, 300, 0, [0, 0, 0], 0, 'Plans', 'Add-on'),
    I('i6', 'GYM-WH1', 'Whey protein, 1 kg', '2106', 18, 'Pcs', 2499, 2199, 1650, [10, 0, 0], 5, 'MuscleBlaze', 'Supplements'),
  ],
}

const P = (id: string, name: string, kind: Party['kind'], city: string, phone: string, gstin: string, balance: number, limit: number, risk: Party['risk'], lastPay: string, overdueDays: number, consent = true): Party => ({ id, name, kind, city, phone, gstin, balance, limit, risk, lastPay, overdueDays, consent })
export const SEED_PARTIES: Party[] = [
  P('c0', 'Walk-in customer', 'customer', '', '', '', 0, 0, 'low', '', 0, false),
  P('c1', 'Anitha Menon', 'customer', 'Kochi', '98470 12345', '', 12400, 25000, 'low', '2026-10-18', 6),
  P('c2', 'Rajesh Nair Interiors', 'customer', 'Kozhikode', '94470 55612', '32AAFPN8821M1ZK', 186450, 200000, 'medium', '2026-09-12', 41),
  P('c3', 'Fathima Beevi', 'customer', 'Thrissur', '90480 77123', '', 3200, 10000, 'low', '2026-10-30', 0),
  P('c4', 'Hotel Sea Pearl', 'customer', 'Kochi', '0484 2394410', '32AAACH7765B1Z2', 342800, 300000, 'high', '2026-08-03', 78),
  P('c5', 'Dr. Suresh Kumar', 'customer', 'Alappuzha', '98950 44109', '', 0, 20000, 'low', '2026-10-27', 0),
  P('c6', 'Lakshmi Handlooms', 'customer', 'Kannur', '99610 22874', '32AAJFL3340Q1ZS', 74200, 100000, 'medium', '2026-09-28', 22),
  P('c7', 'Joseph Mathew', 'customer', 'Kottayam', '94460 31188', '', 8900, 15000, 'low', '2026-10-21', 3),
  P('c8', 'Sreejith Builders', 'customer', 'Kochi', '97460 88231', '32AAHFS1180N1ZV', 128000, 150000, 'medium', '2026-09-30', 29),
  P('s1', 'Kanchi Silk Weavers', 'supplier', 'Kanchipuram', '98430 11220', '33AAAFK2210D1Z8', -412500, 0, 'low', '2026-10-20', 0),
  P('s2', 'Balaramapuram Handloom Society', 'supplier', 'Thiruvananthapuram', '0471 2400981', '32AAAAB4412C1ZQ', -98400, 0, 'low', '2026-10-25', 0),
  P('s3', 'Welspun Distributors Kerala', 'supplier', 'Kochi', '0484 2331776', '32AABCW9981F1ZD', -236100, 0, 'low', '2026-10-12', 0),
]

export const SEED_LEDGERS: Ledger[] = [
  { id: 'l1', name: 'Cash in hand', group: 'Cash and bank', bal: 84250 },
  { id: 'l2', name: 'HDFC Bank current A/c 5010', group: 'Cash and bank', bal: 1264300.5 },
  { id: 'l3', name: 'Federal Bank A/c 2271', group: 'Cash and bank', bal: 418920 },
  { id: 'l4', name: 'Sundry debtors', group: 'Current assets', bal: 755950 },
  { id: 'l5', name: 'Sundry creditors', group: 'Current liabilities', bal: -747000 },
  { id: 'l6', name: 'Sales', group: 'Income', bal: -8416200 },
  { id: 'l7', name: 'Purchases', group: 'Expenses', bal: 5120400 },
  { id: 'l8', name: 'Output CGST', group: 'Duties and taxes', bal: -183400 },
  { id: 'l9', name: 'Output SGST', group: 'Duties and taxes', bal: -183400 },
  { id: 'l10', name: 'Input CGST', group: 'Duties and taxes', bal: 121800 },
  { id: 'l11', name: 'Input SGST', group: 'Duties and taxes', bal: 121800 },
  { id: 'l12', name: 'Shop rent, MG Road', group: 'Expenses', bal: 540000 },
  { id: 'l13', name: 'Salaries and wages', group: 'Expenses', bal: 912000 },
  { id: 'l14', name: 'Electricity charges', group: 'Expenses', bal: 86400 },
  { id: 'l15', name: 'Round off', group: 'Expenses', bal: 42 },
  { id: 'l16', name: 'Capital account', group: 'Capital', bal: -2500000 },
  { id: 'l17', name: 'Card settlement receivable', group: 'Current assets', bal: 23800 },
]

const dayISO = (off: number) => {
  const d = new Date()
  d.setDate(d.getDate() - off)
  return d.toISOString().slice(0, 10)
}
export function calc(lines: Line[]) {
  let sub = 0, tax = 0
  lines.forEach((l) => {
    const net = l.qty * l.rate * (1 - l.disc / 100)
    sub += net
    tax += (net * l.gst) / 100
  })
  const raw = sub + tax
  const total = Math.round(raw)
  return { sub, tax, total, round: total - raw }
}
const toLine = (it: Item, qty: number, disc = 0): Line => ({ itemId: it.id, name: it.name, qty, unit: it.unit, rate: it.rate, disc, gst: it.gst, cost: it.cost, rule: 'Item standard rate' })
export function seedInvoices(items: Item[]): Invoice[] {
  const out: Invoice[] = []
  const names = ['Anitha Menon', 'Walk-in customer', 'Rajesh Nair Interiors', 'Fathima Beevi', 'Joseph Mathew', 'Walk-in customer', 'Lakshmi Handlooms', 'Sreejith Builders']
  const ids = ['c1', 'c0', 'c2', 'c3', 'c7', 'c0', 'c6', 'c8']
  const branches = ['Kochi Main', 'Kochi Main', 'Kozhikode', 'Thrissur']
  for (let n = 0; n < 24; n++) {
    const day = Math.floor(n / 4)
    const a = items[(n * 3) % items.length], b = items[(n * 5 + 2) % items.length]
    const lines = [toLine(a, 1 + (n % 3)), toLine(b, 1 + ((n + 1) % 2), n % 5 === 0 ? 5 : 0)]
    const c = calc(lines)
    const status: Invoice['status'] = n === 17 ? 'cancelled' : n === 1 ? 'draft' : 'posted'
    const walk = ids[n % 8] === 'c0'
    out.push({ id: 'inv' + n, no: `INV/26-27/${String(1042 - n).padStart(5, '0')}`, date: dayISO(day), partyId: ids[n % 8], partyName: names[n % 8], branch: branches[n % 4], lines, sub: c.sub, tax: c.tax, total: c.total, paid: walk || n % 3 === 0 ? c.total : Math.round(c.total * 0.4), status, pay: walk ? 'Cash' : n % 3 === 0 ? 'UPI' : 'Credit', by: n % 2 ? 'Divya (cashier)' : 'Salim (manager)' })
  }
  return out
}

const V = (id: string, no: string, type: string, off: number, lines: [string, number, number][], narration: string, by = 'Rekha (accountant)'): Voucher => ({ id, no, type, date: dayISO(off), lines: lines.map(([ledger, dr, cr]) => ({ ledger, dr, cr })), narration, status: 'posted', by })
export const SEED_VOUCHERS: Voucher[] = [
  V('v1', 'RV-0310', 'Receipt', 0, [['HDFC Bank current A/c 5010', 50000, 0], ['Rajesh Nair Interiors', 0, 50000]], 'NEFT against INV/26-27/00988'),
  V('v2', 'PV-0187', 'Payment', 0, [['Kanchi Silk Weavers', 120000, 0], ['HDFC Bank current A/c 5010', 0, 120000]], 'Part payment, silk lot Oct'),
  V('v3', 'PV-0186', 'Payment', 1, [['Electricity charges', 18420, 0], ['Cash in hand', 0, 18420]], 'KSEB bill Oct, consumer 1156690'),
  V('v4', 'JV-0044', 'Journal', 2, [['Salaries and wages', 76000, 0], ['Cash in hand', 0, 76000]], 'Salary advance adjustment'),
  V('v5', 'CV-0021', 'Contra', 3, [['Cash in hand', 0, 200000], ['Federal Bank A/c 2271', 200000, 0]], 'Cash deposited'),
  V('v6', 'RV-0309', 'Receipt', 3, [['Cash in hand', 8900, 0], ['Joseph Mathew', 0, 8900]], 'Cash received'),
]
export const SEED_APPROVALS: Approval[] = [
  { id: 'ap1', kind: 'Discount', title: 'Bill discount 14% on INV/26-27/01040', by: 'Divya (cashier)', amount: 23840, detail: 'Hotel Sea Pearl, 6 bed sheet sets. Policy limit for cashier is 10%.', due: 'Today, 6:00 pm', status: 'pending' },
  { id: 'ap2', kind: 'Journal', title: 'JV-0045 Depreciation on furniture', by: 'Rekha (accountant)', amount: 42500, detail: 'Dr Depreciation, Cr Furniture and fixtures. CA review is needed above ₹1,00,000, raised for sign-off by owner.', due: 'Tomorrow', status: 'pending' },
  { id: 'ap3', kind: 'Purchase order', title: 'PO/0219 Kanchi Silk Weavers', by: 'Salim (manager)', amount: 382000, detail: 'Silk fabric 44 inch, 200 m. Above manager limit of ₹2,50,000.', due: 'Today, 5:00 pm', status: 'pending' },
  { id: 'ap4', kind: 'Credit limit', title: 'Raise Rajesh Nair Interiors limit to ₹2,50,000', by: 'Salim (manager)', amount: 250000, detail: 'Overdue 41 days on INV/26-27/00988. Payment of ₹50,000 received today.', due: 'This week', status: 'pending' },
]
export const SEED_CONFLICTS: Conflict[] = [
  { id: 'cf1', doc: 'Item KTN-0141 reorder level', branch: 'Kozhikode', field: 'Reorder level', mine: '12', theirs: '18', status: 'open' },
  { id: 'cf2', doc: 'Party Lakshmi Handlooms phone', branch: 'Thrissur', field: 'Mobile', mine: '99610 22874', theirs: '99610 22847', status: 'open' },
]
export const SEED_NOTICES: Notice[] = [
  { id: 'n1', text: 'Backup to D:\\Backups finished at 2:10 am. 412 MB.', at: 'Today', read: false },
  { id: 'n2', text: 'GSTR-1 for October is ready for validation.', at: 'Yesterday', read: false },
  { id: 'n3', text: '2 sync conflicts from Kozhikode and Thrissur need a resolver.', at: 'Yesterday', read: true },
]
