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

// « Ouvert maintenant » : calculé avec l'heure de Paris à partir des créneaux du site
document.querySelectorAll("[data-open-now]").forEach((el) => {
  let slots;
  try { slots = JSON.parse(el.dataset.slots); } catch { return; }
  const min = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const label = (t) => t.replace(":00", " h").replace(":", " h ").replace(/ h $/, " h");
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const day = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."].indexOf(get("weekday"));
  const now = Number(get("hour")) * 60 + Number(get("minute"));
  if (day < 0) return;
  const names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const today = slots.filter((s) => s.days.includes(day)).sort((a, b) => min(a.from) - min(b.from));
  const open = today.find((s) => now >= min(s.from) && now < min(s.to));
  if (open) {
    el.className = "open-now is-open";
    el.textContent = `Ouvert maintenant jusqu'à ${label(open.to)} (${open.mode})`;
    return;
  }
  const next = today.find((s) => min(s.from) > now);
  let msg;
  if (next) msg = `aujourd'hui à ${label(next.from)}`;
  else {
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      const s = slots.filter((x) => x.days.includes(d)).sort((a, b) => min(a.from) - min(b.from))[0];
      if (s) { msg = (i === 1 ? "demain" : names[d]) + ` à ${label(s.from)}`; break; }
    }
  }
  el.className = "open-now is-closed";
  el.textContent = `Fermé pour le moment, on rouvre ${msg}`;
});

// Jour d'aujourd'hui mis en évidence dans les listes d'horaires (heure de Paris)
{
  const wd = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date());
  const dow = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."].indexOf(wd);
  if (dow >= 0) document.querySelectorAll(`[data-dow="${dow}"]`).forEach((el) => el.classList.add("is-today"));
}
