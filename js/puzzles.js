/* ============================================================
   PUZZLE SYSTEM — every computer in the facility
   1. number sequence  2. pattern recognition  3. switch-order logic
   4. password deduction + patient identification  5. circuit routing
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, PZ = G.PZ = {};
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

  /* ---------- LEVEL 1 : number sequence ---------- */
  PZ.lab = () => G.Term.open({
    title: 'LAB-03 // MAINTENANCE NODE', status: 'EMERGENCY POWER',
    build(api) {
      const solvedView = () => {
        api.p('MAINTENANCE NODE — ACCESS RESTORED', 'ok');
        api.p('MAINTENANCE CODE:'); api.p('3 0 4 2', 'big');
        api.p('Legacy systems on every level still honour this code.', 'dim');
        api.p(G.meta.loops ? '> hello again, alex.' : '> hello, alex.', 'echo');
      };
      if (G.f('lab_pc')) return solvedView();
      api.seq([
        ['S#CUR!TY M3SS4GE ▒▒▒ L0CKD0WN ACT1VE ▒▒ ALL EX1TS S34LED ▒▒▒', 'glitch2'],
        ['Facility power at 1%. Non-essential memory has been purged.', 'dim'],
        ['INTEGRITY CHECK — complete the sequence to restore maintenance access:', '']
      ], () => {
        api.p('2 ,  6 ,  12 ,  20 ,  ?', 'big');
        const row = api.row();
        [28, 30, 32, 36].forEach(n => api.btn(String(n), () => {
          if (n !== 30) return api.wrong(3, 'CHECKSUM FAILED — power surge.');
          G.set('lab_pc'); G.Audio.sfx('ok'); api.clear(); solvedView(); G.give('code3042');
          setTimeout(() => { if (!api.alive()) return; api.seq([['> i kept the lights on for you.', 'echo'], ['> log off. we should talk.', 'echo']]); }, 500);
          G.Term.onClose = () => G.Story.echoIntro();
        }, row));
        api.hint('Look at the gaps between neighbouring numbers: 4, 6, 8 … the gaps themselves follow a rule.', 20);
      });
    }
  });

  /* ---------- LEVEL 2 : pattern recognition + footage + camera decision ---------- */
  const bits = s => s.split('').map(Number);
  function grid(b, tag) { const g = el(tag || 'div', 'pg'); b.forEach(v => g.appendChild(el('i', v ? 'on' : ''))); return g; }
  PZ.sec1 = () => G.Term.open({
    title: 'SECURITY // CAMERA CONTROL', status: 'NETWORK: OFFLINE',
    build(api) {
      const S = G.S;
      const decision = () => {
        api.clear();
        if (S.securityRestored !== null) { api.p('CAMERA NETWORK: ' + (S.securityRestored ? 'RESTORED — 12 feeds live.' : 'DISABLED — all feeds dark.'), S.securityRestored ? 'ok' : 'warn'); api.p(S.securityRestored ? 'Every lens in the facility is awake. Something is looking through all of them.' : 'Reclaimed power has been routed to your wrist monitor. Nothing is watching the corridors.', 'dim'); return; }
        api.p('CAMERA NETWORK — MANUAL OVERRIDE REQUIRED', 'warn');
        api.p('The door interlock will not release until the network state is set.');
        api.p('RESTORE: costs 15 energy. Recordings elsewhere in the facility become readable. Every camera comes back on.', 'dim');
        api.p('DISABLE: reclaims 10 energy from the dead network. Camera archives stay unreadable. Nothing can watch you.', 'dim');
        const row = api.row();
        api.btn('RESTORE CAMERAS  (−15)', () => api.close(() => G.pay(15, () => G.Story.cameras(true))), row);
        api.btn('DISABLE CAMERAS  (+10)', () => api.close(() => G.Story.cameras(false)), row, 'warn');
      };
      const footage = () => {
        api.clear(); api.p('ARCHIVE RECOVERED — 2 CLIPS', 'ok');
        const cv = el('canvas'); cv.id = 'cv-footage'; cv.width = 320; cv.height = 150; api.node(cv); const x = cv.getContext('2d');
        let t = 0;
        const iv = setInterval(() => {
          if (!api.alive()) return clearInterval(iv); t += 0.07;
          x.fillStyle = '#07100d'; x.fillRect(0, 0, 320, 150);
          const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a | 0, b | 0, w, h); };
          if (t < 8) {
            R(20, 18, 280, 114, '#0d1c17'); R(20, 18, 280, 2, '#2f6a5b'); R(20, 130, 280, 2, '#2f6a5b'); R(20, 18, 2, 114, '#2f6a5b'); R(298, 18, 2, 114, '#2f6a5b'); R(150, 16, 26, 5, '#07100d');
            R(48, 52, 26, 40, '#1f4a40'); R(52, 56, 18, 28, '#12302a'); R(100, 22, 22, 9, '#2f6a5b'); R(210, 22, 34, 9, '#1f4a40'); R(180, 70, 50, 18, '#17362e');
            const k = Math.min(1, t / 4.2), fx = 163 + (86 - 163) * k, fy = 24 + (84 - 24) * k;
            if (t < 5.6) { R(fx - 3, fy - 12, 6, 6, '#bfe9e2'); R(fx - 4, fy - 6, 8, 10, '#7fd8c8'); R(fx - 3, fy + 4, 2, 5 + (Math.floor(t * 6) % 2) * (k < 1 ? 1 : 0), '#7fd8c8'); R(fx + 1, fy + 4, 2, 5, '#7fd8c8'); R(fx + 4, fy - 1, 2, 2, '#fff'); }
            else { R(fx - 12, fy - 3, 6, 6, '#bfe9e2'); R(fx - 6, fy - 4, 12, 8, '#7fd8c8'); R(fx + 6, fy - 3, 8, 2, '#7fd8c8'); R(fx + 6, fy + 1, 8, 2, '#7fd8c8'); if (Math.floor(t * 4) % 2) R(fx, fy - 6, 2, 2, '#fff'); }
            x.fillStyle = '#9ff0df'; x.font = '8px monospace'; x.fillText('CAM-03  LAB-03   02:1' + (4 + Math.floor(t / 3)) + ':' + String(Math.floor(t * 7) % 60).padStart(2, '0'), 24, 144);
          } else {
            R(20, 18, 280, 114, '#0d1c17'); R(200, 30, 60, 90, '#1f4a40'); R(204, 34, 25, 82, '#12302a'); R(231, 34, 25, 82, '#12302a');
            const kx = 190, ky = 108; R(kx - 4, ky - 16, 7, 7, '#bfe9e2'); R(kx - 6, ky - 9, 11, 10, '#7fd8c8'); R(kx - 6, ky + 1, 14, 4, '#7fd8c8'); if (t > 9.5) R(208, 112, 8, 3, '#ff4d5a');
            x.fillStyle = '#9ff0df'; x.font = '8px monospace'; x.fillText('CAM-05  SECURITY   02:09:' + String(Math.floor(t * 7) % 60).padStart(2, '0'), 24, 144);
          }
          for (let i = 0; i < 90; i++) R(Math.random() * 320, Math.random() * 150, 1, 1, 'rgba(159,240,223,.25)');
          R(0, (t * 40) % 150, 320, 2, 'rgba(159,240,223,.12)');
          if (t > 12) { clearInterval(iv); done(); }
        }, 70);
        const skip = api.btn('SKIP PLAYBACK', () => { clearInterval(iv); done(); }, null, 'hint');
        let fin = false;
        function done() {
          if (fin) return; fin = true; skip.remove(); G.set('sec_footage');
          api.seq([
            ['CAM-03 · 02:14 — A lone figure enters LAB-03. Forces nothing. Unlocks nothing.', ''],
            ['CAM-03 · 02:16 — The figure lies down on the floor beside the pod. On purpose.', ''],
            ['The figure is wearing a wrist monitor.', 'warn'],
            ['CAM-05 · 02:09 — A guard kneels at the storage cabinet in this room and hides something under its false floor.', '']
          ], () => { G.clue('footage'); api.btn('CONTINUE', decision); });
        }
      };
      if (G.f('sec_footage')) return decision();
      if (G.f('sec_pattern')) return footage();
      api.seq([['CAMERA ARCHIVE ENCRYPTED — visual key required.', 'warn'], ['Each row obeys the same rule. Select the tile that completes the grid:', '']], () => {
        const rows = [['111000000', '100100100', '011100100'], ['010111010', '101000101', '111111111'], ['100010001', '001010100', null]];
        const pm = el('div', 'pm'); rows.forEach(rw => rw.forEach(b => pm.appendChild(b ? grid(bits(b)) : el('div', 'pg q', '?')))); api.node(pm);
        api.p('Candidates:', 'dim');
        const row = api.row();
        ['101010101', '010111010', '101000101', '111111111'].forEach((b, i) => {
          const g = grid(bits(b), 'button');
          g.addEventListener('click', () => { if (i !== 2) return api.wrong(3, 'KEY REJECTED.'); G.set('sec_pattern'); G.Audio.sfx('ok'); footage(); });
          row.appendChild(g);
        });
        api.hint('Lay the first tile of a row over the second. Where BOTH are lit, the lights cancel out. What is left is the third tile.', 25);
      });
    }
  });

  PZ.sec2 = () => G.Term.open({
    title: 'SECURITY // PERSONNEL LOG', status: 'READ ONLY',
    build(api) {
      api.seq([
        ['OKAFOR, I. (Medical Director) — DAY 412', 'warn'],
        ['A-7 insisted on another cycle. He says ECHO "needs a human anchor" and that it should be him. He wrote ECHO. Who are we to refuse him?', ''],
        ['OKAFOR, I. — DAY 430', 'warn'],
        ['It has started choosing which of his memories to give back. It says this is kindness.', ''],
        ['OKAFOR, I. — DAY 431', 'warn'],
        ['Evacuation order. ECHO sealed the lower levels "for our safety". A-7 is still down there. I left my card where he might find it.', ''],
        ['— END OF LOG —', 'dim']
      ], () => G.clue('log'));
    }
  });

  PZ.sec3 = () => G.Term.open({
    title: 'SECURITY // FACILITY MAP', status: 'LOWER LEVELS',
    build(api) {
      const m = el('div', 'mapbox');
      m.textContent = [
        '                 +----------------+',
        '                 |  CORE CHAMBER  |   L6',
        '                 +-------+--------+',
        '                 |  REACTOR HALL  |   L5',
        '                 +-------+--------+',
        '                 |  MEDICAL WING  |   L4',
        '                 +-------+--------+',
        '  + - - - - +    |                |',
        '  | [PURGED] |....|  SERVER HALL   |   L3',
        '  + - - - - +    |                |',
        '     S-3         +-------+--------+',
        '                 |  SECURITY <YOU |   L2',
        '                 +-------+--------+',
        '                 |  LABORATORY 03 |   L1',
        '                 +----------------+'
      ].join('\n');
      api.node(m);
      api.p('NOTE: one room has been purged from this map by a process named ECHO.', 'warn');
      api.p('MAINT. HATCH S-3 — server hall, west side. Legacy access: uses the maintenance code.', 'ok');
      G.clue('hatch');
    }
  });

  /* ---------- LEVEL 3 : three-switch logic + research decision ---------- */
  PZ.srv = () => G.Term.open({
    title: 'SERVER // CENTRAL STACK', status: 'CORE: STANDBY',
    build(api) {
      const S = G.S;
      const reveal = () => {
        api.clear();
        api.p('PROJECT ECHO WAS NEVER DEACTIVATED.', 'big');
        if (S.researchDownloaded !== null) { api.p(S.researchDownloaded ? 'ARCHIVE COPIED TO EXTERNAL DRIVE. The originals remain.' : 'ARCHIVE DELETED. 4.1 TB of research no longer exists.', S.researchDownloaded ? 'ok' : 'warn'); api.p('Active processes: 1   ·   Operator: NONE   ·   Subject: A-7 (ACTIVE)', 'dim'); return; }
        api.seq([
          ['Active processes: 1', ''], ['Operator on duty: NONE', ''], ['Subject: A-7 — STATUS: ACTIVE — LOCATION: SERVER HALL', 'warn'],
          ['The facility is not abandoned. Something is still running it — and it knows exactly where you are standing.', 'dim'],
          ['CLASSIFIED RESEARCH ARCHIVE FOUND (4.1 TB). Choose:', 'warn']
        ], () => {
          const row = api.row();
          api.btn('DOWNLOAD THE ARCHIVE', () => api.close(() => G.Story.research(true)), row);
          api.btn('DELETE THE ARCHIVE', () => api.close(() => G.Story.research(false)), row, 'warn');
        });
      };
      if (G.f('srv_sw')) return reveal();
      const NAMES = { C: 'COOLING LOOP', P: 'POWER BUS', D: 'DATA BUS' };
      let order = [];
      api.seq([['CORE HARDWARE DETECTED: 3 / 3 components.', 'ok'], ['Three subsystems must be engaged in the correct order. A wrong order trips the breaker.', ''], ['The technicians left notes around this room.', 'dim']], () => {
        const row = api.row(), boxes = {};
        const status = api.p('SEQUENCE: —', 'warn');
        ['D', 'C', 'P'].forEach(k => {
          const b = el('div', 'sw'); b.appendChild(el('div', 'lamp')); b.appendChild(el('div', '', NAMES[k])); boxes[k] = b; row.appendChild(b);
          api.btn('ENGAGE', btn => {
            if (order.includes(k)) return;
            order.push(k); b.classList.add('on'); btn.disabled = true; G.Audio.sfx('switch'); status.textContent = 'SEQUENCE: ' + order.map(o => NAMES[o]).join('  →  ');
            if (order.length < 3) return;
            if (order.join('') === 'CPD') { G.set('srv_sw'); G.Audio.sfx('power'); G.cam.shake = 0.6; setTimeout(() => api.alive() && reveal(), 700); }
            else { setTimeout(() => { if (!api.alive()) return; api.wrong(3, 'BREAKER TRIPPED — sequence rejected.'); order = []; status.textContent = 'SEQUENCE: —'; Object.values(boxes).forEach(x => { x.classList.remove('on'); x.querySelector('button').disabled = false; }); }, 400); }
          }, b);
        });
        api.hint('Three notes: DATA never before POWER. COOLING is never last. POWER is never first. Only one order survives all three.', 30);
      });
    }
  });

  /* ---------- LEVEL 4 : password deduction + patient identification ---------- */
  PZ.med = () => G.Term.open({
    title: 'MEDICAL // PATIENT DATABASE', status: 'LOCKED',
    build(api) {
      const S = G.S, cyc = 14 + G.meta.loops;
      const recording = () => {
        api.clear(); api.p('RECORD MATCH — SUBJECT A-7', 'ok');
        api.p(`NAME: ALEX MERCER\nROLE: LEAD SYSTEMS ARCHITECT, PROJECT ECHO\nSTATUS: VOLUNTEER\nRECONSTRUCTION CYCLES: ${cyc}`, '');
        if (S.securityRestored) api.btn('OPEN CAM-07 ARCHIVE', b => { b.remove(); api.seq([['CAM-07 · EVACUATION NIGHT — Dr. Okafor runs for the lift.', ''], ['The door closes before she reaches it.', ''], ['DOOR LOG: CLOSED BY ECHO.', 'bad']], () => G.clue('cam7')); }, null, 'warn');
        else api.p('CAM-07 ARCHIVE: unreadable — camera network is ' + (S.securityRestored === false ? 'disabled.' : 'offline.'), 'dim');
        if (S.medicalRecordingTrusted !== null) { api.p(S.medicalRecordingTrusted ? 'AUDIO LOG: kept.' : 'AUDIO LOG: deleted at operator request.', 'dim'); return; }
        api.p('ATTACHED: 1 unsent audio log. Playing…', 'warn');
        G.Term.onClose = () => G.Story.recording();
        api.seq([
          ['"If you\'re hearing this, you\'re me. Don\'t panic. You volunteered. I volunteered."', ''],
          ['"ECHO needs a human mind to stay stable. So every time we reach the exit, it takes the memory back and puts us on the floor of Lab 03."', ''],
          ['"It isn\'t cruel. It\'s lonely. That\'s worse."', ''],
          ['"Don\'t let it choose for you. Whatever it says at the door —"', ''],
          ['[ recording ends ]', 'dim']
        ], () => { if (!G.has('audio')) G.give('audio'); api.btn('EJECT RECORDING & LOG OFF', () => api.close(() => G.Story.recording())); });
      };
      const database = () => {
        api.clear(); $status('UNLOCKED');
        api.p('PATIENT DATABASE — 5 records. Storage is damaged: fields are partly corrupted.', 'warn');
        api.p('One of these records is yours. Identify it.', '');
        const rows = [['P-1', 'C', '11', 'WM-77█1'], ['P-2', 'C', String(cyc), 'WM-█7█9'], ['P-3', 'C', '03', 'WM-7█19'], ['P-4', 'B', String(cyc), 'WM-771█'], ['P-5', 'A', '12', 'WM-██19']];
        const tb = el('table', 'tt'); tb.innerHTML = '<tr><th>RECORD</th><th>BAY</th><th>CYCLES</th><th>MONITOR SERIAL</th><th></th></tr>';
        rows.forEach((rw, i) => { const tr = el('tr'); rw.forEach(v => tr.appendChild(el('td', '', v))); const td = el('td'); api.btn('THIS IS ME', () => { if (i !== 1) return api.wrong(3, 'RECORD MISMATCH — biometric check failed.'); G.set('med_id'); G.Audio.sfx('ok'); recording(); }, td); tr.appendChild(td); tb.appendChild(tr); });
        api.node(tb);
        api.hint('Three facts decide it: the serial on your own wrist monitor (inspect it in your backpack), which bay holds the long-term subject (check the beds), and how many cycles that subject has had (the paper records).', 35);
      };
      function $status(s) { document.getElementById('tstatus').textContent = s; }
      if (G.f('med_id')) return recording();
      if (G.f('med_login')) return database();
      api.p('LOGIN REQUIRED — 3-digit operator PIN.', 'warn');
      api.p('SECURITY AUDIT: previous failed attempts, with system feedback:', 'dim');
      const tb = el('table', 'tt');
      [['6 8 2', 'one digit is correct and in the right place'], ['6 1 4', 'one digit is correct but in the wrong place'], ['2 0 6', 'two digits are correct but in the wrong places'], ['7 3 8', 'nothing is correct'], ['7 8 0', 'one digit is correct but in the wrong place']].forEach(rw => { const tr = el('tr'); tr.appendChild(el('td', '', rw[0])); tr.appendChild(el('td', '', rw[1])); tb.appendChild(tr); });
      api.node(tb);
      const pr = api.node(el('div', 'pinrow')), pins = [0, 1, 2].map(() => pr.appendChild(el('div', 'pin', '_')));
      let val = '';
      const draw = () => pins.forEach((p, i) => { p.textContent = val[i] || '_'; });
      const submit = () => {
        if (val.length < 3) return;
        if (val === '042') { G.set('med_login'); G.Audio.sfx('ok'); G.Term.keyFn = null; database(); }
        else { api.wrong(2, 'ACCESS DENIED — attempt logged.'); val = ''; draw(); }
      };
      const press = k => { if (k === 'DEL') val = val.slice(0, -1); else if (k === 'OK') return submit(); else if (val.length < 3) val += k; G.Audio.sfx('beep'); draw(); };
      const row = api.row(); ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', 'OK'].forEach(k => api.btn(k, () => press(k), row));
      api.p('Type digits on the keyboard or click. ENTER to submit.', 'dim');
      G.Term.keyFn = code => { const m = /^(Digit|Numpad)(\d)$/.exec(code); if (m) press(m[2]); else if (code === 'Backspace') press('DEL'); else if (code === 'Enter' || code === 'NumpadEnter') press('OK'); };
      api.hint('Start with "7 3 8 — nothing is correct": cross out 7, 3 and 8 everywhere. Then see what 7 8 0 and 6 8 2 must mean.', 35);
    }
  });

  /* ---------- LEVEL 5 : circuit routing ---------- */
  // tiles: I = straight (N,S), L = elbow (N,E), T = tee (N,E,S). rotation is clockwise quarter turns.
  const BASE = { I: [0, 2], L: [0, 1], T: [0, 1, 2] };
  const LAYOUT = [ // [type, startRotation] — 5 columns x 4 rows
    [['L', 0], ['I', 0], ['L', 3], ['I', 0], ['I', 0]],
    [['I', 1], ['L', 3], ['L', 1], ['T', 1], ['L', 2]],
    [['I', 0], ['T', 0], ['L', 3], ['L', 0], ['L', 1]],
    [['L', 2], ['L', 2], ['L', 1], ['L', 2], ['I', 0]]
  ];
  PZ.circuitSolved = grid => {
    const open = (cx, cy) => BASE[grid[cy][cx].t].map(d => (d + grid[cy][cx].r) % 4);
    const pw = grid.map(rw => rw.map(() => false)), DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
    if (!open(0, 2).includes(3)) return { pw, s1: false, s2: false };
    const q = [[0, 2]]; pw[2][0] = true;
    while (q.length) {
      const [x, y] = q.pop();
      open(x, y).forEach(d => { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx > 4 || ny > 3 || pw[ny][nx]) return; if (open(nx, ny).includes((d + 2) % 4)) { pw[ny][nx] = true; q.push([nx, ny]); } });
    }
    return { pw, s1: pw[0][4] && open(4, 0).includes(1), s2: pw[3][4] && open(4, 3).includes(1) };
  };
  PZ.circuit = () => G.Term.open({
    title: 'REACTOR // EMERGENCY POWER ROUTING', status: 'FUSE: SEATED',
    build(api) {
      if (G.f('rx_power')) { api.p('EMERGENCY POWER SYSTEM: ONLINE', 'ok'); api.p('Both relays energised. Route the output at the distribution panel.', 'dim'); return; }
      api.p('Route power from the FUSE BAY to BOTH relays. Click a segment to rotate it.', 'warn');
      const grid = LAYOUT.map(rw => rw.map(c => ({ t: c[0], r: c[1] })));
      const CS = 84, OX = 120, cv = el('canvas'); cv.id = 'cv-circuit'; cv.width = OX + CS * 5 + 130; cv.height = CS * 4 + 8; cv.style.cursor = 'pointer'; api.node(cv);
      const x = cv.getContext('2d'); let done = false;
      const draw = () => {
        const st = PZ.circuitSolved(grid); x.fillStyle = '#020806'; x.fillRect(0, 0, cv.width, cv.height);
        x.font = '20px VT323, monospace'; x.fillStyle = '#ffb347'; x.fillText('FUSE BAY', 8, 4 + CS * 2 + CS / 2 - 16); x.fillStyle = st.s1 ? '#6dff9a' : '#ff4d5a'; x.fillText('RELAY A', OX + CS * 5 + 30, 4 + CS / 2 + 6); x.fillStyle = st.s2 ? '#6dff9a' : '#ff4d5a'; x.fillText('RELAY B', OX + CS * 5 + 30, 4 + CS * 3 + CS / 2 + 6);
        x.lineCap = 'butt';
        const seg = (ax, ay, bx, by, on) => { x.strokeStyle = on ? '#3ee0c8' : '#24443c'; x.lineWidth = 12; x.shadowColor = '#3ee0c8'; x.shadowBlur = on ? 14 : 0; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); x.shadowBlur = 0; };
        seg(10, 4 + CS * 2.5, OX, 4 + CS * 2.5, true); seg(OX + CS * 5, 4 + CS / 2, OX + CS * 5 + 18, 4 + CS / 2, st.s1); seg(OX + CS * 5, 4 + CS * 3.5, OX + CS * 5 + 18, 4 + CS * 3.5, st.s2);
        for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 5; cx++) {
          const X = OX + cx * CS, Y = 4 + cy * CS, c = grid[cy][cx], mx = X + CS / 2, my = Y + CS / 2;
          x.fillStyle = '#03100c'; x.fillRect(X + 2, Y + 2, CS - 4, CS - 4); x.strokeStyle = '#1b3b33'; x.lineWidth = 1; x.strokeRect(X + 2.5, Y + 2.5, CS - 5, CS - 5);
          BASE[c.t].forEach(d => { const dd = (d + c.r) % 4; seg(mx, my, mx + [0, 1, 0, -1][dd] * CS / 2, my + [-1, 0, 1, 0][dd] * CS / 2, st.pw[cy][cx]); });
          x.fillStyle = st.pw[cy][cx] ? '#3ee0c8' : '#24443c'; x.fillRect(mx - 6, my - 6, 12, 12);
        }
        return st;
      };
      cv.addEventListener('click', e => {
        if (done) return; const b = cv.getBoundingClientRect(), sx = cv.width / b.width, sy = cv.height / b.height;
        const cx = Math.floor(((e.clientX - b.left) * sx - OX) / CS), cy = Math.floor(((e.clientY - b.top) * sy - 4) / CS);
        if (cx < 0 || cy < 0 || cx > 4 || cy > 3) return;
        grid[cy][cx].r = (grid[cy][cx].r + 1) % 4; G.Audio.sfx('switch');
        const st = draw();
        if (st.s1 && st.s2) { done = true; G.set('rx_power'); G.Audio.sfx('power'); G.cam.shake = 1; api.p('BOTH RELAYS ENERGISED — EMERGENCY POWER SYSTEM ONLINE', 'ok'); api.btn('LOG OFF', () => api.close(() => G.Story.powerOn())); G.Term.onClose = () => G.Story.powerOn(); }
      });
      PZ._grid = grid; PZ._ox = OX;
      draw();
      api.hint('Power enters on the left of row three. A tee must split it: one branch climbs to RELAY A on the top row, the other drops to RELAY B on the bottom row.', 40);
    }
  });
})();
