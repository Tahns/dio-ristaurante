// Génère le site statique dans site/ à partir de src/.
// Aucune dépendance : node build.mjs
import fs from "node:fs";
import path from "node:path";

const SRC = "src";
const OUT = "site";
// Publication dans un sous-dossier (ex. GitHub Pages : BASE_PATH=/nom-du-depot) et hors index (NOINDEX=1).
const BASE = (process.env.BASE_PATH || "").replace(/\/+$/, "");
const NOINDEX = process.env.NOINDEX === "1";
const withBase = (text) =>
  BASE
    ? text
        .replace(/(\s(?:href|src|action|data-src))="\/(?!\/)/g, `$1="${BASE}/`)
        .replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`)
    : text;
const site = JSON.parse(fs.readFileSync(path.join(SRC, "data/site.json"), "utf8"));
const layout = fs.readFileSync(path.join(SRC, "layout.html"), "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const addressLine = [site.address.street, `${site.address.postalCode} ${site.address.city}`].filter(Boolean).join(", ");
const mapsQuery = `DIO Ristorante ${addressLine}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
// Lien « laisser un avis » : direct si l'identifiant de la fiche Google est renseigné, sinon la fiche sur Google Maps.
const reviewUrl = site.googlePlaceId
  ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(site.googlePlaceId)}`
  : mapsUrl;
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`;
const reviewsReadUrl = site.googlePlaceId
  ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(site.googlePlaceId)}`
  : mapsUrl;
const phone = site.phones.resto;
const hasPhone = Boolean(phone.tel);

// ---------- Composants réutilisables ----------

// Boutons « Appeler » : n'apparaissent que si un numéro est renseigné.
const callBtn = (cls = "btn btn--ghost") =>
  hasPhone ? `<a class="${cls}" href="tel:${phone.tel}">Appeler le ${phone.display}</a>` : "";

const promoActive = () => site.promo?.active && site.promo.text && (!site.promo.until || new Date() <= new Date(site.promo.until + "T23:59:59"));
const promoBar = () =>
  promoActive()
    ? `<div class="promo"${site.promo.until ? ` data-until="${site.promo.until}"` : ""}><div class="container promo__inner"><strong>${esc(site.promo.title)}</strong> <span>${esc(site.promo.text)}</span> <a href="/reservation/">Réserver</a></div></div>`
    : "";

// Boutons de réservation en plus du formulaire : lien de réservation en ligne et WhatsApp, s'ils sont renseignés.
const reserveExtras = () =>
  [
    site.reserveUrl ? `<a class="btn btn--dark" href="${esc(site.reserveUrl)}" rel="noopener">Réserver sur TheFork</a>` : "",
    site.whatsapp ? `<a class="btn btn--dark" href="https://wa.me/${esc(site.whatsapp.replace(/\D/g, ""))}" rel="noopener">Écrire sur WhatsApp</a>` : "",
  ].join("");

// Formulaire de réservation : affiché seulement s'il peut vraiment envoyer quelque chose (service d'envoi ou e-mail).
// Sinon, grand bloc « appelez pour réserver ».
const bookingForm = () => {
  if (site.formEndpoint || site.email) return fs.readFileSync(path.join(SRC, "partials/booking-form.html"), "utf8");
  return `<div class="call-card">
      <span class="section__kicker">Réserver</span>
      <h2>Le plus simple : un coup de fil</h2>
      <p>Appelez-nous, on vous trouve une table, une commande à emporter ou une date pour votre groupe.</p>
      ${hasPhone ? `<a class="call-card__num" href="tel:${phone.tel}">${phone.display}</a>` : ""}
      ${hoursList()}
      <p class="call-card__note">Le soir, on mange sur place le vendredi et le samedi. Du mardi au jeudi, le soir est à emporter uniquement (jusqu'à 20 h 30). Fermé le dimanche.</p>
    </div>`;
};

const hoursList = () =>
  site.hoursTable?.length
    ? `<dl class="hours">${site.hoursTable.map((h) => `<div><dt>${esc(h.day)}</dt><dd>${esc(h.hours)}</dd></div>`).join("")}</dl>`
    : "";

const hoursPanel = () => {
  const rows = (site.hoursGrid || [])
    .map((h) => {
      const cell = (v, note) => (v === "Fermé" ? `<td class="is-closed">Fermé</td>` : `<td>${esc(v)}${note ? `<small>${esc(note)}</small>` : ""}</td>`);
      return `<tr><th scope="row">${esc(h.day)}</th>${cell(h.midi)}${cell(h.soir, h.soirNote)}</tr>`;
    })
    .join("");
  return `<section class="section section--cream hours-band" id="horaires">
  <div class="container hours-band__inner">
    <div>
      <span class="section__kicker">Quand venir</span>
      <h2>On vous attend midi et soir</h2>
      <p class="open-now" data-open-now data-slots="${esc(JSON.stringify(site.hoursSlots || []))}" aria-live="polite"></p>
      <p>Le midi, on est là du lundi au samedi. Le soir, on vous reçoit sur place le vendredi et le samedi. Du mardi au jeudi, le soir, on prépare tout à emporter. Le dimanche, on se repose.</p>
      <p><a class="btn btn--primary" href="/reservation/">Réserver une table</a> ${hasPhone ? `<a class="btn btn--dark" href="tel:${phone.tel}">Appeler le ${phone.display}</a>` : ""}</p>
    </div>
    <table class="hours-table">
      <caption class="sr-only">Horaires d'ouverture</caption>
      <thead><tr><th scope="col">Jour</th><th scope="col">Midi</th><th scope="col">Soir</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
};

const parkingSteps = () =>
  site.parking.steps?.length ? `<ol class="steps steps--compact">${site.parking.steps.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : "";

const parkingBlock = () => `<aside class="parking" aria-label="Parking">
  <svg class="parking__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/><path d="M9.5 17V7h3.6a3 3 0 0 1 0 6h-3.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <div>
    <strong>${esc(site.parking.title)}</strong>
    <p>${esc(site.parking.text)}${site.parking.detail ? " " + esc(site.parking.detail) : ""}</p>
  </div>
</aside>`;

const MENU_SETS = [
  { key: "surplace", label: "Sur place", intro: "Servi à table, midi, et le soir les vendredis et samedis." },
  { key: "emporter", label: "À emporter", intro: "Mêmes plats, prix à emporter. Commande possible le midi et le soir du mardi au samedi." },
];

function menuSection(cat, set) {
  const items = cat.items
    .map(
      (it) => `<li class="menu-item">
        <div class="menu-item__head"><h3>${esc(it.name)}</h3>${it.price ? `<span class="menu-item__price">${esc(it.price)}</span>` : ""}</div>
        ${it.desc ? `<p>${esc(it.desc)}</p>` : ""}
      </li>`
    )
    .join("");
  return `<section class="menu-cat" id="${set}-${esc(cat.id)}">
    <h2>${esc(cat.title)}</h2>
    ${cat.intro ? `<p class="menu-cat__intro">${esc(cat.intro)}</p>` : ""}
    <ul class="menu-list">${items}</ul>
  </section>`;
}

const menuAll = () =>
  `<div class="menu-tabs" role="group" aria-label="Choisir la carte">${MENU_SETS.map(
    (m, i) => `<a class="menu-tab${i === 0 ? " is-active" : ""}" href="#${m.key}" data-tab="${m.key}">${m.label}</a>`
  ).join("")}</div>
  ${MENU_SETS.map(
    (m) => `<div class="menu-set" id="${m.key}" data-set="${m.key}">
    <p class="menu-set__intro">${esc(m.intro)}</p>
    <nav class="menu-nav" aria-label="Sections de la carte ${m.label.toLowerCase()}">${site.menu[m.key].map((c) => `<a href="#${m.key}-${esc(c.id)}">${esc(c.title)}</a>`).join("")}</nav>
    ${site.menu[m.key].map((c) => menuSection(c, m.key)).join("\n")}
  </div>`
  ).join("\n")}`;

const formulas = () =>
  `<div class="grid grid--2">${site.privatisation.formulas
    .map((f) => `<article class="card"><h3>${esc(f.name)}</h3><p>${esc(f.text)}</p></article>`)
    .join("")}</div>`;

const ctaBand = (
  title = "Une table chez DIO ?",
  text = "Un coup de fil suffit, on vous trouve une table."
) => `
<section class="cta-band">
  <div class="container cta-band__inner">
    <div>
      <h2 class="cta-band__title">${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta-band__actions">
      <a class="btn btn--primary btn--lg" href="/reservation/">Réserver une table</a>
      ${callBtn("btn btn--light")}
    </div>
  </div>
</section>`;

function gallery() {
  // Photos ajoutées depuis l'administration (site.gallery), sinon celles du dossier galerie/.
  let photos = (site.gallery || []).filter((g) => g.image).map((g) => ({ src: g.image, alt: g.alt || "" }));
  if (!photos.length) {
    const dir = path.join(SRC, "assets/photos/galerie");
    photos = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f) => ({
        src: `/assets/photos/galerie/${f}`,
        alt: path.parse(f).name.replace(/^\d+[-_ ]*/, "").replace(/[-_]+/g, " "),
      }));
  }
  if (!photos.length) {
    return `<div class="empty-gallery"><p>Les photos arrivent bientôt.</p></div>`;
  }
  return `<div class="gallery">${photos
    .map((p) => `<a href="${esc(p.src)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async"></a>`)
    .join("")}</div>`;
}

const missingLegal = new Set();
const LEGAL_LABELS = {
  siret: "SIRET",
  registration: "Immatriculation",
  vat: "TVA intracommunautaire",
  director: "Directeur de la publication",
};

// Logo : celui choisi dans l'administration, sinon src/assets/img/logo-dio.*, sinon logo générique.
const clientLogo =
  site.images?.logo ||
  ["svg", "png", "webp", "jpg"]
    .map((ext) => `/assets/img/logo-dio.${ext}`)
    .find((f) => fs.existsSync(path.join(SRC, f)));
const logoImg = clientLogo
  ? `<img class="logo__img" src="${esc(clientLogo)}" alt="" width="60" height="50">`
  : `<img class="logo__img" src="/assets/img/logo.svg" alt="" width="60" height="50">`;

// Avis : note affichée seulement si elle est renseignée ; l'invitation à laisser un avis est toujours là.
function reviewsSection() {
  const r = site.reviews || {};
  const cards = (r.items || [])
    .slice(0, 6)
    .map(
      (it) => `<figure class="quote">
        <p class="quote__stars" role="img" aria-label="${esc(it.rating)} sur 5">${"★".repeat(Math.round(Number(it.rating) || 5))}</p>
        <blockquote><p>${esc(it.text)}</p></blockquote>
        <figcaption>${esc(it.author)}${it.date ? ` · ${esc(it.date)}` : ""} · Avis ${esc(r.source || "Google")}</figcaption>
      </figure>`
    )
    .join("");
  const rating = r.rating
    ? `<a class="rating" href="${mapsUrl}" rel="noopener">
        <strong>${esc(r.rating)}<span>/5</span></strong>
        <span class="rating__stars" aria-hidden="true">★★★★★</span>
        <span>${r.count ? esc(r.count) + " avis " : "Avis "}${esc(r.source || "Google")}</span>
      </a>`
    : "";
  return `<section class="section section--cream" id="avis">
  <div class="container">
    <div class="reviews-head">
      <div>
        <span class="section__kicker">Les avis</span>
        <h2>${cards ? "Ce que disent nos clients" : "Votre avis nous intéresse"}</h2>
      </div>
      ${rating}
    </div>
    ${cards ? `<div class="grid grid--3">${cards}</div>` : ""}
    <div class="review-ask">
      <div>
        <h3>Un bon moment chez DIO ?</h3>
        <p>Un avis Google prend trente secondes et aide les autres à nous trouver.</p>
      </div>
      <p class="review-ask__actions"><a class="btn btn--primary" href="${reviewUrl}" rel="noopener">Laisser un avis</a> <a class="btn btn--light" href="${reviewsReadUrl}" rel="noopener">Lire les avis</a></p>
    </div>
  </div>
</section>`;
}

const shareBlock = () => `<section class="section section--dark share" id="partager">
  <div class="container share__inner">
    <div>
      <span class="section__kicker">Passez le mot</span>
      <h2>Un bon repas ? Passez le mot</h2>
      <p>Dites-le à un ami ou à un collègue : c'est ce qui nous fait le plus plaisir.</p>
    </div>
    <div class="share__actions">
      <button class="btn btn--primary" type="button" data-share data-title="DIO Ristorante" data-text="Pizzas à Villeneuve-d'Ascq, parking gratuit derrière le restaurant. Je recommande !">Recommander DIO</button>
      <a class="btn btn--light" href="${reviewUrl}" rel="noopener">Laisser un avis</a>
    </div>
  </div>
</section>`;

const mapBlock = () => `<!--map--><div class="map-embed">
  <iframe src="${esc(mapEmbedUrl)}" title="DIO Ristorante sur Google Maps : emplacement, note et avis" width="600" height="420" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
  <p class="map-embed__actions">
    <a class="btn btn--dark" href="${mapsUrl}" rel="noopener">Itinéraire</a>
    <a class="btn btn--ghost" href="${reviewsReadUrl}" rel="noopener">Lire les avis sur Google</a>
  </p>
</div><!--/map-->`;
const heroPhoto =
  site.images?.hero || (fs.existsSync(path.join(SRC, "assets/photos/hero.jpg")) ? "/assets/photos/hero.jpg" : "");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": site.baseUrl + "/#restaurant",
  logo: site.baseUrl + "/assets/img/logo-dio.svg",
  hasMap: mapsUrl,
  ...(site.priceRange ? { priceRange: site.priceRange } : {}),
  ...(site.geo ? { geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng } } : {}),
  ...(site.hoursSpec?.length
    ? { openingHoursSpecification: site.hoursSpec.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })) }
    : {}),
  potentialAction: { "@type": "ReserveAction", target: site.baseUrl + "/reservation/", result: { "@type": "Reservation", name: "Réserver une table" } },
  name: site.name,
  url: site.baseUrl + "/",
  image: site.baseUrl + "/assets/img/og.png",
  servesCuisine: ["Italienne", "Pizza", "Pâtes"],
  acceptsReservations: true,
  ...(hasPhone ? { telephone: phone.tel } : {}),
  ...(site.email ? { email: site.email } : {}),
  address: {
    "@type": "PostalAddress",
    ...(site.address.street ? { streetAddress: site.address.street } : {}),
    postalCode: site.address.postalCode,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    addressCountry: site.address.country,
  },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Parking gratuit", value: true },
    { "@type": "LocationFeatureSpecification", name: "Privatisation", value: true },
    { "@type": "LocationFeatureSpecification", name: "Vente à emporter", value: true },
  ],
  hasMenu: {
    "@type": "Menu",
    url: site.baseUrl + "/la-carte/",
    hasMenuSection: site.menu.surplace.map((c) => ({
      "@type": "MenuSection",
      name: c.title,
      hasMenuItem: c.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        description: i.desc,
        ...(i.price ? { offers: { "@type": "Offer", price: i.price.replace(/[^\d,]/g, "").replace(",", "."), priceCurrency: "EUR" } } : {}),
      })),
    })),
  },
  ...(Object.values(site.social).some(Boolean) ? { sameAs: Object.values(site.social).filter(Boolean) } : {}),
};

// ---------- Actualités (src/actualites/*.md, éditables depuis l'administration) ----------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
      if (kv[2].trim().startsWith('"')) v = v.replace(/\\"/g, '"');
      else v = v.replace(/''/g, "'");
    }
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}

// Markdown simple : titres, listes, gras, italique, liens, images, paragraphes.
function markdown(md) {
  const inline = (t) =>
    esc(t)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  const out = [];
  for (const block of md.trim().split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const h = block.match(/^(#{2,4})\s+(.*)$/);
    if (h && lines.length === 1) {
      const lvl = Math.max(2, h[1].length);
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
    } else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`);
    } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`);
    } else {
      out.push(`<p>${lines.map(inline).join("<br>")}</p>`);
    }
  }
  return out.join("\n");
}

const frDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const NEWS_DIR = path.join(SRC, "actualites");
const news = (fs.existsSync(NEWS_DIR) ? fs.readdirSync(NEWS_DIR) : [])
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(NEWS_DIR, f), "utf8"));
    const date = new Date(data.date || fs.statSync(path.join(NEWS_DIR, f)).mtime);
    return {
      slug: path.basename(f, ".md").toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      title: data.title || path.basename(f, ".md"),
      summary: data.summary || "",
      image: data.image || "",
      date,
      html: markdown(body),
      draft: data.draft === "true",
    };
  })
  .filter((n) => !n.draft && !Number.isNaN(n.date.getTime()))
  .sort((a, b) => b.date - a.date);

const newsCard = (n, lvl = 3) => `<a class="news-card" href="/actualites/${n.slug}/">
  ${n.image ? `<img class="news-card__img" src="${esc(n.image)}" alt="" loading="lazy">` : ""}
  <span class="activity__age">${frDate(n.date)}</span>
  <h${lvl}>${esc(n.title)}</h${lvl}>
  ${n.summary ? `<p>${esc(n.summary)}</p>` : ""}
  <span class="activity__more">Lire →</span>
</a>`;

// Description de page toujours assez longue, même si l'article est très court.
function newsDescription(n) {
  const text = `${n.summary} ${n.html.replace(/<[^>]+>/g, " ")}`.replace(/\s+/g, " ").trim();
  const d = text.length >= 60 ? text : `${n.title}. ${text} Actualité de DIO Ristorante, Villeneuve-d'Ascq.`;
  return d.length > 155 ? d.slice(0, 152).trimEnd() + "…" : d;
}

function newsSection() {
  if (!news.length) return "";
  return `<section class="section">
  <div class="container">
    <div class="section__head">
      <span class="section__kicker">Actualités</span>
      <h2>Les dernières nouvelles de DIO</h2>
    </div>
    <div class="grid grid--3">${news.slice(0, 3).map(newsCard).join("")}</div>
    <p class="reviews-more"><a class="btn btn--dark" href="/actualites/">Toutes les actualités</a></p>
  </div>
</section>`;
}

// ---------- Rendu ----------

const tokens = {
  logo: () => logoImg,
  map: mapBlock,
  parking: parkingBlock,
  bookingForm,
  promoBar,
  reserveExtras,
  hoursList,
  hoursPanel,
  slotsJson: () => JSON.stringify(site.hoursSlots || []),
  parkingSteps,
  reviewUrl: () => reviewUrl,
  orderDirect: () => esc(site.orderDirect || ""),
  reviewsSection,
  shareBlock,
  year: () => String(new Date().getFullYear()),
  email: () => (site.email ? `<a href="mailto:${site.email}">${site.email}</a>` : ""),
  emailRaw: () => site.email,
  address: () => esc(addressLine),
  mapsUrl: () => mapsUrl,
  hours: () => esc(site.hours),
  services: () => esc(site.services.join(" · ")),
  menuNote: () => esc(site.menuNote),
  menuAll,
  menuPreview: () =>
    site.menu.surplace
      .filter((c) => ["pizzas", "pates"].includes(c.id))
      .map((c) => `<article class="card card--menu"><h3>${esc(c.title)}</h3><ul>${c.items.slice(0, 5).map((it) => `<li><strong>${esc(it.name)}${it.price ? ` <span class="pv">${esc(it.price)}</span>` : ""}</strong> ${esc(it.desc)}</li>`).join("")}</ul></article>`)
      .join(""),
  formulas,
  privIntro: () => esc(site.privatisation.intro),
  topPhone: () => (hasPhone ? `<a href="tel:${phone.tel}">${phone.display}</a>` : `<a href="/reservation/">Réserver en ligne</a>`),
  callBtn: () => callBtn(),
  callBtnLight: () => callBtn("btn btn--light"),
  callLink: () => (hasPhone ? `<a href="tel:${phone.tel}" class="mobile-bar__call">Appeler</a>` : `<a href="${mapsUrl}" class="mobile-bar__call" rel="noopener">Itinéraire</a>`),
  phoneCard: () => (hasPhone ? `<div class="contact-card"><h2>${esc(phone.label)}</h2><a href="tel:${phone.tel}">${phone.display}</a></div>` : ""),
  phoneLine: () => (hasPhone ? `Téléphone : <a href="tel:${phone.tel}">${phone.display}</a><br>` : ""),
  cta: () => ctaBand(),
  ctaPriv: () => ctaBand("Un événement à organiser ?", "Entreprise, anniversaire, fête : parlons de votre date et de vos envies."),
  gallery,
  heroClass: () => (heroPhoto ? "hero hero--photo" : "hero"),
  heroStyle: () => (heroPhoto ? ` style="--hero-img: url('${esc(heroPhoto)}')"` : ""),
  news: newsSection,
  formEndpoint: () => esc(site.formEndpoint),
  socialRow: () => {
    const icons = {
      facebook: '<path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.4.3-.5 1-.5Z"/>',
      instagram: '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17.3 5.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/>',
      tiktok: '<path d="M16.6 2c.4 2.6 2 4.2 4.4 4.4v3.3c-1.6 0-3-.5-4.3-1.3v6.5A6.1 6.1 0 1 1 10.6 9v3.4a2.8 2.8 0 1 0 2.8 2.8V2h3.2Z"/>',
    };
    const links = Object.entries(site.social).filter(([, url]) => url);
    if (!links.length) return "";
    return `<p class="social-row">${links
      .map(([k, url]) => `<a href="${esc(url)}" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[k]}</svg></a>`)
      .join("")}</p>`;
  },
};

function render(str) {
  return str.replace(/\{\{\s*([\w]+)(?::([\w]+))?\s*\}\}/g, (m, name, arg) => {
    if (name === "legal") {
      const v = site.legal[arg];
      if (v) return esc(v);
      missingLegal.add(arg);
      return arg === "company" ? esc(site.name) : "";
    }
    // Ligne « Libellé : valeur » affichée seulement si la valeur est renseignée.
    if (name === "legalLine") {
      const v = site.legal[arg];
      if (!v) {
        missingLegal.add(arg);
        return "";
      }
      return `${LEGAL_LABELS[arg]} : ${esc(v)}<br>`;
    }
    if (name === "legalMediator") {
      if (!site.legal.mediator) {
        missingLegal.add("mediator");
        return "";
      }
      return ` À défaut, il peut recourir gratuitement au médiateur de la consommation : ${esc(site.legal.mediator)}.`;
    }
    if (tokens[name]) return tokens[name]();
    throw new Error(`Balise inconnue : ${m}`);
  });
}

function parsePage(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`Métadonnées manquantes dans ${file}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(SRC, "assets"), path.join(OUT, "assets"), { recursive: true });
fs.cpSync(path.join(SRC, "admin"), path.join(OUT, "admin"), { recursive: true });
for (const f of ["assets/css/style.css", "admin/index.html"]) {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, withBase(fs.readFileSync(p, "utf8")));
}

const urls = [];
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

function writePage(meta, body, urlPath, outFile) {
  const pageVars = {
    content: body,
    pageTitle: esc(meta.title),
    pageDescription: esc(meta.description),
    canonical: site.baseUrl + urlPath,
    robots: meta.noindex || NOINDEX ? "noindex, nofollow" : "index, follow",
    jsonLd: (urlPath === "/" ? ld(jsonLd) : "") + (meta.jsonLd ? "\n" + ld(meta.jsonLd) : ""),
  };
  let html = layout
    .replace(/\{\{(content|pageTitle|pageDescription|canonical|robots|jsonLd)\}\}/g, (_, k) => pageVars[k])
    .replace(/\{\{nav:(\w+)\}\}/g, (_, k) => (k === meta.nav ? ' aria-current="page"' : ""));
  html = withBase(render(html));
  // Typographie française : espaces insécables avant : ; ? ! et dans « », apostrophes courbes, dans le texte uniquement.
  html = html
    .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g)
    .map((part) =>
      part.startsWith("<")
        ? part
        : part.replace(/ ([:;?!»])/g, "\u00a0$1").replace(/« /g, "«\u00a0").replace(/(\w)'(\w)/g, "$1\u2019$2")
    )
    .join("");
  const dest = path.join(OUT, outFile);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  if (!meta.noindex) urls.push(urlPath);
}

for (const file of fs.readdirSync(path.join(SRC, "pages")).sort()) {
  if (!file.endsWith(".html")) continue;
  const { meta, body } = parsePage(path.join(SRC, "pages", file));
  const slug = path.basename(file, ".html");
  const urlPath = slug === "index" ? "/" : slug === "404" ? "/404.html" : `/${slug}/`;
  const outFile =
    slug === "index" ? "index.html" : slug === "404" ? "404.html" : path.join(slug, "index.html");
  writePage(meta, body, urlPath, outFile);
}

// Actualités : une page de liste + une page par article
writePage(
  {
    title: "Actualités – DIO Ristorante",
    description: "Les nouveautés de DIO Ristorante à Villeneuve-d'Ascq : plats du moment, soirées, événements et infos pratiques.",
    nav: "actualites",
  },
  `<section class="page-hero"><div class="container"><h1>Actualités</h1><p>Plats du moment, soirées et nouveautés de la maison.</p></div></section>
<section class="section"><div class="container">${
    news.length
      ? `<div class="grid grid--3">${news.map((n) => newsCard(n, 2)).join("")}</div>`
      : `<div class="empty-gallery"><p>Aucune actualité pour le moment. Revenez bientôt !</p></div>`
  }</div></section>
{{cta}}`,
  "/actualites/",
  "actualites/index.html"
);
for (const n of news) {
  writePage(
    {
      title: `${n.title} – DIO Ristorante`,
      description: newsDescription(n),
      nav: "actualites",
    },
    `<section class="page-hero"><div class="container"><span class="hero__eyebrow">${frDate(n.date)}</span><h1>${esc(n.title)}</h1>${
      n.summary ? `<p>${esc(n.summary)}</p>` : ""
    }</div></section>
<section class="section"><div class="container prose">${
      n.image ? `<img class="news-cover" src="${esc(n.image)}" alt="">` : ""
    }${n.html.replace(/\{\{/g, "&#123;&#123;")}<p><a class="btn btn--dark" href="/actualites/">← Toutes les actualités</a></p></div></section>
{{cta}}`,
    `/actualites/${n.slug}/`,
    path.join("actualites", n.slug, "index.html")
  );
}

fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${site.baseUrl}${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
fs.writeFileSync(
  path.join(OUT, "robots.txt"),
  NOINDEX
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${site.baseUrl}/sitemap.xml\n`
);

console.log(`Site généré dans ${OUT}/ (${urls.length} pages indexables, ${news.length} actualité(s))`);
if (missingLegal.size) {
  console.warn(`⚠ Infos légales non renseignées (masquées sur le site) : ${[...missingLegal].join(", ")}`);
}
