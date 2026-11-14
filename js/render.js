/* ============================================================
   RENDERER — procedural pixel art, room building, lighting, FX
   No external assets: every tile, sprite and icon is drawn here.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, T = 16, h2 = G.h2;
  const cv = document.getElementById('game');
  const main = cv.getContext('2d');
  let c = main;
  const lc = document.createElement('canvas'); lc.width = G.W; lc.height = G.H;
  const l = lc.getContext('2d');
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

  const TH = {
    lab:      { f1: '#1a2233', f2: '#1d2638', line: '#131a28', wall: '#2c3855', top: '#0c101a', trim: '#3ee0c8', dark: 0.74 },
    security: { f1: '#1c1f27', f2: '#20242d', line: '#13151b', wall: '#343a45', top: '#0b0d12', trim: '#7ddc6a', dark: 0.75 },
    server:   { f1: '#141a2e', f2: '#171e35', line: '#0d1222', wall: '#242d52', top: '#080b18', trim: '#4aa8ff', dark: 0.79 },
    archive:  { f1: '#221a1a', f2: '#271e1d', line: '#171111', wall: '#3d2d2a', top: '#100a0a', trim: '#ff7a5a', dark: 0.84 },
    medical:  { f1: '#22303a', f2: '#263540', line: '#19242c', wall: '#3f525d', top: '#0f171c', trim: '#bfe9e2', dark: 0.72 },
    reactor:  { f1: '#231d1a', f2: '#28211c', line: '#16110f', wall: '#45372b', top: '#100c09', trim: '#ffb347', dark: 0.74 },
    final:    { f1: '#1a1630', f2: '#1e1936', line: '#110e21', wall: '#2f2854', top: '#0a0816', trim: '#b78cff', dark: 0.76 }
  };
  const TC = () => TH[G.R.def.theme].trim;

  /* ---------------- ROOM BUILD ---------------- */
  function build(id) {
    const def = G.ROOMS[id], w = def.w, h = def.h, t = [];
    for (let y = 0; y < h; y++) t.push(new Uint8Array(w));
    def.floor.forEach(f => { for (let y = f[1]; y < f[1] + f[3]; y++) for (let x = f[0]; x < f[0] + f[2]; x++) t[y][x] = 1; });
    def.objs.forEach(o => { if (o.type === 'door') for (let x = o.x; x < o.x + o.w; x++) t[o.y][x] = 3; });
    const g = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? 0 : t[y][x];
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!t[y][x]) {
      let n = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g(x + dx, y + dy) === 1) n = true;
      if (n) add.push([x, y]);
    }
    add.forEach(p => { t[p[1]][p[0]] = 2; });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t[y][x] === 0 && g(x, y + 1) >= 2 && g(x, y + 2) === 1) t[y][x] = 2;

    const bg = document.createElement('canvas'); bg.width = w * T; bg.height = h * T;
    c = bg.getContext('2d'); const th = TH[def.theme];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = t[y][x], X = x * T, Y = y * T;
      if (v === 1) floorTile(X, Y, x, y, th, def.theme);
      else if (v >= 2) {
        if (g(x, y + 1) === 1) face(X, Y, x, y, th);
        else if (v === 3) r(X, Y, T, T, '#05070b');
        else { r(X, Y, T, T, th.top); if (g(x, y - 1) === 1) r(X, Y, T, 3, th.wall); if (g(x - 1, y) === 1) r(X, Y, 2, T, th.wall); if (g(x + 1, y) === 1) r(X + 14, Y, 2, T, th.wall); }
      }
    }
    // soft shadow under north walls
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) if (t[y][x] === 1 && t[y - 1][x] >= 2) {
      for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(0,0,0,${0.36 - i * 0.05})`; c.fillRect(x * T, y * T + i, T, 1); }
    }
    (def.decals || []).forEach(d => decal(d, th));
    c = main;

    const objs = def.objs.map(o => Object.assign({}, o, { r: [o.x * T, o.y * T, o.w * T, o.h * T], anim: 0 }));
    objs.forEach(o => { if (o.type === 'door' && (o.dir === 's' || G.S && G.S.flags['open_' + o.id])) o.anim = 1; });
    const hazards = (def.hazards || []).map(z => Object.assign({}, z, { px: 0, py: 0, on: false, warn: false }));
    G.R = { id, def, tiles: t, bg, W: w * T, H: h * T, objs, hazards, spark: {}, dust: [] };
    for (let i = 0; i < 46; i++) G.R.dust.push({ x: Math.random() * w * T, y: Math.random() * h * T, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 4, s: Math.random() });
  }

  function floorTile(X, Y, x, y, th, theme) {
    const n = h2(x, y);
    r(X, Y, T, T, (x + y) % 2 ? th.f1 : th.f2); r(X, Y + 15, T, 1, th.line); r(X + 15, Y, 1, T, th.line);
    r(X, Y, T, 1, '#ffffff06');
    if (n < 0.07) { for (let i = 3; i < 13; i += 3) r(X + 3, Y + i, 10, 1, th.line); r(X + 2, Y + 2, 12, 1, '#ffffff0a'); }
    else if (n < 0.16) { r(X + 2, Y + 2, 1, 1, '#ffffff22'); r(X + 13, Y + 13, 1, 1, '#ffffff22'); r(X + 13, Y + 2, 1, 1, '#ffffff12'); r(X + 2, Y + 13, 1, 1, '#ffffff12'); }
    else if (n > 0.94) { r(X + 3 + ((n * 97) | 0) % 7, Y + 5 + ((n * 53) | 0) % 5, 4, 2, '#00000038'); r(X + 5 + ((n * 31) | 0) % 6, Y + 8, 2, 1, '#00000030'); }
    else if (n > 0.9) { r(X + 4, Y + 11, 5, 1, '#ffffff0d'); }
    if (theme === 'medical') { r(X + 7, Y + 7, 2, 2, '#ffffff0e'); }
    if (theme === 'reactor' && n > 0.5 && n < 0.58) { for (let i = 0; i < 4; i++) r(X + 2 + i * 3, Y + 12 - i * 3, 3, 2, '#ffb34718'); }
    if (theme === 'server' && n > 0.6 && n < 0.66) { r(X + 6, Y + 6, 4, 4, '#4aa8ff14'); }
  }
  function face(X, Y, x, y, th) {
    r(X, Y, T, T, th.wall); r(X, Y, T, 2, '#ffffff22'); r(X, Y + 12, T, 4, '#00000055'); r(X, Y + 6, T, 1, th.trim + '55');
    if (x % 2 === 0) r(X, Y + 2, 1, 10, '#00000035');
    const n = h2(x * 3, y * 7);
    if (n < 0.12) { r(X + 4, Y + 3, 9, 6, '#00000050'); for (let i = 0; i < 3; i++) r(X + 5, Y + 4 + i * 2, 7, 1, '#ffffff1a'); }
    else if (n < 0.2) { r(X + 7, Y, 3, T, '#00000045'); r(X + 7, Y, 1, T, '#ffffff1c'); }
    else if (n > 0.93) { r(X + 5, Y + 8, 6, 3, '#ffb34755'); r(X + 6, Y + 9, 1, 1, '#000'); r(X + 8, Y + 9, 1, 1, '#000'); }
  }
  function decal(d, th) {
    if (d.k === 'cable') {
      for (let i = 0; i < d.pts.length - 1; i++) {
        const a = d.pts[i], b = d.pts[i + 1];
        const x = Math.min(a[0], b[0]) * T + 7, y = Math.min(a[1], b[1]) * T + 7, w = Math.abs(a[0] - b[0]) * T + 3, h = Math.abs(a[1] - b[1]) * T + 3;
        r(x, y, w, h, '#06080d'); r(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2), d.col + '88');
      }
    } else if (d.k === 'hz') {
      const x = d.x * T, y = d.y * T, w = d.w * T, h = d.h * T;
      for (let i = 0; i < w; i += 8) { r(x + i, y, 4, 2, '#ffb34770'); r(x + i, y + h - 2, 4, 2, '#ffb34770'); }
      for (let i = 0; i < h; i += 8) { r(x, y + i, 2, 4, '#ffb34770'); r(x + w - 2, y + i, 2, 4, '#ffb34770'); }
    } else if (d.k === 'txt') {
      c.font = 'bold 10px monospace'; c.fillStyle = d.col; c.fillText(d.s, d.x * T, d.y * T);
    } else if (d.k === 'mat') { r(d.x * T, d.y * T, d.w * T, d.h * T, '#00000026'); r(d.x * T, d.y * T, d.w * T, 1, th.trim + '30'); r(d.x * T, d.y * T + d.h * T - 1, d.w * T, 1, th.trim + '30'); }
  }

  /* ---------------- ALEX SPRITE SHEET (generated) ---------------- */
  const HAIR = '#2b1d17', SKIN = '#dba27c', SKS = '#b57c59', SUIT = '#1c2b3d', SUL = '#30506e', ACC = '#3ee0c8', PACK = '#6a5536', PACKD = '#463823', BOOT = '#0b0e14', LEG = '#141e2c';
  function alexFrame(x, dir, f, run) {
    const p = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const s = [0, 1, 0, -1][f], amp = run ? 2 : 1, bob = (f % 2) ? 1 : 0;
    if (dir === 0 || dir === 1) {
      const la = s > 0 ? amp : (s < 0 ? -1 : 0), ra = -la;
      p(5, 16, 2, 5 + (la > 0 ? 1 : la), LEG); p(9, 16, 2, 5 + (ra > 0 ? 1 : ra), LEG);
      p(5, 20 + (la > 0 ? 1 : la), 2, 2, BOOT); p(9, 20 + (ra > 0 ? 1 : ra), 2, 2, BOOT);
      const b = bob;
      p(4, 9 + b, 8, 8, SUIT); p(4, 9 + b, 8, 1, SUL);
      p(3, 10 + b - s * amp * 0.5, 1, 6, SUIT); p(12, 10 + b + s * amp * 0.5, 1, 6, SUIT);
      p(3, 15 + b - s, 1, 1, SKIN); p(12, 15 + b + s, 1, 1, SKIN);
      if (dir === 0) {
        p(4, 2 + b, 8, 7, SKIN); p(4, 1 + b, 8, 3, HAIR); p(3, 2 + b, 1, 4, HAIR); p(12, 2 + b, 1, 4, HAIR);
        p(6, 6 + b, 1, 1, '#1a1210'); p(9, 6 + b, 1, 1, '#1a1210'); p(7, 8 + b, 2, 1, SKS);
        p(5, 9 + b, 1, 6, PACK); p(10, 9 + b, 1, 6, PACK); p(7, 11 + b, 2, 1, ACC); p(4, 15 + b, 8, 1, '#0e1620');
        p(12, 13 + b + s, 1, 1, ACC); p(10, 12 + b, 2, 2, '#2a3644'); p(11, 12 + b, 1, 1, '#ffe9a8');
      } else {
        p(4, 1 + b, 8, 8, HAIR); p(5, 7 + b, 6, 2, SKS);
        p(4, 9 + b, 8, 7, PACK); p(4, 9 + b, 8, 1, '#86704a'); p(5, 12 + b, 6, 1, PACKD); p(7, 13 + b, 2, 2, PACKD); p(4, 15 + b, 8, 1, PACKD);
        p(3, 13 + b - s, 1, 1, ACC);
      }
    } else {
      const b = bob;
      const fa = s * (amp + 1), ba = -s * (amp + 1);
      p(7 + ba, 16, 2, 5 - Math.abs(s), LEG); p(7 + ba, 20 - Math.abs(s), 3, 2, BOOT);
      p(7 + fa, 16, 2, 5, LEG); p(7 + fa, 20, 3, 2, BOOT);
      p(3, 10 + b, 3, 6, PACK); p(3, 10 + b, 3, 1, '#86704a'); p(3, 14 + b, 3, 1, PACKD);
      p(5, 9 + b, 6, 8, SUIT); p(5, 9 + b, 6, 1, SUL); p(5, 16 + b, 6, 1, '#0e1620');
      p(5, 2 + b, 7, 7, SKIN); p(4, 1 + b, 8, 3, HAIR); p(4, 2 + b, 3, 6, HAIR); p(10, 6 + b, 1, 1, '#1a1210'); p(11, 8 + b, 1, 1, SKS);
      p(7 - s * amp, 10 + b, 2, 6, '#16222f'); p(7 - s * amp, 15 + b, 2, 1, SKIN); p(7 - s * amp, 13 + b, 2, 1, ACC);
      p(10, 12 + b, 3, 2, '#2a3644'); p(12, 12 + b, 1, 1, '#ffe9a8');
    }
  }
  let alex = null;
  function makeAlex() {
    alex = document.createElement('canvas'); alex.width = 64; alex.height = 24 * 8;
    const x = alex.getContext('2d');
    for (let run = 0; run < 2; run++) for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 4; f++) {
      x.save(); x.translate(f * 16, (run * 4 + dir) * 24);
      if (dir === 2) { x.translate(16, 0); x.scale(-1, 1); }
      alexFrame(x, dir, f, run); x.restore();
    }
  }

  /* ---------------- ITEM ICONS (generated) ---------------- */
  const ICON = {
    wrist(p) { p(4, 2, 8, 12, '#2a3644'); p(3, 5, 10, 6, '#11161f'); p(4, 6, 8, 4, '#0d3b36'); p(5, 7, 5, 2, '#3ee0c8'); p(11, 7, 1, 2, '#ff4d5a'); },
    code3042(p) { p(3, 2, 10, 12, '#d8d2b8'); p(5, 4, 6, 1, '#555'); p(5, 6, 6, 1, '#555'); p(5, 9, 6, 3, '#3ee0c8'); },
    mkey(p) { p(3, 3, 5, 5, '#d9a441'); p(4, 4, 3, 3, '#0b0e14'); p(7, 5, 7, 2, '#d9a441'); p(11, 7, 1, 2, '#d9a441'); p(13, 7, 1, 3, '#d9a441'); },
    card1(p) { p(2, 4, 12, 8, '#e6ebf0'); p(2, 4, 12, 2, '#3ee0c8'); p(4, 8, 3, 3, '#8793a3'); p(8, 8, 5, 1, '#8793a3'); p(8, 10, 4, 1, '#8793a3'); },
    keycard(p) { p(2, 4, 12, 8, '#c22d3a'); p(2, 4, 12, 2, '#ff8a93'); p(4, 8, 3, 3, '#5a0f17'); p(8, 8, 5, 1, '#5a0f17'); p(8, 10, 4, 1, '#5a0f17'); },
    medcard(p) { p(2, 4, 12, 8, '#e6ebf0'); p(2, 4, 12, 2, '#bfe9e2'); p(7, 7, 2, 4, '#ff4d5a'); p(6, 8, 4, 2, '#ff4d5a'); },
    coupler(p) { p(3, 5, 10, 6, '#3a4458'); p(1, 7, 2, 2, '#d9a441'); p(13, 7, 2, 2, '#d9a441'); p(5, 6, 6, 4, '#ffb347'); p(7, 7, 2, 2, '#fff2c2'); },
    compA(p) { p(2, 5, 12, 6, '#1d4a35'); p(3, 6, 2, 3, '#0b0e14'); p(6, 6, 2, 3, '#0b0e14'); p(9, 6, 2, 3, '#0b0e14'); p(2, 11, 12, 1, '#d9a441'); },
    compB(p) { p(4, 3, 8, 10, '#56636e'); p(5, 4, 6, 6, '#4aa8ff'); p(6, 5, 4, 4, '#bfe3ff'); p(2, 6, 2, 3, '#8793a3'); p(12, 6, 2, 3, '#8793a3'); },
    compC(p) { p(2, 4, 12, 8, '#2a2f5a'); p(3, 5, 10, 1, '#b78cff'); p(3, 7, 10, 1, '#b78cff'); p(3, 9, 10, 1, '#b78cff'); p(2, 12, 12, 1, '#d9a441'); },
    research(p) { p(4, 2, 8, 12, '#11161f'); p(5, 3, 6, 4, '#8793a3'); p(6, 9, 4, 3, '#ff4d5a'); p(5, 13, 6, 1, '#d9a441'); },
    record(p) { p(3, 2, 10, 12, '#e6dfc8'); p(3, 2, 10, 2, '#ff4d5a'); p(5, 6, 6, 1, '#555'); p(5, 8, 6, 1, '#555'); p(5, 10, 4, 1, '#555'); },
    loopdoc(p) { p(3, 2, 10, 12, '#d8c8a8'); p(3, 2, 10, 2, '#7a1f28'); p(5, 6, 6, 1, '#444'); p(5, 8, 6, 1, '#444'); p(5, 10, 6, 1, '#444'); p(10, 11, 3, 3, '#ff4d5a'); },
    audio(p) { p(2, 4, 12, 8, '#232836'); p(4, 6, 3, 3, '#e6ebf0'); p(9, 6, 3, 3, '#e6ebf0'); p(5, 7, 1, 1, '#000'); p(10, 7, 1, 1, '#000'); p(5, 10, 6, 1, '#b78cff'); },
    tagA(p) { p(2, 4, 8, 8, '#d8d2b8'); p(10, 5, 1, 2, '#d8d2b8'); p(10, 9, 1, 2, '#d8d2b8'); p(4, 7, 4, 1, '#333'); p(4, 9, 3, 1, '#333'); },
    tagB(p) { p(6, 4, 8, 8, '#d8d2b8'); p(5, 7, 1, 2, '#d8d2b8'); p(8, 7, 4, 1, '#333'); p(9, 9, 3, 1, '#333'); },
    rxcode(p) { p(2, 4, 12, 8, '#d8d2b8'); p(4, 6, 8, 1, '#333'); p(4, 8, 8, 2, '#ffb347'); },
    fuse(p) { p(5, 2, 6, 2, '#8793a3'); p(4, 4, 8, 8, '#e6dfc8'); p(6, 5, 1, 6, '#ffb347'); p(8, 6, 2, 4, '#ff7a1a'); p(5, 12, 6, 2, '#8793a3'); },
    cell(p) { p(5, 3, 6, 11, '#1d3a2a'); p(6, 1, 4, 2, '#9fb0bd'); p(6, 5, 4, 7, '#6dff9a'); }
  };
  const iconCache = {};
  function iconCanvas(id) {
    if (iconCache[id]) return iconCache[id];
    const cv2 = document.createElement('canvas'); cv2.width = 16; cv2.height = 16; const x = cv2.getContext('2d');
    (ICON[id] || ICON.code3042)((a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); });
    return (iconCache[id] = cv2);
  }
  G.icon = id => iconCanvas(id).toDataURL();

  /* ---------------- OBJECT SPRITES ---------------- */
  const F = k => G.S && G.S.flags[k];
  const D = {
    terminal(o, x, y, w, h, t) {
      const seed = o.x * 7 + o.y;
      r(x, y - 3, w, 11, '#2a3244'); r(x, y - 3, w, 1, '#4a5672'); r(x, y + 8, w, 8, '#161b27'); r(x + 1, y + 9, w - 2, 1, '#242b3b');
      const mx = x + (w - 22) / 2;
      r(mx, y - 20, 22, 16, '#0d1017'); r(mx + 1, y - 19, 20, 14, '#05080c');
      let a = 0.78 + 0.22 * Math.sin(t * 9 + seed); if (h2(Math.floor(t * 7), seed) < 0.07) a = 0.25;
      c.globalAlpha = a; r(mx + 2, y - 18, 18, 12, o.col || TC()); c.globalAlpha = 1;
      for (let i = 0; i < 4; i++) r(mx + 4, y - 16 + i * 2.5, 5 + ((h2(i, seed + Math.floor(t * 1.5)) * 10) | 0), 1, '#00000070');
      r(mx + 2, y - 18 + ((t * 14 + seed) % 12), 18, 1, '#ffffff30');
      r(mx + 9, y - 4, 4, 2, '#0d1017'); r(x + 5, y + 1, w - 10, 3, '#0e1218');
      for (let i = 0; i < 6; i++) r(x + 6 + i * 3, y + 2, 1, 1, '#42506d');
      r(x + w - 4, y + 11, 2, 1, Math.sin(t * 3 + seed) > 0 ? '#6dff9a' : '#1d3a2a');
    },
    desk(o, x, y, w, h) {
      r(x, y - 3, w, 11, '#2e3648'); r(x, y - 3, w, 1, '#4f5c79'); r(x, y + 8, w, 8, '#191f2d');
      r(x + 4, y - 1, 7, 5, '#c9d2d8'); r(x + 5, y, 4, 1, '#7c8894'); r(x + w - 13, y, 6, 4, '#9fb0bd'); r(x + w / 2 - 2, y - 2, 4, 4, '#4a3a2a');
      for (let i = 0; i < w / 16; i++) { r(x + 2 + i * 16, y + 10, 12, 5, '#252d3f'); r(x + 6 + i * 16, y + 12, 4, 1, '#8b98b3'); }
      if (o.id === 'lab_desk' && F('lab_key')) { r(x + 2, y + 12, 12, 7, '#2d3750'); r(x + 3, y + 13, 10, 4, '#0b0e14'); }
    },
    cabinet(o, x, y, w, h) {
      r(x, y - 20, w, 36, '#343f55'); r(x, y - 20, w, 2, '#5a6885'); r(x + 1, y - 17, w / 2 - 2, 30, '#293246'); r(x + w / 2 + 1, y - 17, w / 2 - 2, 30, '#293246');
      r(x + w / 2 - 3, y - 4, 2, 5, '#9aa7c0'); r(x + w / 2 + 1, y - 4, 2, 5, '#9aa7c0'); r(x + 4, y - 14, 8, 3, TC() + 'aa'); r(x, y + 14, w, 2, '#121722');
      if (o.id === 'lab_cab' && !F('lab_cab')) { r(x + w - 9, y - 14, 6, 7, '#0b0e14'); r(x + w - 8, y - 13, 1, 1, '#ff4d5a'); r(x + w - 6, y - 13, 1, 1, '#ffb347'); r(x + w - 8, y - 11, 4, 3, '#3a4458'); }
      if (o.openFlag && F(o.openFlag)) { r(x + w / 2 + 1, y - 17, w / 2 - 2, 30, '#080a10'); for (let i = 0; i < 3; i++) r(x + w / 2 + 1, y - 9 + i * 8, w / 2 - 2, 1, '#343f55'); r(x + w - 1, y - 18, 3, 32, '#3d4963'); }
    },
    locker(o, x, y, w, h) {
      r(x + 1, y - 20, 14, 36, '#3a4a46'); r(x + 1, y - 20, 14, 2, '#60776f'); r(x + 2, y - 17, 12, 31, '#2c3a37');
      for (let i = 0; i < 3; i++) r(x + 5, y - 14 + i * 2, 6, 1, '#131b19'); r(x + 11, y - 2, 2, 4, '#9aa7c0'); r(x + 1, y + 14, 14, 2, '#121722');
      if (F(o.id)) { r(x + 2, y - 17, 12, 31, '#080a10'); r(x + 14, y - 18, 3, 32, '#44574f'); }
    },
    filecab(o, x, y, w, h) {
      r(x, y - 14, w, 30, '#4b4739'); r(x, y - 14, w, 2, '#716b56');
      for (let i = 0; i < 3; i++) { r(x + 2, y - 10 + i * 8, w - 4, 6, '#3a372c'); r(x + w / 2 - 4, y - 8 + i * 8, 8, 1, '#b8b196'); r(x + 4, y - 9 + i * 8, 5, 2, '#d8d2b8'); }
      r(x, y + 14, w, 2, '#15130f');
    },
    pod(o, x, y, w, h, t) {
      r(x + 1, y - 6, w - 2, h + 4, '#242c40'); r(x + 1, y - 6, w - 2, 2, '#4d5c7e'); r(x + 3, y - 3, w - 6, h - 4, '#161c2b');
      r(x + 5, y - 1, w - 10, h - 12, '#0b2030');
      c.globalAlpha = 0.22 + 0.1 * Math.sin(t * 2); r(x + 6, y, w - 12, h - 14, '#3ee0c8'); c.globalAlpha = 1;
      r(x + 10, y + 5, 1, 9, '#bfeee8'); r(x + 11, y + 13, 5, 1, '#bfeee8'); r(x + 15, y + 14, 1, 8, '#bfeee8'); r(x + 16, y + 21, 4, 1, '#bfeee8');
      r(x + w - 4, y - 5, 5, h - 8, '#3b4866'); r(x + w - 3, y - 4, 1, h - 10, '#5a6b90');
      r(x + 6, y + h - 9, 20, 6, '#06080d'); r(x + 8, y + h - 7, 9, 2, '#ffb347'); r(x + 19, y + h - 7, 5, 2, Math.sin(t * 5) > 0 ? '#ff4d5a' : '#5a1820');
    },
    podrow(o, x, y, w, h, t) {
      for (let i = 0; i < w / 32; i++) {
        const px = x + i * 32;
        r(px + 3, y - 20, 26, 36, '#242c40'); r(px + 3, y - 20, 26, 2, '#4d5c7e'); r(px + 7, y - 16, 18, 24, '#081520');
        c.globalAlpha = 0.14 + 0.06 * Math.sin(t * 1.4 + i); r(px + 8, y - 15, 16, 22, o.id === 'fin_pods' ? '#b78cff' : '#ff7a5a'); c.globalAlpha = 1;
        if (o.id === 'fin_pods') { r(px + 13, y - 12, 6, 6, '#1a1420'); r(px + 12, y - 6, 8, 12, '#1a1420'); }
        r(px + 9, y - 14, 3, 8, '#ffffff14'); r(px + 9, y + 10, 14, 3, '#06080d'); r(px + 11, y + 11, 6, 1, '#ffb347'); r(px + 3, y + 14, 26, 2, '#10141f');
      }
    },
    bench(o, x, y, w, h) {
      r(x, y - 5, w, h - 3, '#39445a'); r(x, y - 5, w, 1, '#5d6c8c'); r(x, y + h - 8, w, 8, '#1a2030'); r(x + 2, y + h - 6, 2, 6, '#0f131c'); r(x + w - 4, y + h - 6, 2, 6, '#0f131c');
      const cols = ['#7fd8c8', '#ffb347', '#b78cff', '#8fb0b6'];
      for (let i = 0; i < w / 12; i++) { const n = h2(o.x + i, o.y); const bx = x + 5 + i * 12; if (n < 0.75) { r(bx, y - 10, 3, 7, cols[i % 4] + '77'); r(bx, y - 11, 3, 1, '#dfe9ee'); r(bx, y - 5, 3, 2, cols[i % 4]); } else { r(bx, y - 2, 5, 1, '#dfe9ee88'); r(bx + 2, y, 2, 1, '#dfe9ee66'); } }
    },
    crate(o, x, y, w, h) {
      r(x, y - 8, w, h + 8, '#4b4030'); r(x, y - 8, w, 2, '#74634a'); r(x, y + h - 14, w, 14, '#392f23');
      r(x + w / 2 - 1, y - 6, 2, h - 8, '#3a3124'); for (let i = 0; i < 3; i++) r(x + 2, y + h - 12 + i * 4, w - 4, 1, '#2a231a'); r(x + w / 2 - 5, y + h - 10, 10, 6, '#00000045');
      if (F(o.id)) { r(x + 3, y - 6, w - 6, h - 12, '#0b0906'); r(x - 2, y - 10, w - 6, 3, '#74634a'); }
    },
    board(o, x, y, w, h) {
      r(x + 1, y + 1, w - 2, 12, '#7f8b9b'); r(x + 2, y + 2, w - 4, 10, '#d5dde4');
      r(x + 5, y + 4, Math.min(14, w - 10), 1, '#2a4a8a'); r(x + 5, y + 7, Math.min(9, w - 12), 1, '#aa3333'); if (w > 34) { r(x + 24, y + 5, 12, 1, '#2a4a8a'); r(x + 26, y + 8, 6, 2, '#333'); }
    },
    rack(o, x, y, w, h, t) {
      r(x, y - 16, w, h + 16, '#10152a'); r(x, y - 16, w, 2, '#33407a'); r(x + 2, y - 13, w - 4, h + 11, '#090d1b');
      for (let i = 0; i < 10; i++) {
        const yy = y - 11 + i * 5.6; r(x + 4, yy, w - 8, 3, '#161d38');
        for (let k = 0; k < 4; k++) { const on = o.id === 'srv_rack5' ? false : h2(i * 5 + k + o.x, Math.floor(t * (1.5 + k))) > 0.45; r(x + 5 + k * 4, yy + 1, 2, 1, on ? (k === 0 ? '#6dff9a' : '#4aa8ff') : '#12203a'); }
      }
      if (o.loose) { if (F('srv_b')) r(x + 6, y + h - 16, 16, 9, '#000'); else { r(x + 6, y + h - 16, 16, 9, '#1b2444'); r(x + 5, y + h - 15, 1, 8, '#4aa8ff88'); } }
      r(x, y + h - 2, w, 2, '#05070f');
    },
    srvcore(o, x, y, w, h, t) {
      r(x, y - 22, w, h + 22, '#151b33'); r(x, y - 22, w, 2, '#3b4a8a'); r(x + 2, y - 19, w - 4, h + 15, '#0c1022');
      const inst = F('srv_installed');
      for (let i = 0; i < 3; i++) {
        const sx = x + 9 + i * 28; r(sx, y - 14, 22, 36, '#05070f');
        if (inst) { r(sx + 2, y - 12, 18, 32, '#172f58'); for (let k = 0; k < 6; k++) r(sx + 4, y - 9 + k * 5, 14, 2, h2(i * 9 + k, Math.floor(t * 6)) > 0.4 ? '#4aa8ff' : '#1d3a6b'); }
        else { r(sx, y - 14, 22, 1, '#ff4d5a'); r(sx, y + 21, 22, 1, '#ff4d5a'); r(sx + 9, y + 2, 4, 4, Math.sin(t * 4) > 0 ? '#ff4d5a' : '#3a1016'); }
      }
      r(x + 4, y + h - 8, w - 8, 4, '#090c18'); r(x + 6, y + h - 7, (w - 12) * (inst ? 1 : 0.15), 2, inst ? '#6dff9a' : '#ff4d5a'); r(x, y + h - 2, w, 2, '#05070f');
    },
    shelf(o, x, y, w, h) {
      r(x, y - 20, w, 36, '#2c3448'); r(x, y - 20, w, 2, '#4f5c79'); r(x + 2, y - 17, w - 4, 31, '#10141f');
      for (let i = 0; i < 3; i++) { r(x + 2, y - 9 + i * 9, w - 4, 2, '#3a4458'); r(x + 4 + i * 5, y - 15 + i * 9, 7, 6, ['#5a4a3a', '#3a5a55', '#4a3a5a'][i]); r(x + 16 + i * 3, y - 13 + i * 9, 5, 4, '#56636e'); }
    },
    note(o, x, y) { r(x + 5, y + 4, 8, 9, '#00000040'); r(x + 4, y + 3, 8, 9, '#e3dcbd'); r(x + 5, y + 5, 5, 1, '#555'); r(x + 5, y + 7, 6, 1, '#555'); r(x + 5, y + 9, 4, 1, '#555'); },
    battery(o, x, y, w, h, t) { r(x + 5, y + 11, 7, 3, '#00000050'); r(x + 5, y + 2, 6, 11, '#1d3a2a'); r(x + 6, y, 4, 2, '#9fb0bd'); c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); r(x + 6, y + 4, 4, 7, '#6dff9a'); c.globalAlpha = 1; },
    generator(o, x, y, w, h, t) {
      const ok = F('sec_gen');
      r(x, y - 10, w, h + 10, '#3a403a'); r(x, y - 10, w, 2, '#626b62'); r(x + 4, y - 6, 18, 16, '#1f231f');
      for (let i = 0; i < 5; i++) r(x + 6, y - 4 + i * 3, 14, 1, '#3a403a');
      r(x + 26, y - 6, 18, 10, '#161916'); r(x + 29, y - 3, 6, 4, ok ? '#6dff9a' : (Math.sin(t * 6) > 0 ? '#ff4d5a' : '#4a161b')); r(x + 38, y - 3, 3, 3, '#ffb347');
      r(x, y + h - 10, w, 10, '#252925'); for (let i = 0; i < w; i += 8) r(x + i, y + h - 4, 4, 2, '#ffb34790'); r(x + w - 6, y - 16, 4, 8, '#56636e');
      if (!ok && Math.random() < 0.05) G.FX.spawn(x + 30 + Math.random() * 10, y - 4, 2, '#ffe9a8', 30);
    },
    camera(o, x, y, w, h, t) {
      r(x + 4, y + 3, 8, 5, '#1a1e27'); r(x + 6, y + 8, 4, 3, '#2a303d'); r(x + 7, y + 10, 2, 1, '#0b0e14');
      const sr = G.S && G.S.securityRestored; r(x + 10, y + 4, 1, 1, sr === true ? (Math.sin(t * 5) > 0 ? '#ff4d5a' : '#5a1820') : '#2a1014');
    },
    bed(o, x, y, w, h) {
      r(x, y - 3, w, h + 3, '#56636e'); r(x, y - 3, w, 2, '#7b8b98'); r(x + 2, y, w - 4, h - 4, '#c5d2d6'); r(x + 6, y + 2, w - 12, 9, '#eef4f5'); r(x + 7, y + 9, w - 14, 1, '#b3c2c7');
      r(x + 2, y + 18, w - 4, h - 24, '#6f8f96'); r(x + 2, y + 18, w - 4, 3, '#8fb0b6');
      if (o.bay === 'C') { r(x + 8, y + 24, 16, 14, '#638187'); }
      r(x, y + h - 4, w, 4, '#3d4850'); r(x + w - 9, y + h - 3, 7, 2, '#ffb347');
    },
    monitor(o, x, y, w, h, t) {
      r(x + 7, y + 1, 2, 12, '#56636e'); r(x + 3, y + 12, 10, 3, '#3d4850'); r(x, y - 13, 16, 13, '#0b0e14'); r(x + 1, y - 12, 14, 11, '#06140f');
      if (h2(Math.floor(t * 9), o.x) > 0.2) for (let i = 0; i < 12; i++) r(x + 2 + i, y - 7 + Math.round(Math.sin(i * 1.3 + t * 3) * (i % 4 === 0 ? 3 : 1)), 1, 1, '#6dff9a');
      r(x + 4, y - 11, 1, 3, '#dfe9ee'); r(x + 5, y - 8, 1, 2, '#dfe9ee'); r(x + 6, y - 6, 3, 1, '#dfe9ee'); r(x + 9, y - 5, 1, 3, '#dfe9ee');
    },
    cart(o, x, y) { r(x + 1, y - 4, 14, 16, '#8a979f'); r(x + 1, y - 4, 14, 1, '#c5d2d6'); r(x + 3, y - 2, 4, 2, '#dfe9ee'); r(x + 9, y - 2, 4, 3, '#56636e'); r(x + 1, y + 5, 14, 1, '#56636e'); r(x + 2, y + 12, 2, 2, '#0b0e14'); r(x + 12, y + 12, 2, 2, '#0b0e14'); },
    tank(o, x, y, w, h) {
      r(x + 3, y - 24, w - 6, 40, '#54463a'); r(x + 3, y - 24, w - 6, 2, '#8a745e'); r(x + 5, y - 22, 3, 36, '#75634f'); r(x + w - 8, y - 22, 3, 36, '#3b3028');
      r(x + 3, y - 10, w - 6, 2, '#2c231c'); r(x + 3, y + 4, w - 6, 2, '#2c231c'); r(x + w / 2 - 3, y - 6, 6, 5, '#0b0e14'); r(x + w / 2 - 2, y - 3, 2, 1, '#ff4d5a'); r(x + 3, y + 14, w - 6, 2, '#0d0a08');
    },
    reactor(o, x, y, w, h, t) {
      const on = F('rx_power');
      r(x + 8, y - 12, w - 16, h + 12, '#2c2622'); r(x, y + 4, w, h - 14, '#2c2622'); r(x + 8, y - 12, w - 16, 2, '#6a5847'); r(x, y + 4, 8, 2, '#6a5847'); r(x + w - 8, y + 4, 8, 2, '#6a5847');
      r(x + 4, y + h - 12, w - 8, 10, '#1a1613'); for (let i = 0; i < w - 8; i += 8) r(x + 4 + i, y + h - 6, 4, 2, '#ffb34790');
      const cx = x + w / 2, cy = y + 24, p = on ? 0.85 + 0.15 * Math.sin(t * 7) : 0.3 + 0.1 * Math.sin(t * 1.5);
      c.fillStyle = '#0d0a08'; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.fill();
      const gr = c.createRadialGradient(cx, cy, 2, cx, cy, 27); gr.addColorStop(0, `rgba(255,244,214,${p})`); gr.addColorStop(0.4, `rgba(255,179,71,${p * 0.9})`); gr.addColorStop(1, 'rgba(120,40,10,0.15)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, 27, 0, 7); c.fill();
      c.strokeStyle = '#6a5847'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.stroke();
      for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * (on ? 0.8 : 0.15); r(cx + Math.cos(a) * 19 - 2, cy + Math.sin(a) * 19 - 2, 4, 4, '#1a1613'); }
      r(x + 2, y + 18, 6, 22, '#54463a'); r(x + w - 8, y + 18, 6, 22, '#54463a');
    },
    panel(o, x, y, w, h, t) {
      r(x, y - 7, w, 15, '#3a3f4d'); r(x, y - 7, w, 1, '#646c82'); r(x, y + 8, w, 8, '#191c25'); r(x + w / 2 - 9, y - 5, 18, 8, '#06080d'); c.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5 + o.x); r(x + w / 2 - 8, y - 4, 16, 6, o.col || '#3ee0c8'); c.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { r(x + 3 + i * 4, y - 3, 2, 2, h2(i + o.x, Math.floor(t * 2)) > 0.5 ? '#ff4d5a' : '#ffb347'); r(x + w - 5 - i * 4, y + 2, 2, 2, h2(i + o.x + 9, Math.floor(t * 3)) > 0.5 ? '#6dff9a' : '#1d3a2a'); }
      for (let i = 0; i < w; i += 8) r(x + i, y + 13, 4, 2, '#ffb34770');
    },
    valve(o, x, y, w, h, t) {
      r(x + 3, y - 18, 10, 34, '#5a4a3a'); r(x + 4, y - 18, 2, 34, '#7d6955'); r(x + 2, y - 8, 12, 3, '#3b3028'); r(x + 2, y + 8, 12, 3, '#3b3028');
      r(x + 6, y - 3, 10, 10, '#a82f38'); r(x + 8, y - 1, 6, 6, '#5a4a3a'); r(x + 10, y - 3, 2, 10, '#a82f38'); r(x + 6, y + 1, 10, 2, '#a82f38');
      if (!F('rx_tagA')) r(x + 14, y + 7 + Math.round(Math.sin(t * 2)), 5, 6, '#e3dcbd');
    },
    hatch(o, x, y, w, h, t) {
      const open = F('srv_hatch');
      r(x + 1, y + 1, 30, 30, '#0b0e14'); r(x + 2, y + 2, 28, 28, open ? '#020305' : '#252b3a');
      if (open) { r(x + 9, y + 2, 2, 28, '#56636e'); r(x + 21, y + 2, 2, 28, '#56636e'); for (let i = 0; i < 5; i++) r(x + 9, y + 5 + i * 6, 14, 1, '#56636e'); }
      else { r(x + 2, y + 2, 28, 1, '#465270'); for (let i = 0; i < 4; i++) r(x + 4 + (i % 2) * 22, y + 4 + (i > 1 ? 22 : 0), 2, 2, '#6b7896'); r(x + 10, y + 14, 10, 3, '#0b0e14'); for (let i = 0; i < 28; i += 8) r(x + 2 + i, y + 27, 4, 2, '#ffb34780'); }
      r(x + 23, y + 5, 5, 6, '#06080d'); r(x + 24, y + 6, 1, 1, open ? '#6dff9a' : (Math.sin(t * 4) > 0 ? '#ff4d5a' : '#4a161b'));
    },
    ladder(o, x, y) { r(x, y, 16, 32, '#0b0806'); r(x + 3, y, 2, 32, '#74634a'); r(x + 11, y, 2, 32, '#74634a'); for (let i = 0; i < 6; i++) r(x + 3, y + 3 + i * 5, 10, 1, '#74634a'); c.globalAlpha = 0.25; r(x + 4, y, 8, 32, '#4aa8ff'); c.globalAlpha = 1; },
    ecore(o, x, y, w, h, t) {
      r(x + 10, y + 6, w - 20, h - 6, '#1d1838'); r(x + 10, y + 6, w - 20, 2, '#4a3f8a'); r(x, y + h - 14, w, 14, '#141029'); r(x, y + h - 14, w, 1, '#3a3270');
      for (let i = 0; i < w; i += 8) r(x + i + 1, y + h - 5, 4, 2, '#b78cff66');
      const cx = x + w / 2, cy = y + 2, P = G.P || { x: cx, y: cy + 60 };
      const dx = P.x - cx, dy = P.y - cy, dl = Math.hypot(dx, dy) || 1, pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
      c.fillStyle = '#07050f'; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.fill();
      c.strokeStyle = `rgba(183,140,255,${pulse})`; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 27, t * 0.4, t * 0.4 + 5.2); c.stroke();
      c.strokeStyle = 'rgba(233,220,255,.5)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, 21, -t * 0.7, -t * 0.7 + 4.2); c.stroke();
      const ex = cx + dx / dl * 7, ey = cy + dy / dl * 7;
      const gr = c.createRadialGradient(ex, ey, 1, ex, ey, 13); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#d9c2ff'); gr.addColorStop(1, 'rgba(120,70,220,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(ex, ey, 13, 0, 7); c.fill();
      c.fillStyle = '#1a0f33'; c.beginPath(); c.arc(ex + dx / dl * 2, ey + dy / dl * 2, 3.5, 0, 7); c.fill();
    },
    uplink(o, x, y, w, h, t) {
      const on = G.S && G.S.reactorPowerChoice === 'comms';
      r(x, y - 4, w, 12, '#2c3448'); r(x, y - 4, w, 1, '#4f5c79'); r(x, y + 8, w, 8, '#171c28'); r(x + w / 2 - 1, y - 22, 2, 18, '#8793a3');
      r(x + w / 2 - 12, y - 26, 24, 3, '#c9d2d8'); r(x + w / 2 - 9, y - 23, 18, 2, '#8793a3'); r(x + w / 2 - 5, y - 21, 10, 2, '#56636e'); r(x + w / 2 - 1, y - 30, 2, 4, '#ff4d5a');
      r(x + 4, y - 1, 12, 5, '#06080d'); r(x + 5, y, 10 * (on ? (0.3 + 0.2 * Math.sin(t * 3)) : 0.05) + 1, 3, on ? '#6dff9a' : '#ff4d5a'); r(x + w - 8, y, 3, 3, on && Math.sin(t * 6) > 0 ? '#6dff9a' : '#1d3a2a');
    },
    breaker(o, x, y, w, h, t) { r(x + 2, y - 20, 12, 36, '#3a2f4d'); r(x + 2, y - 20, 12, 2, '#6a5a8a'); r(x + 4, y - 16, 8, 20, '#0b0812'); r(x + 6, y - 14, 4, 10, '#ff4d5a'); r(x + 5, y - 15, 6, 3, '#ffb3b8'); r(x + 5, y + 7, 6, 3, Math.sin(t * 3) > 0 ? '#ffb347' : '#5a3a10'); },
    scuff(o, x, y, w, h, t) { for (let i = 0; i < 5; i++) { const fx = x + 2 + i * 6, fy = y + 3 + (i % 2) * 6; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3 + i); r(fx, fy, 3, 5, '#3ee0c8'); r(fx, fy + 6, 3, 2, '#3ee0c8'); c.globalAlpha = 1; } },
    door(o, x, y, w, h, t) {
      if (o.dir === 's') { r(x - 2, y, 2, T, '#465270'); r(x + w, y, 2, T, '#465270'); r(x, y, w, 2, TC() + '66'); for (let i = 0; i < 3; i++) { c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 3 - i); r(x + w / 2 - 4 + i, y + 4 + i * 3, 8 - i * 2, 1, TC()); } c.globalAlpha = 1; return; }
      const a = o.anim || 0;
      r(x - 3, y - 12, w + 6, 28, '#0a0d14'); r(x, y - 10, w, 26, '#020305');
      if (a > 0) { c.globalAlpha = 0.22 * a; r(x + 2, y - 8, w - 4, 24, TC()); c.globalAlpha = 1; }
      const pw = Math.round((w / 2) * (1 - a));
      if (pw > 0) {
        r(x, y - 10, pw, 26, '#3d4963'); r(x + w - pw, y - 10, pw, 26, '#3d4963'); r(x, y - 10, pw, 1, '#62719a'); r(x + w - pw, y - 10, pw, 1, '#62719a');
        if (pw > 4) { r(x + pw - 2, y - 10, 2, 26, '#222a3e'); r(x + w - pw, y - 10, 2, 26, '#222a3e'); r(x + 2, y - 1, pw - 4, 3, '#ffb347aa'); r(x + w - pw + 2, y - 1, pw - 4, 3, '#ffb347aa'); r(x + 3, y + 8, pw - 6, 1, '#222a3e'); r(x + w - pw + 3, y + 8, pw - 6, 1, '#222a3e'); }
      }
      r(x - 3, y - 15, w + 6, 4, '#55637f'); r(x - 3, y - 12, 3, 28, '#465270'); r(x + w, y - 12, 3, 28, '#465270');
      r(x + w / 2 - 3, y - 14, 6, 2, F('open_' + o.id) ? '#6dff9a' : (Math.sin(t * 4) > 0 ? '#ff4d5a' : '#6a1a22'));
    }
  };
  const GLOW = { terminal: [44, null, 0.75], rack: [30, '#4aa8ff', 0.4], srvcore: [70, '#4aa8ff', 0.7], battery: [22, '#6dff9a', 0.7], pod: [40, '#3ee0c8', 0.5], podrow: [60, '#ff7a5a', 0.4], monitor: [26, '#6dff9a', 0.6], reactor: [120, '#ffb347', 0.9], ecore: [120, '#b78cff', 0.95], panel: [34, '#ffb347', 0.6], door: [30, null, 0.5], hatch: [20, '#ff4d5a', 0.3], ladder: [36, '#4aa8ff', 0.6], uplink: [30, '#6dff9a', 0.4], scuff: [26, '#3ee0c8', 0.5] };
  const TALL = { terminal: 22, cabinet: 22, locker: 22, pod: 8, podrow: 22, rack: 18, srvcore: 24, shelf: 22, tank: 26, reactor: 14, ecore: 30, uplink: 30, breaker: 22, filecab: 16, monitor: 15, door: 16, crate: 10, bench: 12, generator: 12, valve: 20, bed: 5, panel: 9 };

  /* ---------------- FX ---------------- */
  const FX = G.FX = {
    parts: [], picks: [], ring: null, flash: 0,
    spawn(x, y, n, col, spd) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = (spd || 40) * (0.3 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.3 + Math.random() * 0.5, col }); } },
    pickup(id, from) { const P = G.P; if (!P) return; const x = from && from.r ? from.r[0] + from.r[2] / 2 : P.x, y = from && from.r ? from.r[1] : P.y - 20; this.picks.push({ id, x, y, t: 0 }); this.spawn(x, y, 10, '#fff2c2', 50); },
    scan(x, y) { this.ring = { x, y, t: 0 }; }
  };

  /* ---------------- FRAME ---------------- */
  function hole(x, y, rad, a) {
    if (x < -rad || y < -rad || x > G.W + rad || y > G.H + rad) return;
    const g = l.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const blooms = [];
  function bloom(x, y, rad, col, a) { blooms.push([x, y, rad, col, a]); }

  function drawPlayer(P, t) {
    if (!alex) makeAlex();
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(P.x, P.y - 1, 7, 3, 0, 0, 7); c.fill();
    if (P.lying) { c.save(); c.translate(P.x, P.y - 6); c.rotate(-Math.PI / 2); c.drawImage(alex, 0, 0, 16, 24, -8, -12, 16, 24); c.restore(); return; }
    if (P.inv > 0 && Math.floor(t * 20) % 2) return;
    const row = (P.run && P.moving ? 4 : 0) + P.dir, f = P.moving ? Math.floor(P.animT) % 4 : 0;
    c.drawImage(alex, f * 16, row * 24, 16, 24, Math.round(P.x - 8), Math.round(P.y - 23), 16, 24);
  }

  function frame(dt) {
    const R = G.R; if (!R) return;
    const P = G.P, cam = G.cam, t = G.t, th = TH[R.def.theme];
    c = main; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = '#030408'; c.fillRect(0, 0, G.W, G.H);
    if (G.mode === 'ending') { G.Ending.draw(c, t); return; }

    const tx = R.W <= G.W ? (R.W - G.W) / 2 : Math.max(0, Math.min(R.W - G.W, P.x - G.W / 2));
    const ty = R.H <= G.H ? (R.H - G.H) / 2 : Math.max(0, Math.min(R.H - G.H, P.y - G.H / 2 - 10));
    if (cam.snap) { cam.x = tx; cam.y = ty; cam.snap = false; } else { cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 8); }
    let sx = 0, sy = 0; if (cam.shake > 0) { sx = (Math.random() - 0.5) * cam.shake * 8; sy = (Math.random() - 0.5) * cam.shake * 8; cam.shake = Math.max(0, cam.shake - dt * 2.5); }
    const ox = Math.round(-cam.x + sx), oy = Math.round(-cam.y + sy);
    c.translate(ox, oy);
    c.drawImage(R.bg, 0, 0);

    // hazard floor plates & rails
    R.hazards.forEach(z => {
      if (z.k === 'zone') {
        const x = z.x * T, y = z.y * T, w = z.w * T, h = z.h * T;
        r(x, y, w, h, z.on ? '#9fe8ff30' : (z.warn ? '#ffb34722' : '#00000030'));
        for (let i = 0; i < h; i += 8) { r(x, y + i, 2, 4, '#ffb347'); r(x + w - 2, y + i, 2, 4, '#ffb347'); }
        if (z.on) { c.strokeStyle = '#dff6ff'; c.lineWidth = 1; for (let k = 0; k < 5; k++) { c.beginPath(); let yy = y + Math.random() * h; c.moveTo(x, yy); for (let i = 1; i <= 4; i++) c.lineTo(x + w * i / 4, yy + (Math.random() - 0.5) * 22); c.stroke(); } }
      } else {
        const pts = z.loop || [[z.x1, z.y1], [z.x2, z.y2]];
        for (let i = 0; i < pts.length - (z.loop ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.hypot(b[0] - a[0], b[1] - a[1]) * 2; for (let k = 0; k <= n; k++) r(a[0] * T + (b[0] - a[0]) * T * k / n - 1, a[1] * T + (b[1] - a[1]) * T * k / n - 1, 2, 2, '#ffb34740'); }
      }
    });

    const list = [];
    R.objs.forEach(o => {
      if (o.scan && !F('scan_' + o.id)) return;
      if (o.type === 'battery' && F(o.id)) return;
      if (o.type === 'door' && o.dir !== 's') { const want = F('open_' + o.id) ? 1 : 0; if (o.anim < want) o.anim = Math.min(1, o.anim + dt * 1.8); }
      if (o.flat || (o.type === 'door' && o.dir === 's')) D[o.type](o, o.r[0], o.r[1], o.r[2], o.r[3], t);
      else list.push(o);
    });
    if (P && G.mode !== 'menu' || P && P.lying) list.push(P);
    R.hazards.forEach(z => { if (z.k === 'arc') list.push(z); });
    list.sort((a, b) => (a.r ? a.r[1] + a.r[3] : a.k ? a.py + 4 : a.y) - (b.r ? b.r[1] + b.r[3] : b.k ? b.py + 4 : b.y));
    list.forEach(o => {
      if (o === P) return drawPlayer(P, t);
      if (o.k === 'arc') {
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(o.px, o.py + 4, 7, 3, 0, 0, 7); c.fill();
        c.strokeStyle = '#dff6ff'; c.lineWidth = 1;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(o.px, o.py - 6); for (let i = 0; i < 3; i++) c.lineTo(o.px + (Math.random() - 0.5) * 18, o.py - 6 + (Math.random() - 0.5) * 18); c.stroke(); }
        r(o.px - 3, o.py - 9, 6, 6, '#9fe8ff'); r(o.px - 2, o.py - 8, 4, 4, '#ffffff'); return;
      }
      if (!o.flat && o.solid) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(o.r[0] + 1, o.r[1] + o.r[3] - 1, o.r[2] - 2, 3); }
      D[o.type](o, o.r[0], o.r[1], o.r[2], o.r[3], t);
    });

    // dust in the light
    R.dust.forEach(d => { d.x += d.vx * dt; d.y += d.vy * dt; if (d.y < 0) { d.y = R.H; d.x = Math.random() * R.W; } c.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + d.s * 9); r(d.x, d.y, 1, 1, '#cfe6ee'); }); c.globalAlpha = 1;

    /* ----- lighting pass ----- */
    c.setTransform(1, 0, 0, 1, 0, 0);
    blooms.length = 0;
    let dark = th.dark; if (R.id === 'reactor' && F('rx_power')) dark -= 0.2; if (G.mode === 'menu') dark = 0.5;
    l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, G.W, G.H); l.fillStyle = `rgba(3,4,10,${dark})`; l.fillRect(0, 0, G.W, G.H);
    l.globalCompositeOperation = 'destination-out';
    (R.def.lights || []).forEach((L, i) => {
      let k = 1; if (L.k === 'em') { k = 0.6 + 0.4 * Math.sin(t * 3 + i * 2); if (h2(Math.floor(t * 9), i) < 0.1) k = 0.12; } else if (L.k === 'pulse') k = 0.7 + 0.3 * Math.sin(t * 1.6 + i);
      const x = L.x * T + ox, y = L.y * T + oy; hole(x, y, L.r, 0.8 * k); bloom(x, y, L.r * 0.9, L.col, 0.2 * k);
    });
    R.objs.forEach(o => {
      const g = GLOW[o.type]; if (!g) return; if (o.scan && !F('scan_' + o.id)) return; if (o.type === 'battery' && F(o.id)) return; if (o.type === 'door' && o.dir === 's') return;
      const x = o.r[0] + o.r[2] / 2 + ox, y = o.r[1] + o.r[3] / 2 - (TALL[o.type] || 0) / 2 + oy;
      let col = g[1] || o.col || th.trim, a = g[2], rad = g[0];
      if (o.type === 'reactor' && F('rx_power')) { rad = 200; }
      if (o.type === 'door') col = F('open_' + o.id) ? '#6dff9a' : '#ff4d5a';
      hole(x, y, rad, a); bloom(x, y, rad * 0.8, col, 0.16 * a);
    });
    R.hazards.forEach(z => { if (z.k === 'arc') { hole(z.px + ox, z.py + oy, 40, 0.9); bloom(z.px + ox, z.py + oy, 34, '#9fe8ff', 0.35); } else if (z.on) { const x = (z.x + z.w / 2) * T + ox; for (let i = 0; i < z.h; i += 4) { hole(x, (z.y + i + 2) * T + oy, 50, 0.6); bloom(x, (z.y + i + 2) * T + oy, 44, '#9fe8ff', 0.14); } } });
    if (P && (G.mode !== 'menu')) {
      const px = P.x + ox, py = P.y - 10 + oy;
      hole(px, py, 78, 0.82); bloom(px, py, 20, '#3ee0c8', 0.1);
      if (G.S.flashlight) {
        l.save(); l.translate(px, py); l.rotate(P.ang);
        const g = l.createRadialGradient(0, 0, 4, 0, 0, 190); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g; l.beginPath(); l.moveTo(0, 0); l.arc(0, 0, 190, -0.48, 0.48); l.closePath(); l.fill(); l.restore();
      }
    }
    c.drawImage(lc, 0, 0);
    c.globalCompositeOperation = 'lighter';
    blooms.forEach(b => { const g = c.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]); g.addColorStop(0, hexA(b[3], b[4])); g.addColorStop(1, hexA(b[3], 0)); c.fillStyle = g; c.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2); });
    if (P && G.S && G.S.flashlight && G.mode !== 'menu') {
      c.save(); c.translate(P.x + ox, P.y - 10 + oy); c.rotate(P.ang);
      const g = c.createRadialGradient(0, 0, 4, 0, 0, 180); g.addColorStop(0, 'rgba(255,240,200,.16)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 180, -0.46, 0.46); c.closePath(); c.fill(); c.restore();
    }
    c.globalCompositeOperation = 'source-over';

    /* ----- bright FX on top of the darkness ----- */
    c.translate(ox, oy);
    FX.parts = FX.parts.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; if (p.life > 0) { c.globalAlpha = Math.min(1, p.life * 3); r(p.x, p.y, 2, 2, p.col); } return p.life > 0; }); c.globalAlpha = 1;
    FX.picks = FX.picks.filter(p => { p.t += dt; const k = Math.min(1, p.t / 0.9), y = p.y - 14 - k * 22, s = 16 + Math.sin(k * Math.PI) * 10; c.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1; c.drawImage(iconCanvas(p.id), Math.round(p.x - s / 2), Math.round(y - s / 2), s, s); c.globalAlpha = 1; return p.t < 0.9; });
    if (FX.ring) { const q = FX.ring; q.t += dt; c.strokeStyle = `rgba(62,224,200,${1 - q.t / 1.1})`; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y - 8, q.t * 190, 0, 7); c.stroke(); if (q.t > 1.1) FX.ring = null; }
    R.objs.forEach(o => { const until = R.spark[o.id]; if (!until || until < t) return; const cx = o.r[0] + o.r[2] / 2, cy = o.r[1] - (TALL[o.type] || 0) / 2 + o.r[3] / 2; for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; r(cx + Math.cos(a) * 12 - 1, cy + Math.sin(a) * 9 - 1, 2, 2, '#fff2c2'); } c.strokeStyle = 'rgba(62,224,200,.7)'; c.lineWidth = 1; c.strokeRect(o.r[0] - 1.5, o.r[1] - (o.flat ? 0 : (TALL[o.type] || 0)) - 1.5, o.r[2] + 3, o.r[3] + (o.flat ? 0 : (TALL[o.type] || 0)) + 3); });
    const tg = G.target;
    if (tg && G.mode === 'play' && !G.overlay) { const cx = tg.r[0] + tg.r[2] / 2, cy = tg.r[1] - (tg.flat ? 4 : (TALL[tg.type] || 6) + 8) + Math.sin(t * 5) * 2; r(cx - 3, cy, 7, 2, '#fff2c2'); r(cx - 2, cy + 2, 5, 2, '#fff2c2'); r(cx - 1, cy + 4, 3, 1, '#fff2c2'); r(cx, cy + 5, 1, 1, '#fff2c2'); }
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (FX.flash > 0) { c.fillStyle = `rgba(255,60,70,${FX.flash * 0.45})`; c.fillRect(0, 0, G.W, G.H); FX.flash = Math.max(0, FX.flash - dt * 2.5); }
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

  G.cam = { x: 0, y: 0, shake: 0, snap: true };
  G.Render = { build, frame, TH, TALL, alexSheet() { if (!alex) makeAlex(); return alex; } };
})();
