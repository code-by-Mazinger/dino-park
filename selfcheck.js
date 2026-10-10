// node selfcheck.js — слоги складываются в имя, карточки содержат все нужные слоги, факты на месте
'use strict';
const assert = require('assert');
require('./data.js'); require('./logic.js');
const { DINOS } = DD;
assert.strictEqual(new Set(DINOS.map(d => d.id)).size, DINOS.length, 'id без повторов');
for (const [k, d] of DINOS.entries()) {
  assert.strictEqual(d.syl.join('').toLowerCase(), d.n.toLowerCase(), d.n + ': слоги = имя');
  assert(d.facts.length >= 3 && d.facts.every(f => f.length < 90), d.n + ': три коротких факта');
  assert(d.wrong.length === 2 && d.wrong.every(t => t.length < 90) && !d.facts.includes(d.wrong[0]), d.n + ': ошибка профессора и поправка');
  assert(['plants', 'meat', 'fish'].includes(d.diet) && ['юрский', 'меловой'].includes(d.period));
  for (let s = 1; s <= 20; s++) {
    const t = DL.tiles(k, DL.rng(s));
    assert(d.syl.every(x => t.includes(x)), d.n + ': все слоги есть');
    assert.strictEqual(t.length, new Set(t).size, d.n + ': карточки без повторов');
    assert.strictEqual(t.length, d.syl.length + DL.extra(k));
  }
  if (k) assert(d.syl.length >= DINOS[0].syl.length, 'первый — из самых коротких');
}
// сначала короткие имена: среди первых пяти нет пятисложных
assert(DINOS.slice(0, 5).every(d => d.syl.length <= 4) && DINOS.slice(-3).every(d => d.syl.length === 5));
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
for (const d of DINOS) assert(require('fs').existsSync(__dirname + '/dinos/' + d.id + '.webp'), d.n + ': есть картинка');
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
console.log('ВСЁ ОК');
