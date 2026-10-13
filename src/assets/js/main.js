// Menu mobile
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
      toggle.focus();
    }
  });
}

// Carte Google Maps chargée seulement au clic (pas de cookie tiers sans action du visiteur)
document.querySelectorAll(".map-embed").forEach((box) => {
  const btn = box.querySelector("button");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src = box.dataset.src;
    iframe.title = "Carte d'accès au restaurant";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    box.replaceChildren(iframe);
  });
});

// Bouton « Recommander » : partage natif (WhatsApp, SMS…) ou copie du lien
document.querySelectorAll("[data-share]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const data = { title: btn.dataset.title, text: btn.dataset.text, url: location.origin + "/" };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
        btn.textContent = "Lien copié, collez-le dans un message !";
      }
    } catch {
      /* partage annulé */
    }
  });
});

// Copie de la demande (si la messagerie ne s'ouvre pas)
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const ta = btn.parentElement.querySelector("textarea");
    ta.select();
    try {
      await navigator.clipboard.writeText(ta.value);
      btn.textContent = "Demande copiée !";
    } catch {
      document.execCommand?.("copy");
    }
  });
});

// Offre du moment : masquée après sa date de fin, même sans nouvelle génération du site
const today = new Date().toISOString().slice(0, 10);
document.querySelectorAll(".promo[data-until]").forEach((el) => {
  if (today > el.dataset.until) el.remove();
});

// Formulaire de réservation
const form = document.getElementById("booking-form");
if (form) {
  const params = new URLSearchParams(location.search);
  const type = form.elements.type;
  if (params.get("type") && type.querySelector(`option[value="${params.get("type")}"]`)) {
    type.value = params.get("type");
  }

  // Champs adaptés au type de demande
  const adapt = () => {
    form.querySelectorAll("[data-show-for]").forEach((el) => {
      el.hidden = !el.dataset.showFor.split(",").includes(type.value);
    });
    const groupe = type.value.startsWith("privatisation") || type.value === "traiteur";
    document.getElementById("convives-label").textContent = groupe ? "Nombre de convives" : "Nombre de personnes";
  };
  type.addEventListener("change", adapt);
  adapt();

  const date = form.elements.date;
  if (date) date.min = new Date().toISOString().slice(0, 10);

  const status = form.querySelector(".form__status");
  const setStatus = (msg, ok) => {
    status.textContent = msg;
    status.className = "form__status " + (ok ? "form__status--ok" : "form__status--err");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const label = (name) => {
      const el = form.elements[name];
      return el.tagName === "SELECT" ? el.options[el.selectedIndex].text : el.value;
    };
    const lines = [
      `Demande : ${label("type")}`,
      `Nom : ${data.get("nom")}`,
      `Téléphone : ${data.get("telephone")}`,
      `E-mail : ${data.get("email")}`,
      data.get("societe") ? `Société : ${data.get("societe")}` : "",
      `Date souhaitée : ${data.get("date")} (${label("service")}${data.get("heure") ? ", " + data.get("heure") : ""})`,
      `Nombre de personnes : ${data.get("convives")}`,
      "",
      data.get("message") || "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");

    // Règles d'ouverture : midi lun–sam ; soir sur place ven–sam, à emporter mar–sam ; fermé le dimanche.
    const when = data.get("date") ? new Date(data.get("date") + "T12:00:00") : null;
    const kind = type.value;
    if (when && (kind === "table" || kind === "emporter")) {
      const day = when.getDay(); // 0 = dimanche
      const evening = data.get("service") === "diner";
      let problem = "";
      if (day === 0) problem = "Le restaurant est fermé le dimanche.";
      else if (evening && day === 1) problem = "Le lundi, le restaurant n'ouvre que le midi.";
      else if (evening && kind === "table" && day >= 2 && day <= 4)
        problem = "Du mardi au jeudi, le soir est à emporter uniquement. Choisissez « Commande à emporter », le midi, ou un vendredi ou samedi soir.";
      if (problem) {
        setStatus(problem, false);
        return;
      }
    }

    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        adapt();
        setStatus("Merci ! Votre demande est bien envoyée. Nous vous recontactons pour confirmer.", true);
        return;
      } catch {
        setStatus("L'envoi n'a pas fonctionné. Appelez-nous directement ou réessayez dans un instant.", false);
        return;
      }
    }

    // Sans service d'envoi configuré : ouverture de la messagerie avec la demande pré-remplie.
    const to = form.dataset.email;
    if (!to) {
      setStatus("La réservation en ligne n'est pas encore activée : merci de nous appeler.", false);
      return;
    }
    const subject = `Demande – ${label("type")} – ${data.get("date")}`;
    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    setStatus(`Votre messagerie s'ouvre avec la demande pré-remplie : il ne reste plus qu'à l'envoyer à ${to}.`, true);
    // Si aucun client mail ne s'ouvre, la demande reste copiable.
    const fb = form.querySelector(".form__fallback");
    if (fb) {
      fb.hidden = false;
      fb.querySelector(".form__to").textContent = to;
      fb.querySelector("textarea").value = `À : ${to}\nObjet : ${subject}\n\n${lines.join("\n")}`;
    }
  });
}

// Mouvement : apparition au défilement et braises dans le hero (sauf préférence « moins d'animations »)
if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  document.documentElement.classList.add("motion");
  const targets = document.querySelectorAll(
    ".section .container > *:not(.menu-set):not(.gallery), .section h2, .pizza, .feature, .card, .menu-item, .gallery a, .quote, .steps li, .flyer, .parking, .trio img"
  );
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.setProperty("--d", (i % 4) * 0.08 + "s");
    if (el.matches(".gallery a")) {
      const cs = getComputedStyle(el).transform;
      el.style.setProperty("--rot", i % 2 ? "1deg" : "-1.2deg");
    }
    io.observe(el);
  });
}

// Carte : onglets Sur place / À emporter (les deux restent visibles sans JavaScript)
const menuTabs = document.querySelectorAll(".menu-tab");
if (menuTabs.length) {
  const root = document.querySelector(".menu");
  const show = (key) => {
    root.classList.add("tabs-on");
    document.querySelectorAll(".menu-set").forEach((el) => el.classList.toggle("is-open", el.dataset.set === key));
    menuTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === key));
  };
  menuTabs.forEach((t) =>
    t.addEventListener("click", (e) => {
      e.preventDefault();
      show(t.dataset.tab);
      history.replaceState(null, "", "#" + t.dataset.tab);
    })
  );
  show(location.hash.startsWith("#emporter") ? "emporter" : "surplace");
}

// ---------- Motion design ----------
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Titres du hero : les mots montent un par un
  document.querySelectorAll(".hero h1").forEach((h) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) return frag.append(t);
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = t;
            inner.style.setProperty("--i", i++);
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    walk(h);
    if (calm) h.querySelectorAll(".w>span").forEach((s) => (s.style.transform = "none"));
  });

  // Pizza : chaque garniture arrive à son tour
  document.querySelectorAll(".pizza .pz > *").forEach((el, i) => el.style.setProperty("--k", i % 9));

  if (calm) return;

  // Parallaxe douce
  let ticking = false;
  const root = document.documentElement;
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        root.style.setProperty("--sy", String(Math.min(scrollY, 900)));
        ticking = false;
      });
    },
    { passive: true }
  );

  // Flammes dans le hero (canvas, en pause hors écran)
  const hero = document.querySelector(".hero--photo");
  if (!hero || !HTMLCanvasElement.prototype.getContext) return;
  const cv = document.createElement("canvas");
  cv.className = "fire";
  cv.setAttribute("aria-hidden", "true");
  hero.prepend(cv);
  const ctx = cv.getContext("2d");
  const small = innerWidth < 700;
  const N = small ? 70 : 150;
  let W = 0, H = 0, parts = [], running = false, last = 0;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const size = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (p) => {
    // flammes plus fournies sur la gauche, où se trouve le texte
    p.x = Math.random() * W * (0.25 + Math.random() * 0.75);
    p.y = H + 10;
    p.r = 18 + Math.random() * (small ? 26 : 44);
    p.vy = 40 + Math.random() * 90;
    p.life = 0;
    p.max = 1.4 + Math.random() * 1.6;
    p.ph = Math.random() * 6.28;
    p.sp = Math.random() < 0.12; // étincelle
    if (p.sp) { p.r = 1.5 + Math.random() * 2; p.vy = 90 + Math.random() * 160; p.max = 2 + Math.random() * 2; }
    return p;
  };
  size();
  parts = Array.from({ length: N }, () => { const p = spawn({}); p.life = Math.random() * p.max; return p; });
  const frame = (t) => {
    if (!running) return;
    const dt = Math.min((t - last) / 1000 || 0.016, 0.05);
    last = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.life += dt;
      if (p.life > p.max) spawn(p);
      const k = p.life / p.max;
      p.y -= p.vy * dt;
      const x = p.x + Math.sin(p.ph + p.life * 3) * (p.sp ? 18 : 10) * (0.4 + k);
      const r = p.r * (p.sp ? 1 : 1 - k * 0.7);
      const a = p.sp ? 0.9 * (1 - k) : 0.5 * Math.sin(Math.PI * Math.min(k * 1.2, 1)) * (1 - k * 0.3);
      const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
      if (p.sp) { g.addColorStop(0, `rgba(255,214,130,${a})`); g.addColorStop(1, "rgba(255,160,40,0)"); }
      else {
        g.addColorStop(0, `rgba(255,${190 - k * 90 | 0},${70 - k * 50 | 0},${a})`);
        g.addColorStop(0.5, `rgba(${230 - k * 40 | 0},${90 - k * 50 | 0},20,${a * 0.6})`);
        g.addColorStop(1, "rgba(120,30,10,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, p.y, r, 0, 6.2832); ctx.fill();
    }
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
  const stop = () => { running = false; };
  new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop()), { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  addEventListener("resize", size);
})();
