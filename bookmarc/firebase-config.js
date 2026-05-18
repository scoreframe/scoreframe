// BookMarc Firebase config — public (safe to ship in client code).
// Paste the firebaseConfig object you copied from Firebase Console here.
// See SETUP-FIREBASE.md for the walkthrough.
//
// Once filled in, BookMarc enables Google Sign-In + cross-device sync.
// If left empty, BookMarc still works in localStorage-only mode.

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const isFirebaseConfigured = () =>
  !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
