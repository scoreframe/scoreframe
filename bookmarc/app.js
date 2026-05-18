(() => {
  'use strict';

  // ---------- Storage ----------
  const STORE_KEY = 'bookmarc.v1';

  const defaultState = () => ({
    apiKey: '',
    googleBooksKey: '',
    model: 'claude-opus-4-7',
    books: [],
    briefs: {},        // bookId -> full book brief (v0.1.0+)
    qaThreads: {},     // bookId -> [{ q, a, atChapter, timestamp }]
    recaps: {},        // legacy: key `${bookId}::${chapter}::v2` (pre-0.1.0)
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
      const brief = state.briefs[b.id];
      if (!brief) {
        renderBookNoBrief(main, b);
      } else {
        renderBookWithBrief(main, b, brief);
      }
    });
  }

  function renderBookNoBrief(main, b) {
    const wrap = document.createElement('section');
    wrap.className = 'view book';
    wrap.innerHTML = `
      <div class="book-header">
        <img id="book-cover" alt="" />
        <div class="book-meta">
          <h2></h2>
          <p class="muted"></p>
        </div>
      </div>
      <div class="brief-card">
        <h3>Bookmarc doesn't know this book yet</h3>
        <p class="muted">Generate a one-time book brief — chapter list, characters, places, plot threads. Uses one Opus call (~30s, roughly $0.10). After that everything is instant and offline.</p>
        <button class="primary" id="gen-brief-btn">Generate book brief</button>
        <div id="brief-status" class="muted small"></div>
      </div>
      <button class="link danger" id="remove-book-btn">Remove this book</button>
    `;
    main.appendChild(wrap);
    $('#book-cover', wrap).src = b.coverUrl || '';
    $('.book-meta h2', wrap).textContent = b.title;
    $('.book-meta .muted', wrap).textContent = (b.authors || []).join(', ');
    $('#gen-brief-btn', wrap).addEventListener('click', () => doGenerateBrief(b));
    $('#remove-book-btn', wrap).addEventListener('click', () => removeBook(b));
  }

  function renderBookWithBrief(main, b, brief) {
    const wrap = document.createElement('section');
    wrap.className = 'view book';
    const totalChapters = (brief.chapters || []).length;
    if (totalChapters && b.totalChapters !== totalChapters) {
      b.totalChapters = totalChapters;
      saveState();
    }
    wrap.innerHTML = `
      <div class="book-header">
        <img id="book-cover" alt="" />
        <div class="book-meta">
          <h2></h2>
          <p class="muted authors"></p>
          <p class="muted small confidence"></p>
        </div>
      </div>
      <div class="progress-card">
        <label for="chapter-select">I'm at the end of</label>
        <select id="chapter-select"></select>
        <button class="primary" id="catchup-btn">Catch me up</button>
      </div>
      <div id="recap-area"></div>
      <div class="ask-card">
        <h3>Ask Bookmarc</h3>
        <p class="muted small">Pointed question about plot or characters. We won't spoil anything past your current chapter.</p>
        <div class="ask-row">
          <input id="ask-input" type="text" placeholder="e.g. Who is Robert Langdon working with?" />
          <button class="primary" id="ask-btn">Ask</button>
        </div>
        <div id="ask-thread" class="ask-thread"></div>
      </div>
      <div class="brief-meta">
        <button class="link" id="regen-brief-btn">Regenerate book brief</button>
        <button class="link danger" id="remove-book-btn">Remove this book</button>
      </div>
    `;
    main.appendChild(wrap);
    $('#book-cover', wrap).src = b.coverUrl || '';
    $('.book-meta h2', wrap).textContent = b.title;
    $('.book-meta .authors', wrap).textContent = (b.authors || []).join(', ');
    const lvl = brief.knowledgeLevel;
    const chip = document.createElement('span');
    chip.className = `knowledge-chip level-${lvl || 'unknown'}`;
    chip.textContent = knowledgeLevelLabel(lvl);
    chip.title = brief.knowledgeNote || '';
    const confEl = $('.book-meta .confidence', wrap);
    confEl.innerHTML = `${totalChapters} chapters · `;
    confEl.appendChild(chip);
    if (brief.knowledgeNote) {
      const note = document.createElement('div');
      note.className = 'muted small knowledge-note';
      note.textContent = brief.knowledgeNote;
      confEl.parentElement.appendChild(note);
    }

    // Chapter select — populated with titles when available
    const select = $('#chapter-select', wrap);
    select.innerHTML = '<option value="0">Not started</option>';
    (brief.chapters || []).forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.number;
      const labelTitle = ch.title ? ` — ${ch.title}` : '';
      opt.textContent = `Chapter ${ch.number}${labelTitle}`;
      select.appendChild(opt);
    });
    select.value = String(b.currentChapter || 0);
    select.addEventListener('change', () => {
      b.currentChapter = parseInt(select.value, 10) || 0;
      saveState();
      // Re-render inline preview area
      renderInlineRecap(b, brief, $('#recap-area', wrap));
    });

    renderInlineRecap(b, brief, $('#recap-area', wrap));

    $('#catchup-btn', wrap).addEventListener('click', () => {
      if ((b.currentChapter || 0) <= 0) { toast('Pick a chapter first.'); return; }
      navigate(`/book/${b.id}/recap`);
    });

    // Q&A
    renderAskThread(b, $('#ask-thread', wrap));
    const askInput = $('#ask-input', wrap);
    const askBtn = $('#ask-btn', wrap);
    const submitAsk = () => {
      const q = askInput.value.trim();
      if (!q) return;
      askInput.value = '';
      doAsk(b, brief, q, wrap);
    };
    askBtn.addEventListener('click', submitAsk);
    askInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitAsk(); });

    $('#regen-brief-btn', wrap).addEventListener('click', () => {
      if (!confirm('Regenerate the brief? This uses one Opus call (~$0.10) and replaces the existing brief.')) return;
      delete state.briefs[b.id];
      saveState();
      doGenerateBrief(b);
    });
    $('#remove-book-btn', wrap).addEventListener('click', () => removeBook(b));
  }

  function renderInlineRecap(b, brief, mountEl) {
    mountEl.innerHTML = '';
    const ch = b.currentChapter || 0;
    if (ch <= 0) {
      mountEl.innerHTML = '<p class="muted small">Set your current chapter and tap "Catch me up" for the recap.</p>';
      return;
    }
    const sliced = sliceBrief(brief, ch);
    const prevSummary = (sliced.previousChapter && sliced.previousChapter.summary) || '';
    if (!prevSummary) {
      mountEl.innerHTML = '<p class="muted small">No previously-on summary available for this chapter.</p>';
      return;
    }
    const div = document.createElement('div');
    div.className = 'recap-inline';
    div.innerHTML = `
      <h4 class="previously-eyebrow">Previously, in <em></em></h4>
      <p></p>
      <button class="link inline-recap-open">Open full recap →</button>
    `;
    $('em', div).textContent = b.title;
    $('p', div).textContent = prevSummary;
    $('.inline-recap-open', div).addEventListener('click', () => navigate(`/book/${b.id}/recap`));
    mountEl.appendChild(div);
  }

  function removeBook(b) {
    if (!confirm(`Remove "${b.title}" from your library?`)) return;
    state.books = state.books.filter(x => x.id !== b.id);
    delete state.briefs[b.id];
    delete state.qaThreads[b.id];
    for (const k of Object.keys(state.recaps)) {
      if (k.startsWith(b.id + '::')) delete state.recaps[k];
    }
    saveState();
    navigate('/');
  }


  // ---------- Recap rendering ----------

  // ---------- Book brief generation (one call per book) ----------
  async function doGenerateBrief(b) {
    if (!state.apiKey) {
      toast('Add your Anthropic API key in Settings.');
      openSettings();
      return;
    }
    const statusEl = document.querySelector('#brief-status');
    const btn = document.querySelector('#gen-brief-btn');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Asking Claude to read up on this book… this can take 30-90 seconds.';
    try {
      const brief = await generateBookBrief(b);
      brief.generatedAt = Date.now();
      state.briefs[b.id] = brief;
      // Auto-populate total chapters
      if ((brief.chapters || []).length) b.totalChapters = brief.chapters.length;
      saveState();
      route(); // re-render — will now show brief UI
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = err.message || 'Failed to generate brief.';
      if (btn) btn.disabled = false;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function generateBookBrief(book) {
    const system = `You are Bookmarc. You produce a STRUCTURED book brief that a reader's local app will use to slice progressive, spoiler-free recaps.

You will return a JSON brief that covers the ENTIRE book chapter-by-chapter. The user's client will slice it based on how far they've read — so include full data, tagged with the chapter where each thing is first revealed. The client handles spoiler protection by filtering on "firstChapter".

Hard rules:
- Every entity (character, place, item, relationship) must have an integer "firstChapter" — the chapter at the end of which the reader first knows about it.
- Each chapter entry's "summary" must describe ONLY events in THAT chapter (not cumulative).
- Character IDs are lowercase short slugs (e.g. "robert-langdon"), stable across all references.
- relationships.fromId and toId must reference real character IDs.
- "groupCluster" groups characters by faction/family/household. Use identical strings for groupings.

For knowledgeLevel, self-report honestly:
  1 = public domain or canonical text — you've effectively memorized the prose and can produce near-verbatim recall of chapter contents
  2 = popular published book — you know the plot, characters, and structure well from summaries/reviews/study guides, but not the prose itself
  3 = new/obscure book — you have very limited knowledge. Output will be sparse; only include things you are genuinely confident about.

If knowledgeLevel is 3, return MOSTLY EMPTY arrays. Do not invent. The user is better served by a sparse honest brief than a confident hallucination.

Respond with ONLY a single JSON object. No prose before or after.`;

    const isbn = book.isbn ? `\nISBN: ${book.isbn}` : '';
    const userMsg = `Book: "${book.title}" by ${(book.authors || []).join(', ') || 'unknown author'}${isbn}

Produce a complete book brief as JSON matching this schema:

{
  "knowledgeLevel": 1 | 2 | 3,
  "knowledgeNote": "one sentence explaining what you do/don't know about this specific book — e.g. 'Public-domain classic, full text in training data' or 'Popular thriller, plot well-documented in reviews' or 'Recent release, only know the publisher blurb'",
  "title": "${escapeForPrompt(book.title)}",
  "author": "${escapeForPrompt((book.authors || []).join(', '))}",
  "totalChapters": <integer count of chapters in this book>,
  "chapters": [
    {
      "number": 1,
      "title": "optional chapter title or section heading if you know it",
      "summary": "1-2 paragraph recap of ONLY this chapter's events. Past tense.",
      "keyMoments": ["3-6 short bullet phrases — the most important beats of this chapter"]
    }
    // ... one entry per chapter, ALL chapters
  ],
  "characters": [
    {
      "id": "lowercase-slug",
      "name": "...",
      "role": "protagonist | antagonist | supporting | mentioned",
      "groupCluster": "short label — family/faction/group (identical strings group together)",
      "firstChapter": <integer — chapter where reader first meets/learns of this character>,
      "bio": "full character description (spoilers OK — client filters by firstChapter)",
      "progression": [
        { "chapter": <int>, "note": "what we learn about this character in this specific chapter" }
      ]
    }
  ],
  "relationships": [
    {
      "fromId": "char-slug",
      "toId": "other-slug",
      "kind": "parent | spouse | sibling | friend | mentor | rival | enemy | lover | employer | ally | colleague | student | other-short-label",
      "firstChapter": <integer — chapter where this relationship is first knowable to the reader>,
      "note": "optional one-sentence context"
    }
  ],
  "places": [
    {
      "id": "lowercase-slug",
      "name": "...",
      "firstChapter": <integer>,
      "note": "brief description"
    }
  ],
  "items": [
    {
      "id": "lowercase-slug",
      "name": "...",
      "firstChapter": <integer>,
      "note": "brief description (significant object: MacGuffin, weapon, letter, locket, etc.)"
    }
  ],
  "openThreads": [
    {
      "thread": "short description of an unresolved mystery/question/promise the reader should track",
      "introducedChapter": <integer>,
      "resolvedChapter": <integer or null if unresolved by end of book>
    }
  ]
}

If knowledgeLevel is 3, prefer empty arrays over invented content. It is OK to return a brief with only knowledgeLevel + knowledgeNote + (sparse) chapters and nothing else.`;

    const body = {
      model: state.model || 'claude-opus-4-7',
      max_tokens: 16000,
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
    return parseJsonResponse(text);
  }

  function escapeForPrompt(s) {
    return String(s || '').replace(/"/g, '\\"');
  }

  function parseJsonResponse(text) {
    let t = text.trim();
    const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (fence) t = fence[1];
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first >= 0 && last > first) t = t.slice(first, last + 1);
    try {
      return JSON.parse(t);
    } catch (e) {
      throw new Error('Could not parse Claude response as JSON. Raw start: ' + text.slice(0, 120));
    }
  }

  // ---------- Brief slicing (no API call — pure local) ----------
  function sliceBrief(brief, chapter) {
    const ch = chapter || 0;
    const chapters = (brief.chapters || []).filter(c => (c.number || 0) <= ch);
    const previousChapter = (brief.chapters || []).find(c => (c.number || 0) === ch) || null;
    const characters = (brief.characters || []).filter(c => (c.firstChapter || 1) <= ch).map(c => {
      const progression = (c.progression || []).filter(p => (p.chapter || 1) <= ch);
      const knownSoFar = progression.length
        ? progression.map(p => p.note).join(' ')
        : c.bio || '';
      return { ...c, knownSoFar, progression };
    });
    const charIds = new Set(characters.map(c => c.id));
    const relationships = (brief.relationships || [])
      .filter(r => (r.firstChapter || 1) <= ch)
      .filter(r => charIds.has(r.fromId) && charIds.has(r.toId));
    const places = (brief.places || []).filter(p => (p.firstChapter || 1) <= ch);
    const items = (brief.items || []).filter(p => (p.firstChapter || 1) <= ch);
    const thingsToRemember = (brief.openThreads || [])
      .filter(t => (t.introducedChapter || 1) <= ch)
      .filter(t => t.resolvedChapter == null || t.resolvedChapter > ch)
      .map(t => t.thread);

    const storyOverview = chapters.length
      ? chapters.map(c => c.summary).filter(Boolean).join('\n\n')
      : '';
    const storyKeyPlotPoints = chapters.flatMap(c => c.keyMoments || []);

    return {
      knowledgeLevel: brief.knowledgeLevel,
      knowledgeNote: brief.knowledgeNote,
      confidence: knowledgeLevelToConfidence(brief.knowledgeLevel),
      generatedAt: brief.generatedAt,
      previousChapter: previousChapter ? {
        title: previousChapter.title,
        summary: previousChapter.summary,
        keyMoments: previousChapter.keyMoments || [],
      } : null,
      storySoFar: {
        overview: storyOverview,
        keyPlotPoints: storyKeyPlotPoints,
      },
      characters,
      relationships,
      places,
      items,
      thingsToRemember,
    };
  }

  function knowledgeLevelToConfidence(level) {
    if (level === 1) return 'high (verbatim)';
    if (level === 2) return 'high (summary-level)';
    if (level === 3) return 'low (sparse knowledge)';
    return 'unknown';
  }

  // ---------- Q&A flow ----------
  async function doAsk(b, brief, q, wrap) {
    if (!state.apiKey) { toast('Add your Anthropic API key in Settings.'); openSettings(); return; }
    const ch = b.currentChapter || 0;
    if (ch <= 0) { toast('Pick a current chapter first.'); return; }
    if (!state.qaThreads[b.id]) state.qaThreads[b.id] = [];
    const entry = { q, a: null, atChapter: ch, timestamp: Date.now(), pending: true };
    state.qaThreads[b.id].push(entry);
    saveState();
    const threadEl = $('#ask-thread', wrap);
    renderAskThread(b, threadEl);
    try {
      const answer = await askQuestion(b, brief, q, ch);
      entry.a = answer;
      entry.pending = false;
    } catch (err) {
      entry.a = `(error: ${err.message || 'failed'})`;
      entry.pending = false;
    }
    saveState();
    renderAskThread(b, threadEl);
  }

  function renderAskThread(b, mount) {
    if (!mount) return;
    mount.innerHTML = '';
    const thread = state.qaThreads[b.id] || [];
    [...thread].reverse().forEach(entry => {
      const div = document.createElement('div');
      div.className = 'ask-entry';
      div.innerHTML = `
        <div class="q"><strong>You — at ch. ${entry.atChapter}:</strong> <span></span></div>
        <div class="a"></div>
      `;
      $('.q span', div).textContent = entry.q;
      const aEl = $('.a', div);
      if (entry.pending) {
        aEl.innerHTML = '<span class="spinner"></span> Thinking…';
      } else {
        aEl.textContent = entry.a || '';
      }
      mount.appendChild(div);
    });
  }

  async function askQuestion(book, brief, question, chapter) {
    const sliced = sliceBrief(brief, chapter);
    const system = `You are Bookmarc answering pointed questions from a reader who is partway through a book.

Hard rules:
- The reader has finished chapter ${chapter} of "${book.title}".
- ONLY use information from the SLICED BRIEF below (everything in there is safe — already revealed by end of chapter ${chapter}).
- Do NOT add information from your training data that goes beyond what is in the sliced brief.
- If the answer requires information that's not in the sliced brief, say "That hasn't been revealed yet by chapter ${chapter}" or similar — do not speculate or spoil.
- Keep answers tight: 1-3 short paragraphs.
- Plain text. No JSON, no markdown headers.`;
    const userMsg = `Sliced brief (only things known by end of chapter ${chapter}):
${JSON.stringify({
  previousChapter: sliced.previousChapter,
  storySoFar: sliced.storySoFar,
  characters: sliced.characters.map(c => ({ id: c.id, name: c.name, role: c.role, knownSoFar: c.knownSoFar })),
  relationships: sliced.relationships,
  places: sliced.places,
  items: sliced.items,
  thingsToRemember: sliced.thingsToRemember,
}, null, 2)}

Reader's question: ${question}`;

    const body = {
      model: state.model || 'claude-opus-4-7',
      max_tokens: 1024,
      temperature: 0.3,
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
    return (data.content || []).map(c => c.text || '').join('').trim();
  }

  // ---------- Recap view (tabbed) — derived from the brief slice ----------
  function renderRecap(bookId) {
    const b = findBook(bookId);
    if (!b) { navigate('/'); return; }
    const brief = state.briefs[b.id];
    if (!brief) { navigate(`/book/${b.id}`); return; }
    const ch = b.currentChapter || 0;
    if (ch <= 0) { navigate(`/book/${b.id}`); return; }
    const recap = sliceBrief(brief, ch);
    render(main => {
      const node = cloneTpl('tpl-recap');
      main.appendChild(node);

      renderPreviously($('[data-panel="previously"]', main), recap, b);
      renderStorySoFar($('[data-panel="story"]', main), recap);
      renderCharacterMap($('[data-panel="characters"]', main), recap);
      renderWorldPanel($('[data-panel="world"]', main), recap);

      $$('.tab', main).forEach(t => t.addEventListener('click', () => {
        $$('.tab', main).forEach(x => x.classList.toggle('active', x === t));
        const which = t.dataset.tab;
        $$('.tab-panel', main).forEach(p => p.hidden = p.dataset.panel !== which);
      }));

      $('#recap-confidence', main).textContent = `Through chapter ${ch} · ${knowledgeLevelLabel(brief.knowledgeLevel)} · brief generated ${new Date(brief.generatedAt || Date.now()).toLocaleString()}`;
    });
  }

  function knowledgeLevelLabel(level) {
    if (level === 1) return 'Verbatim knowledge';
    if (level === 2) return 'Summary-level knowledge';
    if (level === 3) return 'Sparse knowledge — output may be limited';
    return 'unknown knowledge level';
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
