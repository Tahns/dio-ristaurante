// Mouvement : zone « forms » (réservation, Click & Collect, micro-interactions).
// Règles : aucune animation ne bloque un contrôle ; tout est nettoyé (clearProps) à la fin ; main.js n'est jamais modifié.
window.DIO && window.DIO.ok && window.DIO.modules.push((D) => {
  const { gsap, ST, $ } = D;
  const CLEAR = "opacity,transform,visibility";
  const q = (s, c = document) => c.querySelector(s);
  const frame = (fn) => requestAnimationFrame(fn);
  const alive = (el) => el && el.isConnected && !el.hidden;

  // Petites briques réutilisables ---------------------------------------------
  const pop = (el, from = 1.5) => alive(el) && gsap.fromTo(el, { scale: from }, { scale: 1, duration: 0.45, ease: "back.out(3)", overwrite: true, clearProps: "transform" });
  const glide = (el, x = -16) => alive(el) && el.textContent.trim() && gsap.fromTo(el, { opacity: 0, x }, { opacity: 1, x: 0, duration: 0.4, ease: D.ease, overwrite: true, clearProps: "opacity,transform" });
  const shake = (el) => alive(el) && gsap.fromTo(el, { x: 0 }, { keyframes: { x: [-9, 8, -6, 4, -2, 0] }, duration: 0.45, ease: "none", overwrite: true, clearProps: "transform" });
  const ring = (el, rgb = "200,140,40") => alive(el) && gsap.fromTo(el, { boxShadow: `0 0 0 0 rgba(${rgb},.6)` }, { boxShadow: `0 0 0 10px rgba(${rgb},0)`, duration: 0.6, ease: "power2.out", overwrite: "auto", clearProps: "boxShadow" });
  const flash = (el, from = "#ffc857") => {
    if (!alive(el)) return;
    // revient à la couleur d'origine (calculée) puis rend la main à la feuille de style
    gsap.set(el, { clearProps: "backgroundColor" });
    const to = getComputedStyle(el).backgroundColor;
    gsap.fromTo(el, { backgroundColor: from }, { backgroundColor: to, duration: 0.8, ease: "power2.out", overwrite: true, clearProps: "backgroundColor" });
  };

  // Entrée groupée de blocs qu'un script vient d'afficher (changement de type, retour du formulaire…)
  const enter = (els, vars = {}) => {
    const list = els.filter(alive);
    if (list.length) gsap.fromTo(list, { opacity: 0, x: -22 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, ease: D.ease, overwrite: true, clearProps: "opacity,transform", ...vars });
  };

  // ============================== Réservation =================================
  const form = q("#booking-form");
  if (form) {
    // Intro du formulaire en cascade rapide (le titre de page est animé par motion-pages.js)
    const blocks = [...form.children].filter((el) => !el.hidden);
    gsap.from(blocks, { opacity: 0, y: 22, duration: 0.5, stagger: 0.045, delay: 0.1, ease: D.ease, clearProps: CLEAR });
    const days = $(".cal__day", q("#cal"));
    if (days.length) gsap.from(days, { opacity: 0, scale: 0.7, duration: 0.3, stagger: 0.009, delay: 0.35, ease: "back.out(2)", clearProps: "opacity,transform" });

    // Note d'annulation : un petit appel du regard, une seule fois
    const note = q(".cancel-note", form);
    if (note) ST.create({ trigger: note, start: "top 85%", once: true, onEnter: () => {
      gsap.timeline({ delay: 0.5 })
        .fromTo(note, { backgroundColor: "#ffd27a" }, { backgroundColor: "#fdf3dd", duration: 1.1, ease: "power2.out", clearProps: "backgroundColor" }, 0)
        .fromTo(note, { x: 0 }, { keyframes: { x: [-7, 6, -4, 3, 0] }, duration: 0.5, ease: "none", clearProps: "transform" }, 0);
    } });

    // Compteur de personnes
    const qty = q("#convives");
    form.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (!b) return;
      const up = Number(b.dataset.step) > 0;
      gsap.fromTo(qty, { scale: up ? 1.3 : 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(3)", overwrite: true, clearProps: "transform" });
      glide(q("#convives-hint"), 0);
    });
    qty.addEventListener("change", () => pop(qty, 1.2));

    // Type de demande : les champs qui apparaissent entrent en glissant
    form.addEventListener("change", (e) => {
      if (e.target.name !== "type") return;
      pop(e.target.nextElementSibling, 0.9);
      frame(() => enter($("[data-show-for], [data-hide-for]", form)));
    });

    // Validation native : le champ en défaut secoue
    form.addEventListener("invalid", (e) => shake(e.target.closest(".field") || e.target), true);

    // Bouton « Valider » : un halo quand tout est rempli (sans transform : le CSS gère déjà son survol)
    const submit = q('[type="submit"]', form);
    const complete = () => !!form.elements.date.value && $("[required]", form).filter((c) => !c.closest("[hidden]")).every((c) => (c.type === "checkbox" ? c.checked : c.value.trim() !== ""));
    let was = false;
    const watch = () => { const now = complete(); if (now && !was) ring(submit); was = now; };
    form.addEventListener("input", watch);
    form.addEventListener("change", () => frame(watch));
    form.addEventListener("click", () => frame(watch));
  }

  // ===================== Calendriers (réservation + commande) ================
  const wireCal = (box, ids) => {
    if (!box) return;
    let dir = 1;
    const [pickedId, selectId, hintId] = ids;
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !box.contains(b)) return;
      if (b.classList.contains("cal__day")) {
        // re-rendu synchrone : le jour choisi est le nouveau .is-selected
        const sel = q(".cal__day.is-selected", box);
        pop(sel, 0.55);
        if (sel) ring(sel, "21,21,21");
        glide(q("#" + pickedId), -18);
        const select = q("#" + selectId);
        if (select && !select.disabled) gsap.fromTo(select, { boxShadow: "0 0 0 0 rgba(200,140,40,.7)" }, { boxShadow: "0 0 0 8px rgba(200,140,40,0)", duration: 0.7, ease: "power2.out", overwrite: "auto", clearProps: "boxShadow" });
        if (select) gsap.fromTo(select, { y: -4 }, { y: 0, duration: 0.35, ease: "back.out(3)", clearProps: "transform" });
        glide(q("#" + hintId), -10);
      } else {
        // changement de mois : la grille glisse dans le sens de la navigation
        dir = /suivant/i.test(b.getAttribute("aria-label") || "") ? 1 : -1;
        const grid = q(".cal__grid", box);
        if (grid) gsap.fromTo(grid, { opacity: 0, x: 26 * dir }, { opacity: 1, x: 0, duration: 0.32, ease: D.ease, overwrite: true, clearProps: "opacity,transform" });
        const t = q(".cal__head strong", box);
        if (t) gsap.fromTo(t, { opacity: 0, y: -8 * dir }, { opacity: 1, y: 0, duration: 0.3, ease: D.ease, clearProps: "opacity,transform" });
      }
    });
  };
  wireCal(q("#cal"), ["date-picked", "heure", "heure-hint"]);
  wireCal(q("#o-cal"), ["o-date-picked", "o-heure", "o-heure-hint"]);

  // ===================== Messages d'état (erreur / succès) ====================
  $(".form__status").forEach((st) => {
    new MutationObserver(() => {
      if (!st.textContent.trim()) return;
      if (st.classList.contains("form__status--err")) shake(st);
      else glide(st, -12);
    }).observe(st, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  });

  // ============================ Récapitulatifs ================================
  const wireRecap = (recap) => {
    if (!recap) return;
    let shown = !recap.hidden;
    new MutationObserver(() => {
      const now = !recap.hidden && recap.children.length > 0;
      if (now && !shown) {
        const btns = $(".recap__actions > *", recap);
        btns.forEach((b) => b.classList.add("mf-anim"));
        const tl = gsap.timeline({ defaults: { ease: D.ease }, onComplete: () => btns.forEach((b) => b.classList.remove("mf-anim")) });
        tl.fromTo(recap, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.55, clearProps: CLEAR }, 0);
        const t = q("h2", recap);
        if (t) tl.fromTo(t, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, clearProps: CLEAR }, 0.1);
        const badge = q(".recap__badge", recap);
        if (badge) tl.fromTo(badge, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(2.4)", clearProps: CLEAR }, 0.2);
        const text = q(".recap__text", recap);
        if (text) tl.fromTo(text, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5, clearProps: CLEAR }, 0.35);
        const note = q(".cancel-note", recap);
        if (note) tl.fromTo(note, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, clearProps: CLEAR }, 0.5);
        if (btns.length) tl.fromTo(btns, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, clearProps: CLEAR }, 0.55);
      }
      shown = now;
    }).observe(recap, { attributes: true, attributeFilter: ["hidden"], childList: true });
  };
  wireRecap(q("#booking-recap"));
  wireRecap(q("#order-recap"));

  // Retour au formulaire / à la carte (bouton « Modifier ») : les blocs reviennent doucement
  const back = (el) => {
    if (!el) return;
    let wasHidden = el.hidden;
    new MutationObserver(() => {
      if (wasHidden && !el.hidden) gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: D.ease, overwrite: true, clearProps: CLEAR });
      wasHidden = el.hidden;
    }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
  };
  back(form);

  // ============================ Click & Collect ===============================
  const order = q("#order");
  if (order) {
    back(q(".order__menu", order));
    back(q(".order__cart", order));

    // Boutons + / − des articles (le DOM est déjà à jour : le listener de main.js passe avant)
    order.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const li = b.closest(".order-item");
      if (!li) return;
      const plus = b.dataset.act === "plus";
      const out = q("output", li);
      if (plus) {
        pop(out, 1.7);
        if (li.classList.contains("is-in")) flash(li);
        gsap.fromTo(b, { scale: 0.82 }, { scale: 1, duration: 0.4, ease: "back.out(3)", overwrite: true, clearProps: "transform" });
      } else {
        gsap.fromTo(out, { scale: 0.7 }, { scale: 1, duration: 0.3, ease: "back.out(3)", overwrite: true, clearProps: "transform" });
      }
    });

    // Lignes du panier : nouvelle ligne depuis la droite, quantité qui change en pulse, sortie douce
    const linesEl = q(".cart-lines", order);
    const read = () => new Map($("li:not(.mf-ghost)", linesEl).map((li) => [li.children[0]?.textContent.replace(/^\d+\s×\s/, ""), li.children[0]?.textContent]));
    let prev = read();
    if (linesEl) new MutationObserver((recs) => {
      const real = recs.some((r) => [...r.addedNodes, ...r.removedNodes].some((n) => !(n.classList && n.classList.contains("mf-ghost"))));
      if (!real) return;
      const cur = read();
      $("li:not(.mf-ghost)", linesEl).forEach((li) => {
        const name = li.children[0]?.textContent.replace(/^\d+\s×\s/, "");
        if (!prev.has(name)) {
          gsap.fromTo(li, { opacity: 0, x: 48 }, { opacity: 1, x: 0, duration: 0.45, ease: D.ease, overwrite: true, clearProps: "opacity,transform" });
          flash(li, "#ffe3a3");
        } else if (prev.get(name) !== cur.get(name)) {
          pop(li.children[0], 1.15);
          pop(li.children[1], 1.25);
        }
      });
      // lignes retirées : une copie inerte se replie puis disparaît
      recs.forEach((r) => r.removedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement) || n.classList.contains("mf-ghost")) return;
        const name = n.children[0]?.textContent.replace(/^\d+\s×\s/, "");
        if (cur.has(name) || !linesEl.isConnected || linesEl.closest("[hidden]")) return;
        const g = n.cloneNode(true);
        g.classList.add("mf-ghost");
        g.setAttribute("aria-hidden", "true");
        g.querySelectorAll("button").forEach((x) => (x.tabIndex = -1));
        linesEl.append(g);
        gsap.to(g, { opacity: 0, x: 40, height: 0, paddingBottom: 0, borderBottomWidth: 0, marginBottom: -6, duration: 0.35, ease: "power2.in", onComplete: () => g.remove() });
      }));
      prev = cur;
    }).observe(linesEl, { childList: true });

    // Total, barre mobile, prix du composeur : pulse quand la valeur change
    const watchText = (el, fn) => {
      if (!el) return;
      let last = el.textContent;
      new MutationObserver(() => { if (el.textContent !== last) { last = el.textContent; fn(); } }).observe(el, { childList: true, characterData: true, subtree: true });
    };
    const total = q(".cart-total strong", order);
    watchText(total, () => { pop(total, 1.35); ring(total.parentElement, "200,140,40"); });
    const bar = q(".order-bar", order);
    watchText(q(".order-bar__total", order), () => {
      if (!alive(bar)) return;
      gsap.fromTo(bar, { y: 0 }, { keyframes: { y: [-14, 0, -5, 0] }, duration: 0.55, ease: "power2.out", overwrite: true, clearProps: "transform" });
      pop(q(".order-bar__count", bar), 1.4);
    });
    if (bar) new MutationObserver(() => { if (!bar.hidden) gsap.fromTo(bar, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)", overwrite: true, clearProps: CLEAR }); }).observe(bar, { attributes: true, attributeFilter: ["hidden"] });

    // Composeur de pizza
    const compose = q("#o-compose");
    if (compose) {
      watchText(q("[data-compose-total]", compose), () => pop(q("[data-compose-total]", compose), 1.3));
      compose.addEventListener("change", (e) => {
        const chip = e.target.closest(".chip, .base");
        const span = chip && chip.querySelector("span");
        if (span) gsap.fromTo(span, { scale: e.target.checked ? 0.86 : 1.08 }, { scale: 1, duration: 0.45, ease: "back.out(3)", overwrite: true, clearProps: "transform" });
      });
      compose.addEventListener("click", (e) => {
        const add = e.target.closest("[data-compose-add]");
        if (!add) return;
        // la pizza « part » vers le panier : pulse du bouton, message qui glisse, panier qui s'illumine
        ring(add, "27,107,58");
        glide(q(".compose__ok", compose), -14);
        const cart = q(".order__panel", order);
        if (cart && !cart.closest("[hidden]")) gsap.fromTo(cart, { y: 0 }, { keyframes: { y: [-6, 0] }, duration: 0.4, ease: "back.out(3)", overwrite: "auto", clearProps: "transform" });
        $(".chip > span", compose).forEach((s) => gsap.fromTo(s, { opacity: 0.4 }, { opacity: 1, duration: 0.5, clearProps: "opacity" }));
      });
    }
  }
});
