import { app } from "./app.js";
function installContextmenu() {
  app.closeContextMenu = function closeContextMenu() {
    if (app.contextMenuEl) {
      app.contextMenuEl.remove();
      app.contextMenuEl = null;
    }
    document.removeEventListener("mousedown", app.contextOutside, true);
    document.removeEventListener("keydown", app.contextEscape, true);
  };
  app.contextOutside = function contextOutside(e) {
    if (app.contextMenuEl && !app.contextMenuEl.contains(e.target)) app.closeContextMenu();
  };
  app.contextEscape = function contextEscape(e) {
    if (e.key === "Escape") app.closeContextMenu();
  };
  app.contextItem = function contextItem(label, action, disabled = false, shortcut = "") {
    return `<button type="button" class="lb-context-item ${disabled ? "is-disabled" : ""}" data-context-action="${app.esc(action)}" ${disabled ? "disabled" : ""}><span>${app.esc(label)}</span>${shortcut ? `<kbd>${app.esc(shortcut)}</kbd>` : ""}</button>`;
  };
  app.showContextMenu = function showContextMenu(kind, opts = {}) {
    app.closeContextMenu();
    const sc = (id) => (app.shortcutLabel ? app.shortcutLabel(id) : "");
    const menu = document.createElement("div");
    menu.className = "lb-context-menu";
    let html = "";
    if (kind === "unit-card") {
      html += app.contextItem(
        app.fav.has(opts.type) ? app.t("Remove from Favorites") : app.t("Add to Favorites"),
        app.fav.has(opts.type) ? "remove-favorite" : "add-favorite",
      );
    } else if (kind === "unit") {
      const title = app.meta(opts.type).title || opts.type || app.t("Unit");
      html += app.contextItem(app.t("Edit %s", title), "edit");
      html += app.contextItem(app.t("Duplicate"), "duplicate", "", sc("duplicate") || "Ctrl/Cmd+D");
      html += app.contextItem(app.t("Copy"), "copy", "", sc("copy") || "Ctrl/Cmd+C");
      html += app.contextItem(
        app.t("Paste"),
        "paste",
        !(app.hasUnitClipboard ? app.hasUnitClipboard() : app.clipboard),
        sc("paste") || "Ctrl/Cmd+V",
      );
      html += app.contextItem(app.t("Copy Style"), "copy-style", "", sc("copy_style") || "Ctrl/Cmd+Shift+C");
      html += app.contextItem(
        app.t("Paste style"),
        "paste-style",
        !(app.hasStyleClipboard ? app.hasStyleClipboard() : app.styleClipboard),
        sc("paste_style") || "Ctrl/Cmd+Shift+V",
      );
      html += app.contextItem(app.t("Reset style"), "reset-style", "", sc("reset_style"));
      if (["tabs", "accordion", "toggle"].includes(opts.type))
        html += app.contextItem(app.t("Convert to nested"), "convert-nested");
      if (opts.type !== "container" && opts.type !== "grid")
        html += app.contextItem(
          app.fav.has(opts.type) ? app.t("Remove from Favorites") : app.t("Add to Favorites"),
          app.fav.has(opts.type) ? "remove-favorite" : "add-favorite",
        );
      if (["container", "grid"].includes(opts.type))
        html += app.contextItem(app.t("Add New Container"), "add-container");
      html += '<div class="lb-context-separator"></div>';
      if (opts.type === "container" || opts.type === "grid")
        html += app.contextItem(app.t("Save as Template"), "save-template");
      html += app.contextItem(app.t("Save as Component"), "save-component");
      html += app.contextItem(app.t("Structure"), "structure");
      html +=
        '<div class="lb-context-separator"></div>' +
        app.contextItem(app.t("Delete"), "delete", "", (app.shortcutLabel && app.shortcutLabel("delete")) || "Delete");
    } else {
      html += app.contextItem(
        app.t("Paste"),
        "paste",
        !(app.hasUnitClipboard ? app.hasUnitClipboard() : app.clipboard),
        sc("paste") || "Ctrl/Cmd+V",
      );
      html += app.contextItem(
        app.t("Paste All Content"),
        "paste-all",
        !(app.hasPageClipboard ? app.hasPageClipboard() : app.pageClipboard),
        sc("paste_all"),
      );
      html += app.contextItem(app.t("Add New Container"), "add-container");
      html += app.contextItem(app.t("Copy All Content"), "copy-all", "", sc("copy_all"));
      html += app.contextItem(app.t("Delete All Content"), "delete-all");
      html += '<div class="lb-context-separator"></div>' + app.contextItem(app.t("Structure"), "structure");
    }
    menu.innerHTML = html;
    document.body.appendChild(menu);
    app.contextMenuEl = menu;
    const frame = document.getElementById("lb-editor-frame");
    const rr = frame?.getBoundingClientRect();
    let x = Number(opts.x ?? 20),
      y = Number(opts.y ?? 20);
    if (opts.inFrame && rr) {
      x = rr.left + x;
      y = rr.top + y;
    }
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const mw = menu.offsetWidth || 286;
    const mh = menu.offsetHeight || 40;
    const gap = 8;
    x = Math.max(gap, Math.min(x, vw - mw - gap));
    y = Math.max(gap, Math.min(y, vh - mh - gap));
    menu.style.position = "fixed";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.querySelectorAll("[data-context-action]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const a = b.dataset.contextAction;
          app.closeContextMenu();
          if (opts.id) app.selected = opts.id;
          switch (a) {
            case "edit":
              app.selectNode(opts.id);
              break;
            case "duplicate":
              app.duplicate();
              break;
            case "copy":
              app.copy(opts.id);
              break;
            case "copy-style":
              app.copyStyle(opts.id);
              break;
            case "paste":
              app.paste();
              break;
            case "paste-all":
              app.pasteAllContent();
              break;
            case "paste-style":
              app.pasteStyle(opts.id);
              break;
            case "reset-style":
              app.resetStyle(opts.id);
              break;
            case "convert-nested":
              if (typeof app.convertToNested === "function") app.convertToNested(opts.id);
              break;
            case "add-favorite":
              app.toggleFavorite(opts.type);
              break;
            case "remove-favorite":
              app.toggleFavorite(opts.type);
              break;
            case "add-container":
              app.add("container", opts.id && ["container", "grid"].includes(opts.type) ? opts.id : null);
              break;
            case "save-template":
              app.saveTemplateFor(opts.id);
              break;
            case "save-component":
              app.saveComponentFor(opts.id);
              break;
            case "structure":
              app.activeTab = "navigator";
              app.refreshRightPanel();
              break;
            case "delete":
              app.remove(opts.id);
              break;
            case "copy-all":
              app.copyAllContent();
              break;
            case "delete-all":
              app.deleteAllContent();
              break;
          }
        }),
    );
    setTimeout(() => {
      document.addEventListener("mousedown", app.contextOutside, true);
      document.addEventListener("keydown", app.contextEscape, true);
    }, 0);
  };
  app.saveTemplateFor = async function saveTemplateFor(id) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    const title = prompt(app.t("Template name:"), app.t("%s Template", app.meta(r.node.type).title));
    if (!title) return;
    const type = ["container", "grid"].includes(r.node.type) ? "section" : "block";
    const resp = await fetch(`${app.D.api}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({
        title,
        type,
        document: { version: app.state.version || "2.1", root: [r.node], settings: {} },
      }),
    });
    if (!resp.ok) alert(app.t("Could not save template."));
  };
  app.saveComponentFor = async function saveComponentFor(id) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    const title = prompt(app.t("Component name:"), app.t("%s Component", app.meta(r.node.type).title));
    if (!title) return;
    const resp = await fetch(`${app.D.api}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({
        title,
        document: { version: "2.1", root: [app.clone(r.node)], atomic: true },
        exposed: ["text", "title", "url", "image_url", "color", "background"],
      }),
    });
    if (!resp.ok) alert(app.t("Could not save component."));
  };
  app.paste = function paste() {
    if (app.previewingRevision || !app.clipboard || app.proUnitLocked(app.clipboard.type)) return;
    app.commit(app.t("Pasted %s", app.meta(app.clipboard.type).title || app.clipboard.type), app.clipboard.id);
    const c = app.clone(app.clipboard),
      r = app.selected && app.locate(app.state.root, app.selected);
    if (r && app.acceptsInside(r.node)) {
      r.node.children = r.node.children || [];
      if (typeof app.assignSlot === "function") app.assignSlot(c, r.node);
      r.node.children.push(c);
    } else if (r) {
      if (r.parent && typeof app.assignSlot === "function") app.assignSlot(c, r.parent, r.node.slot);
      else if (c.slot) delete c.slot;
      r.nodes.splice(r.index + 1, 0, c);
    } else {
      if (c.slot) delete c.slot;
      if (!app.selected && (app.chromeFocus === "header" || app.chromeFocus === "footer"))
        app.chromeList(app.chromeFocus).push(c);
      else app.state.root.push(c);
    }
    const placed = app.regionOf ? app.regionOf(c.id) : "root";
    if (placed === "header" || placed === "footer") app.chromeFocus = placed;
    app.selected = c.id;
    app.render();
  };
  app.move = function move(id, targetId, pos, slotId) {
    const s = app.locate(app.state.root, id),
      t3 = app.locate(app.state.root, targetId);
    if (!s || !t3 || id === targetId || app.contains(s.node, targetId)) return false;
    if (pos === "inside") {
      if (!app.acceptsInside(t3.node)) return false;
      t3.node.children = t3.node.children || [];
      if (typeof app.assignSlot === "function") app.assignSlot(s.node, t3.node, slotId);
      else if (s.node.slot) delete s.node.slot;
      t3.node.children.push(s.node);
      s.nodes.splice(s.index, 1);
      return true;
    }
    let list = t3.nodes,
      idx = t3.index + (pos === "after" ? 1 : 0);
    if (s.nodes === list && s.index < idx) idx--;
    s.nodes.splice(s.index, 1);
    if (t3.parent && typeof app.assignSlot === "function") app.assignSlot(s.node, t3.parent, t3.node.slot);
    else if (s.node.slot) delete s.node.slot;
    list.splice(Math.max(0, idx), 0, s.node);
    return true;
  };
  app.moveExisting = function moveExisting(id, target, pos, slotId) {
    if (app.previewingRevision) return;
    const node = app.locate(app.state.root, id);
    app.commit(app.t("Moved %s", node ? app.meta(node.node.type).title || node.node.type : app.t("Unit")), id);
    if (!app.move(id, target, pos, slotId)) {
      app.history.pop();
      return;
    }
    app.selected = id;
    app.render();
  };
  app.update = function update(path, v) {
    if (app.previewingRevision) return;
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return;
    app.commit(app.t("Edited %s", app.meta(r.node.type).title || r.node.type), r.node.id);
    app.setPath(r.node.settings, path, v);
    app.dirty = true;
    if (app.scheduleSave) app.scheduleSave();
    if (typeof app.previewSetting === "function") {
      app.previewSetting(path, r.node.id);
      if (
        typeof app.settingNeedsPanel === "function" &&
        app.settingNeedsPanel(path) &&
        typeof app.refreshRightPanel === "function"
      )
        app.refreshRightPanel();
      return;
    }
    app.render();
  };
}

export { installContextmenu };
