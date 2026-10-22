// Mouvement : accueil (scrollytelling). Ne rien masquer hors de ce code.
window.DIO && window.DIO.ok && window.DIO.modules.push((D) => {
  const { gsap, ST, $ } = D;
  const q = (s, c) => (c || document).querySelector(s);
  const mm = gsap.matchMedia();

  // ---- Chargement du hero ----
  const hero = q(".hero--center");
  if (hero) {
    const tl = gsap.timeline({ defaults: { ease: D.ease } });
    tl.timeScale(1.4);
    const logo = q(".hero__logo", hero);
    tl.from(q(".open-now", hero), { y: -60, opacity: 0, duration: 0.7, ease: "bounce.out" })
      .from(logo, { scale: 0.2, rotate: -300, opacity: 0, duration: 1, ease: "back.out(1.6)" }, "-=0.35")
      .from(q(".rating-badge", hero), { y: 24, opacity: 0, duration: 0.5 }, "-=0.45")
      .from(q(".hero__name", hero), { letterSpacing: "0.9em", opacity: 0, duration: 0.9 }, "-=0.35")
      .from(q(".fact-address", hero), { y: 20, opacity: 0, duration: 0.5 }, "-=0.55");
    const w = D.split(q("h1", hero));
    gsap.set(w, { yPercent: 115 });
    tl.to(w, { yPercent: 0, duration: 0.8, stagger: 0.06 }, "-=0.3")
      .from(q(".hero__lead", hero), { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
      .from($(".hero__actions .btn", hero), { scale: 0.6, opacity: 0, duration: 0.6, stagger: 0.12, ease: "back.out(2)" }, "-=0.4")
      .from($(".hero__float a", hero), { x: 120, opacity: 0, duration: 0.6, stagger: 0.09 }, "-=0.6");

    // Sortie du hero : parallaxe + fondu/zoom arrière, le logo continue de tourner
    const out = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }, defaults: { ease: "none" } });
    out.to(q(".hero__center", hero), { y: 120, scale: 0.92, opacity: 0.3 }, 0)
       .to(logo, { rotate: 200 }, 0);
  }

  // ---- Bandeau de mots-clés ----
  const track = q(".scroll-band__track");
  if (track) {
    gsap.fromTo(track, { x: 0 }, { x: () => -(track.scrollWidth - window.innerWidth) * 0.6, ease: "none",
      scrollTrigger: { trigger: ".scroll-band", start: "top bottom", end: "bottom top", scrub: 0.4, invalidateOnRefresh: true } });
  }

  // ---- Horaires ----
  const band = q(".hours-band");
  if (band) {
    D.words(q("h2", band));
    D.batch(".hours-band__inner > div:first-child > :not(h2)", { y: 30 }, { stagger: 0.1 });
    const rows = $(".hours-table tbody tr", band);
    gsap.set(rows, { opacity: 0, x: (i) => (i % 2 ? 80 : -80) });
    ST.create({ trigger: ".hours-table", start: "top 85%", once: true, onEnter: () => {
      gsap.to(rows, { opacity: 1, x: 0, duration: 0.7, stagger: 0.09, ease: D.ease, onComplete: () => {
        const t = q("tr.is-today", band);
        if (t) gsap.fromTo(t, { backgroundColor: "#ffc94d" }, { backgroundColor: "#fff3d6", duration: 1.2, ease: "power2.out", clearProps: "backgroundColor" });
      } });
    } });
  }

  // ---- Qui sommes-nous ----
  const about = q(".about");
  if (about) {
    D.reveal(q(".about__title .section__kicker", about), { y: 0, x: -80 });
    D.words(q(".about__title h2", about));
    D.reveal(q(".about__card", about), { y: 0, x: 120 }, { duration: 1 });
    D.batch(".about__points li", { y: 20, scale: 0.5 }, { ease: "back.out(2.2)", stagger: 0.1 });
    const ph = q(".photo-card", about);
    if (ph) D.reveal(ph, { y: 0, opacity: 1, clipPath: "inset(0% 100% 0% 0%)" }, { duration: 1.2, ease: "power3.inOut" });
  }

  // ---- Aperçu de la carte ----
  const dark = q(".section--dark");
  if (dark) {
    D.words(q("h2", dark));
    D.batch(".card--menu li", { y: 30, x: -20 }, { stagger: 0.06 });
  }

  // ---- Section split : photo en clip-path + parallaxe ----
  const img = q(".split__img");
  if (img) {
    gsap.set(img, { clipPath: "inset(0% 0% 100% 0%)" });
    gsap.to(img, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: img, start: "top 85%", once: true } });
    mm.add("(min-width: 701px)", () => {
      gsap.fromTo(img, { yPercent: 4 }, { yPercent: -4, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true } });
    });
    const col = img.nextElementSibling;
    if (col) {
      D.words(q("h2", col));
      D.batch($(".split__img + div > :not(h2)"), { y: 30, x: 40 }, { stagger: 0.1 });
    }
  }

  // ---- Avis ----
  const av = q("#avis");
  if (av) {
    D.words(q("h2", av));
    const strong = q(".rating--big strong", av);
    if (strong && strong.firstChild && strong.firstChild.nodeType === 3) {
      const node = strong.firstChild;
      const to = parseFloat(node.textContent.replace(",", "."));
      if (!isNaN(to)) {
        const o = { v: 0 };
        node.textContent = "0,0";
        gsap.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => (node.textContent = o.v.toFixed(1).replace(".", ",")),
          onComplete: () => (node.textContent = to.toFixed(1).replace(".", ",")),
          scrollTrigger: { trigger: strong, start: "top 90%", once: true } });
      }
    }
    D.batch($(".quote", av), { y: 60, rotate: (i) => (i % 2 ? 4 : -4) }, { stagger: 0.14, duration: 0.9, ease: "back.out(1.4)" });
    D.reveal(q(".review-ask", av), { y: 50, scale: 0.96 });
  }

  // ---- Plan du parking ----
  const svg = q(".parking-map svg");
  if (svg) {
    const roads = $("g[stroke-linecap] > *", svg);
    roads.forEach((r) => {
      const L = r.getTotalLength();
      gsap.set(r, { strokeDasharray: L, strokeDashoffset: L });
    });
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: svg, start: "top 80%", end: "center 45%", scrub: 0.6 } });
    tl.to(roads, { strokeDashoffset: 0, stagger: 0.3, duration: 1 });
    const pop = gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 55%", once: true } });
    const area = q("rect[stroke-dasharray]", svg);
    const pBox = q("rect[fill='#1d4f9f']", svg);
    const arrow = $("path[stroke='#d93a2b']", svg);
    const lab = $("text", svg).filter((t) => /ENTRÉE|PARKING/.test(t.textContent));
    [area, pBox].forEach((e) => e && gsap.set(e, { transformOrigin: "50% 50%", scale: 0, opacity: 0 }));
    gsap.set(arrow, { x: 70, opacity: 0 });
    gsap.set(lab, { opacity: 0 });
    if (area) pop.to(area, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.8)" });
    if (pBox) pop.to(pBox, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(3)" }, "-=0.2");
    pop.to(arrow, { x: 0, opacity: 1, duration: 0.6, ease: D.ease }, "-=0.1").to(lab, { opacity: 1, duration: 0.4, stagger: 0.1 }, "-=0.4");
  }

  // ---- Fiche carte Google ----
  const card = q(".mapband__card");
  if (card) D.reveal(card, { y: 0, x: -120 }, { duration: 0.9, trigger: ".mapband" });
});
