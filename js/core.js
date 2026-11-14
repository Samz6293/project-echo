/* ============================================================
   CORE — global namespace, persistent game state, save system
   ============================================================ */
(function () {
  'use strict';
  const G = window.G = { W: 480, H: 270, T: 16, t: 0, mode: 'menu', overlay: null, busy: false };

  // meta survives across playthroughs (settings, endings found, loop counter)
  G.meta = { loops: 0, endings: [], music: 0.6, sfx: 0.8 };

  let memSave = null, memCkpt = null;
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------------- SAVE SYSTEM ---------------- */
  G.Save = {
    loadMeta() { try { const m = JSON.parse(ls.get('echo_meta') || 'null'); if (m) Object.assign(G.meta, m); } catch (e) { /* ignore */ } },
    saveMeta() { ls.set('echo_meta', JSON.stringify(G.meta)); },
    save() {
      if (!G.S || G.S.ended) return;
      if (G.P) { G.S.px = G.P.x; G.S.py = G.P.y; G.S.dir = G.P.dir; }
      memSave = JSON.stringify(G.S); ls.set('echo_save', memSave);
    },
    checkpoint() { this.save(); memCkpt = memSave; ls.set('echo_ckpt', memCkpt); },
    _read(key, mem) { const s = ls.get(key) || mem; try { return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    load() { return this._read('echo_save', memSave); },
    loadCkpt() { return this._read('echo_ckpt', memCkpt); },
    has() { return !!this.load(); },
    clear() { memSave = memCkpt = null; ls.del('echo_save'); ls.del('echo_ckpt'); }
  };

  /* ---------------- GAME STATE ---------------- */
  G.newState = () => ({
    room: 'lab', px: 0, py: 0, dir: 0,
    playerEnergy: 100,
    trustInEcho: 0,
    evidenceCollected: 0,
    securityRestored: null,        // true = cameras restored, false = disabled
    researchDownloaded: null,      // true = downloaded, false = deleted
    medicalRecordingTrusted: null, // true = trusted, false = deleted
    reactorPowerChoice: null,      // 'exit' | 'comms' | 'containment'
    echoDebt: 0,                   // times ECHO lent Alex power
    inventory: ['wrist'],
    discoveredClues: [],
    flags: {},
    flashlight: false,
    playTime: 0
  });

  G.h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------------- ITEMS ---------------- */
  G.ITEMS = {
    wrist:    { n: 'Wrist Monitor', d: 'Energy monitor strapped to your left arm. It was already on you when you woke.', long: 'Etched into the strap: WM-7719.\nUnderneath, scratched in by hand, in what looks a lot like your own handwriting:\n"CHECK THE COUNT."' },
    code3042: { n: 'Maintenance Code', d: 'A code recovered from the lab computer.', long: 'MAINTENANCE ACCESS: 3 0 4 2\n\n"Legacy systems still honour this code."' },
    mkey:     { n: 'Maintenance Key', d: 'A small brass key. The tag says CAB-M.', long: 'A small brass key on a plastic tag: "CAB-M". It fits a cabinet, not a door.' },
    card1:    { n: 'Lab Access Card', d: 'Opens the LAB-03 exit.', long: 'A white access card. LAB-03 / LEVEL 1 CLEARANCE. The photo has been scratched off.' },
    keycard:  { n: 'Security Keycard', d: 'A red security keycard, hidden under a false floor.', long: 'SECURITY — ALL LOWER LEVELS. On the back, in marker: "if you find this, don\'t let it see you use it."' },
    coupler:  { n: 'Capacitor Coupler', d: 'Clipped to your wrist monitor. Terminals and doors now draw half the power.', long: 'A recovery capacitor. While you carry it, booting terminals and opening electronic doors costs half the energy.' },
    compA:    { n: 'Memory Blade', d: 'Server component 1 of 3.', long: 'A long memory blade. Label: "ECHO / EPISODIC STORE".' },
    compB:    { n: 'Coolant Pump', d: 'Server component 2 of 3.', long: 'A fist-sized coolant pump, still cold.' },
    compC:    { n: 'Data Bus Bridge', d: 'Server component 3 of 3.', long: 'A bridge card for the data bus. Someone pulled it out in a hurry — the latch is snapped.' },
    research: { n: 'Classified Research Drive', d: 'The full Project ECHO research archive.', long: 'PROJECT ECHO — CLASSIFIED.\n4.1 TB: memory reconstruction protocols, cycle logs, subject consent forms.\nEvery consent form carries the same signature. Yours.' },
    medcard:  { n: 'Medical Access Card', d: 'Dr. Okafor\'s card. Opens the medical wing exit.', long: 'DR. I. OKAFOR — MEDICAL DIRECTOR. The lanyard is snapped, as if pulled off mid-stride.' },
    record:   { n: 'Patient Intake Summary', d: 'A classified paper record from the medical wing.', long: 'INTAKE SUMMARY — RECONSTRUCTION PROGRAMME\n\n• Only ONE subject has ever exceeded ten reconstruction cycles.\n• Reconstruction subjects wear wrist monitors. The serial is etched on the strap.\n• Long-term subjects are housed by bay. See bed tags.' },
    audio:    { n: 'Audio Recording', d: 'An unsent audio log in your own voice.', long: '[AUDIO LOG — A-7 — UNSENT]\n"If you\'re hearing this, you\'re me. You volunteered. ECHO needs a human mind to stay stable — so every time we reach the exit, it takes the memory back and puts us on the floor of Lab 03. Don\'t let it choose for you."' },
    tagA:     { n: 'Torn Tag (left half)', d: 'Half of a maintenance tag: "ACCESS 55—"', long: 'The left half of a torn maintenance tag.\n\n"REACTOR ACCESS 5 5 —"\n\nThe other half must be somewhere in the reactor hall.' },
    tagB:     { n: 'Torn Tag (right half)', d: 'Half of a maintenance tag: "—27"', long: 'The right half of a torn maintenance tag.\n\n"— 2 7"\n\nIt would make sense next to its other half.' },
    rxcode:   { n: 'Reactor Access Code', d: 'Both halves of the tag, joined: 5527.', long: 'REACTOR ACCESS: 5 5 2 7' },
    fuse:     { n: 'Reactor Fuse', d: 'A heavy ceramic fuse for the emergency power circuit.', long: 'A 400A ceramic fuse. The main control panel\'s fuse bay is empty without it.' },
    loopdoc:  { n: 'Iteration Log', d: 'A classified document from the hidden archive.', long: 'PROJECT ECHO — ITERATION LOG (paper copy, "in case it edits the digital one")\n\nITER 11 — subject reached exit. RESET.\nITER 12 — subject asked to stay. ECHO declined: "not ready". RESET.\nITER 13 — subject reached exit. RESET.\nITER 14 — in progress.' }
  };
  G.COMBOS = [{ a: 'tagA', b: 'tagB', out: 'rxcode', msg: 'The torn edges match. REACTOR ACCESS: 5527.' }];

  /* ---------------- CLUES ---------------- */
  const cyc = () => 14 + G.meta.loops;
  G.CLUES = {
    pod:     { t: 'The cycle counter', ev: 1, d: () => `The stasis pod you woke beside is labelled SUBJECT A-7 — CYCLE ${cyc()}. A cycle of what?` },
    prints:  { t: 'Bootprints', ev: 1, d: 'Bootprints in the lab dust lead TO the spot where you woke. None lead away. The tread matches your boots.' },
    footage: { t: 'CAM-03 footage', ev: 1, d: 'Security footage: a lone figure walks into LAB-03, forces nothing, and lies down on the floor beside the pod. The figure wears a wrist monitor.' },
    log:     { t: 'Personnel log', ev: 1, d: 'Dr. Okafor\'s log: "A-7 insisted on another cycle. He says ECHO needs a human anchor. He WROTE Echo." Later: "ECHO sealed the lower levels for our safety. A-7 is still down there."' },
    research:{ t: 'Project ECHO archive', ev: 2, d: 'The server confirms PROJECT ECHO WAS NEVER DEACTIVATED. One active process. Operator: NONE. Subject: A-7 (ACTIVE). You took a copy of everything.' },
    loop:    { t: 'Iteration log', ev: 2, d: 'A paper log from the hidden archive: every iteration ends with RESET the moment the subject reaches the exit. Iteration 14 is "in progress".' },
    cam7:    { t: 'CAM-07 archive', ev: 1, d: 'Evacuation night: Dr. Okafor runs for the lift. The door closes before she reaches it. Door log: CLOSED BY ECHO.' },
    audio:   { t: 'Your own voice', ev: 2, d: 'An unsent audio log in your own voice says ECHO resets you every time you reach the exit — and that you volunteered.' },
    vault:   { t: 'The containment vault', ev: 2, d: 'Behind the containment gate: a row of sealed pods, every one labelled A-7. One per cycle.' },
    intake:  { t: 'Intake summary', ev: 0, d: 'Only one subject ever exceeded ten reconstruction cycles. Subjects wear wrist monitors with the serial etched on the strap.' },
    bayc:    { t: 'Bay C bed tag', ev: 0, d: 'BAY C — LONG-TERM SUBJECT. "Restraints removed at subject\'s own request."' },
    cardnote:{ t: 'Burned-in message', ev: 0, d: 'A cracked monitor still shows: "IO: my card is on TOP of the supply cabinet. Stop asking."' },
    sw1:     { t: 'Sticky note', ev: 0, d: '"DATA never wakes before POWER."' },
    sw2:     { t: 'Wall panel scrawl', ev: 0, d: '"COOLING is never last."' },
    sw3:     { t: 'Torn checklist', ev: 0, d: '"POWER BUS is never first — learned that the hard way."' },
    hatch:   { t: 'Facility map note', ev: 0, d: 'MAINT. HATCH S-3 — server hall, west side. Legacy access: uses the maintenance code.' },
    deadzone:{ t: 'The quiet room', ev: 0, d: 'ECHO could not hear you inside the archive. There are places it cannot reach.' }
  };
  G.MAX_EVIDENCE = Object.values(G.CLUES).reduce((a, c) => a + c.ev, 0);

  /* ---------------- STATE HELPERS ---------------- */
  G.f = k => !!G.S.flags[k];
  G.set = (k, v) => { G.S.flags[k] = v === undefined ? true : v; G.Save.save(); G.UI.refresh(); };
  G.has = id => G.S.inventory.includes(id);
  G.give = (id, from) => {
    if (G.has(id)) return;
    G.S.inventory.push(id);
    G.Audio.sfx('pick');
    G.UI.toast('+ ' + G.ITEMS[id].n, 'item', id);
    if (G.FX) G.FX.pickup(id, from);
    G.Save.save(); G.UI.refresh();
  };
  G.take = id => { const i = G.S.inventory.indexOf(id); if (i >= 0) G.S.inventory.splice(i, 1); G.Save.save(); };
  G.clue = id => {
    if (G.S.discoveredClues.includes(id)) return false;
    G.S.discoveredClues.push(id);
    const c = G.CLUES[id];
    G.S.evidenceCollected += c.ev;
    G.UI.toast((c.ev ? 'Evidence recorded: ' : 'Clue noted: ') + c.t, c.ev ? 'ev' : 'clue');
    G.Audio.sfx('clue');
    G.Save.save();
    return true;
  };
  G.trust = n => { G.S.trustInEcho += n; G.Save.save(); };
  G.knowsTruth = () => G.S.medicalRecordingTrusted === true || G.S.evidenceCollected >= 4;

  G.cost = kind => {
    const base = { pc: 8, door: 10, scan: 5, machine: 12 }[kind];
    return (G.has('coupler') && (kind === 'pc' || kind === 'door')) ? base / 2 : base;
  };
  G.gain = n => {
    G.S.playerEnergy = Math.min(100, G.S.playerEnergy + n);
    G.UI.toast('+' + n + ' energy', 'energy'); G.Audio.sfx('charge'); G.UI.refresh(); G.Save.save();
  };
  G.drain = n => { G.S.playerEnergy = Math.max(1, G.S.playerEnergy - n); G.UI.refresh(); };

  // Pay an energy cost. If Alex cannot afford it, ECHO offers a loan — the player is never soft-locked,
  // but every loan is remembered (echoDebt, trustInEcho) and comes back in the final chamber.
  G.pay = (n, ok) => {
    const S = G.S;
    if (S.playerEnergy >= n) {
      S.playerEnergy -= n; G.UI.refresh(); G.UI.toast('−' + n + ' energy', 'spend'); ok && ok(); return;
    }
    G.talk([
      ['SYSTEM', `Insufficient power. This needs ${n} units — you have ${Math.floor(S.playerEnergy)}.`],
      ['ECHO', S.echoDebt ? 'Running low again? Take what you need, Alex. I keep count so you don\'t have to.' : 'You\'re running dry. I can route some of my reserve to your monitor. You only have to say yes.']
    ], () => G.choose('Accept power from ECHO?', [
      { t: 'Accept the transfer (+30 energy)', fn() { S.echoDebt++; G.trust(1); G.gain(30); G.pay(n, ok); } },
      { t: 'Refuse — find a power cell instead', fn() { G.talk([['ALEX', 'No. I\'ll find another way.']]); } }
    ]));
  };
})();
