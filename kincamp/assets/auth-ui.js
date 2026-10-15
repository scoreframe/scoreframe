// Sign-in options shared by the Sign in and Join pages: an emailed link (no
// password to remember), Google, and a texted code for US phone numbers.
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  RecaptchaVerifier, signInWithPhoneNumber,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { auth, busy, esc, friendly, store } from './fb.js';

const EMAIL_KEY = 'kc.emailForSignIn';
const G_ICON = '<svg class="gicon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
const MAIL_ICON = '<svg class="gicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
const PHONE_ICON = '<svg class="gicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>';

/** Strips Firebase's email-link parameters, keeping everything else (e.g. ?code=). */
export function cleanUrl(href) {
  const u = new URL(href || location.href);
  ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl', 'tenantId'].forEach((k) => u.searchParams.delete(k));
  return u.toString();
}

export function hasEmailLink() { return isSignInWithEmailLink(auth, location.href); }

/** If this page was opened from an emailed sign-in link, finish signing in. */
export async function finishEmailLink(container) {
  if (!isSignInWithEmailLink(auth, location.href)) return false;
  const email = store.get(EMAIL_KEY);
  if (email) {
    try {
      await signInWithEmailLink(auth, email, location.href);
      store.set(EMAIL_KEY, null);
      history.replaceState(null, '', cleanUrl());
      return true;
    } catch (e) {
      history.replaceState(null, '', cleanUrl());
      container.innerHTML = '';
      showLinkError(container, friendly(e));
      return false;
    }
  }
  // Opened on a different device or browser: ask which email it was sent to.
  container.innerHTML = `
    <form class="field" id="kc-confirm" novalidate>
      <p>You're almost in. Type the email address the sign-in link was sent to.</p>
      <label for="kc-confirm-email">Email address</label>
      <input class="input" id="kc-confirm-email" type="email" autocomplete="email" inputmode="email" required>
      <div class="err" id="kc-confirm-err" role="alert" hidden></div>
      <button class="btn p block" type="submit">Finish signing in</button>
    </form>`;
  return new Promise((resolve) => {
    const form = container.querySelector('#kc-confirm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const err = form.querySelector('#kc-confirm-err');
      const em = form.querySelector('#kc-confirm-email').value.trim();
      const ok = await busy(btn, 'Signing you in…', async () => {
        await signInWithEmailLink(auth, em, location.href);
        return true;
      }, err);
      if (ok) { history.replaceState(null, '', cleanUrl()); resolve(true); }
    });
  });
}

function showLinkError(container, msg) {
  const el = document.createElement('div');
  el.className = 'err';
  el.setAttribute('role', 'alert');
  el.textContent = msg;
  container.prepend(el);
}

/**
 * Renders the sign-in choices. continueUrl is where an emailed link should
 * bring the person back to (this same page).
 */
export function mountSignIn(container, { continueUrl } = {}) {
  let recaptcha = null;
  let confirmation = null;
  let resendTimer = null;

  // Surface errors from a Google redirect sign-in (used when pop-ups are blocked).
  getRedirectResult(auth).catch((e) => showChoose(friendly(e)));

  function showChoose(error) {
    clearInterval(resendTimer);
    container.innerHTML = `
      ${error ? `<div class="err" role="alert">${esc(error)}</div>` : ''}
      <div class="cards">
        <button class="btn p block" type="button" data-go="email">${MAIL_ICON}<span>Email me a sign-in link</span></button>
        <button class="btn block" type="button" data-go="google">${G_ICON}<span>Continue with Google</span></button>
        <button class="btn block" type="button" data-go="phone">${PHONE_ICON}<span>Text a code to my phone</span></button>
      </div>
      <div class="err" id="kc-g-err" role="alert" hidden></div>
      <p class="fine">No password needed. Use the same email, Google account or phone number you use in the KinCamp app, if you have it.</p>`;
    container.querySelector('[data-go="email"]').onclick = () => showEmail();
    container.querySelector('[data-go="phone"]').onclick = () => showPhone();
    const g = container.querySelector('[data-go="google"]');
    g.onclick = () => busy(g, 'Opening Google…', async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        if (e && e.code === 'auth/popup-blocked') { await signInWithRedirect(auth, provider); return; }
        if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
        throw e;
      }
    }, container.querySelector('#kc-g-err'));
  }

  function backLink() {
    return '<button class="btn o block" type="button" data-back>Choose a different way</button>';
  }

  function showEmail(prefill) {
    container.innerHTML = `
      <form class="cards" id="kc-email" novalidate>
        <div class="field">
          <label for="kc-email-in">Your email address</label>
          <input class="input" id="kc-email-in" type="email" autocomplete="email" inputmode="email" required value="${esc(prefill || store.get(EMAIL_KEY) || '')}">
          <span class="hint">We'll email you a link. Tap it and you're signed in. No password.</span>
        </div>
        <div class="err" id="kc-email-err" role="alert" hidden></div>
        <button class="btn p block" type="submit">Email me the link</button>
        ${backLink()}
      </form>`;
    const form = container.querySelector('#kc-email');
    form.querySelector('[data-back]').onclick = () => showChoose();
    const input = form.querySelector('#kc-email-in');
    input.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      const err = form.querySelector('#kc-email-err');
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "That email address doesn't look right. Check it and try again."; err.hidden = false; return; }
      const sent = await busy(form.querySelector('button[type=submit]'), 'Sending…', async () => {
        await sendSignInLinkToEmail(auth, email, { url: cleanUrl(continueUrl || location.href), handleCodeInApp: true });
        store.set(EMAIL_KEY, email);
        return true;
      }, err);
      if (sent) showEmailSent(email);
    });
  }

  function showEmailSent(email) {
    container.innerHTML = `
      <div class="ok" role="status"><b>Check your email.</b><br>We sent a sign-in link to <b>${esc(email)}</b>. Open it on this same phone or computer to finish. It can take a minute to arrive, and it might land in spam.</div>
      <div class="err" id="kc-resend-err" role="alert" hidden></div>
      <button class="btn block" type="button" id="kc-resend">Send it again</button>
      <button class="btn o block" type="button" id="kc-other">Use a different email</button>`;
    container.querySelector('#kc-other').onclick = () => showEmail('');
    const r = container.querySelector('#kc-resend');
    r.onclick = () => busy(r, 'Sending…', async () => {
      await sendSignInLinkToEmail(auth, email, { url: cleanUrl(continueUrl || location.href), handleCodeInApp: true });
      const ok = container.querySelector('.ok');
      if (ok) ok.insertAdjacentHTML('beforeend', '<br><b>Sent again.</b>');
    }, container.querySelector('#kc-resend-err'));
  }

  function fmtPhone(v) {
    let d = String(v).replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
    d = d.slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function showPhone() {
    container.innerHTML = `
      <form class="cards" id="kc-phone" novalidate>
        <div class="field">
          <label for="kc-phone-in">Your mobile number</label>
          <input class="input" id="kc-phone-in" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="(913) 555-0123" required>
          <span class="hint">US numbers only. We'll text you a 6-digit code. Message and data rates may apply.</span>
        </div>
        <div class="err" id="kc-phone-err" role="alert" hidden></div>
        <button class="btn p block" type="submit">Text me a code</button>
        ${backLink()}
        <div id="kc-recaptcha"></div>
      </form>`;
    const form = container.querySelector('#kc-phone');
    form.querySelector('[data-back]').onclick = () => showChoose();
    const input = form.querySelector('#kc-phone-in');
    input.addEventListener('input', () => { input.value = fmtPhone(input.value); });
    input.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('#kc-phone-err');
      const digits = input.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
      if (digits.length !== 10) { err.textContent = "That doesn't look like a US phone number. Try 10 digits, like (913) 555-0123."; err.hidden = false; return; }
      await sendCode(form.querySelector('button[type=submit]'), err, digits);
    });
  }

  async function sendCode(btn, errEl, digits) {
    const ok = await busy(btn, 'Sending the code…', async () => {
      try {
        if (recaptcha) { try { recaptcha.clear(); } catch (e) { /* already gone */ } }
        const holder = container.querySelector('#kc-recaptcha') || container.appendChild(Object.assign(document.createElement('div'), { id: 'kc-recaptcha' }));
        holder.innerHTML = '';
        recaptcha = new RecaptchaVerifier(auth, holder, { size: 'invisible' });
        confirmation = await signInWithPhoneNumber(auth, '+1' + digits, recaptcha);
        return true;
      } catch (e) {
        try { recaptcha && recaptcha.clear(); } catch (x) { /* ignore */ }
        recaptcha = null;
        throw e;
      }
    }, errEl);
    if (ok) showCode(digits);
  }

  function showCode(digits) {
    const pretty = fmtPhone(digits);
    container.innerHTML = `
      <form class="cards" id="kc-code" novalidate>
        <div class="field">
          <label for="kc-code-in">The 6-digit code we texted to ${esc(pretty)}</label>
          <input class="input code" id="kc-code-in" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required>
        </div>
        <div class="err" id="kc-code-err" role="alert" hidden></div>
        <button class="btn p block" type="submit">Sign in</button>
        <button class="btn block" type="button" id="kc-resend" disabled>Send a new code (30)</button>
        ${backLink()}
        <div id="kc-recaptcha"></div>
      </form>`;
    const form = container.querySelector('#kc-code');
    form.querySelector('[data-back]').onclick = () => showChoose();
    const input = form.querySelector('#kc-code-in');
    const err = form.querySelector('#kc-code-err');
    input.focus();
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); });
    const resend = form.querySelector('#kc-resend');
    let left = 30;
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      left -= 1;
      if (!resend.isConnected) { clearInterval(resendTimer); return; }
      if (left <= 0) { clearInterval(resendTimer); resend.disabled = false; resend.textContent = 'Send a new code'; } else resend.textContent = `Send a new code (${left})`;
    }, 1000);
    resend.onclick = () => sendCode(resend, err, digits);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (code.length !== 6) { err.textContent = 'Enter the 6-digit code from the text message.'; err.hidden = false; return; }
      await busy(form.querySelector('button[type=submit]'), 'Checking…', async () => {
        await confirmation.confirm(code);
      }, err);
    });
  }

  showChoose();
}
