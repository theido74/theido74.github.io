# Fliiper Keys — Mode d'emploi

Fliiper Keys transforme ton Flipper Zero en **clavier USB qui tape tes mots de
passe**. Tes mots de passe sont rangés dans un coffre chiffré (`vault.fkm`) sur
la carte SD. Tu choisis un compte sur le Flipper, et il tape le mot de passe
sur ton ordinateur comme si tu le tapais toi‑même.

> Usage prévu : taper **tes propres** mots de passe sur **tes propres**
> machines.

---

## Sommaire

1. [Principe en 30 secondes](#1-principe-en-30-secondes)
2. [Ce qu'il te faut](#2-ce-quil-te-faut)
3. [Installation sur le PC (une seule fois)](#3-installation-sur-le-pc-une-seule-fois)
4. [Compiler et installer l'app sur le Flipper](#4-compiler-et-installer-lapp-sur-le-flipper)
5. [Créer ton coffre de mots de passe](#5-créer-ton-coffre-de-mots-de-passe)
6. [Copier le coffre sur le Flipper](#6-copier-le-coffre-sur-le-flipper)
7. [Utiliser l'app au quotidien](#7-utiliser-lapp-au-quotidien)
8. [⚠️ Choisir la disposition du clavier du PC](#8-️-choisir-la-disposition-du-clavier-du-pc-suisse-français)
9. [Modifier le coffre (ajouter, changer, supprimer)](#9-modifier-le-coffre-ajouter-changer-supprimer)
10. [Messages affichés et dépannage](#10-messages-affichés-et-dépannage)
11. [Bonnes pratiques de sécurité](#11-bonnes-pratiques-de-sécurité)
12. [Limites actuelles](#12-limites-actuelles)
13. [Aide‑mémoire](#13-aide-mémoire)

---

## 1. Principe en 30 secondes

```
 PC (Linux)                         Flipper Zero
 ───────────                        ─────────────
 accounts.txt  ──fkm_vault.py──▶  vault.fkm (chiffré)  ──▶ carte SD
                                         │
                       phrase de passe ──▶ déchiffrement en mémoire
                                         │
                          liste des domaines (jamais les mots de passe)
                                         │
             tu choisis « github.com » ──▶ le Flipper devient un clavier USB
                                         │
 champ « mot de passe » du PC ◀── frappe des touches, une par une
```

Point important : le Flipper **ne sait pas** où est le champ mot de passe. Il
tape des touches, c'est tout. **Clique d'abord dans le champ** sur le PC, puis
lance la frappe sur le Flipper.

---

## 2. Ce qu'il te faut

| Élément | Remarque |
|---|---|
| Flipper Zero avec carte microSD | firmware officiel à jour conseillé |
| Câble USB‑C **de données** | un câble « charge seule » ne marche pas |
| PC Linux (ton ThinkPad) | pour compiler l'app et créer le coffre |
| Python 3 + `cryptography` | déjà présent sur ta machine (version 46) |
| `ufbt` | outil officiel de compilation des apps Flipper |
| Une icône `icons/keys_10px.png` | 10×10 px, noir et blanc — déjà fournie (une clé), voir §4.1 |

---

## 3. Installation sur le PC (une seule fois)

Ouvre un terminal dans le dossier du projet :

```bash
cd ~/Documents/fliiper_keysManager
```

### 3.1 Installer ufbt

Sur Linux Mint 22, `pip install` hors environnement virtuel est bloqué par le
système. Utilise `pipx` (déjà installé) :

```bash
pipx install ufbt
ufbt update            # télécharge le SDK correspondant au firmware « release »
```

Si ton Flipper est sur un autre canal (rc / dev) : `ufbt update --channel=dev`.

### 3.2 Récupérer les briques de chiffrement

L'app utilise deux petites bibliothèques C du domaine public (AES et SHA‑256),
téléchargées dans `src/vendor/` :

```bash
bash tools/fetch_deps.sh
```

Tu dois voir apparaître `aes.c`, `aes.h`, `sha256.c`, `sha256.h`.

### 3.3 Vérifier le chiffrement (facultatif, 5 secondes)

```bash
tests/run_host_tests.sh
```

La dernière ligne doit être `ALL PASSED (0 failure(s))`. Ce test vérifie que
l'app et l'outil PC chiffrent exactement de la même façon.

### 3.4 Accès au port USB (si `ufbt` ne trouve pas le Flipper)

Si `ufbt launch` dit qu'il ne trouve pas d'appareil ou « permission denied » :

```bash
! sudo usermod -aG dialout $USER
```

puis ferme ta session et reconnecte‑toi.

---

## 4. Compiler et installer l'app sur le Flipper

### 4.1 L'icône

Le manifeste `application.fam` attend `icons/keys_10px.png` : une petite clé
est fournie. Pour la remplacer, dessine une icône 10×10 px, 1 bit (noir =
pixel allumé), par exemple dans GIMP (Image → Mode → Indexé, 1 bit), et
enregistre‑la sous le même nom.

### 4.2 Compiler et lancer

1. Branche le Flipper en USB, déverrouillé, sur l'écran d'accueil.
2. **Ferme qFlipper** s'il est ouvert (il bloque le port série).
3. Lance :

```bash
ufbt launch
```

`ufbt` compile, copie l'app sur la carte SD et la démarre. Le fichier compilé
se trouve aussi dans `dist/fliiper_keys.fap`.

Ensuite, tu retrouves l'app sur le Flipper dans **Apps → Tools → Fliiper Keys**.

> Alternative sans `ufbt launch` : copie `dist/fliiper_keys.fap` dans
> `apps/Tools/` sur la carte SD (avec qFlipper ou un lecteur de carte).

---

## 5. Créer ton coffre de mots de passe

### 5.1 Écrire la liste en clair… en mémoire vive

Le fichier en clair est **le moment le plus sensible**. Crée‑le dans `/dev/shm`
(un dossier en RAM, jamais écrit sur le disque) plutôt que dans le projet :

```bash
nano /dev/shm/accounts.txt
```

Format : **une ligne par compte**, `domaine:motdepasse`.

```
# Les lignes qui commencent par # sont ignorées
# Les lignes vides aussi
github.com:Mon-Mot-De-Passe-42
mail.ch:pa:ss:word
banque perso:Xk8.qw-ErT
```

Règles :

- le **premier** `:` sépare le domaine du mot de passe. Le mot de passe peut
  donc contenir des `:` (`mail.ch:pa:ss:word` → mot de passe `pa:ss:word`) ;
  le domaine, lui, ne doit **pas** en contenir ;
- le « domaine » est juste l'étiquette affichée sur le Flipper : tu peux écrire
  ce que tu veux (`github.com`, `PC bureau`, `NAS`…). Reste court, l'écran est
  petit ;
- une ligne sans `:` est ignorée ;
- **pas d'accents ni de caractères spéciaux hors ASCII** dans les mots de passe
  (é, à, ü, €, £…) : ils seraient **sautés** à la frappe, sans message d'erreur ;
- règle la disposition du clavier du PC dans l'app (§8) avant le premier usage.

### 5.2 Choisir la phrase de passe du coffre

Tu la taperas **sur le clavier à l'écran du Flipper**, avec les flèches. Donc :

- 64 caractères maximum ;
- préfère **lettres et chiffres** (les symboles disponibles dépendent de la
  version du firmware : vérifie sur ton Flipper que tu peux taper chaque
  caractère *avant* de chiffrer le coffre) ;
- longue mais tapable : **au moins 5 mots tirés au hasard** (pas une phrase
  connue), par exemple `velo7Tulipe3Orage9PainCrabe`. C'est elle qui fait
  l'essentiel de la sécurité, car le Flipper ne peut pas se permettre un
  calcul de clé très lourd ;
- note‑la dans un endroit sûr : **sans elle, le coffre est perdu**.

### 5.3 Chiffrer

```bash
python3 tools/fkm_vault.py encrypt /dev/shm/accounts.txt vault.fkm
```

Le script demande la phrase de passe deux fois (rien ne s'affiche quand tu
tapes, c'est normal), puis écrit `vault.fkm`.

Option : `--iterations N` règle la « difficulté » du calcul de la clé (de
10 000 à 1 000 000, 50 000 par défaut). Plus c'est haut, plus une attaque par
force brute est lente… mais plus le Flipper met de temps à ouvrir le coffre
(estimation : quelques secondes à 50 000, à mesurer sur ton appareil). Le
nombre choisi est enregistré dans le fichier, l'app s'y adapte toute seule.
Si l'attente te convient après un essai, `--iterations 100000` double la
résistance à la force brute.

### 5.4 Vérifier, puis détruire le clair

```bash
python3 tools/fkm_vault.py decrypt vault.fkm    # réaffiche la liste en clair
clear                                           # efface l'écran du terminal
shred -u /dev/shm/accounts.txt                  # détruit le fichier en clair
```

- Si la liste réapparaît correctement : le coffre est bon.
- Si tu vois `Wrong passphrase or damaged file.` : mauvaise phrase de passe
  (ou fichier abîmé).

> `vault.fkm` et `accounts*.txt` sont exclus de git (`.gitignore`). Ne les
> envoie jamais par mail, cloud ou messagerie en clair.

---

## 6. Copier le coffre sur le Flipper

Le fichier doit être exactement ici sur la carte SD :

```
/ext/apps_data/fliiper_keys/vault.fkm
```

(avec un lecteur de carte, le chemin est `apps_data/fliiper_keys/vault.fkm` à
la racine de la carte).

Trois façons de faire :

**a) qFlipper** (le plus simple) : onglet *File manager* → `SD Card` →
`apps_data` → crée le dossier `fliiper_keys` s'il n'existe pas → glisse
`vault.fkm` dedans.

**b) Lecteur de carte** : éteins le Flipper, sors la microSD, copie le fichier
au bon endroit, remets la carte.

**c) En ligne de commande** avec ufbt (Flipper branché, qFlipper fermé) :

```bash
ufbt cli
# puis dans la console du Flipper :
storage mkdir /ext/apps_data/fliiper_keys
```

et copie le fichier avec qFlipper ou le lecteur de carte.

Ensuite, garde une **copie de sauvegarde** de `vault.fkm` sur ton PC (elle est
chiffrée) et supprime celle du dossier projet si tu ne veux pas l'y laisser.

---

## 7. Utiliser l'app au quotidien

### Boutons du Flipper

| Bouton | Effet |
|---|---|
| ↑ ↓ ← → | se déplacer |
| ● (OK, centre) | valider / choisir |
| ↩ (Retour) | revenir / quitter |

### Pas à pas

1. **Sur le PC** : ouvre la page de connexion et **clique dans le champ mot de
   passe** (le curseur doit clignoter dedans).
2. **Sur le Flipper** : *Apps → Tools → Fliiper Keys*.
3. Écran **« Vault passphrase »** : tape ta phrase de passe avec le clavier à
   l'écran, puis valide (touche « Save » / ✓ en bas à droite du clavier).
   L'écran **« Unlocking... »** s'affiche quelques secondes pendant le calcul
   de la clé. Si la phrase est fausse : **« Wrong passphrase »**, appuie sur
   Retour pour la retaper.
4. Écran **« Select account »** : la liste de tes domaines apparaît (la
   ligne `[+ Generate password]` crée un mot de passe, voir §9.1 ; la dernière,
   `[Layout: …]`, sert à choisir le clavier du PC, voir §8). Choisis le
   compte avec ↑ ↓ et appuie sur **OK**.
5. Branche le Flipper en USB sur le PC si ce n'est pas déjà fait. L'écran
   affiche **« Typing over USB... »** : le Flipper se présente comme un clavier
   et tape le mot de passe.
6. L'écran affiche **« Typed. »** : c'est fait. Appuie toi‑même sur **Entrée**
   sur le PC (l'app ne valide pas le formulaire à ta place).
7. **Retour** ramène à la liste (pour taper un autre mot de passe).
8. **Retour** depuis la liste **quitte l'app** et efface les mots de passe de la
   mémoire.

### À savoir

- Le Flipper bascule son USB en mode clavier **pendant 1 à 3 secondes**, puis
  revient à son mode normal. Si qFlipper ou `ufbt cli` est connecté, la
  connexion est coupée pendant ce temps : c'est normal.
- La première fois, l'ordinateur peut mettre un peu de temps à reconnaître le
  « nouveau clavier ». Si l'écran affiche « USB host not ready », recommence
  simplement (voir §10).
- Les mots de passe **ne sont jamais affichés** sur le Flipper, seuls les
  domaines le sont.
- La phrase de passe est effacée de la mémoire juste après le déchiffrement.
  En cas d'erreur, **Retour** ramène à la saisie, avec un champ vide.
- Le coffre est vérifié (contrôle d'intégrité) **avant** d'être déchiffré :
  avec une mauvaise phrase de passe, rien n'est déchiffré et rien n'est tapé.

---

## 8. ⚠️ Choisir la disposition du clavier du PC (suisse, français…)

Le Flipper n'envoie pas des lettres mais des **positions de touches** : c'est
le PC qui les traduit selon **sa** disposition de clavier. Il faut donc dire à
l'app quelle disposition utilise le PC, sinon un PC suisse reçoit `z` à la
place de `y` et des symboles faux.

### Régler la disposition (une seule fois)

1. Déverrouille le coffre comme d'habitude.
2. Tout en bas de la liste des comptes : **`[Layout: en-US]`** → OK.
3. Choisis la disposition de **ton PC** :
   - Suisse romand : **`fr-CH`**
   - Suisse alémanique : **`de-CH`** (même table que fr-CH pour les caractères
     ASCII)
   - France : `fr-FR` ; Belgique : `fr-BE` ; US : `en-US (built-in)`.
4. L'app revient à la liste, qui affiche `[Layout: fr-CH]`. Le choix est
   **enregistré** sur la carte SD (`apps_data/fliiper_keys/layout.txt`) et
   repris au prochain lancement.

Les dispositions proviennent du dossier BadUSB du firmware :
`/ext/badusb/assets/layouts/*.kl`. Elles sont installées avec le firmware
officiel (via qFlipper). **Si la liste ne montre que `en-US (built-in)`**, ce
dossier manque : mets à jour le firmware avec qFlipper (*Install from file* ou
mise à jour normale), ou copie `fr-CH.kl` dans ce dossier.

> La disposition choisie doit correspondre au **PC**, pas au Flipper. Si tu
> passes d'un PC suisse à un PC américain, change‑la.

### Ce que l'app sait taper avec fr-CH

- toutes les lettres, chiffres et symboles ASCII, y compris ceux qui demandent
  **AltGr** sur un clavier suisse : `@ # | ~ [ ] { } \` ;
- les **touches mortes** `^`, `` ` `` et `~` : sur un clavier suisse, elles
  attendent la lettre suivante (`^` puis `a` → `â`). L'app envoie
  automatiquement un **Espace** juste après, ce qui donne le caractère seul.
  Exception : si ton PC utilise la variante « sans touches mortes »
  (*Suisse — français, sans touches mortes*), cet espace en trop finira dans le
  mot de passe ; évite alors ces trois caractères, ou repasse à la variante
  normale.

### Ce qu'elle ne sait pas taper

- **les lettres accentuées et caractères non ASCII** (`é à è ü ö ä ç € £ §`…),
  même s'ils ont leur touche sur le clavier suisse : ils sont **ignorés** sans
  message. L'outil PC affiche un avertissement s'il en trouve dans ta liste.

> **Teste toujours un nouveau mot de passe** dans un champ texte visible (un
> éditeur, la barre d'adresse) avant de compter dessus.

---

## 9. Modifier le coffre (ajouter, changer, supprimer)

> **Avant tout `edit` : fais `receive` (§9.2).** Si tu as généré des mots de
> passe sur le Flipper, ils n'existent que là. `edit` travaille sur la copie
> du PC, puis `send` écrase le coffre du Flipper : les entrées générées
> seraient perdues.

Une seule commande, Flipper branché (app fermée, qFlipper fermé) :

```bash
cd ~/Documents/fliiper_keysManager
python3 tools/fkm_vault.py edit
```

1. Elle demande ta phrase de passe (une seule fois).
2. Elle ouvre ta liste dans **xed**, dans un fichier temporaire en mémoire vive
   (`/dev/shm`, lisible par toi seule).
3. Modifie, **enregistre (Ctrl+S) puis ferme la fenêtre** : la commande attend
   la fermeture pour continuer.
4. Elle rechiffre avec la même phrase de passe et la même difficulté, garde
   l'ancienne version dans `vault.fkm.bak` (chiffrée), efface le fichier en
   clair et **envoie le nouveau coffre sur le Flipper**.

Si tu fermes sans rien changer, rien n'est modifié. Avec une phrase de passe
fausse, rien n'est ouvert.

Options :

| Commande | Effet |
|---|---|
| `python3 tools/fkm_vault.py edit --no-send` | modifie sans envoyer (Flipper pas branché) |
| `python3 tools/fkm_vault.py send` | envoie `vault.fkm` sur le Flipper plus tard |
| `python3 tools/fkm_vault.py edit --new-passphrase` | change aussi la phrase de passe |

Pour revenir en arrière : `mv vault.fkm.bak vault.fkm`, puis
`python3 tools/fkm_vault.py send`.

> Garde aussi une copie de `vault.fkm` hors du PC et du Flipper (clé USB) :
> elle est chiffrée, donc sans risque.

### 9.1 Générer un mot de passe sur le Flipper

Le Flipper peut créer lui‑même un mot de passe aléatoire, sans PC.

1. Dans la liste « Select account », choisis **`[+ Generate password]`**.
2. **Domaine** : tape le nom du compte (48 caractères au plus). Il ne doit pas
   contenir `:`, ni commencer par `#` ou par une espace.
3. **Length** : règle la longueur avec ← → (de 12 à 64, **20 par défaut**),
   puis descends sur **« Generate & save »** et valide.
4. **Confirmation** : l'écran indique « Add new entry? » (nouveau domaine) ou
   « Replace password? » (le domaine existe déjà : l'ancien mot de passe sera
   perdu, à part sa copie dans `vault.fkm.bak`, voir §9.3). Choisis
   **Save** / **Replace**, ou **Cancel**.
5. L'écran « Saving... » dure quelques secondes (nouveau calcul de clé), puis
   « Saved (encrypted) ». Le domaine apparaît dans la liste. Comme les autres,
   son mot de passe n'est **jamais affiché** : sélectionne‑le pour le taper.

Retour revient en arrière à chaque étape (Confirmation → Length → Domaine →
liste) sans rien enregistrer.

Ce qui se passe, en bref :

- **Jeu de 89 caractères** : lettres a‑z et A‑Z, chiffres, et les symboles
  `` ! # $ % & ( ) * + , - . / : ; < = > ? @ [ \ ] _ { | } ``. Sont exclus les
  touches mortes (`^` `` ` `` `~`), les guillemets `"` `'` et l'espace, afin que
  le mot de passe se tape correctement quelle que soit la disposition du PC.
- **Aléa matériel** (générateur vrai aléatoire du Flipper), tiré sans biais ;
  chaque mot de passe contient au moins une minuscule, une majuscule, un
  chiffre et un symbole.
- **Le coffre entier est rechiffré** avec un nouveau sel et un nouveau IV
  (même phrase, même difficulté), puis relu et vérifié avant d'être écrit.
- **Écriture sûre** : fichier temporaire `vault.fkm.tmp`, relu et comparé ;
  l'ancien coffre devient `vault.fkm.bak` ; enfin le temporaire est renommé en
  `vault.fkm`. Une coupure en cours de route laisse un coffre valide.
- Rien n'est écrit en clair sur la carte SD, et le mot de passe n'est ni
  affiché ni journalisé.
- **Les commentaires (`#`) et lignes vides** de ta liste d'origine sont perdus
  dès que le Flipper sauvegarde : seules les lignes `domaine:motdepasse`
  sont conservées (triées par domaine).

Si l'écran affiche « Not saved » avec un message (« SD write failed »,
« Backup failed »…), le coffre précédent est resté en place (§10).

### 9.2 Sauvegarder et exporter : `receive`

Les mots de passe générés n'existent **que sur le Flipper**. Pour en avoir une
copie sur le PC, rapatrie le coffre chiffré :

```bash
cd ~/Documents/fliiper_keysManager
python3 tools/fkm_vault.py receive            # -> vault.fkm
python3 tools/fkm_vault.py receive autre.fkm  # autre nom de destination
```

Flipper branché en USB, app **fermée**, qFlipper fermé. La commande :

1. télécharge `/ext/apps_data/fliiper_keys/vault.fkm` dans un fichier
   temporaire `.part` ;
2. te demande la phrase de passe et **vérifie l'intégrité** (tag) : si elle est
   fausse ou le fichier abîmé, ta copie locale n'est pas touchée ;
3. garde ta copie locale précédente dans `vault.fkm.bak` ;
4. installe le nouveau `vault.fkm` et indique le nombre d'entrées.

Rien n'est écrit en clair : le fichier reste chiffré de bout en bout.

**Quand la lancer :**

- **régulièrement** (c'est ta sauvegarde : une carte SD peut mourir) ;
- **toujours avant `edit`** (voir l'avertissement au début du §9) ;
- après avoir généré des mots de passe importants.

Garde ensuite une copie de `vault.fkm` sur une clé USB.

### 9.3 Restaurer une version précédente (`.bak`)

Il existe deux fichiers `.bak`, qui ne contiennent chacun **qu'une version
précédente** :

| Fichier | Contient | Pour restaurer |
|---|---|---|
| `vault.fkm.bak` sur le **PC** | ta copie locale avant le dernier `edit` ou `receive` | `mv vault.fkm.bak vault.fkm` puis `python3 tools/fkm_vault.py send` |
| `vault.fkm.bak` sur le **Flipper** | le coffre avant la dernière génération | `python3 tools/fkm_vault.py receive --bak` (le PC reçoit cette version dans `vault.fkm`), puis `send` pour la remettre sur le Flipper |

Avec `receive --bak`, la phrase est vérifiée de la même façon, et la copie
locale remplacée passe dans `vault.fkm.bak`. Vérifie le contenu avec
`python3 tools/fkm_vault.py decrypt vault.fkm` avant d'envoyer.

> Une seule génération est gardée : une deuxième génération ou un deuxième
> `edit` écrase le `.bak` précédent. Ne compte pas dessus comme archive.

### 9.4 Si le Flipper est perdu, volé ou cassé

1. **Récupère ta dernière copie** du coffre (PC, clé USB). Tu as besoin de la
   copie et de ta **phrase de passe** : sans l'une des deux, rien n'est
   récupérable.
2. Vérifie‑la : `python3 tools/fkm_vault.py decrypt vault.fkm`.
   Les mots de passe générés **après** ta dernière sauvegarde sont perdus :
   pour ces comptes, utilise la procédure « mot de passe oublié » du site.
3. Avec un nouveau Flipper : installe l'app (§4), puis copie `vault.fkm`
   (§6, ou `send`).
4. **Si l'appareil est volé** : le coffre est chiffré et le PIN du Flipper
   protège l'accès, mais ne prends pas de risque. Change la phrase de passe
   (`edit --new-passphrase`) et, pour les comptes sensibles, change les mots de
   passe eux‑mêmes.

---

## 10. Messages affichés et dépannage

| Message sur le Flipper | Cause probable | Que faire |
|---|---|---|
| **No vault** — *Put vault.fkm in apps_data/fliiper_keys* | fichier absent, mal nommé, vide ou > 64 Ko | vérifie le chemin exact et le nom `vault.fkm` (§6) |
| **Wrong passphrase** — *or damaged file* | mauvaise phrase de passe, ou fichier modifié / mal copié | Retour, retape la phrase (attention aux majuscules) ; sinon recopie `vault.fkm` |
| **Old vault (FKM1)** | coffre créé avec l'ancienne version de l'outil | recrée le coffre avec l'outil actuel (§5) |
| **Bad vault file** — *Not an FKM2 vault* | le fichier n'est pas un coffre Fliiper Keys, ou il est tronqué | rechiffre avec `fkm_vault.py encrypt` et recopie‑le |
| **Not saved** — *SD write failed / Backup failed / Rename failed / Self-check failed* | carte SD pleine, verrouillée ou défaillante | le coffre précédent est conservé : libère de la place ou réessaie ; vérifie avec `receive` |
| **Not saved** — *Vault too big* / *Out of memory* | coffre > 64 Ko, ou mémoire insuffisante | supprime des entrées (§9) |
| **Not saved** — *RNG failure* | générateur d'aléa défaillant (très improbable) | réessaie ; relance l'app |
| **Saved** — *Low memory: reopen the app* | enregistré sur la SD, mais pas affiché | quitte puis rouvre l'app |
| **Empty vault** | phrase correcte, mais aucune ligne `domaine:motdepasse` | vérifie le contenu sur le PC avec `decrypt` |
| **Unlocking...** très long | nombre d'itérations élevé (`--iterations`) | patiente, ou rechiffre avec une valeur plus basse |
| **USB host not ready** | le PC n'a pas reconnu le clavier dans les 2 s (câble, hub, PC en veille, port USB bloqué) | Retour, puis rechoisis le compte ; essaie un autre câble ou port |
| **Typed.** mais mauvais texte | la disposition choisie (`[Layout: …]`) ne correspond pas au clavier du PC, ou caractères accentués | voir §8 et §5.1 |
| Un espace en trop après `^`, `` ` `` ou `~` | PC en variante « sans touches mortes » | voir §8 |
| Liste des dispositions limitée à `en-US (built-in)` | dossier `/ext/badusb/assets/layouts` absent | mets à jour le firmware avec qFlipper (§8) |
| **Layout error** | fichier `.kl` illisible ou abîmé | choisis une autre disposition, ou recopie le fichier |
| **Typed.** mais rien n'apparaît | le curseur n'était pas dans le champ | clique dans le champ, recommence |
| Des caractères manquent | PC lent ou machine virtuelle | réessaie ; signale‑le (le délai entre touches peut être augmenté dans le code) |

Côté PC :

| Message | Que faire |
|---|---|
| `Missing dependency: sudo apt install python3-cryptography` | `! sudo apt install python3-cryptography` |
| `Passphrases do not match.` | retape deux fois la même phrase |
| `Bad magic — not an FKM2 file.` | ce n'est pas un coffre (mauvais fichier) |
| `Wrong passphrase or damaged file.` | mauvaise phrase de passe, ou fichier abîmé |
| `Old FKM1 vault…` | coffre de l'ancienne version : recrée‑le à partir de ta liste |
| `Receiving failed: Flipper plugged in, app closed, qFlipper closed?` | branche le Flipper, ferme l'app et qFlipper ; vérifie que le coffre existe sur la carte |
| `Passphrase:` refusée pendant `receive` | la copie locale n'est pas modifiée ; retape la phrase |
| `ufbt: command not found` | `pipx install ufbt` puis rouvre le terminal |

Pour voir les messages de l'app en direct : `ufbt cli`, puis `log` dans la
console du Flipper (les mots de passe n'y apparaissent jamais).

---

## 11. Bonnes pratiques de sécurité

- **Active le code PIN du Flipper** (*Settings → Desktop → PIN code*) : il
  protège l'appareil, la phrase de passe protège le fichier.
- La phrase de passe du coffre est **la seule clé**. Pas de récupération
  possible si tu l'oublies.
- Fichier en clair : seulement dans `/dev/shm`, et `shred -u` juste après.
  Sur un SSD, `shred` sur le disque normal n'offre aucune garantie — d'où la RAM.
- Ne commite jamais `vault.fkm` ni `accounts.txt` (le `.gitignore` les bloque,
  ne le contourne pas).
- Garde une **sauvegarde** de `vault.fkm` (chiffré) hors du Flipper : une carte
  SD peut mourir. Lance `receive` (§9.2) régulièrement, surtout après avoir
  généré des mots de passe.
- Les mots de passe générés sont aléatoires : tu ne les retiendras pas. Sans
  sauvegarde, la perte de la carte SD est définitive.
- Ne laisse pas l'app ouverte sur la liste : quitte avec **Retour** dès que tu
  as fini, la mémoire est alors effacée.
- Ne branche le Flipper en mode frappe que sur **tes** machines.
- La protection repose sur la **longueur de ta phrase de passe** : le Flipper
  ne peut pas se permettre un calcul de clé aussi lourd qu'un PC (voir §12).
  Une phrase d'au moins 5 mots aléatoires reste hors de portée ; « soleil2024 », non.

---

## 12. Limites actuelles

| Limite | Conséquence | Prévu |
|---|---|---|
| Caractères non ASCII (é, à, ü, €…) non tapés | à éviter dans les mots de passe | — |
| Touches mortes gérées pour fr-CH, de-CH (`^` `` ` `` `~`), fr-FR (`^`) et de-DE (`^` `` ` ``) | ailleurs, une touche morte peut se combiner avec la lettre suivante ; avec une variante « sans touches mortes », un espace en trop | option à ajouter si besoin |
| Calcul de clé limité par la puissance du Flipper (PBKDF2, 50 000 itérations par défaut, contre 600 000 recommandées sur PC) | une phrase de passe courte serait attaquable si on vole la carte SD | réglage du défaut après mesure sur l'appareil ; utilise une phrase longue |
| Anciens coffres FKM1 refusés | à recréer depuis ta liste | — |
| Édition sur le Flipper limitée à la génération (ajout ou remplacement) | suppression et modification manuelle se font sur le PC (`edit`) | édition complète |
| Les commentaires et lignes vides sont perdus à chaque sauvegarde du Flipper | seules les lignes `domaine:motdepasse` restent | — |
| Une seule génération de `.bak` | pas d'historique | — |
| Pas d'option « Entrée après », pas de recherche | appuie sur Entrée toi‑même ; liste à parcourir | options et filtre |
| Coffre ≤ 64 Ko | largement assez (~1000 comptes) | — |

---

## 13. Aide‑mémoire

```bash
# Une seule fois
pipx install ufbt && ufbt update
bash tools/fetch_deps.sh
ufbt launch                                   # compile + installe + lance

# Créer / modifier le coffre
nano /dev/shm/accounts.txt                    # domaine:motdepasse
python3 tools/fkm_vault.py encrypt /dev/shm/accounts.txt vault.fkm
python3 tools/fkm_vault.py decrypt vault.fkm  # vérifier
clear && shred -u /dev/shm/accounts.txt

# Modifier ensuite (déchiffre, xed, rechiffre, envoie)
python3 tools/fkm_vault.py edit

# Sauvegarde / export du coffre depuis le Flipper (à faire AVANT edit)
python3 tools/fkm_vault.py receive            # Flipper -> vault.fkm (ancien -> .bak)
python3 tools/fkm_vault.py receive --bak      # version précédente du Flipper

# Copier sur la SD :  /ext/apps_data/fliiper_keys/vault.fkm
```

Sur le Flipper : **clic dans le champ sur le PC → Apps → Tools → Fliiper Keys
→ phrase de passe → compte → OK → Entrée sur le PC → Retour × 2 pour quitter.**

Générer : **`[+ Generate password]` → domaine → longueur (12–64, 20 par défaut)
→ Generate & save → Save/Replace.** Puis `receive` sur le PC.
