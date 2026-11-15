/* INLO : simulation pédagogique et simplifiée. Aucune donnée n'est envoyée ni stockée. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  function fr(n, d) { return n.toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  /* Même calcul que la fonction de notation : division entière */
  function score(passed, len) { return len ? Math.floor(passed * 100 / len) : 0; }

  /* ---------- Simulation d'une soumission ---------- */
  var CASES = {
    ok: { pass: [1, 1, 1, 1], dur: 1.2, time: 0.8, out: 2 },
    partial: { pass: [1, 0, 1, 1], dur: 1.2, time: 0.9, out: 3 },
    loop: { err: 'délai dépassé (5s)', code: 'RunError::Timeout', dur: 2.5, time: 5, out: 0 },
    flood: { err: 'sortie trop volumineuse', code: 'RunError::OutputTooLarge', dur: 1.6, time: 0.6, out: 64 }
  };
  var A = 0.8, B = 0.8, C = 0.8, E = 0.8;
  var rail = $('inl-rail'), token = $('inl-token'), st = {}, key = 'ok', t0 = 0, raf = 0, running = false;
  Array.prototype.forEach.call(rail.querySelectorAll('li[data-s]'), function (li) { st[li.getAttribute('data-s')] = li; });
  var order = ['web', 'api', 'run', 'core', 'db'];
  function center(name) { var li = st[name]; return [li.offsetLeft + li.offsetWidth / 2, li.offsetTop + li.offsetHeight / 2]; }
  function lerp(a, b, p) { var pa = center(a), pb = center(b); return [pa[0] + (pb[0] - pa[0]) * p, pa[1] + (pb[1] - pa[1]) * p]; }
  function total(c) { return A + B + c.dur + (c.err ? 0.3 : C + E); }
  function setMeters(c, p) {
    var tt = c.time * p, oo = c.out * p;
    $('m-time').style.width = Math.min(100, tt / 5 * 100) + '%'; $('m-out').style.width = Math.min(100, oo / 64 * 100) + '%';
    $('v-time').textContent = fr(tt, 1) + ' / 5 s'; $('v-out').textContent = fr(Math.round(oo)) + ' / 64 Kio';
    $('m-time').parentNode.parentNode.classList.toggle('is-hot', c.err === 'délai dépassé (5s)' && p >= 1);
    $('m-out').parentNode.parentNode.classList.toggle('is-hot', c.err === 'sortie trop volumineuse' && p >= 1);
  }
  function render(t) {
    var c = CASES[key], pos, active = 0, tEnd = total(c), done = t >= tEnd;
    var runStart = A + B, runEnd = runStart + c.dur, p;
    if (t < A) { pos = lerp('web', 'api', t / A); active = 0; setMeters(c, 0); }
    else if (t < runStart) { pos = lerp('api', 'run', (t - A) / B); active = 1; setMeters(c, 0); }
    else if (t < runEnd) { pos = center('run'); active = 2; p = (t - runStart) / c.dur; setMeters(c, p); }
    else if (c.err) { pos = center('run'); active = 2; setMeters(c, 1); }
    else if (t < runEnd + C) { pos = lerp('run', 'core', (t - runEnd) / C); active = 2; setMeters(c, 1); }
    else if (t < runEnd + C + E) { pos = lerp('core', 'db', (t - runEnd - C) / E); active = 3; setMeters(c, 1); }
    else { pos = center('db'); active = 4; setMeters(c, 1); }
    if (done) active = c.err ? 2 : 4;
    order.forEach(function (n, i) {
      var li = st[n]; li.classList.toggle('is-on', !done && i === active);
      li.classList.toggle('is-done', (i < active && !(c.err && done && i === 2)) || (done && !c.err));
      li.classList.toggle('is-err', !!(c.err && done && n === 'run'));
    });
    token.style.opacity = t < 0 ? 0 : 1; token.style.left = pos[0] + 'px'; token.style.top = pos[1] + 'px';
    token.classList.toggle('is-err', !!(c.err && done));
    if (done && !showed) { showed = true; showResult(c); }
  }
  var showed = false;
  function showResult(c) {
    var r = $('inl-result'), ul = $('inl-tests'), f = $('inl-formula'), ttl = r.querySelector('.inl-result-t');
    ul.innerHTML = '';
    if (c.err) {
      ttl.textContent = 'Erreur : ' + c.err; ttl.className = 'inl-result-t bad';
      var li = document.createElement('li'); li.textContent = c.code + ' : le module d\'exécution renvoie une erreur, pas une liste de résultats de tests.'; ul.appendChild(li);
      f.textContent = 'Aucune note à calculer.';
    } else {
      var ok = c.pass.filter(Boolean).length; ttl.textContent = 'Résultat : ' + ok + ' tests sur ' + c.pass.length; ttl.className = 'inl-result-t good';
      c.pass.forEach(function (p, i) { var li = document.createElement('li'); li.className = p ? 'p' : 'f'; li.textContent = (p ? '✔ ' : '✘ ') + 'test ' + (i + 1) + (p ? ' réussi' : ' échoué'); ul.appendChild(li); });
      f.textContent = 'score = ' + ok + ' * 100 / ' + c.pass.length + ' = ' + score(ok, c.pass.length);
    }
  }
  function loop(ts) {
    var t = (ts - t0) / 1000; render(t);
    if (t < total(CASES[key])) raf = requestAnimationFrame(loop); else { raf = 0; running = false; $('inl-submit').disabled = false; }
  }
  function submit() {
    key = document.querySelector('input[name=inl-case]:checked').value; showed = false;
    var ttl = $('inl-result').querySelector('.inl-result-t'); ttl.textContent = 'Exécution en cours…'; ttl.className = 'inl-result-t';
    $('inl-tests').innerHTML = ''; $('inl-formula').textContent = '';
    cancelAnimationFrame(raf);
    if (reduce) { render(total(CASES[key]) + 1); return; }
    running = true; $('inl-submit').disabled = true; t0 = performance.now(); raf = requestAnimationFrame(loop);
  }
  $('inl-submit').addEventListener('click', submit);
  document.addEventListener('visibilitychange', function () { /* le temps de la simulation suit l'horloge : on la relance proprement */
    if (!document.hidden && running) { cancelAnimationFrame(raf); submit(); }
  });
  window.addEventListener('resize', function () { if (!running) render(showed ? total(CASES[key]) + 1 : -1); });
  render(-1);

  /* ---------- Modules ---------- */
  var INFO = {
    core: { rule: 'Aucune I/O, aucun async, aucune dépendance interne', p: 'Le domaine pur : exercices, notation, progression.', li: ['Contient déjà les niveaux de difficulté, le résultat d\'un test et la fonction de notation.', 'Pur : il se teste sans base de données ni réseau.'] },
    runner: { rule: 'Zone sensible : toute modification passe par une revue de sécurité', p: 'L\'exécution isolée du code Python de l\'apprenant.', li: ['Définit les limites (temps, mémoire, sortie), les erreurs possibles et une interface « bac à sable ».', 'Choix retenu pour le premier jalon : un conteneur éphémère par soumission, derrière cette interface, pour pouvoir changer de technique sans toucher au reste.'] },
    api: { rule: 'Routes fines : la logique vit dans le domaine', p: 'L\'API HTTP, avec Axum et PostgreSQL (sqlx).', li: ['Aujourd\'hui : une route de santé, et l\'application des migrations au démarrage.', 'Le plan prévoit de lui retirer tout accès à l\'exécution de code.'] },
    web: { rule: 'Ne parle qu\'à l\'API', p: 'L\'interface, écrite en Rust avec Leptos et compilée en WebAssembly (rendu côté client).', li: ['Un spike d\'éditeur de code (CodeMirror) est en revue.', 'Le but : une page d\'exercice avec un vrai éditeur, et un champ de texte en repli.'] }
  };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.inl-tabs [role=tab]')), card = $('inl-card');
  function show(c, focus) {
    var d = INFO[c];
    tabs.forEach(function (t) { var on = t.getAttribute('data-c') === c; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) { card.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); } });
    Array.prototype.forEach.call(document.querySelectorAll('.inl-gn'), function (n) { n.classList.toggle('is-on', n.getAttribute('data-n') === c); });
    var h = document.createElement('div'); var tx = tabs.filter(function (t) { return t.getAttribute('data-c') === c; })[0].textContent;
    h.innerHTML = '<h3></h3><p class="inl-rule"></p><p></p><ul></ul>';
    h.querySelector('h3').textContent = tx; h.querySelector('.inl-rule').textContent = 'Règle : ' + d.rule; h.querySelectorAll('p')[1].textContent = d.p;
    d.li.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; h.querySelector('ul').appendChild(li); });
    card.innerHTML = ''; card.appendChild(h);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.getAttribute('data-c')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault();
      show(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-c'), true);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.inl-gn'), function (n) { n.addEventListener('click', function () { show(n.getAttribute('data-n')); }); });
  show('core');

  /* ---------- Entrée dans l'écran : sprints et compteurs ---------- */
  function onceVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); cb(); } }, { threshold: 0.3 });
    io.observe(el);
  }
  var sp = $('inl-sprints'); if (sp) onceVisible(sp, function () { sp.classList.add('is-in'); });
  var stats = $('inl-stats');
  if (stats) onceVisible(stats, function () {
    if (reduce) return;
    var bs = stats.querySelectorAll('b'), t0s = performance.now();
    (function step(ts) {
      var p = Math.min(1, (ts - t0s) / 900), e = 1 - Math.pow(1 - p, 3);
      Array.prototype.forEach.call(bs, function (b) { b.textContent = Math.round(+b.getAttribute('data-n') * e); });
      if (p < 1) requestAnimationFrame(step);
    })(t0s);
  });

  /* ---------- Calculateur de note ---------- */
  var box = $('inl-checks'), N = 7;
  for (var i = 1; i <= N; i++) {
    var lab = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = i <= 3;
    lab.appendChild(cb); lab.appendChild(document.createTextNode('test ' + i)); box.appendChild(lab); cb.addEventListener('change', calc);
  }
  function calc() {
    var passed = box.querySelectorAll('input:checked').length, s = score(passed, N);
    var exact = passed * 100 / N;
    $('inl-calc').textContent = passed + ' * 100 / ' + N + ' = ' + s + (exact !== s ? '  (' + fr(exact, 2) + ' arrondi vers le bas)' : '');
    $('inl-gauge').style.width = s + '%';
  }
  calc();
  window.__inl = { score: score };
})();
