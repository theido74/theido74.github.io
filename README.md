# Portfolio de GeLeprechaun
Site statique (HTML, CSS, JS vanilla, canvas et SVG), sans build, sans dépendance et sans ressource externe. Publié par GitHub Pages.
Aperçu local : `python3 -m http.server` à la racine, puis `http://localhost:8000/`. Tous les chemins sont relatifs.

## Le hub (`index.html`)
Thème sombre « éditeur de code » : graphe de projets reliés à leurs technologies (canvas), terminal interactif, filtres animés par catégorie et par technologie, cartes avec aperçu animé. Avec `prefers-reduced-motion`, tout reste présent mais figé ; sans JavaScript, la liste complète est dans le bloc `<noscript>`.

| Fichier | Rôle |
|---|---|
| `assets/projects.js` | Les données : `PROJECTS`, `CATEGORIES`, `CONTACT_EMAIL` (null = pas de lien e-mail) |
| `assets/hub.css` | Style du hub. Les couleurs `--c-<catégorie>` servent aussi au graphe et aux aperçus |
| `assets/core.js` | Données dérivées et état des filtres, partagé par la grille, le graphe et le terminal |
| `assets/graph.js` | Constellation (simulation de forces, pause hors écran ou onglet masqué) |
| `assets/terminal.js` | Terminal : `help`, `ls [filtre]`, `cat about`, `cat <projet>`, `open <projet>`, `categories`, `techs`, `stats`, `contact`, `clear` |
| `assets/previews.js` | Un petit SVG animé par projet (les animations `a-*` sont dans `hub.css`) |
| `assets/app.js` | Cartes, filtres, compteurs, démarrage |
| `assets/fonts/` | Noto Sans Mono (woff2 latin, licence OFL dans `OFL.txt`) |
| `assets/style.css` | Ancien style, encore chargé par certaines pages projet non migrées. À supprimer quand plus aucune page ne le référence |

Un `<meta http-equiv="Content-Security-Policy">` limite le hub à ses propres fichiers. Il contient le hachage SHA-256 du petit script en ligne de `<head>` : si ce script change, recalculer le hachage.

## Ajouter un projet
1. Ajouter un objet à `PROJECTS` dans `assets/projects.js` : `id`, `title`, `desc`, `category` (un `id` de `CATEGORIES`), `tech`, `visibility`, `repo`, `page` (`"projets/<id>/"`, ou `null` sans page), et `org` (facultatif, ex. `"ESIG"` pour un projet de formation : badge sur la carte, puce de filtre, losange dans le graphe, `ls esig` dans le terminal).
   Un projet `visibility:"private"` n'affiche jamais de lien de dépôt : `repo:null`.
2. Ajouter son aperçu animé dans `assets/previews.js` (sinon une icône générique s'affiche).
3. Ajouter sa ligne dans le bloc `<noscript>` de `index.html` (liste de secours sans JavaScript).
4. Créer sa page `projets/<id>/index.html` avec le shell ci-dessous, et l'insérer dans l'ordre précédent/suivant.

### Règles pour un projet privé
- Aucun lien ni URL vers le dépôt, aucun chemin de fichier interne.
- Aucun nom de client, d'école ou de personne, aucun prix ni plan commercial.
- Aucun secret, clé, identifiant, adresse ou extrait de configuration.
- Si le dépôt n'a pas de README, décrire seulement ce que prouve sa structure et ajouter un commentaire `<!-- À CONFIRMER -->`.

## Le shell commun des pages projet
Chaque page projet a sa propre identité visuelle, mais charge **en premier** le shell, puis ses propres styles :

```html
<link rel="stylesheet" href="../../assets/shell.css">
<script src="../../assets/shell.js" defer></script>   <!-- facultatif -->
```

Structure à placer dans `<body>` (contrat fixe) :

```html
<a class="shell-skip" href="#main">Aller au contenu</a>
<header class="shell-bar">
  <a class="shell-home" href="../../">GeLeprechaun</a>
  <nav class="shell-nav" aria-label="Projets">
    <a class="shell-prev" href="../<id-prec>/" rel="prev">Précédent</a>
    <a class="shell-all" href="../../#projets">Tous les projets</a>
    <a class="shell-next" href="../<id-suiv>/" rel="next">Suivant</a>
  </nav>
</header>
<main id="main"> … contenu libre de la page … </main>
<footer class="shell-foot">
  <a href="../../">← Portfolio</a> · <a href="https://github.com/theido74">GitHub</a>
</footer>
```

- `shell.css` ne style que les classes `.shell-*` : aucun sélecteur global (`body`, `*`, `html`, `a`, `:root`). Ses variables sont préfixées `--shell-*` et déclarées sur `.shell-bar` et `.shell-foot`. La barre est sombre, translucide et collée en haut, lisible sur n'importe quel fond.
- `shell.js` est facultatif et la page fonctionne sans lui : flèches ← et → pour passer au projet précédent ou suivant (sauf dans un champ de saisie ou un composant à flèches), et fondu de sortie, désactivé avec `prefers-reduced-motion`.
- Ordre circulaire précédent/suivant (le dernier renvoie au premier) :
  `spotyfiles` → `pokemonbot` → `skills-agents` → `password-analyzer` → `entrainement-abdd` → `streeteye` → `chatapp` → `dmob` → `image-scanner` → `neworcinvasion` → `nimgame` → `esig-individuel` → `esig-weba` → `esig-apo` → `esig-inlo` → retour à `spotyfiles`.
- `bots-telegram/` (page à part, avec son style) et `flipper-keymanager` (vitrine finale) ne font pas partie de cet ordre. Avec 15 pages, un nouveau projet s'insère entre deux voisins : mettre à jour leurs liens et les siens.
- Les pages projet doivent aussi se tenir seules : `<title>`, `description`, `og:*`, `lang="fr"`, balise `viewport`, favicon `../../assets/favicon.svg`.

## Page `bots-telegram/`
Elle garde son apparence d'origine : `bots-telegram/base.css` est une copie de l'ancien `assets/style.css`, chargée avant `bots-telegram/style.css`.
