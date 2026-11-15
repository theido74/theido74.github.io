// Calculateur de tarif : le nombre de postes donne le prix par an.
// Les options sur mesure sont seulement indiquées dans la page, hors calcul.
// Indépendant de l'animation : il fonctionne aussi chez les visiteurs qui ont désactivé les animations.
(function () {
  'use strict';

  // CHF par poste, par an. C'est le seul endroit à modifier en JavaScript ;
  // les textes affichés aux visiteurs sont dans index.html.
  var PRIX_POSTE = 180;
  // Au-delà du curseur, le champ accepte encore des postes, jusqu'à cette limite.
  var LIMITE = 10000;

  var racine = document.querySelector('[data-calculateur]');
  if (!racine) return;

  var champ = racine.querySelector('#choix-postes');
  var curseur = racine.querySelector('[data-curseur]');
  var boutonMoins = racine.querySelector('[data-moins]');
  var boutonPlus = racine.querySelector('[data-plus]');
  var champLibelle = racine.querySelector('[data-libelle]');
  var champTotal = racine.querySelector('[data-total]');
  var totalCourt = racine.querySelector('[data-total-court]');
  var boutonDevis = racine.querySelector('[data-devis]');
  var annonce = racine.querySelector('[data-annonce]');
  var auDela = racine.querySelector('[data-au-dela]');
  var lienContact = document.querySelector('.contact__mail');

  var MIN = Number(champ.min) || 1;
  // Le curseur s'arrête à 500 ; au-delà, seul le champ va plus loin.
  var MAX_CURSEUR = Number(curseur.max) || 500;
  var ESPACE = ' '; // insécable : un montant ne se coupe jamais en deux

  function francs(montant) {
    return String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE);
  }
  function chf(montant) {
    return 'CHF' + ESPACE + francs(montant);
  }
  function nombreDePostes(n) {
    return francs(n) + ESPACE + (n > 1 ? 'postes' : 'poste');
  }
  // Dans un e-mail, les espaces insécables deviennent parfois « Â » : espaces normales.
  function sansInsecable(texte) {
    return texte.replace(/ /g, ' ');
  }

  // Lit le champ comme un vrai nombre, arrondi : « 2.7 » donne 3, « 1e3 » donne 1000.
  // Renvoie null si le champ est vide, invalide ou inférieur au minimum.
  function lire() {
    var texte = String(champ.value).trim();
    if (texte === '') return null;
    var v = Math.round(Number(texte));
    if (!isFinite(v) || v < MIN) return null;
    return Math.min(LIMITE, v);
  }

  // Dernier nombre de postes valable : sert pendant la frappe et pour les boutons.
  var postesValides = lire() || MIN;
  var minuterieAnnonce = null;

  function calculer() {
    var lu = lire();
    if (lu !== null) postesValides = lu;
    var postes = postesValides;
    var parAn = postes * PRIX_POSTE;

    champLibelle.textContent = nombreDePostes(postes) + ' à ' + chf(PRIX_POSTE);
    champTotal.textContent = francs(parAn);
    totalCourt.textContent = chf(parAn);

    var surCurseur = Math.min(postes, MAX_CURSEUR);
    curseur.value = surCurseur;
    curseur.style.setProperty('--rempli', ((surCurseur - MIN) / (MAX_CURSEUR - MIN) * 100) + '%');
    if (auDela) auDela.hidden = postes <= MAX_CURSEUR;
    boutonMoins.setAttribute('aria-disabled', String(postes <= MIN));
    boutonPlus.setAttribute('aria-disabled', String(postes >= LIMITE));

    // Le bouton prépare un e-mail déjà rempli, adressé au contact de la page.
    if (lienContact) {
      var adresse = lienContact.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      var corps = [
        'Bonjour,', '',
        'Je souhaite un devis pour Spotyfiles :',
        '- ' + nombreDePostes(postes) + ' : ' + chf(parAn) + ' par an', '',
        'Entreprise :',
        'Ce que nous aimerions ajouter ou adapter :'
      ];
      boutonDevis.setAttribute('href', 'mailto:' + adresse +
        '?subject=' + encodeURIComponent('Spotyfiles : demande de devis') +
        '&body=' + encodeURIComponent(sansInsecable(corps.join('\r\n'))));
    }

    // Annonce le total aux lecteurs d'écran, une fois le réglage terminé.
    clearTimeout(minuterieAnnonce);
    minuterieAnnonce = setTimeout(function () {
      annonce.textContent = nombreDePostes(postes) + ' : ' + chf(parAn) + ' par an.';
    }, 500);
  }

  function changer(ecart) {
    var depart = lire();
    if (depart === null) depart = postesValides;
    champ.value = Math.min(LIMITE, Math.max(MIN, depart + ecart));
    calculer();
  }
  boutonMoins.addEventListener('click', function () { changer(-1); });
  boutonPlus.addEventListener('click', function () { changer(1); });

  // Pendant la frappe, un champ vide ou invalide garde la dernière valeur valable.
  champ.addEventListener('input', calculer);
  // En quittant le champ, sa valeur redevient un nombre entier permis.
  champ.addEventListener('change', function () {
    calculer();
    champ.value = postesValides;
  });

  curseur.addEventListener('input', function () {
    champ.value = curseur.value;
    calculer();
  });

  // Sur téléphone, la pastille du total fait doublon avec le récapitulatif :
  // elle s'efface dès que le montant du récapitulatif est à l'écran.
  var pastille = racine.querySelector('.options__total');
  var resume = racine.querySelector('.resume__total') || racine.querySelector('.resume');
  if (pastille && resume && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entrees) {
      pastille.classList.toggle('options__total--cache', entrees[0].isIntersecting);
    }).observe(resume);
  }

  // De base, seul le prix par poste s'affiche. Modifier ouvre la personnalisation,
  // sans perdre le réglage si on la referme.
  var boutonModifier = document.querySelector('[data-modifier]');
  var personnalisation = document.getElementById('personnalisation');

  boutonModifier.addEventListener('click', function () {
    var ouvrir = personnalisation.hidden;
    personnalisation.hidden = !ouvrir;
    boutonModifier.setAttribute('aria-expanded', String(ouvrir));
    boutonModifier.textContent = ouvrir ? 'Fermer' : 'Calculer pour mon équipe';
    // Fait défiler juste ce qu'il faut pour que la personnalisation soit visible.
    if (ouvrir) personnalisation.scrollIntoView({ block: 'nearest' });
  });

  calculer();
})();
