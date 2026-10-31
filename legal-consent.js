// What people agree to on the web (Eric 2026-10-30: "For a lawyer matter this
// would need to be traceable"). The server keeps the record (functions/legal.js):
// legalAccept appends a row to legalConsents (who, which versions, when, page,
// IP, browser) and legalStatus says what an account still has to agree to.
//
//  - The sign-in box shows TERMS_LINE and calls noticeShown() when it opens. A
//    sign-in within 30 minutes of that is recorded (context "web").
//  - Any other signed-in visit where something is due (an account from before
//    the record existed, or a new version of a document) gets a small bar:
//    "We've updated our Terms … I agree".
// The apps do the same (AppV2Terms.kt, LegalConsent in AppV2WhatsNew.swift).

const NOTICE = 'sf_legal_notice';
const RECORDED = 'sf_legal_rec';
const WINDOW_MS = 30 * 60 * 1000;
const get = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

export const TERMS_LINE = 'By continuing, you agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms of Service</a> ' +
    'and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.';

/** The sign-in box (with TERMS_LINE) is on screen. */
export function noticeShown() { set(NOTICE, String(Date.now())); }

async function call(app, name, data) {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js');
    return (await httpsCallable(getFunctions(app), name)(data)).data;
}

const accept = (app, docs) => call(app, 'legalAccept', {
    docs, context: 'web', via: 'web', appVersion: ('web ' + location.pathname).slice(0, 40),
});

let settled = '';
/** Every auth change: record a fresh sign-in, or ask about what's due. Once per account per page load. */
export async function onSignedIn(app, user) {
    if (!user || user.isAnonymous || settled === user.uid) return;
    if (document.body.classList.contains('app')) return;   // inside the apps, which ask themselves
    settled = user.uid;
    const at = Number(get(NOTICE) || 0);
    const key = user.uid + ':' + at;
    if (at && Date.now() - at < WINDOW_MS && get(RECORDED) !== key) {
        try { await accept(app, ['terms', 'privacy']); set(RECORDED, key); return; } catch (_) { /* fall through to the check */ }
    }
    try {
        const s = await call(app, 'legalStatus', {});
        if (s && Array.isArray(s.due) && s.due.length) showBar(app, s.due, s.urls || {});
    } catch (_) { settled = ''; }
}

const NAMES = { terms: 'Terms of Service', privacy: 'Privacy Policy', clubTerms: 'Club Terms' };

function showBar(app, due, urls) {
    if (document.getElementById('sfLegalBar')) return;
    const css = document.createElement('style');
    css.textContent = `
#sfLegalBar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;
  max-width:560px;margin:0 auto;padding:14px 16px;border-radius:14px;display:flex;flex-direction:column;gap:10px;
  background:var(--bg-surface,#fff);color:var(--text-primary,#1c1b1f);border:1px solid var(--outline,rgba(0,0,0,.14));
  box-shadow:0 10px 30px rgba(0,0,0,.25);font:14px/1.4 system-ui,-apple-system,sans-serif}
#sfLegalBar b{font-size:15px}
#sfLegalBar p{margin:0;color:var(--text-secondary,#555)}
#sfLegalBar a{color:var(--accent,#E47A1F);font-weight:700;text-decoration:none}
#sfLegalBar .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#sfLegalBar button{border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;cursor:pointer}
#sfLegalBar .ok{background:var(--accent,#E47A1F);color:#1a1004}
#sfLegalBar .later{background:transparent;color:var(--text-secondary,#555)}
#sfLegalBar .err{color:var(--error,#c62828);font-size:13px}`;
    document.head.appendChild(css);
    const bar = document.createElement('div');
    bar.id = 'sfLegalBar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Updated terms');
    const title = due.length > 1 ? "We've updated our Terms and Privacy Policy"
        : due[0] === 'privacy' ? "We've updated our Privacy Policy" : "We've updated our Terms";
    const links = due.map((k) => `<a href="${urls[k] || '/' + (k === 'clubTerms' ? 'club-terms' : k) + '.html'}" target="_blank" rel="noopener">${NAMES[k] || k}</a>`).join(' · ');
    bar.innerHTML = `<b></b><p>They now cover club teams, giving a game to another phone and who can see team pages, and say more plainly what we keep and why.</p>
<div class="row">${links}</div><div class="err" hidden></div>
<div class="row"><button class="ok" type="button">I agree</button><button class="later" type="button">Not now</button></div>`;
    bar.querySelector('b').textContent = title;
    const ok = bar.querySelector('.ok'), err = bar.querySelector('.err');
    ok.onclick = async () => {
        ok.disabled = true; ok.textContent = 'Saving…'; err.hidden = true;
        try { await accept(app, due); bar.remove(); }
        catch (_) { ok.disabled = false; ok.textContent = 'I agree'; err.textContent = "That didn't save. Check your connection and try again."; err.hidden = false; }
    };
    bar.querySelector('.later').onclick = () => bar.remove();
    document.body.appendChild(bar);
}
