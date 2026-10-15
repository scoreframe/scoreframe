// KinCamp site chrome: the Night/Day toggle and the drifting fireflies.
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(mq && mq.matches);
  }
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
  function paint() {
    document.querySelectorAll('.themebtn').forEach(function (b) {
      var dark = isDark();
      b.innerHTML = dark ? SUN : MOON;
      b.setAttribute('aria-label', dark ? 'Switch to Day look' : 'Switch to Night look');
      b.title = dark ? 'Day look' : 'Night look';
    });
  }
  window.kcSetTheme = function (t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    try { if (t === 'light' || t === 'dark') localStorage.setItem('kc.theme', t); else localStorage.removeItem('kc.theme'); } catch (e) {}
    paint();
    document.dispatchEvent(new CustomEvent('kc-theme'));
  };
  window.kcIsDark = isDark;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.themebtn');
    if (b) window.kcSetTheme(isDark() ? 'light' : 'dark');
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { paint(); document.dispatchEvent(new CustomEvent('kc-theme')); });
  paint();

  // Fireflies: a few soft glowing dots drifting behind hero panels.
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.querySelectorAll('.ffwrap').forEach(function (wrap) {
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    wrap.appendChild(cv);
    var x = cv.getContext('2d'), W = 0, H = 0, ps = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
    function fit() {
      var r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(8, Math.min(60, Math.round(W * H / 16000)));
      ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, p: Math.random() * 6 });
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
    var t = 0, visible = true;
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(wrap);
    function f() {
      requestAnimationFrame(f);
      if (!visible || document.hidden) return;
      t++;
      x.clearRect(0, 0, W, H);
      var day = !isDark(), g = day ? '47,107,66' : '228,245,122';
      if (!day) {
        var gr = x.createRadialGradient(W * .75, H * 1.1, 0, W * .75, H * 1.1, H * .9);
        gr.addColorStop(0, 'rgba(255,138,102,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.fillRect(0, 0, W, H);
      }
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var a = .25 + .6 * Math.abs(Math.sin((t + p.p * 60) / 50));
        var r = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
        r.addColorStop(0, 'rgba(' + g + ',' + (day ? a * .5 : a) + ')'); r.addColorStop(1, 'rgba(' + g + ',0)');
        x.fillStyle = r; x.beginPath(); x.arc(p.x, p.y, 14, 0, 6.28); x.fill();
      }
    }
    f();
  });
})();
