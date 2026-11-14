/* ============================================================
   AUDIO MANAGER — everything is synthesised with WebAudio
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  let ac = null, mg, sg, noiseBuf, delay, musicTimer = null, mood = 0, lastStep = 0;

  function tone(f, d, type, v, to, when, dest) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || sg); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, v, freq, type, when, toF, q) {
    if (!ac) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + (when || 0);
    s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (toF) f.frequency.exponentialRampToValueAtTime(toF, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(sg); s.start(t, Math.random() * 0.5, d + 0.05);
  }

  const SCALES = [
    [220, 261.63, 293.66, 329.63, 392, 440],          // calm: A minor pentatonic
    [220, 233.08, 293.66, 311.13, 349.23, 415.3],     // uneasy
    [207.65, 220, 261.63, 277.18, 311.13, 329.63]     // dread
  ];

  const A = G.Audio = {
    init() {
      if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
      mg = ac.createGain(); sg = ac.createGain(); mg.connect(ac.destination); sg.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      delay = ac.createDelay(1); delay.delayTime.value = 0.42;
      const fb = ac.createGain(); fb.gain.value = 0.45; delay.connect(fb); fb.connect(delay); delay.connect(mg);
      this.vol(); this.startMusic();
    },
    vol() { if (!ac) return; mg.gain.value = G.meta.music * 0.55; sg.gain.value = G.meta.sfx * 0.9; },
    setMood(m) { mood = m; },
    startMusic() {
      // low drone: two detuned saws through a slowly breathing low-pass
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150; f.Q.value = 4;
      const dg = ac.createGain(); dg.gain.value = 0.16; f.connect(dg); dg.connect(mg);
      [55, 55.6, 82.4].forEach((hz, i) => { const o = ac.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = hz; o.connect(f); o.start(); });
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      // facility hum
      const hs = ac.createBufferSource(); hs.buffer = noiseBuf; hs.loop = true;
      const hf = ac.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 120; hf.Q.value = 2;
      const hg = ac.createGain(); hg.gain.value = 0.05; hs.connect(hf); hf.connect(hg); hg.connect(mg); hs.start();
      let step = 0;
      musicTimer = setInterval(() => {
        if (!ac || ac.state !== 'running') return;
        step++;
        const sc = SCALES[mood] || SCALES[0];
        if (Math.random() < 0.55) {
          const n = sc[(Math.random() * sc.length) | 0] * (Math.random() < 0.25 ? 2 : 1);
          const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
          o.type = Math.random() < 0.5 ? 'sine' : 'triangle'; o.frequency.value = n;
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
          o.connect(g); g.connect(mg); g.connect(delay); o.start(t); o.stop(t + 3.4);
        }
        if (step % 8 === 0) tone(mood === 2 ? 49 : 55, 2.4, 'sine', 0.12, null, 0, mg);
        // distant facility noises
        if (Math.random() < 0.06) { noise(0.5, 0.05, 300, 'bandpass', 0, 90, 3); }
        if (Math.random() < 0.03) { tone(90, 0.5, 'sine', 0.05, 45); }
      }, 1100);
    },
    step(run) {
      if (!ac) return; const now = ac.currentTime; if (now - lastStep < (run ? 0.2 : 0.33)) return; lastStep = now;
      noise(0.06, 0.09, 380 + Math.random() * 120, 'lowpass'); tone(70 + Math.random() * 20, 0.05, 'sine', 0.05);
    },
    sfx(n) {
      if (!ac) return;
      switch (n) {
        case 'beep': tone(880, 0.07, 'square', 0.06); break;
        case 'type': tone(1100 + Math.random() * 500, 0.02, 'square', 0.025); break;
        case 'ok': tone(660, 0.12, 'triangle', 0.14); tone(990, 0.22, 'triangle', 0.14, null, 0.1); break;
        case 'pick': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, null, i * 0.06)); break;
        case 'clue': tone(392, 0.2, 'sine', 0.1); tone(587, 0.35, 'sine', 0.1, null, 0.12); break;
        case 'err': tone(150, 0.25, 'sawtooth', 0.12, 90); break;
        case 'door': noise(0.5, 0.2, 200, 'bandpass', 0, 1800, 2); tone(110, 0.4, 'sine', 0.12, 55); break;
        case 'zap': for (let i = 0; i < 4; i++) { noise(0.06, 0.25, 3000, 'highpass', i * 0.05); tone(200 + Math.random() * 900, 0.05, 'square', 0.07, null, i * 0.05); } break;
        case 'boot': tone(180, 0.5, 'sine', 0.1, 900); tone(1200, 0.08, 'square', 0.04, null, 0.5); break;
        case 'alarm': for (let i = 0; i < 3; i++) { tone(620, 0.18, 'square', 0.07, null, i * 0.4); tone(470, 0.18, 'square', 0.07, null, i * 0.4 + 0.2); } break;
        case 'thud': tone(90, 0.3, 'sine', 0.3, 35); noise(0.15, 0.15, 200, 'lowpass'); break;
        case 'scan': tone(1400, 0.6, 'sine', 0.08, 260); noise(0.5, 0.04, 2500, 'bandpass', 0, 500, 4); break;
        case 'charge': tone(300, 0.35, 'triangle', 0.1, 900); break;
        case 'click': tone(520, 0.03, 'square', 0.06); break;
        case 'switch': noise(0.04, 0.2, 1500, 'highpass'); tone(240, 0.08, 'square', 0.07); break;
        case 'light': noise(0.03, 0.15, 2500, 'highpass'); break;
        case 'power': tone(40, 1.6, 'sawtooth', 0.14, 160); tone(80, 1.6, 'sine', 0.14, 320); break;
        case 'echo': tone(330, 0.5, 'sine', 0.05, 311); tone(495, 0.5, 'sine', 0.04, 466, 0.04); break;
        case 'down': tone(400, 1.8, 'sawtooth', 0.12, 30); break;
      }
    }
  };
})();
