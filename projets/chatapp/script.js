/* ChatApp : fenêtre Windows animée et schéma des couches (démonstration dessinée). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var wins = {
    login: document.querySelector('[data-win="login"]'),
    dm: document.querySelector('[data-win="dm"]'),
    forum: document.querySelector('[data-win="forum"]')
  };
  var layers = Array.prototype.slice.call(document.querySelectorAll('.ca-layer'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.ca-tab[data-scene]'));
  var pauseBtn = $('ca-pause');
  var caption = $('ca-caption');
  var taskWin = $('ca-task-win');
  var logLine = document.querySelector('.ca-log');
  if (!wins.login || !layers.length) return;

  // Chaque champ reçoit un nœud de texte placé avant le curseur.
  function field(el) {
    var t = document.createElement('span');
    t.className = 'ca-txt';
    el.insertBefore(t, el.firstChild);
    return t;
  }
  var userT = field($('ca-user'));
  var pwT = $('ca-pw');
  var dmInT = field($('ca-dm-in'));
  var fSearchT = field($('ca-f-search'));
  var fInT = field($('ca-f-in'));

  var order = ['login', 'dm', 'forum'];
  var TITLES = { login: 'Connexion', dm: 'Messages privés', forum: 'Forums' };
  var CAPTIONS = {
    login: 'Connexion : le formulaire envoie les identifiants à la logique métier, qui hache le mot de passe saisi (PBKDF2-SHA256, avec sel) et le compare ; l\'accès aux données interroge Oracle avec une requête paramétrée.',
    dm: 'Message privé : l\'ouverture d\'une conversation lit les messages ; l\'envoi passe par la validation, puis par une insertion paramétrée dans une transaction, avec un identifiant tiré d\'une séquence Oracle.',
    forum: 'Forum : la recherche et la lecture d\'un forum passent par ForumService et ForumDataAccess jusqu\'à Oracle, puis le message envoyé suit le même chemin.'
  };

  // ---- Outils de scène ----
  function light(i, text) {
    layers.forEach(function (l, k) {
      var on = k === i;
      l.classList.toggle('is-on', on);
      var d = l.querySelector('[data-d]');
      if (on) d.textContent = text || ''; else if (i < 0) d.textContent = '';
    });
    logLine.classList.toggle('is-on', false);
  }
  function lightOff() { light(-1); }
  function msg(box, cls, who, text) {
    var empty = box.querySelector('.ca-empty'); if (empty) box.removeChild(empty);
    var p = document.createElement('p');
    p.className = 'ca-msg ' + cls;
    var s = document.createElement('small'); s.textContent = who;
    p.appendChild(s); p.appendChild(document.createTextNode(text));
    box.appendChild(p);
    while (box.children.length > 4) box.removeChild(box.firstChild);
  }
  function press(el, ms) {
    el.classList.add('is-down');
    return ms;
  }
  function release(el) { el.classList.remove('is-down'); }
  // Saisie lettre à lettre : ajoute une étape par caractère.
  function typing(steps, t0, target, text, gap) {
    for (var i = 1; i <= text.length; i++) {
      (function (n) { steps.push({ t: t0 + n * gap, f: function () { target(text.slice(0, n)); } }); })(i);
    }
    return t0 + text.length * gap;
  }

  // ---- Scènes ----
  var PW = 'exemple1';
  var eyeOn = false;
  var pwTyped = 0;
  function paintPw() { pwT.textContent = eyeOn ? PW.slice(0, pwTyped) : new Array(pwTyped + 1).join('•'); }
  function setEye(on) { eyeOn = on; $('ca-eye-img').src = on ? 'eye_open.png' : 'eye_closed.png'; paintPw(); }

  function sceneLogin() {
    var s = [];
    typing(s, 300, function (v) { userT.textContent = v; }, 'lea', 160);
    typing(s, 1000, function (v) { pwTyped = v.length; paintPw(); }, PW, 110);
    s.push({ t: 2500, f: function () { $('ca-eye').classList.add('is-down'); setEye(true); } });
    s.push({ t: 2700, f: function () { $('ca-eye').classList.remove('is-down'); } });
    s.push({ t: 3700, f: function () { $('ca-eye').classList.add('is-down'); setEye(false); } });
    s.push({ t: 3900, f: function () { $('ca-eye').classList.remove('is-down'); } });
    s.push({ t: 4500, f: function () { press($('ca-login-btn')); } });
    s.push({ t: 4700, f: function () { release($('ca-login-btn')); $('ca-login-status').textContent = 'Vérification en cours…'; light(0, 'Login : clic sur Connexion'); } });
    s.push({ t: 5200, f: function () { light(1, 'authService + PasswordHasher : haché du mot de passe saisi, avec le sel'); } });
    s.push({ t: 5900, f: function () { light(2, 'UserDateAccess : requête paramétrée, liée par nom'); } });
    s.push({ t: 6600, f: function () { light(3, 'Oracle : lecture de l\'utilisateur'); } });
    s.push({ t: 7300, f: function () { light(2, 'Réponse remontée'); } });
    s.push({ t: 7800, f: function () { light(1, 'Hachés identiques : connexion acceptée'); } });
    s.push({ t: 8300, f: function () { light(0, 'La fenêtre principale s\'ouvre'); $('ca-login-status').textContent = 'Connecté.'; } });
    return {
      end: 10200, s: s,
      reset: function () {
        userT.textContent = ''; pwTyped = 0; setEye(false); paintPw();
        $('ca-login-status').textContent = 'Entrez vos identifiants.';
        release($('ca-login-btn')); lightOff();
      }
    };
  }

  function sceneDm() {
    var s = [], box = $('ca-dm-msgs'), sam = document.querySelector('[data-c="sam"]');
    s.push({ t: 900, f: function () { sam.classList.add('is-sel', 'is-read'); sam.classList.remove('is-unread'); light(0, 'Main : ouverture de la conversation avec Sam'); } });
    s.push({ t: 1500, f: function () { light(2, 'messageDataAccess : lecture des messages'); } });
    s.push({ t: 2100, f: function () { light(3, 'Oracle : messages de la conversation'); msg(box, 'ca-msg--in', 'Sam', 'Salut ! Tu as vu la nouvelle version ?'); } });
    s.push({ t: 2900, f: function () { lightOff(); msg(box, 'ca-msg--in', 'Sam', 'Elle est en ligne depuis ce matin.'); } });
    var tEnd = typing(s, 3800, function (v) { dmInT.textContent = v; }, 'Oui, elle tourne bien !', 65);
    s.push({ t: tEnd + 500, f: function () { press($('ca-dm-send')); } });
    s.push({ t: tEnd + 700, f: function () { release($('ca-dm-send')); light(0, 'MessagePrive : clic sur Envoyer'); } });
    s.push({ t: tEnd + 1300, f: function () { light(1, 'MessageService : saisie contrôlée avant l\'envoi'); } });
    s.push({ t: tEnd + 2000, f: function () { light(2, 'messageDataAccess : INSERT paramétré, dans une transaction'); } });
    s.push({ t: tEnd + 2700, f: function () { light(3, 'Oracle : identifiant tiré d\'une séquence, puis validation'); } });
    s.push({ t: tEnd + 3400, f: function () { light(0, 'Le message apparaît dans la conversation'); dmInT.textContent = ''; msg(box, 'ca-msg--out', 'Moi', 'Oui, elle tourne bien !'); logLine.classList.add('is-on'); } });
    return {
      end: tEnd + 5200, s: s,
      reset: function () {
        box.textContent = ''; var p = document.createElement('p'); p.className = 'ca-empty'; p.textContent = 'Choisissez une conversation.'; box.appendChild(p);
        dmInT.textContent = ''; release($('ca-dm-send'));
        sam.classList.remove('is-sel', 'is-read'); sam.classList.add('is-unread');
        lightOff();
      }
    };
  }

  function sceneForum() {
    var s = [], box = $('ca-f-msgs'), items = Array.prototype.slice.call(document.querySelectorAll('#ca-f-list li'));
    typing(s, 400, function (v) { fSearchT.textContent = v; }, 'ph', 200);
    s.push({ t: 1100, f: function () { items.forEach(function (li) { li.hidden = li.getAttribute('data-f') !== 'photo'; }); light(0, 'Forum : recherche saisie'); } });
    s.push({ t: 1600, f: function () { light(1, 'ForumService : recherche demandée'); } });
    s.push({ t: 2100, f: function () { light(2, 'ForumDataAccess : requête paramétrée'); } });
    s.push({ t: 2600, f: function () { light(3, 'Oracle : forums dont le nom correspond'); } });
    s.push({ t: 3200, f: function () { lightOff(); items.forEach(function (li) { li.classList.toggle('is-sel', li.getAttribute('data-f') === 'photo'); }); msg(box, 'ca-msg--in', 'Lina', 'Quelqu\'un a testé le noir et blanc ?'); } });
    s.push({ t: 4100, f: function () { msg(box, 'ca-msg--in', 'Noé', 'Oui, très bien sur les portraits.'); } });
    var tEnd = typing(s, 4800, function (v) { fInT.textContent = v; }, 'Merci, je vais essayer !', 60);
    s.push({ t: tEnd + 400, f: function () { press($('ca-f-send')); } });
    s.push({ t: tEnd + 600, f: function () { release($('ca-f-send')); light(1, 'ForumService : message transmis'); } });
    s.push({ t: tEnd + 1200, f: function () { light(2, 'ForumDataAccess : INSERT paramétré, dans une transaction'); } });
    s.push({ t: tEnd + 1900, f: function () { light(3, 'Oracle : écriture validée'); } });
    s.push({ t: tEnd + 2600, f: function () { light(0, 'Le message apparaît dans le forum'); fInT.textContent = ''; msg(box, 'ca-msg--out', 'Moi', 'Merci, je vais essayer !'); } });
    return {
      end: tEnd + 4400, s: s,
      reset: function () {
        fSearchT.textContent = ''; fInT.textContent = ''; release($('ca-f-send'));
        items.forEach(function (li) { li.hidden = false; li.classList.remove('is-sel'); });
        box.textContent = ''; var p = document.createElement('p'); p.className = 'ca-empty'; p.textContent = 'Choisissez un forum.'; box.appendChild(p);
        lightOff();
      }
    };
  }
  var BUILD = { login: sceneLogin, dm: sceneDm, forum: sceneForum };

  // ---- Moteur : horloge pilotée par requestAnimationFrame ----
  var animate = !reduce;
  var staticShown = false, scene = null, name = 'login', clock = 0, idx = 0, last = 0, running = false, visible = true;

  function show(n) {
    Object.keys(wins).forEach(function (k) { wins[k].hidden = k !== n; });
    taskWin.textContent = TITLES[n];
    caption.textContent = CAPTIONS[n];
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-scene') === n)); });
  }

  function play(n) {
    name = n;
    scene = BUILD[n]();
    scene.s.sort(function (a, b) { return a.t - b.t; });
    show(n);
    scene.reset();
    clock = 0; idx = 0; last = 0;
    staticShown = !animate;
    if (!animate) {
      // Version statique : l'état final de la scène, d'un seul coup.
      scene.s.forEach(function (st) { st.f(); });
      pwTyped = PW.length; setEye(false);
      if (n === 'login') { $('ca-login-status').textContent = 'Connecté.'; }
      return;
    }
    kick();
  }

  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min(100, ts - last) : 16;
    last = ts; clock += dt;
    while (idx < scene.s.length && scene.s[idx].t <= clock) scene.s[idx++].f();
    if (clock >= scene.end) {
      play(order[(order.indexOf(name) + 1) % order.length]);
      return;
    }
    requestAnimationFrame(frame);
  }
  function kick() {
    if (running || !animate || !visible || document.hidden) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }
  function halt() { running = false; }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { halt(); play(t.getAttribute('data-scene')); });
  });
  pauseBtn.textContent = animate ? 'Mettre en pause' : 'Lancer l\'animation';
  pauseBtn.setAttribute('aria-pressed', String(!animate));
  pauseBtn.addEventListener('click', function () {
    animate = !animate;
    pauseBtn.textContent = animate ? 'Mettre en pause' : 'Lancer l\'animation';
    pauseBtn.setAttribute('aria-pressed', String(!animate));
    if (!animate) { halt(); return; }
    if (staticShown) play(name); else kick();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) kick(); else halt();
    }).observe($('ca-layers'));
  }

  play('login');
})();
