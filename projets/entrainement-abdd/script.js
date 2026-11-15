/* Cabanes Alpines : neige, schéma, requête, sécurité par ligne, compteurs */
(function () {
  'use strict';
  var doc = document, rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  doc.body.classList.add('ca-js');
  var $ = function (s) { return doc.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  /* ---------- Étoiles et fumée (décor SVG) ---------- */
  var stars = $('.ca-stars');
  for (var i = 0; i < 70; i++) {
    var c = doc.createElementNS(NS, 'circle');
    c.setAttribute('cx', Math.round(rnd() * 1600)); c.setAttribute('cy', Math.round(rnd() * 240));
    c.setAttribute('r', (0.8 + rnd() * 1.6).toFixed(1)); c.setAttribute('opacity', (0.35 + rnd() * 0.6).toFixed(2));
    stars.appendChild(c);
  }
  var smoke = $('.ca-smoke'), puffs = [];
  for (i = 0; i < 6; i++) { var p = doc.createElementNS(NS, 'circle'); smoke.appendChild(p); puffs.push(p); }
  function drawSmoke(T) {
    puffs.forEach(function (p, k) {
      var ph = (T * 0.16 + k / 6) % 1;
      p.setAttribute('cx', (211 + Math.sin(ph * 5 + k) * 8 + ph * 26).toFixed(1));
      p.setAttribute('cy', (-12 - ph * 80).toFixed(1));
      p.setAttribute('r', (5 + ph * 12).toFixed(1));
      p.setAttribute('opacity', (0.5 * (1 - ph)).toFixed(2));
    });
  }

  /* ---------- Neige ---------- */
  var cv = $('#ca-snow'), g = cv.getContext('2d'), flakes = [], hero = $('.ca-hero');
  function sizeSnow() {
    var r = hero.getBoundingClientRect(); cv.width = Math.round(r.width); cv.height = Math.round(r.height);
    var n = r.width < 600 ? 55 : 120; flakes = []; seed = 11;
    for (var k = 0; k < n; k++) flakes.push({ x: rnd(), y: rnd(), r: 1 + rnd() * 2.4, v: 18 + rnd() * 30, a: 8 + rnd() * 18, f: 0.4 + rnd() * 0.8, ph: rnd() * 6.28 });
  }
  function drawSnow(T) {
    g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = 'rgba(238,244,249,.85)';
    for (var k = 0; k < flakes.length; k++) {
      var f = flakes[k], H = cv.height + 20;
      var y = (f.y * H + f.v * T) % H - 10, x = f.x * cv.width + Math.sin(T * f.f + f.ph) * f.a;
      g.beginPath(); g.arc(x, y, f.r, 0, 6.2832); g.fill();
    }
  }

  /* ---------- Boucle unique ---------- */
  var T = 0, prev = 0, raf = 0, heroVisible = true, rlsVisible = false;
  var plays = []; // animations jouées une fois : {start, dur, fn}
  var rls = { role: 'gardien', user: false, clock: 0 };
  function active() { return !doc.hidden && !rm.matches && (heroVisible || plays.length || rlsVisible); }
  function frame(now) {
    raf = 0;
    if (!active()) { prev = 0; return; }
    var dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0; prev = now;
    if (heroVisible) { T += dt; drawSnow(T); drawSmoke(T); }
    for (var k = plays.length - 1; k >= 0; k--) {
      var a = plays[k]; if (a.t0 === null) a.t0 = now;
      var u = clamp((now - a.t0) / 1000 / a.dur, 0, 1); a.fn(u);
      if (u >= 1) plays.splice(k, 1);
    }
    if (rlsVisible && !rls.user) { rls.clock += dt; if (rls.clock > 4.5) { rls.clock = 0; setRole(rls.role === 'gardien' ? 'admin' : 'gardien'); } }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && active()) { prev = 0; raf = requestAnimationFrame(frame); } }
  function play(dur, fn) { if (rm.matches) { fn(1); return; } plays.push({ t0: null, dur: dur, fn: fn }); kick(); }
  function whenVisible(el, cb, th) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); cb(); } }, { threshold: th || 0.3 });
    io.observe(el);
  }
  doc.addEventListener('visibilitychange', kick);

  /* ---------- Héros : visibilité, parallaxe ---------- */
  sizeSnow(); drawSnow(0); drawSmoke(0);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; kick(); }, { threshold: 0 }).observe(hero);
  window.addEventListener('resize', function () { sizeSnow(); drawSnow(T); });
  var layers = doc.querySelectorAll('[data-px]'), ticking = false;
  function par() { ticking = false; var y = window.scrollY; layers.forEach(function (l) { l.style.transform = 'translateY(' + (y * l.getAttribute('data-px')).toFixed(1) + 'px)'; }); }
  if (!rm.matches) window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });

  /* ---------- Schéma relationnel : tables puis flèches ---------- */
  var er = $('#ca-er'), tbs = er.querySelectorAll('.ca-tb'), edges = er.querySelectorAll('.ca-edges path');
  function erStep(u) {
    var total = 6, tt = u * total; // secondes simulées
    tbs.forEach(function (t, k) { t.style.opacity = ease(clamp((tt - k * 0.35) / 0.6, 0, 1)); });
    edges.forEach(function (e, k) { var v = ease(clamp((tt - 2.2 - k * 0.5) / 0.7, 0, 1)); e.style.strokeDasharray = '1'; e.style.strokeDashoffset = (1 - v).toFixed(3); e.style.opacity = v > 0 ? 1 : 0; });
  }
  if (!rm.matches) { erStep(0); whenVisible(er, function () { play(6, erStep); }, 0.3); }

  /* ---------- Requête SQL ---------- */
  var sqlEl = $('#ca-sql'), SQL = sqlEl.textContent, resBody = $('#ca-result tbody'), resRows = $('.ca-rows'), resBox = $('#ca-result');
  function hl(s) {
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return s.replace(/\b(SELECT|FROM|JOIN|ON|GROUP BY|ORDER BY|DESC|AS)\b/g, '<span class="k">$1</span>')
      .replace(/\b(count|sum)(?=\()/g, '<span class="f">$1</span>');
  }
  function sqlStep(u) {
    var n = Math.round(clamp(u / 0.55, 0, 1) * SQL.length);
    sqlEl.innerHTML = hl(SQL.slice(0, n));
    var rows = resBody.rows;
    var pre = (u - 0.62) / 0.38;
    resBox.style.opacity = u > 0.6 ? 1 : 0.25;
    for (var k = 0; k < rows.length; k++) { rows[k].style.opacity = ease(clamp(pre * 3 - k, 0, 1)); }
    resRows.style.opacity = pre > 0.95 ? 1 : 0;
  }
  var sqlRun = function () { play(7, sqlStep); };
  if (!rm.matches) { sqlStep(0); whenVisible(sqlEl, sqlRun, 0.5); }
  else sqlEl.innerHTML = hl(SQL);
  $('#ca-replay').addEventListener('click', function () { if (rm.matches) return; plays = plays.filter(function (a) { return a.fn !== sqlStep; }); sqlRun(); });

  /* ---------- Sécurité par ligne ---------- */
  var rowsT = doc.querySelectorAll('#ca-rls-t tbody tr'), cnt = $('#ca-count'), roleBtns = doc.querySelectorAll('.ca-role');
  function setRole(r) {
    rls.role = r;
    var n = 0;
    rowsT.forEach(function (tr) { var off = r === 'gardien' && tr.getAttribute('data-c') !== 'm'; tr.classList.toggle('is-off', off); if (!off) n++; });
    cnt.textContent = (r === 'gardien' ? 'Gardien des Mélèzes : ' : 'Rôle sans restriction : ') + n + ' ligne' + (n > 1 ? 's' : '') + ' sur 8.';
    roleBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-role') === r ? 'true' : 'false'); });
  }
  roleBtns.forEach(function (b) { b.addEventListener('click', function () { rls.user = true; setRole(b.getAttribute('data-role')); }); });
  setRole('gardien');
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { rlsVisible = e[0].isIntersecting; kick(); }, { threshold: 0.4 }).observe($('#ca-rls-t'));

  /* ---------- Chiffres et tests ---------- */
  var figs = doc.querySelectorAll('#ca-figs b'), tests = $('#ca-tests'), squares = [];
  for (i = 0; i < 58; i++) { var s = doc.createElement('i'); tests.appendChild(s); squares.push(s); }
  function figStep(u) {
    figs.forEach(function (b) { b.textContent = fmt(Math.round(+b.getAttribute('data-n') * ease(u))); });
    var n = Math.round(u * 58); squares.forEach(function (q, k) { q.className = k < n ? 'ok' : ''; });
  }
  if (rm.matches) figStep(1); else { figStep(0); whenVisible($('#ca-figs'), function () { play(2.6, figStep); }, 0.4); }
})();
