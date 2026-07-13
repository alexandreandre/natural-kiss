# Natural Kiss — Nouvelle brique : « Demande → Onboarding client »

_Document non-technique — à lire avant la démo, et à réutiliser pour l'expliquer à Nico & Valentin._

---

## En une phrase

Quand un client demande un produit pour un pays donné, **la plateforme vérifie
toute seule si nos certifications le couvrent**, répond automatiquement au client,
et — une fois validé — **crée ses documents et son espace de suivi personnel**,
sans travail manuel.

---

## Le problème qu'on résout

Aujourd'hui, quand un nouveau client (ou un nouveau produit/marché) arrive, il faut
**tout faire à la main** :

- vérifier quelles certifications on possède et si elles couvrent **ce produit +
  ce pays** (ex. la mangue vers le UK n'est **pas** couverte par nos GlobalG.A.P./GRASP
  actuels — comme sur le dossier SHP) ;
- envoyer le bon « pack » de présentation + certifications au client ;
- s'il manque une certif, s'en rendre compte… souvent trop tard, après plusieurs
  allers-retours ;
- puis créer manuellement le suivi du client.

C'est **long, répétitif, et source d'oublis** (le genre d'allers-retours qu'on a
vus sur les onboardings Barfoots et SHP). Nico l'a d'ailleurs demandé directement :
_« quel système utiliser pour suivre tous nos clients et expéditions ? »_.

---

## Ce qu'on a mis en place (le parcours automatisé)

**1. Le client fait sa demande** (sur une page simple : produit + pays + son contact).

**2. La plateforme vérifie instantanément la couverture des certifications**
selon le produit et le pays demandés.

**3. Elle répond automatiquement :**

- ✅ **Si on est couverts** → le **pack de présentation + certifications part
  automatiquement** au client. Aucun geste manuel.
- ⚠️ **Si une certification manque** → une **alerte claire** est créée côté équipe,
  qui dit **exactement ce qui manque** (ex. « GlobalG.A.P. et GRASP ne couvrent pas
  la mangue → UK »), avec la liste des démarches à faire.

**4. Quand l'équipe valide, en un clic :** la plateforme **génère les documents du
client** (mot de bienvenue, récapitulatif de nos certifications, fiche produit &
prochaines étapes), **les envoie par email**, et **crée automatiquement l'espace
personnel du client** — où il retrouve ses documents et, ensuite, le suivi de ses
lots.

**En résumé : ce qui prenait des jours d'allers-retours devient quasi immédiat, et
le client a tout de suite une image carrée et professionnelle de Natural Kiss.**

---

## La démo en 3 minutes (toi qui pilotes)

1. **Côté client** — ouvre la page de demande, saisis un produit + un pays :
   - **Brocoli / Tenderstem → UK** : tout est couvert → le client reçoit son pack.
   - **Mangue → UK** : montre que l'outil **détecte tout seul** qu'il manque des
     certifications (le vrai cas SHP).
2. **Côté équipe** — montre la liste des demandes reçues, avec le verdict
   automatique (**Suffisant** / **Insuffisant**) et, pour les cas « insuffisant »,
   **la liste exacte de ce qui manque**.
3. Montre le panneau **« Emails envoyés »** : la preuve que les envois partent tout
   seuls (pack + onboarding).
4. Clique **« Créer l'espace client »** sur une demande validée → l'outil génère les
   documents et l'espace du client.
5. **Côté client** — ouvre l'espace personnel du client : il y voit **ses documents**
   (et ensuite le suivi de ses expéditions).

---

## Ce que tu peux dire à Nico & Valentin (mot pour mot)

> « Aujourd'hui, quand un client nous demande un produit pour un marché, on vérifie
> nos certifications à la main, on envoie le pack à la main, et on crée le suivi à
> la main. J'ai automatisé tout ça.
>
> Le client fait sa demande, et **la plateforme vérifie toute seule si nos
> certifications couvrent ce produit et ce pays**. Si oui, elle **envoie le pack
> automatiquement**. Si non, elle nous dit **exactement quelle certification manque**
> — comme pour la mangue vers l'Angleterre.
>
> Quand on valide, elle **crée les documents du client et son espace de suivi
> personnel automatiquement**. Ce qui nous prenait des jours d'allers-retours se fait
> maintenant en quelques secondes, et le client a une image beaucoup plus pro. »

**Les 3 messages à faire passer :**

1. **Gain de temps** — plus de vérifications ni d'envois manuels.
2. **Moins d'erreurs** — l'outil dit tout de suite ce qui manque (fini les certifs
   oubliées / refaites en boucle).
3. **Image pro** — chaque client repart avec ses documents et son espace de suivi.

---

## À préciser avec eux (c'est une première version)

C'est un **prototype fonctionnel** pour montrer le principe. Deux choses sont
volontairement **simplifiées**, et j'ai justement besoin de leur avis pour les régler :

- **Le contenu exact des documents** envoyés au client (bienvenue, certifs, fiche
  produit) est pour l'instant **un modèle générique**. → _Qu'est-ce qu'on veut
  vraiment y mettre ?_
- **La règle « quelle certification pour quel client/marché »** utilise une logique
  standard. → _Est-ce qu'elle change selon le client (Barfoots vs SHP vs autres) ?_
- **L'envoi d'email est simulé** pour la démo (on voit le message partir, mais il
  n'arrive pas encore dans une vraie boîte mail). → Brancher l'email réel est simple
  quand on aura validé le contenu.

**Bonnes questions à leur poser :** Quels documents exactement ? Quelles certifs
attendues par client/pays ? Faut-il gérer les approbations « par paliers » (client
approuvé pour Lidl / food service d'abord, puis tous) comme chez Barfoots ?

---

_TL;DR : le tunnel « demande client → vérification certifs → réponse auto ou alerte
→ documents + espace client » est en place et démontrable. Il reste à caler le
contenu métier avec Valentin & Nico._
