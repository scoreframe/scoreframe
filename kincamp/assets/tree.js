// Family tree for the KinCamp website: the graph, the "close family" chart
// (grandparents to grandchildren around one person), and the pan/zoom
// "whole tree" chart. Read-only.

export function displayName(p) {
  if (!p) return 'Unnamed';
  const first = String(p.preferredName || '').trim() || String(p.firstName || '').trim();
  const last = String(p.lastName || '').trim();
  return (last ? `${first} ${last}` : first) || 'Unnamed';
}
export function firstName(p) {
  return (String(p.preferredName || '').trim() || String(p.firstName || '').trim() || displayName(p)).split(' ')[0];
}
export function initials(p) {
  const a = String(p.preferredName || p.firstName || '').trim();
  const b = String(p.lastName || '').trim();
  return ((a[0] || '') + (b[0] || '')).toUpperCase() || '·';
}
const PALETTE = ['#3E7FA8', '#C2477A', '#4E8A2E', '#8A6A3D', '#6A4FA3', '#2F6B42', '#B5562F', '#1F7A80', '#8E3F6F', '#5A6E2A'];
export function colorFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function yearOf(d, approx) {
  if (d instanceof Date && !isNaN(d)) return d.getUTCFullYear();
  const m = /(\d{4})/.exec(String(approx || ''));
  return m ? parseInt(m[1], 10) : null;
}
export function birthYear(p) { return yearOf(p.birthDate, p.birthDateApprox); }
export function deathYear(p) { return yearOf(p.deathDate, p.deathDateApprox); }
/** "1931–2012" for someone who has died; '' otherwise (living people show no year on the chart). */
export function lifeYears(p, hideYear) {
  if (!p.deceased || hideYear) return '';
  const b = birthYear(p), d = deathYear(p);
  if (!b && !d) return '';
  return `${b || '?'}–${d || '?'}`;
}

/** Index of the (already filtered) people and relationships. */
export function buildGraph(people, rels) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parentsOf = new Map(), childrenOf = new Map(), spousesOf = new Map(), petsOf = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(v)) m.get(k).push(v); };
  for (const r of rels) {
    if (r.kind === 'parentChild' && byId.has(r.parentId) && byId.has(r.childId)) {
      add(parentsOf, r.childId, r.parentId); add(childrenOf, r.parentId, r.childId);
    } else if (r.kind === 'spouse' && byId.has(r.personAId) && byId.has(r.personBId)) {
      add(spousesOf, r.personAId, { id: r.personBId, ended: !!r.endDate });
      add(spousesOf, r.personBId, { id: r.personAId, ended: !!r.endDate });
    }
  }
  for (const p of people) {
    if (p.kind === 'pet') for (const o of p.ownerIds || []) if (byId.has(o)) add(petsOf, o, p.id);
  }
  const humans = people.filter((p) => p.kind !== 'pet');
  const g = {
    byId, humans, parentsOf, childrenOf, spousesOf, petsOf,
    parents: (id) => (parentsOf.get(id) || []).filter((x) => byId.get(x)?.kind !== 'pet'),
    children: (id) => (childrenOf.get(id) || []).filter((x) => byId.get(x)?.kind !== 'pet'),
    spouses: (id, includeEnded) => (spousesOf.get(id) || []).filter((s) => includeEnded || !s.ended).map((s) => s.id),
    pets: (id) => petsOf.get(id) || [],
  };
  g.siblings = (id) => {
    const out = new Set();
    for (const par of g.parents(id)) for (const c of g.children(par)) if (c !== id) out.add(c);
    return [...out];
  };
  return g;
}

const byBirth = (g) => (a, b) => {
  const ya = birthYear(g.byId.get(a)), yb = birthYear(g.byId.get(b));
  if (ya != null && yb != null && ya !== yb) return ya - yb;
  if (ya != null && yb == null) return -1;
  if (ya == null && yb != null) return 1;
  return displayName(g.byId.get(a)).localeCompare(displayName(g.byId.get(b)));
};

// ------------------------------------------------------- close family ---
const NODE_W = 112, COUPLE_GAP = 14, UNIT_GAP = 30, ROW_H = 200, LABEL_H = 26, PAD_X = 20, PAD_TOP = 14;
const AV = 60, AV_FOCUS = 76;

/** Places grandparents, parents, the focus row, children and grandchildren. */
export function closeLayout(g, F) {
  const rows = new Map();            // gen -> [{ids, desired}]
  const shown = new Set([F]);
  const unit = (ids, desired) => ({ ids: ids.filter((x, i, a) => a.indexOf(x) === i), desired });
  const take = (ids) => ids.filter((id) => { if (shown.has(id)) return false; shown.add(id); return true; });

  // Row 0: siblings around the focus person, partner(s) beside them.
  const sibs = take(g.siblings(F));
  const partners = take(g.spouses(F));
  const order = [...sibs, F].sort(byBirth(g));
  const row0 = order.map((id) => (id === F ? unit([F, ...partners]) : unit([id])));
  rows.set(0, row0);

  // Row -1: the focus person's parents.
  const parents = take(g.parents(F));
  if (parents.length) rows.set(-1, [unit(parents, null)]);

  // Row -2: each parent's own parents.
  const gp = [];
  for (const p of parents) { const pp = take(g.parents(p)); if (pp.length) gp.push(unit(pp, null)); }
  if (gp.length) rows.set(-2, gp);

  // Row +1: children of the focus person and their partner(s), with the child's partner.
  const kidIds = take([F, ...partners].flatMap((x) => g.children(x))).sort(byBirth(g));
  const kidUnits = kidIds.map((k) => unit([k, ...take(g.spouses(k))], null));
  if (kidUnits.length) rows.set(1, kidUnits);

  // Row +2: grandchildren, under their parents.
  const gkUnits = [];
  for (const u of kidUnits) for (const gk of take(u.ids.flatMap((x) => g.children(x))).sort(byBirth(g))) gkUnits.push(unit([gk], null));
  if (gkUnits.length) rows.set(2, gkUnits);

  const width = (u) => u.ids.length * NODE_W + (u.ids.length - 1) * COUPLE_GAP;
  const pos = new Map();             // id -> {cx, gen}
  const unitCenter = (u) => { const xs = u.ids.map((id) => pos.get(id).cx); return (Math.min(...xs) + Math.max(...xs)) / 2; };
  const placeRow = (gen, units, desiredFn) => {
    units.forEach((u, i) => { u.desired = desiredFn ? desiredFn(u, i) : u.desired; });
    const sorted = units.slice().sort((a, b) => a.desired - b.desired);
    let right = -Infinity;
    for (const u of sorted) {
      let left = u.desired - width(u) / 2;
      if (left < right + UNIT_GAP) left = right + UNIT_GAP;
      u.left = left; right = left + width(u);
    }
    const drift = sorted.reduce((s, u) => s + (u.left + width(u) / 2 - u.desired), 0) / (sorted.length || 1);
    for (const u of sorted) {
      u.left -= drift;
      u.ids.forEach((id, k) => pos.set(id, { cx: u.left + k * (NODE_W + COUPLE_GAP) + NODE_W / 2, gen }));
    }
  };
  // Row 0 laid out in order.
  let x = 0;
  placeRow(0, row0, (u) => { const c = x + width(u) / 2; x += width(u) + UNIT_GAP; return c; });
  const childCenter = (ids) => { const xs = ids.filter((id) => pos.has(id)).map((id) => pos.get(id).cx); return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0; };
  if (rows.has(-1)) placeRow(-1, rows.get(-1), () => childCenter([F, ...sibs]));
  if (rows.has(-2)) placeRow(-2, rows.get(-2), (u) => childCenter(parents.filter((p) => u.ids.some((gpId) => g.parents(p).includes(gpId)))));
  const fUnit = row0.find((u) => u.ids.includes(F));
  if (rows.has(1)) {
    const c = unitCenter(fUnit);
    const total = kidUnits.reduce((s, u) => s + width(u), 0) + UNIT_GAP * (kidUnits.length - 1);
    let k = c - total / 2;
    placeRow(1, kidUnits, (u) => { const d = k + width(u) / 2; k += width(u) + UNIT_GAP; return d; });
  }
  if (rows.has(2)) {
    const groups = new Map();
    for (const u of gkUnits) {
      const parentUnit = kidUnits.find((ku) => ku.ids.some((pid) => g.children(pid).includes(u.ids[0])));
      if (!groups.has(parentUnit)) groups.set(parentUnit, []);
      groups.get(parentUnit).push(u);
    }
    for (const [pu, us] of groups) {
      const c = pu ? unitCenter(pu) : 0;
      const total = us.length * NODE_W + (us.length - 1) * UNIT_GAP;
      us.forEach((u, i) => { u.desired = c - total / 2 + i * (NODE_W + UNIT_GAP) + NODE_W / 2; });
    }
    placeRow(2, gkUnits, null);
  }

  // Normalise to positive coordinates.
  const gens = [...rows.keys()].sort((a, b) => a - b);
  const minX = Math.min(...[...pos.values()].map((p) => p.cx - NODE_W / 2));
  const maxX = Math.max(...[...pos.values()].map((p) => p.cx + NODE_W / 2));
  const rowTop = new Map(gens.map((gen, i) => [gen, PAD_TOP + i * ROW_H]));
  const nodes = [];
  for (const [id, p] of pos) nodes.push({ id, x: p.cx - minX + PAD_X, top: rowTop.get(p.gen) + LABEL_H, gen: p.gen, focus: id === F });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const avCenterY = (n) => n.top + 4 + (n.focus ? AV_FOCUS : AV) / 2;
  const avR = (n) => (n.focus ? AV_FOCUS : AV) / 2 + 3;

  // Wires.
  const wires = [];
  const allUnits = gens.flatMap((gen) => rows.get(gen).map((u) => ({ ...u, gen })));
  for (const u of allUnits) {
    const ns = u.ids.map((id) => nodeById.get(id));
    for (let i = 0; i + 1 < ns.length; i++) {
      const a = ns[i], b = ns[i + 1];
      if (!(g.spouses(a.id, true).includes(b.id))) continue;
      const y = Math.max(avCenterY(a), avCenterY(b));
      wires.push({ d: `M${a.x + avR(a)},${y} H${b.x - avR(b)}`, ids: [a.id, b.id], kind: 'spouse' });
    }
  }
  for (const u of allUnits) {
    const kids = nodes.filter((n) => n.gen === u.gen + 1 && u.ids.some((pid) => g.parents(n.id).includes(pid)));
    if (!kids.length) continue;
    const ns = u.ids.map((id) => nodeById.get(id)).filter((n) => kids.some((k) => g.parents(k.id).includes(n.id)));
    let ax, ay;
    if (ns.length >= 2) { ax = (ns[0].x + ns[ns.length - 1].x) / 2; ay = Math.max(...ns.map(avCenterY)); }
    else { ax = ns[0].x; ay = avCenterY(ns[0]) + avR(ns[0]); }
    const busY = kids[0].top - 14;
    const xs = kids.map((k) => k.x);
    const lo = Math.min(ax, ...xs), hi = Math.max(ax, ...xs);
    let d = `M${ax},${ay} V${busY}`;
    if (hi - lo > 1) d += ` M${lo},${busY} H${hi}`;
    for (const k of kids) d += ` M${k.x},${busY} V${k.top + 4 - 3}`;
    wires.push({ d, ids: [...ns.map((n) => n.id), ...kids.map((k) => k.id)], kind: 'parent' });
  }

  const labels = { '-2': 'Grandparents', '-1': 'Parents', 0: '', 1: 'Children', 2: 'Grandchildren' };
  return {
    nodes, wires,
    rows: gens.map((gen) => ({ gen, top: rowTop.get(gen), label: labels[gen] })),
    width: maxX - minX + PAD_X * 2,
    height: PAD_TOP + gens.length * ROW_H,
  };
}

// ------------------------------------------------------------ whole tree ---
const CARD_W = 168, CARD_H = 78, GAP_X = 26, GAP_Y = 64;

/** Every connected person by generation (port of the original web viewer layout). */
export function wholeLayout(g, focusId) {
  const ids = g.humans.map((p) => p.id);
  if (!ids.length) return { positions: new Map(), spouses: [], buses: [], width: 0, height: 0 };
  const adj = new Map(ids.map((id) => [id, new Set()]));
  for (const id of ids) {
    for (const c of g.children(id)) { adj.get(id).add(c); adj.get(c)?.add(id); }
    for (const s of g.spouses(id, true)) adj.get(id).add(s);
  }
  // Components; lay out the one holding the focus person, then the rest beside it.
  const seen = new Set(), comps = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const comp = new Set(), stack = [id];
    while (stack.length) { const c = stack.pop(); if (comp.has(c)) continue; comp.add(c); for (const n of adj.get(c) || []) stack.push(n); }
    comp.forEach((m) => seen.add(m));
    comps.push(comp);
  }
  comps.sort((a, b) => (b.has(focusId) - a.has(focusId)) || b.size - a.size);
  const positions = new Map();
  let offsetX = 0, maxY = 0;
  for (const comp of comps) {
    const root = comp.has(focusId) ? focusId : [...comp].sort(byBirth(g))[0];
    const gen = new Map([[root, 0]]), q = [root];
    while (q.length) {
      const cur = q.shift(), gv = gen.get(cur);
      for (const p of g.parents(cur)) if (comp.has(p) && !gen.has(p)) { gen.set(p, gv - 1); q.push(p); }
      for (const c of g.children(cur)) if (comp.has(c) && !gen.has(c)) { gen.set(c, gv + 1); q.push(c); }
      for (const s of g.spouses(cur, true)) if (comp.has(s) && !gen.has(s)) { gen.set(s, gv); q.push(s); }
    }
    const rows = new Map();
    for (const [id, gv] of gen) { if (!rows.has(gv)) rows.set(gv, []); rows.get(gv).push(id); }
    // Keep couples together, ordered by the parents' positions above.
    const keys = [...rows.keys()].sort((a, b) => a - b);
    const minGen = keys[0];
    const local = new Map();
    let widest = 0;
    for (const k of keys) {
      const row = rows.get(k);
      const parentX = (id) => { const xs = g.parents(id).map((p) => local.get(p)?.x).filter((v) => v != null); return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null; };
      const groups = [], used = new Set();
      for (const id of row.slice().sort(byBirth(g))) {
        if (used.has(id)) continue;
        const grp = [id]; used.add(id);
        for (const s of g.spouses(id, true)) if (row.includes(s) && !used.has(s)) { grp.push(s); used.add(s); }
        const px = grp.map(parentX).filter((v) => v != null);
        groups.push({ grp, key: px.length ? Math.min(...px) : Infinity });
      }
      groups.sort((a, b) => a.key - b.key);
      const flat = groups.flatMap((x) => x.grp);
      flat.forEach((id, i) => local.set(id, { x: i * (CARD_W + GAP_X), y: (k - minGen) * (CARD_H + GAP_Y) }));
      widest = Math.max(widest, flat.length * (CARD_W + GAP_X));
    }
    for (const k of keys) {
      const row = [...local.entries()].filter(([id]) => gen.get(id) === k);
      const w = row.length * (CARD_W + GAP_X);
      const shift = (widest - w) / 2;
      for (const [id, p] of row) positions.set(id, { x: p.x + shift + offsetX, y: p.y });
    }
    for (const p of local.values()) maxY = Math.max(maxY, p.y + CARD_H);
    offsetX += widest + GAP_X * 2;
  }
  const spouses = [], buses = [];
  const done = new Set();
  for (const id of positions.keys()) {
    for (const s of g.spouses(id, true)) {
      const key = [id, s].sort().join('|');
      if (done.has(key) || !positions.has(s)) continue;
      done.add(key);
      const a = positions.get(id), b = positions.get(s);
      if (a.y !== b.y) continue;
      const L = a.x < b.x ? a : b, R = a.x < b.x ? b : a;
      spouses.push({ ids: [id, s], x1: L.x + CARD_W, x2: R.x, y: L.y + CARD_H / 2 });
    }
  }
  const byParents = new Map();
  for (const id of positions.keys()) {
    const ps = g.parents(id).filter((p) => positions.has(p));
    if (!ps.length) continue;
    const key = ps.sort().join('|');
    if (!byParents.has(key)) byParents.set(key, { parents: ps, kids: [] });
    byParents.get(key).kids.push(id);
  }
  for (const { parents, kids } of byParents.values()) {
    const pd = parents.map((p) => { const q = positions.get(p); return { x: q.x + CARD_W / 2, y: q.y + CARD_H }; });
    const cd = kids.map((c) => { const q = positions.get(c); return { x: q.x + CARD_W / 2, y: q.y }; });
    const busY = (Math.max(...pd.map((d) => d.y)) + Math.min(...cd.map((d) => d.y))) / 2;
    buses.push({ ids: [...parents, ...kids], pd, cd, busY, lo: Math.min(...pd.map((d) => d.x), ...cd.map((d) => d.x)), hi: Math.max(...pd.map((d) => d.x), ...cd.map((d) => d.x)) });
  }
  return { positions, spouses, buses, width: Math.max(0, offsetX - GAP_X * 2), height: maxY };
}

/** A pan / pinch / wheel zoomable canvas of the whole tree. */
export class WholeTree {
  constructor(wrap, { onSelect }) {
    this.wrap = wrap; this.onSelect = onSelect;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'The whole family tree. Drag to move around, pinch or use the buttons to zoom, tap someone to see their card. The list view has the same people.');
    wrap.appendChild(this.canvas);
    this.scale = 1; this.panX = 0; this.panY = 0; this.fitted = false;
    this.data = null;
    this._wire();
    this._ro = new ResizeObserver(() => { this._size(); this.draw(); });
    this._ro.observe(wrap);
    this._theme = () => this.draw();
    document.addEventListener('kc-theme', this._theme);
  }
  destroy() { this._ro.disconnect(); document.removeEventListener('kc-theme', this._theme); }
  set(data) { this.data = data; this.layout = data.layout; if (!this.fitted) this.fit(); this.draw(); }
  _size() {
    const r = this.wrap.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.W = r.width; this.H = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
  }
  fit() {
    if (!this.layout || !this.layout.width) return;
    if (!this.W) this._size();
    const pw = this.layout.width + 40, ph = this.layout.height + 40;
    const s = Math.max(0.25, Math.min(1.4, Math.min(this.W / pw, this.H / ph)));
    this.scale = s; this.panX = (this.W - pw * s) / 2 + 20 * s; this.panY = (this.H - ph * s) / 2 + 20 * s;
    this.fitted = true;
  }
  centerOn(id) {
    const p = this.layout && this.layout.positions.get(id);
    if (!p) return;
    if (!this.W) this._size();
    this.scale = Math.max(this.scale, 0.8);
    this.panX = this.W / 2 - (p.x + CARD_W / 2) * this.scale;
    this.panY = this.H / 2 - (p.y + CARD_H / 2) * this.scale;
    this.fitted = true;
    this.draw();
  }
  zoom(f, cx, cy) {
    const ns = Math.max(0.25, Math.min(3, this.scale * f));
    if (cx == null) { cx = this.W / 2; cy = this.H / 2; }
    this.panX = cx - (cx - this.panX) * (ns / this.scale);
    this.panY = cy - (cy - this.panY) * (ns / this.scale);
    this.scale = ns; this.fitted = true; this.draw();
  }
  _wire() {
    const c = this.canvas, pts = new Map();
    let pinch = null, moved = false, downX = 0, downY = 0;
    c.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; downX = e.clientX; downY = e.clientY;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const r = c.getBoundingClientRect(); pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: this.scale, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top }; }
      else { try { c.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    });
    c.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const target = pinch.s * ((Math.hypot(a.x - b.x, a.y - b.y) || 1) / pinch.d);
        this.zoom(target / this.scale, pinch.cx, pinch.cy); moved = true;
      } else if (pts.size === 1) {
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        if (Math.abs(dx) + Math.abs(dy) > 0) { this.panX += dx; this.panY += dy; this.fitted = true; moved = moved || Math.hypot(e.clientX - downX, e.clientY - downY) > 6; this.draw(); }
      }
    });
    const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('click', (e) => {
      if (moved) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left - this.panX) / this.scale, y = (e.clientY - r.top - this.panY) / this.scale;
      for (const [id, p] of this.layout?.positions || []) {
        if (x >= p.x && x <= p.x + CARD_W && y >= p.y && y <= p.y + CARD_H) { this.onSelect(id); return; }
      }
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      if (e.ctrlKey || e.deltaMode !== 0) this.zoom(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.05)), e.clientX - r.left, e.clientY - r.top);
      else { this.panX -= e.deltaX; this.panY -= e.deltaY; this.fitted = true; this.draw(); }
    }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach((t) => c.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    c.addEventListener('touchmove', (e) => { if (e.touches.length >= 2) e.preventDefault(); }, { passive: false });
  }
  draw() {
    if (!this.layout || !this.W) { if (this.wrap.isConnected && !this.W) this._size(); if (!this.layout) return; }
    const ctx = this.canvas.getContext('2d');
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    const C = { card: v('--card'), card2: v('--card2'), line: v('--line'), ink: v('--ink'), mute: v('--mute'), glow: v('--glow'), wire: v('--wire'), coral: v('--coral'), bg2: v('--bg2') };
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.save();
    ctx.translate(this.panX, this.panY); ctx.scale(this.scale, this.scale);
    const { meId, selectedId, labels, people, hideYear } = this.data;
    const L = this.layout;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of L.spouses) {
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y); ctx.lineTo(s.x2, s.y); ctx.stroke();
    }
    for (const b of L.buses) {
      ctx.strokeStyle = C.wire; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(b.lo, b.busY); ctx.lineTo(b.hi, b.busY);
      for (const d of b.pd) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, b.busY); }
      for (const d of b.cd) { ctx.moveTo(d.x, b.busY); ctx.lineTo(d.x, d.y); }
      ctx.stroke();
    }
    const font = (w, s) => `${w} ${s}px Figtree, system-ui, sans-serif`;
    for (const [id, p] of L.positions) {
      const person = people.get(id); if (!person) continue;
      const isMe = id === meId, sel = id === selectedId;
      rr(ctx, p.x, p.y, CARD_W, CARD_H, 16);
      ctx.fillStyle = C.card; ctx.fill();
      ctx.lineWidth = sel || isMe ? 2.5 : 1; ctx.strokeStyle = sel ? C.coral : isMe ? C.glow : C.line; ctx.stroke();
      const r = 22, ax = p.x + 10 + r, ay = p.y + CARD_H / 2;
      ctx.save();
      ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(id); ctx.fill();
      if (person.deceased) { ctx.fillStyle = 'rgba(128,128,128,.55)'; ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.font = font(800, 15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initials(person), ax, ay + 1);
      if (person.linkedMemberUid) { ctx.lineWidth = 2.5; ctx.strokeStyle = C.glow; ctx.beginPath(); ctx.arc(ax, ay, r + 2.5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      const tx = p.x + 10 + r * 2 + 10, tw = CARD_W - (tx - p.x) - 8;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = font(800, 14); ctx.fillStyle = C.ink;
      const nameLines = wrap(ctx, displayName(person), tw, 2);
      const sub = isMe ? 'You' : (labels.get(id) || lifeYears(person, hideYear(person)) || '');
      ctx.font = font(700, 12);
      const subLines = sub ? wrap(ctx, sub, tw, nameLines.length > 1 ? 1 : 2) : [];
      const blockH = nameLines.length * 17 + (subLines.length ? 3 + subLines.length * 15 : 0);
      let ty = p.y + (CARD_H - blockH) / 2;
      ctx.font = font(800, 14); ctx.fillStyle = C.ink;
      for (const l of nameLines) { ctx.fillText(l, tx, ty); ty += 17; }
      if (subLines.length) { ty += 3; ctx.font = font(700, 12); ctx.fillStyle = (labels.get(id) || isMe) ? C.glow : C.mute; for (const l of subLines) { ctx.fillText(l, tx, ty); ty += 15; } }
    }
    ctx.restore();
  }
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, max, lines) {
  const words = String(text).split(/\s+/).filter(Boolean), out = [];
  let cur = '';
  const fit = (s) => { if (ctx.measureText(s).width <= max) return s; let t = s; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  for (let i = 0; i < words.length; i++) {
    const next = cur ? cur + ' ' + words[i] : words[i];
    if (ctx.measureText(next).width <= max) { cur = next; continue; }
    if (out.length === lines - 1) { out.push(fit([cur, ...words.slice(i)].filter(Boolean).join(' '))); return out; }
    if (cur) out.push(cur);
    cur = words[i];
  }
  if (cur) out.push(out.length === lines - 1 ? fit(cur) : cur);
  return out.slice(0, lines);
}
