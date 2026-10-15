// Camp Bloom kinship engine — reference implementation.
//
// Given a family graph (people + parent→child edges + spouse edges) and a
// "self" person, computes how every other person is related to self:
// a human label ("2nd cousin once removed", "Stepsister", "Wife's 1st cousin"),
// a group for the Relatives list, a sort key, expected shared DNA, the closest
// common ancestors, and the path through the tree.
//
// Cross-platform parity contract: Kinship.kt (Android) and Kinship.swift (iOS)
// are line-for-line ports. All three are checked against the same fixtures in
// The_Bloom_Camp/specs/kinship_fixtures.json.
//
// Conventions:
//   - Labels describe X relative to self: "X is self's <label>".
//   - A parent is "half" only when BOTH fork children have a known other parent
//     and those differ. Missing data is assumed full (genealogy trees are
//     usually incomplete; guessing "half" from a gap was the old bug).
//   - Ancestors past great-great use Ancestry-style ordinals: "3rd great-grandfather".
//   - Non-blood relationships get a named label when one exists (step-, -in-law,
//     "by marriage"); otherwise a possessive chain ("Wife's 2nd cousin").
(function (root) {
  'use strict';

  const SPOUSE_WEIGHT = 5;
  const MAX_CHAIN_TOKENS = 4;
  // Average autosomal DNA in cM used for the shared-DNA estimate.
  const GENOME_CM = 6800;

  const GROUPS = {
    partner: [0, 'Partners'],
    parents: [1, 'Parents'],
    siblings: [2, 'Siblings'],
    children: [3, 'Children'],
    grandparents: [4, 'Grandparents & ancestors'],
    grandchildren: [5, 'Grandchildren & descendants'],
    auntsUncles: [6, 'Aunts & uncles'],
    niecesNephews: [7, 'Nieces & nephews'],
    // cousins: 10 + level
    step: [100, 'Step family'],
    inLaw: [101, 'In-laws'],
    marriage: [102, 'Extended family by marriage'],
  };

  function ordinal(n) {
    const m100 = n % 100;
    if (m100 >= 11 && m100 <= 13) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  }

  function gendered(g, f, m, n) { return g === 'female' ? f : g === 'male' ? m : n; }

  function lowerFirst(s) { return s.length ? s[0].toLowerCase() + s.slice(1) : s; }

  // "Great-" prefix for `greats` generations beyond grand/aunt level.
  //   0 → "", 1 → "Great-", 2 → "Great-great-", 3+ → "3rd great-"
  function greatPrefix(greats) {
    if (greats <= 0) return '';
    if (greats === 1) return 'Great-';
    if (greats === 2) return 'Great-great-';
    return ordinal(greats) + ' great-';
  }

  function ancestorLabel(d, g) {
    if (d === 1) return gendered(g, 'Mother', 'Father', 'Parent');
    return greatPrefix(d - 2) + gendered(g, 'Grandmother', 'Grandfather', 'Grandparent')
      .replace(/^G/, d > 2 ? 'g' : 'G');
  }

  function descendantLabel(d, g) {
    if (d === 1) return gendered(g, 'Daughter', 'Son', 'Child');
    return greatPrefix(d - 2) + gendered(g, 'Granddaughter', 'Grandson', 'Grandchild')
      .replace(/^G/, d > 2 ? 'g' : 'G');
  }

  // level 1 = aunt/uncle, 2 = great-aunt, …
  function auntUncleLabel(level, g) {
    const base = gendered(g, 'Aunt', 'Uncle', 'Aunt or uncle');
    return level === 1 ? base : greatPrefix(level - 1) + lowerFirst(base);
  }

  function nieceNephewLabel(level, g) {
    const base = gendered(g, 'Niece', 'Nephew', 'Niece or nephew');
    return level === 1 ? base : greatPrefix(level - 1) + lowerFirst(base);
  }

  function removedText(r) {
    if (r === 0) return '';
    if (r === 1) return ' once removed';
    if (r === 2) return ' twice removed';
    return ' ' + r + ' times removed';
  }

  function withHalf(label, half) { return half ? 'Half-' + lowerFirst(label) : label; }

  function spouseWord(g, ended) {
    const w = gendered(g, 'Wife', 'Husband', 'Spouse');
    return ended ? 'Ex-' + lowerFirst(w) : w;
  }

  function Graph(people, parentEdges, spouseEdges) {
    this.byId = new Map();
    for (const p of people) if (p.kind !== 'pet') this.byId.set(p.id, p);
    this.parents = new Map();
    this.children = new Map();
    this.spouses = new Map(); // id → Map(partnerId → ended)
    for (const id of this.byId.keys()) {
      this.parents.set(id, new Set());
      this.children.set(id, new Set());
      this.spouses.set(id, new Map());
    }
    for (const [p, c] of parentEdges) {
      if (!this.byId.has(p) || !this.byId.has(c) || p === c) continue;
      this.parents.get(c).add(p);
      this.children.get(p).add(c);
    }
    for (const [a, b, ended] of spouseEdges) {
      if (!this.byId.has(a) || !this.byId.has(b) || a === b) continue;
      this.spouses.get(a).set(b, !!ended);
      this.spouses.get(b).set(a, !!ended);
    }
    this._anc = new Map();
  }

  Graph.prototype.gender = function (id) { return (this.byId.get(id) || {}).gender || null; };

  // ancestor id → shortest generation distance (self at 0).
  Graph.prototype.ancestors = function (id) {
    let out = this._anc.get(id);
    if (out) return out;
    out = new Map([[id, 0]]);
    const q = [id];
    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      const d = out.get(cur);
      for (const p of sorted(this.parents.get(cur))) {
        if (!out.has(p)) { out.set(p, d + 1); q.push(p); }
      }
    }
    this._anc.set(id, out);
    return out;
  };

  function sorted(set) { return Array.from(set || []).sort(); }

  function byDistance(an) {
    return Array.from(an).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }

  // Blood relationship of x to s, or null. Fields: up (s→CA), down (CA→x),
  // half, double, ancestors (closest common ancestor ids).
  Graph.prototype.blood = function (s, x) {
    if (s === x) return null;
    const anS = this.ancestors(s);
    const anX = this.ancestors(x);
    let best = null;
    for (const [a, dS] of anS) {
      const dX = anX.get(a);
      if (dX === undefined) continue;
      const sum = dS + dX;
      const diff = Math.abs(dS - dX);
      if (!best || sum < best.sum || (sum === best.sum && (diff < best.diff ||
          (diff === best.diff && dS < best.up)))) {
        best = { sum, diff, up: dS, down: dX };
      }
    }
    if (!best) return null;
    const cas = [];
    for (const [a, dS] of anS) {
      if (dS === best.up && anX.get(a) === best.down) cas.push(a);
    }
    cas.sort();
    let half = false;
    let dbl = false;
    if (best.up > 0 && best.down > 0) {
      if (cas.length === 1) half = this._isHalf(cas[0], s, best.up, anS, x, best.down, anX);
      else if (cas.length >= 4 && best.up >= 2 && best.down >= 2) dbl = true;
    }
    return { up: best.up, down: best.down, half, double: dbl, ancestors: cas };
  };

  // Single shared ancestor `a`: the relationship is half only if the two
  // children of `a` that lead down to s and to x each have another known
  // parent, and those other parents differ.
  Graph.prototype._isHalf = function (a, s, up, anS, x, down, anX) {
    const forkS = this._forks(a, s, up, anS);
    const forkX = this._forks(a, x, down, anX);
    for (const fs of forkS) {
      for (const fx of forkX) {
        if (fs === fx) continue;
        const os = sorted(this.parents.get(fs)).filter(p => p !== a);
        const ox = sorted(this.parents.get(fx)).filter(p => p !== a);
        if (os.length === 0 || ox.length === 0) return false;
        if (os.some(p => ox.includes(p))) return false;
      }
    }
    return forkS.length > 0 && forkX.length > 0;
  };

  Graph.prototype._forks = function (a, leaf, depth, an) {
    if (depth === 1) return [leaf];
    return sorted(this.children.get(a)).filter(c => an.get(c) === depth - 1);
  };

  function bloodLabel(b, g) {
    const { up, down } = b;
    if (up === 0) return descendantLabel(down, g);
    if (down === 0) return ancestorLabel(up, g);
    if (up === 1 && down === 1) {
      return b.half ? gendered(g, 'Half-sister', 'Half-brother', 'Half-sibling')
                    : gendered(g, 'Sister', 'Brother', 'Sibling');
    }
    if (up === 1) return withHalf(nieceNephewLabel(down - 1, g), b.half);
    if (down === 1) return withHalf(auntUncleLabel(up - 1, g), b.half);
    const label = ordinal(Math.min(up, down) - 1) + ' cousin' + removedText(Math.abs(up - down));
    if (b.double) return 'Double ' + label;
    return withHalf(label, b.half);
  }

  function bloodGroup(b) {
    const { up, down } = b;
    if (up === 0) return down === 1 ? GROUPS.children : GROUPS.grandchildren;
    if (down === 0) return up === 1 ? GROUPS.parents : GROUPS.grandparents;
    if (up === 1 && down === 1) return GROUPS.siblings;
    if (up === 1) return GROUPS.niecesNephews;
    if (down === 1) return GROUPS.auntsUncles;
    const level = Math.min(up, down) - 1;
    return [10 + level, ordinal(level) + ' cousins'];
  }

  function sharedDna(b) {
    if (b.up === 0 || b.down === 0) return Math.pow(0.5, b.up + b.down);
    let f = Math.pow(0.5, b.up + b.down) * (b.half ? 1 : 2);
    if (b.double) f *= 2;
    return f;
  }

  // Shortest path self → x preferring blood edges over marriages. Blood runs
  // climb then descend; turning back up after descending (a child's other
  // parent) costs as much as a marriage. Returns [{id, via}] where
  // via ∈ 'up' | 'down' | 'spouse' (edge taken to reach id).
  Graph.prototype.path = function (s, x) {
    const tree = this._pathTree(s);
    let goal = null;
    for (const ph of ['0', '1']) {
      const k = x + '|' + ph;
      if (tree.dist.has(k) && (goal === null || tree.dist.get(k) < tree.dist.get(goal))) goal = k;
    }
    if (goal === null) return null;
    const start = s + '|0';
    const out = [];
    let cur = goal;
    while (cur !== start) {
      const [p, via] = tree.prev.get(cur);
      out.push({ id: cur.split('|')[0], via });
      cur = p;
    }
    out.push({ id: s, via: null });
    return out.reverse();
  };

  // Single-source Dijkstra from s over (id, phase) states, cached per source.
  // Phase 0 = may still climb, 1 = descending.
  Graph.prototype._pathTree = function (s) {
    if (!this._trees) this._trees = new Map();
    let tree = this._trees.get(s);
    if (tree) return tree;
    const start = s + '|0';
    const dist = new Map([[start, 0]]);
    const prev = new Map();
    const heap = [[0, start]];
    const done = new Set();
    while (heap.length) {
      const [cd, cur] = heapPop(heap);
      if (done.has(cur)) continue;
      done.add(cur);
      const [id, phase] = cur.split('|');
      const relax = (n, ph, w, via) => {
        const key = n + '|' + ph;
        const nd = cd + w;
        const od = dist.get(key);
        if (od === undefined || nd < od || (nd === od && cur < prev.get(key)[0])) {
          dist.set(key, nd);
          prev.set(key, [cur, via]);
          heapPush(heap, [nd, key]);
        }
      };
      for (const p of sorted(this.parents.get(id))) {
        relax(p, 0, phase === '1' ? 1 + SPOUSE_WEIGHT : 1, 'up');
      }
      for (const c of sorted(this.children.get(id))) relax(c, 1, 1, 'down');
      for (const sp of sorted(this.spouses.get(id).keys())) relax(sp, 0, SPOUSE_WEIGHT, 'spouse');
    }
    tree = { dist, prev };
    this._trees.set(s, tree);
    return tree;
  };

  // Min-heap on [distance, key]; ties break on key for deterministic paths.
  function heapLess(a, b) { return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]); }
  function heapPush(h, v) {
    h.push(v);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!heapLess(h[i], h[p])) break;
      [h[i], h[p]] = [h[p], h[i]];
      i = p;
    }
  }
  function heapPop(h) {
    const top = h[0];
    const last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && heapLess(h[l], h[m])) m = l;
        if (r < h.length && heapLess(h[r], h[m])) m = r;
        if (m === i) break;
        [h[i], h[m]] = [h[m], h[i]];
        i = m;
      }
    }
    return top;
  }

  function isEnded(g, a, b) { return g.spouses.get(a).get(b) === true; }

  // Named non-blood relationship of x to s, or null → [label, group].
  Graph.prototype.named = function (s, x) {
    const g = this.gender(x);
    const sp = this.spouses.get(s);
    if (sp.has(x)) return [spouseWord(g, sp.get(x)), GROUPS.partner];

    for (const c of this.children.get(s)) {
      if (this.parents.get(c).has(x)) return ['Co-parent', GROUPS.partner];
    }

    // Step-parent / step-grandparent: spouse of a direct ancestor, nearest first.
    for (const [a, d] of byDistance(this.ancestors(s))) {
      const m = this.spouses.get(a);
      if (d === 0 || !m.has(x) || m.get(x)) continue;
      if (d === 1) return [gendered(g, 'Stepmother', 'Stepfather', 'Stepparent'), GROUPS.step];
      return [greatPrefix(d - 2) + gendered(g, 'Step-grandmother', 'Step-grandfather', 'Step-grandparent')
        .replace(/^S/, d > 2 ? 's' : 'S'), GROUPS.step];
    }
    // Stepchild / step-grandchild: descendant of a current or former spouse.
    const anX = this.ancestors(x);
    for (const partner of sorted(sp.keys())) {
      if (sp.get(partner)) continue;
      const d = anX.get(partner);
      if (d === undefined || d === 0) continue;
      if (d === 1) return [gendered(g, 'Stepdaughter', 'Stepson', 'Stepchild'), GROUPS.step];
      return [greatPrefix(d - 2) + gendered(g, 'Step-granddaughter', 'Step-grandson', 'Step-grandchild')
        .replace(/^S/, d > 2 ? 's' : 'S'), GROUPS.step];
    }
    // Step-sibling: a parent of x is married to a parent of s.
    for (const ps of this.parents.get(s)) {
      for (const px of this.parents.get(x)) {
        if (this.spouses.get(ps).get(px) === false) {
          return [gendered(g, 'Stepsister', 'Stepbrother', 'Stepsibling'), GROUPS.step];
        }
      }
    }

    // Via s's current spouse: x is a blood relative of the spouse.
    for (const partner of sorted(sp.keys())) {
      if (sp.get(partner)) continue;
      const b = this.blood(partner, x);
      if (!b) continue;
      if (b.down === 0) {
        return [b.up === 1 ? gendered(g, 'Mother-in-law', 'Father-in-law', 'Parent-in-law')
                           : ancestorLabel(b.up, g) + '-in-law', GROUPS.inLaw];
      }
      if (b.up === 1 && b.down === 1) {
        return [gendered(g, 'Sister-in-law', 'Brother-in-law', 'Sibling-in-law'), GROUPS.inLaw];
      }
      if (b.up === 1) return [nieceNephewLabel(b.down - 1, g) + ' (by marriage)', GROUPS.marriage];
    }

    // Via x's current spouse: x married a blood relative of s.
    const sx = this.spouses.get(x);
    for (const partner of sorted(sx.keys())) {
      if (sx.get(partner)) continue;
      const b = this.blood(s, partner);
      if (!b) continue;
      if (b.up === 0) {
        return [b.down === 1 ? gendered(g, 'Daughter-in-law', 'Son-in-law', 'Child-in-law')
                             : descendantLabel(b.down, g) + '-in-law', GROUPS.inLaw];
      }
      if (b.up === 1 && b.down === 1) {
        return [gendered(g, 'Sister-in-law', 'Brother-in-law', 'Sibling-in-law'), GROUPS.inLaw];
      }
      if (b.down === 1 && b.up > 1) {
        return [auntUncleLabel(b.up - 1, g) + ' (by marriage)', GROUPS.marriage];
      }
    }

    // Spouse's sibling's spouse.
    for (const partner of sorted(sp.keys())) {
      if (sp.get(partner)) continue;
      for (const other of sorted(sx.keys())) {
        if (sx.get(other)) continue;
        const b = this.blood(partner, other);
        if (b && b.up === 1 && b.down === 1) {
          return [gendered(g, 'Sister-in-law', 'Brother-in-law', 'Sibling-in-law'), GROUPS.inLaw];
        }
      }
    }
    return null;
  };

  // Possessive chain along the preferred path: "Wife's 2nd cousin",
  // "Stepsister's father". Blood runs collapse to a single term; the longest
  // prefix with a named label replaces the leading terms.
  Graph.prototype.chain = function (s, x, path) {
    const tokens = []; // {end: index into path, word}
    let i = 0;
    while (i < path.length - 1) {
      const from = path[i].id;
      if (path[i + 1].via === 'spouse') {
        const to = path[i + 1].id;
        tokens.push({ end: i + 1, word: spouseWord(this.gender(to), isEnded(this, from, to)) });
        i += 1;
        continue;
      }
      let j = i + 1;
      for (let k = path.length - 1; k > i + 1; k--) {
        if (path.slice(i + 1, k + 1).some(n => n.via === 'spouse')) continue;
        if (this.blood(from, path[k].id)) { j = k; break; }
      }
      const b = this.blood(from, path[j].id);
      const g = this.gender(path[j].id);
      const word = b ? bloodLabel(b, g)
        : path[j].via === 'up' ? ancestorLabel(1, g) : descendantLabel(1, g);
      tokens.push({ end: j, word });
      i = j;
    }
    // Replace the longest prefix that has a direct label.
    let head = 0;
    let headWord = null;
    for (let t = tokens.length - 2; t >= 0; t--) {
      const id = path[tokens[t].end].id;
      const b = this.blood(s, id);
      const n = b ? [bloodLabel(b, this.gender(id))] : this.named(s, id);
      if (n) { head = t + 1; headWord = n[0]; break; }
    }
    const words = headWord ? [headWord].concat(tokens.slice(head).map(t => t.word))
                           : tokens.map(t => t.word);
    if (words.length > MAX_CHAIN_TOKENS) return 'Relative by marriage';
    return words.map((w, idx) => idx === 0 ? w : lowerFirst(w)).join("'s ");
  };

  function relate(graph, s, x) {
    if (s === x || !graph.byId.has(s) || !graph.byId.has(x)) return null;
    const g = graph.gender(x);
    const b = graph.blood(s, x);
    if (b) {
      const grp = bloodGroup(b);
      const dna = sharedDna(b);
      return {
        label: bloodLabel(b, g),
        group: grp[1],
        groupOrder: grp[0],
        blood: true,
        up: b.up,
        down: b.down,
        half: b.half,
        sharedDna: dna,
        sharedCm: Math.round(dna * GENOME_CM),
        commonAncestorIds: b.ancestors,
        pathIds: bloodPath(graph, s, x, b),
      };
    }
    const path = graph.path(s, x);
    if (!path) return null;
    const named = graph.named(s, x);
    const label = named ? named[0] : graph.chain(s, x, path);
    const grp = named ? named[1] : GROUPS.marriage;
    return {
      label,
      group: grp[1],
      groupOrder: grp[0],
      blood: false,
      up: null,
      down: null,
      half: false,
      sharedDna: 0,
      sharedCm: 0,
      commonAncestorIds: [],
      pathIds: path.map(n => n.id),
    };
  }

  // self → … → closest common ancestor → … → x, straight up and down.
  function bloodPath(graph, s, x, b) {
    const ca = b.ancestors[0];
    const climb = (leaf, depth) => {
      const an = graph.ancestors(leaf);
      const out = [leaf];
      let cur = leaf;
      for (let d = 1; d <= depth; d++) {
        const next = sorted(graph.parents.get(cur)).find(p => {
          const pa = graph.ancestors(p);
          return pa.get(ca) === depth - d && an.get(p) === d;
        });
        if (!next) break;
        out.push(next);
        cur = next;
      }
      return out;
    };
    const upPart = climb(s, b.up);
    const downPart = climb(x, b.down).reverse();
    return upPart.concat(downPart.slice(1));
  }

  // Public API --------------------------------------------------------------

  // people: [{id, gender, kind}], parentEdges: [[parentId, childId]],
  // spouseEdges: [[aId, bId, ended]].
  function build(people, parentEdges, spouseEdges) {
    return new Graph(people, parentEdges, spouseEdges);
  }

  // Map id → result for everyone related to selfId.
  function relativesOf(graph, selfId) {
    const out = new Map();
    for (const id of graph.byId.keys()) {
      if (id === selfId) continue;
      const r = relate(graph, selfId, id);
      if (r) out.set(id, r);
    }
    return out;
  }

  function sortKey(r) {
    return [r.groupOrder, r.blood ? r.up + r.down : 99, r.blood ? Math.abs(r.up - r.down) : 0];
  }

  const Kinship = { build, relate, relativesOf, sortKey, ordinal };
  root.Kinship = Kinship;
  if (typeof module !== 'undefined' && module.exports) module.exports = Kinship;
})(typeof window !== 'undefined' ? window : globalThis);
