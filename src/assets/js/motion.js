// Mouvement : noyau commun (GSAP + ScrollTrigger). Expose window.DIO pour les modules motion-*.js.
// Règle : tout état caché est posé par ce code ; sans GSAP ou avec « moins d'animations », la page reste complète.
(() => {
  const root = document.documentElement;
  const ok = root.classList.contains("has-motion") && window.gsap && window.ScrollTrigger;
  window.DIO = { ok: !!ok, modules: [], gsap: window.gsap, ST: window.ScrollTrigger };
  if (!ok) { root.classList.remove("has-motion"); root.classList.add("m-ready"); return; }
  const { gsap, ScrollTrigger: ST } = window;
  gsap.registerPlugin(ST);
  const D = window.DIO;
  D.ease = "power3.out";
  D.$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Découpe un titre en mots masqués (.m-w > .m-wi) ; retourne les spans .m-wi
  D.split = (el) => {
    if (!el) return [];
    if (el.dataset.mSplit) return D.$(".m-wi", el);
    el.dataset.mSplit = "1";
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) return frag.append(" ");
            const w = document.createElement("span");
            w.className = "m-w";
            const i = document.createElement("span");
            i.className = "m-wi";
            i.textContent = t;
            w.append(i);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("m-w")) walk(n);
      });
    };
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el);
    return D.$(".m-wi", el);
  };

  // Titre : les mots montent quand il entre à l'écran (ou tout de suite avec opts.now)
  D.words = (el, opts = {}) => {
    const w = D.split(el);
    if (!w.length) return null;
    gsap.set(w, { yPercent: 115 });
    const vars = { yPercent: 0, duration: opts.duration || 0.9, stagger: opts.stagger || 0.07, ease: D.ease, delay: opts.delay || 0 };
    if (!opts.now) vars.scrollTrigger = { trigger: el, start: opts.start || "top 88%", once: true };
    return gsap.to(w, vars);
  };

  // Apparition simple d'un élément quand il entre à l'écran
  D.reveal = (els, from = {}, opts = {}) => {
    (Array.isArray(els) ? els : [els]).filter(Boolean).forEach((el) => {
      gsap.set(el, { opacity: 0, y: 60, ...from });
      gsap.to(el, { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, clipPath: "inset(0% 0% 0% 0%)", duration: opts.duration || 0.9, ease: opts.ease || D.ease, delay: opts.delay || 0,
        scrollTrigger: { trigger: opts.trigger || el, start: opts.start || "top 88%", once: true } });
    });
  };

  // Apparition en cascade d'une liste (les éléments entrent par groupes au défilement)
  D.batch = (sel, from = {}, opts = {}) => {
    const els = typeof sel === "string" ? D.$(sel) : sel;
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 40, ...from });
    ST.batch(els, { start: opts.start || "top 92%", once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, duration: opts.duration || 0.7, stagger: opts.stagger || 0.08, ease: opts.ease || D.ease, overwrite: true }) });
  };

  // Compteur qui monte jusqu'à sa valeur (format français : « 4,5 »)
  D.count = (el, to, decimals = 0, opts = {}) => {
    const o = { v: 0 };
    el.textContent = (0).toFixed(decimals).replace(".", ",");
    gsap.to(o, { v: to, duration: opts.duration || 1.6, ease: "power2.out",
      onUpdate: () => (el.textContent = o.v.toFixed(decimals).replace(".", ",")),
      scrollTrigger: { trigger: opts.trigger || el, start: "top 90%", once: true } });
  };

  // Micro-animation de « pop » (ajout au panier, validation…)
  D.pop = (el, scale = 1.6) => el && gsap.fromTo(el, { scale }, { scale: 1, duration: 0.5, ease: "back.out(3)" });

  // ---- Comportements communs ----
  // Barre de progression
  const bar = document.createElement("div");
  bar.className = "m-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.prepend(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });

  // Barre du haut qui se cache en descendant
  const header = document.querySelector(".header");
  if (header) ST.create({ start: 0, end: "max", onUpdate: (self) => header.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 240) });

  // Pied de page : colonnes en cascade
  D.batch(".footer__grid > *, .footer .container > div > *", { y: 30 }, { stagger: 0.1 });

  // Bandeau d'appel à l'action
  const cta = document.querySelector(".cta-band");
  if (cta) {
    D.words(cta.querySelector("h2, .cta-band__title"));
    D.batch(".cta-band .btn", { y: 30, scale: 0.85 }, { ease: "back.out(1.7)", stagger: 0.12 });
  }

  // Les modules s'exécutent quand les polices sont prêtes, puis on recalcule les positions
  D.start = () => {
    D.modules.forEach((fn) => { try { fn(D); } catch (e) { console.error("motion", e); } });
    root.classList.add("m-ready");
    ST.refresh();
    window.addEventListener("load", () => ST.refresh());
  };
})();
