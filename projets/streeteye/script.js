/* StreetEye : simulation de salle de contrôle (rue dessinée, aucune image réelle). */
(function () {
  'use strict';

  var W = 960, H = 540;
  var cam = document.getElementById('se-cam');
  var mapCv = document.getElementById('se-map');
  if (!cam || !cam.getContext) return;

  var ctx = cam.getContext('2d');
  var mctx = mapCv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Résolution du canevas : nette sur écran dense, sans exagérer.
  var scale = Math.min(2, window.devicePixelRatio || 1);
  cam.width = Math.round(W * scale);
  cam.height = Math.round(H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  var el = {
    log: document.getElementById('se-log'),
    det: document.getElementById('se-n-det'),
    alert: document.getElementById('se-n-alert'),
    conf: document.getElementById('se-n-conf'),
    play: document.getElementById('se-play'),
    seuil: document.getElementById('se-seuil'),
    seuilOut: document.getElementById('se-seuil-out'),
    clock: document.getElementById('se-clock'),
    flash: document.getElementById('se-flash')
  };

  // ---- Générateur pseudo-aléatoire (état de départ reproductible) ----
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry(7);
  function rr(a, b) { return a + (b - a) * rnd(); }
  function pick(list) { return list[Math.floor(rnd() * list.length)]; }

  // ---- Types, comme dans le programme : voiture, 2 roues, camion, cycliste, piéton, chien ----
  var TYPES = {
    'voiture': { w: 116, h: 40, kmh: [18, 46], lane: 'road', cls: 'veh', weight: 46 },
    'camion': { w: 190, h: 62, kmh: [14, 34], lane: 'road', cls: 'veh', weight: 9 },
    '2 roues': { w: 64, h: 46, kmh: [20, 52], lane: 'road', cls: 'veh', weight: 10 },
    'cycliste': { w: 58, h: 56, kmh: [10, 22], lane: 'road', cls: 'rider', weight: 12 },
    'pieton': { w: 16, h: 46, kmh: [3, 6], lane: 'walk', cls: 'person', weight: 18 },
    'chien': { w: 40, h: 24, kmh: [4, 9], lane: 'walk', cls: 'animal', weight: 5 }
  };
  var COLORS = { veh: '#4fd1ff', rider: '#ffd166', person: '#ffd166', animal: '#c9a2ff' };
  var LANES = [
    { y: 392, s: 0.92, dir: 1 },    // voie du fond
    { y: 452, s: 1.1, dir: -1 }     // voie proche
  ];
  var WALKS = [
    { y: 326, s: 0.78 },
    { y: 522, s: 1.18 }
  ];
  var CAR_COLORS = ['#34506b', '#6e2f33', '#2f5646', '#8b929b', '#d4d8dc', '#3b3f52', '#8a6a2b'];
  var SPEED_K = 5; // pixels par seconde pour 1 km/h (échelle de démonstration)
  var FLASH_KMH = 20;

  // ---- État ----
  var objs = [];
  var nextId = 1;
  var spawnIn = 0.3;
  var rings = [];
  var stats = { det: 0, alert: 0, confSum: 0 };
  var seuilTg = 28;
  var playing = !reduce;
  var running = false;
  var userPaused = false;
  var visible = true;
  var last = 0;
  var simT = 0;
  var bg = null;
  var booting = true;

  // ---- Décor (dessiné une fois) ----
  function buildBackground() {
    var c = document.createElement('canvas');
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    var g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 0, 0);
    var r = mulberry(21);

    var sky = g.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#0d1620'); sky.addColorStop(0.7, '#1c2a38'); sky.addColorStop(1, '#2a3a48');
    g.fillStyle = sky; g.fillRect(0, 0, W, 340);

    // Immeubles : deux plans, fenêtres allumées au hasard
    var x = -20, plan, layers = [{ top: 120, hmax: 150, col: '#101a24' }, { top: 175, hmax: 110, col: '#0b121a' }];
    for (plan = 0; plan < layers.length; plan++) {
      x = -20 - plan * 30;
      while (x < W + 20) {
        var bw = 70 + r() * 90, bh = 60 + r() * layers[plan].hmax;
        var by = 318 - bh;
        g.fillStyle = layers[plan].col; g.fillRect(x, by, bw, bh + 24);
        for (var wy = by + 12; wy < 300; wy += 20) {
          for (var wx = x + 10; wx < x + bw - 12; wx += 18) {
            if (r() < (plan ? 0.22 : 0.3)) {
              g.fillStyle = r() < 0.7 ? 'rgba(255,205,120,' + (0.25 + r() * 0.35) + ')' : 'rgba(150,215,255,0.3)';
              g.fillRect(wx, wy, 9, 11);
            }
          }
        }
        x += bw + 4 + r() * 10;
      }
    }

    // Trottoir du fond, route, trottoir proche
    g.fillStyle = '#26303a'; g.fillRect(0, 318, W, 22);
    g.fillStyle = '#1a232c'; g.fillRect(0, 340, W, 150);
    g.fillStyle = '#2b3640'; g.fillRect(0, 490, W, 50);
    g.fillStyle = '#3a4752'; g.fillRect(0, 338, W, 3); g.fillRect(0, 488, W, 3);
    // Marquage axial
    g.fillStyle = 'rgba(235,235,225,.55)';
    for (var mx = 10; mx < W; mx += 70) g.fillRect(mx, 414, 36, 3);
    // Reflets de route
    var wet = g.createLinearGradient(0, 340, 0, 490);
    wet.addColorStop(0, 'rgba(120,170,210,.00)'); wet.addColorStop(1, 'rgba(120,170,210,.10)');
    g.fillStyle = wet; g.fillRect(0, 340, W, 150);

    // Lampadaires avec halo
    [90, 330, 600, 850].forEach(function (lx) {
      g.fillStyle = '#0a1016'; g.fillRect(lx - 2, 210, 4, 118);
      g.fillRect(lx - 2, 210, 22, 4);
      var halo = g.createRadialGradient(lx + 18, 222, 2, lx + 18, 222, 120);
      halo.addColorStop(0, 'rgba(255,214,150,.55)'); halo.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = halo; g.fillRect(lx - 110, 100, 240, 240);
      var pool = g.createRadialGradient(lx + 18, 345, 4, lx + 18, 345, 130);
      pool.addColorStop(0, 'rgba(255,214,150,.18)'); pool.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = pool; g.fillRect(lx - 120, 330, 280, 120);
    });
    bg = c;
  }

  // ---- Dessin des objets (repère local : x centré, y = sol, tourné vers la droite) ----
  function wheel(g, x, y, r, col) {
    g.fillStyle = '#05070a'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    g.fillStyle = col || '#4a5560'; g.beginPath(); g.arc(x, y, r * 0.45, 0, 6.2832); g.fill();
  }
  function drawCar(g, o) {
    g.fillStyle = o.color;
    rrect(g, -58, -28, 116, 20, 7); g.fill();
    g.beginPath(); g.moveTo(-32, -28); g.lineTo(-20, -42); g.lineTo(22, -42); g.lineTo(38, -28); g.closePath(); g.fill();
    g.fillStyle = 'rgba(160,205,235,.55)';
    g.beginPath(); g.moveTo(-26, -29); g.lineTo(-17, -39); g.lineTo(-1, -39); g.lineTo(-1, -29); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(3, -29); g.lineTo(3, -39); g.lineTo(20, -39); g.lineTo(32, -29); g.closePath(); g.fill();
    wheel(g, -34, -9, 10); wheel(g, 34, -9, 10);
    g.fillStyle = '#ff4a3a'; g.fillRect(-58, -24, 4, 6);
    glow(g, 58, -20, 150);
  }
  function drawTruck(g, o) {
    g.fillStyle = '#aab6c0'; rrect(g, -96, -66, 122, 54, 3); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-96, -30, 122, 2);
    g.fillStyle = o.color; rrect(g, 28, -48, 66, 36, 6); g.fill();
    g.fillStyle = 'rgba(160,205,235,.55)'; g.beginPath(); g.moveTo(62, -44); g.lineTo(86, -44); g.lineTo(90, -28); g.lineTo(62, -28); g.closePath(); g.fill();
    wheel(g, -70, -10, 11); wheel(g, -42, -10, 11); wheel(g, 66, -10, 11);
    g.fillStyle = '#ff4a3a'; g.fillRect(-96, -22, 3, 7);
    glow(g, 94, -22, 150);
  }
  function drawMoto(g, o) {
    wheel(g, -22, -11, 11); wheel(g, 22, -11, 11);
    g.strokeStyle = '#2c3640'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-22, -11); g.lineTo(-6, -22); g.lineTo(14, -22); g.lineTo(22, -11); g.stroke();
    g.fillStyle = o.color; rrect(g, -10, -30, 26, 10, 4); g.fill();
    g.fillStyle = '#0c1218'; // pilote
    g.beginPath(); g.arc(-2, -44, 6, 0, 6.2832); g.fill();
    g.save(); g.translate(-2, -38); g.rotate(0.35); rrect(g, -5, 0, 12, 18, 5); g.fill(); g.restore();
    glow(g, 26, -20, 110);
  }
  function drawCyclist(g, o) {
    var p = o.phase;
    g.strokeStyle = '#0a0f14'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(-20, -13, 13, 0, 6.2832); g.stroke();
    g.beginPath(); g.arc(20, -13, 13, 0, 6.2832); g.stroke();
    g.strokeStyle = o.color; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-20, -13); g.lineTo(-4, -28); g.lineTo(14, -28); g.lineTo(20, -13); g.moveTo(-4, -28); g.lineTo(0, -13); g.lineTo(-20, -13); g.stroke();
    g.fillStyle = '#0c1218'; g.strokeStyle = '#0c1218'; g.lineWidth = 4;
    g.beginPath(); g.arc(4, -50, 6, 0, 6.2832); g.fill();
    g.beginPath(); g.moveTo(-3, -30); g.lineTo(6, -44); g.lineTo(14, -30); g.stroke();
    var kx = 0 + Math.cos(p) * 6, ky = -13 + Math.sin(p) * 4;
    g.beginPath(); g.moveTo(-3, -30); g.lineTo(kx + 3, ky - 6); g.lineTo(kx - 2, ky + 4); g.stroke();
  }
  function drawPerson(g, o) {
    var s = Math.sin(o.phase) * 7;
    g.strokeStyle = '#0c1218'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -22); g.lineTo(s, 0); g.moveTo(0, -22); g.lineTo(-s, 0); g.stroke();
    g.fillStyle = o.color; rrect(g, -6, -42, 12, 22, 5); g.fill();
    g.fillStyle = '#0c1218'; g.beginPath(); g.arc(0, -47, 5.5, 0, 6.2832); g.fill();
  }
  function drawDog(g, o) {
    var s = Math.sin(o.phase * 1.6) * 4;
    g.strokeStyle = '#120d0a'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-12, -9); g.lineTo(-12 + s, 0); g.moveTo(-8, -9); g.lineTo(-8 - s, 0);
    g.moveTo(10, -9); g.lineTo(10 - s, 0); g.moveTo(14, -9); g.lineTo(14 + s, 0); g.stroke();
    g.fillStyle = o.color; g.beginPath(); g.ellipse(0, -14, 17, 7, 0, 0, 6.2832); g.fill();
    g.beginPath(); g.arc(19, -20, 6, 0, 6.2832); g.fill();
    g.beginPath(); g.moveTo(-16, -17); g.quadraticCurveTo(-24, -26, -20, -28); g.lineWidth = 3; g.strokeStyle = o.color; g.stroke();
  }
  function glow(g, x, y, len) { // faisceau de phares
    var gr = g.createLinearGradient(x, y, x + len, y);
    gr.addColorStop(0, 'rgba(255,230,170,.42)'); gr.addColorStop(1, 'rgba(255,230,170,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + len, y - 26); g.lineTo(x + len, y + 26); g.lineTo(x, y + 6); g.closePath(); g.fill();
  }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  var DRAW = { 'voiture': drawCar, 'camion': drawTruck, '2 roues': drawMoto, 'cycliste': drawCyclist, 'pieton': drawPerson, 'chien': drawDog };

  // ---- Création et mise à jour ----
  function spawn() {
    var total = 0, t, name;
    for (name in TYPES) total += TYPES[name].weight;
    var roll = rnd() * total;
    for (name in TYPES) { roll -= TYPES[name].weight; if (roll <= 0) break; }
    t = TYPES[name];
    var lane, dir, y, s;
    if (t.lane === 'road') {
      var li = (name === 'cycliste') ? (rnd() < 0.5 ? 0 : 1) : (rnd() < 0.5 ? 0 : 1);
      lane = LANES[li]; dir = lane.dir; y = lane.y + (name === 'cycliste' ? 26 * lane.s : 0); s = lane.s;
      lane = li;
    } else {
      var wi = rnd() < 0.5 ? 0 : 1;
      dir = rnd() < 0.5 ? 1 : -1; y = WALKS[wi].y; s = WALKS[wi].s; lane = 10 + wi;
    }
    var half = t.w * s / 2 + 10;
    var x = dir > 0 ? -half : W + half;
    // Pas de chevauchement à l'apparition
    for (var i = 0; i < objs.length; i++) {
      var q = objs[i];
      if (q.lane === lane && Math.abs(q.x - x) < q.w / 2 + half + 40) return;
    }
    var kmh = rr(t.kmh[0], t.kmh[1]);
    var conf = rnd() < 0.16 ? rr(0.58, 0.79) : rr(0.82, 0.98);
    objs.push({
      id: nextId++, type: name, cls: t.cls, lane: lane, x: x, y: y, s: s, dir: dir, w: t.w * s, h: t.h * s,
      kmh: kmh, shown: kmh, conf: conf, rec: false, hot: false, phase: rnd() * 6,
      color: name === 'voiture' || name === 'camion' || name === '2 roues' || name === 'cycliste' ? pick(CAR_COLORS) : pick(['#3a4a63', '#5c3a3a', '#2e4a44', '#6a5a3a', '#4a3a63']),
      bx: 0, by: 0, bw: t.w * s, bh: t.h * s, born: simT, prevX: x
    });
  }

  function step(dt) {
    simT += dt;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = rr(0.7, 2.0); }

    for (var i = objs.length - 1; i >= 0; i--) {
      var o = objs[i], v = o.kmh;
      // Ne rattrape pas l'objet qui précède sur la même voie
      for (var j = 0; j < objs.length; j++) {
        var q = objs[j];
        if (q === o || q.lane !== o.lane || q.dir !== o.dir) continue;
        var gap = (q.x - o.x) * o.dir - (q.w + o.w) / 2;
        if (gap > -10 && gap < 40 && q.kmh < v) v = q.kmh;
      }
      o.prevX = o.x;
      o.x += o.dir * v * SPEED_K * (o.lane >= 10 ? 1.6 : 1) * dt * (o.s);
      o.phase += dt * (3 + v * 0.35);
      o.shown += (v - o.shown) * Math.min(1, dt * 3);

      // Cadre de suivi : légèrement lissé et bruité, comme un vrai détecteur
      var tx = o.x - o.w / 2 + Math.sin(simT * 7 + o.id) * 1.4;
      var ty = o.y - o.h + Math.cos(simT * 5 + o.id) * 1.2;
      var k = Math.min(1, dt * 14);
      if (!o.bx) { o.bx = tx; o.by = ty; }
      o.bx += (tx - o.bx) * k; o.by += (ty - o.by) * k;

      // Franchissement de la ligne de repère (x = 480)
      var mid = W / 2;
      if (!o.rec && o.conf > 0.8 && (o.prevX - mid) * (o.x - mid) <= 0) {
        record(o);
      }
      if (o.x < -260 || o.x > W + 260) objs.splice(i, 1);
    }
    for (var r = rings.length - 1; r >= 0; r--) {
      rings[r].t += dt; if (rings[r].t > 0.6) rings.splice(r, 1);
    }
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() { var d = new Date(); return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()); }
  function fr(n, d) { return n.toFixed(d).replace('.', ','); }
  var LABEL = { 'pieton': 'piéton', 'chien': 'chien', 'voiture': 'voiture', 'camion': 'camion', '2 roues': '2 roues', 'cycliste': 'cycliste' };

  function record(o) {
    o.rec = true;
    var kmh = Math.round(o.shown);
    stats.det++; stats.confSum += o.conf;
    var flashed = kmh > FLASH_KMH && o.cls !== 'person' && o.cls !== 'animal';
    var telegram = kmh > seuilTg && o.cls !== 'person' && o.cls !== 'animal';
    if (flashed) stats.alert++;
    o.hot = flashed;
    rings.push({ x: o.x, y: o.y - o.h / 2, w: o.w, h: o.h, t: 0 });
    if (flashed && !reduce && !booting) { el.flash.classList.remove('is-on'); void el.flash.offsetWidth; el.flash.classList.add('is-on'); }
    logLine(o, kmh, telegram ? 'tg' : (flashed ? 'flash' : ''));
    paintStats();
  }

  function logLine(o, kmh, kind) {
    var li = document.createElement('li');
    if (kind === 'tg') li.className = 'is-tg'; else if (kind === 'flash') li.className = 'is-flash';
    var t = document.createElement('time'); t.textContent = stamp();
    var d = document.createElement('div');
    var b = document.createElement('b');
    b.textContent = '#' + o.id + ' ' + LABEL[o.type] + ' · ' + kmh + ' km/h';
    var s = document.createElement('div');
    s.textContent = (kind === 'tg' ? 'Alerte Telegram envoyée avec la photo' : (kind === 'flash' ? 'Alerte au tableau de bord' : 'Détection enregistrée')) + ' · confiance ' + fr(o.conf, 2);
    d.appendChild(b); d.appendChild(s);
    li.appendChild(t); li.appendChild(d);
    el.log.insertBefore(li, el.log.firstChild);
    while (el.log.children.length > 6) el.log.removeChild(el.log.lastChild);
  }

  function paintStats() {
    el.det.textContent = String(stats.det);
    el.alert.textContent = String(stats.alert);
    el.conf.textContent = stats.det ? Math.round(stats.confSum / stats.det * 100) + ' %' : '0 %';
  }

  // ---- Rendu ----
  function box(o) {
    var x = o.bx, y = o.by, w = o.w + 6, h = o.h + 6;
    x -= 3; y -= 3;
    var low = o.conf <= 0.8;
    var col = low ? '#8a98a3' : (o.hot ? '#ff6454' : COLORS[o.cls]);
    ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.globalAlpha = low ? 0.7 : 0.4;
    if (low) ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (!low) {
      ctx.lineWidth = 2.5; var L = Math.min(14, w / 3, h / 3);
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    }
    var txt = '#' + o.id + ' ' + LABEL[o.type] + ' ' + fr(o.conf, 2);
    if (!low && o.cls !== 'person' && o.cls !== 'animal') txt += ' · ' + Math.round(o.shown) + ' km/h';
    if (low) txt += ' · sous le seuil';
    ctx.font = '600 12px ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace';
    var tw = ctx.measureText(txt).width + 10;
    var lx = Math.max(2, Math.min(W - tw - 2, x)), ly = Math.max(16, y - 3);
    ctx.fillStyle = col; ctx.globalAlpha = low ? 0.8 : 1;
    ctx.fillRect(lx, ly - 15, tw, 15);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#071014'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, lx + 5, ly - 7);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);

    var list = objs.slice().sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) {
      // ombre
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(o.x, o.y + 1, o.w * 0.5, 4 * o.s, 0, 0, 6.2832); ctx.fill();
      ctx.save();
      ctx.translate(o.x, o.y); ctx.scale(o.dir * o.s, o.s);
      DRAW[o.type](ctx, o);
      ctx.restore();
    });

    // Ligne de repère au milieu de l'image
    ctx.setLineDash([10, 6]); ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    list.forEach(box);

    rings.forEach(function (r) {
      var p = r.t / 0.6, g = 6 + p * 40;
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.lineWidth = 2;
      ctx.strokeRect(r.x - r.w / 2 - g, r.y - r.h / 2 - g, r.w + g * 2, r.h + g * 2);
    });
    drawMap();
  }

  // Plan schématique : une route en haut, la caméra et un point par objet
  function drawMap() {
    var w = mapCv.width, h = mapCv.height, g = mctx;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0b1218'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(79,209,255,.08)'; g.lineWidth = 1;
    for (var i = 0; i < w; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    for (var j = 0; j < h; j += 40) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
    // routes
    g.fillStyle = '#1b2732'; g.fillRect(0, 110, w, 70); g.fillRect(300, 0, 56, h);
    g.setLineDash([10, 8]); g.strokeStyle = 'rgba(230,230,220,.4)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 145); g.lineTo(w, 145); g.stroke(); g.setLineDash([]);
    // caméra et cône de vision
    var cx = 160, cy = 235;
    var cone = g.createRadialGradient(cx, cy, 4, cx, cy, 130);
    cone.addColorStop(0, 'rgba(255,180,0,.45)'); cone.addColorStop(1, 'rgba(255,180,0,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 130, -Math.PI * 0.78, -Math.PI * 0.22); g.closePath(); g.fill();
    g.fillStyle = '#ffb400'; g.beginPath(); g.arc(cx, cy, 7, 0, 6.2832); g.fill();
    g.strokeStyle = '#ffb400'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 13, 0, 6.2832); g.stroke();
    // objets : l'abscisse de l'image devient celle du plan
    objs.forEach(function (o) {
      var px = 20 + (o.x / W) * (w - 40);
      var py = o.lane >= 10 ? (o.lane === 10 ? 100 : 192) : (o.lane === 0 ? 128 : 162);
      g.fillStyle = (o.conf <= 0.8) ? '#8a98a3' : (o.hot ? '#ff6454' : COLORS[o.cls]);
      g.beginPath(); g.arc(px, py, 5, 0, 6.2832); g.fill();
    });
  }

  // ---- Boucle : requestAnimationFrame, en pause si l'onglet est caché ----
  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.016;
    last = ts;
    step(dt); draw(); tickClock();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !playing || !visible || document.hidden) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  var lastSec = -1;
  function tickClock() {
    var s = Math.floor(Date.now() / 1000);
    if (s !== lastSec) { lastSec = s; el.clock.textContent = stamp(); }
  }

  function setPlaying(p) {
    playing = p; userPaused = !p;
    el.play.textContent = p ? 'Mettre en pause' : 'Lancer la simulation';
    el.play.setAttribute('aria-pressed', p ? 'false' : 'true');
    if (p) start(); else stop();
  }

  el.play.addEventListener('click', function () { setPlaying(!playing); });
  el.seuil.addEventListener('input', function () {
    seuilTg = Number(el.seuil.value);
    el.seuilOut.textContent = seuilTg + ' km/h';
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(cam);
  }

  // ---- Démarrage ----
  buildBackground();
  el.seuilOut.textContent = seuilTg + ' km/h';
  tickClock();

  if (reduce) {
    // Image fixe, complète : on avance la simulation hors écran puis on dessine une fois.
    for (var n = 0; n < 560; n++) step(1 / 30);
    draw(); paintStats();
    el.play.textContent = 'Lancer la simulation';
    el.play.setAttribute('aria-pressed', 'true');
    playing = false;
  } else {
    // Départ « en cours de route » : la rue n'est pas vide à l'arrivée.
    for (var m = 0; m < 240; m++) step(1 / 30);
    booting = false;
    rnd = Math.random;
    draw(); paintStats();
    start();
  }
})();
