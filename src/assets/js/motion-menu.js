// Mouvement : zone « menu » (La carte + Click & Collect).
// États cachés posés ici uniquement ; tout élément révélé est flaggé (data-mv) et rendu au CSS à la fin.
window.DIO && window.DIO.ok && window.DIO.modules.push((D) => {
  const { gsap, ST, $ } = D;
  const sets = $(".menu-set");
  const order = document.querySelector("#order");
  if (!sets.length && !order) return;
  // (les titres .page-hero h1/p sont animés par motion-pages.js pour toutes les pages)

  const mm = gsap.matchMedia();
  mm.add({ s: "(max-width:700px)", d: "(min-width:701px)" }, (ctx) => {
    const A = ctx.conditions.s ? 0.55 : 1; // amplitude des déplacements
    const live = (el) => !!el && el.getClientRects().length > 0;
    const left = (el) => el.getBoundingClientRect().bottom < -40; // déjà dépassé : pas de mise en scène
    const trs = new Map(); // set → ScrollTriggers à re-créer à la réouverture
    const keep = (k, t) => { (trs.get(k) || trs.set(k, []).get(k)).push(...[].concat(t)); };
    const drop = (k) => { (trs.get(k) || []).forEach((t) => t.kill()); trs.delete(k); };
    const fresh = (els) => els.filter((e) => !e.dataset.mv);

    // Cascade rapide d'une liste de plats (ST.batch, une seule fois par élément)
    const cascade = (k, items, o = {}) => {
      items = fresh(items);
      if (!items.length) return;
      const price = (li) => li.querySelector(".menu-item__price, .order-item__price");
      gsap.set(items, { opacity: 0, y: 26 * A });
      const prices = items.map(price).filter(Boolean);
      if (o.prices !== false) gsap.set(prices, { opacity: 0, x: 34 * A });
      keep(k, ST.batch(items, { start: "top 94%", once: true, onEnter: (b) => {
        b.forEach((e) => (e.dataset.mv = "1"));
        const seen = b.filter(left);
        const live2 = b.filter((e) => !left(e));
        const clear = (xs) => gsap.set(xs, { clearProps: "opacity,transform" });
        clear(seen); clear(seen.map(price).filter(Boolean));
        if (!live2.length) return;
        const st = { amount: Math.min(0.45, live2.length * 0.06) };
        gsap.to(live2, { opacity: 1, y: 0, duration: 0.55, ease: D.ease, stagger: st, overwrite: true, clearProps: "opacity,transform" });
        gsap.to(live2.map(price).filter(Boolean), { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: st, delay: 0.08, overwrite: true, clearProps: "opacity,transform" });
      } }));
    };

    // Rubrique : filet qui se dessine, titre en mots, intro
    const head = (k, cat) => {
      if (cat.dataset.mv) return;
      const h2 = $("h2", cat)[0];
      const intro = $(".menu-cat__intro, .menu-set__intro", cat)[0];
      const words = h2 ? D.split(h2) : [];
      cat.classList.add("m-rule");
      gsap.set(cat, { "--r": 0 });
      gsap.set(words, { yPercent: 115 });
      if (intro) gsap.set(intro, { opacity: 0, y: 12 * A });
      const tl = gsap.timeline({ defaults: { ease: D.ease }, paused: true, onStart: () => (cat.dataset.mv = "1") })
        .to(cat, { "--r": 1, duration: 0.7, ease: "power3.inOut" }, 0)
        .to(words, { yPercent: 0, duration: 0.6, stagger: 0.05 }, 0.12);
      if (intro) tl.to(intro, { opacity: 1, y: 0, duration: 0.45, clearProps: "opacity,transform" }, 0.3);
      keep(k, ST.create({ trigger: cat, start: "top 90%", once: true, onEnter: () => (left(cat) ? tl.progress(1) : tl.play()) }));
    };

    // Surbrillance de la rubrique visible dans la barre (scrollspy)
    const spy = (k, nav, secs) => {
      if (!nav || !secs.length) return;
      const links = $("a", nav);
      const by = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
      let cur = null;
      const set = (a) => {
        if (a === cur) return;
        if (cur) cur.classList.remove("is-current");
        cur = a;
        if (!a) return;
        a.classList.add("is-current");
        if (nav.scrollWidth > nav.clientWidth + 2) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
      };
      const line = () => innerHeight * 0.38;
      keep(k, ST.create({ trigger: secs[0], endTrigger: secs[secs.length - 1], start: "top 70%", end: "bottom 30%", onUpdate: () => {
        let best = null, top = -1e9;
        secs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= line() && r.bottom > line() && r.top > top) { top = r.top; best = s; } });
        set(best ? by.get(best.id) : null);
      }, onLeave: () => set(null), onLeaveBack: () => set(null) }));
    };

    // ---- LA CARTE : construction d'un set quand il devient visible ----
    const buildSet = (set) => {
      drop(set);
      if (!live(set)) return;
      const nav = $(".menu-nav", set)[0];
      const cats = $(".menu-cat", set);
      const intro = $(".menu-set__intro", set)[0];
      if (intro && !intro.dataset.mv) { intro.dataset.mv = "1"; gsap.fromTo(intro, { opacity: 0, y: 14 * A }, { opacity: 1, y: 0, duration: 0.5, ease: D.ease, clearProps: "opacity,transform" }); }
      if (nav && !nav.dataset.mv) {
        nav.dataset.mv = "1";
        gsap.fromTo($("a", nav), { opacity: 0, y: 14 * A }, { opacity: 1, y: 0, duration: 0.4, ease: D.ease, stagger: { amount: 0.3 }, clearProps: "opacity,transform" });
      }
      cats.forEach((c) => { head(set, c); cascade(set, $(".menu-item", c)); });
      $(".menu-compose", set).filter((e) => !e.dataset.mv).forEach((c) => {
        gsap.set(c, { opacity: 0, scale: 0.9, y: 18 * A });
        keep(set, ST.create({ trigger: c, start: "top 94%", once: true, onEnter: () => {
          c.dataset.mv = "1";
          gsap.to(c, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2)", clearProps: "opacity,transform" });
        } }));
      });
      spy(set, nav, cats);
      ST.refresh();
    };

    if (sets.length) {
      // Photos : révélation en clip-path, puis léger glissement du cadrage au défilement
      $(".menu-photos img").forEach((img, i) => {
        gsap.set(img, { clipPath: "inset(0% 0% 100% 0%)", scale: 1.08 });
        gsap.to(img, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1, ease: "power3.inOut", delay: i * 0.12, clearProps: "clipPath,transform",
          scrollTrigger: { trigger: img, start: "top 92%", once: true } });
        gsap.fromTo(img, { objectPosition: "50% 20%" }, { objectPosition: "50% 80%", ease: "none",
          scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 0.4 } });
      });
      D.reveal($(".menu-note, .direct"), { y: 24 * A }, { duration: 0.7, start: "top 94%" });
      const tabs = $(".menu-tab");
      gsap.from(tabs, { opacity: 0, x: -34 * A, duration: 0.6, stagger: 0.1, ease: D.ease, delay: 0.2, clearProps: "opacity,transform" });

      // Fin de carte
      const foot = $(".menu-foot")[0];
      if (foot) {
        gsap.set(foot, { opacity: 0, y: 36 * A });
        gsap.to(foot, { opacity: 1, y: 0, duration: 0.7, ease: D.ease, clearProps: "opacity,transform", scrollTrigger: { trigger: foot, start: "top 94%", once: true } });
        D.batch($(".menu-foot .btn"), { y: 18, scale: 0.88 }, { ease: "back.out(1.7)", stagger: 0.1, start: "top 98%" });
      }

      // Ouverture / changement d'onglet : on arme le set devenu visible, on libère l'autre
      sets.forEach((s) => { if (!live(s)) drop(s); });
      sets.filter(live).forEach(buildSet);
      const mo = new MutationObserver(() => {
        sets.forEach((s) => { if (!live(s)) drop(s); });
        sets.filter((s) => live(s) && !trs.has(s)).forEach((s) => requestAnimationFrame(() => buildSet(s)));
      });
      sets.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ["class"] }));
      ctx.add(() => {}); // garde le contexte actif
      var stop = () => mo.disconnect();
    }

    // ---- CLICK & COLLECT ----
    if (order) {
      const cc = $(".cc")[0];
      if (cc) {
        const hours = $(".cc__hours li", cc);
        const num = $(".cc__time strong", cc)[0];
        gsap.set(cc, { opacity: 0, y: 56 * A, scale: 0.93 });
        gsap.set(hours, { opacity: 0, x: -26 * A });
        const tl = gsap.timeline({ defaults: { ease: D.ease }, delay: 0.25 })
          .to(cc, { opacity: 1, y: 0, scale: 1, duration: 0.9, clearProps: "opacity,transform" }, 0)
          .to(hours, { opacity: 1, x: 0, duration: 0.45, stagger: 0.07, clearProps: "opacity,transform" }, 0.35);
        if (num && /\d+/.test(num.textContent)) {
          const to = parseInt(num.textContent, 10), txt = num.textContent, o = { v: 0 };
          num.textContent = txt.replace(/\d+/, "0");
          tl.to(o, { v: to, duration: 1.1, ease: "power2.out", onUpdate: () => (num.textContent = txt.replace(/\d+/, Math.round(o.v))), onComplete: () => (num.textContent = txt) }, 0.5);
        }
      }

      const cats = $(".order-cat", order);
      cats.forEach((c) => {
        const h2 = $("h2", c)[0];
        if (h2) D.words(h2, { start: "top 90%", stagger: 0.05, duration: 0.7 });
        const intro = $(".menu-cat__intro", c)[0];
        if (intro) D.reveal(intro, { y: 14 * A }, { duration: 0.5, start: "top 94%" });
        cascade("order", $(".order-item", c));
      });

      // Composer : bases, puis puces par groupe
      const comp = $("#o-compose")[0];
      if (comp) {
        const bases = $(".base", comp);
        gsap.set(bases, { opacity: 0, y: 22 * A, scale: 0.94 });
        gsap.to(bases, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)", stagger: 0.1, clearProps: "opacity,transform",
          scrollTrigger: { trigger: bases[0] || comp, start: "top 90%", once: true } });
        $(".compose__group", comp).forEach((g) => {
          const chips = $(".chip", g.nextElementSibling || g);
          gsap.set(g, { opacity: 0, x: -18 * A });
          gsap.set(chips, { opacity: 0, y: 14 * A, scale: 0.9 });
          const tl = gsap.timeline({ scrollTrigger: { trigger: g, start: "top 92%", once: true } });
          tl.to(g, { opacity: 1, x: 0, duration: 0.4, ease: D.ease, clearProps: "opacity,transform" })
            .to(chips, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out", stagger: { amount: Math.min(0.4, chips.length * 0.03) }, clearProps: "opacity,transform" }, 0.05);
        });
        D.reveal($(".compose__total, .compose .btn", comp), { y: 18 * A }, { duration: 0.5, start: "top 96%" });
      }

      // Panier : entrée par la droite (on n'anime que le panneau, pas le conteneur sticky)
      const panel = $(".order__panel", order)[0];
      if (panel) {
        gsap.set(panel, { opacity: 0, x: 70 * A });
        gsap.to(panel, { opacity: 1, x: 0, duration: 0.85, ease: D.ease, delay: 0.15, clearProps: "opacity,transform",
          scrollTrigger: { trigger: panel, start: "top 92%", once: true } });
      }

      spy("order", $(".order__menu .menu-nav", order)[0], cats);
    }

    return () => { stop && stop(); trs.forEach((v) => v.forEach((t) => t.kill())); trs.clear(); };
  });
});
