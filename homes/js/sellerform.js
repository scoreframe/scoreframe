// The seller questionnaire (AG.SELLER_FORM) as the seller sees it. Eric 2026-10-20: "a questionnaire
// they can do even before we meet". One renderer, two homes:
//   • in the app (view "sform"): handed over on your tablet in client view; answers save into their file.
//   • seller.html: a page they open from a link on their own phone. No server — answers stay on their
//     device until they send them to you (email / text), and you paste or share them into the app.
(function (G) {
  'use strict';
  const AG = G.AG, esc = AG.esc, ic = AG.ic, A = AG.acts;
  const SECS = () => AG.SELLER_FORM;
  const visible = (sec, q) => sec.qs.filter((x) => !x.show || x.show(q));

  /** One step of the questionnaire (i = SECS().length is the review). host: { q, i, by, standalone }. */
  AG.sellerFormHtml = (host) => {
    const secs = SECS(), n = secs.length, i = Math.min(host.i, n), q = host.q;
    const dots = `<div class="steps">${[...secs, { title: 'Review' }].map((s, j) => `<button class="${j < i ? 'done' : ''} ${j === i ? 'on' : ''}" data-act="sfGo" data-i="${j}" aria-label="${esc(s.title)}"><i></i></button>`).join('')}</div>`;
    const head = `<div class="phead"><div class="t"><div class="eyebrow">${esc(host.by || 'Selling your home')}</div>
        <div class="title">${esc(i < n ? secs[i].title : 'All set')}</div></div>${host.standalone ? '' : `<button class="btn ghost sm pexit" data-act="presentExit">${ic('lock')} Done</button>`}</div>`;
    if (i < n) {
      const sec = secs[i];
      const intro = i === 0 ? `<p class="muted" style="margin:0 2px 12px">About 10 minutes. Skip anything you’re not sure of — we’ll fill in the rest together.${host.standalone ? ' Your answers stay on this phone until you send them.' : ''}</p>` : '';
      return `${head}${dots}${intro}<section class="card sec"><div class="form bottom" data-form="sform">${visible(sec, q).map((x) => AG.fld(x, q)).join('')}</div></section>
        <div class="footbar">${i ? `<button class="btn ghost" data-act="sfGo" data-i="${i - 1}">${ic('back')} Back</button>` : '<span></span>'}<button class="btn" data-act="sfGo" data-i="${i + 1}">${i + 1 < n ? 'Next' : 'Review'} ${ic('right')}</button></div>`;
    }
    const rows = secs.map((sec) => {
      const got = visible(sec, q).filter((x) => !AG.blank(q[x.k]));
      return got.length ? `<section class="card sec"><div class="sec-h"><h3>${esc(sec.title)}</h3><button class="lnk" data-act="sfGo" data-i="${secs.indexOf(sec)}">Edit</button></div>${got.map((x) => `<div class="qa"><span>${esc(x.label)}</span><b>${esc(AG.showVal(x, q[x.k]))}</b></div>`).join('')}</section>` : '';
    }).join('');
    const send = host.standalone ? sendButtons(host) : `<div class="callout">${ic('check')}<div class="grow">Saved to your file. Thank you!</div></div>`;
    return `${head}${dots}${send}${rows || '<p class="muted">Nothing answered yet.</p>'}`;
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
    AG.refresh();
    const v = AG.$('#view');
    if (v) v.scrollTop = 0;
  };
})(window);
