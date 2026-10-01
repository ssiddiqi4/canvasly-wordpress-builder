import { app } from "./app.js";
function installBreakpoints() {
  const FALLBACK = {
    mobile: { name: "mobile", label: "Mobile", short: "M", enabled: true, value: 767, direction: "max", preview: 390 },
    mobile_extra: {
      name: "mobile_extra",
      label: "Mobile Extra",
      short: "M+",
      enabled: false,
      value: 880,
      direction: "max",
      preview: 568,
    },
    tablet: {
      name: "tablet",
      label: "Tablet",
      short: "T",
      enabled: true,
      value: 1024,
      direction: "max",
      preview: 1024,
    },
    tablet_extra: {
      name: "tablet_extra",
      label: "Tablet Extra",
      short: "T+",
      enabled: false,
      value: 1200,
      direction: "max",
      preview: 1200,
    },
    laptop: {
      name: "laptop",
      label: "Laptop",
      short: "L",
      enabled: false,
      value: 1366,
      direction: "max",
      preview: 1366,
    },
    desktop: { name: "desktop", label: "Desktop", short: "D", enabled: true, value: 0, direction: "base", preview: 0 },
    widescreen: {
      name: "widescreen",
      label: "Widescreen",
      short: "W",
      enabled: false,
      value: 2400,
      direction: "min",
      preview: 2400,
    },
  };
  const ORDER = ["mobile", "mobile_extra", "tablet", "tablet_extra", "laptop", "desktop", "widescreen"];
  app.breakpointNames = function breakpointNames() {
    return ORDER.slice();
  };
  app.breakpointCatalog = function breakpointCatalog() {
    const raw = (app.D && app.D.breakpoints) || {};
    const out = {};
    ORDER.forEach((name) => {
      const def = FALLBACK[name];
      const item = raw[name];
      const next = Object.assign({}, def);
      if (typeof item === "number") next.value = item;
      else if (item && typeof item === "object") {
        if (item.enabled != null && name !== "desktop") next.enabled = !!item.enabled;
        if (item.value != null) next.value = Number(item.value) || def.value;
        if (item.preview != null) next.preview = Number(item.preview) || 0;
        if (item.label) next.label = String(item.label);
        if (item.short) next.short = String(item.short);
        if (item.direction) next.direction = String(item.direction);
      }
      if (name === "desktop") {
        next.enabled = true;
        next.direction = "base";
        next.value = 0;
      }
      if (name === "widescreen") next.direction = "min";
      out[name] = next;
    });
    return out;
  };
  app.enabledBreakpoints = function enabledBreakpoints() {
    const cat = app.breakpointCatalog();
    return ORDER.map((n) => cat[n]).filter((b) => b && b.enabled);
  };
  app.breakpoint = function breakpoint(name) {
    return app.breakpointCatalog()[name] || FALLBACK.desktop;
  };
  app.ensureDevice = function ensureDevice() {
    const names = app.enabledBreakpoints().map((b) => b.name);
    if (!names.includes(app.device)) app.device = "desktop";
    return app.device;
  };
  app.respVal = function respVal(v) {
    if (v && typeof v === "object" && !Array.isArray(v)) return v[app.device] ?? v.desktop ?? "";
    return v ?? "";
  };
  app.asResponsiveMap = function asResponsiveMap(v) {
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
    return { desktop: typeof v !== "object" || v == null ? (v ?? "") : "" };
  };
  app.setResponsiveValue = function setResponsiveValue(settings, key, value) {
    settings = settings || {};
    const old = settings[key];
    if (old && typeof old === "object" && !Array.isArray(old)) old[app.device] = value;
    else if (app.device === "desktop") settings[key] = value;
    else settings[key] = { desktop: old ?? "", [app.device]: value };
    return settings[key];
  };
  app.deviceSwitcherHTML = function deviceSwitcherHTML() {
    app.ensureDevice();
    const list = app.enabledBreakpoints();
    const coreOnly = list.length <= 3 && list.every((b) => ["desktop", "tablet", "mobile"].includes(b.name));
    return `<div class="lb-device">${list
      .map((b) => {
        const label = coreOnly ? app.t(b.label) || b.label : b.short;
        const title = app.t(b.label) || b.label;
        return `<button type="button" data-device="${app.esc(b.name)}" class="${app.device === b.name ? "active" : ""}" title="${app.esc(title)}">${app.esc(label)}</button>`;
      })
      .join("")}</div>`;
  };
  app.hideOnHTML = function hideOnHTML(s) {
    s = s || {};
    const boxes = app
      .enabledBreakpoints()
      .map((b) => {
        const key = "hide_" + b.name;
        return `<label><input data-setting="${key}" type="checkbox" ${s[key] ? "checked" : ""}> ${app.esc(app.t(b.label) || b.label)}</label>`;
      })
      .join("");
    return `<div class="lb-control"><span>${app.t("Hide On")}</span><div class="lb-responsive-actions">${boxes}</div></div>`;
  };
  app.responsiveFieldsHTML = function responsiveFieldsHTML(k, v, label) {
    const x = app.asResponsiveMap(v);
    const list = app.enabledBreakpoints();
    const cols = Math.min(Math.max(list.length, 1), 4);
    const inputs = list
      .map(
        (b) =>
          `<input data-setting="${app.esc(k)}.${b.name}" value="${app.esc(x[b.name] ?? "")}" placeholder="${app.esc(app.t(b.label) || b.label)}">`,
      )
      .join("");
    return `<div class="lb-control"><span>${app.esc(label)} <small>${app.t("responsive")}</small></span><div class="lb-responsive lb-responsive-n" style="--lb-rcols:${cols}">${inputs}</div></div>`;
  };
  app.applyCanvasWidth = function applyCanvasWidth() {
    app.ensureDevice();
    const wrap = document.querySelector(".lb-canvas-device");
    const frame = document.getElementById("lb-editor-frame");
    if (!wrap) return;
    const bp = app.breakpoint(app.device);
    wrap.className = "lb-canvas-device " + app.device;
    wrap.setAttribute("data-device", app.device);
    const preview = bp && Number(bp.preview) > 0 ? Number(bp.preview) : 0;
    const width = !preview || app.device === "desktop" ? "100%" : preview + "px";
    wrap.style.setProperty("--lb-canvas-width", width);
    if (frame) {
      frame.style.width = width;
      frame.style.maxWidth = "100%";
    }
  };
  app.syncDeviceButtons = function syncDeviceButtons() {
    app.ensureDevice();
    document
      .querySelectorAll("[data-device]")
      .forEach((b) => b.classList.toggle("active", b.dataset.device === app.device));
  };
  app.cycleDevice = function cycleDevice() {
    const list = app.enabledBreakpoints();
    if (!list.length) return;
    const i = list.findIndex((b) => b.name === app.device);
    app.device = list[(i + 1 + list.length) % list.length].name;
  };
  app.openBreakpointsModal = function openBreakpointsModal() {
    const list = app.breakpointCatalog();
    const rows = ORDER.map((name) => {
      const b = list[name];
      const locked = name === "desktop";
      const dir =
        b.direction === "min" ? app.t("min-width") : b.direction === "base" ? app.t("Base") : app.t("max-width");
      return `<tr>
   <td><label><input type="checkbox" data-bp-enabled="${name}" ${b.enabled ? "checked" : ""} ${locked ? "disabled" : ""}> ${app.esc(app.t(b.label) || b.label)}</label></td>
   <td><input type="number" min="240" max="4000" data-bp-value="${name}" value="${app.esc(b.value || 0)}" ${locked ? "disabled" : ""}></td>
   <td class="lb-muted">${app.esc(dir)}</td>
   <td><input type="number" min="0" max="4000" data-bp-preview="${name}" value="${app.esc(b.preview || 0)}" ${locked ? "disabled" : ""}></td>
  </tr>`;
    }).join("");
    app.showModal(
      app.t("Responsive Breakpoints"),
      `<p class="lb-muted">${app.t("Enable extra devices and set the viewport widths used by responsive CSS and the editor canvas.")}</p>
   <table class="lb-bp-table"><thead><tr><th>${app.t("Device")}</th><th>${app.t("Width (px)")}</th><th>${app.t("Query")}</th><th>${app.t("Canvas (px)")}</th></tr></thead><tbody>${rows}</tbody></table>
   <button class="lb-btn primary" id="lb-bp-save">${app.t("Save")}</button>`,
    );
    app.$("#lb-bp-save")?.addEventListener("click", async () => {
      const next = {};
      ORDER.forEach((name) => {
        const en =
          app.root.querySelector(`[data-bp-enabled="${name}"]`) ||
          document.querySelector(`[data-bp-enabled="${name}"]`);
        const val =
          app.root.querySelector(`[data-bp-value="${name}"]`) || document.querySelector(`[data-bp-value="${name}"]`);
        const prev =
          app.root.querySelector(`[data-bp-preview="${name}"]`) ||
          document.querySelector(`[data-bp-preview="${name}"]`);
        next[name] = {
          enabled: name === "desktop" ? true : !!(en && en.checked),
          value: Number((val && val.value) || list[name].value || 0),
          preview: Number((prev && prev.value) || list[name].preview || 0),
          direction: list[name].direction,
        };
      });
      const data = Object.assign({}, app.D.globals || {}, { breakpoints: next });
      try {
        const r = await fetch(`${app.D.api}/global-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
          body: JSON.stringify(data),
        });
        if (!r.ok) throw new Error();
        const saved = await r.json();
        app.D.breakpoints = saved.breakpoints || next;
        app.D.globals = saved;
        app.ensureDevice();
        app.closeModal();
        app.render();
      } catch (e) {
        alert(app.t("Could not save breakpoints."));
      }
    });
  };
}

export { installBreakpoints };
