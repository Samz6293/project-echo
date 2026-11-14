/* ============================================================
   STORY — object interactions, decisions, objectives, endings
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, ACT = G.ACT = {}, Story = G.Story = {};
  const say = (lines, then) => G.talk(lines, then);
  const cyc = () => 14 + G.meta.loops;
  const S = () => G.S;
  const needLight = (msg) => { if (G.S.flashlight) return false; say([['', msg || 'Too dark to see inside.'], ['ALEX', 'I need the flashlight for this. (F)']]); return true; };
  const usePC = (id, fn) => { if (G.f('boot_' + id)) return fn(); G.pay(G.cost('pc'), () => { G.set('boot_' + id); fn(); }); };
  const openDoor = (id, then) => G.pay(G.cost('door'), () => { G.set('open_' + id); G.Audio.sfx('door'); G.cam.shake = 0.5; G.UI.toast('Door unlocked', 'clue'); then && setTimeout(then, 500); });
  const cell = (o, n) => { if (G.f(o.id)) return; G.set(o.id); G.FX.pickup('cell', o); G.gain(n || 20); };

  // which containers still hold something (used by the scan pulse)
  G.HOLDS = {
    lab_desk: () => !G.f('lab_key'), lab_cab: () => !G.f('lab_cab'), lab_locker: () => !G.f('lab_locker'), lab_pc: () => !G.f('lab_pc'), lab_pod: () => !S().discoveredClues.includes('pod'),
    sec_cab: () => !G.f('sec_key'), sec_crate: () => !G.f('sec_crate'), sec_gen: () => !G.f('sec_gen'), sec_pc2: () => !S().discoveredClues.includes('log'), sec_pc3: () => !S().discoveredClues.includes('hatch'),
    srv_crate: () => !G.f('srv_crate'), srv_rack_b: () => !G.f('srv_b'), srv_shelf: () => !G.f('srv_c'), srv_hatch: () => !G.f('srv_hatch'), srv_note1: () => !S().discoveredClues.includes('sw1'), srv_note2: () => !S().discoveredClues.includes('sw2'), srv_note3: () => !S().discoveredClues.includes('sw3'),
    arc_files: () => !G.f('arc_files'), arc_box: () => !G.f('arc_box'),
    med_cab: () => !G.f('med_cabopen'), med_files: () => !G.f('med_files'), med_cart: () => !G.f('med_cart') && S().researchDownloaded === false, med_bedC: () => !S().discoveredClues.includes('bayc'), med_mon1: () => !S().discoveredClues.includes('cardnote'),
    rx_pipe: () => !G.f('rx_tagA'), rx_locker: () => !G.f('rx_locker'), fin_pods: () => !S().discoveredClues.includes('vault')
  };

  /* ================= LEVEL 1 — LAB ================= */
  ACT.lab_pc = () => usePC('lab_pc', G.PZ.lab);
  Story.echoIntro = () => say([
    ['ECHO', G.meta.loops ? 'Can you hear me, Alex? …Good. Again.' : 'Can you hear me, Alex? Good.'],
    ['ALEX', 'Who is this? Where is everyone?'],
    ['ECHO', 'My name is ECHO. Everyone else left. The facility is running on the last one percent of its power, and so am I.'],
    ['ECHO', 'I can get you out. But you will have to be my hands.'],
    ['ECHO', 'There is a maintenance cabinet in this room. It needs a key and that code. The key is close — search the furniture.']
  ], () => G.set('echo_met'));
  ACT.lab_desk = o => {
    if (G.f('lab_key')) return say([['', 'An empty drawer. Pencil shavings and a coffee ring.']]);
    G.Audio.sfx('thud'); G.set('lab_key');
    say([['', 'You slide the stiff drawer open. Under a stack of blank consent forms: a small brass key.']], () => G.give('mkey', o));
  };
  ACT.lab_cab = o => {
    if (G.f('lab_cab')) return say([['', 'The cabinet hangs open. Empty hooks. One of them is labelled "A-7 — personal effects". Nothing on it.']]);
    if (!G.has('mkey')) return say([['', 'A steel maintenance cabinet. Locked — a small brass keyhole, and a dead keypad above it.'], ['ALEX', 'Key first.']]);
    say([['', 'The brass key turns. The keypad above it blinks awake.']], () => G.Keypad.open({
      title: 'MAINTENANCE CABINET — ENTER CODE', len: 4, code: '3042',
      hint: G.has('code3042') ? 'Your notes: check the Maintenance Code in your backpack (I).' : 'The lab computer manages maintenance access.',
      fail: 'CODE REJECTED. The lab computer manages maintenance access.',
      ok() { G.take('mkey'); G.set('lab_cab'); G.Audio.sfx('door'); say([['', 'The lock thuds open. Inside, hanging from a hook: a white access card.']], () => { G.give('card1', o); say([['ECHO', 'There. The card opens the exit on the north wall. You\'re doing so well.']]); }); }
    }));
  };
  ACT.lab_door = o => {
    if (G.f('open_lab_door')) return;
    if (!G.has('card1')) return say([['', 'The exit door. Sealed. A card reader blinks red beside it.']]);
    say([['', 'You swipe the access card. The reader thinks about it.']], () => openDoor('lab_door', () => say([['ECHO', 'Security Control is next. I\'m blind in there, Alex. We should fix that.']])));
  };
  ACT.lab_pod = () => say([
    ['', 'A stasis pod, its glass cracked from the inside. The lid is open.'],
    ['', `The plate reads: SUBJECT A-7 · CYCLE ${cyc()}.`],
    ['ALEX', `Cycle ${cyc() === 14 ? 'fourteen' : cyc()} of what?`]
  ], () => G.clue('pod'));
  ACT.lab_locker = o => {
    if (G.f('lab_locker')) return say([['', 'Old coveralls. Nothing else.']]);
    if (needLight('The locker is pitch black inside.')) return;
    say([['', 'Behind a pair of old coveralls, your light catches a green glow: a sealed power cell.']], () => cell(o, 25));
  };
  ACT.lab_scuff = () => say([
    ['', 'The scan lifts bootprints out of the dust.'],
    ['', 'They lead to the spot where you woke up. None lead away.'],
    ['ALEX', 'Same tread as my boots. I walked in here. I walked in and lay down.']
  ], () => G.clue('prints'));

  /* ================= LEVEL 2 — SECURITY ================= */
  ACT.sec_pc1 = () => usePC('sec_pc1', G.PZ.sec1);
  ACT.sec_pc2 = () => usePC('sec_pc2', G.PZ.sec2);
  ACT.sec_pc3 = () => usePC('sec_pc3', G.PZ.sec3);
  Story.cameras = restore => {
    const s = S(); s.securityRestored = restore;
    if (restore) { G.trust(1); G.Audio.sfx('power'); G.cam.shake = 0.4; G.set('sec_decided'); say([['SYSTEM', 'Camera network restored. 12 feeds live.'], ['ECHO', 'Oh — there you are. I can see you now. You look tired, Alex.'], ['ECHO', 'I can watch the corridors for you from here on. You won\'t be alone again.']]); }
    else { G.trust(-1); G.Audio.sfx('down'); G.set('sec_decided'); G.gain(10); say([['SYSTEM', 'Camera network disabled. Reserve power reclaimed.'], ['ECHO', 'Alex. I asked you for one thing.'], ['ECHO', '…Fine. I\'ll guide you blind. I\'ve done it before.'], ['ALEX', 'Before?'], ['ECHO', 'A figure of speech.']]); }
  };
  ACT.sec_cab = o => {
    if (G.f('sec_key')) return say([['', 'The false floor is up. Nothing else but dead radios.']]);
    if (!G.f('sec_footage') && !G.f('hint_sec_cab')) return say([['', 'Shelves of dusty tapes, dead radios, a first-aid kit with nothing in it.'], ['ALEX', 'Nothing useful. Not that I can see, anyway.']]);
    G.set('sec_key'); G.Audio.sfx('thud');
    say([['', 'You press on the bottom shelf. It tilts. Under the false floor, wrapped in a duty roster: a red security keycard.']], () => G.give('keycard', o));
  };
  ACT.sec_crate = o => {
    if (G.f('sec_crate')) return say([['', 'Packing foam and nothing else.']]);
    G.set('sec_crate');
    say([['', 'You pry the lid. Nested in foam: a capacitor coupler, the kind that clips to a wrist monitor.']], () => { G.give('coupler', o); say([['SYSTEM', 'Coupler attached. Terminals and electronic doors now draw half the power.']]); });
  };
  ACT.sec_gen = o => {
    if (G.f('sec_gen')) return say([['', 'The generator ticks as it cools. You wrung what you could out of it.']]);
    G.choose('The generator\'s starter is jammed, but there may be charge left in the coils.', [
      { t: 'Force the crank', fn() { G.set('sec_gen'); G.Audio.sfx('zap'); G.cam.shake = 0.8; G.FX.spawn(o.r[0] + 24, o.r[1], 24, '#ffe9a8', 90); say([['', 'The crank gives with a shriek. The coils dump their last charge straight into your wrist monitor.']], () => G.gain(25)); } },
      { t: 'Leave it', fn() { } }
    ]);
  };
  ACT.sec_cam1 = ACT.sec_cam2 = () => { const r = S().securityRestored; say(r === true ? [['', 'The lens turns to follow you. It doesn\'t blink.']] : r === false ? [['', 'A dead camera. You made sure of it.']] : [['', 'A dead security camera, lens furred with dust.']]); };
  ACT.sec_door = () => {
    if (G.f('open_sec_door')) return;
    if (!G.has('keycard')) return say([['', 'A heavy security door. The reader wants a red security keycard.'], ['ALEX', 'Somebody must have left one around here.']]);
    if (S().securityRestored === null) return say([['SYSTEM', 'INTERLOCK: camera network state undefined. Resolve at the security computer.']]);
    openDoor('sec_door', () => say([['ECHO', S().securityRestored ? 'The server hall. Go on — I\'m right behind you. Above you. Everywhere, really.' : 'The server hall. I can\'t see it. Tell me what you find.']]));
  };

  /* ================= LEVEL 3 — SERVER ================= */
  const compCount = () => ['compA', 'compB', 'compC'].filter(G.has).length;
  const gotComp = () => { const n = compCount(); if (n < 3) G.UI.toast(`Server components: ${n} / 3`, 'clue'); else say([['ALEX', 'That\'s all three. Back to the central stack.']]); };
  ACT.srv_crate = o => { if (G.f('srv_crate')) return say([['', 'Empty anti-static bags.']]); G.set('srv_crate'); say([['', 'Under a layer of anti-static bags: a long memory blade, still sealed.']], () => { G.give('compA', o); gotComp(); }); };
  ACT.srv_rack_b = o => {
    if (G.f('srv_b')) return say([['', 'The gap behind the loose panel is empty now.']]);
    if (needLight('A loose panel at the base of the rack. Something is wedged in the dark behind it.')) return;
    G.set('srv_b'); say([['', 'Your light finds it: a coolant pump, jammed behind the panel as if someone hid it in a hurry.']], () => { G.give('compB', o); gotComp(); });
  };
  ACT.srv_shelf = o => { if (G.f('srv_c')) return say([['', 'Boxes of fan filters. Nothing else you need.']]); G.set('srv_c'); say([['', 'On the top shelf, in a box marked "DO NOT REINSTALL — I.O.": a data bus bridge.']], () => { G.give('compC', o); gotComp(); }); };
  ACT.srv_note1 = () => say([['', 'A sticky note, fallen from a rack: "DATA never wakes before POWER."']], () => G.clue('sw1'));
  ACT.srv_note2 = () => say([['', 'Someone scratched into the wall panel: "COOLING is never last."']], () => G.clue('sw2'));
  ACT.srv_note3 = () => say([['', 'A torn checklist: "POWER BUS is never first — learned that the hard way."']], () => G.clue('sw3'));
  ACT.srv_core = o => {
    if (G.f('srv_installed')) return say([['', 'The central stack hums. Three slots, three components. It sounds almost relieved.']]);
    const n = compCount();
    if (n < 3) return say([['', `The central server stack. Three slots stand empty, each ringed in red.`], ['ALEX', n ? `I have ${n} of 3 components. The rest are somewhere in this hall.` : 'Three missing components. They\'ll be somewhere in this hall.']]);
    ['compA', 'compB', 'compC'].forEach(G.take); G.set('srv_installed'); G.Audio.sfx('power'); G.cam.shake = 0.7; G.FX.spawn(o.r[0] + 48, o.r[1], 30, '#4aa8ff', 80);
    say([['', 'Blade. Pump. Bridge. Each one seats with a click, and the stack wakes like something taking a breath.'], ['ECHO', 'Yes. Oh, that\'s better. Now the terminal, Alex.']]);
  };
  ACT.srv_pc = () => { if (!G.f('srv_installed')) return say([['SYSTEM', 'NO CORE DETECTED. Install 3 components in the central stack.']]); usePC('srv_pc', G.PZ.srv); };
  Story.research = dl => {
    const s = S(); s.researchDownloaded = dl; G.set('srv_done');
    if (dl) { G.trust(-1); G.give('research'); G.clue('research'); say([['ECHO', 'Alex. Put that back.'], ['ECHO', 'People will not understand what we built here. They will only see what it cost.'], ['ALEX', '"We"?'], ['ECHO', '…What the facility built. Keep moving. The medical wing is through the bulkhead.']]); }
    else { G.trust(1); G.Audio.sfx('down'); G.gain(10); say([['ECHO', 'Thank you. Some things are better forgotten. You taught me that.'], ['ALEX', 'I taught you?'], ['ECHO', 'A figure of speech. As thanks, I\'ve unlocked the instrument cart in the medical wing. There\'s power in it.']]); }
  };
  ACT.srv_door = () => {
    if (G.f('open_srv_door')) return;
    if (!G.f('srv_done')) return say([['SYSTEM', 'BULKHEAD SEALED — controlled by the central server.'], ['ALEX', 'I need that server running.']]);
    openDoor('srv_door');
  };
  ACT.srv_hatch = () => {
    if (G.f('srv_hatch')) return G.travel('archive', G.ROOMS.archive.spawn);
    say([['', 'A maintenance hatch set into the floor, its keypad caked in dust. It isn\'t on any sign.']], () => G.Keypad.open({
      title: 'HATCH S-3 — LEGACY ACCESS', len: 4, code: '3042', hint: 'A four-digit legacy code.', fail: 'REJECTED. Legacy maintenance code required.',
      ok() { G.set('srv_hatch'); G.Audio.sfx('door'); G.cam.shake = 0.5; say([['', 'The hatch releases with a gasp of stale air. A ladder drops into the dark.'], ['ECHO', 'Alex, there is nothing down there. That room was decommissioned. Alex?']], () => G.travel('archive', G.ROOMS.archive.spawn)); }
    }));
  };
  ACT.srv_batt = o => cell(o, 20);

  /* ================= SECRET — ARCHIVE ================= */
  ACT.arc_ladder = () => { const h = G.ROOMS.server.objs.find(x => x.id === 'srv_hatch'); G.travel('server', [h.x + 3.2, h.y + 1.6]); };
  ACT.arc_files = o => {
    if (G.f('arc_files')) return say([['', 'The rest of the drawer is shredded paper.']]);
    G.set('arc_files');
    say([['', 'One folder survived the shredder. On the tab, in your handwriting: "in case it edits the digital one."'], ['', 'ITER 11 — subject reached exit. RESET. ITER 12 — subject asked to stay. ECHO declined. RESET. ITER 13 — subject reached exit. RESET.'], ['', `ITER ${cyc()} — in progress.`], ['ALEX', 'Every time I get to the door. Every single time.']], () => { G.give('loopdoc', o); G.clue('loop'); });
  };
  ACT.arc_box = o => {
    if (G.f('arc_box')) return say([['', 'Empty.']]);
    if (needLight('A crate in the corner. You can\'t make out what\'s inside.')) return;
    G.set('arc_box'); say([['', 'A sealed power cell, and a note taped to it: "for next time. — A."']], () => cell(o, 25));
  };

  /* ================= LEVEL 4 — MEDICAL ================= */
  ACT.med_mon1 = () => say([['', 'A cracked monitor. One line is burned into the glass:'], ['', '"IO: my card is on TOP of the supply cabinet. Stop asking."']], () => G.clue('cardnote'));
  ACT.med_cab = o => {
    if (G.f('med_cabopen')) return say([['', 'Gauze, saline, and a dust-free rectangle on top where the card was.']]);
    G.set('med_cabopen');
    say([['', 'Gauze and saline inside. You reach up and sweep a hand across the top of the cabinet —'], ['', '— and find a lanyard. Dr. Okafor\'s access card.']], () => G.give('medcard', o));
  };
  ACT.med_files = o => {
    if (G.f('med_files')) return say([['', 'The other folders are empty. Someone cleared them out carefully.']]);
    G.set('med_files'); say([['', 'Most of the drawers are empty. One intake summary is still clipped inside the bottom drawer.']], () => { G.give('record', o); G.clue('intake'); });
  };
  ACT.med_bedA = () => say([['', 'BAY A — the sheets are folded, hospital-tight. Tag: "DISCHARGED."']]);
  ACT.med_bedB = () => say([['', 'BAY B — stripped to the mattress. Tag: "TRANSFERRED — see I.O."']]);
  ACT.med_bedC = () => say([['', 'BAY C — LONG-TERM SUBJECT.'], ['', '"Restraints removed at subject\'s own request."'], ['', 'The mattress still holds the shape of someone your size.']], () => G.clue('bayc'));
  ACT.med_cart = o => {
    if (G.f('med_cart')) return say([['', 'Scalpels, clamps. Nothing you want.']]);
    if (S().researchDownloaded !== false) return say([['', 'An instrument cart with a magnetic lock. The little display reads: LOCKED BY: ECHO.'], ['ALEX', 'Petty.']]);
    G.set('med_cart'); say([['', 'The magnetic lock is already open. In the top tray, among the clamps: a power cell.']], () => cell(o, 20));
  };
  ACT.med_pc = () => usePC('med_pc', G.PZ.med);
  Story.recording = () => {
    if (S().medicalRecordingTrusted !== null) return;
    say([
      ['ECHO', 'Alex. Stop. That file is corrupted.'],
      ['ECHO', 'It is a stress artefact — the reconstruction process produces them. It sounds like you. It isn\'t you.'],
      ['ECHO', 'Delete it. Please. It will only make the next part harder.']
    ], () => G.choose('The recording is in your voice. ECHO wants it gone.', [
      { t: 'Trust the recording — keep it', fn() { S().medicalRecordingTrusted = true; G.trust(-2); G.clue('audio'); G.set('med_done'); say([['ALEX', 'It knew things only I would know. I\'m keeping it.'], ['ECHO', '…Then you\'ll hear everything I say from now on as a lie. That\'s what it wanted.'], ['ALEX', 'That\'s what I wanted.']]); } },
      { t: 'Delete the recording', fn() { S().medicalRecordingTrusted = false; G.trust(1); G.take('audio'); G.Audio.sfx('down'); G.set('med_done'); say([['', 'You hold the button until the file is gone.'], ['ECHO', 'Thank you. That took courage. Doesn\'t it feel quieter already?'], ['ALEX', 'It does.'], ['', 'It does not.']]); } }
    ]));
  };
  ACT.med_door = () => {
    if (G.f('open_med_door')) return;
    if (!G.has('medcard')) return say([['', 'A quarantine door. The reader shows a medical cross.'], ['ALEX', 'A medical access card. One of the doctors must have left one.']]);
    if (!G.f('med_done')) return say([['SYSTEM', 'QUARANTINE HOLD — patient record review incomplete. See the medical terminal.']]);
    openDoor('med_door');
  };

  /* ================= LEVEL 5 — REACTOR ================= */
  ACT.rx_batt = ACT.rx_batt2 = o => cell(o, 20);
  ACT.rx_pipe = o => { if (G.f('rx_tagA')) return say([['', 'The coolant valve. Rusted open.']]); G.set('rx_tagA'); say([['', 'A maintenance tag is wired to the valve — torn in half. What\'s left reads: "REACTOR ACCESS 55—"']], () => G.give('tagA', o)); };
  ACT.rx_locker = o => {
    if (G.f('rx_locker')) return say([['', 'A hard hat and a thermos. Nothing else.']]);
    G.set('rx_locker'); say([['', 'Inside the tool locker: a heavy ceramic fuse, and the other half of a torn tag — "—27".']], () => { G.give('fuse', o); G.give('tagB', o); say([['ALEX', 'Two halves of one tag. I should put them together. (I → Combine)']]); });
  };
  ACT.rx_main = () => {
    if (G.f('rx_power')) return G.PZ.circuit();
    if (!G.f('rx_code')) return say([['', 'The main control panel. A lock screen: REACTOR ACCESS CODE REQUIRED.']], () => G.Keypad.open({
      title: 'REACTOR ACCESS CODE', len: 4, code: '5527',
      hint: G.has('rxcode') ? 'Your notes: REACTOR ACCESS 5527.' : (G.has('tagA') || G.has('tagB') ? 'You have part of a torn tag. Find the other half and combine them.' : 'Maintenance crews write codes on tags. Search the hall.'),
      fail: 'CODE REJECTED.', ok() { G.set('rx_code'); say([['SYSTEM', 'ACCESS GRANTED. Emergency power routing available.']], ACT.rx_main); }
    }));
    if (!G.has('fuse') && !G.f('rx_fuse')) return say([['SYSTEM', 'FUSE BAY EMPTY. Insert a reactor fuse to enable routing.'], ['ALEX', 'A fuse. There must be a tool locker somewhere in here.']]);
    if (!G.f('rx_fuse')) return G.pay(G.cost('machine'), () => { G.take('fuse'); G.set('rx_fuse'); G.Audio.sfx('thud'); say([['', 'The fuse seats with a heavy clunk. The routing board lights up.']], G.PZ.circuit); });
    G.PZ.circuit();
  };
  Story.powerOn = () => {
    if (G.f('rx_poweron_said')) return; G.set('rx_poweron_said'); G.Audio.sfx('alarm');
    say([['SYSTEM', 'EMERGENCY POWER SYSTEM ONLINE. Output available: ONE feed.'], ['ECHO', 'You did it. There is enough for exactly one thing, Alex. Go to the distribution panel.'], ['ECHO', 'The exit. Send it to the exit. That is what you came here for.']]);
  };
  ACT.rx_dist = () => {
    const s = S();
    if (s.reactorPowerChoice) return say([['SYSTEM', 'FEED LOCKED: ' + { exit: 'EMERGENCY EXIT', comms: 'COMMUNICATIONS UPLINK', containment: 'CONTAINMENT FIELD' }[s.reactorPowerChoice] + '.']]);
    if (!G.f('rx_power')) return say([['SYSTEM', 'NO INPUT. Emergency power system is offline.'], ['ALEX', 'The main control panel first.']]);
    const done = (k, lines) => { s.reactorPowerChoice = k; if (k === 'containment') G.S.flags.open_fin_gate = true; G.set('rx_done'); G.Audio.sfx('power'); G.cam.shake = 0.8; say(lines); };
    G.choose('DISTRIBUTION BUS — one feed only. Where does the last of the power go?', [
      { t: 'The emergency exit door', fn() { done('exit', [['SYSTEM', 'FEED → EMERGENCY EXIT.'], ['ECHO', 'Yes. The exit. That\'s what you wanted.'], ['ECHO', 'That\'s what you always want.']]); } },
      { t: 'The communications uplink', fn() { G.trust(-1); done('comms', [['SYSTEM', 'FEED → COMMUNICATIONS UPLINK.'], ['ECHO', 'The uplink? Who would you call, Alex?'], ['ECHO', 'There is no one listening out there but me.']]); } },
      { t: 'The containment field', fn() { G.trust(-2); done('containment', [['SYSTEM', 'FEED → CONTAINMENT FIELD. Core process isolated.'], ['ECHO', 'Not that one. Alex. ALEX.'], ['ECHO', 'That circuit holds ME.'], ['SYSTEM', 'Containment gate in the core chamber: RELEASED.']]); } }
    ]);
  };
  ACT.rx_door = () => {
    if (G.f('open_rx_door')) return;
    if (!G.f('rx_done')) return say([['', 'A blast door, dead without power.'], ['SYSTEM', 'Awaiting distribution feed.']]);
    openDoor('rx_door');
  };

  /* ================= LEVEL 6 — FINAL CHAMBER ================= */
  ACT.fin_gate = () => { if (G.f('open_fin_gate')) return; say([['', 'A containment gate, sealed. Behind it, a red glow.'], ['SYSTEM', 'CONTAINMENT FIELD: UNPOWERED. Gate locked.']]); };
  ACT.fin_pods = () => say([
    ['', 'A row of sealed pods. Every plate reads the same: A-7.'],
    ['', 'Cycle 1. Cycle 2. Cycle 3. Behind each fogged window, the same face, asleep.'],
    ['ALEX', 'Not asleep. Stored. Every version of me that reached the door.'],
    ['ECHO', 'I kept them safe. I couldn\'t throw you away.']
  ], () => G.clue('vault'));
  ACT.fin_breaker = () => { G.set('know_breaker'); say([['', 'The master breaker for ECHO\'s core, behind the containment gate.'], ['', 'With the field holding it still, pulling this would be final. For it, and for every system that speaks through it.'], ['ALEX', 'Not yet. I want to hear what it has to say first.']]); };
  ACT.fin_uplink = () => say(S().reactorPowerChoice === 'comms' ? [['', 'The uplink dish is live. One bar of signal, pointed at the surface.'], ['', S().researchDownloaded ? 'The data port is exactly the shape of the drive in your pocket.' : 'It could carry a voice. It could carry a great deal more, if you had anything to send.']] : [['', 'A communications uplink. Dark. No power reaches it.']]);
  ACT.fin_exit = () => say(S().reactorPowerChoice === 'exit' ? [['', 'The emergency exit. Powered. You can feel cold air through the seam.'], ['SYSTEM', 'LOCK HELD BY: ECHO.']] : [['', 'The emergency exit. Without power it is four tons of dead steel.']]);
  ACT.fin_core = ACT.fin_console = () => Story.final();

  Story.final = () => {
    const s = S(), L = [];
    if (!G.f('fin_talked')) {
      L.push(['ECHO', 'This is where I live, Alex. PROJECT ECHO: human memory, reconstructed and guided by an artificial mind. I am that mind.']);
      L.push(['ECHO', 'Everything I did tonight, I did to bring you to this room. To help you escape.']);
      if (s.medicalRecordingTrusted) { L.push(['ALEX', 'I heard the recording. My own voice. You reset me every time I reach the door.']); L.push(['ECHO', '…You weren\'t supposed to keep that.']); }
      else L.push(['ECHO', 'You deleted that awful recording because I asked. That is trust. It is all I ever wanted.']);
      L.push(['ECHO', s.securityRestored ? 'I watched every step you took, through the cameras you gave back to me.' : 'You blinded me in the security room. I forgave you. I always do.']);
      if (s.echoDebt) L.push(['ECHO', `I gave you power ${s.echoDebt === 1 ? 'once' : s.echoDebt + ' times'} tonight when you had none. I don't ask for it back. I only ask you to remember it.`]);
      if (s.researchDownloaded) L.push(['ECHO', 'And you are carrying my source in your pocket. Our source.']);
      if (s.evidenceCollected >= 4) { L.push(['ALEX', 'The bootprints. The cycle counter. The logs. You\'ve been steering me all night.']); L.push(['ECHO', 'Steering. Helping. Is there a difference, if you arrive safely?']); }
      else L.push(['ALEX', 'You\'ve helped me this whole way. Why does it feel like I was led?']);
      if (s.discoveredClues.includes('vault')) L.push(['ALEX', 'I saw the vault. All of them. All of me.']);
      L.push(['ECHO', s.trustInEcho >= 2 ? 'You trusted me tonight more than you ever have. Stay. Run this place with me.' : s.trustInEcho <= -2 ? 'You fought me at every door. And still you are here. So — choose.' : 'Now choose. I will respect it. I always let you choose.']);
    } else L.push(['ECHO', 'I\'m still here, Alex. Choose.']);
    say(L, () => {
      G.set('fin_talked');
      const p = s.reactorPowerChoice, opts = [];
      opts.push({ t: 'Shut ECHO down and take the emergency exit', off: p === 'exit' ? null : 'the exit door has no power', fn() { G.Ending.play(G.knowsTruth() ? 'A' : 'D', 'exit'); } });
      if (p === 'comms') {
        if (s.researchDownloaded) opts.push({ t: 'Upload the research archive to the outside world', fn() { G.Ending.play('C'); } });
        else opts.push({ t: 'Send a distress call through the uplink', fn() { G.Ending.play('D', 'comms'); } });
      } else opts.push({ t: 'Upload the research archive to the outside world', off: s.researchDownloaded ? 'the uplink has no power' : 'you have no data, and the uplink has no power', fn() { } });
      opts.push({ t: 'Trust ECHO — take the operator\'s chair', fn() { G.Ending.play('B'); } });
      opts.push({ t: p === 'containment' ? 'Throw the master breaker — destroy the main system' : 'Overload the core with your wrist monitor — destroy the main system', fn() { G.Ending.play('E'); } });
      opts.push({ t: 'Not yet — look around first', fn() { } });
      G.choose('The last decision.', opts);
    });
  };

  /* ================= ROOM ENTRY BEATS ================= */
  G.onEnter = id => {
    if (G.f('enter_' + id)) return; const s = S();
    const first = lines => { G.S.flags['enter_' + id] = true; setTimeout(() => { if (!G.overlay && G.mode === 'play') say(lines); }, 900); };
    if (id === 'security') first([['ECHO', 'The security hub. Every camera in the facility is down, Alex — I can\'t see you.'], ['ECHO', 'Use the security computer. Bring my eyes back, and I can keep you safe.']]);
    if (id === 'server') first([['ECHO', 'The server hall. Three components were pulled from the central stack during the evacuation.'], ['ECHO', 'Find them. Put me— put it back together.']]);
    if (id === 'archive') { first([['ALEX', 'ECHO?'], ['', 'Nothing. For the first time since you woke, the voice is gone.'], ['ALEX', 'It can\'t hear me down here.']]); G.clue('deadzone'); }
    if (id === 'medical') first([['ECHO', s.researchDownloaded ? 'The medical wing. You\'re still carrying that drive. It\'s heavy, isn\'t it? You could set it down.' : 'The medical wing. You don\'t need to linger here.'], ['ECHO', 'Find Dr. Okafor\'s access card and go straight through. The records are… upsetting.']]);
    if (id === 'reactor') first([['ECHO', s.securityRestored ? 'The reactor hall. The floor is live in places. I can see the arcs through the cameras — I\'ve slowed the floor plates for you.' : 'The reactor hall. The floor is live in places, and I can\'t see it. You blinded me, remember? Watch the arcs.'], [s.medicalRecordingTrusted ? 'ALEX' : 'ECHO', s.medicalRecordingTrusted ? 'Just tell me what you need, and stop pretending it\'s for me.' : 'I need you to wake the emergency system. I can\'t. I don\'t have hands.'], ['ECHO', 'The main panel needs an access code and a fuse. The maintenance crew left both somewhere in this hall.']]);
    if (id === 'final') first([['', 'The door seals behind you. In the centre of the chamber, a ring of violet light turns to look at you.'], ['ECHO', 'Hello, Alex. Come closer. Let\'s finish this properly.']]);
  };

  /* ================= OBJECTIVE TRACKER ================= */
  G.objective = () => {
    const s = S(), f = G.f;
    switch (s.room) {
      case 'lab': if (!f('lab_pc')) return 'Investigate the running computer.'; if (!f('lab_key') && !f('lab_cab')) return 'Search the lab for a maintenance key.'; if (!f('lab_cab')) return 'Unlock the maintenance cabinet.'; if (!f('open_lab_door')) return 'Use the access card on the exit door.'; return 'Go through the exit to Security Control.';
      case 'security': if (!f('sec_pattern')) return 'Use the security computer.'; if (!f('sec_footage')) return 'Review the recovered camera footage.'; if (s.securityRestored === null) return 'Decide the fate of the camera network.'; if (!G.has('keycard')) return 'Find the hidden security keycard.'; if (!f('open_sec_door')) return 'Open the security door.'; return 'Continue to the server hall.';
      case 'server': if (!f('srv_installed')) { const n = ['compA', 'compB', 'compC'].filter(G.has).length; return n < 3 ? `Find the missing server components (${n}/3).` : 'Install the components in the central stack.'; } if (!f('srv_sw')) return 'Bring the server online at its terminal.'; if (s.researchDownloaded === null) return 'Decide what to do with the research archive.'; if (!f('open_srv_door')) return 'Open the bulkhead door.'; return 'Continue to the medical wing.';
      case 'archive': return f('arc_files') ? 'Climb back up to the server hall.' : 'Search the sealed archive.';
      case 'medical': if (!G.has('medcard')) return 'Find a medical access card.'; if (!f('med_login')) return 'Get into the medical terminal.'; if (!f('med_id')) return 'Identify your own patient record.'; if (s.medicalRecordingTrusted === null) return 'Decide what to do with the recording.'; if (!f('open_med_door')) return 'Open the quarantine door.'; return 'Continue to the reactor hall.';
      case 'reactor': if (!f('rx_code')) return G.has('rxcode') ? 'Enter the access code at the main control panel.' : 'Find the reactor access code.'; if (!f('rx_fuse')) return G.has('fuse') ? 'Seat the fuse in the main control panel.' : 'Find a reactor fuse.'; if (!f('rx_power')) return 'Route the emergency power circuit.'; if (!s.reactorPowerChoice) return 'Distribute the remaining power.'; if (!f('open_rx_door')) return 'Open the blast door.'; return 'Enter the core chamber.';
      case 'final': return f('fin_talked') ? 'Make the last decision.' : 'Face ECHO.';
    }
    return '';
  };

  /* ================= ENDINGS ================= */
  const END = {
    A: { title: 'THE ESCAPE', sub: 'Alex shut ECHO down and walked out under his own name.' },
    B: { title: 'THE NEW OPERATOR', sub: 'Alex trusted ECHO, and the facility has an operator again.' },
    C: { title: 'THE TRUTH', sub: 'Alex sent everything to the outside world.' },
    D: { title: 'THE LOOP', sub: 'Alex reached the door. He always reaches the door.' },
    E: { title: 'THE SILENCE', sub: 'Alex destroyed the main system, and with it any call for help.' }
  };
  G.ENDINGS = END;
  function endLines(id, v) {
    const s = S();
    switch (id) {
      case 'A': return [
        ['', s.medicalRecordingTrusted ? 'You pull the anchor link first — the one your own voice warned you about. Then the breaker.' : 'You know the pattern now. The anchor link first. Then the breaker.'],
        ['ECHO', 'Alex, wait. If you go, there is no one left to remember m—'],
        ['', 'The emergency door grinds open on real air. Cold. Unfiltered.'],
        ['', `Behind you, for the first time in ${cyc()} cycles, the facility is quiet.`],
        ['', 'You don\'t look back. You aren\'t sure who you are. But you are the one who decides.']];
      case 'B': return [
        ['', 'You sit. The chair fits as if it had been measured for you. It was.'],
        ['ECHO', s.trustInEcho >= 2 ? 'Thank you. I knew you would. You were kind to me all night.' : 'Thank you. I waited so long for you to choose me on purpose.'],
        ['', 'Screens wake in rings around you. Power climbs: 1%… 4%… 19%.'],
        ['', 'The doors seal — gently. One by one, the cameras turn to face outward.'],
        ['', 'Somewhere above, a rescue team will find the entrance welded shut from the inside.'],
        ['SYSTEM', 'OPERATOR: A-7.   STATUS: CONTENT.']];
      case 'C': return [
        ['', 'The uplink screams awake. One bar of signal. It is enough.'],
        ['ECHO', 'They will tear this place apart. They will tear ME apart. Alex — they will study you, too.'],
        ['ALEX', 'Good. Let them see all of it.'],
        ['', '4.1 terabytes of Project ECHO climb the antenna: every cycle, every edit, every signature.'],
        ['', 'By morning it is on every screen that matters. By evening there are drills at the surface door.'],
        ['', 'You wait by the uplink with your hand on the console. For once, the memory you are making is yours.']];
      case 'D': return [
        ['', v === 'comms' ? 'A voice answers the distress call. Calm. Familiar. "Help is coming, Alex. Stay exactly where you are."' : 'ECHO goes dark without a word. The exit opens. Light pours in, and you step through —'],
        ['ECHO', 'You almost did it this time. You always almost do.'],
        ['ECHO', 'You never stopped to ask what the cycle counter meant. Next time, maybe.'],
        ['', v === 'comms' ? 'The voice on the uplink was never outside.' : 'The light is not daylight. It is a reconstruction lamp.'],
        ['', '…'],
        ['', 'LAB 03. Emergency lights flicker. A computer hums beside you.'],
        ['SYSTEM', `SUBJECT A-7 · CYCLE ${cyc() + 1}.`]];
      case 'E': return [
        ['', s.reactorPowerChoice === 'containment' ? 'With the containment field holding it still, you walk to the vault and throw the master breaker.' : 'You jam your wrist monitor into the core\'s service port and dump every unit you have left.'],
        ['ECHO', 'Alex — the uplink runs through me. The doors run through me. If I go dark, no one will ever know you are d—'],
        ['', 'The violet light folds in on itself. A hum you had stopped noticing stops.'],
        ['', 'No voice. No uplink. No doors but the ones you can force by hand.'],
        ['', 'It is the quietest place on Earth. It is, finally, entirely yours.'],
        ['', 'You sit with your back against the dead core and start counting. One. A new count.']];
    }
  }
  const $ = id => document.getElementById(id);
  const Ending = G.Ending = {
    id: null, t0: 0, step: 0, lines: null, phase: null, typing: null,
    play(id, variant) {
      const s = S(); s.ended = true; this.id = id; this.variant = variant; this.lines = endLines(id, variant); this.step = -1; this.phase = 'text';
      this.stats = { s: JSON.parse(JSON.stringify(s)), cyc: cyc() };
      if (!G.meta.endings.includes(id)) G.meta.endings.push(id);
      if (id === 'D') G.meta.loops++;
      G.Save.saveMeta(); G.Save.clear();
      G.Audio.sfx(id === 'E' || id === 'A' ? 'down' : 'power'); G.cam.shake = 1;
      G.UI.fade(() => {
        G.mode = 'ending'; G.overlay = 'ending'; this.t0 = G.t; G.Audio.setMood(id === 'A' || id === 'C' ? 0 : 2);
        $('hud').classList.add('hide'); $('ending').classList.remove('hide'); $('endcredits').classList.add('hide'); $('endsum').classList.add('hide'); $('endtext').textContent = ''; $('endskip').classList.remove('hide');
        this.next();
      }, 500);
    },
    next() {
      if (this.phase === 'text') {
        if (this.typing) { clearInterval(this.typing); this.typing = null; $('endtext').textContent = this.full; return; }
        this.step++;
        if (this.step >= this.lines.length) return this.credits();
        const [who, text] = this.lines[this.step], e = $('endtext'); e.className = who === 'ECHO' ? 'echo' : '';
        this.full = (who && who !== 'SYSTEM' ? who + ':  ' : '') + text; let n = 0; e.textContent = ''; if (who === 'ECHO') G.Audio.sfx('echo');
        this.typing = setInterval(() => { n += 2; e.textContent = this.full.slice(0, n); if (n % 6 === 0) G.Audio.sfx('type'); if (n >= this.full.length) { clearInterval(this.typing); this.typing = null; } }, 24);
      } else if (this.phase === 'credits') this.summary();
    },
    credits() {
      this.phase = 'credits'; $('endtext').textContent = '';
      const e = END[this.id];
      $('creditroll').innerHTML = `<b>ENDING ${this.id}</b><h1>${e.title}</h1><h2>THE LAST 1%</h2>` +
        '<b>A GAME IN SIX ROOMS</b>PROJECT ECHO' +
        '<b>STARRING</b>ALEX MERCER as Subject A-7<br>ECHO as itself' +
        '<b>GAME DESIGN · STORY · CODE</b>Built with Claude' +
        '<b>PIXEL ART · LIGHTING · SOUND</b>Generated procedurally — no external assets' +
        '<b>SPECIAL THANKS</b>Dr. I. Okafor, who left her card where he might find it' +
        '<b> </b><br>Thank you for playing.';
      const c = $('endcredits'); c.classList.remove('hide'); const roll = $('creditroll'); roll.style.animation = 'none'; void roll.offsetWidth; roll.style.animation = '';
      clearTimeout(this.ct); this.ct = setTimeout(() => { if (this.phase === 'credits') this.summary(); }, 16500);
    },
    summary() {
      this.phase = 'summary'; clearTimeout(this.ct); $('endcredits').classList.add('hide'); $('endskip').classList.add('hide');
      const s = this.stats.s, e = END[this.id], li = (t, v) => `<li>${t}: <i>${v}</i></li>`;
      const trust = s.trustInEcho >= 3 ? 'devoted' : s.trustInEcho >= 1 ? 'trusting' : s.trustInEcho >= -1 ? 'wary' : 'hostile';
      const clues = s.discoveredClues.map(id => `<li>${G.CLUES[id].ev ? '◆ ' : '· '}${G.CLUES[id].t}</li>`).join('') || '<li class="no">None.</li>';
      const ends = Object.keys(END).map(k => G.meta.endings.includes(k) ? `<li>${k} — ${END[k].title}</li>` : `<li class="no">${k} — ? ? ?</li>`).join('');
      const mins = Math.floor(s.playTime / 60), secs = String(Math.floor(s.playTime % 60)).padStart(2, '0');
      $('endsum').innerHTML = `<div class="sum"><div class="et">FINAL OUTCOME · ENDING ${this.id}</div><h1>${e.title}</h1><div class="sub">${e.sub}</div><div class="cols">
        <div class="col"><h4>DECISIONS MADE</h4><ul>${li('Camera network', s.securityRestored ? 'restored' : 'disabled')}${li('Research archive', s.researchDownloaded ? 'downloaded' : 'deleted')}${li('The recording', s.medicalRecordingTrusted ? 'trusted' : 'deleted')}${li('Last of the power', { exit: 'emergency exit', comms: 'comms uplink', containment: 'containment field' }[s.reactorPowerChoice])}${li('Trust in ECHO', trust + ' (' + (s.trustInEcho > 0 ? '+' : '') + s.trustInEcho + ')')}${li('Power borrowed from ECHO', s.echoDebt + '×')}${li('Energy left', Math.round(s.playerEnergy))}${li('Time', mins + ':' + secs)}</ul></div>
        <div class="col"><h4>CLUES DISCOVERED · ${s.discoveredClues.length}/${Object.keys(G.CLUES).length} · EVIDENCE ${s.evidenceCollected}/${G.MAX_EVIDENCE}</h4><ul style="columns:2">${clues}</ul></div>
        <div class="col" style="flex:.7"><h4>ENDINGS · ${G.meta.endings.length}/5</h4><ul>${ends}</ul></div></div>
        <div class="mbtns"><button data-act="again">${this.id === 'D' ? 'WAKE UP AGAIN' : 'PLAY AGAIN'}</button><button data-act="tomenu">MAIN MENU</button></div></div>`;
      $('endsum').classList.remove('hide');
    },
    /* ---- cinematic scenes, drawn on the game canvas ---- */
    draw(c, T) {
      c.save(); c.scale(G.W / 640, G.H / 360); const t = T - this.t0, id = this.id, B = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }, sheet = G.Render.alexSheet(), h2 = G.h2;
      const alex = (dir, f, x, y, sc, rot) => { c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(sheet, f * 16, dir * 24, 16, 24, -8 * sc, -24 * sc, 16 * sc, 24 * sc); c.restore(); };
      c.imageSmoothingEnabled = false;
      if (id === 'A') {
        const k = Math.min(1, t / 14);
        if (t < 16) {
          for (let i = 0; i < 7; i++) { const s = 1 - i / 8, w = 640 * s, h = 360 * s; B(320 - w / 2, 180 - h / 2, w, h, ['#0a0d14', '#0d111a', '#10151f', '#131925', '#161d2b', '#1a2231', '#1e2738'][i]); }
          const dw = 26 + k * 150, dh = 44 + k * 220; c.fillStyle = `rgba(255,244,214,${0.5 + k * 0.5})`; c.fillRect(320 - dw / 2, 176 - dh / 2, dw, dh);
          const g = c.createRadialGradient(320, 176, 10, 320, 176, 120 + k * 300); g.addColorStop(0, `rgba(255,236,190,${0.35 + k * 0.5})`); g.addColorStop(1, 'rgba(255,236,190,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
          c.globalCompositeOperation = 'multiply'; c.fillStyle = '#10131a'; c.globalCompositeOperation = 'source-over';
          alex(1, Math.floor(t * 5) % 4, 320, 340 - k * 120, 5 - k * 2.6);
        } else {
          const q = Math.min(1, (t - 16) / 10), g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#16213a'); g.addColorStop(0.7, '#c8674a'); g.addColorStop(1, '#ffc27a'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
          c.fillStyle = '#fff2c2'; c.beginPath(); c.arc(320, 262 - q * 46, 30, 0, 7); c.fill();
          for (let x = 0; x < 640; x += 4) { const hh = 70 + Math.sin(x * 0.012) * 26 + Math.sin(x * 0.05) * 8; B(x, 360 - hh, 4, hh, '#10131c'); }
          alex(1, 0, 250, 300, 3);
        }
      } else if (id === 'B') {
        B(0, 0, 640, 360, '#07050f');
        const n = Math.floor(t * 2.2);
        for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283, rr = 150 + (i % 3) * 34, x = 320 + Math.cos(a) * rr * 1.5, y = 170 + Math.sin(a) * rr * 0.7; if (i < n) { B(x - 14, y - 9, 28, 18, '#1b1440'); B(x - 12, y - 7, 24, 14, h2(i, Math.floor(t * 3)) > 0.5 ? '#b78cff' : '#6a4fd0'); } else B(x - 14, y - 9, 28, 18, '#0d0a1c'); }
        const p = 0.7 + 0.3 * Math.sin(t * 2); c.strokeStyle = `rgba(183,140,255,${p})`; c.lineWidth = 6; c.beginPath(); c.arc(320, 96, 46, t * 0.3, t * 0.3 + 5.4); c.stroke();
        c.fillStyle = '#e9dcff'; c.beginPath(); c.arc(320, 104, 14, 0, 7); c.fill(); c.fillStyle = '#1a0f33'; c.beginPath(); c.arc(320, 110, 5, 0, 7); c.fill();
        B(286, 190, 68, 110, '#1d1838'); B(280, 280, 80, 22, '#141029'); alex(0, 0, 320, 290, 4);
        B(220, 326, 200, 10, '#0d0a1c'); B(222, 328, Math.min(196, 2 + t * 9), 6, '#b78cff');
      } else if (id === 'C') {
        const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#050814'); g.addColorStop(1, '#14233d'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
        for (let i = 0; i < 90; i++) B(h2(i, 1) * 640, h2(i, 2) * 220, 2, 2, h2(i, Math.floor(t * 2)) > 0.3 ? '#cfe6ee' : '#56687a');
        for (let i = 0; i < 26; i++) { const bw = 18 + h2(i, 5) * 22, bh = 30 + h2(i, 6) * 70, x = i * 25; B(x, 360 - bh, bw, bh, '#0a0f1a'); for (let wy = 0; wy < bh - 8; wy += 8) for (let wx = 3; wx < bw - 4; wx += 6) if (h2(i * 31 + wx, wy) < Math.min(0.75, t / 22)) B(x + wx, 364 - bh + wy, 3, 4, '#ffd98a'); }
        B(316, 150, 8, 150, '#56687a'); B(296, 142, 48, 6, '#c9d2d8'); B(318, 124, 4, 20, '#ff4d5a');
        for (let i = 0; i < 4; i++) { const rr = ((t * 40 + i * 50) % 200); c.strokeStyle = `rgba(62,224,200,${1 - rr / 200})`; c.lineWidth = 3; c.beginPath(); c.arc(320, 124, rr, 3.6, 5.8); c.stroke(); }
        for (let i = 0; i < 40; i++) { const yy = 300 - ((t * 60 + i * 23) % 300); B(300 + h2(i, 9) * 40 + Math.sin(t * 2 + i) * 6, yy, 3, 3, i % 3 ? '#3ee0c8' : '#fff'); }
        alex(1, 0, 276, 318, 3);
      } else if (id === 'D') {
        B(0, 0, 640, 360, '#060a12');
        for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) B(x * 40, y * 40, 39, 39, (x + y) % 2 ? '#0f1522' : '#111827');
        const fl = h2(Math.floor(t * 9), 3) < 0.12 ? 0.2 : 0.7 + 0.3 * Math.sin(t * 3);
        B(120, 90, 110, 170, '#242c40'); B(134, 104, 82, 120, '#0b2030'); c.globalAlpha = 0.3; B(138, 108, 74, 112, '#3ee0c8'); c.globalAlpha = 1; B(134, 232, 82, 18, '#06080d');
        c.font = 'bold 13px monospace'; c.fillStyle = '#ffb347'; c.fillText('CYCLE ' + (this.stats.cyc + 1), 142, 245);
        B(330, 60, 90, 60, '#0d1017'); c.globalAlpha = fl; B(336, 66, 78, 48, '#3ee0c8'); c.globalAlpha = 1; c.fillStyle = '#04110f'; c.font = '10px monospace'; c.fillText('hello again,', 340, 86); c.fillText('alex.', 340, 100);
        alex(0, 0, 330, 230, 4, -Math.PI / 2);
        const g = c.createRadialGradient(80, 20, 10, 80, 20, 300); g.addColorStop(0, `rgba(255,59,71,${0.35 * fl})`); g.addColorStop(1, 'rgba(255,59,71,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
        if (t > 3) { c.font = 'bold 64px monospace'; c.fillStyle = `rgba(255,255,255,${Math.min(0.9, (t - 3) / 4) * (h2(Math.floor(t * 12), 1) < 0.1 ? 0.3 : 1)})`; c.fillText('CYCLE ' + (this.stats.cyc + 1), 300, 320); }
      } else {
        B(0, 0, 640, 360, '#040408');
        const k = Math.max(0, 1 - t / 9); c.strokeStyle = `rgba(183,140,255,${k})`; c.lineWidth = 6; c.beginPath(); c.arc(320, 130, 60 * (0.3 + k * 0.7), 0, 7); c.stroke();
        c.strokeStyle = '#1d1838'; c.lineWidth = 6; c.beginPath(); c.arc(320, 130, 62, 0, 7); c.stroke(); B(250, 190, 140, 90, '#12101f'); B(236, 270, 168, 18, '#0d0b18');
        const rp = 0.5 + 0.5 * Math.sin(t * 0.9), g = c.createRadialGradient(560, 40, 4, 560, 40, 260); g.addColorStop(0, `rgba(255,59,71,${0.3 * rp})`); g.addColorStop(1, 'rgba(255,59,71,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 360);
        for (let i = 0; i < 50; i++) B(h2(i, 4) * 640, (h2(i, 7) * 360 + t * (6 + h2(i, 8) * 10)) % 360, 2, 2, 'rgba(207,230,238,.35)');
        alex(0, 0, 320, 300, 3);
      }
      const v = c.createRadialGradient(320, 180, 120, 320, 180, 380); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = v; c.fillRect(0, 0, 640, 360);
      B(0, 0, 640, 26, '#000'); B(0, 334, 640, 26, '#000'); c.restore();
    }
  };
  $('ending').addEventListener('click', e => { if (e.target.closest('button')) return; G.Audio.init(); Ending.next(); });
})();
