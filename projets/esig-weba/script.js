/* SPA Dog Refuge : chiens dessinés, mini-site de démonstration et garde-barrière des flux. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // ---- Chiens : gabarits <template>, couleurs par variables CSS ----
  var DOGS = {
    milo: { t: 'floppy', coat: '#d9a066', ear: '#a8693a', snout: '#f6e7cf' },
    luna: { t: 'pointy', coat: '#3d4250', ear: '#2b2e39', snout: '#e6e6ee', patch: '#f2f2f7' },
    rex: { t: 'floppy', coat: '#efe9dc', ear: '#7a4b2a', snout: '#fff6e6', patch: '#7a4b2a' }
  };
  function makeDog(name) {
    var d = DOGS[name];
    var tpl = document.getElementById('ew-t-' + d.t);
    if (!tpl || !tpl.content) return document.createElementNS(NS, 'svg');
    var svg = tpl.content.firstElementChild.cloneNode(true);
    svg.style.setProperty('--coat', d.coat);
    svg.style.setProperty('--ear', d.ear);
    svg.style.setProperty('--snout', d.snout);
    if (d.patch) svg.style.setProperty('--patch', d.patch);
    return svg;
  }

  Array.prototype.forEach.call(document.querySelectorAll('#ew-fence li'), function (li) {
    li.querySelector('.ew-slot').appendChild(makeDog(li.getAttribute('data-dog')));
  });

  // ---- Mini-site : liste, détail, 404 ----
  var ADS = [
    { id: 1, dog: 'milo', title: 'Milo - chien de démonstration' },
    { id: 2, dog: 'luna', title: 'Luna - chienne de démonstration' },
    { id: 3, dog: 'rex', title: 'Rex - chien de démonstration' }
  ];
  var SUMMARY = 'Annonce fictive pour tester l\'affichage.';
  var page = document.getElementById('ew-page');
  var urlEl = document.getElementById('ew-url');
  var statusEl = document.getElementById('ew-status');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.ew-chip[data-go]'));
  var emptyBtn = document.getElementById('ew-empty');
  var emptyList = false;
  var here = '/';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function show(path) {
    here = path;
    page.textContent = '';
    var m = /^\/annonce\/(\d+)$/.exec(path);
    var code = 200;

    if (path === '/') {
      page.appendChild(el('h3', '', 'Liste des annonces'));
      var ul = el('ul', 'ew-cards');
      var list = emptyList ? [] : ADS;
      if (!list.length) {
        var none = el('li', '', 'Aucun animal n\'est à adopter.');
        ul.appendChild(none);
      }
      list.forEach(function (a) {
        var li = el('li', 'ew-card');
        li.appendChild(makeDog(a.dog));
        li.appendChild(el('b', '', a.title));
        li.appendChild(el('span', 'ew-card__ext', 'Lien « Voir sur le site du refuge » vers la source'));
        var b = el('button', '', 'Ouvrir l\'annonce');
        b.type = 'button';
        b.addEventListener('click', function () { show('/annonce/' + a.id); syncChips(); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      page.appendChild(ul);
    } else if (m) {
      var ad = ADS.filter(function (a) { return a.id === Number(m[1]); })[0];
      if (ad) {
        var box = el('div', 'ew-detail');
        box.appendChild(makeDog(ad.dog));
        box.appendChild(el('h3', '', ad.title));
        box.appendChild(el('p', '', SUMMARY));
        box.appendChild(el('p', '', 'Espèce : chien'));
        box.appendChild(el('p', 'ew-fakelink', 'Voir l\'annonce'));
        page.appendChild(box);
      } else {
        code = 404;
        var nf = el('div', 'ew-big404');
        nf.appendChild(el('b', '', '404'));
        nf.appendChild(el('p', '', 'Annonce non trouvée'));
        nf.appendChild(el('p', '', 'L\'identifiant est bien un nombre, mais aucune annonce ne le porte. Le serveur répond 404 au lieu de planter.'));
        page.appendChild(nf);
      }
    } else {
      code = 404;
      var nf2 = el('div', 'ew-big404');
      nf2.appendChild(el('b', '', '404'));
      nf2.appendChild(el('p', '', 'Not Found'));
      nf2.appendChild(el('p', '', 'L\'adresse demandée n\'existe pas sur le serveur : Flask n\'accepte que des nombres à cet endroit, donc aucune annonce n\'est même cherchée.'));
      page.appendChild(nf2);
    }

    urlEl.textContent = path;
    statusEl.textContent = code === 200 ? '200 OK' : '404 Not Found';
    statusEl.classList.toggle('is-404', code === 404);
  }

  function syncChips() {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-go') === here)); });
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { show(c.getAttribute('data-go')); syncChips(); });
  });
  emptyBtn.addEventListener('click', function () {
    emptyList = !emptyList;
    emptyBtn.setAttribute('aria-pressed', String(emptyList));
    emptyBtn.textContent = emptyList ? 'Remettre les annonces' : 'Vider la liste';
    show('/'); syncChips();
  });
  show('/');

  // ---- Garde-barrière : 7 étapes, des cas tirés des tests du dépôt ----
  var gates = Array.prototype.slice.call(document.querySelectorAll('#ew-gates li'));
  var caseBox = document.getElementById('ew-cases');
  var verdict = document.getElementById('ew-verdict');
  var vtag = document.getElementById('ew-vtag');
  var vtxt = document.getElementById('ew-vtxt');

  var CASES = [
    { id: 'ok', label: 'Flux normal', sub: 'Deux articles, liens valides', stop: null, kind: 'ok', tag: 'Accepté', txt: 'Toutes les étapes passent : les articles sont prêts à devenir des annonces.' },
    { id: 'ip', label: 'Adresse en 192.168.x.x', sub: 'IP privée écrite dans l\'URL', stop: 0, kind: 'no', tag: 'Refusé à l\'adresse', txt: 'L\'URL pointe vers une adresse IP non publique. La requête n\'est même pas envoyée.' },
    { id: 'dns', label: 'Nom qui renvoie vers une IP privée', sub: 'Le DNS ment', stop: 0, kind: 'no', tag: 'Refusé à l\'adresse', txt: 'Le nom est résolu avant tout : une seule adresse non publique suffit pour refuser la source.' },
    { id: 'rebind', label: 'DNS rebinding', sub: 'L\'adresse change après la vérification', stop: 1, kind: 'no', tag: 'Neutralisé à la connexion', txt: 'La connexion part vers l\'adresse déjà vérifiée. Une réponse DNS différente ensuite n\'est jamais utilisée.' },
    { id: 'cert', label: 'Certificat d\'un autre nom', sub: 'HTTPS, mauvais site', stop: 1, kind: 'no', tag: 'Refusé à la connexion', txt: 'En HTTPS, le certificat doit être valable pour le nom d\'hôte d\'origine, pas pour un autre.' },
    { id: 'redir', label: 'Redirection vers une IP privée', sub: 'Le site renvoie ailleurs', stop: 2, kind: 'no', tag: 'Refusé à la réponse', txt: 'Une redirection n\'est pas suivie : elle est signalée comme une erreur, donc rien ne part vers l\'adresse privée.' },
    { id: 'big', label: 'Flux trop gros', sub: 'Ou archive gzip qui gonfle', stop: 3, kind: 'no', tag: 'Refusé à la taille', txt: 'Au-delà de 10 Mio, mesurés après décompression, la lecture s\'arrête.' },
    { id: 'dtd', label: 'XML avec une DTD', sub: 'Entités externes, explosion d\'entités', stop: 4, kind: 'no', tag: 'Refusé au XML', txt: 'Les déclarations DTD sont interdites : cela écarte les entités externes et les explosions d\'entités.' },
    { id: 'js', label: 'Lien javascript: dans un article', sub: 'Un article sur deux est piégé', stop: null, warn: 5, kind: 'warn', tag: 'Gardé en partie', txt: 'L\'article au lien invalide est ignoré. Les autres articles du flux sont conservés.' },
    { id: 'html', label: 'Description pleine de HTML', sub: 'Balises dans le texte', stop: null, warn: 6, kind: 'warn', tag: 'Nettoyé', txt: 'Les balises disparaissent, il ne reste que le texte. Jinja échappe encore les valeurs à l\'affichage.', sample: ['<p>Milo adore <b>les longues</b> promenades.</p>', 'Milo adore les longues promenades.'] }
  ];

  var token = 0;
  var STEP = 520;
  var current = null;

  function resetGates() {
    gates.forEach(function (g) { g.className = ''; });
    verdict.className = 'ew-verdict';
  }

  function setVerdict(c) {
    verdict.className = 'ew-verdict is-' + c.kind;
    vtag.textContent = c.tag;
    vtxt.textContent = c.txt;
    var old = verdict.querySelectorAll('.ew-sample, .ew-test');
    Array.prototype.forEach.call(old, function (n) { n.parentNode.removeChild(n); });
    if (c.sample) {
      var s = el('div', 'ew-sample');
      s.appendChild(el('div', '', 'Avant : ' + c.sample[0]));
      s.appendChild(el('div', '', 'Après : ' + c.sample[1]));
      verdict.appendChild(s);
    }
    if (c.id !== 'ok') verdict.appendChild(el('span', 'ew-test', 'Un test écrit dans le dépôt couvre ce cas'));
  }

  // Résout l'étape i : franchie, signalée ou bloquante. Renvoie true quand le parcours est fini.
  function resolve(c, i) {
    var g = gates[i];
    g.classList.remove('is-run');
    if (c.stop === i) {
      g.classList.add('is-stop');
      for (var k = i + 1; k < gates.length; k++) gates[k].classList.add('is-skip');
      setVerdict(c);
      return true;
    }
    g.classList.add(c.warn === i ? 'is-warn' : 'is-pass');
    if (i === gates.length - 1) { setVerdict(c); return true; }
    gates[i + 1].classList.add('is-run');
    return false;
  }

  function run(c) {
    current = c;
    var my = ++token;
    resetGates();
    Array.prototype.forEach.call(caseBox.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === c.id)); });
    vtag.textContent = 'Vérification…';
    vtxt.textContent = '';
    var olds = verdict.querySelectorAll('.ew-sample, .ew-test');
    Array.prototype.forEach.call(olds, function (n) { n.parentNode.removeChild(n); });

    if (reduce) {
      // Version statique : tout le parcours d'un coup
      for (var i = 0; i < gates.length; i++) { if (resolve(c, i)) break; }
      gates.forEach(function (g) { g.classList.remove('is-run'); });
      return;
    }
    gates[0].classList.add('is-run');
    var idx = 0, acc = 0, last = 0;
    function frame(ts) {
      if (my !== token) return;
      acc += last ? Math.min(100, ts - last) : 0;
      last = ts;
      if (acc >= STEP) {
        acc -= STEP;
        if (resolve(c, idx++)) return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  CASES.forEach(function (c) {
    var b = el('button', 'ew-case');
    b.type = 'button';
    b.setAttribute('data-id', c.id);
    b.setAttribute('aria-pressed', 'false');
    b.appendChild(el('b', '', c.label));
    b.appendChild(el('small', '', c.sub));
    b.addEventListener('click', function () { run(c); });
    caseBox.appendChild(b);
  });

  // Premier cas joué une fois, quand la section arrive à l'écran
  var started = false;
  function first() { if (!started) { started = true; run(CASES[0]); } }
  if (reduce || !('IntersectionObserver' in window)) {
    first();
  } else {
    new IntersectionObserver(function (e, obs) {
      if (e[0].isIntersecting) { first(); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(document.getElementById('ew-gates'));
  }
})();
