// node selfcheck.js — слоги складываются в имя, карточки содержат все нужные слоги, факты на месте
'use strict';
const assert = require('assert');
require('./data.js'); require('./logic.js'); require('./boy.js');
const { DINOS } = DD;
assert.strictEqual(new Set(DINOS.map(d => d.id)).size, DINOS.length, 'id без повторов');
for (const [k, d] of DINOS.entries()) {
  assert.strictEqual(d.syl.join('').toLowerCase(), d.n.toLowerCase(), d.n + ': слоги = имя');
  assert(d.facts.length >= 3 && d.facts.every(f => f.length < 90), d.n + ': три коротких факта');
  assert(d.wrong.length === 2 && d.wrong.every(t => t.length < 90) && !d.facts.includes(d.wrong[0]), d.n + ': ошибка профессора и поправка');
  assert(['plants', 'meat', 'fish', 'omni'].includes(d.diet) && ['юрский', 'меловой', 'ледниковый'].includes(d.period));
  for (let s = 1; s <= 20; s++) {
    const t = DL.tiles(k, DL.rng(s));
    assert(d.syl.every(x => t.includes(x)), d.n + ': все слоги есть');
    assert.strictEqual(t.length, new Set(t).size, d.n + ': карточки без повторов');
    assert.strictEqual(t.length, d.syl.length + DL.extra(k));
  }
  if (k && k < 15) assert(d.syl.length >= DINOS[0].syl.length, 'первый — из самых коротких');
}
// сначала короткие имена: среди первых пяти нет пятисложных
assert(DINOS.slice(0, 5).every(d => d.syl.length <= 4) && DINOS.slice(12, 15).every(d => d.syl.length === 5));
// вторая экспедиция: имена не короче предыдущих, у морских — пометка «не динозавр»
DINOS.slice(16, 25).forEach((d, i) => assert(d.syl.length >= DINOS[15 + i].syl.length, d.n + ': имена от коротких к длинным'));
DINOS.slice(26).forEach((d, i) => assert(d.syl.length >= DINOS[25 + i].syl.length, d.n + ': звери ледника — от коротких к длинным'));
DINOS.filter(d => d.swim || d.fly || d.period === 'ледниковый').forEach(d => assert(/не динозавр/.test(d.kind), d.n + ': пометка «не динозавр»'));
// самбо: пояс, трещины, малыши
assert.strictEqual(DL.belt(0).name, 'белый'); assert.strictEqual(DL.belt(2).left, 1); assert.strictEqual(DL.belt(3).name, 'жёлтый');
assert.strictEqual(DL.belt(29).name, 'коричневый'); assert.strictEqual(DL.belt(30).name, 'чёрный'); assert.strictEqual(DL.belt(99).left, 0);
for (let i = 1; i < DL.BELTS.length; i++) assert(DL.BELTS[i][2] > DL.BELTS[i - 1][2], 'пороги поясов растут');
assert.deepStrictEqual(DL.babies(2), []); assert.deepStrictEqual(DL.babies(3), ['trex']); assert.strictEqual(DL.babies(17).length, 5); assert.strictEqual(DL.babies(18)[5], 'trex');
assert.strictEqual(DL.cracks(4), 1);
assert(DL.babies(15).every(id => DINOS.some(d => d.id === id)), 'малыши — известные виды');
for (let s = 1; s < 30; s++) { const g = DL.gate(DL.rng(s)); const [a, b] = g.q.split(' × ').map(Number); assert(a >= 6 && a <= 9 && b >= 6 && b <= 9 && g.a === a * b); }
// фразы: на каждый вид по две, 3–5 слов без повторов внутри фразы, с большой буквы и с точкой
for (const d of DINOS) { const ss = DD.SENT[d.id]; assert(ss && ss.length === 2, d.n + ': две фразы');
  for (const t of ss) { const w = t.split(' '); assert(w.length >= 3 && w.length <= 5 && new Set(w).size === w.length && /^[А-ЯЁ]/.test(t) && t.endsWith('.'), t); } }
for (let f = 1; f <= DINOS.length; f++) { const r = DL.sents(f, 5, DL.rng(f)); assert.strictEqual(r.length, Math.min(5, 2 * f));
  assert(r.every(x => DINOS.findIndex(d => d.id === x.id) < f), 'фразы только про найденных');
  assert.strictEqual(new Set(r.map(x => x.t)).size, r.length, 'фразы в раунде не повторяются');
  if (f >= 5) assert.strictEqual(new Set(r.map(x => x.id)).size, 5, 'при 5+ видах — все разные'); }
// звёзды → постройки
assert.deepStrictEqual(DL.build(0), { n: 0, next: DD.BUILDS[0], left: 3 }); assert.strictEqual(DL.build(2).left, 1);
assert.strictEqual(DL.build(3).n, 1); assert.strictEqual(DL.build(3).left, 3);
const all = DD.BUILDS.length * DL.STEP; assert.strictEqual(DL.build(all).next, null); assert.strictEqual(DL.build(all + 7).n, DD.BUILDS.length);
for (const b of DD.BUILDS) assert(require('fs').existsSync(__dirname + '/builds/' + b[2] + '.webp') && require('fs').readFileSync(__dirname + '/sw.js', 'utf8').includes(`builds/${b[2]}.webp`), b[1] + ': картинка есть и в кэше');
for (const d of DINOS) assert(require('fs').existsSync(__dirname + '/dinos/' + d.id + '.webp') && require('fs').readFileSync(__dirname + '/sw.js', 'utf8').includes(`dinos/${d.id}.webp`), d.n + ': картинка есть и в кэше');
// мини-игры: слоги — из имён найденных (не меньше 6), профессор — 8 вопросов только про найденных, верные и ошибки вперемешку
assert.deepStrictEqual(DL.pool(3), [...new Set(DINOS.slice(0, 3).flatMap(d => d.syl))]);
assert(DL.pool(0).length >= 6 && DL.pool(1).length >= 6);
for (let s = 1; s < 20; s++) { const q = DL.prof(5, DL.rng(s)); assert.strictEqual(q.length, 8);
  assert(q.every(x => DINOS.indexOf(x.d) < 5) && q.some(x => x.truth) && q.some(x => !x.truth));
  assert(q.every(x => x.truth ? x.d.facts.includes(x.raw) : x.d.wrong[0] === x.raw) && new Set(q.map(x => x.raw)).size === 8, 'без повторов');
  assert(q.every(x => x.text.toLowerCase().includes(x.d.n.toLowerCase().slice(0, 5))), 'в каждой фразе понятно, о ком'); }
// спрятанные экраны прячутся всегда (иначе экран с display:flex лежит поверх парка и ничего не нажимается — баг dp-v8)
assert(require('fs').readFileSync(__dirname + '/index.html', 'utf8').includes('[hidden]{display:none!important}'), 'правило [hidden]');
// рост: длины заданы; тираннозавр (12 м) против 120 см — в 10 раз; компсогнат — меньше ребёнка
assert(DINOS.every(d => d.len > 0), 'у всех есть длина');
assert.strictEqual(DL.compare(DINOS.find(d => d.id === 'trex'), 120).k, 10);
assert.strictEqual(DL.compare(DINOS.find(d => d.id === 'compy'), 120).k, 0);
assert(DL.compare(DINOS.find(d => d.id === 'ptera'), 120).text.startsWith('Размах крыльев птеранодона'));
// истории: про известных динозавров, 3–4 предложения, три разных ответа
for (const st of DD.STORIES) { assert(DINOS.some(d => d.id === st.id) && st.t.length >= 3 && st.t.length <= 4 && st.a.length === 3 && new Set(st.a).size === 3, st.id + ': история'); }
// гардероб: id без повторов, слоты известные, стартовые вещи бесплатны, пороги звёзд не совпадают (иначе одно сообщение о двух вещах); каждая вещь рисуется
const IT = BOY.ITEMS, SL = BOY.SLOTS.map(x => x[0]);
assert.strictEqual(new Set(IT.map(x => x.id)).size, IT.length); assert(IT.every(x => SL.includes(x.slot) && x.svg && x.n));
assert(Object.entries(BOY.START).every(([s, id]) => BOY.it(id).slot === s && BOY.it(id).need === 0));
const paid = IT.filter(x => x.need > 0).map(x => x.need); assert.strictEqual(new Set(paid).size, paid.length, 'пороги звёзд разные');
for (const x of IT) { const o = { ...BOY.START, [x.slot]: x.id }, g = BOY.svg(o); assert(g.startsWith('<svg') && g.includes(x.svg.slice(0, 30)), x.n + ': рисуется'); }
assert(require('fs').readFileSync(__dirname + '/sw.js', 'utf8').includes("'boy.js'"), 'boy.js в кэше');
// малыши растут: подросток через 3 тренировки после вылупления, взрослый — через 6
assert.deepStrictEqual(DL.grow(3), [{ id: 'trex', stage: 0 }]); assert.deepStrictEqual(DL.grow(6).map(x => x.stage), [1, 0]);
assert.deepStrictEqual(DL.grow(9).map(x => x.stage), [2, 1, 0]); assert.strictEqual(DL.grow(30).filter(x => x.stage === 2).length, 8);
// находки: части складываются в слово, без повторов; карточки — все нужные + 3 лишние того же вида, без повторов
const F = DD.FINDS; assert.strictEqual(new Set(F.map(f => f.id)).size, F.length);
for (const f of F) { assert.strictEqual(f.parts.join(''), f.w, f.w); assert.strictEqual(new Set(f.parts).size, f.parts.length, f.w + ': части без повторов'); assert(f.fact.length < 90 && f.e);
  for (let s = 1; s <= 10; s++) { const t = DL.ftiles(f, DL.rng(s)); assert(f.parts.every(p => t.includes(p)) && new Set(t).size === t.length && t.length === f.parts.length + 3, f.w + ': карточки');
    assert(t.every(p => (p.length === 1) === (f.parts[0].length === 1)), f.w + ': буквы с буквами, слоги со слогами'); } }
assert(F.slice(0, 3).every(f => f.parts.every(p => p.length === 1)), 'первые находки — короткие слова по буквам');
for (const f of F) assert(!f.img || (require('fs').existsSync(__dirname + '/finds/' + f.id + '.webp') && require('fs').readFileSync(__dirname + '/sw.js', 'utf8').includes(`finds/${f.id}.webp`)), f.w + ': картинка есть и в кэше');
// силуэт в яйце — тот, кто вылупится на ближайшей тройке тренировок
for (let n = 0; n < 40; n++) { const h = n + 3 - (n % 3); assert.strictEqual(DL.nextBaby(n), DL.babies(h).slice(-1)[0], 'яйцо на ' + n); }
// приёмы самбо: id без повторов, анимация из известных, описание короткое
assert.strictEqual(new Set(DD.MOVES.map(m => m.id)).size, DD.MOVES.length); assert(DD.MOVES.every(m => ['fall', 'roll', 'trip', 'throw', 'hold'].includes(m.a) && m.d.length < 80 && m.n));
// письма: от кого — среди вариантов, варианты разные, текст без «undefined»; на каждое событие своё письмо
const c0 = { name: 'Рома', found: 25, babies: ['trex', 'trike'] };
const EVS = [null, { t: 'train', m: 'hip' }, { t: 'train' }, { t: 'hatch', id: 'trike' }, { t: 'find', id: 'paw' }, { t: 'new', id: 'mosa' }, { t: 'gold', id: 'stego' }, { t: 'find', id: 'nope' }];
for (const e of EVS) for (let sd = 1; sd < 30; sd++) { const L = DL.letter(e, c0, DL.rng(sd));
  assert(L.opts.includes(L.from) && new Set(L.opts).size === 3 && L.lines.every(t => t && !/undefined|NaN/.test(t)), JSON.stringify(e)); }
assert(DL.letter({ t: 'train', m: 'hip' }, c0, DL.rng(1)).lines.join(' ').includes('бросок через бедро') && DL.letter({ t: 'train', m: 'hip' }, c0).from === 'trike', 'письмо о тренировке — от последнего малыша');
for (let sd = 1; sd < 30; sd++) assert(DL.letter(null, { name: 'Рома', found: 15, babies: [] }, DL.rng(sd)).opts.every(id => DD.DINOS.findIndex(d => d.id === id) < 15), 'варианты — из найденных');
assert(DL.letter({ t: 'find', id: 'paw' }, c0).lines.join(' ').includes('нашёл лапу') && DL.letter(null, { name: '', found: 1, babies: [] }).lines[0] === 'Привет, палеонтолог!', 'падеж и обращение');
// сказки: по 6 коротких предложений; ночь — с 20 до 7
assert(DL.TALES.every(t => t.length === 6 && t.every(x => x.length < 45))); assert(DL.isNight(21) && DL.isNight(3) && !DL.isNight(7) && !DL.isNight(19));
assert(DL.compare(DD.DINOS.find(d => d.id === 'giganto'), 120).text.includes('ростом') && DL.compare(DD.DINOS.find(d => d.id === 'giganto'), 120).text.includes('на плечи'), 'рост гигантопитека');
assert(require('fs').existsSync(__dirname + '/ice.jpg') && require('fs').readFileSync(__dirname + '/sw.js', 'utf8').includes("'ice.jpg'"), 'фон Ледника есть и в кэше');
console.log('ВСЁ ОК');
