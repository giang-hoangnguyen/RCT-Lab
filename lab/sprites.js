/* Pixel art tự vẽ cho phòng lab RCT (không dùng asset bên thứ ba).
   Mỗi sprite là mảng chuỗi; mỗi ký tự là một màu trong bảng màu của nhân vật, '.' là trong suốt.
   Nhân vật 16 px ngang, đầu 12 hàng + thân 10 hàng. */
(() => {
const OUT = '#2c2137';

/* ---------- Đầu theo từng nhân vật: down (mặt trước), up (sau gáy), right (nghiêng phải) ---------- */
const HEADS = {
  giang: {
    down: [
      '....O.OOOO.O....',
      '...OHOHHHHOHO...',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '.OHHHHHHHhHHHHO.',
      '.OHhHHSHHHSHhHO.',
      '.OHSSSSSSSSSSHO.',
      '.OSGGGGSSGGGGSO.',
      '.OSGELGGGGLEGSO.',
      '.OsGGGGSSGGGGsO.',
      '..OsSSSssSSSsO..',
      '...OOOOOOOOOO...'],
    up: [
      '....O.OOOO.O....',
      '...OHOHHHHOHO...',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '.OHHHHHHHHHHHHO.',
      '.OHHHhHHHHhHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHhHHHHHHHHhHO.',
      '.OHHHHHHHHHHHHO.',
      '.OsHHHHHHHHHHsO.',
      '..OsHhHHHHhHsO..',
      '...OOOOOOOOOO...'],
    right: [
      '....O.OOOO......',
      '...OHOHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHHHHHHHHHO...',
      '.OHHHHHHHHHHHO..',
      '.OHHHHHHHSHHhO..',
      '.OHHHHHSSSSSSO..',
      '.OHHHHGGGGGGGO..',
      '.OHHsSSSSGELGO..',
      '.OHHsSSSSGGGSO..',
      '..OHHSSSSSSssO..',
      '...OOOOOOOOOO...']
  },
  svA: {
    down: [
      '....OOOOOOOO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHhHHO..',
      '.OHHHHHHHhHHHHO.',
      '.OHHHHHHhSSSHHO.',
      '.OHHSSSSSSSSSHO.',
      '.OHSSSSSSSSSSSO.',
      '.OSSESSSSSSESSO.',
      '.OSSESSSSSSESSO.',
      '..OsSSSssSSSsO..',
      '...OOOOOOOOOO...'],
    up: [
      '....OOOOOOOO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '.OHHHHHHHHHHHHO.',
      '.OHHHhHHHHHHHHO.',
      '.OHHHHHHHHHhHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHhHHHHHHHHHHO.',
      '.OsHHHHHHHHHHsO.',
      '..OsHHHHHHHHsO..',
      '...OOOOOOOOOO...'],
    right: [
      '....OOOOOOO.....',
      '...OHHHHHHHO....',
      '..OHHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '.OHHHHHHHHHHHO..',
      '.OHHHHHHHHhHHO..',
      '.OHHHHHHSSSSSO..',
      '.OHHHHSSSSSSSO..',
      '.OHHsSSSSSSESO..',
      '.OHHsSSSSSSESO..',
      '..OHHSSSSSssO...',
      '...OOOOOOOOO....']
  }
};

/* ---------- Thân dùng chung ---------- */
const BODY = {
  down: [
    '..OTTTTCCTTTTO..',
    '.OTtTTTTTTTTtTO.',
    '.OTtTTTTTTTTtTO.',
    '.OStTTTTTTTTtSO.',
    '.OSOPPPPPPPPOSO.',
    '..OOPPPPPPPPOO..',
    '...OPPPOOPPPO...',
    '...OPPPOOPPPO...',
    '...OBBBOOBBBO...',
    '...OOOOOOOOOO...'],
  right: [
    '....OTTTTTO.....',
    '...OTTTTTTTO....',
    '...OTTtTTTTO....',
    '...OTTSTTTTO....',
    '...OOPPPPPPO....',
    '....OPPPPPO.....',
    '....OPPPPPO.....',
    '....OPPPPPO.....',
    '....OBBBBBBO....',
    '....OOOOOOOO....']
};
BODY.up = BODY.down.map(r => r.replace(/C/g, 'T'));

/* 4 hàng chân cuối cho khung đi bộ */
const LEGS = {
  down: [
    ['...OPPPOOPPPO...', '...OBBBOOPPPO...', '...OOOOOOBBBO...', '.........OOOO...'],
    ['...OPPPOOPPPO...', '...OPPPOOBBBO...', '...OBBBOOOOOO...', '...OOOO.........']],
  right: [
    ['...OPPOOPPO.....', '..OPPO..OPPO....', '..OBBO..OBBBO...', '..OOO....OOOO...'],
    ['....OPPPPPO.....', '....OPPPPPO.....', '....OBBBBBBO....', '....OOOOOOOO....']]
};
LEGS.up = LEGS.down;

/* Ngồi quay mặt xuống (sofa): 6 hàng thân trên + chân gập */
const SIT_DOWN_LEGS = [
  '..OPPPPOOPPPPO..',
  '...OBBBOOBBBO...',
  '...OOOOOOOOOO...'];

/* Sách cầm tay khi ngồi đọc */
const BOOK = { pal: { O: OUT, c: '#c0523a', w: '#fbf4e2', l: '#d8cfb8' }, d: [
  '...OOOOOOOOOO...',
  '...OcwwwOwwwcO..',
  '...OcwlwOwlwcO..',
  '...OcwwwOwwwcO..',
  '...OOOOOOOOOO...'].map(r => r.slice(0, 16)) };

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function paint(ctx, rows, pal, ox = 0, oy = 0) {
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const ch = row[x]; if (ch === '.' || ch === ' ') continue;
    const col = ch === 'O' ? OUT : pal[ch]; if (!col) continue;
    ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, 1, 1); } });
}
function mirror(src) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }

/* Ghép bộ khung cho một nhân vật */
function buildChar(lookName, pal) {
  const H = HEADS[lookName];
  const one = (head, body, legs, headDy = 0) => {
    const c = mk(16, 22), g = c.getContext('2d');
    const b = legs ? body.slice(0, 6).concat(legs) : body;
    paint(g, b, pal, 0, 12); paint(g, head, pal, 0, headDy);
    return c;
  };
  const F = {};
  for (const d of ['down', 'up', 'right']) {
    F[d] = { idle: one(H[d], BODY[d]), walk: [one(H[d], BODY[d], LEGS[d][0]), one(H[d], BODY[d]), one(H[d], BODY[d], LEGS[d][1]), one(H[d], BODY[d])] };
  }
  // hướng phải đi bộ: khung 2 dùng chân bước, khung 4 dùng chân đứng nên đều nhịp
  F.left = { idle: mirror(F.right.idle), walk: F.right.walk.map(mirror) };
  // ngồi quay lưng (bàn làm việc): đầu + 4 hàng thân, ghế che phần dưới
  const sitUp = (dy) => { const c = mk(16, 18), g = c.getContext('2d'); paint(g, BODY.up.slice(0, 5), pal, 0, 12); paint(g, H.up, pal, 0, dy); return c; };
  F.sitUp = sitUp(0); F.sleepUp = sitUp(3);
  // gõ phím: tay nhô lên luân phiên
  F.typeUp = [0, 1].map(k => { const c = sitUp(0), g = c.getContext('2d'); g.fillStyle = pal.S; g.fillRect(k ? 3 : 11, 12, 2, 1); g.fillStyle = OUT; g.fillRect(k ? 3 : 11, 11, 2, 1); return c; });
  // ngồi sofa quay mặt xuống, cầm sách
  const sd = mk(16, 21), sg = sd.getContext('2d');
  paint(sg, BODY.down.slice(0, 6).concat(SIT_DOWN_LEGS), pal, 0, 12); paint(sg, H.down, pal, 0, 0);
  F.sitDown = sd;
  const sdb = mk(16, 21), sbg = sdb.getContext('2d'); sbg.drawImage(sd, 0, 0); paint(sbg, BOOK.d, BOOK.pal, 0, 13);
  F.readDown = sdb;
  return F;
}

/* ---------- Icon hoạt động 7x7 ---------- */
const ICONS = {
  laptop:  { p: { k: '#3b4a6b', s: '#8fd3ff', g: '#c9d3df' }, d: ['.......', '.kkkkk.', '.kssssk', '.kssssk', '.kkkkk.', 'ggggggg', '.......'] },
  chip:    { p: { k: '#3b4a6b', g: '#9aa7b8', o: '#e9803d' }, d: ['.g.g.g.', 'gkkkkkg', '.kkokk.', 'gkoookg', '.kkkkk.', 'g.g.g.g', '.......'] },
  printer: { p: { k: '#3b4a6b', o: '#e9803d', g: '#9aa7b8' }, d: ['kkkkkkk', 'k..o..k', 'k..o..k', 'k.....k', 'k.ooo.k', 'kgggggk', 'kkkkkkk'] },
  wrench:  { p: { g: '#6f7f96' }, d: ['....g.g', '....ggg', '...ggg.', '..ggg..', '.ggg...', 'ggg....', '.g.....'] },
  paper:   { p: { k: '#6f7f96', w: '#ffffff' }, d: ['kkkkk..', 'kwwwkk.', 'kwkkwk.', 'kwwwwk.', 'kwkkwk.', 'kwwwwk.', 'kkkkkk.'] },
  board:   { p: { k: '#3b4a6b', w: '#ffffff', o: '#e9803d', b: '#163c6c' }, d: ['kkkkkkk', 'kwwwwwk', 'kwbbwwk', 'kwwwowk', 'kwbwwwk', 'kkkkkkk', '.k...k.'] },
  talk:    { p: { b: '#163c6c', w: '#ffffff' }, d: ['.bbbbb.', 'bwwwwwb', 'bwbwbwb', 'bwwwwwb', '.bbbbb.', '..b....', '.b.....'] },
  coffee:  { p: { s: '#aab4c2', w: '#ffffff', c: '#7b4a2a', k: '#3b4a6b' }, d: ['..s.s..', '...s.s.', 'kkkkk..', 'kcccckk', 'kwwwwkk', '.kwwk..', '..kk...'] },
  zzz:     { p: { z: '#5b6ee1' }, d: ['zzzz...', '...z...', '..z....', '.z..zzz', 'zzzz.z.', '....z..', '....zzz'] }
};

const iconCache = {};
function icon(name) {
  if (iconCache[name]) return iconCache[name];
  const ic = ICONS[name]; if (!ic) return null;
  const c = mk(7, 7); paint(c.getContext('2d'), ic.d, ic.p); return (iconCache[name] = c);
}

window.SPR = { OUT, buildChar, icon, paint, mk, mirror };
})();
