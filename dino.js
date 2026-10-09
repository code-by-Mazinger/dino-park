'use strict';
// Рисунок динозавра по описанию look (data.js): SVG 240×160, смотрит вправо, земля на y = 150.
// mode: color — живой, fossil — окаменелость (кость с рёбрами), shadow — силуэт ещё не найденного.
(() => {
const rad = a => a * Math.PI / 180;
const tint = (h, k) => '#' + h.slice(1).match(/\w\w/g).map(x => { const v = parseInt(x, 16); return Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0'); }).join('');
function dinoSVG(d, mode = 'color') {
  const L = d.look, P = [];
  let [c1, c2, c3] = L.c, ln = 'none', lw = 0;
  if (mode === 'fossil') { c1 = '#efe3c8'; c2 = '#d6c39c'; c3 = '#e6d6b2'; ln = '#a8915f'; lw = 2; }
  if (mode === 'shadow') { c1 = c2 = c3 = '#2f2a45'; }
  const col = mode === 'color', id = d.id + (L.st === 'fly' ? 'f' : '');
  const S = (fill = c1) => `fill="${col && fill === c1 ? `url(#a${id})` : col && fill === c2 ? `url(#b${id})` : fill}" stroke="${ln}" stroke-width="${lw}"`;   // объём: свет сверху
  const defs = col ? `<defs><linearGradient id="a${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint(c1, 0.32)}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="${tint(c1, -0.18)}"/></linearGradient>`
    + `<linearGradient id="b${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint(c2, 0.15)}"/><stop offset="1" stop-color="${tint(c2, -0.25)}"/></linearGradient>`
    + `<radialGradient id="s${id}"><stop offset="0" stop-color="rgba(0,0,0,.32)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>` : '';
  P.push(defs);
  if (L.st === 'fly') return fly(L, c1, c2, c3, S, mode, defs);
  const [rx, ry, by] = L.body, biped = L.st === 'biped', bx = 120 + ((rx + L.tail[0]) - (rx * 0.7 + L.neck[0] * Math.cos(L.neck[1] * Math.PI / 180) + L.head * 1.5)) / 2, th = biped ? -10 : (L.front ? (L.front - 1) * -40 : 0);
  const cs = Math.cos(rad(th)), sn = Math.sin(rad(th));
  const at = (k, dy = 0) => [bx + rx * k * cs, by + rx * k * sn + dy];                // точка на оси тела (k = −1…1)
  if (mode !== 'shadow') P.push(`<ellipse cx="${bx}" cy="151" rx="${rx * 1.45}" ry="8" fill="${col ? `url(#s${id})` : 'rgba(0,0,0,.18)'}"/>`);
  // ноги: дальние темнее и чуть сдвинуты, ближние поверх тела
  const w = L.legs[1] * 0.45;
  const leg = (x, y, cls, fill, far) => `<g class="leg ${cls}" style="transform-origin:${x}px ${y}px"><rect x="${x - w / 2 + (far ? -6 : 0)}" y="${y - 4}" width="${w}" height="${150 - y + 2}" rx="${w / 2}" ${S(fill)}/>`
    + `<ellipse cx="${x + w * 0.25 + (far ? -6 : 0)}" cy="149" rx="${w * 0.75}" ry="${Math.max(3, w * 0.3)}" ${S(fill)}/></g>`;
  const legsAt = biped ? [[at(-0.15, ry * 0.3), 'a'], [at(-0.15, ry * 0.3), 'b']] : [[at(-0.55, ry * 0.25), 'a'], [at(0.55, ry * 0.2), 'b']];
  const bw = L.legs[1] * 0.8;                                                         // двуногая нога: бедро, голень, ступня
  const bleg = (x, y, cls, fill) => `<g class="leg ${cls}" style="transform-origin:${x}px ${y}px"><ellipse cx="${x}" cy="${y + bw * 0.9}" rx="${bw * 0.85}" ry="${bw * 1.5}" ${S(fill)}/>`
    + `<rect x="${x - bw * 0.32}" y="${y + bw * 1.6}" width="${bw * 0.64}" height="${148 - y - bw * 1.6}" rx="${bw * 0.3}" ${S(fill)}/>`
    + `<ellipse cx="${x + bw * 0.45}" cy="148" rx="${bw * 0.85}" ry="${Math.max(3, bw * 0.28)}" ${S(fill)}/></g>`;
  if (biped) { const [x, y] = legsAt[0][0]; P.push(bleg(x - 7, y, 'b', c2)); }
  else legsAt.forEach(([[x, y], c]) => P.push(leg(x, y, c === 'a' ? 'b' : 'a', c2, true)));
  // хвост
  const [tl, td] = L.tail, t0 = at(-0.75, -ry * 0.45), t1 = at(-0.8, ry * 0.35), tip = [bx - rx - tl, by + td];
  P.push(`<path d="M${t0} Q${tip[0] + tl * 0.45},${t0[1] + td * 0.4} ${tip} Q${tip[0] + tl * 0.55},${t1[1] + td * 0.6} ${t1} Z" ${S()}/>`);
  if (L.feat.includes('club')) P.push(`<ellipse cx="${tip[0] + 4}" cy="${tip[1]}" rx="13" ry="9" ${S(c2)}/>`);
  if (L.feat.includes('thago')) for (const [dx, a] of [[10, -60], [18, -75], [10, 60], [18, 75]]) { const x = tip[0] + dx, y = tip[1] + (a < 0 ? -2 : 2), r = rad(a - 20);
    P.push(`<path d="M${x - 3},${y} L${x + Math.cos(r) * -16},${y + Math.sin(r) * 16} L${x + 3},${y} Z" ${S(c3)}/>`); }
  if (L.feat.includes('feathers')) P.push(`<path d="M${tip[0] + 12},${tip[1] - 3} l-22,-8 l6,8 l-8,6 l24,0 Z" ${S(c3)}/>`);
  // парус и пластины — за телом
  if (L.feat.includes('sail')) { const a = at(-0.7, -ry * 0.5), b = at(0.45, -ry * 0.6);
    P.push(`<path d="M${a} C${a[0] + 10},${a[1] - 55} ${b[0] - 10},${b[1] - 60} ${b} Z" ${S(c3)}/>`);
    if (mode === 'color') for (let i = 1; i < 6; i++) { const x = a[0] + (b[0] - a[0]) * i / 6; P.push(`<line x1="${x}" y1="${by - ry * 0.4}" x2="${x}" y2="${by - ry - 38 * Math.sin(Math.PI * i / 6)}" stroke="${c2}" stroke-width="1.5" opacity=".6"/>`); } }
  if (L.feat.includes('plates')) for (let i = 0; i < 7; i++) { const k = -0.75 + i * 0.22, [x] = at(k), y = by - ry * Math.sqrt(Math.max(0, 1 - k * k)) + 4, h = 14 + 10 * Math.sin(Math.PI * (i + 0.5) / 7);
    P.push(`<path d="M${x - 8},${y + 4} L${x - 4},${y - h * 0.6} L${x + 2},${y - h} L${x + 8},${y + 4} Z" ${S(c3)}/>`); }
  // шея
  const [nl, na, nw] = L.neck, nb = at(0.72, -ry * 0.35), hp = [nb[0] + nl * Math.cos(rad(na)), nb[1] + nl * Math.sin(rad(na))];
  P.push(`<path d="M${nb} L${hp}" stroke="${mode === 'fossil' ? ln : c1}" stroke-width="${nw + (mode === 'fossil' ? 4 : 0)}" stroke-linecap="round"/>`);
  if (mode === 'fossil') P.push(`<path d="M${nb} L${hp}" stroke="${c1}" stroke-width="${nw}" stroke-linecap="round"/>`);
  // тело
  P.push(`<ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" transform="rotate(${th} ${bx} ${by})" ${S()}/>`);
  if (col) {
    const clip = `<clipPath id="c${id}"><ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" transform="rotate(${th} ${bx} ${by})"/></clipPath>`, dk = tint(c1, -0.3);
    let pat = '';
    if (L.pat === 'stripes') for (let i = -3; i <= 3; i++) pat += `<path d="M${bx + i * rx * 0.24},${by - ry * 1.1} q${rx * 0.08},${ry * 0.6} -${rx * 0.04},${ry * 1.05}" stroke="${dk}" stroke-width="${Math.max(4, rx * 0.07)}" fill="none" opacity=".35" stroke-linecap="round"/>`;
    if (L.pat === 'spots') for (let i = 0; i < 9; i++) pat += `<ellipse cx="${bx + (i * 37 % 100 - 50) / 50 * rx * 0.85}" cy="${by - ry * 0.45 + (i * 23 % 40) / 40 * ry * 0.6}" rx="${rx * 0.07 + (i % 3) * 2}" ry="${ry * 0.12}" fill="${dk}" opacity=".3"/>`;
    P.push(clip, `<g clip-path="url(#c${id})">${pat}<ellipse cx="${bx + 4}" cy="${by + ry * 0.55}" rx="${rx * 0.75}" ry="${ry * 0.42}" transform="rotate(${th} ${bx} ${by})" fill="${c3}" opacity=".5"/>`
      + `<ellipse cx="${bx + rx * 0.15}" cy="${by - ry * 0.55}" rx="${rx * 0.5}" ry="${ry * 0.18}" transform="rotate(${th} ${bx} ${by})" fill="#fff" opacity=".22"/></g>`);
  }
  if (mode === 'fossil') for (let i = -2; i <= 2; i++) P.push(`<path d="M${bx + i * rx * 0.28},${by - ry * 0.7} q-4,${ry * 0.7} 0,${ry * 1.3}" stroke="${ln}" stroke-width="2" fill="none"/>`);
  if (L.feat.includes('armor')) for (let i = 0; i < 9; i++) { const k = -0.8 + i * 0.2, [x] = at(k), y = by - ry * Math.sqrt(Math.max(0, 1 - k * k)) * 0.75;
    P.push(`<circle cx="${x}" cy="${y}" r="5" ${S(c3)}/>`, `<path d="M${x - 4},${by + ry * 0.2} l4,10 l4,-10 Z" ${S(c2)}/>`); }
  // ближние ноги и лапы
  if (biped) { const [x, y] = legsAt[0][0]; P.push(bleg(x + 6, y, 'a', c1)); }
  else legsAt.forEach(([[x, y], c]) => P.push(leg(x, y, c, c1)));
  if (L.feat.includes('claw')) { const [x] = legsAt[0][0]; P.push(`<path d="M${x + 6 + bw * 0.6},146 q7,-9 1,-14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`); }
  if (L.feat.includes('thumb')) { const [x, y] = legsAt[1][0]; P.push(`<path d="M${x + w / 2},${y + 18} l10,-6 l-8,10 Z" fill="#f4f1de"/>`); }
  if (L.arms) { const sh = at(0.55, ry * 0.25), ae = [sh[0] + L.arms * 0.6, sh[1] + L.arms * 0.8];
    P.push(`<path d="M${sh} L${ae}" stroke="${mode === 'fossil' ? ln : c2}" stroke-width="${L.arms > 10 ? 6 : 4}" stroke-linecap="round"/>`);
    if (L.feat.includes('feathers')) P.push(`<path d="M${sh[0]},${sh[1] + 2} L${ae[0] - 4},${ae[1] + 8} L${ae[0] + 2},${ae[1] + 1} Z" ${S(c3)}/>`); }
  // голова
  const hs = L.head, sx = L.snout || 1, hx = hp[0] + hs * 0.35 * sx, hy = hp[1];
  if (L.feat.includes('frill') || L.feat.includes('frillS')) { const fr = hs * (L.feat.includes('frill') ? 1.35 : 0.95); P.push(`<circle cx="${hx - hs * 0.55}" cy="${hy - hs * 0.35}" r="${fr}" ${S(c3)}/>`);
    if (mode === 'color') P.push(`<circle cx="${hx - hs * 0.55}" cy="${hy - hs * 0.35}" r="${fr * 0.7}" fill="none" stroke="${c2}" stroke-width="2" opacity=".5"/>`); }
  if (L.feat.includes('tube')) P.push(`<path d="M${hx},${hy - hs * 0.5} L${hx - hs * 2.4},${hy - hs * 1.6}" stroke="${mode === 'fossil' ? ln : c3}" stroke-width="${hs * 0.55}" stroke-linecap="round"/>`);
  const big = hs >= 20 && biped;                                                     // у крупных хищников голова «кирпичиком»
  P.push(big ? `<rect x="${hx - hs * 0.8}" y="${hy - hs * 0.55}" width="${hs * 1.9}" height="${hs * 1.1}" rx="${hs * 0.45}" ${S()}/>`
    : `<ellipse cx="${hx}" cy="${hy}" rx="${hs * 0.9 * sx}" ry="${hs * 0.62}" ${S()}/>`);
  if (big || hs >= 18) P.push(`<path d="M${hx - hs * 0.2},${hy + hs * 0.3} L${hx + hs * (big ? 1.05 : 0.85) * sx},${hy + hs * 0.25}" stroke="${mode === 'shadow' ? c1 : '#3a2a20'}" stroke-width="2" stroke-linecap="round"/>`);
  if (big && mode === 'color') for (let i = 0; i < 5; i++) P.push(`<path d="M${hx + hs * (0.05 + i * 0.2)},${hy + hs * 0.27} l2,4 l2,-4 Z" fill="#fff"/>`);
  if (L.feat.includes('beak')) P.push(`<path d="M${hx + hs * 0.7},${hy - hs * 0.2} l${hs * 0.45},${hs * 0.35} l-${hs * 0.45},${hs * 0.25} Z" ${S(c2)}/>`);
  if (L.feat.includes('horns')) P.push(`<path d="M${hx - hs * 0.2},${hy - hs * 0.4} L${hx + hs * 1.25},${hy - hs * 1.55} L${hx + hs * 0.25},${hy - hs * 0.2} Z" fill="${mode === 'shadow' ? c1 : '#f4f1de'}" stroke="${mode === 'color' ? '#c9b99a' : ln}" stroke-width="1.5"/>`,
    `<path d="M${hx + hs * 0.55},${hy - hs * 0.3} L${hx + hs * 0.95},${hy - hs * 0.85} L${hx + hs * 0.85},${hy - hs * 0.2} Z" fill="${mode === 'shadow' ? c1 : '#f4f1de'}"/>`);
  if (L.feat.includes('bull')) P.push(`<path d="M${hx - hs * 0.1},${hy - hs * 0.45} q${hs * 0.2},-${hs * 0.6} ${hs * 0.6},-${hs * 0.55} l-${hs * 0.25},${hs * 0.5} Z" ${S(c2)}/>`);
  if (L.feat.includes('brow')) P.push(`<path d="M${hx},${hy - hs * 0.5} l${hs * 0.2},-${hs * 0.35} l${hs * 0.2},${hs * 0.32} Z" ${S(c2)}/>`);
  if (L.feat.includes('bump')) P.push(`<circle cx="${hx - hs * 0.1}" cy="${hy - hs * 0.55}" r="${hs * 0.45}" ${S()}/>`);
  // глаз и улыбка
  if (mode !== 'shadow') { const ex = hx + hs * (big ? 0.15 : 0.05) * sx, ey = hy - hs * (big ? 0.2 : 0.18), er = Math.max(2.6, hs * 0.17);
    P.push(mode === 'fossil' ? `<circle cx="${ex}" cy="${ey}" r="${er}" fill="#8a7448"/>`
      : `<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff"/><circle cx="${ex + er * 0.25}" cy="${ey}" r="${er * 0.55}" fill="#1d1d1d"/><circle cx="${ex + er * 0.45}" cy="${ey - er * 0.3}" r="${er * 0.2}" fill="#fff"/>`);
    if (!big && hs < 18 && mode === 'color') P.push(`<path d="M${hx + hs * 0.35 * sx},${hy + hs * 0.22} q${hs * 0.2},${hs * 0.12} ${hs * 0.42 * sx},-${hs * 0.05}" stroke="#3a2a20" stroke-width="1.5" fill="none" stroke-linecap="round"/>`); }
  const f = L.feat, minX = Math.min(tip[0] - 16, hx - hs * (f.includes('tube') ? 2.8 : f.includes('frill') ? 2 : 1.2), bx - rx - 8),
    maxX = Math.max(hx + hs * 1.6 * sx, bx + rx + 8), minY = Math.min(hy - hs * (f.includes('horns') || f.includes('tube') ? 1.8 : 1.1), by - ry - (f.includes('sail') ? 62 : f.includes('plates') ? 30 : 8), tip[1] - 22);
  const vw = maxX - minX, vh = 158 - minY;
  return `<svg viewBox="${minX} ${minY} ${vw} ${vh}" width="${vw}" height="${vh}" xmlns="http://www.w3.org/2000/svg">${P.join('')}</svg>`;
}
// Птеранодон в полёте: крылья-перепонки, длинный клюв, гребень назад
function fly(L, c1, c2, c3, S, mode, defs) {
  const P = [defs];
  P.push(`<g class="wing l" style="transform-origin:120px 74px"><path d="M120,70 L18,52 Q50,70 60,92 Q90,80 120,84 Z" ${S(c2)}/></g>`);
  P.push(`<g class="wing r" style="transform-origin:120px 74px"><path d="M120,70 L222,52 Q190,70 180,92 Q150,80 120,84 Z" ${S(c2)}/></g>`);
  if (mode === 'color') P.push(`<path d="M30,55 L120,74 L210,55" stroke="${c3}" stroke-width="2" fill="none" opacity=".6"/>`);
  P.push(`<ellipse cx="120" cy="78" rx="16" ry="11" ${S()}/>`);
  P.push(`<path d="M128,66 L176,74 L128,72 Z" ${S(c3)}/>`, `<path d="M118,64 L92,50 L122,60 Z" ${S(c2)}/>`, `<circle cx="126" cy="64" r="8" ${S()}/>`);
  if (mode !== 'shadow') P.push(mode === 'fossil' ? '<circle cx="129" cy="63" r="2.5" fill="#8a7448"/>' : '<circle cx="129" cy="63" r="2.6" fill="#fff"/><circle cx="129.7" cy="63" r="1.5" fill="#1d1d1d"/>');
  P.push(`<path d="M114,88 l-4,10 M126,88 l4,10" stroke="${mode === 'fossil' ? '#a8915f' : c2}" stroke-width="3" stroke-linecap="round"/>`);
  return `<svg viewBox="10 40 220 64" width="220" height="64" xmlns="http://www.w3.org/2000/svg">${P.join('')}</svg>`;
}
globalThis.dinoSVG = dinoSVG;
})();
