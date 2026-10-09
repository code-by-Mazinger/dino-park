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
globalThis.DL = { rng, tiles, extra };
})();
