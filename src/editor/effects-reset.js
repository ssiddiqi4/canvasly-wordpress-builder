import { app } from "./app.js";

// Effects sections: "Reset to Default" button in every widget's settings panel.
// Wraps app.lb09Section (the single source of <details class="lb-control-section">),
// so it covers schema units, legacy units, containers and grids alike.
function installEffectsReset() {
  if (app.__lbEffectsReset) return;
  app.__lbEffectsReset = true;
  const TITLES = ["Effects", "Motion Effects", "Layout & Effects", "Border & Effects", "Transform"];
  const isEffectsTitle = (title) => {
    const t = String(title || "").trim();
    if (!t) return false;
    if (/effects/i.test(t)) return true;
    return TITLES.some((x) => t === x || t === app.t(x));
  };
  const clone = (v) => (v === void 0 ? void 0 : JSON.parse(JSON.stringify(v)));
  const same = (a, b) => JSON.stringify(a === void 0 ? null : a) === JSON.stringify(b === void 0 ? null : b);
  const findNode = (id) => {
    if (!id || !app.state) return null;
    const roots = [app.state.root, app.state.header, app.state.footer];
    for (const root of roots) {
      if (!root) continue;
      const r = app.locate(root, id);
      if (r && r.node) return r.node;
    }
    return null;
  };
  const defaultsFor = (type) => {
    try {
      return typeof app.defaults === "function" ? app.defaults(type) || {} : {};
    } catch (e) {
      return {};
    }
  };
  const keysIn = (body) => {
    const out = [];
    String(body || "").replace(/data-setting="([^"]+)"/g, (_m, k) => {
      const root = String(k).split(".")[0];
      if (root && out.indexOf(root) < 0) out.push(root);
      return _m;
    });
    return out;
  };
  const isChanged = (node, keys) => {
    if (!node) return true;
    const s = node.settings || {},
      d = defaultsFor(node.type);
    return keys.some((k) => s[k] !== void 0 && s[k] !== "" && !same(s[k], d[k]));
  };
  const wouldReset = (node, keys) => {
    if (!node) return false;
    const s = node.settings || {},
      d = defaultsFor(node.type);
    return keys.some((k) => {
      const has = Object.prototype.hasOwnProperty.call(d, k);
      if (has) return !same(s[k], d[k]);
      return Object.prototype.hasOwnProperty.call(s, k);
    });
  };
  const keysOf = (btn) =>
    String(btn.getAttribute("data-lb-reset-keys") || "")
      .split(",")
      .filter(Boolean);
  const prevSection = app.lb09Section;
  if (typeof prevSection !== "function") return;
  app.lb09Section = function lb09SectionWithReset(title, body, open) {
    const html = prevSection.apply(this, arguments);
    if (!isEffectsTitle(title) || !app.selected) return html;
    const keys = keysIn(body);
    if (!keys.length) return html;
    const node = findNode(app.selected);
    const changed = isChanged(node, keys);
    const label = app.t("Reset to Default");
    const btn = `<button type="button" class="lb-section-reset-btn${changed ? "" : " is-default"}" data-lb-reset-keys="${app.esc(keys.join(","))}" title="${app.esc(label)}" aria-label="${app.esc(label + ": " + title)}"><span aria-hidden="true">↺</span> ${app.esc(label)}</button>`;
    return html.replace(/(<summary[^>]*>)([\s\S]*?)(<\/summary>)/, (_m, a, b, c) => a + b + btn + c);
  };
  app.lbRefreshResetButtons = function lbRefreshResetButtons() {
    const root = app.root || document;
    const btns = root.querySelectorAll ? root.querySelectorAll(".lb-section-reset-btn") : [];
    if (!btns.length) return;
    const node = findNode(app.selected);
    btns.forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("disabled");
      btn.classList.toggle("is-default", !isChanged(node, keysOf(btn)));
    });
  };
  app.lbResetSection = function lbResetSection(keys, id) {
    const target = id || app.selected;
    const node = findNode(target);
    if (!node || !keys || !keys.length) return false;
    node.settings = node.settings || {};
    if (!wouldReset(node, keys)) {
      app.lbRefreshResetButtons();
      return false;
    }
    const d = defaultsFor(node.type);
    app.commit(app.t("Reset to Default"), target);
    keys.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(d, k)) node.settings[k] = clone(d[k]);
      else delete node.settings[k];
    });
    app.dirty = true;
    if (typeof app.scheduleSave === "function") app.scheduleSave();
    app.selected = target;
    app.render();
    return true;
  };
  const onClick = (e) => {
    const btn = e.target && e.target.closest ? e.target.closest(".lb-section-reset-btn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const keys = keysOf(btn);
    const sec = btn.closest("details.lb-control-section");
    const title =
      sec && sec.querySelector(":scope > summary") ? sec.querySelector(":scope > summary").firstChild : null;
    const titleText = title && title.nodeType === 3 ? title.textContent.trim() : "";
    if (app.lbResetSection(keys)) {
      const root = app.root || document;
      root.querySelectorAll("details.lb-control-section > summary").forEach((s) => {
        const t = s.firstChild && s.firstChild.nodeType === 3 ? s.firstChild.textContent.trim() : "";
        if (titleText && t === titleText && s.querySelector(".lb-section-reset-btn")) s.parentElement.open = true;
      });
    }
    app.lbRefreshResetButtons();
  };
  document.addEventListener("click", onClick, true);
  let pending = 0;
  const onEdit = () => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = 0;
      app.lbRefreshResetButtons();
    }, 0);
  };
  document.addEventListener("input", onEdit, false);
  document.addEventListener("change", onEdit, false);
  document.addEventListener("pointerup", onEdit, false);
  const css = document.createElement("style");
  css.id = "lb-section-reset-css";
  css.textContent =
    ".lb-control-section>summary{display:flex;align-items:center;gap:8px}.lb-section-reset-btn{margin-inline-start:auto;display:inline-flex;align-items:center;gap:4px;border:1px solid #d6dae0;background:#fff;color:#3a4048;border-radius:5px;padding:2px 7px;font:600 10.5px/1.6 inherit;cursor:pointer;white-space:nowrap}.lb-section-reset-btn:hover{border-color:#e2498a;color:#e2498a}.lb-section-reset-btn.is-default{opacity:.6}.lb-section-reset-btn.is-default:hover{opacity:1}.lb-section-reset-btn span{font-size:12px}.lb-control-section>summary .lb-globals-btn+.lb-section-reset-btn{margin-inline-start:0}";
  if (!document.getElementById(css.id)) document.head.appendChild(css);
}

export { installEffectsReset };
