// Terminal interactif : commandes réelles qui pilotent les filtres, le graphe et la navigation.
(function () {
  "use strict";
  var H = window.Hub;
  var out = document.getElementById("term-out");
  var form = document.getElementById("term-form");
  var input = document.getElementById("term-in");
  if (!H || !out || !form || !input) return;

  var history = [], hi = 0, busy = false, skip = false;
  var ABOUT = [
    "Informatique de gestion : Java, Kotlin, Python, web et SQL.",
    "Outils et projets personnels en Rust et en C, jusque sur Flipper Zero.",
    "Photo, avec développement des fichiers sous darktable.",
    "Une petite activité indépendante."
  ];

  // Une ligne = liste de morceaux : texte simple, ou {t, c (classe), href, cmd (commande à lancer au clic)}
  function line(parts, cls) {
    var d = H.el("div", "tl" + (cls ? " " + cls : ""));
    (Array.isArray(parts) ? parts : [parts]).forEach(function (p) {
      if (typeof p === "string") { d.appendChild(document.createTextNode(p)); return; }
      var n;
      if (p.href) { n = H.el("a", p.c, p.t); n.href = p.href; if (/^https?:/.test(p.href)) n.rel = "noopener"; }
      else if (p.cmd) { n = H.el("button", "tl-cmd " + (p.c || ""), p.t); n.type = "button"; n.addEventListener("click", function () { run(p.cmd, true); }); }
      else n = H.el("span", p.c, p.t);
      if (p.col) n.style.color = p.col;
      d.appendChild(n);
    });
    out.appendChild(d);
    while (out.children.length > 160) out.removeChild(out.firstChild);
    out.scrollTop = out.scrollHeight;
    return d;
  }
  function dot(cat) { return { t: "● ", col: H.color(cat) }; }

  var commands = {
    help: function () {
      line("Commandes :");
      [["ls [filtre]", "lister les projets (ex. ls python, ls bots)"], ["cat about", "qui je suis"], ["cat <projet>", "détail d'un projet"],
       ["open <projet>", "ouvrir sa page"], ["categories", "les catégories"], ["techs", "les technologies"],
       ["stats", "chiffres"], ["contact", "me joindre"], ["clear", "vider l'écran"]].forEach(function (r) {
        line(["  ", { t: r[0], c: "k-cmd" }, "  " + r[1]]);
      });
      line("Tab complète, ↑ rappelle la commande précédente.", "dim");
    },
    ls: function (args) {
      var w = args[0] === "projets" || args[0] === "projects" ? undefined : args[0];
      if (!w) { H.setFilter(null, null); }
      else {
        var f = H.resolve(w);
        if (!f) { line(["Aucun filtre « " + w + " ». Essaie ", { t: "categories", cmd: "categories" }, " ou ", { t: "techs", cmd: "techs" }, "."], "err"); return; }
        H.setFilter(f.cat || null, f.tech || null);
      }
      var list = H.matching();
      list.forEach(function (p) { line([dot(p.category), { t: p.id, cmd: "cat " + p.id, c: "k-id" }, "  " + H.catLabel(p.category)]); });
      line([list.length + (list.length > 1 ? " projets" : " projet") + ". ", { t: "voir la grille", href: "#projets", c: "k-link" }], "dim");
      if (H.graphReheat) H.graphReheat();
    },
    cat: function (args) {
      var w = (args[0] || "").toLowerCase();
      if (!w) { line("Quel fichier ? Essaie cat about ou cat <projet>.", "err"); return; }
      if (w === "about" || w === "a-propos") { ABOUT.forEach(function (l) { line(l); }); return; }
      var p = H.project(w);
      if (!p) { line(["Pas de fichier « " + w + " ». Projets : ", { t: "ls", cmd: "ls" }], "err"); return; }
      line([dot(p.category), { t: p.title, c: "k-id" }, "  (" + (p.visibility === "public" ? "public" : "privé") + ")"]);
      line(p.desc);
      line(["technos : ", { t: p.tech.join(", "), c: "k-str" }]);
      var parts = [];
      if (p.page) parts.push({ t: "page", href: p.page, c: "k-link" });
      if (p.visibility === "public" && p.repo) { if (parts.length) parts.push("  "); parts.push({ t: "code", href: p.repo, c: "k-link" }); }
      if (parts.length) line(parts);
    },
    open: function (args) {
      var p = H.project((args[0] || "").toLowerCase());
      if (!p) { line("Quel projet ? Essaie open spotyfiles (ls les liste).", "err"); return; }
      if (!p.page) { line(p.id + " n'a pas encore de page. Voir cat " + p.id + ".", "err"); return; }
      line("Ouverture de " + p.title + "…");
      setTimeout(function () { location.href = p.page; }, H.reduce ? 0 : 350);
    },
    categories: function () {
      H.categories.forEach(function (c) { line([dot(c.id), { t: c.id, cmd: "ls " + c.id, c: "k-id" }, "  " + c.label + " (" + H.catCount[c.id] + ")"]); });
    },
    techs: function () {
      var parts = [];
      H.techs.forEach(function (t, i) { if (i) parts.push("  "); parts.push({ t: t.name + (t.count > 1 ? "×" + t.count : ""), cmd: "ls " + t.name, c: "k-str" }); });
      line(parts);
    },
    stats: function () {
      line([{ t: String(H.projects.length), c: "k-num" }, " projets : " + H.publicCount + " publics, " + (H.projects.length - H.publicCount) + " privés."]);
      line([{ t: String(H.techs.length), c: "k-num" }, " technologies, " + H.categories.length + " catégories."]);
      line("Technologie la plus utilisée : " + H.techs[0].name + " (" + H.techs[0].count + " projets).");
    },
    contact: function () {
      line([{ t: "telegram ", c: "dim" }, { t: "t.me/Theido74", href: "https://t.me/Theido74", c: "k-link" }]);
      line([{ t: "github   ", c: "dim" }, { t: "github.com/theido74", href: "https://github.com/theido74", c: "k-link" }]);
      if (H.email) line([{ t: "e-mail   ", c: "dim" }, { t: H.email, href: "mailto:" + H.email, c: "k-link" }]);
    },
    whoami: function () { line("GeLeprechaun : développement, données, sécurité embarquée et photo."); },
    clear: function () { out.textContent = ""; },
    sudo: function () { line("Pas de droits root ici, mais contact est ouvert à tous.", "err"); }
  };
  commands.projets = commands.ls;
  commands.cls = commands.clear;

  function run(text, fromButton) {
    var raw = text.trim();
    if (!raw) return;
    skip = true;
    line([{ t: "$ ", c: "ps" }, raw], "echo");
    if (history[history.length - 1] !== raw) history.push(raw);
    hi = history.length;
    var parts = raw.split(/\s+/), name = parts[0].toLowerCase();
    if (commands.hasOwnProperty(name)) commands[name](parts.slice(1));
    else line(["Commande inconnue : " + name + ". Essaie ", { t: "help", cmd: "help" }, "."], "err");
    if (fromButton) { /* on laisse le focus où il est : pas de saut d'écran sur mobile */ }
  }

  form.addEventListener("submit", function (ev) { ev.preventDefault(); var v = input.value; input.value = ""; run(v); });
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowUp") { ev.preventDefault(); if (hi > 0) input.value = history[--hi]; }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); hi = Math.min(hi + 1, history.length); input.value = history[hi] || ""; }
    else if (ev.key === "l" && ev.ctrlKey) { ev.preventDefault(); commands.clear(); }
    else if (ev.key === "Tab" && !ev.shiftKey && input.value.trim()) { // complétion : commande, puis projet, catégorie ou technologie
      var v = input.value, sp = v.split(/\s+/), last = sp[sp.length - 1].toLowerCase(), pool;
      if (sp.length === 1) pool = Object.keys(commands);
      else if (sp[0] === "ls") pool = H.categories.map(function (c) { return c.id; }).concat(H.techs.map(function (t) { return t.name.toLowerCase(); }));
      else pool = H.projects.map(function (p) { return p.id; }).concat(sp[0] === "cat" ? ["about"] : []);
      var m = pool.filter(function (x) { return x.indexOf(last) === 0; });
      if (m.length) { ev.preventDefault(); sp[sp.length - 1] = m[0]; input.value = sp.join(" ") + (m.length === 1 ? " " : ""); }
    }
  });
  out.addEventListener("click", function (ev) { if (!window.getSelection().toString() && ev.target === out) input.focus({ preventScroll: true }); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-cmd]"), function (b) {
    b.addEventListener("click", function () { run(b.getAttribute("data-cmd"), true); });
  });

  // Saisie animée au démarrage : se termine d'un coup dès que la personne agit.
  function type(text, cb) {
    var d = line([{ t: "$ ", c: "ps" }]), s = H.el("span"), i = 0;
    d.appendChild(s);
    (function tick() {
      if (skip || H.reduce) { s.textContent = text; cb(); return; }
      s.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 38 + Math.random() * 40); else setTimeout(cb, 260);
    })();
  }
  H.intro = function (done) {
    out.textContent = "";
    out.removeAttribute("aria-live"); // pas d'annonce lettre par lettre
    var steps = [["whoami", function () { commands.whoami(); }], ["ls projets | wc -l", function () { line([{ t: String(H.projects.length), c: "k-num" }, " projets. Tape ", { t: "help", cmd: "help" }, " ou clique un point du graphe."]); }]];
    (function next(i) {
      if (i >= steps.length) { out.setAttribute("aria-live", "polite"); if (done) done(); return; }
      type(steps[i][0], function () { steps[i][1](); setTimeout(function () { next(i + 1); }, skip || H.reduce ? 0 : 420); });
    })(0);
  };
  form.addEventListener("focusin", function () { skip = true; });
  H.runCommand = run;
})();
