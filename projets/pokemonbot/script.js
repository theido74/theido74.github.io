/* PokemonBot : tapis d'annonces factices, quatre portes, alerte (fonction du temps) */
(function () {
  'use strict';
  var doc = document, rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  doc.body.classList.add('pk-js');
  var $ = function (s) { return doc.querySelector(s); };
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function hash(i) { var h = (i + 7) * 2654435761 >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; }

  var cv = $('#pk-cv'), g = cv.getContext('2d');
  var W = 900, H = 300, dpr = 1, cw = 66, ch = 91, speed = 140, lane = 120;
  var GATES = [0.27, 0.45, 0.63, 0.81], NAMES = ['Filtrer', 'Reconnaître', 'Estimer', 'Comparer'], P = 1.3;
  var DEALS = [
    { price: 58.00, total: 76.81, f: ['58.00', '7.50', '5.31', '6.00', '76.81', '110.00'], conf: 0.91 },
    { price: 24.00, total: 35.24, f: ['24.00', '4.90', '2.34', '4.00', '35.24', '52.00'], conf: 0.87 },
    { price: 132.00, total: 165.39, f: ['132.00', '9.90', '11.49', '12.00', '165.39', '230.00'], conf: 0.93 }
  ];
  var sprites = {};

  /* ----- Cartes génériques : formes seulement, aucun visuel officiel ----- */
  function sprite(v) {
    if (sprites[v]) return sprites[v];
    var c = doc.createElement('canvas'); c.width = 84; c.height = 116; var x = c.getContext('2d');
    var hue = (v * 47 + 190) % 360;
    var fg = x.createLinearGradient(0, 0, 84, 116);
    ['#5df2c2', '#7aa2ff', '#b58bff', '#ff7aa8', '#ffb86b'].forEach(function (col, k) { fg.addColorStop(k / 4, col); });
    x.fillStyle = fg; x.beginPath(); x.roundRect(0, 0, 84, 116, 9); x.fill();
    x.fillStyle = 'hsl(' + hue + ',35%,18%)'; x.beginPath(); x.roundRect(4, 4, 76, 108, 6); x.fill();
    var art = x.createLinearGradient(0, 14, 0, 70); art.addColorStop(0, 'hsl(' + hue + ',70%,60%)'); art.addColorStop(1, 'hsl(' + ((hue + 50) % 360) + ',70%,35%)');
    x.fillStyle = art; x.beginPath(); x.roundRect(10, 14, 64, 56, 5); x.fill();
    x.fillStyle = 'rgba(255,255,255,.88)'; x.beginPath();
    var k = v % 5, cx = 42, cy = 42;
    if (k === 0) x.arc(cx, cy, 17, 0, 7);
    else if (k === 1) { for (var a = 0; a < 10; a++) { var r = a % 2 ? 9 : 20, an = a * Math.PI / 5 - Math.PI / 2; x.lineTo(cx + r * Math.cos(an), cy + r * Math.sin(an)); } }
    else if (k === 2) { x.moveTo(cx, cy - 20); x.lineTo(cx + 16, cy); x.lineTo(cx, cy + 20); x.lineTo(cx - 16, cy); }
    else if (k === 3) { x.moveTo(cx, cy - 19); x.lineTo(cx + 19, cy + 15); x.lineTo(cx - 19, cy + 15); }
    else { x.rect(cx - 15, cy - 15, 30, 30); }
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(12, 80, 52, 5); x.fillRect(12, 90, 36, 5);
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '700 10px ui-monospace,Menlo,monospace'; x.textAlign = 'right'; x.fillText('n° ' + String(10 + (v * 37) % 90), 74, 106);
    sprites[v] = c; return c;
  }

  function layout() {
    var r = cv.getBoundingClientRect(); W = Math.max(300, Math.round(r.width)); H = Math.round(clamp(W * 0.56, 330, 420));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.aspectRatio = W + '/' + H;
    cw = clamp(W * 0.075, 40, 70); ch = cw * 116 / 84; speed = W * 0.16; lane = H * 0.27;
  }

  /* ----- Issue de chaque annonce (déterministe) ----- */
  function outcome(i) {
    var m = i % 7;
    if (m === 1) return { kind: 'deal', v: 8 + Math.floor(i / 7) % 3, n: Math.floor(i / 7) };
    if (m === 3) return { kind: 'dup', v: 8 + Math.floor((i - 2) / 7) % 3, gate: 3, why: 'doublon' };
    var r = hash(i) % 100;
    if (r < 28) return { kind: 'out', v: i % 8, gate: 0, why: 'hors critères' };
    if (r < 60) return { kind: 'out', v: i % 8, gate: 1, why: r % 2 ? 'non reconnue' : 'confiance faible' };
    return { kind: 'out', v: i % 8, gate: 3, why: 'pas sous la valeur' };
  }
  function gx(k) { return GATES[k] * W; }
  function tAt(i, x) { return i * P + (x + cw) / speed; }

  function icon(k, x, y) {
    g.strokeStyle = '#eef0ff'; g.fillStyle = '#eef0ff'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    if (k === 0) { g.moveTo(x - 7, y - 6); g.lineTo(x + 7, y - 6); g.lineTo(x + 1.5, y + 1); g.lineTo(x + 1.5, y + 7); g.lineTo(x - 1.5, y + 5); g.lineTo(x - 1.5, y + 1); g.closePath(); g.stroke(); }
    else if (k === 1) { g.arc(x - 1.5, y - 1.5, 5.5, 0, 7); g.moveTo(x + 2.5, y + 2.5); g.lineTo(x + 7, y + 7); g.stroke(); }
    else if (k === 2) { g.moveTo(x - 6, y - 3); g.lineTo(x + 6, y - 3); g.moveTo(x - 6, y + 3); g.lineTo(x + 6, y + 3); g.stroke(); }
    else { g.moveTo(x + 5, y - 7); g.lineTo(x - 5, y); g.lineTo(x + 5, y + 7); g.stroke(); }
  }

  function draw(T) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var small = W < 560, fs = small ? 11 : 15;
    // tapis
    g.fillStyle = '#0f1028'; g.fillRect(0, lane - ch / 2 - 14, W, ch + 28);
    g.fillStyle = '#23244a'; var off = (T * speed) % 22;
    for (var x0 = -22 + off; x0 < W; x0 += 22) { g.fillRect(x0, lane + ch / 2 + 8, 11, 4); g.fillRect(x0, lane - ch / 2 - 12, 11, 4); }
    // portes
    var chips = [];
    for (var k = 0; k < 4; k++) {
      var X = gx(k), beam = g.createLinearGradient(0, lane - ch / 2 - 24, 0, lane + ch / 2 + 24);
      beam.addColorStop(0, 'rgba(93,242,194,0)'); beam.addColorStop(.5, 'rgba(93,242,194,.35)'); beam.addColorStop(1, 'rgba(93,242,194,0)');
      g.fillStyle = beam; g.fillRect(X - 3, lane - ch / 2 - 24, 6, ch + 48);
      g.fillStyle = '#2a2c58'; g.beginPath(); g.arc(X, lane - ch / 2 - 30, 17, 0, 7); g.fill();
      g.strokeStyle = '#5df2c2'; g.lineWidth = 2; g.stroke(); icon(k, X, lane - ch / 2 - 30);
      g.fillStyle = '#dfe2ff'; g.font = '800 ' + fs + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText(NAMES[k], X, lane + ch / 2 + 34 + (k % 2) * (fs + 4));
    }
    g.fillStyle = 'rgba(255,122,168,.10)'; g.strokeStyle = 'rgba(255,122,168,.5)'; g.lineWidth = 2; g.setLineDash([8, 6]);
    g.beginPath(); g.roundRect(8, H - 46, W - 16, 38, 12); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffb3cc'; g.font = '700 ' + fs + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('annonces écartées', W / 2, H - 22);
    // cartes
    var i0 = Math.max(0, Math.floor((T - (W + 2 * cw) / speed - 3) / P)), i1 = Math.floor(T / P);
    for (var i = i0; i <= i1; i++) {
      var o = outcome(i), ts = i * P, x = -cw + speed * (T - ts), y = lane, al = 1, rot = 0, tf = null, gate = -1;
      if (o.kind !== 'deal') { gate = o.gate; tf = tAt(i, gx(gate)); }
      if (tf !== null && T > tf) {
        var q = clamp((T - tf - 0.15) / 0.9, 0, 1); x = gx(gate); y = lane + (H - 40 - lane - ch / 2) * q * q; al = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1; rot = q * 0.5 * (i % 2 ? 1 : -1);
        if (T - tf < 1.6) chips.push({ x: gx(gate), t: o.why, a: clamp(1 - (T - tf - 1.1) / 0.5, 0, 1) });
      }
      if (x > W + cw) continue;
      var sw = cw, sh = ch, price;
      // étiquette de prix : prix affiché, puis coût rendu après la porte « Estimer »
      var after = T > tAt(i, gx(2));
      if (o.kind === 'deal' || o.kind === 'dup') { var d = DEALS[(o.v - 8) % 3]; price = after ? d.total : d.price; }
      else { var p0 = 10 + hash(i + 3) % 90; price = after ? p0 * 1.32 + 9 : p0; }
      g.save(); g.globalAlpha = al; g.translate(x, y); g.rotate(rot);
      if (o.kind === 'deal' && T > tAt(i, gx(3))) { g.shadowColor = '#5df2c2'; g.shadowBlur = 22; }
      g.drawImage(sprite(o.v), -sw / 2, -sh / 2, sw, sh); g.shadowBlur = 0;
      g.fillStyle = after ? '#5df2c2' : '#b3b8e6'; g.font = '800 ' + (fs - 1) + 'px ui-monospace,Menlo,monospace'; g.textAlign = 'center';
      g.fillText(price.toFixed(2), 0, -sh / 2 - 6); g.restore();
    }
    // raisons de refus
    chips.forEach(function (c) {
      g.globalAlpha = c.a; g.font = '700 ' + (fs - 1) + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif';
      var tw = g.measureText(c.t).width + 16, cx = clamp(c.x, tw / 2 + 2, W - tw / 2 - 2), cy = lane + ch / 2 + 22 + (fs + 4) * 2 + 18;
      g.fillStyle = '#3a1630'; g.strokeStyle = '#ff7aa8'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(cx - tw / 2, cy - 14, tw, 22, 11); g.fill(); g.stroke();
      g.fillStyle = '#ffb3cc'; g.textAlign = 'center'; g.fillText(c.t, cx, cy + 1); g.globalAlpha = 1;
    });
    g.fillStyle = '#b3b8e6'; g.font = '700 ' + fs + 'px ui-rounded,"Trebuchet MS",system-ui,sans-serif'; g.textAlign = 'left'; g.fillText('annonces en entrée', 10, 22);
  }

  /* ----- Message d'alerte ----- */
  var msg = $('#pk-msg'), wait = $('#pk-wait'), embed = $('#pk-embed'), thumb = $('#pk-thumb').getContext('2d'), lastN = -2;
  function alertState(T) {
    // dernière bonne affaire ayant franchi la dernière porte
    var best = -1, tg = 0;
    for (var i = Math.max(0, Math.floor(T / P) - 12); i <= Math.floor(T / P); i++) {
      if (outcome(i).kind === 'deal' && T >= tAt(i, gx(3))) { best = outcome(i).n; tg = tAt(i, gx(3)); }
    }
    if (best < 0) { msg.style.display = 'none'; wait.classList.add('is-on'); lastN = -1; return; }
    wait.classList.remove('is-on'); msg.style.display = '';
    if (best !== lastN) {
      lastN = best; var d = DEALS[best % 3];
      for (var k = 0; k < 6; k++) $('#pk-f' + k).textContent = d.f[k] + ' CHF';
      $('#pk-confv').textContent = String(d.conf).replace('.', ','); $('#pk-confbar').style.width = Math.round(d.conf * 100) + '%';
      thumb.clearRect(0, 0, 84, 116); thumb.drawImage(sprite(8 + best % 3), 0, 0);
    }
    var a = clamp((T - tg) / 0.6, 0, 1), e = ease(a);
    msg.style.opacity = e; msg.style.transform = 'translateY(' + ((1 - e) * 18).toFixed(1) + 'px) scale(' + (0.94 + 0.06 * e).toFixed(3) + ')';
  }

  /* ----- Saisie de commande ----- */
  var typed = $('#pk-typed'), CMDS = ['watch', 'deals', 'price', 'moi effacer'], lastTyped = '';
  function drawTyped(T) {
    var s = 3.2, k = Math.floor(T / s) % CMDS.length, u = (T % s) / 1.4, c = CMDS[k];
    var txt = c.slice(0, Math.round(clamp(u, 0, 1) * c.length));
    if (txt !== lastTyped) { typed.textContent = txt; lastTyped = txt; }
  }

  /* ----- Boucle ----- */
  var T = 3, prev = 0, raf = 0, vis = { belt: true, typ: false }, paused = false;
  function render() { draw(T); alertState(T); embed.style.setProperty('--pk-a', ((T * 40) % 360).toFixed(1) + 'deg'); }
  function active() { return !rm.matches && !doc.hidden && !paused && (vis.belt || vis.typ); }
  function frame(now) {
    raf = 0; if (!active()) { prev = 0; return; }
    var dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0; prev = now; T += dt;
    if (vis.belt) render(); if (vis.typ) drawTyped(T);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && active()) { prev = 0; raf = requestAnimationFrame(frame); } }
  function watch(el, key, th) { if (!('IntersectionObserver' in window)) return; new IntersectionObserver(function (e) { vis[key] = e[0].isIntersecting; kick(); }, { threshold: th }).observe(el); }
  watch(cv, 'belt', 0.05); watch($('.pk-input'), 'typ', 0.3);
  doc.addEventListener('visibilitychange', kick);
  window.addEventListener('resize', function () { layout(); render(); });
  var pb = $('#pk-pause');
  pb.addEventListener('click', function () { paused = !paused; pb.setAttribute('aria-pressed', paused); pb.textContent = paused ? 'Reprendre' : 'Mettre en pause'; kick(); });

  // Cascade des coûts : apparition au défilement
  var wf = $('#pk-wf');
  if ('IntersectionObserver' in window && !rm.matches) { var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { wf.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.3 }); io.observe(wf); }
  else wf.classList.add('is-in');

  layout();
  var q = /[?&]t=([\d.]+)/.exec(location.search);
  if (q) { T = parseFloat(q[1]); paused = true; }
  if (rm.matches) { T = 9; pb.hidden = true; $('.pk-caret').style.display = 'none'; }
  render(); drawTyped(T); kick();
})();
