# Direction artistique — Natural Kiss

Source unique de vérité pour l'UI. **Lire ce fichier avant de styliser un écran.**
Objectif : une interface qui semble **décidée**, pas « générée » — un outil de travail
pour l'export agro, pas une landing page.

## Parti pris : « Registre agro-maritime »

Éditorial + technique, inspiré des manifestes d'expédition et des registres agricoles.
Dense, chaud, imprimé. On s'éloigne volontairement du centroïde IA (dégradés
violet/bleu, Inter, grilles de 3 cartes bordurées identiques, tout arrondi).

## Typographie

Trio délibéré (hiérarchie par la police et l'espace, pas par la seule graisse) :

| Rôle       | Police                            | Usage                                                                                            |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Display    | **Fraunces** (`--font-display`)   | Grands titres = « événement visuel ». Poids modéré (500), tracking serré, interlignage généreux. |
| UI / corps | **IBM Plex Sans** (`--font-sans`) | Texte, tableaux, boutons. Technique et humaniste, jamais Inter.                                  |
| Mono       | **IBM Plex Mono** (`--font-mono`) | Réfs conteneurs, chiffres, micro-labels en CAPITALES espacées (registre).                        |

- Micro-labels : `font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground`.
- Chiffres de données : toujours `tabular-nums`.
- Corps ≥ 14px ; alignement `start`, bord droit irrégulier (pas de justification).

## Couleur (palette chaude, cappée)

Une seule accentuation chaude (ocre) en plus du vert de marque. Jamais de dégradé décoratif.

| Token           | Clair                           | Rôle                                                 |
| --------------- | ------------------------------- | ---------------------------------------------------- |
| `--background`  | papier chaud (pas de blanc pur) | Fond                                                 |
| `--foreground`  | encre chaude                    | Texte                                                |
| `--primary`     | vert forêt profond              | Marque, liens, focus                                 |
| `--harvest`     | ocre de récolte (hue ~66)       | **Unique accent** : ticks, sélection, alertes douces |
| `--destructive` | rouge chaud                     | Erreur / rejet                                       |

Dark mode = palette **dessinée** (encre chaude, surfaces en nuances), pas une inversion.

## Formes

- Rayons qui se **contredisent** : conteneurs nets (`~3px`, `rounded-[3px]`),
  contrôles un peu plus arrondis (`--radius` = 0.3rem). Le décalage = signal d'intention.
- **Filets fins** plutôt que cartes bordurées : grilles divisées par `gap-px` sur fond
  `bg-border`, séparateurs de lignes en registre. Ombres rares (1 niveau utile max).

## Mise en page

- Hero = **masthead éditorial** asymétrique (titre Fraunces + bandeau de stats mono), pas
  de boîte en dégradé centrée.
- Listes de lots = **registre** : header en micro-labels mono, filets de lignes, chiffres
  tabulaires, statut en pastille discrète (point + libellé), pas de pilule « bonbon ».
- Modules = grille à filets ; le module **actif** est mis en emphase (teinte + filet),
  les modules à venir sont **suppris** (silencieux) pour laisser respirer l'actif.

## Interactions & accessibilité

- `:focus-visible` net (anneau `--ring`), `::selection` teintée ocre.
- Motion **fonctionnelle** et brève (feedback, transition d'état) ; jamais de « fade-up »
  générique partout. `prefers-reduced-motion` respecté.
- Contraste maîtrisé pour texte et contrôles ; cibles tactiles confortables.

## Anti-patterns interdits (sauf demande explicite)

Dégradé violet/bleu · Inter/Roboto en titre · 3 cartes identiques bordurées · rayon unique
partout · micro-animations sur tout · copie marketing creuse · dark mode « gris uniforme ».
