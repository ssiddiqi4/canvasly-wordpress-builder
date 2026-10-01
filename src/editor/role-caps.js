import { app } from "./app.js";
function installRoleCaps() {
  app.canDesign = function canDesign() {
    const caps = app.D && app.D.caps;
    if (!caps) return true;
    return !!caps.design;
  };
  app.contentOnly = function contentOnly() {
    const caps = app.D && app.D.caps;
    return !!(caps && caps.contentOnly);
  };
  app.unitAllowed = function unitAllowed(type) {
    const list = app.D && app.D.caps && app.D.caps.units;
    if (!Array.isArray(list)) return true;
    return list.indexOf(type) !== -1;
  };
  if (app.contentOnly()) {
    app.styleTab = "content";
    document.documentElement.classList.add("lb-content-only");
    document.getElementById("lb-editor-shell")?.classList.add("lb-content-only");
    app.root?.classList.add("lb-content-only");
  }
  const prevMake = app.makeNode;
  app.makeNode = function makeNodeGuarded(type) {
    if (!app.unitAllowed(type)) return null;
    return prevMake.call(this, type);
  };
  const prevAdd = app.add;
  app.add = function addGuarded(type) {
    if (!app.unitAllowed(type)) return;
    return prevAdd.apply(this, arguments);
  };
  const prevPanel = app.unitPanel;
  if (typeof prevPanel === "function") {
    app.unitPanel = function unitPanelGuarded() {
      const orig = app.D.units;
      if (Array.isArray(app.D.caps?.units) && Array.isArray(orig)) {
        app.D.units = orig.filter((e) => app.unitAllowed(e.type));
      }
      try {
        return prevPanel.apply(this, arguments);
      } finally {
        app.D.units = orig;
      }
    };
  }
  const prevSettings = app.settingsHTML;
  if (typeof prevSettings === "function") {
    app.settingsHTML = function settingsHTMLGuarded() {
      if (app.contentOnly() && app.styleTab !== "content") app.styleTab = "content";
      return prevSettings.apply(this, arguments);
    };
  }
  const prevBindRight = app.bindRightPanel;
  if (typeof prevBindRight === "function") {
    app.bindRightPanel = function bindRightPanelGuarded() {
      prevBindRight.apply(this, arguments);
      if (!app.contentOnly()) return;
      app.root?.querySelectorAll('[data-style-tab="style"],[data-style-tab="advanced"]').forEach((b) => {
        b.hidden = true;
        b.setAttribute("aria-hidden", "true");
        b.onclick = (e) => {
          e.preventDefault();
          app.styleTab = "content";
        };
      });
    };
  }
  const hideDesign = () => {
    if (app.canDesign()) return;
    const root = app.root;
    if (!root) return;
    ["#lb-class-manager", "#lb-variable-manager"].forEach((sel2) => {
      const el = root.querySelector(sel2);
      if (el) el.hidden = true;
    });
    root.querySelectorAll('[data-main-menu="site-settings"]').forEach((el) => {
      el.hidden = true;
    });
  };
  const prevRender = app.render;
  if (typeof prevRender === "function") {
    app.render = function renderGuarded() {
      const out = prevRender.apply(this, arguments);
      hideDesign();
      return out;
    };
  }
  const prevPaint = app.lbPaintCanvas;
  if (typeof prevPaint === "function") {
    app.lbPaintCanvas = function paintGuarded() {
      const ok = prevPaint.apply(this, arguments);
      if (ok) hideDesign();
      return ok;
    };
  }
  const prevMenu = app.handleMainMenu;
  if (typeof prevMenu === "function") {
    app.handleMainMenu = function handleMainMenuGuarded(action) {
      if (!app.canDesign() && action === "site-settings") return;
      return prevMenu.apply(this, arguments);
    };
  }
  const prevOpenMenu = app.openMainMenu;
  if (typeof prevOpenMenu === "function") {
    app.openMainMenu = function openMainMenuGuarded() {
      prevOpenMenu.apply(this, arguments);
      if (app.canDesign()) return;
      app.root?.querySelectorAll('[data-main-menu="site-settings"]').forEach((el) => {
        el.hidden = true;
      });
    };
  }
  [
    "openSiteSettings",
    "openClassManager",
    "openVariables",
    "pasteStyle",
    "resetStyle",
    "lb010OpenDesignSystem",
    "lb110OpenDesignSystem",
    "lb111OpenDesignSystem",
  ].forEach((name) => {
    const orig = app[name];
    if (typeof orig !== "function") return;
    app[name] = function designGuarded() {
      if (!app.canDesign()) return;
      return orig.apply(this, arguments);
    };
  });
}

export { installRoleCaps };
