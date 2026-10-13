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

// ---------- Réservation et commande à emporter ----------
const DAYS_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtH = (m) => (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m / 60} h`);
const euros = (cents) => (cents / 100).toFixed(2).replace(".", ",").replace(",00", "") + " €";
const parisNow = () => {
  const o = {};
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).forEach((p) => (o[p.type] = p.value));
  return { date: `${o.year}-${o.month}-${o.day}`, minutes: Number(o.hour) * 60 + Number(o.minute) };
};
const dayOf = (iso) => new Date(iso + "T12:00:00").getDay();
const longDate = (iso) => { const d = new Date(iso + "T12:00:00"); return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

// Créneaux d'un jour : toutes les 15 minutes, jusqu'à 30 minutes avant la fermeture.
// kind « table » : seulement les services sur place. « emporter » : tous, avec un délai de préparation.
const slotGroups = (slots, iso, kind, lead) => {
  const now = parisNow();
  return slots
    .filter((s) => s.days.includes(dayOf(iso)) && (kind !== "table" || s.mode.includes("sur place")))
    .sort((a, b) => toMin(a.from) - toMin(b.from))
    .map((s) => {
      const times = [];
      for (let m = toMin(s.from); m <= toMin(s.to) - 30; m += 15) if (iso !== now.date || m >= now.minutes + lead) times.push(m);
      return { label: toMin(s.from) < 15 * 60 ? "Midi" : "Soir", mode: s.mode, times };
    });
};

// Liste déroulante des heures, avec les groupes Midi / Soir
const renderTimes = (select, hintEl, groups, emptyMsg) => {
  const total = groups.reduce((n, g) => n + g.times.length, 0);
  select.replaceChildren();
  const first = document.createElement("option");
  first.value = "";
  first.textContent = total ? "Choisir une heure" : "Aucune heure disponible";
  select.append(first);
  groups.filter((g) => g.times.length).forEach((g) => {
    const og = document.createElement("optgroup");
    og.label = g.label;
    g.times.forEach((m) => {
      const o = document.createElement("option");
      o.value = fmtH(m);
      o.textContent = fmtH(m);
      og.append(o);
    });
    select.append(og);
  });
  select.disabled = !total;
  if (hintEl) hintEl.textContent = total ? "" : emptyMsg;
};

// Calendrier du mois : les jours fermés ou passés sont grisés
const makeCalendar = (box, { min, max, isClosed, onPick }) => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const minD = new Date(min + "T12:00:00");
  const maxD = new Date(max + "T12:00:00");
  let view = new Date(minD.getFullYear(), minD.getMonth(), 1);
  let selected = "";
  const btn = (text, label, onClick, disabled) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", label);
    b.disabled = disabled;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  const render = () => {
    box.replaceChildren();
    const head = document.createElement("div");
    head.className = "cal__head";
    const title = document.createElement("strong");
    title.setAttribute("aria-live", "polite");
    title.textContent = `${MONTHS[view.getMonth()][0].toUpperCase()}${MONTHS[view.getMonth()].slice(1)} ${view.getFullYear()}`;
    const prevOff = view.getFullYear() * 12 + view.getMonth() <= minD.getFullYear() * 12 + minD.getMonth();
    const nextOff = view.getFullYear() * 12 + view.getMonth() >= maxD.getFullYear() * 12 + maxD.getMonth();
    head.append(
      btn("‹", "Mois précédent", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); }, prevOff),
      title,
      btn("›", "Mois suivant", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); }, nextOff)
    );
    const grid = document.createElement("div");
    grid.className = "cal__grid";
    ["L", "M", "M", "J", "V", "S", "D"].forEach((d, i) => {
      const w = document.createElement("span");
      w.className = "cal__dow";
      w.setAttribute("aria-hidden", "true");
      w.textContent = d;
      grid.append(w);
    });
    const offset = (view.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(document.createElement("span"));
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= days; n++) {
      const d = new Date(view.getFullYear(), view.getMonth(), n, 12);
      const key = iso(d);
      const off = key < min || key > max || isClosed(key);
      const b = btn(n, longDate(key) + (off ? " (indisponible)" : ""), () => { selected = key; onPick(key); render(); }, off);
      b.className = "cal__day" + (key === selected ? " is-selected" : "") + (key === parisNow().date ? " is-today" : "");
      b.setAttribute("aria-pressed", key === selected ? "true" : "false");
      grid.append(b);
    }
    box.append(head, grid);
  };
  render();
  return { get value() { return selected; } };
};

// Envoi : service d'envoi (Formspree…), sinon e-mail, sinon récapitulatif à confirmer par téléphone.
// Retourne « sent », « mailto » ou « call ».
const deliver = async (root, formEl, subject, lines) => {
  const endpoint = root.dataset.endpoint;
  const email = root.dataset.email;
  const text = lines.join("\n");
  if (endpoint) {
    const data = new FormData(formEl);
    data.set("_subject", subject);
    data.set("recapitulatif", text);
    const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);
    return "sent";
  }
  if (email) {
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    return "mailto";
  }
  return "call";
};

const showRecap = (recap, mode, title, lines, root, back) => {
  const tel = root.dataset.tel;
  const phone = root.dataset.phone;
  const msg = {
    sent: ["Demande envoyée", "Merci ! Nous vous recontactons pour confirmer. La demande n'est confirmée qu'une fois validée par le restaurant."],
    mailto: ["Plus qu'un clic", `Votre messagerie s'est ouverte avec la demande. Envoyez le message pour la transmettre à ${root.dataset.email}.`],
    call: ["Dernière étape : un coup de fil", `Votre demande n'est pas encore transmise au restaurant. Appelez-nous au ${phone} pour la confirmer : donnez simplement ce récapitulatif.`],
  }[mode];
  recap.replaceChildren();
  const h = document.createElement("h2");
  h.textContent = title;
  const badge = document.createElement("p");
  badge.className = "recap__badge recap__badge--" + mode;
  badge.textContent = msg[0];
  const p = document.createElement("p");
  p.textContent = msg[1];
  const pre = document.createElement("pre");
  pre.className = "recap__text";
  pre.textContent = lines.join("\n");
  const warn = document.createElement("p");
  warn.className = "cancel-note";
  warn.innerHTML = `<strong>Un empêchement ?</strong> Prévenez-nous au ${phone} dès que possible pour annuler ou modifier.`;
  const actions = document.createElement("p");
  actions.className = "recap__actions";
  if (tel) {
    const call = document.createElement("a");
    call.className = "btn btn--primary btn--lg";
    call.href = "tel:" + tel;
    call.textContent = "Appeler le " + phone;
    actions.append(call);
  }
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "btn btn--dark";
  copy.textContent = "Copier le récapitulatif";
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lines.join("\n")); copy.textContent = "Copié !"; } catch { const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); }
  });
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "btn btn--light";
  edit.textContent = "Modifier";
  edit.addEventListener("click", back);
  actions.append(copy, edit);
  recap.append(h, badge, p, pre, warn, actions);
  recap.hidden = false;
  recap.scrollIntoView({ block: "start" });
};

// ----- Réservation d'une table
const form = document.getElementById("booking-form");
if (form) {
  const slots = JSON.parse(form.dataset.slots || "[]");
  const recap = document.getElementById("booking-recap");
  const status = form.querySelector(".form__status");
  const typeOf = () => form.elements.type.value;
  const date = form.elements.date;
  const select = form.elements.heure;
  const now = parisNow();
  const max = new Date(now.date + "T12:00:00");
  max.setDate(max.getDate() + 120);

  const params = new URLSearchParams(location.search);
  if (params.get("type")?.startsWith("privatisation") || params.get("type") === "traiteur") form.querySelector('input[name="type"][value="groupe"]').checked = true;

  const qty = form.elements.convives;
  const hint = document.getElementById("convives-hint");
  const clampQty = () => {
    const mx = typeOf() === "groupe" ? 80 : 12;
    qty.max = mx;
    qty.value = Math.min(Math.max(Number(qty.value) || 1, 1), mx);
    hint.textContent = typeOf() === "table" && Number(qty.value) >= 12 ? "Plus de 12 personnes ? Choisissez « Un groupe ou un événement »." : "";
  };
  form.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => { qty.value = (Number(qty.value) || 1) + Number(b.dataset.step); clampQty(); }));
  qty.addEventListener("change", clampQty);

  const refreshTimes = () => {
    const iso = date.value;
    const hintEl = document.getElementById("heure-hint");
    if (!iso) return renderTimes(select, null, [], "");
    const d = dayOf(iso);
    let msg = "Aucune heure disponible ce jour-là.";
    if (d >= 2 && d <= 4) msg = "Du mardi au jeudi soir, on prépare uniquement des plats à emporter.";
    const groups = slotGroups(slots, iso, "table", 0);
    renderTimes(select, hintEl, groups, msg);
    if (groups.some((g) => g.times.length) && d >= 2 && d <= 4) hintEl.textContent = "Le soir du mardi au jeudi, c'est uniquement à emporter : voir la page « Commander ».";
  };
  const cal = makeCalendar(document.getElementById("cal"), {
    min: now.date,
    max: max.toISOString().slice(0, 10),
    isClosed: (iso) => dayOf(iso) === 0,
    onPick: (iso) => {
      date.value = iso;
      document.getElementById("date-picked").textContent = "Jour choisi : " + longDate(iso);
      refreshTimes();
    },
  });
  const adapt = () => {
    form.querySelectorAll("[data-show-for]").forEach((el) => (el.hidden = !el.dataset.showFor.split(",").includes(typeOf())));
    form.querySelectorAll("[data-hide-for]").forEach((el) => (el.hidden = el.dataset.hideFor.split(",").includes(typeOf())));
    clampQty();
    document.getElementById("convives-label").textContent = typeOf() === "groupe" ? "Combien de convives ?" : "Combien de personnes ?";
  };
  form.elements.type.forEach((r) => r.addEventListener("change", adapt));
  adapt();

  const setStatus = (msg, ok) => { status.textContent = msg; status.className = "form__status " + (ok ? "form__status--ok" : "form__status--err"); };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", true);
    const groupe = typeOf() === "groupe";
    select.required = !groupe;
    if (!date.value) return setStatus("Choisissez un jour dans le calendrier.", false);
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const heure = groupe ? d.get("heure_libre") && fmtH(toMin(d.get("heure_libre"))) : d.get("heure");
    const lines = [
      groupe ? "Demande : groupe ou événement" : "Réservation de table",
      `Nom : ${d.get("nom")}`,
      `Téléphone : ${d.get("telephone")}`,
      d.get("societe") ? `Société : ${d.get("societe")}` : "",
      `Jour : ${longDate(d.get("date"))}${heure ? " à " + heure : ""}`,
      `Personnes : ${d.get("convives")}`,
      d.get("message") ? `Précisions : ${d.get("message")}` : "",
      "Je préviendrai le restaurant en cas d'annulation ou de retard.",
    ].filter(Boolean);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const mode = await deliver(form, form, `Réservation – ${longDate(d.get("date"))} – ${d.get("nom")}`, lines);
      form.hidden = true;
      showRecap(recap, mode, "Votre réservation", lines, form, () => { recap.hidden = true; form.hidden = false; });
    } catch {
      setStatus("L'envoi n'a pas fonctionné. Appelez-nous directement ou réessayez dans un instant.", false);
    } finally {
      submit.disabled = false;
    }
  });
}

// ----- Commande à emporter
const order = document.getElementById("order");
if (order) {
  const slots = JSON.parse(order.dataset.slots || "[]");
  const cart = new Map(); // id -> { name, price, qty }
  const linesEl = order.querySelector(".cart-lines");
  const emptyEl = order.querySelector(".cart-empty");
  const totalEl = order.querySelector(".cart-total");
  const bar = order.querySelector(".order-bar");
  const oform = document.getElementById("order-form");
  const recap = document.getElementById("order-recap");
  const status = oform.querySelector(".form__status");
  const LEAD = 30;
  try { JSON.parse(localStorage.getItem("dio-cart") || "[]").forEach(([id, v]) => cart.set(id, v)); } catch {}

  const total = () => [...cart.values()].reduce((n, v) => n + v.price * v.qty, 0);
  const count = () => [...cart.values()].reduce((n, v) => n + v.qty, 0);

  const paint = () => {
    order.querySelectorAll(".order-item").forEach((li) => {
      const q = cart.get(li.dataset.id)?.qty || 0;
      li.classList.toggle("is-in", q > 0);
      li.querySelector("[data-act=minus]").hidden = q === 0;
      const out = li.querySelector("output");
      out.hidden = q === 0;
      out.textContent = q;
    });
    linesEl.replaceChildren(...[...cart.values()].map((v) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${v.qty} × ${v.name}`;
      const price = document.createElement("span");
      price.textContent = euros(v.price * v.qty);
      li.append(name, price);
      return li;
    }));
    emptyEl.hidden = cart.size > 0;
    totalEl.hidden = cart.size === 0;
    totalEl.querySelector("strong").textContent = euros(total());
    bar.hidden = cart.size === 0;
    bar.querySelector(".order-bar__count").textContent = count();
    bar.querySelector(".order-bar__total").textContent = euros(total());
    try { localStorage.setItem("dio-cart", JSON.stringify([...cart])); } catch {}
  };

  order.querySelectorAll(".order-item").forEach((li) => {
    li.querySelector("[data-act=plus]").addEventListener("click", () => {
      const cur = cart.get(li.dataset.id) || { name: li.dataset.name, price: Number(li.dataset.price), qty: 0 };
      cur.qty = Math.min(cur.qty + 1, 30);
      cart.set(li.dataset.id, cur);
      paint();
    });
    li.querySelector("[data-act=minus]").addEventListener("click", () => {
      const cur = cart.get(li.dataset.id);
      if (!cur) return;
      cur.qty -= 1;
      if (cur.qty <= 0) cart.delete(li.dataset.id);
      paint();
    });
  });

  // Jour de retrait : calendrier sur 14 jours, seuls les jours qui ont encore une heure disponible sont cliquables
  const dateEl = document.getElementById("o-date");
  const timeSel = document.getElementById("o-heure");
  const now = parisNow();
  const maxD = new Date(now.date + "T12:00:00");
  maxD.setDate(maxD.getDate() + 14);
  makeCalendar(document.getElementById("o-cal"), {
    min: now.date,
    max: maxD.toISOString().slice(0, 10),
    isClosed: (iso) => !slotGroups(slots, iso, "emporter", LEAD).some((g) => g.times.length),
    onPick: (iso) => {
      dateEl.value = iso;
      document.getElementById("o-date-picked").textContent = "Retrait le " + longDate(iso);
      renderTimes(timeSel, document.getElementById("o-heure-hint"), slotGroups(slots, iso, "emporter", LEAD), "Plus d'heure disponible ce jour-là.");
    },
  });
  paint();

  const setStatus = (msg, ok) => { status.textContent = msg; status.className = "form__status " + (ok ? "form__status--ok" : "form__status--err"); };
  oform.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cart.size) return setStatus("Ajoutez au moins un plat à votre commande.", false);
    if (!dateEl.value) return setStatus("Choisissez le jour de retrait dans le calendrier.", false);
    if (!oform.reportValidity()) return;
    const d = new FormData(oform);
    const lines = [
      "Commande à emporter",
      `Nom : ${d.get("nom")}`,
      `Téléphone : ${d.get("telephone")}`,
      `Retrait : ${longDate(d.get("date"))} à ${d.get("heure")}`,
      "",
      ...[...cart.values()].map((v) => `${v.qty} × ${v.name} : ${euros(v.price * v.qty)}`),
      `Total : ${euros(total())} (à payer sur place)`,
      d.get("message") ? `\nRemarque : ${d.get("message")}` : "",
      "Je préviendrai le restaurant en cas d'annulation.",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
    const submit = oform.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const mode = await deliver(order, oform, `Commande à emporter – ${longDate(d.get("date"))} ${d.get("heure")} – ${d.get("nom")}`, lines);
      order.querySelector(".order__menu").hidden = true;
      order.querySelector(".order__cart").hidden = true;
      bar.hidden = true;
      if (mode !== "call") { cart.clear(); paint(); }
      showRecap(recap, mode, "Votre commande", lines, order, () => {
        recap.hidden = true;
        order.querySelector(".order__menu").hidden = false;
        order.querySelector(".order__cart").hidden = false;
        bar.hidden = cart.size === 0;
      });
    } catch {
      setStatus("L'envoi n'a pas fonctionné. Appelez-nous directement ou réessayez dans un instant.", false);
    } finally {
      submit.disabled = false;
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
