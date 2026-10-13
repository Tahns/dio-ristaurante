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
    ".section .container > *, .feature, .card, .menu-item, .gallery a, .quote, .steps li, .flyer, .parking, .trio img"
  );
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12 }
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
  const hero = document.querySelector(".hero--photo");
  if (hero) {
    const box = document.createElement("div");
    box.className = "embers";
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 16; i++) {
      const b = document.createElement("i");
      b.style.cssText = `left:${(i * 37) % 100}%;--s:${3 + (i % 4) * 2}px;--t:${6 + (i % 5) * 1.6}s;--w:${(i % 7) * 0.9}s;--x:${(i % 2 ? 1 : -1) * (20 + (i % 5) * 18)}px`;
      box.appendChild(b);
    }
    hero.appendChild(box);
  }
}
