// AgentSee core: dates, money, the store and its native save, the bridge,
// calculators, listing links, client rules, match scores and the reminder →
// notification plan. No DOM in this file, so Tools/test.mjs runs it in node.
(function (G) {
  'use strict';
  const AG = (G.AG = G.AG || {});
  const DAY = (AG.DAY = 864e5);
  const pad = (n) => String(n).padStart(2, '0');

  AG.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  AG.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  AG.clone = (o) => JSON.parse(JSON.stringify(o));
  AG.getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  AG.setPath = (o, p, v) => {
    const ks = p.split('.');
    let a = o;
    for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]] ??= {};
    a[ks[ks.length - 1]] = v;
  };
  AG.blank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

  // ---------- dates (all local time) ----------
  AG.day0 = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  AG.addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
  AG.addMonths = (t, n) => {
    const d = new Date(t), day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return d.getTime();
  };
  AG.at = (day, h, m = 0) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d.getTime(); };
  AG.ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  AG.fromYmd = (s) => {
    if (!s || !/^\d{4}-\d\d-\d\d/.test(s)) return null;
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  AG.hm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  AG.daysBetween = (a, b) => Math.round((AG.day0(b) - AG.day0(a)) / DAY);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  AG.WD = WD;
  AG.MON = MON;
  AG.fmtShort = (t, now = Date.now()) => {
    const d = new Date(t);
    const y = d.getFullYear() !== new Date(now).getFullYear() ? `, ${d.getFullYear()}` : '';
    return `${MON[d.getMonth()]} ${d.getDate()}${y}`;
  };
  /** A birthday is month + day only ("MM-DD"; older answers may be a full YYYY-MM-DD). → [month 1-12, day] or null. */
  AG.mdOf = (s) => {
    const m = /^(?:\d{4}-)?(\d\d)-(\d\d)$/.exec(String(s || '').trim());
    return m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31 ? [+m[1], +m[2]] : null;
  };
  AG.fmtMd = (s) => { const md = AG.mdOf(s); return md ? `${MON[md[0] - 1]} ${md[1]}` : ''; };
  /** The next time a month/day comes around, today or later. Feb 29 lands on Feb 28 in other years. */
  AG.nextMd = (s, now = Date.now()) => {
    const md = AG.mdOf(s);
    if (!md) return null;
    const on = (y) => new Date(y, md[0] - 1, Math.min(md[1], new Date(y, md[0], 0).getDate())).getTime();
    const y = new Date(now).getFullYear();
    return on(y) >= AG.day0(now) ? on(y) : on(y + 1);
  };
  /** US states + DC: [abbr, name]. Properties can be anywhere; Kansas / Missouri just have the most built-in rules. */
  AG.STATES = [['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']];
  const stRow = (v) => { const t = String(v || '').trim().toLowerCase(); return t ? AG.STATES.find(([a, n]) => a.toLowerCase() === t || n.toLowerCase() === t) : null; };
  AG.stName = (v) => (stRow(v) || [])[1] || '';
  AG.stAbbr = (v) => (stRow(v) || [])[0] || '';
  AG.fmtDay = (t, now) => `${WD[new Date(t).getDay()]}, ${AG.fmtShort(t, now)}`;
  AG.fmtTime = (t) => {
    const d = new Date(t);
    const h = d.getHours();
    return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  };
  AG.relDay = (t, now = Date.now()) => {
    const n = AG.daysBetween(now, t);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return WDL[new Date(t).getDay()];
    return AG.fmtDay(t, now);
  };
  AG.when = (i, now) => AG.relDay(i.at, now) + (i.allDay ? '' : ' · ' + AG.fmtTime(i.at));
  AG.ago = (t, now = Date.now()) => {
    const n = AG.daysBetween(t, now);
    if (n <= 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 45) return `${n} days ago`;
    if (n < 365) return `${Math.round(n / 30)} months ago`;
    return `${Math.round(n / 365)} yr ago`;
  };
  AG.countdown = (t, now = Date.now()) => {
    const n = AG.daysBetween(now, t);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  };

  // ---------- money + numbers ----------
  const trim = (x, d) => String(+x.toFixed(d));
  AG.money = (n, short) => {
    if (n == null || n === '' || isNaN(n)) return '';
    n = +n;
    const a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (short) {
      if (a >= 1e6) return `${sign}$${trim(a / 1e6, 2)}M`;
      if (a >= 1e4) return `${sign}$${trim(a / 1e3, a >= 1e5 ? 0 : 1)}k`;
    }
    return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
  };
  AG.parseNum = (s) => {
    if (typeof s === 'number') return isNaN(s) ? null : s;
    s = String(s ?? '').trim().toLowerCase().replace(/[$,\s%]/g, '');
    if (!s) return null;
    let mult = 1;
    if (s.endsWith('k')) { mult = 1e3; s = s.slice(0, -1); }
    else if (s.endsWith('m')) { mult = 1e6; s = s.slice(0, -1); }
    const v = parseFloat(s);
    return isNaN(v) ? null : Math.round(v * mult * 100) / 100;
  };
  AG.num = (n, d = 0) => (n == null || n === '' || isNaN(n) ? '' : (+n).toLocaleString('en-US', { maximumFractionDigits: d }));
  AG.fmtPhone = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    const x = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
    return x.length === 10 ? `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}` : p || '';
  };
  AG.digits = (p) => String(p || '').replace(/[^\d+]/g, '');

  // ---------- store ----------
  // The whole book lives in one JSON document ("db"); listing photos sit in a
  // second one ("photos") so the frequent save stays small. Native shells
  // write files (with rolling daily backups); a plain browser uses localStorage.
  AG.defaultSettings = () => ({
    agent: '', brokerage: '', agentPhone: '', agentEmail: '', license: '', reviewLink: '', area: '',
    commissionPct: 2.5, splitPct: 70, goal: 100000,
    theme: 'system', palette: 'harbor',
    mlsName: 'MLS', mlsPortal: '', mlsUrl: '',
    digestHour: 8, notify: true,
    rate: 6.5, downPct: 10, taxPct: 1.1, insYear: 1800, years: 30,
    sellCostPct: 6, costs: AG.defaultCosts(),
    deadlines: { emd: 3, insp: 10, appr: 21, fin: 30 },
    lock: false,
  });
  AG.fresh = () => ({
    v: 1, created: Date.now(), settings: AG.defaultSettings(),
    clients: [], homes: [], items: [], partners: [],
    templates: AG.clone(AG.DEFAULT_TEMPLATES || []), calc: {},
    me: {}, links: AG.clone(AG.DEFAULT_LINKS || []),
  });
  function migrate(db) {
    const def = AG.defaultSettings();
    db.settings = Object.assign(def, db.settings || {});
    db.settings.deadlines = Object.assign(AG.defaultSettings().deadlines, db.settings.deadlines || {});
    db.settings.costs = Object.assign(AG.defaultCosts(), db.settings.costs || {});
    for (const k of ['clients', 'homes', 'items', 'partners']) if (!Array.isArray(db[k])) db[k] = [];
    if (!Array.isArray(db.templates)) db.templates = AG.clone(AG.DEFAULT_TEMPLATES || []);
    // new built-in templates appear in older books too (unless removed on purpose)
    db.tplRemoved = db.tplRemoved || [];
    for (const t of AG.DEFAULT_TEMPLATES || []) if (!db.templates.some((x) => x.id === t.id) && !db.tplRemoved.includes(t.id)) db.templates.push(AG.clone(t));
    db.calc = db.calc || {};
    db.me = db.me || {};
    if (!Array.isArray(db.links)) db.links = AG.clone(AG.DEFAULT_LINKS || []);
    for (const c of db.clients) {
      c.q = c.q || {};
      c.sides = c.sides || ['buy'];
      c.done = c.done || {};
      c.custom = c.custom || [];
      c.log = c.log || [];
      c.ready = c.ready || {};
      for (const s of c.sides) c[s] = c[s] || { stage: 'lead' };
    }
    for (const h of db.homes) { h.clientIds = h.clientIds || []; h.feedback = h.feedback || {}; h.features = h.features || []; h.flags = h.flags || []; h.prices = h.prices || []; }
    db.v = 1;
    return db;
  }
  AG.migrate = migrate;

  const N = () => G.Native;
  AG.loadError = false;
  AG.load = () => {
    let raw = null, praw = null;
    try {
      if (G.__AG_FILES) { raw = G.__AG_FILES.db; praw = G.__AG_FILES.photos; }
      else if (N() && N().load) { raw = N().load('db'); praw = N().load('photos'); }
      else if (G.localStorage) { raw = localStorage.getItem('ag.db'); praw = localStorage.getItem('ag.photos'); }
    } catch (e) { console.error('load', e); }
    let db = null;
    if (raw) {
      try { db = JSON.parse(raw); } catch (e) {
        // Never overwrite a book we can't read: park it beside the backups first.
        console.error('db unreadable', e);
        AG.loadError = true;
        write('db-unreadable-' + Date.now(), raw);
      }
    }
    AG.db = migrate(db || AG.fresh());
    try { AG.photos = praw ? JSON.parse(praw) : {}; } catch { AG.photos = {}; }
  };
  function write(name, s) {
    try {
      if (N() && N().save) N().save(name, s);
      else if (G.localStorage) localStorage.setItem('ag.' + name, s);
    } catch (e) { console.error('save', name, e); }
  }
  let saveT = 0;
  AG.save = () => {
    AG.db.updated = Date.now();
    clearTimeout(saveT);
    saveT = setTimeout(AG.saveNow, 300);
  };
  AG.saveNow = () => {
    clearTimeout(saveT);
    saveT = 0;
    write('db', JSON.stringify(AG.db));
    AG.syncReminders();
  };
  AG.savePending = () => saveT !== 0;
  AG.savePhotos = () => write('photos', JSON.stringify(AG.photos));

  // ---------- bridge ----------
  AG.platform = () => { try { return N() && N().platform ? N().platform() : 'web'; } catch { return 'web'; } };
  AG.open = (url) => {
    if (!url) return;
    if (N() && N().open) N().open(url);
    else if (G.open) G.open(url, '_blank');
  };
  AG.call = (p) => AG.open('tel:' + AG.digits(p));
  AG.sms = (to, body = '') => {
    const list = [].concat(to).map(AG.digits).filter(Boolean).join(',');
    if (N() && N().sms) return N().sms(list, body);
    const sep = AG.platform() === 'ios' ? '&' : '?';
    AG.open(`sms:${list}${body ? sep + 'body=' + encodeURIComponent(body) : ''}`);
  };
  AG.mailto = ({ to = [], cc = [], bcc = [], subject = '', body = '' }) => {
    const qs = [];
    if (cc.length) qs.push('cc=' + cc.join(','));
    if (bcc.length) qs.push('bcc=' + bcc.join(','));
    if (subject) qs.push('subject=' + encodeURIComponent(subject));
    if (body) qs.push('body=' + encodeURIComponent(body));
    return `mailto:${[].concat(to).join(',')}${qs.length ? '?' + qs.join('&') : ''}`;
  };
  AG.email = (o) => AG.open(AG.mailto(o));
  AG.copy = (text) => {
    try {
      if (N() && N().copy) { N().copy(String(text)); return true; }
      if (G.navigator && navigator.clipboard) { navigator.clipboard.writeText(String(text)); return true; }
    } catch {}
    return false;
  };
  AG.buzz = (ms = 10) => { try { N() && N().buzz && N().buzz(ms); } catch {} };
  AG.share = (text, title = '') => {
    if (N() && N().share) return N().share(text, title);
    if (G.navigator && navigator.share) return navigator.share({ text, title }).catch(() => {});
    if (G.navigator && navigator.clipboard) navigator.clipboard.writeText(text);
  };
  AG.shareFile = (name, mime, text) => {
    if (N() && N().shareFile) return N().shareFile(name, mime, text);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
  };

  // ---------- places + links ----------
  AG.addrOf = (h) => [h.address, h.city, [h.state, h.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const ios = () => AG.platform() === 'ios';
  AG.mapUrl = (a) => ios() ? `https://maps.apple.com/?q=${encodeURIComponent(a)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
  AG.dirUrl = (a) => ios() ? `https://maps.apple.com/?daddr=${encodeURIComponent(a)}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`;
  /** Google Maps multi-stop route from where you are, in tour order. */
  AG.routeUrl = (stops) => {
    const s = stops.filter(Boolean);
    if (!s.length) return '';
    const dest = s[s.length - 1], mid = s.slice(0, -1);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` +
      (mid.length ? `&waypoints=${encodeURIComponent(mid.join('|'))}` : '') + '&travelmode=driving';
  };
  AG.zillowUrl = (a) => `https://www.zillow.com/homes/${encodeURI(a.replace(/,/g, '').replace(/\s+/g, '-'))}_rb/`;
  AG.webSearchUrl = (a) => `https://www.google.com/search?q=${encodeURIComponent(a)}`;
  AG.redfinUrl = (a) => AG.webSearchUrl(`site:redfin.com ${a}`);
  AG.mlsUrl = (h, s = AG.db.settings) => {
    if (!s.mlsUrl) return '';
    return s.mlsUrl
      .replace(/\{mls\}/gi, encodeURIComponent(h.mls || ''))
      .replace(/\{address\}/gi, encodeURIComponent(AG.addrOf(h)))
      .replace(/\{zip\}/gi, encodeURIComponent(h.zip || ''));
  };

  // A listing link pasted or shared from Zillow / Redfin / Realtor.com / Trulia
  // / Homes.com → the address it names. The sites don't put price or beds in
  // the URL, so those stay for the agent to fill in.
  const STRONG = new Set(('st street ave av avenue rd road dr drive ln lane ct court blvd boulevard way pl place cir circle ' +
    'ter terrace pkwy parkway hwy highway loop trl trail xing cv cove pt point sq square run row path pike walk aly').split(' '));
  const DIR = /^(n|s|e|w|ne|nw|se|sw)$/i;
  const UNIT = /^(apt|unit|ste|suite|lot|bldg|fl|#)$/i;
  const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Ne|Nw|Se|Sw)\b/g, (x) => x.toUpperCase()).replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (m, a, b) => a + b.toLowerCase())
    .replace(/\b(\d+)([a-z])\b/g, (m, a, b) => a + b.toUpperCase());
  function streetCity(tokens) {
    let end = -1;
    for (let i = 1; i < tokens.length - 1; i++) if (STRONG.has(tokens[i].toLowerCase())) end = i;
    if (end < 0) return { address: titleCase(tokens.join(' ')), city: '' };
    if (DIR.test(tokens[end + 1] || '') && end + 2 < tokens.length) end++;
    if (UNIT.test(tokens[end + 1] || '') && end + 3 <= tokens.length) end += 2;
    return { address: titleCase(tokens.slice(0, end + 1).join(' ')), city: titleCase(tokens.slice(end + 1).join(' ')) };
  }
  function slugAddress(slug) {
    const t = slug.split('-').filter(Boolean);
    let zip = '', state = '';
    // trailing listing ids (Trulia) come after the zip
    let z = -1;
    for (let i = t.length - 1; i > 0; i--) if (/^\d{5}$/.test(t[i]) && /^[a-z]{2}$/i.test(t[i - 1])) { z = i; break; }
    if (z > 0) { zip = t[z]; state = t[z - 1].toUpperCase(); t.length = z - 1; }
    else if (/^[a-z]{2}$/i.test(t[t.length - 1] || '')) { state = t.pop().toUpperCase(); }
    return { ...streetCity(t), state, zip };
  }
  AG.findUrl = (text) => (String(text || '').match(/https?:\/\/[^\s<>"']+/i) || [])[0] || '';
  AG.parseListing = (text) => {
    const url = AG.findUrl(text);
    if (!url) return null;
    let u;
    try { u = new URL(url); } catch { return null; }
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    const segs = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let out = { address: '', city: '', state: '', zip: '' }, source = host;
    try {
      if (host.endsWith('zillow.com')) {
        source = 'Zillow';
        const i = segs.indexOf('homedetails');
        if (i >= 0 && segs[i + 1]) out = slugAddress(segs[i + 1]);
      } else if (host.endsWith('redfin.com')) {
        source = 'Redfin';
        if (segs.length >= 3 && /^[A-Z]{2}$/i.test(segs[0])) {
          const t = segs[2].split('-');
          const zip = /^\d{5}$/.test(t[t.length - 1]) ? t.pop() : '';
          let address = titleCase(t.join(' '));
          const unit = segs.find((s) => /^unit-/i.test(s));
          if (unit) address += ' #' + unit.slice(5).toUpperCase();
          out = { address, city: titleCase(segs[1].replace(/-/g, ' ')), state: segs[0].toUpperCase(), zip };
        }
      } else if (host.endsWith('realtor.com')) {
        source = 'Realtor.com';
        const seg = segs.find((s) => s.includes('_'));
        if (seg) {
          const p = seg.split('_');
          out = { address: titleCase(p[0].replace(/-/g, ' ')), city: titleCase((p[1] || '').replace(/-/g, ' ')), state: (p[2] || '').toUpperCase(), zip: /^\d{5}$/.test(p[3] || '') ? p[3] : '' };
        }
      } else if (host.endsWith('trulia.com')) {
        source = 'Trulia';
        const seg = segs[segs.length - 1];
        if (seg) out = slugAddress(seg.replace(/--?\d{6,}$/, ''));
      } else if (host.endsWith('homes.com')) {
        source = 'Homes.com';
        const i = segs.indexOf('property');
        if (i >= 0 && segs[i + 1]) out = slugAddress(segs[i + 1]);
      }
    } catch (e) { console.warn('parseListing', e); }
    return { ...out, url, source };
  };

  // ---------- calculators ----------
  const pmt = (loan, ratePct, years) => {
    const r = ratePct / 100 / 12, n = years * 12;
    if (!loan || !n) return 0;
    return r ? (loan * r) / (1 - Math.pow(1 + r, -n)) : loan / n;
  };
  AG.calc = {
    payment({ price = 0, downPct = 20, rate = 6.5, years = 30, taxPct = 1.1, insYear = 1800, hoa = 0, pmiPct = 0.5 }) {
      const down = (price * downPct) / 100, loan = Math.max(0, price - down);
      const pi = pmt(loan, rate, years);
      const tax = (price * taxPct) / 100 / 12, ins = insYear / 12;
      const pmi = price && downPct < 20 ? (loan * pmiPct) / 100 / 12 : 0;
      return { down, loan, pi, tax, ins, hoa: +hoa || 0, pmi, total: pi + tax + ins + (+hoa || 0) + pmi };
    },
    // Highest price where the full payment fits both debt-to-income limits.
    afford({ income = 0, debts = 0, down = 0, rate = 6.5, years = 30, taxPct = 1.1, insYear = 1800, hoa = 0, front = 28, back = 36, pmiPct = 0.5 }) {
      const maxPay = Math.max(0, Math.min((income * front) / 100, (income * back) / 100 - debts));
      const r = rate / 100 / 12, n = years * 12;
      const k = r ? r / (1 - Math.pow(1 + r, -n)) : 1 / n, t = taxPct / 100 / 12, m = pmiPct / 100 / 12;
      const fixed = insYear / 12 + (+hoa || 0);
      let price = (maxPay - fixed + down * k) / (k + t);
      if (down < 0.2 * price) price = (maxPay - fixed + down * (k + m)) / (k + m + t);
      price = Math.max(down, price);
      const downPct = price ? (down / price) * 100 : 0;
      const p = AG.calc.payment({ price, downPct, rate, years, taxPct, insYear, hoa, pmiPct });
      return { maxPay, price, ...p };
    },
    // The listing fee and any buyer-agent offer are separate since the 2024 settlements:
    // offering buyer-agent compensation is the seller's choice.
    net({ price = 0, listPct = 2.5, buyerPct = 0, buyerFlat = 0, payoff = 0, payoff2 = 0, closingPct = 1.5, concessions = 0, repairs = 0, other = 0 }) {
      const listFee = (price * listPct) / 100, buyerFee = (price * buyerPct) / 100 + (+buyerFlat || 0), closing = (price * closingPct) / 100;
      const costs = listFee + buyerFee + closing + (+payoff || 0) + (+payoff2 || 0) + (+concessions || 0) + (+repairs || 0) + (+other || 0);
      return { listFee, buyerFee, commission: listFee + buyerFee, closing, costs, net: price - costs };
    },
    cash({ price = 0, downPct = 10, closingPct = 3, emd = 0, credits = 0, prepaids = 0, agentFee = 0 }) {
      const down = (price * downPct) / 100, closing = (price * closingPct) / 100;
      const total = down + closing + (+prepaids || 0) + (+agentFee || 0) - (+credits || 0);
      return { down, closing, total, atClose: total - (+emd || 0) };
    },
    commission({ price = 0, pct = 2.5, split = 70, referral = 0, fees = 0 }) {
      const gross = (price * pct) / 100, ref = (gross * referral) / 100;
      const agent = ((gross - ref) * split) / 100 - (+fees || 0);
      return { gross, ref, brokerage: gross - ref - ((gross - ref) * split) / 100, agent };
    },
  };

  // Full amortization: monthly rows + yearly roll-up, with optional extra principal and PMI
  // (charged while the balance is above 78% of the price, then it drops off).
  AG.amortize = ({ loan = 0, rate = 0, years = 30, extraMonthly = 0, extraYearly = 0, price = 0, downPct = 100, pmiPct = 0 }) => {
    const r = rate / 100 / 12, n = Math.round(years * 12), pay = pmt(loan, rate, years);
    const pmiMonthly = price && downPct < 20 ? (loan * pmiPct) / 100 / 12 : 0;
    let bal = loan, totalInterest = 0, totalPmi = 0, pmiEnd = pmiMonthly ? null : 0;
    const months = [], yrs = [];
    for (let m = 1; m <= n && bal > 0.005; m++) {
      const interest = bal * r;
      const extra = (+extraMonthly || 0) + (m % 12 === 0 ? +extraYearly || 0 : 0);
      const principal = Math.min(bal, pay - interest + extra);
      const pmi = pmiEnd === null ? pmiMonthly : 0;
      bal = Math.max(0, bal - principal);
      if (pmiEnd === null && bal <= price * 0.78) pmiEnd = m;
      totalInterest += interest;
      totalPmi += pmi;
      months.push({ m, interest, principal, pmi, bal });
      const y = Math.ceil(m / 12);
      const row = yrs[y - 1] || (yrs[y - 1] = { y, interest: 0, principal: 0, pmi: 0, bal: 0 });
      row.interest += interest; row.principal += principal; row.pmi += pmi; row.bal = bal;
    }
    return { payment: pay, months, years: yrs, totalInterest, totalPmi, payoffMonths: months.length, pmiEnd };
  };
  /** Buying points: cost, new rate, monthly saving and the months it takes to earn the cost back. */
  AG.calc.points = ({ loan = 0, rate = 6.5, years = 30, points = 1, perPoint = 0.25 }) => {
    const cost = (loan * points) / 100, newRate = Math.max(0, rate - points * perPoint);
    const save = pmt(loan, rate, years) - pmt(loan, newRate, years);
    return { cost, newRate, save, breakEven: save > 0 ? cost / save : Infinity };
  };

  // ---------- buyer's estimated expenses (worksheet) ----------
  // Mortgage insurance as % of the loan per year, by loan type — rough starting points to edit.
  AG.MI_PCT = { Conventional: 0.5, Jumbo: 0.5, FHA: 0.55, USDA: 0.35, VA: 0, Cash: 0 };
  /** Settings → Closing cost defaults. *Pct are % of the loan; the rest are dollars or months. */
  AG.defaultCosts = () => ({
    originationPct: 1, pointsPct: 0, lenderFees: 1000, creditReport: 60, appraisal: 650, floodCert: 15, taxService: 85,
    survey: 0, titleFee: 650, mortgageeTitlePct: 0.25, recording: 150,
    insMonths: 2, taxMonths: 3, hoaTransfer: 250, warranty: 0, inspWhole: 450, inspWDI: 100,
  });
  const PCT_KEY = { origination: 'originationPct', points: 'pointsPct', mortgageeTitle: 'mortgageeTitlePct' };
  /** A buyer's client loan type as a worksheet loan type. */
  AG.wsLoanType = (q = {}) => (q.payWith === 'Cash' ? 'Cash' : AG.WS_LOANS.includes(q.loanType) ? q.loanType : 'Conventional');
  /** A new worksheet option: price / down / loan from the caller, every other line from Settings. */
  AG.wsOption = (o = {}, s = AG.db.settings) => {
    const k = Object.assign(AG.defaultCosts(), s.costs || {});
    const price = +o.price || 0, loanType = o.loanType || 'Conventional';
    const down = loanType === 'Cash' ? price : +o.down || 0;
    const lines = {}, pct = {};
    for (const [, , list] of AG.WS_SECTIONS) for (const [key, , f = {}] of list) {
      if (f.pct) { pct[key] = +k[PCT_KEY[key]] || 0; lines[key] = null; } // null = % of the loan
      else if (!f.calc) lines[key] = f.other ? 0 : +(k[key] ?? 0) || 0;
    }
    if (!o.hoaMonthly) lines.hoaTransfer = 0;
    lines.brokerComm = Math.round(+o.brokerComm || 0);
    return {
      price, down, downPct: price ? Math.round((down / price) * 10000) / 100 : 0, loanType, rate: +(o.rate ?? s.rate), years: +(o.years ?? s.years),
      close: o.close || '', taxPct: +s.taxPct || 0, taxYear: null, insYear: +s.insYear || 0, insMonths: +k.insMonths || 0, taxMonths: +k.taxMonths || 0,
      hoaMonthly: +o.hoaMonthly || 0, hoaMonths: o.hoaMonthly ? 1 : 0, miPct: AG.MI_PCT[loanType] ?? 0.5,
      sellerPaid: +o.sellerPaid || 0, survey: '', labels: {}, pct, lines,
    };
  };
  /** Days of prepaid interest: closing day through the end of that month (15 when there's no date yet). */
  AG.prepaidDays = (closeYmd) => {
    const t = AG.fromYmd(closeYmd);
    if (!t) return 15;
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
  };
  const isSet = (v) => v != null && v !== '';
  /** Every line, section subtotals, the total due (down + costs − seller-paid) and the monthly payment. */
  AG.wsTotals = (o) => {
    const cash = o.loanType === 'Cash', price = +o.price || 0, down = cash ? price : Math.min(price, +o.down || 0);
    const loan = cash ? 0 : Math.max(0, price - down);
    const taxYear = isSet(o.taxYear) ? +o.taxYear : (price * (+o.taxPct || 0)) / 100, insYear = +o.insYear || 0;
    const days = AG.prepaidDays(o.close), daily = (loan * (+o.rate || 0)) / 100 / 365;
    const calc = {
      prepaidInterest: daily * days, insPremium: insYear, insEscrow: (insYear / 12) * (+o.insMonths || 0),
      taxEscrow: (taxYear / 12) * (+o.taxMonths || 0), hoaProration: (+o.hoaMonthly || 0) * (+o.hoaMonths || 0),
    };
    const lines = {}, auto = {}, subs = {};
    for (const [sec, , list] of AG.WS_SECTIONS) {
      subs[sec] = 0;
      for (const [k, , f = {}] of list) {
        let v;
        if (cash && f.loan) v = 0;
        else if (f.calc) v = calc[k];
        else if (f.pct) { auto[k] = (loan * (+(o.pct || {})[k] || 0)) / 100; v = isSet(o.lines[k]) ? +o.lines[k] : auto[k]; }
        else v = +(o.lines[k] || 0);
        lines[k] = v;
        subs[sec] += v;
      }
    }
    const total = Object.values(subs).reduce((x, y) => x + y, 0);
    const sellerPaid = Math.min(total, +o.sellerPaid || 0);
    const conv = /^(Conventional|Jumbo)$/.test(o.loanType);
    const mi = cash || (conv && down >= 0.2 * price) ? 0 : (loan * (+o.miPct || 0)) / 100 / 12;
    const pi = cash ? 0 : pmt(loan, +o.rate || 0, +o.years || 30);
    const monthly = { pi, tax: taxYear / 12, ins: insYear / 12, mi, hoa: +o.hoaMonthly || 0 };
    monthly.total = monthly.pi + monthly.tax + monthly.ins + monthly.mi + monthly.hoa;
    return { cash, price, down, loan, taxYear, insYear, days, daily, lines, auto, subs, total, sellerPaid, due: down + total - sellerPaid, monthly };
  };
  /** A worksheet option for a buying client (their numbers + Settings defaults). */
  AG.wsForClient = (c, price, extra = {}) => {
    const q = c.q || {}, s = AG.db.settings, deal = (c.buy && c.buy.deal) || {};
    const h = (extra.homeId || deal.homeId) && AG.home ? AG.home(extra.homeId || deal.homeId) : null;
    price = +(price || deal.price || (h && h.price) || q.budgetMax || q.preAmount || 0);
    const loanType = AG.wsLoanType(q);
    const down = loanType === 'Cash' ? price : isSet(q.down) ? Math.min(price, +q.down) : Math.round((price * s.downPct) / 100);
    // The part of the buyer agreement the seller isn't covering, when both numbers are known.
    let brokerComm = 0;
    const offered = h && h.comp === 'Offered' ? (+h.compPct || 0) : null;
    if (offered != null && (isSet(q.braPct) || isSet(q.braFlat))) {
      const agreed = isSet(q.braFlat) ? +q.braFlat : (price * +q.braPct) / 100;
      brokerComm = Math.max(0, agreed - (price * offered) / 100);
    }
    return AG.wsOption({ price, down, loanType, close: deal.close || '', hoaMonthly: h ? +h.hoa || 0 : 0, brokerComm, ...extra }, s);
  };

  // ---------- listing contract (KCRAR Exclusive Right to Sell, July 2024) ----------
  /** An answer as text, the way the questionnaire shows it. */
  AG.showVal = (q, v) => {
    if (AG.blank(v)) return '';
    if (Array.isArray(v)) return q.t === 'rank' ? v.map((x, i) => `${i + 1}. ${x}`).join('  ') : v.join(', ');
    if (q.t === 'money') return AG.money(v);
    if (q.t === 'date') return AG.fmtShort(AG.fromYmd(v));
    if (q.t === 'md') return AG.fmtMd(v);
    if (q.t === 'check') return v ? 'Yes' : '';
    if (q.t === 'scale') return `${v}/10`;
    if (q.t === 'tel') return AG.fmtPhone ? AG.fmtPhone(v) : String(v);
    return String(v);
  };
  /** What a seller's listing contract still needs, split by who supplies it, and the addenda / forms this deal needs. */
  AG.contractStatus = (c) => {
    // Follows the KCRAR (Kansas City) form; another state gets the same checklist with generic form names.
    const q = c.q || {}, b = AG.blank, kansas = q.sSt === 'Kansas', other = !b(q.sSt) && !kansas && q.sSt !== 'Missouri';
    const disclosure = kansas ? 'Real Estate Brokerage Relationships Brochure' : other ? `${q.sSt} agency disclosure` : 'Broker Disclosure Form';
    const need = (cond, label) => (cond ? [label] : []);
    const seller = [
      ...need(b(q.first) || b(q.last), 'Seller names'),
      ...need(b(q.marital), 'Marital status'),
      ...need(b(q.onTitle), 'Everyone on the deed (exact names)'),
      ...need(b(q.titleHow), 'How title is held (names, trust, LLC, estate)'),
      ...need(q.titleHow === 'A trust' && (b(q.trustName) || b(q.trustee)), 'Trust name and trustee(s)'),
      ...need(q.titleHow === 'A trust' && q.trustBank !== 'Has one', 'Bank account in the trust’s name (the proceeds are paid to the trust)'),
      ...need(b(q.addr) || b(q.city) || b(q.zip), 'Property address'),
      ...need(b(q.sSt), 'State'),
      ...need(b(q.sYear), 'Year built'),
      ...need(+q.payoff > 0 && b(q.lender1), 'Mortgage company'),
      ...need(+q.payoff2 > 0 && b(q.lender2), '2nd mortgage / HELOC lender'),
      ...need(b(q.insurer), 'Homeowner’s insurance company'),
      ...need(b(q.foreign), 'Whether any owner is a foreign person'),
    ];
    const terms = [
      ...need(b(q.legal), 'Legal description (or the Legal Description Addendum)'),
      ...need(b(q.propKind), 'Residential resale, new construction or land'),
      ...need(b(q.listPrice), 'List price'),
      ...need(b(q.listDate) || b(q.listExpires), 'Listing period (start and end)'),
      ...need(b(q.mlsStatus) || (q.mlsStatus === 'No showings until a date' && b(q.mlsActive)), 'MLS status / showing start date'),
      ...need(b(q.sign) || b(q.lockbox) || b(q.backups), 'Sign, lockbox and backup showings'),
      ...need(b(q.discloseWhy) || b(q.otherOffers), 'What you may disclose (reason for sale, other offers)'),
      ...need(['cSeller', 'cTB', 'cSub', ...(kansas ? [] : ['cDual']), 'cDesSeller', 'cDesBuyer'].some((k) => b(q[k])), 'Brokerage relationship consents'),
      ...need(b(q.listPct) && b(q.listFlat), 'Your compensation'),
      ...need(b(q.offerBuyerComp) || (q.offerBuyerComp === 'Yes' && b(q.compDisclose)), 'Buyer’s-agent compensation decision'),
      ...need(b(q.titleCo), 'Title company'),
      ...need(b(q.warranty), 'Home warranty decision'),
      ...need(b(q.sAgencyDate), `${disclosure.replace(/^Real Estate /, '')} given (date)`),
    ];
    const forms = [];
    const add = (name, why) => forms.push({ name, why });
    const land = q.propKind === 'Land' || q.sType === 'Land';
    if (!land && q.propKind !== 'New construction') add('Seller’s Disclosure and Condition of Property Addendum (Residential)', 'Residential resale');
    if (land || q.acreage === 'Yes') add('Seller’s Disclosure and Condition of Property Addendum (Land)', land ? 'Land' : 'Has acreage — used with the residential one');
    if (!b(q.sYear) && +q.sYear < 1978) add('Lead-Based Paint Disclosure Addendum', `Built ${q.sYear} (before 1978) — federally required`);
    if (b(q.sYear) && !land) add('Lead-Based Paint Disclosure Addendum — if built before 1978', 'Year built not entered yet');
    if (q.cTB === 'Yes') add('Transaction Broker Addendum', 'Signed if a transaction broker arrangement is used');
    if (q.cDual === 'Yes' && !kansas) add(other ? 'Dual agency consent (your state’s form)' : 'Disclosed Dual Agency Amendment', other ? 'If your state allows dual agency' : 'Signed if dual agency is used (Missouri only)');
    if (q.inetOptOut === 'Yes') add('Internet advertising Opt-Out form', 'They’re opting out of internet advertising');
    if (q.warranty === 'Buying one') add('Home warranty application', `${q.warrantyCo || 'Warranty company'}${q.warrantyMax ? ', up to ' + AG.money(q.warrantyMax) : ''}`);
    if (/trust|LLC|estate/i.test(q.titleHow || '')) add(q.titleHow === 'A trust' ? 'Trust papers or certificate of trust' : 'LLC / estate documents', 'Showing who can sign for the owner');
    if (q.foreign === 'Yes') add('FIRPTA — advise an attorney or accountant', 'An owner is a foreign person for tax purposes');
    if (b(q.sAgencyDate)) add(disclosure, kansas ? 'At the first practical opportunity' : other ? 'Check your state’s timing' : 'Before the listing is signed or personal / financial info is gathered');
    const total = seller.length + terms.length;
    return { seller, terms, forms, missing: total, kansas, other };
  };
  /** The listing details in the contract's order, for filling in the official form. */
  AG.contractText = (c) => {
    const q = c.q || {}, s = AG.db.settings, st = AG.contractStatus(c);
    const v = (x) => (AG.blank(x) ? '—' : x);
    const d = (ymd) => (ymd ? AG.fmtShort(AG.fromYmd(ymd)) : '—');
    const addr = [q.addr, q.city, [AG.stAbbr(q.sSt) || q.sSt, q.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const names = [[q.first, q.last].filter(Boolean).join(' '), q.partner].filter(Boolean).join(' & ');
    const yn = (x) => (x === 'Yes' ? 'Yes' : x === 'No' ? 'No' : '—');
    const L = [
      `LISTING CONTRACT DETAILS — ${addr || 'property'}`,
      `Seller(s): ${v(names)}${q.marital ? ` (${q.marital.toLowerCase()})` : ''}`,
      `Broker: ${v(s.brokerage)} · Licensee: ${v(s.agent)}`,
      `Property: ${v(addr)}`,
      `Legal description: ${v(q.legal)}`,
      `Listing period: ${d(q.listDate)} through ${d(q.listExpires)} (11:59 p.m.) · Price: ${q.listPrice ? AG.money(q.listPrice) : '—'}`,
      `MLS: ${q.mlsStatus === 'No showings until a date' ? `no showings until ${d(q.mlsActive)}` : q.mlsStatus ? 'active within 1 business day' : '—'}`,
      `Contract is for: ${v(q.propKind)}${q.acreage === 'Yes' ? ' (with acreage)' : ''}${q.sYear ? ` · built ${q.sYear}` : ''}`,
      '',
      `1. Internet advertising opt-out: ${yn(q.inetOptOut)} · Loans to get info on: ${[+q.payoff > 0 && `${q.lender1 || 'mortgage'} (~${AG.money(q.payoff)})`, +q.payoff2 > 0 && `${q.lender2 || '2nd / HELOC'} (~${AG.money(q.payoff2)})`].filter(Boolean).join(', ') || 'none'}`,
      `2. Sign: ${yn(q.sign)} · Lockbox: ${yn(q.lockbox)} · Earnest money retained if forfeited: ${+q.emdPct || 0}% · Backup showings: ${yn(q.backups)} · Insurance: ${v(q.insurer)}`,
      `4a. Reason for sale: ${q.discloseWhy === 'Yes' ? `may disclose — “${q.discloseWhyText || ''}”` : q.discloseWhy === 'No' ? 'do not disclose' : '—'}`,
      `4b. Other offers: ${q.otherOffers === 'Nothing' ? 'do not disclose' : q.otherOffers === 'That they exist' ? 'may disclose existence' : q.otherOffers ? 'may disclose existence and terms' : '—'}`,
      `9. Consents — seller agency: ${yn(q.cSeller)} · transaction broker: ${yn(q.cTB)} · subagency: ${yn(q.cSub)}${st.kansas ? '' : ` · dual agency: ${yn(q.cDual)}`} · designated agent for seller: ${yn(q.cDesSeller)} · for a buyer: ${yn(q.cDesBuyer)}`,
      `10a. Listing broker compensation: ${q.listFlat ? AG.money(q.listFlat) : q.listPct ? q.listPct + '% of the price' : '—'}${q.otherComp ? ` · other: ${q.otherComp}` : ''}`,
      `10b. Broker assisting buyer: ${q.offerBuyerComp === 'Yes' ? `seller is willing${q.buyerCompPct ? ` (${q.buyerCompPct}%)` : q.buyerCompFlat ? ` (${AG.money(q.buyerCompFlat)})` : ''} · ${q.compDisclose === 'Yes' ? 'authorizes' : q.compDisclose === 'No' ? 'does not authorize' : '—'} disclosing it` : q.offerBuyerComp === 'No' ? 'seller is not willing' : q.offerBuyerComp ? 'decide per offer' : '—'}`,
      `    Compensation is fully negotiable and not set by law.`,
      `10c. Protection period: ${+q.protection || 90} days`,
      `11. Title evidence through: ${v(q.titleCo)} · Vested in: ${v(q.onTitle)}${q.titleHow && q.titleHow !== 'In their names' ? ` (${q.titleHow.replace(/^An? /, '')})` : ''}`,
      ...(q.titleHow === 'A trust' ? [`    Trust: ${v(q.trustName)} · Trustee(s): ${v(q.trustee)} · Account in the trust’s name: ${v(q.trustBank)}`] : []),
      `12. Home warranty: ${q.warranty === 'Buying one' ? `up to ${q.warrantyMax ? AG.money(q.warrantyMax) : '$—'} from ${q.warrantyCo || '—'}` : q.warranty === 'Not buying' ? 'declined' : '—'}`,
      `13. Foreign person (FIRPTA): ${yn(q.foreign)}`,
      `16. Additional terms: ${v(q.addlTerms)}`,
      `Seller contact: ${v([q.mailAddr, AG.fmtPhone ? AG.fmtPhone(q.phone) : q.phone, q.email].filter(Boolean).join(' · '))}`,
    ];
    if (st.forms.length) L.push('', 'Addenda / forms:', ...st.forms.map((f) => `• ${f.name} — ${f.why}`));
    if (st.missing) L.push('', 'Still needed:', ...[...st.seller, ...st.terms].map((x) => `• ${x}`));
    return L.join('\n');
  };

  // ---------- answers a client sends back (no server: by email / text, pasted or shared in) ----------
  const b64e = (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach((x) => { bin += String.fromCharCode(x); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const b64d = (s) => { const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))); };
  /** Pack a client's answers into one copyable token (the trailing "." ends it, even if a mail app wraps it). */
  AG.encodeAnswers = (o) => 'AGS1.' + b64e(JSON.stringify({ v: 1, ...o })) + '.';
  /** Find and unpack answers in any pasted / shared text (an email, a text message). null if none. */
  AG.decodeAnswers = (text) => {
    // mail apps wrap long lines: re-join lines that are only token characters
    const m = String(text || '').replace(/\s+(?=[A-Za-z0-9_-]*\.?$)/gm, '').match(/AGS1\.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try { const o = JSON.parse(b64d(m[1])); return o && typeof o.q === 'object' ? o : null; } catch { return null; }
  };
  /** The seller questionnaire as plain numbered questions (for an email reply). */
  AG.sellerQsText = () => {
    let n = 0;
    return AG.SELLER_FORM.map((sec) => `${sec.title.toUpperCase()}\n` + sec.qs.filter((q) => !q.show && !['first', 'last', 'phone', 'email', 'pref'].includes(q.k))
      .map((q) => `${++n}. ${q.label}${q.opts && q.t !== 'yn' ? ` (${q.opts.join(' / ')})` : q.t === 'yn' ? ' (yes / no)' : ''}`).join('\n')).join('\n\n');
  };

  // What selling a home frees up: value minus selling costs and every loan against it.
  AG.saleProceeds = (q, s = AG.db.settings) => {
    const value = +q.expect || 0;
    if (!value) return null;
    const costPct = +(q.sellCostPct ?? s.sellCostPct ?? 6);
    const costs = (value * costPct) / 100, payoff = +q.payoff || 0, payoff2 = +q.payoff2 || 0;
    return { value, costPct, costs, payoff, payoff2, net: value - costs - payoff - payoff2 };
  };
  /** A buyer's cash picture at [price]: what they need (down + closing) against what they have —
   *  savings and gifts now, plus their home sale's proceeds, which only arrive when that sale closes. */
  AG.moneyPicture = (c, price) => {
    const q = c.q || {}, s = AG.db.settings;
    price = +(price || (c.buy && c.buy.deal && c.buy.deal.price) || q.budgetMax || q.preAmount || 0); // under contract → the real price
    if (!price) return null;
    const cash = q.payWith === 'Cash';
    const down = cash ? price : !AG.blank(q.down) ? +q.down : (price * s.downPct) / 100;
    const ws = AG.wsTotals(AG.wsForClient(c, price, { down, loanType: cash ? 'Cash' : AG.wsLoanType(q) }));
    const closing = ws.total, closingPct = Math.round((closing / price) * 1000) / 10;
    const needed = down + closing;
    const listing = AG.has(c, 'sell');
    const owns = q.living === 'Own a home' || listing;
    const plan = q.needSell || (listing ? 'Must sell first' : '');
    const sale = owns && plan !== 'Keeping it' ? AG.saleProceeds(q, s) : null;
    const proceeds = sale ? Math.max(0, sale.net) : 0;
    const savings = +q.savings || 0, gift = +q.gift || 0, now = savings + gift, total = now + proceeds;
    return {
      price, cash, down, downPct: (down / price) * 100, closingPct, closing, needed,
      savings, gift, sale, proceeds, plan, contingent: !!sale && plan === 'Must sell first', buyFirst: !!sale && plan === 'Can buy first',
      now, total, short: Math.max(0, needed - total), extra: Math.max(0, total - needed), shortNow: Math.max(0, needed - now),
    };
  };

  // ---------- clients ----------
  AG.client = (id) => AG.db.clients.find((c) => c.id === id);
  AG.home = (id) => AG.db.homes.find((h) => h.id === id);
  AG.item = (id) => AG.db.items.find((i) => i.id === id);
  AG.partner = (id) => AG.db.partners.find((p) => p.id === id);
  AG.has = (c, side) => c.sides.includes(side);
  /** The home a buyer bought: the deal's home once they've closed, else one marked Bought. */
  AG.boughtHome = (c) => {
    if (!AG.has(c, 'buy')) return null;
    const id = c.buy.stage === 'closed' && c.buy.deal && c.buy.deal.homeId;
    return (id && AG.home(id)) || AG.db.homes.find((h) => !h.listing && h.clientIds.includes(c.id) && h.status === 'bought') || null;
  };
  /** Where cards go. "Switch cards to the home they buy" (q.mailNew) moves them to the new home once they've bought it. */
  AG.mailTo = (c) => {
    const q = c.q || {}, h = AG.boughtHome(c);
    if (h && (q.mailNew || !q.mailAddr)) return { addr: AG.addrOf(h), home: h };
    return { addr: q.mailAddr || '', home: null };
  };
  AG.newClient = (sides) => {
    const c = { id: AG.uid(), sides: sides.slice(), q: {}, status: 'active', temp: '', created: Date.now(), updated: Date.now(), done: {}, custom: [], log: [], ready: {} };
    for (const s of sides) c[s] = { stage: 'lead' };
    return c;
  };
  AG.cname = (c) => {
    const q = c.q || {};
    const f = (q.first || '').trim(), l = (q.last || '').trim(), p = (q.partner || '').trim();
    if (!f && !l) return p || 'New client';
    if (!p) return [f, l].filter(Boolean).join(' ');
    const pp = p.split(/\s+/), pl = pp.slice(1).join(' ');
    if (!pl || pl.toLowerCase() === l.toLowerCase()) return `${f || l} & ${pp[0]}${l ? ' ' + l : ''}`;
    return `${[f, l].filter(Boolean).join(' ')} & ${p}`;
  };
  AG.firsts = (c) => {
    const q = c.q || {}, f = (q.first || '').trim(), p = (q.partner || '').trim().split(/\s+/)[0];
    return f && p ? `${f} & ${p}` : f || p || 'there';
  };
  AG.initials = (c) => {
    const q = c.q || {};
    return (((q.first || '')[0] || '') + ((q.last || q.partner || '')[0] || '')).toUpperCase() || '?';
  };
  AG.hue = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };
  AG.sideLabel = (c) => (c.sides.length === 2 ? 'Selling & buying' : c.sides[0] === 'buy' ? 'Buyer' : 'Seller');
  AG.stageOf = (c, side) => AG.STAGES[side].find((s) => s.id === c[side]?.stage) || AG.STAGES[side][0];
  AG.checklist = (c, side, stageId) => [
    ...(AG.CHECK[side][stageId] || []).map(([id, text, o]) => ({ id, text, ...(o || {}) })),
    ...c.custom.filter((x) => x.side === side && x.stage === stageId),
  ];
  AG.progress = (c, side, stageId) => {
    const l = AG.checklist(c, side, stageId);
    return { done: l.filter((x) => c.done[x.id]).length, total: l.length };
  };
  AG.nextStep = (c, side) => {
    const it = AG.checklist(c, side, AG.stageOf(c, side).id).find((x) => !c.done[x.id]);
    return it ? it.text : '';
  };
  AG.openItems = (clientId) => AG.db.items.filter((i) => !i.done && (!clientId || i.clientId === clientId)).sort((a, b) => a.at - b.at);
  AG.nextItem = (c) => AG.openItems(c.id)[0] || null;
  AG.isOverdue = (i, now = Date.now()) => !i.done && (i.allDay ? AG.day0(i.at) < AG.day0(now) : i.at < now);
  const CONTACT = new Set(['call', 'text', 'email', 'meet', 'showing']);
  AG.lastContact = (c) => c.log.reduce((m, l) => (CONTACT.has(l.kind) && l.ts > m ? l.ts : m), 0);
  AG.log = (c, kind, text, ts = Date.now()) => {
    c.log.unshift({ id: AG.uid(), ts, kind, text });
    c.log.sort((a, b) => b.ts - a.ts);
    c.updated = Date.now();
  };
  /** Active clients with nothing scheduled, or something overdue. */
  AG.needsFollowUp = (c, now = Date.now()) => {
    if (c.status !== 'active' || c.draft) return false;
    const n = AG.nextItem(c);
    return !n || AG.isOverdue(n, now);
  };

  // 0–100: how ready they are to transact (shown as the ring on each client)
  const TL = { ASAP: 30, '1–3 months': 26, '3–6 months': 16, '6–12 months': 8, '12+ months': 3, 'Just exploring': 0 };
  AG.readiness = (c, side) => {
    const q = c.q || {};
    const st = c[side]?.stage;
    if (st === 'contract' || st === 'closed') return 100;
    const mot = (n) => (n ? Math.min(10, +n) * 2 : 8);
    let s = 0;
    if (side === 'buy') {
      s += TL[q.moveBy] ?? 10;
      s += q.payWith === 'Cash' ? 25 : ({ Yes: 25, 'In progress': 12, 'Not yet': 0 }[q.preapproved] ?? 5);
      s += mot(q.motivation);
      s += { 'Signed today': 15, 'Before first showing': 8, 'Needs discussion': 2 }[q.bra] ?? 4;
      s += q.living === 'Own a home' ? ({ 'Must sell first': 2, 'Can buy first': 6, 'No — keeping it': 10 }[q.needSell] ?? 5) : 10;
    } else {
      s += TL[q.sellBy] ?? 10;
      s += mot(q.sMotivation);
      s += { 'Signed today': 25, 'Signing soon': 14, 'Not yet': 3 }[q.la] ?? 6;
      s += q.allAgree === 'Yes' ? 10 : q.allAgree === 'No' ? 0 : 5;
      s += { 'Move-in ready': 10, 'Needs a little work': 7, 'Needs major work': 4, 'Tear-down / land value': 5 }[q.cond] ?? 5;
      s += q.payoff != null || q.expect != null ? 5 : 2;
    }
    return Math.max(0, Math.min(100, Math.round(s)));
  };
  AG.score = (c) => Math.max(...c.sides.map((s) => AG.readiness(c, s)));
  AG.temp = (c) => c.temp || (AG.score(c) >= 65 ? 'hot' : AG.score(c) >= 40 ? 'warm' : 'cold');

  AG.facts = (c, side) => {
    const q = c.q || {}, out = [];
    if (side === 'buy') {
      if (q.payWith === 'Cash') out.push('Cash' + (q.budgetMax ? ' · up to ' + AG.money(q.budgetMax, true) : ''));
      else if (q.preapproved === 'Yes') out.push('Pre-approved' + (q.preAmount ? ' ' + AG.money(q.preAmount, true) : ''));
      else if (q.preapproved === 'In progress') out.push('Pre-approval in progress');
      else if (q.preapproved === 'Not yet') out.push('Not pre-approved');
      else if (q.budgetMax) out.push('Up to ' + AG.money(q.budgetMax, true));
      if (q.moveBy) out.push(q.moveBy);
    } else {
      if (q.addr) out.push(q.addr);
      const p = c.sell?.deal?.price || q.listPrice || q.expect;
      if (p) out.push(AG.money(p, true));
      if (!q.addr && q.sellBy) out.push(q.sellBy);
    }
    return out;
  };

  // ---------- deals + pipeline ----------
  AG.dealPrice = (c, side) => {
    const q = c.q || {}, d = c[side]?.deal || {};
    return +(d.price || (side === 'buy' ? q.budgetMax || q.preAmount : q.listPrice || q.expect) || 0);
  };
  AG.dealPct = (c, side) => +(c[side]?.deal?.pct || (side === 'sell' && c.q.listPct) || AG.db.settings.commissionPct || 0);
  AG.gci = (c, side) => (AG.dealPrice(c, side) * AG.dealPct(c, side)) / 100;
  AG.takeHome = (g) => (g * (+AG.db.settings.splitPct || 100)) / 100;
  /** Every side of every client as one deal row (the Pipeline tab). */
  AG.deals = () => {
    const out = [];
    for (const c of AG.db.clients) {
      if (c.draft) continue;
      for (const side of c.sides) {
        const st = AG.stageOf(c, side);
        out.push({ c, side, stage: st, price: AG.dealPrice(c, side), gci: AG.gci(c, side), p: st.p, closedAt: c[side].closedAt || 0, close: AG.fromYmd(c[side].deal?.close) });
      }
    }
    return out;
  };

  // ---------- reminders ----------
  AG.KINDS = {
    call: { label: 'Call', icon: 'phone' },
    text: { label: 'Text', icon: 'msg' },
    email: { label: 'Email', icon: 'mail' },
    meet: { label: 'Meeting', icon: 'users' },
    showing: { label: 'Showing', icon: 'house' },
    task: { label: 'To-do', icon: 'check' },
    deadline: { label: 'Deadline', icon: 'flag' },
    date: { label: 'Date', icon: 'gift' },
  };
  AG.REPEAT = { '': 'Once', week: 'Weekly', '2week': 'Every 2 weeks', month: 'Monthly', quarter: 'Every 3 months', year: 'Yearly' };
  AG.addItem = (o) => {
    const i = { id: AG.uid(), kind: 'task', title: '', at: Date.now(), allDay: false, created: Date.now(), ...o };
    AG.db.items.push(i);
    AG.save();
    return i;
  };
  AG.nextRepeat = (at, r, now = Date.now()) => {
    const step = (t) => (r === 'week' ? AG.addDays(t, 7) : r === '2week' ? AG.addDays(t, 14) : r === 'month' ? AG.addMonths(t, 1) : r === 'quarter' ? AG.addMonths(t, 3) : AG.addMonths(t, 12));
    let t = step(at);
    while (t <= now) t = step(t);
    return t;
  };
  /** Done: a one-off is closed; a repeating one moves to its next date. Returns an undo. */
  AG.complete = (i, now = Date.now()) => {
    const c = i.clientId && AG.client(i.clientId);
    if (c && CONTACT.has(i.kind)) AG.log(c, i.kind, i.title, now);
    else if (c) AG.log(c, 'done', i.title, now);
    const before = { at: i.at, done: i.done }, logId = c && c.log[0]?.id;
    if (i.repeat) i.at = AG.nextRepeat(i.at, i.repeat, now);
    else i.done = now;
    AG.save();
    return () => {
      i.at = before.at;
      i.done = before.done;
      if (c && logId) c.log = c.log.filter((l) => l.id !== logId);
      AG.save();
    };
  };
  /** Replace (or add) the open reminder a rule created under [key] for a client. */
  AG.upsertAuto = (clientId, key, o) => {
    const ex = AG.db.items.find((i) => i.clientId === clientId && i.auto === key && !i.done);
    if (ex) { Object.assign(ex, o); return ex; }
    return AG.addItem({ clientId, auto: key, ...o });
  };

  // What the phone should announce: timed reminders at their time, heads-ups
  // before deadlines, and a morning digest of each day's list. iOS keeps at
  // most 64 pending, so the plan is the next 60.
  AG.buildNotes = (db, now = Date.now()) => {
    const s = db.settings, out = [], horizon = now + 60 * DAY;
    if (s.notify === false) return out;
    const open = db.items.filter((i) => !i.done);
    const who = (i) => { const c = i.clientId && db.clients.find((x) => x.id === i.clientId); return c ? AG.cname(c) : ''; };
    const link = (i) => (i.clientId ? 'client:' + i.clientId : i.homeId ? 'home:' + i.homeId : 'schedule');
    for (const i of open) {
      if (!i.allDay && i.at > now && i.at < horizon)
        out.push({ id: 'i_' + i.id, at: i.at, title: i.title, body: [AG.KINDS[i.kind]?.label, who(i)].filter(Boolean).join(' · '), open: link(i) });
      if (i.warn && i.at < horizon + i.warn * DAY) {
        const w = AG.at(AG.addDays(AG.day0(i.at), -i.warn), s.digestHour);
        if (w > now && w < horizon) out.push({ id: 'w_' + i.id, at: w, title: `${i.title} — ${AG.countdown(i.at, w)}`, body: [who(i), AG.fmtDay(i.at)].filter(Boolean).join(' · '), open: link(i) });
      }
    }
    for (let d = 0; d < 21; d++) {
      const day = AG.addDays(AG.day0(now), d), at = AG.at(day, s.digestHour);
      if (at <= now) continue;
      const list = open.filter((i) => AG.day0(i.at) === day).sort((a, b) => a.at - b.at);
      const late = open.filter((i) => AG.day0(i.at) < day).length;
      if (!list.length && !late) continue;
      const title = list.length ? `${list.length} on your schedule today` : `${late} follow-up${late > 1 ? 's' : ''} overdue`;
      const body = list.slice(0, 3).map((i) => i.title).join(' · ') + (list.length > 3 ? ` +${list.length - 3} more` : '') + (list.length && late ? ` · ${late} overdue` : '');
      out.push({ id: 'd_' + AG.ymd(day), at, title, body, open: 'schedule' });
    }
    return out.sort((a, b) => a.at - b.at).slice(0, 60);
  };
  let lastPlan = '';
  AG.syncReminders = () => {
    if (!N() || !N().schedule || !AG.db) return;
    const plan = JSON.stringify(AG.buildNotes(AG.db));
    if (plan === lastPlan) return;
    lastPlan = plan;
    try { N().schedule(plan); } catch (e) { console.error('schedule', e); }
  };

  // The agent's own renewals (Me → My numbers) become dated reminders.
  AG.ME_DATES = [
    ['licenseExp', 'License renewal', 60], ['eoExp', 'E&O insurance renews', 30], ['ceDue', 'CE hours due', 60],
    ['duesDue', 'Association dues due', 21], ['mlsDuesDue', 'MLS dues due', 21], ['lockboxExp', 'Lockbox key renewal', 21],
    ['ethicsDue', 'NAR Code of Ethics training due', 60], ['duesPaidThru', 'REALTOR® dues run out', 30],
  ];
  AG.syncMeDates = () => {
    const me = AG.db.me || {};
    for (const [k, title, warn] of AG.ME_DATES) {
      const at = AG.fromYmd(me[k]);
      const ex = AG.db.items.find((i) => i.auto === 'me_' + k && !i.done);
      if (!at) { if (ex) AG.db.items = AG.db.items.filter((i) => i !== ex); continue; }
      if (ex) Object.assign(ex, { at, title });
      else AG.db.items.push({ id: AG.uid(), kind: 'deadline', title, at, allDay: true, warn, auto: 'me_' + k, created: Date.now() });
    }
  };

  // ---------- follow-up plans (AG.PLANS) ----------
  /** The reminders a plan would add for this client, from today. */
  AG.planSteps = (c, plan, now = Date.now()) => {
    const nm = AG.firsts(c);
    return plan.steps.filter((st) => !st.side || AG.has(c, st.side)).map((st) => {
      let at = AG.at(AG.addDays(AG.day0(now), st.d), st.h || 10);
      if (at < now) at = Math.min(AG.at(AG.addDays(AG.day0(now), st.d + 1), 9), now + 3600e3 * 2); // today's slot already passed
      return { kind: st.kind, title: st.title.replace('{nm}', nm), at, allDay: false, tpl: st.tpl || '' };
    });
  };
  /** Start a plan: adds its reminders (tagged with the run) and returns the run id. */
  AG.startPlan = (c, planId, now = Date.now()) => {
    const plan = AG.PLANS.find((p) => p.id === planId);
    if (!plan) return null;
    const run = AG.uid();
    for (const st of AG.planSteps(c, plan, now)) AG.db.items.push({ id: AG.uid(), clientId: c.id, created: now, plan: planId, planRun: run, ...st });
    (c.plans ||= []).push({ id: planId, run, at: now });
    AG.log(c, 'note', `Started follow-up plan: ${plan.name}`);
    AG.save();
    return run;
  };
  /** Stop a plan: its not-done reminders go away; done ones stay in the history. */
  AG.stopPlan = (c, run) => {
    const before = AG.db.items.length;
    AG.db.items = AG.db.items.filter((i) => !(i.planRun === run && !i.done));
    c.plans = (c.plans || []).filter((p) => p.run !== run);
    AG.save();
    return before - AG.db.items.length;
  };
  /** Plans running on a client: [{plan, run, done, total, next}] */
  AG.activePlans = (c) => (c.plans || []).map((p) => {
    const items = AG.db.items.filter((i) => i.planRun === p.run);
    const left = items.filter((i) => !i.done).sort((a, b) => a.at - b.at);
    return { plan: AG.PLANS.find((x) => x.id === p.id) || { name: p.id }, run: p.run, done: items.length - left.length, total: items.length, next: left[0] };
  }).filter((x) => x.total && x.done < x.total);

  // ---------- rules: what to suggest after a meeting ----------
  const CAD = { 'Every few days': 3, Weekly: 7, 'Every 2 weeks': 14, Monthly: 30, 'When something new comes up': 14, 'Twice a week': 3, 'After every showing': 7 };
  AG.cadenceDays = (c) => CAD[c.q.cadence] || CAD[c.q.sCadence] || ({ ASAP: 3, '1–3 months': 7, '3–6 months': 14 }[c.q.moveBy || c.q.sellBy] || 30);
  const repeatFor = (d) => (d >= 30 ? 'month' : d >= 14 ? '2week' : 'week');
  /** Suggested reminders for a client: [{key, kind, title, at, allDay, warn?, repeat?, tpl?}] */
  AG.suggest = (c, now = Date.now()) => {
    const q = c.q, out = [], nm = AG.firsts(c);
    const day = (n) => AG.addDays(AG.day0(now), n);
    const add = (key, kind, title, at, allDay = false, extra = {}) => { if (at) out.push({ key, kind, title, at, allDay, ...extra }); };
    const date = (s) => AG.fromYmd(s);
    const tonight = AG.at(day(0), 19);
    add('thanks', 'text', `Thank-you text to ${nm}`, now > AG.at(day(0), 20) ? AG.at(day(1), 9) : Math.max(tonight, now + 3600e3), false, { tpl: 'thanks' });
    if (AG.has(c, 'buy')) {
      if (q.payWith !== 'Cash' && q.preapproved !== 'Yes') add('lender', 'call', `Lender intro for ${nm}`, AG.at(day(1), 10), false, { tpl: 'lender' });
      if (q.bra !== 'Signed today') add('bra', 'task', `Buyer agreement with ${nm} (before first showing)`, AG.at(day(1), 11));
      add('listings', 'email', `Send ${nm} first listings`, AG.at(day(2), 10), false, { tpl: 'listings' });
      if (q.alerts === 'Yes') add('alerts', 'task', `Set up listing alerts for ${nm}`, Math.max(now + 3600e3, AG.at(day(0), 17)));
      if (q.preExpires) add('preexp', 'date', `${nm}’s pre-approval expires`, date(q.preExpires), true, { warn: 14 });
      if (q.leaseEnd) {
        add('lease', 'date', `${nm}’s lease ends`, date(q.leaseEnd), true);
        const t = AG.at(AG.addDays(date(q.leaseEnd), -90), 10);
        if (t > now) add('lease90', 'call', `Lease ends in 90 days — check in with ${nm}`, t);
      }
      if (q.moveDate) add('moveby', 'date', `${nm} must move by`, date(q.moveDate), true, { warn: 30 });
      if (q.braExpires) add('braexp', 'date', `Buyer agreement with ${nm} ends`, date(q.braExpires), true, { warn: 14 });
    }
    if (AG.has(c, 'sell')) {
      const where = q.addr || `${nm}’s home`;
      add('cma', 'task', `CMA for ${where}`, AG.at(day(1), 9));
      add('net', 'email', `Send ${nm} a net sheet`, AG.at(day(2), 10));
      if (q.la !== 'Signed today') add('la', 'call', `Listing agreement follow-up with ${nm}`, AG.at(day(3), 10));
      if (q.listDate) add('golive', 'deadline', `${where} goes live`, date(q.listDate), true, { warn: 7 });
      if (q.listExpires) add('laexp', 'date', `Listing agreement ends — ${where}`, date(q.listExpires), true, { warn: 21 });
      if (q.tenantEnd) add('tenant', 'date', `Tenant lease ends — ${where}`, date(q.tenantEnd), true);
      if (q.sellDate) add('sellby', 'date', `${nm} needs to be out`, date(q.sellDate), true, { warn: 30 });
    }
    const bday = AG.nextMd(q.birthday, now);
    if (bday) add('bday', 'date', `🎂 ${(q.first || nm)}’s birthday`, bday, true, { repeat: 'year', tpl: 'birthday', card: 'card_bday' });
    if (q.promised) add('promised', 'task', `Promised: ${String(q.promised).split('\n')[0].slice(0, 80)}`, AG.at(day(1), 9));
    const cd = AG.cadenceDays(c);
    add('touch', 'call', `Check in with ${nm}`, AG.at(day(cd), 10), false, { repeat: repeatFor(cd) });
    const have = new Set(AG.db.items.filter((i) => i.clientId === c.id && !i.done).map((i) => i.auto));
    return out.filter((x) => x.at > now - DAY && !have.has(x.key));
  };
  /** Checklist items a finished questionnaire already covers. */
  AG.headStart = (c) => {
    const q = c.q, ids = [];
    if (AG.has(c, 'buy')) {
      ids.push('b_call', 'b_sched', 'b_consult', 'b_needs', 'b_process');
      if (q.agency && q.agencyDate) ids.push('b_agency');
      if (q.braNegotiable !== 'Yes') ids.splice(ids.indexOf('b_process'), 1);
      if (q.bra === 'Signed today') ids.push('b_bra');
      if (q.preapproved === 'Yes' || q.payWith === 'Cash') ids.push('b_lender', 'b_preap');
      else if (q.preapproved === 'In progress') ids.push('b_lender');
      if (q.alerts === 'Yes') ids.push('b_search');
    }
    if (AG.has(c, 'sell')) {
      ids.push('s_call', 's_sched', 's_q');
      if (q.la === 'Signed today') ids.push('s_present', 's_la');
      if (q.sAgency && q.sAgencyDate) ids.push('s_agency');
      if (q.sNegotiable === 'Yes') ids.push('s_neg');
      if (q.offerBuyerComp === 'No' || q.offerBuyerComp === 'Decide per offer' || (q.offerBuyerComp === 'Yes' && q.buyerCompApproved)) ids.push('s_bcomp');
    }
    return ids;
  };
  AG.suggestStage = (c, side) => {
    const q = c.q;
    if (side === 'buy') return q.bra === 'Signed today' && (q.preapproved === 'Yes' || q.payWith === 'Cash') ? 'search' : 'consult';
    return q.la === 'Signed today' ? 'prep' : 'appt';
  };
  /** Contract → deadline reminders (replaced when the dates change). */
  AG.contractDates = (c, side, d) => {
    const base = AG.fromYmd(d.contract), close = AG.fromYmd(d.close), where = d.where || AG.cname(c);
    const made = [];
    const put = (key, title, at, warn) => { if (at) made.push(AG.upsertAuto(c.id, `${side}_${key}`, { kind: 'deadline', title, at, allDay: true, warn, side })); };
    if (base) {
      if (d.emd) put('emd', `Earnest money due — ${where}`, AG.addDays(base, +d.emd), 1);
      if (d.insp) put('insp', `Inspection deadline — ${where}`, AG.addDays(base, +d.insp), 2);
      if (d.appr) put('appr', `Appraisal deadline — ${where}`, AG.addDays(base, +d.appr), 3);
      if (d.fin) put('fin', `Financing deadline — ${where}`, AG.addDays(base, +d.fin), 3);
    }
    if (close) {
      put('walk', `Final walkthrough — ${where}`, AG.addDays(close, -1), 2);
      put('close', `🔑 Closing — ${where}`, close, 7);
    }
    AG.save();
    return made;
  };
  AG.afterClose = (c, side, now = Date.now()) => {
    const nm = AG.firsts(c), close = AG.fromYmd(c[side]?.deal?.close) || AG.day0(now);
    return [
      { key: side + '_gift', kind: 'task', title: `Congratulations card or closing gift for ${nm}`, at: AG.at(AG.addDays(AG.day0(now), 1), 10), allDay: false, tpl: 'congrats', card: 'card_congrats' },
      { key: side + '_review', kind: 'text', title: `Ask ${nm} for a review`, at: AG.at(AG.addDays(AG.day0(now), 7), 10), allDay: false, tpl: 'review' },
      { key: side + '_settle', kind: 'call', title: `Settling in? Call ${nm}`, at: AG.at(AG.addDays(close, 30), 10), allDay: false },
      { key: side + '_anniv', kind: 'date', title: `🏡 ${nm}’s home anniversary`, at: AG.addMonths(close, 12), allDay: true, repeat: 'year', tpl: 'anniv', card: 'card_anniv' },
    ].filter((x) => !AG.db.items.some((i) => i.clientId === c.id && i.auto === x.key && !i.done));
  };

  // ---------- compensation (2024 settlement rules) ----------
  /** What the buyer's agreement pays the agent on a home at [price], or null if not a set amount. */
  AG.braFee = (c, price) => {
    const q = c.q || {};
    if (q.braCompType === '% of price' && q.braPct) return (price * q.braPct) / 100;
    if (q.braCompType === 'Flat fee' && q.braFlat) return +q.braFlat;
    return null;
  };
  /** Compensation a home's seller offers buyer agents (null = unknown). */
  AG.homeComp = (h) => {
    if (h.comp === 'None offered') return 0;
    if (h.comp !== 'Offered') return null;
    return (h.compPct ? (h.price * h.compPct) / 100 : 0) + (+h.compFlat || 0);
  };
  AG.compLabel = (h) => (h.comp === 'Offered' ? [h.compPct && `${h.compPct}%`, h.compFlat && AG.money(h.compFlat)].filter(Boolean).join(' + ') || 'Offered' : h.comp === 'None offered' ? 'None offered' : 'Not known yet');
  /** Agreement fee vs. the seller's offer on one home: {fee, offered, gap} or null. */
  AG.compGap = (c, h) => {
    const fee = AG.braFee(c, +h.price || 0), offered = AG.homeComp(h);
    if (fee == null || offered == null || !h.price) return null;
    return { fee, offered, gap: Math.max(0, fee - offered) };
  };
  /** The line a buyer sees with a home: any offer of compensation, disclosed up front. */
  AG.compDisclosure = (h) => (h.comp === 'Offered' ? `Compensation offered to buyer’s agents on this home: ${AG.compLabel(h)}.` : h.comp === 'None offered' ? 'The seller isn’t offering compensation to buyer’s agents on this home.' : '');
  AG.braSigned = (c) => c.q.bra === 'Signed today' || !!c.done.b_bra;
  /** Words buyer agents and listing agents can't use since the settlements. */
  AG.lint = (text) => {
    const t = String(text || '').toLowerCase(), out = [];
    if (/\bfree\b|no cost to you|won[’']?t cost you|at no (cost|charge)|costs? you nothing|nothing out of pocket|seller pays (my|our|the|your agent)/.test(t))
      out.push('Buyer’s agents can’t say their services are free or that the seller pays, unless no one at all pays them (NAR settlement ¶58 vii).');
    if (/standard (commission|rate|fee)|usual (commission|rate)|commission is (always|typically)|everyone (charges|pays)/.test(t))
      out.push('Commissions aren’t set by law and are fully negotiable — avoid calling any rate standard (NAR settlement ¶58 ix).');
    return out;
  };

  // ---------- match: how well a home fits a buyer ----------
  // Never uses compensation offered to buyer agents: showing and ranking homes by the
  // buyer's own priorities only is a settlement requirement (¶51 v–vi).
  // Each criterion scores 0–1 when we know enough to judge it, and is left out
  // when we don't. The client's ranked priorities weigh more (top = heaviest).
  const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
  AG.match = (c, h) => {
    const q = c.q || {}, parts = [];
    const rank = Array.isArray(q.rank) ? q.rank : [];
    const w = (factor) => { const i = rank.indexOf(factor); return i < 0 ? 1 : 1 + (rank.length - i) * 1.5; };
    const add = (factor, label, fit, note) => { if (fit != null) parts.push({ factor, label, fit: Math.max(0, Math.min(1, fit)), w: w(factor), rank: rank.indexOf(factor) + 1, note }); };
    const max = +(q.budgetMax || q.preAmount || 0), min = +(q.budgetMin || 0), price = +(h.price || 0);
    if (price && max) {
      const over = price / max - 1;
      add('Price', 'Price', over <= 0 ? (min && price < min * 0.8 ? 0.7 : 1) : over <= 0.05 ? 0.6 : over <= 0.1 ? 0.3 : 0,
        over <= 0 ? `${AG.money(price, true)} is in budget` : `${Math.round(over * 100)}% over ${AG.money(max, true)}`);
    }
    const wantBeds = parseFloat(q.beds), wantBaths = parseFloat(q.baths);
    if (h.beds && wantBeds) add('Size & bedrooms', 'Bedrooms', h.beds >= wantBeds ? 1 : h.beds >= wantBeds - 1 ? 0.4 : 0, `${h.beds} bd (wants ${q.beds})`);
    if (h.baths && wantBaths) add('Size & bedrooms', 'Bathrooms', h.baths >= wantBaths ? 1 : h.baths >= wantBaths - 0.5 ? 0.6 : 0.2, `${h.baths} ba (wants ${q.baths})`);
    if (h.sqft && q.sqft) add('Size & bedrooms', 'Square feet', h.sqft >= q.sqft ? 1 : h.sqft >= q.sqft * 0.9 ? 0.6 : 0.2, `${AG.num(h.sqft)} sq ft (wants ${AG.num(q.sqft)}+)`);
    const areas = [q.areas, q.searchArea].filter(Boolean).join(' ').toLowerCase();
    if (areas && (h.city || h.zip || h.area)) {
      const hit = [h.city, h.zip, h.area].filter(Boolean).some((x) => areas.includes(String(x).toLowerCase()));
      add('Location', 'Area', hit ? 1 : 0.2, hit ? `${h.area || h.city || h.zip} is on their list` : `${h.city || h.zip} isn’t on their list`);
    }
    if (h.school) add('Schools', 'Schools', +h.school / 10, `School rating ${h.school}/10`);
    if (h.commute) add('Commute', 'Commute', h.commute <= 20 ? 1 : h.commute <= 35 ? 0.6 : 0.2, `${h.commute} min commute`);
    const gWant = { '1 car': 1, '2 car': 2, '3+ car': 3 }[q.garage];
    if (gWant && h.garage != null && h.garage !== '') add('Garage', 'Garage', +h.garage >= gWant ? 1 : +h.garage > 0 ? 0.4 : 0, `${h.garage || 'No'}-car garage`);
    if (h.condition) add('Move-in ready', 'Condition', { 'Move-in ready': 1, 'Needs updates': 0.5, 'Fixer-upper': 0.1 }[h.condition] ?? 0.5, h.condition);
    if (h.features.length || h.flags.length) {
      const yard = ['Yard', 'Fenced yard', 'Big lot'].some((f) => has(h.features, f));
      if (has(q.must, 'Yard') || has(q.must, 'Fenced yard') || has(q.must, 'Big lot') || rank.includes('Yard & lot')) add('Yard & lot', 'Yard', yard ? 1 : 0.2, yard ? 'Has the yard' : 'No yard noted');
      if (h.hoa != null && h.hoa !== '') add('Low HOA', 'HOA', !+h.hoa ? 1 : +h.hoa < 150 ? 0.7 : 0.3, +h.hoa ? `HOA ${AG.money(h.hoa)}/mo` : 'No HOA');
      if (has(h.flags, 'Busy road') || has(h.features, 'Quiet street')) add('Quiet & safe', 'Street', has(h.flags, 'Busy road') ? 0.1 : 1, has(h.flags, 'Busy road') ? 'Busy road' : 'Quiet street');
      const must = (q.must || []).filter((m) => !['Yard', 'Fenced yard', 'Big lot'].includes(m));
      if (must.length) {
        const got = must.filter((m) => has(h.features, m));
        add('Must-haves', 'Must-haves', got.length / must.length, `${got.length} of ${must.length} must-haves${must.length - got.length ? ' (missing ' + must.filter((m) => !has(h.features, m)).slice(0, 3).join(', ') + ')' : ''}`);
      }
    }
    const flags = new Set([...h.flags, ...(+h.hoa > 0 ? ['HOA'] : []), ...(has(h.features, 'Pool') ? ['Pool'] : [])]);
    const breakers = (q.dealbreakers || []).filter((d) => flags.has(d));
    if (!parts.length) return { score: null, parts, breakers };
    const tw = parts.reduce((a, p) => a + p.w, 0);
    let score = Math.round((parts.reduce((a, p) => a + p.w * p.fit, 0) / tw) * 100);
    if (breakers.length) score = Math.min(score, 35);
    return { score, parts: parts.sort((a, b) => b.w - a.w), breakers };
  };

  // ---------- searches built from what the buyer wants ----------
  AG.criteria = (c) => {
    const q = c.q || {}, bits = [];
    const lo = q.budgetMin, hi = q.budgetMax || q.preAmount;
    if (lo || hi) bits.push(`Price ${lo ? AG.money(lo, true) : 'any'}–${hi ? AG.money(hi, true) : 'any'}`);
    if (q.beds) bits.push(`${q.beds.replace('+', '')}+ beds`);
    if (q.baths) bits.push(`${q.baths.replace('+', '')}+ baths`);
    if (q.sqft) bits.push(`${AG.num(q.sqft)}+ sq ft`);
    if (q.garage && q.garage !== 'None ok') bits.push(`${q.garage} garage`);
    if (q.propType?.length) bits.push(q.propType.join(', '));
    if (q.searchArea || q.areas) bits.push(`Areas: ${[q.searchArea, q.areas].filter(Boolean).join('; ')}`);
    if (q.must?.length) bits.push(`Must have: ${q.must.join(', ')}`);
    if (q.dealbreakers?.length) bits.push(`Avoid: ${q.dealbreakers.join(', ')}`);
    if (q.rank?.length) bits.push(`Priorities: ${q.rank.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('  ')}`);
    return bits;
  };
  AG.searchAreas = (c) => String(c.q.searchArea || '').split(/[;\n]|\s\/\s/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  AG.searchLinks = (c, area) => {
    const q = c.q || {};
    const lo = +q.budgetMin || 0, hi = +(q.budgetMax || q.preAmount) || 0;
    const beds = parseInt(q.beds) || 0, baths = parseFloat(q.baths) || 0;
    const fs = {};
    if (lo || hi) fs.price = { ...(lo ? { min: lo } : {}), ...(hi ? { max: hi } : {}) };
    if (beds) fs.beds = { min: beds };
    if (baths) fs.baths = { min: baths };
    if (q.sqft) fs.sqft = { min: +q.sqft };
    const zs = { usersSearchTerm: area || '', filterState: fs, isListVisible: true, isMapVisible: true };
    const zillow = `https://www.zillow.com/homes/for_sale/${area ? encodeURI(area.replace(/,/g, '').replace(/\s+/g, '-')) + '_rb/' : ''}?searchQueryState=${encodeURIComponent(JSON.stringify(zs))}`;
    let loc = '';
    if (area) {
      const zip = area.match(/\b\d{5}\b/);
      const m = area.match(/^([^,]+),\s*([A-Za-z]{2})\b/);
      loc = zip ? zip[0] : m ? `${m[1].trim().replace(/\s+/g, '-')}_${m[2].toUpperCase()}` : area.trim().replace(/\s+/g, '-');
    }
    const rp = [beds && `beds-${beds}`, baths && `baths-${baths}`, (lo || hi) && `price-${lo || 'na'}-${hi || 'na'}`].filter(Boolean).join('/');
    const realtor = loc ? `https://www.realtor.com/realestateandhomes-search/${encodeURI(loc)}${rp ? '/' + rp : ''}` : '';
    const google = AG.webSearchUrl(`homes for sale ${area || ''} ${beds ? beds + ' bed' : ''} ${hi ? 'under ' + AG.money(hi, true) : ''}`.replace(/\s+/g, ' ').trim());
    // Redfin's search pages need its own region ids, except ZIP codes; otherwise search Redfin through Google.
    const zip = (area || '').match(/\b\d{5}\b/);
    const k = (n) => Math.round(n / 1000) + 'k';
    const rf = [lo && `min-price=${k(lo)}`, hi && `max-price=${k(hi)}`, beds && `min-beds=${beds}`, baths && `min-baths=${baths}`].filter(Boolean).join(',');
    const redfin = zip ? `https://www.redfin.com/zipcode/${zip[0]}${rf ? '/filter/' + rf : ''}` : AG.webSearchUrl(`site:redfin.com ${area || ''} homes for sale${beds ? ' ' + beds + ' beds' : ''}`.trim());
    return { zillow, realtor, redfin, google };
  };

  // ---------- message templates ----------
  AG.fill = (text, c, extra = {}) => {
    const s = AG.db.settings, q = c?.q || {};
    const goal = !c ? '' : c.sides.length === 2 ? 'sell your home and find the next one' : c.sides[0] === 'buy' ? 'find your next home' : 'sell your home';
    const home = extra.home || (c && AG.db.homes.find((h) => h.clientIds.includes(c.id) && h.listing)) || null;
    const lenderP = q.lenderId && AG.partner(q.lenderId);
    const map = {
      first: c ? AG.firsts(c) : 'there', name: c ? AG.cname(c) : '', last: q.last || '',
      agent: s.agent || 'your agent', brokerage: s.brokerage || '', agentPhone: AG.fmtPhone(s.agentPhone), agentEmail: s.agentEmail || '',
      address: extra.address || (home ? home.address : q.addr) || 'the home', goal,
      date: extra.date || '', lender: lenderP ? `${lenderP.name}${lenderP.company ? ' (' + lenderP.company + ')' : ''} ${AG.fmtPhone(lenderP.phone)}`.trim() : q.lender || 'my lender contact',
      reviewLink: s.reviewLink || '', link: extra.link || '', list: extra.list || '',
      comp: extra.home ? AG.compDisclosure(extra.home) : '',
      forAddress: extra.address ? ' for ' + extra.address : '',
    };
    return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m)).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };
})(typeof window !== 'undefined' ? window : globalThis);
