/* ============================================================
   ROOM MANAGEMENT — room data (tile coordinates, 16px tiles)
   floor: [x,y,w,h] rects · objs: world objects · lights · hazards
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  const o = (id, type, x, y, w, h, extra) => Object.assign({ id, type, x, y, w, h }, extra || {});
  const S = { solid: true };

  G.ROOMS = {
    /* ---------- LEVEL 1 : THE AWAKENING ---------- */
    lab: {
      name: 'LEVEL 1 · LABORATORY 03', title: 'THE AWAKENING', theme: 'lab', mood: 0, w: 34, h: 22,
      floor: [[2, 4, 30, 15]], spawn: [8.5, 9.6],
      objs: [
        o('lab_locker', 'locker', 3, 4, 1, 1, { solid: true, name: 'Locker', verb: 'Search' }),
        o('lab_pod', 'pod', 4, 7, 2, 3, { solid: true, name: 'Stasis Pod' }),
        o('lab_scuff', 'scuff', 6, 11, 2, 1, { flat: true, scan: true, name: 'Bootprints' }),
        o('lab_pc', 'terminal', 9, 4, 2, 1, { solid: true, name: 'Computer', verb: 'Use' }),
        o('lab_board', 'board', 13, 3, 3, 1, { name: 'Whiteboard', look: [['', 'Half-erased marker: "MEMORY IS A FILE. FILES CAN BE EDITED."'], ['', 'Below it, a careful doodle of a wrist monitor. Exactly like yours.']] }),
        o('lab_door', 'door', 18, 3, 2, 1, { dir: 'n', to: 'security', toDoor: 'sec_back', name: 'Exit Door', verb: 'Open' }),
        o('lab_desk', 'desk', 22, 4, 3, 1, { solid: true, name: 'Desk Drawer', verb: 'Search' }),
        o('lab_cab', 'cabinet', 28, 4, 2, 1, { solid: true, name: 'Maintenance Cabinet', verb: 'Open', openFlag: 'lab_cab' }),
        o('lab_bench1', 'bench', 13, 10, 5, 2, { solid: true, name: 'Lab Bench', look: [['', 'Shattered flasks, long dry. Whatever they were growing here, they stopped in a hurry.']] }),
        o('lab_bench2', 'bench', 22, 13, 4, 2, { solid: true, name: 'Lab Bench', look: [['', 'A centrifuge with the lid up. A mug that reads "WORLD\'S OKAYEST ARCHITECT."'], ['ALEX', 'Why do I know that mug?']] }),
        o('lab_crate', 'crate', 29, 16, 2, 2, { solid: true, name: 'Supply Crates', look: [['', 'Sealed supply crates, stencilled "PROJECT E." Too heavy to move.']] })
      ],
      lights: [{ x: 6, y: 3.5, r: 90, col: '#ff3b47', k: 'em' }, { x: 26, y: 3.5, r: 90, col: '#ff3b47', k: 'em' }, { x: 17, y: 12, r: 70, col: '#3ee0c8', k: 'pulse' }],
      decals: [{ k: 'cable', pts: [[10, 5], [10, 8], [5, 8]], col: '#3ee0c8' }, { k: 'txt', x: 16.6, y: 6, s: 'EXIT ▲', col: '#ffb34744' }, { k: 'hz', x: 3.5, y: 6.5, w: 3, h: 4 }]
    },

    /* ---------- LEVEL 2 : THE SECURITY ROOM ---------- */
    security: {
      name: 'LEVEL 2 · SECURITY CONTROL', title: 'THE SECURITY ROOM', theme: 'security', mood: 0, w: 36, h: 22,
      floor: [[2, 4, 32, 15]],
      objs: [
        o('sec_back', 'door', 8, 19, 2, 1, { dir: 's', to: 'lab', toDoor: 'lab_door' }),
        o('sec_cam1', 'camera', 3, 3, 1, 1, { name: 'Security Camera' }),
        o('sec_pc1', 'terminal', 8, 4, 2, 1, { solid: true, name: 'Security Computer', verb: 'Use' }),
        o('sec_pc2', 'terminal', 13, 4, 2, 1, { solid: true, name: 'Personnel Terminal', verb: 'Use', col: '#ffb347' }),
        o('sec_pc3', 'terminal', 18, 4, 2, 1, { solid: true, name: 'Facility Map Terminal', verb: 'Use', col: '#4aa8ff' }),
        o('sec_door', 'door', 25, 3, 2, 1, { dir: 'n', to: 'server', toDoor: 'srv_back', name: 'Security Door', verb: 'Open' }),
        o('sec_cab', 'cabinet', 30, 4, 2, 1, { solid: true, name: 'Storage Cabinet', verb: 'Search', openFlag: 'sec_key' }),
        o('sec_cam2', 'camera', 33, 3, 1, 1, { name: 'Security Camera' }),
        o('sec_gen', 'generator', 4, 12, 3, 2, { solid: true, name: 'Damaged Generator', verb: 'Inspect' }),
        o('sec_desk', 'desk', 15, 11, 4, 1, { solid: true, name: 'Duty Desk', look: [['', 'Cold coffee and a logbook open to the last night shift.'], ['', 'The final entry is one line: "it\'s talking to him again."']] }),
        o('sec_crate', 'crate', 30, 15, 2, 2, { solid: true, name: 'Equipment Crate', verb: 'Search' })
      ],
      lights: [{ x: 22, y: 3.5, r: 80, col: '#ff3b47', k: 'em' }, { x: 5, y: 16, r: 60, col: '#ffb347', k: 'em' }, { x: 14, y: 6, r: 110, col: '#7ddc6a', k: 'pulse' }],
      decals: [{ k: 'cable', pts: [[7, 13], [9, 13], [9, 6]], col: '#ffb347' }, { k: 'mat', x: 7, y: 5, w: 14, h: 2 }]
    },

    /* ---------- LEVEL 3 : THE SERVER ROOM ---------- */
    server: {
      name: 'LEVEL 3 · SERVER HALL', title: 'THE SERVER ROOM', theme: 'server', mood: 1, w: 40, h: 24,
      floor: [[2, 4, 36, 17]],
      objs: [
        o('srv_back', 'door', 6, 21, 2, 1, { dir: 's', to: 'security', toDoor: 'sec_door' }),
        o('srv_rack1', 'rack', 6, 6, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'Row after row of drives, all seeking. Something is reading them.']] }),
        o('srv_rack2', 'rack', 10, 6, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'A label on the rack: "EPISODIC — A-7 — DO NOT DEFRAGMENT."']] }),
        o('srv_rack3', 'rack', 28, 6, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'The fans spin up as you approach, then slow again. Like it noticed you.']] }),
        o('srv_rack4', 'rack', 32, 6, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'Warm to the touch.']] }),
        o('srv_rack5', 'rack', 6, 13, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'Dark. This whole rack has been cannibalised for parts.']] }),
        o('srv_rack6', 'rack', 10, 13, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'Blinking in a slow, steady rhythm. Almost like breathing.']] }),
        o('srv_rack7', 'rack', 28, 13, 2, 3, { solid: true, name: 'Server Rack', look: [['', 'Someone scratched tally marks into the side panel. Thirteen, then one more, unfinished.']] }),
        o('srv_rack_b', 'rack', 32, 13, 2, 3, { solid: true, name: 'Server Rack (loose panel)', verb: 'Search', loose: true }),
        o('srv_core', 'srvcore', 17, 7, 6, 3, { solid: true, name: 'Central Server Stack', verb: 'Inspect' }),
        o('srv_pc', 'terminal', 19, 12, 2, 1, { solid: true, name: 'Server Terminal', verb: 'Use', col: '#4aa8ff' }),
        o('srv_note2', 'board', 23, 3, 2, 1, { name: 'Wall Panel', verb: 'Read' }),
        o('srv_door', 'door', 30, 3, 2, 1, { dir: 'n', to: 'medical', toDoor: 'med_back', name: 'Bulkhead Door', verb: 'Open' }),
        o('srv_shelf', 'shelf', 35, 4, 2, 1, { solid: true, name: 'Parts Shelf', verb: 'Search' }),
        o('srv_note1', 'note', 8, 10, 1, 1, { flat: true, name: 'Sticky Note', verb: 'Read' }),
        o('srv_hatch', 'hatch', 3, 11, 2, 2, { flat: true, name: 'Maintenance Hatch', verb: 'Open' }),
        o('srv_crate', 'crate', 3, 18, 2, 2, { solid: true, name: 'Packing Crate', verb: 'Search' }),
        o('srv_note3', 'note', 15, 19, 1, 1, { flat: true, name: 'Torn Checklist', verb: 'Read' }),
        o('srv_batt', 'battery', 25, 18, 1, 1, { name: 'Power Cell', verb: 'Take' })
      ],
      lights: [{ x: 20, y: 9, r: 120, col: '#4aa8ff', k: 'pulse' }, { x: 36, y: 3.5, r: 70, col: '#ff3b47', k: 'em' }, { x: 4, y: 3.5, r: 70, col: '#ff3b47', k: 'em' }],
      decals: [
        { k: 'cable', pts: [[8, 9], [8, 11], [17, 11], [17, 10]], col: '#4aa8ff' }, { k: 'cable', pts: [[12, 16], [14, 16], [14, 11]], col: '#3ee0c8' },
        { k: 'cable', pts: [[28, 9], [26, 9], [26, 11], [23, 11], [23, 10]], col: '#4aa8ff' }, { k: 'cable', pts: [[30, 16], [25, 16], [25, 11]], col: '#b78cff' },
        { k: 'cable', pts: [[20, 13], [20, 15]], col: '#4aa8ff' }
      ]
    },

    /* ---------- SECRET : THE ARCHIVE ---------- */
    archive: {
      name: 'SUB-LEVEL · SEALED ARCHIVE', title: 'THE ARCHIVE', theme: 'archive', mood: 2, w: 20, h: 14,
      floor: [[2, 4, 16, 7]], spawn: [4.8, 6.4],
      objs: [
        o('arc_ladder', 'ladder', 3, 5, 1, 2, { flat: true, name: 'Ladder', verb: 'Climb' }),
        o('arc_files', 'filecab', 6, 4, 2, 1, { solid: true, name: 'Filing Cabinet', verb: 'Search' }),
        o('arc_pods', 'podrow', 10, 4, 6, 1, { solid: true, name: 'Dormant Pods', look: [['', 'Three pods: A-4, A-5, A-6. Empty.'], ['', 'The headrests are worn smooth in exactly the same place.'], ['ALEX', 'Someone my height. Every time.']] }),
        o('arc_box', 'crate', 15, 8, 2, 2, { solid: true, name: 'Dusty Crate', verb: 'Search' })
      ],
      lights: [{ x: 10, y: 3.5, r: 80, col: '#ff3b47', k: 'em' }]
    },

    /* ---------- LEVEL 4 : THE MEDICAL WING ---------- */
    medical: {
      name: 'LEVEL 4 · MEDICAL WING', title: 'THE MEDICAL WING', theme: 'medical', mood: 1, w: 38, h: 24,
      floor: [[2, 4, 34, 17]],
      objs: [
        o('med_back', 'door', 6, 21, 2, 1, { dir: 's', to: 'server', toDoor: 'srv_door' }),
        o('med_door', 'door', 5, 3, 2, 1, { dir: 'n', to: 'reactor', toDoor: 'rx_back', name: 'Quarantine Door', verb: 'Open' }),
        o('med_cab', 'cabinet', 12, 4, 2, 1, { solid: true, name: 'Supply Cabinet', verb: 'Search', openFlag: 'med_cabopen' }),
        o('med_files', 'filecab', 17, 4, 2, 1, { solid: true, name: 'Patient Records', verb: 'Search' }),
        o('med_pc', 'terminal', 22, 4, 2, 1, { solid: true, name: 'Medical Terminal', verb: 'Use', col: '#bfe9e2' }),
        o('med_mon1', 'monitor', 27, 4, 1, 1, { solid: true, name: 'Broken Monitor', verb: 'Read' }),
        o('med_sink', 'bench', 31, 4, 3, 1, { solid: true, name: 'Scrub Sink', look: [['', 'A steel scrub sink.'], ['', 'The soap is still wet.']] }),
        o('med_mon2', 'monitor', 8, 11, 1, 1, { solid: true, name: 'Vitals Monitor', look: [['', 'A vital trace, looping on backup power. The timestamp is four hundred days old.'], ['', 'Patient field: A-7.']] }),
        o('med_bedA', 'bed', 11, 11, 2, 3, { solid: true, name: 'Bed · Bay A', verb: 'Check', bay: 'A' }),
        o('med_bedB', 'bed', 18, 11, 2, 3, { solid: true, name: 'Bed · Bay B', verb: 'Check', bay: 'B' }),
        o('med_bedC', 'bed', 25, 11, 2, 3, { solid: true, name: 'Bed · Bay C', verb: 'Check', bay: 'C' }),
        o('med_cart', 'cart', 31, 15, 1, 1, { solid: true, name: 'Instrument Cart', verb: 'Search' })
      ],
      lights: [{ x: 15, y: 3.5, r: 100, col: '#bfe9e2', k: 'em' }, { x: 29, y: 3.5, r: 100, col: '#bfe9e2', k: 'em' }, { x: 33, y: 18, r: 70, col: '#ff3b47', k: 'em' }, { x: 5, y: 16, r: 60, col: '#ff3b47', k: 'em' }],
      decals: [{ k: 'txt', x: 11.4, y: 15, s: 'A', col: '#bfe9e255' }, { k: 'txt', x: 18.4, y: 15, s: 'B', col: '#bfe9e255' }, { k: 'txt', x: 25.4, y: 15, s: 'C', col: '#bfe9e255' },
        { k: 'mat', x: 10, y: 10, w: 4, h: 5 }, { k: 'mat', x: 17, y: 10, w: 4, h: 5 }, { k: 'mat', x: 24, y: 10, w: 4, h: 5 }]
    },

    /* ---------- LEVEL 5 : THE REACTOR CHAMBER ---------- */
    reactor: {
      name: 'LEVEL 5 · REACTOR HALL', title: 'THE REACTOR CHAMBER', theme: 'reactor', mood: 2, w: 44, h: 26,
      floor: [[2, 4, 40, 19]],
      objs: [
        o('rx_back', 'door', 4, 23, 2, 1, { dir: 's', to: 'medical', toDoor: 'med_door' }),
        o('rx_tank1', 'tank', 6, 4, 2, 1, { solid: true, name: 'Coolant Tank', look: [['', 'Coolant tanks. The gauges read almost empty.']] }),
        o('rx_tank2', 'tank', 9, 4, 2, 1, { solid: true }),
        o('rx_tank3', 'tank', 14, 4, 2, 1, { solid: true }),
        o('rx_main', 'panel', 20, 4, 4, 1, { solid: true, name: 'Main Control Panel', verb: 'Use' }),
        o('rx_dist', 'panel', 32, 4, 3, 1, { solid: true, name: 'Power Distribution Panel', verb: 'Use', col: '#ffb347' }),
        o('rx_door', 'door', 38, 3, 2, 1, { dir: 'n', to: 'final', toDoor: 'fin_back', name: 'Blast Door', verb: 'Open' }),
        o('rx_core', 'reactor', 19, 10, 6, 5, { solid: true, name: 'Reactor Core', look: [['', 'The core idles at one percent, patient as a held breath.'], ['ALEX', 'One percent. Enough to keep one thing running. Guess which.']] }),
        o('rx_pipe', 'valve', 2, 15, 1, 1, { solid: true, name: 'Coolant Valve', verb: 'Inspect' }),
        o('rx_locker', 'locker', 40, 19, 1, 1, { solid: true, name: 'Tool Locker', verb: 'Search' }),
        o('rx_batt', 'battery', 8, 8, 1, 1, { name: 'Power Cell', verb: 'Take' }),
        o('rx_batt2', 'battery', 36, 13, 1, 1, { name: 'Power Cell', verb: 'Take' })
      ],
      lights: [{ x: 22, y: 12.5, r: 150, col: '#ffb347', k: 'pulse' }, { x: 4, y: 3.5, r: 80, col: '#ff3b47', k: 'em' }, { x: 40, y: 3.5, r: 80, col: '#ff3b47', k: 'em' }, { x: 40, y: 21, r: 60, col: '#ffb347', k: 'em' }, { x: 3, y: 21, r: 60, col: '#ffb347', k: 'em' }],
      decals: [{ k: 'hz', x: 18, y: 9, w: 8, h: 7 }, { k: 'cable', pts: [[22, 5], [22, 9]], col: '#ffb347' }, { k: 'cable', pts: [[25, 12], [33, 12], [33, 5]], col: '#ffb347' }],
      hazards: [
        { k: 'zone', x: 27, y: 4, w: 2, h: 19, period: 3.4, duty: 1.7, phase: 0 },
        { k: 'arc', x1: 3, y1: 18, x2: 25, y2: 18, speed: 70, phase: 0 },
        { k: 'arc', x1: 12, y1: 6, x2: 12, y2: 22, speed: 80, phase: 1.3 },
        { k: 'arc', x1: 16.5, y1: 8.3, x2: 27, y2: 8.3, speed: 60, phase: 0.6, loop: [[16.5, 8.3], [26.5, 8.3], [26.5, 16.7], [16.5, 16.7]] },
        { k: 'arc', x1: 35, y1: 9, x2: 35, y2: 22, speed: 85, phase: 2.2 },
        { k: 'arc', x1: 30, y1: 7.5, x2: 41, y2: 7.5, speed: 65, phase: 0.9 }
      ]
    },

    /* ---------- LEVEL 6 : THE FINAL CHAMBER ---------- */
    final: {
      name: 'LEVEL 6 · CORE CHAMBER', title: 'THE FINAL CHAMBER', theme: 'final', mood: 2, w: 36, h: 24,
      floor: [[2, 9, 32, 12], [4, 4, 8, 4]],
      objs: [
        o('fin_back', 'door', 16, 21, 2, 1, { dir: 's', to: 'reactor', toDoor: 'rx_door' }),
        o('fin_pods', 'podrow', 5, 4, 6, 1, { solid: true, name: 'Sealed Pods', verb: 'Inspect' }),
        o('fin_breaker', 'breaker', 11, 6, 1, 1, { solid: true, name: 'Master Breaker', verb: 'Inspect' }),
        o('fin_gate', 'door', 7, 8, 2, 1, { dir: 'n', name: 'Containment Gate', verb: 'Inspect' }),
        o('fin_core', 'ecore', 15, 11, 6, 3, { solid: true, name: 'ECHO Core', verb: 'Face' }),
        o('fin_console', 'terminal', 17, 16, 2, 1, { solid: true, name: 'ECHO Console', verb: 'Approach', col: '#b78cff' }),
        o('fin_uplink', 'uplink', 22, 9, 3, 1, { solid: true, name: 'Comms Uplink', verb: 'Inspect' }),
        o('fin_exit', 'door', 28, 8, 2, 1, { dir: 'n', name: 'Emergency Exit', verb: 'Inspect' })
      ],
      lights: [{ x: 18, y: 11.5, r: 170, col: '#b78cff', k: 'pulse' }, { x: 29, y: 8.5, r: 70, col: '#ff3b47', k: 'em' }, { x: 8, y: 3.5, r: 80, col: '#ff3b47', k: 'em' }],
      decals: [{ k: 'cable', pts: [[18, 14], [18, 16]], col: '#b78cff' }, { k: 'cable', pts: [[21, 12], [23, 12], [23, 10]], col: '#b78cff' }, { k: 'cable', pts: [[15, 12], [8, 12], [8, 9]], col: '#b78cff' }, { k: 'cable', pts: [[21, 13], [29, 13], [29, 9]], col: '#b78cff' }]
    }
  };
})();
