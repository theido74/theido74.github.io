/* Projet individuel : tampons à l'arrivée des planches et filtre des cas. */
(function () {
  'use strict';

  var body = document.body;
  var board = document.getElementById('ie-board');
  var meter = document.getElementById('ie-meter');
  if (!board) return;

  // Retard de chaque tampon dans sa planche
  Array.prototype.forEach.call(board.querySelectorAll('.ie-sheet'), function (sheet) {
    Array.prototype.forEach.call(sheet.querySelectorAll('.ie-stamp'), function (s, k) { s.style.setProperty('--k', String(k)); });
  });
  Array.prototype.forEach.call(meter.querySelectorAll('.ie-meter__bar li'), function (li, k) { li.style.setProperty('--k', String(k)); });

  // Sans JavaScript tout reste visible ; la mise en scène n'existe qu'avec lui.
  body.classList.add('ie-js');

  var targets = Array.prototype.slice.call(board.querySelectorAll('.ie-sheet')).concat([meter]);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('is-in'); });
  }

  // Filtre : Tout, Retrouvé dans le code, Non retrouvé
  var chips = Array.prototype.slice.call(document.querySelectorAll('.ie-chip'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-f');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      Array.prototype.forEach.call(board.querySelectorAll('.ie-case'), function (li) {
        var s = li.getAttribute('data-s');
        li.hidden = !(f === 'all' || s === f);
      });
      // Une planche sans cas visible disparaît entièrement
      Array.prototype.forEach.call(board.querySelectorAll('.ie-sheet'), function (sheet) {
        var any = sheet.querySelector('.ie-case:not([hidden])');
        sheet.hidden = !any;
      });
    });
  });
})();
