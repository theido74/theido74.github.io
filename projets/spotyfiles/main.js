// Ouvre l'ordinateur portable, entre dans son écran, puis fait défiler une
// journée de travail dans le tableau de bord.
// Sans ce script, ou avec les animations réduites, la page reste lisible à plat.
// Si un élément manque ou si la mise en place échoue, la page repasse à plat
// (classe « cine » retirée). Une fois démarré, le script pose window.spotyCineOk :
// sans ce signal, le script du <head> remet la page à plat après trois secondes.
(function () {
  'use strict';

  var racine = document.documentElement;
  if (!racine.classList.contains('cine')) return;

  // Espace insécable : « 8 h 47 » ou « En cours : » ne se coupent jamais.
  var ESPACE = ' ';

  function borne(v) { return Math.min(1, Math.max(0, v)); }
  function segment(p, a, b) { return borne((p - a) / (b - a)); }
  function doux(t) { return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function deuxChiffres(v) { return (v < 10 ? '0' : '') + v; }

  // 527 minutes donnent « 8 h 47 ».
  function formatDuree(minutes) {
    var m = Math.floor(minutes);
    return Math.floor(m / 60) + ESPACE + 'h' + ESPACE + deuxChiffres(m % 60);
  }

  // 90 secondes donnent « 1 min 30 s ».
  function formatSecondes(total) {
    var min = Math.floor(total / 60);
    var s = total % 60;
    if (min === 0) return s + ESPACE + 's';
    if (s === 0) return min + ESPACE + 'min';
    return min + ESPACE + 'min' + ESPACE + s + ESPACE + 's';
  }

  // ---------------------------------------------------------------------
  // Le découpage de la page, en part du défilement (0 à 1).
  // La section .histoire mesure 766vh (526vh sur téléphone, voir style.css) :
  // si on change sa hauteur, ces seuils changent de longueur à l'écran.
  // ---------------------------------------------------------------------
  var ACCROCHE = [0.0086, 0.0595];  // le titre s'efface
  var OUVERTURE = [0.013, 0.1243];  // le capot s'ouvre
  var ENTREE = [0.1384, 0.2216];    // on plonge dans l'écran jusqu'à ce qu'il remplisse tout
  var ARRIVEE = [0.2216, 0.2295];   // l'ordinateur s'efface : la vraie pièce, identique, prend sa place
  var DEBUT_JOURNEE = 0.2432;       // l'horloge de la journée démarre
  var FIN_JOURNEE = 0.915;          // où en est la journée au bas de la section (voir plus bas)

  // ---------------------------------------------------------------------
  // La journée, en part de son propre déroulement (0,125 à FIN_JOURNEE).
  // 17 h 30 tombe à 0,78 et la dernière légende est pleine à 0,796 : le reste,
  // jusqu'à FIN_JOURNEE, laisse environ trois quarts d'écran pour la lire.
  // ---------------------------------------------------------------------
  var RECONNEXION = 0.74;           // le réseau revient
  var DUREE_FRISE = 600;            // de 8 h à 18 h
  var FIN_SOLEIL = 0.78;            // 17 h 30 : le soleil a fini sa course

  // [position, minutes depuis minuit]
  // Chaque légende commence à la position où l'horloge affiche son heure.
  // L'horloge reste sur 8 h 47 le temps que la première légende apparaisse.
  var HORLOGE = [
    [0.125, 527],  // 8 h 47
    [0.141, 527],  // 8 h 47 : la première légende est entièrement affichée
    [0.30, 632],   // 10 h 32
    [0.46, 724],   // 12 h 04
    [0.54, 726],   // 12 h 06 : deux minutes sans activité
    [0.60, 795],   // 13 h 15 : retour de la pause
    [0.63, 920],   // 15 h 20
    [0.78, 1050]   // 17 h 30
  ];

  // Tranches de travail : client, début et fin en minutes depuis minuit.
  var TRANCHES = [
    { client: 'a', de: 527, a: 632 },
    { client: 'b', de: 632, a: 726 }, // les deux minutes sans activité restent comptées (note 1)
    { client: 'a', de: 795, a: 920 },
    { client: 'c', de: 920, a: 1050, horsLigneJusqua: RECONNEXION }
  ];

  // Mêmes noms que dans le tableau de bord de index.html.
  var FICHIERS = {
    bouclement: { nom: 'bouclement_2025.xlsx', client: 'Menuiserie Rochat' },
    salaires: { nom: 'salaires_octobre.xlsx', client: 'Cabinet Favre' },
    tva: { nom: 'TVA_T3_2026.pdf', client: 'Garage du Lac SA' }
  };

  // Légendes : [début, fin] de chacune. Le début est calé sur l'horloge :
  // 8 h 47, 10 h 32, 12 h 04, 15 h 20 et 17 h 30.
  var LEGENDES = [
    [0.125, 0.30],
    [0.30, 0.46],
    [0.46, 0.63],
    [0.63, 0.78],
    [0.78, 1.05]
  ];
  var FONDU = 0.016;

  // ---------------------------------------------------------------------
  // L'ordinateur, en taille réelle (voir style.css).
  // ---------------------------------------------------------------------
  var LARGEUR_ORDI = 1312;
  var HAUTEUR_CAPOT = 832;
  var PROFONDEUR_BASE = 846;
  var LARGEUR_ECRAN = 1280;
  var HAUTEUR_ECRAN = 800;
  var CENTRE_ECRAN = 416;           // du centre de l'écran à la charnière
  var PERSPECTIVE = 2400;           // même valeur que .ordi-monde dans style.css

  var INCLINAISON_FERME = 36;       // vu du dessus quand il est fermé
  var INCLINAISON_OUVERT = 15;      // vu un peu du dessus, écran bien en face
  var PIVOT_FERME = -14;            // légèrement de biais quand il est fermé
  var CAPOT_FERME = -89.5;          // capot à plat sur le clavier

  // Disposition du clavier : largeur relative de chaque touche, par rangée.
  var CLAVIER = [
    { fonctions: true, touches: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { touches: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6] },
    { touches: [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { touches: [1.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7] },
    { touches: [2.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2] },
    { touches: [1, 1, 1, 1.3, 5.6, 1.3, 1, 1, 1] }
  ];

  // ---------------------------------------------------------------------
  // Éléments
  // ---------------------------------------------------------------------
  var histoire = document.querySelector('.histoire');
  var accroche = document.querySelector('.accroche');
  var indice = document.querySelector('.indice');
  var halo = document.querySelector('.scene > .halo');
  var monde = document.querySelector('.ordi-monde');
  var ordi = document.querySelector('.ordi');
  var capot = document.querySelector('.ordi__capot');
  var base = document.querySelector('.ordi__base');
  var bords = document.querySelectorAll('.base__bord');
  var sol = document.querySelector('.ordi__sol');
  var ombreSol = document.querySelector('.ordi__ombre');
  var ombreJour = document.querySelector('.scene > .ombre-jour');
  var aura = document.querySelector('.capot__aura');
  var ecran = document.querySelector('[data-ecran]');
  var reflet = document.querySelector('.base__reflet');
  var refletEcran = document.querySelector('.capot__reflet');
  var fenetre = document.querySelector('.scene > .fenetre');
  var legendes = document.querySelectorAll('.legende');
  var clavier = document.querySelector('[data-clavier]');
  var declaration = document.querySelector('[data-declaration]');
  var phrases = declaration ? declaration.querySelectorAll('span') : [];

  function dansFenetre(selecteur) { return fenetre ? fenetre.querySelector(selecteur) : null; }
  var champHeure = dansFenetre('[data-heure]');
  var champTotal = dansFenetre('[data-total]');
  var champEtat = dansFenetre('[data-etat]');
  var champEtatTexte = dansFenetre('[data-etat-texte]');
  var listeFichiers = dansFenetre('[data-fichiers]');
  var blocsFrise = fenetre ? fenetre.querySelectorAll('[data-frise]') : [];
  var durees = {};
  var barres = {};
  ['a', 'b', 'c'].forEach(function (c) {
    durees[c] = dansFenetre('[data-duree="' + c + '"]');
    barres[c] = dansFenetre('[data-barre="' + c + '"]');
  });
  var MAX_CLIENT = 230; // Menuiserie Rochat, 3 h 50 : la barre la plus longue.

  // ---------------------------------------------------------------------
  // Liens vers la suite de la page : saut direct, sans défilement doux.
  // Sinon, le défilement doux rejouerait toute l'animation avant d'arriver.
  // ---------------------------------------------------------------------
  function sauterVers(destination) {
    var marge = (parseFloat(getComputedStyle(racine).scrollPaddingTop) || 0) +
      (parseFloat(getComputedStyle(destination).scrollMarginTop) || 0);
    var haut = Math.max(0, Math.round(
      destination.getBoundingClientRect().top + window.pageYOffset - marge));
    try {
      window.scrollTo({ top: haut, left: 0, behavior: 'instant' });
    } catch (erreur) {
      // Navigateur qui ne connaît pas « instant » : on coupe le défilement doux un instant.
      var avant = racine.style.scrollBehavior;
      racine.style.scrollBehavior = 'auto';
      window.scrollTo(0, haut);
      racine.style.scrollBehavior = avant;
    }
  }

  function auClicLien(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!racine.classList.contains('cine') || !histoire || !e.target.closest) return;
    var lien = e.target.closest('a[href^="#"]');
    if (!lien) return;
    var id = lien.getAttribute('href').slice(1);
    var destination = id ? document.getElementById(id) : null;
    if (!destination) return;
    // Seules les cibles placées après la section animée sont concernées.
    var place = histoire.compareDocumentPosition(destination);
    if (!(place & Node.DOCUMENT_POSITION_FOLLOWING) || (place & Node.DOCUMENT_POSITION_CONTAINED_BY)) return;

    e.preventDefault();
    sauterVers(destination);
    if (window.history && history.pushState) history.pushState(null, '', '#' + id);
    if (!destination.matches('a[href], button, input, select, textarea, [tabindex]')) {
      destination.setAttribute('tabindex', '-1');
    }
    destination.focus({ preventScroll: true });
  }
  document.addEventListener('click', auClicLien);

  function construireClavier() {
    var cible = clavier;
    CLAVIER.forEach(function (rangee) {
      var r = document.createElement('div');
      r.className = 'rangee' + (rangee.fonctions ? ' rangee--fonctions' : '');
      rangee.touches.forEach(function (largeur) {
        var t = document.createElement('i');
        t.className = 'touche';
        t.style.setProperty('--l', largeur);
        r.appendChild(t);
      });
      cible.appendChild(r);
    });
  }

  // ---------------------------------------------------------------------
  // Le tableau de bord
  // ---------------------------------------------------------------------
  function minutesA(q) {
    var minutes = HORLOGE[0][1];
    for (var i = 0; i < HORLOGE.length - 1; i++) {
      if (q >= HORLOGE[i][0]) {
        minutes = HORLOGE[i][1] + (HORLOGE[i + 1][1] - HORLOGE[i][1]) *
          segment(q, HORLOGE[i][0], HORLOGE[i + 1][0]);
      }
    }
    return minutes;
  }

  var dernierQ = null;
  var dernierEtat = null;
  var dernierTexte = null;
  var derniereListe = null;

  function ecrireEtat(etat, texte) {
    if (etat !== dernierEtat) {
      champEtat.setAttribute('data-etat', etat);
      dernierEtat = etat;
    }
    if (texte !== dernierTexte) {
      champEtatTexte.textContent = texte;
      dernierTexte = texte;
    }
  }

  function ecrireFichiers(cles) {
    var cle = cles.join();
    if (cle === derniereListe) return;
    derniereListe = cle;
    listeFichiers.textContent = '';
    cles.forEach(function (c) {
      var li = document.createElement('li');
      var nom = document.createElement('span');
      var client = document.createElement('small');
      nom.textContent = FICHIERS[c].nom;
      client.textContent = FICHIERS[c].client;
      li.appendChild(nom);
      li.appendChild(client);
      listeFichiers.appendChild(li);
    });
  }

  function dessinerTableau(q) {
    var maintenant = minutesA(q);
    var enLigne = q >= RECONNEXION;

    // Ce que le serveur a reçu : les heures hors ligne n'y sont pas encore.
    var recues = { a: 0, b: 0, c: 0 };
    var enAttente = 0;

    TRANCHES.forEach(function (t, i) {
      var faites = Math.max(0, Math.min(maintenant, t.a) - t.de);
      var bloc = blocsFrise[i];
      var attente = t.horsLigneJusqua !== undefined && !enLigne;

      bloc.style.width = (faites / DUREE_FRISE * 100) + '%';
      bloc.classList.toggle('frise__bloc--attente', attente);

      if (attente) {
        enAttente += faites;
      } else {
        recues[t.client] += faites;
      }
    });

    var total = recues.a + recues.b + recues.c;
    champTotal.textContent = formatDuree(total);
    champHeure.textContent = formatDuree(maintenant);

    ['a', 'b', 'c'].forEach(function (c) {
      durees[c].textContent = formatDuree(recues[c]);
      barres[c].style.width = (recues[c] / MAX_CLIENT * 100) + '%';
    });

    // État de l'agent et derniers fichiers.
    if (q < 0.30) {
      ecrireEtat('actif', 'En cours' + ESPACE + ': ' + FICHIERS.bouclement.nom);
      ecrireFichiers(['bouclement']);
    } else if (q < 0.46) {
      ecrireEtat('actif', 'En cours' + ESPACE + ': ' + FICHIERS.salaires.nom);
      ecrireFichiers(['salaires', 'bouclement']);
    } else if (q < 0.54) {
      var secondes = Math.round((maintenant - 724) * 60);
      ecrireEtat('actif', 'Aucune activité depuis ' + formatSecondes(secondes));
      ecrireFichiers(['salaires', 'bouclement']);
    } else if (q < 0.60) {
      ecrireEtat('pause', 'En pause' + ESPACE + ': le compteur est arrêté');
      ecrireFichiers(['salaires', 'bouclement']);
    } else if (q < 0.63) {
      ecrireEtat('actif', 'En cours' + ESPACE + ': ' + FICHIERS.bouclement.nom);
      ecrireFichiers(['bouclement', 'salaires']);
    } else if (!enLigne) {
      ecrireEtat('hors', 'Hors ligne' + ESPACE + ': ' + formatDuree(enAttente) + ' en attente sur ce poste');
      ecrireFichiers(['bouclement', 'salaires']);
    } else if (q < 0.78) {
      ecrireEtat('actif', 'En ligne' + ESPACE + ': tout est envoyé');
      ecrireFichiers(['tva', 'bouclement', 'salaires']);
    } else {
      ecrireEtat('actif', 'Journée terminée');
      ecrireFichiers(['tva', 'bouclement', 'salaires']);
    }
  }

  // ---------------------------------------------------------------------
  // L'ordinateur
  // ---------------------------------------------------------------------
  var m = {};

  // Rectangle occupé à l'écran par l'ordinateur fermé : applique aux coins la même
  // transformation que le navigateur, perspective comprise.
  function boiteFerme(lv, hv, echelle, charniere) {
    var t = -INCLINAISON_FERME * Math.PI / 180;
    var a = PIVOT_FERME * Math.PI / 180;
    var boite = { gauche: Infinity, droite: -Infinity, haut: Infinity, bas: -Infinity };
    [[-656, -10, 0], [656, -10, 0], [-656, 20, PROFONDEUR_BASE], [656, 20, PROFONDEUR_BASE]].forEach(function (c) {
      // Pivot, puis inclinaison.
      var x = c[0] * Math.cos(a) + c[2] * Math.sin(a);
      var z1 = -c[0] * Math.sin(a) + c[2] * Math.cos(a);
      var y = c[1] * Math.cos(t) - z1 * Math.sin(t);
      var z = c[1] * Math.sin(t) + z1 * Math.cos(t);
      // scale() ne réduit pas la profondeur : z reste en taille réelle ici.
      var f = PERSPECTIVE / (PERSPECTIVE - z);
      var ex = lv / 2 + echelle * x * f;
      var ey = hv / 2 + (charniere + echelle * y - hv / 2) * f;
      boite.gauche = Math.min(boite.gauche, ex);
      boite.droite = Math.max(boite.droite, ex);
      boite.haut = Math.min(boite.haut, ey);
      boite.bas = Math.max(boite.bas, ey);
    });
    return boite;
  }

  // Cherche la plus grande taille qui tient entre le titre et le bas de l'écran.
  function placerFerme(lv, hv, hautLibre, basLibre, echelleMax) {
    var milieu = (hautLibre + basLibre) / 2;
    var marge = 12;
    var echelle = echelleMax;
    var charniere = milieu;
    for (var essai = 0; essai < 60; essai++) {
      // Centre verticalement dans l'espace libre.
      var bas = 0;
      var haut = hv * 2;
      for (var i = 0; i < 24; i++) {
        charniere = (bas + haut) / 2;
        var b = boiteFerme(lv, hv, echelle, charniere);
        if ((b.haut + b.bas) / 2 < milieu) { bas = charniere; } else { haut = charniere; }
      }
      var boite = boiteFerme(lv, hv, echelle, charniere);
      if (boite.bas - boite.haut <= basLibre - hautLibre &&
          boite.gauche >= marge && boite.droite <= lv - marge) {
        break;
      }
      echelle *= 0.97;
    }
    return { echelle: echelle, charniere: charniere };
  }

  function mesurer() {
    var lv = window.innerWidth;
    var hv = window.innerHeight;
    var telephone = lv <= 760;
    var haut = 48; // barre de navigation

    var inclineOuvert = Math.sin(INCLINAISON_OUVERT * Math.PI / 180);

    // Fermé : posé dans l'espace libre entre le titre et le bas de l'écran.
    var hautLibre = accroche.offsetTop + accroche.offsetHeight + 16;
    var basLibre = hv - (getComputedStyle(indice).display === 'none' ? 12 : 38);
    var ferme = placerFerme(lv, hv, hautLibre, basLibre, lv * (telephone ? 0.86 : 0.5) / LARGEUR_ORDI);

    // Ouvert : l'objet entier, centré dans l'écran du navigateur.
    var hauteurOuvert = HAUTEUR_CAPOT + PROFONDEUR_BASE * inclineOuvert;
    var echelleOuvert = Math.min(
      lv * (telephone ? 0.9 : 0.62) / LARGEUR_ORDI,
      (hv - haut) * 0.66 / hauteurOuvert
    );
    var centreEcranOuvert = (hv + haut) / 2 - echelleOuvert * (PROFONDEUR_BASE * inclineOuvert / 2 + 55);

    // Plein écran : l'écran du portable couvre toute la fenêtre.
    var echellePlein = Math.max(lv / LARGEUR_ECRAN, hv / HAUTEUR_ECRAN) * 1.015;

    m = {
      lv: lv,
      hv: hv,
      // La scène elle-même (sans la barre de défilement) : c'est elle que la copie imite.
      ls: monde.clientWidth || lv,
      hs: monde.clientHeight || hv,
      echelleFerme: ferme.echelle,
      charniereFerme: ferme.charniere,
      echelleOuvert: echelleOuvert,
      centreEcranOuvert: centreEcranOuvert,
      echellePlein: echellePlein
    };
    placerCopie();
  }

  // ---------------------------------------------------------------------
  // L'écran du portable montre déjà la pièce telle qu'on la trouvera en y
  // entrant : le fond, la lumière, l'ombre et le tableau de bord d'aujourd'hui
  // à 8 h 47. La copie est réduite et placée de sorte que, l'écran plein,
  // elle tombe exactement sur la vraie scène. Celle-ci prend alors sa place
  // sans que rien ne bouge.
  // ---------------------------------------------------------------------
  var copie = null;       // la pièce miniature dans l'écran
  var pieceCopie = null;  // son fond
  var haloCopie = null;
  var ombreCopie = null;

  // Lumière et ombre de la journée, selon la course du soleil (0 à 1).
  function lumiereDuJour(soleil) {
    var ecartOmbre = Math.min(72, m.lv * 0.05);
    return {
      halo: mix(0.6, 1, Math.sin(soleil * Math.PI)),
      haloTransform: 'translateX(' + ((soleil - 0.5) * 0.36 * m.lv) + 'px)',
      ombreTransform: 'translate(' + ((0.5 - soleil) * 2 * ecartOmbre) + 'px, 26px)'
    };
  }

  function placerCopie() {
    var e = m.echellePlein;
    // Écran plein, son centre est au milieu de la scène, en largeur, et à mi-hauteur
    // de la fenêtre du navigateur. Coin haut gauche de la scène, en pixels de l'écran :
    var x0 = LARGEUR_ECRAN / 2 - m.ls / 2 / e;
    var y0 = HAUTEUR_ECRAN / 2 - m.hv / 2 / e;
    copie.style.width = m.ls + 'px';
    copie.style.height = m.hs + 'px';
    copie.style.transform = 'translate(' + x0 + 'px, ' + y0 + 'px) scale(' + (1 / e) + ')';

    // Le fond de la pièce couvre tout l'écran du portable, même au-delà de ce que la
    // fenêtre du navigateur montrera. Ses éclairages reprennent ceux de body::before,
    // à la même taille et à la même place.
    var dx = x0 * e;
    var dy = y0 * e;
    var hp = parseFloat(getComputedStyle(document.body, '::before').height) || m.hv;
    pieceCopie.style.left = (-dx) + 'px';
    pieceCopie.style.top = (-dy) + 'px';
    pieceCopie.style.width = (LARGEUR_ECRAN * e) + 'px';
    pieceCopie.style.height = (HAUTEUR_ECRAN * e) + 'px';
    pieceCopie.style.setProperty('--grain-place', dx + 'px ' + dy + 'px');
    pieceCopie.style.setProperty('--plafond', (0.85 * m.ls) + 'px ' + (0.65 * hp) + 'px at ' +
      (dx + 0.5 * m.ls) + 'px ' + (dy - 0.06 * hp) + 'px');
    pieceCopie.style.setProperty('--coins', (1.05 * m.ls) + 'px ' + (0.95 * hp) + 'px at ' +
      (dx + 0.5 * m.ls) + 'px ' + (dy + 0.42 * hp) + 'px');

    // La lumière du matin, comme à l'arrivée.
    var matin = lumiereDuJour(0);
    haloCopie.style.opacity = matin.halo;
    haloCopie.style.transform = matin.haloTransform;
    ombreCopie.style.opacity = 1;
    ombreCopie.style.transform = matin.ombreTransform;
  }

  function dessinerOrdi(p, q) {
    var a = doux(segment(p, OUVERTURE[0], OUVERTURE[1]));
    var z = doux(segment(p, ENTREE[0], ENTREE[1]));
    var allume = doux(segment(a, 0.5, 0.92));

    var inclinaison, capotAngle, pivot, echelle, charniere;

    if (z <= 0) {
      inclinaison = mix(INCLINAISON_FERME, INCLINAISON_OUVERT, a);
      capotAngle = mix(CAPOT_FERME, INCLINAISON_OUVERT, a);
      pivot = mix(PIVOT_FERME, 0, a);
      echelle = mix(m.echelleFerme, m.echelleOuvert, a);
      charniere = mix(m.charniereFerme, m.centreEcranOuvert + echelle * CENTRE_ECRAN, a);
    } else {
      // On entre dans l'écran : il reste bien en face et grossit jusqu'à tout couvrir.
      inclinaison = INCLINAISON_OUVERT * (1 - z);
      capotAngle = inclinaison;
      pivot = 0;
      echelle = m.echelleOuvert * Math.pow(m.echellePlein / m.echelleOuvert, z);
      charniere = mix(m.centreEcranOuvert, m.hv / 2, z) + echelle * CENTRE_ECRAN;
    }

    ordi.style.transform = 'translateY(' + charniere + 'px) scale(' + echelle + ') ' +
      'rotateX(' + (-inclinaison) + 'deg) rotateY(' + pivot + 'deg)';
    capot.style.transform = 'rotateX(' + capotAngle + 'deg)';

    // Fermé, l'ordinateur est dans la pénombre. L'écran s'allume et éclaire
    // le clavier, le sol et toute la pièce. Pendant la plongée, tout ce qui
    // appartient au portable (aura, reflets, lumière sur la pièce, ombre au sol)
    // s'efface en douceur : il ne reste que ce que montre l'écran.
    var eteint = 1 - doux(segment(z, 0, 0.5));
    ecran.style.opacity = allume;
    refletEcran.style.opacity = 1 - doux(segment(z, 0.2, 0.9));
    reflet.style.opacity = allume * eteint;
    aura.style.opacity = allume * (1 - doux(segment(z, 0, 0.8)));
    sol.style.opacity = mix(0.22, 1, allume) * eteint;
    ombreSol.style.opacity = eteint;
    var lumiereEcran = mix(0.28, 1, allume) * (1 - doux(segment(z, 0.1, 0.8)));

    // La charnière quitte l'écran : le clavier n'a plus à être dessiné.
    var baseVisible = charniere < m.hv + 40 ? 'visible' : 'hidden';
    base.style.visibility = baseVisible;
    sol.style.visibility = baseVisible;
    ombreSol.style.visibility = baseVisible;
    bords.forEach(function (b) { b.style.visibility = baseVisible; });

    // L'écran remplit tout : derrière lui, la vraie scène est mise en place, identique
    // à ce qu'il montre. L'ordinateur s'efface ensuite : rien ne change à l'œil.
    var dedans = z >= 1;
    var arrivee = doux(segment(p, ARRIVEE[0], ARRIVEE[1]));
    monde.style.opacity = 1 - arrivee;
    monde.style.visibility = arrivee >= 1 ? 'hidden' : 'visible';

    fenetre.style.opacity = dedans ? 1 : 0;
    fenetre.style.visibility = dedans ? 'visible' : 'hidden';

    // Pendant la journée, la lumière va de gauche à droite comme le soleil, plus
    // forte à midi, et l'ombre de la fenêtre tourne du côté opposé.
    var jour = lumiereDuJour(segment(q, 0.125, FIN_SOLEIL));
    halo.style.opacity = dedans ? jour.halo : lumiereEcran;
    halo.style.transform = dedans ? jour.haloTransform : 'none';
    ombreJour.style.opacity = dedans ? 1 : 0;
    ombreJour.style.transform = jour.ombreTransform;
  }

  function dessiner(p) {
    var depart = doux(segment(p, ACCROCHE[0], ACCROCHE[1]));
    accroche.style.opacity = 1 - depart;
    accroche.style.transform = 'translateY(' + (-48 * depart) + 'px)';
    accroche.style.visibility = depart >= 1 ? 'hidden' : 'visible';
    indice.style.opacity = 1 - doux(segment(p, 0, 0.0216));

    // La journée se déroule une fois dans l'écran.
    var q = mix(0.125, FIN_JOURNEE, segment(p, DEBUT_JOURNEE, 1));

    dessinerOrdi(p, q);

    legendes.forEach(function (el, i) {
      var entree = segment(q, LEGENDES[i][0], LEGENDES[i][0] + FONDU);
      var sortie = segment(q, LEGENDES[i][1] - FONDU, LEGENDES[i][1]);
      var o = entree * (1 - sortie);
      el.style.opacity = o;
      el.style.visibility = o > 0 ? 'visible' : 'hidden';
      el.style.transform = 'translateY(' + ((1 - entree) * 16 - sortie * 16) + 'px)';
    });

    // Redessiné à chaque changement, retour en arrière compris : en remontant vers le
    // portable, le tableau revient exactement à 8 h 47, comme sa copie dans l'écran.
    if (q !== dernierQ) {
      dessinerTableau(q);
      dernierQ = q;
    }
  }

  // ---------------------------------------------------------------------
  // Confidentialité : chaque phrase s'allume en arrivant.
  // ---------------------------------------------------------------------
  function eclairer() {
    var vue = window.innerHeight;
    phrases.forEach(function (phrase) {
      var r = phrase.getBoundingClientRect();
      var centre = r.top + r.height / 2;
      phrase.style.opacity = 0.35 + 0.65 * segment(vue * 0.85 - centre, 0, vue * 0.22);
    });
  }

  // ---------------------------------------------------------------------
  // Le rendu rattrape le défilement en douceur, à la même vitesse sur tout PC.
  // ---------------------------------------------------------------------
  var position = 0;
  var cible = 0;
  var enCours = false;
  var dernierInstant = 0;

  function lireCible() {
    var rect = histoire.getBoundingClientRect();
    // Un onglet en arrière-plan peut mesurer 0 : 0/0 bloquerait tout en NaN.
    var course = rect.height - window.innerHeight;
    cible = course > 0 ? borne(-rect.top / course) : 0;
  }

  function boucle(instant) {
    if (abandonne) return;
    var ecart = cible - position;
    if (Math.abs(ecart) < 0.0002) {
      position = cible;
      enCours = false;
      dernierInstant = 0;
      dessiner(position);
      return;
    }
    var ecoule = dernierInstant ? Math.min(instant - dernierInstant, 200) : 16;
    dernierInstant = instant;
    position += ecart * (1 - Math.pow(0.86, ecoule / 16.67));
    dessiner(position);
    requestAnimationFrame(boucle);
  }

  function auDefilement() {
    lireCible();
    eclairer();
    if (!enCours) {
      enCours = true;
      requestAnimationFrame(boucle);
    }
  }

  function auRedimensionnement() {
    lireCible();
    position = cible;
    mesurer();
    dessiner(position);
    eclairer();
  }

  // ---------------------------------------------------------------------
  // Repli : en cas de problème, la page repasse à plat.
  // ---------------------------------------------------------------------
  var abandonne = false;
  var ecouteurs = [];
  var tableauOriginal = fenetre ? fenetre.innerHTML : null;

  function ecouter(cibleEvenement, type, fonction, options) {
    cibleEvenement.addEventListener(type, fonction, options);
    ecouteurs.push([cibleEvenement, type, fonction, options]);
  }

  function abandonner(erreur) {
    if (abandonne) return;
    abandonne = true;
    ecouteurs.forEach(function (e) { e[0].removeEventListener(e[1], e[2], e[3]); });
    racine.classList.remove('cine');
    // Efface ce que l'animation a posé, pour que la lecture à plat soit propre.
    try {
      if (tableauOriginal !== null) fenetre.innerHTML = tableauOriginal;
      if (copie && copie.parentNode) copie.parentNode.removeChild(copie);
      if (clavier) clavier.textContent = '';
      var touches = [accroche, indice, halo, monde, ordi, capot, base, sol, ombreSol,
        ombreJour, aura, ecran, reflet, refletEcran, fenetre]
        .concat(Array.prototype.slice.call(bords))
        .concat(Array.prototype.slice.call(legendes))
        .concat(Array.prototype.slice.call(phrases));
      touches.forEach(function (el) { if (el) el.removeAttribute('style'); });
    } catch (e) { /* la classe « cine » est déjà retirée : c'est l'essentiel */ }
    if (erreur && window.console && console.error) {
      console.error('Spotyfiles : animation désactivée, la page reste lisible à plat.', erreur);
    }
  }

  // Une erreur pendant le défilement arrête l'animation au lieu de la figer.
  function protege(fonction) {
    return function () {
      if (abandonne) return;
      try {
        fonction.apply(this, arguments);
      } catch (erreur) {
        abandonner(erreur);
      }
    };
  }

  // ---------------------------------------------------------------------
  // Mise en place
  // ---------------------------------------------------------------------
  var requis = [histoire, accroche, indice, halo, monde, ordi, capot, base, sol, ombreSol,
    ombreJour, aura, ecran, reflet, refletEcran, fenetre, clavier, declaration, champHeure,
    champTotal, champEtat, champEtatTexte, listeFichiers,
    durees.a, durees.b, durees.c, barres.a, barres.b, barres.c];
  var complet = requis.every(function (el) { return !!el; }) &&
    legendes.length === LEGENDES.length &&
    blocsFrise.length === TRANCHES.length &&
    bords.length > 0;

  if (!complet) {
    abandonner(new Error('élément manquant dans la page'));
    return;
  }

  try {
    construireClavier();

    // Le tableau de bord est d'abord dessiné à 8 h 47, puis copié avec la lumière et
    // l'ombre dans l'écran du portable (voir placerCopie). La copie ne change plus :
    // la vraie fenêtre est dans le même état quand elle prend sa place.
    dessinerTableau(0.125);
    dernierQ = 0.125;
    copie = document.createElement('div');
    copie.className = 'ecran__scene';
    pieceCopie = document.createElement('div');
    pieceCopie.className = 'ecran__piece';
    copie.appendChild(pieceCopie);
    haloCopie = halo.cloneNode(true);
    ombreCopie = ombreJour.cloneNode(true);
    var fenetreCopie = fenetre.cloneNode(true);
    fenetreCopie.classList.add('fenetre--copie');
    [haloCopie, ombreCopie, fenetreCopie].forEach(function (el) {
      el.removeAttribute('style');
      copie.appendChild(el);
    });
    ecran.appendChild(copie);

    var defilementProtege = protege(auDefilement);
    var redimensionnementProtege = protege(auRedimensionnement);
    boucle = protege(boucle);

    ecouter(window, 'scroll', defilementProtege, { passive: true });
    ecouter(window, 'resize', redimensionnementProtege);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(redimensionnementProtege);
    }

    auRedimensionnement();
    window.spotyCineOk = true;
  } catch (erreur) {
    abandonner(erreur);
  }
})();
