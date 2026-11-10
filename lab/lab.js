/* Phòng lab RCT. Phong cách: lưới 16 px, bảng màu Endesga 32, đổ bóng đổi sắc, viền chọn lọc, bóng tiếp xúc, ánh sáng trên-trái.
   Mặt bằng: phòng lab (trái, ~60%), phòng PI (trên phải, có cửa sổ sau ghế, có cửa phòng), khu nghỉ (dưới phải).
   Lịch theo ca 40 phút, seed = ngày + số ca; nhân vật đi bằng BFS trên lưới 16 px. */
(async () => {
const CFG = await fetch('config.json?v=4').then(r => r.json());
const { buildChar, icon } = window.SPR;

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

/* ---------- Ai có mặt trong mỗi ca ---------- */
const BLOCK = CFG.blockMinutes || 40;
const STUDENTS = CFG.people.filter(p => p.role !== 'PI');
const cache = new Map();
function rosterFor(day, b) {
  const k = day + '|' + b;
  if (cache.has(k)) return cache.get(k);
  const r = rng(hash(k)), list = [];
  if (CFG.people.some(p => p.role === 'PI') && r() * 100 < CFG.piRate) list.push(CFG.people.find(p => p.role === 'PI'));
  const n = Math.min(STUDENTS.length, +pick(CFG.studentsPresent, r));   // luôn ít nhất 1 sinh viên
  const pool = [...STUDENTS];
  for (let i = 0; i < n; i++) list.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const plan = list.map(p => {
    const act = pick(CFG.roles[p.role], r), vs = CFG.actions[act].variants;
    return { p, act, variant: +pick(Object.fromEntries(vs.map((v, i) => [i, v.w ?? 1])), r) };
  });
  cache.set(k, plan);
  return plan;
}
const blockOf = m => Math.floor(m / BLOCK);

/* ---------- Mặt bằng (px). Khung 448x320, ô 16 px ----------
   Lab: x 6..248, sàn y 32..314. Vách dọc x 248..256 (cửa sang khu nghỉ y 208..240).
   Phòng PI: x 256..442, sàn y 32..96. Vách ngang y 96..102, mặt tường khu nghỉ y 102..128 (cửa PI x 400..424).
   Khu nghỉ: x 256..442, sàn y 128..314. Cửa chính: tường dưới lab x 104..136. */
const W = 448, H = 320, TS = 16;
const DESK_X = [24, 68, 112];
const SPOTS = {
  desk_SV:     { seats: [...DESK_X.map(x => ({ x: x + 20, y: 110, dir: 'up', pose: 'sit' })), ...DESK_X.map(x => ({ x: x + 20, y: 182, dir: 'up', pose: 'sit' }))] },
  desk_PI:     { seats: [{ x: 340, y: 63, dir: 'down', pose: 'sitdown' }] },
  canh_ban_PI: { seats: [{ x: 340, y: 93, dir: 'up' }] },
  tu_sach_PI:  { seats: [{ x: 278, y: 60, dir: 'up' }] },
  bang_trang:  { seats: [{ x: 78, y: 54, dir: 'up' }, { x: 104, y: 54, dir: 'up' }] },
  ban_lap_rap: { seats: [{ x: 182, y: 110, dir: 'up' }, { x: 218, y: 110, dir: 'up' }] },
  may_in:      { seats: [{ x: 200, y: 182, dir: 'up' }] },
  tu_sach:     { seats: [{ x: 210, y: 60, dir: 'up' }, { x: 232, y: 60, dir: 'up' }] },
  ban_hop:     { seats: [{ x: 88, y: 254, dir: 'up', pose: 'sit' }, { x: 120, y: 254, dir: 'up', pose: 'sit' }] },
  pantry:      { seats: [{ x: 276, y: 158, dir: 'up' }, { x: 298, y: 158, dir: 'up' }] },
  sofa:        { seats: [{ x: 322, y: 228, dir: 'up', pose: 'sit' }, { x: 346, y: 228, dir: 'up', pose: 'sit' }, { x: 370, y: 228, dir: 'up', pose: 'sit' }] },
  ghe_doc:     { seats: [{ x: 417, y: 262, dir: 'down', pose: 'sitdown' }] },
  san:         { seats: [{ x: 200, y: 280, dir: 'down' }, { x: 56, y: 140, dir: 'down' }] },
  door:        { seats: [{ x: 120, y: 330, dir: 'up' }] }
};
const blocked = new Set();
const block = (c0, c1, r0, r1) => { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) blocked.add(c + ',' + r); };
// lab
block(1, 1, 2, 2); block(11, 14, 2, 2);          // cây góc, bình nước, tủ sách
block(1, 9, 4, 5); block(1, 9, 9, 10);           // hai dãy bàn
block(10, 13, 4, 5); block(10, 13, 9, 10);       // bàn lắp ráp, bàn máy in 3D (chừa lối dọc cột 14)
block(4, 8, 13, 14);                              // bàn họp
block(1, 3, 17, 18); block(1, 1, 12, 15);        // góc đồ, kệ sát tường trái
block(14, 14, 18, 18);                            // cây cạnh đường line
// phòng PI
block(16, 18, 2, 2); block(26, 27, 2, 2); block(16, 16, 3, 4); block(19, 23, 4, 4);
// khu nghỉ
block(16, 17, 8, 8); block(18, 23, 8, 8); block(26, 27, 8, 8);
block(19, 23, 11, 11); block(18, 18, 14, 14); block(24, 24, 14, 14);
block(25, 27, 14, 15); block(16, 17, 17, 18); block(27, 27, 17, 18); block(16, 16, 10, 10); block(24, 24, 10, 11);
const inLab = (c, r) => c >= 1 && c <= 14 && r >= 2 && r <= 18;
const inPI = (c, r) => c >= 16 && c <= 27 && r >= 2 && r <= 5;
const inLounge = (c, r) => c >= 16 && c <= 27 && r >= 8 && r <= 18;
const inDoor = (c, r) => (c === 15 && (r === 13 || r === 14)) || (c === 25 && (r === 6 || r === 7)) || (c === 7 && (r === 19 || r === 20));
const walkable = (c, r) => inDoor(c, r) || ((inLab(c, r) || inPI(c, r) || inLounge(c, r)) && !blocked.has(c + ',' + r));
const tileOf = (x, y) => [Math.floor(x / TS), Math.floor((y - 1) / TS)];

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
const spotOf = (name, p) => name === 'ban_rieng' ? 'desk_' + p.desk : (name === 'tu_sach' && p.role === 'PI') ? 'tu_sach_PI' : name;
function resolveAll(ms) {
  const day = labKey(ms), m = labMin(ms), occ = {}, out = {};
  const plan = rosterFor(day, blockOf(m));
  for (const p of PEOPLE) {
    const it = plan.find(x => x.p.id === p.id);
    if (!it) { out[p.id] = { act: null, spot: 'door', seat: SPOTS.door.seats[0], key: 'door', pose: 'stand' }; continue; }
    let act = it.act, variant = it.variant, A = CFG.actions[act];
    if (A.needsPI) {
      const pi = PEOPLE.find(q => q.role === 'PI'), piNow = pi && out[pi.id];
      if (!piNow || piNow.spot !== 'desk_' + pi.desk) { act = A.fallback; A = CFG.actions[act]; variant = 0; }
    }
    const v = A.variants[variant] || A.variants[0];
    let spot = spotOf(v.spot, p), seat;
    if (!SPOTS[spot]) spot = 'san';
    const n = occ[spot] || 0;
    if (n < SPOTS[spot].seats.length) seat = n;
    else { act = 'viet_bang'; spot = (occ.bang_trang || 0) < 2 ? 'bang_trang' : 'san'; seat = Math.min(occ[spot] || 0, SPOTS[spot].seats.length - 1); }
    occ[spot] = (occ[spot] || 0) + 1;
    const st = SPOTS[spot].seats[seat];
    let pose = st.pose || 'stand';
    if (pose === 'sit') pose = v.pose === 'sleep' ? 'sleep' : v.pose === 'type' ? 'type' : 'sit';
    if (pose === 'sitdown' && v.pose === 'read') pose = 'read';
    out[p.id] = { act, spot, seat: st, key: spot + ':' + seat + ':' + act, pose };
  }
  return out;
}

/* ---------- Bảng màu Endesga 32 ---------- */
const E = {
  wd0: '#3e2731', wd1: '#733e39', wd2: '#b86f50', wd3: '#e4a672', wd4: '#ead4aa', skn: '#c28569',
  m0: '#181425', m1: '#262b44', m2: '#3a4466', m3: '#5a6988', m4: '#8b9bb4', m5: '#c0cbdc', w: '#ffffff',
  g0: '#193c3e', g1: '#265c42', g2: '#3e8948', g3: '#63c74d', y: '#fee761', o1: '#f77622', o2: '#feae34', o0: '#be4a2f',
  r1: '#a22633', r2: '#e43b44', b0: '#124e89', b1: '#0099db', b2: '#2ce8f5', p1: '#68386c', p2: '#b55088', pk: '#f6757a', cream: '#f3efe7'
};
const WOOD = [E.wd0, E.wd1, E.wd2, E.wd3, E.wd4];
const METAL = [E.m1, E.m2, E.m3, E.m4, E.m5];
const LIGHT = [E.m3, E.m4, E.m5, '#dfe5ee', E.w];

/* ---------- Bút vẽ ---------- */
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const g = scene.getContext('2d');
let cx = g;
const R = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x, y, w, h); };
const P = (x, y, c) => R(x, y, 1, 1, c);
const A = (x, y, w, h, a) => { cx.fillStyle = `rgba(24,20,37,${a})`; cx.fillRect(x, y, w, h); };
function spr(rows, pal, x, y) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) P(x + i, y + j, c); } }); }
// khối có viền chọn lọc, bo góc 1 px. ramp = [viền tối, tối, giữa, sáng, rất sáng]
function slab(x, y, w, h, ramp) {
  R(x + 1, y, w - 2, h, ramp[0]); R(x, y + 1, w, h - 2, ramp[0]);
  R(x + 1, y + 1, w - 2, h - 2, ramp[2]);
  R(x + 1, y, w - 2, 1, ramp[1]); R(x, y + 1, 1, h - 3, ramp[1]);
  R(x + 1, y + 1, w - 2, 1, ramp[4]); R(x + 1, y + 2, 1, h - 4, ramp[3]);
  R(x + 2, y + h - 2, w - 3, 1, ramp[1]); R(x + w - 2, y + 2, 1, h - 3, ramp[1]);
}
// mặt bàn nhìn 3/4: mặt trên + mặt trước có độ dày + chân
function table(x, y, w, top, front, ramp, legs = true) {
  A(x + 2, y + top + front + (legs ? 2 : 0), w, 3, .28);
  R(x + 1, y, w - 2, top + 1, ramp[0]); R(x, y + 1, w, top - 1, ramp[0]);
  R(x + 1, y + 1, w - 2, top - 1, ramp[2]); R(x + 1, y + 1, w - 2, 1, ramp[4]); R(x + 1, y + 2, w - 2, 1, ramp[3]); R(x + 1, y + top - 1, w - 2, 1, ramp[1]);
  R(x, y + top, w, front + 1, ramp[0]); R(x + 1, y + top, w - 2, front, ramp[1]); R(x + 1, y + top, w - 2, 1, ramp[2]);
  if (legs) { R(x + 2, y + top + front, 3, 3, ramp[0]); R(x + w - 5, y + top + front, 3, 3, ramp[0]); }
}
function disc(x, y, r, c) { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy + .3)); R(x - w, y + dy, w * 2 + 1, 1, c); } }

/* ---------- Sàn, tường (vẽ một lần) ---------- */
const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
function floorTiles(x0, y0, x1, y1) {
  for (let y = y0; y < y1; y += 16) for (let x = x0; x < x1; x += 16) {
    const k = (((x - x0) >> 4) + ((y - y0) >> 4)) % 2;
    R(x, y, 16, 16, k ? '#b9c4d6' : E.m5); R(x, y, 16, 1, '#d4dbe6'); R(x, y, 1, 16, '#d4dbe6');
    R(x + 15, y, 1, 16, '#a3afc4'); R(x, y + 15, 16, 1, '#a3afc4');
    if (((x * 7 + y * 3) >> 4) % 5 === 0) { P(x + 5, y + 9, '#aeb9cc'); P(x + 6, y + 9, '#aeb9cc'); P(x + 7, y + 10, '#aeb9cc'); }
  }
}
function floorWood(x0, y0, x1, y1, tones, line, hi, grain) {
  for (let y = y0, row = 0; y < y1; y += 6, row++) {
    for (let x = x0 - [0, 30, 14, 40][row % 4], k = 0; x < x1; x += 48, k++) {
      const xa = Math.max(x0, x), xb = Math.min(x1, x + 48);
      if (xb <= xa) continue;
      R(xa, y, xb - xa, Math.min(6, y1 - y), tones[(row * 2 + k) % 3]); R(xa, y, xb - xa, 1, hi); if (y + 5 < y1) R(xa, y + 5, xb - xa, 1, line);
      if (x >= x0) R(x, y, 1, Math.min(5, y1 - y), line);
      if ((row * 5 + k * 3) % 4 === 0 && xb - xa > 20) R(xa + 10 + (row * 7) % 14, y + 2, 7, 1, grain);
    }
  }
}
function rug(x, y, w, h, c) {
  A(x + 1, y + h, w, 2, .22);
  R(x, y, w, h, c[0]); R(x + 1, y + 1, w - 2, h - 2, c[1]); R(x + 3, y + 3, w - 6, h - 6, c[2]);
  for (let i = x + 6; i < x + w - 6; i += 6) { P(i, y + 2, c[2]); P(i, y + h - 3, c[0]); }
  const mx = x + (w >> 1), my = y + (h >> 1), s = Math.min(w, h) / 4 | 0;
  for (let d = 0; d < s; d++) { P(mx - d, my - s + d, c[3]); P(mx + d, my - s + d, c[3]); P(mx - d, my + s - d, c[3]); P(mx + d, my + s - d, c[3]); }
  for (let d = 0; d < 3; d++) { P(mx - d, my - 3 + d, c[4]); P(mx + d, my - 3 + d, c[4]); P(mx - d, my + 3 - d, c[4]); P(mx + d, my + 3 - d, c[4]); }
  for (let i = x + 2; i < x + w - 2; i += 2) { P(i, y - 1, c[2]); P(i, y + h, c[2]); }
}
function band(x, y, w, h) { R(x, y, w, h, E.m2); R(x + 1, y + 1, w - 2, h - 2, E.cream); R(x + 1, y + h - 2, w - 2, 1, '#d8d2c6'); }
function plaster(x0, y0, x1, y1, top, mid, low, dot) {
  for (let y = y0; y < y1; y++) R(x0, y, x1 - x0, 1, (y - y0) < (y1 - y0) * .62 ? top : (y - y0) < (y1 - y0) * .8 ? mid : low);
  for (let x = x0 + 4; x < x1; x += 12) for (let y = y0 + 2; y < y1 - 6; y += 4) P(x + ((y >> 2) % 2) * 6, y, dot);
}
function skirting(x0, x1, y) { R(x0, y, x1 - x0, 3, E.w); R(x0, y, x1 - x0, 1, E.cream); R(x0, y + 2, x1 - x0, 1, E.m4); R(x0, y + 3, x1 - x0, 2, E.m3); A(x0, y + 5, x1 - x0, 2, .3); A(x0, y + 7, x1 - x0, 2, .14); }

function drawStatic() {
  cx = bg.getContext('2d');
  R(0, 0, W, H, E.m0);
  floorTiles(6, 32, 248, 314);
  floorWood(256, 32, 442, 96, ['#b56e50', '#b06a4c', '#ba7354'], '#93533e', '#c27d5c', '#a9644a');
  floorWood(256, 128, 442, 314, ['#d39a6a', '#cd9464', '#d8a171'], '#a86d48', '#e3b383', '#bf8659');
  plaster(6, 6, 248, 34, E.m5, '#b3bfd2', '#a6b3c8', '#b3bfd2'); skirting(6, 248, 29);
  plaster(256, 6, 442, 34, '#e8dccb', '#ddcfbb', '#d3c3ad', '#ddcfbb'); skirting(256, 442, 29);
  plaster(256, 102, 442, 130, '#cfe0c6', '#c3d7b9', '#b6cdab', '#c3d7b9');
  for (let x = 262; x < 442; x += 10) R(x, 102, 2, 18, '#c3d7b9');
  skirting(256, 442, 125);
  // vạch đường line cho xe dò line
  const tape = (x, y, w, h) => R(x, y, w, h, E.m1);
  tape(170, 212, 66, 3); tape(170, 290, 66, 3); tape(170, 212, 3, 81); tape(233, 212, 3, 81);
  for (let i = 0; i < 66; i += 6) { P(171 + i, 213, E.m2); P(171 + i, 291, E.m2); }
  R(196, 287, 14, 9, E.y); R(196, 287, 14, 1, E.w); for (let i = 0; i < 14; i += 4) R(197 + i, 289, 2, 5, E.m1);
  // thảm
  rug(28, 210, 128, 66, ['#124e89', '#2c6fb0', '#c0cbdc', '#2c6fb0', E.o2]);
  rug(300, 64, 80, 30, [E.r1, '#c2565a', '#e9c9a0', '#c2565a', E.o1]);
  rug(290, 162, 112, 92, ['#be4a2f', E.o1, '#f3d6a8', E.o1, E.r2]);
  // thảm chùi chân cửa chính
  R(100, 300, 40, 12, E.wd1); R(101, 301, 38, 10, E.o0); for (let x = 103; x < 138; x += 3) R(x, 302, 1, 8, E.wd1);
  // dải tường nhìn từ trên
  band(0, 0, W, 7); band(0, 0, 7, H); band(W - 7, 0, 7, H); band(0, 313, 105, 7); band(135, 313, W - 135, 7);
  band(248, 0, 8, 209); band(248, 239, 8, 81);
  band(248, 95, 153, 8); band(423, 95, 25, 8);
  // khe cửa giữa lab và khu nghỉ
  R(248, 208, 8, 1, E.m2); R(248, 239, 8, 1, E.m2);
  floorTiles(248, 209, 252, 239); R(252, 209, 4, 30, '#d39a6a');
  // cửa phòng PI (mở vào trong), nhìn từ khu nghỉ
  R(400, 95, 24, 35, E.wd0);
  floorWood(401, 96, 423, 128, ['#b56e50', '#b06a4c', '#ba7354'], '#93533e', '#c27d5c', '#a9644a');
  R(399, 100, 2, 30, E.wd1); R(423, 100, 2, 30, E.wd1); R(399, 99, 26, 2, E.wd1); R(400, 99, 24, 1, E.wd2);
  R(401, 101, 5, 27, E.wd1); R(402, 102, 3, 25, E.wd2); R(402, 102, 1, 25, E.wd3); P(404, 115, E.o2);
  A(406, 101, 17, 27, .18);
  R(404, 104, 16, 6, E.m1); R(405, 105, 14, 4, E.m3); R(406, 106, 3, 2, E.w); R(410, 106, 7, 1, E.m5); R(410, 108, 5, 1, E.m5);
}

/* ---------- Đồ treo tường ---------- */
function windowPane(x, y, w, h, t, rollDown = 4) {
  R(x - 2, y - 2, w + 4, h + 5, E.m3); R(x - 1, y - 1, w + 2, h + 3, E.w); R(x - 1, y + h + 1, w + 2, 1, E.m5);
  for (let j = 0; j < h; j++) R(x, y + j, w, 1, j < h * .3 ? '#7fd0f0' : j < h * .55 ? '#9adcf4' : '#b9e8f8');
  cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
  const off = (t * 2) % (w + 40);
  for (const [dx, dy, s] of [[0, 4, 1], [w * .55, 7, 0]]) { const cxp = x + ((dx + off) % (w + 40)) - 20; R(cxp, y + dy, 10 + s * 4, 2, E.w); R(cxp + 2, y + dy - 1, 6, 1, E.w); R(cxp + 1, y + dy + 2, 10, 1, '#dff4fc'); }
  cx.restore();
  const tuft = (a, b, r) => { for (let dy = -r; dy <= r; dy++) { const ww = Math.round(Math.sqrt(r * r - dy * dy)); R(a - ww, b + dy, ww * 2 + 1, 1, dy < -r / 3 ? '#5fae6a' : dy < r / 3 ? E.g2 : E.g1); } P(a - 1, b - r + 1, '#9be08a'); };
  for (let i = 0, n = Math.max(2, (w / 14) | 0); i < n; i++) tuft(x + 7 + i * (w - 14) / (n - 1), y + h - 3 - (i % 2) * 2, 4 + (i % 3));
  R(x, y + h - 2, w, 2, E.g1);
  for (let i = 1; i < 3; i++) { const fx = x + Math.round(w * i / 3); R(fx - 1, y, 2, h, E.w); R(fx + 1, y, 1, h, E.m5); }
  for (let i = 0; i < 5; i++) { P(x + 3 + i, y + 9 - i, 'rgba(255,255,255,.75)'); P(x + 6 + i, y + 9 - i, 'rgba(255,255,255,.4)'); }
  R(x, y, w, rollDown, E.wd4); R(x, y + 1, w, 1, E.wd3); R(x, y + rollDown - 1, w, 1, E.skn); R(x + (w >> 1) - 1, y + rollDown, 2, 2, E.wd1);
  R(x - 3, y + h + 3, w + 6, 2, E.w); R(x - 3, y + h + 5, w + 6, 1, E.m4); A(x - 3, y + h + 6, w + 6, 1, .25);
}
function acUnit(x, y, t) {
  R(x + 1, y, 32, 12, E.m3); R(x, y + 1, 34, 10, E.m3); R(x + 1, y + 1, 32, 10, '#eef1f5'); R(x + 1, y + 1, 32, 1, E.w); R(x + 1, y + 9, 32, 1, E.m5);
  R(x + 3, y + 7, 28, 1, E.m4); R(x + 3, y + 8, 28, 1, '#dfe5ee'); P(x + 29, y + 3, Math.floor(t * 1.2) % 2 ? E.g3 : E.g2);
  for (let i = 0; i < 3; i++) P(x + 6 + i * 10 + (Math.floor(t * 3) % 3), y + 12 + (Math.floor(t * 3) % 2), 'rgba(192,203,220,.6)');
  A(x + 1, y + 12, 32, 1, .15);
}
function whiteboard(x, y, w, h) {
  R(x, y, w, h, E.m3); R(x + 1, y + 1, w - 2, h - 2, E.m4); R(x + 2, y + 2, w - 4, h - 4, E.w); R(x + 2, y + 2, w - 4, 1, '#eef4fb');
  const bx = (a, b) => { R(a, b, 10, 7, E.b0); R(a + 1, b + 1, 8, 5, E.w); };
  R(x + 6, y + 11, 4, 1, E.b0); bx(x + 10, y + 8); R(x + 20, y + 11, 5, 1, E.b0); bx(x + 25, y + 8); R(x + 35, y + 11, 6, 1, E.b0); R(x + 40, y + 10, 1, 3, E.b0);
  R(x + 38, y + 11, 1, 7, E.o1); R(x + 15, y + 17, 24, 1, E.o1); R(x + 15, y + 13, 1, 5, E.o1);
  for (let i = x + 46; i < x + w - 4; i++) P(i, y + 15 - Math.round(3 * Math.sin((i - x - 46) / 3)), E.b1);
  R(x + 46, y + 5, 5, 1, E.m3); R(x + 53, y + 5, 7, 1, E.m3);
  R(x + 8, y + h, w - 16, 2, E.m3); R(x + 9, y + h, w - 18, 1, E.m4); R(x + 14, y + h - 1, 4, 1, E.r2); R(x + 20, y + h - 1, 4, 1, E.b0); A(x + 8, y + h + 2, w - 16, 1, .2);
}
function corkBoard(x, y) {
  R(x, y, 24, 17, E.wd1); R(x + 1, y + 1, 22, 15, E.wd2); R(x + 2, y + 2, 20, 13, '#d29a6a');
  for (let i = 0; i < 6; i++) P(x + 4 + i * 3, y + 3 + (i % 3) * 4, '#c0875a');
  R(x + 4, y + 4, 7, 6, E.w); R(x + 5, y + 6, 5, 1, E.m4); R(x + 13, y + 3, 6, 6, E.y); R(x + 6, y + 11, 8, 3, '#9adcf4'); R(x + 16, y + 10, 5, 4, E.pk);
  P(x + 7, y + 3, E.r2); P(x + 16, y + 2, E.b1); P(x + 10, y + 10, E.g3); A(x + 1, y + 17, 23, 1, .2);
}
function clockW(x, y, ms) {
  spr(['.oooo.', 'owwwwo', 'owwwwo', 'owwwwo', 'owwwwo', '.oooo.'], { o: E.m2, w: E.w }, x, y);
  const d = new Date(ms), hA = ((d.getUTCHours() % 12) + d.getUTCMinutes() / 60) / 12 * 2 * Math.PI, mA = d.getUTCMinutes() / 60 * 2 * Math.PI;
  P(x + 2 + Math.round(Math.sin(mA) * 1.6 + .5), y + 3 - Math.round(Math.cos(mA) * 1.6 + .5), E.m1); P(x + 2 + Math.round(Math.sin(hA) + .5), y + 3 - Math.round(Math.cos(hA) + .5), E.r2); P(x + 3, y + 3, E.m1);
  A(x + 1, y + 6, 5, 1, .2);
}
function frame(x, y, kind) {
  R(x, y, 14, 11, E.wd1); R(x + 1, y + 1, 12, 9, E.wd4); R(x + 2, y + 2, 10, 7, E.w);
  if (kind === 'cert') { R(x + 3, y + 3, 8, 1, E.b0); R(x + 3, y + 5, 6, 1, E.m4); R(x + 3, y + 7, 5, 1, E.m4); P(x + 10, y + 7, E.o2); P(x + 10, y + 6, E.o1); }
  else { R(x + 2, y + 2, 10, 7, '#f6c47a'); R(x + 2, y + 6, 10, 3, E.o1); R(x + 6, y + 3, 3, 3, E.y); }
  A(x + 1, y + 11, 13, 1, .2);
}
function chart(x, y) {
  R(x, y, 18, 18, E.m3); R(x + 1, y + 1, 16, 16, E.w);
  [5, 9, 7, 12].forEach((v, i) => { R(x + 3 + i * 3, y + 15 - v, 2, v, [E.b0, E.o1, E.b1, E.g2][i]); P(x + 3 + i * 3, y + 15 - v, E.w); });
  R(x + 2, y + 15, 14, 1, E.m3); A(x + 1, y + 18, 17, 1, .2);
}
function tvWall(x, y, on, t) {
  R(x + 1, y, 78, 24, E.m0); R(x, y + 1, 80, 22, E.m0); R(x + 1, y + 1, 78, 22, E.m1); R(x + 3, y + 3, 74, 18, on ? '#1b3150' : '#20263a');
  if (on) {
    const sc2 = Math.floor(t / 6) % 3;
    if (sc2 === 0) { R(x + 3, y + 3, 74, 11, '#6fb6ea'); R(x + 3, y + 14, 74, 7, E.g2); for (let i = 0; i < 5; i++) disc(x + 10 + i * 15, y + 14, 3, E.g1); R(x + 12 + (Math.floor(t * 4) % 50), y + 6, 8, 2, E.w); }
    else if (sc2 === 1) { R(x + 3, y + 3, 74, 18, E.b0); R(x + 3, y + 15, 74, 6, E.g2); R(x + 39, y + 14, 2, 4, E.w); const bxx = x + 10 + Math.abs((Math.floor(t * 20) % 120) - 60); disc(bxx, y + 10, 2, E.w); }
    else { R(x + 3, y + 3, 74, 18, '#2b1e3a'); for (let i = 0; i < 8; i++) { const hh = (i * 5 + Math.floor(t * 6)) % 12; R(x + 8 + i * 8, y + 19 - hh, 5, hh, [E.o1, E.pk, E.b1, E.y][i % 4]); } }
    R(x + 3, y + 3, 74, 1, 'rgba(255,255,255,.18)');
  } else { for (let i = 0; i < 6; i++) P(x + 6 + i, y + 10 - i, 'rgba(255,255,255,.18)'); }
  P(x + 40, y + 22, on ? E.g3 : E.r2); A(x + 2, y + 24, 78, 2, .25);
}

/* ---------- Đồ đạc ---------- */
function monitorFront(x, y, on, t) {
  R(x, y, 18, 13, E.m0); R(x + 1, y + 1, 16, 11, E.m1); R(x + 2, y + 2, 14, 9, on ? E.b0 : '#1d3a6b');
  if (on) { const k = Math.floor(t * 3); [[E.g3, 6], [E.b2, 9], [E.o2, 4], [E.b1, 8]].forEach(([c, w], i) => R(x + 3 + (i % 2) * 2, y + 3 + i * 2, (w + k + i) % 10 + 2, 1, c)); P(x + 3 + ((k * 3) % 12), y + 10, E.w); }
  else { R(x + 3, y + 3, 4, 1, '#3f6ea8'); R(x + 3, y + 5, 7, 1, '#2f5a93'); }
  P(x + 2, y + 2, E.b1); R(x + 8, y + 13, 2, 2, E.m2); R(x + 5, y + 15, 8, 1, E.m1); P(x + 5, y + 15, E.m3);
}
function monitorBack(x, y) { R(x, y, 18, 12, E.m1); R(x + 1, y + 1, 16, 10, E.m3); R(x + 1, y + 1, 16, 1, E.m4); R(x + 2, y + 10, 14, 1, E.m2); R(x + 7, y + 4, 4, 3, E.m4); R(x + 7, y + 12, 4, 3, E.m2); }
function studyDesk(x, y, i, on, t) {
  R(x - 2, y - 9, 44, 10, E.m2); R(x - 1, y - 8, 42, 8, '#9fadc3'); R(x - 1, y - 8, 42, 1, E.m5); R(x - 1, y - 2, 42, 1, E.m4);
  for (let j = 0; j < 42; j += 3) P(x + j, y - 5, '#93a1b8');
  table(x, y, 40, 14, 7, WOOD);
  for (const [dx, dy, w] of [[5, 6, 9], [22, 9, 12]]) R(x + dx, y + dy, w, 1, '#a8634a');
  R(x + 25, y + 15, 12, 4, E.wd0); R(x + 26, y + 15, 10, 3, E.wd2); R(x + 30, y + 16, 3, 1, E.o2);
  monitorFront(x + 11, y - 9, on, t + i);
  R(x + 13, y + 9, 15, 3, E.m2); R(x + 14, y + 9, 13, 2, E.m5); for (let k = 0; k < 4; k++) P(x + 15 + k * 3, y + 9, E.m4);
  R(x + 31, y - 2, 7, 13, E.m0); R(x + 32, y - 1, 5, 11, E.m2); R(x + 32, y - 1, 5, 1, E.m3); P(x + 33, y + 1, on ? (Math.floor(t * 2 + i) % 2 ? E.g3 : E.g2) : E.m3); R(x + 33, y + 4, 3, 1, E.m1);
  if (i % 3 === 0) { spr(['..ooo', '.olloo', '.oyyo.', 'oooo..'], { o: E.m1, l: E.o2, y: E.o1 }, x + 2, y - 5); R(x + 3, y - 1, 2, 7, E.m2); R(x + 1, y + 6, 6, 2, E.m1); cx.fillStyle = 'rgba(254,231,97,.10)'; cx.fillRect(x + 1, y + 1, 12, 12); }
  else if (i % 3 === 1) { R(x + 2, y + 3, 9, 8, E.m4); R(x + 2, y + 3, 8, 7, E.w); R(x + 3, y + 5, 6, 1, E.m4); R(x + 3, y + 7, 4, 1, E.m4); R(x + 4, y + 2, 9, 3, E.r1); R(x + 4, y + 2, 9, 1, E.r2); }
  else { spr(['owwwo.', 'okkko.', 'owwwoo', 'owwwo.', '.ooo..'], { o: E.m2, w: E.w, k: E.wd1 }, x + 3, y + 4); R(x + 10, y + 3, 5, 5, E.y); R(x + 10, y + 7, 5, 1, '#d9b83a'); }
}
const CHAIR_BACK = ['..oooooooo..', '.odmmmmmmdo.', 'odmllllllmdo', 'odmlmmmmlmdo', 'odmmmmmmmmdo', 'oddmmmmmmddo', '.odddddddo..', '..oooooooo..', '.....oo.....', '.oooooooooo.', 'oo...oo...oo'];
const chairBack = (cx0, cy) => { A(cx0 - 6, cy + 4, 13, 2, .28); spr(CHAIR_BACK, { o: E.m0, d: E.m1, m: E.m2, l: E.m3 }, cx0 - 6, cy - 7); };
const EXEC_FRONT = ['...oooooooooo...', '..odddddddddddo.', '.odmmmmmmmmmmmdo', '.odmlmmmmmmmlmdo', '.odmmmmmmmmmmmdo', '.odmlmmmmmmmlmdo', '.odmmmmmmmmmmmdo', '.odmmmmmmmmmmmdo', 'oodmmmmmmmmmmmdo', 'odddddddddddddddo', 'oooooooooooooooo.'];
const execChair = (cx0, cy) => { A(cx0 - 8, cy + 1, 17, 2, .28); spr(EXEC_FRONT, { o: E.m0, d: E.m1, m: E.m2, l: E.m3 }, cx0 - 8, cy - 10); };
const PLANT = ['.......k........', '....k.kmk..k....', '...kmkmlmkkmk...', '..kmlmdmlmmlmk..', '.kmlmmdkmlmdmk..', '.kdmlmmmmlmmdmk.', 'kmmlymdmllmdmmk.', 'kdmmlmmdmmlmmdk.', '.kdmmdlmmdmlmdk.', 'kmdmlmmdmllmddk.', '.kddmmldmmmmdk..', '..kkdmdkddmdk...', '....kkdkkdkk....', '.....okkkko.....', '....oppppppo....', '...oPPPPPPPPo...', '...oqPPPPPPqo...', '....oqPPPPqo....', '....oqqqqqqo....', '.....oooooo.....'];
const PLANT_PAL = { k: E.g0, d: E.g1, m: E.g2, l: E.g3, y: E.y, o: E.wd0, p: E.wd3, P: E.wd2, q: E.wd1 };
function plant(x, y, t, ph = 0) {
  A(x + 3, y + 19, 12, 2, .3);
  const sway = Math.floor(t * .8 + ph) % 2;
  spr(PLANT.slice(0, 6), PLANT_PAL, x + sway, y); spr(PLANT.slice(6), PLANT_PAL, x, y + 6);
}
const SMALL = ['..k.kk.k..', '.kmkllkmk.', 'kmlmmlmdmk', 'kdmlmdlmdk', '.kdmmdmdk.', '..kkdkkk..', '..oppppo..', '..oPPPPo..', '...oqqo...', '...oooo...'];
const smallPlant = (x, y) => { A(x + 2, y + 9, 7, 1, .25); spr(SMALL, { ...PLANT_PAL, p: E.w, P: E.m5, q: E.m4 }, x, y); };
function bookshelf(x, y, w, h, seed0) {
  A(x + 2, y + h, w - 2, 2, .3);
  slab(x, y, w, h, WOOD);
  const BK = [[E.r1, E.r2], [E.b0, E.b1], [E.g1, E.g2], [E.p1, E.p2], [E.wd1, E.wd2], ['#c27a1a', E.o2], [E.m2, E.m4]];
  const shelves = Math.floor((h - 4) / 14);
  for (let s = 0; s < shelves; s++) {
    const sy = y + 3 + s * 14; R(x + 3, sy, w - 6, 11, E.wd0); R(x + 3, sy, w - 6, 1, '#2a1b22');
    let bx = x + 4, n = s * 3 + seed0;
    while (bx < x + w - 5) { n++;
      if (n % 7 === 0) { R(bx, sy + 5, 7, 6, E.wd1); R(bx + 1, sy + 6, 5, 4, E.wd3); R(bx + 1, sy + 6, 5, 1, E.wd4); bx += 8; continue; }
      if (n % 11 === 5) { R(bx + 1, sy + 7, 5, 4, E.w); R(bx + 1, sy + 7, 5, 1, E.m5); spr(['.g.g.', 'gGgGg'], { g: E.g3, G: E.g2 }, bx + 1, sy + 5); bx += 7; continue; }
      const [d, l] = BK[(n * 5 + s) % BK.length], bh = 7 + (n * 3) % 4, bw = 2 + (n % 3 === 0 ? 1 : 0);
      if (bx + bw > x + w - 4) break;
      if (n % 13 === 6) { for (let k = 0; k < bh - 1; k++) R(bx + k, sy + 10 - k, 2, 1, d); bx += bh; continue; }
      R(bx, sy + 11 - bh, bw, bh, d); R(bx, sy + 11 - bh, 1, bh, l); P(bx + bw - 1, sy + 12 - bh, l);
      bx += bw + (n % 4 === 0 ? 1 : 0);
    }
    R(x + 2, sy + 11, w - 4, 3, E.wd2); R(x + 2, sy + 11, w - 4, 1, E.wd3); R(x + 2, sy + 13, w - 4, 1, E.wd1);
  }
}
function waterCooler(x, y, t) {
  A(x + 2, y + 30, 14, 2, .3);
  R(x + 3, y, 10, 12, E.b0); R(x + 4, y + 1, 8, 10, '#5fb8e8'); R(x + 5, y + 2, 2, 8, '#a9e2fb'); R(x + 4, y + 1, 8, 1, E.b2);
  const bub = Math.floor(t * 1.5) % 8; if (bub < 6) P(x + 9, y + 9 - bub, E.b2);
  slab(x, y + 11, 16, 20, LIGHT); R(x + 4, y + 15, 3, 2, E.r2); R(x + 9, y + 15, 3, 2, E.b1); R(x + 3, y + 21, 10, 6, E.m4); R(x + 4, y + 22, 8, 1, E.m3);
}
function workbench(x, y, t) {
  R(x - 2, y - 15, 64, 16, E.m2); R(x - 1, y - 14, 62, 14, '#7f8ea8'); for (let i = x + 1; i < x + 60; i += 4) for (let j = y - 12; j < y - 1; j += 4) P(i, j, E.m3);
  R(x + 4, y - 12, 2, 8, E.r2); R(x + 3, y - 13, 4, 2, E.m1); R(x + 10, y - 12, 7, 2, E.m4); R(x + 12, y - 10, 2, 6, E.m4); R(x + 20, y - 12, 6, 7, E.y); R(x + 21, y - 11, 4, 2, E.m1);
  R(x + 30, y - 12, 1, 9, E.o1); R(x + 33, y - 12, 1, 9, E.b1); R(x + 36, y - 12, 1, 9, E.r2); R(x + 44, y - 11, 10, 8, E.wd1); R(x + 45, y - 10, 8, 6, E.wd3);
  table(x, y, 60, 14, 7, METAL);
  const wheel = (wx, wy, f) => { R(wx, wy, 4, 5, E.m0); R(wx + 1, wy + 1, 2, 3, E.m2); P(wx + 1 + (f ? 1 : 0), wy + 2, E.m4); };
  wheel(x + 3, y + 1, 0); wheel(x + 15, y + 1, 1); wheel(x + 3, y + 8, 1); wheel(x + 15, y + 8, 0);
  R(x + 6, y + 1, 10, 12, E.m0); R(x + 7, y + 2, 8, 10, E.b0); R(x + 7, y + 2, 8, 1, E.b1); R(x + 9, y + 5, 4, 4, E.o1); P(x + 9, y + 5, E.o2);
  R(x + 22, y - 5, 20, 14, E.m1); R(x + 23, y - 4, 18, 12, E.m4); R(x + 23, y - 4, 18, 1, E.m5); R(x + 24, y - 3, 11, 9, E.g0);
  for (let i = 0; i < 11; i++) P(x + 24 + i, y + 1 + Math.round(2.4 * Math.sin(i * .9 + t * 5)), E.g3);
  R(x + 37, y - 2, 3, 2, E.o1); R(x + 37, y + 2, 3, 2, E.b1);
  R(x + 45, y + 3, 7, 7, E.m0); R(x + 46, y + 4, 5, 5, E.m2); R(x + 48, y - 2, 1, 6, E.r1); P(x + 48, y - 3, E.o2);
  const sm = Math.floor(t * 2) % 4; P(x + 48 + (sm % 2), y - 5 - sm, 'rgba(192,203,220,.7)');
  R(x + 53, y + 4, 5, 8, E.m0); R(x + 54, y + 5, 3, 6, '#f0c419'); P(x + 55, y + 6, E.g0);
}
function printer3d(x, y, busy, t, prog) {
  R(x, y, 22, 26, E.m0); R(x + 1, y + 1, 20, 24, E.m2); R(x + 1, y + 1, 20, 3, E.m3); R(x + 1, y + 1, 20, 1, E.m4);
  R(x + 3, y + 5, 16, 15, '#0f1220'); R(x + 4, y + 17, 14, 2, E.m4); R(x + 4, y + 17, 14, 1, E.m5);
  const h = Math.round(prog * 8); if (h) { R(x + 9, y + 17 - h, 5, h, E.o1); R(x + 9, y + 17 - h, 5, 1, E.o2); P(x + 13, y + 17 - h, E.o0); }
  const nx = busy ? Math.round(5 + 5 * Math.sin(t * 6)) : 6;
  R(x + 3, y + 7, 16, 1, E.m4); R(x + 3 + nx, y + 6, 6, 3, E.m5); R(x + 3 + nx, y + 6, 6, 1, E.w); P(x + 6 + nx, y + 9, busy ? E.o2 : E.m3);
  if (busy) { cx.fillStyle = 'rgba(254,174,52,.12)'; cx.fillRect(x + 3, y + 5, 16, 15); }
  R(x + 3, y + 21, 7, 3, busy ? E.b2 : E.m1); P(x + 15, y + 22, busy ? (Math.floor(t * 3) % 2 ? E.g3 : E.g2) : E.m1);
  R(x + 21, y + 6, 3, 9, E.m0); R(x + 21, y + 7, 2, 7, E.o1);
}
function printTable(x, y, busy, t, prog) {
  table(x, y, 60, 14, 7, METAL);
  printer3d(x + 3, y - 15, busy, t, prog); printer3d(x + 31, y - 15, false, t, .55);
}
function meetingTable(x, y) {
  table(x, y, 80, 18, 6, WOOD);
  R(x + 8, y + 4, 12, 9, E.m4); R(x + 8, y + 4, 11, 8, E.w); R(x + 9, y + 6, 8, 1, E.m4); R(x + 9, y + 8, 6, 1, E.m4);
  R(x + 30, y + 5, 20, 8, E.m1); R(x + 31, y + 6, 18, 6, E.m3); R(x + 32, y + 7, 16, 4, E.b0); P(x + 33, y + 8, E.b2);
  spr(['owwwo.', 'okkko.', 'owwwoo', '.ooo..'], { o: E.m2, w: E.w, k: E.wd1 }, x + 58, y + 6);
  R(x + 68, y + 4, 6, 8, E.y); R(x + 68, y + 4, 6, 1, E.w);
}
function shelfUnit(x, y) {
  A(x + 2, y + 62, 18, 2, .3);
  R(x, y, 20, 64, E.m1); R(x + 1, y + 1, 18, 62, E.m3); R(x + 1, y + 1, 18, 1, E.m4);
  for (let s = 0; s < 4; s++) { const sy = y + 3 + s * 15; R(x + 2, sy + 11, 16, 2, E.m4); R(x + 2, sy, 16, 11, E.m2);
    if (s % 2) { R(x + 3, sy + 4, 7, 7, E.wd1); R(x + 4, sy + 5, 5, 5, E.wd3); R(x + 4, sy + 5, 5, 1, E.wd4); R(x + 11, sy + 6, 6, 5, E.b0); R(x + 11, sy + 6, 6, 1, E.b1); }
    else { R(x + 3, sy + 6, 14, 5, E.g1); R(x + 3, sy + 6, 14, 1, E.g2); for (let k = 0; k < 4; k++) P(x + 4 + k * 3, sy + 8, E.y); } }
}
function crates(x, y) {
  const cr = (a, b, w, h) => { A(a + 2, b + h, w, 2, .25); R(a, b, w, h, E.wd1); R(a + 1, b + 1, w - 2, h - 2, E.wd3); R(a + 1, b + 1, w - 2, 1, E.wd4); R(a + 1, b + (h >> 1), w - 2, 1, E.wd2); R(a + 2, b + (h >> 1) - 2, 4, 1, E.wd2); };
  cr(x, y + 12, 22, 14); cr(x + 24, y + 16, 18, 12); cr(x + 3, y, 16, 12);
  R(x + 26, y + 5, 14, 11, E.m1); R(x + 27, y + 6, 12, 9, E.m3); R(x + 27, y + 6, 12, 1, E.m4); R(x + 31, y + 9, 4, 1, E.y);
}
function lineRobot(t) {
  const per = 2 * (63 + 78), s = (t * 18) % per; let x, y, dir;
  if (s < 63) { x = 171 + s; y = 213; dir = 0; } else if (s < 141) { x = 234; y = 213 + (s - 63); dir = 1; } else if (s < 204) { x = 234 - (s - 141); y = 291; dir = 2; } else { x = 171; y = 291 - (s - 204); dir = 3; }
  x = Math.round(x); y = Math.round(y);
  A(x - 4, y + 3, 9, 2, .3);
  if (dir === 0 || dir === 2) { R(x - 5, y - 4, 10, 8, E.m0); R(x - 4, y - 3, 8, 6, E.r1); R(x - 4, y - 3, 8, 1, E.r2); R(x - 4, y - 5, 3, 2, E.m0); R(x + 1, y - 5, 3, 2, E.m0); R(x - 4, y + 3, 3, 2, E.m0); R(x + 1, y + 3, 3, 2, E.m0); P(dir === 0 ? x + 4 : x - 5, y - 1, E.y); }
  else { R(x - 4, y - 5, 8, 10, E.m0); R(x - 3, y - 4, 6, 8, E.r1); R(x - 3, y - 4, 6, 1, E.r2); R(x - 5, y - 4, 2, 3, E.m0); R(x + 3, y - 4, 2, 3, E.m0); R(x - 5, y + 1, 2, 3, E.m0); R(x + 3, y + 1, 2, 3, E.m0); P(x - 1, dir === 1 ? y + 4 : y - 5, E.y); }
}
function piDesk(x, y) {
  table(x, y, 72, 15, 8, WOOD);
  for (const [dx, dy, w] of [[6, 6, 14], [34, 10, 18], [54, 5, 10]]) R(x + dx, y + dy, w, 1, '#a8634a');
  for (const dx of [3, 51]) { R(x + dx, y + 17, 18, 5, E.wd0); R(x + dx + 1, y + 17, 16, 4, E.wd1); R(x + dx + 1, y + 17, 16, 1, E.wd2); R(x + dx + 7, y + 19, 4, 1, E.o2); }
  monitorBack(x + 18, y - 7); monitorBack(x + 37, y - 7);
  R(x + 4, y + 4, 11, 8, E.m4); R(x + 4, y + 4, 10, 7, E.w); R(x + 5, y + 6, 7, 1, E.m4); R(x + 5, y + 8, 5, 1, E.m4);
  spr(['..ooo.', '.ollo.', '.olloo', '.oyyo.', 'oooooo'], { o: E.m1, l: E.o2, y: E.o1 }, x + 62, y - 7); R(x + 63, y - 2, 2, 7, E.m2); R(x + 61, y + 6, 6, 2, E.m1);
  cx.fillStyle = 'rgba(254,231,97,.10)'; cx.fillRect(x + 54, y + 1, 16, 13);
  spr(['owwwo.', 'okkko.', 'owwwoo', 'owwwo.', '.ooo..'], { o: E.m2, w: E.w, k: E.wd1 }, x + 56, y + 6);
  R(x + 24, y + 9, 22, 4, E.m3); R(x + 25, y + 9, 20, 2, E.m5); R(x + 28, y + 10, 12, 1, E.b0);
}
function cabinet(x, y) {
  A(x + 2, y + 27, 16, 2, .3);
  slab(x, y, 16, 28, METAL);
  for (let i = 0; i < 3; i++) { R(x + 2, y + 3 + i * 8, 12, 7, E.m2); R(x + 3, y + 3 + i * 8, 10, 6, E.m4); R(x + 3, y + 3 + i * 8, 10, 1, E.m5); R(x + 6, y + 6 + i * 8, 4, 1, E.m1); }
  R(x + 3, y - 3, 10, 4, E.wd1); R(x + 4, y - 3, 8, 3, E.o2); R(x + 4, y - 3, 8, 1, E.y);
}
function tvConsole(x, y) {
  table(x, y, 76, 6, 10, WOOD, false);
  for (let i = 0; i < 3; i++) { R(x + 4 + i * 24, y + 8, 20, 7, E.wd0); R(x + 5 + i * 24, y + 8, 18, 6, E.wd1); R(x + 5 + i * 24, y + 8, 18, 1, E.wd2); R(x + 13 + i * 24, y + 11, 3, 1, E.o2); }
  R(x + 6, y - 9, 8, 12, E.m0); R(x + 7, y - 8, 6, 10, E.m2); disc(x + 10, y - 3, 2, E.m1); R(x + 62, y - 9, 8, 12, E.m0); R(x + 63, y - 8, 6, 10, E.m2); disc(x + 66, y - 3, 2, E.m1);
  R(x + 30, y - 3, 16, 4, E.m0); R(x + 31, y - 2, 14, 2, E.m2); P(x + 43, y - 2, E.g3);
}
function coffeeBar(x, y, steam, t) {
  table(x, y, 40, 10, 14, LIGHT, false);
  R(x + 2, y + 12, 17, 11, E.m4); R(x + 21, y + 12, 17, 11, E.m4); R(x + 9, y + 16, 4, 1, E.m2); R(x + 28, y + 16, 4, 1, E.m2);
  R(x + 3, y - 12, 14, 18, E.m0); R(x + 4, y - 11, 12, 16, E.r1); R(x + 4, y - 11, 12, 2, E.r2); R(x + 6, y - 6, 8, 7, E.m1); R(x + 8, y - 2, 4, 3, E.w); P(x + 14, y - 9, E.y);
  if (steam) for (let i = 0; i < 4; i++) P(x + 9 + ((Math.floor(t * 3) + i) % 2), y - 4 - i * 2, 'rgba(255,255,255,.85)');
  R(x + 21, y - 5, 15, 10, E.m1); R(x + 22, y - 4, 13, 8, E.m5); R(x + 23, y - 3, 7, 6, E.m2); P(x + 32, y - 1, E.g3);
}
function fridge(x, y) { A(x + 2, y + 40, 16, 2, .3); slab(x, y, 17, 41, LIGHT); R(x + 1, y + 16, 15, 1, E.m4); R(x + 12, y + 5, 2, 7, E.m3); R(x + 12, y + 20, 2, 12, E.m3); R(x + 3, y + 4, 4, 4, E.o2); R(x + 4, y + 22, 4, 3, E.pk); }
function coffeeTable(x, y) {
  table(x, y, 56, 12, 5, WOOD);
  R(x + 6, y + 3, 12, 7, E.m4); R(x + 6, y + 3, 11, 6, E.w); R(x + 7, y + 5, 8, 1, E.b0);
  spr(['owwwo.', 'okkko.', 'owwwoo', '.ooo..'], { o: E.m2, w: E.w, k: E.wd1 }, x + 24, y + 4);
  R(x + 36, y + 3, 14, 7, E.y); R(x + 36, y + 3, 14, 1, E.w); for (let i = 0; i < 3; i++) P(x + 39 + i * 4, y + 6, E.r2);
}
function sofaSeat(x, y) { R(x, y, 88, 14, E.o0); R(x + 1, y + 1, 86, 12, E.o2); R(x + 1, y + 1, 86, 1, E.y); for (let i = 1; i < 3; i++) R(x + Math.round(88 * i / 3), y + 1, 1, 12, E.o1); }
function sofaBack(x, y) {
  A(x - 4, y + 20, 98, 3, .3);
  const arm = ax => { R(ax, y - 14, 10, 34, E.o0); R(ax + 1, y - 13, 8, 32, E.o1); R(ax + 1, y - 13, 8, 2, E.o2); R(ax + 1, y + 16, 8, 3, E.o0); };
  arm(x - 8); arm(x + 86);
  R(x, y, 88, 20, E.o0); R(x + 1, y + 1, 86, 18, E.o1); R(x + 1, y + 1, 86, 2, E.o2); R(x + 1, y + 16, 86, 3, E.o0);
  for (let i = 1; i < 3; i++) R(x + Math.round(88 * i / 3), y + 3, 1, 13, E.o0);
  for (let i = 0; i < 3; i++) { R(x + 8 + i * 29, y + 6, 2, 1, E.o0); R(x + 20 + i * 29, y + 6, 2, 1, E.o0); }
  R(x + 4, y + 20, 3, 3, E.m0); R(x + 81, y + 20, 3, 3, E.m0);
}
function armchair(x, y, front) {
  if (!front) { A(x + 2, y + 34, 28, 2, .3); R(x, y, 30, 18, E.b0); R(x + 1, y + 1, 28, 16, '#2c6fb0'); R(x + 1, y + 1, 28, 2, E.b1); for (let i = 0; i < 3; i++) P(x + 8 + i * 7, y + 8, E.b0); R(x + 3, y + 14, 24, 18, E.b0); R(x + 4, y + 15, 22, 16, '#3a85c8'); R(x + 4, y + 15, 22, 1, E.b1); }
  else { const arm = ax => { R(ax, y + 12, 7, 20, E.b0); R(ax + 1, y + 13, 5, 18, '#2c6fb0'); R(ax + 1, y + 13, 5, 1, E.b1); }; arm(x); arm(x + 23); R(x + 2, y + 30, 26, 4, E.b0); R(x + 3, y + 30, 24, 2, '#2c6fb0'); }
}
function floorLamp(x, y) { A(x - 5, y + 1, 12, 2, .3); R(x, y - 40, 2, 41, E.m1); R(x - 4, y, 10, 2, E.m0); R(x - 7, y - 52, 16, 13, E.wd1); R(x - 6, y - 51, 14, 11, E.wd4); R(x - 6, y - 51, 14, 1, E.w); R(x - 6, y - 41, 14, 1, E.wd3); cx.fillStyle = 'rgba(254,231,97,.10)'; cx.fillRect(x - 18, y - 40, 38, 36); }
function beanbag(x, y) { A(x + 2, y + 20, 26, 2, .3); disc(x + 14, y + 11, 11, E.p1); disc(x + 14, y + 10, 10, E.p2); disc(x + 11, y + 7, 4, E.pk); R(x + 6, y + 16, 16, 2, E.p1); }

/* ---------- Nhân vật ---------- */
const SPAWN = SPOTS.door.seats[0];
const chars = PEOPLE.map((p, i) => ({ p, i, F: buildChar(p.look, p.palette), x: SPAWN.x, y: SPAWN.y, dir: 'up', pose: 'stand', path: [], hidden: true, key: null, act: null, anim: 0, final: null }));
const SPEED = 40;
function retarget(ch, r, snap) {
  ch.key = r.key; ch.act = r.act; ch.final = r;
  if (snap) { ch.hidden = r.spot === 'door'; ch.x = r.seat.x; ch.y = r.seat.y; ch.path = []; ch.dir = r.seat.dir; ch.pose = r.pose; return; }
  if (ch.hidden && r.spot === 'door') { ch.path = []; return; }
  if (ch.hidden) { ch.hidden = false; ch.x = SPAWN.x; ch.y = SPAWN.y; }
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
  if (!seated) A(x - 5, y - 1, 10, 2, .28);
  if (sel && !seated) { R(x - 6, y, 12, 1, E.o1); R(x - 5, y + 1, 10, 1, E.o1); }
  const breathe = Math.floor(t * 1.4 + ch.i * .7) % 2;
  let img, top;
  if (ch.pose === 'walk') { img = F[ch.dir].walk[Math.floor(ch.anim * 8) % 4]; top = y - 21; }
  else if (ch.pose === 'sit') { img = F.sitUp; top = y - 20 + breathe; }
  else if (ch.pose === 'type') { img = F.typeUp[Math.floor(t * 5 + ch.i) % 2]; top = y - 20; }
  else if (ch.pose === 'sleep') { img = F.sleepUp; top = y - 20 + (Math.floor(t * .8) % 2); }
  else if (ch.pose === 'sitdown') { img = F.sitDown; top = y - 21 + breathe; }
  else if (ch.pose === 'read') { img = F.readDown; top = y - 21 + (Math.floor(t * .7 + ch.i) % 2); }
  else { img = F[ch.dir].idle; top = y - 21 + breathe; }
  g.drawImage(img, x - 8, top);
  return { x, y: top };
}

/* ---------- Khung hình ---------- */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const S = 3; cv.width = W * S; cv.height = H * S;
let printProg = 0;
function render(now) {
  const t = now / 1000;
  cx = g; g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0);
  acUnit(12, 8, t); whiteboard(54, 7, 70, 22); windowPane(136, 9, 40, 16, t, 3); clockW(184, 11, simMs); corkBoard(196, 9); chart(224, 9);
  windowPane(300, 8, 84, 18, t + 40, 4); frame(392, 10, 'cert'); clockW(410, 12, simMs); frame(422, 10, 'cert');
  frame(268, 106, 'sun'); clockW(386, 108, simMs);
  const settled = c => !c.hidden && !c.path.length && c.final;
  const at = spot => chars.find(c => settled(c) && c.final.spot === spot);
  const typingAt = (x, y) => chars.some(c => settled(c) && c.final.spot === 'desk_SV' && c.final.seat.x === x && c.final.seat.y === y && c.pose === 'type');
  const busyPrint = !!at('may_in'); if (busyPrint) printProg = Math.min(1, printProg + 0.0005); else if (printProg >= 1) printProg = 0;
  tvWall(300, 103, !!at('sofa'), t);
  const items = [
    { y: 44, d: () => plant(4, 24, t, 0) },
    { y: 46, d: () => waterCooler(178, 15, t) },
    { y: 47, d: () => bookshelf(196, 4, 46, 44, 2) },
    ...DESK_X.map((x, i) => ({ y: 98, d: () => studyDesk(x, 76, i, typingAt(x + 20, 110), t) })),
    ...DESK_X.map((x, i) => ({ y: 170, d: () => studyDesk(x, 148, i + 1, typingAt(x + 20, 182), t) })),
    ...DESK_X.map(x => ({ y: 111, d: () => chairBack(x + 20, 111) })),
    ...DESK_X.map(x => ({ y: 183, d: () => chairBack(x + 20, 183) })),
    { y: 98, d: () => workbench(164, 76, t) },
    { y: 170, d: () => printTable(164, 148, busyPrint, t, printProg) },
    { y: 240, d: () => meetingTable(48, 216) },
    { y: 255, d: () => chairBack(88, 255) }, { y: 255, d: () => chairBack(120, 255) },
    { y: 252, d: () => shelfUnit(8, 188) },
    { y: 306, d: () => crates(10, 278) },
    { y: 300, d: () => plant(222, 282, t, 1) },
    { y: 200, d: () => lineRobot(t) },
    { y: 48, d: () => bookshelf(260, 4, 34, 44, 5) },
    { y: 46, d: () => plant(424, 26, t, 2) },
    { y: 56, d: () => execChair(340, 56) },
    { y: 80, d: () => piDesk(304, 56) },
    { y: 86, d: () => cabinet(260, 58) },
    { y: 146, d: () => coffeeBar(260, 130, !!at('pantry'), t) },
    { y: 146, d: () => fridge(424, 106) },
    { y: 144, d: () => tvConsole(302, 130) },
    { y: 150, d: () => smallPlant(392, 136) },
    { y: 176, d: () => plant(258, 158, t, 3) },
    { y: 190, d: () => coffeeTable(318, 176) },
    { y: 215, d: () => sofaSeat(304, 212) },
    { y: 232, d: () => sofaBack(304, 224) },
    { y: 207, d: () => floorLamp(392, 206) },
    { y: 242, d: () => armchair(402, 228, false) },
    { y: 266, d: () => armchair(402, 228, true) },
    { y: 290, d: () => beanbag(262, 268) },
    { y: 302, d: () => plant(424, 284, t, 4) }
  ];
  const infos = [];
  for (const c of chars.filter(c => !c.hidden)) items.push({ y: c.y - 0.5, d: () => infos.push([c, drawChar(c, t, c.p.id === selected)]) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.d());
  for (const [c, info] of infos) {
    const ic = CFG.actions[c.act]?.icon;
    if (!ic || c.pose === 'walk') continue;
    const x = Math.round(c.x), bob = Math.floor(t * 2 + c.i) % 2, bx = x - 5, by = info.y - 12 + bob;
    R(bx, by - 1, 9, 11, E.m2); R(bx - 1, by, 11, 9, E.m2); R(bx, by, 9, 9, E.w); R(bx, by + 8, 9, 1, E.m5);
    R(x - 1, by + 9, 3, 2, E.m2); P(x, by + 9, E.w);
    g.drawImage(icon(ic), bx + 1, by + 1);
  }
  ctx.imageSmoothingEnabled = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(scene, 0, 0, W * S, H * S);
}

/* ---------- Điều khiển ---------- */
const $ = id => document.getElementById(id);
let simMs = vnNowMs(), speed = 1, selected = null, lastSig = '';
// ?t=2026-11-12T15:10 mở đúng thời điểm đó (giờ VN); ?speed=0 để dừng
const Q = new URLSearchParams(location.search);
if (Q.get('t') && !isNaN(Date.parse(Q.get('t') + 'Z'))) simMs = Date.parse(Q.get('t') + 'Z');
if (Q.has('speed')) speed = +Q.get('speed') || 0;
cv.addEventListener('click', e => {
  const b = cv.getBoundingClientRect(), ax = (e.clientX - b.left) / b.width * W, ay = (e.clientY - b.top) / b.height * H;
  const hit = chars.filter(c => !c.hidden && Math.abs(c.x - ax) < 9 && ay < c.y + 6 && ay > c.y - 24);
  selected = hit.length ? hit[hit.length - 1].p.id : null; lastSig = '';
});
function renderNow(res) {
  const list = $('now'); if (!list) return;
  const here = chars.filter(c => !c.hidden && res[c.p.id].act);
  const sig = here.map(c => c.p.id + ':' + res[c.p.id].act + ':' + (c.path.length ? 'w' : '')).join(',') + '|' + selected;
  if (sig === lastSig) return; lastSig = sig;
  list.innerHTML = here.map(c => {
    const A2 = CFG.actions[res[c.p.id].act], doing = c.path.length ? 'đang đi tới chỗ ' + A2.label : 'đang ' + A2.label;
    return `<li class="${c.p.role === 'PI' ? 'pi' : ''}${selected === c.p.id ? ' sel' : ''}"><b>${c.p.name}</b><span class="role">${c.p.role}</span><span>${doing}</span></li>`;
  }).join('');
}

let last = performance.now(), uiT = 1, lastSim = null;
function tick(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  simMs += dt * 1000 * speed;
  const res = resolveAll(simMs);
  const snap = lastSim === null || Math.abs(simMs - lastSim) > 20 * 60000; lastSim = simMs;
  for (const ch of chars) { const r = res[ch.p.id]; if (r.key !== ch.key || (snap && ch.path.length)) retarget(ch, r, snap); step(ch, dt * Math.min(Math.max(1, speed / 60), 4)); }
  render(Math.max(0, now));
  uiT += dt;
  if (uiT > 0.2) { uiT = 0; renderNow(res); }
  requestAnimationFrame(tick);
}
drawStatic();
requestAnimationFrame(tick);
window.__lab = { resolveAll, rosterFor, CFG, chars, SPOTS, walkable, bfs, tileOf, set sim(v) { simMs = v; }, get sim() { return simMs; } };
})();
