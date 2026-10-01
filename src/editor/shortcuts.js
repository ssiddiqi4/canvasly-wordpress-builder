import { app } from "./app.js";
var SHORTCUT_STORAGE = "canvasly-lite.shortcuts";
var FINDER_RECENT_STORAGE = "canvasly-lite.finder.recent";
function isMacPlatform(ua) {
  const src = String(
    ua ||
      (typeof navigator !== "undefined"
        ? (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent
        : "") ||
      "",
  );
  return /mac|iphone|ipad|ipod/i.test(src);
}
function eventKey(e) {
  const k = e && e.key != null ? String(e.key) : "";
  if (k === "Escape") return "escape";
  if (k === "Delete" || k === "Del") return "delete";
  if (k === "Backspace") return "backspace";
  if (k === " ") return "space";
  if (k === "?" || (k === "/" && e && e.shiftKey)) return "?";
  if (k.length === 1) return k.toLowerCase();
  return k.toLowerCase();
}
function comboFromEvent(e) {
  return {
    key: eventKey(e),
    ctrl: !!(e && (e.ctrlKey || e.metaKey)),
    shift: !!(e && e.shiftKey),
    alt: !!(e && e.altKey),
  };
}
function normalizeCombo(combo) {
  const c = combo && typeof combo === "object" ? combo : {};
  const key = String(c.key || "").toLowerCase();
  return {
    key,
    ctrl: !!c.ctrl,
    shift: key === "?" ? !!c.shift : !!c.shift,
    alt: !!c.alt,
  };
}
function combosEqual(a, b) {
  const x = normalizeCombo(a),
    y = normalizeCombo(b);
  if (x.key !== y.key || x.ctrl !== y.ctrl || x.alt !== y.alt) return false;
  if (x.key === "?") return true;
  return x.shift === y.shift;
}
function matchCombo(e, combo) {
  if (!e || !combo) return false;
  return combosEqual(comboFromEvent(e), combo);
}
function formatCombo(combo, isMac) {
  const c = normalizeCombo(combo);
  if (!c.key) return "";
  const mac = !!isMac;
  const parts = [];
  if (c.ctrl) parts.push(mac ? "Cmd" : "Ctrl");
  if (c.alt) parts.push(mac ? "Option" : "Alt");
  if (c.shift && c.key !== "?") parts.push("Shift");
  const names = { escape: "Esc", delete: "Delete", backspace: "Backspace", space: "Space", "?": "?" };
  parts.push(names[c.key] || (c.key.length === 1 ? c.key.toUpperCase() : c.key));
  return parts.join("+");
}
function matchScore(query, ...fields) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const hay = fields
    .filter((x) => x != null && String(x) !== "")
    .map((x) => String(x).toLowerCase())
    .join(" ");
  if (!hay) return 0;
  if (!q) return 1;
  if (hay === q) return 100;
  if (hay.startsWith(q)) return 80;
  const idx = hay.indexOf(q);
  if (idx > 0) return 60 - Math.min(20, idx);
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => hay.includes(p))) return 35;
  return 0;
}
function defaultShortcutDefs() {
  return [
    { id: "save", group: "document", label: "Save", combo: { key: "s", ctrl: true }, allowInInput: true },
    { id: "preview", group: "document", label: "Preview", combo: { key: "p", ctrl: true, shift: true } },
    { id: "undo", group: "edit", label: "Undo", combo: { key: "z", ctrl: true } },
    {
      id: "redo",
      group: "edit",
      label: "Redo",
      combo: { key: "z", ctrl: true, shift: true },
      aliases: [{ key: "y", ctrl: true }],
    },
    { id: "copy", group: "edit", label: "Copy", combo: { key: "c", ctrl: true } },
    { id: "cut", group: "edit", label: "Cut", combo: { key: "x", ctrl: true } },
    { id: "paste", group: "edit", label: "Paste", combo: { key: "v", ctrl: true } },
    { id: "copy_style", group: "edit", label: "Copy Style", combo: { key: "c", ctrl: true, shift: true } },
    { id: "paste_style", group: "edit", label: "Paste style", combo: { key: "v", ctrl: true, shift: true } },
    { id: "copy_all", group: "edit", label: "Copy All Content", combo: { key: "c", ctrl: true, alt: true } },
    { id: "paste_all", group: "edit", label: "Paste All Content", combo: { key: "v", ctrl: true, alt: true } },
    { id: "reset_style", group: "edit", label: "Reset style", combo: { key: "r", ctrl: true, alt: true } },
    { id: "duplicate", group: "edit", label: "Duplicate", combo: { key: "d", ctrl: true } },
    { id: "delete", group: "edit", label: "Delete", combo: { key: "delete" }, aliases: [{ key: "backspace" }] },
    {
      id: "escape",
      group: "ui",
      label: "Close menus and dialogs",
      combo: { key: "escape" },
      allowInInput: true,
      rebindable: false,
    },
    { id: "toggle_panels", group: "ui", label: "Show or hide side panels", combo: { key: "p", ctrl: true } },
    { id: "navigator", group: "ui", label: "Navigator", combo: { key: "i", ctrl: true } },
    { id: "finder", group: "ui", label: "Finder", combo: { key: "e", ctrl: true }, allowInInput: true },
    {
      id: "shortcuts",
      group: "ui",
      label: "Keyboard shortcut cheat sheet",
      combo: { key: "?", ctrl: true },
      allowInInput: true,
      aliases: [{ key: "?" }],
    },
    { id: "preferences", group: "ui", label: "User Preferences", combo: { key: "u", ctrl: true } },
    { id: "site_settings", group: "ui", label: "Site Settings", combo: { key: "k", ctrl: true } },
    { id: "library", group: "ui", label: "Template Library", combo: { key: "l", ctrl: true, shift: true } },
    { id: "history", group: "ui", label: "History", combo: { key: "h", ctrl: true, shift: true } },
    { id: "page_settings", group: "ui", label: "Page Settings", combo: { key: "y", ctrl: true, shift: true } },
    {
      id: "responsive",
      group: "ui",
      label: "Cycle responsive breakpoints",
      combo: { key: "m", ctrl: true, shift: true },
    },
  ];
}
function readJson(key, fallback) {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}
function isEditingTarget(t3) {
  if (!t3) return false;
  if (t3.isContentEditable) return true;
  const tag = String(t3.tagName || "").toUpperCase();
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
  if (
    typeof t3.closest === "function" &&
    t3.closest(".CodeMirror, .lb-finder, .lb-shortcut-capture, .lb-inline-toolbar")
  )
    return true;
  return false;
}
function installShortcuts() {
  if (!app.root) return;
  app.lbShortcutOwner = true;
  app.shortcutMac = isMacPlatform();
  app.shortcutDefs = defaultShortcutDefs();
  app.shortcutExtras = [];
  app.shortcutCustom = readJson(SHORTCUT_STORAGE, {}) || {};
  app.shortcutListening = null;
  app.finderOpen = false;
  app.finderActive = 0;
  app.finderItems = [];
  app.finderQuery = "";
  app.finderCatalog = { templates: [], components: [] };
  function hooks() {
    return app.LB && app.LB.hooks ? app.LB.hooks : { applyFilters: (_n, v) => v, doAction() {} };
  }
  app.shortcutBinding = function shortcutBinding(def) {
    if (!def) return normalizeCombo({});
    const custom = app.shortcutCustom && app.shortcutCustom[def.id];
    return normalizeCombo(custom || def.combo);
  };
  app.shortcutLabel = function shortcutLabel(id) {
    const def = (app.shortcutDefs || []).find((d) => d.id === id);
    if (!def) return "";
    return formatCombo(app.shortcutBinding(def), app.shortcutMac);
  };
  app.saveShortcutBindings = function saveShortcutBindings() {
    writeJson(SHORTCUT_STORAGE, app.shortcutCustom || {});
  };
  app.resetShortcutBindings = function resetShortcutBindings() {
    app.shortcutCustom = {};
    app.saveShortcutBindings();
  };
  app.setShortcutBinding = function setShortcutBinding(id, combo) {
    const def = (app.shortcutDefs || []).find((d) => d.id === id);
    if (!def || def.rebindable === false) return false;
    const next = normalizeCombo(combo);
    if (!next.key || next.key === "escape") return false;
    const clash = (app.shortcutDefs || []).find((d) => d.id !== id && combosEqual(app.shortcutBinding(d), next));
    if (clash) {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(app.t("This shortcut is already used by %s. Replace it?", app.t(clash.label)));
      if (!ok) return false;
      const keep = Object.assign({}, app.shortcutCustom || {});
      delete keep[clash.id];
      app.shortcutCustom = keep;
    }
    const defCombo = normalizeCombo(def.combo);
    const store = Object.assign({}, app.shortcutCustom || {});
    if (combosEqual(next, defCombo)) delete store[id];
    else store[id] = next;
    app.shortcutCustom = store;
    app.saveShortcutBindings();
    return true;
  };
  function runEscape() {
    if (app.shortcutListening) {
      app.shortcutListening = null;
      const sheet = document.querySelector(".lb-shortcut-sheet");
      if (sheet) app.openShortcutSheet();
      return true;
    }
    if (app.finderOpen) {
      app.closeFinder();
      return true;
    }
    app.root?.querySelector(".lb23-more-menu")?.remove();
    if (app.menuOpen && typeof app.closeMainMenu === "function") {
      app.closeMainMenu();
      return true;
    }
    if (typeof app.closeContextMenu === "function" && app.contextMenuEl) {
      app.closeContextMenu();
      return true;
    }
    if (typeof app.closeGlobalsPopover === "function" && app.globalsPopover) {
      app.closeGlobalsPopover();
      return true;
    }
    if (document.querySelector(".lb-modal-backdrop, .lb-rte-overlay")) {
      if (typeof app.closeModal === "function") app.closeModal();
      return true;
    }
    if (app.selected) {
      app.selected = null;
      if (typeof app.render === "function") app.render();
      return true;
    }
    return false;
  }
  app.runShortcut = function runShortcut(id) {
    const actions = {
      save: () => app.save && app.save(false),
      preview: () => app.openPagePreview && app.openPagePreview(),
      undo: () => app.undo && app.undo(),
      redo: () => app.redo && app.redo(),
      copy: () => app.selected && app.copy && app.copy(),
      cut: () => {
        if (!app.selected || !app.copy) return;
        app.copy();
        app.remove();
      },
      paste: () => app.paste && app.paste(),
      copy_style: () => app.selected && app.copyStyle && app.copyStyle(),
      paste_style: () => app.pasteStyle && app.pasteStyle(),
      copy_all: () => app.copyAllContent && app.copyAllContent(),
      paste_all: () => app.pasteAllContent && app.pasteAllContent(),
      reset_style: () => app.selected && app.resetStyle && app.resetStyle(),
      duplicate: () => app.selected && app.duplicate && app.duplicate(),
      delete: () => app.selected && app.remove && app.remove(),
      escape: () => runEscape(),
      toggle_panels: () => {
        app.leftHidden = !app.leftHidden;
        app.rightHidden = !app.rightHidden;
        app.render();
      },
      navigator: () => {
        app.activeTab = "navigator";
        app.rightHidden = false;
        app.siteSettingsOpen = false;
        app.render();
      },
      finder: () => app.openFinder(),
      shortcuts: () => app.openShortcutSheet(),
      preferences: () => app.lbOpenPreferences && app.lbOpenPreferences(),
      site_settings: () =>
        app.openSiteSettings ? app.openSiteSettings() : app.lbPrevMainMenu && app.lbPrevMainMenu("site-settings"),
      library: () => app.openTemplateLibrary && app.openTemplateLibrary(),
      history: () => (app.toggleHistory ? app.toggleHistory() : app.openRevisions && app.openRevisions()),
      page_settings: () => app.openPageSettings && app.openPageSettings(),
      responsive: () => {
        if (app.cycleDevice) app.cycleDevice();
        else app.device = app.device === "desktop" ? "tablet" : app.device === "tablet" ? "mobile" : "desktop";
        app.render();
      },
    };
    const extra = (app.shortcutDefs || []).find((d) => d.id === id && typeof d.run === "function");
    const fn = extra ? extra.run : actions[id];
    if (!fn) return false;
    fn();
    hooks().doAction("editor/shortcut", id, app.LB);
    return true;
  };
  app.shortcutDefsOf = function shortcutDefsOf() {
    const extras = Array.isArray(app.shortcutExtras) ? app.shortcutExtras : [];
    const list = defaultShortcutDefs().concat(extras);
    return hooks().applyFilters("editor/shortcuts", list, app.LB) || list;
  };
  app.shortcutDefs = app.shortcutDefsOf();
  function matchShortcutEvent(e) {
    const defs = app.shortcutDefs || [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const primary = app.shortcutBinding(def);
      const aliases = Array.isArray(def.aliases) ? def.aliases : [];
      const all = [primary].concat(app.shortcutCustom && app.shortcutCustom[def.id] ? [] : aliases);
      for (let j = 0; j < all.length; j++) {
        if (matchCombo(e, all[j])) return def;
      }
    }
    return null;
  }
  app.handleShortcutEvent = function handleShortcutEvent(e) {
    if (!e) return false;
    if (app.shortcutListening) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (eventKey(e) === "escape") {
        app.shortcutListening = null;
        app.openShortcutSheet();
        return true;
      }
      if (["Control", "Shift", "Alt", "Meta", "OS"].includes(e.key)) return true;
      const id = app.shortcutListening;
      app.shortcutListening = null;
      app.setShortcutBinding(id, comboFromEvent(e));
      app.openShortcutSheet();
      return true;
    }
    if (app.finderOpen) {
      if (eventKey(e) === "escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.closeFinder();
        return true;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.moveFinder(e.key === "ArrowDown" ? 1 : -1);
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.runFinderActive();
        return true;
      }
      const def2 = matchShortcutEvent(e);
      if (def2 && def2.id === "finder" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.closeFinder();
        return true;
      }
      return false;
    }
    const def = matchShortcutEvent(e);
    if (!def) return false;
    const editing = isEditingTarget(e.target);
    if (editing && !def.allowInInput) return false;
    if (editing && ["copy", "cut", "paste", "undo", "redo"].includes(def.id)) return false;
    const used = comboFromEvent(e);
    if (editing && def.id !== "escape" && !used.ctrl && !used.alt) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    app.runShortcut(def.id);
    return true;
  };
  function bindShortcutTarget(target) {
    if (!target || target.__lbShortcuts) return;
    target.__lbShortcuts = true;
    target.addEventListener("keydown", (e) => app.handleShortcutEvent(e), true);
  }
  bindShortcutTarget(document);
  if (typeof window !== "undefined") bindShortcutTarget(window);
  function bindFrameDoc() {
    const fd = app.frameDoc && app.frameDoc();
    if (fd) {
      bindShortcutTarget(fd);
      if (fd.defaultView) bindShortcutTarget(fd.defaultView);
    }
  }
  if (typeof app.bindFrame === "function") {
    const oldBind = app.bindFrame;
    app.bindFrame = function bindFrameWithShortcuts() {
      oldBind.apply(this, arguments);
      bindFrameDoc();
    };
  }
  bindFrameDoc();
  app.lbPrevMainMenu = app.handleMainMenu;
  app.lbOpenPreferences = function lbOpenPreferences() {
    if (typeof app.openPreferences === "function") {
      app.openPreferences();
      return;
    }
    if (typeof app.lbPrevMainMenu === "function") app.lbPrevMainMenu("preferences");
    const list = document.querySelector(".lb-modal-body .lb-preference-list");
    if (!list || list.querySelector("#lb-pref-shortcuts")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "lb-pref-shortcuts";
    btn.className = "lb-btn";
    btn.textContent = app.t("Customize keyboard shortcuts");
    btn.addEventListener("click", () => {
      app.closeModal();
      app.openShortcutSheet();
    });
    list.appendChild(btn);
  };
  if (typeof app.lb23More === "function") {
    const oldMore = app.lb23More;
    app.lb23More = function lb23MoreWithFinder() {
      oldMore();
      const menu = app.root && app.root.querySelector(".lb23-more-menu");
      if (!menu || menu.querySelector('[data-more="finder"]')) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.more = "finder";
      btn.textContent = app.t("Finder");
      const sep = menu.querySelector(".lb23-more-sep");
      if (sep) menu.insertBefore(btn, sep);
      else menu.appendChild(btn);
      btn.addEventListener("click", () => {
        menu.remove();
        app.openFinder();
      });
    };
  }
  app.handleMainMenu = function handleMainMenuShortcuts(action) {
    if (action === "shortcuts") {
      app.openShortcutSheet();
      return;
    }
    if (action === "preferences") {
      app.lbOpenPreferences();
      return;
    }
    return app.lbPrevMainMenu ? app.lbPrevMainMenu(action) : void 0;
  };
  app.openShortcutSheet = function openShortcutSheet() {
    app.closeFinder();
    if (typeof app.closeMainMenu === "function") app.closeMainMenu();
    app.shortcutDefs = app.shortcutDefsOf();
    const groups = [
      ["document", app.t("Document")],
      ["edit", app.t("Edit")],
      ["ui", app.t("Editor")],
    ];
    const rows = groups
      .map(([gid, title]) => {
        const items = (app.shortcutDefs || []).filter((d) => d.group === gid && !d.hidden);
        if (!items.length) return "";
        return `<section class="lb-shortcut-group"><h4>${app.esc(title)}</h4>${items
          .map((d) => {
            const bind = app.shortcutBinding(d);
            const listening = app.shortcutListening === d.id;
            const kbd = listening ? app.t("Press new keys\u2026") : formatCombo(bind, app.shortcutMac);
            const change =
              d.rebindable === false
                ? ""
                : `<button type="button" class="lb-btn lb-shortcut-rebind" data-shortcut-id="${app.esc(d.id)}">${app.esc(listening ? app.t("Cancel") : app.t("Change"))}</button>`;
            return `<div class="lb-shortcut-row${listening ? " is-listening" : ""}"><span>${app.esc(app.t(d.label))}</span><kbd>${app.esc(kbd)}</kbd>${change}</div>`;
          })
          .join("")}</section>`;
      })
      .join("");
    const body = `<div class="lb-shortcut-sheet"><p class="lb-muted">${app.t("Shortcuts can be changed. Click Change, then press the new combination. Finder opens with Ctrl+E (Cmd+E on Mac).")}</p>${rows}<div class="lb-shortcut-actions"><button type="button" class="lb-btn" id="lb-shortcut-reset">${app.t("Reset to default")}</button></div></div>`;
    app.showMenuDialog(app.t("Keyboard Shortcuts"), body);
    document.querySelectorAll(".lb-shortcut-rebind").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const id = b.dataset.shortcutId;
        app.shortcutListening = app.shortcutListening === id ? null : id;
        app.openShortcutSheet();
      });
    });
    document.getElementById("lb-shortcut-reset")?.addEventListener("click", () => {
      if (!window.confirm(app.t("Restore default shortcuts? Custom bindings will be lost."))) return;
      app.shortcutListening = null;
      app.resetShortcutBindings();
      app.openShortcutSheet();
    });
  };
  function classNames() {
    if (typeof app.lb110ClassNames === "function") return app.lb110ClassNames();
    const raw = app.D && app.D.classes && typeof app.D.classes === "object" ? app.D.classes : {};
    return Object.keys(raw);
  }
  function rememberFinder(item) {
    const cur = readJson(FINDER_RECENT_STORAGE, []) || [];
    const next = [
      { kind: item.kind, id: item.id },
      ...cur.filter((x) => !(x.kind === item.kind && String(x.id) === String(item.id))),
    ].slice(0, 12);
    writeJson(FINDER_RECENT_STORAGE, next);
  }
  function applyClass(name) {
    if (!app.selected) {
      if (typeof app.openClassManager === "function") app.openClassManager();
      return;
    }
    const r = app.locate(app.state.root, app.selected);
    if (!r) return;
    const cur = String((r.node.settings && r.node.settings.global_class) || "")
      .split(/[\s,]+/)
      .filter(Boolean);
    if (!cur.includes(name)) cur.push(name);
    app.update("global_class", cur.join(" "));
  }
  function openPage(id) {
    if (String(id) === String(app.D.postId)) return;
    if (app.dirty && !window.confirm(app.t("You have unsaved changes. Leave the editor?"))) return;
    window.location.href = `${app.D.adminUrl}admin.php?page=canvasly-lite&post_id=${id}`;
  }
  app.collectFinderItems = function collectFinderItems(query) {
    const q = String(query || "");
    const items = [];
    const push = (item, extra) => {
      const score = matchScore(q, item.title, item.hint, item.kind, extra);
      if (score > 0 || !q.trim()) items.push(Object.assign({ score: q.trim() ? score : item.recent ? 90 : 10 }, item));
    };
    const actionList = [
      { id: "save", title: app.t("Save"), hint: app.shortcutLabel("save"), run: () => app.runShortcut("save") },
      {
        id: "preview",
        title: app.t("Preview"),
        hint: app.shortcutLabel("preview"),
        run: () => app.runShortcut("preview"),
      },
      { id: "undo", title: app.t("Undo"), hint: app.shortcutLabel("undo"), run: () => app.runShortcut("undo") },
      { id: "redo", title: app.t("Redo"), hint: app.shortcutLabel("redo"), run: () => app.runShortcut("redo") },
      {
        id: "navigator",
        title: app.t("Navigator"),
        hint: app.shortcutLabel("navigator"),
        run: () => app.runShortcut("navigator"),
      },
      {
        id: "library",
        title: app.t("Template Library"),
        hint: app.shortcutLabel("library"),
        run: () => app.runShortcut("library"),
      },
      {
        id: "history",
        title: app.t("History"),
        hint: app.shortcutLabel("history"),
        run: () => app.runShortcut("history"),
      },
      {
        id: "responsive",
        title: app.t("Cycle responsive breakpoints"),
        hint: app.shortcutLabel("responsive"),
        run: () => app.runShortcut("responsive"),
      },
      {
        id: "shortcuts",
        title: app.t("Keyboard Shortcuts"),
        hint: app.shortcutLabel("shortcuts"),
        run: () => app.runShortcut("shortcuts"),
      },
      {
        id: "preferences",
        title: app.t("User Preferences"),
        hint: app.shortcutLabel("preferences"),
        run: () => app.runShortcut("preferences"),
      },
      {
        id: "toggle_panels",
        title: app.t("Show or hide side panels"),
        hint: app.shortcutLabel("toggle_panels"),
        run: () => app.runShortcut("toggle_panels"),
      },
      {
        id: "add-page",
        title: app.t("Add New Page"),
        hint: app.t("Page"),
        run: () => app.openPageMenu && app.openPageMenu(),
      },
      {
        id: "copy_style",
        title: app.t("Copy Style"),
        hint: app.shortcutLabel("copy_style"),
        run: () => app.runShortcut("copy_style"),
      },
      {
        id: "paste_style",
        title: app.t("Paste style"),
        hint: app.shortcutLabel("paste_style"),
        run: () => app.runShortcut("paste_style"),
      },
      {
        id: "copy_all",
        title: app.t("Copy All Content"),
        hint: app.shortcutLabel("copy_all"),
        run: () => app.runShortcut("copy_all"),
      },
      {
        id: "paste_all",
        title: app.t("Paste All Content"),
        hint: app.shortcutLabel("paste_all"),
        run: () => app.runShortcut("paste_all"),
      },
      {
        id: "reset_style",
        title: app.t("Reset style"),
        hint: app.shortcutLabel("reset_style"),
        run: () => app.runShortcut("reset_style"),
      },
      {
        id: "icons",
        title: app.t("Icons"),
        hint: app.t("Library"),
        run: () => app.openIconLibrary && app.openIconLibrary(),
      },
      {
        id: "variables",
        title: app.t("Variables"),
        hint: app.t("Design System"),
        run: () => app.openVariables && app.openVariables(),
      },
      {
        id: "components",
        title: app.t("Components"),
        hint: app.t("Library"),
        run: () => app.openComponentLibrary && app.openComponentLibrary(),
      },
      {
        id: "classes",
        title: app.t("Global Classes"),
        hint: app.t("Design System"),
        run: () => app.openClassManager && app.openClassManager(),
      },
      {
        id: "breakpoints",
        title: app.t("Breakpoints"),
        hint: app.t("Responsive"),
        run: () => app.openBreakpointsModal && app.openBreakpointsModal(),
      },
    ];
    actionList.forEach((a) => push({ kind: "action", id: a.id, title: a.title, hint: a.hint, run: a.run }, "action"));
    (app.D.navigation || []).forEach((p) => {
      push(
        {
          kind: "page",
          id: p.id,
          title: p.title || app.t("Untitled Page"),
          hint: `${p.type || "page"} \xB7 ${p.status || ""}`.trim(),
          run: () => openPage(p.id),
        },
        p.type,
      );
    });
    (app.finderCatalog.templates || []).forEach((t3) => {
      push(
        {
          kind: "template",
          id: t3.id,
          title: t3.title || app.t("Template Library"),
          hint: t3.type || "page",
          run: () => app.loadTemplate && app.loadTemplate(t3.id),
        },
        "template",
      );
    });
    (app.finderCatalog.components || []).forEach((c) => {
      push(
        {
          kind: "component",
          id: c.id,
          title: c.title || app.t("Component"),
          hint: app.t("Components"),
          run: () => app.loadComponent && app.loadComponent(c.id),
        },
        "component",
      );
    });
    classNames().forEach((name) => {
      push(
        {
          kind: "class",
          id: name,
          title: "." + name,
          hint: app.t("Global Classes"),
          run: () => applyClass(name),
        },
        "class css",
      );
    });
    const settings = [
      {
        id: "page",
        title: app.t("Page Settings"),
        hint: app.t("Settings"),
        run: () => app.openPageSettings && app.openPageSettings(),
      },
      {
        id: "site-colors",
        title: app.t("Global Colors"),
        hint: app.t("Site Settings"),
        run: () => app.openSiteSettings && app.openSiteSettings("colors"),
      },
      {
        id: "site-typo",
        title: app.t("Global Typography"),
        hint: app.t("Site Settings"),
        run: () => app.openSiteSettings && app.openSiteSettings("typography"),
      },
      {
        id: "site-theme",
        title: app.t("Theme Style"),
        hint: app.t("Site Settings"),
        run: () => app.openSiteSettings && app.openSiteSettings("theme"),
      },
      {
        id: "site-layout",
        title: app.t("Layout"),
        hint: app.t("Site Settings"),
        run: () => app.openSiteSettings && app.openSiteSettings("site"),
      },
      {
        id: "site-kit",
        title: app.t("Kit"),
        hint: app.t("Site Settings"),
        run: () => app.openSiteSettings && app.openSiteSettings("kit"),
      },
      {
        id: "notes",
        title: app.t("Notes"),
        hint: app.t("Settings"),
        run: () => app.lbPrevMainMenu && app.lbPrevMainMenu("notes"),
      },
      {
        id: "preferences",
        title: app.t("User Preferences"),
        hint: app.t("Settings"),
        run: () => app.lbOpenPreferences && app.lbOpenPreferences(),
      },
    ];
    settings.forEach((s) =>
      push({ kind: "setting", id: s.id, title: s.title, hint: s.hint, run: s.run }, "settings panel"),
    );
    (app.D.units || []).forEach((el) => {
      push(
        {
          kind: "unit",
          id: el.type,
          title: el.title || el.type,
          hint: el.category || app.t("Units"),
          run: () => app.add && app.add(el.type),
        },
        (el.keywords || []).join(" "),
      );
    });
    const recent = readJson(FINDER_RECENT_STORAGE, []) || [];
    items.forEach((item) => {
      if (recent.some((r) => r.kind === item.kind && String(r.id) === String(item.id))) item.recent = true;
    });
    const filtered = hooks().applyFilters("editor/finder/items", items, q, app.LB) || items;
    filtered.sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));
    const per = {};
    const out = [];
    filtered.forEach((item) => {
      if (!q.trim() && !item.recent && item.kind !== "action" && item.kind !== "setting") {
        per[item.kind] = (per[item.kind] || 0) + 1;
        if (per[item.kind] > 5) return;
      } else {
        per[item.kind] = (per[item.kind] || 0) + 1;
        if (per[item.kind] > 8) return;
      }
      out.push(item);
    });
    return out.slice(0, 48);
  };
  function finderGroupLabel(kind) {
    return (
      {
        action: app.t("Actions"),
        page: app.t("Pages"),
        template: app.t("Templates"),
        component: app.t("Components"),
        class: app.t("Classes"),
        setting: app.t("Settings"),
        unit: app.t("Units"),
      }[kind] || kind
    );
  }
  app.renderFinderList = function renderFinderList() {
    const host = document.getElementById("lb-finder-results");
    if (!host) return;
    const items = app.finderItems || [];
    if (!items.length) {
      host.innerHTML = `<div class="lb-finder-empty">${app.esc(app.t("No matching results."))}</div>`;
      return;
    }
    let html = "";
    let last = "";
    items.forEach((item, i) => {
      if (item.kind !== last) {
        html += `<div class="lb-finder-group">${app.esc(finderGroupLabel(item.kind))}</div>`;
        last = item.kind;
      }
      html += `<button type="button" class="lb-finder-item${i === app.finderActive ? " is-active" : ""}" data-finder-index="${i}" id="lb-finder-item-${i}"><span class="lb-finder-title">${app.esc(item.title)}</span><span class="lb-finder-hint">${app.esc(item.hint || "")}</span></button>`;
    });
    host.innerHTML = html;
    host.querySelectorAll(".lb-finder-item").forEach((b) => {
      b.addEventListener("mousemove", () => {
        const i = Number(b.dataset.finderIndex);
        if (i !== app.finderActive) {
          app.finderActive = i;
          app.renderFinderList();
        }
      });
      b.addEventListener("click", (e) => {
        e.preventDefault();
        app.finderActive = Number(b.dataset.finderIndex);
        app.runFinderActive();
      });
    });
    const active = host.querySelector(".lb-finder-item.is-active");
    if (active && typeof active.scrollIntoView === "function") active.scrollIntoView({ block: "nearest" });
    const input = document.getElementById("lb-finder-input");
    if (input) input.setAttribute("aria-activedescendant", "lb-finder-item-" + app.finderActive);
  };
  app.refreshFinder = function refreshFinder() {
    app.finderItems = app.collectFinderItems(app.finderQuery);
    if (app.finderActive >= app.finderItems.length) app.finderActive = Math.max(0, app.finderItems.length - 1);
    app.renderFinderList();
  };
  app.moveFinder = function moveFinder(dir) {
    const n = (app.finderItems || []).length;
    if (!n) return;
    app.finderActive = (app.finderActive + dir + n) % n;
    app.renderFinderList();
  };
  app.runFinderActive = function runFinderActive() {
    const item = (app.finderItems || [])[app.finderActive];
    if (!item) return;
    rememberFinder(item);
    app.closeFinder();
    try {
      item.run && item.run();
    } catch (e) {
      if (window.console && console.error) console.error("[Canvasly] finder action failed:", e);
    }
    hooks().doAction("editor/finder/run", item, app.LB);
  };
  app.closeFinder = function closeFinder() {
    document.querySelectorAll(".lb-finder-backdrop").forEach((n) => n.remove());
    app.finderOpen = false;
    app.finderQuery = "";
    app.finderItems = [];
  };
  app.openFinder = async function openFinder() {
    if (app.finderOpen) {
      document.getElementById("lb-finder-input")?.focus();
      return;
    }
    if (typeof app.closeMainMenu === "function") app.closeMainMenu();
    if (typeof app.closeContextMenu === "function") app.closeContextMenu();
    if (typeof app.closeModal === "function") app.closeModal();
    app.root?.querySelector(".lb23-more-menu")?.remove();
    app.shortcutListening = null;
    app.finderOpen = true;
    app.finderQuery = "";
    app.finderActive = 0;
    const backdrop = document.createElement("div");
    backdrop.className = "lb-finder-backdrop";
    backdrop.innerHTML = `<div class="lb-finder" role="dialog" aria-modal="true" aria-label="${app.esc(app.t("Finder"))}"><input type="search" class="lb-finder-input" id="lb-finder-input" placeholder="${app.esc(app.t("Search pages, templates, components, classes, settings and actions\u2026"))}" autocomplete="off" spellcheck="false" aria-controls="lb-finder-results"><div class="lb-finder-results" id="lb-finder-results" role="listbox"></div></div>`;
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) app.closeFinder();
    });
    document.body.appendChild(backdrop);
    const input = document.getElementById("lb-finder-input");
    input?.addEventListener("input", () => {
      app.finderQuery = input.value || "";
      app.finderActive = 0;
      app.refreshFinder();
    });
    app.refreshFinder();
    hooks().doAction("editor/finder/open", app.LB);
    setTimeout(() => input?.focus(), 0);
    try {
      const headers = { "X-WP-Nonce": app.D.nonce };
      const [templates, components] = await Promise.all([
        fetch(`${app.D.api}/templates`, { headers })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch(`${app.D.api}/components`, { headers })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      app.finderCatalog.templates = Array.isArray(templates) ? templates : [];
      app.finderCatalog.components = Array.isArray(components) ? components : [];
      if (app.finderOpen) app.refreshFinder();
    } catch (e) {}
  };
  if (app.LB) {
    app.LB.openFinder = () => app.openFinder();
    app.LB.openShortcutSheet = () => app.openShortcutSheet();
    app.LB.shortcutLabel = (id) => app.shortcutLabel(id);
    app.LB.registerShortcut = (def) => {
      if (!def || !def.id) return false;
      const extras = Array.isArray(app.shortcutExtras) ? app.shortcutExtras.slice() : [];
      const i = extras.findIndex((d) => d.id === def.id);
      if (i >= 0) extras[i] = Object.assign({}, extras[i], def);
      else extras.push(def);
      app.shortcutExtras = extras;
      app.shortcutDefs = app.shortcutDefsOf();
      return true;
    };
  }
}

export {
  SHORTCUT_STORAGE,
  FINDER_RECENT_STORAGE,
  isMacPlatform,
  eventKey,
  comboFromEvent,
  normalizeCombo,
  combosEqual,
  matchCombo,
  formatCombo,
  matchScore,
  defaultShortcutDefs,
  readJson,
  writeJson,
  isEditingTarget,
  installShortcuts,
};
