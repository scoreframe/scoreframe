// BookMarc Firebase config — public (safe to ship in client code).
// See SETUP-FIREBASE.md for the console walkthrough.
//
// Once filled in, BookMarc enables Google Sign-In + cross-device sync.
// If left empty, BookMarc still works in localStorage-only mode.

export const firebaseConfig = {
  apiKey: "AIzaSyCz8TIEVcn6DcpjFo21utW7MQ8Bqi_6QTM",
  authDomain: "bookmarc-5eb63.firebaseapp.com",
  projectId: "bookmarc-5eb63",
  storageBucket: "bookmarc-5eb63.firebasestorage.app",
  messagingSenderId: "46703674681",
  appId: "1:46703674681:web:00f0acb906e250b6f094e8",
  measurementId: "G-FZ80H6JM9N"
};

export const isFirebaseConfigured = () =>
  !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
