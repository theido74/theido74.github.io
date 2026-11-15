// Constellation : chaque projet est un point, relié aux technologies qu'il utilise.
// Simulation de forces maison (une quarantaine de nœuds), dessinée en canvas.
// La boucle s'arrête quand l'onglet est caché ou le héros hors écran ; mouvement réduit = image fixe.
(function () {
  "use strict";
  var H = window.Hub;
  var canvas = document.getElementById("graph");
  if (!H || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var wrap = canvas.parentNode;

  var nodes = [], edges = [], byKey = {};
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; } // graine fixe : rendu reproductible

  H.projects.forEach(function (p) {
    var n = { t: "p", id: p.id, p: p, cat: p.category, col: H.color(p.category), r: p.featured ? 8 : 6, a: 1, ta: 1 };
    byKey["p:" + p.id] = n; nodes.push(n);
  });
  H.techs.forEach(function (t) {
    var n = { t: "t", id: t.name, count: t.count, r: 2.4 + Math.min(t.count, 6) * 0.45, col: "#93a0b8", a: 1, ta: 1 };
    byKey["t:" + t.name] = n; nodes.push(n);
  });
  nodes.forEach(function (n, i) {
    var ang = rnd() * 6.283, rad = 60 + rnd() * 120;
    n.x = Math.cos(ang) * rad; n.y = Math.sin(ang) * rad; n.vx = 0; n.vy = 0; n.ph = rnd() * 6.283; n.adj = [];
  });
  H.projects.forEach(function (p) {
    p.tech.forEach(function (t) {
      var a = byKey["p:" + p.id], b = byKey["t:" + t];
      var e = { a: a, b: b, col: a.col, a2: 1 };
      edges.push(e); a.adj.push(b); b.adj.push(a);
    });
  });
  var packets = [];
  for (var k = 0; k < 9; k++) packets.push({ e: edges[(k * 7) % edges.length], s: rnd(), v: 0.00018 + rnd() * 0.00022 });

  var W = 0, Hh = 0, dpr = 1, cx = 0, cy = 0, x0 = 0, scale = 1, wide = false;
  var mouse = { x: -999, y: -999, in: false }, hover = null, drag = null, alpha = 1, lastMove = 0;
  var raf = 0, onScreen = true, last = 0;

  function resize() {
    W = wrap.clientWidth; Hh = wrap.clientHeight;
    if (!W || !Hh) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
    canvas.style.width = W + "px"; canvas.style.height = Hh + "px";
    wide = W >= 900;
    x0 = wide ? W * 0.4 : 14; // à gauche, la zone du texte reste libre
    cx = wide ? (x0 + W) / 2 : W / 2; cy = wide ? Hh * 0.52 : Hh / 2;
    scale = Math.max(0.55, Math.min((W - x0) / 600, Hh / 540, 1.7));
    alpha = Math.max(alpha, 0.6);
  }

  function step(t) {
    var i, j, a, b, dx, dy, d2, d, f;
    var rep = 2000 * scale * scale, rest = 66 * scale;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy + 30;
        if (d2 > 90000) continue;
        f = rep / d2 * alpha * (a.t === "p" && b.t === "p" ? 2.4 : 1); d = Math.sqrt(d2);
        dx = dx / d * f; dy = dy / d * f;
        a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
      }
    }
    for (i = 0; i < edges.length; i++) {
      a = edges[i].a; b = edges[i].b;
      dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      f = (d - rest) * 0.012 * alpha; dx = dx / d * f; dy = dy / d * f;
      a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
    }
    var lx = x0 - cx + 18, rx = W - cx - 18, ty = 22 - cy, by = Hh - cy - 22;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (a === drag) continue;
      a.vx += -a.x * 0.0026 * alpha + Math.sin(t * 0.0006 + a.ph) * 0.012;
      a.vy += -a.y * 0.0026 * alpha + Math.cos(t * 0.0005 + a.ph) * 0.012;
      if (mouse.in && !H.reduce) { // la souris repousse doucement les points voisins
        dx = a.x + cx - mouse.x; dy = a.y + cy - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < 14000) { d = Math.sqrt(d2) + 1; f = (1 - d / 118) * 0.9; a.vx += dx / d * f; a.vy += dy / d * f; }
      }
      a.vx *= 0.86; a.vy *= 0.86;
      a.x += a.vx; a.y += a.vy;
      if (a.x < lx) a.x = lx; else if (a.x > rx) a.x = rx;
      if (a.y < ty) a.y = ty; else if (a.y > by) a.y = by;
    }
    alpha = Math.max(0.12, alpha * 0.985);
  }

  function relevance() { // quels nœuds correspondent au filtre courant
    var s = H.state, any = s.cat || s.tech;
    nodes.forEach(function (n) {
      if (!any) { n.ta = 1; return; }
      if (n.t === "p") n.ta = H.match(n.p) ? 1 : 0.14;
      else {
        var on = n.adj.some(function (p) { return H.match(p.p); });
        n.ta = on ? (s.tech === n.id ? 1 : 0.8) : 0.1;
      }
    });
  }

  function nodeAlpha(n) {
    var a = n.a;
    if (hover) a = hover === n || hover.adj.indexOf(n) >= 0 ? Math.max(a, 0.95) : a * 0.35;
    return a;
  }

  function draw(t) {
    var i, n, e, p, a, x, y;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    ctx.translate(cx, cy);
    var inv = !H.reduce;
    // Lueur des points de grille proches du curseur (la grille de fond est en CSS)
    if (mouse.in && inv) {
      ctx.save(); ctx.translate(-cx, -cy);
      var g = 28, gx0 = Math.floor((mouse.x - 110) / g) * g, gy0 = Math.floor((mouse.y - 110) / g) * g;
      for (x = gx0; x < mouse.x + 110; x += g) for (y = gy0; y < mouse.y + 110; y += g) {
        var dd = Math.hypot(x + g / 2 - mouse.x, y + g / 2 - mouse.y);
        if (dd < 110) { ctx.fillStyle = "rgba(126,232,162," + ((1 - dd / 110) * 0.55).toFixed(3) + ")"; ctx.fillRect(x + g / 2 - 1, y + g / 2 - 1, 2.4, 2.4); }
      }
      ctx.restore();
    }
    ctx.lineWidth = 1;
    for (i = 0; i < edges.length; i++) {
      e = edges[i];
      a = Math.min(nodeAlpha(e.a), nodeAlpha(e.b));
      var hot = hover && (hover === e.a || hover === e.b);
      ctx.globalAlpha = hot ? 0.85 : 0.2 * a;
      ctx.strokeStyle = hot || (H.state.cat || H.state.tech) && a > 0.5 ? e.col : "#8a96ad";
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
    if (inv) { // paquets qui circulent le long des liens
      for (i = 0; i < packets.length; i++) {
        p = packets[i]; e = p.e;
        a = Math.min(nodeAlpha(e.a), nodeAlpha(e.b));
        if (a < 0.4) continue;
        x = e.a.x + (e.b.x - e.a.x) * p.s; y = e.a.y + (e.b.y - e.a.y) * p.s;
        ctx.globalAlpha = 0.9 * a; ctx.fillStyle = e.col;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
      }
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; a = nodeAlpha(n);
      if (n.t === "t") {
        ctx.globalAlpha = 0.75 * a; ctx.fillStyle = "#93a0b8";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * scale + 0.4, 0, 6.283); ctx.fill();
      } else {
        var r = n.r * scale + (hover === n ? 2 : 0) + 1;
        ctx.globalAlpha = 0.16 * a; ctx.fillStyle = n.col;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.3, 0, 6.283); ctx.fill();
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.283); ctx.fill();
      }
    }
    // Étiquettes : projets (toujours sur grand écran), technologies fréquentes ou voisines du survol
    ctx.font = "11px 'Noto Sans Mono', ui-monospace, monospace"; ctx.textBaseline = "middle";
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; a = nodeAlpha(n);
      var near = hover && (hover === n || hover.adj.indexOf(n) >= 0);
      var show = n.t === "p" ? (wide || near || n.ta === 1 && (H.state.cat || H.state.tech)) : (near || n.count > 1 && wide);
      if (!show || a < 0.3) continue;
      ctx.globalAlpha = n.t === "p" ? Math.min(1, a) : 0.7 * a;
      ctx.fillStyle = n.t === "p" ? "#e6ebf5" : "#93a0b8";
      ctx.textAlign = n.x > W - cx - 110 ? "right" : "left";
      var off = (n.r * scale + 6) * (ctx.textAlign === "left" ? 1 : -1);
      ctx.fillText(n.id, n.x + off, n.y + 0.5);
    }
    // Bulle d'information sur le projet survolé
    if (hover && hover.t === "p") {
      var title = hover.p.title, sub = H.catLabel(hover.cat);
      ctx.font = "600 12px 'Noto Sans Mono', ui-monospace, monospace";
      var tw = Math.max(ctx.measureText(title).width, 0), bw = tw + 22, bh = 38;
      ctx.font = "11px 'Noto Sans Mono', ui-monospace, monospace";
      bw = Math.max(bw, ctx.measureText(sub).width + 22);
      var bx = Math.min(Math.max(hover.x - bw / 2, -cx + 8), W - cx - bw - 8);
      var by2 = hover.y - hover.r * scale - bh - 12;
      if (by2 < -cy + 6) by2 = hover.y + hover.r * scale + 14;
      ctx.globalAlpha = 0.96; ctx.fillStyle = "#0d111a"; ctx.strokeStyle = hover.col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by2, bw, bh, 6) : ctx.rect(bx, by2, bw, bh); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1; ctx.textAlign = "left";
      ctx.fillStyle = "#e6ebf5"; ctx.font = "600 12px 'Noto Sans Mono', ui-monospace, monospace"; ctx.fillText(title, bx + 11, by2 + 13);
      ctx.fillStyle = hover.col; ctx.font = "11px 'Noto Sans Mono', ui-monospace, monospace"; ctx.fillText(sub, bx + 11, by2 + 28);
    }
    ctx.globalAlpha = 1;
  }

  function easeAlphas() {
    var moving = false;
    nodes.forEach(function (n) { var d = n.ta - n.a; if (Math.abs(d) > 0.01) { n.a += d * 0.12; moving = true; } else n.a = n.ta; });
    return moving;
  }

  function shouldRun() { return onScreen && !document.hidden && !H.reduce; }
  function loop(t) {
    raf = 0;
    if (!shouldRun()) return;
    var idle = !drag && t - lastMove > 2500 && alpha <= 0.13;
    if (idle && t - last < 33) { raf = requestAnimationFrame(loop); return; } // ~30 i/s au repos
    last = t;
    step(t); easeAlphas();
    packets.forEach(function (p) { p.s += p.v * 16; if (p.s > 1) { p.s = 0; p.e = edges[Math.floor(Math.random() * edges.length)]; } });
    draw(t);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && shouldRun()) raf = requestAnimationFrame(loop); }
  function once() { // rendu ponctuel (mouvement réduit, ou boucle à l'arrêt)
    if (shouldRun()) { start(); return; }
    easeAlphas(); nodes.forEach(function (n) { n.a = n.ta; });
    requestAnimationFrame(function () { draw(performance.now()); });
  }

  function pick(x, y) {
    var best = null, bd = 1e9;
    nodes.forEach(function (n) {
      var d = Math.hypot(n.x + cx - x, n.y + cy - y), rr = (n.t === "p" ? n.r * scale + 9 : n.r * scale + 7);
      if (d < rr && d < bd) { bd = d; best = n; }
    });
    return best;
  }
  function pos(ev) { var r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  var down = null;
  canvas.addEventListener("pointermove", function (ev) {
    var q = pos(ev); mouse.x = q.x; mouse.y = q.y; mouse.in = true; lastMove = performance.now();
    if (drag) { drag.x = q.x - cx; drag.y = q.y - cy; drag.vx = drag.vy = 0; alpha = Math.max(alpha, 0.5); }
    else { hover = pick(q.x, q.y); canvas.style.cursor = hover ? "pointer" : ""; }
    if (!raf) once();
  });
  canvas.addEventListener("pointerleave", function () { mouse.in = false; if (!drag) hover = null; canvas.style.cursor = ""; if (!raf) once(); });
  canvas.addEventListener("pointerdown", function (ev) {
    var q = pos(ev), n = pick(q.x, q.y);
    if (!n) return;
    down = { n: n, x: q.x, y: q.y, moved: false };
    if (!H.reduce) { drag = n; try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* capture facultative */ } }
  });
  canvas.addEventListener("pointerup", function (ev) {
    var q = pos(ev);
    if (down && Math.hypot(q.x - down.x, q.y - down.y) < 6) {
      var n = down.n;
      if (n.t === "p") { if (H.focusProject) H.focusProject(n.id); }
      else H.setFilter(null, H.state.tech === n.id ? null : n.id);
    }
    down = null; drag = null; if (!raf) once();
  });
  canvas.addEventListener("pointercancel", function () { down = null; drag = null; hover = null; });

  H.on(function () { relevance(); if (!raf) { nodes.forEach(function (n) { if (H.reduce) n.a = n.ta; }); once(); } });
  H.graphReheat = function () { alpha = 1; start(); };

  function init() {
    resize();
    relevance(); nodes.forEach(function (n) { n.a = n.ta; });
    for (var i = 0; i < 420; i++) { alpha = Math.max(alpha, 0.12); step(i * 16); alpha = Math.max(0.12, alpha); } // pré-calcul : le graphe apparaît déjà posé
    alpha = H.reduce ? 0.12 : 0.5;
    draw(0); start();
  }
  window.addEventListener("resize", function () { var w = wrap.clientWidth; resize(); if (!raf) once(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  H.watch(wrap, function (on) { onScreen = on; if (on) start(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!raf) once(); });
  init();
})();
