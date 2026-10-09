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
console.log('ВСЁ ОК');
