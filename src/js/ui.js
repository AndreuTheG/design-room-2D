/* Planta · lienzo: vista, selección, modos, arrastres, dibujo a mano y teclado */
'use strict';
/* ════════════════════════ DOM y bucle de render ════════════════════════ */
const stage = $('#stage'), svg = $('#svg'), scene = $('#scene'), panel = $('#panel'), hintEl = $('#hint');

const ICONS = {
  plus: '<path d="M8 3v10M3 8h10"/>',
  undo: '<path d="M5.5 3.5 2.5 6.5l3 3"/><path d="M3 6.5h6.5a3.5 3.5 0 0 1 0 7H7"/>',
  redo: '<path d="m10.5 3.5 3 3-3 3"/><path d="M13 6.5H6.5a3.5 3.5 0 0 0 0 7H9"/>',
  more: '<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>',
  back: '<path d="M10 3 5 8l5 5"/>',
  trash: '<path d="M2.5 4.5h11M6.5 4.5V2.8h3v1.7M4 4.5l.7 8.7h6.6l.7-8.7"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.2V3a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h.2"/>',
  rotate: '<path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M12 1.8v2.9H9.1"/>',
  door: '<path d="M2.5 13.5h11"/><path d="M4 13.5V3.5"/><path d="M4 3.5a10 10 0 0 1 10 10" stroke-dasharray="1.5 1.8"/>',
  window: '<rect x="1.5" y="6" width="13" height="4" rx=".6"/><path d="M1.5 8h13"/>',
  column: '<rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none"/>',
  tag: '<path d="M2.5 3.5v4.1l6.2 6.2 5.1-5.1-6.2-6.2H3.5a1 1 0 0 0-1 1Z"/><circle cx="5.6" cy="5.6" r="1"/>',
  pencil: '<path d="M10.8 2.7l2.5 2.5-8 8H2.8v-2.5z"/><path d="m9.3 4.2 2.5 2.5"/>',
  split: '<path d="M8 3v10"/><path d="M5 5.5 2.5 8 5 10.5M11 5.5 13.5 8 11 10.5"/>',
  merge: '<path d="M2.5 5.5 5.5 8l-3 2.5M13.5 5.5 10.5 8l3 2.5"/><path d="M7 8h2"/>',
  swap: '<path d="M2.5 5.5h10l-2.5-2.5M13.5 10.5h-10l2.5 2.5"/>',
  flip: '<path d="M2 8h12" stroke-dasharray="1.6 1.6"/><path d="M5 5.5 8 2.5l3 3M5 10.5l3 3 3-3"/>',
  center: '<path d="M2 8h12"/><path d="M4.5 5v6M11.5 5v6"/>',
  alert: '<path d="M8 2.5 14 13H2Z"/><path d="M8 6.5v3M8 11.3v.2"/>',
  zoomin: '<path d="M8 3.5v9M3.5 8h9"/>',
  zoomout: '<path d="M3.5 8h9"/>',
  fit: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>',
  grid: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11"/>',
  ruler: '<path d="M1.8 11.2 11.2 1.8l3 3-9.4 9.4Z"/><path d="m4.6 8.4 1.4 1.4M6.8 6.2l1 1M9 4l1.4 1.4"/>',
};
const icon = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

$('#btn-undo').innerHTML = icon('undo');
$('#btn-redo').innerHTML = icon('redo');
$('#btn-menu').innerHTML = icon('more');
document.querySelectorAll('.hud-br [data-view]').forEach(b => {
  const map = { grid: 'grid', dims: 'ruler', out: 'zoomout', in: 'zoomin' };
  if (b.id === 'zoomlabel') return;
  b.innerHTML = icon(map[b.dataset.view] || 'fit');
});

let rafId = 0;
function requestRender() { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; render(); }); }
function render() {
  const W = stage.clientWidth, H = stage.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  scene.innerHTML = renderScene(view, W, H);
  RV = view; UK = 1;
  updateHud();
}

function updateHud() {
  const s = view.scale;
  let L = 0.1;
  for (const v of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]) if (v * s <= 130) L = v;
  $('#scalebar i').style.width = Math.round(L * s) + 'px';
  $('#scalebar span').textContent = L < 1 ? Math.round(L * 100) + ' cm' : L + ' m';
  $('#zoomlabel').textContent = Math.round(s / 80 * 100) + '%';
  $('[data-view="grid"]').classList.toggle('on', ui.grid);
  $('[data-view="dims"]').classList.toggle('on', ui.allDims);
  updateHint(); updateModebar();
}

let lastHint = '';
function updateHint() {
  const k = s => `<kbd>${s}</kbd>`, parts = (...p) => p.map(x => `<span>${x}</span>`).join('');
  let h;
  if (mode === 'draw') h = parts('Clic para añadir vértices', `Escribe una medida y ${k('Enter')} fija el tramo`, `${k('Enter')} cierra`, `${k('Esc')} cancela`);
  else if (mode === 'place') h = parts(`Haz clic sobre un muro para colocar la ${ui.placeType === 'door' ? 'puerta' : 'ventana'}`, `${k('Esc')} cancela`);
  else if (drag && drag.blocked) h = parts('Un muro lo bloquea: sigue arrastrando para pasarlo al otro lado', `${k('Alt')} ignora colisiones`);
  else if (sel && sel.kind === 'furniture') h = parts('Arrastra para mover', 'Asa superior para rotar', `${k('R')} gira 90°`, `${k('Supr')} elimina`);
  else if (sel && sel.kind === 'room') h = parts('Arrastra para mover y encajar con otras', 'Vértices y asas de muro cambian la forma', `${k('Supr')} elimina`);
  else if (sel && sel.kind === 'opening') h = parts('Arrastra a lo largo de cualquier muro', `${k('Supr')} elimina`);
  else if (sel && sel.kind === 'bg') h = parts('Arrastra para mover', 'Asa de la esquina para escalar', `${k('Supr')} elimina`);
  else if (sel) h = parts('Arrastra para mover', `${k('Supr')} elimina`);
  else h = parts(`${k('Rueda')} zoom`, `Arrastra el fondo o ${k('Espacio')} para mover la vista`, `${k('F')} encuadra`);
  if (h !== lastHint) { hintEl.innerHTML = h; lastHint = h; }
}
function updateModebar() {
  const mb = $('#modebar');
  if (mode === 'select') { mb.hidden = true; return; }
  const txt = mode === 'draw' ? 'Dibujando habitación' : ui.placeType === 'door' ? 'Colocando puerta' : 'Colocando ventana';
  const html = `<span>${txt}</span>${mode === 'draw' ? '<button data-mb="finish" class="primary">Cerrar forma</button>' : ''}<button data-mb="cancel">Cancelar</button>`;
  if (mb.dataset.html !== html) { mb.innerHTML = html; mb.dataset.html = html; }
  mb.hidden = false;
}

let toastTimer = 0;
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('err', !!err); t.classList.toggle('below', mode !== 'select');
  t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ════════════════════════ Vista ════════════════════════ */
const toWorld = p => ({ x: (p.x - view.ox) / view.scale, y: (p.y - view.oy) / view.scale });
const viewCenter = () => ({ x: stage.clientWidth / 2, y: stage.clientHeight / 2 });
function zoomAt(sp, factor) {
  const s = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE), wx = (sp.x - view.ox) / view.scale, wy = (sp.y - view.oy) / view.scale;
  view.scale = s; view.ox = sp.x - wx * s; view.oy = sp.y - wy * s;
  requestRender();
}
function fitTarget(b = docBounds()) {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (!b) return { scale: 80, ox: W / 2, oy: H / 2 };
  const pad = Math.min(90, W * 0.1);
  const s = clamp(Math.min((W - pad * 2) / Math.max(0.5, b.maxX - b.minX), (H - pad * 2) / Math.max(0.5, b.maxY - b.minY)), MIN_SCALE, 160);
  return { scale: s, ox: W / 2 - (b.minX + b.maxX) / 2 * s, oy: H / 2 - (b.minY + b.maxY) / 2 * s };
}
let animId = 0;
function animateView(t) {
  cancelAnimationFrame(animId);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(view, t); requestRender(); return; }
  const from = { ...view }, start = performance.now(), dur = 300;
  const step = now => {
    const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
    view.scale = from.scale + (t.scale - from.scale) * e; view.ox = from.ox + (t.ox - from.ox) * e; view.oy = from.oy + (t.oy - from.oy) * e;
    render();
    if (k < 1) animId = requestAnimationFrame(step);
  };
  animId = requestAnimationFrame(step);
}
function ensureVisible(b) {
  const W = stage.clientWidth, H = stage.clientHeight, m = 30;
  const inView = SXv(b.minX) > m && SXv(b.maxX) < W - m && SYv(b.minY) > m && SYv(b.maxY) < H - m;
  if (!inView) animateView(fitTarget());
}
const SXv = x => x * view.scale + view.ox, SYv = y => y * view.scale + view.oy;
function setCursor() {
  svg.classList.toggle('c-grabbing', !!(drag && drag.type === 'pan' && (drag.moved || spaceDown)));
  svg.classList.toggle('c-grab', spaceDown && !(drag && drag.type === 'pan'));
  svg.classList.toggle('c-cross', !spaceDown && (mode === 'draw' || mode === 'place'));
}

/* ════════════════════════ Selección y modos ════════════════════════ */
function select(kind, id) {
  const same = kind ? isSel(kind, id) : !sel;
  sel = kind ? { kind, id } : null;
  if (kind === 'furniture') ui.tab = 'decor';
  else if (kind) ui.tab = 'structure';
  if (!same) { ui.hoverEdge = null; ui.hoverOpening = null; renderPanel(); }
  requestRender();
}
function setMode(m, o = {}) {
  mode = m;
  ui.placeType = m === 'place' ? o.type : null;
  ui.placePreview = null;
  draw = m === 'draw' ? { points: [], cursor: null, typed: '', closing: false, guides: null } : null;
  setCursor(); renderPanel(); requestRender();
}
function startTool(t) {
  if (t === 'door' || t === 'window') {
    if (!doc.rooms.length) { toast('Primero crea una habitación: las puertas y ventanas van sobre sus muros', true); return; }
    setMode(mode === 'place' && ui.placeType === t ? 'select' : 'place', { type: t });
    return;
  }
  if (mode !== 'select') setMode('select');
  const c = toWorld(viewCenter());
  if (t === 'column') {
    const col = { id: uid('c'), shape: 'rect', x: r3(snap(c.x, 0.05)), y: r3(snap(c.y, 0.05)), w: 0.3, h: 0.3 };
    doc.columns.push(col); select('column', col.id); commit();
  } else if (t === 'label') {
    const l = { id: uid('l'), text: 'Etiqueta', x: r3(c.x), y: r3(c.y), size: 'm' };
    doc.labels.push(l); select('label', l.id); commit(); focusName();
  }
}
function focusName() {
  setTimeout(() => { const i = panel.querySelector('[data-field="room.name"],[data-field="f.name"],[data-field="label.text"]'); if (i) { i.focus(); i.select(); } }, 0);
}

/* ════════════════════════ Acciones ════════════════════════ */
function newRoomPoints() {
  const nr = ui.newRoom;
  if (nr.shape === 'L') {
    const cw = Math.min(nr.cw, nr.w - 0.3), ch = Math.min(nr.ch, nr.h - 0.3);
    return [{ x: 0, y: 0 }, { x: nr.w - cw, y: 0 }, { x: nr.w - cw, y: ch }, { x: nr.w, y: ch }, { x: nr.w, y: nr.h }, { x: 0, y: nr.h }];
  }
  if (nr.shape === 'poly') {
    const N = nr.sides, R = nr.side / (2 * Math.sin(Math.PI / N)), pts = [];
    for (let i = 0; i < N; i++) { const a = -Math.PI / 2 - Math.PI / N + i * 2 * Math.PI / N; pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) }); }
    return pts;
  }
  return rect(0, 0, nr.w, nr.h);
}
function createRoomFromPanel() {
  if (ui.newRoom.shape === 'draw') { setMode('draw'); return; }
  let pts = newRoomPoints();
  const b = bboxOf(pts), all = roomsBounds();
  const dx = all ? all.maxX + 1 - b.minX : -b.minX, dy = all ? all.minY - b.minY : -b.minY;
  pts = pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
  const r = makeRoom(pts, { t: ui.newRoom.t });
  doc.rooms.push(r);
  select('room', r.id); commit();
  ensureVisible(roomGeom(r).bbox);
}
function addFurniture(pr, at) {
  const G = buildGeom();
  const f = { id: uid('f'), name: pr.name, shape: pr.shape, x: 0, y: 0, w: pr.w, h: pr.h, rot: 0, color: pr.color };
  let pos = at;
  if (!pos) {
    const vc = toWorld(viewCenter());
    pos = vc;
    if (doc.rooms.length && !doc.rooms.some(r => pointInPoly(vc, r.points))) {
      let bd = Infinity;
      for (const r of doc.rooms) { const c = visualCenter(r.points), d = V.dist(c, vc); if (d < bd) { bd = d; pos = c; } }
    }
  }
  const spot = findSpot(f, pos.x, pos.y, 0, G, 3, true) || pos;
  f.x = spot.x; f.y = spot.y;
  doc.furniture.push(f);
  return f;
}
function applyFurn(o, nx) {
  const G = buildGeom();
  if (!hitsSolid(itemShape(nx), G) || hitsSolid(itemShape(o), G)) { Object.assign(o, nx); return true; }
  const spot = findSpot(nx, nx.x, nx.y, nx.rot, G, 0.8, false);
  if (spot) { Object.assign(o, nx, { x: spot.x, y: spot.y }); return true; }
  toast('No cabe: chocaría con un muro. Sepáralo de la pared y vuelve a intentarlo.', true);
  return false;
}
function setBgFromFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 15 * 1024 * 1024) { reject(new Error('La imagen es demasiado grande (máx. 15 MB)')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.onload = () => {
        const ar = (img.naturalWidth / img.naturalHeight) || 1;
        const c = toWorld(viewCenter());
        const w = r3(clamp(Math.min(10, (stage.clientWidth * 0.6) / view.scale), 1, 60));
        const h = r3(w / ar);
        doc.bg = { src, x: r3(c.x), y: r3(c.y), w, h, rot: 0, opacity: 0.6, locked: false, visible: true, ar };
        select('bg', 'bg'); commit();
        animateView(fitTarget({ minX: c.x - w / 2, minY: c.y - h / 2, maxX: c.x + w / 2, maxY: c.y + h / 2 }));
        resolve();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
function deleteSel() {
  if (!sel) return;
  if (sel.kind === 'bg') { doc.bg = null; sel = null; commit(); renderPanel(); requestRender(); toast('Imagen eliminada. Ctrl+Z para deshacer'); return; }
  const { kind, id } = sel, coll = COLL[kind];
  doc[coll] = doc[coll].filter(o => o.id !== id);
  if (kind === 'room') doc.openings = doc.openings.filter(o => o.roomId !== id);
  const names = { room: 'Habitación eliminada', opening: 'Abertura eliminada', furniture: 'Mueble eliminado', column: 'Columna eliminada', label: 'Etiqueta eliminada' };
  sel = null; commit(); renderPanel(); requestRender();
  toast(`${names[kind]}. Ctrl+Z para deshacer`);
}
function duplicateSel() {
  const o = selObj(); if (!o) return;
  const k = sel.kind;
  if (k === 'bg') return;
  if (k === 'furniture') {
    const c = { ...clone(o), id: uid('f') };
    const spot = findSpot(c, o.x + 0.3, o.y + 0.3, c.rot, buildGeom(), 2.5, true) || { x: o.x + 0.3, y: o.y + 0.3 };
    Object.assign(c, spot); doc.furniture.push(c); select('furniture', c.id);
  } else if (k === 'column' || k === 'label') {
    const c = { ...clone(o), id: uid(k[0]), x: r3(o.x + 0.4), y: r3(o.y + 0.4) };
    doc[COLL[k]].push(c); select(k, c.id);
  } else if (k === 'room') {
    const b = roomGeom(o).bbox, all = roomsBounds(), dx = all.maxX - b.minX + 0.8;
    const c = { ...clone(o), id: uid('r'), name: o.name + ' (copia)', points: o.points.map(p => ({ x: r3(p.x + dx), y: p.y })) };
    doc.rooms.push(c);
    doc.openings.filter(op => op.roomId === o.id).forEach(op => doc.openings.push({ ...clone(op), id: uid('o'), roomId: c.id }));
    select('room', c.id); ensureVisible(roomGeom(c).bbox);
  } else if (k === 'opening') {
    const r = find('room', o.roomId), e = r && roomGeom(r).edges[o.edge], off = o.offset + o.width + 0.2;
    if (!e || off + o.width > e.len) { toast('No hay sitio en este muro para otra igual', true); return; }
    const c = { ...clone(o), id: uid('o'), offset: r3(off) };
    doc.openings.push(c); select('opening', c.id);
  }
  commit();
}
function rotateSel(deg) {
  const o = selObj(); if (!o) return;
  if (sel.kind === 'furniture') { if (o.shape === 'circle') return; if (applyFurn(o, { ...o, rot: norm360(Math.round(((o.rot || 0) + deg) * 10) / 10) })) commit(); }
  else if (sel.kind === 'room') { rotateRoom(o, deg); commit(); }
  else if (sel.kind === 'column') { [o.w, o.h] = [o.h, o.w]; commit(); }
  else if (sel.kind === 'bg') { o.rot = norm360(Math.round(((o.rot || 0) + deg) * 10) / 10); commit(); }
  else return;
  renderPanel(); requestRender();
}
function nudge(dx, dy) {
  const o = selObj(); if (!o) return;
  switch (sel.kind) {
    case 'furniture': moveFurniture(o, { x: o.x + dx, y: o.y + dy }, buildGeom(), false); break;
    case 'column': case 'label': case 'bg': o.x = r3(o.x + dx); o.y = r3(o.y + dy); break;
    case 'room': {
      const ins = itemsInside(o);
      o.points = o.points.map(p => ({ x: r3(p.x + dx), y: r3(p.y + dy) }));
      [...ins.furniture, ...ins.columns, ...ins.labels].forEach(it => { it.x += dx; it.y += dy; });
      break;
    }
    case 'opening': {
      const r = find('room', o.roomId), e = r && roomGeom(r).edges[o.edge]; if (!e) break;
      const along = dx * e.d.x + dy * e.d.y;
      if (Math.abs(along) > 1e-9) o.offset = r3(clamp(o.offset + Math.sign(along) * Math.hypot(dx, dy), 0, Math.max(0, e.len - Math.min(o.width, e.len))));
      break;
    }
  }
  syncInspector(); requestRender(); commitSoon();
}

/* ════════════════════════ Dibujo a mano y colocación de aberturas ════════════════════════ */
function snapTargets(excludeId) {
  const x = [], y = [];
  for (const r of doc.rooms) {
    if (r.id === excludeId) continue;
    const g = roomGeom(r);
    for (const p of g.P.concat(g.outer)) { x.push(p.x); y.push(p.y); }
  }
  return { x: uniq(x), y: uniq(y) };
}
function updateDrawCursor(w) {
  const pts = draw.points, th = 9 / view.scale;
  let p = { x: snap(w.x, 0.05), y: snap(w.y, 0.05) };
  draw.closing = false; draw.guides = null;
  const t = snapTargets(null);
  pts.forEach(q => { t.x.push(q.x); t.y.push(q.y); });
  let gx = nearestVal(t.x, w.x, th), gy = nearestVal(t.y, w.y, th);
  if (pts.length) {
    const last = pts[pts.length - 1], v = V.sub(w, last), L = V.len(v);
    if (L > 0.02) {
      const ang = Math.atan2(v.y, v.x) * 180 / Math.PI, sa = Math.round(ang / 45) * 45;
      if (Math.abs(ang - sa) < 7) {
        const rad = sa * Math.PI / 180, dir = { x: Math.round(Math.cos(rad) * 1e9) / 1e9, y: Math.round(Math.sin(rad) * 1e9) / 1e9 };
        let len = snap(L, 0.05), guide = null;
        if (dir.y === 0 && gx != null && (gx - last.x) * dir.x > 0) { len = Math.abs(gx - last.x); guide = { x: gx, y: null }; }
        else if (dir.x === 0 && gy != null && (gy - last.y) * dir.y > 0) { len = Math.abs(gy - last.y); guide = { x: null, y: gy }; }
        p = V.add(last, V.mul(dir, len));
        draw.guides = guide; gx = gy = null;
      }
    }
    if (pts.length >= 3 && V.dist(w, pts[0]) * view.scale < 14) { p = { ...pts[0] }; draw.closing = true; gx = gy = null; draw.guides = null; }
  }
  if (gx != null) p.x = gx;
  if (gy != null) p.y = gy;
  if (gx != null || gy != null) draw.guides = { x: gx, y: gy };
  draw.cursor = { x: r3(p.x), y: r3(p.y) };
}
function drawClick(w) {
  updateDrawCursor(w);
  const p = draw.cursor;
  if (draw.closing) { finishDraw(); return; }
  const last = draw.points[draw.points.length - 1];
  if (last && V.dist(last, p) < 0.05) return;
  draw.points.push(p); draw.typed = '';
}
function typedSegment() {
  const L = parseNum(draw.typed); draw.typed = '';
  const pts = draw.points; if (!pts.length || !(L >= 0.05)) return;
  const last = pts[pts.length - 1];
  let dir = draw.cursor ? V.sub(draw.cursor, last) : { x: 1, y: 0 };
  dir = V.len(dir) < 1e-6 ? { x: 1, y: 0 } : V.norm(dir);
  const p = V.add(last, V.mul(dir, L));
  pts.push({ x: r3(p.x), y: r3(p.y) });
  updateDrawCursor(lastPointerWorld);
}
function finishDraw() {
  if (!draw) return;
  const pts = draw.points;
  if (pts.length < 3) { toast('Añade al menos 3 vértices para cerrar la habitación', true); return; }
  if (!isSimplePolygon(pts)) { toast('La forma se cruza consigo misma. Mueve o borra el último vértice.', true); return; }
  const r = makeRoom(pts);
  doc.rooms.push(r);
  setMode('select'); select('room', r.id); commit();
}
function drawKey(e) {
  if (e.key === 'Escape') { setMode('select'); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (draw.typed) typedSegment(); else finishDraw(); requestRender(); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (draw.typed) draw.typed = draw.typed.slice(0, -1); else draw.points.pop(); requestRender(); return; }
  if (/^[0-9]$/.test(e.key) || e.key === ',' || e.key === '.') { if (draw.points.length) { draw.typed += e.key === '.' ? ',' : e.key; requestRender(); } }
}
function nearestEdge(w, G, maxD, minLen) {
  let best = null;
  for (const g of G.rooms) for (const e of g.edges) {
    if (e.len < minLen) continue;
    const off = V.dot(V.sub(w, e.a), e.n);
    if (off < -maxD || off > e.t + maxD) continue;
    const pr = projSeg(w, e.a, e.b);
    if (pr.d <= maxD + e.t && (!best || pr.d < best.d)) best = { d: pr.d, roomId: g.id, edge: e.i, e, along: pr.t * e.len };
  }
  return best;
}
function updatePlacePreview(w) {
  const G = buildGeom(), def = openingDefaults(ui.placeType);
  const ne = nearestEdge(w, G, Math.max(0.5, 40 / view.scale), 0.3);
  if (!ne) { ui.placePreview = null; return; }
  const ew = Math.min(def.width, ne.e.len);
  ui.placePreview = { ...def, id: '_preview', roomId: ne.roomId, edge: ne.edge, width: ew, offset: r3(clamp(snap(ne.along - ew / 2, 0.05), 0, ne.e.len - ew)) };
}
function placeOpening(w) {
  updatePlacePreview(w);
  const p = ui.placePreview;
  if (!p) { toast('Haz clic encima de un muro para colocarla', true); return; }
  const op = { ...p, id: uid('o') };
  doc.openings.push(op);
  setMode('select'); select('opening', op.id); commit();
}

/* ════════════════════════ Puntero en el lienzo ════════════════════════ */
const pointers = new Map();
let pinch = null, lastTap = { t: 0, key: '', x: 0, y: 0 };
const screenPt = e => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

function rotTargets(f) {
  const t = [0, 45, 90, 135, 180, 225, 270, 315];
  const room = doc.rooms.find(r => pointInPoly(f, r.points));
  if (room) for (const e of roomGeom(room).edges) {
    const a = Math.atan2(e.d.y, e.d.x) * 180 / Math.PI;
    for (let k = 0; k < 4; k++) { const v = norm360(a + k * 90); if (!t.some(x => angDiff(x, v) < 0.5)) t.push(Math.round(v * 10) / 10); }
  }
  return t;
}
function startRoomDrag(id, base) {
  const r = find('room', id); if (!r) return;
  const g = roomGeom(r), src = { x: [], y: [] };
  for (const p of g.P.concat(g.outer)) { src.x.push(p.x); src.y.push(p.y); }
  const ins = itemsInside(r);
  drag = { ...base, type: 'room', id, pts0: clone(r.points), src: { x: uniq(src.x), y: uniq(src.y) }, tgt: snapTargets(id),
    items: [...ins.furniture, ...ins.columns, ...ins.labels].map(it => ({ it, x: it.x, y: it.y })) };
}
function startEdgeDrag(id, i, base) {
  const r = find('room', id); if (!r) return;
  const e = roomGeom(r).edges[i]; if (!e) return;
  const ax = Math.abs(e.n.x) > 0.999 ? 'x' : Math.abs(e.n.y) > 0.999 ? 'y' : null;
  let targets = [];
  if (ax) {
    const sgn = Math.sign(e.n[ax]), other = snapTargets(id)[ax];
    targets = other.concat(other.map(v => v - e.t * sgn));
    r.points.forEach((p, k) => { if (k !== i && k !== (i + 1) % r.points.length) targets.push(p[ax]); });
  }
  drag = { ...base, type: 'edge', id, index: i, pts0: clone(r.points), n: e.n, ax, targets: uniq(targets) };
  ui.hoverEdge = { roomId: id, edge: i };
}

svg.addEventListener('pointerdown', e => {
  hideMenu();
  const ae = document.activeElement;
  if (ae && panel.contains(ae) && ae.blur) ae.blur();
  const sp = screenPt(e);
  pointers.set(e.pointerId, sp);
  try { svg.setPointerCapture(e.pointerId); } catch (_) { /* no soportado */ }
  if (pointers.size === 2) { startPinch(); return; }
  if (pointers.size > 2) return;
  const w = toWorld(sp);
  lastPointerWorld = w;
  const el = e.target.closest ? e.target.closest('[data-kind]') : null;
  const kind = el ? el.dataset.kind : 'bg', id = el ? el.dataset.id : null;
  const now = performance.now(), key = kind + ':' + id;
  const dbl = now - lastTap.t < 320 && lastTap.key === key && Math.hypot(sp.x - lastTap.x, sp.y - lastTap.y) < 8;
  lastTap = { t: dbl ? 0 : now, key, x: sp.x, y: sp.y };

  if (e.button === 1 || e.button === 2 || spaceDown) { e.preventDefault(); drag = { type: 'pan', sp0: sp, ox0: view.ox, oy0: view.oy, moved: false }; setCursor(); return; }
  if (e.button !== 0) return;
  if (mode === 'draw') { if (dbl) finishDraw(); else drawClick(w); requestRender(); return; }
  if (mode === 'place') { placeOpening(w); return; }

  const base = { sp0: sp, w0: w, moved: false };
  switch (kind) {
    case 'rotate': {
      const f = find('furniture', id); if (!f) break;
      drag = { ...base, type: 'rotate', id, x0: f.x, y0: f.y, G: buildGeom(), targets: rotTargets(f), lastFree: { x: f.x, y: f.y, rot: f.rot || 0 }, snapAngle: null };
      break;
    }
    case 'resize': {
      const f = find('furniture', id); if (!f) break;
      drag = { ...base, type: 'resize', id, h: el.dataset.h, f0: { x: f.x, y: f.y, w: f.w, h: f.h, rot: f.rot || 0 }, G: buildGeom(), lastFree: { x: f.x, y: f.y, w: f.w, h: f.h } };
      break;
    }
    case 'vertex': {
      const r = find('room', id); if (!r) break;
      const index = +el.dataset.index, t = snapTargets(id);
      r.points.forEach((p, i) => { if (i !== index) { t.x.push(p.x); t.y.push(p.y); } });
      drag = { ...base, type: 'vertex', id, index, pts0: clone(r.points), tx: t.x, ty: t.y };
      break;
    }
    case 'edge': startEdgeDrag(id, +el.dataset.edge, base); break;
    case 'furniture': {
      select('furniture', id);
      const f = find('furniture', id); if (!f) break;
      if (dbl) focusName();
      drag = { ...base, type: 'furniture', id, grab: V.sub(w, f), G: buildGeom(), lastFree: { x: f.x, y: f.y } };
      break;
    }
    case 'column': {
      select('column', id);
      const c = find('column', id); if (!c) break;
      const t = snapTargets(null);
      drag = { ...base, type: 'column', id, grab: V.sub(w, c), tx: t.x, ty: t.y };
      break;
    }
    case 'opening': select('opening', id); drag = { ...base, type: 'opening', id, G: buildGeom() }; break;
    case 'bgimg': {
      if (isSel('bg', 'bg')) {
        const bg = doc.bg; if (!bg) break;
        drag = { ...base, type: 'bg', grab: V.sub(w, { x: bg.x, y: bg.y }) };
      } else {
        drag = { ...base, type: 'pan', ox0: view.ox, oy0: view.oy, pending: { kind: 'bg' } };
      }
      break;
    }
    case 'bgresize': {
      const bg = doc.bg; if (!bg) break;
      drag = { ...base, type: 'bgresize', c0: { x: bg.x, y: bg.y }, w0: bg.w, h0: bg.h, rot: bg.rot || 0 };
      break;
    }
    case 'label': {
      select('label', id);
      const l = find('label', id); if (!l) break;
      if (dbl) focusName();
      drag = { ...base, type: 'label', id, grab: V.sub(w, l) };
      break;
    }
    case 'roomlabel': {
      select('room', id);
      const r = find('room', id); if (!r) break;
      if (dbl) focusName();
      const vc = visualCenter(r.points), cur = V.add(vc, r.labelOffset || { x: 0, y: 0 });
      drag = { ...base, type: 'roomlabel', id, grab: V.sub(w, cur), vc };
      break;
    }
    case 'wall': case 'room': {
      if (isSel('room', id)) {
        if (dbl && kind === 'room') focusName();
        if (kind === 'wall') startEdgeDrag(id, +el.dataset.edge, base); else startRoomDrag(id, base);
      } else drag = { ...base, type: 'pan', ox0: view.ox, oy0: view.oy, pending: { kind: 'room', id, edge: kind === 'wall' ? +el.dataset.edge : null } };
      break;
    }
    default: drag = { ...base, type: 'pan', ox0: view.ox, oy0: view.oy, pending: { kind: 'none' } };
  }
  setCursor(); requestRender();
});

svg.addEventListener('pointermove', e => {
  const sp = screenPt(e);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sp);
  if (pinch) { updatePinch(); return; }
  const w = toWorld(sp);
  lastPointerWorld = w;
  if (!drag) {
    if (mode === 'draw') { updateDrawCursor(w); requestRender(); }
    else if (mode === 'place') { updatePlacePreview(w); requestRender(); }
    return;
  }
  if (!drag.moved) { if (Math.hypot(sp.x - drag.sp0.x, sp.y - drag.sp0.y) < 3) return; drag.moved = true; setCursor(); }
  onDrag(drag, sp, w, e);
  requestRender();
});

function onDrag(d, sp, w, e) {
  const th = 9 / view.scale;
  switch (d.type) {
    case 'pan': view.ox = d.ox0 + sp.x - d.sp0.x; view.oy = d.oy0 + sp.y - d.sp0.y; break;
    case 'room': {
      const r = find('room', d.id); if (!r) break;
      const raw = V.sub(w, d.w0), ref = d.pts0[0];
      let dx = snap(ref.x + raw.x, 0.05) - ref.x, dy = snap(ref.y + raw.y, 0.05) - ref.y;
      const bx = bestSnap(d.src.x, d.tgt.x, raw.x, th), by = bestSnap(d.src.y, d.tgt.y, raw.y, th);
      if (bx) dx = bx.delta;
      if (by) dy = by.delta;
      d.guides = { x: bx ? bx.v : null, y: by ? by.v : null };
      r.points = d.pts0.map(p => ({ x: r3(p.x + dx), y: r3(p.y + dy) }));
      for (const o of d.items) { o.it.x = o.x + dx; o.it.y = o.y + dy; }
      break;
    }
    case 'vertex': {
      const r = find('room', d.id); if (!r) break;
      const p = { x: snap(w.x, 0.05), y: snap(w.y, 0.05) };
      const gx = nearestVal(d.tx, w.x, th), gy = nearestVal(d.ty, w.y, th);
      if (gx != null) p.x = gx;
      if (gy != null) p.y = gy;
      const pts = d.pts0.map(q => ({ ...q }));
      pts[d.index] = { x: r3(p.x), y: r3(p.y) };
      if (isSimplePolygon(pts)) r.points = pts;
      d.guides = { x: gx, y: gy };
      syncInspector();
      break;
    }
    case 'edge': {
      const r = find('room', d.id); if (!r) break;
      const i = d.index, j = (i + 1) % d.pts0.length, rawDist = V.dot(V.sub(w, d.w0), d.n);
      let dist;
      d.guides = null;
      if (d.ax) {
        const sgn = Math.sign(d.n[d.ax]), base = d.pts0[i][d.ax], rawC = base + rawDist * sgn;
        let c = snap(rawC, 0.05);
        const t = nearestVal(d.targets, rawC, th);
        if (t != null) { c = t; d.guides = d.ax === 'x' ? { x: t, y: null } : { x: null, y: t }; }
        dist = (c - base) * sgn;
      } else dist = snap(rawDist, 0.01);
      const pts = d.pts0.map(q => ({ ...q }));
      pts[i] = { x: r3(pts[i].x + d.n.x * dist), y: r3(pts[i].y + d.n.y * dist) };
      pts[j] = { x: r3(pts[j].x + d.n.x * dist), y: r3(pts[j].y + d.n.y * dist) };
      if (isSimplePolygon(pts)) r.points = pts;
      syncInspector();
      break;
    }
    case 'furniture': {
      const f = find('furniture', d.id); if (!f) break;
      d.blocked = moveFurniture(f, V.sub(w, d.grab), d.G, e.altKey) === 'blocked';
      const sh = itemShape(f);
      if (!hitsSolid(sh, d.G) && zoneHits(sh, d.G).size === 0) d.lastFree = { x: f.x, y: f.y };
      break;
    }
    case 'rotate': {
      const f = find('furniture', d.id); if (!f) break;
      let a = norm360(Math.atan2(w.y - d.y0, w.x - d.x0) * 180 / Math.PI + 90);
      d.snapAngle = null;
      if (e.shiftKey) { a = norm360(Math.round(a / 15) * 15); d.snapAngle = a; }
      else {
        let best = 4.5;
        for (const t of d.targets) { const df = angDiff(a, t); if (df < best) { best = df; d.snapAngle = t; } }
        a = d.snapAngle != null ? d.snapAngle : Math.round(a);
      }
      a = norm360(a);
      if (e.altKey || !solidAt(f, d.x0, d.y0, a, d.G)) { f.rot = a; f.x = d.x0; f.y = d.y0; d.blocked = false; }
      else {
        const spot = findSpot({ ...f, rot: a }, d.x0, d.y0, a, d.G, 0.4, false);
        if (spot) { f.rot = a; f.x = spot.x; f.y = spot.y; d.blocked = false; } else d.blocked = true;
      }
      const sh = itemShape(f);
      if (!hitsSolid(sh, d.G) && zoneHits(sh, d.G).size === 0) d.lastFree = { x: f.x, y: f.y, rot: f.rot };
      syncInspector();
      break;
    }
    case 'resize': {
      const f = find('furniture', d.id); if (!f) break;
      const f0 = d.f0, c0 = { x: f0.x, y: f0.y }, lp = V.rot(V.sub(w, c0), -f0.rot);
      let nw = f0.w, nh = f0.h, cx = 0, cy = 0;
      if (d.h === 'r') nw = nh = clamp(snap(2 * V.len(V.sub(w, c0)), 0.01), 0.1, 30);
      else if (d.h === 'e') { nw = clamp(snap(lp.x + f0.w / 2, 0.01), 0.1, 30); cx = (nw - f0.w) / 2; }
      else if (d.h === 'w') { nw = clamp(snap(f0.w / 2 - lp.x, 0.01), 0.1, 30); cx = -(nw - f0.w) / 2; }
      else if (d.h === 's') { nh = clamp(snap(lp.y + f0.h / 2, 0.01), 0.1, 30); cy = (nh - f0.h) / 2; }
      else if (d.h === 'n') { nh = clamp(snap(f0.h / 2 - lp.y, 0.01), 0.1, 30); cy = -(nh - f0.h) / 2; }
      const c = V.add(c0, V.rot({ x: cx, y: cy }, f0.rot));
      if (e.altKey || !hitsSolid(itemShape(f, c.x, c.y, f0.rot, nw, nh), d.G)) { f.w = r3(nw); f.h = r3(nh); f.x = c.x; f.y = c.y; d.blocked = false; }
      else d.blocked = true;
      const sh = itemShape(f);
      if (!hitsSolid(sh, d.G) && zoneHits(sh, d.G).size === 0) d.lastFree = { x: f.x, y: f.y, w: f.w, h: f.h };
      syncInspector();
      break;
    }
    case 'opening': {
      const op = find('opening', d.id); if (!op) break;
      const ne = nearestEdge(w, d.G, Math.max(0.5, 36 / view.scale), 0.3);
      if (ne) {
        const ew = Math.min(op.width, ne.e.len), center = (ne.e.len - ew) / 2;
        let off = clamp(snap(ne.along - ew / 2, 0.05), 0, ne.e.len - ew);
        if (Math.abs(ne.along - ew / 2 - center) < 10 / view.scale) off = center;
        op.roomId = ne.roomId; op.edge = ne.edge; op.offset = r3(off);
        syncInspector();
      }
      break;
    }
    case 'column': {
      const c = find('column', d.id); if (!c) break;
      const raw = V.sub(w, d.grab), hw = c.w / 2, hh = (c.shape === 'circle' ? c.w : c.h) / 2;
      const bx = bestSnap([-hw, 0, hw], d.tx, raw.x, th), by = bestSnap([-hh, 0, hh], d.ty, raw.y, th);
      c.x = r3(bx ? bx.delta : snap(raw.x, 0.01)); c.y = r3(by ? by.delta : snap(raw.y, 0.01));
      d.guides = { x: bx ? bx.v : null, y: by ? by.v : null };
      break;
    }
    case 'label': { const l = find('label', d.id); if (l) { l.x = r3(w.x - d.grab.x); l.y = r3(w.y - d.grab.y); } break; }
    case 'roomlabel': { const r = find('room', d.id); if (r) r.labelOffset = { x: r3(w.x - d.grab.x - d.vc.x), y: r3(w.y - d.grab.y - d.vc.y) }; break; }
    case 'bg': {
      const bg = doc.bg; if (!bg) break;
      const p = V.sub(w, d.grab);
      bg.x = r3(p.x); bg.y = r3(p.y);
      break;
    }
    case 'bgresize': {
      const bg = doc.bg; if (!bg) break;
      const anchorLocal = { x: -d.w0 / 2, y: -d.h0 / 2 };
      const aw = V.add(d.c0, V.rot(anchorLocal, d.rot));
      const lp = V.rot(V.sub(w, aw), -d.rot);
      const rawW = Math.max(0.05, lp.x), rawH = Math.max(0.05, lp.y);
      const scale = clamp(V.len({ x: rawW, y: rawH }) / V.len({ x: d.w0, y: d.h0 }), 0.05, 100);
      const newW = r3(d.w0 * scale), newH = r3(d.h0 * scale);
      const c = V.add(aw, V.rot({ x: newW / 2, y: newH / 2 }, d.rot));
      bg.w = Math.max(0.05, newW); bg.h = Math.max(0.05, newH); bg.x = r3(c.x); bg.y = r3(c.y);
      break;
    }
  }
}

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; return; }
  const d = drag; if (!d) return;
  drag = null;
  if (d.type === 'pan') {
    if (!d.moved && d.pending) {
      if (d.pending.kind === 'room') { select('room', d.pending.id); if (d.pending.edge != null) flashWall(d.pending.edge); }
      else if (d.pending.kind === 'bg') { select('bg', 'bg'); }
      else if (sel) select(null);
    }
  } else if (d.type === 'furniture' || d.type === 'rotate' || d.type === 'resize') {
    const f = find('furniture', d.id);
    if (f && d.moved) {
      if (!ui.allowZones && d.lastFree && zoneHits(itemShape(f), d.G).size > 0) {
        Object.assign(f, d.lastFree);
        toast('Ahí no cabe: invade el espacio de apertura de una puerta o ventana', true);
      }
      commit();
    }
  } else if (d.moved) commit();
  if (d.type === 'edge') ui.hoverEdge = null;
  setCursor();
  if (d.moved || d.type !== 'pan') renderPanel();
  requestRender();
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', endPointer);
svg.addEventListener('contextmenu', e => e.preventDefault());
svg.addEventListener('wheel', e => {
  e.preventDefault();
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  zoomAt(screenPt(e), Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });

function startPinch() {
  drag = null;
  const [a, b] = [...pointers.values()];
  pinch = { d0: Math.max(10, V.dist(a, b)), m0: V.lerp(a, b, 0.5), s0: view.scale, ox0: view.ox, oy0: view.oy };
}
function updatePinch() {
  const [a, b] = [...pointers.values()]; if (!a || !b) return;
  const m = V.lerp(a, b, 0.5), s = clamp(pinch.s0 * V.dist(a, b) / pinch.d0, MIN_SCALE, MAX_SCALE);
  const wx = (pinch.m0.x - pinch.ox0) / pinch.s0, wy = (pinch.m0.y - pinch.oy0) / pinch.s0;
  view.scale = s; view.ox = m.x - wx * s; view.oy = m.y - wy * s;
  requestRender();
}
function flashWall(i) {
  if (!sel || sel.kind !== 'room') return;
  const row = panel.querySelector(`.wall-row[data-hover-edge="${i}"]`);
  if (row) { row.classList.add('hl'); row.scrollIntoView({ block: 'nearest' }); setTimeout(() => row.classList.remove('hl'), 1000); }
  ui.hoverEdge = { roomId: sel.id, edge: i }; requestRender();
  setTimeout(() => { if (ui.hoverEdge && ui.hoverEdge.edge === i && !drag) { ui.hoverEdge = null; requestRender(); } }, 1000);
}

/* ════════════════════════ Teclado ════════════════════════ */
window.addEventListener('keydown', e => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (typing) return;
  if (e.code === 'Space') { e.preventDefault(); if (!spaceDown) { spaceDown = true; setCursor(); } return; }
  if (mode === 'draw') { drawKey(e); return; }
  if (e.key === 'Escape') { hideMenu(); if (mode === 'place') setMode('select'); else if (sel) select(null); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicateSel(); return; }
  if (mod) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); deleteSel(); } return; }
  if (k === 'r') { rotateSel(e.shiftKey ? -90 : 90); return; }
  if (k === 'f') { animateView(fitTarget()); return; }
  if (k === '+' || k === '=') { zoomAt(viewCenter(), 1.2); return; }
  if (k === '-') { zoomAt(viewCenter(), 1 / 1.2); return; }
  const st = e.shiftKey ? 0.1 : 0.01;
  const arrows = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
  if (arrows[e.key] && sel) { e.preventDefault(); nudge(...arrows[e.key]); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; setCursor(); } });
window.addEventListener('blur', () => { spaceDown = false; setCursor(); });
