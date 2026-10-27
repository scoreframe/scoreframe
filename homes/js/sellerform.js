// The seller questionnaire (AG.SELLER_FORM) as the seller sees it. Eric 2026-10-20: "a questionnaire
// they can do even before we meet". One renderer, two homes:
//   • in the app (view "sform"): handed over on your tablet in client view; answers save into their file.
//   • seller.html: a page they open from a link on their own phone. No server — answers stay on their
//     device until they send them to you (email / text), and you paste or share them into the app.
(function (G) {
  'use strict';
  const AG = G.AG, esc = AG.esc, ic = AG.ic, A = AG.acts;
  const SECS = () => AG.SELLER_FORM;
  /** Where seller.html is published (Tools/publish_web.sh). Eric 2026-10-20: "put the web on ScoreFrame.app for now". */
  AG.FORMS_URL = 'https://scoreframe.app/homes';
  const visible = (sec, q) => sec.qs.filter((x) => !x.show || x.show(q));

  /** The questionnaire as short pages (AG.FORM_PAGES), section by section — like tax software (Eric 2026-10-26). */
  const stepsOf = (q) => SECS().flatMap((sec, si) => { const pgs = AG.pagesOf(sec, visible(sec, q), AG.FORM_PAGES); return pgs.map((pg, k) => ({ sec, si, pg, k, of: pgs.length })); });
  /** One page of the questionnaire (i = the page count is the review). host: { q, i, by, standalone }. */
  AG.sellerFormHtml = (host) => {
    const secs = SECS(), q = host.q, steps = stepsOf(q), n = steps.length, i = Math.min(host.i, n), st = steps[i];
    const si = st ? st.si : secs.length, first = (j) => steps.findIndex((x) => x.si === j);
    const dots = `<div class="steps">${[...secs, { title: 'Review' }].map((s, j) => `<button class="${j < si ? 'done' : ''} ${j === si ? 'on' : ''}" data-act="sfGo" data-i="${j < secs.length ? first(j) : n}" aria-label="${esc(s.title)}"><i></i></button>`).join('')}</div>`;
    const head = `<div class="phead">${AG.owlBtn()}<div class="t"><div class="eyebrow">${esc(host.by || 'Selling your home')}</div>
        <div class="title">${esc(st ? st.sec.title : 'All set')}</div></div>${host.standalone ? '' : `<button class="btn ghost sm pexit" data-act="presentExit">${ic('lock')} Done</button>`}</div>`;
    if (st) {
      const intro = i === 0 ? `<p class="muted" style="margin:0 2px 12px">About 10 minutes. Skip anything you’re not sure of — we’ll fill in the rest together.${host.standalone ? ' Your answers and your place stay on this phone until you send them.' : ''}</p>` : '';
      const part = st.of > 1 ? `<div class="wiz-pg"><small>Step ${si + 1} of ${secs.length} · part ${st.k + 1} of ${st.of}</small><b>${esc(st.pg.title)}</b></div>` : `<div class="wiz-pg"><small>Step ${si + 1} of ${secs.length}</small></div>`;
      const nx = steps[i + 1];
      return `<div class="topbar ptop">${head}${dots}</div>${intro}${part}<section class="card sec"><div class="form bottom" data-form="sform">${st.pg.qs.map((x) => AG.fld(x, q)).join('')}</div></section><div class="footpad"></div>
        <div class="footbar">${i ? `<button class="btn ghost" data-act="sfGo" data-i="${i - 1}">${ic('back')} Back</button>` : '<span></span>'}<button class="btn" data-act="sfGo" data-i="${i + 1}">${nx ? `Next: ${esc(nx.si === si ? nx.pg.title : nx.sec.title)}` : 'Review'} ${ic('right')}</button></div>`;
    }
    // the review: every question, answered or not, section by section, each with an Edit
    const rows = secs.map((sec, j) => {
      const qs = visible(sec, q), got = qs.filter((x) => !AG.blank(q[x.k])).length;
      return `<section class="card sec"><div class="sec-h"><h3>${got === qs.length ? ic('check', 'sm') + ' ' : ''}${esc(sec.title)} <small>${got}/${qs.length}</small></h3><button class="lnk" data-act="sfGo" data-i="${first(j)}">Edit</button></div>${AG.qaRows(q, qs)}</section>`;
    }).join('');
    const send = host.standalone ? sendButtons(host) : `<div class="callout">${ic('check')}<div class="grow">Saved to your file. Thank you!</div></div>`;
    return `<div class="topbar ptop">${head}${dots}</div>${send}${rows}`;
  };
  function sendButtons(host) {
    const to = host.agentFirst || 'your agent';
    return `<p class="muted" style="margin:0 2px 12px">Send your answers to ${esc(to)} — they come as a message you can read before sending.</p>
      <div class="pgrid two">
        ${host.e ? `<button class="card pbtn" data-act="sfSend" data-how="email">${ic('mail')}<span class="grow"><b>Email to ${esc(to)}</b><small>${esc(host.e)}</small></span>${ic('right')}</button>` : ''}
        ${host.p ? `<button class="card pbtn" data-act="sfSend" data-how="sms">${ic('msg')}<span class="grow"><b>Text to ${esc(to)}</b><small>${esc(AG.fmtPhone ? AG.fmtPhone(host.p) : host.p)}</small></span>${ic('right')}</button>` : ''}
        <button class="card pbtn" data-act="sfSend" data-how="share">${ic('share')}<span class="grow"><b>Share another way</b><small>Any app on your phone</small></span>${ic('right')}</button>
      </div>`;
  }
  /** The message a seller sends: readable answers for you, plus the token the app reads. */
  AG.sellerFormMessage = (q, cid) => {
    const lines = SECS().map((sec) => {
      const got = visible(sec, q).filter((x) => !AG.blank(q[x.k]));
      return got.length ? `${sec.title.toUpperCase()}\n${got.map((x) => `${x.label}: ${AG.showVal(x, q[x.k])}`).join('\n')}` : '';
    }).filter(Boolean);
    const keep = {};
    for (const sec of SECS()) for (const x of visible(sec, q)) if (!AG.blank(q[x.k])) keep[x.k] = q[x.k];
    return `${lines.join('\n\n')}\n\n— For your agent’s app (please leave this line in): ${AG.encodeAnswers({ kind: 'seller', cid: cid || '', at: Date.now(), q: keep })}`;
  };

  // ---------- in the app: hand the tablet over ----------
  A.sellerFormStart = (d) => {
    const c = AG.client(d.id);
    if (!c) return;
    AG.S.ui.present = c.id;
    AG.S.ui.presentBase = AG.S.stack.length;
    document.body.classList.add('presenting');
    AG.push('sform', { id: c.id, i: 0 });
  };
  AG.views.sform = {
    nav: false,
    render(p) {
      const c = AG.client(p.id);
      if (!c) return AG.empty('users', 'This client was deleted');
      const s = AG.db.settings;
      bindForm(c.q, () => { c.updated = Date.now(); }, true);
      return AG.sellerFormHtml({ q: c.q, i: p.i || 0, by: [s.agent, s.brokerage].filter(Boolean).join(' · ') });
    },
  };

  // ---------- shared: the form binding and step changes ----------
  /** Re-draw only when an answer changes which questions show (so typing keeps focus). */
  function bindForm(q, onChange, save) {
    const shown = () => SECS().flatMap((sec) => visible(sec, q).map((x) => x.k)).join();
    let before = shown();
    AG.forms.sform = {
      obj: q, save: save !== false ? undefined : false,
      change: (k, v, type) => {
        onChange && onChange(k, v);
        if (type === 'change' || type === 'pick') { const now = shown(); if (now !== before) { before = now; if (type !== 'pick') AG.refresh(); } }
      },
    };
  }
  AG.sfBind = bindForm;
  A.sfGo = (d) => {
    const cur = AG.cur();
    cur.params.i = Math.max(0, +d.i);
    if (AG.sfOnGo) AG.sfOnGo(cur.params.i);
    AG.refresh();
    const v = AG.$('#view');
    if (v) v.scrollTop = 0;
  };
})(window);
