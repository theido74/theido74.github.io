// Hub : rendu des cartes, filtres animés (catégorie et technologie), compteurs, orchestration du démarrage.
(function () {
  "use strict";
  var H = window.Hub;
  var grid = document.getElementById("grid");
  var countEl = document.getElementById("count");
  if (!H || !grid) return; // sans données ou sans JS : la liste de secours <noscript> reste affichée
  var el = H.el;
  var cards = {};
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- Cartes ----------
  function link(label, href, aria, cls) {
    var a = el("a", cls, label);
    a.href = href; a.rel = href.indexOf("http") === 0 ? "noopener" : "";
    if (!a.rel) a.removeAttribute("rel");
    a.setAttribute("aria-label", aria);
    return a;
  }
  function buildCard(p) {
    var isPublic = p.visibility === "public";
    var art = el("article", "card" + (p.featured ? " card-feat" : ""));
    art.id = "p-" + p.id;
    art.style.setProperty("--c", "var(--c-" + p.category + ")");
    var view = el("div", "card-view");
    view.appendChild(H.preview ? H.preview(p.id) : el("span"));
    art.appendChild(view);
    var body = el("div", "card-body");
    var top = el("div", "card-top");
    var cat = el("p", "card-cat");
    cat.appendChild(el("span", "dot"));
    cat.appendChild(document.createTextNode(H.catLabel(p.category)));
    top.appendChild(cat);
    top.appendChild(el("span", "vis " + (isPublic ? "vis-pub" : "vis-priv"), isPublic ? "Public" : "Privé"));
    body.appendChild(top);
    body.appendChild(el("h3", null, p.title));
    body.appendChild(el("p", "card-desc", p.desc));
    var ul = el("ul", "tech");
    ul.setAttribute("aria-label", "Technologies : toucher pour filtrer");
    p.tech.forEach(function (t) {
      var li = el("li"), b = el("button", "chip", t);
      b.type = "button"; b.dataset.tech = t; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { H.setFilter(null, H.state.tech === t ? null : t); });
      li.appendChild(b); ul.appendChild(li);
    });
    body.appendChild(ul);
    var links = el("div", "card-links");
    // Aucun lien de dépôt pour un projet privé, même si repo était renseigné par erreur.
    if (p.page) links.appendChild(link("Page", p.page, "Page de " + p.title, "lk lk-page"));
    if (isPublic && p.repo) links.appendChild(link("Code", p.repo, "Code de " + p.title + " sur GitHub", "lk"));
    if (links.children.length) body.appendChild(links);
    art.appendChild(body);
    // Lueur et inclinaison suivant le curseur (souris uniquement, jamais en mouvement réduit)
    if (fine) {
      art.addEventListener("pointermove", function (ev) {
        if (H.reduce) return;
        var r = art.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        art.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); art.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        art.style.setProperty("--rx", ((0.5 - y) * 5).toFixed(2) + "deg"); art.style.setProperty("--ry", ((x - 0.5) * 6).toFixed(2) + "deg");
      });
      art.addEventListener("pointerleave", function () { art.style.setProperty("--rx", "0deg"); art.style.setProperty("--ry", "0deg"); });
    }
    // Les aperçus ne s'animent que lorsque la carte est visible à l'écran.
    H.watch(art, function (on) { art.classList.toggle("play", on && !H.reduce); }, "0px 0px -10% 0px");
    cards[p.id] = art;
    return art;
  }
  H.projects.forEach(function (p) { grid.appendChild(buildCard(p)); });

  // ---------- Filtres ----------
  var catBar = document.getElementById("cat-legend");
  var mix = document.getElementById("mix");
  var techBar = document.getElementById("tech-top");
  var techMore = document.getElementById("tech-more");
  var moreSum = document.getElementById("tech-more-sum");
  var reset = document.getElementById("reset");

  function toggleCat(id) { H.setFilter(H.state.cat === id ? null : id, null); }
  H.categories.forEach(function (c) {
    var b = el("button", "leg"); b.type = "button"; b.dataset.cat = c.id; b.setAttribute("aria-pressed", "false");
    b.style.setProperty("--c", "var(--c-" + c.id + ")");
    b.appendChild(el("span", "dot"));
    b.appendChild(document.createTextNode(c.label + " "));
    b.appendChild(el("span", "n", String(H.catCount[c.id])));
    b.addEventListener("click", function () { toggleCat(c.id); });
    catBar.appendChild(b);
    var s = el("span", "seg"); s.dataset.cat = c.id; s.style.flexGrow = H.catCount[c.id];
    s.style.setProperty("--c", "var(--c-" + c.id + ")"); s.title = c.label + " : " + H.catCount[c.id];
    s.addEventListener("click", function () { toggleCat(c.id); });
    mix.appendChild(s);
  });
  var rest = 0;
  H.techs.forEach(function (t) {
    var b = el("button", "chip chip-big", t.name); b.type = "button"; b.dataset.tech = t.name; b.setAttribute("aria-pressed", "false");
    b.appendChild(el("span", "n", String(t.count)));
    b.addEventListener("click", function () { H.setFilter(null, H.state.tech === t.name ? null : t.name); });
    if (t.count > 1) techBar.appendChild(b); else { techMore.appendChild(b); rest++; }
  });
  if (rest) moreSum.textContent = "Les " + rest + " autres technologies";
  else moreSum.parentNode.hidden = true;
  reset.addEventListener("click", function () { H.setFilter(null, null); });
  H.watch(mix, function (on) { if (on) mix.classList.add("in"); });

  function syncControls() {
    var s = H.state;
    Array.prototype.forEach.call(document.querySelectorAll("[data-cat]"), function (b) {
      var on = s.cat === b.dataset.cat; if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("on", on); b.classList.toggle("off", !!s.cat && !on);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-tech]"), function (b) {
      b.setAttribute("aria-pressed", String(s.tech === b.dataset.tech));
    });
    if (s.tech && techMore.querySelector('[data-tech="' + (window.CSS && CSS.escape ? CSS.escape(s.tech) : s.tech) + '"]')) techMore.parentNode.open = true;
    reset.hidden = !(s.cat || s.tech);
    var n = H.matching().length, what = "";
    if (s.cat) what += " dans « " + H.catLabel(s.cat) + " »";
    if (s.tech) what += " avec " + s.tech;
    countEl.textContent = n + (n > 1 ? " projets" : " projet") + what;
  }

  var ver = 0;
  function applyFilter() {
    syncControls();
    var token = ++ver, list = H.projects, i;
    var leaving = [], staying = [], entering = [];
    list.forEach(function (p) {
      var c = cards[p.id], shown = !c.hidden, want = H.match(p);
      if (shown && !want) leaving.push(c); else if (shown && want) staying.push(c); else if (!shown && want) entering.push(c);
    });
    if (H.reduce || !c0().animate) {
      leaving.forEach(function (c) { c.hidden = true; }); entering.forEach(function (c) { c.hidden = false; });
      return;
    }
    var first = staying.map(function (c) { return c.getBoundingClientRect(); });
    var done = 0, total = leaving.length;
    function phase2() {
      if (token !== ver) return;
      leaving.forEach(function (c) { c.hidden = true; });
      entering.forEach(function (c) { c.hidden = false; });
      staying.forEach(function (c, k) { // FLIP : les cartes restantes glissent vers leur nouvelle place
        var r = c.getBoundingClientRect(), dx = first[k].left - r.left, dy = first[k].top - r.top;
        if (dx || dy) c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
      });
      entering.forEach(function (c, k) {
        c.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: 60 + k * 30, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      });
    }
    if (!total) { phase2(); return; }
    leaving.forEach(function (c) {
      var a = c.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.9)" }], { duration: 170, easing: "ease-in", fill: "forwards" });
      a.onfinish = function () { if (++done === total) { leaving.forEach(function (x) { x.getAnimations().forEach(function (an) { an.cancel(); }); }); phase2(); } };
    });
    function c0() { return cards[list[0].id]; }
  }
  H.on(applyFilter);

  H.focusProject = function (id) {
    var c = cards[id]; if (!c) return;
    if (c.hidden || !H.match(H.project(id))) H.setFilter(null, null);
    c.hidden = false;
    c.scrollIntoView({ behavior: H.reduce ? "auto" : "smooth", block: "center" });
    c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
    var l = c.querySelector(".lk-page") || c.querySelector("a");
    if (l) setTimeout(function () { l.focus({ preventScroll: true }); }, H.reduce ? 0 : 500);
  };

  // ---------- Compteurs (valeurs tirées des données) ----------
  Array.prototype.forEach.call(document.querySelectorAll("[data-count]"), function (n) {
    var to = ({ projects: H.projects.length, techs: H.techs.length, cats: H.categories.length, pub: H.publicCount })[n.dataset.count];
    n.textContent = String(to);
    if (H.reduce) return;
    H.watch(n, function (on) {
      if (!on || n.dataset.done) return;
      n.dataset.done = "1";
      var t0 = performance.now();
      (function tick(t) {
        var k = Math.min(1, (t - t0) / 900);
        n.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });

  // ---------- Contact : e-mail seulement si renseigné ----------
  var mailSlot = document.getElementById("mail-slot");
  if (mailSlot) {
    if (H.email) { var ma = mailSlot.querySelector("a"); ma.href = "mailto:" + H.email; ma.querySelector(".v").textContent = H.email; mailSlot.hidden = false; }
    else mailSlot.hidden = true;
  }

  // ---------- Barre : section active ----------
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll(".bar-nav a[href^='#']"), function (a) { links[a.getAttribute("href").slice(1)] = a; });
  Object.keys(links).forEach(function (id) {
    var s = document.getElementById(id);
    if (s) H.watch(s, function (on) { if (on) { Object.keys(links).forEach(function (k) { links[k].removeAttribute("aria-current"); }); links[id].setAttribute("aria-current", "true"); } else links[id].removeAttribute("aria-current"); }, "-45% 0px -50% 0px");
  });

  // ---------- Nom : décodage à l'ouverture (le seul moment orchestré) ----------
  var nameEl = document.getElementById("name");
  function decode(done) {
    var final = nameEl.textContent, glyphs = "01<>/{}[]=+*#_;:", t0 = performance.now(), per = 70;
    if (H.reduce) { done(); return; }
    (function tick(t) {
      var k = Math.floor((t - t0) / per), s = "";
      for (var i = 0; i < final.length; i++) s += i < k ? final[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
      nameEl.textContent = s;
      if (k < final.length + 2) requestAnimationFrame(tick); else { nameEl.textContent = final; done(); }
    })(t0);
  }

  // ---------- Démarrage ----------
  var st = H.readHash();
  H.setFilter(st.cat, st.tech, { hash: false });
  syncControls();
  window.addEventListener("hashchange", function () { var s = H.readHash(); if (/#(cat|tech)=/.test(location.hash) || !H.state.cat && !H.state.tech) H.setFilter(s.cat, s.tech, { hash: false }); });
  if (H.state.cat || H.state.tech) { var pr = document.getElementById("projets"); if (pr) pr.scrollIntoView(); }
  document.documentElement.classList.add("ready");
  if (H.intro) decode(function () { H.intro(); });
})();
