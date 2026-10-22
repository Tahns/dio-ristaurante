// Mouvement : zone « pages » (en-têtes de toutes les pages + pages secondaires).
// Les états cachés sont posés ici uniquement ; la page reste complète sans JS ou avec « moins d'animations ».
window.DIO && window.DIO.ok && window.DIO.modules.push((D) => {
  const { gsap, ST, $ } = D;
  const path = location.pathname.replace(/index\.html$/, "");
  const is = (p) => path === p || path.startsWith(p);
  // Affichette : page à imprimer, aucune animation
  if (is("/affichette") || matchMedia("print").matches) return;
  // Pages dont le contenu appartient à d'autres modules : seul l'en-tête est à nous
  const own = !(path === "/" || is("/la-carte") || is("/commander") || is("/reservation") || path === "/index.html");

  // Cascade d'une liste à l'entrée à l'écran ; on rend la main au CSS à la fin (survols)
  const cascade = (els, from = {}, o = {}) => {
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 40, ...from });
    ST.batch(els, { start: o.start || "top 92%", once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, duration: o.duration || 0.65, stagger: o.stagger || 0.09,
        ease: o.ease || D.ease, overwrite: true, clearProps: "transform,opacity" }) });
  };
  const wordsOf = (el, o) => el && !el.dataset.mSplit && D.words(el, o);

  // ---- En-tête de page (toutes les pages), sans scroll trigger ----
  $(".page-hero").forEach((hero) => {
    const h1 = $("h1", hero)[0];
    const tl = gsap.timeline({ defaults: { ease: D.ease } });
    gsap.set(hero, { "--m-bar": 0, "--m-line": 0 });
    tl.to(hero, { "--m-bar": 1, duration: 0.9, ease: "power3.inOut" }, 0);
    const eyebrow = $(".hero__eyebrow", hero);
    if (eyebrow.length) tl.from(eyebrow, { opacity: 0, y: 18, duration: 0.5 }, 0.05);
    // étoiles de la page d'avis : pop une à une
    const stars = $(".stars", hero)[0];
    if (stars && !stars.dataset.mStars) {
      stars.dataset.mStars = "1";
      const txt = stars.textContent;
      stars.textContent = "";
      [...txt].forEach((c) => { const s = document.createElement("span"); s.className = "m-star"; s.textContent = c; stars.append(s); });
      tl.from($(".m-star", stars), { scale: 0, rotate: -60, opacity: 0, duration: 0.5, stagger: 0.08, ease: "back.out(3)" }, 0.1);
    }
    if (h1 && !h1.dataset.mSplit) {
      const w = D.split(h1);
      if (w.length) {
        gsap.set(w, { yPercent: 115 });
        tl.to(w, { yPercent: 0, duration: 0.85, stagger: 0.07 }, 0.1);
      }
    }
    if (h1) tl.to(hero, { "--m-line": 1, duration: 0.6 }, 0.45);
    const p = $(".container > p:not(.stars)", hero);
    if (p.length) tl.from(p, { opacity: 0, y: 26, duration: 0.7, stagger: 0.08 }, 0.3);
    const btns = $(".hero__actions .btn", hero);
    if (btns.length) tl.from(btns, { opacity: 0, y: 24, scale: 0.9, duration: 0.6, stagger: 0.1, ease: "back.out(1.6)" }, 0.5);
    tl.add(() => gsap.set(hero, { clearProps: "--m-bar,--m-line" }));
  });

  const mm = gsap.matchMedia();
  mm.add({ wide: "(min-width:701px)", narrow: "(max-width:700px)" }, (ctx) => {
    const narrow = ctx.conditions.narrow;
    const A = narrow ? 0.55 : 1; // amplitude réduite sur mobile

    // Parallaxe léger du bloc de l'en-tête à la sortie
    $(".page-hero").forEach((hero) => {
      const c = $(".container", hero)[0];
      if (c) gsap.to(c, { y: 70 * A, opacity: 0.35, ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    });

    if (!own) return;
    const legal = is("/mentions-legales") || is("/confidentialite");

    // Titres de section en mots (pas sur le texte juridique : sobre)
    $("main .section h2").filter((h) => !h.closest(".news-card, .card, .cta-band, details")).forEach((h) => wordsOf(h, { duration: legal ? 0.7 : 0.9, stagger: legal ? 0.04 : 0.07 }));
    $("main .section__kicker").forEach((k) => D.reveal(k, { y: 16 * A }, { duration: 0.6 }));

    // Textes courants et listes
    if (legal || is("/actualites/20")) {
      cascade($(".prose > p, .prose > ul, .prose > ol"), { y: 18 * A }, { duration: 0.6, stagger: 0.05 });
    }
    $(".section__head > p").forEach((p) => D.reveal(p, { y: 20 * A }, { duration: 0.7 }));

    // Cartes (privatisation, actualités)
    cascade($(".grid > .card, .grid > .news-card"), { y: 50 * A, scale: 0.96 }, { stagger: 0.1 });
    cascade($(".steps li"), { y: 36 * A, x: narrow ? 0 : -24 }, { stagger: 0.14, ease: "back.out(1.4)" });
    cascade($(".ticks li"), { y: 0, x: -26 * A }, { stagger: 0.08, duration: 0.55 });
    cascade($(".hours-mini tbody tr"), { y: 14 * A }, { stagger: 0.05, duration: 0.45 });

    // Bandeau parking : glisse, l'icône pop
    $(".parking").forEach((el) => {
      const icon = $(".parking__icon", el);
      gsap.set(el, { opacity: 0, x: -50 * A });
      if (icon.length) gsap.set(icon, { scale: 0, rotate: -40 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 90%", once: true }, defaults: { ease: D.ease } });
      tl.to(el, { opacity: 1, x: 0, duration: 0.7, clearProps: "transform,opacity" });
      if (icon.length) tl.to(icon, { scale: 1, rotate: 0, duration: 0.55, ease: "back.out(3)" }, 0.25);
    });

    // Photo de privatisation : dévoilée en clip-path
    $(".split__img").forEach((img) => {
      gsap.set(img, { clipPath: "inset(0% 100% 0% 0%)", scale: 1.15 });
      gsap.to(img, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.1, ease: "power3.inOut", clearProps: "clipPath,scale",
        scrollTrigger: { trigger: img, start: "top 85%", once: true } });
    });

    // Plan SVG du parking : tracé des routes en scrub
    $(".parking-map svg").forEach((svg) => {
      const routes = $("g[fill='none'] > *", svg);
      const lens = routes.map((r) => (r.getTotalLength ? r.getTotalLength() : 0));
      const rect = $("rect[stroke-dasharray]", svg)[0];
      const sq = $("rect[fill='#1d4f9f']", svg)[0];
      const label = $("text", svg).filter((t) => /^(P|PARKING GRATUIT)$/.test(t.textContent.trim()));
      const resto = $("path[fill='#f6ecd2'], circle", svg);
      const arrow = $("path[stroke='#d93a2b'], text", svg).filter((e) => e.getAttribute("stroke") === "#d93a2b" || /ENTR/.test(e.textContent));
      routes.forEach((r, i) => gsap.set(r, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }));
      if (rect) gsap.set(rect, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
      if (sq) gsap.set(sq, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
      if (label.length) gsap.set(label, { opacity: 0 });
      if (resto.length) gsap.set(resto, { opacity: 0, transformOrigin: "50% 50%" });
      if (arrow.length) gsap.set(arrow, { opacity: 0, x: 60 });
      const tl = gsap.timeline({ defaults: { ease: "none" },
        scrollTrigger: { trigger: svg, start: "top 80%", end: "bottom 45%", scrub: 0.6 } });
      routes.forEach((r, i) => tl.to(r, { strokeDashoffset: 0, duration: 1.2 }, i * 0.35));
      if (resto.length) tl.to(resto, { opacity: 1, duration: 0.4 }, 0.9);
      if (rect) tl.to(rect, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 1.4);
      if (sq) tl.to(sq, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(3)" }, 1.8);
      if (label.length) tl.to(label, { opacity: 1, duration: 0.3 }, 2);
      if (arrow.length) tl.to(arrow, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 2.2);
      tl.to({}, { duration: 0.3 }); // temps mort final
    });

    // FAQ : cascade, et le contenu glisse à l'ouverture (comportement natif intact)
    const details = $("details");
    if (details.length) {
      cascade(details, { y: 34 * A }, { stagger: 0.1 });
      details.forEach((d) => d.addEventListener("toggle", () => {
        if (!d.open) return;
        const c = $("summary ~ *", d);
        gsap.fromTo(c, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45, ease: D.ease, stagger: 0.06, overwrite: true, clearProps: "transform,opacity" });
      }));
    }

    // Avis : la carte de remerciement pop
    $(".thanks").forEach((t) => {
      gsap.set(t, { opacity: 0, y: 50 * A, scale: 0.9 });
      gsap.to(t, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.5)", clearProps: "transform,opacity",
        scrollTrigger: { trigger: t, start: "top 92%", once: true } });
    });
  });
});
