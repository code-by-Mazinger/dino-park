'use strict';
// Дино-парк — парк, раскопки, сборка имени из слогов, карточки с фактами. Голос — встроенный синтез речи телефона.
(() => {
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = a => a[Math.floor(Math.random() * a.length)];
const { DINOS, PRAISE } = DD;

// ─── голос: русский голос телефона, медленно и чётко ───
let voice = null;
const pickVoice = () => { const v = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('ru')); voice = v.find(x => /milena|милена/i.test(x.name)) || v[0] || null; };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.toLowerCase());
  u.lang = 'ru-RU'; if (voice) u.voice = voice; u.rate = rate; u.pitch = 1.05; speechSynthesis.speak(u);
}

// ─── звуки: рык, кисточка, колокольчик ───
let ac = null;
function audio() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } if (ac.state === 'suspended') ac.resume(); }
function tone(f, t = 0, dur = 0.5, v = 0.12, type = 'sine') { if (!ac) return; const t0 = ac.currentTime + t, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05); }
function noise(dur, f, v, t = 0) { if (!ac) return; const t0 = ac.currentTime + t, len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = f; g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t0); }
function roar() {                                                                    // рык: низкая «пила» с дрожанием + шум
  if (!ac) return; const t0 = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), fl = ac.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 1.3); lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
  fl.type = 'lowpass'; fl.frequency.value = 700; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.25, t0 + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
  o.connect(fl); fl.connect(g); g.connect(ac.destination); o.start(t0); lfo.start(t0); o.stop(t0 + 1.5); lfo.stop(t0 + 1.5); noise(1.2, 400, 0.25);
}
const chime = (k = 0) => [0, 4, 7].forEach((s, i) => tone(523.25 * Math.pow(2, (s + k) / 12), i * 0.08, 0.6, 0.1));
for (const ev of ['pointerdown', 'touchend']) addEventListener(ev, audio, { passive: true });

// ─── состояние ───
let found = Math.min(DINOS.length, +ls('dp_found') || 0);                            // сколько динозавров уже в парке (по порядку)
const name = () => ls('dp_name') || '';
let train = +ls('dp_train') || 0;                                                    // тренировок по самбо (отмечает взрослый)
const today = () => new Date().toDateString();

// ─── парк: динозавры гуляют, птеранодон летает ───
let walkers = [], last = performance.now();
function park(fresh = -1) {
  $('park').hidden = false; $('dig').hidden = true;
  $('hello').textContent = name() ? `Палеонтолог ${name()}` : '';
  $('count').textContent = found >= DINOS.length ? `Все ${DINOS.length} динозавров найдены! 🏆` : `🦕 В парке: ${found} из ${DINOS.length}`;
  const next = DINOS[Math.min(found, DINOS.length - 1)];
  $('digQ').innerHTML = found < DINOS.length ? dinoSVG(next, 'shadow') : '🏆';
  $('digSub').textContent = found < DINOS.length ? 'Кто прячется в земле?' : 'Раскопать ещё раз';
  const b = DL.belt(train); $('belt').innerHTML = `<i style="background:${b.color}"></i>Дино-пояс: ${b.name}` + (b.left ? ` · ещё ${b.left}` : ' 🏆');
  $('egg').innerHTML = eggSVG(DL.cracks(train)); $('egg').classList.toggle('wob', DL.cracks(train) > 0);
  const box = $('dinos'); box.innerHTML = ''; walkers = [];
  const W = innerWidth, H = innerHeight, k = Math.min(W, 520) / 560;                // пикселей на единицу рисунка
  DINOS.slice(0, found).forEach((d, i) => {
    const el = document.createElement('div'), svg = dinoSVG(d), vw = +svg.match(/width="([\d.]+)"/)[1];
    const flyer = d.look.st === 'fly', lane = flyer ? 0 : i % 3, depth = [0.72, 0.86, 1][lane];
    el.className = 'pd' + (i === fresh ? ' new' : ''); el.innerHTML = `<div class="flip">${svg}</div>`;
    const w = vw * k * d.scale * depth; el.style.width = w + 'px';
    const yb = flyer ? H * 0.62 : H * [0.36, 0.25, 0.13][lane] + 70;              // низ рисунка — над нижним краем
    el.style.bottom = yb + 'px'; el.style.zIndex = flyer ? 1 : 10 + lane;
    el.onclick = () => card(d);
    box.appendChild(el);
    walkers.push({ el, w, x: i === fresh ? W * 0.6 : Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: (flyer ? 60 : 18 + Math.random() * 16) * depth, rest: 0, flyer });
  });
  DL.babies(train).forEach((id, i, all) => {                                           // малыши из яйца — маленькие, впереди, прыгают
    const d = DINOS.find(x => x.id === id), el = document.createElement('div'), svg = dinoSVG(d), vw = +svg.match(/width="([\d.]+)"/)[1];
    el.className = 'pd baby' + (fresh === 'baby' && i === all.length - 1 ? ' new' : ''); el.innerHTML = `<div class="flip">${svg}</div>`;
    const w = vw * k * 0.42; el.style.width = w + 'px'; el.style.bottom = H * 0.13 + 50 + (i % 2) * 14 + 'px'; el.style.zIndex = 14;
    el.onclick = () => card(d, true); box.appendChild(el);
    walkers.push({ el, w, x: Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: 26 + Math.random() * 14, rest: 0, flyer: false });
  });
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!$('park').hidden) for (const a of walkers) {
    if (a.rest > 0) { a.rest -= dt; a.el.classList.remove('walk'); }
    else { a.x += a.dir * a.v * dt; a.el.classList.toggle('walk', !a.flyer);
      if (a.x < -a.w * 0.2 || a.x > innerWidth - a.w * 0.8) { a.dir *= -1; a.x = Math.max(-a.w * 0.2, Math.min(innerWidth - a.w * 0.8, a.x)); }
      if (!a.flyer && Math.random() < dt * 0.15) a.rest = 1.5 + Math.random() * 2.5; }
    a.el.style.transform = `translateX(${a.x}px)`; a.el.firstChild.style.transform = `scaleX(${a.dir})`;
  }
  requestAnimationFrame(step);
}

// ─── карточка динозавра: имя по слогам (нажми — услышишь), факты голосом ───
function card(d, baby = false) {
  audio(); $('cPic').innerHTML = dinoSVG(d);
  $('cName').innerHTML = d.syl.map(s => `<button data-s="${s}">${s}</button>`).join('') + `<button class="all" data-all="1">🔊</button>`;
  $('cType').textContent = (d.kind ? d.kind + ' · ' : '') + { plants: 'Ел растения 🌿', meat: 'Хищник 🍖', fish: 'Ел рыбу 🐟' }[d.diet] + ` · жил в ${{ юрский: 'юрском', меловой: 'меловом' }[d.period]} периоде`;
  $('cFacts').innerHTML = d.facts.map((f, i) => `<button class="fact" data-f="${i}"><b>🔊</b>${esc(f)}</button>`).join('');
  $('cName').onclick = e => { const b = e.target.closest('button'); if (!b) return; say(b.dataset.all ? d.n : b.dataset.s, 0.7); };
  $('cFacts').onclick = e => { const b = e.target.closest('.fact'); if (b) say(d.facts[+b.dataset.f], 0.9); };
  if (baby) $('cType').textContent = 'Малыш! Вылупился, потому что ты ходил на самбо 🥋 · ' + $('cType').textContent;
  $('card').hidden = false; say(baby ? 'Малыш ' + d.n.toLowerCase() + 'а' : d.n);
}
$('cClose').onclick = () => { $('card').hidden = true; speechSynthesis && speechSynthesis.cancel(); };

// ─── раскопки: счищаешь песок → окаменелость → собираешь имя из слогов → динозавр оживает ───
let cur = 0, sandCtx = null, brushN = 0, cleared = false, need = [], pos = 0, misses = 0;
function dig() {
  audio(); cur = found < DINOS.length ? found : Math.floor(Math.random() * DINOS.length);
  const d = DINOS[cur]; $('park').hidden = true; $('dig').hidden = false; $('task').hidden = true; $('done').hidden = true;
  $('fossil').className = ''; $('fossil').innerHTML = dinoSVG(d, 'fossil'); $('digHint').textContent = 'Счищай песок пальцем!'; $('bar').style.display = '';
  const c = $('sand'), r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = r.width * dpr; c.height = r.height * dpr; c.style.opacity = 1; c.style.display = '';
  sandCtx = c.getContext('2d'); sandCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sandCtx.globalCompositeOperation = 'source-over'; sandCtx.fillStyle = '#d9b77c'; sandCtx.fillRect(0, 0, r.width, r.height);
  for (let i = 0; i < 900; i++) { sandCtx.fillStyle = pick(['#c9a364', '#e6c992', '#b8925a', '#f0d9a8']); sandCtx.fillRect(Math.random() * r.width, Math.random() * r.height, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  for (let i = 0; i < 14; i++) { sandCtx.fillStyle = pick(['#9b8a75', '#8a7a66', '#a89880']); sandCtx.beginPath(); sandCtx.ellipse(Math.random() * r.width, Math.random() * r.height, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, 7); sandCtx.fill(); }
  cleared = false; brushN = 0; $('bar').firstElementChild.style.width = '0';
  say(found < DINOS.length ? 'Кто-то прячется в земле! Счищай песок.' : 'Раскопай ещё раз!');
}
function brush(e) {
  if (cleared || !sandCtx) return; const r = $('sand').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  sandCtx.globalCompositeOperation = 'destination-out'; sandCtx.beginPath(); sandCtx.arc(x, y, Math.max(22, r.width * 0.07), 0, 7); sandCtx.fill();
  if (++brushN % 6 === 0) { noise(0.12, 2500, 0.06); progress(); }
}
function progress() {                                                                // доля счищенного — по сетке точек
  const c = $('sand'), d = sandCtx.getImageData(0, 0, c.width, c.height).data; let open = 0, n = 0;
  for (let y = 4; y < c.height; y += 12) for (let x = 4; x < c.width; x += 12) { n++; if (d[(y * c.width + x) * 4 + 3] < 40) open++; }
  const p = open / n; $('bar').firstElementChild.style.width = Math.min(100, p / 0.55 * 100) + '%';
  if (p >= 0.55) found3();
}
function found3() {
  cleared = true; $('sand').style.opacity = 0; setTimeout(() => { $('sand').style.display = 'none'; }, 800);
  $('fossil').classList.add('glow'); chime(); $('bar').style.display = 'none'; $('digHint').textContent = 'Ого! Кто же это?';
  setTimeout(nameTask, 900);
}
['pointerdown', 'pointermove'].forEach(ev => $('sand').addEventListener(ev, e => { if (ev === 'pointerdown' || e.buttons || e.pointerType === 'touch') brush(e); }));

function nameTask() {
  const d = DINOS[cur]; need = d.syl; pos = 0; misses = 0;
  $('slots').innerHTML = need.map((_, i) => `<div class="slot${i ? '' : ' cur'}"></div>`).join('');
  $('tiles').innerHTML = DL.tiles(cur).map(s => `<button class="tile" data-s="${s}">${s}</button>`).join('');
  $('task').hidden = false; $('digHint').textContent = 'Собери его имя!';
  say('Собери его имя. Найди слог: ' + need[0], 0.8);
}
$('say').onclick = () => say(need[pos], 0.7);
$('tiles').onclick = e => {
  const b = e.target.closest('.tile'); if (!b || b.classList.contains('used') || pos >= need.length) return;
  if (b.dataset.s === need[pos]) {
    b.classList.add('used'); const sl = $('slots').children[pos]; sl.textContent = need[pos]; sl.className = 'slot ok'; tone(659 + pos * 80, 0, 0.4, 0.1);
    pos++; misses = 0; document.querySelectorAll('.tile.hint').forEach(t => t.classList.remove('hint'));
    if (pos < need.length) { $('slots').children[pos].classList.add('cur'); setTimeout(() => say(need[pos], 0.75), 350); }
    else setTimeout(alive, 500);
  } else {
    b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); say(need[pos], 0.7);
    if (++misses >= 2) [...$('tiles').children].find(t => !t.classList.contains('used') && t.dataset.s === need[pos])?.classList.add('hint');   // подсказка после двух промахов
  }
};
function alive() {
  const d = DINOS[cur], isNew = cur === found && found < DINOS.length;
  $('task').hidden = true; $('fossil').className = 'alive'; $('fossil').innerHTML = dinoSVG(d);
  roar(); setTimeout(() => say(d.n + '! ' + pick(PRAISE)), 700);
  $('doneName').textContent = d.n; $('donePraise').textContent = isNew ? `Новый динозавр в парке! ${pick(PRAISE)}` : pick(PRAISE); $('done').hidden = false; $('digHint').textContent = '';
  leaves();
  if (isNew) { found++; ls('dp_found', found); }
  $('toPark').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(isNew ? found - 1 : -1); };
}
function leaves() { for (let i = 0; i < 26; i++) { const l = document.createElement('div'); l.className = 'leaf'; l.textContent = pick(['🍃', '🌿', '⭐', '🦴']);
  l.style.left = Math.random() * 100 + 'vw'; l.style.top = '-30px'; l.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); l.style.animationDelay = Math.random() * 0.6 + 's';
  document.body.appendChild(l); setTimeout(() => l.remove(), 3200); } }
$('digBtn').onclick = dig;

// ─── самбо: яйцо трескается от тренировок, три — вылупляется малыш; отмечает взрослый (вопрос на умножение) ───
function eggSVG(c, open = false) {
  const cr = ['', 'M40,22 l6,8 l-5,6 l7,7', 'M28,40 l8,4 l-3,7 l9,3', 'M52,50 l-7,5 l4,6 l-8,4'].slice(0, c + 1).join(' ');
  return `<svg viewBox="0 0 80 96"><ellipse cx="40" cy="90" rx="26" ry="5" fill="rgba(0,0,0,.18)"/>`
    + (open ? '<path d="M14,58 Q14,90 40,90 Q66,90 66,58 L58,52 L50,60 L40,50 L30,60 L22,52 Z" fill="#f4ecd8" stroke="#c9b48a" stroke-width="2"/>'
      : `<ellipse cx="40" cy="54" rx="27" ry="35" fill="#f4ecd8" stroke="#c9b48a" stroke-width="2"/><circle cx="30" cy="40" r="5" fill="#8fc46b"/><circle cx="50" cy="60" r="6" fill="#8fc46b"/><circle cx="46" cy="32" r="3.5" fill="#8fc46b"/><circle cx="28" cy="68" r="4" fill="#8fc46b"/>`
        + (cr ? `<path d="${cr}" stroke="#5a4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : '')) + '</svg>';
}
function toast(t, ms = 2600) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
$('egg').onclick = () => { audio(); const left = 3 - DL.cracks(train); say(`Ходи на самбо — и яйцо вылупится! Осталось ${left} ${left === 1 ? 'тренировка' : 'тренировки'}.`); toast(`🥚 Ещё ${left} ${left === 1 ? 'тренировка' : 'тренировки'} по самбо — и кто-то вылупится!`); };
let gateA = 0;
$('trainBtn').onclick = () => {
  audio(); if (ls('dp_lastTrain') === today()) { toast('Сегодняшняя тренировка уже отмечена 💪'); return; }
  const g = DL.gate(); gateA = g.a; $('gQ').textContent = g.q; $('gIn').value = ''; $('gErr').textContent = ''; $('gate').hidden = false;
};
$('gNo').onclick = () => { $('gate').hidden = true; };
$('gOk').onclick = () => {
  if (+$('gIn').value !== gateA) { $('gErr').textContent = 'Неверно — это вопрос для взрослых 🙂'; return; }
  $('gate').hidden = true; const before = DL.belt(train).name; train++; ls('dp_train', train); ls('dp_lastTrain', today());
  const nb = DL.belt(train).name, beltUp = nb !== before ? ` Новый дино-пояс: ${nb}!` : '';
  if (DL.cracks(train) === 0) return hatch(beltUp);
  chime(); park(); $('egg').classList.add('wob'); const left = 3 - DL.cracks(train);
  say(`Молодец, что сходил на самбо! Яйцо треснуло. Ещё ${left} ${left === 1 ? 'тренировка' : 'тренировки'}!${beltUp}`); toast(`🥋 Тренировка засчитана! Яйцо треснуло.${beltUp}`);
};
function hatch(beltUp) {                                                              // яйцо качается, раскалывается — малыш
  const id = DL.babies(train).slice(-1)[0], d = DINOS.find(x => x.id === id);
  $('hPic').innerHTML = eggSVG(2); $('hPic').className = 'crack'; $('hTitle').textContent = 'Яйцо вылупляется…'; $('hText').textContent = ''; $('hOk').hidden = true; $('hatch').hidden = false;
  say('Ой! Кто-то вылупляется!'); noise(0.3, 3000, 0.2, 0.6); noise(0.3, 2500, 0.2, 1.2);
  setTimeout(() => {
    $('hPic').className = ''; $('hPic').innerHTML = `<div style="position:relative;width:70%">${dinoSVG(d).replace('<svg ', '<svg style="width:100%;height:auto" ')}</div>`;
    $('hTitle').textContent = `Малыш ${d.n.toLowerCase()}а!`; $('hText').textContent = `Он вылупился, потому что ты ходил на самбо! 🥋${beltUp}`; $('hOk').hidden = false;
    roar(); chime(4); leaves(); say(`Ура! Вылупился малыш ${d.n.toLowerCase()}а!${beltUp}`);
  }, 2000);
}
$('hOk').onclick = () => { $('hatch').hidden = true; speechSynthesis && speechSynthesis.cancel(); park('baby'); };
$('digBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── первый запуск: имя (хранится только на телефоне) ───
$('nameOk').onclick = () => { const n = $('nameIn').value.trim().slice(0, 14); ls('dp_name', n); $('hi').hidden = true; audio(); park(); say(`Привет${n ? ', ' + n : ''}! Ты палеонтолог. Пойдём на раскопки!`); };
park(); if (!ls('dp_name') && ls('dp_name') !== '') $('hi').hidden = false;
addEventListener('resize', () => { if (!$('park').hidden) park(); });
requestAnimationFrame(step);
if (/[?&]debug/.test(location.search)) window.TT = { dig, found3, nameTask, alive, park, cur: () => cur, need: () => need, pos: () => pos, gateA: () => gateA };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
