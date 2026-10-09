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
// Вопрос для взрослых: таблица умножения 6…9 (ребёнку в первом классе не по силам, взрослому — секунда)
const gate = (r = Math.random) => { const a = 6 + Math.floor(r() * 4), b = 6 + Math.floor(r() * 4); return { q: `${a} × ${b}`, a: a * b }; };
globalThis.DL = { rng, tiles, extra, belt, babies, cracks, gate, BELTS };
})();
