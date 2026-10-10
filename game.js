'use strict';
// Дино-парк — парк, раскопки, сборка имени из слогов, карточки с фактами. Голос — встроенный синтез речи телефона.
(() => {
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = a => a[Math.floor(Math.random() * a.length)];
const { DINOS, PRAISE } = DD;
// Рисунки динозавров — из нейросети (dinos/*.webp, вырезаны из одного листа); окаменелость и силуэт — фильтром той же картинки
const dimg = (d, mode = 'color') => `<img class="di ${mode}" src="dinos/${d.id}.webp" alt="${d.n}" draggable="false">`;

// ─── голос: русский голос телефона, медленно и чётко ───
let voice = null;
const pickVoice = () => { const v = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('ru')); voice = v.find(x => /milena|милена/i.test(x.name)) || v[0] || null; };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let sayT = 0;
function say(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return;
  const s = speechSynthesis, u = new SpeechSynthesisUtterance(text.toLowerCase());
  u.lang = 'ru-RU'; if (voice) u.voice = voice; u.rate = rate; u.pitch = 1.05; clearTimeout(sayT); s.resume();   // resume: после сворачивания iOS оставляет синтез на паузе
  if (s.speaking || s.pending) { s.cancel(); sayT = setTimeout(() => s.speak(u), 150); } else s.speak(u);   // iOS Safari теряет фразу, если speak() сразу после cancel()
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
  $('park').hidden = false; $('dig').hidden = true; ['hungry', 'prof', 'size', 'stories', 'story', 'gamesSheet'].forEach(id => $(id).hidden = true); if (HG) HG.done = true;
  $('hello').textContent = name() ? `Палеонтолог ${name()}` : '';
  $('count').textContent = found >= DINOS.length ? `Все ${DINOS.length} динозавров найдены! 🏆` : `🦕 В парке: ${found} из ${DINOS.length}`;
  const next = DINOS[Math.min(found, DINOS.length - 1)];
  $('digQ').innerHTML = found < DINOS.length ? dimg(next, 'shadow') : '🏆';
  $('digSub').textContent = found < DINOS.length ? 'Кто прячется в земле?' : 'Раскопать ещё раз';
  const b = DL.belt(train); $('belt').innerHTML = `<i style="background:${b.color}"></i>Дино-пояс: ${b.name}` + (b.left ? ` · ещё ${b.left}` : ' 🏆');
  $('egg').innerHTML = eggSVG(DL.cracks(train)); $('egg').classList.toggle('wob', DL.cracks(train) > 0);
  const box = $('dinos'); box.innerHTML = ''; walkers = [];
  const W = innerWidth, H = innerHeight, k = Math.min(W, 520);                      // ширина «обычного» динозавра — доля этой величины
  DINOS.slice(0, found).forEach((d, i) => {
    const el = document.createElement('div'), flyer = d.fly, lane = flyer ? 0 : i % 3, depth = [0.6, 0.8, 1][lane];
    el.className = 'pd' + (flyer ? ' fly' : '') + (i === fresh ? ' new' : ''); el.innerHTML = `<div class="flip">${dimg(d)}</div>`;
    const w = k * 0.34 * d.scale * depth; el.style.width = w + 'px';
    const yb = flyer ? H * 0.68 : H * [0.335, 0.255, 0.165][lane];                 // ноги — на поляне фона: дальние выше и мельче
    el.style.bottom = yb + 'px'; el.style.zIndex = flyer ? 1 : 10 + lane;
    el.onclick = () => card(d);
    box.appendChild(el);
    walkers.push({ el, w, x: i === fresh ? W * 0.6 : Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: (flyer ? 60 : 18 + Math.random() * 16) * depth, rest: 0, flyer });
  });
  DL.babies(train).forEach((id, i, all) => {                                           // малыши из яйца — маленькие, впереди, прыгают
    const d = DINOS.find(x => x.id === id), el = document.createElement('div');
    el.className = 'pd baby' + (fresh === 'baby' && i === all.length - 1 ? ' new' : ''); el.innerHTML = `<div class="flip">${dimg(d)}</div>`;
    const w = k * 0.15; el.style.width = w + 'px'; el.style.bottom = H * 0.15 + (i % 2) * 14 + 'px'; el.style.zIndex = 14;
    el.onclick = () => card(d, true); box.appendChild(el);
    walkers.push({ el, w, x: Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: 26 + Math.random() * 14, rest: 0, flyer: false });
  });
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (HG && !HG.done && !$('hungry').hidden) {                                      // падающие слоги
    HG.spawn -= dt; if (HG.spawn <= 0 && HG.cards.length < 3) { spawnCard(); HG.spawn = 1.6; }
    const lim = 100 * ($('eater').getBoundingClientRect().top - 60) / innerHeight;      // падают до облачка, не ниже
    for (const c of HG.cards) { c.y += c.v * dt; c.el.style.left = c.x + '%'; c.el.style.top = c.y + '%'; if (c.y > lim) c.el.remove(); }
    HG.cards = HG.cards.filter(c => c.y <= lim);
    const t = HG.tut && HG.cards.find(c => c.s === HG.target); $('hHand').hidden = !t;   // первая игра: рука показывает нужный слог
    if (t) { const r = t.el.getBoundingClientRect(); $('hHand').style.left = r.left + r.width / 2 + 'px'; $('hHand').style.top = r.bottom + 'px'; }
  }
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
  audio(); $('cPic').innerHTML = dimg(d);
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
const digImg = new Image(); digImg.src = 'dig.jpg';
// Раскопки в два слоя: песок (тот же кусок фона) → тёмная земля. Под песком — силуэт, под землёй — окаменелость.
// fill — чем закрашен слой, under — что видно в дырках (следующий слой), stage — как показан динозавр под слоем
const LAYERS = [{ fill: null, under: '#a8743f', stage: 'sil', say: 'Ого! Видно силуэт. Остался последний слой!' },
  { fill: '#a8743f', under: '#9a6a3a', stage: 'fossil', say: '' }];
let cur = 0, sandCtx = null, brushN = 0, cleared = false, need = [], pos = 0, misses = 0, layer = 0;
function dig() {
  audio(); cur = found < DINOS.length ? found : Math.floor(Math.random() * DINOS.length);
  const d = DINOS[cur]; $('park').hidden = true; $('dig').hidden = false; $('task').hidden = true; $('done').hidden = true;
  $('fossil').className = ''; $('fossil').innerHTML = dimg(d, 'sil'); $('bar').style.visibility = '';
  const c = $('sand'); c.style.display = ''; c.style.opacity = 1;                    // сначала показать слой, потом мерить (иначе 0×0 и песка нет)
  const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = r.width * dpr; c.height = r.height * dpr; sandCtx = c.getContext('2d'); sandCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layer = 0; cleared = false; brushN = 0; fillLayer();
  say(found < DINOS.length ? 'Кто-то прячется в земле! Счищай песок со всего квадрата.' : 'Раскопай ещё раз!');
}
function fillLayer() {
  const c = $('sand'), r = c.getBoundingClientRect(), L = LAYERS[layer];
  $('fossil').firstElementChild.className = 'di ' + L.stage; $('pit').style.backgroundColor = L.under;
  sandCtx.globalCompositeOperation = 'source-over'; sandCtx.fillStyle = L.fill || '#f2c27f'; sandCtx.fillRect(0, 0, r.width, r.height);
  if (!L.fill && digImg.complete && digImg.naturalWidth) {                            // верхний слой — тот же участок, что виден на фоне (как object-fit: cover)
    const k = Math.max(innerWidth / digImg.naturalWidth, innerHeight / digImg.naturalHeight), ox = (innerWidth - digImg.naturalWidth * k) / 2, oy = (innerHeight - digImg.naturalHeight * k) / 2;
    sandCtx.drawImage(digImg, (r.left - ox) / k, (r.top - oy) / k, r.width / k, r.height / k, 0, 0, r.width, r.height);
  }
  for (let i = 0; i < 260; i++) { sandCtx.fillStyle = pick(['rgba(120,80,40,.3)', 'rgba(255,230,180,.3)', 'rgba(90,60,30,.25)']); sandCtx.beginPath(); sandCtx.arc(Math.random() * r.width, Math.random() * r.height, 0.8 + Math.random() * 1.6, 0, 7); sandCtx.fill(); }
  for (let i = 0; i < 12; i++) { sandCtx.fillStyle = pick(['#9b8a75', '#8a7a66', '#a89880']); sandCtx.beginPath(); sandCtx.ellipse(Math.random() * r.width, Math.random() * r.height, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, 7); sandCtx.fill(); }
  $('bar').firstElementChild.style.width = '0'; $('digHint').textContent = `Слой ${layer + 1} из ${LAYERS.length} — счищай весь квадрат!`;
}
function brush(e) {
  if (cleared || !sandCtx) return; const r = $('sand').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  sandCtx.globalCompositeOperation = 'destination-out'; sandCtx.beginPath(); sandCtx.arc(x, y, Math.max(24, r.width * 0.08), 0, 7); sandCtx.fill();
  if (++brushN % 6 === 0) { noise(0.12, 2500, 0.06); progress(); }
}
function progress() {                                                                // доля счищенного — по сетке точек, включая края и углы
  const c = $('sand'), d = sandCtx.getImageData(0, 0, c.width, c.height).data; let open = 0, n = 0;
  for (let y = 2; y < c.height; y += 10) for (let x = 2; x < c.width; x += 10) { n++; if (d[(y * c.width + x) * 4 + 3] < 40) open++; }
  const p = open / n; $('bar').firstElementChild.style.width = Math.min(100, p / 0.93 * 100) + '%';
  if (p < 0.93) return;
  if (layer < LAYERS.length - 1) { const said = LAYERS[layer].say; layer++; chime(layer); fillLayer(); say(said); }        // остаток слоя осыпается сам
  else found3();
}
function found3() {
  cleared = true; $('sand').style.opacity = 0; setTimeout(() => { $('sand').style.display = 'none'; }, 800);
  $('fossil').classList.add('glow'); chime(); $('bar').style.visibility = 'hidden'; $('digHint').textContent = 'Ого! Кто же это?';
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
  $('task').hidden = true; $('fossil').className = 'alive'; $('fossil').innerHTML = dimg(d);
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
    $('hPic').className = ''; $('hPic').innerHTML = `<div style="width:62%">${dimg(d)}</div>`;
    $('hTitle').textContent = `Малыш ${d.n.toLowerCase()}а!`; $('hText').textContent = `Он вылупился, потому что ты ходил на самбо! 🥋${beltUp}`; $('hOk').hidden = false;
    roar(); chime(4); leaves(); say(`Ура! Вылупился малыш ${d.n.toLowerCase()}а!${beltUp}`);
  }, 2000);
}
$('hOk').onclick = () => { $('hatch').hidden = true; speechSynthesis && speechSynthesis.cancel(); park('baby'); };
$('digBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── Голодный динозавр: в облачке он «просит» слог — найди его среди падающих и нажми. Первые 5 — с текстом, следующие 5 — только на слух ───
let HG = null;
const LANES = [22, 50, 78];
function hungry() {
  audio(); const ds = DINOS.slice(0, Math.max(1, found)).filter(d => !d.fly), d = pick(ds.length ? ds : [DINOS[0]]);
  $('park').hidden = true; $('hungry').hidden = false; $('hDone').hidden = true; $('falls').innerHTML = ''; $('eaterImg').innerHTML = dimg(d);
  HG = { pool: DL.pool(found), eaten: 0, cards: [], spawn: 0.2, misses: 0, d, done: false, target: '', tut: !ls('dp_htut') };
  nextTarget();
  say(HG.tut ? `${d.n} проголодался! Нажми на слог, который он просит: ${HG.target}` : `${d.n} проголодался! Хочу: ${HG.target}`, 0.85);
}
const listen = () => HG.eaten >= 5;                                                 // вторая половина — на слух
function want() { $('hWant').innerHTML = `Хочу: ${!listen() || HG.misses >= 2 ? `<b>${HG.target}</b>` : '<b>?</b>'} 🔊`; }
function nextTarget() { HG.target = pick(HG.pool.filter(x => x !== HG.target)); HG.misses = 0; want(); $('hScore').textContent = `🍖 ${HG.eaten} из 10`; }
function spawnCard() {                                                              // не больше трёх, без повторов, каждая — на своей дорожке
  const onScr = HG.cards.map(c => c.s), free = LANES.filter(x => !HG.cards.some(c => c.x === x && c.y < 40)); if (!free.length) return;
  const others = HG.pool.filter(x => x !== HG.target && !onScr.includes(x));
  const s = !onScr.includes(HG.target) ? HG.target : others.length ? pick(others) : null; if (!s) return;
  const el = document.createElement('button'), c = { el, s, x: pick(free), y: 14, v: 4 + Math.random() * 1.5 };
  el.className = 'fc'; el.textContent = s; el.onpointerdown = () => feed(c); $('falls').appendChild(el); HG.cards.push(c);
}
function feed(c) {
  if (c.gone || HG.done) return;
  if (c.s !== HG.target) {                                                          // не то — динозавр качает головой
    c.el.classList.remove('no'); void c.el.offsetWidth; c.el.classList.add('no'); $('eater').classList.remove('nope'); void $('eater').offsetWidth; $('eater').classList.add('nope');
    HG.misses++; want(); say(`Не то! Я хочу ${HG.target}`, 0.8); return;
  }
  c.gone = true; HG.cards = HG.cards.filter(x => x !== c); const e = $('eaterImg').getBoundingClientRect();
  c.el.classList.add('eat'); c.el.style.left = e.left + e.width * 0.85 + 'px'; c.el.style.top = e.top + e.height * 0.15 + 'px'; setTimeout(() => c.el.remove(), 460);
  $('eater').classList.remove('chomp'); void $('eater').offsetWidth; $('eater').classList.add('chomp'); noise(0.15, 300, 0.3); tone(523 + HG.eaten * 40, 0.1, 0.3, 0.08);
  if (HG.tut) { HG.tut = false; ls('dp_htut', 1); $('hHand').hidden = true; }
  if (++HG.eaten >= 10) return hungryWin();
  nextTarget();
  setTimeout(() => say(HG.eaten === 5 ? `Ням! А теперь слушай внимательно — я не буду показывать слог. Хочу: ${HG.target}` : pick(['Ам! ', 'Вкусно! ', 'Ням-ням! ']) + 'Хочу: ' + HG.target, 0.85), 300);
}
function hungryWin() {
  HG.done = true; HG.cards.forEach(c => c.el.remove()); HG.cards = []; $('hHand').hidden = true; $('hScore').textContent = '🍖 10 из 10'; roar(); leaves();
  $('hDoneText').textContent = `${HG.d.n} съел 10 слогов. ${pick(PRAISE)}`; $('hDone').hidden = false; say(`${HG.d.n} наелся! ${pick(PRAISE)}`);
}
$('hungryBtn').onclick = hungry; $('hAgain').onclick = hungry;
$('hSay').onclick = $('hWant').onclick = () => HG && say(HG.target, 0.7);
$('hBack').onclick = $('hHome').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── Профессор-путаник: 8 утверждений, половина — его ошибки. Прочитал сам (без 🔊) и ответил верно — звёздочка ───
let PQ = null;
const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c;
function prof() {
  audio(); PQ = { q: DL.prof(found), i: 0, caught: 0, right: 0, self: 0, heard: false };
  $('park').hidden = true; $('prof').hidden = false; $('pDone').hidden = true; showQ();
  say('Здравствуй, палеонтолог! Я профессор, и я всё путаю. Проверь меня!', 0.9);
}
function showQ() {
  const x = PQ.q[PQ.i]; PQ.heard = false;
  $('pText').textContent = x.text; $('pDino').innerHTML = dimg(x.d); $('pFace').className = ''; $('pAns').hidden = false; $('pFeed').hidden = true;
  $('pScore').textContent = `Вопрос ${PQ.i + 1} из ${PQ.q.length} · ⭐ ${PQ.self}`;
}
function answer(saysTrue) {
  const x = PQ.q[PQ.i], ok = saysTrue === x.truth, self = ok && !PQ.heard;
  if (ok) PQ.right++; if (ok && !x.truth) PQ.caught++; if (self) PQ.self++;
  const t = ok ? (x.truth ? 'Верно! Ты знаешь динозавров лучше меня!' : `Ой, я перепутал! Ты прав. ${x.d.wrong[1]}`)
    : (x.truth ? `Нет-нет, это правда! ${x.text}` : `Ха, это была моя ошибка! ${x.d.wrong[1]}`);
  if (ok && !x.truth) $('pFace').className = 'oops';
  ok ? chime() : tone(220, 0, 0.35, 0.08);
  $('pFeedText').textContent = t + (self ? ' ⭐ Ты прочитал сам!' : ''); $('pAns').hidden = true; $('pFeed').hidden = false;
  $('pScore').textContent = `Вопрос ${PQ.i + 1} из ${PQ.q.length} · ⭐ ${PQ.self}`;
  say(t + (self ? ' Звёздочка: ты прочитал сам!' : ''), 0.9);
}
$('pSay').onclick = () => { PQ.heard = true; say(PQ.q[PQ.i].text, 0.85); };
$('pYes').onclick = () => answer(true); $('pNo').onclick = () => answer(false);
$('pNext').onclick = () => { if (++PQ.i < PQ.q.length) showQ(); else {
  $('pDoneTitle').textContent = `Ты поймал ${PQ.caught} ${plural(PQ.caught, 'ошибку', 'ошибки', 'ошибок')} профессора!`;
  $('pDoneText').textContent = `Правильных ответов: ${PQ.right} из ${PQ.q.length}. ⭐ Прочитал сам: ${PQ.self}.`; $('pDone').hidden = false; leaves(); roar();
  say(`Ты поймал ${PQ.caught} ${plural(PQ.caught, 'ошибку', 'ошибки', 'ошибок')}! Спасибо, что учишь профессора!`); } };
$('profBtn').onclick = prof; $('pAgain').onclick = prof;
$('pBack').onclick = $('pHome').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── «🎮 Игры»: выбор занятия ───
$('gamesBtn').onclick = () => { audio(); $('gamesSheet').hidden = false; };
$('gamesClose').onclick = () => { $('gamesSheet').hidden = true; };
$('gamesSheet').addEventListener('click', e => { if (e.target.closest('.gtile')) $('gamesSheet').hidden = true; });

// ─── «Я и динозавры»: ребёнок и динозавр в одном масштабе (рост вводит взрослый) ───
let sizeI = 0;
const kidSVG = h => `<svg viewBox="0 0 40 100" height="${h}" width="${h * 0.4}"><circle cx="20" cy="12" r="10" fill="#f2c7a5"/><path d="M8 26 Q20 20 32 26 L34 60 L26 60 L26 100 L21 100 L21 64 L19 64 L19 100 L14 100 L14 60 L6 60 Z" fill="#2f6bff"/><circle cx="16" cy="11" r="1.6" fill="#222"/><circle cx="24" cy="11" r="1.6" fill="#222"/><path d="M15 16 Q20 20 25 16" stroke="#a3344f" stroke-width="1.6" fill="none"/></svg>`;
function sizeOpen() {
  audio(); if (!found) { toast('Сначала найди динозавра на раскопках! 🦴'); return; }
  if (!+ls('dp_cm')) { $('hIn').value = ''; $('hErr').textContent = ''; $('heightAsk').hidden = false; return; }
  $('park').hidden = true; $('size').hidden = false; showSize();
}
async function showSize() {
  const list = DINOS.slice(0, found); sizeI = (sizeI + list.length) % list.length; const d = list[sizeI], cm = +ls('dp_cm'), h = cm / 100;
  const st = $('sStage'), W = st.clientWidth, Hs = st.clientHeight, img = new Image(); img.src = `dinos/${d.id}.webp`;
  try { await img.decode(); } catch (e) {}
  const asp = img.naturalHeight / img.naturalWidth || 0.6, gap = 0.4;
  const ppm = Math.min((W - 10) / (h * 0.4 + gap + d.len), Hs * 0.9 / (d.len * asp), Hs * 0.9 / h);   // метр → пиксели, чтобы влезли оба
  const kh = h * ppm, dw = d.len * ppm;
  st.querySelectorAll('.kid,.sd').forEach(e => e.remove());
  st.insertAdjacentHTML('beforeend', `<div class="kid" style="left:4px">${kidSVG(kh)}<span>${esc(name() || 'Я')} · ${cm} см</span></div>`
    + `<div class="sd" style="left:${4 + kh * 0.4 + gap * ppm}px;width:${dw}px">${dimg(d)}</div>`);
  const t = DL.compare(d, cm).text; $('sText').textContent = t; say(t, 0.9);
}
$('sizeBtn').onclick = sizeOpen;
$('sPrev').onclick = () => { sizeI--; showSize(); }; $('sNext').onclick = () => { sizeI++; showSize(); };
$('sSay').onclick = () => say($('sText').textContent, 0.9);
$('sEdit').onclick = () => { $('hIn').value = ls('dp_cm') || ''; $('hErr').textContent = ''; $('heightAsk').hidden = false; };
$('hNoBtn').onclick = () => { $('heightAsk').hidden = true; };
$('hOkBtn').onclick = () => { const v = Math.round(+$('hIn').value); if (!(v >= 60 && v <= 200)) { $('hErr').textContent = 'Введите рост от 60 до 200 см'; return; }
  ls('dp_cm', v); $('heightAsk').hidden = true; $('park').hidden = true; $('size').hidden = false; showSize(); };
$('sBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── Дино-истории: короткий рассказ (каждое предложение можно послушать) и вопрос; прочитал сам — звёздочка ───
const readIds = (k = 'dp_read') => { try { return JSON.parse(ls(k) || '[]'); } catch (e) { return []; } };   // dp_read — пройдена, dp_self — прочитал сам
let ST = null;
function storiesOpen() {
  audio(); $('park').hidden = true; $('story').hidden = true; $('stories').hidden = false;
  const done = readIds(), self = readIds('dp_self');
  $('stList').innerHTML = DD.STORIES.map((st, i) => { const d = DINOS.find(x => x.id === st.id), open = DINOS.indexOf(d) < found;
    return `<button class="stc" data-i="${i}" ${open ? '' : 'disabled'}>${open ? dimg(d) : dimg(d, 'shadow')}<div>${open ? 'Про ' + d.n.toLowerCase() + 'а' : 'Найди на раскопках'}</div><span>${self.includes(st.id) ? '⭐' : done.includes(st.id) ? '✅' : open ? '📖' : '🔒'}</span></button>`; }).join('');
}
$('stList').onclick = e => { const b = e.target.closest('.stc'); if (b && !b.disabled) story(+b.dataset.i); };
function story(i) {
  const st = DD.STORIES[i], d = DINOS.find(x => x.id === st.id); ST = { st, heard: false, done: false };
  $('stories').hidden = true; $('story').hidden = false; $('rTitle').textContent = d.n; $('rPic').innerHTML = dimg(d);
  $('rText').innerHTML = st.t.map((t, k) => `<button class="sent" data-k="${k}">${esc(t)}</button>`).join('');
  $('rQText').textContent = st.q; $('rFeed').textContent = '';
  $('rAns').innerHTML = st.a.map((a, k) => ({ a, k })).sort(() => Math.random() - 0.5).map(x => `<button data-k="${x.k}">${esc(x.a)}</button>`).join('');
  $('rBox').scrollTop = 0; say('Прочитай историю. Если трудно — нажми на предложение, и я прочитаю.', 0.9);
}
$('rText').onclick = e => { const b = e.target.closest('.sent'); if (!b) return; ST.heard = true; document.querySelectorAll('.sent.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); say(ST.st.t[+b.dataset.k], 0.85); };
$('rAns').onclick = e => {
  const b = e.target.closest('button'); if (!b || ST.done) return;
  if (+b.dataset.k !== 0) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); $('rFeed').textContent = 'Не то. Перечитай историю — ответ там!'; say('Не то. Перечитай историю — ответ там!', 0.9); return; }
  ST.done = true; b.classList.add('yes'); chime(); leaves();
  const self = !ST.heard, r = readIds(); if (!r.includes(ST.st.id)) { r.push(ST.st.id); ls('dp_read', JSON.stringify(r)); }
  const sr = readIds('dp_self'); if (self && !sr.includes(ST.st.id)) { sr.push(ST.st.id); ls('dp_self', JSON.stringify(sr)); }
  const t = `Правильно! ${self ? '⭐ Ты прочитал историю сам!' : pick(PRAISE)}`; $('rFeed').textContent = t; say(t.replace('⭐ ', ''), 0.9);
};
$('storiesBtn').onclick = storiesOpen;
$('stBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };
$('rBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); storiesOpen(); };

// ─── первый запуск: имя (хранится только на телефоне) ───
$('nameOk').onclick = () => { const n = $('nameIn').value.trim().slice(0, 14); ls('dp_name', n); $('hi').hidden = true; audio(); park(); say(`Привет${n ? ', ' + n : ''}! Ты палеонтолог. Пойдём на раскопки!`); };
park(); if (!ls('dp_name') && ls('dp_name') !== '') $('hi').hidden = false;
addEventListener('resize', () => { if (!$('park').hidden) park(); });
requestAnimationFrame(step);
if (/[?&]debug/.test(location.search)) window.TT = { dig, found3, nameTask, alive, park, cur: () => cur, need: () => need, pos: () => pos, gateA: () => gateA, HG: () => HG, PQ: () => PQ };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
