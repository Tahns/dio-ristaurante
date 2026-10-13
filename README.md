# Dio Ristorante – nouveau site

Site statique, rapide, sans cookies de suivi ni dépendance, pour Dio Ristorante (Villeneuve-d'Ascq).

- **Pages** : accueil, la carte, privatisation (entreprises et particuliers), réservation (table, emporter, privatisation, traiteur), accès et parking, galerie, FAQ, actualités, mentions légales, confidentialité, 404.
- **Parking** : le parking gratuit derrière le restaurant est annoncé en haut de chaque page, sur l'accueil, la réservation, l'accès, la privatisation, le pied de page et la FAQ (texte modifiable dans l'admin).
- **Bouche-à-oreille** : bouton « Recommander Dio » (partage WhatsApp/SMS) et invitation à laisser un avis Google sur l'accueil.
- **Avis** : note et derniers avis Google mis à jour chaque jour (si `GOOGLE_MAPS_API_KEY` et `GOOGLE_PLACE_ID` sont configurés), sinon saisis dans l'admin.
- **SEO** : une meta description et un H1 par page, données structurées Restaurant + FAQ, sitemap.
- **Mobile** : barre fixe « Appeler / Réserver ».

## À compléter (infos introuvables en ligne)

Dans `src/data/site.json` (ou l'admin `/admin`) :

1. **Adresse** (`address.street`), **téléphone** (`phones.resto`), **e-mail**, **horaires** (`hours`). Tant que le téléphone est vide, les boutons « Appeler » sont masqués.
2. **Prix de la carte** : la carte est un brouillon construit à partir des photos ; vérifier les plats et ajouter les prix (`menu`).
3. **Réseaux sociaux** (vides = masqués) et **infos légales** (`legal`, obligatoires avant mise en ligne).
4. **Réservations** : renseigner `formEndpoint` avec un formulaire gratuit [Formspree](https://formspree.io) pour recevoir les demandes directement par e-mail. Sans cela, le formulaire ouvre la messagerie du visiteur (moins fiable).
5. **Photos** : celles de `src/assets/photos/` viennent de la fiche Google ; remplacer par les photos du restaurant (admin → Galerie, logo, photo d'accueil).

## Utilisation

```bash
node build.mjs     # génère le site dans site/
node serve.mjs     # aperçu sur http://localhost:8080
npm run check      # génération + contrôle des liens, titres, descriptions
```

Ne modifiez pas `site/` : modifiez `src/` ou passez par `/admin`.

## Administration (`/admin`)

Actualités, carte et prix, parking, privatisation, coordonnées, galerie, avis, infos légales. Chaque « Enregistrer » crée une version sur GitHub, puis le site est contrôlé et publié automatiquement. Mise en place : voir `.github/workflows/site.yml` et `src/admin/config.yml`.

## Structure

```
build.mjs            générateur (Node, sans dépendance)
src/data/site.json   carte, contacts, parking, privatisation, avis
src/layout.html      en-tête, menu, pied de page
src/pages/*.html     contenu de chaque page
src/actualites/      actualités (Markdown, via l'admin)
src/admin/           administration (Sveltia CMS)
src/assets/          CSS, JS, police Inter, logo, photos
scripts/             contrôle qualité, mise à jour des avis Google
```
