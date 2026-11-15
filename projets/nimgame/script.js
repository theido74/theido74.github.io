/* Nim Game : partie jouable, variante XOR et laboratoire Q-learning (version simplifiée du dépôt). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var MAXS = 21;

  /* =====================  Agent Q-learning (réglages du dépôt)  ===================== */
  function makeAgent() {
    var q = {};
    for (var s = 1; s <= MAXS; s++) q[s] = s === 1 ? [0.5] : s === 2 ? [0.5, 0.5] : [0.33, 0.33, 0.34];
    return { q: q, eps: 0.3, games: 0, crit: false, recent: [], hist: [] };
  }
  function critMove(s) { return s % 4 === 0 ? 1 : s % 4; } /* « zone critique » du dépôt */
  function bestMove(a, s) {
    if (a.crit && (s <= 4 || s % 4 === 1)) return critMove(s);
    var v = a.q[s], bi = 0;
    for (var i = 1; i < v.length; i++) if (v[i] > v[bi]) bi = i;
    return bi + 1;
  }
  function randMove(s) { return 1 + Math.floor(Math.random() * Math.min(3, s)); }
  function trainOne(a) {
    var s = MAXS, turn = Math.random() < 0.5 ? 'opp' : 'agent', ch = [], winner = 'agent';
    while (s > 0) {
      if (turn === 'opp') { s -= randMove(s); if (s === 0) { winner = 'opp'; break; } turn = 'agent'; }
      else {
        var m = Math.random() < a.eps ? randMove(s) : bestMove(a, s);
        ch.push([s, m]); s -= m; if (s === 0) { winner = 'agent'; break; } turn = 'opp';
      }
    }
    var r = winner === 'agent' ? 1 : -1;
    for (var i = ch.length - 1; i >= 0; i--) {
      var st = ch[i][0], ac = ch[i][1] - 1, old = a.q[st][ac], nv = r;
      if (i < ch.length - 1) nv = r + 0.9 * Math.max.apply(null, a.q[ch[i + 1][0]]);
      a.q[st][ac] = 0.9 * old + 0.1 * nv;
    }
    a.eps = Math.max(0.05, a.eps * 0.995); a.games++;
    a.recent.push(r > 0 ? 1 : 0); if (a.recent.length > 100) a.recent.shift();
    return r > 0;
  }
  function precision(a) {
    var ok = 0, tot = 0;
    for (var s = 1; s <= MAXS; s++) if (s % 4 !== 0) { tot++; if (bestMove(a, s) === s % 4) ok++; }
    return ok / tot;
  }
  function winRate(a) { if (!a.recent.length) return 0; return a.recent.reduce(function (x, y) { return x + y; }, 0) / a.recent.length; }
  var agent = makeAgent();

  /* =====================  Partie à un tas  ===================== */
  var score = { you: 0, cpu: 0 };
  var mode = 'one', timer = 0;
  var one = { n: MAXS, turn: 'you', over: false };
  var stage = $('nim-stage-one'), ruler = $('nim-ruler'), msg = $('nim-msg'), why = $('nim-why');
  var oppSel = $('nim-opp'), firstSel = $('nim-first'), board = $('nim-board');
  var sticks = [], rulerCells = [];
  for (var i = 1; i <= MAXS; i++) {
    var d = document.createElement('div'); d.className = 'nim-stick'; d.style.setProperty('--r', (i % 2 ? 1 : -1) * (8 + (i * 7) % 14) + 'deg');
    stage.appendChild(d); sticks.push(d);
    var sp = document.createElement('span'); sp.className = i % 4 === 0 ? 'is-target' : ''; ruler.appendChild(sp); rulerCells.push(sp);
  }
  function say(text, cls) { msg.textContent = text; msg.className = 'nim-msg' + (cls ? ' ' + cls : ''); }
  function plural(k) { return k + (k > 1 ? ' allumettes' : ' allumette'); }
  function updateScore() { $('nim-score').textContent = 'Vous ' + score.you + ' · Ordinateur ' + score.cpu; }
  function renderOne() {
    sticks.forEach(function (s, i) { s.classList.toggle('is-gone', i >= one.n); s.classList.remove('is-pick', 'is-hint'); });
    rulerCells.forEach(function (c, i) {
      var k = i + 1; c.classList.toggle('is-now', k === one.n);
      c.textContent = (k === one.n || (k % 4 === 0 && Math.abs(k - one.n) > 1)) ? k : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-take]'), function (b) {
      b.disabled = one.over || one.turn !== 'you' || +b.getAttribute('data-take') > one.n;
    });
    if (!one.over) why.textContent = 'Il reste ' + plural(one.n) + '. ' + (one.n % 4 === 0 ? 'Multiple de 4 : celui qui doit jouer perd si l\'autre joue bien.' : 'Coup gagnant : en prendre ' + (one.n % 4) + '.');
  }
  function oppMoveOne() {
    var o = oppSel.value, n = one.n;
    if (o === 'random') return randMove(n);
    if (o === 'agent') return Math.min(bestMove(agent, n), n);
    return n % 4 === 0 ? 1 : n % 4;
  }
  function newOne() {
    clearTimeout(timer); one = { n: MAXS, turn: firstSel.value, over: false };
    say(one.turn === 'you' ? 'À vous de jouer.' : 'L\'ordinateur commence.'); renderOne();
    if (one.turn === 'cpu') timer = setTimeout(cpuOne, 800);
  }
  function finish(winner) {
    one.over = true; if (winner === 'you') score.you++; else score.cpu++; updateScore(); renderOne();
    say(winner === 'you' ? 'Vous prenez la dernière allumette : vous gagnez.' : 'L\'ordinateur prend la dernière allumette : il gagne.', winner === 'you' ? 'is-win' : 'is-lose');
    why.textContent = winner === 'you' ? 'Bien joué. Essayez de le laisser commencer, ou changez d\'adversaire.' : 'Astuce : laissez toujours un multiple de 4 (4, 8, 12, 16, 20).';
  }
  function takeOne(k) {
    if (one.over || one.turn !== 'you' || k > one.n) return;
    one.n -= k; say('Vous prenez ' + plural(k) + '.');
    if (one.n === 0) { finish('you'); return; }
    one.turn = 'cpu'; renderOne(); timer = setTimeout(cpuOne, reduce ? 300 : 800);
  }
  function cpuOne() {
    var m = oppMoveOne(); one.n -= m; say('L\'ordinateur prend ' + plural(m) + '.');
    if (one.n === 0) { finish('cpu'); return; }
    one.turn = 'you'; renderOne();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-take]'), function (b) {
    var k = +b.getAttribute('data-take');
    b.addEventListener('click', function () { takeOne(k); });
    function prev(on) { sticks.forEach(function (s, i) { s.classList.toggle('is-pick', on && i < one.n && i >= one.n - k); }); }
    b.addEventListener('mouseenter', function () { if (!b.disabled) prev(true); }); b.addEventListener('mouseleave', function () { prev(false); });
    b.addEventListener('focus', function () { if (!b.disabled) prev(true); }); b.addEventListener('blur', function () { prev(false); });
  });
  board.addEventListener('keydown', function (e) {
    if (mode !== 'one' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target.tagName; if (t === 'SELECT' || t === 'INPUT') return;
    if (e.key >= '1' && e.key <= '3') { e.preventDefault(); takeOne(+e.key); }
  });

  /* =====================  Variante à trois tas (XOR)  ===================== */
  var START = [3, 4, 5], piles = START.slice(), xo = { turn: 'you', over: false };
  var rowsEl = $('nim-rows'), binBody = $('nim-bin').querySelector('tbody'), rowBtns = [];
  START.forEach(function (len, r) {
    var row = document.createElement('div'); row.className = 'nim-row';
    var lab = document.createElement('span'); lab.className = 'nim-row-label'; lab.textContent = 'Rangée ' + (r + 1); row.appendChild(lab);
    var box = document.createElement('div'); box.className = 'nim-row-sticks'; row.appendChild(box);
    rowBtns[r] = [];
    for (var i = 0; i < len; i++) (function (r, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nim-rowstick';
      b.addEventListener('click', function () { takeXor(r, i); });
      function prev(on) { rowBtns[r].forEach(function (x, j) { x.classList.toggle('is-pick', on && j >= i && j < piles[r]); }); }
      b.addEventListener('mouseenter', function () { prev(true); }); b.addEventListener('mouseleave', function () { prev(false); });
      b.addEventListener('focus', function () { prev(true); }); b.addEventListener('blur', function () { prev(false); });
      box.appendChild(b); rowBtns[r].push(b);
    })(r, i);
    rowsEl.appendChild(row);
  });
  function nimSum(p) { return p.reduce(function (a, b) { return a ^ b; }, 0); }
  function renderXor() {
    rowBtns.forEach(function (bs, r) {
      bs.forEach(function (b, i) {
        var gone = i >= piles[r]; b.classList.toggle('is-gone', gone); b.classList.remove('is-pick', 'is-hint');
        b.tabIndex = gone ? -1 : 0;
        b.setAttribute('aria-label', gone ? 'Allumette retirée' : 'Rangée ' + (r + 1) + ' : prendre ' + plural(piles[r] - i));
        b.setAttribute('aria-disabled', String(xo.over || xo.turn !== 'you' || gone));
      });
    });
    var x = nimSum(piles), html = '';
    piles.forEach(function (p, r) {
      html += '<tr><td>' + (r + 1) + '</td><td>' + p + '</td>';
      [4, 2, 1].forEach(function (bit) { html += '<td class="' + (p & bit ? 'on' : '') + '">' + (p & bit ? 1 : 0) + '</td>'; });
      html += '</tr>';
    });
    html += '<tr class="xor' + (x === 0 ? ' zero' : '') + '"><td>XOR</td><td>' + x + '</td>';
    [4, 2, 1].forEach(function (bit) { html += '<td class="' + (x & bit ? 'on' : '') + '">' + (x & bit ? 1 : 0) + '</td>'; });
    binBody.innerHTML = html + '</tr>';
    if (!xo.over) why.textContent = x === 0 ? 'XOR = 0 : position perdante pour celui qui doit jouer, si l\'autre joue bien.' : 'XOR = ' + x + ' : position gagnante, un coup ramène le XOR à 0.';
  }
  function xorBest() {
    var x = nimSum(piles);
    if (x === 0) { var big = piles.indexOf(Math.max.apply(null, piles)); return { r: big, to: piles[big] - 1, losing: true }; }
    for (var r = 0; r < piles.length; r++) if ((piles[r] ^ x) < piles[r]) return { r: r, to: piles[r] ^ x };
  }
  function newXor() {
    clearTimeout(timer); piles = START.slice(); xo = { turn: firstSel.value, over: false };
    say(xo.turn === 'you' ? 'À vous de jouer.' : 'L\'ordinateur commence.'); renderXor();
    if (xo.turn === 'cpu') timer = setTimeout(cpuXor, 800);
  }
  function finishXor(winner) {
    xo.over = true; if (winner === 'you') score.you++; else score.cpu++; updateScore(); renderXor();
    say(winner === 'you' ? 'Vous prenez la dernière allumette : vous gagnez.' : 'L\'ordinateur prend la dernière allumette : il gagne.', winner === 'you' ? 'is-win' : 'is-lose');
    why.textContent = winner === 'you' ? 'Bien joué : vous avez gardé le XOR à 0 au bon moment.' : 'Astuce : après votre coup, le XOR des trois tas doit valoir 0.';
  }
  function takeXor(r, i) {
    if (xo.over || xo.turn !== 'you' || i >= piles[r]) return;
    var k = piles[r] - i; piles[r] = i; say('Vous prenez ' + plural(k) + ' dans la rangée ' + (r + 1) + '.');
    if (nimSum(piles) === 0 && piles.every(function (p) { return p === 0; })) { finishXor('you'); return; }
    xo.turn = 'cpu'; renderXor(); timer = setTimeout(cpuXor, reduce ? 300 : 800);
  }
  function cpuXor() {
    var mv;
    if (oppSel.value === 'random') { var live = []; piles.forEach(function (p, r) { if (p > 0) live.push(r); }); var rr = live[Math.floor(Math.random() * live.length)]; mv = { r: rr, to: Math.floor(Math.random() * piles[rr]) }; }
    else mv = xorBest();
    var k = piles[mv.r] - mv.to; piles[mv.r] = mv.to;
    say('L\'ordinateur prend ' + plural(k) + ' dans la rangée ' + (mv.r + 1) + '.');
    if (piles.every(function (p) { return p === 0; })) { finishXor('cpu'); return; }
    xo.turn = 'you'; renderXor();
  }

  /* =====================  Onglets et commandes communes  ===================== */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.nim-tabs [role=tab]'));
  function setMode(m, focus) {
    mode = m; clearTimeout(timer);
    tabs.forEach(function (t) { var on = t.getAttribute('data-mode') === m; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $('panel-one').hidden = m !== 'one'; $('panel-xor').hidden = m !== 'xor';
    var ag = oppSel.querySelector('option[value=agent]'); ag.disabled = m === 'xor';
    if (m === 'xor' && oppSel.value === 'agent') oppSel.value = 'optimal';
    if (m === 'one') newOne(); else newXor();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setMode(t.getAttribute('data-mode')); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = tabs[(i + 1) % tabs.length]; setMode(n.getAttribute('data-mode'), true); }
    });
  });
  $('nim-new').addEventListener('click', function () { if (mode === 'one') newOne(); else newXor(); });
  firstSel.addEventListener('change', function () { if (mode === 'one') newOne(); else newXor(); });
  oppSel.addEventListener('change', function () { if (mode === 'one') newOne(); else newXor(); });
  $('nim-hint').addEventListener('click', function () {
    if (mode === 'one') {
      if (one.over || one.turn !== 'you') return;
      var m = one.n % 4 === 0 ? 1 : one.n % 4;
      sticks.forEach(function (s, i) { s.classList.toggle('is-hint', i < one.n && i >= one.n - m); });
      why.textContent = one.n % 4 === 0 ? 'Aucun coup gagnant : prenez 1 et espérez une erreur.' : 'Prenez ' + plural(m) + ' pour laisser ' + (one.n - m) + ', un multiple de 4.';
    } else {
      if (xo.over || xo.turn !== 'you') return;
      var b = xorBest();
      rowBtns[b.r].forEach(function (x, j) { x.classList.toggle('is-hint', j >= b.to && j < piles[b.r]); });
      why.textContent = b.losing ? 'XOR = 0 : aucun coup gagnant. Retirez une allumette et espérez une erreur.' : 'Rangée ' + (b.r + 1) + ' : ramenez-la à ' + b.to + ' pour que le XOR retombe à 0.';
    }
  });

  /* =====================  Laboratoire : graphique et carte des valeurs  ===================== */
  var chart = $('lab-chart'), cc = chart.getContext('2d'), heat = $('lab-heat'), hc = heat.getContext('2d');
  var CH = { yellow: '#f6d96b', green: '#8fe3a8', blue: '#8ad3f0', dim: '#c4cfc7' };
  var FONT = '14px "DejaVu Sans Mono", ui-monospace, monospace';
  function drawChart() {
    var W = 640, H = 320, L = 46, R = 14, T = 16, B = 38, pw = W - L - R, ph = H - T - B;
    cc.clearRect(0, 0, W, H); cc.font = FONT; cc.lineWidth = 1;
    var xmax = Math.max(3000, agent.games);
    function X(g) { return L + g / xmax * pw; } function Y(v) { return T + (1 - v) * ph; }
    cc.strokeStyle = '#ffffff22'; cc.fillStyle = CH.dim; cc.textAlign = 'right'; cc.textBaseline = 'middle';
    [0, .25, .5, .75, 1].forEach(function (v) { cc.beginPath(); cc.moveTo(L, Y(v)); cc.lineTo(W - R, Y(v)); cc.stroke(); cc.fillText(Math.round(v * 100) + ' %', L - 6, Y(v)); });
    cc.textAlign = 'center'; cc.textBaseline = 'top';
    for (var k = 0; k <= 3; k++) { cc.textAlign = k === 3 ? 'right' : k === 0 ? 'left' : 'center'; cc.fillText(Math.round(xmax * k / 3), X(xmax * k / 3), H - B + 8); }
    cc.textAlign = 'center';
    cc.fillText('parties jouées', L + pw / 2, H - 18);
    function line(key, col) {
      cc.strokeStyle = col; cc.lineWidth = 3; cc.lineJoin = 'round'; cc.beginPath();
      var pts = agent.hist; if (!pts.length) return;
      pts.forEach(function (p, i) { var x = X(p.g), y = Y(p[key]); if (i) cc.lineTo(x, y); else cc.moveTo(x, y); });
      cc.stroke();
    }
    line('eps', CH.blue); line('prec', CH.green); line('win', CH.yellow);
    if (!agent.hist.length) { cc.fillStyle = CH.dim; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText('Lancez l\'entraînement pour tracer les courbes', L + pw / 2, T + ph / 2); }
  }
  function lerpColor(v) { /* −1 rouge, 0 sombre, +1 vert */
    var a = Math.max(-1, Math.min(1, v)), t = Math.abs(a), base = [22, 40, 34], tgt = a >= 0 ? [60, 180, 110] : [200, 70, 60];
    return 'rgb(' + base.map(function (b, i) { return Math.round(b + (tgt[i] - b) * Math.min(1, t * 1.3)); }).join(',') + ')';
  }
  function drawHeat() {
    var W = 640, H = 190, L = 34, T = 22, cw = (W - L - 6) / MAXS, ch = 44;
    hc.clearRect(0, 0, W, H); hc.font = '11px "DejaVu Sans Mono", ui-monospace, monospace'; hc.textAlign = 'center'; hc.textBaseline = 'middle';
    for (var s = 1; s <= MAXS; s++) {
      hc.fillStyle = s % 4 === 0 ? CH.dim : '#ffffff99'; hc.fillText(s, L + (s - .5) * cw, 10);
      for (var m = 1; m <= 3; m++) {
        var x = L + (s - 1) * cw, y = T + (m - 1) * (ch + 4);
        if (m > s) { hc.fillStyle = '#ffffff0d'; hc.fillRect(x + 1, y, cw - 2, ch); continue; }
        var v = agent.q[s][m - 1]; hc.fillStyle = lerpColor(v); hc.fillRect(x + 1, y, cw - 2, ch);
        hc.fillStyle = '#fff'; hc.fillText(v.toFixed(1).replace('-0.0', '0.0'), x + cw / 2, y + ch / 2);
        if (s % 4 !== 0 && m === s % 4) { hc.strokeStyle = CH.yellow; hc.lineWidth = 2; hc.strokeRect(x + 2, y + 1, cw - 4, ch - 2); }
      }
    }
    hc.fillStyle = CH.dim; hc.textAlign = 'right';
    [1, 2, 3].forEach(function (m) { hc.fillText('×' + m, L - 6, T + (m - 1) * (ch + 4) + ch / 2); });
  }
  function updateStats() {
    $('st-games').textContent = agent.games.toLocaleString('fr-FR');
    $('st-win').textContent = agent.recent.length ? Math.round(winRate(agent) * 100) + ' %' : '–';
    $('st-prec').textContent = agent.games ? Math.round(precision(agent) * 100) + ' %' : '–';
    $('st-eps').textContent = Math.round(agent.eps * 100) + ' %';
  }
  function sample() { agent.hist.push({ g: agent.games, win: winRate(agent), prec: precision(agent), eps: agent.eps }); }
  function paintLab() { drawChart(); drawHeat(); updateStats(); }
  var run = { left: 0, raf: 0 }, runBtn = $('lab-run');
  function step() {
    var n = Math.min(40, run.left);
    for (var i = 0; i < n; i++) { trainOne(agent); if (agent.games % 20 === 0) sample(); }
    run.left -= n; paintLab();
    if (run.left > 0 && !document.hidden) run.raf = requestAnimationFrame(step); else { run.raf = 0; if (run.left <= 0) { runBtn.disabled = false; runBtn.textContent = 'Entraîner 3 000 parties de plus'; } }
  }
  runBtn.addEventListener('click', function () {
    if (run.raf) return; run.left = 3000; runBtn.disabled = true;
    if (reduce) { while (run.left > 0) { trainOne(agent); run.left--; if (agent.games % 20 === 0) sample(); } runBtn.disabled = false; runBtn.textContent = 'Entraîner 3 000 parties de plus'; paintLab(); }
    else run.raf = requestAnimationFrame(step);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && run.left > 0 && !run.raf) run.raf = requestAnimationFrame(step); });
  $('lab-reset').addEventListener('click', function () {
    cancelAnimationFrame(run.raf); run.raf = 0; run.left = 0; var c = agent.crit; agent = makeAgent(); agent.crit = c;
    runBtn.disabled = false; runBtn.textContent = 'Entraîner 3 000 parties'; paintLab();
  });
  $('lab-crit').addEventListener('change', function (e) { agent.crit = e.target.checked; paintLab(); });

  /* Démarrage */
  updateScore(); renderXor(); renderOne(); paintLab();
  window.__nim = { agent: function () { return agent; }, train: function (n) { for (var i = 0; i < n; i++) trainOne(agent); sample(); paintLab(); return [agent.games, winRate(agent), precision(agent)]; }, state: function () { return { one: one, piles: piles, xo: xo }; } };
})();
