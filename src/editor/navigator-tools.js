import { app } from "./app.js";

/*
 * Navigator tools: collapse/expand, rename, hide and lock.
 *
 * - Collapse state is a per-user view preference (localStorage, per post).
 * - A custom name is stored on the node as editor_settings.label.
 * - Hide (editor_settings.hidden) hides the unit on the editor canvas only;
 *   visitors still see it. It is for getting overlapping or off-canvas
 *   layers out of the way while editing.
 * - Lock (editor_settings.locked) stops canvas selection, dragging, moving,
 *   deleting and editing of the unit and everything inside it. It can still
 *   be selected from the Navigator, where it can be unlocked.
 * Rename, hide and lock are saved with the document and go through undo/redo.
 */
function installNavigatorTools() {
  const ICON = {
    caret: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
    eyeOff: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 14L14 2" stroke="currentColor" stroke-width="1.6"/></svg>',
    lock: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 016 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    unlock: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 015.6-1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    pencil: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 11.5V13h1.5l7.4-7.4-1.5-1.5L3 11.5zM12.7 4.8a.9.9 0 000-1.3l-.2-.2a.9.9 0 00-1.3 0l-.6.6 1.5 1.5.6-.6z" fill="currentColor"/></svg>'
  };
  const t = (s) => (typeof app.t === "function" ? app.t(s) : s);
  const esc = (s) => (typeof app.esc === "function" ? app.esc(s) : String(s));
  const postId = () => String((app.D && app.D.postId) || (app.root && app.root.dataset && app.root.dataset.postId) || "0");
  const storeKey = () => "sidsyn-nav-collapsed-" + postId();

  let collapsed = new Set();
  try {
    const raw = window.localStorage.getItem(storeKey());
    if (raw) collapsed = new Set(JSON.parse(raw));
  } catch (e) {
    collapsed = new Set();
  }
  const saveCollapsed = () => {
    try {
      window.localStorage.setItem(storeKey(), JSON.stringify(Array.from(collapsed)));
    } catch (e) {
      /* storage unavailable: collapse lasts for this session */
    }
  };

  const find = (id) => (id && typeof app.locate === "function" ? app.locate(app.state.root, id) : null);
  const es = (n) => (n && n.editor_settings && typeof n.editor_settings === "object" && !Array.isArray(n.editor_settings) ? n.editor_settings : {});
  const labelOf = (n) => {
    const own = String(es(n).label || "").trim();
    if (own) return own;
    const meta = typeof app.meta === "function" ? app.meta(n.type) || {} : {};
    return meta.title || n.type;
  };

  /** True when the node or one of its ancestors is locked. */
  app.navIsLocked = function navIsLocked(id) {
    let r = find(id);
    while (r) {
      if (es(r.node).locked) return true;
      r = r.parent ? find(r.parent.id) : null;
    }
    return false;
  };
  app.navIsHidden = function navIsHidden(id) {
    const r = find(id);
    return !!(r && es(r.node).hidden);
  };

  function setFlag(id, key, value, label) {
    const r = find(id);
    if (!r) return;
    if (typeof app.commit === "function") app.commit(label, id);
    const next = Object.assign({}, es(r.node));
    if (value === "" || value === false || value == null) delete next[key];
    else next[key] = value;
    r.node.editor_settings = next;
    app.dirty = true;
    applyCanvas();
    if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
  }

  const hasKids = (n) => {
    if (typeof app.isSlotParent === "function" && app.isSlotParent(n)) return true;
    return !!(n.children && n.children.length);
  };

  function rowHTML(n, depth) {
    const s = es(n);
    const kids = hasKids(n);
    const isCollapsed = kids && collapsed.has(n.id);
    const caret = kids
      ? `<button type="button" class="lb-nav-caret" data-nav-toggle="${esc(n.id)}" aria-expanded="${isCollapsed ? "false" : "true"}" title="${esc(isCollapsed ? t("Expand") : t("Collapse"))}">${ICON.caret}</button>`
      : '<span class="lb-nav-caret-space"></span>';
    const label = labelOf(n);
    const renamed = String(s.label || "").trim() !== "";
    const cls = ["lb-tree-row", app.selected === n.id ? "active" : "", s.hidden ? "lb-nav-is-hidden" : "", s.locked ? "lb-nav-is-locked" : ""].filter(Boolean).join(" ");
    return `<div class="${cls}" data-tree-id="${esc(n.id)}" style="padding-left:${4 + depth * 15}px">${caret}<span class="lb-tree-grip">⋮⋮</span><span class="lb-nav-label${renamed ? " is-renamed" : ""}" data-nav-label="${esc(n.id)}" title="${esc(t("Double-click to rename"))}">${esc(label)}</span><span class="lb-nav-actions"><button type="button" class="lb-nav-btn" data-nav-rename="${esc(n.id)}" title="${esc(t("Rename (F2)"))}">${ICON.pencil}</button><button type="button" class="lb-nav-btn${s.hidden ? " is-on" : ""}" data-nav-hide="${esc(n.id)}" aria-pressed="${s.hidden ? "true" : "false"}" title="${esc(s.hidden ? t("Show in editor") : t("Hide in editor (visitors still see it)"))}">${s.hidden ? ICON.eyeOff : ICON.eye}</button><button type="button" class="lb-nav-btn${s.locked ? " is-on" : ""}" data-nav-lock="${esc(n.id)}" aria-pressed="${s.locked ? "true" : "false"}" title="${esc(s.locked ? t("Unlock") : t("Lock"))}">${s.locked ? ICON.lock : ICON.unlock}</button></span></div>`;
  }

  app.treeHTML = function treeHTML(nodes, depth = 0) {
    return (nodes || [])
      .map((n) => {
        let kids = "";
        if (!(hasKids(n) && collapsed.has(n.id))) {
          if (typeof app.isSlotParent === "function" && app.isSlotParent(n)) {
            kids = (app.slotList(n) || [])
              .map((slot) => {
                const group = (n.children || []).filter((c) => (c.slot || "") === slot.id);
                return `<div class="lb-tree-slot-group"><div class="lb-tree-slot" style="padding-left:${8 + (depth + 1) * 15}px">${esc(slot.title || t("Panel"))}</div>${group.length ? treeHTML(group, depth + 2) : ""}</div>`;
              })
              .join("");
          } else if (n.children && n.children.length) {
            kids = treeHTML(n.children, depth + 1);
          }
        }
        return `<div class="lb-tree-item">${rowHTML(n, depth)}${kids}</div>`;
      })
      .join("");
  };

  const prevStructure = app.structureHTML;
  app.structureHTML = function structureHTML() {
    const body = typeof prevStructure === "function" ? prevStructure.apply(this, arguments) : app.treeHTML(app.state.root || []);
    const bar = `<div class="lb-nav-toolbar"><button type="button" class="lb-nav-tool" data-nav-all="expand">${esc(t("Expand all"))}</button><button type="button" class="lb-nav-tool" data-nav-all="collapse">${esc(t("Collapse all"))}</button></div>`;
    return bar + body;
  };

  function allIds(nodes, out) {
    (nodes || []).forEach((n) => {
      if (hasKids(n)) out.push(n.id);
      allIds(n.children, out);
    });
    return out;
  }

  function startRename(span) {
    const id = span.dataset.navLabel;
    const r = find(id);
    if (!r || span.querySelector("input")) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "lb-nav-rename";
    input.value = String(es(r.node).label || "");
    input.placeholder = labelOf(Object.assign({}, r.node, { editor_settings: {} }));
    input.setAttribute("aria-label", t("Name"));
    input.maxLength = 80;
    span.textContent = "";
    span.appendChild(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const value = input.value.trim().slice(0, 80);
      if (save && value !== String(es(r.node).label || "")) setFlag(id, "label", value, t("Renamed"));
      else if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
    };
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("blur", () => finish(true));
  }

  function bindNavigator() {
    const nav = app.root && app.root.querySelector(".lb-navigator");
    if (!nav || nav.__lbNavTools) return;
    nav.__lbNavTools = true;
    // One delegated listener in the capture phase runs before the row's own
    // click handler, so caret and button clicks never also select the row.
    nav.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest("[data-nav-toggle],[data-nav-hide],[data-nav-lock],[data-nav-all],[data-nav-rename]");
        if (!btn || !nav.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        if (btn.dataset.navRename) {
          const span = nav.querySelector('[data-nav-label="' + (window.CSS && CSS.escape ? CSS.escape(btn.dataset.navRename) : btn.dataset.navRename) + '"]');
          if (span) startRename(span);
        } else if (btn.dataset.navToggle) {
          const id = btn.dataset.navToggle;
          if (collapsed.has(id)) collapsed.delete(id);
          else collapsed.add(id);
          saveCollapsed();
          if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
        } else if (btn.dataset.navHide) {
          const id = btn.dataset.navHide;
          const on = !app.navIsHidden(id);
          setFlag(id, "hidden", on, on ? t("Hidden in editor") : t("Shown in editor"));
        } else if (btn.dataset.navLock) {
          const id = btn.dataset.navLock;
          const r = find(id);
          const on = !(r && es(r.node).locked);
          setFlag(id, "locked", on, on ? t("Locked") : t("Unlocked"));
        } else if (btn.dataset.navAll) {
          collapsed = btn.dataset.navAll === "collapse" ? new Set(allIds(app.state.root, allIds(app.state.header || [], allIds(app.state.footer || [], [])))) : new Set();
          saveCollapsed();
          if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
        }
      },
      true
    );
    nav.addEventListener("dblclick", (e) => {
      const span = e.target.closest("[data-nav-label]");
      if (!span) return;
      e.preventDefault();
      e.stopPropagation();
      startRename(span);
    });
    nav.addEventListener("keydown", (e) => {
      const row = e.target.closest && e.target.closest("[data-tree-id]");
      if (!row || e.target.tagName === "INPUT") return;
      if (e.key === "F2") {
        const span = row.querySelector("[data-nav-label]");
        if (span) {
          e.preventDefault();
          startRename(span);
        }
      }
    });
  }

  /** Hidden and locked units on the editor canvas. */
  function applyCanvas() {
    const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
    if (!fd || !fd.head) return;
    let style = fd.getElementById("lb-nav-state");
    if (!style) {
      style = fd.createElement("style");
      style.id = "lb-nav-state";
      fd.head.appendChild(style);
    }
    const hidden = [];
    const locked = [];
    const walk = (nodes) =>
      (nodes || []).forEach((n) => {
        const s = es(n);
        const sel = '.lb-node[data-id="' + (window.CSS && CSS.escape ? CSS.escape(String(n.id)) : String(n.id)) + '"]';
        if (s.hidden) hidden.push(sel);
        if (s.locked) locked.push(sel);
        walk(n.children);
      });
    walk(app.state.root);
    walk(app.state.header);
    walk(app.state.footer);
    let css = "";
    if (hidden.length) css += hidden.join(",") + "{display:none!important}";
    if (locked.length) {
      css += locked.join(",") + "{pointer-events:none!important;user-select:none!important}";
      css += locked.map((s) => s + ">.lb-node-toolbar").join(",") + "{display:none!important}";
    }
    if (style.textContent !== css) style.textContent = css;
  }
  app.navApplyCanvas = applyCanvas;

  /** Read-only settings panel for a locked unit. */
  function lockSettings() {
    if (!app.selected || !app.navIsLocked(app.selected)) return;
    const set = app.root && app.root.querySelector(".lb-settings");
    if (!set || set.querySelector(".lb-nav-locked-note")) return;
    const note = document.createElement("div");
    note.className = "lb-nav-locked-note";
    note.textContent = t("This unit is locked. Unlock it in the Navigator to edit it.");
    set.insertBefore(note, set.firstChild);
    set.querySelectorAll("input,select,textarea,button:not(.lb-nav-btn)").forEach((el) => {
      if (el.closest(".lb-selection-head")) return;
      el.disabled = true;
    });
    set.classList.add("lb-nav-settings-locked");
  }

  // Guards: anything that changes a locked unit is refused.
  const refuse = () => {
    const status = document.getElementById("lb-status");
    if (status) status.textContent = t("Locked: unlock it in the Navigator first");
    return false;
  };
  if (typeof app.remove === "function") {
    const remove = app.remove;
    app.remove = function removeUnlessLocked(id) {
      const target = id === undefined ? app.selected : id;
      if (target && app.navIsLocked(target)) return refuse();
      return remove.apply(this, arguments);
    };
  }
  if (typeof app.move === "function") {
    const move = app.move;
    app.move = function moveUnlessLocked(id, targetId) {
      if ((id && app.navIsLocked(id)) || (targetId && app.navIsLocked(targetId))) return refuse();
      return move.apply(this, arguments);
    };
  }

  const refresh = app.refreshRightPanel;
  if (typeof refresh === "function") {
    app.refreshRightPanel = function refreshRightPanelNav() {
      const out = refresh.apply(this, arguments);
      bindNavigator();
      lockSettings();
      applyCanvas();
      return out;
    };
  }
  const render = app.render;
  if (typeof render === "function") {
    app.render = function renderNav() {
      const out = render.apply(this, arguments);
      bindNavigator();
      lockSettings();
      applyCanvas();
      return out;
    };
  }
  const paint = app.lbPaintCanvas;
  if (typeof paint === "function") {
    app.lbPaintCanvas = function lbPaintCanvasNav() {
      const ok = paint.apply(this, arguments);
      applyCanvas();
      return ok;
    };
  }
  // Undo/redo replace app.state: re-apply after any history move.
  ["undo", "redo"].forEach((name) => {
    if (typeof app[name] !== "function") return;
    const fn = app[name];
    app[name] = function navHistory() {
      const out = fn.apply(this, arguments);
      applyCanvas();
      return out;
    };
  });
}

export { installNavigatorTools };
