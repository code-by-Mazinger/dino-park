'use strict';
// Мальчик-палеонтолог и гардероб. Рисунок — SVG слоями (viewBox 100×200, мальчик смотрит на нас), чтобы вещи надевались друг на друга.
// need — сколько всего звёзд «прочитал сам» нужно, чтобы вещь открылась (звёзды не тратятся). Порядок слоёв — в svg() ниже.
const SKIN = '#f2c7a5', HAIR = '#6b3e1f';
const tee = (c, extra = '') => `<path d="M31 70 Q50 63 69 70 L70 118 L30 118 Z" fill="${c}"/><path d="M32 72 L28 88 M68 72 L72 88" stroke="${c}" stroke-width="13" stroke-linecap="round"/>`
  + `<path d="M44 66 Q50 71 56 66" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>${extra}`;
const pair = (l) => l + l.replace(/x="(\d+)"/g, (m, x) => `x="${100 - +x - (/width="(\d+)"/.exec(l) || [, 0])[1]}"`);   // правая нога = зеркало левой (для rect)
const ITEMS = [
  { id: 'cap', slot: 'head', n: 'Кепка', e: '🧢', need: 1, svg: '<path d="M29 34 Q30 15 50 15 Q70 15 71 34 Z" fill="#e63946"/><path d="M50 30 Q72 27 83 33 Q70 37 50 35 Z" fill="#c1121f"/>' },
  { id: 'panama', slot: 'head', n: 'Панама палеонтолога', e: '👒', need: 5, svg: '<ellipse cx="50" cy="28" rx="33" ry="7" fill="#c9a66b"/><path d="M33 28 Q34 10 50 10 Q66 10 67 28 Z" fill="#d4b483"/><rect x="33" y="21" width="34" height="5" fill="#7a5230"/>' },
  { id: 'helmet', slot: 'head', n: 'Каска', e: '⛑️', need: 20, svg: '<path d="M28 33 Q28 12 50 12 Q72 12 72 33 Z" fill="#ffd60a"/><rect x="24" y="30" width="52" height="5" rx="2.5" fill="#e0b800"/><circle cx="50" cy="21" r="5" fill="#fff8c4" stroke="#999" stroke-width="1.5"/>' },
  { id: 'glasses', slot: 'eyes', n: 'Очки', e: '👓', need: 3, svg: '<g fill="none" stroke="#333" stroke-width="2"><circle cx="42" cy="42" r="6"/><circle cx="58" cy="42" r="6"/><path d="M48 42 h4 M36 41 l-6 -2 M64 41 l6 -2"/></g>' },
  { id: 'sun', slot: 'eyes', n: 'Солнечные очки', e: '🕶️', need: 10, svg: '<g fill="#222"><rect x="34" y="37" width="14" height="9" rx="4"/><rect x="52" y="37" width="14" height="9" rx="4"/></g><path d="M48 40 h4 M34 40 l-5 -2 M66 40 l5 -2" stroke="#222" stroke-width="2"/>' },
  { id: 'mask', slot: 'eyes', n: 'Маска с трубкой', e: '🤿', need: 13, svg: '<rect x="33" y="35" width="34" height="14" rx="6" fill="rgba(144,224,239,.55)" stroke="#0077b6" stroke-width="2.5"/><path d="M29 41 h4 M67 41 h4" stroke="#0077b6" stroke-width="3"/><path d="M72 42 L75 14" stroke="#f77f00" stroke-width="3.5" stroke-linecap="round"/>' },
  { id: 'tee', slot: 'top', n: 'Футболка', e: '👕', need: 0, svg: tee('#2f80ed') },
  { id: 'dinotee', slot: 'top', n: 'Футболка с динозавром', e: '🦖', need: 4, svg: tee('#ff9f1c', '<text x="50" y="104" font-size="18" text-anchor="middle">🦖</text>') },
  { id: 'jacket', slot: 'top', n: 'Пиджак', e: '🧥', need: 8,
    svg: '<path d="M31 70 Q50 63 69 70 L70 118 L30 118 Z" fill="#fff"/><path d="M48 68 L52 68 L53 90 L50 94 L47 90 Z" fill="#c0392b"/>'
      + '<path d="M31 70 Q40 65 46 66 L49 118 L30 118 Z M69 70 Q60 65 54 66 L51 118 L70 118 Z" fill="#2c3e70"/><path d="M32 72 L24 108 M68 72 L76 108" stroke="#2c3e70" stroke-width="12" stroke-linecap="round"/>'
      + '<path d="M46 66 L42 82 L48 80 Z M54 66 L58 82 L52 80 Z" fill="#1f2d52"/><circle cx="47" cy="98" r="1.8" fill="#f4d35e"/><circle cx="47" cy="108" r="1.8" fill="#f4d35e"/>' },
  { id: 'hawaii', slot: 'top', n: 'Гавайская рубашка', e: '🌺', need: 12,
    svg: tee('#ff6b6b', '<path d="M44 66 L50 80 L56 66" fill="#fff"/><g fill="#fff59d"><circle cx="38" cy="84" r="3"/><circle cx="60" cy="92" r="3"/><circle cx="42" cy="106" r="3"/><circle cx="62" cy="110" r="2.5"/></g><g fill="#fff"><circle cx="56" cy="80" r="2"/><circle cx="36" cy="98" r="2"/><circle cx="52" cy="104" r="2"/></g>') },
  { id: 'vest', slot: 'top', n: 'Жилет палеонтолога', e: '🦺', need: 22,
    svg: tee('#f1faee') + '<path d="M31 70 Q40 66 45 67 L47 118 L30 118 Z M69 70 Q60 66 55 67 L53 118 L70 118 Z" fill="#b08d57"/><g fill="#8c6d3f"><rect x="33" y="84" width="10" height="9" rx="2"/><rect x="57" y="84" width="10" height="9" rx="2"/><rect x="33" y="100" width="11" height="10" rx="2"/><rect x="56" y="100" width="11" height="10" rx="2"/></g>' },
  { id: 'shorts', slot: 'bottom', n: 'Шорты', e: '🩳', need: 0, svg: '<path d="M33 112 L67 112 L68 140 L52 140 L50 124 L48 140 L32 140 Z" fill="#3d5a80"/>' },
  { id: 'swim', slot: 'bottom', n: 'Плавки', e: '🩲', need: 2, svg: '<path d="M33 112 L67 112 L67 128 L53 128 L50 122 L47 128 L33 128 Z" fill="#00b4d8"/><path d="M33 117 H67" stroke="#fff" stroke-width="2.5"/>' },
  { id: 'pants', slot: 'bottom', n: 'Брюки', e: '👖', need: 7, svg: '<path d="M33 112 L67 112 L67 176 L52 176 L50 126 L48 176 L33 176 Z" fill="#6b5844"/><path d="M33 116 H67" stroke="#4a3c2e" stroke-width="2"/>' },
  { id: 'sneak', slot: 'feet', n: 'Кеды', e: '👟', need: 0, svg: pair('<rect x="30" y="176" width="20" height="10" rx="5" fill="#e63946"/>') + pair('<rect x="30" y="183" width="20" height="3" fill="#fff"/>') },
  { id: 'boots', slot: 'feet', n: 'Сапоги', e: '🥾', need: 6, svg: pair('<rect x="33" y="152" width="17" height="34" rx="5" fill="#6d4c41"/>') + pair('<rect x="30" y="178" width="20" height="8" rx="4" fill="#5d4037"/>') },
  { id: 'flipflop', slot: 'feet', n: 'Шлёпанцы', e: '🩴', need: 14, svg: pair('<rect x="31" y="184" width="19" height="3" rx="1.5" fill="#ffb703"/>') + '<path d="M36 184 L41 178 L46 184 M54 184 L59 178 L64 184" stroke="#219ebc" stroke-width="2.5" fill="none"/>' },
  { id: 'fins', slot: 'feet', n: 'Ласты', e: '🐸', need: 11, svg: '<path d="M33 178 L49 178 L53 197 L28 197 Z M51 178 L67 178 L72 197 L47 197 Z" fill="#06d6a0" stroke="#048a67" stroke-width="1.5"/>' },
  { id: 'loupe', slot: 'hand', n: 'Лупа', e: '🔍', need: 16, svg: '<path d="M79 118 L84 132" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/><circle cx="79" cy="108" r="9" fill="rgba(180,220,255,.6)" stroke="#555" stroke-width="2.5"/>' },
  { id: 'brush', slot: 'hand', n: 'Кисточка', e: '🖌️', need: 25, svg: '<path d="M77 118 L84 96" stroke="#a0522d" stroke-width="3.5" stroke-linecap="round"/><path d="M82 98 L89 86 L80 92 Z" fill="#f4d35e"/>' },
  { id: 'pack', slot: 'back', n: 'Рюкзак', e: '🎒', need: 18, back: '<rect x="15" y="57" width="70" height="48" rx="13" fill="#c0392b"/><path d="M38 57 Q50 46 62 57" stroke="#8e2a20" stroke-width="4" fill="none"/>',   // спереди рюкзак виден только над плечами
    svg: '<path d="M37 67 L35 112 M63 67 L65 112" stroke="#e05545" stroke-width="6" stroke-linecap="round"/><rect x="31" y="92" width="8" height="6" rx="1.5" fill="#f4d35e"/><rect x="61" y="92" width="8" height="6" rx="1.5" fill="#f4d35e"/>' },
];
const SLOTS = [['head', '🧢', 'Голова'], ['eyes', '👓', 'Очки'], ['top', '👕', 'Верх'], ['bottom', '🩳', 'Низ'], ['feet', '👟', 'Обувь'], ['hand', '🔍', 'В руке'], ['back', '🎒', 'За спиной']];
const MUST = ['bottom'];                                                                // без низа нельзя, остальное можно снять
const START = { top: 'tee', bottom: 'shorts', feet: 'sneak' };
const it = id => ITEMS.find(x => x.id === id);

function svg(o = START, h = 0) {
  const g = s => (o[s] && it(o[s]) && it(o[s]).slot === s) ? it(o[s]) : null, part = s => (g(s) ? g(s).svg : '');
  const legs = '<rect x="35" y="116" width="13" height="66" rx="6" fill="' + SKIN + '"/><rect x="52" y="116" width="13" height="66" rx="6" fill="' + SKIN + '"/>'
    + `<ellipse cx="41" cy="182" rx="8" ry="4.5" fill="${SKIN}"/><ellipse cx="59" cy="182" rx="8" ry="4.5" fill="${SKIN}"/>`;
  const body = `<rect x="45" y="56" width="10" height="12" fill="${SKIN}"/><path d="M31 70 Q50 63 69 70 L70 120 L30 120 Z" fill="${SKIN}"/>`
    + `<path d="M32 72 L23 112 M68 72 L77 112" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/><circle cx="23" cy="114" r="6" fill="${SKIN}"/><circle cx="77" cy="114" r="6" fill="${SKIN}"/>`;
  const head = `<circle cx="29" cy="42" r="4" fill="${SKIN}"/><circle cx="71" cy="42" r="4" fill="${SKIN}"/><circle cx="50" cy="40" r="21" fill="${SKIN}"/>`
    + `<path d="M29 38 Q30 16 50 16 Q70 16 71 38 Q64 26 50 27 Q38 26 29 38 Z" fill="${HAIR}"/>`
    + '<circle cx="42" cy="42" r="3.2" fill="#2b1d14"/><circle cx="58" cy="42" r="3.2" fill="#2b1d14"/><circle cx="43.2" cy="40.8" r="1" fill="#fff"/><circle cx="59.2" cy="40.8" r="1" fill="#fff"/><circle cx="36" cy="49" r="3.5" fill="#f4a3a3" opacity=".6"/><circle cx="64" cy="49" r="3.5" fill="#f4a3a3" opacity=".6"/>'
    + '<path d="M44 51 Q50 56 56 51" stroke="#8a3b2a" stroke-width="2" fill="none" stroke-linecap="round"/>';
  const size = h ? ` height="${h}" width="${h / 2}"` : '';
  return `<svg viewBox="0 0 100 200"${size} xmlns="http://www.w3.org/2000/svg">${g('back') ? g('back').back : ''}${legs}${part('feet')}${body}${part('bottom')}${part('top')}${part('back')}${part('hand')}${head}${part('eyes')}${part('head')}</svg>`;
}
globalThis.BOY = { ITEMS, SLOTS, MUST, START, svg, it };
