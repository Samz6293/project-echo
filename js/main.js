/* ============================================================
   GAME ENGINE — main loop, input, player controller,
   collision detection, interaction, hazards, room travel
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, T = 16, UI = G.UI;
  const $ = id => document.getElementById(id);

  /* ---------------- INPUT ---------------- */
  const keys = {};
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    keys[e.code] = true; if (e.repeat) return;
    G.Audio.init(); onKey(e.code, e);
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => { keys[k] = false; }); });
  window.addEventListener('pointerdown', () => G.Audio.init());

  function onKey(code, e) {
    const ov = G.overlay;
    if (ov === 'dialog') return G.Dlg.key(code);
    if (ov === 'terminal') { if (code === 'Escape') G.Term.close(); else G.Term.key(code, e); return; }
    if (ov === 'keypad') return G.Keypad.key(code);
    if (ov === 'inventory') { if (code === 'KeyI' || code === 'Escape' || code === 'Tab') G.Inv.close(); return; }
    if (ov === 'pause') { if (code === 'Escape') UI.resume(); return; }
    if (ov === 'settings' || ov === 'credits') { if (code === 'Escape') UI.back(); return; }
    if (ov === 'ending') { if (code === 'KeyE' || code === 'Space' || code === 'Enter') G.Ending.next(); return; }
    if (ov || G.mode !== 'play' || G.busy || G.P.lying) return;
    switch (code) {
      case 'KeyE': case 'Enter': interact(); break;
      case 'KeyF': toggleLight(); break;
      case 'KeyI': case 'Tab': G.Inv.open(); break;
      case 'KeyR': scan(); break;
      case 'Escape': UI.pause(); break;
    }
  }

  /* ---------------- PLAYER CONTROLLER ---------------- */
  const newP = () => ({ x: 0, y: 0, dir: 0, animT: 0, moving: false, run: false, inv: 0, ang: Math.PI / 2, lying: false });
  const ANG = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];

  /* ---------------- COLLISION DETECTION ---------------- */
  const isSolid = o => o.type === 'door' ? (o.dir !== 's' && !G.f('open_' + o.id)) : (!!o.solid && !(o.scan && !G.f('scan_' + o.id)));
  function blocked(x, y) {
    const R = G.R, x0 = x - 5, y0 = y - 7, w = 10, h = 7;
    for (let ty = Math.floor(y0 / T); ty <= Math.floor((y0 + h - 1) / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor((x0 + w - 1) / T); tx++) {
      const row = R.tiles[ty], v = row ? row[tx] : 0; if (!v || v === 2) return true;
    }
    for (const o of R.objs) { if (!isSolid(o)) continue; const r = o.r; if (x0 < r[0] + r[2] && x0 + w > r[0] && y0 < r[1] + r[3] && y0 + h > r[1]) return true; }
    return false;
  }
  G.blocked = blocked;

  function updatePlayer(dt) {
    const P = G.P, S = G.S;
    if (P.inv > 0) P.inv -= dt;
    if (P.lying) return;
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    let dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    P.run = !!(keys.ShiftLeft || keys.ShiftRight); P.moving = !!(dx || dy);
    if (P.moving) {
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      const sp = P.run ? 124 : 74, nx = P.x + dx * sp * dt, ny = P.y + dy * sp * dt;
      let moved = false;
      if (dx && !blocked(nx, P.y)) { P.x = nx; moved = true; }
      if (dy && !blocked(P.x, ny)) { P.y = ny; moved = true; }
      if (Math.abs(dx) > Math.abs(dy)) P.dir = dx < 0 ? 2 : 3; else P.dir = dy < 0 ? 1 : 0;
      P.animT += dt * (P.run ? 13 : 8);
      if (moved) { G.Audio.step(P.run); if (P.run && Math.random() < 0.3) G.FX.parts.push({ x: P.x, y: P.y, vx: -dx * 12, vy: -dy * 12 - 8, life: 0.3, col: '#8fa3b3' }); }
      else P.moving = false;
    } else P.animT = 0;
    // smooth flashlight angle
    let da = ANG[P.dir] - P.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; P.ang += da * Math.min(1, dt * 12);
    if (S.flashlight) {
      S.playerEnergy -= dt * 0.35;
      if (S.playerEnergy <= 3) { S.playerEnergy = Math.max(S.playerEnergy, 3); S.flashlight = false; UI.toast('Flashlight disabled — reserve power only', 'spend'); G.Audio.sfx('light'); }
      if (Math.floor(S.playerEnergy) !== lastE) { lastE = Math.floor(S.playerEnergy); UI.refresh(); }
    }
    // doors that lead somewhere
    const x0 = P.x - 5, y0 = P.y - 7;
    for (const o of G.R.objs) {
      if (o.type !== 'door' || !o.to || isSolid(o)) continue; const r = o.r;
      if (x0 < r[0] + r[2] && x0 + 10 > r[0] && y0 < r[1] + r[3] && y0 + 7 > r[1]) { travelDoor(o); break; }
    }
  }
  let lastE = -1;

  /* ---------------- ROOM TRAVEL ---------------- */
  function doorSpawn(room, doorId) { const d = G.ROOMS[room].objs.find(o => o.id === doorId); return [d.x + d.w / 2, d.dir === 'n' ? d.y + 1.85 : d.y - 0.2, d.dir === 'n' ? 0 : 1]; }
  function travelDoor(o) { G.travel(o.to, doorSpawn(o.to, o.toDoor)); }
  G.travel = (room, spawn) => { if (G.busy) return; G.Audio.sfx('door'); UI.fade(() => enterRoom(room, spawn, true)); };
  function enterRoom(id, spawn, announce) {
    const S = G.S, P = G.P; S.room = id; G.Render.build(id);
    if (spawn) { P.x = spawn[0] * T; P.y = spawn[1] * T; if (spawn[2] !== undefined) P.dir = spawn[2]; S.spawn = [spawn[0], spawn[1]]; }
    P.ang = ANG[P.dir]; P.moving = false; G.cam.snap = true; G.target = null; G.FX.parts.length = 0;
    G.Audio.setMood(G.R.def.mood); updateHazards(0); UI.refresh();
    if (announce) { UI.roomTitle(G.R.def); G.Save.checkpoint(); G.onEnter(id); }
  }

  /* ---------------- INTERACTION ---------------- */
  function canInteract(o) {
    if (o.scan && !G.f('scan_' + o.id)) return false;
    if (o.type === 'battery' && G.f(o.id)) return false;
    if (o.type === 'door' && (o.dir === 's' || G.f('open_' + o.id))) return false;
    return !!(o.name && (o.look || G.ACT[o.id]));
  }
  const FD = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  function findTarget() {
    const P = G.P, px = P.x, py = P.y - 4; let best = null, bd = 1e9;
    for (const o of G.R.objs) {
      if (!canInteract(o)) continue; const r = o.r;
      const dx = Math.max(r[0] - px, 0, px - (r[0] + r[2])), dy = Math.max(r[1] - py, 0, py - (r[1] + r[3])); let d = Math.hypot(dx, dy);
      if (d > 15) continue;
      const cx = r[0] + r[2] / 2 - px, cy = r[1] + r[3] / 2 - py; if (cx * FD[P.dir][0] + cy * FD[P.dir][1] > 0) d -= 6;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function interact() { const o = G.target; if (!o) return; G.Audio.sfx('click'); G.interact(o); }
  G.interact = o => { if (o.look) G.talk(o.look); else if (G.ACT[o.id]) G.ACT[o.id](o); };

  const USES = { mkey: ['lab_cab'], code3042: ['lab_cab', 'srv_hatch'], card1: ['lab_door'], keycard: ['sec_door'], compA: ['srv_core'], compB: ['srv_core'], compC: ['srv_core'], medcard: ['med_door'], fuse: ['rx_main'], rxcode: ['rx_main'], tagA: ['rx_main'], tagB: ['rx_main'], research: ['fin_uplink', 'fin_console', 'fin_core'] };
  G.useItem = id => {
    const o = findTarget();
    if (o && (USES[id] || []).includes(o.id)) return G.interact(o);
    if (id === 'audio') return G.talk([['', 'You play it again, quietly.'], ['ALEX', '"…every time we reach the exit, it takes the memory back. Don\'t let it choose for you."']]);
    if (id === 'wrist') return G.talk([['', `The wrist monitor reads ${Math.round(G.S.playerEnergy)} units. Serial WM-7719.`]]);
    if (id === 'coupler') return G.talk([['', 'The coupler is already clipped to your wrist monitor, doing its work.']]);
    UI.toast(o ? `The ${G.ITEMS[id].n} doesn't work on that.` : `Nothing here to use the ${G.ITEMS[id].n} on.`, 'spend'); G.Audio.sfx('err');
  };

  function toggleLight() {
    const S = G.S;
    if (!S.flashlight && S.playerEnergy <= 4) { UI.toast('Not enough power for the flashlight', 'spend'); G.Audio.sfx('err'); return; }
    S.flashlight = !S.flashlight; G.Audio.sfx('light'); UI.refresh();
  }

  function scan() {
    G.pay(G.cost('scan'), () => {
      const P = G.P, R = G.R; G.FX.scan(P.x, P.y); G.Audio.sfx('scan'); let n = 0;
      R.objs.forEach(o => {
        const d = Math.hypot(o.r[0] + o.r[2] / 2 - P.x, o.r[1] + o.r[3] / 2 - P.y); if (d > 200) return;
        if (o.scan && !G.f('scan_' + o.id)) { G.S.flags['scan_' + o.id] = true; R.spark[o.id] = G.t + 10; n++; return; }
        const h = G.HOLDS[o.id]; if (h && h() && !(o.scan)) { R.spark[o.id] = G.t + 9; G.S.flags['hint_' + o.id] = true; n++; }
      });
      setTimeout(() => UI.toast(n ? `Scan: ${n} point${n > 1 ? 's' : ''} of interest nearby` : 'Scan: nothing hidden within range', 'clue'), 500);
      G.Save.save();
    });
  }

  /* ---------------- HAZARDS ---------------- */
  function updateHazards(dt) {
    const R = G.R, P = G.P, t = G.t, eased = G.S && G.S.securityRestored === true;
    R.hazards.forEach(z => {
      if (z.k === 'zone') {
        const per = z.period * (eased ? 1.4 : 1), ph = (t + z.phase) % per; z.on = ph < z.duty; z.warn = !z.on && ph > per - 0.6;
        if (dt && z.on && P.inv <= 0) { const x0 = P.x - 5, y0 = P.y - 7; if (x0 < (z.x + z.w) * T && x0 + 10 > z.x * T && y0 < (z.y + z.h) * T && y0 + 7 > z.y * T) hurt((z.x + z.w / 2) * T, P.y); }
      } else {
        const pts = z.loop ? z.loop.concat([z.loop[0]]) : [[z.x1, z.y1], [z.x2, z.y2], [z.x1, z.y1]];
        let total = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(L); total += L; }
        let d = ((t * z.speed * (eased ? 0.7 : 1) / T) + z.phase * 3) % total;
        for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const k = d / seg[i]; z.px = (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k) * T; z.py = (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k) * T; break; } d -= seg[i]; }
        if (dt && Math.random() < 0.3) G.FX.parts.push({ x: z.px, y: z.py - 6, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.25, col: '#dff6ff' });
        if (dt && P.inv <= 0 && Math.hypot(P.x - z.px, (P.y - 6) - (z.py - 4)) < 10) hurt(z.px, z.py);
      }
    });
  }
  function hurt(hx, hy) {
    const P = G.P, S = G.S; S.playerEnergy -= 8; P.inv = 1.3; G.FX.flash = 1; G.cam.shake = 0.9; G.Audio.sfx('zap'); G.FX.spawn(P.x, P.y - 10, 16, '#dff6ff', 90);
    let ax = P.x - hx, ay = P.y - hy; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L; if (!ax && !ay) ax = -1;
    for (let i = 0; i < 22; i++) { if (!blocked(P.x + ax, P.y)) P.x += ax; if (!blocked(P.x, P.y + ay)) P.y += ay; }
    UI.toast('−8 energy — electrical arc', 'ev'); UI.refresh();
    if (S.playerEnergy <= 0) blackout();
  }
  function blackout() {
    const S = G.S; S.playerEnergy = 0; G.Audio.sfx('down');
    UI.fade(() => {
      S.playerEnergy = 20; S.echoDebt++; S.flashlight = false; const sp = S.spawn || G.R.def.spawn; G.P.x = sp[0] * T; G.P.y = sp[1] * T; G.P.inv = 2; G.cam.snap = true; UI.refresh();
      setTimeout(() => G.talk([['', 'Your wrist monitor dies. So does everything else.'], ['', '…'], ['ECHO', 'There. I restarted your monitor. You were out for eleven seconds.'], ['ECHO', 'That is one more you owe me, Alex. I\'m not counting. But it is.']]), 500);
    }, 700);
  }

  /* ---------------- GAME FLOW ---------------- */
  function hideAll() { ['menu', 'pause', 'settings', 'credits', 'inventory', 'terminal', 'keypad', 'dialog', 'ending'].forEach(id => $(id).classList.add('hide')); G.overlay = null; }
  G.startNew = () => {
    G.Save.clear(); hideAll(); G.S = G.newState(); G.P = newP(); G.mode = 'play'; $('hud').classList.remove('hide');
    UI.black(true); enterRoom('lab', G.ROOMS.lab.spawn, false); G.S.spawn = G.ROOMS.lab.spawn; G.P.lying = true; G.Save.checkpoint();
    G.talk([['', 'EMERGENCY POWER: 1% OF FACILITY CAPACITY REMAINING.'], ['', '…'], ['', 'A cold floor. A low hum. Red light behind your eyelids.']], () => {
      UI.black(false);
      setTimeout(() => {
        G.P.lying = false; G.cam.shake = 0.25; UI.roomTitle(G.R.def);
        G.talk([['ALEX', G.meta.loops ? 'My head… Why does this feel familiar?' : 'My head… Where is everyone?'], ['ALEX', 'Emergency lights. A computer still running. And this thing on my wrist — one hundred units of something.'], ['', 'WASD / arrows to move · SHIFT to run · E to interact · F flashlight · R scan for hidden things · I backpack']]);
      }, 1700);
    });
  };
  function restore(S) { hideAll(); G.S = S; G.P = newP(); G.P.x = S.px; G.P.y = S.py; G.P.dir = S.dir || 0; G.mode = 'play'; $('hud').classList.remove('hide'); enterRoom(S.room, null, false); }
  G.continueGame = () => { const S = G.Save.load(); if (!S) return; UI.fade(() => { restore(S); UI.roomTitle(G.R.def); }); };
  G.restartCheckpoint = () => { const S = G.Save.loadCkpt(); if (!S) return; UI.fade(() => { restore(S); G.Save.save(); UI.toast('Checkpoint restored', 'clue'); }); };

  /* ---------------- MAIN LOOP ---------------- */
  let last = 0, saveT = 0;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; G.t += dt;
    if (G.mode === 'play') {
      const free = !G.overlay && !G.busy;
      if (free) { updatePlayer(dt); updateHazards(dt); G.S.playTime += dt; saveT += dt; if (saveT > 5) { saveT = 0; G.Save.save(); } }
      else G.P.moving = false;
      G.target = free && !G.P.lying ? findTarget() : null;
      const o = G.target; UI.prompt(o ? `<b>E</b>${o.verb || 'Examine'} ${o.name}` : '');
    }
    G.Render.frame(dt);
    requestAnimationFrame(loop);
  }

  /* ---------------- BOOT ---------------- */
  G.Save.loadMeta();
  G.P = newP(); G.Render.build('lab');
  G.P.x = G.ROOMS.lab.spawn[0] * T; G.P.y = G.ROOMS.lab.spawn[1] * T; G.P.lying = true;
  UI.showMenu();
  requestAnimationFrame(loop);
  G._test = { keys, enterRoom, findTarget, updateHazards };
})();
