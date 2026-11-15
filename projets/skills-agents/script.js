/* Environnement IA : câbles, impulsions, dossiers et installation (fonctions du temps) */
(function () {
  'use strict';
  var doc = document, rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var COL = { o: '#3fd6c4', a: '#ffc14d', m: '#a98bff', d: '#ff7a6b' };

  /* ---------- Schéma principal ---------- */
  var svg = $('#sa-svg'), cap = $('#sa-cap'), layer = $('.sa-pulses', svg), lock = $('.sa-lock', svg), check = $('.sa-check', svg);
  var CYCLE = 14.5;
  var cables = {}; ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].forEach(function (id) { var p = $('#' + id, svg); cables[id] = { el: p, len: p.getTotalLength() }; });
  var lit = {
    c0: [[0.2, 1.6], [10.6, 12.2]], c1: [[1.8, 3.4], [7.2, 8.6]], c2: [[1.8, 3.4], [7.2, 8.6]], c3: [[1.8, 3.4], [7.2, 8.6]],
    c4: [[3.3, 4.9]], c5: [[4.8, 7.2]], c6: [[4.8, 7.2]], c7: [[4.8, 7.2]]
  };
  var nodes = {
    'n-dem': [[0, 1.8], [10.6, 12.6]], 'n-a0': [[1.8, 7.8]], 'n-a1': [[1.8, 7.8]], 'n-a2': [[1.8, 7.8]],
    'n-p0': [[4.8, 7.2]], 'n-p1': [[4.8, 7.2]], 'n-p2': [[4.8, 7.2]], 'n-hl': [[3.3, 4.9]]
  };
  var nodeEls = {}; Object.keys(nodes).forEach(function (k) { nodeEls[k] = $('.' + k, svg); });
  var pulses = [ // cable, début, fin, sens inverse, fraction max, couleur
    ['c0', 0.3, 1.5, 0, 1, 'o'], ['c1', 2, 3.2, 0, 1, 'a'], ['c2', 2, 3.2, 0, 1, 'a'], ['c3', 2, 3.2, 0, 1, 'a'],
    ['c4', 3.4, 4.1, 0, 0.85, 'd'], ['c4', 4.1, 4.6, 1, 0.85, 'd'],
    ['c5', 5, 6, 0, 1, 'm'], ['c6', 5, 6, 0, 1, 'm'], ['c7', 5, 6, 0, 1, 'm'], ['c5', 6.2, 7.2, 1, 1, 'm'], ['c6', 6.2, 7.2, 1, 1, 'm'], ['c7', 6.2, 7.2, 1, 1, 'm'],
    ['c1', 7.4, 8.4, 1, 1, 'a'], ['c2', 7.4, 8.4, 1, 1, 'a'], ['c3', 7.4, 8.4, 1, 1, 'a'], ['c0', 10.8, 12, 1, 1, 'o']
  ].map(function (p) {
    var c = doc.createElementNS(NS, 'circle'); c.setAttribute('r', 9); c.setAttribute('fill', COL[p[5]]); c.setAttribute('stroke', '#0d0f15'); c.setAttribute('stroke-width', 3); c.style.display = 'none';
    layer.appendChild(c); return { c: p[0], a: p[1], b: p[2], rev: p[3], max: p[4], el: c };
  });
  var captions = [
    [0, "La demande arrive chez l'orchestrateur."], [1.8, "Il la découpe et délègue aux agents de la liste."], [3.3, "Un agent qui n'est pas dans la liste est refusé."],
    [4.9, "Les agents se branchent aux outils MCP dont ils ont besoin."], [7.3, "Les résultats remontent vers l'orchestrateur."],
    [8.6, "Il vérifie ce qu'il a reçu."], [10.6, "Il livre une synthèse."], [12.6, "La demande suivante peut commencer."]
  ];
  function inWin(ws, t) { for (var i = 0; i < ws.length; i++) if (t >= ws[i][0] && t <= ws[i][1]) return true; return false; }
  var lastCap = -1;
  function renderMain(T) {
    var t = T % CYCLE;
    if (narrow) camera(t);
    Object.keys(lit).forEach(function (k) { cables[k].el.style.opacity = inWin(lit[k], t) ? 1 : 0.28; });
    Object.keys(nodes).forEach(function (k) { nodeEls[k].style.opacity = inWin(nodes[k], t) ? 1 : 0.45; });
    pulses.forEach(function (p) {
      if (t < p.a || t > p.b) { p.el.style.display = 'none'; return; }
      var u = (t - p.a) / (p.b - p.a); u = u * u * (3 - 2 * u); var f = (p.rev ? 1 - u : u) * p.max;
      var c = cables[p.c], pt = c.el.getPointAtLength(f * c.len);
      p.el.setAttribute('cx', pt.x.toFixed(1)); p.el.setAttribute('cy', pt.y.toFixed(1)); p.el.style.display = '';
    });
    lock.setAttribute('opacity', t > 4 && t < 5.4 ? 1 : 0);
    check.setAttribute('opacity', t > 8.6 && t < 10.2 ? 1 : 0);
    var ci = 0; for (var i = 0; i < captions.length; i++) if (t >= captions[i][0]) ci = i;
    if (ci !== lastCap) { cap.textContent = captions[ci][1]; lastCap = ci; }
  }
  /* Sur petit écran : une « caméra » suit l'action au lieu d'afficher tout le schéma */
  var CAMW = 600, CAMH = 520, cams = [[0, 0, 110], [1.4, 0, 110], [1.8, 300, 80], [4.6, 300, 80], [4.9, 600, 0], [7.0, 600, 0], [7.3, 150, 110], [10.2, 150, 110], [10.6, 0, 110], [CYCLE, 0, 110]];
  var narrow = false;
  function camera(t) {
    var a = cams[0], b = cams[1];
    for (var i = 0; i < cams.length - 1; i++) if (t >= cams[i][0]) { a = cams[i]; b = cams[i + 1]; }
    var u = clamp((t - a[0]) / Math.max(0.01, b[0] - a[0]), 0, 1); u = u * u * (3 - 2 * u);
    svg.setAttribute('viewBox', (a[1] + (b[1] - a[1]) * u).toFixed(1) + ' ' + (a[2] + (b[2] - a[2]) * u).toFixed(1) + ' ' + CAMW + ' ' + CAMH);
  }
  function setNarrow() {
    var n = !rm.matches && window.innerWidth < 700;
    if (n !== narrow) { narrow = n; svg.classList.toggle('sa-cam', n); if (!n) svg.setAttribute('viewBox', '0 0 1200 640'); }
  }
  window.addEventListener('resize', setNarrow); setNarrow();
  function staticMain() {
    Object.keys(cables).forEach(function (k) { cables[k].el.style.opacity = 1; });
    Object.keys(nodeEls).forEach(function (k) { nodeEls[k].style.opacity = 1; });
    pulses.forEach(function (p) { p.el.style.display = 'none'; });
    lock.setAttribute('opacity', 1); cap.textContent = "Vue d'ensemble : la demande, l'orchestrateur, les agents de la liste et les outils MCP.";
  }

  /* ---------- Skills : un dossier s'ouvre à la demande ---------- */
  var folds = doc.querySelectorAll('.sa-fold');
  var foldPlan = [[1.2, 4.6, 0], [6, 9.2, 2]], FC = 11;
  function renderFolds(T) {
    var t = T % FC, open = -1; foldPlan.forEach(function (p) { if (t >= p[0] && t < p[1]) open = p[2]; });
    folds.forEach(function (f, i) { var o = i === open; if (f.classList.contains('is-open') !== o) f.classList.toggle('is-open', o); });
  }

  /* ---------- Installeur ---------- */
  var seq = doc.querySelectorAll('#sa-seq li'), items = $('#sa-items'), mode = 'link', IC = 15;
  var names = ['agents', 'skills', 'outils MCP', 'hook'];
  var repoEls = [], machEls = [], lineEls = [], manifest;
  function mk(tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  names.forEach(function (n, i) {
    var y = 62 + i * 58;
    var r = mk('g', {}, items); mk('rect', { x: 26, y: y, width: 158, height: 42, rx: 10, fill: '#232a3a', stroke: '#3a4258' }, r); mk('text', { x: 105, y: y + 28, 'text-anchor': 'middle', 'font-size': 18, fill: '#eceef4' }, r).textContent = n; repoEls.push(r);
    var l = mk('path', { d: 'M184 ' + (y + 21) + ' H336', stroke: '#3fd6c4', 'stroke-width': 3, 'stroke-dasharray': '6 6', fill: 'none' }, items); lineEls.push(l);
    var m = mk('g', {}, items); mk('rect', { x: 336, y: y, width: 158, height: 42, rx: 10, fill: '#232a3a', stroke: '#ffc14d' }, m); var tx = mk('text', { x: 415, y: y + 28, 'text-anchor': 'middle', 'font-size': 18, fill: '#eceef4' }, m); tx.textContent = n; machEls.push({ g: m, t: tx });
  });
  manifest = mk('g', {}, items); mk('rect', { x: 336, y: 294, width: 158, height: 0, rx: 8 }, manifest);
  var mrect = manifest.firstChild; mrect.setAttribute('y', 288); mrect.setAttribute('height', 24); mrect.setAttribute('fill', '#12141b'); mrect.setAttribute('stroke', '#3fd6c4');
  mk('text', { x: 415, y: 305, 'text-anchor': 'middle', 'font-size': 15, fill: '#3fd6c4' }, manifest).textContent = 'manifeste';
  var lastKey = '';
  function renderInstall(T) {
    var t = T % IC, step = -1; // étapes de 2,4 s à partir de 0,5 s
    for (var i = 0; i < 5; i++) if (t >= 0.5 + i * 2.4) step = i;
    var allDone = t >= 0.5 + 5 * 2.4 - 0.2;
    var key = mode + ':' + step + ':' + allDone + ':' + Math.floor((t - 5.3) * 4);
    seq.forEach(function (li, i) {
      var cls = allDone || i < step ? 'is-done' : i === step ? 'is-active' : '';
      if (li.className !== cls) li.className = cls;
    });
    machEls.forEach(function (m, i) {
      var shown = i < 3 ? (step >= 3 || (step === 2 && t >= 5.3 + i * 0.5)) : step >= 3 && t >= 0.5 + 3 * 2.4 + 0.4;
      var o = shown ? 1 : 0; m.g.setAttribute('opacity', o);
      lineEls[i].setAttribute('opacity', mode === 'link' && shown && i < 3 ? 1 : 0);
      m.t.textContent = names[i] + (mode === 'link' && i < 3 ? ' ↪' : '');
    });
    manifest.setAttribute('opacity', step >= 4 ? 1 : 0);
    // le hook se fusionne : pas de lien, juste une ligne dans les réglages
    machEls[3].t.textContent = 'hook (fusionné)';
    lineEls[3].setAttribute('opacity', 0);
  }
  var poseTxt = { link: 'liens symboliques vers le dépôt', copy: 'copies indépendantes du dépôt' };
  var modeTxt = {
    link: '--link pose des liens symboliques vers le dépôt : une modification y est prise en compte tout de suite.',
    copy: '--copy pose des copies indépendantes : le dépôt peut changer sans toucher à la machine.'
  };
  doc.querySelectorAll('.sa-modes .sa-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-mode');
      doc.querySelectorAll('.sa-modes .sa-btn').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $('#sa-modetxt').textContent = modeTxt[mode]; $('#sa-pose').textContent = poseTxt[mode];
      if (rm.matches) renderInstall(IC - 0.01); else renderInstall(clock.inst);
    });
  });

  /* ---------- Boucle commune ---------- */
  var clock = { main: 0, fold: 0, inst: 0 }, vis = { main: true, fold: false, inst: false }, paused = false, raf = 0, prev = 0;
  function active() { return !rm.matches && !doc.hidden && !paused && (vis.main || vis.fold || vis.inst); }
  function frame(now) {
    raf = 0; if (!active()) { prev = 0; return; }
    var dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0; prev = now;
    if (vis.main) { clock.main += dt; renderMain(clock.main); }
    if (vis.fold) { clock.fold += dt; renderFolds(clock.fold); }
    if (vis.inst) { clock.inst += dt; renderInstall(clock.inst); }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && active()) { prev = 0; raf = requestAnimationFrame(frame); } }
  function watch(el, key, th) {
    if (!('IntersectionObserver' in window)) { vis[key] = true; return; }
    new IntersectionObserver(function (e) { vis[key] = e[0].isIntersecting; kick(); }, { threshold: th }).observe(el);
  }
  watch(svg, 'main', 0.1); watch($('#sa-folders'), 'fold', 0.3); watch($('#sa-inst-svg'), 'inst', 0.3);
  doc.addEventListener('visibilitychange', kick);
  $('#sa-pause').addEventListener('click', function () { paused = !paused; this.setAttribute('aria-pressed', paused); this.textContent = paused ? 'Reprendre' : 'Mettre en pause'; kick(); });

  if (rm.matches) {
    staticMain(); folds[0].classList.add('is-open'); renderInstall(IC - 0.01); $('#sa-pause').hidden = true;
  } else {
    renderMain(0); renderFolds(0); renderInstall(0);
    var q = /[?&]t=([\d.]+)/.exec(location.search);
    if (q) { paused = true; clock.main = clock.fold = clock.inst = parseFloat(q[1]); renderMain(clock.main); renderFolds(clock.fold); renderInstall(clock.inst); }
    kick();
  }
})();
