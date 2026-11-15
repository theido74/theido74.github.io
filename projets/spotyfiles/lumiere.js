// La lumière qui suit le curseur sur les cartes. Une seule source pour toutes :
// chaque carte reçoit la position du curseur, même s'il est sur sa voisine.
// Sans souris, ou avec les animations réduites, les cartes restent éclairées par le haut.
(function () {
  'use strict';

  var souris = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!souris || calme || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('lumiere');

  var visibles = new Set();
  var x = 0;
  var y = 0;
  var prevu = false;

  function dessiner() {
    prevu = false;
    visibles.forEach(function (carte) {
      var r = carte.getBoundingClientRect();
      carte.style.setProperty('--x', (x - r.left) + 'px');
      carte.style.setProperty('--y', (y - r.top) + 'px');
    });
  }

  function prevoir() {
    if (prevu || visibles.size === 0) return;
    prevu = true;
    requestAnimationFrame(dessiner);
  }

  // Seules les cartes à l'écran sont mesurées : l'animation du haut de page n'en paie rien.
  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (entree.isIntersecting) {
        visibles.add(entree.target);
      } else {
        visibles.delete(entree.target);
      }
    });
    prevoir();
  });
  document.querySelectorAll('.carte, .option, .resume').forEach(function (carte) {
    observateur.observe(carte);
  });

  window.addEventListener('pointermove', function (e) {
    x = e.clientX;
    y = e.clientY;
    prevoir();
  }, { passive: true });
  window.addEventListener('scroll', prevoir, { passive: true });
})();
