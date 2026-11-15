// Noyau du hub : données dérivées de projects.js, état des filtres partagé (grille, graphe, terminal).
(function () {
  "use strict";
  if (typeof PROJECTS === "undefined" || typeof CATEGORIES === "undefined") return;
  var H = (window.Hub = {});
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  H.reduce = mq.matches;
  if (mq.addEventListener) mq.addEventListener("change", function (e) { H.reduce = e.matches; });

  H.projects = PROJECTS;
  H.categories = CATEGORIES;
  H.email = typeof CONTACT_EMAIL === "string" && CONTACT_EMAIL ? CONTACT_EMAIL : null;

  H.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  H.catLabel = function (id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].label;
    return "";
  };
  H.project = function (id) {
    for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) return PROJECTS[i];
    return null;
  };
  // Couleur d'une catégorie : lue dans la feuille de style (variable --c-<id>), une seule source.
  var cs = getComputedStyle(document.documentElement);
  H.color = function (cat) { return cs.getPropertyValue("--c-" + cat).trim() || "#93a0b8"; };

  // Technologies : nombre de projets qui les utilisent, tri par fréquence puis ordre alphabétique.
  var map = {};
  PROJECTS.forEach(function (p) {
    p.tech.forEach(function (t) {
      (map[t] = map[t] || { name: t, count: 0, ids: [] });
      map[t].count++;
      map[t].ids.push(p.id);
    });
  });
  H.techs = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
    return b.count - a.count || a.name.localeCompare(b.name);
  });
  H.catCount = {};
  CATEGORIES.forEach(function (c) { H.catCount[c.id] = 0; });
  PROJECTS.forEach(function (p) { H.catCount[p.category]++; });
  H.publicCount = PROJECTS.filter(function (p) { return p.visibility === "public"; }).length;

  // État des filtres : une catégorie et/ou une technologie.
  H.state = { cat: null, tech: null };
  var listeners = [];
  H.on = function (fn) { listeners.push(fn); };
  H.match = function (p, s) {
    s = s || H.state;
    return (!s.cat || p.category === s.cat) && (!s.tech || p.tech.indexOf(s.tech) >= 0);
  };
  H.matching = function () { return PROJECTS.filter(function (p) { return H.match(p); }); };
  H.setFilter = function (cat, tech, opts) {
    opts = opts || {};
    if (cat && !H.catLabel(cat)) cat = null;
    if (tech && !map[tech]) tech = null;
    if (H.state.cat === (cat || null) && H.state.tech === (tech || null)) return;
    H.state = { cat: cat || null, tech: tech || null };
    if (opts.hash !== false) {
      try {
        var h = cat ? "#cat=" + cat : tech ? "#tech=" + encodeURIComponent(tech) : "#projets";
        if (cat && tech) h = "#cat=" + cat + "&tech=" + encodeURIComponent(tech);
        history.replaceState(null, "", h);
      } catch (e) { /* le hash n'est pas critique */ }
    }
    listeners.forEach(function (fn) { fn(H.state); });
  };
  H.readHash = function () {
    var c = /[#&]cat=([a-z]+)/.exec(location.hash);
    var t = /[#&]tech=([^&]+)/.exec(location.hash);
    var tech = null;
    if (t) { try { tech = decodeURIComponent(t[1]); } catch (e) { tech = null; } }
    return { cat: c && H.catLabel(c[1]) ? c[1] : null, tech: tech && map[tech] ? tech : null };
  };

  // Observe la visibilité d'un élément à l'écran (rappel avec true/false).
  H.watch = function (node, cb, margin) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: margin || "0px" }).observe(node);
  };
  // Recherche tolérante d'un filtre à partir d'un mot tapé (id ou libellé de catégorie, ou technologie).
  H.resolve = function (word) {
    var w = word.toLowerCase();
    var i;
    for (i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === w) return { cat: CATEGORIES[i].id };
    for (i = 0; i < H.techs.length; i++) if (H.techs[i].name.toLowerCase() === w) return { tech: H.techs[i].name };
    for (i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].label.toLowerCase().indexOf(w) === 0) return { cat: CATEGORIES[i].id };
    return null;
  };
})();
