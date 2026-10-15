// The signed-in KinCamp website: family tree, people (birthdays, sizes,
// favorites), gift lists and account. Built for visitors (grandparents, aunts,
// uncles) first, and works for campers and leaders too. Everything is live
// (onSnapshot) and goes through the app's own Firestore rules and callables.
import {
  auth, db, call, busy, esc, toast, store, ensureUserDoc, onAuthStateChanged, signOut, plainError,
} from './fb.js';
import {
  doc, collection, onSnapshot, runTransaction, serverTimestamp, updateDoc, getDoc, setDoc, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import * as T from './tree.js';

const $view = document.getElementById('view');
const $sheet = document.getElementById('sheet');

// ---------------------------------------------------------------- icons ---
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  tree: '<circle cx="12" cy="5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M12 7.5V12M5.5 16V12h13v4"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.8-3.4 3.2-5 6-5s5.2 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.2 14.6c2.4-.2 4.1 1.3 4.8 4.4"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-1.5-3.5-5.5-4-5.5-1.5S10 8.5 12 8.5zM12 8.5c1.5-3.5 5.5-4 5.5-1.5S14 8.5 12 8.5z"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  cake: '<path d="M4 20.5h16M5 20.5v-7h14v7M5 16.5c2 1.3 3.5 1.3 5 0 1.5 1.3 3 1.3 4.5 0 1.5 1.3 3 1.3 4.5 0M12 13.5v-3M12 7.5c-1 0-1.5-.8-1.5-1.6S12 3.5 12 3.5s1.5 1.6 1.5 2.4-.5 1.6-1.5 1.6z"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
};
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

// ---------------------------------------------------------------- state ---
const S = {
  user: null, userDoc: null, userLoaded: false,
  campIds: [], camps: new Map(), myRoles: new Map(),
  campId: null, camp: null, campDenied: false,
  members: new Map(), membersLoaded: false,
  people: [], peopleById: new Map(), rels: [], peopleLoaded: false,
  lists: [], listsLoaded: false, items: new Map(), claims: new Map(), givers: new Map(),
  familyGifts: [], familyGiftsLoaded: false, familyState: null, myClaims: [], myClaimsLoaded: false,
  graph: null, labelsKey: '', labels: new Map(),
  treeMode: store.get('kc.treeMode') || 'close', focusId: null, search: '', peopleSearch: '',
  whole: null, wholeView: null, lastRouteKey: '',
};
const subs = { user: null, myClaims: null, camps: new Map(), camp: [], items: new Map(), claims: new Map(), givers: new Map() };

const normRole = (r) => (r === 'leader' || r === 'camper' ? r : 'visitor');
const myRole = () => normRole(S.members.get(S.user?.uid)?.role || S.myRoles.get(S.campId));
const ROLE_LABEL = { leader: 'Leader', camper: 'Camper', visitor: 'Visitor' };
const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v instanceof Date ? v : null);

// ------------------------------------------------------------- routing ---
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, ...rest] = h.split('/');
  return { view: view || 'home', arg: rest.map((x) => decodeURIComponent(x)) };
}
function go(hash, replace) {
  if (replace) history.replaceState(null, '', hash); else location.hash = hash;
  schedule();
}
window.addEventListener('hashchange', () => schedule());

let raf = 0;
function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; render(); });
}

// ------------------------------------------------------------- startup ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (S.deleted) return;
    const next = 'app' + (location.hash || '');
    location.replace('../signin/?next=' + encodeURIComponent(next));
    return;
  }
  if (S.user && S.user.uid === user.uid) return;
  S.user = user;
  await ensureUserDoc(user);
  subs.user && subs.user();
  subs.myClaims && subs.myClaims();
  // "My gifts to give": every claim and gift card I've made, in any camp (server-written).
  subs.myClaims = onSnapshot(collection(db, `users/${user.uid}/myClaims`), (snap) => {
    S.myClaims = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    S.myClaimsLoaded = true; schedule();
  }, (err) => { console.warn('myClaims', err); S.myClaimsLoaded = true; schedule(); });
  subs.user = onSnapshot(doc(db, 'users', user.uid), (snap) => {
    S.userDoc = snap.exists() ? snap.data() : {};
    S.userLoaded = true;
    const ids = Array.isArray(S.userDoc.campIds) ? S.userDoc.campIds : [];
    S.campIds = ids;
    syncCampDocs();
    chooseCamp();
    schedule();
  }, (err) => { console.warn('user doc', err); S.userLoaded = true; S.userError = true; schedule(); });
});

function syncCampDocs() {
  for (const [id, off] of subs.camps) if (!S.campIds.includes(id)) { off(); subs.camps.delete(id); S.camps.delete(id); }
  for (const id of S.campIds) {
    if (subs.camps.has(id)) continue;
    subs.camps.set(id, onSnapshot(doc(db, 'camps', id), (snap) => {
      if (snap.exists()) S.camps.set(id, { id, ...snap.data() }); else S.camps.delete(id);
      schedule();
    }, () => { S.camps.set(id, { id, denied: true }); schedule(); }));
    getDoc(doc(db, `camps/${id}/members/${S.user.uid}`)).then((m) => { if (m.exists()) S.myRoles.set(id, normRole(m.data().role)); schedule(); }).catch(() => {});
  }
}

function chooseCamp() {
  const ids = S.campIds;
  if (S.campId && ids.includes(S.campId)) return;
  if (S.campId && !ids.includes(S.campId)) setCamp(null);
  const params = new URLSearchParams(location.search);
  const asked = params.get('camp');
  if (asked) history.replaceState(null, '', location.pathname + location.hash);
  const saved = store.get('kc.camp.' + S.user.uid);
  const pick = (asked && ids.includes(asked) && asked) || (saved && ids.includes(saved) && saved) || (ids.length === 1 ? ids[0] : null);
  if (pick) setCamp(pick);
}

function setCamp(id) {
  subs.camp.forEach((off) => off()); subs.camp = [];
  for (const off of subs.items.values()) off(); subs.items.clear();
  for (const off of subs.claims.values()) off(); subs.claims.clear();
  for (const off of subs.givers.values()) off(); subs.givers.clear();
  Object.assign(S, {
    campId: id, camp: null, campDenied: false, members: new Map(), membersLoaded: false, people: [], peopleById: new Map(), rels: [],
    peopleLoaded: false, lists: [], listsLoaded: false, items: new Map(), claims: new Map(), givers: new Map(),
    familyGifts: [], familyGiftsLoaded: false, familyState: null, graph: null, labelsKey: '', focusId: null, wholeView: null,
  });
  if (!id) return;
  store.set('kc.camp.' + S.user.uid, id);
  const c = `camps/${id}`;
  const denied = (what) => (err) => {
    console.warn(what, err);
    if (err && err.code === 'permission-denied') S.campDenied = true;
    schedule();
  };
  subs.camp.push(onSnapshot(doc(db, c), (snap) => { S.camp = snap.exists() ? { id, ...snap.data() } : null; schedule(); }, denied('camp')));
  subs.camp.push(onSnapshot(collection(db, `${c}/members`), (snap) => {
    S.members = new Map(snap.docs.map((d) => [d.id, { uid: d.id, ...d.data() }]));
    S.membersLoaded = true; syncGiftListeners(); invalidateTree(); schedule();
  }, denied('members')));
  subs.camp.push(onSnapshot(collection(db, `${c}/people`), (snap) => {
    S.people = snap.docs.map((d) => normPerson(d.id, d.data())).filter(Boolean);
    S.peopleById = new Map(S.people.map((p) => [p.id, p]));
    S.peopleLoaded = true; invalidateTree(); schedule();
  }, denied('people')));
  subs.camp.push(onSnapshot(collection(db, `${c}/relationships`), (snap) => {
    S.rawRels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    invalidateTree(); schedule();
  }, denied('relationships')));
  subs.camp.push(onSnapshot(collection(db, `${c}/giftLists`), (snap) => {
    S.lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
    S.listsLoaded = true; syncGiftListeners(); schedule();
  }, denied('giftLists')));
  // Lists family in other connected camps share with this camp (server-written mirrors).
  subs.camp.push(onSnapshot(collection(db, `${c}/familyGifts`), (snap) => {
    S.familyGifts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.ownerFirstName || '').localeCompare(String(b.ownerFirstName || '')) || String(a.title || '').localeCompare(String(b.title || '')));
    S.familyGiftsLoaded = true; schedule();
  }, (e) => { console.warn('familyGifts', e); S.familyGiftsLoaded = true; schedule(); }));
  subs.camp.push(onSnapshot(doc(db, `${c}/family/state`), (snap) => {
    S.familyState = snap.exists() ? snap.data() : null; schedule();
  }, () => { S.familyState = null; }));
}

function normPerson(id, d) {
  if (d.deletedAt) return null;  // removed from the tree (restorable by leaders in the app)
  return {
    id,
    firstName: d.firstName || '', middleName: d.middleName || '', lastName: d.lastName || '',
    maidenName: d.maidenName || '', preferredName: d.preferredName || '', gender: d.gender || null,
    occupation: d.occupation || '', birthDate: toDate(d.birthDate), birthDateApprox: d.birthDateApprox || '',
    birthPlace: d.birthPlace || '', deathDate: toDate(d.deathDate), deathDateApprox: d.deathDateApprox || '',
    fpid: d.fpid || null, deathPlace: d.deathPlace || '', deceased: !!d.deceased, photoUrl: safeUrl(d.photoUrl), stories: d.stories || '',
    linkedMemberUid: d.linkedMemberUid || null, kind: d.kind === 'pet' ? 'pet' : 'person', ownerIds: d.ownerIds || [],
  };
}

function invalidateTree() {
  const ids = S.peopleById;
  S.rels = (S.rawRels || []).filter((r) => {
    const pair = r.kind === 'parentChild' ? [r.parentId, r.childId] : r.kind === 'spouse' ? [r.personAId, r.personBId] : [];
    return pair.length === 2 && pair.every((x) => ids.has(x));  // drop edges touching removed people
  }).map((r) => ({ id: r.id, kind: r.kind, parentId: r.parentId, childId: r.childId, personAId: r.personAId, personBId: r.personBId, endDate: r.endDate || null }));
  S.graph = T.buildGraph(S.people, S.rels);
  S.labelsKey = '';
}

function syncGiftListeners() {
  const c = `camps/${S.campId}`;
  const byId = new Map(S.lists.map((l) => [l.id, l]));
  // Claims and gift-card givers are hidden from a list's owner (rules), so don't ask for them there.
  const hidden = (id) => !byId.has(id) || byId.get(id).ownerUserId === S.user.uid;
  for (const [id, off] of subs.items) if (!byId.has(id)) { off(); subs.items.delete(id); S.items.delete(id); }
  for (const [id, off] of subs.claims) if (hidden(id)) { off(); subs.claims.delete(id); S.claims.delete(id); }
  for (const [id, off] of subs.givers) if (hidden(id)) { off(); subs.givers.delete(id); S.givers.delete(id); }
  for (const l of S.lists) {
    if (!subs.items.has(l.id)) {
      subs.items.set(l.id, onSnapshot(collection(db, `${c}/giftLists/${l.id}/items`), (snap) => {
        S.items.set(l.id, snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (toDate(a.createdAt)?.getTime() || Infinity) - (toDate(b.createdAt)?.getTime() || Infinity)));
        schedule();
      }, (e) => { console.warn('items', e); S.items.set(l.id, []); schedule(); }));
    }
    if (hidden(l.id)) continue;
    if (!subs.claims.has(l.id)) {
      subs.claims.set(l.id, onSnapshot(collection(db, `${c}/giftLists/${l.id}/claims`), (snap) => {
        S.claims.set(l.id, new Map(snap.docs.map((d) => [d.id, d.data()])));
        schedule();
      }, () => { S.claims.set(l.id, new Map()); schedule(); }));
    }
    if (!subs.givers.has(l.id)) {
      subs.givers.set(l.id, onSnapshot(collection(db, `${c}/giftLists/${l.id}/cardGivers`), (snap) => {
        S.givers.set(l.id, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        schedule();
      }, () => { S.givers.set(l.id, []); schedule(); }));
    }
  }
}

// --------------------------------------------------------- tree helpers ---
function meId() {
  const me = S.people.find((p) => p.linkedMemberUid === S.user.uid && p.kind !== 'pet');
  return me ? me.id : null;
}
function labels() {
  const self = meId();
  const key = `${self}|${S.people.length}|${S.rels.length}|${S.graph ? 1 : 0}|${S.peopleLoaded}`;
  if (S.labelsKey === key) return S.labels;
  S.labels = new Map();
  if (self && window.Kinship) {
    const g = window.Kinship.build(
      S.people.map((p) => ({ id: p.id, gender: p.gender || null, kind: p.kind })),
      S.rels.filter((r) => r.kind === 'parentChild').map((r) => [r.parentId, r.childId]),
      S.rels.filter((r) => r.kind === 'spouse').map((r) => [r.personAId, r.personBId, !!r.endDate]),
    );
    for (const [id, r] of window.Kinship.relativesOf(g, self)) S.labels.set(id, r.label);
  }
  S.labelsKey = key;
  return S.labels;
}
function relTo(id) {
  if (id === meId()) return 'You';
  return labels().get(id) || '';
}
function hidesYear(p) {
  return !!(p && p.linkedMemberUid && S.members.get(p.linkedMemberUid)?.hideBirthYear === true);
}
function defaultFocus() {
  const me = meId();
  if (me) return me;
  const saved = store.get('kc.focus.' + S.campId);
  if (saved && S.peopleById.has(saved)) return saved;
  // Not in the tree yet: start from the first leader who is, else the best-connected person.
  for (const m of S.members.values()) {
    if (normRole(m.role) !== 'leader') continue;
    const p = S.people.find((x) => x.linkedMemberUid === m.uid && x.kind !== 'pet');
    if (p) return p.id;
  }
  const g = S.graph;
  let best = null, score = -1;
  for (const p of g ? g.humans : []) {
    const s = g.parents(p.id).length + g.children(p.id).length + g.spouses(p.id).length;
    if (s > score) { best = p.id; score = s; }
  }
  return best;
}
function focusId() {
  if (S.focusId && S.peopleById.has(S.focusId)) return S.focusId;
  return defaultFocus();
}

function avatarHtml(p, cls = '') {
  if (!p) return `<span class="av ${cls}" aria-hidden="true">?</span>`;
  const gone = p.deceased ? ' gone' : '';
  const inner = p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(T.initials(p));
  return `<span class="av ${cls}${gone}" style="background:${T.colorFor(p.id)}" aria-hidden="true">${inner}</span>`;
}
function memberAvatar(m, cls = '') {
  const name = m?.displayName || '?';
  const url = safeUrl(m?.avatarUrl);
  const inner = url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
  return `<span class="av ${cls}" style="background:${T.colorFor(m?.uid || name)}" aria-hidden="true">${inner}</span>`;
}
function safeUrl(u) { return typeof u === 'string' && /^https:\/\//i.test(u) ? u : null; }
function safeLink(u) { return typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null; }

// ------------------------------------------------------------ birthdays ---
const MONTHS_LONG = { month: 'long', day: 'numeric', timeZone: 'UTC' };
function fmtMonthDay(d) { return d.toLocaleDateString(undefined, MONTHS_LONG); }
function fmtFull(d) { return d.toLocaleDateString(undefined, { ...MONTHS_LONG, year: 'numeric' }); }
function ageOn(d, at = new Date()) {
  let a = at.getFullYear() - d.getUTCFullYear();
  if (at.getMonth() < d.getUTCMonth() || (at.getMonth() === d.getUTCMonth() && at.getDate() < d.getUTCDate())) a -= 1;
  return a;
}
function nextBirthday(d) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let y = now.getFullYear();
  let t = Date.UTC(y, d.getUTCMonth(), d.getUTCDate());
  if (t < today) { y += 1; t = Date.UTC(y, d.getUTCMonth(), d.getUTCDate()); }
  return { days: Math.round((t - today) / 864e5), turning: y - d.getUTCFullYear(), when: new Date(t) };
}
/** Members' profile birthdays, plus living people in the tree with a full birth date. */
function upcomingBirthdays(limit) {
  const out = [], seenUids = new Set();
  for (const m of S.members.values()) {
    const b = toDate(m.birthday);
    if (!b) continue;
    seenUids.add(m.uid);
    const person = S.people.find((p) => p.linkedMemberUid === m.uid);
    out.push({ key: 'm' + m.uid, name: m.displayName || 'Someone', hide: m.hideBirthYear === true, date: b, href: `#people/${encodeURIComponent(m.uid)}`, avatar: person ? avatarHtml(person, 'sm') : memberAvatar(m, 'sm') });
  }
  for (const p of S.people) {
    if (p.kind === 'pet' || p.deceased || !p.birthDate) continue;
    if (p.linkedMemberUid && seenUids.has(p.linkedMemberUid)) continue;
    out.push({ key: 'p' + p.id, name: T.displayName(p), hide: hidesYear(p), date: p.birthDate, href: `#tree/p/${encodeURIComponent(p.id)}`, avatar: avatarHtml(p, 'sm') });
  }
  return out.map((x) => ({ ...x, ...nextBirthday(x.date) })).sort((a, b) => a.days - b.days).slice(0, limit);
}
function birthdayRow(b) {
  const when = b.days === 0 ? 'Today!' : b.days === 1 ? 'Tomorrow' : b.days < 7 ? b.when.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' }) : `In ${b.days} days`;
  const turning = b.hide ? '' : ` · turns ${b.turning}`;
  return `<a class="tap bday" href="${b.href}">
    <span class="when"><b>${b.when.getUTCDate()}</b><small>${b.when.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</small></span>
    ${b.avatar}
    <span class="grow"><span class="t">${esc(b.name)}</span><br><span class="s">${esc(when)}${esc(turning)}</span></span>
    ${icon('chev', 'chev')}</a>`;
}

// ---------------------------------------------------------------- render ---
const TABS = [
  { v: 'home', label: 'Home', icon: 'home' },
  { v: 'tree', label: 'Family tree', short: 'Tree', icon: 'tree' },
  { v: 'people', label: 'Birthdays & sizes', short: 'People', icon: 'people' },
  { v: 'gifts', label: 'Gift lists', short: 'Gifts', icon: 'gift' },
  { v: 'account', label: 'Account', short: 'Me', icon: 'user' },
];
function chrome(r, show) {
  const tabs = document.getElementById('tabs'), dock = document.getElementById('dock');
  tabs.hidden = dock.hidden = !show;
  if (!show) return;
  const cur = r.view === 'camps' ? 'account' : r.view;
  tabs.innerHTML = TABS.map((t) => `<a href="#${t.v}" class="${cur === t.v ? 'on' : ''}" ${cur === t.v ? 'aria-current="page"' : ''}>${icon(t.icon)}${esc(t.label)}</a>`).join('');
  dock.innerHTML = TABS.map((t) => `<a href="#${t.v}" class="${cur === t.v ? 'on' : ''}" ${cur === t.v ? 'aria-current="page"' : ''}>${icon(t.icon)}<span>${esc(t.short || t.label)}</span></a>`).join('');
  const cb = document.getElementById('campbtn');
  const name = S.camp?.name || S.camps.get(S.campId)?.name || '';
  cb.textContent = name ? `${name}${S.campIds.length > 1 ? ' ▾' : ''}` : '';
  cb.disabled = S.campIds.length < 2;
  cb.setAttribute('aria-label', S.campIds.length > 1 ? `${name}. Switch family camp` : name);
}
document.getElementById('campbtn').addEventListener('click', () => go('#camps'));

function render() {
  if (S.deleting || S.deleted) return;
  const r = route();
  const key = `${S.campId}|${r.view}|${r.view === 'tree' ? S.treeMode + '|' + focusIdSafe() : r.arg.join('/')}`;
  const same = key === S.lastRouteKey;
  const y = window.scrollY;
  const active = document.activeElement && document.activeElement.id && $view.contains(document.activeElement) ? document.activeElement : null;
  const activeId = active?.id, selStart = active?.selectionStart, selEnd = active?.selectionEnd;
  const treeBox = $view.querySelector('.treebox.closebox');
  const sx = treeBox ? treeBox.scrollLeft : null, sy = treeBox ? treeBox.scrollTop : null;
  S.lastRouteKey = key;

  if (!S.user || !S.userLoaded) { chrome(r, false); $view.innerHTML = loading('Opening your family…'); return; }
  if (S.userError) { chrome(r, false); $view.innerHTML = problem("We couldn't load your account. Check your connection and reload the page."); return; }
  if (!S.campIds.length) { chrome(r, false); $view.innerHTML = noCamp(); wireNoCamp(); closeSheet(); return; }
  if (!S.campId || r.view === 'camps') { chrome(r, !!S.campId); $view.innerHTML = campPicker(); wirePicker(); closeSheet(); if (!same) window.scrollTo(0, 0); return; }
  if (S.campDenied) { chrome(r, false); $view.innerHTML = problem("You don't seem to be part of this camp anymore. If that's a surprise, ask your family to invite you again.", true); wireNoCamp(); return; }
  chrome(r, true);
  document.title = `${({ home: 'Home', tree: 'Family tree', people: 'Birthdays & sizes', gifts: 'Gift lists', account: 'Account' })[r.view] || 'KinCamp'} · KinCamp`;

  if (r.view !== 'tree' && S.whole) { S.whole.destroy(); S.whole = null; }
  switch (r.view) {
    case 'tree': renderTree(r, same); break;
    case 'people': r.arg[0] ? renderMember(r.arg[0]) : renderPeople(); break;
    case 'gifts': r.arg[0] === 'f' ? renderFamilyList(r.arg[1]) : r.arg[0] ? renderList(r.arg[0]) : renderGifts(); break;
    case 'account': renderAccount(); break;
    default: renderHome();
  }
  if (r.view === 'tree' && r.arg[0] === 'p' && r.arg[1]) openPerson(r.arg[1]);
  else if (r.view === 'tree' && r.arg[0] === 'claim') { if (S.sheetKind !== 'claim') openClaim(); }
  else if (S.sheetKind && (S.sheetKind !== 'delete' || r.view !== 'account')) closeSheet();

  if (same) {
    window.scrollTo(0, y);
    const tb = $view.querySelector('.treebox.closebox');
    if (tb && sx != null) { tb.scrollLeft = sx; tb.scrollTop = sy; }
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) { el.focus({ preventScroll: true }); try { if (selStart != null) el.setSelectionRange(selStart, selEnd); } catch (e) { /* not text */ } }
    }
  } else {
    window.scrollTo(0, 0);
  }
}
function focusIdSafe() { try { return S.peopleLoaded ? focusId() : ''; } catch (e) { return ''; } }

const loading = (msg) => `<div class="loading" role="status"><span class="spin" aria-hidden="true"></span>${esc(msg)}</div>`;
function problem(msg, withJoin) {
  return `<div class="empty"><span class="ic" aria-hidden="true">⛺</span><b>Hmm.</b><p>${esc(msg)}</p>
    ${withJoin ? '<a class="btn p" href="../join/">I have an invite code</a><button class="btn" type="button" id="signout2">Sign out</button>' : '<button class="btn p" type="button" onclick="location.reload()">Reload</button>'}</div>`;
}

function noCamp() {
  return `<div class="empty" style="padding-top:48px"><span class="ic" aria-hidden="true">⛺</span>
    <b>You're not in a family camp yet</b>
    <p>KinCamp camps are private, so your family needs to invite you. Ask them for an invite link, or type the code they sent you.</p>
    <a class="btn p" href="../join/">I have an invite code</a>
    <button class="btn" type="button" id="signout2">Sign out</button>
    <p class="hint">Signed in as ${esc(S.user.email || S.user.phoneNumber || 'you')}</p></div>`;
}
function wireNoCamp() {
  const b = document.getElementById('signout2');
  if (b) b.onclick = () => busy(b, 'Signing out…', () => signOut(auth));
}

function campPicker() {
  const rows = S.campIds.map((id) => {
    const c = S.camps.get(id);
    const name = c?.name || (c?.denied ? 'A camp you left' : 'Loading…');
    const count = Array.isArray(c?.memberIds) ? c.memberIds.length : null;
    const role = S.myRoles.get(id);
    const closed = c?.archivedAt ? ' · closed' : '';
    return `<button class="tap" type="button" data-camp="${esc(id)}" ${c?.denied ? 'disabled' : ''}>
      <span class="av" style="background:${T.colorFor(id)}" aria-hidden="true">${esc((name[0] || '?').toUpperCase())}</span>
      <span class="grow"><span class="t">${esc(name)}</span><br><span class="s">${count != null ? `${count} ${count === 1 ? 'person' : 'people'}` : ''}${role ? ` · ${ROLE_LABEL[role]}` : ''}${closed}</span></span>
      ${id === S.campId ? '<span class="chip g">Open now</span>' : icon('chev', 'chev')}</button>`;
  }).join('');
  return `<h1 class="page-title">Which family?</h1>
    <p class="page-sub">You're part of more than one family camp. Pick one to open. You can switch anytime from the top of the page.</p>
    <div class="cards">${rows}</div>`;
}
function wirePicker() {
  $view.querySelectorAll('[data-camp]').forEach((b) => {
    b.onclick = () => { setCamp(b.dataset.camp); go('#home'); };
  });
}

// ------------------------------------------------------------------ home ---
function renderHome() {
  const me = S.members.get(S.user.uid);
  const first = String(me?.displayName || S.userDoc?.displayName || '').split(' ')[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const role = myRole();
  const nPeople = S.people.filter((p) => p.kind !== 'pet').length;
  const bdays = S.membersLoaded && S.peopleLoaded ? upcomingBirthdays(4) : [];
  const nLists = S.lists.length + S.familyGifts.length;
  $view.innerHTML = `
    <h1 class="page-title">${esc(hello)}${first ? `, ${esc(first)}` : ''}.</h1>
    <p class="page-sub">${role === 'visitor' ? `You're visiting <b>${esc(S.camp?.name || 'your family')}</b>. Here's everyone.` : `Welcome to <b>${esc(S.camp?.name || 'camp')}</b> on the web.`}</p>
    <div class="big">
      <a class="bigtile" href="#tree"><span class="ic" style="color:var(--glow)">${icon('tree')}</span><b>Family tree</b><span>${S.peopleLoaded ? `${nPeople} ${nPeople === 1 ? 'person' : 'people'} in the tree` : 'Loading…'}</span></a>
      <a class="bigtile" href="#people"><span class="ic" style="color:var(--sky)">${icon('cake')}</span><b>Birthdays &amp; sizes</b><span>Birthdays, sizes and favorite things</span></a>
      <a class="bigtile" href="#gifts"><span class="ic" style="color:var(--lav)">${icon('gift')}</span><b>Gift lists</b><span>${S.listsLoaded ? (nLists ? `${nLists} wish ${nLists === 1 ? 'list' : 'lists'}` : 'No lists yet') : 'Loading…'}</span></a>
    </div>
    <div class="sh"><h2>Coming up</h2><span class="c">Birthdays</span></div>
    ${!S.membersLoaded || !S.peopleLoaded ? loading('Loading birthdays…') : bdays.length ? `<div class="cards">${bdays.map(birthdayRow).join('')}</div>` : '<div class="card mute">No birthdays added yet. They show up here when your family adds them.</div>'}
  `;
}

// ------------------------------------------------------------------ tree ---
function renderTree(r, same) {
  if (!S.peopleLoaded || !S.membersLoaded) { $view.innerHTML = `<h1 class="page-title">Family tree</h1>${loading('Loading the family tree…')}`; return; }
  const humans = S.people.filter((p) => p.kind !== 'pet');
  if (!humans.length) {
    $view.innerHTML = `<h1 class="page-title">Family tree</h1><div class="empty"><span class="ic" aria-hidden="true">🌳</span><b>The tree is empty so far</b><p>When someone in your family adds people in the KinCamp app, they'll show up here.</p></div>`;
    return;
  }
  const F = focusId();
  const me = meId();
  const fp = S.peopleById.get(F);
  const mode = S.treeMode;
  const showFind = !me && S.members.has(S.user.uid);
  $view.innerHTML = `
    <h1 class="page-title">Family tree</h1>
    ${showFind ? `<div class="banner"><span class="grow"><b>Are you in the tree?</b><br><span class="mute">Find yourself, and everyone will show how they're related to you.</span></span><a class="btn p sm" href="#tree/claim">Find myself</a></div>` : ''}
    <div class="treebar">
      <div class="seg" role="tablist" aria-label="How to show the tree">
        <button type="button" role="tab" data-mode="close" aria-selected="${mode === 'close'}" class="${mode === 'close' ? 'on' : ''}">Close family</button>
        <button type="button" role="tab" data-mode="whole" aria-selected="${mode === 'whole'}" class="${mode === 'whole' ? 'on' : ''}">Whole tree</button>
        <button type="button" role="tab" data-mode="list" aria-selected="${mode === 'list'}" class="${mode === 'list' ? 'on' : ''}">List</button>
      </div>
      ${mode !== 'list' && me && F !== me ? `<button class="btn sm" type="button" id="backme">${icon('swap', 'gicon')}Back to me</button>` : ''}
    </div>
    ${mode === 'close' ? `<p class="treehint">${F === me ? 'Your close family.' : `${esc(T.firstName(fp))}'s close family.`} Tap anyone to see more.</p><div class="treebox closebox" id="treebox"></div>` : ''}
    ${mode === 'whole' ? `<div class="treebox wholewrap" id="wholewrap"><div class="zoom"><button type="button" id="zin" aria-label="Zoom in">+</button><button type="button" id="zout" aria-label="Zoom out">−</button><button type="button" id="zfit" aria-label="Fit the whole tree" style="font-size:15px">⤢</button></div></div><p class="treehint">Drag to move around, pinch or use + and − to zoom. Tap anyone to see more.</p>` : ''}
    ${mode === 'list' ? peopleListHtml() : ''}
  `;
  $view.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { S.treeMode = b.dataset.mode; store.set('kc.treeMode', S.treeMode); schedule(); });
  const bm = document.getElementById('backme');
  if (bm) bm.onclick = () => { S.focusId = me; store.set('kc.focus.' + S.campId, null); if (S.whole) S.whole.centerOn(me); schedule(); };
  if (mode === 'close') drawClose(F, same);
  if (mode === 'whole') drawWhole(F);
  if (mode === 'list') wirePeopleList();
}

function drawClose(F, same) {
  const box = document.getElementById('treebox');
  const L = T.closeLayout(S.graph, F);
  const sel = route().arg[0] === 'p' ? route().arg[1] : null;
  const me = meId();
  const nodes = L.nodes.map((n) => {
    const p = S.peopleById.get(n.id);
    const rel = relTo(n.id);
    const yrs = T.lifeYears(p, hidesYear(p));
    const pets = S.graph.pets(n.id).map((id) => S.peopleById.get(id)).filter(Boolean);
    const cls = ['node', n.focus ? 'focus' : '', p.linkedMemberUid ? 'user' : '', p.deceased ? 'gone' : '', sel === n.id ? 'sel' : ''].join(' ');
    const inner = p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(T.initials(p));
    const label = `${T.displayName(p)}${rel && rel !== 'You' ? `, your ${lowerFirst(rel)}` : rel === 'You' ? ', you' : ''}${yrs ? `, ${yrs}` : ''}`;
    return `<button type="button" class="${cls}" style="left:${n.x}px;top:${n.top}px" data-person="${esc(n.id)}" aria-label="${esc(label)}">
      <span class="nav2" style="background:${T.colorFor(n.id)}">${inner}${p.linkedMemberUid ? '<span class="kb" aria-hidden="true">K</span>' : ''}</span>
      <span class="nm">${esc(T.displayName(p))}</span>
      ${rel ? `<span class="rel">${esc(rel)}</span>` : ''}
      ${yrs ? `<span class="yrs">${esc(yrs)}</span>` : ''}
      ${pets.length ? `<span class="pets">${pets.map((x) => `<span>🐾 ${esc(T.firstName(x))}</span>`).join('')}</span>` : ''}
    </button>`;
  }).join('');
  const wires = L.wires.map((w) => `<path d="${w.d}" class="${sel && w.ids.includes(sel) && w.ids.includes(F) ? 'hot' : ''}"/>`).join('');
  const rows = L.rows.filter((x) => x.label).map((x) => `<span class="gen" style="top:${x.top}px">${esc(x.label)}</span>`).join('');
  box.innerHTML = `<div class="closefam" style="width:${L.width}px;height:${L.height}px">
    <svg class="wires" width="${L.width}" height="${L.height}" aria-hidden="true">${wires}</svg>${rows}${nodes}</div>`;
  box.querySelectorAll('[data-person]').forEach((b) => b.onclick = () => go(`#tree/p/${encodeURIComponent(b.dataset.person)}`));
  if (!same) {
    const fn = L.nodes.find((n) => n.focus);
    if (fn) box.scrollLeft = Math.max(0, fn.x - box.clientWidth / 2);
  }
  const extra = S.graph.humans.length - L.nodes.length;
  if (extra > 0) box.insertAdjacentHTML('afterend', `<p class="treehint">${extra} more ${extra === 1 ? 'person is' : 'people are'} in the whole tree. <a href="#" id="towhole">See the whole tree</a> or tap someone to see their family.</p>`);
  const tw = document.getElementById('towhole');
  if (tw) tw.onclick = (e) => { e.preventDefault(); S.treeMode = 'whole'; store.set('kc.treeMode', 'whole'); schedule(); };
}

function drawWhole(F) {
  const wrap = document.getElementById('wholewrap');
  const prev = S.whole;
  const view = prev ? { scale: prev.scale, panX: prev.panX, panY: prev.panY, fitted: prev.fitted } : S.wholeView;
  if (prev) prev.destroy();
  S.whole = new T.WholeTree(wrap, { onSelect: (id) => go(`#tree/p/${encodeURIComponent(id)}`) });
  if (view) Object.assign(S.whole, view);
  const sel = route().arg[0] === 'p' ? route().arg[1] : null;
  S.whole.set({ layout: T.wholeLayout(S.graph, F), meId: meId(), selectedId: sel, labels: labels(), people: S.peopleById, hideYear: hidesYear });
  // A big tree fitted to a phone is too small to read: start on the focus person instead.
  if (!view && S.whole.scale < 0.55) S.whole.centerOn(F);
  S.wholeView = { scale: S.whole.scale, panX: S.whole.panX, panY: S.whole.panY, fitted: S.whole.fitted };
  document.getElementById('zin').onclick = () => S.whole.zoom(1.25);
  document.getElementById('zout').onclick = () => S.whole.zoom(1 / 1.25);
  document.getElementById('zfit').onclick = () => { S.whole.fit(); S.whole.draw(); };
}

function peopleListHtml() {
  return `<div class="search" style="margin:4px 0 12px">${icon('search')}<label class="sr" for="treesearch">Search the family tree</label>
    <input class="input" id="treesearch" type="search" placeholder="Search by name" value="${esc(S.search)}" autocomplete="off"></div>
    <div class="cards" id="treelist">${treeListRows()}</div>`;
}
function treeListRows() {
  const q = S.search.trim().toLowerCase();
  const list = S.people.filter((p) => p.kind !== 'pet')
    .filter((p) => !q || [T.displayName(p), p.firstName, p.lastName, p.maidenName, p.middleName].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || T.displayName(a).localeCompare(T.displayName(b)));
  if (!list.length) return '<div class="card mute">Nobody matches that name.</div>';
  return list.map((p) => {
    const rel = relTo(p.id);
    const yrs = T.lifeYears(p, hidesYear(p));
    return `<a class="tap" href="#tree/p/${encodeURIComponent(p.id)}">${avatarHtml(p)}
      <span class="grow"><span class="t">${esc(T.displayName(p))}</span><br><span class="s">${esc([rel === 'You' ? 'You' : rel, yrs].filter(Boolean).join(' · ') || ' ')}</span></span>${icon('chev', 'chev')}</a>`;
  }).join('');
}
function wirePeopleList() {
  const inp = document.getElementById('treesearch');
  if (!inp) return;
  inp.oninput = () => { S.search = inp.value; document.getElementById('treelist').innerHTML = treeListRows(); };
}

// ---------------------------------------------------------- person sheet ---
let sheetFor = null;
function openSheet(html, onWire, kind) {
  S.sheetKind = kind || 'person';
  $sheet.innerHTML = `<div class="sbody" role="document"><div class="grab" aria-hidden="true"></div>${html}</div>`;
  if (!$sheet.open) { try { $sheet.showModal(); } catch (e) { $sheet.setAttribute('open', ''); } }
  $sheet.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => closeAndBack());
  onWire && onWire($sheet);
}
function closeSheet() {
  sheetFor = null;
  S.sheetKind = null;
  if ($sheet.open) { $sheet.close(); }
}
function closeAndBack() {
  closeSheet();
  const r = route();
  if (r.view === 'tree' && r.arg.length) go('#tree', true);
}
$sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeAndBack(); });
$sheet.addEventListener('click', (e) => { if (e.target === $sheet) closeAndBack(); });

function factRow(k, v) { return v ? `<div class="f"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>` : ''; }

function bornText(p) {
  const hide = hidesYear(p);
  if (p.birthDate) {
    if (hide) return fmtMonthDay(p.birthDate);
    const age = !p.deceased ? ageOn(p.birthDate) : null;
    return `${fmtFull(p.birthDate)}${age != null && age >= 0 && age < 130 ? ` (${age})` : ''}`;
  }
  if (p.birthDateApprox && !hide) return p.birthDateApprox;
  return '';
}

function openPerson(id) {
  const p = S.peopleById.get(id);
  if (!p) {
    if (S.peopleLoaded) openSheet(`<div class="sheethead"><h2 class="grow">Not in the tree</h2><button class="closebtn" type="button" data-close aria-label="Close">${icon('x')}</button></div><p class="mute">This person isn't in the family tree anymore.</p>`);
    return;
  }
  if (sheetFor === id + S.labelsKey + S.people.length && $sheet.open) return;
  sheetFor = id + S.labelsKey + S.people.length;
  const g = S.graph, me = meId();
  const rel = relTo(id);
  const relLine = id === me ? "That's you" : rel ? `Your ${lowerFirst(rel)}` : (me ? '' : '');
  const member = p.linkedMemberUid ? S.members.get(p.linkedMemberUid) : null;
  const born = bornText(p);
  const died = p.deceased ? [p.deathDate ? fmtFull(p.deathDate) : p.deathDateApprox, p.deathPlace].filter(Boolean).join(' · ') : '';
  const fam = [];
  const addFam = (ids, what) => ids.forEach((x) => { const q = S.peopleById.get(x); if (q) fam.push({ q, what }); });
  if (p.kind === 'pet') addFam(p.ownerIds.filter((x) => S.peopleById.has(x)), 'Owner');
  else {
    addFam(g.parents(id), 'Parent');
    addFam(g.spouses(id, true), 'Partner');
    addFam(g.siblings(id), 'Sibling');
    addFam(g.children(id), 'Child');
    addFam(g.pets(id), 'Pet');
  }
  const lists = S.lists.filter((l) => (member && l.ownerUserId === member.uid) || (!l.ownerUserId && l.ownerPersonId === id));
  const first = T.firstName(p);
  openSheet(`
    <div class="sheethead">
      ${avatarHtml(p, 'lg')}
      <div class="grow"><h2 id="sheet-title">${p.kind === 'pet' ? '🐾 ' : ''}${esc(T.displayName(p))}</h2>
        ${relLine ? `<div class="chip g" style="margin-top:6px">${esc(relLine)}</div>` : ''}</div>
      <button class="closebtn" type="button" data-close aria-label="Close">${icon('x')}</button>
    </div>
    <div class="facts" style="margin-top:12px">
      ${factRow('Born', born)}
      ${factRow('Birthplace', p.birthPlace)}
      ${factRow('Passed away', died)}
      ${factRow('Maiden name', p.maidenName)}
      ${factRow('Work', p.occupation)}
      ${member ? factRow('KinCamp', `Uses KinCamp · ${ROLE_LABEL[normRole(member.role)]}`) : ''}
    </div>
    ${p.stories ? `<div class="sh" style="margin-top:14px"><h2>Stories</h2></div><p style="white-space:pre-wrap;margin:0">${esc(p.stories)}</p>` : ''}
    ${fam.length ? `<div class="sh" style="margin-top:16px"><h2>Family</h2></div><div class="fam">${fam.map(({ q, what }) => `<button type="button" data-person="${esc(q.id)}">${avatarHtml(q, 'sm')}<span><b>${esc(T.firstName(q))}</b><small>${esc(relTo(q.id) === 'You' ? 'You' : what)}</small></span></button>`).join('')}</div>` : ''}
    <div class="cards" style="margin-top:18px">
      ${p.kind !== 'pet' && id !== focusId() ? `<button class="btn p block" type="button" id="centre">Show ${esc(first)}'s family</button>` : ''}
      ${member ? `<a class="btn block" href="#people/${encodeURIComponent(member.uid)}">Birthday, sizes &amp; favorites</a>` : ''}
      ${lists.map((l) => `<a class="btn block" href="#gifts/${encodeURIComponent(l.id)}">${icon('gift', 'gicon')}${esc(l.title || 'Gift list')}</a>`).join('')}
      <button class="btn o block" type="button" data-close>Close</button>
    </div>`, (root) => {
    root.querySelectorAll('[data-person]').forEach((b) => b.onclick = () => go(`#tree/p/${encodeURIComponent(b.dataset.person)}`, true));
    const c = root.querySelector('#centre');
    if (c) c.onclick = () => {
      S.focusId = id; store.set('kc.focus.' + S.campId, id);
      closeSheet(); go('#tree', true);
      if (S.whole) setTimeout(() => S.whole && S.whole.centerOn(id), 50);
    };
  });
}

// "Find myself": link my account to an unlinked person in the tree (linkVisitorToPerson).
function openClaim(chosen) {
  const cands = S.people.filter((p) => p.kind !== 'pet' && !p.linkedMemberUid && !p.deceased)
    .sort((a, b) => T.displayName(a).localeCompare(T.displayName(b)));
  if (chosen) {
    const p = S.peopleById.get(chosen);
    openSheet(`<div class="sheethead"><h2 class="grow">Is this you?</h2><button class="closebtn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="campcard" style="margin:12px 0">${avatarHtml(p)}<span class="grow"><b style="font-size:19px">${esc(T.displayName(p))}</b>${bornText(p) ? `<br><span class="mute">Born ${esc(bornText(p))}</span>` : ''}</span></div>
      <p class="mute" style="margin:0 0 14px">We'll connect this spot in the tree to your account, so the tree shows how everyone is related to you, and your name and birthday stay yours to change.</p>
      <div class="err" id="claimerr" role="alert" hidden></div>
      <div class="cards"><button class="btn p block" type="button" id="claimyes">Yes, that's me</button><button class="btn block" type="button" id="claimback">Pick someone else</button></div>`, (root) => {
      root.querySelector('#claimback').onclick = () => openClaim();
      const b = root.querySelector('#claimyes');
      b.onclick = () => busy(b, 'Connecting…', async () => {
        await call('linkVisitorToPerson', { campId: S.campId, personId: p.id });
        S.focusId = null;
        closeSheet(); go('#tree', true);
        toast(`Done. You're ${T.displayName(p)} in the tree.`);
      }, root.querySelector('#claimerr'));
    }, 'claim');
    return;
  }
  openSheet(`<div class="sheethead"><h2 class="grow">Find yourself</h2><button class="closebtn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
    <p class="mute" style="margin:8px 0 12px">Tap your name. If you're not in the tree, ask someone in your family to add you.</p>
    <div class="search" style="margin-bottom:10px">${icon('search')}<label class="sr" for="claimq">Search names</label><input class="input" id="claimq" type="search" placeholder="Search by name" autocomplete="off"></div>
    <div class="cards" id="claimlist"></div>`, (root) => {
    const list = root.querySelector('#claimlist'), q = root.querySelector('#claimq');
    const paint = () => {
      const t = q.value.trim().toLowerCase();
      const rows = cands.filter((p) => !t || T.displayName(p).toLowerCase().includes(t)).slice(0, 80);
      list.innerHTML = rows.length ? rows.map((p) => `<button class="tap" type="button" data-pick="${esc(p.id)}">${avatarHtml(p)}<span class="grow"><span class="t">${esc(T.displayName(p))}</span>${bornText(p) ? `<br><span class="s">Born ${esc(bornText(p))}</span>` : ''}</span>${icon('chev', 'chev')}</button>`).join('') : '<div class="card mute">Nobody matches. Ask your family to add you to the tree.</div>';
      list.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => openClaim(b.dataset.pick));
    };
    q.oninput = paint; paint();
  }, 'claim');
}

// --------------------------------------------------------------- people ---
function memberSummary(m) {
  const bits = [];
  const b = toDate(m.birthday);
  if (b) bits.push(`🎂 ${fmtMonthDay(b)}`);
  if (m.shirtSize) bits.push(`Shirt ${m.shirtSize}`);
  if (m.pantSize) bits.push(`Pants ${m.pantSize}`);
  if (m.shoeSize) bits.push(`Shoes ${m.shoeSize}`);
  return bits.join(' · ');
}
function renderPeople() {
  if (!S.membersLoaded) { $view.innerHTML = `<h1 class="page-title">Birthdays &amp; sizes</h1>${loading('Loading your family…')}`; return; }
  const bdays = S.peopleLoaded ? upcomingBirthdays(6) : [];
  const members = [...S.members.values()].sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')));
  const q = S.peopleSearch.trim().toLowerCase();
  const shown = members.filter((m) => !q || String(m.displayName || '').toLowerCase().includes(q));
  $view.innerHTML = `
    <h1 class="page-title">Birthdays &amp; sizes</h1>
    <p class="page-sub">What everyone in ${esc(S.camp?.name || 'camp')} has shared: birthdays, sizes and favorite things.</p>
    <div class="sh"><h2>Next birthdays</h2></div>
    ${bdays.length ? `<div class="cards">${bdays.map(birthdayRow).join('')}</div>` : '<div class="card mute">No birthdays added yet.</div>'}
    <div class="sh"><h2>Everyone</h2><span class="c">${members.length}</span></div>
    ${members.length > 8 ? `<div class="search" style="margin-bottom:10px">${icon('search')}<label class="sr" for="peopleq">Search names</label><input class="input" id="peopleq" type="search" placeholder="Search by name" value="${esc(S.peopleSearch)}" autocomplete="off"></div>` : ''}
    <div class="cards">${shown.map((m) => {
      const person = S.people.find((p) => p.linkedMemberUid === m.uid);
      const sum = memberSummary(m);
      const role = normRole(m.role);
      return `<a class="tap" href="#people/${encodeURIComponent(m.uid)}">${person ? avatarHtml(person) : memberAvatar(m)}
        <span class="grow"><span class="t">${esc(m.displayName || 'Someone')}${m.uid === S.user.uid ? ' <span class="chip g">You</span>' : ''}</span><br><span class="s">${esc(sum || (person && relTo(person.id) && relTo(person.id) !== 'You' ? `Your ${lowerFirst(relTo(person.id))}` : ROLE_LABEL[role]))}</span></span>
        ${icon('chev', 'chev')}</a>`;
    }).join('') || '<div class="card mute">Nobody matches that name.</div>'}</div>`;
  const pq = document.getElementById('peopleq');
  if (pq) pq.oninput = () => { S.peopleSearch = pq.value; schedule(); };
}

function renderMember(uid) {
  if (!S.membersLoaded) { $view.innerHTML = loading('Loading…'); return; }
  const m = S.members.get(uid);
  const back = `<a class="back" href="#people">${icon('back')}Everyone</a>`;
  if (!m) { $view.innerHTML = `${back}<div class="empty"><b>Not in this camp</b><p>This person isn't part of ${esc(S.camp?.name || 'this camp')} anymore.</p></div>`; return; }
  const person = S.people.find((p) => p.linkedMemberUid === uid);
  const name = m.displayName || 'Someone';
  const first = name.split(' ')[0];
  const b = toDate(m.birthday);
  const hide = m.hideBirthYear === true;
  let bday = '';
  if (b) {
    const nb = nextBirthday(b);
    bday = hide ? fmtMonthDay(b) : `${fmtFull(b)} · ${ageOn(b)} years old`;
    bday += nb.days === 0 ? ' · today!' : nb.days < 31 ? ` · in ${nb.days} day${nb.days === 1 ? '' : 's'}` : '';
  }
  const rel = person ? relTo(person.id) : '';
  const interests = Array.isArray(m.interests) ? m.interests.filter(Boolean) : [];
  const about = [
    ['About me', m.aboutMe], ['Hobbies', m.hobbies], ['Favorite foods', m.favoriteFoods], ['Favorite candy', m.favoriteCandy],
    ['Favorite places to eat', m.favoritePlacesToEat], ['Favorite activities', m.favoriteActivities],
  ].filter(([, v]) => v && String(v).trim());
  const lists = S.lists.filter((l) => l.ownerUserId === uid);
  const sizes = [['Shirt', m.shirtSize], ['Pants', m.pantSize], ['Shoes', m.shoeSize]].filter(([, v]) => v);
  const empty = !b && !sizes.length && !about.length && !interests.length && !m.profileNotes;
  $view.innerHTML = `${back}
    <div class="row" style="margin:6px 0 14px">${person ? avatarHtml(person, 'lg') : memberAvatar(m, 'lg')}
      <div class="grow"><h1 class="page-title" style="margin:0">${esc(name)}</h1>
      <div class="chips" style="margin-top:6px">${rel ? `<span class="chip g">${esc(rel === 'You' ? 'You' : `Your ${lowerFirst(rel)}`)}</span>` : ''}<span class="chip">${ROLE_LABEL[normRole(m.role)]}</span></div></div></div>
    ${empty ? `<div class="card mute">${esc(first)} hasn't filled in a profile yet.</div>` : ''}
    <div class="grid2">
      ${b ? `<div class="card"><div class="ovl">Birthday</div><div style="font-size:21px;font-weight:800;margin-top:4px">${esc(bday)}</div></div>` : ''}
      ${sizes.length ? `<div class="card"><div class="ovl">Sizes</div><div class="facts">${sizes.map(([k, v]) => factRow(k, v)).join('')}</div></div>` : ''}
    </div>
    ${about.length || interests.length ? `<div class="sh"><h2>Favorite things</h2></div><div class="card"><div class="facts">${about.map(([k, v]) => factRow(k, v)).join('')}${interests.length ? `<div class="f"><span class="k">Into right now</span><span class="v"><span class="chips">${interests.map((i) => `<span class="chip s">${esc(i)}</span>`).join('')}</span></span></div>` : ''}</div></div>` : ''}
    ${m.profileNotes ? `<div class="sh"><h2>Good to know</h2></div><div class="card" style="white-space:pre-wrap">${esc(m.profileNotes)}</div>` : ''}
    ${lists.length ? `<div class="sh"><h2>Gift lists</h2></div><div class="cards">${lists.map((l) => listRow(l)).join('')}</div>` : ''}
    ${person ? `<div class="cards" style="margin-top:18px"><a class="btn block" href="#tree/p/${encodeURIComponent(person.id)}">${icon('tree', 'gicon')}See ${esc(first)} in the family tree</a></div>` : ''}
    <p class="hint" style="margin-top:18px">Only ${esc(first)} can change this${uid === S.user.uid ? ', in the KinCamp app' : ''}.</p>`;
}

// ---------------------------------------------------------------- gifts ---
const PRI = { high: ['High', 'c'], medium: ['Medium', 's'], low: ['Low', ''] };
const STATUS = { claimed: ['Claimed', 'g'], bought: ['Bought', 's'], wrapped: ['Wrapped', 'l'] };
const NEXT_STATUS = { claimed: 'bought', bought: 'wrapped', wrapped: 'claimed' };
const myFirst = () => String(S.members.get(S.user.uid)?.displayName || S.userDoc?.displayName || 'Family').trim().split(/\s+/)[0].slice(0, 40) || 'Family';
function familyCampName(id) {
  if (!id) return '';
  const c = (S.familyState?.camps || []).find((x) => x.campId === id);
  return c?.name || S.camps.get(id)?.name || '';
}
/** "Kim", or "Jeff · Rivera" for someone claiming from another family camp. */
function claimerName(uid, name, campId) {
  if (uid === S.user.uid) return 'You';
  const m = S.members.get(uid);
  if (m) return String(m.displayName || 'Someone').split(' ')[0];
  const camp = campId && campId !== S.campId ? familyCampName(campId) : '';
  return [String(name || 'Someone').split(' ')[0], camp].filter(Boolean).join(' · ');
}
function joinNames(names) {
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
/** Who a list belongs to: a camp member, or (person-owned) someone in the tree who isn't on the app. */
function listOwner(l) {
  if (l.ownerUserId) {
    const m = S.members.get(l.ownerUserId);
    const person = S.people.find((p) => p.linkedMemberUid === l.ownerUserId);
    return { key: 'u' + l.ownerUserId, mine: l.ownerUserId === S.user.uid, member: m, person,
      name: l.ownerUserId === S.user.uid ? 'You' : m?.displayName || (person ? T.displayName(person) : 'Someone who left'),
      first: m?.displayName ? String(m.displayName).split(' ')[0] : person ? T.firstName(person) : 'They' };
  }
  const person = l.ownerPersonId ? S.peopleById.get(l.ownerPersonId) : null;
  return { key: 'p' + (l.ownerPersonId || l.id), mine: false, member: null, person, personOwned: true,
    name: person ? T.displayName(person) : 'Someone in the family', first: person ? T.firstName(person) : 'They' };
}
function ownerAvatar(o) {
  return o.person ? avatarHtml(o.person) : memberAvatar(o.member || { uid: o.key, displayName: o.name });
}
function listRow(l) {
  const items = S.items.get(l.id);
  const n = items ? items.length : null;
  const o = listOwner(l);
  const claims = S.claims.get(l.id);
  const claimed = claims && items ? items.filter((i) => claims.has(i.id)).length : 0;
  const cards = Array.isArray(l.giftCards) ? l.giftCards.length : 0;
  const sub = [o.mine ? 'Your list' : o.name, n == null ? '' : `${n} ${n === 1 ? 'wish' : 'wishes'}`, cards ? `${cards} gift ${cards === 1 ? 'card' : 'cards'}` : '', claimed ? `${claimed} claimed` : ''].filter(Boolean).join(' · ');
  return `<a class="tap" href="#gifts/${encodeURIComponent(l.id)}">${ownerAvatar(o)}
    <span class="grow"><span class="t">${esc(l.title || 'Gift list')}</span><br><span class="s">${esc(sub)}</span></span>${icon('chev', 'chev')}</a>`;
}
function familyRow(f) {
  const items = Array.isArray(f.items) ? f.items : [];
  const claimed = items.filter((i) => i.claimed).length;
  const person = f.ownerFpid ? S.people.find((p) => p.fpid === f.ownerFpid) : null;
  const cards = Array.isArray(f.giftCards) ? f.giftCards.length : 0;
  const sub = [f.ownerFirstName || 'Family', f.originCampName, `${items.length} ${items.length === 1 ? 'wish' : 'wishes'}`, cards ? `${cards} gift ${cards === 1 ? 'card' : 'cards'}` : '', claimed ? `${claimed} claimed` : ''].filter(Boolean).join(' · ');
  return `<a class="tap" href="#gifts/f/${encodeURIComponent(f.id)}">${person ? avatarHtml(person) : memberAvatar({ uid: f.id, displayName: f.ownerFirstName || '?' })}
    <span class="grow"><span class="t">${esc(f.title || 'Gift list')}</span><br><span class="s">${esc(sub)}</span></span>${icon('chev', 'chev')}</a>`;
}

/** "My gifts to give": tap the pill to move Claimed → Bought → Wrapped. */
function myGiftRow(c) {
  const st = STATUS[c.status] ? c.status : 'claimed';
  const isCard = c.kind === 'giftCard';
  const title = isCard ? `${c.cardName || 'Gift'} gift card` : c.itemName || 'A gift';
  const where = c.originCampId && c.originCampId !== S.campId ? c.originCampName || familyCampName(c.originCampId) : '';
  const sub = [`For ${c.ownerName || 'family'}`, c.listTitle, where].filter(Boolean).join(' · ');
  let href = '';
  if (c.originCampId === S.campId && S.lists.some((l) => l.id === c.listId)) href = `#gifts/${encodeURIComponent(c.listId)}`;
  else if (S.familyGifts.some((f) => f.id === `${c.originCampId}_${c.listId}`)) href = `#gifts/f/${encodeURIComponent(`${c.originCampId}_${c.listId}`)}`;
  const img = safeUrl(c.image);
  const lead = img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="mgimg">` : `<span class="mglogo" style="background:${T.colorFor(isCard ? c.cardKey || c.id : c.id)}" aria-hidden="true">${isCard ? esc(monogram(c.cardName)) : icon('gift')}</span>`;
  const body = `${lead}<span class="grow"><span class="t">${esc(title)}</span><br><span class="s">${esc(sub)}</span></span>`;
  return `<div class="card mygift">
    ${href ? `<a class="mglink" href="${href}">${body}</a>` : `<div class="mglink">${body}</div>`}
    <button class="stpill ${STATUS[st][1]}" type="button" data-status="${esc(c.id)}" aria-label="${esc(title)}: ${STATUS[st][0]}. Tap to mark ${STATUS[NEXT_STATUS[st]][0].toLowerCase()}.">${STATUS[st][0]} <span aria-hidden="true">›</span></button>
    <div class="err" role="alert" hidden></div>
  </div>`;
}
async function cycleStatus(c) {
  const next = NEXT_STATUS[STATUS[c.status] ? c.status : 'claimed'];
  const isCard = c.kind === 'giftCard';
  if (S.campIds.includes(c.originCampId)) {
    // In one of my camps: update my own claim or giver doc (the rules allow only my own).
    const path = isCard
      ? `camps/${c.originCampId}/giftLists/${c.listId}/cardGivers/${c.cardKey}_${S.user.uid}`
      : `camps/${c.originCampId}/giftLists/${c.listId}/claims/${c.itemId}`;
    await updateDoc(doc(db, path), { status: next });
  } else {
    await call('setFamilyGiftStatus', isCard
      ? { originCampId: c.originCampId, listId: c.listId, key: c.cardKey, status: next }
      : { originCampId: c.originCampId, listId: c.listId, itemId: c.itemId, status: next });
  }
}
function wireMyGifts() {
  $view.querySelectorAll('[data-status]').forEach((b) => b.onclick = () => {
    const c = S.myClaims.find((x) => x.id === b.dataset.status);
    if (c) busy(b, 'Saving…', () => cycleStatus(c), b.closest('.mygift').querySelector('.err'));
  });
}

function renderGifts() {
  if (!S.listsLoaded || !S.membersLoaded) { $view.innerHTML = `<h1 class="page-title">Gift lists</h1>${loading('Loading gift lists…')}`; return; }
  const mine = S.lists.filter((l) => listOwner(l).mine);
  const groups = new Map();
  for (const l of S.lists) {
    const o = listOwner(l);
    if (o.mine) continue;
    if (!groups.has(o.key)) groups.set(o.key, { o, lists: [] });
    groups.get(o.key).lists.push(l);
  }
  const ordered = [...groups.values()].sort((a, b) => a.o.name.localeCompare(b.o.name));
  const others = ordered.reduce((n, g) => n + g.lists.length, 0);
  const order = { claimed: 0, bought: 1, wrapped: 2 };
  const toGive = S.myClaims.slice().sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0) || (toDate(b.claimedAt)?.getTime() || 0) - (toDate(a.claimedAt)?.getTime() || 0));
  $view.innerHTML = `
    <h1 class="page-title">Gift lists</h1>
    <p class="page-sub">Christmas and birthday wish lists. No spoilers: nobody sees who's claimed what on their own list.</p>
    ${toGive.length ? `<div class="sh"><h2>My gifts to give</h2><span class="c">${toGive.length}</span></div><div class="cards">${toGive.map(myGiftRow).join('')}</div><p class="hint">Tap Claimed, Bought or Wrapped to keep track. Only you see this.</p>` : ''}
    ${mine.length ? `<div class="sh"><h2>Your lists</h2></div><div class="cards">${mine.map(listRow).join('')}</div><p class="hint">You see your wishes but not who's claimed what.</p>` : ''}
    <div class="sh"><h2>Family lists</h2><span class="c">${others || ''}</span></div>
    ${ordered.length ? `<div class="cards">${ordered.map((g) => g.lists.map(listRow).join('')).join('')}</div>` : (S.familyGifts.length ? '<div class="card mute">No lists in this camp yet.</div>' : '<div class="empty"><span class="ic" aria-hidden="true">🎁</span><b>No gift lists yet</b><p>When someone in the family starts a wish list in the app, it shows up here.</p></div>')}
    ${S.familyGifts.length ? `<div class="sh"><h2>From family in other camps</h2><span class="c">${S.familyGifts.length}</span></div><div class="cards">${S.familyGifts.map(familyRow).join('')}</div><p class="hint">Shared by family in camps connected to yours. You can claim from these too.</p>` : ''}
  `;
  wireMyGifts();
}

function itemCard(it, claimUi) {
  const link = safeLink(it.url);
  const pv = it.preview && typeof it.preview === 'object' ? it.preview : null;
  const pvImg = pv ? safeUrl(pv.image) : null;
  const pri = PRI[it.priority];
  return `<div class="card gift">
    <div class="row" style="align-items:flex-start"><span class="name grow">${esc(it.name || 'A wish')}</span>${pri ? `<span class="chip ${pri[1]}">${pri[0]}</span>` : ''}</div>
    ${it.suggested ? `<div class="hint" style="color:var(--glow)">🗣️ Suggested at dinner${it.suggestedByName ? ` by ${esc(String(it.suggestedByName).split(' ')[0])}` : ''}</div>` : ''}
    ${it.notes ? `<div class="notes">${esc(it.notes)}</div>` : ''}
    ${link ? (pv && (pv.title || pvImg)
      ? `<a class="preview" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${pvImg ? `<img src="${esc(pvImg)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="grow"><span class="pt">${esc(pv.title || link)}</span><span class="ps">${esc(pv.siteName || hostOf(link))} · opens in a new tab</span></span></a>`
      : `<a class="link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(link))} · see it online</a>`) : ''}
    ${claimUi}
    <div class="err" role="alert" hidden></div>
  </div>`;
}
function claimUiHtml(id, state) {
  if (state.mine) return `<div class="row"><span class="chip g">✓ You claimed this</span><span class="grow"></span><button class="btn sm" type="button" data-release="${esc(id)}">Release</button></div>`;
  if (state.by) return `<div class="row mute">${icon('lock', 'gicon')}<span>Claimed by ${esc(state.by)}</span></div>`;
  return `<button class="btn p sm" type="button" data-claim="${esc(id)}">${icon('gift', 'gicon')}I'll get this</button>`;
}
function monogram(name) {
  const w = String(name || '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || '?') + (w[1]?.[0] || w[0]?.[1] || '')).toUpperCase();
}
/** Gift card stores: cards [{key, name, note}], givers [{uid, name, campId}] per key (null = hidden from the owner). */
function giftCardsHtml(cards, giversByKey, first, isOwner) {
  if (!cards.length) return '';
  const tiles = cards.map((c) => {
    const givers = giversByKey ? giversByKey(c.key) : [];
    const mine = givers.some((g) => g.uid === S.user.uid);
    const others = givers.filter((g) => g.uid !== S.user.uid).map((g) => claimerName(g.uid, g.name, g.campId));
    let who = '';
    if (!isOwner) {
      if (mine && others.length) who = `You and ${joinNames(others)} are getting one`;
      else if (others.length) who = `${joinNames(others)} ${others.length === 1 ? 'is' : 'are'} getting one`;
    }
    const action = isOwner ? '' : mine
      ? `<div class="row"><span class="chip g">✓ You're getting one</span><span class="grow"></span><button class="btn sm" type="button" data-ungive="${esc(c.key)}">Undo</button></div>`
      : `<button class="btn sm" type="button" data-give="${esc(c.key)}">${icon('gift', 'gicon')}I'm getting one</button>`;
    return `<div class="gc">
      <div class="row"><span class="mglogo" style="background:${T.colorFor(c.key)}" aria-hidden="true">${esc(monogram(c.name))}</span><b class="grow">${esc(c.name || 'Gift card')}</b></div>
      ${c.note ? `<div class="mute">${esc(c.note)}</div>` : ''}
      ${who ? `<div class="hint" style="color:var(--ink);font-weight:700">${esc(who)}</div>` : ''}
      ${action}
      <div class="err" role="alert" hidden></div>
    </div>`;
  }).join('');
  return `<div class="sh"><h2>${isOwner ? "Gift cards you'd love" : `Gift cards ${esc(first)} would love`}</h2></div>
    <div class="gcgrid">${tiles}</div>
    <p class="hint">${isOwner ? "You'll never see who's getting you what." : `${esc(first)} won't see who's getting what. More than one person can give the same store.`}</p>`;
}

function renderList(listId) {
  const back = `<a class="back" href="#gifts">${icon('back')}All gift lists</a>`;
  if (!S.listsLoaded) { $view.innerHTML = back + loading('Loading…'); return; }
  const l = S.lists.find((x) => x.id === listId);
  if (!l) { $view.innerHTML = `${back}<div class="empty"><b>This list is gone</b><p>It may have been deleted.</p></div>`; return; }
  const o = listOwner(l);
  const isOwner = o.mine;
  const owner = o.member;
  const items = S.items.get(l.id);
  const claims = S.claims.get(l.id) || new Map();
  const givers = S.givers.get(l.id) || [];
  const cards = Array.isArray(l.giftCards) ? l.giftCards.filter((c) => c && c.key) : [];
  const sizes = owner ? [['Shirt', owner.shirtSize], ['Pants', owner.pantSize], ['Shoes', owner.shoeSize]].filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ') : '';
  const likes = owner ? [owner.favoriteFoods, owner.favoriteCandy, owner.favoriteActivities].filter((v) => v && String(v).trim()).join(' · ') : '';
  const giversByKey = (k) => givers.filter((g) => g.key === k).map((g) => ({ uid: g.uid, name: g.name, campId: g.giverCamp }));
  $view.innerHTML = `${back}
    <h1 class="page-title">${esc(l.title || 'Gift list')}</h1>
    <p class="page-sub">${isOwner ? 'Your list. You see your wishes but not who has claimed what.' : `${esc(o.name)}'s list${o.personOwned ? `. ${esc(o.first)} isn't on KinCamp, so everyone here can see what's claimed.` : ''}`}</p>
    ${!isOwner && (sizes || likes) ? `<div class="card" style="margin-bottom:12px">${sizes ? `<div><b>Sizes:</b> ${esc(sizes)}</div>` : ''}${likes ? `<div class="mute"><b style="color:var(--ink)">Likes:</b> ${esc(likes)}</div>` : ''}</div>` : ''}
    ${giftCardsHtml(cards, isOwner ? null : giversByKey, o.first, isOwner)}
    ${cards.length ? `<div class="sh"><h2>Wish list</h2><span class="c">${items ? items.length : ''}</span></div>` : ''}
    ${items == null ? loading('Loading wishes…') : !items.length ? '<div class="empty"><span class="ic" aria-hidden="true">🎁</span><b>Nothing on this list yet</b></div>' : `<div class="cards">${items.map((it) => {
      const cl = claims.get(it.id);
      const ui = isOwner ? '' : claimUiHtml(it.id, { mine: cl && cl.claimedBy === S.user.uid, by: cl ? claimerName(cl.claimedBy, cl.claimedByName, cl.claimedCamp) : '' });
      return itemCard(it, ui);
    }).join('')}</div>`}`;
  const errOf = (b) => (b.closest('.gift') || b.closest('.gc')).querySelector('.err');
  $view.querySelectorAll('[data-claim]').forEach((b) => b.onclick = () => busy(b, 'Claiming…', () => claimGift(l.id, b.dataset.claim), errOf(b)));
  $view.querySelectorAll('[data-release]').forEach((b) => b.onclick = () => busy(b, 'Releasing…', () => releaseGift(l.id, b.dataset.release), errOf(b)));
  $view.querySelectorAll('[data-give]').forEach((b) => b.onclick = () => busy(b, 'Saving…', () => giveCard(l.id, b.dataset.give), errOf(b)));
  $view.querySelectorAll('[data-ungive]').forEach((b) => b.onclick = () => busy(b, 'Saving…', () => ungiveCard(l.id, b.dataset.ungive), errOf(b)));
}

function renderFamilyList(id) {
  const back = `<a class="back" href="#gifts">${icon('back')}All gift lists</a>`;
  if (!S.familyGiftsLoaded) { $view.innerHTML = back + loading('Loading…'); return; }
  const f = S.familyGifts.find((x) => x.id === id);
  if (!f) { $view.innerHTML = `${back}<div class="empty"><b>This list isn't shared here anymore</b><p>It may have been deleted, or its owner stopped sharing it with this camp.</p></div>`; return; }
  const first = f.ownerFirstName || 'They';
  const items = Array.isArray(f.items) ? f.items : [];
  const cards = Array.isArray(f.giftCards) ? f.giftCards.filter((c) => c && c.key) : [];
  const giversByKey = (k) => (cards.find((c) => c.key === k)?.givers || []).map((g) => ({ uid: g.uid, name: g.campName ? `${g.name} · ${g.campName}` : g.name }));
  $view.innerHTML = `${back}
    <h1 class="page-title">${esc(f.title || 'Gift list')}</h1>
    <p class="page-sub">${esc(first)}'s list, shared from ${esc(f.originCampName || 'another family camp')}.</p>
    ${giftCardsHtml(cards, giversByKey, first, false)}
    ${cards.length ? `<div class="sh"><h2>Wish list</h2><span class="c">${items.length}</span></div>` : ''}
    ${!items.length ? '<div class="empty"><span class="ic" aria-hidden="true">🎁</span><b>Nothing on this list yet</b></div>' : `<div class="cards">${items.map((it) => {
      const mine = it.claimed && it.claimedByUid === S.user.uid;
      const by = it.claimed && !mine ? [String(it.claimedByName || 'Someone').split(' ')[0], it.claimedByCampName].filter(Boolean).join(' · ') : '';
      return itemCard(it, claimUiHtml(it.id, { mine, by }));
    }).join('')}</div>`}`;
  const ref = { originCampId: f.originCampId, listId: f.listId };
  const errOf = (b) => (b.closest('.gift') || b.closest('.gc')).querySelector('.err');
  $view.querySelectorAll('[data-claim]').forEach((b) => b.onclick = () => busy(b, 'Claiming…', async () => {
    await call('claimFamilyGift', { campId: S.campId, ...ref, itemId: b.dataset.claim });
    toast(`Claimed. ${first} won't see who claimed it.`);
  }, errOf(b)));
  $view.querySelectorAll('[data-release]').forEach((b) => b.onclick = () => busy(b, 'Releasing…', async () => {
    await call('releaseFamilyGift', { ...ref, itemId: b.dataset.release });
    toast('Released. Someone else can claim it now.');
  }, errOf(b)));
  $view.querySelectorAll('[data-give]').forEach((b) => b.onclick = () => busy(b, 'Saving…', async () => {
    await call('giveFamilyGiftCard', { campId: S.campId, ...ref, key: b.dataset.give });
    toast(`Got it. ${first} won't see who's getting what.`);
  }, errOf(b)));
  $view.querySelectorAll('[data-ungive]').forEach((b) => b.onclick = () => busy(b, 'Saving…', async () => {
    await call('ungiveFamilyGiftCard', { ...ref, key: b.dataset.ungive });
  }, errOf(b)));
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Link'; } }

// Same claim model as the apps: a claim doc per item, created only if nobody holds it.
async function claimGift(listId, itemId) {
  const ref = doc(db, `camps/${S.campId}/giftLists/${listId}/claims/${itemId}`);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) throw plainError(snap.data().claimedBy === S.user.uid ? 'You already claimed this.' : 'Someone else just claimed this one.');
      tx.set(ref, { claimedBy: S.user.uid, claimedAt: serverTimestamp(), status: 'claimed' });
    });
  } catch (e) {
    // Another claim landing between our read and write is rejected by the rules.
    if (e && e.code === 'permission-denied') throw plainError('Someone else just claimed this one.');
    throw e;
  }
  toast("Claimed. The list's owner won't see who claimed it.");
}
async function releaseGift(listId, itemId) {
  const ref = doc(db, `camps/${S.campId}/giftLists/${listId}/claims/${itemId}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    if (snap.data().claimedBy !== S.user.uid) throw plainError('Only the person who claimed this can release it.');
    tx.delete(ref);
  });
  toast('Released. Someone else can claim it now.');
}
// "I'm getting one": my own giver doc per store (several givers per store are fine).
async function giveCard(listId, key) {
  await setDoc(doc(db, `camps/${S.campId}/giftLists/${listId}/cardGivers/${key}_${S.user.uid}`),
    { key, uid: S.user.uid, name: myFirst(), at: serverTimestamp(), status: 'claimed' });
  toast("Got it. The list's owner won't see who's getting what.");
}
async function ungiveCard(listId, key) {
  await deleteDoc(doc(db, `camps/${S.campId}/giftLists/${listId}/cardGivers/${key}_${S.user.uid}`));
}

// -------------------------------------------------------------- account ---
function signInMethods() {
  const out = [];
  for (const p of S.user.providerData || []) {
    if (p.providerId === 'google.com') out.push(['Google', p.email || '']);
    else if (p.providerId === 'phone') out.push(['Phone', maskPhone(p.phoneNumber)]);
    else if (p.providerId === 'password') out.push(['Email link', p.email || '']);
    else if (p.providerId === 'apple.com') out.push(['Apple', p.email || '']);
  }
  if (!out.length && S.user.email) out.push(['Email', S.user.email]);
  return out;
}
function maskPhone(n) {
  const d = String(n || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) •••-${d.slice(6)}` : n || '';
}
function renderAccount() {
  const me = S.members.get(S.user.uid);
  const name = S.userDoc?.displayName || me?.displayName || '';
  const theme = document.documentElement.getAttribute('data-theme') || 'system';
  $view.innerHTML = `
    <h1 class="page-title">Your account</h1>
    <div class="row" style="margin:10px 0 18px">${memberAvatar({ uid: S.user.uid, displayName: name || '?', avatarUrl: S.userDoc?.avatarUrl })}
      <div class="grow"><b style="font-size:21px">${esc(name || 'No name yet')}</b><div class="mute" style="font-size:15px">${esc(signInMethods().map(([k, v]) => `${k}${v ? `: ${v}` : ''}`).join(' · '))}</div></div></div>
    <div class="grid2">
      <form class="card cards" id="nameform" novalidate>
        <div class="field"><label for="myname">Your name</label><input class="input" id="myname" maxlength="40" autocomplete="name" value="${esc(name)}"><span class="hint">This is what your family sees.</span></div>
        <div class="err" role="alert" hidden></div>
        <button class="btn p" type="submit">Save name</button>
      </form>
      <div class="card cards"><div class="ovl">Your family camps</div>
        ${S.campIds.map((id) => { const c = S.camps.get(id); const r = S.myRoles.get(id); return `<div class="row">${`<span class="av sm" style="background:${T.colorFor(id)}" aria-hidden="true">${esc(((c?.name || '?')[0]).toUpperCase())}</span>`}<span class="grow"><b>${esc(c?.name || '…')}</b><br><span class="mute" style="font-size:14.5px">${r ? ROLE_LABEL[r] : ''}${c?.archivedAt ? ' · closed' : ''}</span></span>${id === S.campId ? '<span class="chip g">Open</span>' : `<button class="btn sm" type="button" data-open="${esc(id)}">Open</button>`}</div>`; }).join('')}
        <a class="btn o sm" href="../join/">Join another family with a code</a>
      </div>
      <div class="card cards"><div class="ovl">Look</div>
        <div class="seg" role="group" aria-label="Look">
          <button type="button" data-theme-set="dark" class="${theme === 'dark' ? 'on' : ''}" aria-pressed="${theme === 'dark'}">Night</button>
          <button type="button" data-theme-set="light" class="${theme === 'light' ? 'on' : ''}" aria-pressed="${theme === 'light'}">Day</button>
          <button type="button" data-theme-set="system" class="${theme === 'system' ? 'on' : ''}" aria-pressed="${theme === 'system'}">Match device</button>
        </div>
      </div>
      <div class="card cards"><div class="ovl">Get the app</div>
        <p class="mute" style="margin:0">The app is optional for visitors. Everything you need is right here. The KinCamp app is coming soon to the App Store and Google Play.</p>
      </div>
      <div class="card cards"><div class="ovl">Sign out</div>
        <p class="mute" style="margin:0">Sign out of KinCamp on this browser.</p>
        <div class="err" role="alert" hidden></div>
        <button class="btn" type="button" id="signout">Sign out</button>
      </div>
      <div class="card cards" style="border-color:color-mix(in srgb,var(--danger) 40%,var(--line))"><div class="ovl" style="color:var(--danger)">Delete account</div>
        <p class="mute" style="margin:0">Removes your account and your personal details from KinCamp and takes you out of every family camp. This can't be undone.</p>
        <button class="btn d" type="button" id="delete">Delete my account…</button>
      </div>
    </div>
    <p class="fine" style="margin-top:22px"><a href="../privacy/">Privacy Policy</a> · <a href="../terms/">Terms</a></p>`;
  const nf = document.getElementById('nameform');
  nf.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = document.getElementById('myname').value.trim().replace(/\s+/g, ' ');
    const err = nf.querySelector('.err');
    if (!v) { err.textContent = 'Please type your name.'; err.hidden = false; return; }
    busy(nf.querySelector('button'), 'Saving…', async () => {
      await updateDoc(doc(db, 'users', S.user.uid), { displayName: v });
      // Each camp keeps its own copy of your name for the family to see.
      const results = await Promise.allSettled(S.campIds.map((id) => updateDoc(doc(db, `camps/${id}/members/${S.user.uid}`), { displayName: v })));
      if (results.some((r) => r.status === 'rejected')) toast('Saved. One of your camps may take a moment to show it.');
      else toast('Saved. Your family will see the new name.');
    }, err);
  });
  $view.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => { setCamp(b.dataset.open); go('#home'); });
  $view.querySelectorAll('[data-theme-set]').forEach((b) => b.onclick = () => { window.kcSetTheme(b.dataset.themeSet); schedule(); });
  const so = document.getElementById('signout');
  so.onclick = () => busy(so, 'Signing out…', () => signOut(auth), so.parentElement.querySelector('.err'));
  document.getElementById('delete').onclick = openDelete;
}

function openDelete() {
  openSheet(`
    <div class="sheethead"><h2 class="grow">Delete your account?</h2><button class="closebtn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="cards" style="margin-top:12px">
      <p style="margin:0">This permanently deletes your KinCamp account and takes you out of ${S.campIds.length === 1 ? 'your family camp' : `all ${S.campIds.length} of your family camps`}. You'll need a new invite to come back.</p>
      <p class="mute" style="margin:0">If you lead a camp, another member becomes its leader. If only visitors would be left, we'll ask you to make someone a leader in the app first.</p>
      <label class="check"><input type="checkbox" id="delok"> <span>I understand this can't be undone.</span></label>
      <div class="field"><label for="delword">Type DELETE to confirm</label><input class="input" id="delword" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
      <div class="err" id="delerr" role="alert" hidden></div>
      <button class="btn d solid block" type="button" id="delgo" disabled>Delete my account forever</button>
      <button class="btn block" type="button" data-close>Keep my account</button>
    </div>`, (root) => {
    const ok = root.querySelector('#delok'), word = root.querySelector('#delword'), go2 = root.querySelector('#delgo');
    const check = () => { go2.disabled = !(ok.checked && word.value.trim().toUpperCase() === 'DELETE'); };
    ok.onchange = check; word.oninput = check;
    go2.onclick = () => busy(go2, 'Deleting…', async () => {
      S.deleting = true;  // hold the page still while the server removes us from each camp
      try { await call('deleteUserAccount', {}); } catch (e) { S.deleting = false; schedule(); throw e; }
      S.deleted = true;
      subs.user && subs.user(); subs.myClaims && subs.myClaims(); subs.camp.forEach((off) => off());
      for (const off of subs.camps.values()) off();
      try { await signOut(auth); } catch (e) { /* the account is already gone */ }
      closeSheet();
      document.getElementById('tabs').hidden = document.getElementById('dock').hidden = true;
      $view.innerHTML = `<div class="empty" style="padding-top:56px"><span class="ic" aria-hidden="true">👋</span><b>Your account is deleted</b><p>Thanks for being part of the family on KinCamp. If you ever want to come back, ask your family for a new invite.</p><a class="btn p" href="../">KinCamp home</a></div>`;
    }, root.querySelector('#delerr'));
  }, 'delete');
}

schedule();
