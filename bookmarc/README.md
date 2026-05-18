# Bookmarc (web prototype)

A spoiler-free, progressive reading companion. Tell it where you are in a book; it gives you a recap of characters, plot, and places — only through your current chapter.

Lives at `scoreframe.app/bookmarc/`. Static site — pure HTML/CSS/JS, no build step.

## Local dev

Open `index.html` directly, or serve the folder:

```bash
cd ~/Developer/scoreframe
python3 -m http.server 8080
# open http://localhost:8080/bookmarc/
```

## How to use

1. Open Settings (gear icon, top right). Paste an Anthropic API key from console.anthropic.com. Pick a model (Opus = best recall, Sonnet = cheaper).
2. Tap **+** to add a book. Search Google Books by title/author/ISBN.
3. Open the book, set your current chapter, tap **Catch me up**.
4. Recap view has four tabs:
   - **Previously** — TV-style "previously on…" recap focused on the chapter you just finished.
   - **Story so far** — broader summary from the start through your current chapter.
   - **Characters** — interactive map of characters, clustered by family/faction. Tap a character to highlight their relationships. Toggle between **Map** and **List** view.
   - **Places & things** — locations and notable objects introduced so far.
5. Recap is cached per `(book, chapter, schema_version)` in localStorage so re-opens are free.

## Architecture

- **Storage**: `localStorage` under key `bookmarc.v1`. Includes API key, book list, and cached recaps.
- **Book metadata**: Google Books API (no key needed for casual use).
- **Recaps**: Anthropic Messages API called directly from the browser with `anthropic-dangerous-direct-browser-access: true`.
- **Prompt design**: hard constraint to include only what's revealed by end of stated chapter; instructs the model to set `confidence: low` if it doesn't know the book well, rather than hallucinating.

## Known limits / TODOs

- **Bring-your-own-key only.** Fine for personal/testing use. Public launch needs a Cloudflare Worker proxy holding a server-side key + per-user quota.
- **Caching is per-device.** Multi-user version should share a server-side cache so chapter recaps are computed once globally.
- **No spoiler protection beyond the prompt.** A determined model could leak. Worth adversarial testing on books with famous twists.
- **No deep links to specific recaps yet** — hash routes `#/book/:id/recap` work, but routes aren't shareable across devices because IDs are local.
- **No icons / branding** beyond a 📖 emoji favicon.

## Files

- `index.html` — three view templates (library / search / book / recap) + settings dialog.
- `style.css` — warm paper theme, dark mode via `prefers-color-scheme`.
- `app.js` — state + routing + Google Books + Claude API + recap rendering. ~400 LOC.
