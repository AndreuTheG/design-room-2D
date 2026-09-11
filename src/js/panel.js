/* Planta · panel lateral: formularios, inspectores, biblioteca de muebles, menú de proyecto, exportación y arranque */
'use strict';
/* ════════════════════════ Panel: piezas de formulario ════════════════════════ */
function numInput(field, value, o = {}) {
  const unit = o.unit ?? 'm', d = o.d ?? 2;
  return `<span class="inp${unit ? '' : ' nounit'}"><input data-field="${field}"${o.idx != null ? ` data-idx="${o.idx}"` : ''} data-num="1" data-d="${d}" data-step="${o.step ?? 0.01}" value="${fmt(value, d)}" inputmode="decimal" autocomplete="off" spellcheck="false"${o.aria ? ` aria-label="${o.aria}"` : ''}>${unit ? `<em>${unit}</em>` : ''}</span>`;
}
const numField = (label, field, value, o = {}) => `<label class="field"><span>${label}</span>${numInput(field, value, o)}</label>`;
const textField = (label, field, value, o = {}) =>
  `<label class="field"><span>${label}</span><span class="inp nounit"><input data-field="${field}" data-live="1" value="${esc(value)}" maxlength="40" autocomplete="off" spellcheck="false"${o.placeholder ? ` placeholder="${o.placeholder}"` : ''}></span></label>`;
const labeled = (label, inner) => `<div class="field"><span>${label}</span>${inner}</div>`;
const segCtl = (field, options, value) =>
  `<div class="seg" role="group">${options.map(([v, l]) => `<button type="button" data-act="set" data-field="${field}" data-value="${v}" class="${String(v) === String(value) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function swatches(field, colors, value) {
  const cur = String(value).toLowerCase(), known = colors.some(c => c.toLowerCase() === cur);
  return `<div class="swatches">${colors.map(c => `<button type="button" class="sw${c.toLowerCase() === cur ? ' on' : ''}" style="background:${c}" data-act="set" data-field="${field}" data-value="${c}" aria-label="Color ${c}"></button>`).join('')}` +
    `<label class="sw sw-custom${known ? '' : ' on'}" title="Otro color"><input type="color" data-field="${field}" data-live="1" value="${esc(value)}"></label></div>`;
}
const toolBtn = (t, label) => `<button class="tool${mode === 'place' && ui.placeType === t ? ' on' : ''}" data-act="tool" data-tool="${t}">${icon(t === 'label' ? 'tag' : t, 22)}${label}</button>`;
const actionsRow = (o = {}) => `<section class="sec row-actions">${o.rotate ? `<button class="btn" data-act="rotate" data-deg="90">${icon('rotate')}Girar 90°</button>` : ''}<button class="btn" data-act="duplicate" title="Duplicar (Ctrl+D)">${icon('copy')}Duplicar</button><button class="btn danger" data-act="delete" title="Eliminar (Supr)" aria-label="Eliminar">${icon('trash')}</button></section>`;

function shapePreview(pts) {
  const b = bboxOf(pts), bw = Math.max(0.1, b.maxX - b.minX), bh = Math.max(0.1, b.maxY - b.minY);
  const s = Math.min(150 / bw, 76 / bh), W = bw * s + 12, H = bh * s + 12;
  const d = 'M' + pts.map(p => `${((p.x - b.minX) * s + 6).toFixed(1)},${((p.y - b.minY) * s + 6).toFixed(1)}`).join('L') + 'Z';
  return `<svg width="${W.toFixed(0)}" height="${H.toFixed(0)}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" aria-hidden="true"><path d="${d}" fill="${ROOM_COLORS[doc.rooms.length % ROOM_COLORS.length]}" fill-opacity=".6" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="miter"/></svg>`;
}
function presetGlyph(it) {
  const S = 26, m = Math.max(it.w, it.h), k = (S - 4) / m;
  const w = Math.max(3, it.w * k), h = Math.max(3, (it.shape === 'circle' ? it.w : it.h) * k), st = shade(it.color, -0.35);
  const inner = it.shape === 'circle'
    ? `<circle cx="${S / 2}" cy="${S / 2}" r="${(w / 2).toFixed(1)}" fill="${it.color}" stroke="${st}"/>`
    : `<rect x="${((S - w) / 2).toFixed(1)}" y="${((S - h) / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${it.color}" stroke="${st}"/>`;
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" aria-hidden="true">${inner}</svg>`;
}

/* ════════════════════════ Panel: vistas ════════════════════════ */
function bgHTML() {
  const bg = doc.bg;
  let h = `<section class="sec"><div class="sec-title">Imagen de fondo</div>`;
  if (!bg) {
    h += `<p class="note">Sube una foto o captura del plano de la promoción (PDF exportado a imagen, folleto, escaneo…) para dibujar las habitaciones y los muebles encima.</p>`;
    h += `<button class="btn block" data-act="bg-add">${icon('plus')}Subir imagen</button>`;
  } else {
    h += `<button class="list-row" data-act="select" data-kind="bg" data-id="bg"><i class="swatch-dot" style="background:#ccc"></i><span class="name">Imagen del plano</span><span class="val">${Math.round(bg.opacity * 100)}%</span></button>`;
    h += `<div class="grid2" style="margin-top:8px"><button class="btn" data-act="bg-toggle-visible">${bg.visible !== false ? 'Ocultar' : 'Mostrar'}</button><button class="btn" data-act="bg-toggle-lock">${bg.locked ? 'Desbloquear' : 'Bloquear'}</button></div>`;
  }
  return h + '</section>';
}
function structureHTML() {
  const nr = ui.newRoom, drawShape = nr.shape === 'draw';
  let h = bgHTML();
  h += `<section class="sec"><div class="sec-title">Nueva habitación</div>`;
  h += segCtl('newRoom.shape', [['rect', 'Rectángulo'], ['L', 'En L'], ['poly', 'Polígono'], ['draw', 'A mano']], nr.shape);
  if (!drawShape) {
    const pts = newRoomPoints();
    h += `<div class="prev-box">${shapePreview(pts)}<span>${fmt(polyArea(pts))} m²</span></div><div class="grid2">`;
    if (nr.shape === 'rect') h += numField('Ancho', 'newRoom.w', nr.w) + numField('Largo', 'newRoom.h', nr.h);
    if (nr.shape === 'L') h += numField('Ancho total', 'newRoom.w', nr.w) + numField('Largo total', 'newRoom.h', nr.h) + numField('Ancho del hueco', 'newRoom.cw', nr.cw) + numField('Largo del hueco', 'newRoom.ch', nr.ch);
    if (nr.shape === 'poly') h += numField('Número de lados', 'newRoom.sides', nr.sides, { unit: '', d: 0, step: 1 }) + numField('Longitud de lado', 'newRoom.side', nr.side);
    h += numField('Grosor de muro', 'newRoom.t', nr.t) + '</div>';
  } else {
    h += `<p class="note" style="margin:12px 0">Haz clic en el plano para colocar cada vértice. Los tramos se ajustan a 0°, 45° y 90° y a los muros existentes. Mientras dibujas, escribe una medida y pulsa Enter para fijar la longitud exacta.</p><div class="grid2">${numField('Grosor de muro', 'newRoom.t', nr.t)}</div>`;
  }
  h += `<button class="btn primary block" style="margin-top:14px" data-act="create-room">${icon(drawShape ? 'pencil' : 'plus')}${drawShape ? (mode === 'draw' ? 'Dibujando…' : 'Empezar a dibujar') : 'Crear habitación'}</button></section>`;
  h += `<section class="sec"><div class="sec-title">Añadir al plano</div><div class="tools">${toolBtn('door', 'Puerta')}${toolBtn('window', 'Ventana')}${toolBtn('column', 'Columna')}${toolBtn('label', 'Etiqueta')}</div></section>`;
  h += `<section class="sec"><div class="sec-title">Habitaciones <small>${doc.rooms.length || ''}</small></div>`;
  if (!doc.rooms.length) h += `<p class="note">Aún no hay ninguna. Crea la primera con las medidas de arriba o dibújala a mano.</p>`;
  else {
    h += `<div class="list">${doc.rooms.map(r => `<button class="list-row" data-act="select" data-kind="room" data-id="${r.id}"><i class="swatch-dot" style="background:${r.color}"></i><span class="name">${esc(r.name)}</span><span class="val">${fmt(polyArea(r.points))} m²</span></button>`).join('')}</div>`;
    h += `<div class="total"><span>Superficie útil total</span><span>${fmt(doc.rooms.reduce((s, r) => s + polyArea(r.points), 0))} m²</span></div>`;
  }
  return h + '</section>';
}

function decorHTML() {
  let h = `<section class="sec" style="padding-bottom:4px"><p class="note">Haz clic para añadir un mueble a la habitación que tienes a la vista, o arrástralo directamente al plano.</p>`;
  PRESETS.forEach((cat, ci) => {
    h += `<div class="cat"><div class="cat-name">${cat.cat}</div><div class="tiles">${cat.items.map((it, ii) =>
      `<button class="tile" data-preset="${ci}:${ii}" title="${esc(it.label || it.name)}">${presetGlyph(it)}<div><b>${esc(it.label || it.name)}</b><small>${it.shape === 'circle' ? 'Ø ' + fmt(it.w) : fmt(it.w) + ' × ' + fmt(it.h)}</small></div></button>`).join('')}</div></div>`;
  });
  h += `</section><section class="sec" style="margin-top:14px"><button class="switch${ui.allowZones ? ' on' : ''}" data-act="toggle" data-key="allowZones"><span>Permitir muebles en zonas de apertura</span><i></i></button><p class="note" style="margin-top:6px">${ui.allowZones ? 'Se marcan en rojo, pero puedes dejarlos ahí.' : 'Si sueltas un mueble donde abre una puerta o ventana, vuelve a su sitio.'}</p></section>`;
  return h;
}

function furnWarn(f) {
  const G = buildGeom(), sh = itemShape(f);
  if (hitsSolid(sh, G)) return `<div class="warn">${icon('alert')}<span>Atraviesa un muro o una columna. Muévelo o reduce sus medidas.</span></div>`;
  if (zoneHits(sh, G).size) return `<div class="warn">${icon('alert')}<span>Invade el espacio de apertura de una puerta o ventana.</span></div>`;
  return '';
}
function whereOpening(o) { const r = find('room', o.roomId); return r ? `En ${esc(r.name)}, muro ${o.edge + 1}` : ''; }

function inspectorHTML(kind, o) {
  const kinds = { room: 'Habitación', opening: o.type === 'door' ? 'Puerta' : 'Ventana', furniture: 'Mueble', column: 'Columna', label: 'Etiqueta', bg: 'Imagen de fondo' };
  const title = kind === 'room' ? esc(o.name) : kind === 'furniture' ? esc(o.name || 'Sin nombre') : kind === 'label' ? esc(o.text) : kind === 'opening' ? whereOpening(o) : kind === 'bg' ? 'Plano' : (o.shape === 'circle' ? 'Circular' : 'Rectangular');
  let h = `<div class="insp-head"><button class="icon-btn" data-act="back" title="Volver (Esc)" aria-label="Volver">${icon('back')}</button><div class="insp-titles"><div class="kind">${kinds[kind]}</div><div class="title" data-bind="title">${title}</div></div></div>`;

  if (kind === 'room') {
    h += `<section class="sec stack">${textField('Nombre', 'room.name', o.name)}${labeled('Color del suelo', swatches('room.color', ROOM_COLORS, o.color))}`;
    h += `<div class="stats"><div class="stat"><span>Superficie útil</span><b data-bind="area">${fmt(polyArea(o.points))} m²</b></div><div class="stat"><span>Perímetro</span><b data-bind="perim">${fmt(perimeter(o.points))} m</b></div></div>`;
    h += `<div class="field"><span>Escalar a la superficie útil real</span><div style="display:flex;gap:8px;align-items:center"><span class="inp" style="flex:1"><input id="scaleAreaInput" inputmode="decimal" value="${fmt(polyArea(o.points))}" autocomplete="off" spellcheck="false" aria-label="Superficie útil objetivo"><em>m²</em></span><button class="btn" data-act="scale-area">${icon('fit')}Escalar</button></div></div>`;
    h += `<p class="note">Útil cuando has calcado la habitación sobre una imagen a una escala equivocada: ajusta todos los muros a la vez, manteniendo su proporción, hasta llegar a la superficie real.</p></section>`;
    h += `<section class="sec"><div class="sec-title">Muros <small>medida interior</small></div><div class="walls-head"><span></span><span>Longitud</span><span>Grosor</span><span></span><span></span></div>`;
    roomGeom(o).edges.forEach((e, i) => {
      h += `<div class="wall-row" data-hover-edge="${i}"><span class="idx">${i + 1}</span>${numInput('room.edgeLen', e.len, { idx: i, aria: `Longitud del muro ${i + 1}` })}${numInput('room.thick', o.thick[i], { idx: i, aria: `Grosor del muro ${i + 1}` })}` +
        `<button class="icon-btn" data-act="split" data-idx="${i}" title="Dividir en dos muros" aria-label="Dividir muro ${i + 1}">${icon('split')}</button>` +
        `<button class="icon-btn" data-act="merge" data-idx="${i}" title="Unir con el muro siguiente" aria-label="Unir muro ${i + 1} con el siguiente"${o.points.length <= 3 ? ' disabled' : ''}>${icon('merge')}</button></div>`;
    });
    h += `<div class="grid2" style="margin-top:12px">${numField('Grosor para todos', 'room.allThick', o.thick[0])}</div>`;
    h += `<p class="note" style="margin-top:10px">Al cambiar una longitud, el muro siguiente se desplaza en paralelo. Con grosor 0 el tramo queda abierto, útil para cocinas abiertas al salón.</p></section>`;
    const ops = doc.openings.filter(op => op.roomId === o.id);
    h += `<section class="sec"><div class="sec-title">Puertas y ventanas <small>${ops.length || ''}</small></div>`;
    if (ops.length) h += `<div class="list" style="margin-bottom:10px">${ops.map(op => `<button class="list-row" data-act="select" data-kind="opening" data-id="${op.id}" data-hover-opening="${op.id}">${icon(op.type)}<span class="name">${op.type === 'door' ? 'Puerta' : 'Ventana'} de ${fmt(op.width)} m</span><span class="val">muro ${op.edge + 1}</span></button>`).join('')}</div>`;
    h += `<div class="grid2"><button class="btn" data-act="tool" data-tool="door">${icon('door')}Puerta</button><button class="btn" data-act="tool" data-tool="window">${icon('window')}Ventana</button></div></section>`;
    h += actionsRow({ rotate: true });
  }

  if (kind === 'opening') {
    h += `<section class="sec stack">${labeled('Tipo', segCtl('op.type', [['door', 'Puerta'], ['window', 'Ventana']], o.type))}`;
    h += labeled('Apertura', segCtl('op.style', [['swing', 'Abatible'], ['sliding', 'Corredera']], o.style));
    h += labeled('Hojas', segCtl('op.leaves', [[1, 'Una'], [2, 'Dos']], o.leaves));
    h += `<div class="grid2">${numField('Ancho', 'op.width', o.width)}${numField('Posición en el muro', 'op.offset', o.offset)}</div>`;
    if (o.style === 'swing') h += `<div class="grid2"><button class="btn" data-act="flip-swing">${icon('flip')}Abre hacia ${o.swing === 'out' ? 'dentro' : 'fuera'}</button><button class="btn" data-act="flip-hinge"${o.leaves === 2 ? ' disabled' : ''}>${icon('swap')}Bisagra</button></div>`;
    h += `<button class="btn block" data-act="center">${icon('center')}Centrar en el muro</button>`;
    h += `<p class="note">La posición se mide desde el inicio del muro. Arrástrala en el plano para llevarla a otro muro o a otra habitación.</p></section>`;
    h += actionsRow();
  }

  if (kind === 'furniture') {
    h += `<section class="sec stack">${textField('Nombre', 'f.name', o.name, { placeholder: 'Sin nombre' })}`;
    h += labeled('Forma', segCtl('f.shape', [['rect', 'Rectángulo'], ['circle', 'Círculo']], o.shape));
    h += o.shape === 'circle' ? `<div class="grid2">${numField('Diámetro', 'f.d', o.w)}</div>` : `<div class="grid2">${numField('Ancho', 'f.w', o.w)}${numField('Largo', 'f.h', o.h)}</div>`;
    if (o.shape !== 'circle') {
      h += `<div class="field"><span>Rotación</span><div class="rot-row"><input type="range" min="0" max="359" step="1" data-field="f.rot" data-idx="range" value="${Math.round(o.rot || 0)}" aria-label="Rotación">${numInput('f.rot', o.rot || 0, { unit: '°', d: 0, step: 1, aria: 'Rotación en grados' })}</div>`;
      h += `<div class="chips">${[0, 45, 90, 135].map(a => `<button class="chip${angDiff(o.rot || 0, a) < 0.5 ? ' on' : ''}" data-act="rot-set" data-value="${a}">${a}°</button>`).join('')}</div></div>`;
    }
    h += labeled('Color', swatches('f.color', FURN_COLORS, o.color));
    h += `<div data-bind="warn">${furnWarn(o)}</div></section>`;
    h += actionsRow({ rotate: o.shape !== 'circle' });
  }

  if (kind === 'column') {
    h += `<section class="sec stack">${labeled('Sección', segCtl('col.shape', [['rect', 'Rectangular'], ['circle', 'Circular']], o.shape))}`;
    h += o.shape === 'circle' ? `<div class="grid2">${numField('Diámetro', 'col.d', o.w)}</div>` : `<div class="grid2">${numField('Ancho', 'col.w', o.w)}${numField('Largo', 'col.h', o.h)}</div>`;
    h += `<p class="note">Los muebles no pueden atravesarla. Al arrastrarla, sus caras se ajustan a las de los muros.</p></section>`;
    h += actionsRow({ rotate: o.shape !== 'circle' });
  }

  if (kind === 'bg') {
    h += `<section class="sec stack">${numField('Ancho', 'bg.w', o.w)}`;
    h += `<div class="field"><span>Opacidad</span><div class="rot-row"><input type="range" min="5" max="100" step="1" data-field="bg.opacity" data-idx="range" value="${Math.round(o.opacity * 100)}" aria-label="Opacidad">${numInput('bg.opacity', o.opacity * 100, { unit: '%', d: 0, step: 1, aria: 'Opacidad' })}</div></div>`;
    h += `<div class="field"><span>Rotación</span><div class="rot-row"><input type="range" min="0" max="359" step="1" data-field="bg.rot" data-idx="range" value="${Math.round(o.rot || 0)}" aria-label="Rotación">${numInput('bg.rot', o.rot || 0, { unit: '°', d: 0, step: 1, aria: 'Rotación en grados' })}</div></div>`;
    h += `<button class="btn block" data-act="bg-replace">Reemplazar imagen</button>`;
    h += `<p class="note">Arrástrala por el lienzo para moverla y usa el asa de la esquina para escalarla manteniendo la proporción.</p></section>`;
    h += `<section class="sec row-actions"><button class="btn" data-act="bg-toggle-lock">${o.locked ? 'Desbloquear' : 'Bloquear'}</button><button class="btn danger" data-act="delete" title="Eliminar (Supr)" aria-label="Eliminar">${icon('trash')}</button></section>`;
  }

  if (kind === 'label') {
    h += `<section class="sec stack">${textField('Texto', 'label.text', o.text)}${labeled('Tamaño', segCtl('label.size', [['s', 'Pequeño'], ['m', 'Mediano'], ['l', 'Grande']], o.size))}`;
    h += `<p class="note">Las etiquetas flotan libres por el plano. Para nombrar una habitación usa su propio nombre, que siempre muestra los m².</p></section>`;
    h += actionsRow();
  }
  return h;
}

/* ════════════════════════ Panel: render y sincronización ════════════════════════ */
let panelCtx = '';
function renderPanel() {
  if (sel && !selObj()) sel = null;
  const ae = document.activeElement;
  const keep = ae && panel.contains(ae) && ae.dataset && ae.dataset.field ? { f: ae.dataset.field, i: ae.dataset.idx, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const ctx = sel ? sel.kind + ':' + sel.id : 'tab:' + ui.tab;
  const st = panel.scrollTop;
  panel.innerHTML = sel ? inspectorHTML(sel.kind, selObj()) : ui.tab === 'decor' ? decorHTML() : structureHTML();
  panel.scrollTop = ctx === panelCtx ? st : 0;
  panelCtx = ctx;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  if (keep) {
    const el = panel.querySelector(`[data-field="${keep.f}"]${keep.i != null ? `[data-idx="${keep.i}"]` : ':not([data-idx])'}`);
    if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (_) { /* inputs sin selección */ } }
  }
  updateUndo();
}

function getField(field, idx) {
  const [ns, key] = field.split('.'), o = selObj();
  if (ns === 'newRoom') return ui.newRoom[key];
  if (!o) return undefined;
  if (ns === 'room') {
    if (key === 'edgeLen') { const n = o.points.length, i = +idx; return i < n ? V.dist(o.points[i], o.points[(i + 1) % n]) : undefined; }
    if (key === 'thick') return o.thick[+idx];
    if (key === 'allThick') return o.thick[0];
  }
  if ((ns === 'f' || ns === 'col') && key === 'd') return o.w;
  if (ns === 'f' && key === 'rot') return o.rot || 0;
  if (ns === 'bg') { if (key === 'opacity') return (o.opacity || 0) * 100; if (key === 'rot') return o.rot || 0; }
  return o[key];
}
function syncInspector() {
  if (!sel) return;
  const o = selObj(); if (!o) return;
  panel.querySelectorAll('input[data-field]').forEach(inp => {
    if (inp === document.activeElement) return;
    const v = getField(inp.dataset.field, inp.dataset.idx);
    if (v === undefined) return;
    if (inp.type === 'range') inp.value = Math.round(v);
    else if (inp.dataset.num) inp.value = fmt(v, +inp.dataset.d);
    else if (inp.type !== 'color') inp.value = v;
  });
  panel.querySelectorAll('[data-bind]').forEach(el => {
    let v = null;
    switch (el.dataset.bind) {
      case 'title': v = sel.kind === 'room' ? esc(o.name) : sel.kind === 'furniture' ? esc(o.name || 'Sin nombre') : sel.kind === 'label' ? esc(o.text) : sel.kind === 'opening' ? whereOpening(o) : null; break;
      case 'area': v = fmt(polyArea(o.points)) + ' m²'; break;
      case 'perim': v = fmt(perimeter(o.points)) + ' m'; break;
      case 'warn': v = furnWarn(o); break;
    }
    if (v != null && el.innerHTML !== v) el.innerHTML = v;
  });
}

function setField(field, raw, isCommit, idx) {
  const [ns, key] = field.split('.'), o = selObj(), v = parseNum(raw);
  let rebuild = isCommit;
  switch (ns) {
    case 'newRoom': {
      if (key === 'shape') ui.newRoom.shape = raw;
      else if (isNaN(v)) break;
      else if (key === 'sides') ui.newRoom.sides = clamp(Math.round(v), 3, 12);
      else if (key === 't') ui.newRoom.t = r3(clamp(v, 0, 1));
      else ui.newRoom[key] = r3(clamp(v, 0.3, 100));
      renderPanel();
      return;
    }
    case 'room': {
      if (!o) return;
      if (key === 'name') { o.name = String(raw).slice(0, 40); rebuild = false; }
      else if (key === 'color') { o.color = raw; if (!isCommit) { requestRender(); return; } }
      else if (key === 'edgeLen') {
        if (isNaN(v) || v < 0.1) toast('La longitud mínima de un muro es 0,10 m', true);
        else if (!setEdgeLength(o, +idx, r3(v))) toast('Con esa medida la forma se cruzaría consigo misma. Prueba otro valor o arrastra los vértices.', true);
      } else if (key === 'thick') { if (!isNaN(v)) o.thick[+idx] = r3(clamp(v, 0, 1)); }
      else if (key === 'allThick') { if (!isNaN(v)) o.thick = o.thick.map(() => r3(clamp(v, 0, 1))); }
      break;
    }
    case 'op': {
      if (!o) return;
      const r = find('room', o.roomId), e = r && roomGeom(r).edges[o.edge];
      if (key === 'type') { o.type = raw === 'window' ? 'window' : 'door'; }
      else if (key === 'style') o.style = raw === 'sliding' ? 'sliding' : 'swing';
      else if (key === 'leaves') o.leaves = +raw === 2 ? 2 : 1;
      else if (key === 'width' && e && !isNaN(v)) { o.width = r3(clamp(v, 0.3, e.len)); o.offset = r3(clamp(o.offset, 0, Math.max(0, e.len - o.width))); }
      else if (key === 'offset' && e && !isNaN(v)) o.offset = r3(clamp(v, 0, Math.max(0, e.len - Math.min(o.width, e.len))));
      break;
    }
    case 'f': {
      if (!o) return;
      if (key === 'name') { o.name = String(raw).slice(0, 40); rebuild = false; }
      else if (key === 'color') { o.color = raw; if (!isCommit) { requestRender(); return; } }
      else if (key === 'shape') {
        const shape = raw === 'circle' ? 'circle' : 'rect';
        if (shape !== o.shape) { const m = r3(Math.min(o.w, o.h)); applyFurn(o, { ...o, shape, w: shape === 'circle' ? m : o.w, h: shape === 'circle' ? m : o.h }); }
      } else if (key === 'w' || key === 'h' || key === 'd') {
        if (!isNaN(v)) { const val = r3(clamp(v, 0.05, 30)), nx = { ...o }; if (key === 'd') nx.w = nx.h = val; else nx[key] = val; applyFurn(o, nx); }
      } else if (key === 'rot') {
        if (!isNaN(v)) applyFurn(o, { ...o, rot: norm360(Math.round(v * 10) / 10) });
        if (!isCommit) { syncInspector(); requestRender(); return; }
      }
      break;
    }
    case 'col': {
      if (!o) return;
      if (key === 'shape') o.shape = raw === 'circle' ? 'circle' : 'rect';
      else if (!isNaN(v)) { const val = r3(clamp(v, 0.05, 5)); if (key === 'd') { o.w = val; o.h = val; } else o[key] = val; }
      break;
    }
    case 'label': {
      if (!o) return;
      if (key === 'text') { o.text = String(raw).slice(0, 60); rebuild = false; }
      else if (key === 'size') o.size = raw;
      break;
    }
    case 'bg': {
      if (!o) return;
      if (key === 'w') { if (!isNaN(v)) { const val = clamp(v, 0.1, 500); o.w = r3(val); o.h = r3(val / (o.ar || (o.w / o.h) || 1)); } }
      else if (key === 'opacity') { if (!isNaN(v)) o.opacity = clamp(v / 100, 0.05, 1); if (!isCommit) { requestRender(); return; } }
      else if (key === 'rot') { if (!isNaN(v)) o.rot = norm360(Math.round(v * 10) / 10); if (!isCommit) { requestRender(); return; } }
      break;
    }
  }
  if (isCommit) commit();
  if (rebuild) renderPanel(); else syncInspector();
  requestRender();
}

/* ════════════════════════ Panel: eventos ════════════════════════ */
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || !panel.contains(b) || b.disabled) return;
  const a = b.dataset.act, o = selObj(), idx = b.dataset.idx != null ? +b.dataset.idx : null;
  switch (a) {
    case 'set': setField(b.dataset.field, b.dataset.value, true, b.dataset.idx); break;
    case 'create-room': createRoomFromPanel(); break;
    case 'tool': startTool(b.dataset.tool); break;
    case 'select': {
      select(b.dataset.kind, b.dataset.id);
      const it = selObj();
      if (it && b.dataset.kind === 'room') ensureVisible(roomGeom(it).bbox);
      break;
    }
    case 'back': select(null); break;
    case 'delete': deleteSel(); break;
    case 'duplicate': duplicateSel(); break;
    case 'rotate': rotateSel(+b.dataset.deg || 90); break;
    case 'split': if (o && splitEdge(o, idx)) { commit(); renderPanel(); requestRender(); } else toast('Ese muro es demasiado corto para dividirlo', true); break;
    case 'merge': if (o && removeVertex(o, (idx + 1) % o.points.length)) { commit(); renderPanel(); requestRender(); } else toast('No se pueden unir: la forma quedaría inválida', true); break;
    case 'flip-swing': if (o) { o.swing = o.swing === 'out' ? 'in' : 'out'; commit(); renderPanel(); requestRender(); } break;
    case 'flip-hinge': if (o) { o.hinge = o.hinge === 'end' ? 'start' : 'end'; commit(); requestRender(); } break;
    case 'center': {
      const r = o && find('room', o.roomId), e2 = r && roomGeom(r).edges[o.edge];
      if (e2) { o.offset = r3(Math.max(0, (e2.len - Math.min(o.width, e2.len)) / 2)); commit(); syncInspector(); requestRender(); }
      break;
    }
    case 'rot-set': setField('f.rot', b.dataset.value, true); break;
    case 'scale-area': {
      if (!o) break;
      const inp = panel.querySelector('#scaleAreaInput'), v = inp ? parseNum(inp.value) : NaN;
      if (isNaN(v) || v <= 0) { toast('Escribe una superficie válida en m²', true); break; }
      if (scaleRoomToArea(o, v)) { commit(); renderPanel(); requestRender(); toast(`Habitación escalada a ${fmt(v)} m²`); }
      else toast('No se pudo escalar la habitación', true);
      break;
    }
    case 'toggle': ui[b.dataset.key] = !ui[b.dataset.key]; renderPanel(); requestRender(); break;
    case 'bg-add': case 'bg-replace': $('#file-bg').click(); break;
    case 'bg-toggle-lock': if (doc.bg) { doc.bg.locked = !doc.bg.locked; commit(); renderPanel(); requestRender(); } break;
    case 'bg-toggle-visible': if (doc.bg) { doc.bg.visible = doc.bg.visible === false; commit(); renderPanel(); requestRender(); } break;
  }
});
panel.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.field && (t.dataset.live || t.type === 'range')) setField(t.dataset.field, t.value, false, t.dataset.idx);
});
panel.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.field) setField(t.dataset.field, t.value, true, t.dataset.idx);
});
panel.addEventListener('keydown', e => {
  const t = e.target;
  if (t.tagName !== 'INPUT') return;
  if (t.id === 'scaleAreaInput' && e.key === 'Enter') { e.preventDefault(); const b = panel.querySelector('[data-act="scale-area"]'); if (b) b.click(); return; }
  if (e.key === 'Enter' || e.key === 'Escape') { t.blur(); return; }
  if (t.dataset.num && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const v = parseNum(t.value); if (isNaN(v)) return;
    const step = (+t.dataset.step || 0.01) * (e.shiftKey ? 10 : 1);
    t.value = fmt(v + (e.key === 'ArrowUp' ? step : -step), +t.dataset.d);
    setField(t.dataset.field, t.value, true, t.dataset.idx);
  }
});
const edgeRowOn = row => { if (row && sel && sel.kind === 'room') { const i = +row.dataset.hoverEdge; if (!ui.hoverEdge || ui.hoverEdge.edge !== i) { ui.hoverEdge = { roomId: sel.id, edge: i }; requestRender(); } } };
const openingRowOn = row => { if (row) { const id = row.dataset.hoverOpening; if (ui.hoverOpening !== id) { ui.hoverOpening = id; requestRender(); } } };
panel.addEventListener('pointerover', e => { edgeRowOn(e.target.closest('[data-hover-edge]')); openingRowOn(e.target.closest('[data-hover-opening]')); });
panel.addEventListener('focusin', e => { edgeRowOn(e.target.closest('[data-hover-edge]')); openingRowOn(e.target.closest('[data-hover-opening]')); });
panel.addEventListener('pointerout', e => {
  const row = e.target.closest('[data-hover-edge]');
  if (row && !row.contains(e.relatedTarget) && !row.contains(document.activeElement)) { ui.hoverEdge = null; requestRender(); }
  const row2 = e.target.closest('[data-hover-opening]');
  if (row2 && !row2.contains(e.relatedTarget) && !row2.contains(document.activeElement)) { ui.hoverOpening = null; requestRender(); }
});
panel.addEventListener('focusout', e => {
  const row = e.target.closest('[data-hover-edge]');
  if (row && !row.contains(e.relatedTarget)) { ui.hoverEdge = null; requestRender(); }
  const row2 = e.target.closest('[data-hover-opening]');
  if (row2 && !row2.contains(e.relatedTarget)) { ui.hoverOpening = null; requestRender(); }
});

/* Biblioteca de muebles: clic para añadir, arrastrar para soltar en el plano */
panel.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-preset]');
  if (!t || e.button !== 0) return;
  const [ci, ii] = t.dataset.preset.split(':').map(Number);
  libDrag = { pr: PRESETS[ci].items[ii], x0: e.clientX, y0: e.clientY, touch: e.pointerType === 'touch', f: null, G: null };
});
window.addEventListener('pointermove', e => {
  const L = libDrag;
  if (!L || L.touch) return;
  if (!L.f && Math.hypot(e.clientX - L.x0, e.clientY - L.y0) < 6) return;
  const ghost = $('#ghost'), r = svg.getBoundingClientRect();
  const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  const w = toWorld({ x: e.clientX - r.left, y: e.clientY - r.top });
  document.body.classList.add('dragging');
  if (!L.f) {
    if (!over) { ghost.textContent = L.pr.label || L.pr.name; ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; ghost.hidden = false; return; }
    ghost.hidden = true;
    if (mode !== 'select') setMode('select');
    L.f = { id: uid('f'), name: L.pr.name, shape: L.pr.shape, x: w.x, y: w.y, w: L.pr.w, h: L.pr.h, rot: 0, color: L.pr.color };
    doc.furniture.push(L.f);
    L.G = buildGeom();
    select('furniture', L.f.id);
  } else { L.f.x = w.x; L.f.y = w.y; }
  L.over = over;
  requestRender();
});
window.addEventListener('pointerup', e => {
  const L = libDrag; if (!L) return;
  libDrag = null;
  $('#ghost').hidden = true; document.body.classList.remove('dragging');
  if (!L.f) {
    if (Math.hypot(e.clientX - L.x0, e.clientY - L.y0) < 10 && e.target.closest && e.target.closest('[data-preset]')) {
      if (mode !== 'select') setMode('select');
      const f = addFurniture(L.pr);
      select('furniture', f.id); commit();
      ensureVisible(itemShape(f).bbox);
    }
    return;
  }
  const f = L.f;
  if (!L.over) {   // soltado fuera del lienzo: se cancela
    doc.furniture = doc.furniture.filter(x => x !== f);
    sel = null; renderPanel(); requestRender();
    return;
  }
  const sh = itemShape(f);
  if (hitsSolid(sh, L.G) || (!ui.allowZones && zoneHits(sh, L.G).size)) {
    const spot = findSpot(f, f.x, f.y, f.rot, L.G, 1.5, !ui.allowZones);
    if (spot) { f.x = spot.x; f.y = spot.y; }
    else toast('No hay hueco libre cerca: queda marcado en rojo para que lo recoloques', true);
  }
  commit(); renderPanel(); requestRender();
});
window.addEventListener('pointercancel', () => { if (libDrag) { libDrag = null; $('#ghost').hidden = true; document.body.classList.remove('dragging'); } });

/* ════════════════════════ Cabecera, pestañas, HUD y menú ════════════════════════ */
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  ui.tab = b.dataset.tab;
  if (mode !== 'select') setMode('select');
  sel = null; renderPanel(); requestRender();
});
$('#btn-undo').addEventListener('click', undo);
$('#btn-redo').addEventListener('click', redo);
$('#btn-menu').addEventListener('click', e => { e.stopPropagation(); $('#menu').hidden = !$('#menu').hidden; });
function hideMenu() { $('#menu').hidden = true; }
document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) hideMenu(); });
$('#menu').addEventListener('click', e => { const b = e.target.closest('[data-menu]'); if (b) menuAction(b.dataset.menu); });
$('.hud-br').addEventListener('click', e => {
  const b = e.target.closest('[data-view]'); if (!b) return;
  const a = b.dataset.view;
  if (a === 'in') zoomAt(viewCenter(), 1.25);
  if (a === 'out') zoomAt(viewCenter(), 0.8);
  if (a === 'fit') animateView(fitTarget());
  if (a === 'grid') { ui.grid = !ui.grid; requestRender(); }
  if (a === 'dims') { ui.allDims = !ui.allDims; requestRender(); }
});
$('#modebar').addEventListener('click', e => {
  const b = e.target.closest('[data-mb]'); if (!b) return;
  if (b.dataset.mb === 'cancel') setMode('select');
  if (b.dataset.mb === 'finish') { finishDraw(); requestRender(); }
});

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function replaceDoc(d, msg) {
  if (mode !== 'select') setMode('select');
  doc = d; sel = null; commit(); renderPanel(); requestRender(); animateView(fitTarget());
  if (msg) toast(msg);
}
function menuAction(a) {
  hideMenu();
  if (a === 'new') replaceDoc(emptyDoc(), 'Plano en blanco. Ctrl+Z recupera el anterior');
  if (a === 'demo') replaceDoc(demoDoc(), 'Plano de ejemplo cargado');
  if (a === 'json') downloadBlob(new Blob([JSON.stringify({ app: 'planta', version: 1, ...doc }, null, 2)], { type: 'application/json' }), 'plano.json');
  if (a === 'import') $('#file').click();
  if (a === 'png') exportPNG();
}
$('#file').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try { const d = sanitize(JSON.parse(await file.text())); if (!d) throw new Error('inválido'); replaceDoc(d, 'Proyecto abierto'); }
  catch (_) { toast('Ese archivo no es un proyecto válido de Planta', true); }
});
$('#file-bg').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Elige un archivo de imagen (PNG o JPG)', true); return; }
  try { await setBgFromFile(file); renderPanel(); toast('Imagen de fondo cargada'); }
  catch (err) { toast(err.message || 'No se pudo cargar la imagen', true); }
});
function exportPNG() {
  const b = docBounds();
  if (!b) { toast('El plano está vacío', true); return; }
  const pad = 0.7, wm = b.maxX - b.minX + pad * 2, hm = b.maxY - b.minY + pad * 2;
  const scale = Math.min(2600 / wm, 2600 / hm, 260), W = Math.ceil(wm * scale), H = Math.ceil(hm * scale);
  const v = { scale, ox: -(b.minX - pad) * scale, oy: -(b.minY - pad) * scale };
  const prevSel = sel; sel = null;
  const inner = renderScene(v, W, H, { export: true, uk: Math.max(1, scale / 90) });
  sel = prevSel; RV = view; UK = 1; CUT_FILL = C.paper;
  const str = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family='${FONT}'><rect width="${W}" height="${H}" fill="#FFFFFF"/>${inner}</svg>`;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0);
    cv.toBlob(blob => { if (blob) { downloadBlob(blob, 'plano.png'); toast('Imagen exportada'); } else toast('No se pudo generar la imagen', true); }, 'image/png');
  };
  img.onerror = () => toast('No se pudo generar la imagen', true);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
}

/* ════════════════════════ Arranque ════════════════════════ */
async function init() {
  renderPanel();
  const saved = sanitize(await load());
  doc = saved || demoDoc();
  resetHistory();
  renderPanel();
  Object.assign(view, fitTarget());
  render();
  new ResizeObserver(() => requestRender()).observe(stage);
}
init();
