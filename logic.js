'use strict';
// Дино-парк — правила: карточки слогов для сборки имени (нужные + лишние), сложность растёт с каждым найденным динозавром.
(() => {
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const extra = k => k < 3 ? 1 : k < 8 ? 2 : 3;                                        // лишних карточек: первые три динозавра — одна, дальше две, потом три
// Лишние слоги — из имён других динозавров; сначала похожие (та же первая буква), чтобы приходилось вчитываться
function tiles(k, r = Math.random) {
  const d = DD.DINOS[k], need = d.syl, pool = [...new Set(DD.DINOS.flatMap(x => x.syl))].filter(s => !need.includes(s));
  const like = shuffle(pool.filter(s => need.some(n => n[0] === s[0])), r), other = shuffle(pool.filter(s => !like.includes(s)), r);
  return shuffle([...need, ...[...like, ...other].slice(0, extra(k))], r);
}
// Самбо: каждая тренировка (отмечает взрослый) — трещина на яйце, три — вылупляется малыш; дино-пояс растёт по числу тренировок.
// Пояса — игровые, не система самбо.
const BELTS = [['белый', '#ffffff', 0], ['жёлтый', '#ffd23f', 3], ['оранжевый', '#ff8c1a', 6], ['зелёный', '#3cb043', 10], ['синий', '#2f6bff', 15], ['коричневый', '#8b5a2b', 21], ['чёрный', '#1d1d1d', 30]];
function belt(n) { let i = 0; while (i + 1 < BELTS.length && n >= BELTS[i + 1][2]) i++; const nx = BELTS[i + 1];
  return { name: BELTS[i][0], color: BELTS[i][1], left: nx ? nx[2] - n : 0, nextName: nx ? nx[0] : '' }; }
const BABIES = ['trex', 'trike', 'stego', 'diplo', 'ankylo'];
const babies = n => Array.from({ length: Math.floor(n / 3) }, (_, i) => BABIES[i % BABIES.length]);
const cracks = n => n % 3;
const nextBaby = n => BABIES[Math.floor(n / 3) % BABIES.length];                   // кто сидит в яйце сейчас (вылупится на следующей тройке тренировок)
// Малыши растут от тренировок: вылупился на 3·(i+1)-й, через 3 тренировки — подросток, через 6 — взрослый
const grow = n => babies(n).map((id, i) => { const age = n - 3 * (i + 1); return { id, stage: age >= 6 ? 2 : age >= 3 ? 1 : 0 }; });
// Карточки для находки: нужные части + 3 лишние того же вида (буквы к буквам, слоги к слогам; сначала похожие)
const ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ'.split('');                         // лишние буквы — без редких Й, Ы, Ь (в нужных они остаются)
function ftiles(f, r = Math.random) {
  const need = f.parts, letters = need.every(p => p.length === 1);
  const all = letters ? ABC : [...new Set([...DD.FINDS.flatMap(x => x.parts), ...DD.DINOS.flatMap(x => x.syl)])].filter(p => p.length > 1);
  const pool = all.filter(s => !need.includes(s)), like = shuffle(pool.filter(s => need.some(n => n[0] === s[0])), r), other = shuffle(pool.filter(s => !like.includes(s)), r);
  return shuffle([...need, ...[...like, ...other].slice(0, 3)], r);
}
// Вопрос для взрослых: таблица умножения 6…9 (ребёнку в первом классе не по силам, взрослому — секунда)
const gate = (r = Math.random) => { const a = 6 + Math.floor(r() * 4), b = 6 + Math.floor(r() * 4); return { q: `${a} × ${b}`, a: a * b }; };
// Голодный динозавр: слоги из имён найденных динозавров (пока найдено мало — добираем из первых, чтобы было хотя бы 6)
function pool(found) { let k = Math.max(found, 1), p; do p = [...new Set(DD.DINOS.slice(0, k).flatMap(d => d.syl))]; while (p.length < 6 && ++k <= DD.DINOS.length); return p; }
// Профессор-путаник: 8 утверждений про найденных динозавров — половина верных (факты), половина — его ошибки
function prof(found, r = Math.random) {
  const ds = DD.DINOS.slice(0, Math.max(3, found)), q = [], seen = new Set();
  const named = (d, t) => t.toLowerCase().includes(d.n.toLowerCase().slice(0, 5)) ? t : `${d.n}: ${t[0].toLowerCase()}${t.slice(1)}`;   // «Он ел…» → «Диплодок: он ел…»
  for (let i = 0, tries = 0; q.length < 8 && tries < 200; tries++) {                // без повторов
    const d = ds[Math.floor(r() * ds.length)], truth = q.length % 2 === 0, raw = truth ? d.facts[Math.floor(r() * d.facts.length)] : d.wrong[0];
    if (seen.has(raw)) continue; seen.add(raw); q.push({ d, truth, raw, text: named(d, raw) });
  }
  return shuffle(q, r);
}
// «Я и динозавры»: во сколько раз динозавр длиннее ребёнка (у птеранодона — размах крыльев)
const num = x => String(x).replace('.', ',');
function compare(d, cm) {
  const h = cm / 100, k = d.len / h, what = d.fly ? `Размах крыльев ${d.n.toLowerCase()}а — около ${num(d.len)}\u00a0м.` : d.tall ? `${d.n} ростом около ${num(d.len)}\u00a0м.` : `${d.n} длиной около ${num(d.len)}\u00a0м.`;
  if (k >= 2) return { k: Math.round(k), text: `${what} Это ${Math.round(k)} таких, как ты, ${d.tall ? 'если встать друг другу на плечи' : 'если лечь в ряд'}!` };
  if (k > 1.15) return { k: 1, text: `${what} Он чуть больше тебя!` };
  return { k: 0, text: `${what} Он меньше тебя — ты выше компсогната!`.replace('компсогната', d.n.toLowerCase() + 'а') };
}
// Звёзды → постройки: сколько построено, что следующее и сколько звёзд до него
const STEP = 3;
function build(stars) { const B = DD.BUILDS, n = Math.min(B.length, Math.floor(stars / STEP));
  return { n, next: B[n] || null, left: n < B.length ? STEP * (n + 1) - stars : 0 }; }

// «Собери предложение»: фразы найденных видов вперемешку, по одной на вид, пока хватает
function sents(found, k, r = Math.random) {
  const ids = DD.DINOS.slice(0, found).map(d => d.id), all = ids.flatMap(id => DD.SENT[id].map(t => ({ id, t })));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const out = [], used = new Set(); for (const x of all) if (!used.has(x.id)) { used.add(x.id); out.push(x); }
  for (const x of all) if (out.length < k && !out.includes(x)) out.push(x);
  return out.slice(0, k);
}
// Письма от динозавров: раз в день, по последнему событию (тренировка с приёмом, вылупление, находка, новый вид, золото); событий нет — факт от найденного.
// ev: {t: 'train'|'hatch'|'find'|'new'|'gold', id, m}; c: {name, found, babies}. Вопрос — кто написал (картинку показываем после ответа).
const gen = n => n.toLowerCase() + 'а';                                             // тираннозавр → тираннозавра (у малышей все имена на согласный)
const ACC = { paw: 'лапу', shell: 'ракушку' };
function letter(ev, c, r = Math.random) {
  const D = DD.DINOS, got = D.slice(0, Math.max(1, c.found)), pk = a => a[Math.floor(r() * a.length)], N = c.name || 'палеонтолог', by = id => D.find(d => d.id === id);
  let from, lines;
  if (ev && ev.t === 'train') { const b = c.babies.slice(-1)[0], d = by(b || 'trex'), m = DD.MOVES.find(x => x.id === ev.m);
    from = d.id; lines = [`Привет, ${N}!`, b ? `Это малыш ${gen(d.n)}.` : `Это ${d.n}.`, 'Ты ходил на самбо — я видел!', m ? `Ты учил приём «${m.n.toLowerCase()}».` : 'Ты молодец!', 'Я тоже пробовал. Получилось!', 'Научишь меня ещё?']; }
  else if (ev && ev.t === 'hatch' && by(ev.id)) { const d = by(ev.id); from = d.id;
    lines = [`Привет, ${N}!`, `Это я, малыш ${gen(d.n)}.`, 'Я вылупился, потому что ты ходил на самбо.', 'Спасибо тебе!', 'Я уже умею бегать.']; }
  else if (ev && ev.t === 'find' && DD.FINDS.some(f => f.id === ev.id)) { const f = DD.FINDS.find(x => x.id === ev.id), d = pk(got); from = d.id;
    lines = [`Привет, ${N}!`, `Это ${d.n}.`, `Я видел, как ты нашёл ${ACC[f.id] || f.w.toLowerCase()}.`, 'Это настоящая находка для музея!', 'Что ты найдёшь завтра?']; }
  else if (ev && (ev.t === 'new' || ev.t === 'gold') && by(ev.id)) { const d = by(ev.id); from = d.id;
    lines = ev.t === 'new' ? [`Привет, ${N}!`, `Я ${d.n}.`, 'Ты нашёл меня на раскопках.', 'Теперь я живу в твоём парке.', d.facts[0]]
      : [`Привет, ${N}!`, `Это ${d.n}.`, 'Ты прочитал моё имя сам.', 'Теперь я золотой!', 'Спасибо!']; }
  else { const d = pk(got); from = d.id; lines = [`Привет, ${N}!`, `Это ${d.n}.`, pk(d.facts), 'Приходи ко мне в парк!']; }
  const others = [...shuffle(got.filter(d => d.id !== from), r), ...shuffle(D.filter(d => d.id !== from), r)];   // сначала из найденных
  const opts = shuffle([from, ...[...new Set(others.map(d => d.id))].slice(0, 2)], r);
  return { from, lines, q: 'Кто написал тебе письмо?', opts };
}
// Сказки на ночь: по предложению — малыш засыпает. Короткие слова, спокойный сюжет.
const TALES = [
  ['Наступил вечер.', 'Малыш трицератопс смотрел на луну.', 'Луна была круглая и жёлтая.', 'Мама сказала: «Пора спать».', 'Малыш зевнул и лёг в гнездо.', 'Спокойной ночи, малыш!'],
  ['Диплодок очень большой.', 'Но спать он ложится тихо-тихо.', 'Он кладёт длинную шею на траву.', 'Потом он закрывает глаза.', 'Над ним светят звёзды.', 'Сладких снов, диплодок!'],
  ['Птеранодон летал весь день.', 'Он устал и сел на скалу.', 'Внизу шумело море.', 'В небе зажглись звёзды.', 'Птеранодон сложил крылья.', 'И уснул под шум волн.'],
  ['Стегозавр не мог уснуть.', 'Он стал считать пластины на спине.', 'Одна, две, три.', 'На пятой он зевнул.', 'На седьмой он уже спал.', 'Тише, не буди его!'],
  ['Тираннозавр большой и громкий.', 'Но ночью он не рычит.', 'Вокруг летают светлячки.', 'Они светят, как маленькие фонарики.', 'Тираннозавр улыбнулся.', 'И тихо уснул.'],
  ['Сегодня была тренировка.', 'Малыши учились падать и вставать.', 'Они очень устали.', 'Мама укрыла их листьями.', 'Завтра будет новый день.', 'А сейчас — спать.'],
  ['В бухте тихо плещет вода.', 'Мозазавр плывёт к берегу.', 'Луна светит на воду.', 'Мозазавр закрывает глаза.', 'Волны качают его, как колыбель.', 'Спокойной ночи, мозазавр!'],
];
const isNight = h => h >= 20 || h < 7;                                               // по часам телефона
globalThis.DL = { rng, tiles, extra, belt, babies, cracks, gate, BELTS, pool, prof, compare, build, STEP, sents, grow, ftiles, nextBaby, BABIES, letter, TALES, isNight };
})();
