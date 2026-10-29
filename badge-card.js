{ // bloc isolé
/*
 * Badge Card (FR)
 * Carte Home Assistant « derniers passages de badge » : une ligne par personne avec initiales, heure du dernier passage
 * (relative et absolue), passages récents mis en avant, anciens estompés mais toujours visibles.
 * Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.0.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */
const DEFAULTS = {
  title: "Accès", theme: "auto", ...GV_DEFAULTS,
  people: [], // [{ entity, name, icon }] ou noms d'entités (input_text, sensor, datetime…)
  recent_minutes: 60, // passage « récent » (mis en avant)
  old_days: 7, // au-delà, la ligne est estompée
  sort_by_recent: false,
  time_source: "auto", // auto = valeur lue dans l'entité, sinon date de changement ; value ; changed
  empty_text: "Pas encore de passage",
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMPTY = ["", "unknown", "unavailable", "none", "null", "-", "--", "0"];
const p2 = (n) => String(n).padStart(2, "0");

/* Lit une date dans des formats courants : ISO, « 28/10/2026 18:42 », « 18:42 », timestamp */
function parseWhen(raw, now = new Date()) {
  const v = String(raw ?? "").trim();
  if (EMPTY.includes(v.toLowerCase())) return null;
  if (/^\d{9,13}(\.\d+)?$/.test(v)) { const n = Number(v); return new Date(n < 1e12 ? n * 1000 : n); }
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(.*)$/);
  if (m) { const t = Date.parse(v.replace(" ", "T")); return isNaN(t) ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) : new Date(t); }
  m = v.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?[ T,àa]*(\d{1,2})[:hH](\d{2})(?::(\d{2}))?/);
  if (m) { let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)); }
  m = v.match(/^(\d{1,2})[:hH](\d{2})(?::(\d{2}))?$/);
  if (m) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +m[1], +m[2], +(m[3] || 0)); if (d > now) d.setDate(d.getDate() - 1); return d; }
  const t = Date.parse(v); return isNaN(t) ? null : new Date(t);
}
function rel(d, now) {
  const s = Math.max(0, Math.round((now - d) / 1000));
  if (s < 60) return "à l'instant";
  const mn = Math.floor(s / 60); if (mn < 60) return `il y a ${mn} min`;
  const h = Math.floor(mn / 60); if (h < 24) return `il y a ${h} h${mn % 60 ? " " + p2(mn % 60) : ""}`;
  const j = Math.floor(h / 24); return `il y a ${j} j`;
}
function abs(d, now) {
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((day(now) - day(d)) / 864e5), hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (diff === 0) return `Aujourd'hui à ${hm}`;
  if (diff === 1) return `Hier à ${hm}`;
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}${d.getFullYear() !== now.getFullYear() ? "/" + d.getFullYear() : ""} à ${hm}`;
}
const initials = (n) => { const w = String(n).trim().split(/[\s_-]+/).filter(Boolean); return ((w[0] || "?")[0] + (w.length > 1 ? w[1][0] : "")).toUpperCase(); };

class BadgeCard extends HTMLElement {
  static getConfigElement() { return document.createElement("badge-card-editor"); }
  static getStubConfig(hass) {
    const t = Object.keys((hass && hass.states) || {}).filter((k) => k.startsWith("input_text.badge")).slice(0, 4);
    return { ...DEFAULTS, people: t };
  }
  constructor() { super(); this.attachShadow({ mode: "open" }); this._sig = ""; }
  connectedCallback() { this._iv = setInterval(() => { this._sig = ""; if (this._hass) this._render(); }, 30000); }
  disconnectedCallback() { clearInterval(this._iv); }
  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.people)) this._config.people = [];
    this._sig = ""; if (this._hass) this._render();
  }
  set hass(hass) {
    this._hass = hass; if (!this._config) return;
    const sig = this._people().map((p) => { const s = hass.states[p.entity]; return s ? s.state + "|" + s.last_changed : "x"; }).join(";") + (this._isDark() ? "d" : "l");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  getCardSize() { return 1 + this._people().length; }
  _people() { return (this._config.people || []).map((i) => (typeof i === "string" ? { entity: i } : i)).filter((i) => i && i.entity); }
  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true; if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _when(s, now) {
    const c = this._config; if (!s || s.state === "unavailable") return { d: null, raw: "" };
    const empty = EMPTY.includes(String(s.state).trim().toLowerCase());
    if (c.time_source === "changed") return { d: new Date(s.last_changed), raw: s.state };
    const d = parseWhen(s.state, now);
    if (d) return { d, raw: s.state };
    if (c.time_source === "auto" && !empty && s.state) return { d: null, raw: s.state };
    return { d: null, raw: "" };
  }
  _render() {
    const c = this._config, h = this._hass; if (!c || !h) return;
    const dark = this._isDark(), now = new Date();
    const rows = this._people().map((p) => {
      const s = h.states[p.entity];
      const fn = (s && s.attributes.friendly_name) || p.entity;
      const name = p.name || String(fn).replace(/^(badge|accès|acces)\s+/i, "");
      return { p, s, name, ...this._when(s, now) };
    });
    if (c.sort_by_recent) rows.sort((a, b) => (b.d ? +b.d : -1) - (a.d ? +a.d : -1));
    const recentMs = Number(c.recent_minutes) * 60000, oldMs = Number(c.old_days) * 864e5;
    const nRecent = rows.filter((r) => r.d && now - r.d < recentMs).length;
    const html = rows.map((r) => {
      const age = r.d ? now - r.d : null, cls = !r.d ? (r.raw ? "raw" : "none") : age < recentMs ? "recent" : age > oldMs ? "old" : "";
      const l1 = r.d ? rel(r.d, now) : r.raw ? r.raw : c.empty_text, l2 = r.d ? abs(r.d, now) : "";
      return `<button class="row ${cls}" data-e="${esc(r.p.entity)}"><span class="av">${r.p.icon ? `<ha-icon icon="${esc(r.p.icon)}"></ha-icon>` : esc(initials(r.name))}</span>
        <span class="who"><b>${esc(r.name)}</b><small>${esc(l2 || (r.d ? "" : r.raw ? "Valeur lue" : ""))}</small></span><span class="when ${r.d ? "" : "mut"}">${esc(l1)}</span></button>`;
    }).join("");
    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --bg-text:#f4f6fb; --bg-muted:#a9afc0; --bg-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#1d2230 55%,#162a2a 100%)); --bg-border:rgba(255,255,255,.14); --bg-shadow:0 .6em 2em rgba(0,0,0,.35); --bg-glass:rgba(255,255,255,.07); --bg-glass-b:rgba(255,255,255,.13); --bg-fill:rgba(255,255,255,.12); --bg-ok:#4ee0a0; }
      ha-card.light { --bg-text:#1c2030; --bg-muted:#5d6477; --bg-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#eaf5f1 100%)); --bg-border:rgba(20,24,40,.12); --bg-shadow:0 .4em 1.4em rgba(20,24,40,.12); --bg-glass:rgba(255,255,255,.7); --bg-glass-b:rgba(20,24,40,.1); --bg-fill:rgba(20,24,40,.08); --bg-ok:#0f9d63; }
      ha-card { container-type:inline-size; display:flex; flex-direction:column; gap:10px; padding:16px; color:var(--bg-text); border-radius:24px; border:1px solid var(--bg-border); background:var(--bg-bg); box-shadow:var(--bg-shadow); overflow:hidden; }
      button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; text-align:left; -webkit-tap-highlight-color:transparent; }
      ha-icon { --mdc-icon-size:1.3em; }
      .head { display:flex; align-items:center; justify-content:space-between; gap:12px; } .head b { font-size:1.1em; font-weight:650; } .head small { color:var(--bg-muted); font-size:.8em; }
      .row { display:flex; align-items:center; gap:.8em; padding:.6em .85em; border-radius:1em; background:var(--bg-glass); border:1px solid var(--bg-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
      .av { flex:none; width:2.5em; height:2.5em; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:.85em; background:var(--bg-fill); color:var(--bg-text); }
      .who { flex:1; min-width:0; display:flex; flex-direction:column; } .who b { font-weight:620; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .who small { color:var(--bg-muted); font-size:.78em; min-height:1em; }
      .when { font-weight:650; font-size:.9em; text-align:right; white-space:nowrap; } .when.mut { color:var(--bg-muted); font-weight:500; font-size:.82em; white-space:normal; }
      .row.recent { border-color:var(--bg-ok); background:color-mix(in srgb, var(--bg-ok) 14%, transparent); } .row.recent .av { background:var(--bg-ok); color:#06241a; } .row.recent .when { color:var(--bg-ok); }
      .row.old, .row.none { opacity:.55; }
      .row.recent .av { animation:bg-pulse 2.4s ease-out infinite; } @keyframes bg-pulse { 0% { box-shadow:0 0 0 0 color-mix(in srgb, var(--bg-ok) 55%, transparent); } 100% { box-shadow:0 0 0 .7em transparent; } }
      @media (prefers-reduced-motion: reduce) { .row.recent .av { animation:none; } }
      .empty { color:var(--bg-muted); text-align:center; padding:.6em; font-size:.85em; }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">
      <div class="head"><b>${esc(c.title)}</b><small>${nRecent ? `${nRecent} passage${nRecent > 1 ? "s" : ""} récent${nRecent > 1 ? "s" : ""}` : "Derniers passages"}</small></div>
      ${html || `<div class="empty">Ajoute des personnes dans la configuration.</div>`}
    </ha-card>`;
    this.shadowRoot.querySelectorAll(".row").forEach((el) => el.addEventListener("click", () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.e }, bubbles: true, composed: true }))));
  }
}

const LABELS = { ...GV_LABELS, title: "Titre", people: "Personnes (entités)", recent_minutes: "Passage récent (minutes)", old_days: "Estompé après (jours)", sort_by_recent: "Trier du plus récent au plus ancien", time_source: "Source de l'heure", empty_text: "Texte si aucun passage", theme: "Thème" };
class BadgeCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...DEFAULTS, ...config }; this._keep = (config.people || []).filter((x) => x && typeof x === "object"); if (!this._form) this._build(); else this._form.data = this._data(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _data() { return { ...this._config, people: (this._config.people || []).map((i) => (typeof i === "string" ? i : i.entity)) }; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._data(); el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.schema = [
      { name: "title", selector: { text: {} } },
      { name: "people", selector: { entity: { multiple: true, domain: ["input_text", "input_datetime", "sensor", "text"] } } },
      { type: "grid", name: "", schema: [{ name: "recent_minutes", selector: { number: { min: 1, max: 1440, mode: "box" } } }, { name: "old_days", selector: { number: { min: 1, max: 365, mode: "box" } } },
        { name: "time_source", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique (valeur de l'entité)" }, { value: "value", label: "Valeur uniquement" }, { value: "changed", label: "Date de dernier changement" }] } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }] },
      { name: "empty_text", selector: { text: {} } },
      { name: "sort_by_recent", selector: { boolean: {} } },
      { type: "expandable", name: "", title: "Nuance de couleur", schema: GV_FIELDS },
    ];
    el.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const cfg = { ...ev.detail.value };
      cfg.people = (cfg.people || []).map((id) => this._keep.find((x) => x.entity === id) || id);
      this._config = cfg;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    });
    this._form = el; this.appendChild(el);
  }
}

customElements.define("badge-card", BadgeCard);
customElements.define("badge-card-editor", BadgeCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "badge-card", name: "Badge Card (FR)", description: "Derniers passages de badge par personne : heure relative et absolue, récents mis en avant.", preview: true });
console.info(`%c BADGE-CARD %c v${CARD_VERSION} `, "color:#fff;background:#0f9d63;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#0f9d63;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
