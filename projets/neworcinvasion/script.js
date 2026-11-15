/* New Orc Invasion : mini-démo web (simplifiée, pas le code pygame du dépôt). */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Images ---------- */
  var SRC = { gandalf: 'img/gandalf.png', orc: 'img/orc.webp', warg: 'img/warg.webp', nain: 'img/nain.webp',
    gobelin: 'img/gobelin.webp', balrog: 'img/balrog.webp', title: 'img/presstoplay.webp', boom: 'img/explosion.webp',
    f1: 'img/fond1.webp', f2: 'img/fond2.webp', f3: 'img/fond3.webp', f4: 'img/fond4.webp', f5: 'img/fond5.webp' };
  var IMG = {}, pending = Object.keys(SRC).length, ready = false, onReady = [];
  Object.keys(SRC).forEach(function (k) {
    var im = new Image();
    im.onload = im.onerror = function () { if (--pending === 0) { ready = true; onReady.forEach(function (f) { f(); }); } };
    im.src = SRC[k]; IMG[k] = im;
  });
  function whenReady(f) { if (ready) f(); else onReady.push(f); }

  /* ---------- Visibilité (pause hors écran / onglet caché) ---------- */
  function watch(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: 0.05 }).observe(el);
  }

  /* ---------- Braises décoratives ---------- */
  (function embers() {
    var cv = document.querySelector('.noi-embers');
    if (!cv || reduce) return;
    var c = cv.getContext('2d'), w = 0, h = 0, ps = [], vis = true, raf = 0, last = 0;
    function size() { w = cv.width = cv.clientWidth; h = cv.height = cv.clientHeight; }
    function reset(p, init) {
      p.x = Math.random() * w; p.y = init ? Math.random() * h : h + 10; p.r = 1 + Math.random() * 2.2;
      p.v = 18 + Math.random() * 40; p.s = Math.random() * 6.28; p.hue = 20 + Math.random() * 30;
    }
    size(); for (var i = 0; i < 46; i++) { var p = {}; reset(p, true); ps.push(p); }
    window.addEventListener('resize', size);
    function tick(ts) {
      var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      c.clearRect(0, 0, w, h);
      ps.forEach(function (p) {
        p.y -= p.v * dt; p.s += dt; p.x += Math.sin(p.s) * 12 * dt;
        if (p.y < -10) reset(p, false);
        var a = Math.max(0, Math.min(1, p.y / h)) * 0.8;
        c.fillStyle = 'hsla(' + p.hue + ',100%,60%,' + a + ')';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      });
      raf = requestAnimationFrame(tick);
    }
    function sync() { var run = vis && !document.hidden; if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; } }
    watch(cv, function (v) { vis = v; sync(); });
    document.addEventListener('visibilitychange', sync);
  })();

  /* ---------- Bestiaire et barres : animation à l'entrée dans l'écran ---------- */
  (function () {
    var list = document.querySelector('.noi-bestiary');
    if (list) watch(list, function (v) { list.style.setProperty('--run', v ? 'running' : 'paused'); });
    var bars = document.querySelector('.noi-bars');
    if (bars && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bars.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(bars);
    } else if (bars) bars.classList.add('is-in');
  })();

  /* ---------- Explosion image par image ---------- */
  (function () {
    var cv = $('noi-boom'); if (!cv) return;
    var c = cv.getContext('2d'), range = $('noi-boom-range'), out = $('noi-boom-out'), hi = $('noi-sheet-hi'), btn = $('noi-boom-play');
    var frame = 0, playing = !reduce, vis = false, raf = 0, t0 = 0;
    function draw() {
      c.clearRect(0, 0, 288, 288);
      if (IMG.boom.complete && IMG.boom.naturalWidth) c.drawImage(IMG.boom, (frame % 8) * 96, Math.floor(frame / 8) * 96, 96, 96, 0, 0, 288, 288);
      range.value = frame + 1; out.textContent = frame + 1;
      hi.style.left = (frame % 8) * 12.5 + '%'; hi.style.top = Math.floor(frame / 8) * 16.6667 + '%';
    }
    function tick(ts) { frame = Math.floor((ts - t0) / 1000 * 24) % 46; draw(); raf = requestAnimationFrame(tick); }
    function sync() {
      var run = playing && vis && !document.hidden;
      if (run && !raf) { t0 = performance.now() - frame * 1000 / 24; raf = requestAnimationFrame(tick); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
      btn.textContent = playing ? 'Pause' : 'Lecture'; btn.setAttribute('aria-pressed', String(playing));
    }
    btn.addEventListener('click', function () { playing = !playing; sync(); });
    range.addEventListener('input', function () { playing = false; frame = +range.value - 1; draw(); sync(); });
    watch(cv, function (v) { vis = v; sync(); });
    document.addEventListener('visibilitychange', sync);
    whenReady(function () { frame = reduce ? 18 : 0; draw(); });
    draw();
  })();

  /* ---------- Jeu ---------- */
  (function () {
    var cv = $('noi-game'); if (!cv) return;
    var c = cv.getContext('2d'), W = 480, H = 738, cab = $('noi-cab'), status = $('noi-status');
    var LEVELS = [
      { name: 'Les orcs', spr: 'orc', bg: 'f1', size: 50, rows: 3, cols: 6, speed: 44, hp: 1, fire: 1.7 },
      { name: 'Les wargs', spr: 'warg', bg: 'f2', size: 52, rows: 3, cols: 6, speed: 58, hp: 1, fire: 1.4 },
      { name: 'Les nains', spr: 'nain', bg: 'f3', size: 54, rows: 3, cols: 5, speed: 52, hp: 2, fire: 1.3 },
      { name: 'Les gobelins', spr: 'gobelin', bg: 'f4', size: 50, rows: 4, cols: 6, speed: 66, hp: 1, fire: 1.0 },
      { name: 'Le balrog', spr: 'balrog', bg: 'f5', boss: true, hp: 28, fire: 1.1 }
    ];
    var keys = { left: false, right: false, fire: false };
    var g = null, mode = 'title', visible = false, raf = 0, last = 0, clock = 0, best = 0;

    function say(m) { status.textContent = m; }
    function newGame() {
      g = { level: 0, score: 0, lives: 3, px: W / 2, cool: 0, inv: 0, shots: [], bombs: [], fx: [], foes: [], fx0: 0, fy: 0, dir: 1, fireT: 1, banner: 0, shake: 0 };
      startLevel(0);
    }
    function startLevel(n) {
      var L = LEVELS[n]; g.level = n; g.shots = []; g.bombs = []; g.foes = []; g.dir = 1; g.fx0 = 0; g.fy = 0; g.fireT = L.fire; g.banner = 2.2; mode = 'intro';
      if (L.boss) g.foes.push({ boss: true, x: W / 2, y: 190, hp: L.hp, flash: 0, alive: true });
      else for (var r = 0; r < L.rows; r++) for (var q = 0; q < L.cols; q++) g.foes.push({ r: r, q: q, hp: L.hp, flash: 0, alive: true, x: 0, y: 0 });
      say('Niveau ' + (n + 1) + ' sur 5 : ' + L.name + '.');
    }
    function layout(L) {
      var gx = L.size + 14, gy = L.size + 8, x0 = (W - (L.cols - 1) * gx) / 2 + g.fx0;
      g.foes.forEach(function (f) { f.x = x0 + f.q * gx; f.y = 110 + f.r * gy + g.fy; });
    }
    function alive() { return g.foes.filter(function (f) { return f.alive; }); }
    function boom(x, y, s) { g.fx.push({ x: x, y: y, t: 0, s: s || 84 }); }
    function hitPlayer() {
      if (g.inv > 0) return;
      g.lives--; g.inv = 1.8; g.shake = .25; boom(g.px, H - 70, 90); g.bombs = [];
      if (g.lives <= 0) { mode = 'over'; endGame('Partie terminée'); }
    }
    function endGame(msg) {
      best = Math.max(best, g.score); say(msg + '. Score : ' + g.score + '.'); addScore();
    }
    function addScore() {
      var body = $('noi-score-body'); if (!body) return;
      var old = body.querySelector('.is-you'); if (old) old.remove();
      var tr = document.createElement('tr'); tr.className = 'is-you';
      var vals = ['—', 'Vous (cette session)', String(best).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')];
      vals.forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
      body.insertBefore(tr, body.firstChild);
    }

    function update(dt) {
      clock += dt;
      if (mode === 'intro') { g.banner -= dt; if (g.banner <= 0) mode = 'play'; }
      if (g.shake > 0) g.shake -= dt;
      g.fx.forEach(function (e) { e.t += dt; }); g.fx = g.fx.filter(function (e) { return e.t < 46 / 50; });
      if (mode !== 'play' && mode !== 'intro') return;
      var L = LEVELS[g.level];
      if (keys.left) g.px -= 290 * dt; if (keys.right) g.px += 290 * dt;
      g.px = Math.max(34, Math.min(W - 34, g.px));
      g.cool -= dt; if (g.inv > 0) g.inv -= dt;
      if (mode === 'intro') { if (!L.boss) layout(L); return; }
      if (keys.fire && g.cool <= 0) { g.shots.push({ x: g.px, y: H - 110 }); g.cool = .27; }
      g.shots.forEach(function (s) { s.y -= 640 * dt; }); g.shots = g.shots.filter(function (s) { return s.y > -20; });
      var al = alive(), bw;
      if (L.boss) {
        var b = g.foes[0]; b.x = W / 2 + Math.sin(clock * .9) * 150; if (b.flash > 0) b.flash -= dt; bw = 62;
      } else {
        var ratio = al.length / g.foes.length, v = L.speed * (1 + (1 - ratio) * 1.5);
        g.fx0 += g.dir * v * dt; layout(L);
        var mn = 1e9, mx = -1e9; al.forEach(function (f) { mn = Math.min(mn, f.x); mx = Math.max(mx, f.x); });
        if ((g.dir > 0 && mx + L.size / 2 > W - 10) || (g.dir < 0 && mn - L.size / 2 < 10)) { g.dir = -g.dir; g.fy += 22; layout(L); }
        al.forEach(function (f) { if (f.flash > 0) f.flash -= dt; if (f.y + L.size / 2 > H - 150) { g.fy = 0; g.fx0 = 0; hitPlayer(); } });
        bw = L.size / 2 - 4;
      }
      /* Tirs contre ennemis */
      g.shots.forEach(function (s) {
        for (var i = 0; i < al.length; i++) {
          var f = al[i]; if (!f.alive) continue;
          var hw = L.boss ? 78 : bw, hh = L.boss ? 80 : bw;
          if (Math.abs(s.x - f.x) < hw && Math.abs(s.y - f.y) < hh) {
            s.y = -99; f.hp--; f.flash = .12;
            if (f.hp <= 0) {
              f.alive = false; g.score += L.boss ? 500 : 10 * (g.level + 1); boom(f.x, f.y, L.boss ? 220 : 84);
            } else g.score += 2;
            break;
          }
        }
      });
      al = alive();
      if (!al.length) { if (g.level >= LEVELS.length - 1) { mode = 'win'; endGame('Chapitre terminé, bravo'); } else startLevel(g.level + 1); return; }
      /* Bombes ennemies */
      g.fireT -= dt;
      if (g.fireT <= 0) {
        g.fireT = L.fire * (.6 + Math.random() * .8);
        var s = al[Math.floor(Math.random() * al.length)];
        if (L.boss) [-110, 0, 110].forEach(function (vx) { g.bombs.push({ x: s.x, y: s.y + 70, vx: vx, vy: 250 }); });
        else g.bombs.push({ x: s.x, y: s.y + 20, vx: 0, vy: 230 + g.level * 22 });
      }
      g.bombs.forEach(function (b) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.abs(b.x - g.px) < 22 && Math.abs(b.y - (H - 70)) < 30) { b.y = H + 99; hitPlayer(); }
      });
      g.bombs = g.bombs.filter(function (b) { return b.y < H + 20 && b.x > -20 && b.x < W + 20; });
    }

    /* ----- dessin ----- */
    function txt(s, x, y, size, col, al) {
      c.font = '700 ' + size + 'px "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace';
      c.textAlign = al || 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#000'; c.fillText(s, x + 2, y + 2); c.fillStyle = col || '#f4ecd8'; c.fillText(s, x, y);
    }
    function bg(key, dark) {
      var im = IMG[key]; if (im && im.naturalWidth) c.drawImage(im, 0, 0, W, H);
      c.fillStyle = 'rgba(8,5,18,' + dark + ')'; c.fillRect(0, 0, W, H);
    }
    function panel(lines, sub) {
      c.fillStyle = 'rgba(8,5,18,.78)'; c.fillRect(30, 250, W - 60, 220);
      c.strokeStyle = '#ffd25a'; c.lineWidth = 3; c.strokeRect(30, 250, W - 60, 220);
      lines.forEach(function (l, i) { txt(l[0], W / 2, 290 + i * 44, l[1], l[2]); });
      if (sub) txt(sub, W / 2, 440, 17, '#c9bfdf');
    }
    function draw() {
      c.save(); c.clearRect(0, 0, W, H);
      if (mode === 'title') { drawTitle(); c.restore(); return; }
      var L = LEVELS[g.level];
      if (g.shake > 0) c.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
      bg(L.bg, .35);
      var im = IMG[L.spr];
      g.foes.forEach(function (f) {
        if (!f.alive) return; var s = L.boss ? 190 : L.size;
        if (im.naturalWidth) { c.globalAlpha = f.flash > 0 ? .55 : 1; c.drawImage(im, f.x - s / 2, f.y - s / 2 + (reduce ? 0 : Math.sin(clock * 4 + (f.q || 0)) * 2), s, s); c.globalAlpha = 1; }
        if (L.boss) { c.fillStyle = '#000a'; c.fillRect(W / 2 - 120, 24, 240, 12); c.fillStyle = '#ff5a2a'; c.fillRect(W / 2 - 120, 24, 240 * f.hp / L.hp, 12); }
      });
      g.shots.forEach(function (s) { var gr = c.createLinearGradient(0, s.y, 0, s.y + 24); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#a45cff'); c.fillStyle = gr; c.shadowColor = '#c28bff'; c.shadowBlur = 12; c.fillRect(s.x - 3, s.y, 6, 24); c.shadowBlur = 0; });
      g.bombs.forEach(function (b) { c.shadowColor = '#ff8a2a'; c.shadowBlur = 12; c.fillStyle = '#ffb43a'; c.beginPath(); c.ellipse(b.x, b.y, 6, 11, 0, 0, 6.283); c.fill(); c.shadowBlur = 0; });
      if (IMG.gandalf.naturalWidth && g.lives > 0) { c.imageSmoothingEnabled = false; c.globalAlpha = g.inv > 0 ? .5 : 1; c.drawImage(IMG.gandalf, g.px - 36, H - 112, 72, 72); c.globalAlpha = 1; c.imageSmoothingEnabled = true; }
      g.fx.forEach(function (e) { var f = Math.min(45, Math.floor(e.t * 50)); if (IMG.boom.naturalWidth) c.drawImage(IMG.boom, (f % 8) * 96, Math.floor(f / 8) * 96, 96, 96, e.x - e.s / 2, e.y - e.s / 2, e.s, e.s); });
      /* HUD */
      c.fillStyle = 'rgba(8,5,18,.6)'; c.fillRect(0, 0, W, 0);
      txt('SCORE ' + g.score, 14, L.boss ? 56 : 22, 17, '#ffd25a', 'left');
      txt('NIV. ' + (g.level + 1) + '/5', W - 14, L.boss ? 56 : 22, 17, '#c28bff', 'right');
      for (var i = 0; i < g.lives; i++) { c.imageSmoothingEnabled = false; if (IMG.gandalf.naturalWidth) c.drawImage(IMG.gandalf, 14 + i * 30, H - 36, 26, 26); c.imageSmoothingEnabled = true; }
      if (mode === 'intro') { c.fillStyle = 'rgba(8,5,18,.7)'; c.fillRect(0, 300, W, 110); txt('Niveau ' + (g.level + 1), W / 2, 335, 30, '#ffd25a'); txt(L.name, W / 2, 380, 22, '#f4ecd8'); }
      if (mode === 'pause') panel([['PAUSE', 34, '#ffd25a'], ['Touche P pour reprendre', 18]], '');
      if (mode === 'over') panel([['PARTIE TERMINÉE', 30, '#ff8a2a'], ['Score ' + g.score, 26, '#ffd25a']], 'S pour rejouer');
      if (mode === 'win') panel([['CHAPITRE TERMINÉ', 28, '#8fe04a'], ['Score ' + g.score, 26, '#ffd25a']], 'S pour rejouer');
      c.restore();
    }
    function drawTitle() {
      bg('f1', .45);
      var bob = reduce ? 0 : Math.sin(clock * 2) * 6;
      txt('NEW ORC', W / 2, 120, 58, '#ffd25a'); txt('INVASION', W / 2, 184, 58, '#ff8a2a');
      if (IMG.title.naturalWidth) c.drawImage(IMG.title, W / 2 - 110, 240 + bob, 220, 220);
      if (IMG.orc.naturalWidth) for (var i = 0; i < 5; i++) c.drawImage(IMG.orc, 50 + i * 76, 500 + (reduce ? 0 : Math.sin(clock * 3 + i) * 5), 58, 58);
      txt('Appuyez sur S pour jouer', W / 2, 596, 20, '#f4ecd8');
      txt('démo simplifiée · sprites du dépôt', W / 2, 624, 14, '#c9bfdf');
      if (IMG.gandalf.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(IMG.gandalf, W / 2 - 32, H - 96, 64, 64); c.imageSmoothingEnabled = true; }
    }

    /* ----- boucle ----- */
    function frame(ts) {
      var dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
      if (mode === 'title') clock += dt;
      if (mode !== 'title') update(dt);
      draw(); raf = requestAnimationFrame(frame);
    }
    function shouldRun() { return visible && !document.hidden && ready && (mode === 'play' || mode === 'intro' || mode === 'over' && g.fx.length || (!reduce && mode === 'title') || g && g.fx.length); }
    function sync() {
      if (mode === 'play' && (!visible || document.hidden)) mode = 'pause';
      var run = shouldRun();
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; draw(); }
      if (!raf) draw();
    }
    function restartLoop() { if (!raf) sync(); }
    function start() { newGame(); keys.left = keys.right = keys.fire = false; cv.focus({ preventScroll: true }); sync(); restartLoop(); }
    function togglePause() {
      if (mode === 'play') mode = 'pause'; else if (mode === 'pause') mode = 'play'; else return;
      say(mode === 'pause' ? 'Pause.' : 'Reprise.'); sync(); if (mode === 'pause') draw();
    }
    watch(cv, function (v) { visible = v; sync(); });
    document.addEventListener('visibilitychange', sync);
    whenReady(function () { sync(); draw(); });

    var map = { ArrowLeft: 'left', ArrowRight: 'right', ' ': 'fire', Spacebar: 'fire' };
    cab.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (k === 's' || k === 'S') { if (e.target.tagName === 'BUTTON' && e.target.id !== 'noi-start') return; if (mode === 'title' || mode === 'over' || mode === 'win') { e.preventDefault(); start(); } return; }
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      if (e.target.tagName === 'BUTTON') return; /* Espace sur un bouton = clic */
      if (map[k]) { e.preventDefault(); keys[map[k]] = true; }
    });
    cab.addEventListener('keyup', function (e) { if (map[e.key]) keys[map[e.key]] = false; });
    cv.addEventListener('blur', function () { keys.left = keys.right = keys.fire = false; if (mode === 'play') { mode = 'pause'; say('Pause.'); sync(); draw(); } });
    cv.addEventListener('click', function () { cv.focus({ preventScroll: true }); if (mode === 'title') start(); else if (mode === 'pause') togglePause(); });
    $('noi-start').addEventListener('click', start);
    $('noi-pause').addEventListener('click', togglePause);
    Array.prototype.forEach.call(document.querySelectorAll('.noi-key'), function (b) {
      var a = b.getAttribute('data-act');
      function on(e) { e.preventDefault(); keys[a] = true; b.classList.add('is-on'); }
      function off() { keys[a] = false; b.classList.remove('is-on'); }
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    /* Accès aux tests : état courant en lecture seule */
    window.__noi = { get mode() { return mode; }, get score() { return g ? g.score : 0; }, get level() { return g ? g.level : -1; }, get lives() { return g ? g.lives : -1; } };
  })();
})();
