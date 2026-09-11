/* Planta · render: dibuja el plano completo en SVG a partir del modelo */
'use strict';
/* ════════════════════════ Render SVG ════════════════════════ */
let RV = view, UK = 1, CUT_FILL = C.paper;
const SX = x => x * RV.scale + RV.ox;
const SY = y => y * RV.scale + RV.oy;
const P2 = p => (p.x * RV.scale + RV.ox).toFixed(1) + ',' + (p.y * RV.scale + RV.oy).toFixed(1);
const dPath = (pts, close = true) => 'M' + pts.map(P2).join('L') + (close ? 'Z' : '');
const px = n => (n * UK).toFixed(2);
function lineEl(a, b, stroke, w, extra = '') {
  return `<line x1="${SX(a.x).toFixed(1)}" y1="${SY(a.y).toFixed(1)}" x2="${SX(b.x).toFixed(1)}" y2="${SY(b.y).toFixed(1)}" stroke="${stroke}" stroke-width="${px(w)}" stroke-linecap="round" ${extra}/>`;
}
function textEl(x, y, str, o = {}) {
  const X = x.toFixed(1), Y = y.toFixed(1);
  return `<text x="${X}" y="${Y}" font-size="${(o.size || 11).toFixed(1)}" font-weight="${o.weight || 400}" fill="${o.fill || C.ink}" text-anchor="middle" dominant-baseline="central"` +
    (o.rot ? ` transform="rotate(${o.rot.toFixed(1)} ${X} ${Y})"` : '') +
    (o.halo ? ` stroke="${o.halo}" stroke-width="${px(3)}" stroke-linejoin="round" paint-order="stroke"` : '') +
    ` pointer-events="none">${esc(str)}</text>`;
}
const readableAngle = d => { let a = Math.atan2(d.y, d.x) * 180 / Math.PI; if (a > 90) a -= 180; else if (a <= -90) a += 180; return a; };
function resizeCursor(n) { if (Math.abs(n.x) > 0.92) return 'ew-resize'; if (Math.abs(n.y) > 0.92) return 'ns-resize'; return n.x * n.y > 0 ? 'nwse-resize' : 'nesw-resize'; }
function axisCursor(deg) { const a = norm360(deg) % 180; if (a < 22.5 || a >= 157.5) return 'ew-resize'; if (a < 67.5) return 'nwse-resize'; if (a < 112.5) return 'ns-resize'; return 'nesw-resize'; }
const fmtAngle = a => { let v = Math.round(norm360(a) * 10) / 10; if (v >= 360) v = 0; return String(v).replace('.', ',') + '°'; };
const dimsLabel = f => (f.shape === 'circle' ? 'Ø ' + fmt(f.w) : fmt(f.w) + ' × ' + fmt(f.h));

function gridSvg(W, H) {
  const s = RV.scale;
  const minor = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100].find(t => t * s >= 11) || 100;
  const major = [1, 5, 10, 50, 100, 500].find(m => m > minor + 1e-9 && m * s >= 50) || 500;
  const isMaj = v => Math.abs(v / major - Math.round(v / major)) < 1e-6;
  const x0 = -RV.ox / s, x1 = (W - RV.ox) / s, y0 = -RV.oy / s, y1 = (H - RV.oy) / s;
  let a = '', b = '';
  for (let k = Math.ceil(x0 / minor); k * minor <= x1; k++) { const v = k * minor, X = (v * s + RV.ox).toFixed(1); if (isMaj(v)) b += `M${X} 0V${H}`; else a += `M${X} 0V${H}`; }
  for (let k = Math.ceil(y0 / minor); k * minor <= y1; k++) { const v = k * minor, Y = (v * s + RV.oy).toFixed(1); if (isMaj(v)) b += `M0 ${Y}H${W}`; else a += `M0 ${Y}H${W}`; }
  return `<path d="${a}" stroke="${C.gridMinor}" stroke-width="1" fill="none" pointer-events="none"/><path d="${b}" stroke="${C.gridMajor}" stroke-width="1" fill="none" pointer-events="none"/>`;
}

function renderScene(v, W, H, o = {}) {
  RV = v; UK = o.uk || 1;
  const exp = !!o.export;
  CUT_FILL = exp ? '#FFFFFF' : C.paper;
  const G = buildGeom();
  const out = [];
  if (!exp) out.push(`<rect data-kind="bg" x="0" y="0" width="${W}" height="${H}" fill="transparent"/>`);
  if (!exp && ui.grid) out.push(gridSvg(W, H));

  // Conflictos de muebles (muros/columnas y zonas de apertura)
  const conf = new Map(), hot = new Set();
  for (const f of doc.furniture) {
    const sh = itemShape(f), solid = hitsSolid(sh, G), zs = zoneHits(sh, G);
    if (solid || zs.size) conf.set(f.id, true);
    zs.forEach(id => hot.add(id));
  }
  const selRoom = !exp && sel && sel.kind === 'room' ? sel.id : null;

  // Suelos
  for (const g of G.rooms) {
    const on = g.id === selRoom;
    out.push(`<path data-kind="room" data-id="${g.id}" d="${dPath(g.P)}" fill="${g.room.color}" fill-opacity="${on ? 0.62 : 0.45}" style="cursor:${on ? 'move' : 'default'}"/>`);
  }
  // Zonas de apertura
  for (const og of G.openings) {
    const h = hot.has(og.op.id);
    for (const z of og.zones) out.push(`<path d="${dPath(z)}" fill="${h ? 'rgba(214,69,69,.2)' : 'rgba(28,36,32,.045)'}" pointer-events="none"/>`);
  }
  // Muros (poché)
  for (const g of G.rooms) {
    out.push(`<path d="${dPath(g.outer)}${dPath(g.P)}" fill="${C.wall}" fill-rule="evenodd" pointer-events="none"/>`);
    for (const e of g.edges) if (e.t <= 0.004) out.push(lineEl(e.a, e.b, C.ink2, 1, `stroke-dasharray="${px(5)} ${px(4)}" pointer-events="none"`));
  }
  // Zonas de clic de los muros
  if (!exp) for (const g of G.rooms) {
    const on = g.id === selRoom;
    for (const e of g.edges) {
      const k = 5 / RV.scale;
      const band = e.t > 0.004 ? [e.a, e.b, e.oe, e.os] : [V.add(e.a, V.mul(e.n, k)), V.add(e.b, V.mul(e.n, k)), V.add(e.b, V.mul(e.n, -k)), V.add(e.a, V.mul(e.n, -k))];
      out.push(`<path data-kind="wall" data-id="${g.id}" data-edge="${e.i}" d="${dPath(band)}" fill="transparent" style="cursor:${on ? resizeCursor(e.n) : 'default'}"/>`);
    }
  }
  // Muro resaltado (desde el panel o al arrastrar)
  if (!exp && ui.hoverEdge) {
    const g = G.gmap.get(ui.hoverEdge.roomId), e = g && g.edges[ui.hoverEdge.edge];
    if (e) {
      const q = e.t > 0.004 ? [e.a, e.b, e.oe, e.os] : null;
      out.push(q ? `<path d="${dPath(q)}" fill="${C.accent}" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>` : lineEl(e.a, e.b, C.accent, 3, 'pointer-events="none"'));
    }
  }
  // Puertas y ventanas
  for (const og of G.openings) out.push(openingSvg(og, hot.has(og.op.id), !exp && isSel('opening', og.op.id)));
  // Columnas
  for (const c of doc.columns) {
    const on = !exp && isSel('column', c.id);
    const shape = c.shape === 'circle'
      ? `<circle cx="${SX(c.x).toFixed(1)}" cy="${SY(c.y).toFixed(1)}" r="${(c.w / 2 * RV.scale).toFixed(1)}"`
      : `<rect x="${SX(c.x - c.w / 2).toFixed(1)}" y="${SY(c.y - c.h / 2).toFixed(1)}" width="${(c.w * RV.scale).toFixed(1)}" height="${(c.h * RV.scale).toFixed(1)}"`;
    out.push(`${shape} data-kind="column" data-id="${c.id}" fill="${C.wall}"${on ? ` stroke="${C.accent}" stroke-width="3"` : ''} style="cursor:move"/>`);
  }
  // Muebles
  for (const f of doc.furniture) out.push(furnitureSvg(f, conf.has(f.id), !exp && isSel('furniture', f.id)));
  // Medidas de muros
  for (const g of G.rooms) if (ui.allDims || g.id === selRoom) out.push(edgeDims(g, g.id === selRoom));
  // Etiquetas de habitación
  for (const g of G.rooms) out.push(roomLabelSvg(g));
  // Etiquetas libres
  const LS = { s: 11, m: 13, l: 17 };
  for (const l of doc.labels) {
    const fs = (LS[l.size] || 13) * UK, X = SX(l.x), Y = SY(l.y), on = !exp && isSel('label', l.id);
    const w = Math.max(24 * UK, String(l.text).length * fs * 0.58) + 14 * UK, h = fs + 12 * UK;
    out.push(`<g data-kind="label" data-id="${l.id}" style="cursor:move"><rect x="${(X - w / 2).toFixed(1)}" y="${(Y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${px(6)}" fill="${on ? 'rgba(30,123,95,.08)' : 'transparent'}"${on ? ` stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="4 3"` : ''}/>${textEl(X, Y, l.text, { size: fs, weight: 500, halo: 'rgba(244,246,243,.9)' })}</g>`);
  }
  // Superposiciones de edición
  if (!exp) {
    if (selRoom) out.push(roomHandles(G.gmap.get(selRoom)));
    if (sel && sel.kind === 'furniture') { const f = find('furniture', sel.id); if (f) out.push(furnitureHandles(f)); }
    if (sel && sel.kind === 'opening') { const og = G.openings.find(x => x.op.id === sel.id); if (og) out.push(openingDims(og)); }
    if (drag && drag.guides) out.push(guidesSvg(drag.guides, W, H));
    if (mode === 'draw' && draw) out.push(drawPreview(W, H));
    if (mode === 'place' && ui.placePreview) { const og = openingGeom(ui.placePreview, G.gmap); if (og) out.push(`<g opacity=".8" pointer-events="none">${openingSvg(og, false, true)}</g>`); }
  }
  return out.join('');
}

function openingSvg(og, hotZone, on) {
  const { op, e, s, f, lo, hi, n, side, leaves, w } = og;
  const T = hi - lo, ink = on ? C.accent : C.ink, k = 1 / RV.scale, out = [];
  const pad = Math.max(T, 16 * k) * 0.6;
  const band = (a0, a1) => [V.add(s, V.mul(n, a0)), V.add(f, V.mul(n, a0)), V.add(f, V.mul(n, a1)), V.add(s, V.mul(n, a1))];
  out.push(`<path d="${dPath(band(lo - pad, hi + pad))}" fill="transparent"/>`);
  if (T > 0.004) out.push(`<path d="${dPath(band(lo - 1.5 * k, hi + 1.5 * k))}" fill="${op.type === 'window' ? '#FFFFFF' : CUT_FILL}"/>`);
  const at = (p, r) => V.add(p, V.mul(n, lo + T * r));
  const sIn = at(s, 0), fIn = at(f, 0), sOut = at(s, 1), fOut = at(f, 1);
  if (op.type === 'window') {
    if (T > 0.004) out.push(lineEl(sIn, fIn, ink, 1), lineEl(sOut, fOut, ink, 1), lineEl(sIn, sOut, ink, 1), lineEl(fIn, fOut, ink, 1));
    if (op.style === 'sliding') {
      const m1 = V.add(s, V.mul(e.d, w * 0.56)), m2 = V.add(s, V.mul(e.d, w * 0.44));
      out.push(lineEl(at(s, 0.36), at(m1, 0.36), ink, 1.7), lineEl(at(m2, 0.64), at(f, 0.64), ink, 1.7));
    } else out.push(lineEl(at(s, 0.5), at(f, 0.5), ink, 1.3));
  } else {
    if (T > 0.004) out.push(lineEl(sIn, sOut, ink, 1), lineEl(fIn, fOut, ink, 1));
    if (op.style === 'sliding') {
      if (op.leaves === 2) {
        const m1 = V.add(s, V.mul(e.d, w * 0.56)), m2 = V.add(s, V.mul(e.d, w * 0.44));
        out.push(lineEl(at(s, 0.32), at(m1, 0.32), ink, 2.4), lineEl(at(m2, 0.68), at(f, 0.68), ink, 2.4));
      } else out.push(lineEl(at(s, 0.5), at(f, 0.5), ink, 2.4));
    }
  }
  for (const L of leaves) {
    const arc = sectorPoly(L.h, L.c, side, L.r, 18).slice(1);
    const tip = V.add(L.h, V.mul(side, L.r));
    const col = hotZone ? C.danger : on ? C.accent : C.arc;
    out.push(`<path d="${dPath(arc, false)}" fill="none" stroke="${col}" stroke-width="${px(1.1)}" stroke-dasharray="${px(4)} ${px(3)}"/>`);
    out.push(lineEl(L.h, tip, hotZone ? C.danger : ink, op.type === 'door' ? 2.2 : 1.3));
  }
  return `<g data-kind="opening" data-id="${op.id}" style="cursor:move">${out.join('')}</g>`;
}

function furnitureSvg(f, conflict, on) {
  const X = SX(f.x), Y = SY(f.y), s = RV.scale;
  const w = f.w * s, h = (f.shape === 'circle' ? f.w : f.h) * s;
  const stroke = conflict ? C.danger : shade(f.color, -0.32);
  const sw = px(conflict ? 2 : 1.1);
  let body, overlay = '';
  if (f.shape === 'circle') {
    body = `<circle r="${(w / 2).toFixed(1)}" fill="${f.color}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (conflict) overlay = `<circle r="${(w / 2).toFixed(1)}" fill="${C.danger}" fill-opacity=".22"/>`;
  } else {
    const geo = `x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4 * UK, w * 0.12, h * 0.12).toFixed(1)}"`;
    body = `<rect ${geo} fill="${f.color}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (conflict) overlay = `<rect ${geo} fill="${C.danger}" fill-opacity=".22"/>`;
  }
  let txt = '';
  const name = f.name || '';
  if (name) {
    const along = f.shape === 'circle' || f.w >= f.h * 0.85 ? 0 : 90;
    const long = along ? h : w, short = along ? w : h;
    const fs = Math.min(12.5 * UK, short * 0.4, (f.shape === 'circle' ? long * 0.72 : long * 0.88) / Math.max(1, name.length * 0.58));
    if (fs >= 6.5 * UK) {
      let tr = along;
      const total = norm360((+f.rot || 0) + tr);
      if (total > 90 && total <= 270) tr += 180;
      const tc = conflict ? '#7A1F1F' : textOn(f.color);
      const showDims = on && short > fs * 3.3;
      txt = `<g transform="rotate(${tr})" pointer-events="none"><text y="${(showDims ? -fs * 0.55 : 0).toFixed(1)}" font-size="${fs.toFixed(1)}" font-weight="500" fill="${tc}" text-anchor="middle" dominant-baseline="central">${esc(name)}</text>` +
        (showDims ? `<text y="${(fs * 0.78).toFixed(1)}" font-size="${(fs * 0.82).toFixed(1)}" fill="${tc}" fill-opacity=".7" text-anchor="middle" dominant-baseline="central">${dimsLabel(f)}</text>` : '') + '</g>';
    }
  }
  return `<g data-kind="furniture" data-id="${f.id}" transform="translate(${X.toFixed(1)},${Y.toFixed(1)}) rotate(${(+f.rot || 0).toFixed(2)})" style="cursor:move">${body}${overlay}${txt}</g>`;
}

function handleRect(x, y, id, h, cursor) {
  return `<rect data-kind="resize" data-id="${id}" data-h="${h}" x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" rx="2.5" fill="#fff" stroke="${C.accent}" stroke-width="1.6" style="cursor:${cursor}"/>`;
}
function badge(x, y, label, bg) {
  const bw = label.length * 7 + 16;
  return `<g pointer-events="none"><rect x="${(x - bw / 2).toFixed(1)}" y="${(y - 11).toFixed(1)}" width="${bw}" height="22" rx="6" fill="${bg}"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11.5" font-weight="600" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(label)}</text></g>`;
}
function furnitureHandles(f) {
  const X = SX(f.x), Y = SY(f.y), s = RV.scale, rot = +f.rot || 0;
  const w = f.w * s, h = (f.shape === 'circle' ? f.w : f.h) * s, pad = 4, stem = 24;
  const tr = `translate(${X.toFixed(1)},${Y.toFixed(1)}) rotate(${rot.toFixed(2)})`;
  let o = '';
  const rotating = drag && drag.type === 'rotate' && drag.id === f.id && drag.moved;
  if (rotating && drag.snapAngle != null) {
    const L = (Math.max(f.w, f.shape === 'circle' ? f.w : f.h) / 2 + 1.4) * s;
    o += `<g transform="${tr}" pointer-events="none" stroke="${C.accent}" stroke-width="1" stroke-dasharray="6 4"><line x1="${-L}" y1="0" x2="${L}" y2="0"/><line x1="0" y1="${-L}" x2="0" y2="${L}"/></g>`;
  }
  o += `<g transform="${tr}">`;
  if (f.shape === 'circle') {
    o += `<circle r="${(w / 2 + pad).toFixed(1)}" fill="none" stroke="${C.accent}" stroke-width="1.5" pointer-events="none"/>`;
    o += handleRect(w / 2 + pad, 0, f.id, 'r', axisCursor(rot));
  } else {
    o += `<rect x="${(-w / 2 - pad).toFixed(1)}" y="${(-h / 2 - pad).toFixed(1)}" width="${(w + 2 * pad).toFixed(1)}" height="${(h + 2 * pad).toFixed(1)}" rx="5" fill="none" stroke="${C.accent}" stroke-width="1.5" pointer-events="none"/>`;
    const top = -h / 2 - pad - stem;
    o += `<line x1="0" y1="${(-h / 2 - pad).toFixed(1)}" x2="0" y2="${top.toFixed(1)}" stroke="${C.accent}" stroke-width="1.5" pointer-events="none"/>`;
    o += `<circle data-kind="rotate" data-id="${f.id}" cx="0" cy="${top.toFixed(1)}" r="7" fill="#fff" stroke="${C.accent}" stroke-width="2" style="cursor:grab"/>`;
    o += `<path d="M-3 ${(top - 1).toFixed(1)}a3 3 0 1 1 1 2.6" fill="none" stroke="${C.accent}" stroke-width="1.2" pointer-events="none"/>`;
    o += handleRect(w / 2 + pad, 0, f.id, 'e', axisCursor(rot)) + handleRect(-w / 2 - pad, 0, f.id, 'w', axisCursor(rot));
    o += handleRect(0, h / 2 + pad, f.id, 's', axisCursor(rot + 90)) + handleRect(0, -h / 2 - pad, f.id, 'n', axisCursor(rot + 90));
  }
  o += '</g>';
  if (rotating) {
    const hp = V.add({ x: X, y: Y }, V.rot({ x: 0, y: -h / 2 - pad - stem - 26 }, rot));
    o += badge(hp.x, hp.y, fmtAngle(rot), drag.snapAngle != null ? C.accent : C.ink);
  }
  if (drag && drag.type === 'resize' && drag.id === f.id && drag.moved) {
    const r = Math.max(w, h) / 2 + 30;
    o += badge(X, Y + r, dimsLabel(f) + ' m', C.ink);
  }
  return o;
}

function roomLabelSvg(g) {
  const r = g.room, vc = visualCenter(g.P), off = r.labelOffset || { x: 0, y: 0 };
  const X = SX(vc.x + off.x), Y = SY(vc.y + off.y);
  const fs = clamp(RV.scale * 0.16, 10.5, 15) * UK;
  const area = fmt(polyArea(g.P)) + ' m²';
  const showArea = RV.scale >= 18;
  const w = Math.max(String(r.name).length * fs * 0.62, area.length * fs * 0.5) + 16 * UK, h = fs * (showArea ? 2.8 : 1.7);
  const halo = 'rgba(255,255,255,.85)';
  return `<g data-kind="roomlabel" data-id="${r.id}" style="cursor:move"><rect x="${(X - w / 2).toFixed(1)}" y="${(Y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent"/>` +
    textEl(X, showArea ? Y - fs * 0.6 : Y, r.name, { size: fs, weight: 600, halo }) +
    (showArea ? textEl(X, Y + fs * 0.72, area, { size: fs * 0.85, fill: C.ink2, halo }) : '') + '</g>';
}

function edgeDims(g, selected) {
  let o = '';
  for (const e of g.edges) {
    const label = fmt(e.len);
    if (e.len * RV.scale < label.length * 6.5 * UK + 14) continue;
    const p = V.add(V.lerp(e.a, e.b, 0.5), V.mul(e.n, -13 * UK / RV.scale));
    o += textEl(SX(p.x), SY(p.y), label, { size: 10.5 * UK, weight: 600, fill: selected ? C.accent : C.ink2, rot: readableAngle(e.d), halo: 'rgba(255,255,255,.9)' });
  }
  return o;
}

function roomHandles(g) {
  if (!g) return '';
  let o = '';
  for (const e of g.edges) {
    if (e.len * RV.scale < 28) continue;
    const p = V.add(V.lerp(e.a, e.b, 0.5), V.mul(e.n, e.t + 15 / RV.scale));
    o += `<g pointer-events="none"><circle cx="${SX(p.x).toFixed(1)}" cy="${SY(p.y).toFixed(1)}" r="8.5" fill="#fff" stroke="${C.accent}" stroke-width="1.2"/>${textEl(SX(p.x), SY(p.y), String(e.i + 1), { size: 10, weight: 600, fill: C.accent })}</g>`;
  }
  for (const e of g.edges) {
    if (e.len * RV.scale < 36) continue;
    const c = V.add(V.lerp(e.a, e.b, 0.5), V.mul(e.n, e.t / 2));
    const ang = Math.atan2(e.d.y, e.d.x) * 180 / Math.PI;
    o += `<rect data-kind="edge" data-id="${g.id}" data-edge="${e.i}" x="-11" y="-4" width="22" height="8" rx="4" transform="translate(${SX(c.x).toFixed(1)},${SY(c.y).toFixed(1)}) rotate(${ang.toFixed(1)})" fill="#fff" stroke="${C.accent}" stroke-width="1.5" style="cursor:${resizeCursor(e.n)}"/>`;
  }
  g.P.forEach((p, i) => {
    o += `<circle data-kind="vertex" data-id="${g.id}" data-index="${i}" cx="${SX(p.x).toFixed(1)}" cy="${SY(p.y).toFixed(1)}" r="6" fill="#fff" stroke="${C.accent}" stroke-width="2" style="cursor:move"/>`;
  });
  return o;
}

function openingDims(og) {
  const { e, s, f } = og;
  const inward = V.mul(e.n, -24 / RV.scale), tick = V.mul(e.n, 4 / RV.scale), ang = readableAngle(e.d);
  let o = '';
  const seg = (a, b) => {
    const L = V.dist(a, b); if (L < 0.01) return;
    const A = V.add(a, inward), B = V.add(b, inward);
    const ne = 'pointer-events="none"';
    o += lineEl(A, B, C.accent, 1, ne) + lineEl(V.sub(A, tick), V.add(A, tick), C.accent, 1, ne) + lineEl(V.sub(B, tick), V.add(B, tick), C.accent, 1, ne);
    if (L * RV.scale > 34) { const p = V.add(V.lerp(A, B, 0.5), V.mul(e.n, -9 / RV.scale)); o += textEl(SX(p.x), SY(p.y), fmt(L), { size: 10.5, weight: 600, fill: C.accent, rot: ang, halo: 'rgba(255,255,255,.92)' }); }
  };
  seg(e.a, s); seg(f, e.b);
  return o;
}

function guidesSvg(gd, W, H) {
  let o = '';
  const st = `stroke="${C.accent}" stroke-width="1" stroke-dasharray="5 4" pointer-events="none"`;
  if (gd.x != null) { const X = SX(gd.x).toFixed(1); o += `<line x1="${X}" y1="0" x2="${X}" y2="${H}" ${st}/>`; }
  if (gd.y != null) { const Y = SY(gd.y).toFixed(1); o += `<line x1="0" y1="${Y}" x2="${W}" y2="${Y}" ${st}/>`; }
  return o;
}

function drawPreview(W, H) {
  const pts = draw.points, cur = draw.cursor;
  const all = cur && !(pts.length && V.dist(cur, pts[pts.length - 1]) < 1e-6) ? pts.concat([cur]) : pts.slice();
  let o = '';
  if (draw.guides) o += guidesSvg(draw.guides, W, H);
  if (all.length >= 3) o += `<path d="${dPath(all)}" fill="${C.accent}" fill-opacity=".07" pointer-events="none"/>`;
  if (all.length >= 2) o += `<path d="${dPath(all, false)}" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>`;
  if (pts.length >= 2 && cur) o += lineEl(cur, pts[0], C.accent, 1, 'stroke-dasharray="4 4" opacity=".55" pointer-events="none"');
  for (let i = 0; i + 1 < all.length; i++) {
    const a = all[i], b = all[i + 1], L = V.dist(a, b);
    if (L < 0.05) continue;
    const d = V.norm(V.sub(b, a)), nrm = { x: d.y, y: -d.x };
    const p = V.add(V.lerp(a, b, 0.5), V.mul(nrm, 14 / RV.scale));
    const live = i === all.length - 2 && cur && pts.length && all[all.length - 1] === cur;
    if (live && draw.typed) o += badge(SX(p.x), SY(p.y), draw.typed + ' m', C.accent);
    else o += textEl(SX(p.x), SY(p.y), fmt(L), { size: 11, weight: 600, fill: C.accent, rot: readableAngle(d), halo: 'rgba(255,255,255,.92)' });
  }
  pts.forEach((p, i) => {
    const closing = i === 0 && draw.closing;
    o += `<circle cx="${SX(p.x).toFixed(1)}" cy="${SY(p.y).toFixed(1)}" r="${closing ? 8 : 4.5}" fill="${closing ? C.accent : '#fff'}" stroke="${C.accent}" stroke-width="2" pointer-events="none"/>`;
  });
  if (cur && !draw.closing) o += `<circle cx="${SX(cur.x).toFixed(1)}" cy="${SY(cur.y).toFixed(1)}" r="3.5" fill="${C.accent}" pointer-events="none"/>`;
  if (!pts.length && cur) o += badge(SX(cur.x), SY(cur.y) - 22, 'Clic para el primer vértice', C.ink);
  return o;
}
