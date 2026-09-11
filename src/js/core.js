/* Planta · núcleo: constantes, utilidades, geometría, colisiones, modelo de datos, historial y guardado */
'use strict';

/* ════════════════════════ Constantes ════════════════════════ */
const C = {
  paper: '#F4F6F3', ink: '#1C2420', ink2: '#4A544F', muted: '#879089',
  wall: '#1C2420', accent: '#1E7B5F', danger: '#D64545',
  gridMinor: '#E4E8E3', gridMajor: '#D0D7D0', arc: '#7A847E',
};
const ROOM_COLORS = ['#E9C9A6', '#BFD6B8', '#AFC8E2', '#E6C4D2', '#EEDFA8', '#CBC3E6', '#B7DCD6', '#DCCBBE'];
const FURN_COLORS = ['#D8CBBB', '#C2A98C', '#E3CB94', '#A7B79A', '#8FA8BC', '#D2A9A4', '#B9BDB8', '#6F7B73', '#46526A', '#FFFFFF'];
const FONT = '"Avenir Next", Avenir, "Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", system-ui, sans-serif';
const EPS = 1e-4;
const MIN_SCALE = 8, MAX_SCALE = 900;

const PRESETS = [
  { cat: 'Formas básicas', items: [
    { label: 'Rectángulo', name: 'Mueble', shape: 'rect', w: 1, h: 0.6, color: '#D8CBBB' },
    { label: 'Círculo', name: 'Mueble', shape: 'circle', w: 0.8, h: 0.8, color: '#D8CBBB' },
  ] },
  { cat: 'Dormitorio', items: [
    { name: 'Cama doble', shape: 'rect', w: 1.5, h: 2.0, color: '#D8CBBB' },
    { name: 'Cama individual', shape: 'rect', w: 0.9, h: 1.9, color: '#D8CBBB' },
    { name: 'Mesita', shape: 'rect', w: 0.45, h: 0.4, color: '#E3CB94' },
    { name: 'Armario', shape: 'rect', w: 1.2, h: 0.6, color: '#C2A98C' },
    { name: 'Cómoda', shape: 'rect', w: 1.0, h: 0.5, color: '#E3CB94' },
  ] },
  { cat: 'Salón', items: [
    { name: 'Sofá', shape: 'rect', w: 2.0, h: 0.9, color: '#8FA8BC' },
    { name: 'Sillón', shape: 'rect', w: 0.85, h: 0.85, color: '#8FA8BC' },
    { name: 'Mesa de centro', shape: 'rect', w: 1.0, h: 0.5, color: '#E3CB94' },
    { name: 'Mueble TV', shape: 'rect', w: 1.6, h: 0.4, color: '#C2A98C' },
    { name: 'Planta', shape: 'circle', w: 0.45, h: 0.45, color: '#A7B79A' },
  ] },
  { cat: 'Comedor', items: [
    { name: 'Mesa', shape: 'rect', w: 1.6, h: 0.9, color: '#E3CB94' },
    { name: 'Mesa redonda', shape: 'circle', w: 1.1, h: 1.1, color: '#E3CB94' },
    { name: 'Silla', shape: 'rect', w: 0.45, h: 0.45, color: '#C2A98C' },
  ] },
  { cat: 'Cocina', items: [
    { name: 'Encimera', shape: 'rect', w: 2.4, h: 0.6, color: '#B9BDB8' },
    { name: 'Nevera', shape: 'rect', w: 0.6, h: 0.65, color: '#B9BDB8' },
    { name: 'Isla', shape: 'rect', w: 1.6, h: 0.9, color: '#B9BDB8' },
  ] },
  { cat: 'Baño', items: [
    { name: 'Bañera', shape: 'rect', w: 1.7, h: 0.75, color: '#FFFFFF' },
    { name: 'Ducha', shape: 'rect', w: 1.2, h: 0.8, color: '#FFFFFF' },
    { name: 'Inodoro', shape: 'rect', w: 0.4, h: 0.65, color: '#FFFFFF' },
    { name: 'Lavabo', shape: 'rect', w: 0.6, h: 0.45, color: '#FFFFFF' },
  ] },
  { cat: 'Trabajo', items: [
    { name: 'Escritorio', shape: 'rect', w: 1.2, h: 0.6, color: '#E3CB94' },
    { name: 'Silla de oficina', shape: 'circle', w: 0.6, h: 0.6, color: '#6F7B73' },
    { name: 'Estantería', shape: 'rect', w: 0.8, h: 0.3, color: '#C2A98C' },
  ] },
];

/* ════════════════════════ Utilidades ════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = p => p + '_' + Math.random().toString(36).slice(2, 9);
const snap = (v, step) => Math.round(v / step) * step;
const r3 = v => Math.round(v * 1000) / 1000;
const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const parseNum = s => { const v = parseFloat(String(s).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const norm360 = a => ((a % 360) + 360) % 360;
const angDiff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const uniq = arr => [...new Set(arr.map(r3))];
function nearestVal(arr, v, th) { let best = null, bd = th; for (const t of arr) { const d = Math.abs(t - v); if (d < bd) { bd = d; best = t; } } return best; }
function bestSnap(src, tgt, delta, th) {
  let best = null;
  for (const s of src) { const m = s + delta; for (const t of tgt) { const d = Math.abs(t - m); if (d < th && (!best || d < best.diff)) best = { diff: d, delta: t - s, v: t }; } }
  return best;
}
function hexRgb(hex) { let h = String(hex).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function shade(hex, amt) { const c = hexRgb(hex); const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255); return '#' + [f(c.r), f(c.g), f(c.b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
function textOn(hex) { const c = hexRgb(hex); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.55 ? C.ink : '#FFFFFF'; }

/* ════════════════════════ Vectores y geometría ════════════════════════ */
const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  cross: (a, b) => a.x * b.y - a.y * b.x,
  len: a => Math.hypot(a.x, a.y),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  norm: a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  rot: (a, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }; },
};
const rect = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

function signedArea(P) { let s = 0; for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; s += a.x * b.y - b.x * a.y; } return s / 2; }
const polyArea = P => Math.abs(signedArea(P));
function perimeter(P) { let s = 0; for (let i = 0; i < P.length; i++) s += V.dist(P[i], P[(i + 1) % P.length]); return s; }
function centroid(P) {
  const A = signedArea(P);
  if (Math.abs(A) < 1e-9) return P.reduce((m, p) => ({ x: m.x + p.x / P.length, y: m.y + p.y / P.length }), { x: 0, y: 0 });
  let cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], k = a.x * b.y - b.x * a.y; cx += (a.x + b.x) * k; cy += (a.y + b.y) * k; }
  return { x: cx / (6 * A), y: cy / (6 * A) };
}
function bboxOf(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
  return { minX, minY, maxX, maxY };
}
const bboxHit = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
function pointInPoly(p, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function projSeg(p, a, b) {
  const ab = V.sub(b, a), L2 = V.dot(ab, ab);
  const t = L2 > 0 ? clamp(V.dot(V.sub(p, a), ab) / L2, 0, 1) : 0;
  const q = V.add(a, V.mul(ab, t));
  return { t, q, d: V.dist(p, q) };
}
function distToEdges(p, P) { let m = Infinity; for (let i = 0; i < P.length; i++) m = Math.min(m, projSeg(p, P[i], P[(i + 1) % P.length]).d); return m; }
function visualCenter(P) {
  const c = centroid(P), b = bboxOf(P), N = 14;
  let best = null, bestD = -1;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const p = { x: b.minX + (b.maxX - b.minX) * i / N, y: b.minY + (b.maxY - b.minY) * j / N };
    if (!pointInPoly(p, P)) continue;
    const d = distToEdges(p, P);
    if (d > bestD + 1e-9) { bestD = d; best = p; }
  }
  if (pointInPoly(c, P) && distToEdges(c, P) >= bestD * 0.7) return c;
  return best || c;
}
function segsCross(p1, p2, p3, p4) {
  const d1 = V.cross(V.sub(p4, p3), V.sub(p1, p3)), d2 = V.cross(V.sub(p4, p3), V.sub(p2, p3));
  const d3 = V.cross(V.sub(p2, p1), V.sub(p3, p1)), d4 = V.cross(V.sub(p2, p1), V.sub(p4, p1));
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}
function isSimplePolygon(P) {
  const n = P.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) if (V.dist(P[i], P[(i + 1) % n]) < 0.05) return false;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segsCross(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return false;
  }
  return polyArea(P) > 0.01;
}

/* Arco de apertura (sector de 90°) desde la dirección "cerrada" hasta la "abierta" */
function sectorPoly(h, c, o, r, N) {
  const a0 = Math.atan2(c.y, c.x), a1 = Math.atan2(o.y, o.x);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da <= -Math.PI) da += 2 * Math.PI;
  const pts = [h];
  for (let k = 0; k <= N; k++) { const a = a0 + da * k / N; pts.push({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r }); }
  return pts;
}

/* SAT para polígonos convexos; tocarse no cuenta como choque */
function polysOverlap(A, B) {
  let tested = 0;
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      let nx = q.y - p.y, ny = p.x - q.x;
      const l = Math.hypot(nx, ny);
      if (l < 1e-12) continue;
      nx /= l; ny /= l; tested++;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of A) { const d = v.x * nx + v.y * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; }
      for (const v of B) { const d = v.x * nx + v.y * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; }
      if (a1 - b0 <= EPS || b1 - a0 <= EPS) return false;
    }
  }
  return tested > 0;
}
function circlePolyOverlap(c, r, poly) {
  if (pointInPoly(c, poly)) return true;
  for (let i = 0; i < poly.length; i++) if (projSeg(c, poly[i], poly[(i + 1) % poly.length]).d < r - EPS) return true;
  return false;
}

/* ════════════════════════ Estado ════════════════════════ */
const emptyDoc = () => ({ rooms: [], openings: [], furniture: [], columns: [], labels: [] });
let doc = emptyDoc();
const view = { scale: 80, ox: 0, oy: 0 };
const ui = {
  tab: 'structure', grid: true, allDims: false, allowZones: false,
  hoverEdge: null, placeType: null, placePreview: null,
  newRoom: { shape: 'rect', w: 4, h: 3, cw: 1.5, ch: 1.5, sides: 6, side: 2, t: 0.15 },
};
let sel = null, mode = 'select', drag = null, draw = null, spaceDown = false, libDrag = null;
let lastPointerWorld = { x: 0, y: 0 };

const COLL = { room: 'rooms', opening: 'openings', furniture: 'furniture', column: 'columns', label: 'labels' };
const find = (kind, id) => (doc[COLL[kind]] || []).find(o => o.id === id) || null;
const selObj = () => (sel ? find(sel.kind, sel.id) : null);
const isSel = (kind, id) => !!sel && sel.kind === kind && sel.id === id;

/* ════════════════════════ Geometría derivada ════════════════════════ */
function roomGeom(room) {
  const P = room.points, n = P.length;
  const sgn = signedArea(P) >= 0 ? 1 : -1;
  const edges = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], d = V.norm(V.sub(b, a));
    edges[i] = { i, a, b, d, n: sgn > 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x }, len: V.dist(a, b), t: Math.max(0, +room.thick[i] || 0), os: null, oe: null };
  }
  for (let i = 0; i < n; i++) {
    const e1 = edges[(i - 1 + n) % n], e2 = edges[i], p = P[i];
    const q1 = V.add(p, V.mul(e1.n, e1.t)), q2 = V.add(p, V.mul(e2.n, e2.t));
    let m1 = q1, m2 = q2;
    const den = V.cross(e1.d, e2.d);
    if (Math.abs(den) > 1e-6) {
      const s = V.cross(V.sub(q2, q1), e2.d) / den;
      const m = V.add(q1, V.mul(e1.d, s));
      if (V.dist(m, p) <= Math.max(e1.t, e2.t) * 4 + 1e-6) { m1 = m; m2 = m; }
    }
    e1.oe = m1; e2.os = m2;
  }
  const outer = [];
  for (const e of edges) outer.push(e.os, e.oe);
  return { id: room.id, room, P, edges, outer, bbox: bboxOf(outer.concat(P)) };
}

function openingGeom(op, gmap) {
  const g = gmap.get(op.roomId); if (!g) return null;
  const e = g.edges[op.edge]; if (!e || e.len < 0.05) return null;
  const w = Math.min(op.width, e.len);
  const off = clamp(op.offset, 0, Math.max(0, e.len - w));
  const s = V.add(e.a, V.mul(e.d, off)), f = V.add(s, V.mul(e.d, w));
  const t = e.t, n = e.n, out = op.swing === 'out';
  // El hueco atraviesa también los muros paralelos de otras habitaciones que se solapan con este
  let lo = 0, hi = t;
  for (const g2 of gmap.values()) {
    if (g2 === g) continue;
    for (const e2 of g2.edges) {
      if (e2.t <= 0.004 || Math.abs(V.cross(e.d, e2.d)) > 0.02) continue;
      const b0 = V.dot(V.sub(e2.a, s), n), b1 = b0 + e2.t * V.dot(e2.n, n);
      const mn = Math.min(b0, b1), mx = Math.max(b0, b1);
      if (mx < lo - 0.02 || mn > hi + 0.02) continue;
      const p0 = V.dot(V.sub(e2.a, s), e.d), p1 = V.dot(V.sub(e2.b, s), e.d);
      if (Math.max(p0, p1) <= 0.01 || Math.min(p0, p1) >= w - 0.01) continue;
      lo = Math.min(lo, mn); hi = Math.max(hi, mx);
    }
  }
  const side = out ? n : V.mul(n, -1);
  const S = V.add(s, V.mul(n, out ? hi : lo)), F = V.add(f, V.mul(n, out ? hi : lo));
  const back = V.mul(e.d, -1);
  const leaves = [];
  if (op.style !== 'sliding') {
    if (op.leaves === 2) { leaves.push({ h: S, c: e.d, r: w / 2 }); leaves.push({ h: F, c: back, r: w / 2 }); }
    else if (op.hinge === 'end') leaves.push({ h: F, c: back, r: w });
    else leaves.push({ h: S, c: e.d, r: w });
  }
  const zones = leaves.map(L => sectorPoly(L.h, L.c, side, L.r, 12));
  return { op, g, e, s, f, w, off, t, lo, hi, n, side, leaves, zones };
}

function itemShape(it, x = it.x, y = it.y, rot = it.rot || 0, w = it.w, h = it.h) {
  if (it.shape === 'circle') { const r = w / 2; return { type: 'circle', c: { x, y }, r, bbox: { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r } }; }
  const hw = w / 2, hh = h / 2;
  const poly = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }].map(p => V.add(V.rot(p, rot), { x, y }));
  return { type: 'poly', poly, bbox: bboxOf(poly) };
}

function buildGeom() {
  const rooms = doc.rooms.map(roomGeom);
  const gmap = new Map(rooms.map(g => [g.id, g]));
  const openings = [];
  for (const op of doc.openings) { const og = openingGeom(op, gmap); if (og) openings.push(og); }
  const solids = [];
  for (const g of rooms) for (const e of g.edges) {
    if (e.t > 0.004 && e.len > 0.01) { const poly = [e.a, e.b, e.oe, e.os]; solids.push({ poly, bbox: bboxOf(poly) }); }
  }
  const cols = doc.columns.map(c => itemShape({ ...c, rot: 0 }));
  const zones = [];
  for (const og of openings) for (const z of og.zones) zones.push({ opId: og.op.id, poly: z, bbox: bboxOf(z) });
  return { rooms, gmap, openings, solids, cols, zones };
}

/* ════════════════════════ Colisiones ════════════════════════ */
function shapeVsPoly(sh, poly, bb) {
  if (!bboxHit(sh.bbox, bb)) return false;
  return sh.type === 'circle' ? circlePolyOverlap(sh.c, sh.r, poly) : polysOverlap(sh.poly, poly);
}
function shapeVsShape(a, b) {
  if (!bboxHit(a.bbox, b.bbox)) return false;
  if (a.type === 'circle' && b.type === 'circle') return V.dist(a.c, b.c) < a.r + b.r - EPS;
  if (a.type === 'circle') return circlePolyOverlap(a.c, a.r, b.poly);
  if (b.type === 'circle') return circlePolyOverlap(b.c, b.r, a.poly);
  return polysOverlap(a.poly, b.poly);
}
function hitsSolid(sh, G) {
  for (const s of G.solids) if (shapeVsPoly(sh, s.poly, s.bbox)) return true;
  for (const c of G.cols) if (shapeVsShape(sh, c)) return true;
  return false;
}
function zoneHits(sh, G) {
  const ids = new Set();
  for (const z of G.zones) if (!ids.has(z.opId) && shapeVsPoly(sh, z.poly, z.bbox)) ids.add(z.opId);
  return ids;
}
const solidAt = (f, x, y, rot, G) => hitsSolid(itemShape(f, x, y, rot), G);

/* Avanza desde "from" hacia "to" hasta el último punto sin chocar */
function sweep(f, from, to, G) {
  const d = V.dist(from, to);
  if (d < 1e-7) return { p: from, full: true };
  const steps = Math.max(1, Math.ceil(d / 0.025));
  let last = from;
  for (let s = 1; s <= steps; s++) {
    const p = V.lerp(from, to, s / steps);
    if (solidAt(f, p.x, p.y, f.rot, G)) {
      let lo = 0, hi = 1;
      for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2, q = V.lerp(last, p, m); if (solidAt(f, q.x, q.y, f.rot, G)) hi = m; else lo = m; }
      return { p: V.lerp(last, p, lo), full: false };
    }
    last = p;
  }
  return { p: to, full: true };
}

/* Mueve un mueble respetando muros: se desliza por ellos y "salta" al otro lado si tiras lo suficiente */
function moveFurniture(f, target, G, free) {
  const cur = { x: f.x, y: f.y };
  if (free || solidAt(f, cur.x, cur.y, f.rot, G)) { f.x = target.x; f.y = target.y; return 'free'; }
  const direct = sweep(f, cur, target, G);
  if (direct.full) { f.x = target.x; f.y = target.y; return 'ok'; }
  const popDist = 0.3;
  if (!solidAt(f, target.x, target.y, f.rot, G) && V.dist(direct.p, target) > popDist) { f.x = target.x; f.y = target.y; return 'pop'; }
  const a1 = sweep(f, cur, { x: target.x, y: cur.y }, G).p, a2 = sweep(f, a1, { x: a1.x, y: target.y }, G).p;
  const b1 = sweep(f, cur, { x: cur.x, y: target.y }, G).p, b2 = sweep(f, b1, { x: target.x, y: b1.y }, G).p;
  const best = [direct.p, a2, b2].reduce((m, p) => (V.dist(p, target) < V.dist(m, target) ? p : m));
  f.x = best.x; f.y = best.y;
  return 'blocked';
}

/* Busca el hueco libre más cercano en anillos concéntricos */
function findSpot(f, x, y, rot, G, maxR, avoidZones) {
  const ok = (px, py) => { const sh = itemShape(f, px, py, rot); return !hitsSolid(sh, G) && (!avoidZones || zoneHits(sh, G).size === 0); };
  if (ok(x, y)) return { x, y };
  const step = maxR > 1 ? 0.08 : 0.03;
  for (let r = step; r <= maxR + 1e-9; r += step) {
    const N = Math.max(8, Math.round(2 * Math.PI * r / step));
    for (let k = 0; k < N; k++) { const a = 2 * Math.PI * k / N, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (ok(px, py)) return { x: px, y: py }; }
  }
  return null;
}

/* ════════════════════════ Operaciones del modelo ════════════════════════ */
function nextRoomName() { let n = doc.rooms.length + 1; while (doc.rooms.some(r => r.name === 'Habitación ' + n)) n++; return 'Habitación ' + n; }
function makeRoom(points, o = {}) {
  return {
    id: uid('r'), name: o.name || nextRoomName(), color: o.color || ROOM_COLORS[doc.rooms.length % ROOM_COLORS.length],
    points: points.map(p => ({ x: r3(p.x), y: r3(p.y) })), thick: points.map(() => (o.t ?? ui.newRoom.t)), labelOffset: { x: 0, y: 0 },
  };
}
function openingDefaults(type) {
  return type === 'door'
    ? { type: 'door', style: 'swing', leaves: 1, swing: 'in', hinge: 'start', width: 0.8 }
    : { type: 'window', style: 'swing', leaves: 2, swing: 'in', hinge: 'start', width: 1.2 };
}
function itemsInside(room) {
  const inP = it => pointInPoly(it, room.points);
  return { furniture: doc.furniture.filter(inP), columns: doc.columns.filter(inP), labels: doc.labels.filter(inP) };
}

/* Cambiar la longitud de un muro: el vértice final se desplaza y arrastra en paralelo al muro siguiente */
function setEdgeLength(room, i, L) {
  const P = room.points.map(p => ({ ...p })), n = P.length, j = (i + 1) % n, k = (i + 2) % n;
  const cur = V.dist(P[i], P[j]); if (cur < 1e-6) return false;
  const d = V.norm(V.sub(P[j], P[i])), delta = L - cur;
  P[j] = V.add(P[j], V.mul(d, delta));
  P[k] = V.add(P[k], V.mul(d, delta));
  const Q = P.map(p => ({ x: r3(p.x), y: r3(p.y) }));
  if (!isSimplePolygon(Q)) return false;
  room.points = Q;
  return true;
}
function splitEdge(room, i) {
  const n = room.points.length, a = room.points[i], b = room.points[(i + 1) % n], len = V.dist(a, b);
  if (len < 0.2) return false;
  const m = V.lerp(a, b, 0.5), half = len / 2;
  room.points.splice(i + 1, 0, { x: r3(m.x), y: r3(m.y) });
  room.thick.splice(i + 1, 0, room.thick[i]);
  for (const op of doc.openings) {
    if (op.roomId !== room.id) continue;
    if (op.edge > i) op.edge++;
    else if (op.edge === i && op.offset + op.width / 2 > half) { op.edge = i + 1; op.offset = Math.max(0, op.offset - half); }
  }
  return true;
}
function removeVertex(room, k) {
  const n = room.points.length; if (n <= 3) return false;
  const pts = room.points.filter((_, i) => i !== k);
  if (!isSimplePolygon(pts)) return false;
  const prev = (k - 1 + n) % n, prevLen = V.dist(room.points[prev], room.points[k]);
  const newIdx = v => (v < k ? v : v - 1);
  for (const op of doc.openings) {
    if (op.roomId !== room.id) continue;
    if (op.edge === k) { op.edge = newIdx(prev); op.offset += prevLen; }
    else op.edge = newIdx(op.edge);
  }
  room.points = pts;
  room.thick = room.thick.filter((_, i) => i !== k);
  return true;
}
function rotateRoom(room, deg) {
  const c = centroid(room.points), rp = p => V.add(c, V.rot(V.sub(p, c), deg));
  const ins = itemsInside(room);
  room.points = room.points.map(p => { const q = rp(p); return { x: r3(q.x), y: r3(q.y) }; });
  room.labelOffset = V.rot(room.labelOffset || { x: 0, y: 0 }, deg);
  for (const f of ins.furniture) { const q = rp(f); f.x = q.x; f.y = q.y; f.rot = norm360((f.rot || 0) + deg); }
  for (const c2 of ins.columns) { const q = rp(c2); c2.x = r3(q.x); c2.y = r3(q.y); if (Math.abs(deg % 180) === 90) [c2.w, c2.h] = [c2.h, c2.w]; }
  for (const l of ins.labels) { const q = rp(l); l.x = r3(q.x); l.y = r3(q.y); }
}
function normalizeOpenings() {
  const rooms = new Map(doc.rooms.map(r => [r.id, r]));
  doc.openings = doc.openings.filter(o => rooms.has(o.roomId));
  for (const o of doc.openings) {
    const r = rooms.get(o.roomId), n = r.points.length;
    o.edge = clamp(o.edge | 0, 0, n - 1);
    const len = V.dist(r.points[o.edge], r.points[(o.edge + 1) % n]);
    o.offset = r3(clamp(o.offset, 0, Math.max(0, len - Math.min(o.width, len))));
  }
}
function roomsBounds() {
  if (!doc.rooms.length) return null;
  return doc.rooms.map(r => roomGeom(r).bbox).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
}
function docBounds() {
  const boxes = doc.rooms.map(r => roomGeom(r).bbox)
    .concat(doc.furniture.map(f => itemShape(f).bbox))
    .concat(doc.columns.map(c => itemShape({ ...c, rot: 0 }).bbox))
    .concat(doc.labels.map(l => ({ minX: l.x - 0.3, minY: l.y - 0.2, maxX: l.x + 0.3, maxY: l.y + 0.2 })));
  if (!boxes.length) return null;
  return boxes.reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
}

function sanitize(d) {
  if (!d || typeof d !== 'object') return null;
  const num = (v, def) => (Number.isFinite(+v) ? +v : def);
  const out = emptyDoc();
  out.rooms = (Array.isArray(d.rooms) ? d.rooms : []).filter(r => r && Array.isArray(r.points) && r.points.length >= 3).map((r, i) => ({
    id: String(r.id || uid('r')), name: String(r.name ?? 'Habitación'), color: String(r.color || ROOM_COLORS[i % ROOM_COLORS.length]),
    points: r.points.map(p => ({ x: num(p.x, 0), y: num(p.y, 0) })),
    thick: r.points.map((_, k) => clamp(num((r.thick || [])[k], 0.15), 0, 1)),
    labelOffset: { x: num(r.labelOffset && r.labelOffset.x, 0), y: num(r.labelOffset && r.labelOffset.y, 0) },
  }));
  const ids = new Set(out.rooms.map(r => r.id));
  out.openings = (Array.isArray(d.openings) ? d.openings : []).filter(o => o && ids.has(String(o.roomId))).map(o => ({
    id: String(o.id || uid('o')), type: o.type === 'window' ? 'window' : 'door', roomId: String(o.roomId), edge: num(o.edge, 0) | 0,
    offset: num(o.offset, 0), width: clamp(num(o.width, 0.8), 0.3, 20), style: o.style === 'sliding' ? 'sliding' : 'swing',
    leaves: +o.leaves === 2 ? 2 : 1, swing: o.swing === 'out' ? 'out' : 'in', hinge: o.hinge === 'end' ? 'end' : 'start',
  }));
  out.furniture = (Array.isArray(d.furniture) ? d.furniture : []).filter(f => f && Number.isFinite(+f.x) && Number.isFinite(+f.y)).map(f => ({
    id: String(f.id || uid('f')), name: String(f.name ?? ''), shape: f.shape === 'circle' ? 'circle' : 'rect', x: +f.x, y: +f.y,
    w: clamp(num(f.w, 0.5), 0.05, 30), h: clamp(num(f.h, num(f.w, 0.5)), 0.05, 30), rot: norm360(num(f.rot, 0)), color: String(f.color || FURN_COLORS[0]),
  }));
  out.columns = (Array.isArray(d.columns) ? d.columns : []).filter(c => c && Number.isFinite(+c.x)).map(c => ({
    id: String(c.id || uid('c')), shape: c.shape === 'circle' ? 'circle' : 'rect', x: +c.x, y: num(c.y, 0), w: clamp(num(c.w, 0.3), 0.05, 5), h: clamp(num(c.h, 0.3), 0.05, 5),
  }));
  out.labels = (Array.isArray(d.labels) ? d.labels : []).filter(l => l && Number.isFinite(+l.x)).map(l => ({
    id: String(l.id || uid('l')), text: String(l.text ?? ''), x: +l.x, y: num(l.y, 0), size: ['s', 'm', 'l'].includes(l.size) ? l.size : 'm',
  }));
  normalizeOpeningsOn(out);
  return out;
}
function normalizeOpeningsOn(d) { const prev = doc; doc = d; normalizeOpenings(); doc = prev; }

function demoDoc() {
  const d = emptyDoc();
  const R = (id, name, color, pts, thick, lo) => ({ id, name, color, points: pts, thick, labelOffset: lo || { x: 0, y: 0 } });
  d.rooms.push(R('r_salon', 'Salón', ROOM_COLORS[0], rect(0, 0, 4.6, 4.2), [0.25, 0.10, 0.25, 0.25], { x: 0.02, y: 0.1 }));
  d.rooms.push(R('r_dorm', 'Dormitorio', ROOM_COLORS[2], rect(4.7, 0, 3.3, 2.8), [0.25, 0.25, 0.10, 0.10], { x: 0, y: 1.05 }));
  d.rooms.push(R('r_bano', 'Baño', ROOM_COLORS[6], rect(4.7, 2.9, 3.3, 1.3), [0.10, 0.25, 0.25, 0.10], { x: -0.3, y: 0 }));
  const O = (id, type, roomId, edge, offset, width, extra) => Object.assign({ id, roomId, edge, offset, ...openingDefaults(type), width }, extra || {});
  d.openings.push(O('o_ent', 'door', 'r_salon', 2, 3.2, 0.9));
  d.openings.push(O('o_dorm', 'door', 'r_salon', 1, 1.6, 0.8, { swing: 'out' }));
  d.openings.push(O('o_bano', 'door', 'r_salon', 1, 3.15, 0.7, { swing: 'out' }));
  d.openings.push(O('o_vsal', 'window', 'r_salon', 0, 1.3, 2.0));
  d.openings.push(O('o_vdor', 'window', 'r_dorm', 0, 1.05, 1.2));
  d.openings.push(O('o_vban', 'window', 'r_bano', 1, 0.35, 0.6, { style: 'sliding' }));
  const F = (name, shape, x, y, w, h, rot, color) => ({ id: uid('f'), name, shape, x, y, w, h, rot, color });
  d.furniture.push(
    F('Mueble TV', 'rect', 0.2, 2.2, 1.6, 0.4, 90, '#C2A98C'),
    F('Sofá', 'rect', 3.3, 2.2, 2.0, 0.9, 90, '#8FA8BC'),
    F('Mesa de centro', 'rect', 1.3, 2.2, 1.0, 0.5, 90, '#E3CB94'),
    F('Estantería', 'rect', 3.9, 4.05, 0.9, 0.3, 0, '#C2A98C'),
    F('Planta', 'circle', 4.3, 0.35, 0.45, 0.45, 0, '#A7B79A'),
    F('Cama doble', 'rect', 7.0, 1.4, 1.5, 2.0, 90, '#D8CBBB'),
    F('Mesita', 'rect', 7.775, 0.425, 0.45, 0.4, 0, '#E3CB94'),
    F('Mesita', 'rect', 7.775, 2.375, 0.45, 0.4, 0, '#E3CB94'),
    F('Armario', 'rect', 5.0, 0.8, 1.2, 0.6, 90, '#C2A98C'),
    F('Ducha', 'rect', 7.6, 3.55, 1.2, 0.8, 90, '#FFFFFF'),
    F('Inodoro', 'rect', 6.85, 3.875, 0.4, 0.65, 0, '#FFFFFF'),
    F('Lavabo', 'rect', 6.85, 3.125, 0.6, 0.45, 0, '#FFFFFF'),
  );
  d.columns.push({ id: 'c_1', shape: 'rect', x: 0.15, y: 0.15, w: 0.3, h: 0.3 });
  d.labels.push({ id: 'l_ent', text: 'Entrada', x: 0.95, y: 4.8, size: 'm' });
  return d;
}

/* ════════════════════════ Historial y guardado ════════════════════════ */
const hist = { stack: [], i: -1 };
function resetHistory() { hist.stack = [JSON.stringify(doc)]; hist.i = 0; updateUndo(); }
function commit() {
  clearTimeout(commitTimer);
  normalizeOpenings();
  const s = JSON.stringify(doc);
  if (hist.stack[hist.i] === s) return;
  hist.stack.length = hist.i + 1;
  hist.stack.push(s);
  if (hist.stack.length > 200) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  updateUndo(); scheduleSave();
}
let commitTimer = 0;
function commitSoon() { clearTimeout(commitTimer); commitTimer = setTimeout(commit, 400); }
function undo() { if (hist.i <= 0) return; hist.i--; doc = JSON.parse(hist.stack[hist.i]); afterDocReplace(); }
function redo() { if (hist.i >= hist.stack.length - 1) return; hist.i++; doc = JSON.parse(hist.stack[hist.i]); afterDocReplace(); }
function afterDocReplace() { if (mode !== 'select') setMode('select'); if (sel && !selObj()) sel = null; renderPanel(); requestRender(); updateUndo(); scheduleSave(); }
function updateUndo() { const u = $('#btn-undo'), r = $('#btn-redo'); if (u) u.disabled = hist.i <= 0; if (r) r.disabled = hist.i >= hist.stack.length - 1; }

const STORE_KEY = 'planta:proyecto';
let saveTimer = 0;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
async function save() { try { if (window.storage && window.storage.set) await window.storage.set(STORE_KEY, JSON.stringify(doc), false); } catch (_) { /* sin almacenamiento disponible */ } }
async function load() {
  try { if (window.storage && window.storage.get) { const r = await window.storage.get(STORE_KEY, false); if (r && r.value) return JSON.parse(r.value); } } catch (_) { /* primera vez o sin almacenamiento */ }
  return null;
}
