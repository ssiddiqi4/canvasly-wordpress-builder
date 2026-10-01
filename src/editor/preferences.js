import { app } from "./app.js";
var PREF_DEFAULTS = {
  ui_theme: "auto",
  panel_width: 330,
  panel_width_left: 250,
  navigator_default: "open",
  show_handles: true,
  editor_lightbox: true,
  autosave: true,
  autosave_interval: 15,
  tips: true,
  confirm_delete: true,
};
var EYEDROPPER_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12.8 1.2a2.2 2.2 0 0 1 0 3.1L11.6 5.5l2 2-1.4 1.4-2-2-3.6 3.6.9.9-6.6 3.2 3.2-6.6.9.9 3.6-3.6-2-2 1.4-1.4 2 2 1.2-1.2a2.2 2.2 0 0 1 3.1 0z"/></svg>';
var LOCAL_KEY = "sidcraft-page-builder.preferences";
function clampInt(v, min, max, fallback) {
  const n = Number(v);
  const x = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, Math.round(x)));
}
function toBool(v, fallback = true) {
  if (v === void 0 || v === null) return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "0" || s === "false" || s === "no" || s === "off") return false;
  return true;
}
function normalizePreferences(raw) {
  const d = PREF_DEFAULTS;
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const theme = String(src.ui_theme || d.ui_theme);
  const nav = String(src.navigator_default || d.navigator_default);
  return {
    ui_theme: theme === "light" || theme === "dark" ? theme : "auto",
    panel_width: clampInt(src.panel_width, 190, 520, d.panel_width),
    panel_width_left: clampInt(src.panel_width_left, 190, 520, d.panel_width_left),
    navigator_default: nav === "closed" ? "closed" : "open",
    show_handles: toBool(src.show_handles, d.show_handles),
    editor_lightbox: toBool(src.editor_lightbox, d.editor_lightbox),
    autosave: toBool(src.autosave, d.autosave),
    autosave_interval: clampInt(src.autosave_interval, 5, 60, d.autosave_interval),
    tips: toBool(src.tips, d.tips),
    confirm_delete: toBool(src.confirm_delete, d.confirm_delete),
  };
}
function channelToHex(n) {
  return Math.max(0, Math.min(255, Math.round(Number(n) || 0)))
    .toString(16)
    .padStart(2, "0");
}
function rgbToHex(r, g, b) {
  return "#" + channelToHex(r) + channelToHex(g) + channelToHex(b);
}
function parsePickedColor(value) {
  let s = String(value || "")
    .trim()
    .toLowerCase();
  if (!s || s === "transparent" || s === "rgba(0, 0, 0, 0)") return "";
  if (/^#[0-9a-f]{8}$/.test(s)) s = s.slice(0, 7);
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
  if (rgb) return rgbToHex(rgb[1], rgb[2], rgb[3]);
  const srgb = s.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb) return rgbToHex(Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255);
  return "";
}
function colorFromComputed(style) {
  if (!style) return "";
  return (
    parsePickedColor(style.backgroundColor) ||
    parsePickedColor(style.borderTopColor) ||
    parsePickedColor(style.color) ||
    ""
  );
}
function sampleImagePixel(img, clientX, clientY) {
  if (!img || !img.naturalWidth) return "";
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height) return "";
  const sx = ((clientX - rect.left) / rect.width) * img.naturalWidth;
  const sy = ((clientY - rect.top) / rect.height) * img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  try {
    ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    if (!d[3]) return "";
    return rgbToHex(d[0], d[1], d[2]);
  } catch (e) {
    return "";
  }
}
function applyUiTheme(theme) {
  const html = typeof document !== "undefined" ? document.documentElement : null;
  if (!html) return;
  const t3 = theme === "light" || theme === "dark" ? theme : "auto";
  html.classList.remove("lb-ui-light", "lb-ui-dark", "lb-ui-auto", "lb-ui-scheme-dark", "lb-ui-scheme-light");
  html.classList.add("lb-ui-" + t3);
  const shell = document.getElementById("lb-editor-shell") || document.body;
  if (shell && shell.classList) {
    shell.classList.remove("lb-ui-light", "lb-ui-dark", "lb-ui-auto");
    shell.classList.add("lb-ui-" + t3);
  }
  const dark =
    t3 === "dark" ||
    (t3 === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  html.classList.add(dark ? "lb-ui-scheme-dark" : "lb-ui-scheme-light");
}
function mergeLocalStorage(prefs) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { prefs, migrated: false };
    const old = JSON.parse(raw);
    if (!old || typeof old !== "object") return { prefs, migrated: false };
    const next = normalizePreferences(
      Object.assign({}, prefs, {
        autosave: old.autosave,
        tips: old.tips,
        confirm_delete: old.confirmDelete,
      }),
    );
    localStorage.removeItem(LOCAL_KEY);
    return { prefs: next, migrated: true };
  } catch (e) {
    return { prefs, migrated: false };
  }
}
function installPreferences() {
  if (!app.root) return;
  app.prefs = normalizePreferences(app.D && app.D.preferences);
  const migrated = mergeLocalStorage(app.prefs);
  app.prefs = migrated.prefs;
  if (migrated.migrated) persistPrefs(true);
  app.leftWidth = app.prefs.panel_width_left;
  app.rightWidth = app.prefs.panel_width;
  applyUiTheme(app.prefs.ui_theme);
  watchColorScheme();
  app.openPreferences = openPreferences;
  app.lbOpenPreferences = openPreferences;
  app.applyPreferencesChrome = applyPreferencesChrome;
  app.enhanceEyedropper = enhanceEyedropper;
  app.pickColorForInput = pickColorForInput;
  app.applyPickedColor = applyPickedColor;
  app.openEditorLightbox = openEditorLightbox;
  wrapScheduleSave();
  wrapPanelResize();
  wrapRemoveConfirm();
  wrapRenderAndFrame();
  wrapColorControlHTML();
  applyPreferencesChrome();
  enhanceEyedropper(app.root);
  bindEditorLightbox();
}
function watchColorScheme() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    if (app.prefs && app.prefs.ui_theme === "auto") applyUiTheme("auto");
  };
  if (mq.addEventListener) mq.addEventListener("change", sync);
  else if (mq.addListener) mq.addListener(sync);
}
function applyPreferencesChrome() {
  if (!app.prefs) return;
  applyUiTheme(app.prefs.ui_theme);
  const work = app.root && app.root.querySelector(".lb-work");
  if (work) {
    if (typeof app.syncPanelColumns === "function") app.syncPanelColumns(work);
    else {
      work.style.setProperty("--lb-left-width", (app.leftHidden ? 0 : app.leftWidth) + "px");
      work.style.setProperty("--lb-right-width", (app.rightHidden ? 0 : app.rightWidth) + "px");
    }
  }
  applyHandlesToFrame();
}
function applyHandlesToFrame() {
  const fd = app.frameDoc && app.frameDoc();
  if (!fd || !fd.documentElement) return;
  const show = !!(app.prefs && app.prefs.show_handles);
  fd.documentElement.classList.toggle("lb-show-handles", show);
  fd.documentElement.classList.toggle("lb-hide-handles", !show);
  if (fd.body) {
    fd.body.classList.toggle("lb-show-handles", show);
    fd.body.classList.toggle("lb-hide-handles", !show);
  }
}
function persistPrefs(immediate) {
  app.D = app.D || {};
  app.D.preferences = app.prefs;
  clearTimeout(app._prefTimer);
  const run = async () => {
    try {
      const r = await fetch(`${app.D.api}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify(app.prefs),
      });
      if (r.ok) {
        const saved = await r.json();
        if (saved && typeof saved === "object" && !saved.code) app.prefs = normalizePreferences(saved);
      }
    } catch (e) {}
  };
  if (immediate) run();
  else app._prefTimer = setTimeout(run, 400);
}
function setPref(key, value, apply) {
  app.prefs = normalizePreferences(Object.assign({}, app.prefs, { [key]: value }));
  if (key === "panel_width") app.rightWidth = app.prefs.panel_width;
  if (key === "panel_width_left") app.leftWidth = app.prefs.panel_width_left;
  if (apply !== false) applyPreferencesChrome();
  persistPrefs();
  return app.prefs;
}
function wrapScheduleSave() {
  app.scheduleSave = function scheduleSaveWithPrefs() {
    if (app.previewingRevision) return;
    if (app.prefs && app.prefs.autosave === false) return;
    clearTimeout(app.saveTimer);
    const sec = (app.prefs && app.prefs.autosave_interval) || PREF_DEFAULTS.autosave_interval;
    app.saveTimer = setTimeout(() => app.save(true), Math.max(5e3, sec * 1e3));
  };
}
function wrapPanelResize() {
  if (typeof app.startResize !== "function") return;
  const old = app.startResize;
  app.startResize = function startResizeWithPrefs(side, e) {
    old.call(this, side, e);
    const up = () => {
      document.removeEventListener("mouseup", up);
      if (side === "left") setPref("panel_width_left", app.leftWidth, false);
      else setPref("panel_width", app.rightWidth, false);
    };
    document.addEventListener("mouseup", up);
  };
}
function wrapRemoveConfirm() {
  if (typeof app.remove !== "function") return;
  const old = app.remove;
  app.remove = function removeWithConfirm(id) {
    if (app.prefs && app.prefs.confirm_delete) {
      if (!window.confirm(app.t("Delete this unit?"))) return;
    }
    return old.call(this, id);
  };
}
function wrapRenderAndFrame() {
  if (typeof app.render === "function") {
    const oldRender = app.render;
    app.render = function renderWithPrefs() {
      oldRender.apply(this, arguments);
      applyPreferencesChrome();
      enhanceEyedropper(app.root);
    };
  }
  if (typeof app.refreshRightPanel === "function") {
    const oldRefresh = app.refreshRightPanel;
    app.refreshRightPanel = function refreshRightPanelWithEyedropper() {
      oldRefresh.apply(this, arguments);
      enhanceEyedropper(app.root);
    };
  }
  if (typeof app.bindFrame === "function") {
    const oldBind = app.bindFrame;
    app.bindFrame = function bindFrameWithPrefs() {
      oldBind.apply(this, arguments);
      applyHandlesToFrame();
      bindEditorLightbox();
    };
  }
  if (typeof app.frameHTML === "function") {
    const oldHtml = app.frameHTML;
    app.frameHTML = function frameHTMLWithHandles() {
      const html = oldHtml.apply(this, arguments);
      const cls = app.prefs && app.prefs.show_handles ? "lb-show-handles" : "lb-hide-handles";
      return String(html || "").replace(/<html\b([^>]*)class="/, '<html$1class="' + cls + " ");
    };
  }
}
function wrapColorControlHTML() {
  if (typeof app.colorControlHTML !== "function") return;
  const old = app.colorControlHTML;
  app.colorControlHTML = function colorControlHTMLWithEyedropper(k, v, label) {
    return injectEyedropperButton(old.call(this, k, v, label));
  };
}
function injectEyedropperButton(html) {
  const s = String(html || "");
  if (s.indexOf("lb-eyedropper") !== -1) return s;
  if (s.indexOf("data-global-bound") !== -1) return s;
  const btn = eyedropperButtonHTML();
  if (s.indexOf("lb-color-row") !== -1) {
    return s.replace(/(<div class="lb-color-row">[\s\S]*?)(<\/div>\s*<\/div>\s*)$/, "$1" + btn + "$2");
  }
  return s;
}
function eyedropperButtonHTML() {
  return `<button type="button" class="lb-eyedropper" title="${app.esc(app.t("Pick color"))}" aria-label="${app.esc(app.t("Pick color"))}">${EYEDROPPER_SVG}</button>`;
}
function enhanceEyedropper(root) {
  const host = root || app.root || document;
  if (!host || !host.querySelectorAll) return;
  host.querySelectorAll('input[type="color"]').forEach((input) => {
    paintPickedColor(input, input.value);
    if (input.dataset.lbPickedSync) return;
    input.dataset.lbPickedSync = "1";
    input.addEventListener("input", () => paintPickedColor(input, input.value));
    if (input.disabled || input.dataset.globalBound === "1") return;
    const row = input.closest(".lb-color-row") || input.parentElement;
    if (!row || row.querySelector(".lb-eyedropper")) return;
    row.insertAdjacentHTML("beforeend", eyedropperButtonHTML());
    const btn = row.querySelector(".lb-eyedropper");
    if (btn)
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        pickColorForInput(input);
      });
  });
  host.querySelectorAll(".lb-eyedropper").forEach((btn) => {
    if (btn.__lbEye) return;
    btn.__lbEye = true;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input =
        btn.closest(".lb-color-row, .lb-control, label")?.querySelector('input[type="color"]') ||
        btn.previousElementSibling;
      if (input && input.type === "color") pickColorForInput(input);
    });
  });
}
async function pickColorForInput(input) {
  if (!input || input.disabled) return;
  if (typeof window !== "undefined" && window.EyeDropper) {
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const hex = parsePickedColor(result && result.sRGBHex);
      if (hex) applyPickedColor(input, hex);
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  startCanvasEyedropper(input);
}
function startCanvasEyedropper(input) {
  closeEyedropperOverlay();
  const overlay = document.createElement("div");
  overlay.className = "lb-eyedropper-overlay";
  overlay.dataset.hint = app.t("Click to sample a color. Press Esc to cancel.");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", app.t("Pick color"));
  document.body.appendChild(overlay);
  app._eyeOverlay = overlay;
  const finish = (hex) => {
    closeEyedropperOverlay();
    if (hex) applyPickedColor(input, hex);
    else if (hex === false) {
    } else alert(app.t("Could not sample that color."));
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeEyedropperOverlay();
    }
  };
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    overlay.style.pointerEvents = "none";
    const hex = sampleColorAtPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "";
    finish(hex || "");
  };
  overlay.__lbOnKey = onKey;
  document.addEventListener("keydown", onKey, true);
  overlay.addEventListener("click", onClick);
}
function closeEyedropperOverlay() {
  const overlay = app._eyeOverlay;
  app._eyeOverlay = null;
  if (!overlay) return;
  if (overlay.__lbOnKey) document.removeEventListener("keydown", overlay.__lbOnKey, true);
  overlay.remove();
}
function sampleColorAtPoint(clientX, clientY, frameEl2, frameDoc) {
  const frame = frameEl2 || (typeof document !== "undefined" ? document.getElementById("lb-editor-frame") : null);
  if (frame) {
    const rect = frame.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const fd = frameDoc || frame.contentDocument;
      if (fd) {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const el2 = fd.elementFromPoint(x, y);
        const hex = sampleElementColor(el2, x, y, fd);
        if (hex) return hex;
      }
    }
  }
  if (typeof document === "undefined") return "";
  const el = document.elementFromPoint(clientX, clientY);
  return sampleElementColor(el, clientX, clientY, document);
}
function sampleElementColor(el, x, y, doc) {
  if (!el) return "";
  if (el.tagName === "IMG") {
    const imgHex = sampleImagePixel(el, x, y);
    if (imgHex) return imgHex;
  }
  const view = (doc && doc.defaultView) || (typeof window !== "undefined" ? window : null);
  if (!view || !view.getComputedStyle) return "";
  let node = el;
  while (node && node !== doc && node !== doc.documentElement) {
    const hex = colorFromComputed(view.getComputedStyle(node));
    if (hex) return hex;
    node = node.parentElement;
  }
  return "";
}
function paintPickedColor(input, hex) {
  const host = input && input.closest ? input.closest(".lb-color-control, .lb-control") : null;
  if (host && hex) host.style.setProperty("--lb-picked", hex);
}
function applyPickedColor(input, hex) {
  if (!input || !hex) return;
  input.value = hex;
  input.dataset.tsEmpty = "0";
  input.dataset.kitEmpty = "0";
  paintPickedColor(input, hex);
  const label = input.closest(".lb-color-control, .lb-control")?.querySelector(".lb-color-hex");
  if (label && !input.closest(".is-global")) label.textContent = hex;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function bindEditorLightbox() {
  const fd = app.frameDoc && app.frameDoc();
  if (!fd || fd.__lbEditorLightbox) return;
  fd.__lbEditorLightbox = true;
  fd.addEventListener(
    "click",
    (e) => {
      if (!app.prefs || !app.prefs.editor_lightbox) return;
      const a = e.target.closest && e.target.closest('[data-lb-lightbox="1"], a.lb-image-lightbox');
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href === "#") return;
      e.preventDefault();
      e.stopPropagation();
      const node = e.target.closest(".lb-node");
      if (node && node.dataset.id) app.selectNode(node.dataset.id);
      openEditorLightbox(href, a.getAttribute("title") || "");
    },
    true,
  );
}
function openEditorLightbox(src, caption) {
  closeEditorLightbox();
  const back = document.createElement("div");
  back.className = "lb-editor-lightbox";
  back.setAttribute("role", "dialog");
  back.setAttribute("aria-modal", "true");
  back.innerHTML = `<button type="button" class="lb-editor-lightbox-close" aria-label="${app.esc(app.t("Close"))}">\xD7</button><img src="${app.esc(src)}" alt="">${caption ? `<p class="lb-editor-lightbox-caption">${app.esc(caption)}</p>` : ""}`;
  back.addEventListener("click", (e) => {
    if (e.target === back || e.target.closest(".lb-editor-lightbox-close")) closeEditorLightbox();
  });
  document.body.appendChild(back);
  app._editorLightbox = back;
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeEditorLightbox();
    }
  };
  back.__lbOnKey = onKey;
  document.addEventListener("keydown", onKey, true);
}
function closeEditorLightbox() {
  const el = app._editorLightbox;
  app._editorLightbox = null;
  if (!el) return;
  if (el.__lbOnKey) document.removeEventListener("keydown", el.__lbOnKey, true);
  el.remove();
}
function openPreferences() {
  if (typeof app.closeMainMenu === "function") app.closeMainMenu();
  if (typeof app.closeFinder === "function") app.closeFinder();
  const p = app.prefs || normalizePreferences();
  const themeOpts = [
    ["auto", app.t("Auto")],
    ["light", app.t("Light")],
    ["dark", app.t("Dark")],
  ]
    .map(([v, l]) => `<option value="${v}" ${p.ui_theme === v ? "selected" : ""}>${l}</option>`)
    .join("");
  const navOpts = [
    ["open", app.t("Open")],
    ["closed", app.t("Closed")],
  ]
    .map(([v, l]) => `<option value="${v}" ${p.navigator_default === v ? "selected" : ""}>${l}</option>`)
    .join("");
  const body = `<div class="lb-preference-list">
		<label class="lb-control"><span>${app.t("UI theme")}</span><select id="lb-pref-theme">${themeOpts}</select><small class="lb-control-desc">${app.t("Follows the operating system color scheme.")}</small></label>
		<label class="lb-control"><span>${app.t("Left panel width")}</span><input id="lb-pref-left-width" type="number" min="190" max="520" step="10" value="${p.panel_width_left}"></label>
		<label class="lb-control"><span>${app.t("Right panel width")}</span><input id="lb-pref-width" type="number" min="190" max="520" step="10" value="${p.panel_width}"></label>
		<label class="lb-control"><span>${app.t("Navigator on launch")}</span><select id="lb-pref-navigator">${navOpts}</select></label>
		<label class="lb-switch"><input type="checkbox" id="lb-pref-handles" ${p.show_handles ? "checked" : ""}><span>${app.t("Show editing handles")}</span></label>
		<label class="lb-switch"><input type="checkbox" id="lb-pref-lightbox" ${p.editor_lightbox ? "checked" : ""}><span>${app.t("Editor lightbox")}</span></label>
		<p class="lb-muted">${app.t("Open image lightboxes inside the editor canvas.")}</p>
		<label class="lb-switch"><input type="checkbox" id="lb-pref-autosave" ${p.autosave ? "checked" : ""}><span>${app.t("Enable autosave")}</span></label>
		<label class="lb-control"><span>${app.t("Autosave interval (seconds)")}</span><input id="lb-pref-autosave-interval" type="number" min="5" max="60" step="1" value="${p.autosave_interval}"></label>
		<label class="lb-switch"><input type="checkbox" id="lb-pref-tips" ${p.tips ? "checked" : ""}><span>${app.t("Show editor tips")}</span></label>
		<label class="lb-switch"><input type="checkbox" id="lb-pref-confirm-delete" ${p.confirm_delete ? "checked" : ""}><span>${app.t("Confirm destructive actions")}</span></label>
		<button type="button" class="lb-btn" id="lb-pref-shortcuts">${app.t("Customize keyboard shortcuts")}</button>
		<p class="lb-pref-status" id="lb-pref-status">${app.t("Preferences are stored for your account.")}</p>
		<button type="button" class="lb-btn primary" id="lb-save-preferences">${app.t("Save Preferences")}</button>
	</div>`;
  app.showMenuDialog(app.t("User Preferences"), body);
  bindPreferenceForm();
}
function bindPreferenceForm() {
  const status = () => {
    const el = app.$("#lb-pref-status");
    if (el) el.textContent = app.t("Preferences saved");
  };
  const read = () => {
    app.prefs = normalizePreferences({
      ui_theme: app.$("#lb-pref-theme")?.value,
      panel_width_left: app.$("#lb-pref-left-width")?.value,
      panel_width: app.$("#lb-pref-width")?.value,
      navigator_default: app.$("#lb-pref-navigator")?.value,
      show_handles: app.$("#lb-pref-handles")?.checked !== false,
      editor_lightbox: app.$("#lb-pref-lightbox")?.checked !== false,
      autosave: app.$("#lb-pref-autosave")?.checked !== false,
      autosave_interval: app.$("#lb-pref-autosave-interval")?.value,
      tips: app.$("#lb-pref-tips")?.checked !== false,
      confirm_delete: app.$("#lb-pref-confirm-delete")?.checked !== false,
    });
    app.leftWidth = app.prefs.panel_width_left;
    app.rightWidth = app.prefs.panel_width;
    applyPreferencesChrome();
    persistPrefs();
    status();
  };
  ["#lb-pref-theme", "#lb-pref-navigator"].forEach((sel2) => {
    app.$(sel2)?.addEventListener("change", read);
  });
  ["#lb-pref-left-width", "#lb-pref-width", "#lb-pref-autosave-interval"].forEach((sel2) => {
    app.$(sel2)?.addEventListener("change", read);
  });
  ["#lb-pref-handles", "#lb-pref-lightbox", "#lb-pref-autosave", "#lb-pref-tips", "#lb-pref-confirm-delete"].forEach(
    (sel2) => {
      app.$(sel2)?.addEventListener("change", read);
    },
  );
  app.$("#lb-pref-shortcuts")?.addEventListener("click", () => {
    app.closeModal();
    if (typeof app.openShortcutSheet === "function") app.openShortcutSheet();
  });
  app.$("#lb-save-preferences")?.addEventListener("click", () => {
    read();
    persistPrefs(true);
    status();
    app.closeModal();
  });
}

export {
  PREF_DEFAULTS,
  EYEDROPPER_SVG,
  LOCAL_KEY,
  clampInt,
  toBool,
  normalizePreferences,
  channelToHex,
  rgbToHex,
  parsePickedColor,
  colorFromComputed,
  sampleImagePixel,
  applyUiTheme,
  mergeLocalStorage,
  installPreferences,
  watchColorScheme,
  applyPreferencesChrome,
  applyHandlesToFrame,
  persistPrefs,
  setPref,
  wrapScheduleSave,
  wrapPanelResize,
  wrapRemoveConfirm,
  wrapRenderAndFrame,
  wrapColorControlHTML,
  injectEyedropperButton,
  eyedropperButtonHTML,
  enhanceEyedropper,
  pickColorForInput,
  startCanvasEyedropper,
  closeEyedropperOverlay,
  sampleColorAtPoint,
  sampleElementColor,
  paintPickedColor,
  applyPickedColor,
  bindEditorLightbox,
  openEditorLightbox,
  closeEditorLightbox,
  openPreferences,
  bindPreferenceForm,
};
