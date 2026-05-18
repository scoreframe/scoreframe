(() => {
  'use strict';

  // ---------- Storage ----------
  const STORE_KEY = 'bookmarc.v1';

  const defaultState = () => ({
    apiKey: '',
    googleBooksKey: '',
    model: 'claude-opus-4-7',
    books: [],
    recaps: {}, // key: `${bookId}::${chapter}::v2`
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  const state = loadState();

  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function uid() {
    return 'b_' + Math.random().toString(36).slice(2, 10);
  }

  function toast(msg, ms = 2400) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  function findBook(id) {
    return state.books.find(b => b.id === id);
  }

  function render(viewFn) {
    const main = $('#app');
    main.innerHTML = '';
    viewFn(main);
  }

  function cloneTpl(id) {
    return $(`#${id}`).content.cloneNode(true);
  }

  // ---------- Routing ----------
  // Routes:
  //   #/                       -> library
  //   #/search                 -> add book
  //   #/book/:id               -> book detail
  //   #/book/:id/recap         -> recap view (uses currentChapter)
  function parseHash() {
    const h = location.hash || '#/';
    const parts = h.replace(/^#\//, '').split('/');
    return parts;
  }

  function navigate(path) {
    location.hash = '#' + path;
  }

  function setBackButton(visible) {
    $('#back-btn').hidden = !visible;
  }

  window.addEventListener('hashchange', route);

  function route() {
    const [head, idOrAction, action] = parseHash();
    if (!head || head === '') return renderLibrary();
    if (head === 'search') { setBackButton(true); return renderSearch(); }
    if (head === 'book' && idOrAction) {
      setBackButton(true);
      if (action === 'recap') return renderRecap(idOrAction);
      return renderBook(idOrAction);
    }
    return renderLibrary();
  }

  // ---------- Library view ----------
  function renderLibrary() {
    setBackButton(false);
    render(main => {
      const node = cloneTpl('tpl-library');
      main.appendChild(node);
      const empty = $('.library-empty', main);
      const list = $('#book-list', main);
      if (state.books.length === 0) {
        empty.hidden = false;
      } else {
        empty.hidden = true;
        const sorted = [...state.books].sort((a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt));
        for (const b of sorted) {
          list.appendChild(bookCard(b));
        }
      }
      $('#add-book-btn', main).addEventListener('click', () => navigate('/search'));
    });
  }

  function bookCard(b) {
    const li = document.createElement('li');
    li.className = 'book-card';
    li.addEventListener('click', () => navigate(`/book/${b.id}`));
    const total = b.totalChapters || 0;
    const cur = b.currentChapter || 0;
    const pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
    li.innerHTML = `
      <img alt="" src="${b.coverUrl || ''}" />
      <div class="meta">
        <h3></h3>
        <div class="muted small"></div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div class="progress-label">${cur > 0 ? `Chapter ${cur}${total ? ' of ' + total : ''}` : 'Not started'}</div>
      </div>
    `;
    $('h3', li).textContent = b.title;
    $('.muted', li).textContent = (b.authors || []).join(', ');
    return li;
  }

  // ---------- Search view ----------
  let searchTimer = null;
  function renderSearch() {
    render(main => {
      const node = cloneTpl('tpl-search');
      main.appendChild(node);
      const input = $('#search-input', main);
      const status = $('#search-status', main);
      const results = $('#search-results', main);
      input.focus();
      input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = input.value.trim();
        if (!q) { results.innerHTML = ''; status.textContent = ''; return; }
        searchTimer = setTimeout(() => doSearch(q, status, results), 300);
      });
    });
  }

  async function doSearch(q, statusEl, resultsEl) {
    statusEl.innerHTML = '<span class="spinner"></span> Searching…';
    resultsEl.innerHTML = '';
    // Try Google Books first if user supplied a key (richer metadata),
    // otherwise go straight to Open Library which is keyless and not quota-shared.
    const sources = state.googleBooksKey
      ? [searchGoogleBooks, searchOpenLibrary]
      : [searchOpenLibrary, searchGoogleBooks];
    let lastErr = null;
    for (const fn of sources) {
      try {
        const hits = await fn(q);
        if (!hits) continue;
        if (hits.length === 0) { statusEl.textContent = 'No results.'; return; }
        statusEl.textContent = '';
        for (const hit of hits) renderResult(hit, resultsEl);
        return;
      } catch (err) {
        lastErr = err;
        console.warn('Search source failed:', err);
      }
    }
    statusEl.textContent = lastErr && lastErr.message
      ? `Search failed: ${lastErr.message}`
      : 'Search failed. Both sources unreachable.';
  }

  function renderResult(hit, resultsEl) {
    const li = document.createElement('li');
    li.innerHTML = `
      <img alt="" />
      <div class="meta">
        <h4></h4>
        <div class="muted small"></div>
      </div>
    `;
    if (hit.coverUrl) $('img', li).src = hit.coverUrl;
    $('h4', li).textContent = hit.title || 'Untitled';
    $('.muted', li).textContent = (hit.authors || []).join(', ') + (hit.year ? ` · ${hit.year}` : '');
    li.addEventListener('click', () => addBook(hit));
    resultsEl.appendChild(li);
  }

  async function searchOpenLibrary(q) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=15&fields=key,title,author_name,first_publish_year,isbn,cover_i`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open Library ${res.status}`);
    const data = await res.json();
    return (data.docs || []).map(d => ({
      source: 'openlibrary',
      sourceId: d.key,
      title: d.title || 'Untitled',
      authors: d.author_name || [],
      year: d.first_publish_year || '',
      isbn: (d.isbn && d.isbn[0]) || '',
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
    }));
  }

  async function searchGoogleBooks(q) {
    const params = new URLSearchParams({ q, maxResults: '15', printType: 'books' });
    if (state.googleBooksKey) params.set('key', state.googleBooksKey);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    if (res.status === 429 || res.status === 403) {
      // Keyless quota exhausted, or invalid key — let the next source take over.
      throw new Error(state.googleBooksKey ? 'Google Books key rejected or quota exceeded' : 'Google Books shared quota exhausted');
    }
    if (!res.ok) throw new Error(`Google Books ${res.status}`);
    const data = await res.json();
    return (data.items || []).map(item => {
      const v = item.volumeInfo || {};
      const cover = (v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail) || '').replace('http:', 'https:');
      const isbn = (v.industryIdentifiers || []).find(i => i.type === 'ISBN_13')?.identifier
                || (v.industryIdentifiers || []).find(i => i.type === 'ISBN_10')?.identifier
                || '';
      return {
        source: 'google',
        sourceId: item.id,
        title: v.title || 'Untitled',
        authors: v.authors || [],
        year: v.publishedDate ? v.publishedDate.slice(0, 4) : '',
        isbn,
        coverUrl: cover,
      };
    });
  }

  function addBook(hit) {
    const book = {
      id: uid(),
      source: hit.source,
      sourceId: hit.sourceId,
      title: hit.title,
      authors: hit.authors || [],
      coverUrl: hit.coverUrl || '',
      isbn: hit.isbn || '',
      totalChapters: 0,
      currentChapter: 0,
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };
    state.books.push(book);
    saveState();
    navigate(`/book/${book.id}`);
  }

  // ---------- Book detail ----------
  function renderBook(id) {
    const b = findBook(id);
    if (!b) { navigate('/'); return; }
    b.lastOpenedAt = Date.now();
    saveState();
    render(main => {
      const node = cloneTpl('tpl-book');
      main.appendChild(node);
      $('#book-cover', main).src = b.coverUrl || '';
      $('#book-title', main).textContent = b.title;
      $('#book-authors', main).textContent = (b.authors || []).join(', ');
      const chapInput = $('#chapter-input', main);
      const totalInput = $('#total-input', main);
      chapInput.value = b.currentChapter || 0;
      totalInput.value = b.totalChapters || '';
      chapInput.addEventListener('change', () => { b.currentChapter = Math.max(0, parseInt(chapInput.value, 10) || 0); saveState(); });
      totalInput.addEventListener('change', () => { b.totalChapters = Math.max(0, parseInt(totalInput.value, 10) || 0); saveState(); });

      const recapArea = $('#recap-area', main);

      const cachedKey = recapKey(b.id, b.currentChapter);
      if (state.recaps[cachedKey]) {
        const inline = buildRecapInline(state.recaps[cachedKey]);
        recapArea.appendChild(inline);
        const openBtn = $('.inline-recap-open', inline);
        if (openBtn) openBtn.addEventListener('click', () => navigate(`/book/${b.id}/recap`));
      }

      $('#catchup-btn', main).addEventListener('click', () => doCatchup(b, recapArea));
      $('#remove-book-btn', main).addEventListener('click', () => {
        if (!confirm(`Remove "${b.title}" from your library?`)) return;
        state.books = state.books.filter(x => x.id !== b.id);
        // also drop cached recaps for this book
        for (const k of Object.keys(state.recaps)) {
          if (k.startsWith(b.id + '::')) delete state.recaps[k];
        }
        saveState();
        navigate('/');
      });
    });
  }

  function recapKey(bookId, chapter) {
    // v2 schema: previousChapter + storySoFar + typed relationships
    return `${bookId}::${chapter || 0}::v2`;
  }

  // ---------- Recap rendering ----------
  function buildRecapInline(recap) {
    const wrap = document.createElement('div');
    wrap.className = 'recap-inline';
    const prev = recap.previousChapter || {};
    const summary = prev.summary || (recap.storySoFar && recap.storySoFar.overview) || '(no recap yet)';
    wrap.innerHTML = `
      <h4 class="previously-eyebrow">Previously…</h4>
      <p></p>
      <button class="link inline-recap-open">Open full recap →</button>
      <p class="muted small confidence"></p>
    `;
    $('p', wrap).textContent = summary;
    $('.confidence', wrap).textContent = `Confidence: ${recap.confidence || 'unknown'} · generated ${new Date(recap.generatedAt || Date.now()).toLocaleString()}`;
    return wrap;
  }

  // ---------- Catch-me-up flow ----------
  async function doCatchup(b, mountEl) {
    if (!state.apiKey) {
      toast('Add your Anthropic API key in Settings.');
      openSettings();
      return;
    }
    const chapter = b.currentChapter || 0;
    if (chapter <= 0) {
      toast('Set your current chapter first.');
      return;
    }
    const key = recapKey(b.id, chapter);
    if (state.recaps[key]) {
      // Already cached for this exact chapter — show it
      navigate(`/book/${b.id}/recap`);
      return;
    }
    mountEl.innerHTML = '<p><span class="spinner"></span> Asking Claude for a spoiler-free recap through chapter ' + chapter + '…</p>';
    try {
      const recap = await generateRecap(b, chapter);
      recap.generatedAt = Date.now();
      state.recaps[key] = recap;
      saveState();
      navigate(`/book/${b.id}/recap`);
    } catch (err) {
      console.error(err);
      mountEl.innerHTML = '<p class="muted">' + escapeHtml(err.message || 'Failed to generate recap.') + '</p>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function generateRecap(book, chapter) {
    const system = `You are Bookmarc, a reading-companion that produces NON-SPOILING progressive recaps for readers in the middle of a book.

Hard rules:
- Include ONLY what is revealed by the END of the reader's stated chapter.
- Do not mention any character, place, item, or plot point that first appears AFTER the reader's current chapter.
- Do not hint at future twists, deaths, betrayals, romances, or revelations.
- For "previousChapter", recap ONLY what happened in the single most recent chapter the reader finished (chapter N itself), like a TV "previously on..." segment focused on the last episode.
- For "storySoFar", give the broader picture from the start of the book through end of chapter N.
- Character IDs must be lowercase short slugs (e.g. "frodo", "samwise-gamgee"), stable, and used consistently across "characters" and "relationships".
- Every relationship's fromId and toId must reference a character ID that exists in the "characters" array.
- "groupCluster" should be a short label that groups characters together (faction, family, household, ship's crew, school, etc.) — used to lay them out spatially. Use the same exact string for characters that belong to the same cluster.
- If you are not confident you know this specific book well, set "confidence" to "low" and produce only what you are sure of (or an empty result). Do not invent.
- Respond with ONLY a single JSON object. No prose before or after.`;

    const total = book.totalChapters ? ` (of approximately ${book.totalChapters})` : '';
    const isbn = book.isbn ? `\nISBN: ${book.isbn}` : '';
    const userMsg = `Book: "${book.title}" by ${(book.authors || []).join(', ') || 'unknown author'}${isbn}
Reader has just finished Chapter ${chapter}${total}.

Respond as JSON matching this schema exactly:
{
  "confidence": "high" | "medium" | "low",
  "previousChapter": {
    "title": "optional chapter title if you know it",
    "summary": "1-2 paragraph recap of ONLY chapter ${chapter} itself (the most recently finished chapter). Past tense. TV-style 'previously on' beat.",
    "keyMoments": ["3-6 short bullet phrases of the most important moments from chapter ${chapter}"]
  },
  "storySoFar": {
    "overview": "2-4 paragraph high-level recap from the start of the book through end of chapter ${chapter}.",
    "keyPlotPoints": ["6-12 short bullet phrases — the big beats so far, in roughly chronological order"]
  },
  "characters": [
    {
      "id": "lowercase-slug",
      "name": "...",
      "role": "protagonist | antagonist | supporting | mentioned",
      "groupCluster": "short label — family/faction/group these characters belong to (use identical strings to group)",
      "knownSoFar": "what the reader knows about them by end of chapter ${chapter}"
    }
  ],
  "relationships": [
    {
      "fromId": "char-slug",
      "toId": "other-slug",
      "kind": "short relationship label — e.g. 'parent', 'spouse', 'sibling', 'friend', 'mentor', 'rival', 'enemy', 'lover', 'employer', 'ally', 'colleague', 'student'",
      "note": "optional brief context (1 short sentence)"
    }
  ],
  "places": [
    { "name": "...", "note": "brief note about this location as introduced so far" }
  ],
  "items": [
    { "name": "...", "note": "brief note about this item/object as introduced so far" }
  ],
  "thingsToRemember": ["short bullet phrases — open threads, unresolved questions, items the reader might forget about"]
}

If you don't know this book confidently, return an object with "confidence": "low" and minimal/empty arrays rather than guessing.`;

    const body = {
      model: state.model || 'claude-opus-4-7',
      max_tokens: 4096,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: userMsg }],
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = (data.content || []).map(c => c.text || '').join('').trim();
    return parseRecapJson(text);
  }

  function parseRecapJson(text) {
    // Strip ```json fences if present
    let t = text.trim();
    const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (fence) t = fence[1];
    // Find first { and last } as fallback
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first >= 0 && last > first) t = t.slice(first, last + 1);
    try {
      return JSON.parse(t);
    } catch (e) {
      throw new Error('Could not parse Claude response as JSON. Raw start: ' + text.slice(0, 120));
    }
  }

  // ---------- Recap view (tabbed) ----------
  function renderRecap(bookId) {
    const b = findBook(bookId);
    if (!b) { navigate('/'); return; }
    const key = recapKey(b.id, b.currentChapter);
    const recap = state.recaps[key];
    if (!recap) { navigate(`/book/${b.id}`); return; }
    render(main => {
      const node = cloneTpl('tpl-recap');
      main.appendChild(node);

      // Previously, in this book
      const prevPanel = $('[data-panel="previously"]', main);
      renderPreviously(prevPanel, recap, b);

      // Story so far
      const storyPanel = $('[data-panel="story"]', main);
      renderStorySoFar(storyPanel, recap);

      // Characters (family-tree-style map)
      const charsPanel = $('[data-panel="characters"]', main);
      renderCharacterMap(charsPanel, recap);

      // Places & things
      const worldPanel = $('[data-panel="world"]', main);
      renderWorldPanel(worldPanel, recap);

      $$('.tab', main).forEach(t => t.addEventListener('click', () => {
        $$('.tab', main).forEach(x => x.classList.toggle('active', x === t));
        const which = t.dataset.tab;
        $$('.tab-panel', main).forEach(p => p.hidden = p.dataset.panel !== which);
      }));

      $('#recap-confidence', main).textContent = `Through chapter ${b.currentChapter} · confidence ${recap.confidence || 'unknown'} · generated ${new Date(recap.generatedAt).toLocaleString()}`;
    });
  }

  function renderPreviously(panel, recap, book) {
    panel.innerHTML = '';
    const prev = recap.previousChapter || {};
    const header = document.createElement('div');
    header.className = 'previously-header';
    const chapLabel = prev.title ? `Chapter ${book.currentChapter} — ${prev.title}` : `Chapter ${book.currentChapter}`;
    header.innerHTML = `<div class="previously-eyebrow">Previously, in <em></em></div><h3></h3>`;
    $('em', header).textContent = book.title;
    $('h3', header).textContent = chapLabel;
    panel.appendChild(header);
    (prev.summary || '').split(/\n\n+/).forEach(p => {
      if (!p.trim()) return;
      const el = document.createElement('p');
      el.textContent = p;
      panel.appendChild(el);
    });
    if ((prev.keyMoments || []).length) {
      const h = document.createElement('h4'); h.textContent = 'Key moments'; panel.appendChild(h);
      const ul = document.createElement('ul');
      prev.keyMoments.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      panel.appendChild(ul);
    }
    if (!prev.summary && !(prev.keyMoments || []).length) {
      panel.innerHTML += '<p class="muted">No last-chapter recap available.</p>';
    }
  }

  function renderStorySoFar(panel, recap) {
    panel.innerHTML = '';
    const story = recap.storySoFar || {};
    (story.overview || '').split(/\n\n+/).forEach(p => {
      if (!p.trim()) return;
      const el = document.createElement('p');
      el.textContent = p;
      panel.appendChild(el);
    });
    if ((story.keyPlotPoints || []).length) {
      const h = document.createElement('h4'); h.textContent = 'Key plot points'; panel.appendChild(h);
      const ul = document.createElement('ul');
      story.keyPlotPoints.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      panel.appendChild(ul);
    }
    if ((recap.thingsToRemember || []).length) {
      const h = document.createElement('h4'); h.textContent = 'Things to remember'; panel.appendChild(h);
      const ul = document.createElement('ul');
      recap.thingsToRemember.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      panel.appendChild(ul);
    }
    if (!story.overview && !(story.keyPlotPoints || []).length) {
      panel.innerHTML += '<p class="muted">No story-so-far summary available.</p>';
    }
  }

  function renderWorldPanel(panel, recap) {
    panel.innerHTML = '';
    const places = recap.places || [];
    const items = recap.items || [];
    if (places.length) {
      const h = document.createElement('h4'); h.textContent = 'Places'; panel.appendChild(h);
      const ul = document.createElement('ul');
      places.forEach(p => { const li = document.createElement('li'); li.innerHTML = `<strong></strong> — <span></span>`; $('strong', li).textContent = p.name; $('span', li).textContent = p.note; ul.appendChild(li); });
      panel.appendChild(ul);
    }
    if (items.length) {
      const h = document.createElement('h4'); h.textContent = 'Items'; panel.appendChild(h);
      const ul = document.createElement('ul');
      items.forEach(p => { const li = document.createElement('li'); li.innerHTML = `<strong></strong> — <span></span>`; $('strong', li).textContent = p.name; $('span', li).textContent = p.note; ul.appendChild(li); });
      panel.appendChild(ul);
    }
    if (!places.length && !items.length) {
      panel.innerHTML = '<p class="muted">No places or items recorded yet.</p>';
    }
  }

  // ---------- Character map (Camp Bloom family-tree scaffold) ----------
  // Conceptual mirror of TheBloomCampAndroid genealogy: nodes + typed edges,
  // tap-to-highlight chain. Character graphs aren't trees, so layout is a
  // clustered grid (by groupCluster) rather than Reingold-Tilford.
  function renderCharacterMap(panel, recap) {
    panel.innerHTML = '';
    const characters = (recap.characters || []).filter(c => c && c.name);
    const relationships = (recap.relationships || []).filter(r => r && r.fromId && r.toId && r.kind);
    if (!characters.length) {
      panel.innerHTML = '<p class="muted">No characters recorded yet.</p>';
      return;
    }

    // Toggle: graph vs list
    const toolbar = document.createElement('div');
    toolbar.className = 'map-toolbar';
    toolbar.innerHTML = `
      <div class="seg">
        <button class="seg-btn active" data-mode="graph">Map</button>
        <button class="seg-btn" data-mode="list">List</button>
      </div>
      <span class="muted small" id="map-hint">Tap a character to highlight relationships.</span>
    `;
    panel.appendChild(toolbar);

    const stage = document.createElement('div');
    stage.className = 'map-stage';
    panel.appendChild(stage);

    function renderMode(mode) {
      stage.innerHTML = '';
      if (mode === 'list') {
        renderCharacterList(stage, characters, relationships);
      } else {
        renderCharacterGraph(stage, characters, relationships);
      }
    }

    $$('.seg-btn', toolbar).forEach(btn => btn.addEventListener('click', () => {
      $$('.seg-btn', toolbar).forEach(b => b.classList.toggle('active', b === btn));
      renderMode(btn.dataset.mode);
    }));

    renderMode('graph');
  }

  function renderCharacterList(mount, characters, relationships) {
    const relByChar = new Map();
    relationships.forEach(r => {
      (relByChar.get(r.fromId) || relByChar.set(r.fromId, []).get(r.fromId)).push({ ...r, dir: 'out' });
      (relByChar.get(r.toId) || relByChar.set(r.toId, []).get(r.toId)).push({ ...r, dir: 'in' });
    });
    const byId = Object.fromEntries(characters.map(c => [c.id, c]));
    characters.forEach(c => {
      const d = document.createElement('div');
      d.className = 'character-card';
      d.innerHTML = `<div class="name"></div><div class="role"></div><div class="known"></div><div class="rels muted small"></div>`;
      $('.name', d).textContent = c.name;
      $('.role', d).textContent = [c.role, c.groupCluster].filter(Boolean).join(' · ');
      $('.known', d).textContent = c.knownSoFar || '';
      const rels = (relByChar.get(c.id) || []).map(r => {
        const other = r.dir === 'out' ? byId[r.toId] : byId[r.fromId];
        if (!other) return null;
        const verb = r.dir === 'out' ? r.kind : invertKind(r.kind);
        return `${verb} of ${other.name}`;
      }).filter(Boolean);
      $('.rels', d).textContent = rels.length ? rels.join(' · ') : '';
      mount.appendChild(d);
    });
  }

  function invertKind(kind) {
    const k = (kind || '').toLowerCase();
    const map = {
      parent: 'child', child: 'parent',
      mentor: 'student', student: 'mentor',
      employer: 'employee', employee: 'employer',
      teacher: 'student',
    };
    return map[k] || k;
  }

  function renderCharacterGraph(mount, characters, relationships) {
    // Cluster characters by groupCluster
    const clusters = new Map();
    characters.forEach(c => {
      const k = (c.groupCluster || 'Other').trim() || 'Other';
      if (!clusters.has(k)) clusters.set(k, []);
      clusters.get(k).push(c);
    });
    const clusterNames = [...clusters.keys()];

    // Layout: each cluster is a column. Characters stack vertically within.
    const colW = 200;
    const rowH = 96;
    const padX = 24;
    const padY = 56;
    const headerH = 36;
    const cardW = 168;
    const cardH = 72;

    const cols = clusterNames.length;
    const maxRows = Math.max(...clusterNames.map(k => clusters.get(k).length));
    const width = Math.max(360, cols * colW + padX * 2);
    const height = padY + headerH + maxRows * rowH + padY;

    const positions = {}; // id -> {x, y}
    clusterNames.forEach((name, ci) => {
      const cx = padX + ci * colW + colW / 2;
      const members = clusters.get(name);
      members.forEach((c, ri) => {
        const cy = padY + headerH + ri * rowH + cardH / 2;
        positions[c.id] = { x: cx, y: cy, cluster: name };
      });
    });

    // Build SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'character-graph');
    svg.style.minWidth = width + 'px';
    svg.style.height = height + 'px';

    // Cluster headers
    clusterNames.forEach((name, ci) => {
      const cx = padX + ci * colW + colW / 2;
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', cx);
      text.setAttribute('y', padY + 18);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'cluster-label');
      text.textContent = name;
      svg.appendChild(text);
    });

    // Edges layer (so cards render on top)
    const edgeLayer = document.createElementNS(svgNS, 'g');
    edgeLayer.setAttribute('class', 'edges');
    svg.appendChild(edgeLayer);

    const edges = relationships
      .filter(r => positions[r.fromId] && positions[r.toId])
      .map(r => {
        const a = positions[r.fromId];
        const b = positions[r.toId];
        const path = document.createElementNS(svgNS, 'path');
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        // Curve outward when both ends are in the same cluster column
        const sameCol = Math.abs(a.x - b.x) < 1;
        const d = sameCol
          ? `M ${a.x} ${a.y} C ${a.x + 60} ${a.y}, ${b.x + 60} ${b.y}, ${b.x} ${b.y}`
          : `M ${a.x} ${a.y} Q ${mx} ${my - 24}, ${b.x} ${b.y}`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'edge');
        path.dataset.from = r.fromId;
        path.dataset.to = r.toId;
        edgeLayer.appendChild(path);

        const label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', mx);
        label.setAttribute('y', sameCol ? my : my - 28);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'edge-label');
        label.dataset.from = r.fromId;
        label.dataset.to = r.toId;
        label.textContent = r.kind;
        edgeLayer.appendChild(label);
        return { rel: r, path, label };
      });

    // Nodes layer
    const nodeLayer = document.createElementNS(svgNS, 'g');
    nodeLayer.setAttribute('class', 'nodes');
    svg.appendChild(nodeLayer);

    const nodeEls = {};
    characters.forEach(c => {
      const pos = positions[c.id];
      if (!pos) return;
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', 'node');
      g.setAttribute('transform', `translate(${pos.x - cardW / 2}, ${pos.y - cardH / 2})`);
      g.dataset.id = c.id;

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('width', cardW);
      rect.setAttribute('height', cardH);
      rect.setAttribute('rx', 10);
      rect.setAttribute('class', 'node-card');
      g.appendChild(rect);

      const name = document.createElementNS(svgNS, 'text');
      name.setAttribute('x', cardW / 2);
      name.setAttribute('y', 26);
      name.setAttribute('text-anchor', 'middle');
      name.setAttribute('class', 'node-name');
      name.textContent = truncate(c.name, 22);
      g.appendChild(name);

      const role = document.createElementNS(svgNS, 'text');
      role.setAttribute('x', cardW / 2);
      role.setAttribute('y', 46);
      role.setAttribute('text-anchor', 'middle');
      role.setAttribute('class', 'node-role');
      role.textContent = c.role || '';
      g.appendChild(role);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        selectNode(c.id);
      });
      nodeLayer.appendChild(g);
      nodeEls[c.id] = g;
    });

    // Detail card (shown when a node is selected)
    const detail = document.createElement('div');
    detail.className = 'character-detail';
    detail.hidden = true;
    mount.appendChild(detail);

    function selectNode(id) {
      Object.values(nodeEls).forEach(n => n.classList.toggle('selected', n.dataset.id === id));
      edges.forEach(({ rel, path, label }) => {
        const active = rel.fromId === id || rel.toId === id;
        path.classList.toggle('active', active);
        label.classList.toggle('active', active);
      });
      const c = characters.find(x => x.id === id);
      if (!c) { detail.hidden = true; return; }
      const incoming = relationships.filter(r => r.toId === id);
      const outgoing = relationships.filter(r => r.fromId === id);
      const byId = Object.fromEntries(characters.map(x => [x.id, x]));
      const lines = [];
      outgoing.forEach(r => { const other = byId[r.toId]; if (other) lines.push(`${capFirst(r.kind)} of ${other.name}${r.note ? ' — ' + r.note : ''}`); });
      incoming.forEach(r => { const other = byId[r.fromId]; if (other) lines.push(`${capFirst(invertKind(r.kind))} of ${other.name}${r.note ? ' — ' + r.note : ''}`); });
      detail.innerHTML = `<div class="name"></div><div class="role muted small"></div><p class="known"></p>${lines.length ? '<ul class="rels"></ul>' : ''}`;
      $('.name', detail).textContent = c.name;
      $('.role', detail).textContent = [c.role, c.groupCluster].filter(Boolean).join(' · ');
      $('.known', detail).textContent = c.knownSoFar || '';
      const ul = $('.rels', detail);
      if (ul) lines.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      detail.hidden = false;
    }

    // Click outside to deselect
    svg.addEventListener('click', () => {
      Object.values(nodeEls).forEach(n => n.classList.remove('selected'));
      edges.forEach(({ path, label }) => { path.classList.remove('active'); label.classList.remove('active'); });
      detail.hidden = true;
    });

    // Scroller for wide graphs
    const scroller = document.createElement('div');
    scroller.className = 'graph-scroller';
    scroller.appendChild(svg);
    mount.appendChild(scroller);
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
  }

  function capFirst(s) {
    s = String(s || '');
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
  }

  // ---------- Settings ----------
  function openSettings() {
    const dlg = $('#settings-dialog');
    $('#api-key-input').value = state.apiKey || '';
    $('#model-select').value = state.model || 'claude-opus-4-7';
    $('#google-key-input').value = state.googleBooksKey || '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function wireSettings() {
    $('#settings-btn').addEventListener('click', openSettings);
    const dlg = $('#settings-dialog');
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'save') {
        state.apiKey = $('#api-key-input').value.trim();
        state.model = $('#model-select').value;
        state.googleBooksKey = $('#google-key-input').value.trim();
        saveState();
        toast('Saved.');
      }
    });
  }

  // ---------- Back button ----------
  $('#back-btn').addEventListener('click', () => history.back());

  // ---------- Boot ----------
  wireSettings();
  if (!location.hash) location.hash = '#/';
  route();
})();
