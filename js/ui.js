/* ============================================================
   UI MANAGER — HUD, dialogue system, computer terminal shell,
   keypad, inventory, menus, settings
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  const $ = id => document.getElementById(id);
  const show = (id, on) => $(id).classList.toggle('hide', !on);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

  /* ---------------- HUD ---------------- */
  const UI = G.UI = {
    refresh() {
      if (!G.S) return;
      const e = Math.max(0, Math.round(G.S.playerEnergy));
      $('enum').textContent = e; const f = $('efill'); f.style.width = e + '%'; f.className = e <= 20 ? 'low' : e <= 45 ? 'mid' : '';
      const fl = $('flash'); fl.textContent = G.S.flashlight ? 'LIGHT ON' : 'LIGHT OFF'; fl.className = G.S.flashlight ? 'on' : '';
      if (G.R) $('roomname').textContent = G.R.def.name;
      if (G.objective) $('objtext').textContent = G.objective();
    },
    prompt(html) { const p = $('prompt'); if (!html) { p.classList.add('hide'); return; } if (p.dataset.h !== html) { p.innerHTML = html; p.dataset.h = html; } p.classList.remove('hide'); },
    toast(text, kind, icon) {
      const t = el('div', 'toast ' + (kind || ''));
      if (icon) { const i = new Image(); i.src = G.icon(icon); t.appendChild(i); }
      t.appendChild(document.createTextNode(text)); $('toasts').appendChild(t);
      setTimeout(() => t.remove(), 3300);
      while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
    },
    roomTitle(def) { const r = $('roomtitle'); r.innerHTML = '<small>' + def.name + '</small>' + def.title; r.classList.remove('show'); void r.offsetWidth; r.classList.add('show'); },
    fade(mid, hold) {
      G.busy = true; const f = $('fade'); f.style.opacity = 1;
      setTimeout(() => { mid && mid(); setTimeout(() => { f.style.opacity = 0; G.busy = false; }, hold || 120); }, 300);
    },
    black(on) { $('fade').style.opacity = on ? 1 : 0; },
    open(id) { G.overlay = id; show(id, true); },
    close(id) { show(id, false); if (G.overlay === id) G.overlay = null; },
    showMenu() {
      G.mode = 'menu'; show('hud', false); show('ending', false); show('pause', false); UI.open('menu');
      $('btncont').disabled = !G.Save.has();
      const n = G.meta.endings.length; $('mfound').textContent = n ? `ENDINGS DISCOVERED: ${n} / 5` + (G.meta.loops ? `   ·   CYCLE ${14 + G.meta.loops}` : '') : '';
    },
    pause() { G.Save.save(); UI.open('pause'); },
    resume() { UI.close('pause'); },
    settings(from) { UI._from = from; show(from, false); $('volm').value = G.meta.music * 100; $('vols').value = G.meta.sfx * 100; UI.open('settings'); },
    back() { const cur = G.overlay; show(cur, false); UI.open(UI._from || 'menu'); }
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    G.Audio.init(); G.Audio.sfx('click');
    switch (b.dataset.act) {
      case 'new': G.startNew(); break;
      case 'continue': G.continueGame(); break;
      case 'settings': UI.settings(G.overlay); break;
      case 'credits': UI._from = 'menu'; show('menu', false); UI.open('credits'); break;
      case 'back': UI.back(); break;
      case 'resume': UI.resume(); break;
      case 'restart': G.restartCheckpoint(); break;
      case 'mainmenu': G.Save.save(); UI.showMenu(); break;
      case 'fullscreen': try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (err) { /* not allowed here */ } break;
      case 'again': G.startNew(); break;
      case 'tomenu': UI.showMenu(); break;
    }
  });
  $('volm').addEventListener('input', e => { G.meta.music = e.target.value / 100; G.Audio.vol(); G.Save.saveMeta(); });
  $('vols').addEventListener('input', e => { G.meta.sfx = e.target.value / 100; G.Audio.vol(); G.Save.saveMeta(); G.Audio.sfx('beep'); });

  /* ---------------- DIALOGUE SYSTEM ---------------- */
  const Dlg = { lines: null, i: 0, then: null, typing: null, full: '', opts: null, sel: 0 };
  function dlgShowLine() {
    const [who, text] = Dlg.lines[Dlg.i];
    const d = $('dialog'); d.className = who === 'ECHO' ? 'echo' : who === 'SYSTEM' ? 'system' : who ? '' : 'narr';
    $('dname').textContent = who; $('dopts').innerHTML = ''; show('dnext', true);
    Dlg.full = text; let n = 0; const t = $('dtext'); t.textContent = '';
    if (who === 'ECHO') G.Audio.sfx('echo');
    clearInterval(Dlg.typing);
    Dlg.typing = setInterval(() => { n += 2; t.textContent = Dlg.full.slice(0, n); if (n % 6 === 0) G.Audio.sfx('type'); if (n >= Dlg.full.length) { clearInterval(Dlg.typing); Dlg.typing = null; } }, 18);
  }
  function dlgAdvance() {
    if (Dlg.opts) return;
    if (Dlg.typing) { clearInterval(Dlg.typing); Dlg.typing = null; $('dtext').textContent = Dlg.full; return; }
    Dlg.i++;
    if (Dlg.i < Dlg.lines.length) return dlgShowLine();
    const then = Dlg.then; Dlg.lines = null; Dlg.then = null; UI.close('dialog');
    then && then();
  }
  // G.talk([[speaker, text], ...], then)
  G.talk = (lines, then) => {
    if (!lines || !lines.length) { then && then(); return; }
    Dlg.lines = lines; Dlg.i = 0; Dlg.then = then || null; Dlg.opts = null; UI.open('dialog'); dlgShowLine();
  };
  // G.choose(prompt, [{t, fn, off}])  — "off" is a reason string shown on unavailable options
  G.choose = (prompt, opts) => {
    Dlg.opts = opts; Dlg.sel = opts.findIndex(o => !o.off); UI.open('dialog');
    $('dialog').className = 'system'; $('dname').textContent = 'DECISION'; $('dtext').textContent = prompt; show('dnext', false);
    const box = $('dopts'); box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = el('button', o.off ? 'off' : (i === Dlg.sel ? 'sel' : ''));
      b.innerHTML = `<b>${i + 1}</b>`; b.appendChild(document.createTextNode(o.t));
      if (o.off) b.appendChild(el('small', '', '— ' + o.off));
      b.addEventListener('click', ev => { ev.stopPropagation(); pick(i); });
      box.appendChild(b);
    });
  };
  function pick(i) {
    const o = Dlg.opts && Dlg.opts[i]; if (!o) return;
    if (o.off) { G.Audio.sfx('err'); return; }
    G.Audio.sfx('ok'); Dlg.opts = null; UI.close('dialog'); o.fn && o.fn();
  }
  $('dialog').addEventListener('click', () => { G.Audio.init(); dlgAdvance(); });
  Dlg.key = code => {
    if (Dlg.opts) {
      const n = Dlg.opts.length;
      if (/^(Digit|Numpad)[1-9]$/.test(code)) return pick(+code.slice(-1) - 1);
      if (code === 'ArrowDown' || code === 'KeyS' || code === 'ArrowUp' || code === 'KeyW') {
        const dir = (code === 'ArrowDown' || code === 'KeyS') ? 1 : -1; let k = Dlg.sel;
        for (let j = 0; j < n; j++) { k = (k + dir + n) % n; if (!Dlg.opts[k].off) break; }
        Dlg.sel = k; [...$('dopts').children].forEach((b, i) => b.classList.toggle('sel', i === k)); G.Audio.sfx('beep');
      }
      if (code === 'Enter' || code === 'KeyE') pick(Dlg.sel);
      return;
    }
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') dlgAdvance();
  };

  /* ---------------- COMPUTER TERMINAL SHELL ---------------- */
  let gen = 0;
  const Term = G.Term = {
    onClose: null, keyFn: null,
    open(opt) {
      gen++; const my = gen; UI.open('terminal'); G.Audio.sfx('boot');
      $('ttitle').textContent = opt.title; $('tstatus').textContent = opt.status || ''; $('tfoot').textContent = 'PWR ' + Math.round(G.S.playerEnergy) + '%  ·  NODE ONLINE';
      const body = $('tbody'); body.innerHTML = ''; Term.keyFn = null; Term.onClose = null;
      const api = makeApi(body, my);
      const boot = ['BIOS v2.19  ·  EMERGENCY BUS', 'memory check ........ 640K OK', 'mounting /facility/' + opt.title.split(' ')[0].toLowerCase() + ' ...', 'link established.'];
      let i = 0;
      const iv = setInterval(() => { if (my !== gen) return clearInterval(iv); if (i < boot.length) { api.p(boot[i++], 'dim'); G.Audio.sfx('type'); } else { clearInterval(iv); body.innerHTML = ''; opt.build(api); } }, 150);
    },
    close() { if (G.overlay !== 'terminal') return; gen++; Term.keyFn = null; UI.close('terminal'); UI.refresh(); const cb = Term.onClose; Term.onClose = null; cb && cb(); },
    key(code, e) { if (Term.keyFn) Term.keyFn(code, e); }
  };
  $('tclose').addEventListener('click', () => Term.close());
  function makeApi(body, my) {
    let hintBtn = null, hintTimer = null;
    const api = {
      el: body, alive: () => my === gen,
      p(text, cls) { const d = el('p', cls || '', text); body.appendChild(d); body.scrollTop = body.scrollHeight; return d; },
      node(n) { body.appendChild(n); body.scrollTop = body.scrollHeight; return n; },
      row() { return api.node(el('div', 'trow')); },
      btn(label, fn, parent, cls) { const b = el('button', 'tbtn ' + (cls || ''), label); b.addEventListener('click', () => { G.Audio.sfx('beep'); fn(b); }); (parent || body).appendChild(b); return b; },
      clear() { body.innerHTML = ''; hintBtn = null; clearTimeout(hintTimer); },
      // type lines one after another: [[text, cls], ...]
      seq(lines, done) {
        let i = 0;
        const next = () => {
          if (my !== gen) return; if (i >= lines.length) { done && done(); return; }
          const [text, cls] = lines[i++], d = api.p('', cls); let n = 0;
          const iv = setInterval(() => { if (my !== gen) return clearInterval(iv); n += 3; d.textContent = text.slice(0, n); if (n % 9 === 0) G.Audio.sfx('type'); body.scrollTop = body.scrollHeight; if (n >= text.length) { clearInterval(iv); setTimeout(next, 160); } }, 14);
        };
        next();
      },
      // hint stays locked until the player has tried (one wrong answer) or thought for a while
      hint(text, delay) {
        hintBtn = api.btn('REQUEST HINT (locked — think first)', b => { if (b.dataset.used) return; b.dataset.used = 1; api.p('HINT: ' + text, 'warn'); b.remove(); }, null, 'hint'); hintBtn.disabled = true;
        hintTimer = setTimeout(() => api.unlockHint(), (delay || 25) * 1000);
      },
      unlockHint() { if (hintBtn && hintBtn.isConnected) { hintBtn.disabled = false; hintBtn.textContent = 'REQUEST HINT'; } },
      wrong(pen, msg) {
        G.Audio.sfx('err'); G.drain(pen); G.cam.shake = 0.5; document.querySelector('.tframe').classList.remove('shake'); void body.offsetWidth; document.querySelector('.tframe').classList.add('shake');
        api.p(msg + (pen ? `  [−${pen} energy]` : ''), 'bad'); $('tfoot').textContent = 'PWR ' + Math.round(G.S.playerEnergy) + '%  ·  NODE ONLINE'; api.unlockHint();
      },
      close(after) { Term.onClose = after || null; Term.close(); }
    };
    return api;
  }

  /* ---------------- KEYPAD ---------------- */
  const Keypad = G.Keypad = {
    cfg: null, val: '',
    open(cfg) {
      Keypad.cfg = cfg; Keypad.val = ''; UI.open('keypad'); $('ktitle').textContent = cfg.title; $('khint').textContent = cfg.hint || ''; Keypad.draw();
      const g = $('kgrid'); g.innerHTML = '';
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ESC'].forEach(k => { const b = el('button', '', k); b.addEventListener('click', () => Keypad.press(k)); g.appendChild(b); });
    },
    draw() { const d = $('kdisp'); d.className = ''; d.textContent = (Keypad.val + '____').slice(0, Keypad.cfg.len); },
    press(k) {
      const cfg = Keypad.cfg; if (!cfg || Keypad.lock) return;
      if (k === 'ESC') { UI.close('keypad'); Keypad.cfg = null; cfg.cancel && cfg.cancel(); return; }
      if (k === 'CLR') { Keypad.val = ''; G.Audio.sfx('beep'); return Keypad.draw(); }
      if (Keypad.val.length >= cfg.len) return;
      Keypad.val += k; G.Audio.sfx('beep'); Keypad.draw();
      if (Keypad.val.length === cfg.len) {
        Keypad.lock = true; const good = Keypad.val === cfg.code; $('kdisp').className = good ? 'good' : 'bad'; G.Audio.sfx(good ? 'ok' : 'err');
        setTimeout(() => { Keypad.lock = false; if (good) { UI.close('keypad'); Keypad.cfg = null; cfg.ok(); } else { Keypad.val = ''; Keypad.draw(); $('khint').textContent = cfg.fail || 'ACCESS DENIED.'; } }, 550);
      }
    },
    key(code) { if (code === 'Escape') return Keypad.press('ESC'); if (code === 'Backspace') return Keypad.press('CLR'); const m = /^(Digit|Numpad)(\d)$/.exec(code); if (m) Keypad.press(m[2]); }
  };

  /* ---------------- INVENTORY ---------------- */
  const Inv = G.Inv = {
    tab: 'items', sel: null, combine: null,
    open() { Inv.sel = null; Inv.combine = null; UI.open('inventory'); G.Audio.sfx('click'); Inv.draw(); },
    close() { UI.close('inventory'); },
    draw() {
      const g = $('invgrid'), info = $('invinfo'); g.innerHTML = ''; info.innerHTML = '';
      document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === Inv.tab));
      const S = G.S;
      if (Inv.tab === 'items') {
        g.className = '';
        S.inventory.forEach(id => {
          const s = el('div', 'slot' + (Inv.sel === id ? ' sel' : '') + (Inv.combine === id ? ' cmb' : '')); const im = new Image(); im.src = G.icon(id); s.appendChild(im); s.title = G.ITEMS[id].n;
          s.addEventListener('click', () => {
            G.Audio.sfx('beep');
            if (Inv.combine && Inv.combine !== id) return Inv.tryCombine(Inv.combine, id);
            Inv.sel = id; Inv.draw();
          });
          g.appendChild(s);
        });
        for (let i = S.inventory.length; i < 15; i++) g.appendChild(el('div', 'slot empty'));
        if (Inv.sel && G.has(Inv.sel)) {
          const it = G.ITEMS[Inv.sel];
          info.appendChild(el('h3', '', it.n)); info.appendChild(el('p', '', it.d));
          if (Inv.showLong) info.appendChild(el('p', 'long', it.long));
          const a = el('div', 'acts');
          const mk = (t, fn) => { const b = el('button', '', t); b.addEventListener('click', fn); a.appendChild(b); };
          mk('INSPECT', () => { Inv.showLong = !Inv.showLong; G.Audio.sfx('beep'); Inv.draw(); });
          mk('USE', () => { const id = Inv.sel; Inv.close(); G.useItem(id); });
          mk(Inv.combine ? 'CANCEL COMBINE' : 'COMBINE…', () => { Inv.combine = Inv.combine ? null : Inv.sel; Inv.draw(); });
          info.appendChild(a);
          if (Inv.combine) info.appendChild(el('p', '', '\nSelect a second item to combine with ' + G.ITEMS[Inv.combine].n + '.'));
        } else info.appendChild(el('p', '', 'Select an item to read its description, inspect it closely, use it on something nearby, or combine it with another item.'));
      } else {
        g.className = 'list';
        if (!S.discoveredClues.length) g.appendChild(el('p', '', 'No clues yet. Explore. Read everything.'));
        S.discoveredClues.forEach(id => {
          const c = G.CLUES[id], d = el('div', 'cl' + (Inv.sel === id ? ' sel' : ''), c.t); if (c.ev) d.appendChild(el('b', '', 'EVIDENCE'));
          d.addEventListener('click', () => { Inv.sel = id; G.Audio.sfx('beep'); Inv.draw(); }); g.appendChild(d);
        });
        const c = G.CLUES[Inv.sel];
        if (c) { info.appendChild(el('h3', '', c.t)); info.appendChild(el('p', 'long', typeof c.d === 'function' ? c.d() : c.d)); }
        else info.appendChild(el('p', '', 'Everything you have learned is kept here. Evidence changes what Alex is able to do at the end.'));
      }
      const st = el('div', 'stat'); st.textContent = `ENERGY ${Math.round(S.playerEnergy)}   ·   CLUES ${S.discoveredClues.length}   ·   EVIDENCE ${S.evidenceCollected}`; info.appendChild(st);
    },
    tryCombine(a, b) {
      const c = G.COMBOS.find(k => (k.a === a && k.b === b) || (k.a === b && k.b === a));
      Inv.combine = null;
      if (!c) { G.Audio.sfx('err'); UI.toast('Those don\'t fit together.', 'spend'); return Inv.draw(); }
      G.take(c.a); G.take(c.b); G.give(c.out); UI.toast(c.msg, 'clue'); Inv.sel = c.out; Inv.showLong = true; Inv.draw();
    }
  };
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { Inv.tab = b.dataset.tab; Inv.sel = null; Inv.draw(); }));
  $('invclose').addEventListener('click', () => Inv.close());

  G.Dlg = Dlg;

  /* ---------------- STAGE SCALING (fixed resolution, responsive) ---------------- */
  function fit() { const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720); $('stage').style.transform = `translate(-50%,-50%) scale(${s})`; }
  window.addEventListener('resize', fit); fit();
})();
