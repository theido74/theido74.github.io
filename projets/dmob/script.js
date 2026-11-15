/* Applis Android : carrousel 3D de téléphones (reconstitutions dessinées). */
(function () {
  'use strict';

  var ring = document.getElementById('dm-ring');
  if (!ring) return;
  var phones = Array.prototype.slice.call(ring.querySelectorAll('.dm-phone'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#dm-apps button[data-i]'));
  var scene = document.querySelector('.dm-scene');
  var glow = document.getElementById('dm-glow');
  var capName = document.getElementById('dm-cap-name');
  var capText = document.getElementById('dm-cap-text');
  var pauseBtn = document.getElementById('dm-pause');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var N = phones.length, STEP = 360 / N;
  var APPS = [
    { n: 'DiceRoller', c: '#ff5a4d', t: 'Un bouton lance le dé : un nombre de 1 à 6 est tiré au hasard et l\'image du dé change.' },
    { n: 'Lemonade', c: '#f6d23a', t: 'Une limonade en quatre gestes : l\'arbre, le citron à presser, le verre plein, le verre vide. Déduit des images du projet.' },
    { n: 'CartedeVisite', c: '#2fb6a8', t: 'Une carte de visite : nom, métier et coordonnées (ici fictifs). Déduit du nom du projet.' },
    { n: 'GestionnaireTache', c: '#5b8cff', t: 'Des tâches à cocher, puis un écran de félicitations quand tout est fait. Déduit du nom et des ressources.' },
    { n: 'HappyBirthday', c: '#ff7ab6', t: 'Une carte d\'anniversaire animée. Déduit du nom du projet.' },
    { n: 'GreetingCard', c: '#ff9f43', t: 'Une carte de vœux avec un message. Déduit du nom du projet.' },
    { n: 'ArtcileCompose', c: '#6fcf97', t: 'Un article mis en page : image, titre, paragraphes. Déduit du nom du projet.' },
    { n: 'QuadranCompose', c: '#a78bfa', t: 'Quatre quadrants de texte côte à côte. Déduit du nom du projet.' }
  ];

  // Confettis : positions et couleurs variées, décoratives
  var pal = ['#fff', '#ffd54a', '#4da3ff', '#7ef0a8', '#ff4f81'];
  Array.prototype.forEach.call(document.querySelectorAll('.confetti i'), function (el, k) {
    el.style.setProperty('--x', String(6 + (k * 37) % 86));
    el.style.setProperty('--y', String(14 + (k * 23) % 40));
    el.style.setProperty('--c', pal[k % pal.length]);
    el.style.setProperty('--r', ((k * 53) % 90) + 'deg');
    el.style.setProperty('--d', (2.6 + (k % 4) * 0.5) + 's');
    el.style.setProperty('--dl', (-(k * 0.37) % 3) + 's');
  });

  var idx = 0;            // indice cible, non borné : la rotation reste continue
  var angle = 0;          // angle courant en degrés
  var auto = !reduce;
  var dwell = 0;          // temps passé sur l'appli au premier plan
  var DWELL_MAX = 5200;   // ms
  var last = 0, running = false, visible = true, hovering = false;

  function mod(a, n) { return ((a % n) + n) % n; }

  function setFront() {
    var f = mod(idx, N), a = APPS[f];
    phones.forEach(function (p, i) { p.classList.toggle('is-front', i === f); });
    buttons.forEach(function (b) {
      if (Number(b.getAttribute('data-i')) === f) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    capName.textContent = a.n;
    capText.textContent = a.t;
    glow.style.setProperty('--tint', a.c);
    document.body.style.setProperty('--tint', a.c);
  }

  function paint() { ring.style.setProperty('--a', angle.toFixed(2) + 'deg'); }

  function go(i) {
    idx = i; dwell = 0; setFront();
    if (reduce) { angle = -idx * STEP; paint(); } else kick();
  }

  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min(100, ts - last) : 16;
    last = ts;
    var target = -idx * STEP;
    angle += (target - angle) * (1 - Math.exp(-dt / 160));
    if (Math.abs(target - angle) < 0.02) angle = target;
    paint();
    if (auto && !hovering) {
      dwell += dt;
      if (dwell > DWELL_MAX) go(idx + 1);
    }
    if (auto || angle !== target) requestAnimationFrame(frame); else running = false;
  }
  function kick() {
    if (running || !visible || document.hidden) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }

  document.getElementById('dm-prev').addEventListener('click', function () { go(idx - 1); });
  document.getElementById('dm-next').addEventListener('click', function () { go(idx + 1); });
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      // Chemin le plus court vers l'appli choisie
      var want = Number(b.getAttribute('data-i')), cur = mod(idx, N), d = want - cur;
      if (d > N / 2) d -= N; if (d < -N / 2) d += N;
      go(idx + d);
      document.getElementById('dm-stage').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  function setAuto(on) {
    auto = on;
    pauseBtn.textContent = on ? 'Mettre en pause' : 'Lancer le défilement';
    pauseBtn.setAttribute('aria-pressed', String(!on));
    if (on) { dwell = 0; kick(); }
  }
  pauseBtn.addEventListener('click', function () { setAuto(!auto); });
  setAuto(auto);

  // Glisser pour tourner, au doigt ou à la souris
  var startX = null;
  scene.style.touchAction = 'pan-y';
  scene.addEventListener('pointerdown', function (e) { startX = e.clientX; });
  scene.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX; startX = null;
    if (dx > 40) go(idx - 1); else if (dx < -40) go(idx + 1);
  });
  scene.addEventListener('pointercancel', function () { startX = null; });
  document.querySelector('.dm-controls').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(idx - 1); else if (e.key === 'ArrowRight') go(idx + 1);
  });
  scene.addEventListener('mouseenter', function () { hovering = true; });
  scene.addEventListener('mouseleave', function () { hovering = false; });

  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) kick(); else running = false;
    }).observe(scene);
  }

  setFront(); paint();
  kick();
})();
