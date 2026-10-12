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
let stars = +ls('dp_stars') || 0, newB = -1;                                        // звёзды «прочитал сам» копятся на постройки в парке
function addStar() { const was = DL.build(stars).n; ls('dp_stars', ++stars);
  const nw = BOY.ITEMS.find(x => x.need === stars); if (nw) setTimeout(() => toast(`👕 В гардеробе новая вещь: ${nw.n}!`, 3500), 1500); if (DL.build(stars).n === was) return null; newB = was; return DD.BUILDS[was]; }
const built = b => b ? ` 🏗️ В парке появилось: ${b[1]}!` : '';
let train = +ls('dp_train') || 0;
const logEv = e => { let v = []; try { v = JSON.parse(ls('dp_ev') || '[]'); } catch (x) {} v.push(e); ls('dp_ev', JSON.stringify(v.slice(-10))); };   // для писем от динозавров                                                    // тренировок по самбо (отмечает взрослый)
const today = () => new Date().toDateString();

// ─── парк: динозавры гуляют, птеранодон летает ───
let walkers = [], last = performance.now();
let pv = 0;                                                                           // какой участок парка: 0 — парк (первые 15 и малыши), 1 — Долина экспедиции (16–25)
const PV1 = 15;
function park(fresh = -1) {
  if (typeof fresh === 'number' && fresh >= 0) pv = fresh >= PV1 ? 1 : 0; else if (fresh === 'baby') pv = 0;
  if (found <= PV1) pv = 0;
  $('park').classList.toggle('v2', pv === 1); $('pvBtn').hidden = found <= PV1;
  $('pvBtn').className = pv ? 'l' : 'r'; $('pvBtn').textContent = pv ? '◀ Парк' : 'Долина ▶';
  $('park').hidden = false; $('dig').hidden = true; mailBadge(); nightSet(); ['hungry', 'prof', 'size', 'stories', 'story', 'sent', 'ward', 'mus', 'moves', 'gamesSheet'].forEach(id => $(id).hidden = true); if (HG) HG.done = true;
  $('hello').textContent = (name() ? `Палеонтолог ${name()}` : '') + (pv ? ' · Долина экспедиции' : '');
  $('count').textContent = found >= DINOS.length ? `Все ${DINOS.length} динозавров найдены! 🏆` : `🦕 В парке: ${found} из ${DINOS.length}`;
  const next = DINOS[Math.min(found, DINOS.length - 1)];
  $('digQ').innerHTML = found < DINOS.length ? dimg(next, 'shadow') : '🏆';
  $('digSub').textContent = found < DINOS.length ? 'Кто прячется в земле?' : 'Раскопать ещё раз';
  const b = DL.belt(train); $('belt').innerHTML = `<i style="background:${b.color}"></i>Дино-пояс: ${b.name}` + (b.left ? ` · ещё ${b.left}` : ' 🏆');
  $('egg').innerHTML = eggSVG(DL.cracks(train), false, DL.nextBaby(train)); $('egg').classList.toggle('wob', DL.cracks(train) > 0);
  const box = $('dinos'); box.innerHTML = ''; walkers = [];
  const W = innerWidth, H = innerHeight, k = Math.min(W, 520);                      // ширина «обычного» динозавра — доля этой величины
  const here = (d, i) => i < found && (pv ? i >= PV1 : i < PV1), flip = pv === 1;      // в Долине фон зеркальный — вода слева
  const land = DINOS.filter((d, i) => here(d, i) && !d.fly && !d.swim).length, fit = Math.min(1, Math.sqrt(13 / Math.max(1, land)));   // больше 13 на поляне — все чуть мельче
  const bk = Math.max(W / 900, H / 1575), bl = (W - 900 * bk) / 2;                  // как park.jpg (900×1575, cover, низ к низу) лёг на экран — чтобы плавать в воде
  DINOS.forEach((d, i) => { if (!here(d, i)) return;
    const el = document.createElement('div'), flyer = d.fly, swim = d.swim, lane = flyer || swim ? 0 : i % 3, depth = swim ? 0.5 : [0.6, 0.8, 1][lane];
    el.className = 'pd' + (flyer ? ' fly' : '') + (swim ? ' swim' : '') + (i === fresh ? ' new' : '') + (golds().includes(d.id) ? ' gold' : ''); el.innerHTML = `<div class="flip">${dimg(d)}</div>`;
    const w = k * 0.34 * d.scale * depth * (flyer || swim ? 1 : fit); el.style.width = w + 'px';
    const yb = flyer ? H * 0.68 : swim ? 675 * bk : H * [0.335, 0.255, 0.165][lane]; // ноги — на поляне фона: дальние выше и мельче; морские — в воде (вода на фоне: x 500–880, низ ~880)
    el.style.bottom = yb + 'px'; el.style.zIndex = flyer ? 1 : swim ? 2 : 10 + lane;
    const wl = flip ? W - (bl + 880 * bk) : bl + 500 * bk, wr = flip ? W - (bl + 500 * bk) : bl + 880 * bk;   // вода по горизонтали
    const lo = swim ? Math.max(0, wl) : -w * 0.2, hi = swim ? Math.max(lo, Math.min(wr, W) - w * 0.9) : W - w * 0.8;
    el.onclick = () => card(d);
    box.appendChild(el);
    walkers.push({ el, w, lo, hi, x: swim ? lo + Math.random() * (hi - lo) : i === fresh ? W * 0.6 : Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: (flyer ? 60 : swim ? 30 : 18 + Math.random() * 16) * depth, rest: 0, flyer: flyer || swim });
  });
  if (!pv) DL.grow(train).forEach(({ id, stage }, i, all) => {                                  // малыши из яйца — впереди, прыгают; от тренировок растут: малыш → подросток → взрослый
    const d = DINOS.find(x => x.id === id), el = document.createElement('div');
    el.className = 'pd baby' + (fresh === 'baby' && i === all.length - 1 ? ' new' : ''); el.innerHTML = `<div class="flip">${dimg(d)}</div>`;
    const w = k * [0.15, 0.22, 0.3 * d.scale][stage]; el.style.width = w + 'px'; el.style.bottom = H * 0.15 + (i % 2) * 14 + 'px'; el.style.zIndex = 14;
    el.onclick = () => card(d, stage + 1); box.appendChild(el);
    walkers.push({ el, w, lo: -w * 0.2, hi: W - w * 0.8, x: Math.random() * (W - w), dir: Math.random() < 0.5 ? -1 : 1, v: 26 + Math.random() * 14, rest: 0, flyer: false });
  });
  const bw = k * 0.15, be = document.createElement('div');                          // палеонтолог в своём наряде
  be.className = 'pd boy'; be.innerHTML = `<div class="flip">${BOY.svg(outfit())}</div>`; be.style.width = bw + 'px'; be.style.bottom = H * 0.2 + 'px'; be.style.zIndex = 15; be.onclick = wardOpen; box.appendChild(be);
  walkers.push({ el: be, w: bw, lo: 0, hi: W - bw, x: W * 0.35, dir: 1, v: 22, rest: 0, flyer: false });
  const B = DL.build(stars), BX = [0.1, 0.84, 0.34, 0.59, 0.22, 0.47, 0.71, 0.93];    // постройки у края поляны, за динозаврами; 5-я и дальше — второй ряд, мельче, в промежутках первого
  $('stars').textContent = B.next ? `⭐ ${stars} · ещё ${B.left} до ${B.next[0]}` : `⭐ ${stars} · парк построен 🏆`;
  DD.BUILDS.slice(0, pv ? 0 : B.n).forEach(([, n, id], i) => { const el = document.createElement('div'); el.className = 'bd' + (i > 3 ? ' far' : '') + (i === newB ? ' new' : ''); el.innerHTML = `<img src="builds/${id}.webp" alt="${n}" draggable="false">`; el.style.width = k * (i > 3 ? 0.17 : 0.22) + 'px';
    el.style.left = BX[i] * 100 + '%'; el.style.bottom = H * (i > 3 ? 0.405 : 0.345) + 'px'; el.onclick = id === 'museum' ? museum : () => say(n, 0.9); box.appendChild(el); });
  if (night() && ls('dp_tale') === nightKey()) sleepAll();
  if (newB >= 0) { const n = DD.BUILDS[newB][1]; newB = -1; setTimeout(() => { leaves(); say('В парке новая постройка: ' + n + '!', 0.9); }, 500); }
}
// ─── Письма от динозавров: раз в день, по последнему событию; прочитал сам и угадал, кто написал, — звезда ───
const jget = (k, d) => { try { return JSON.parse(ls(k) || 'null') ?? d; } catch (e) { return d; } };
function mailToday() {
  let m = jget('dp_mail', null); if (!found) return null;
  if (!m || m.date !== today()) { const ev = jget('dp_ev', []); ls('dp_ev', '[]');
    m = { date: today(), ...DL.letter(ev.slice(-1)[0] || null, { name: name(), found, babies: DL.babies(train) }), read: false, done: false, heard: false }; ls('dp_mail', JSON.stringify(m)); }
  return m;
}
function mailBadge() { const m = mailToday(); $('mailBtn').hidden = !m; $('mailBtn').classList.toggle('new', !!m && !m.read); }
function mailOpen() {
  audio(); const m = mailToday(); if (!m) return; m.read = true; ls('dp_mail', JSON.stringify(m)); mailBadge();
  $('mlText').innerHTML = m.lines.map((t, k) => `<button class="sent" data-k="${k}">${esc(t)}</button>`).join(''); $('mlQ').textContent = m.q;
  $('mlAns').innerHTML = m.opts.map(id => `<button data-id="${id}" ${m.done ? 'disabled' : ''} class="${m.done && id === m.from ? 'yes' : ''}">${DINOS.find(d => d.id === id).n}</button>`).join('');
  const d = DINOS.find(x => x.id === m.from); $('mlPic').innerHTML = m.done ? dimg(d) : '✉️'; $('mlFeed').textContent = m.done ? `Это написал ${d.n.toLowerCase()}!` : '';
  $('mail').hidden = false; if (!m.done) say('Тебе письмо! Прочитай его сам. Если трудно — нажми на строчку.', 0.9);
}
$('mlText').onclick = e => { const b = e.target.closest('.sent'); if (!b) return; const m = mailToday(); m.heard = true; ls('dp_mail', JSON.stringify(m)); say(m.lines[+b.dataset.k], 0.85); };
$('mlAns').onclick = e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; const m = mailToday(), d = DINOS.find(x => x.id === m.from);
  if (b.dataset.id !== m.from) { m.miss = true; ls('dp_mail', JSON.stringify(m)); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); $('mlFeed').textContent = 'Не он. Перечитай письмо — там написано!'; say('Не он. Перечитай письмо!', 0.9); return; }
  m.done = true; ls('dp_mail', JSON.stringify(m)); b.classList.add('yes'); $('mlPic').innerHTML = dimg(d); chime(); leaves();
  const self = !m.heard && !m.miss, t = `Правильно! Это написал ${d.n.toLowerCase()}.` + (self ? ' ⭐ Ты прочитал письмо сам! +1 звезда в парк!' + built(addStar()) : '');
  $('mlFeed').textContent = t; say(t.replace('⭐ ', ''), 0.9); [...$('mlAns').children].forEach(x => x.disabled = true);
};
$('mailBtn').onclick = mailOpen;
$('mlClose').onclick = () => { $('mail').hidden = true; speechSynthesis && speechSynthesis.cancel(); };

// ─── Ночь по часам телефона (с 20 до 7): темно, светлячки; «Сказка на ночь» — прочитал предложение, малыш уснул ───
const nightKey = () => { const d = new Date(); if (d.getHours() < 7) d.setDate(d.getDate() - 1); return d.toDateString(); };
const night = () => DL.isNight(new Date().getHours()) || /[?&]night/.test(location.search);
function nightSet() { const n = night(); $('park').classList.toggle('night', n); $('taleBtn').hidden = !n || ls('dp_tale') === nightKey(); }
function sleepAll() { walkers.forEach(a => { a.rest = 1e9; a.el.classList.add('sleep'); }); }
let TL = null;
function taleOpen() {
  audio(); const n = +ls('dp_taleN') || 0; TL = { t: DL.TALES[n % DL.TALES.length], i: 0, heard: false };
  $('taleBtn').hidden = true; $('tale').hidden = false; taleShow(); say('Сказка на ночь. Читай малышам по одному предложению — и они уснут.', 0.85);
}
function taleShow() { $('tlText').textContent = TL.t[TL.i]; $('tlCount').textContent = `💤 ${TL.i} из ${TL.t.length}`; $('tlNext').textContent = 'Прочитал ▶'; }
$('tlSay').onclick = () => { if (!TL) return; TL.heard = true; say(TL.t[TL.i], 0.8); };
$('tlNext').onclick = () => {
  if (!TL) return; if (TL.done) { $('tale').hidden = true; TL = null; return; }
  const awake = walkers.filter(a => !a.el.classList.contains('sleep')).sort(() => Math.random() - 0.5);   // засыпают поровну на каждое предложение
  awake.slice(0, Math.ceil(awake.length / (TL.t.length - TL.i))).forEach(a => { a.rest = 1e9; a.el.classList.add('sleep'); });
  if (++TL.i < TL.t.length) { tone(392, 0, 0.5, 0.05); return taleShow(); }
  sleepAll(); TL.done = true; ls('dp_tale', nightKey()); ls('dp_taleN', (+ls('dp_taleN') || 0) + 1);
  const self = !TL.heard, t = `Все уснули. Спокойной ночи${name() ? ', ' + name() : ''}!` + (self ? ' ⭐ Ты прочитал сказку сам! +1 звезда в парк!' + built(addStar()) : '');
  $('tlText').textContent = t; $('tlCount').textContent = `💤 ${TL.t.length} из ${TL.t.length}`; $('tlNext').textContent = 'Закрыть'; say(t.replace('⭐ ', ''), 0.8);
};
$('taleBtn').onclick = taleOpen;

$('pvBtn').onclick = () => { pv = 1 - pv; park(); say(pv ? 'Долина экспедиции. Здесь живут находки второй экспедиции.' : 'Парк.', 0.9); };
$('stars').onclick = () => { const B = DL.build(stars); say(B.next ? `Звёзд: ${stars}. Ещё ${B.left}, и в парке появится ${B.next[1]}. Звёзды дают, когда читаешь сам.` : `Звёзд: ${stars}. Весь парк построен!`, 0.9); };
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
      if (a.x < a.lo || a.x > a.hi) { a.dir *= -1; a.x = Math.max(a.lo, Math.min(a.hi, a.x)); }
      if (!a.flyer && Math.random() < dt * 0.15) a.rest = 1.5 + Math.random() * 2.5; }
    a.el.style.transform = `translateX(${a.x}px)`; a.el.firstChild.style.transform = `scaleX(${a.dir})`;
  }
  requestAnimationFrame(step);
}

// ─── карточка динозавра: имя по слогам (нажми — услышишь), факты голосом ───
function card(d, baby = false) {
  audio(); $('cPic').innerHTML = dimg(d);
  $('cName').innerHTML = d.syl.map(s => `<button data-s="${s}">${s}</button>`).join('') + `<button class="all" data-all="1">🔊</button>`;
  $('cType').textContent = (d.kind ? d.kind + ' · ' : '') + { plants: 'Ел растения 🌿', meat: 'Хищник 🍖', fish: 'Ел рыбу 🐟', omni: 'Что ел — учёные спорят 🤔' }[d.diet] + ` · жил в ${{ юрский: 'юрском', меловой: 'меловом' }[d.period]} периоде`;
  $('cFacts').innerHTML = d.facts.map((f, i) => `<button class="fact" data-f="${i}"><b>🔊</b>${esc(f)}</button>`).join('');
  $('cName').onclick = e => { const b = e.target.closest('button'); if (!b) return; say(b.dataset.all ? d.n : b.dataset.s, 0.7); };
  $('cFacts').onclick = e => { const b = e.target.closest('.fact'); if (b) say(d.facts[+b.dataset.f], 0.9); };
  if (!baby && golds().includes(d.id)) $('cType').textContent = '✨ Золотая находка · ' + $('cType').textContent;
  const nm = d.n.toLowerCase() + 'а';                                                // baby: 1 — малыш, 2 — подросток, 3 — вырос
  if (baby) $('cType').textContent = ['', 'Малыш! Вылупился, потому что ты ходил на самбо 🥋', 'Подросток! Подрос, потому что ты ходил на самбо 🥋', 'Вырос! Ты ходил на самбо — и он стал взрослым 🥋'][baby] + ' · ' + $('cType').textContent;
  $('card').hidden = false; say(['', 'Малыш ' + nm, 'Подросток ' + nm + ' — подрос на самбо!', d.n + ' вырос, потому что ты ходил на самбо!'][baby || 0] || d.n);
}
$('cClose').onclick = () => { $('card').hidden = true; speechSynthesis && speechSynthesis.cancel(); };

// ─── раскопки: счищаешь песок → окаменелость → собираешь имя из слогов → динозавр оживает ───
const digImg = new Image(); digImg.src = 'dig.jpg';
// Раскопки в два слоя: песок (тот же кусок фона) → тёмная земля. Под песком — силуэт, под землёй — окаменелость.
// fill — чем закрашен слой, under — что видно в дырках (следующий слой), stage — как показан динозавр под слоем
const LAYERS = [{ fill: null, under: '#a8743f', stage: 'sil', say: 'Ого! Видно силуэт. Остался последний слой!' },
  { fill: '#a8743f', under: '#9a6a3a', stage: 'fossil', say: '' }];
let cur = 0, sandCtx = null, brushN = 0, cleared = false, need = [], pos = 0, misses = 0, layer = 0;
let goldRun = false, hinted = false, curF = null;                                  // curF — находка для музея вместо динозавра
const finds = () => readIds('dp_finds'), digs = () => +ls('dp_digs') || 0;
const fimg = (f, mode = 'color') => f.img ? `<img class="di ${mode}" src="finds/${f.id}.webp" alt="${f.w}" draggable="false">` : `<span class="di fe ${mode}">${f.e}</span>`;                                                // золотая раскопка: имя без голоса; 🔊 или подсветка — без золота
const golds = () => readIds('dp_gold');
function dig(gold = false) {
  audio(); goldRun = gold; hinted = false;
  if (gold) { const g = golds(), left = DINOS.slice(0, found).map((d, i) => i).filter(i => !g.includes(DINOS[i].id)); cur = left.length ? pick(left) : Math.floor(Math.random() * found); }
  else cur = found < DINOS.length ? found : Math.floor(Math.random() * DINOS.length);
  const nf = DD.FINDS[finds().length]; curF = !gold && found && nf && (found >= DINOS.length || digs() % 2 === 1) ? nf : null;   // через раз — находка для музея
  const d = DINOS[cur]; $('dig').classList.toggle('long', (curF ? curF.parts : d.syl).length >= 5);   // длинное имя — компактнее яма и карточки, иначе на маленьком экране не влезает
  $('park').hidden = true; $('dig').hidden = false; $('task').hidden = true; $('done').hidden = true;
  $('fossil').className = ''; $('fossil').innerHTML = curF ? fimg(curF, 'sil') : dimg(d, 'sil'); $('bar').style.visibility = '';
  const c = $('sand'); c.style.display = ''; c.style.opacity = 1;                    // сначала показать слой, потом мерить (иначе 0×0 и песка нет)
  const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = r.width * dpr; c.height = r.height * dpr; sandCtx = c.getContext('2d'); sandCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layer = 0; cleared = false; brushN = 0; fillLayer();
  say(gold ? 'Золотая раскопка! Счищай песок.' : curF ? 'Тут что-то маленькое. Находка для музея! Счищай песок.' : found === 15 ? 'Вторая экспедиция! Здесь прячутся новые находки — даже морские ящеры. Счищай песок!' : found < DINOS.length ? 'Кто-то прячется в земле! Счищай песок со всего квадрата.' : 'Раскопай ещё раз!');
}
function fillLayer() {
  const c = $('sand'), r = c.getBoundingClientRect(), L = LAYERS[layer];
  const fe = $('fossil').firstElementChild; fe.classList.remove('sil', 'fossil', 'color'); fe.classList.add(L.stage); $('pit').style.backgroundColor = L.under;
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

const quiet = () => goldRun || !!curF;                                               // золото и находки: голос части не называет — читаешь сам
function nameTask() {
  need = curF ? curF.parts : DINOS[cur].syl; pos = 0; misses = 0;
  $('slots').innerHTML = need.map((_, i) => `<div class="slot${i ? '' : ' cur'}"></div>`).join('');
  $('tiles').innerHTML = (curF ? DL.ftiles(curF) : DL.tiles(cur)).map(s => `<button class="tile" data-s="${s}">${s}</button>`).join('');
  $('taskTitle').lastElementChild.textContent = curF ? 'Собери слово!' : 'Собери имя!';
  $('task').hidden = false; $('digHint').textContent = curF ? 'Что это? Собери слово!' : goldRun ? '✨ Собери имя сам — без подсказок!' : 'Собери его имя!';
  say(curF ? `Что это? Собери слово ${curF.parts[0].length === 1 ? 'из букв' : 'из слогов'}. Я не подсказываю!` : goldRun ? 'Собери его имя сам. Я не подсказываю! Получится — будет золотая находка.' : 'Собери его имя. Найди слог: ' + need[0], 0.8);
}
$('say').onclick = () => { if (quiet()) hinted = true; say(need[pos], 0.7); };
$('tiles').onclick = e => {
  const b = e.target.closest('.tile'); if (!b || b.classList.contains('used') || pos >= need.length) return;
  if (b.dataset.s === need[pos]) {
    b.classList.add('used'); const sl = $('slots').children[pos]; sl.textContent = need[pos]; sl.className = 'slot ok'; tone(659 + pos * 80, 0, 0.4, 0.1);
    pos++; misses = 0; document.querySelectorAll('.tile.hint').forEach(t => t.classList.remove('hint'));
    if (pos < need.length) { $('slots').children[pos].classList.add('cur'); if (!quiet()) setTimeout(() => say(need[pos], 0.75), 350); }
    else setTimeout(alive, 500);
  } else {
    b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); say(quiet() ? (curF && need[0].length === 1 ? 'Не та буква' : 'Не тот слог') : need[pos], 0.7);
    if (++misses >= 2 && quiet()) hinted = true;
    if (misses >= 2) [...$('tiles').children].find(t => !t.classList.contains('used') && t.dataset.s === need[pos])?.classList.add('hint');   // подсказка после двух промахов
  }
};
function alive() {
  ls('dp_digs', digs() + 1);
  if (curF) return foundFind(curF);
  const d = DINOS[cur], isNew = cur === found && found < DINOS.length;
  $('task').hidden = true; $('fossil').className = 'alive'; $('fossil').innerHTML = dimg(d);
  roar(); setTimeout(() => say(d.n + '! ' + (goldRun && !hinted ? 'Золотая находка! Ты прочитал имя сам!' : pick(PRAISE))), 700);
  let praise = isNew ? `Новый динозавр в парке! ${pick(PRAISE)}` : pick(PRAISE);
  if (goldRun) { const g = golds(), first = !hinted && !g.includes(d.id);
    if (first) { g.push(d.id); ls('dp_gold', JSON.stringify(g)); logEv({ t: 'gold', id: d.id }); }
    praise = hinted ? 'Почти! Собери имя без подсказок — и будет золотая находка.' : '✨ Золотая находка! Ты прочитал имя сам!' + (first ? ' +1 звезда в парк!' + built(addStar()) : ''); }
  $('doneName').textContent = d.n; $('donePraise').textContent = praise; $('done').hidden = false; $('digHint').textContent = '';
  leaves();
  if (isNew) { found++; ls('dp_found', found); logEv({ t: 'new', id: d.id }); }
  $('toPark').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(isNew ? found - 1 : -1); };
}
function foundFind(f) {                                                             // находка — в музей; собрал без подсказок — звезда
  const fs = finds(); if (!fs.includes(f.id)) { fs.push(f.id); ls('dp_finds', JSON.stringify(fs)); logEv({ t: 'find', id: f.id }); }
  $('task').hidden = true; $('fossil').className = 'alive'; $('fossil').innerHTML = fimg(f); chime(); leaves();
  const self = !hinted, t = `${f.w}! Находка для музея.` + (self ? ' ⭐ Ты прочитал слово сам! +1 звезда в парк!' + built(addStar()) : '');
  $('doneName').textContent = f.w; $('donePraise').textContent = t.slice(f.w.length + 2) + ` 🏛️ В музее: ${fs.length} из ${DD.FINDS.length}`; $('done').hidden = false; $('digHint').textContent = '';
  setTimeout(() => say(f.w + '! ' + f.fact + (self ? ' Ты прочитал слово сам — звёздочка!' : ''), 0.9), 500);
  $('toPark').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };
}
// ─── Музей находок: что нашёл на раскопках; нажал — слово и факт голосом ───
function museum() {
  audio(); const fs = finds(); $('park').hidden = true; $('mus').hidden = false;
  $('musTitle').textContent = `🏛️ Музей · ${fs.length} из ${DD.FINDS.length}`;
  $('musList').innerHTML = DD.FINDS.map(f => fs.includes(f.id) ? `<button data-id="${f.id}">${fimg(f)}<b>${f.w}</b></button>` : '<button class="no" disabled><span class="di fe">❓</span><b>…</b></button>').join('');
  say(fs.length ? 'Музей находок. Нажми на находку — расскажу о ней.' : 'Музей пока пустой. Находки попадаются на раскопках!', 0.9);
}
$('musList').onclick = e => { const b = e.target.closest('button[data-id]'); if (!b) return; const f = DD.FINDS.find(x => x.id === b.dataset.id); say(f.w + '. ' + f.fact, 0.9); toast(`${f.e} ${f.fact}`, 3500); };
$('musBtn').onclick = museum;
$('musBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };
function leaves() { for (let i = 0; i < 26; i++) { const l = document.createElement('div'); l.className = 'leaf'; l.textContent = pick(['🍃', '🌿', '⭐', '🦴']);
  l.style.left = Math.random() * 100 + 'vw'; l.style.top = '-30px'; l.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); l.style.animationDelay = Math.random() * 0.6 + 's';
  document.body.appendChild(l); setTimeout(() => l.remove(), 3200); } }
$('digBtn').onclick = () => dig();
$('goldBtn').onclick = () => { if (!found) { toast('Сначала найди динозавра на раскопках! 🦴'); return; } dig(true); };

// ─── самбо: яйцо трескается от тренировок, три — вылупляется малыш; отмечает взрослый (вопрос на умножение) ───
function eggSVG(c, open = false, sil = '') {                                        // sil — кто внутри: с каждой трещиной силуэт проступает сильнее
  const cr = ['', 'M40,22 l6,8 l-5,6 l7,7', 'M28,40 l8,4 l-3,7 l9,3', 'M52,50 l-7,5 l4,6 l-8,4'].slice(0, c + 1).join(' ');
  const sh = sil && c ? `<defs><clipPath id="eggc"><ellipse cx="40" cy="54" rx="26" ry="34"/></clipPath><filter id="blk"><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 1 0"/></filter></defs>`
    + `<image href="dinos/${sil}.webp" x="14" y="34" width="52" height="42" preserveAspectRatio="xMidYMid meet" filter="url(#blk)" clip-path="url(#eggc)" opacity="${[0, 0.3, 0.55][c] || 0.55}"/>` : '';
  return `<svg viewBox="0 0 80 96"><ellipse cx="40" cy="90" rx="26" ry="5" fill="rgba(0,0,0,.18)"/>`
    + (open ? '<path d="M14,58 Q14,90 40,90 Q66,90 66,58 L58,52 L50,60 L40,50 L30,60 L22,52 Z" fill="#f4ecd8" stroke="#c9b48a" stroke-width="2"/>'
      : `<ellipse cx="40" cy="54" rx="27" ry="35" fill="#f4ecd8" stroke="#c9b48a" stroke-width="2"/><circle cx="30" cy="40" r="5" fill="#8fc46b"/><circle cx="50" cy="60" r="6" fill="#8fc46b"/><circle cx="46" cy="32" r="3.5" fill="#8fc46b"/><circle cx="28" cy="68" r="4" fill="#8fc46b"/>` + sh
        + (cr ? `<path d="${cr}" stroke="#5a4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : '')) + '</svg>';
}
function toast(t, ms = 2600) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
// Кто в яйце? С первой трещиной проступает силуэт — можно угадать (прочитать имена); угадал — при вылуплении звезда
const guessOf = () => { try { return JSON.parse(ls('dp_guess') || 'null'); } catch (e) { return null; } };
function guessOpen() {
  const id = DL.nextBaby(train), opts = [id, ...DL.BABIES.filter(x => x !== id).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5), g = guessOf(), k = Math.floor(train / 3) + 1;
  $('guessEgg').innerHTML = eggSVG(DL.cracks(train), false, id);
  $('guessOpts').innerHTML = opts.map(x => `<button data-id="${x}" class="${g && g.k === k && g.id === x ? 'on' : ''}">${DINOS.find(d => d.id === x).n}</button>`).join('');
  $('guess').hidden = false; say('Кто сидит в яйце? Прочитай имена и выбери!', 0.9);
}
$('guessOpts').onclick = e => { const b = e.target.closest('button'); if (!b) return;
  ls('dp_guess', JSON.stringify({ k: Math.floor(train / 3) + 1, id: b.dataset.id })); tone(660, 0, 0.25, 0.08);
  const left = 3 - DL.cracks(train); $('guess').hidden = true; say(`Запомнил! Узнаем через ${left} ${left === 1 ? 'тренировку' : 'тренировки'} по самбо.`, 0.9); toast(`🥚 Ты думаешь: ${b.textContent}. Проверим, когда вылупится!`, 3200); };
$('guessNo').onclick = () => { $('guess').hidden = true; };
$('egg').onclick = () => { audio(); if (DL.cracks(train) > 0) return guessOpen(); const left = 3 - DL.cracks(train); say(`Ходи на самбо — и яйцо вылупится! Осталось ${left} ${left === 1 ? 'тренировка' : 'тренировки'}.`); toast(`🥚 Ещё ${left} ${left === 1 ? 'тренировка' : 'тренировки'} по самбо — и кто-то вылупится!`); };
let gateA = 0;
$('trainBtn').onclick = () => {
  audio(); if (ls('dp_lastTrain') === today()) { toast('Сегодняшняя тренировка уже отмечена 💪'); return; }
  const g = DL.gate(); gateA = g.a; $('gQ').textContent = g.q; $('gIn').value = ''; $('gErr').textContent = ''; $('gate').hidden = false;
};
$('gNo').onclick = () => { $('gate').hidden = true; };
$('gOk').onclick = () => {
  if (+$('gIn').value !== gateA) { $('gErr').textContent = 'Неверно — это вопрос для взрослых 🙂'; return; }
  $('gate').hidden = true; const before = DL.belt(train).name; train++; ls('dp_train', train); ls('dp_lastTrain', today()); logEv({ t: 'train' });
  const g0 = DL.grow(train - 1), ups = DL.grow(train).filter((x, i) => g0[i] && x.stage > g0[i].stage).map(x => { const d = DINOS.find(y => y.id === x.id); return x.stage === 1 ? `Малыш ${d.n.toLowerCase()}а подрос!` : `${d.n} вырос!`; });
  const nb = DL.belt(train).name, beltUp = (nb !== before ? ` Новый дино-пояс: ${nb}!` : '') + (ups.length ? ' ' + ups.join(' ') : '');
  moveAsk(() => {                                                                    // сначала взрослый выбирает приём, потом — яйцо
    if (DL.cracks(train) === 0) return hatch(beltUp);
    chime(); park(); $('egg').classList.add('wob'); const left = 3 - DL.cracks(train);
    say(`Молодец, что сходил на самбо! Яйцо треснуло. Ещё ${left} ${left === 1 ? 'тренировка' : 'тренировки'}!${beltUp}`); toast(`🥋 Тренировка засчитана! Яйцо треснуло.${beltUp}`);
  });
};
// ─── Приём недели: после тренировки взрослый отмечает, что разучивали; малыш-динозавр показывает приём, он попадает в альбом ───
const movesGot = () => { try { return JSON.parse(ls('dp_moves') || '{}'); } catch (e) { return {}; } };
let moveNext = null;
function moveAsk(then) {
  moveNext = then; $('mvAskList').innerHTML = DD.MOVES.map(m => `<button data-id="${m.id}">${m.n}</button>`).join(''); $('mvAsk').hidden = false;
}
$('mvAskList').onclick = e => { const b = e.target.closest('button'); if (!b) return; const g = movesGot(); g[b.dataset.id] = (g[b.dataset.id] || 0) + 1; ls('dp_moves', JSON.stringify(g)); logEv({ t: 'train', m: b.dataset.id });
  $('mvAsk').hidden = true; moveCard(DD.MOVES.find(m => m.id === b.dataset.id), g[b.dataset.id] === 1); };
$('mvSkip').onclick = () => { $('mvAsk').hidden = true; const t = moveNext; moveNext = null; t && t(); };
function moveCard(m, first) {                                                         // first — новый приём в альбоме
  const a = DINOS.find(d => d.id === (DL.babies(train).slice(-1)[0] || 'trex')), b = DINOS.find(d => d.id === (a.id === 'stego' ? 'trike' : 'stego'));
  $('mvStage').className = 'mv-' + m.a; $('mvStage').innerHTML = `<div class="mvA">${dimg(a)}</div>` + (['trip', 'throw', 'hold'].includes(m.a) ? `<div class="mvB">${dimg(b)}</div>` : '');
  $('mvName').textContent = m.n; $('mvText').textContent = m.d; $('mvTag').textContent = first ? '🥋 Новый приём в альбоме!' : `🥋 Приём недели · разучивал ${movesGot()[m.id] || 1} ${plural(movesGot()[m.id] || 1, 'раз', 'раза', 'раз')}`;
  $('mvCard').hidden = false; chime(); say(`${m.n}. ${m.d}`, 0.85);
}
$('mvSay').onclick = () => say(`${$('mvName').textContent}. ${$('mvText').textContent}`, 0.85);
$('mvOk').onclick = () => { $('mvCard').hidden = true; speechSynthesis && speechSynthesis.cancel(); const t = moveNext; moveNext = null; if (t) t(); else if (!$('moves').hidden) movesOpen(); };
function movesOpen() {
  audio(); const g = movesGot(), n = DD.MOVES.filter(m => g[m.id]).length; $('park').hidden = true; $('moves').hidden = false;
  $('mvTitle').textContent = `🥋 Приёмы · ${n} из ${DD.MOVES.length}`;
  $('mvList').innerHTML = DD.MOVES.map(m => g[m.id] ? `<button data-id="${m.id}"><b>${m.n}</b><small>разучивал ×${g[m.id]}</small></button>` : '<button class="no" disabled><b>❓</b><small>разучишь на самбо</small></button>').join('');
}
$('mvList').onclick = e => { const b = e.target.closest('button[data-id]'); if (b) moveCard(DD.MOVES.find(m => m.id === b.dataset.id), false); };
$('movesBtn').onclick = movesOpen;
$('mvBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };
function hatch(beltUp) {                                                              // яйцо качается, раскалывается — малыш
  const id = DL.babies(train).slice(-1)[0], d = DINOS.find(x => x.id === id); logEv({ t: 'hatch', id });
  $('hPic').innerHTML = eggSVG(2, false, id); $('hPic').className = 'crack';
  const g = guessOf(), right = g && g.k === train / 3 && g.id === id, nb = right ? addStar() : null;   // угадал, кто в яйце
  if (right) beltUp += ` 🎯 Ты угадал! +1 звезда в парк!${built(nb)}`; $('hTitle').textContent = 'Яйцо вылупляется…'; $('hText').textContent = ''; $('hOk').hidden = true; $('hatch').hidden = false;
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
  audio(); const ds = DINOS.slice(0, Math.max(1, found)).filter(d => !d.fly && !d.swim), d = pick(ds.length ? ds : [DINOS[0]]);
  $('park').hidden = true; $('hungry').hidden = false; $('hDone').hidden = true; $('falls').innerHTML = ''; $('eaterImg').innerHTML = dimg(d);
  HG = { pool: DL.pool(found), eaten: 0, cards: [], spawn: 0.2, misses: 0, earMiss: 0, d, done: false, target: '', tut: !ls('dp_htut') };
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
    HG.misses++; if (listen()) HG.earMiss++; want(); say(`Не то! Я хочу ${HG.target}`, 0.8); return;
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
  const ear = HG.earMiss <= 2, nb = ear ? addStar() : null;                         // звезда — за слоги на слух почти без промахов: наугад не набрать
  $('hDoneText').textContent = `${HG.d.n} съел 10 слогов. ${pick(PRAISE)}` + (ear ? ' ⭐ Ты нашёл слоги на слух! +1 звезда в парк!' + built(nb) : ' Найди слоги на слух почти без ошибок — и получишь звезду для парка.'); $('hDone').hidden = false; say(`${HG.d.n} наелся! ${pick(PRAISE)}` + (ear ? ' Ты нашёл слоги на слух — звёздочка в парк!' : ''));
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
  const nb = PQ.self >= 5 ? addStar() : null;                                       // звезда в парк — за раунд, а не за каждый ответ: угадать 5 из 8 трудно
  $('pDoneText').textContent = `Правильных ответов: ${PQ.right} из ${PQ.q.length}. ⭐ Прочитал сам: ${PQ.self}.`
    + (PQ.self >= 5 ? ' +1 звезда в парк!' + built(nb) : ' Прочитай сам 5 из 8 — и получишь звезду для парка.'); $('pDone').hidden = false; leaves(); roar();
  say(`Ты поймал ${PQ.caught} ${plural(PQ.caught, 'ошибку', 'ошибки', 'ошибок')}! Спасибо, что учишь профессора!`); } };
$('profBtn').onclick = prof; $('pAgain').onclick = prof;
$('pBack').onclick = $('pHome').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── «🎮 Игры»: выбор занятия ───
$('gamesBtn').onclick = () => { audio(); $('gamesSheet').hidden = false; };
$('gamesClose').onclick = () => { $('gamesSheet').hidden = true; };
$('gamesSheet').addEventListener('click', e => { if (e.target.closest('.gtile')) $('gamesSheet').hidden = true; });

// ─── «Я и динозавры»: ребёнок и динозавр в одном масштабе (рост вводит взрослый) ───
let sizeI = 0;
const kidSVG = h => BOY.svg(outfit(), h * 200 / 172);                                // в рисунке рост от макушки до пят — 172 из 200
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
  const ppm = Math.min((W - 10) / (h * 0.58 + gap + d.len), Hs * 0.9 / (d.len * asp), Hs * 0.9 / h);   // метр → пиксели, чтобы влезли оба
  const kh = h * ppm, dw = d.len * ppm;
  st.querySelectorAll('.kid,.sd').forEach(e => e.remove());
  st.insertAdjacentHTML('beforeend', `<div class="kid" style="left:4px">${kidSVG(kh)}<span>${esc(name() || 'Я')} · ${cm} см</span></div>`
    + `<div class="sd" style="left:${4 + kh * 0.58 + gap * ppm}px;width:${dw}px">${dimg(d)}</div>`);
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
  const sr = readIds('dp_self'); let nb = null, first = self && !sr.includes(ST.st.id); if (first) { sr.push(ST.st.id); ls('dp_self', JSON.stringify(sr)); nb = addStar(); }
  const t = `Правильно! ${self ? '⭐ Ты прочитал историю сам!' : pick(PRAISE)}` + (first ? ' +1 звезда в парк!' + built(nb) : ''); $('rFeed').textContent = t; say(t.replace('⭐ ', ''), 0.9);
};
$('storiesBtn').onclick = storiesOpen;
$('stBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };
$('rBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); storiesOpen(); };

// ─── «Собери фразу»: слова вразнобой → по порядку. На карточках нет большой буквы и точки — иначе можно собрать, не читая ───
let WG = null;
const wNew = () => { WG = { q: DL.sents(found, 5), i: 0, got: 0 }; showW(); };
function sentOpen() {
  audio(); if (!found) { toast('Сначала найди динозавра на раскопках! 🦴'); return; }
  $('park').hidden = true; $('sent').hidden = false; wNew(); say('Собери фразу. Нажимай слова по порядку.', 0.9);
}
function showW() {
  const x = WG.q[WG.i], w = x.t.split(' ');
  Object.assign(WG, { w, k: 0, miss: 0, heard: false, done: false });
  $('wScore').textContent = `Фраза ${WG.i + 1} из ${WG.q.length} · ⭐ ${WG.got}`;
  $('wPic').innerHTML = dimg(DINOS.find(d => d.id === x.id)); $('wSlots').innerHTML = w.map(t => `<i>${esc(t)}</i>`).join(''); $('wFeed').hidden = true; $('wCards').hidden = false;   // слово уже в ячейке, но невидимо — ширина не меняется, карточки не прыгают
  let o; do o = w.map((_, i) => i).sort(() => Math.random() - 0.5); while (o.every((v, i) => v === i));   // не в готовом порядке
  $('wCards').innerHTML = o.map(i => `<button data-i="${i}">${esc(w[i].replace('.', '').toLowerCase())}</button>`).join('');
}
$('wCards').onclick = e => {
  const b = e.target.closest('button'); if (!b || WG.done || b.classList.contains('used')) return;
  if (+b.dataset.i !== WG.k) { WG.miss++; b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); tone(220, 0, 0.25, 0.06);
    if (WG.miss >= 2) $('wCards').querySelector(`[data-i="${WG.k}"]`).classList.add('hint'); return; }
  b.classList.add('used'); $('wCards').querySelectorAll('.hint').forEach(x => x.classList.remove('hint'));
  $('wSlots').children[WG.k].classList.add('on');
  if (++WG.k < WG.w.length) { say(b.textContent, 0.9); return; }
  WG.done = true; chime(); leaves(); $('wCards').hidden = true;   // пустые места карточек не нужны — освобождаем место под похвалу
  const self = !WG.heard && WG.miss <= WG.w.length - 3; let t = pick(PRAISE);    // 3 слова — без ошибок, 4 — одна, 5 — две
  if (self) { WG.got++; t = '⭐ Ты собрал фразу сам!' + built(addStar()); }
  $('wScore').textContent = `Фраза ${WG.i + 1} из ${WG.q.length} · ⭐ ${WG.got}`;
  $('wFeedText').textContent = t; $('wNext').textContent = WG.i + 1 < WG.q.length ? 'Дальше ▶' : 'Ещё раз ▶'; $('wFeed').hidden = false;
  say(WG.q[WG.i].t + ' ' + t.replace(/[⭐🏗️]/gu, ''), 0.9);
};
$('wSay').onclick = () => { WG.heard = true; say(WG.q[WG.i].t, 0.85); };
$('wNext').onclick = () => { if (++WG.i < WG.q.length) showW(); else wNew(); };
$('sentBtn').onclick = sentOpen;
$('wBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── Гардероб: вещи открываются звёздами «прочитал сам» (звёзды не тратятся); нажал — надел, ещё раз — снял ───
const outfit = () => { try { return Object.assign({}, BOY.START, JSON.parse(ls('dp_outfit') || '{}')); } catch (e) { return { ...BOY.START }; } };
let wdSlot = 'top';
function wardOpen() {
  audio(); $('park').hidden = true; $('ward').hidden = false; wardDraw();
  say('Гардероб палеонтолога! Выбирай, что надеть. Новые вещи открываются звёздами.', 0.9);
}
function wardDraw() {
  const o = outfit(); $('wdBoy').innerHTML = BOY.svg(o); $('wdStars').textContent = `👕 Гардероб · ⭐ ${stars}`;
  $('wdTabs').innerHTML = BOY.SLOTS.map(([s, e, n]) => `<button data-s="${s}" class="${s === wdSlot ? 'on' : ''}" aria-label="${n}">${e}</button>`).join('');
  $('wdItems').innerHTML = BOY.ITEMS.filter(x => x.slot === wdSlot).map(x => `<button data-id="${x.id}" class="${x.need > stars ? 'lock' : o[x.slot] === x.id ? 'on' : ''}"><b>${x.e}</b>${esc(x.n)}`
    + (x.need > stars ? `<small>🔒 ⭐ ${x.need}</small>` : '') + '</button>').join('');
}
$('wdTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; wdSlot = b.dataset.s; wardDraw(); say(b.getAttribute('aria-label'), 0.9); };
$('wdItems').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const x = BOY.it(b.dataset.id), o = outfit();
  if (x.need > stars) { const n = x.need - stars; say(`${x.n}. Нужно ещё ${n} ${n === 1 ? 'звезда' : n < 5 ? 'звезды' : 'звёзд'}. Читай сам — и откроешь!`, 0.9); return; }
  if (o[x.slot] === x.id && !BOY.MUST.includes(x.slot)) delete o[x.slot]; else o[x.slot] = x.id;
  ls('dp_outfit', JSON.stringify(o)); tone(660, 0, 0.25, 0.08); wardDraw(); say(x.n, 0.9);
};
$('wardBtn').onclick = wardOpen;
$('wdBack').onclick = () => { speechSynthesis && speechSynthesis.cancel(); park(); };

// ─── первый запуск: имя (хранится только на телефоне) ───
$('nameOk').onclick = () => { const n = $('nameIn').value.trim().slice(0, 14); ls('dp_name', n); $('hi').hidden = true; audio(); park(); say(`Привет${n ? ', ' + n : ''}! Ты палеонтолог. Пойдём на раскопки!`); };
park(); if (!ls('dp_name') && ls('dp_name') !== '') $('hi').hidden = false;
addEventListener('resize', () => { if (!$('park').hidden) park(); });
requestAnimationFrame(step);
if (/[?&]debug/.test(location.search)) window.TT = { dig, found3, nameTask, alive, park, cur: () => cur, need: () => need, pos: () => pos, gateA: () => gateA, HG: () => HG, PQ: () => PQ, feed, hungryWin };
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
