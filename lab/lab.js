/* Phòng lab RCT: lịch mỗi người bốc theo seed (ngày + id), nhân vật đi bộ bằng BFS trên lưới 16 px. */
(async () => {
const CFG = await fetch('config.json').then(r => r.json());
const { OUT: O, buildChar, icon, paint } = window.SPR;

/* ---------- Seed và bốc theo trọng số ---------- */
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (w, r) => { const e = Object.entries(w).filter(([, v]) => v > 0); if (!e.length) return Object.keys(w)[0];
  let x = r() * e.reduce((a, [, v]) => a + v, 0); for (const [k, v] of e) if ((x -= v) < 0) return k; return e[e.length - 1][0]; };

/* ---------- Giờ Việt Nam, ngày lab bắt đầu lúc dayStart ---------- */
const DAY = 86400000;
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const START = toMin(CFG.dayStart);
function vnNowMs() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: CFG.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}
const labKey = ms => new Date(ms - START * 60000).toISOString().slice(0, 10);
const labMin = ms => (((ms - START * 60000) % DAY) + DAY) % DAY / 60000;
const rel = s => ((toMin(s) - START) % 1440 + 1440) % 1440;
const relTo = s => rel(s) || 1440;
const weekday = day => new Date(day + 'T00:00:00Z').getUTCDay();

/* ---------- Kế hoạch trong ngày ---------- */
const cache = new Map();
function planFor(p, day) {
  const k = day + '|' + p.id;
  if (cache.has(k)) return cache.get(k);
  const r = rng(hash(k));
  let plan;
  if ((CFG.closedDays || []).includes(weekday(day))) plan = { tpl: 'Lab nghỉ', slots: [{ from: CFG.dayStart, to: CFG.dayStart, act: 'vang', variant: 0 }] };
  else if (r() * 100 < (p.absentRate || 0)) plan = { tpl: 'Vắng cả ngày', slots: [{ from: CFG.dayStart, to: CFG.dayStart, act: 'vang', variant: 0 }] };
  else {
    const tk = pick(p.templates, r), tpl = CFG.templates[tk];
    plan = { tpl: tpl.label || tk, slots: tpl.slots.map(s => {
      const act = pick(s.weights, r), vs = CFG.actions[act].variants;
      const variant = +pick(Object.fromEntries(vs.map((v, i) => [i, v.w ?? 1])), r);
      return { from: s.from, to: s.to, act, variant };
    }) };
  }
  cache.set(k, plan);
  return plan;
}
const inRange = (m, from, to) => rel(from) <= m && m < relTo(to);
const currentSlot = (plan, m) => plan.slots.find(s => inRange(m, s.from, s.to)) || { act: 'vang', variant: 0 };
const eventsAt = (day, m) => (CFG.events || []).filter(e => !(CFG.closedDays || []).includes(weekday(day)) && e.days.includes(weekday(day)) && inRange(m, e.from, e.to));
const presentToday = (p, day) => planFor(p, day).slots.length > 1; // người vắng cả ngày không bị kéo vào sự kiện

/* ---------- Bố cục phòng (px, khung 320x208, ô 16 px) ---------- */
const W = 320, H = 208, TS = 16;
const SPOTS = {
  desk_A:      { label: 'Bàn A',          seats: [{ x: 64, y: 94, dir: 'up', pose: 'sit' }] },
  desk_PI:     { label: 'Bàn PI',         seats: [{ x: 248, y: 94, dir: 'up', pose: 'sit' }] },
  may_in:      { label: 'Máy in 3D',      seats: [{ x: 264, y: 124, dir: 'right' }] },
  ban_lap_rap: { label: 'Bàn lắp ráp',    seats: [{ x: 264, y: 156, dir: 'right' }] },
  sofa:        { label: 'Sofa',           seats: [{ x: 96, y: 162, dir: 'down', pose: 'sitdown' }, { x: 112, y: 162, dir: 'down', pose: 'sitdown' }] },
  tu_sach:     { label: 'Tủ sách',        seats: [{ x: 34, y: 58, dir: 'up' }, { x: 52, y: 58, dir: 'up' }] },
  bang_trang:  { label: 'Bảng trắng',     seats: [{ x: 144, y: 46, dir: 'up' }, { x: 176, y: 46, dir: 'up' }] },
  canh_ban_PI: { label: 'Cạnh bàn PI',    seats: [{ x: 214, y: 100, dir: 'right' }] },
  pantry:      { label: 'Góc cà phê',     seats: [{ x: 44, y: 140, dir: 'left' }, { x: 44, y: 124, dir: 'left' }] },
  hop:         { label: 'Bảng trắng',     seats: [{ x: 160, y: 56, dir: 'down' }, { x: 148, y: 100, dir: 'up' }, { x: 172, y: 100, dir: 'up' }] },
  san:         { label: 'Giữa phòng',     seats: [{ x: 120, y: 120, dir: 'down' }, { x: 200, y: 140, dir: 'down' }] },
  door:        { label: 'Vắng',           seats: [{ x: 160, y: 214, dir: 'down' }] }
};
const blocked = new Set();
const block = (c0, c1, r0, r1) => { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) blocked.add(c + ',' + r); };
block(1, 2, 2, 2);    // tủ sách
block(3, 5, 4, 4); block(3, 3, 5, 5); block(5, 5, 5, 5);       // bàn A, chừa ô ghế (4,5)
block(14, 16, 4, 4); block(14, 14, 5, 5); block(16, 16, 5, 5); // bàn PI, chừa ô ghế (15,5)
block(17, 18, 2, 2);  // chậu cây góc phải
block(17, 18, 6, 10); // bàn thiết bị
block(1, 1, 7, 10);   // quầy cà phê
block(5, 7, 8, 9);    // sofa
block(5, 7, 11, 11);  // bàn trà
block(12, 12, 10, 11);// chậu cây dưới
const walkable = (c, r) => (c >= 1 && c <= 18 && r >= 2 && r <= 11 && !blocked.has(c + ',' + r)) || (r === 12 && (c === 9 || c === 10));
const tileOf = (x, y) => [Math.floor(x / TS), Math.min(12, Math.floor((y - 1) / TS))];

function bfs(sc, sr, tc, tr) {
  const key = (c, r) => c + ',' + r, prev = new Map([[key(sc, sr), null]]), q = [[sc, sr]];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === tc && r === tr) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, k = key(nc, nr);
      if (!prev.has(k) && walkable(nc, nr)) { prev.set(k, [c, r]); q.push([nc, nr]); }
    }
  }
  const out = []; let cur = prev.has(key(tc, tr)) ? [tc, tr] : null;
  while (cur) { out.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
  return out.slice(1).map(([c, r]) => ({ x: c * TS + 8, y: r * TS + 12 }));
}

/* ---------- Ai đang ở đâu ---------- */
const PEOPLE = [...CFG.people].sort((a, b) => (b.role === 'PI') - (a.role === 'PI'));
const spotOf = (name, p) => name === 'ban_rieng' ? 'desk_' + p.desk : name;
function resolveAll(ms) {
  const day = labKey(ms), m = labMin(ms), occ = {}, out = {};
  const evs = eventsAt(day, m);
  for (const p of PEOPLE) {
    let act, variant = 0, seatIdx = null;
    const ev = presentToday(p, day) ? evs.find(e => e.who.includes(p.id)) : null;
    if (ev) { act = ev.act; seatIdx = ev.who.indexOf(p.id); }
    else { const s = currentSlot(planFor(p, day), m); act = s.act; variant = s.variant; }
    let A = CFG.actions[act];
    if (A.needsPI) {
      const pi = PEOPLE.find(q => q.role === 'PI'), piNow = pi && out[pi.id];
      if (!piNow || piNow.spot !== 'desk_' + pi.desk) { act = A.fallback; A = CFG.actions[act]; variant = 0; }
    }
    const v = A.variants[variant] || A.variants[0];
    let spot = spotOf(v.spot, p);
    if (!SPOTS[spot]) spot = 'san';
    let seat;
    if (spot === 'door') seat = 0;
    else if (seatIdx !== null && seatIdx < SPOTS[spot].seats.length) seat = seatIdx;
    else {
      const n = occ[spot] || 0;
      if (n < SPOTS[spot].seats.length) seat = n; else { spot = 'san'; seat = Math.min(occ.san || 0, 1); }
    }
    occ[spot] = (occ[spot] || 0) + 1;
    const st = SPOTS[spot].seats[seat];
    let pose = st.pose || 'stand';
    if (pose === 'sit') pose = v.pose === 'sleep' ? 'sleep' : v.pose === 'type' ? 'type' : 'sit';
    if (pose === 'sitdown' && v.pose === 'read') pose = 'read';
    out[p.id] = { act, spot, seat: st, key: spot + ':' + seat + ':' + act, pose, event: ev?.label };
  }
  return out;
}

/* ---------- Vẽ ---------- */
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const g = scene.getContext('2d');
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const box = (x, y, w, h, fill, hi, sh) => { R(x, y, w, h, O); R(x + 1, y + 1, w - 2, h - 2, fill); if (hi) R(x + 1, y + 1, w - 2, 1, hi); if (sh) R(x + 1, y + h - 2, w - 2, 1, sh); };

const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
function drawStatic() {
  const b = bg.getContext('2d');
  const R2 = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
  // sàn gỗ
  for (let y = 32, i = 0; y < 192; y += 8, i++) {
    R2(16, y, 288, 8, i % 2 ? '#e2b98a' : '#e7c193');
    R2(16, y, 288, 1, '#efd0a6'); R2(16, y + 7, 288, 1, '#c99c6c');
    for (let x = 16 + (i * 13) % 32; x < 304; x += 32) R2(x, y + 1, 1, 6, '#c99c6c');
    for (let x = 24 + (i * 29) % 48; x < 300; x += 48) R2(x, y + 3, 2, 1, '#d4a97a');
  }
  // thảm khu họp
  R2(118, 62, 84, 60, O); R2(119, 63, 82, 58, '#163c6c'); R2(122, 66, 76, 52, '#dbe7f4'); R2(124, 68, 72, 48, '#c6d8ee');
  for (let x = 128; x < 194; x += 8) { R2(x, 64, 2, 1, '#e9803d'); R2(x, 119, 2, 1, '#e9803d'); }
  R2(124, 68, 72, 1, '#e8f0fa');
  // bóng chân tường
  R2(16, 32, 288, 3, 'rgba(44,33,55,.12)');
  // tường trên
  R2(0, 0, 320, 6, '#3b4a6b'); R2(0, 0, 320, 1, '#56688c'); R2(16, 5, 288, 1, O);
  R2(16, 6, 288, 24, '#e3ecf6');
  for (let x = 20; x < 304; x += 8) R2(x, 6, 1, 16, '#d8e3f0');
  R2(16, 21, 288, 1, '#9fb6d1'); R2(16, 22, 288, 8, '#bccde2'); R2(16, 22, 288, 1, '#cfdcec');
  R2(16, 30, 288, 2, '#7f97b6');
  // tường bên và dưới
  R2(0, 0, 16, 208, '#3b4a6b'); R2(15, 5, 1, 188, O); R2(304, 0, 16, 208, '#3b4a6b'); R2(304, 5, 1, 188, O);
  R2(0, 192, 320, 16, '#3b4a6b'); R2(15, 192, 290, 1, O);
  R2(0, 0, 1, 208, '#56688c'); R2(319, 0, 1, 208, '#2c3550');
  // cửa ra vào
  R2(144, 192, 32, 16, '#e2b98a'); R2(144, 192, 32, 1, '#c99c6c'); R2(143, 192, 1, 16, O); R2(176, 192, 1, 16, O);
  R2(146, 184, 28, 7, O); R2(147, 185, 26, 5, '#c0523a'); for (let x = 149; x < 172; x += 3) R2(x, 186, 1, 3, '#d9715a');
  // cửa sổ
  const win = (x, y) => {
    R2(x, y, 34, 19, O); R2(x + 1, y + 1, 32, 17, '#f4f7fb'); R2(x + 3, y + 3, 28, 13, '#a9d8f5'); R2(x + 3, y + 11, 28, 5, '#c7e8fa');
    R2(x + 16, y + 3, 2, 13, '#f4f7fb'); R2(x + 3, y + 9, 28, 1, '#f4f7fb');
    R2(x + 6, y + 5, 3, 1, '#ffffff'); R2(x + 5, y + 6, 2, 1, '#ffffff'); R2(x + 21, y + 4, 2, 1, '#ffffff');
    R2(x - 2, y + 19, 38, 2, O); R2(x - 1, y + 19, 36, 1, '#dfe6ef');
  };
  win(72, 4); win(234, 4);
  // bảng trắng với sơ đồ vòng điều khiển
  R2(118, 5, 84, 21, O); R2(119, 6, 82, 19, '#aab6c6'); R2(120, 7, 80, 17, '#fbfcfe');
  const bx = (x, y) => { R2(x, y, 9, 6, '#163c6c'); R2(x + 1, y + 1, 7, 4, '#fbfcfe'); };
  R2(124, 13, 4, 1, '#163c6c'); bx(128, 10); R2(137, 13, 5, 1, '#163c6c'); bx(142, 10); R2(151, 13, 8, 1, '#163c6c'); R2(157, 12, 1, 3, '#163c6c');
  R2(155, 13, 1, 6, '#e9803d'); R2(132, 18, 24, 1, '#e9803d'); R2(132, 15, 1, 4, '#e9803d');
  for (let i = 0; i < 5; i++) R2(164 + i * 6, 9, 4, 1, '#566577');
  for (let i = 0; i < 4; i++) R2(164 + i * 7, 13, 5, 1, '#566577');
  for (let x = 164; x < 194; x++) R2(x, 20 - Math.round(2 * Math.sin((x - 164) / 3)), 1, 1, '#0084ed');
  R2(130, 25, 60, 2, O); R2(131, 25, 58, 1, '#8a97a8'); R2(140, 24, 4, 1, '#c0523a'); R2(147, 24, 4, 1, '#163c6c');
  // poster mạng RCT
  R2(281, 8, 16, 16, O); R2(282, 9, 14, 14, '#163c6c');
  const dots = [[285, 12], [292, 12], [288, 16], [285, 20], [292, 20]];
  R2(286, 13, 6, 1, '#72afe1'); R2(286, 21, 6, 1, '#72afe1'); R2(288, 13, 1, 8, '#72afe1');
  for (const [x, y] of dots) R2(x, y, 2, 2, '#e1ecf9'); R2(288, 16, 2, 2, '#e9803d');
}

function bookshelf(x, y) {
  box(x, y, 30, 40, '#9a6a43', '#b98559'); R(x + 2, y + 3, 26, 34, '#5e3b23');
  const BK = ['#c0523a', '#163c6c', '#e9803d', '#72afe1', '#4f8a5b', '#f0d27a', '#8e6bb8', '#e8e0cc'];
  for (let s = 0; s < 3; s++) {
    const sy = y + 3 + s * 12; R(x + 1, sy + 10, 28, 2, '#9a6a43'); R(x + 1, sy + 10, 28, 1, '#b98559');
    let bx2 = x + 3, n = s * 5;
    while (bx2 < x + 26) { n++; const w = 2 + (n * 7) % 2, h = 7 + (n * 5) % 3, c = BK[(n * 3 + s) % BK.length];
      if (bx2 + w > x + 27) break; R(bx2, sy + 10 - h, w, h, c); R(bx2 + w - 1, sy + 10 - h, 1, h, 'rgba(0,0,0,.18)'); R(bx2, sy + 10 - h, w, 1, 'rgba(255,255,255,.3)');
      bx2 += w + (n % 4 === 0 ? 2 : 0); }
  }
}
function desk(x, y, w) {
  R(x, y, w, 21, O); R(x + 1, y + 1, w - 2, 11, '#dcae7a'); R(x + 1, y + 1, w - 2, 1, '#efc896'); R(x + 1, y + 12, w - 2, 1, '#b9875a');
  R(x + 1, y + 13, w - 2, 7, '#b07a4a'); R(x + w - 15, y + 14, 13, 5, O); R(x + w - 14, y + 15, 11, 3, '#c08a58'); R(x + w - 10, y + 16, 3, 1, O);
  R(x + 1, y + 20, 3, 3, O); R(x + w - 4, y + 20, 3, 3, O);
}
function monitor(x, y, on, t) {
  R(x, y, 16, 11, O); R(x + 1, y + 1, 14, 9, '#33415e'); R(x + 2, y + 2, 12, 7, on ? '#14263a' : '#2a3446');
  if (on) { const k = Math.floor(t * 4);
    for (let i = 0; i < 4; i++) { const w = 2 + ((k + i * 3) * 7) % 7; R(x + 3 + (i % 2) * 2, y + 3 + i * 1.5 | 0, w, 1, ['#5cf08e', '#72afe1', '#e9803d', '#f0d27a'][(k + i) % 4]); }
  } else R(x + 3, y + 3, 3, 1, '#3e4b66');
  R(x + 7, y + 11, 2, 2, '#4a5878'); R(x + 5, y + 12, 6, 1, O);
}
function chair(cx, cy) {
  R(cx - 6, cy - 8, 12, 9, O); R(cx - 5, cy - 7, 10, 7, '#3b4a6b'); R(cx - 5, cy - 7, 10, 1, '#5a6d94'); R(cx - 5, cy - 2, 10, 1, '#2c3550');
  R(cx - 1, cy + 1, 2, 2, O); R(cx - 5, cy + 3, 10, 1, O); R(cx - 6, cy + 4, 2, 1, O); R(cx + 4, cy + 4, 2, 1, O);
}
function printer(x, y, busy, t, prog) {
  R(x, y, 20, 26, O); R(x + 1, y + 1, 18, 24, '#3b4a6b'); R(x + 1, y + 1, 18, 3, '#56688c');
  R(x + 3, y + 5, 14, 14, '#1d2436'); R(x + 4, y + 17, 12, 2, '#9aa7b8');
  const h = Math.round(prog * 8); if (h) { R(x + 8, y + 17 - h, 4, h, '#e9803d'); R(x + 8, y + 17 - h, 4, 1, '#f3a56c'); }
  const nx = busy ? Math.round(4 + 4 * Math.sin(t * 6)) : 5;
  R(x + 3, y + 7, 14, 1, '#9aa7b8'); R(x + 3 + nx, y + 6, 5, 3, '#cfd8e3'); R(x + 5 + nx, y + 9, 1, 1, busy ? '#ff9a4d' : '#9aa7b8');
  R(x + 3, y + 21, 6, 3, busy ? '#8fd3ff' : '#4a5878'); R(x + 12, y + 21, 2, 2, busy ? '#5cf08e' : '#2c3550');
  R(x + 19, y + 6, 3, 8, O); R(x + 19, y + 7, 2, 6, '#e9803d');
}
function robotCar(x, y) {
  const wheel = (wx, wy, flip) => { R(wx, wy, 5, 7, O); R(wx + 1, wy + 1, 3, 5, '#4a5878'); for (let i = 0; i < 3; i++) R(wx + 1 + (flip ? 2 - i : i), wy + 2 + i, 1, 1, '#9aa7b8'); };
  wheel(x, y, 0); wheel(x + 15, y, 1); wheel(x, y + 9, 1); wheel(x + 15, y + 9, 0);
  box(x + 4, y + 1, 12, 14, '#163c6c', '#2f5a91'); R(x + 7, y + 5, 6, 6, O); R(x + 8, y + 6, 4, 4, '#e9803d'); R(x + 9, y + 7, 2, 1, '#f3a56c');
}
function scope(x, y, t) {
  box(x, y, 18, 13, '#9aa7b8', '#c4ccd8'); R(x + 2, y + 2, 10, 8, '#16302a');
  for (let i = 0; i < 10; i++) R(x + 2 + i, y + 5 + Math.round(2 * Math.sin(i * 0.9 + t * 5)), 1, 1, '#5cf08e');
  R(x + 13, y + 3, 3, 2, '#3b4a6b'); R(x + 13, y + 7, 3, 2, '#e9803d');
}
function bench(x, y) {
  R(x, y, 26, 72, O); R(x + 1, y + 1, 24, 64, '#d5dde8'); R(x + 1, y + 1, 1, 64, '#eef2f7'); R(x + 1, y + 65, 24, 6, '#8e9bb0'); R(x + 1, y + 65, 24, 1, '#6f7f96');
  R(x + 3, y + 71, 3, 3, O); R(x + 20, y + 71, 3, 3, O);
}
function pantry(x, y, steam, t) {
  R(x, y, 18, 66, O); R(x + 1, y + 1, 16, 58, '#e8edf3'); R(x + 1, y + 1, 1, 58, '#ffffff'); R(x + 1, y + 59, 16, 6, '#9aa7b8'); R(x + 1, y + 59, 16, 1, '#7f8ea4');
  // máy pha cà phê
  R(x + 2, y + 6, 13, 16, O); R(x + 3, y + 7, 11, 14, '#3b4a6b'); R(x + 3, y + 7, 11, 2, '#56688c'); R(x + 5, y + 12, 7, 6, '#1d2436'); R(x + 12, y + 9, 1, 1, '#ff5a4d');
  R(x + 7, y + 16, 3, 3, '#ffffff'); R(x + 7, y + 16, 3, 1, '#7b4a2a');
  if (steam) for (let i = 0; i < 3; i++) R(x + 7 + ((Math.floor(t * 3) + i) % 2) * 2, y + 13 - i * 2 - 3 * 0, 1, 1, 'rgba(255,255,255,.85)');
  // bình nước và cốc
  R(x + 4, y + 28, 10, 14, O); R(x + 5, y + 29, 8, 12, '#a9d8f5'); R(x + 5, y + 29, 8, 3, '#d4ecfb'); R(x + 6, y + 33, 1, 6, '#e8f6ff');
  R(x + 5, y + 48, 5, 5, O); R(x + 6, y + 49, 3, 3, '#e9803d'); R(x + 10, y + 49, 2, 2, O);
}
function sofa(x, y) {
  box(x, y, 48, 13, '#e9803d', '#f3a56c', '#c9662a');
  box(x + 3, y + 10, 42, 13, '#d9712f', '#ec8c4b', '#b95e26');
  box(x, y + 7, 7, 17, '#e9803d', '#f3a56c'); box(x + 41, y + 7, 7, 17, '#e9803d', '#f3a56c');
  R(x + 24, y + 11, 1, 10, '#b95e26'); R(x + 3, y + 23, 3, 2, O); R(x + 42, y + 23, 3, 2, O);
}
function table(x, y) { box(x, y, 32, 10, '#dcae7a', '#efc896'); R(x + 1, y + 9, 30, 3, '#b07a4a'); R(x, y + 12, 32, 1, O); R(x + 4, y + 2, 7, 5, '#fbf4e2'); R(x + 5, y + 3, 5, 1, '#9aa7b8'); R(x + 22, y + 3, 4, 4, O); R(x + 23, y + 4, 2, 2, '#e9803d'); }
const PLANT = ['....gg..G.....', '..G.gGg.gG....', '.gGg.ggGgg.G..', '..ggGgggGggGg.', '.gGggGgLgggg..', 'gggLgggGgLggG.', '.GgggLggggGgg.', '..ggGggLggg...', '...g.GgggG....', '....OOOOOO....', '...OppppppO...', '...OPPPPPPO...', '...OPPPPPPO...', '....OPPPPO....', '....OOOOOO....'];
const PLANT_PAL = { g: '#4f8a5b', G: '#2f6b4a', L: '#7cc08a', p: '#d9806a', P: '#b5653b' };
function plant(x, y) { paint(g, PLANT, PLANT_PAL, x, y); }
function clock(x, y, ms) {
  R(x + 1, y, 8, 10, O); R(x, y + 1, 10, 8, O); R(x + 1, y + 1, 8, 8, '#ffffff'); R(x + 2, y + 1, 6, 1, '#e8f0fa');
  const d = new Date(ms), hA = ((d.getUTCHours() % 12) + d.getUTCMinutes() / 60) / 12 * 2 * Math.PI, mA = d.getUTCMinutes() / 60 * 2 * Math.PI;
  R(x + 4, y + 4, 2, 2, O);
  R(x + 4 + Math.round(Math.sin(mA) * 3), y + 4 - Math.round(Math.cos(mA) * 3), 1, 1, '#163c6c');
  R(x + 4 + Math.round(Math.sin(hA) * 2), y + 4 - Math.round(Math.cos(hA) * 2), 1, 1, '#c0523a');
}

/* ---------- Nhân vật ---------- */
const chars = PEOPLE.map((p, i) => ({ p, i, F: buildChar(p.look, p.palette), x: 160, y: 214, dir: 'up', pose: 'stand', path: [], hidden: true, key: null, act: 'vang', anim: 0, final: null }));
const SPEED = 48; // px mỗi giây thật
function retarget(ch, r, snap) {
  ch.key = r.key; ch.act = r.act; ch.final = r;
  if (snap) { ch.hidden = r.spot === 'door'; ch.x = r.seat.x; ch.y = r.seat.y; ch.path = []; ch.dir = r.seat.dir; ch.pose = r.pose; return; }
  if (ch.hidden && r.spot === 'door') { ch.path = []; return; }
  if (ch.hidden) { ch.hidden = false; ch.x = 160; ch.y = 214; }
  const [sc, sr] = tileOf(ch.x, ch.y), [tc, tr] = tileOf(r.seat.x, r.seat.y);
  ch.path = [...bfs(sc, sr, tc, tr), { x: r.seat.x, y: r.seat.y }];
  ch.pose = 'walk';
}
function step(ch, dt) {
  if (ch.hidden || !ch.path.length) return;
  let move = SPEED * dt;
  while (move > 0 && ch.path.length) {
    const n = ch.path[0], dx = n.x - ch.x, dy = n.y - ch.y, d = Math.hypot(dx, dy);
    if (d > 0.01) ch.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (d <= move) { ch.x = n.x; ch.y = n.y; ch.path.shift(); move -= d; } else { ch.x += dx / d * move; ch.y += dy / d * move; move = 0; }
  }
  ch.anim += dt;
  if (!ch.path.length) {
    if (ch.final.spot === 'door') { ch.hidden = true; return; }
    ch.dir = ch.final.seat.dir; ch.pose = ch.final.pose;
  }
}
function drawChar(ch, t, sel) {
  const x = Math.round(ch.x), y = Math.round(ch.y), F = ch.F;
  const seated = ['sit', 'type', 'sleep', 'sitdown', 'read'].includes(ch.pose);
  if (!seated || ch.pose === 'sitdown' || ch.pose === 'read') { R(x - 5, y - 1, 10, 2, 'rgba(44,33,55,.22)'); }
  if (sel && !seated) { R(x - 6, y, 12, 1, '#e9803d'); R(x - 5, y + 1, 10, 1, '#e9803d'); }
  let img, top;
  if (ch.pose === 'walk') { img = F[ch.dir].walk[Math.floor(ch.anim * 8) % 4]; top = y - 21; }
  else if (ch.pose === 'sit') { img = F.sitUp; top = y - 20; }
  else if (ch.pose === 'type') { img = F.typeUp[Math.floor(t * 5) % 2]; top = y - 20; }
  else if (ch.pose === 'sleep') { img = F.sleepUp; top = y - 20; }
  else if (ch.pose === 'sitdown') { img = F.sitDown; top = y - 21; }
  else if (ch.pose === 'read') { img = F.readDown; top = y - 21 + (Math.floor(t * 0.7 + ch.i) % 2); }
  else { img = F[ch.dir].idle; top = y - 21 + (Math.floor(t * 1.6 + ch.i) % 2 ? 0 : 0); }
  g.drawImage(img, x - 8, top);
  return { x, y: top };
}

/* ---------- Khung hình ---------- */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const S = 3; cv.width = W * S; cv.height = H * S;
let printProg = 0;
function render(now, res) {
  const t = now / 1000;
  g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
  clock(214, 9, simMs);
  const at = spot => chars.find(c => !c.hidden && !c.path.length && c.final && c.final.spot === spot);
  const busyPrint = !!at('may_in'); if (busyPrint) printProg = Math.min(1, printProg + 0.0006); else if (printProg >= 1) printProg = 0;
  const onA = at('desk_A'), onPI = at('desk_PI');
  const items = [
    { y: 44, d: () => bookshelf(18, 4) },
    { y: 83, d: () => { desk(44, 60, 40); monitor(56, 54, onA && onA.pose === 'type', t);
        R(48, 64, 8, 6, O); R(49, 65, 6, 4, '#2f7a4a'); R(51, 66, 2, 2, '#1d2436'); R(74, 64, 4, 4, O); R(75, 65, 2, 2, '#e9803d'); } },
    { y: 83, d: () => { desk(220, 60, 56); monitor(232, 54, onPI && onPI.pose === 'type', t + 0.5); monitor(250, 54, onPI && onPI.pose === 'type', t + 1.3);
        R(224, 64, 6, 8, '#fbf4e2'); R(224, 64, 6, 1, '#d8cfb8'); R(225, 66, 4, 1, '#9aa7b8'); R(268, 63, 5, 5, O); R(269, 64, 3, 3, '#ffffff'); R(269, 64, 3, 1, '#7b4a2a'); } },
    { y: 50, d: () => plant(285, 30) },
    { y: 176, d: () => { bench(278, 104); printer(281, 90, busyPrint, t, printProg); robotCar(281, 128); scope(282, 150, t); } },
    { y: 178, d: () => pantry(15, 108, !!at('pantry'), t) },
    { y: 160, d: () => sofa(80, 136) },
    { y: 184, d: () => table(88, 172) },
    { y: 190, d: () => plant(190, 172) },
    { y: 95, d: () => chair(64, 95) },
    { y: 95, d: () => chair(248, 95) }
  ];
  const vis = chars.filter(c => !c.hidden);
  const infos = [];
  for (const c of vis) items.push({ y: c.y - 0.5, d: () => infos.push([c, drawChar(c, t, c.p.id === selected)]) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.d());
  // bong bóng hoạt động (pixel art, vẽ trong scene)
  for (const [c, info] of infos) {
    const ic = CFG.actions[c.act]?.icon;
    if (!ic || c.pose === 'walk') continue;
    const x = Math.round(c.x), bob = Math.floor(t * 2 + c.i) % 2, bx = x - 5, by = info.y - 12 + bob;
    R(bx - 1, by - 1, 11, 11, O); R(bx, by, 9, 9, '#ffffff'); R(x - 1, by + 9, 3, 2, O); R(x, by + 9, 1, 1, '#ffffff');
    g.drawImage(icon(ic), bx + 1, by + 1);
  }
  ctx.imageSmoothingEnabled = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(scene, 0, 0, W * S, H * S);
  // nhãn tên vẽ ở độ phân giải hiển thị cho chữ nét
  ctx.textAlign = 'center'; ctx.font = '24px VT323, monospace';
  for (const [c] of infos) {
    const nm = c.p.name, w = ctx.measureText(nm).width + 10, nx = Math.round(c.x) * S, ny = (Math.round(c.y) + 3) * S;
    ctx.fillStyle = O; ctx.fillRect(nx - w / 2 - 3, ny - 3, w + 6, 24); ctx.fillStyle = c.p.role === 'PI' ? '#163c6c' : '#e9803d'; ctx.fillRect(nx - w / 2, ny, w, 18);
    ctx.fillStyle = '#ffffff'; ctx.fillText(nm, nx, ny + 15);
  }
}

/* ---------- Điều khiển ---------- */
const $ = id => document.getElementById(id);
let simMs = vnNowMs(), speed = 1, scrubbing = false, selected = null, lastSig = '';
// ?t=2026-11-12T15:10 mở đúng thời điểm đó (giờ VN); ?speed=0 để dừng
const Q = new URLSearchParams(location.search);
if (Q.get('t') && !isNaN(Date.parse(Q.get('t') + 'Z'))) simMs = Date.parse(Q.get('t') + 'Z');
if (Q.has('speed')) speed = +Q.get('speed') || 0;
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const fmtDate = ms => { const d = new Date(ms); return `${WD[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; };
const fmtTime = ms => new Date(ms).toISOString().slice(11, 16);
function setSpeed(v) { speed = v; document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === v))); }
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
$('prev').onclick = () => { simMs -= DAY; };
$('next').onclick = () => { simMs += DAY; };
$('live').onclick = () => { simMs = vnNowMs(); setSpeed(1); };
const scrub = $('scrub');
scrub.addEventListener('input', () => { scrubbing = true; simMs = simMs - labMin(simMs) * 60000 + (+scrub.value) * 60000; });
scrub.addEventListener('change', () => { scrubbing = false; });
cv.addEventListener('click', e => {
  const b = cv.getBoundingClientRect(), ax = (e.clientX - b.left) / b.width * W, ay = (e.clientY - b.top) / b.height * H;
  const hit = chars.filter(c => !c.hidden && Math.abs(c.x - ax) < 9 && ay < c.y + 6 && ay > c.y - 24);
  selected = hit.length ? hit[hit.length - 1].p.id : null; lastSig = '';
});
setSpeed(speed);

const spotLabel = (name, p) => SPOTS[spotOf(name, p)]?.label || '';
function renderSchedule(res) {
  const day = labKey(simMs), m = labMin(simMs);
  const sig = day + '|' + PEOPLE.map(p => res[p.id].key).join(',') + '|' + selected;
  if (sig === lastSig) return; lastSig = sig;
  const [y, mo, d] = day.split('-');
  $('schedTitle').textContent = `Lịch ngày ${d}/${mo}/${y}`;
  const evToday = (CFG.events || []).filter(e => e.days.includes(weekday(day)) && !(CFG.closedDays || []).includes(weekday(day)));
  $('sched').innerHTML = CFG.people.map(p => {
    const plan = planFor(p, day), cur = currentSlot(plan, m), now = res[p.id];
    const chips = plan.slots.filter(s => s.act !== 'vang' || plan.slots.length === 1).map(s => {
      const A = CFG.actions[s.act], where = s.act === 'vang' ? '' : ' · ' + spotLabel(A.variants[s.variant].spot, p);
      return `<li class="chip${s === cur && !now.event ? ' now' : ''}"><time>${s.from}–${s.to}</time>${A.label}${where}</li>`;
    }).join('') + evToday.filter(e => e.who.includes(p.id) && presentToday(p, day)).map(e => `<li class="chip ev${now.event === e.label ? ' now' : ''}"><time>${e.from}–${e.to}</time>${e.label}</li>`).join('');
    const nowLabel = CFG.actions[now.act].label;
    return `<article class="st${selected === p.id ? ' sel' : ''}"><div class="who"><span class="dot ${p.role === 'PI' ? 'pi' : ''}"></span>
      <div><b>${p.name}</b><small>${p.role} · ${plan.tpl}</small><small class="nowtxt">Đang: ${nowLabel}</small></div></div><ul class="chips">${chips}</ul></article>`;
  }).join('');
}

let last = performance.now(), uiT = 1, lastSim = null;
function frame(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  if (!scrubbing) simMs += dt * 1000 * speed;
  const res = resolveAll(simMs);
  // mở trang, đổi ngày hoặc kéo thanh giờ thì đặt thẳng vào chỗ, không đi bộ
  const snap = lastSim === null || Math.abs(simMs - lastSim) > 20 * 60000; lastSim = simMs;
  for (const ch of chars) { const r = res[ch.p.id]; if (r.key !== ch.key || (snap && ch.path.length)) retarget(ch, r, snap); step(ch, dt * Math.min(Math.max(1, speed / 60), 4)); }
  render(now, res);
  uiT += dt;
  if (uiT > 0.2) { uiT = 0; $('clock').textContent = fmtTime(simMs); $('date').textContent = fmtDate(simMs);
    if (!scrubbing) scrub.value = Math.floor(labMin(simMs)); renderSchedule(res); }
  requestAnimationFrame(frame);
}
drawStatic();
await (document.fonts?.ready || Promise.resolve());
requestAnimationFrame(frame);
window.__lab = { resolveAll, planFor, CFG, chars, set sim(v) { simMs = v; }, get sim() { return simMs; }, setSpeed };
})();
