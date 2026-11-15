/* Password Analyzer : démonstration locale. Aucun réseau, aucun stockage (ni cookie, ni localStorage). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Liste de démonstration (PAS rockyou) ---------- */
  var DICT = ('password 123456 12345678 123456789 1234567890 qwerty azerty abc123 letmein monkey dragon iloveyou admin welcome login princess ' +
    'sunshine football master shadow superman michael batman trustno1 passw0rd p@ssw0rd password1 motdepasse soleil bonjour marseille doudou ' +
    'chocolat 111111 000000 1q2w3e4r qwertyuiop azertyuiop minecraft pokemon starwars whatever freedom hello secret mustang harley ranger ' +
    'jordan hunter buster soccer tigger summer flower jessica cheese computer internet killer pepper ginger joshua matrix baseball ' +
    'access hockey liverpool charlie donald lovely nicole daniel maggie thomas azerty123 test test123 root toor guest changeme').split(' ');
  var DICTSET = {}; DICT.forEach(function (w) { DICTSET[w] = 1; });

  /* ---------- SHA-1 en JavaScript pur (pour montrer le k-anonymat sans rien envoyer) ---------- */
  function rol(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }
  function sha1(msg) {
    var b = new TextEncoder().encode(msg), l = b.length, n = ((l + 9 + 63) >> 6) << 6;
    var buf = new Uint8Array(n); buf.set(b); buf[l] = 0x80;
    var dv = new DataView(buf.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296));
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0, w = new Uint32Array(80);
    for (var o = 0; o < n; o += 64) {
      var i; for (i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
      var a = h0, bb = h1, c = h2, d = h3, e = h4;
      for (i = 0; i < 80; i++) {
        var f, k;
        if (i < 20) { f = (bb & c) | (~bb & d); k = 0x5A827999; } else if (i < 40) { f = bb ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (bb & c) | (bb & d) | (c & d); k = 0x8F1BBCDC; } else { f = bb ^ c ^ d; k = 0xCA62C1D6; }
        var t = (rol(a, 5) + f + e + k + w[i]) >>> 0; e = d; d = c; c = rol(bb, 30); bb = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + bb) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return [h0, h1, h2, h3, h4].map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('').toUpperCase();
  }
  var LEAK = {}; /* préfixe -> { suffixe: 1 } */
  DICT.forEach(function (w) { var h = sha1(w); (LEAK[h.slice(0, 5)] = LEAK[h.slice(0, 5)] || {})[h.slice(5)] = 1; });

  /* ---------- Analyse (mêmes règles que password_checker.py et dic_attack.py) ---------- */
  function analyse(pw) {
    var len = Array.from(pw).length;
    var lower = /[a-z]/.test(pw), upper = /[A-Z]/.test(pw), digit = /[0-9]/.test(pw), special = /[^\p{L}\p{N}_]/u.test(pw);
    var symbols = (lower ? 26 : 0) + (upper ? 26 : 0) + (digit ? 10 : 0) + (special ? 32 : 0);
    var H = symbols ? len * Math.log2(symbols) : 0;
    var common = !(/password|123|admin|qwerty/i.test(pw) || /^\p{N}+$/u.test(pw));
    var flags = { length: len >= 12, lower: lower, upper: upper, digit: digit, special: special, common: common };
    var score = 0; for (var k in flags) if (flags[k]) score++;
    var year = String(new Date().getFullYear());
    var sub = function (s, m) { return s.replace(/./g, function (ch) { return m[ch] || ch; }); };
    var variants = [
      ['tel quel', pw], ['en minuscules', pw.toLowerCase()], ['+ 123', pw + '123'], ['+ !', pw + '!'], ['+ _', pw + '_'], ['+ ' + year, pw + year],
      ['a→@ s→$ o→0', sub(pw, { a: '@', s: '$', o: '0' })], ['e→3 i→1 l→1', sub(pw, { e: '3', i: '1', l: '1' })]
    ].map(function (v) { return { label: v[0], text: v[1], hit: Object.prototype.hasOwnProperty.call(DICTSET, v[1]) }; });
    var dictHit = variants.some(function (v) { return v.hit; });
    var h = sha1(pw), pre = h.slice(0, 5), suf = h.slice(5);
    var leakHit = !!(LEAK[pre] && LEAK[pre][suf]);
    return { len: len, flags: flags, symbols: symbols, H: H, score: score, variants: variants, dictHit: dictHit, pre: pre, suf: suf, leakHit: leakHit, alpha: { lower: lower, upper: upper, digit: digit, special: special } };
  }

  /* ---------- Mise en forme ---------- */
  function fr(n, d) { return n.toLocaleString('fr-FR', { maximumFractionDigits: d || 0 }); }
  function crackText(a) {
    if (a.dictHit || a.leakHit) return 'Présent dans la liste de démonstration : un attaquant le trouve en quelques essais, quelle que soit sa longueur.';
    var lg = (a.H - 1) * Math.log10(2) - 10, s;
    if (lg < 0) s = 'moins d\'une seconde';
    else if (lg > 19) s = 'plus que l\'âge de l\'univers';
    else {
      var sec = Math.pow(10, lg), yr = 31557600;
      if (sec < 60) s = fr(sec) + ' secondes'; else if (sec < 3600) s = fr(sec / 60) + ' minutes'; else if (sec < 86400) s = fr(sec / 3600) + ' heures';
      else if (sec < yr) s = fr(sec / 86400) + ' jours'; else if (sec < yr * 1e3) s = fr(sec / yr) + ' ans'; else if (sec < yr * 1e6) s = fr(sec / yr / 1e3) + ' milliers d\'années';
      else if (sec < yr * 1e9) s = fr(sec / yr / 1e6) + ' millions d\'années'; else if (sec < yr * 1.38e10) s = fr(sec / yr / 1e9, 1) + ' milliards d\'années'; else s = 'plus que l\'âge de l\'univers';
    }
    return 'Temps pour deviner (à 10 milliards d\'essais par seconde) : ' + s + '. Estimation simplifiée, valable si le mot de passe est tiré au hasard.';
  }
  function verdictOf(a) {
    if (a.dictHit || a.leakHit) return ['À changer : devinable', 'is-bad', '#ff6676'];
    if (a.score === 6 && a.H >= 100) return ['Très solide', 'is-top', '#5fd4ff'];
    if (a.score >= 5 && a.H >= 60) return ['Solide', 'is-ok', '#5dffa8'];
    if (a.score >= 3 && a.H >= 36) return ['Moyen', 'is-mid', '#ffb347'];
    return ['Faible', 'is-bad', '#ff6676'];
  }
  function insightOf(a) {
    if (a.dictHit && a.H >= 40) return 'Remarquez le décalage : l\'entropie affiche ' + fr(a.H) + ' bits, mais une variante figure dans la liste. La formule suppose des caractères au hasard ; un attaquant, lui, essaie d\'abord les mots connus.';
    if (a.dictHit) return 'Une variante de votre saisie figure dans la liste de démonstration : c\'est le cas typique que le test dictionnaire détecte.';
    if (a.leakHit) return 'L\'empreinte est dans la liste de fuites simulée : un vrai service de fuites la signalerait de la même façon.';
    if (a.len >= 20) return 'Une phrase longue bat un mot court et compliqué : chaque caractère de plus multiplie le travail de l\'attaquant.';
    if (!a.flags.length && a.H >= 50) return 'Beaucoup de variété, mais moins de 12 caractères : le test de longueur échoue. Ajoutez quelques caractères plutôt que des symboles.';
    if (!a.flags.common) return 'Un motif courant (password, 123, admin, qwerty ou que des chiffres) fait perdre un point, même si les bits semblent nombreux.';
    return 'Chaque caractère ajouté multiplie par la taille de l\'alphabet le nombre d\'essais nécessaires. La longueur compte plus que les astuces.';
  }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  /* ---------- Rendu ---------- */
  var input = $('pwa-input'), shown = false, shownNum = 0, numTarget = 0, numRaf = 0, announceT = 0;
  function tweenNum() {
    cancelAnimationFrame(numRaf);
    if (reduce) { shownNum = numTarget; $('pwa-g-num').textContent = fr(shownNum); return; }
    var from = shownNum, t0 = performance.now();
    (function step(ts) {
      var p = Math.min(1, (ts - t0) / 600), e = 1 - Math.pow(1 - p, 3);
      shownNum = from + (numTarget - from) * e; $('pwa-g-num').textContent = fr(shownNum);
      if (p < 1) numRaf = requestAnimationFrame(step);
    })(t0);
  }
  function render() {
    var pw = input.value, empty = pw.length === 0;
    var a = empty ? null : analyse(pw);
    var fill = $('pwa-g-fill'), ver = $('pwa-verdict');
    /* Tests et alphabet */
    Array.prototype.forEach.call(document.querySelectorAll('#pwa-tests li'), function (li) {
      var k = li.getAttribute('data-k'), ok = !empty && a.flags[k === 'common' ? 'common' : k];
      li.classList.toggle('is-pass', !empty && ok); li.classList.toggle('is-fail', !empty && !ok);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#pwa-alpha li'), function (li) { li.classList.toggle('is-on', !empty && a.alpha[li.getAttribute('data-a')]); });
    if (empty) {
      fill.style.strokeDashoffset = 100; ver.textContent = 'En attente d\'un mot de passe'; ver.className = 'pwa-verdict';
      numTarget = 0; tweenNum(); $('pwa-score').textContent = '0'; $('pwa-crack').textContent = '';
      $('pwa-formula').textContent = '0 × log₂(0) = 0 bits';
      $('pwa-console').innerHTML = '<span class="dim">$ python3 main.py</span>\nEntrez le mot de passe à analyser: <span class="dim">(en attente de saisie)</span>';
      $('pwa-insight').textContent = 'Tapez un mot de passe ou choisissez un exemple : les tests réagissent à chaque caractère.';
      $('pwa-h-pre').textContent = '·····'; $('pwa-h-suf').textContent = '·································'; $('pwa-leak').textContent = 'Aucune saisie.'; $('pwa-leak').className = 'pwa-leak';
      fillVariants(null); return;
    }
    var v = verdictOf(a);
    fill.style.strokeDashoffset = 100 - Math.min(a.H, 128) / 128 * 100; fill.style.stroke = v[2];
    ver.textContent = v[0]; ver.className = 'pwa-verdict ' + v[1];
    numTarget = a.H; tweenNum();
    $('pwa-score').textContent = a.score; $('pwa-crack').textContent = crackText(a);
    $('pwa-formula').textContent = a.len + ' × log₂(' + a.symbols + ') = ' + fr(a.H, 1) + ' bits';
    $('pwa-insight').textContent = insightOf(a);
    /* Console au format du script */
    var ok = '<span class="ok">✔</span>', ko = '<span class="ko">✘</span>';
    var out = '<span class="dim">$ python3 main.py</span>\nEntrez le mot de passe à analyser: <span class="dim">' + esc('●'.repeat(Math.min(a.len, 40))) + '</span>\n\n' +
      '<span class="h">=== Analyse Basique ===</span>\n' +
      'Longueur: ' + (a.flags.length ? ok : ko) + ' (' + a.len + ' caractères)\n' +
      'Complexité: Entropie = ' + a.H.toFixed(1) + ' bits\n' +
      'Score: ' + a.score + '/6\n\n' +
      '<span class="h">=== Test Dictionnaire ===</span> <span class="dim">(liste de démonstration)</span>\n' +
      (a.dictHit ? ko + ' <span class="ko">Vulnérable aux attaques par dictionnaire (variantes courantes)</span>' : ok + ' <span class="ok">Résistant aux variantes courantes</span>') + '\n\n' +
      '<span class="h">=== Base de Données Compromis ===</span> <span class="wn">(simulation locale)</span>\n' +
      (a.leakHit ? ko + ' <span class="ko">MOT DE PASSE COMPROMIS (trouvé dans des fuites de données)</span>' : ok + ' <span class="ok">Non trouvé dans les bases de données connues</span>');
    $('pwa-console').innerHTML = out;
    /* Hash et fuite simulée */
    $('pwa-h-pre').textContent = a.pre; $('pwa-h-suf').textContent = a.suf;
    var lk = $('pwa-leak');
    lk.textContent = a.leakHit ? 'Suffixe retrouvé dans la liste de démonstration : fuite simulée.' : 'Préfixe ' + a.pre + ' : seul ce préfixe serait envoyé. Suffixe absent de la liste de démonstration.';
    lk.className = 'pwa-leak ' + (a.leakHit ? 'bad' : 'good');
    fillVariants(a);
    /* Annonce différée pour lecteurs d'écran */
    clearTimeout(announceT); announceT = setTimeout(function () { $('pwa-status').textContent = v[0] + '. Score ' + a.score + ' sur 6. Entropie ' + fr(a.H) + ' bits.'; }, 800);
  }
  function fillVariants(a) {
    var rows = '';
    for (var i = 0; i < 8; i++) {
      var label = a ? a.variants[i].label : ['tel quel', 'en minuscules', '+ 123', '+ !', '+ _', '+ année', 'a→@ s→$ o→0', 'e→3 i→1 l→1'][i];
      var txt = a ? (shown ? esc(a.variants[i].text) : '●'.repeat(Math.min(Array.from(a.variants[i].text).length, 24))) : '·';
      var res = a ? (a.variants[i].hit ? '<span class="y">oui : trouvé</span>' : '<span class="n">non</span>') : '–';
      rows += '<tr' + (a && a.variants[i].hit ? ' class="hit"' : '') + '><td>' + esc(label) + '</td><td>' + txt + '</td><td>' + res + '</td></tr>';
    }
    document.querySelector('#pwa-variants tbody').innerHTML = rows;
  }

  /* ---------- Interactions ---------- */
  var demoTimer = 0, demoActive = false;
  function stopDemo(clear) { demoActive = false; cancelAnimationFrame(demoTimer); if (clear && input.dataset.demo) { input.value = ''; render(); } delete input.dataset.demo; }
  input.addEventListener('input', function () { stopDemo(false); render(); });
  input.addEventListener('focus', function () { if (input.dataset.demo) stopDemo(true); });
  $('pwa-eye').addEventListener('click', function () {
    shown = !shown; input.type = shown ? 'text' : 'password'; this.textContent = shown ? 'Masquer' : 'Afficher'; this.setAttribute('aria-pressed', String(shown)); render();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-ex]'), function (b) {
    b.addEventListener('click', function () { stopDemo(false); input.value = b.getAttribute('data-ex'); render(); });
  });

  /* Démonstration de saisie automatique (désactivée en mouvement réduit) */
  (function () {
    if (reduce) return;
    var text = 'p@ssw0rd', i = 0, last = 0, started = false;
    function step(ts) {
      if (!demoActive) return;
      if (!last) last = ts;
      if (ts - last > 170) { last = ts; i++; input.value = text.slice(0, i); render(); }
      if (i < text.length) demoTimer = requestAnimationFrame(step); else demoActive = false;
    }
    function begin() {
      if (started || input.value || document.hidden) return; started = true; demoActive = true; input.dataset.demo = '1';
      setTimeout(function () { if (demoActive) demoTimer = requestAnimationFrame(step); }, 900);
    }
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { begin(); io.disconnect(); } }); io.observe(input); } else begin();
  })();

  /* ---------- Pluie de caractères (décor) ---------- */
  (function () {
    var cv = document.querySelector('.pwa-rain'); if (!cv) return;
    var c = cv.getContext('2d'), w, h, cols, drops, vis = true, raf = 0, last = 0, size = 16;
    var chars = '0123456789abcdef$#@!%&*+=?';
    function setup() { w = cv.width = cv.clientWidth; h = cv.height = cv.clientHeight; cols = Math.ceil(w / size); drops = []; for (var i = 0; i < cols; i++) drops[i] = Math.random() * h / size; c.fillStyle = '#060b12'; c.fillRect(0, 0, w, h); }
    function draw() {
      c.fillStyle = 'rgba(6,11,18,.14)'; c.fillRect(0, 0, w, h); c.font = size + 'px monospace'; c.fillStyle = '#5dffa8';
      for (var i = 0; i < cols; i++) {
        c.fillText(chars.charAt(Math.floor(Math.random() * chars.length)), i * size, drops[i] * size);
        if (drops[i] * size > h && Math.random() > .975) drops[i] = 0; drops[i] += 1;
      }
    }
    setup();
    if (reduce) { for (var k = 0; k < 60; k++) draw(); return; }
    function tick(ts) { if (ts - last > 55) { last = ts; draw(); } raf = requestAnimationFrame(tick); }
    function sync() { var run = vis && !document.hidden; if (run && !raf) raf = requestAnimationFrame(tick); else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; sync(); }).observe(cv);
    document.addEventListener('visibilitychange', sync); window.addEventListener('resize', setup); sync();
  })();

  render();
  window.__pwa = { analyse: analyse, sha1: sha1 };
})();
