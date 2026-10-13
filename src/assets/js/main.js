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
        setStatus("Merci ! Votre demande est bien envoyée. Nous vous recontactons rapidement pour confirmer.", true);
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
  });
}
