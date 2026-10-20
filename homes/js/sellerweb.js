// seller.html boot: the questionnaire on the seller's own phone. The link carries (in the #fragment,
// never sent to any server) the client id and the agent's name / email / phone. Answers are kept only
// in this browser until the seller sends them.
(function (G) {
  'use strict';
  const AG = G.AG, A = AG.acts;
  const h = new URLSearchParams(location.hash.slice(1));
  const cid = (h.get('c') || '').slice(0, 40), agent = (h.get('a') || '').slice(0, 80), brokerage = (h.get('b') || '').slice(0, 80);
  const email = (h.get('e') || '').slice(0, 120), phone = (h.get('p') || '').replace(/[^\d+]/g, '').slice(0, 20);
  const key = 'ag.sf.' + (cid || 'new');
  AG.db = AG.fresh();
  try { if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark'; } catch {}
  let q = {};
  try { q = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  if (!q.first && h.get('n')) q.first = h.get('n').slice(0, 60);
  if (!q.addr && h.get('ad')) q.addr = h.get('ad').slice(0, 120);
  const keep = () => { try { localStorage.setItem(key, JSON.stringify(q)); } catch {} };
  const host = () => ({ q, i: AG.cur().params.i || 0, by: [agent, brokerage].filter(Boolean).join(' · ') || 'Selling your home', standalone: true, e: email, p: phone, agentFirst: agent.split(' ')[0] });
  AG.views.sweb = { nav: false, render() { AG.sfBind(q, keep, false); return AG.sellerFormHtml(host()); } };
  A.sfSend = async (d) => {
    const msg = AG.sellerFormMessage(q, cid), subject = `Home questionnaire — ${q.addr || [q.first, q.last].filter(Boolean).join(' ') || 'seller'}`;
    if (d.how === 'email') location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    else if (d.how === 'sms') location.href = `sms:${phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(msg)}`;
    else if (navigator.share) { try { await navigator.share({ title: subject, text: msg }); } catch {} }
    else { try { await navigator.clipboard.writeText(msg); AG.toast('Copied — paste it into a message to ' + (agent || 'your agent')); } catch { AG.toast('Couldn’t copy on this browser'); } }
  };
  document.title = agent ? `A few questions from ${agent}` : document.title;
  AG.S.stack = [{ view: 'sweb', params: { i: 0 } }];
  AG.render('push');
})(window);
