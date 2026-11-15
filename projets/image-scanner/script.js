/* Image Scanner : démonstration simulée (tapis, faisceau, bacs, terminal) */
(function () {
  'use strict';
  document.body.classList.add('sc-js');
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Données de la démonstration (valeurs du README, exemple JSON) */
  var SRC = {
    local: { cmd: 'image-scanner local -p ~/Pictures -o my_photos -f json', type: 'local' },
    web: { cmd: 'image-scanner web -u https://example.com -o web_images -f json -d 3', type: 'web' },
    azure: { cmd: 'image-scanner azure -u "https://account.blob.core.windows.net/container?sas_token" -f json', type: 'azure' }
  };
  var TOTAL = 1500, IMAGES = 342, JPG = 200, PNG = 142;
  var START = 1.6, N = 22, GAP = 0.3, SPEED = 260, W = 640, H = 300, BEAM = 320, LANE = 78, TS = 76;
  var CYCLE = 16;
  var HOLD_JSON = 10.2;

  var state = { src: 'local', t: 0, paused: false, visible: true };
  var out = document.getElementById('sc-out');
  var cv = document.getElementById('sc-cv');
  var ctx = cv.getContext('2d');
  var lastText = '';

  /* Générateur pseudo-aléatoire déterministe */
  function hash(i) { var h = (i + 1) * 2654435761 >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; }
  function kind(i) { var r = hash(i) % 100; return r < 40 ? 'jpg' : r < 72 ? 'png' : 'doc'; }

  /* Vignettes pré-dessinées (formes SVG-like, aucune photo) */
  var sprites = {};
  function sprite(i) {
    var k = kind(i), key = k + (hash(i) % 6);
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d'), h = hash(i), hue = h % 360;
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(0, 0, 96, 96, 10) : g.rect(0, 0, 96, 96); g.clip();
    if (k === 'jpg') {
      var sky = g.createLinearGradient(0, 0, 0, 96);
      sky.addColorStop(0, 'hsl(' + hue + ',70%,62%)'); sky.addColorStop(1, 'hsl(' + ((hue + 40) % 360) + ',80%,78%)');
      g.fillStyle = sky; g.fillRect(0, 0, 96, 96);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(20 + (h % 50), 24, 11, 0, 7); g.fill();
      g.fillStyle = 'hsl(' + ((hue + 200) % 360) + ',35%,32%)'; g.beginPath(); g.moveTo(0, 96); g.lineTo(0, 62); g.lineTo(30, 38); g.lineTo(58, 70); g.lineTo(76, 50); g.lineTo(96, 72); g.lineTo(96, 96); g.fill();
      g.fillStyle = 'hsl(' + ((hue + 200) % 360) + ',40%,22%)'; g.beginPath(); g.moveTo(0, 96); g.lineTo(20, 74); g.lineTo(50, 96); g.fill();
    } else if (k === 'png') {
      g.fillStyle = '#d9dfe5'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#f5f7f9';
      for (var y = 0; y < 96; y += 12) for (var x = (y / 12 % 2) * 12; x < 96; x += 24) g.fillRect(x, y, 12, 12);
      var gr = g.createRadialGradient(40, 40, 6, 48, 48, 34);
      gr.addColorStop(0, 'hsl(' + hue + ',85%,70%)'); gr.addColorStop(1, 'hsl(' + ((hue + 60) % 360) + ',75%,42%)');
      g.fillStyle = gr; g.beginPath();
      for (var a = 0; a < 10; a++) { var r = a % 2 ? 15 : 33, an = a * Math.PI / 5 - Math.PI / 2; g.lineTo(48 + r * Math.cos(an), 48 + r * Math.sin(an)); }
      g.closePath(); g.fill();
    } else {
      g.fillStyle = '#e9edf1'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#9aa7b3';
      for (var l = 0; l < 6; l++) g.fillRect(14, 20 + l * 11, l % 3 === 2 ? 42 : 68, 5);
      g.fillStyle = '#c4ced8'; g.beginPath(); g.moveTo(66, 0); g.lineTo(96, 0); g.lineTo(96, 30); g.fill();
    }
    g.restore(); sprites[key] = c; return c;
  }

  function setup() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(320, Math.round(r.width * d));
    if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * H / W); }
  }

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function progress(tt) { // part des tuiles ayant franchi le faisceau
    var t0 = START + (BEAM + TS) / SPEED;
    return clamp((tt - t0) / ((N - 1) * GAP), 0, 1);
  }

  function drawCanvas(tt, fp) {
    var s = cv.width / W; ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0f14'; ctx.fillRect(0, 0, W, H);
    // tapis
    ctx.fillStyle = '#121b23'; ctx.fillRect(0, LANE - TS / 2 - 12, W, TS + 24);
    ctx.fillStyle = '#1d2a35';
    var off = (tt * SPEED) % 24;
    for (var x = -24 + off; x < W; x += 24) ctx.fillRect(x, LANE + TS / 2 + 6, 12, 4);
    for (var x2 = -24 + off; x2 < W; x2 += 24) ctx.fillRect(x2, LANE - TS / 2 - 10, 12, 4);
    var p = fp === undefined ? progress(tt) : fp;
    // bacs
    var bins = [{ x: 170, k: 'jpg', n: Math.round(JPG * p), c: '#ffb347' }, { x: 470, k: 'png', n: Math.round(PNG * p), c: '#4fd6c8' }];
    bins.forEach(function (b) {
      ctx.strokeStyle = b.c; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.04)';
      ctx.beginPath(); ctx.roundRect(b.x - 95, 190, 190, 96, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8eef4'; ctx.font = '700 26px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center';
      ctx.fillText(b.k, b.x, 226);
      ctx.fillStyle = b.c; ctx.font = '700 38px ui-monospace,Menlo,Consolas,monospace';
      ctx.fillText(String(b.n), b.x, 270);
    });
    // tuiles
    var DROP = 0.7;
    for (var i = 0; i < N; i++) {
      var ts = START + i * GAP; if (tt < ts) break;
      var x0 = -TS + SPEED * (tt - ts), k = kind(i), tb = ts + (BEAM + TS) / SPEED;
      var img = sprite(i), y = LANE, sc = 1, al = 1, xx = x0;
      if (tt > tb) {
        var q = clamp((tt - tb) / DROP, 0, 1);
        if (k === 'doc') { xx = BEAM + q * 90; y = LANE + q * 60; al = 1 - q; sc = 1 - q * .2; }
        else { var bx = k === 'jpg' ? 170 : 470; xx = BEAM + (bx - BEAM) * ease(q); y = LANE + (200 - LANE) * ease(q); sc = 1 - .5 * ease(q); al = q > .85 ? (1 - q) / .15 : 1; }
      } else { xx = x0 + 0; }
      if (xx > W + 80) continue;
      ctx.globalAlpha = al; var size = TS * sc;
      ctx.drawImage(img, xx - size / 2 + (tt > tb ? 0 : 0), y - size / 2, size, size);
      ctx.globalAlpha = 1;
      // lecture des premiers octets au passage du faisceau
      if (tt <= tb + 0.14 && tt >= tb - 0.14) {
        ctx.fillStyle = '#4fd6c8'; ctx.font = '700 17px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center';
        ctx.fillText(k === 'jpg' ? 'FF D8 FF' : k === 'png' ? '89 50 4E 47' : '25 50 44 46', BEAM, 22);
        ctx.fillStyle = k === 'doc' ? '#ff9d9d' : '#7ae6da';
        ctx.fillText(k === 'jpg' ? 'JPEG' : k === 'png' ? 'PNG' : 'pas une image', BEAM, 142);
      }
    }
    // faisceau
    var gr = ctx.createLinearGradient(BEAM - 18, 0, BEAM + 18, 0);
    gr.addColorStop(0, 'rgba(79,214,200,0)'); gr.addColorStop(.5, 'rgba(79,214,200,.55)'); gr.addColorStop(1, 'rgba(79,214,200,0)');
    ctx.fillStyle = gr; ctx.fillRect(BEAM - 18, 40, 36, 76);
    ctx.fillStyle = '#4fd6c8'; ctx.fillRect(BEAM - 1.5, 40, 3, 76);
    ctx.fillStyle = '#a4b4c2'; ctx.font = '600 15px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('fichiers en entrée', 12, 20);
  }

  function bar(p) { var n = Math.round(p * 24), s = ''; for (var i = 0; i < 24; i++) s += i < n ? '█' : '░'; return s; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = ' ' + s; return s; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function drawTerm(tt) {
    var cfg = SRC[state.src], lines = [];
    var chars = Math.floor(clamp(tt / 1.4, 0, 1) * cfg.cmd.length);
    lines.push('$ ' + cfg.cmd.slice(0, chars) + (tt < 1.4 ? '▌' : ''));
    var p = progress(tt);
    if (tt >= START) {
      lines.push('[' + bar(p) + '] ' + pad(Math.round(p * 100), 3) + ' %');
      lines.push('');
      if (tt < HOLD_JSON) {
        lines.push('fichiers analysés  ' + fmt(Math.round(TOTAL * p)) + ' / ' + fmt(TOTAL));
        lines.push('images trouvées    ' + fmt(Math.round(IMAGES * p)));
      } else {
        var json = ['{', '  "statistics": {', '    "scan_type": "' + cfg.type + '",', '    "total_files_scanned": 1500,', '    "images_found": 342,',
          '    "scan_duration_seconds": 5.23,', '    "files_per_second": 287.0,', '    "formats_found": [', '      {"format": "jpg", "count": 200},', '      {"format": "png", "count": 142}'];
        var n = Math.min(json.length, Math.floor((tt - HOLD_JSON) / 0.28) + 1);
        for (var i = 0; i < n; i++) lines.push(json[i]);
      }
    }
    var txt = lines.join('\n');
    if (txt !== lastText) { out.textContent = txt; lastText = txt; }
  }

  function render(t) {
    if (rm.matches) { drawTerm(CYCLE - 0.01); drawCanvas(8.2, 1); return; }
    var tt = t % CYCLE;
    drawTerm(tt); drawCanvas(tt);
  }

  /* Boucle : avance seulement si visible, onglet actif et non en pause */
  var raf = 0, prev = 0;
  function frame(now) {
    raf = 0;
    if (!canRun()) { prev = 0; return; }
    if (prev) state.t += Math.min((now - prev) / 1000, 0.1);
    prev = now; render(state.t); raf = requestAnimationFrame(frame);
  }
  function canRun() { return state.visible && !document.hidden && !state.paused && !rm.matches; }
  function kick() { if (!raf && canRun()) { prev = 0; raf = requestAnimationFrame(frame); } }

  function showStatic() { state.t = CYCLE - 0.01; render(state.t); }
  function init() {
    setup();
    if (rm.matches) { showStatic(); } else { state.t = 0; render(0); kick(); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { state.visible = e[0].isIntersecting; kick(); }, { threshold: 0.05 }).observe(cv);
  }
  document.addEventListener('visibilitychange', kick);
  rm.addEventListener && rm.addEventListener('change', function () { init(); });
  window.addEventListener('resize', function () { setup(); if (!raf) render(state.t); });

  document.querySelectorAll('.sc-pickbtn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.sc-pickbtn').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      state.src = b.getAttribute('data-src'); lastText = '';
      if (rm.matches) showStatic(); else { state.t = 0; render(0); kick(); }
    });
  });
  var pb = document.getElementById('sc-pause');
  pb.addEventListener('click', function () {
    state.paused = !state.paused; pb.setAttribute('aria-pressed', state.paused); pb.textContent = state.paused ? 'Reprendre' : 'Mettre en pause'; kick();
  });
  if (rm.matches) pb.hidden = true;

  /* Révélations au défilement (tableau et barres) */
  var reveal = document.querySelectorAll('#sc-sigtable,#sc-bars');
  if ('IntersectionObserver' in window && !rm.matches) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: 0.25 });
    reveal.forEach(function (el) { io.observe(el); });
  } else { reveal.forEach(function (el) { el.classList.add('is-in'); }); }

  var q = /[?&]t=([\d.]+)/.exec(location.search);
  if (q) { state.paused = true; state.t = parseFloat(q[1]); render(state.t); } else { init(); }
})();
