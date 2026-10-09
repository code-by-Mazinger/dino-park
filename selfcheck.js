// node selfcheck.js — слоги складываются в имя, карточки содержат все нужные слоги, факты на месте
'use strict';
const assert = require('assert');
require('./data.js'); require('./logic.js');
const { DINOS } = DD;
assert.strictEqual(new Set(DINOS.map(d => d.id)).size, DINOS.length, 'id без повторов');
for (const [k, d] of DINOS.entries()) {
  assert.strictEqual(d.syl.join('').toLowerCase(), d.n.toLowerCase(), d.n + ': слоги = имя');
  assert(d.facts.length >= 3 && d.facts.every(f => f.length < 90), d.n + ': три коротких факта');
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
console.log('ВСЁ ОК');
