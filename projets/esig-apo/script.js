/* Aventure textuelle Java : reconstitution du déroulement (console + pile d'appels). Aucune donnée n'est envoyée ni stockée. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var con = $('apo-console'), input = $('apo-input'), enter = $('apo-enter'), prompt = $('apo-prompt'), form = $('apo-form');
  var chipsEl = $('apo-chips'), stackEl = $('apo-stack'), pname = $('apo-pname'), sr = $('apo-sr'), win = $('apo-win');

  /* Scènes écrites pour cette démo (pas celles du devoir) */
  var SCENES = [
    { titre: 'Chapitre 1 : Le build rouge', text: 'Il est 23 h 40. Le pipeline est rouge, la démo a lieu demain et le café est froid. Vous ouvrez le terminal.' },
    { titre: 'Chapitre 2 : La ligne mystérieuse', text: 'Dans les logs, une seule ligne se répète : « NullPointerException ». Toujours au même endroit, toujours après le deuxième chapitre.' },
    { titre: 'Chapitre 3 : Le piège de la liste', text: 'Vous tenez le coupable : une méthode récursive a vidé la liste qu\'on lui avait confiée. Il suffisait de lui en passer une copie.' },
    { titre: 'Épilogue : Le matin', text: 'Le jour se lève sur votre bureau. Le pipeline a fini de tourner, et la démo approche.' }
  ];
  var W = 60;
  function measure() { /* largeur de la console en caractères, pour que les cadres ne se coupent pas */
    var probe = document.createElement('span'); probe.textContent = '0000000000'; probe.style.cssText = 'visibility:hidden;position:absolute;white-space:pre';
    con.appendChild(probe); var cw = probe.getBoundingClientRect().width / 10 || 9; con.removeChild(probe);
    W = Math.max(29, Math.min(60, Math.floor((con.clientWidth - 36) / cw)));
  }
  function banner() {
    var t = 'BIENVENUE DANS L\'AVENTURE', pad = Math.floor((W - 2 - t.length) / 2), blank = '*' + ' '.repeat(W - 2) + '*';
    return '*'.repeat(W) + '\n' + blank + '\n*' + ' '.repeat(pad) + t + ' '.repeat(W - 2 - pad - t.length) + '*\n' + blank + '\n' + '*'.repeat(W) + '\n';
  }

  /* ---------- File d'affichage : texte frappé, pauses, actions ---------- */
  var inTick = false, interacted = false, queue = [], cur = null, shown = 0, waitUntil = 0, raf = 0, last = 0, onIdle = null;
  function say(s, cls) { queue.push({ k: 't', s: s, c: cls }); kick(); }
  function pause(ms) { queue.push({ k: 'w', ms: reduce ? 0 : ms }); kick(); }
  function act(f) { queue.push({ k: 'f', f: f }); kick(); }
  function kick() { if (!raf && !inTick) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function append(item, text) {
    if (!item.el) { item.el = document.createElement('span'); if (item.c) item.el.className = item.c; con.appendChild(item.el); }
    item.el.textContent = text; con.scrollTop = con.scrollHeight;
  }
  function tick(ts) {
    var dt = ts - last; last = ts; raf = 0; inTick = true;
    for (var guard = 0; guard < 400; guard++) {
      if (!cur) { cur = queue.shift(); shown = 0; if (!cur) break; if (cur.k === 'w') waitUntil = ts + cur.ms; }
      if (cur.k === 'f') { var f = cur.f; cur = null; f(); continue; }
      if (cur.k === 'w') { if (ts >= waitUntil) { cur = null; continue; } break; }
      if (reduce || skipping) { append(cur, cur.s); announce(cur); cur = null; continue; }
      shown = Math.min(cur.s.length, shown + Math.max(1, Math.round(dt * 0.9))); append(cur, cur.s.slice(0, shown));
      if (shown >= cur.s.length) { announce(cur); cur = null; dt = 0; continue; }
      break;
    }
    inTick = false;
    if (cur || queue.length) raf = requestAnimationFrame(tick);
    else { skipping = false; if (onIdle) { var o = onIdle; onIdle = null; o(); } }
  }
  var skipping = false;
  function announce(item) { if (item.c === 't' || item.c === 'win' || item.c === 'lose') sr.textContent = item.s.replace(/\s+/g, ' ').trim(); }

  /* ---------- Panneau JVM ---------- */
  function chipsReset() { chipsEl.innerHTML = ''; SCENES.forEach(function (s) { var li = document.createElement('li'); li.textContent = s.titre.split(' :')[0]; chipsEl.appendChild(li); }); }
  function pushFrame(text, cls) {
    var empty = stackEl.querySelector('.apo-empty'); if (empty) empty.remove();
    Array.prototype.forEach.call(stackEl.querySelectorAll('.is-top'), function (x) { x.classList.remove('is-top'); });
    var li = document.createElement('li'); li.textContent = text; li.className = cls || 'is-top'; stackEl.appendChild(li); return li;
  }
  function popFrame() {
    var li = stackEl.lastElementChild; if (!li) return;
    li.classList.add('is-leaving'); setTimeout(function () { li.remove(); var n = stackEl.lastElementChild; if (n) n.classList.add('is-top'); }, reduce ? 0 : 300);
  }

  /* ---------- Déroulement du programme ---------- */
  var phase = 'idle', playerName = '', list = [], gen = 0;
  function setInput(label, enabled, btn) {
    prompt.textContent = label; input.disabled = !enabled; enter.disabled = !enabled; enter.textContent = btn || 'Entrée'; input.value = '';
    if (enabled && interacted) { input.focus({ preventScroll: true }); }
  }
  function start() {
    gen++; queue = []; cur = null; skipping = false; onIdle = null; con.textContent = ''; sr.textContent = '';
    list = SCENES.slice(); chipsReset(); stackEl.innerHTML = '<li class="apo-empty">vide : le programme n\'a pas démarré</li>'; pname.textContent = 'name = ?';
    phase = 'busy'; setInput('…', false); var g = gen;
    measure(); say(banner(), 'h');
    onIdle = function () { if (g !== gen) return; ask(); };
  }
  function ask() { phase = 'name'; setInput('Veuillez entrer votre nom :', true, 'Valider'); }
  function submitName(v) {
    var g = gen; phase = 'busy'; setInput('…', false);
    say('Veuillez entrer votre nom : ', 'dim'); say(v + '\n', 'you');
    if (v.trim() === '') {
      say('Le nom ne peut pas être vide !\n', 'lose');
      onIdle = function () { if (g === gen) ask(); }; return;
    }
    playerName = v; pname.textContent = 'name = "' + v + '"';
    say('\nBienvenue, ' + v + ' !\nVotre aventure commence maintenant...\n', 'h');
    act(function () { playStep(g); });
  }
  function playStep(g) {
    if (g !== gen) return;
    if (list.length === 0) { /* appel avec une liste vide : retour immédiat, puis la pile se défait */
      pushFrame('play(liste vide) → return', 'is-end'); unwind(g); return;
    }
    pushFrame('play(' + list.length + (list.length > 1 ? ' scénarios' : ' scénario') + ')', 'is-top');
    var sc = list.shift(); var first = chipsEl.querySelector('li:not(.is-out)'); if (first) first.classList.add('is-out');
    pushFrame('Scenario.play() : attend Entrée', 'is-sub');
    var bar = '='.repeat(Math.min(34, W)); say('\n' + bar + '\n' + sc.titre + '\n' + bar + '\n', 't');
    say(sc.text + '\n\nAppuyez sur Entrée pour continuer...\n');
    onIdle = function () { if (g !== gen) return; phase = 'wait'; setInput('Appuyez sur Entrée pour continuer…', true, 'Entrée'); };
  }
  function nextScene() {
    var g = gen; phase = 'busy'; setInput('…', false);
    popFrame();
    if (list.length === 0) {
      var ok = win.checked;
      var big = '='.repeat(W); say('\n' + big + '\n', 'h');
      say(ok ? 'VICTOIRE !\nBravo ' + playerName + ', vous avez réussi votre quête !\n' : 'DÉFAITE !\nDommage ' + playerName + ', vous avez échoué.\n', ok ? 'win' : 'lose');
      say(big + '\n', 'h');
    }
    pause(350); act(function () { playStep(g); });
  }
  function unwind(g) {
    var n = stackEl.querySelectorAll('li').length;
    for (var i = 0; i < n; i++) { pause(380); act(function () { if (g === gen) popFrame(); }); }
    pause(450);
    act(function () { if (g !== gen) return; say('\n(fin du programme)\n', 'dim'); phase = 'done'; stackEl.innerHTML = '<li class="apo-empty">vide : le programme est terminé</li>'; setInput('Terminé. Cliquez sur « Recommencer » pour rejouer.', false); $('apo-restart').focus({ preventScroll: true }); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); interacted = true;
    if (phase === 'name') submitName(input.value);
    else if (phase === 'wait') nextScene();
  });
  con.addEventListener('click', function () { if (raf) skipping = true; });
  $('apo-restart').addEventListener('click', function () { interacted = true; start(); });
  win.addEventListener('change', function () { sr.textContent = 'Dernière scène : winning vaut ' + (win.checked ? 'true' : 'false') + '.'; });

  /* ---------- Les quatre classes ---------- */
  var INFO = {
    main: { t: 'Main', p: 'Le point d\'entrée du programme.', li: ['Crée les scénarios et les range dans une liste chaînée.', 'Crée le jeu (Game).', 'Appelle init(), puis play() avec une copie de la liste.'], m: 'main(String[] args)' },
    game: { t: 'Game', p: 'Le moteur : il orchestre la partie.', li: ['Garde en mémoire : la liste de scénarios et le joueur.', 'init() : affiche la bannière, demande le nom (et le redemande s\'il est vide), crée le Player.', 'play(liste) : joue le premier scénario, le retire, puis s\'appelle avec le reste. Liste vide : fin.', 'Après le dernier scénario : victoire ou défaite, selon son drapeau.'], m: 'init(), play(LinkedList<Scenario>)' },
    scenario: { t: 'Scenario', p: 'Une scène de l\'histoire.', li: ['Garde en mémoire : un titre, un texte, et un drapeau winning (fin gagnante ou non).', 'play() : affiche le titre encadré et le texte, puis attend la touche Entrée.', 'Des accesseurs (getters) donnent accès aux trois champs.'], m: 'play(), getTitre(), getText(), getWinning()' },
    player: { t: 'Player', p: 'La personne qui joue.', li: ['Garde en mémoire : son nom.', 'Un constructeur et un accesseur getName().', 'Créé par Game.init() une fois le nom validé.'], m: 'Player(String name), getName()' }
  };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.apo-tabs [role=tab]')), card = $('apo-card');
  function show(c, focus) {
    var d = INFO[c];
    tabs.forEach(function (t) { var on = t.getAttribute('data-c') === c; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) { card.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); } });
    Array.prototype.forEach.call(document.querySelectorAll('.apo-node'), function (n) { n.classList.toggle('is-on', n.getAttribute('data-n') === c); });
    card.innerHTML = '<h3>' + d.t + '</h3><p>' + d.p + '</p><ul>' + d.li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p><code></code></p>';
    card.querySelector('code').textContent = d.m;
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.getAttribute('data-c')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault();
      show(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-c'), true);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.apo-node'), function (n) { n.style.cursor = 'pointer'; n.addEventListener('click', function () { show(n.getAttribute('data-n')); }); });
  show('main');

  /* Démarrage : le programme attend le nom du joueur */
  start();
  window.__apo = { phase: function () { return phase; }, list: function () { return list.length; } };
})();
