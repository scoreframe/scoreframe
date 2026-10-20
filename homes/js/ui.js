// AgentSee UI kit: icons, theme, navigation (tabs + pushed pages), bottom
// sheets, toasts, form binding and the pieces every screen shares. The look
// follows ScoreFrame's new UI: mono eyebrow over a heavy uppercase title,
// lifted cards with a coloured edge, chips, and a floating pill nav with a
// raised centre button.
(function (G) {
  'use strict';
  const AG = G.AG, esc = AG.esc;
  const $ = (AG.$ = (s, r = document) => r.querySelector(s));

  // ---------- icons (24px, stroke) ----------
  const P = {
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2c2.2.7 3.5 2.8 3.5 5.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    userplus: '<circle cx="10" cy="8" r="4"/><path d="M2 21c0-4.4 3.6-7 8-7 1.6 0 3 .3 4.3.9M19 14v6M16 17h6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
    chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3.2" height="7" rx="1"/><rect x="10.4" y="5" width="3.2" height="13" rx="1"/><rect x="15.8" y="13" width="3.2" height="5" rx="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M5 3h3.5l2 5L8 9.5a11 11 0 0 0 6.5 6.5L16 13.5l5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    msg: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    note: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    dollar: '<path d="M12 2.5v19M16.5 6.5c-.9-1.2-2.6-2-4.5-2-2.6 0-4.4 1.3-4.4 3.3 0 4.6 9.4 2.4 9.4 7.2 0 2-2 3.5-4.9 3.5-2.3 0-4.2-.9-5.2-2.3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    flame: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.3 2 1.3 3 2.5 3.5C11 8 12 5 14.5 3c.3 3 2 4.5 3.3 6.3 1 1.4 1.7 3 1.7 5.2 0 3.8-3.5 6.5-7.5 6.5z"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h0M15.5 11h.5M8 15h1M12 15h0M15.5 15h.5M8 18.5h1M12 18.5h0M15.5 18.5h.5"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C10 8 7 7.5 7.5 5S11 5 12 8zm0 0c2 0 5-.5 4.5-3S13 5 12 8z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h5M7 11l2.5-2 2 1.5L15 8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    repeat: '<path d="M4 10a8 8 0 0 1 14-3.5L20 8M20 3.5V8h-4.5M20 14a8 8 0 0 1-14 3.5L4 16M4 20.5V16h4.5"/>',
    snooze: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M5 3 2.5 5.5M19 3l2.5 2.5"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16 7l2.5 2.5M18.5 4.5 21 7"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 19h14"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    sign: '<path d="M4 21V6M4 6h15v8H4"/><path d="M8 10h7"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  };
  AG.ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const ic = AG.ic;

  // ---------- theme ----------
  const media = G.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  AG.isDark = () => { const t = AG.db.settings.theme; return t === 'dark' || (t === 'system' && !!media && media.matches); };
  AG.applyTheme = () => {
    const dark = AG.isDark(), root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    const p = (AG.PALETTES[AG.db.settings.palette] || AG.PALETTES.harbor)[dark ? 'dark' : 'light'];
    for (const k in p) root.style.setProperty('--' + k, p[k]);
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = bg;
    try { G.Native && Native.theme && Native.theme(bg, !dark); } catch {}
  };
  media && media.addEventListener && media.addEventListener('change', () => AG.db && AG.applyTheme());

  // ---------- navigation ----------
  // Four tabs; pages push over the current tab and pop back to it.
  const S = (AG.S = { tab: 'clients', stack: [], scrolls: [], tabScroll: {}, ui: {} });
  AG.views = {};
  AG.acts = {};
  AG.cur = () => (S.stack.length ? S.stack[S.stack.length - 1] : { view: S.tab, params: {} });
  const view = () => $('#view');
  AG.go = (tab) => {
    if (S.tab === tab && !S.stack.length) { view().scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!S.stack.length) S.tabScroll[S.tab] = view().scrollTop;
    S.tab = tab;
    S.stack = [];
    S.scrolls = [];
    try { localStorage.setItem('ag.tab', tab); } catch {}
    render('tab');
  };
  AG.push = (v, params = {}) => {
    S.scrolls.push(view().scrollTop);
    S.stack.push({ view: v, params });
    render('push');
  };
  AG.replace = (v, params = {}) => {
    S.stack.pop();
    S.stack.push({ view: v, params });
    render('push');
  };
  AG.pop = () => {
    if (!S.stack.length) return false;
    const leaving = AG.cur(), lv = AG.views[leaving.view];
    if (lv && lv.leave) lv.leave(leaving.params);
    S.stack.pop();
    render('pop', S.scrolls.pop() || 0);
    return true;
  };
  /** Android back: close a sheet, then pop a page. false = let the OS handle it. */
  AG.back = () => {
    if (document.body.classList.contains('sheet-open')) { AG.closeSheet(); return true; }
    if (['present', 'sform'].includes(AG.cur().view)) { AG.toast('Tap Done to leave client view'); return true; } // the client can't back out into the book
    if (S.stack.length) return AG.pop();
    if (S.tab !== 'clients') { AG.go('clients'); return true; }
    return false;
  };
  AG.refresh = () => render('keep');
  function render(mode, restore = 0) {
    const el = view(), cur = AG.cur(), v = AG.views[cur.view];
    const keep = el.scrollTop;
    let html;
    try { html = v.render(cur.params || {}); } catch (e) {
      console.error(e);
      html = `${AG.pageHead({ eyebrow: 'Something went wrong', title: 'Oops' })}<div class="card sec"><p>${esc(e.message)}</p></div>`;
    }
    el.innerHTML = html;
    document.body.classList.toggle('nonav', !!v && v.nav === false);
    document.body.dataset.view = cur.view;
    if (mode === 'push' || mode === 'pop') {
      el.classList.remove('in', 'out');
      void el.offsetWidth;
      el.classList.add(mode === 'push' ? 'in' : 'out');
    }
    el.scrollTop = mode === 'keep' ? keep : mode === 'pop' ? restore : mode === 'tab' ? S.tabScroll[S.tab] || 0 : 0;
    if (v && v.after) v.after(el, cur.params || {});
    updateNav();
  }

  function buildNav() {
    const it = (tab, icon, label) => `<button class="it" data-act="tab" data-tab="${tab}">${ic(icon)}<span>${label}</span><b class="badge"></b></button>`;
    $('#nav').innerHTML = `<div class="bar">${it('clients', 'users', 'Clients')}${it('schedule', 'cal', 'Schedule')}<div class="gap"></div>${it('homes', 'house', 'Homes')}${it('pipeline', 'chart', 'Pipeline')}</div>
      <button class="go" data-act="plus" aria-label="New"><span>${ic('plus')}</span></button>`;
  }
  function updateNav() {
    document.querySelectorAll('#nav .it').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    const now = Date.now(), end = AG.day0(AG.addDays(now, 1));
    const due = AG.db.items.filter((i) => !i.done && (i.allDay ? i.at < end : i.at < end)).length;
    const b = $('#nav [data-tab=schedule] .badge');
    if (b) { b.textContent = due > 99 ? '99+' : due || ''; b.style.display = due ? '' : 'none'; }
  }
  AG.updateNav = updateNav;
  AG.acts.tab = (d) => { AG.buzz(6); AG.go(d.tab); };
  AG.acts.back = () => AG.pop();

  // ---------- sheets ----------
  const sheets = [];
  const sheetEl = () => $('#sheet');
  function drawSheet() {
    const top = sheets[sheets.length - 1];
    if (!top) return;
    let html;
    try { html = top.fn(); } catch (e) { console.error(e); html = `<p>${esc(e.message)}</p>`; }
    sheetEl().innerHTML = `<div class="grab"></div>${html}`;
    top.after && top.after(sheetEl());
  }
  /** fn() returns the sheet's HTML; it is called again on AG.sheetRefresh(). */
  AG.openSheet = (fn, opts = {}) => {
    if (!opts.stack) while (sheets.length) { const s = sheets.pop(); s.onClose && s.onClose(); }
    sheets.push({ fn, ...opts });
    drawSheet();
    sheetEl().scrollTop = 0;
    document.body.classList.add('sheet-open');
  };
  AG.sheetRefresh = () => { const el = sheetEl(), t = el.scrollTop; drawSheet(); el.scrollTop = t; };
  AG.closeSheet = (silent) => {
    const s = sheets.pop();
    if (s && s.onClose && !silent) s.onClose();
    if (sheets.length) { drawSheet(); return; }
    document.body.classList.remove('sheet-open');
    setTimeout(() => { if (!sheets.length) sheetEl().innerHTML = ''; }, 260);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };
  AG.sheetOpen = () => sheets.length > 0;
  AG.acts.closeSheet = () => AG.closeSheet();
  AG.sheetHead = (title, sub = '') => `<div class="sh-h"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><button class="rb sm" data-act="closeSheet" aria-label="Close">${ic('x')}</button></div>`;

  let confirmRes = null;
  AG.confirm = (title, body = '', ok = 'OK', danger = false) => new Promise((res) => {
    confirmRes = res;
    AG.openSheet(() => `${AG.sheetHead(esc(title))}${body ? `<p class="muted">${esc(body)}</p>` : ''}
      <div class="btns"><button class="btn ghost" data-act="closeSheet">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-act="confirmYes">${esc(ok)}</button></div>`,
    { stack: true, onClose: () => { const r = confirmRes; confirmRes = null; r && r(false); } });
  });
  AG.acts.confirmYes = () => { const r = confirmRes; confirmRes = null; AG.closeSheet(true); r && r(true); };

  /** A list of choices in a sheet; resolves with the picked value (or null). */
  let chooseRes = null;
  AG.choose = (title, options) => new Promise((res) => {
    chooseRes = res;
    AG.openSheet(() => `${AG.sheetHead(esc(title))}<div class="menu">${options.map((o, i) =>
      `<button class="mi ${o.danger ? 'danger' : ''}" data-act="chooseIt" data-i="${i}">${o.icon ? ic(o.icon) : ''}<span><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span></button>`).join('')}</div>`,
    { stack: true, onClose: () => { const r = chooseRes; chooseRes = null; r && r(null); } });
    AG._chooseOpts = options;
  });
  AG.acts.chooseIt = (d) => { const r = chooseRes; chooseRes = null; AG.closeSheet(true); r && r(AG._chooseOpts[+d.i].value); };

  // ---------- toast ----------
  let toastT = 0, toastUndo = null;
  AG.toast = (msg, undo) => {
    const t = $('#toast');
    toastUndo = undo || null;
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-act="undo">Undo</button>' : ''}`;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), undo ? 5000 : 2400);
  };
  AG.acts.undo = () => { const u = toastUndo; toastUndo = null; $('#toast').classList.remove('on'); if (u) { u(); AG.refresh(); AG.sheetOpen() && AG.sheetRefresh(); } };

  // ---------- events + forms ----------
  // Buttons carry data-act; inputs carry data-f (a key path) inside a
  // [data-form] host whose object is registered in AG.forms by the renderer.
  AG.forms = {};
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = AG.acts[el.dataset.act];
    if (!f) { console.warn('no action', el.dataset.act); return; }
    e.preventDefault();
    e.stopPropagation();
    try { f(el.dataset, el, e); } catch (err) { console.error(err); AG.toast('Error: ' + err.message); }
  });
  const formOf = (el) => { const host = el.closest('[data-form]'); return host ? AG.forms[host.dataset.form] : null; };
  function readField(el) {
    const t = el.dataset.t;
    if (el.type === 'checkbox') return el.checked;
    if (t === 'money' || t === 'num') return AG.parseNum(el.value);
    if (t === 'dt') return el.value ? new Date(el.value).getTime() : null;
    return el.value;
  }
  function onField(e) {
    const el = e.target;
    const k = el.dataset && el.dataset.f;
    if (!k) return;
    const form = formOf(el);
    if (!form) return;
    const v = readField(el);
    AG.setPath(form.obj, k, v);
    if (e.type === 'change' && el.dataset.t === 'money' && v != null) el.value = AG.money(v);
    if (form.change) form.change(k, v, e.type, el);
    if (form.save !== false) AG.save();
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
  const redraw = (el) => (el.closest('#sheet') ? AG.sheetRefresh() : AG.refresh());
  AG.acts.pick = (d, el) => {
    const form = formOf(el);
    if (!form) return;
    const cur = AG.getPath(form.obj, d.k);
    let v = d.n != null ? +d.n : d.v;
    if (d.multi) {
      const arr = Array.isArray(cur) ? cur.slice() : [];
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      v = arr;
    } else if (cur === v && !d.req) v = '';
    AG.setPath(form.obj, d.k, v);
    AG.buzz(5);
    if (form.change) form.change(d.k, v, 'pick', el);
    if (form.save !== false) AG.save();
    redraw(el);
  };
  AG.acts.rank = (d, el) => {
    const form = formOf(el);
    const arr = (AG.getPath(form.obj, d.k) || []).slice();
    const i = arr.indexOf(d.v);
    if (i >= 0) arr.splice(i, 1); else arr.push(d.v);
    AG.setPath(form.obj, d.k, arr);
    AG.buzz(6);
    if (form.change) form.change(d.k, arr, 'pick', el);
    AG.save();
    redraw(el);
  };
  AG.acts.rankUp = (d, el) => {
    const form = formOf(el);
    const arr = (AG.getPath(form.obj, d.k) || []).slice();
    const i = arr.indexOf(d.v);
    if (i > 0) { arr.splice(i, 1); arr.splice(i - 1, 0, d.v); }
    AG.setPath(form.obj, d.k, arr);
    AG.save();
    redraw(el);
  };
  AG.acts.lenderPick = (d, el) => {
    const form = formOf(el), p = AG.partner(d.id);
    if (!p) return;
    const on = form.obj.lenderId === p.id;
    form.obj.lenderId = on ? '' : p.id;
    form.obj.lender = on ? '' : `${p.name}${p.company ? ' — ' + p.company : ''}`;
    AG.save();
    redraw(el);
  };

  // Keyboard + safe areas from the native shells
  AG.kb = (px) => {
    document.documentElement.style.setProperty('--kb', (px | 0) + 'px');
    document.body.classList.toggle('kbopen', px > 0);
    if (px > 0) setTimeout(() => { const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) a.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
  };
  AG.insets = (top, bottom) => {
    const r = document.documentElement.style;
    r.setProperty('--sat', (top | 0) + 'px');
    r.setProperty('--sab', (bottom | 0) + 'px');
  };

  // ---------- fields ----------
  const attr = (k, v) => (v == null || v === '' ? '' : ` ${k}="${esc(v)}"`);
  /** One questionnaire / form field. q: {k, t, label, ph, tip, opts, half, third, cap, im} */
  AG.fld = (q, obj) => {
    const v = AG.getPath(obj, q.k);
    const lab = q.label ? `<label class="lab">${esc(q.label)}</label>` : '';
    const tip = q.tip ? `<div class="tip">${esc(q.tip)}</div>` : '';
    const common = `data-f="${q.k}"${attr('placeholder', q.ph)}${q.cap ? ' autocapitalize="words"' : ''}`;
    let ctl;
    switch (q.t) {
      case 'one': case 'many': case 'yn': {
        const opts = q.t === 'yn' ? ['Yes', 'No'] : q.opts;
        ctl = `<div class="chips wrap big">${opts.map((o) => {
          const on = q.t === 'many' ? Array.isArray(v) && v.includes(o) : v === o;
          return `<button class="chip ${on ? 'on' : ''}" data-act="pick" data-k="${q.k}" data-v="${esc(o)}"${q.t === 'many' ? ' data-multi="1"' : ''}>${on && q.t === 'many' ? ic('check', 'sm') : ''}${esc(o)}</button>`;
        }).join('')}</div>`;
        break;
      }
      case 'scale':
        ctl = `<div class="scale">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button class="${+v === n ? 'on' : ''} ${+v >= n ? 'fill' : ''}" data-act="pick" data-k="${q.k}" data-n="${n}">${n}</button>`).join('')}</div>`;
        break;
      case 'rank': {
        const arr = Array.isArray(v) ? v : [];
        const rest = q.opts.filter((o) => !arr.includes(o));
        ctl = `<div class="ranked">${arr.map((o, i) => `<div class="rk"><b>${i + 1}</b><span>${esc(o)}</span>
            ${i ? `<button class="mini" data-act="rankUp" data-k="${q.k}" data-v="${esc(o)}" aria-label="Move up">${ic('back', 'up')}</button>` : ''}
            <button class="mini" data-act="rank" data-k="${q.k}" data-v="${esc(o)}" aria-label="Remove">${ic('x')}</button></div>`).join('')}
          ${arr.length ? '' : '<div class="rk empty">Nothing ranked yet</div>'}</div>
          ${rest.length ? `<div class="chips wrap big">${rest.map((o) => `<button class="chip" data-act="rank" data-k="${q.k}" data-v="${esc(o)}">${ic('plus', 'sm')}${esc(o)}</button>`).join('')}</div>` : ''}`;
        break;
      }
      case 'area':
        ctl = `<textarea ${common} rows="${q.rows || 3}">${esc(v || '')}</textarea>`;
        break;
      case 'money':
        ctl = `<input ${common} data-t="money" inputmode="decimal" value="${esc(v != null && v !== '' ? AG.money(v) : '')}"${q.ph ? '' : ' placeholder="$"'}>`;
        break;
      case 'num':
        ctl = `<input ${common} data-t="num" inputmode="decimal" value="${esc(v ?? '')}">`;
        break;
      case 'date':
        ctl = `<input ${common} type="date" value="${esc(v || '')}">`;
        break;
      case 'dt':
        ctl = `<input ${common} data-t="dt" type="datetime-local" value="${v ? AG.ymd(v) + 'T' + AG.hm(v) : ''}">`;
        break;
      case 'tel':
        ctl = `<input ${common} type="tel" inputmode="tel" autocomplete="off" value="${esc(v || '')}">`;
        break;
      case 'email':
        ctl = `<input ${common} type="email" inputmode="email" autocapitalize="off" autocomplete="off" value="${esc(v || '')}">`;
        break;
      case 'lender': {
        const lenders = AG.db.partners.filter((p) => p.role === 'Lender');
        ctl = `<input ${common} value="${esc(v || '')}" placeholder="Name / company">` +
          (lenders.length ? `<div class="chips wrap">${lenders.map((p) => `<button class="chip ${obj.lenderId === p.id ? 'on' : ''}" data-act="lenderPick" data-id="${p.id}">${ic('brief', 'sm')}${esc(p.name)}</button>`).join('')}</div>` : '');
        break;
      }
      default:
        ctl = `<input ${common}${attr('inputmode', q.im)} value="${esc(v || '')}">`;
    }
    return `<div class="fld ${q.half ? 'half' : ''} ${q.third ? 'third' : ''}">${lab}${ctl}${tip}</div>`;
  };

  // ---------- shared pieces ----------
  AG.head = ({ eyebrow = '', title, right = '' }) =>
    `<header class="head"><div class="t"><div class="eyebrow">${eyebrow}</div><h1 class="title">${title}</h1></div><div class="hr">${right}</div></header>`;
  AG.pageHead = ({ eyebrow = '', title, right = '' }) =>
    `<header class="head page"><button class="rb" data-act="back" aria-label="Back">${ic('back')}</button><div class="t"><div class="eyebrow">${eyebrow}</div><h1 class="title">${title}</h1></div><div class="hr">${right}</div></header>`;
  AG.rb = (icon, act, data = '', label = '') => `<button class="rb" data-act="${act}" ${data} aria-label="${esc(label)}">${ic(icon)}</button>`;
  AG.sec = (title, body, right = '', cls = '') => `<section class="card sec ${cls}"><div class="sec-h"><h3>${title}</h3>${right}</div>${body}</section>`;
  AG.lnk = (label, act, data = '') => `<button class="lnk" data-act="${act}" ${data}>${label}</button>`;
  AG.empty = (icon, title, sub = '', actions = '') =>
    `<div class="empty">${ic(icon, 'big')}<h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}${actions}</div>`;
  AG.avatar = (c, cls = '') => {
    const t = AG.temp(c);
    return `<div class="av ${cls}" style="--h:${AG.hue(AG.cname(c))}">${esc(AG.initials(c))}${t === 'hot' && c.status === 'active' ? `<i class="hot">${ic('flame')}</i>` : ''}</div>`;
  };
  AG.ring = (n, cls = '') => {
    const r = 15, cir = 2 * Math.PI * r, f = Math.max(0, Math.min(100, n)) / 100;
    const tone = n >= 65 ? 'var(--ok)' : n >= 40 ? 'var(--amber)' : 'var(--mu)';
    return `<div class="ring ${cls}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="${r}" class="trk"/><circle cx="18" cy="18" r="${r}" style="stroke:${tone}" stroke-dasharray="${(cir * f).toFixed(1)} ${cir.toFixed(1)}" transform="rotate(-90 18 18)"/></svg><b>${n}</b></div>`;
  };
  AG.stars = (n, act = '', data = '') => `<span class="stars">${[1, 2, 3, 4, 5].map((i) =>
    act ? `<button data-act="${act}" ${data} data-n="${i}" class="${i <= n ? 'on' : ''}" aria-label="${i} stars">${ic('star')}</button>` : `<i class="${i <= n ? 'on' : ''}">${ic('star')}</i>`).join('')}</span>`;
  AG.tag = (text, cls = '') => `<span class="tag ${cls}">${esc(text)}</span>`;
  AG.sideTags = (c) => c.sides.map((s) => AG.tag(s === 'buy' ? 'BUY' : 'SELL', s)).join('');
  AG.kindIc = (kind) => `<span class="kic k-${kind}">${ic(AG.KINDS[kind]?.icon || 'check')}</span>`;
  AG.bar = (f, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%"></i></div>`;
  AG.thumb = (h, cls = '') => {
    const ph = h.photo && AG.photos[h.photo];
    if (ph) return `<div class="thumb ${cls}" style="background-image:url('${ph}')"></div>`;
    const hue = AG.hue(h.address || h.id);
    return `<div class="thumb ${cls} gen" style="--h:${hue}">${ic('house')}</div>`;
  };

  AG.itemRow = (i, o = {}) => {
    const now = Date.now(), c = i.clientId && AG.client(i.clientId);
    const late = AG.isOverdue(i, now);
    const time = i.allDay ? 'ALL DAY' : AG.fmtTime(i.at).replace(' ', '');
    const dn = AG.daysBetween(now, i.at);
    const day = o.day ? `<span>${esc(dn >= -1 && dn <= 1 ? AG.relDay(i.at, now) : dn > 1 && dn < 7 ? AG.WD[new Date(i.at).getDay()] : AG.fmtShort(i.at, now))}</span>` : '';
    const sub = [o.noClient ? '' : c ? AG.cname(c) : '', AG.KINDS[i.kind]?.label, i.repeat ? AG.REPEAT[i.repeat] : '', late && !o.day ? 'Overdue · ' + AG.relDay(i.at, now) : ''].filter(Boolean).join(' · ');
    return `<div class="irow ${late ? 'late' : ''} ${i.done ? 'done' : ''}" data-act="openItem" data-id="${i.id}">
      <div class="when"><b>${time}</b>${day}</div>${AG.kindIc(i.kind)}
      <div class="grow"><div class="t1">${esc(i.title)}</div>${sub ? `<div class="t2">${esc(sub)}</div>` : ''}</div>
      <button class="tick ${i.done ? 'on' : ''}" data-act="doneItem" data-id="${i.id}" aria-label="Done">${ic('check')}</button></div>`;
  };

  AG.clientRow = (c) => {
    const now = Date.now(), n = AG.nextItem(c);
    const side = c.sides[0], st = AG.stageOf(c, side);
    const late = n && AG.isOverdue(n, now), today = n && !late && AG.daysBetween(now, n.at) === 0;
    const edge = c.draft ? 'var(--amber)' : c.status !== 'active' ? 'var(--ln)' : late ? 'var(--red)' : today ? 'var(--ac)' : !n ? 'var(--amber)' : 'var(--ln)';
    const stages = c.sides.map((s) => AG.stageOf(c, s).short).join(' · ');
    const facts = c.sides.flatMap((s) => AG.facts(c, s)).slice(0, 3);
    let next;
    if (c.draft) next = `<span class="amber">Meeting not finished — tap to continue</span>`;
    else if (c.status === 'closed') next = `<span>Closed${c[side]?.closedAt ? ' ' + AG.ago(c[side].closedAt, now) : ''}</span>`;
    else if (c.status === 'nurture') next = `<span>Nurture${n ? ' · next ' + AG.relDay(n.at, now) : ''}</span>`;
    else if (c.status === 'lost') next = `<span>Not working together</span>`;
    else if (n) next = `<span class="${late ? 'red' : today ? 'acc' : ''}">${ic(late ? 'clock' : AG.KINDS[n.kind]?.icon || 'check', 'xs')} ${esc(n.title)} · ${esc(late ? 'overdue' : AG.when(n, now))}</span>`;
    else next = `<span class="amber">${ic('bell', 'xs')} No follow-up scheduled</span>`;
    return `<div class="card crow" data-act="${c.draft ? 'resumeIntake' : 'openClient'}" data-id="${c.id}">
      <span class="edge" style="background:${edge}"></span>${AG.avatar(c)}
      <div class="grow"><div class="r1"><b>${esc(AG.cname(c))}</b>${AG.sideTags(c)}</div>
        <div class="r2">${esc([stages, ...facts].join(' · '))}</div><div class="r3">${next}</div></div>
      ${c.status === 'active' && !c.draft ? AG.ring(AG.score(c)) : ''}</div>`;
  };

  AG.homeRow = (h, c) => {
    const st = AG.homeStatus(h);
    const m = c ? AG.match(c, h) : null;
    const who = h.clientIds.map(AG.client).filter(Boolean);
    const avg = Object.values(h.feedback || {}).map((f) => f.stars).filter(Boolean);
    const facts = [h.beds && `${h.beds} bd`, h.baths && `${h.baths} ba`, h.sqft && `${AG.num(h.sqft)} sqft`].filter(Boolean).join(' · ');
    return `<div class="card hrow" data-act="openHome" data-id="${h.id}">${AG.thumb(h)}
      <div class="grow"><div class="r1"><b class="price">${h.price ? AG.money(h.price) : '—'}</b>${AG.tag(st[1], 'st-' + st[0])}</div>
        <div class="addr">${esc(h.address || 'Untitled home')}</div>
        <div class="r2">${esc([h.city, facts].filter(Boolean).join(' · '))}</div>
        <div class="r3">${who.slice(0, 3).map((x) => `<span class="mini-av" style="--h:${AG.hue(AG.cname(x))}">${esc(AG.initials(x))}</span>`).join('')}
          ${avg.length ? AG.stars(Math.round(avg.reduce((a, b) => a + b, 0) / avg.length)) : ''}</div></div>
      ${m && m.score != null ? `<div class="match ${m.breakers.length ? 'bad' : m.score >= 75 ? 'good' : ''}"><b>${m.score}%</b><small>fit</small></div>` : ''}</div>`;
  };

  AG.build = () => { buildNav(); updateNav(); };
  AG.render = render;
})(window);
