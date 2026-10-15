// Firebase for the KinCamp website (project the-bloom-camp). The web config is
// public by design; the Firestore rules decide what anyone can read or write.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getFunctions, connectFunctionsEmulator, httpsCallable,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDAcRQU1XbVpyoyAG3aePz4mbcWlKiLeC0',
  authDomain: 'the-bloom-camp.firebaseapp.com',
  projectId: 'the-bloom-camp',
  storageBucket: 'the-bloom-camp.firebasestorage.app',
  messagingSenderId: '411381123425',
  appId: '1:411381123425:web:aa5470d19e824467f5dd20',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fns = getFunctions(app, 'us-central1');

// Local development talks to the Firebase emulators, never production.
export const EMULATED = ['localhost', '127.0.0.1'].includes(location.hostname);
if (EMULATED) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
}

export { onAuthStateChanged, signOut };

export async function call(name, data) {
  const res = await httpsCallable(fns, name)(data);
  return res.data;
}

/** Resolves once Firebase knows whether someone is signed in. */
export function authReady() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}

// ---------------------------------------------------------------- errors ---
const AUTH_MESSAGES = {
  'auth/popup-closed-by-user': 'The sign-in window was closed before finishing. Please try again.',
  'auth/cancelled-popup-request': 'The sign-in window was closed before finishing. Please try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Please allow pop-ups and try again.',
  'auth/network-request-failed': "We couldn't reach the internet. Check your connection and try again.",
  'auth/invalid-verification-code': "That code didn't match. Check the text message and try again.",
  'auth/code-expired': 'That code has expired. Send a new one.',
  'auth/missing-verification-code': 'Enter the 6-digit code from the text message.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/quota-exceeded': 'Too many tries. Wait a few minutes, then try again.',
  'auth/invalid-phone-number': "That doesn't look like a US phone number. Try 10 digits, like (913) 555-0123.",
  'auth/missing-phone-number': 'Enter your phone number.',
  'auth/unsupported-first-factor': 'We can only text US numbers right now.',
  'auth/operation-not-allowed': "That way of signing in isn't turned on yet. Please try another option.",
  'auth/invalid-email': "That email address doesn't look right. Check it and try again.",
  'auth/missing-email': 'Enter your email address.',
  'auth/invalid-action-code': 'That sign-in link has expired or was already used. Send yourself a new one.',
  'auth/expired-action-code': 'That sign-in link has expired. Send yourself a new one.',
  'auth/user-disabled': 'This account has been turned off. Contact KinCamp support for help.',
  'auth/account-exists-with-different-credential': 'You already have a KinCamp account with this email that uses a different sign-in. Try that way instead.',
  'auth/captcha-check-failed': "We couldn't confirm you're not a robot. Reload the page and try again.",
  'auth/unauthorized-domain': "Sign-in isn't set up for this web address yet.",
  'auth/requires-recent-login': 'For your safety, please sign out, sign back in, and try again.',
};

export function friendly(err) {
  if (!err) return 'Something went wrong. Please try again.';
  if (err.kcMessage) return err.kcMessage;
  const code = String(err.code || '');
  if (AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (code.startsWith('functions/')) {
    // Callable errors carry a plain message from the server.
    if (code === 'functions/internal' || code === 'functions/unknown') return 'Something went wrong on our end. Please try again in a minute.';
    if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return "We couldn't reach KinCamp. Check your connection and try again.";
    if (code === 'functions/unauthenticated') return 'Please sign in again.';
    return err.message || 'That didn’t work. Please try again.';
  }
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return "You don't have permission to do that.";
  if (code === 'unavailable' || code === 'firestore/unavailable') return "We couldn't reach KinCamp. Check your connection and try again.";
  return 'Something went wrong. Please try again.';
}

// ----------------------------------------------------------- busy buttons ---
/**
 * Runs fn with the button in a working state, and shows a plain message in
 * errEl (or a toast) if it fails. Returns fn's result, or undefined on failure.
 */
export async function busy(btn, working, fn, errEl) {
  if (btn && btn.getAttribute('aria-busy') === 'true') return undefined;
  const html = btn ? btn.innerHTML : '';
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  if (btn) {
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    btn.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${esc(working || 'Working…')}</span>`;
  }
  try {
    return await fn();
  } catch (e) {
    console.warn(e);
    const msg = friendly(e);
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; } else toast(msg);
    return undefined;
  } finally {
    if (btn && btn.isConnected) {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
      btn.innerHTML = html;
    }
  }
}

let toastTimer = null;
export function toast(msg) {
  let el = document.getElementById('kc-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kc-toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
}

/** An error whose message is already plain words for the person. */
export function plainError(msg) { const e = new Error(msg); e.kcMessage = msg; return e; }

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

// ------------------------------------------------------------ user profile ---
/** Same first-sign-in profile the apps create. A failed read is not "missing". */
export async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  let snap;
  try { snap = await getDoc(ref); } catch (e) { return null; }
  if (snap.exists()) return snap.data();
  const email = user.email || null;
  const data = {
    email,
    displayName: user.displayName || '',
    avatarUrl: user.photoURL || null,
    campIds: [],
    primaryCampId: null,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    platform: {},
    notificationPrefs: {
      pushEnabled: true, emailEnabled: false, quietHoursEnabled: false,
      quietHoursStart: '22:00', quietHoursEnd: '07:00',
    },
  };
  try { await setDoc(ref, data, { merge: true }); } catch (e) { console.warn('profile create failed', e); }
  return data;
}

/** Only same-folder paths inside the KinCamp site are allowed as "next". */
export function safeNext(raw, fallback) {
  const m = /^(app|join)\/?([?#][^\s<>"']*)?$/.exec(String(raw || ''));
  return m ? `../${m[1]}/${m[2] || ''}` : fallback;
}
