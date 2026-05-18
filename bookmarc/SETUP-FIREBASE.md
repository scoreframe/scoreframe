# Bookmarc — Firebase setup

Five-step console walkthrough. Do these in [Firebase Console](https://console.firebase.google.com/) while I scaffold the code.

## 1. Create the Firebase project

1. Firebase Console → **Add project** → name it `bookmarc` (or whatever — internal id, doesn't show to users).
2. Skip Google Analytics (we don't need it for v1.0.0).
3. Wait for provisioning to finish.

## 2. Register the web app

1. In the new project → **Project settings (gear icon)** → **Your apps** section → tap the `</>` **Web** icon.
2. App nickname: `Bookmarc Web`.
3. **Do NOT** check "Set up Firebase Hosting" (we're hosting on scoreframe.app via GitHub Pages, not Firebase Hosting).
4. Click **Register app**.
5. **Copy the `firebaseConfig` object** that appears — paste it to me in chat. It looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "bookmarc-xxxx.firebaseapp.com",
     projectId: "bookmarc-xxxx",
     storageBucket: "bookmarc-xxxx.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123"
   };
   ```
   This is the **public** config — it's safe to ship in client JS. (The thing you DO need to protect is server-side keys; this isn't one.)

## 3. Enable Google Sign-In

1. Console → **Build** → **Authentication** → **Get started**.
2. **Sign-in method** tab → **Add new provider** → **Google** → **Enable**.
3. Set the **Public-facing name** to `Bookmarc`.
4. Set the **Project support email** to your Glavin Labs email.
5. Save.

## 4. Enable Firestore

1. Console → **Build** → **Firestore Database** → **Create database**.
2. Start in **Production mode** (we'll add rules in step 5).
3. Pick a location near you (e.g. `us-east1` or `us-central`). **This is permanent**, can't change later.
4. Click **Enable**.

## 5. Add Firestore security rules

1. Firestore → **Rules** tab. Replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         match /books/{bookId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
   }
   ```
2. **Publish**.

This ensures each user can only read/write their own data. No one else can touch your books.

## 6. Authorize scoreframe.app

Without this, Google Sign-In will reject the auth attempt from `scoreframe.app`.

1. Console → **Authentication** → **Settings** tab → **Authorized domains**.
2. Add `scoreframe.app`. (`localhost` is already there for local dev.)

---

## When you're done

Paste the `firebaseConfig` object from step 2 here in chat. I'll wire it into the code and ship v1.0.0.

## Free tier headroom

You won't come anywhere near it for Bookmarc:
- **Firestore**: 50K reads, 20K writes, 1 GiB storage per day on Spark plan (free).
- **Auth**: 50K monthly active users on free tier.

Bookmarc traffic per active user is maybe ~20 reads + ~5 writes per session. You could have hundreds of daily users before this matters.

## What lives where after v1.0.0

```
/users/{uid}                  -- settings: apiKey, googleBooksKey, model, updatedAt
/users/{uid}/books/{bookId}   -- per-book: metadata + brief + qaThread (one doc)
```

- localStorage stays as the offline cache (fast startup, works offline).
- Firestore is the source of truth across devices.
- The Anthropic API key syncs in the user doc — paste once on any device, get it on all your devices. Encrypted at rest by Firebase by default.

## What's NOT changing

- Bookmarc still has no server processing pasted text. Pastes go browser → Anthropic API directly.
- Only the **summary** Claude returns gets persisted to Firestore. Raw pasted text never lands in Firestore (or anywhere else we control). Same rule as before — see [feedback_bookmarc_no_raw_text_storage.md] in memory.
