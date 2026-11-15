// Shell commun (facultatif) : flèches gauche et droite pour passer au projet précédent ou suivant,
// et petit fondu à la sortie de la page. Sans dépendance ; la navigation reste complète sans ce script.
(function () {
  "use strict";
  var prev = document.querySelector(".shell-prev");
  var next = document.querySelector(".shell-next");
  if (!prev && !next) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var leaving = false;

  function typing(t) {
    return !!(t && t.closest && t.closest("input,textarea,select,[contenteditable],[role=slider],[role=tablist],[role=listbox],[role=textbox]"));
  }
  function go(a) {
    if (!a || leaving) return;
    var href = a.href;
    if (reduce || !document.documentElement.animate) { location.href = href; return; }
    leaving = true;
    var anim = document.documentElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in", fill: "forwards" });
    var done = function () { location.href = href; };
    anim.onfinish = done;
    setTimeout(done, 400); // filet de sécurité si l'animation ne se termine pas (onglet masqué)
  }

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || typing(e.target)) return;
    if (e.key === "ArrowLeft" && prev) { e.preventDefault(); go(prev); }
    else if (e.key === "ArrowRight" && next) { e.preventDefault(); go(next); }
  });

  // Clic sur un lien interne du shell (hors nouvel onglet) : même fondu.
  Array.prototype.forEach.call(document.querySelectorAll(".shell-home,.shell-prev,.shell-all,.shell-next"), function (a) {
    a.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
      if (a.hash && a.pathname === location.pathname) return; // simple ancre sur la même page
      e.preventDefault(); go(a);
    });
  });

  // Retour par l'historique : la page ne doit pas rester transparente (cache de navigation).
  window.addEventListener("pageshow", function (e) {
    leaving = false;
    if (e.persisted) document.documentElement.getAnimations().forEach(function (a) { a.cancel(); });
  });
})();
