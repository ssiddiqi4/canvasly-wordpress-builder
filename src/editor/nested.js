import { app } from "./app.js";
function installNested() {
  app.nestedActive = app.nestedActive || {};
  const SLOT_TYPES = ["nested_carousel", "nested_tabs", "nested_accordion", "nested_toggle"];
  app.isSlotParent = function isSlotParent(n) {
    if (!n) return false;
    if (SLOT_TYPES.indexOf(n.type) >= 0) return true;
    return !!(app.meta(n.type).slots || app.meta(n.type).slot_source);
  };
  app.slotList = function slotList(n) {
    if (!n) return [];
    const key =
      n.type === "nested_carousel"
        ? "slides"
        : app.meta(n.type).slot_source || (String(n.type).indexOf("tab") >= 0 ? "tabs" : "items");
    const raw = n.settings && n.settings[key];
    const items = Array.isArray(raw) ? raw : [];
    return items.map((it, i) => ({
      id: String((it && it._id) || "slot" + i),
      title: String((it && it.title) || ""),
    }));
  };
  app.activeSlot = function activeSlot(n) {
    const slots = app.slotList(n);
    if (!slots.length) return "";
    const stored = app.nestedActive[n.id];
    if (stored === false) return "";
    if (stored && slots.some((s) => s.id === stored)) return stored;
    if (n.type === "nested_tabs") {
      const i = Math.max(0, Math.min(slots.length - 1, parseInt(n.settings && n.settings.active, 10) || 0));
      return slots[i].id;
    }
    if (n.type === "nested_accordion") {
      const settings = n.settings || {};
      if (settings.first_open === false || settings.first_open === 0) return "";
    }
    return slots[0].id;
  };
  app.assignSlot = function assignSlot(child, parent, slotId) {
    if (!child) return child;
    if (!parent || !app.isSlotParent(parent)) {
      if (child.slot) delete child.slot;
      return child;
    }
    const slots = app.slotList(parent);
    const id = slotId || app.activeSlot(parent) || (slots[0] && slots[0].id) || "";
    if (id) child.slot = id;
    else if (child.slot) delete child.slot;
    return child;
  };
  app.syncSlots = function syncSlots(n) {
    if (!app.isSlotParent(n)) {
      (n.children || []).forEach((c) => app.syncSlots(c));
      return;
    }
    const ids = app.slotList(n).map((s) => s.id);
    const fallback = ids[0] || "";
    (n.children || []).forEach((c) => {
      if (!c.slot || ids.indexOf(c.slot) < 0) c.slot = fallback;
      app.syncSlots(c);
    });
  };
  function chevron(open) {
    return open
      ? '<svg class="lb-fa-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>'
      : '<svg class="lb-fa-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';
  }
  function plusMinus(open) {
    return open
      ? '<svg class="lb-fa-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 11h14v2H5z"/></svg>'
      : '<svg class="lb-fa-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
  }
  function styleAttr(map) {
    const parts = [];
    Object.keys(map).forEach((k) => {
      const v = map[k];
      if (v === "" || v == null) return;
      parts.push(k + ":" + v);
    });
    return parts.length ? ' style="' + app.esc(parts.join(";")) + '"' : "";
  }
  function unit(v) {
    if (v && typeof v === "object") v = v.desktop ?? v[app.device] ?? "";
    if (v === "" || v == null) return "";
    return isNaN(v) ? String(v) : v + "px";
  }
  function kidsInSlot(n, slotId) {
    return (n.children || []).filter((c) => (c.slot || "") === slotId);
  }
  function dropZone(n, slot) {
    const label = slot.title || app.t("Panel");
    return `<div class="lb-insert-zone lb-slot-drop" draggable="false" data-lb-slot-drop="${app.esc(n.id)}" data-slot="${app.esc(slot.id)}">${app.esc(app.t("Drop into %s", label))}</div>`;
  }
  function readDragPayload(e) {
    const cached = typeof window.__lbDragPayload === "string" ? window.__lbDragPayload : "";
    if (/^unit:|^node:/.test(cached)) return cached;
    try {
      const v = (e && e.dataTransfer && e.dataTransfer.getData("text/plain")) || "";
      if (/^unit:|^node:/.test(v)) return v;
    } catch (err) {}
    return "";
  }
  function dragMightLand(e) {
    if (readDragPayload(e)) return true;
    const types = e && e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) if (types[i] === "text/plain") return true;
    return false;
  }
  function pointed(e) {
    const direct = e && e.target && e.target.nodeType === 1 ? e.target : e && e.target && e.target.parentElement;
    if (direct && direct.closest && direct.closest("[data-lb-slot-drop]")) return direct;
    const doc = (e && e.view && e.view.document) || (direct && direct.ownerDocument);
    if (doc && doc.elementFromPoint && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      const under = doc.elementFromPoint(e.clientX, e.clientY);
      if (under) return under;
    }
    return direct;
  }
  function slotHit(target) {
    const el = target && target.nodeType === 1 ? target : target && target.parentElement;
    if (!el || !el.closest) return null;
    if (
      el.closest(
        ".lb-node-toolbar,.cp-slides-prev,.cp-slides-next,.cp-ncarousel-dots,.cp-ncarousel-nav,.lb21-hover-tab,[data-lb-loop-drop]",
      )
    )
      return null;
    let zone = el.closest("[data-lb-slot-drop]");
    if (!zone) {
      const host = el.closest(
        ".lb-node-nested_carousel,.lb-node-nested_tabs,.lb-node-nested_accordion,.lb-node-nested_toggle",
      );
      zone =
        host &&
        host.querySelector(
          '.cp-ncarousel-slide[aria-hidden="false"] [data-lb-slot-drop], .cp-ncarousel-slide[aria-hidden="false"], .lb-slot-panel:not([hidden]) [data-lb-slot-drop], [data-lb-slot-drop]',
        );
    }
    if (!zone || !zone.dataset || !zone.dataset.lbSlotDrop) return null;
    return {
      kind: "slot",
      parentId: zone.dataset.lbSlotDrop,
      slot: zone.dataset.slot || zone.dataset.lbSlot || "",
      el: zone,
    };
  }
  app.dropLanding = function dropLanding(e, hostNode) {
    const direct = e && e.target && e.target.nodeType === 1 ? e.target : null;
    const doc = (direct && direct.ownerDocument) || (hostNode && hostNode.ownerDocument);
    let el = direct;
    if (doc && doc.elementFromPoint && e && Number.isFinite(e.clientX)) {
      const under = doc.elementFromPoint(e.clientX, e.clientY);
      if (under) el = under;
    }
    const slot = slotHit(el);
    if (slot && slot.parentId) return slot;
    const loop = el && el.closest && el.closest("[data-lb-loop-drop]");
    if (loop && loop.dataset.lbLoopDrop) return { kind: "loop", parentId: loop.dataset.lbLoopDrop, slot: "", el: loop };
    if (hostNode && hostNode.dataset && hostNode.dataset.type === "collection_loop")
      return { kind: "loop", parentId: hostNode.dataset.id, slot: "", el: hostNode };
    return null;
  };
  function clearSlotOver(fd) {
    if (!fd) return;
    fd.querySelectorAll(".lb-slot-drop.is-over,.lb-slot-panel.is-over").forEach((el) => el.classList.remove("is-over"));
  }
  function placeDrag(payload, hit) {
    if (!hit || !hit.parentId) return false;
    if (hit.slot) app.nestedActive[hit.parentId] = hit.slot;
    if (payload.startsWith("unit:")) {
      app.add(payload.slice(5), hit.parentId, null, hit.slot);
      return true;
    }
    if (payload.startsWith("node:")) {
      app.moveExisting(payload.slice(5), hit.parentId, "inside", hit.slot);
      return true;
    }
    return false;
  }
  function insertionForSelection() {
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r || !app.isSlotParent) return null;
    if (app.isSlotParent(r.node)) {
      return { parentId: r.node.id, slot: app.activeSlot(r.node) || "", index: null };
    }
    if (app.acceptsInside(r.node)) return null;
    if (r.parent && app.isSlotParent(r.parent)) {
      return { parentId: r.parent.id, slot: r.node.slot || app.activeSlot(r.parent) || "", index: r.index + 1 };
    }
    return null;
  }
  function tagOf(v, fallback) {
    const t3 = String(v || fallback || "div").toLowerCase();
    return ["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].includes(t3) ? t3 : fallback || "div";
  }
  function nestedTabsHTML(n) {
    const s = n.settings || {};
    const slots = app.slotList(n);
    if (!slots.length) return '<div class="lb-embed-placeholder">' + app.t("Add tabs") + "</div>";
    const activeId = app.activeSlot(n);
    const vertical = s.orientation === "vertical";
    const align = ["start", "center", "end", "stretch"].includes(s.tabs_align) ? s.tabs_align : "start";
    const tag = tagOf(s.title_tag, "div");
    const nav = slots
      .map((slot) => {
        const on = slot.id === activeId;
        const title = slot.title || app.t("Panel");
        return `<${tag} class="lb-tab-button${on ? " is-active" : ""}" role="tab" tabindex="${on ? "0" : "-1"}" data-lb-nested-tab="${app.esc(slot.id)}" data-lb-host="${app.esc(n.id)}" aria-selected="${on ? "true" : "false"}">${app.esc(title)}</${tag}>`;
      })
      .join("");
    const panels = slots
      .map((slot) => {
        const on = slot.id === activeId;
        const inner = kidsInSlot(n, slot.id).map(app.nodeHTML).join("");
        return `<div class="lb-tab-panel lb-slot-panel" role="tabpanel" data-lb-slot="${app.esc(slot.id)}" data-lb-host="${app.esc(n.id)}"${on ? "" : " hidden"}>${inner}${dropZone(n, slot)}</div>`;
      })
      .join("");
    return `<div class="lb-tabs-widget lb-nested-tabs lb-tabs-${vertical ? "vertical" : "horizontal"} lb-tabs-align-${align}" data-active="${slots.findIndex((x) => x.id === activeId)}"${styleAttr(
      {
        "--lb-tabs-nav-width": vertical ? s.nav_width || "25%" : "",
        "--lb-tab-color": s.tab_color || "",
        "--lb-tab-active-color": s.tab_active_color || "",
        "--lb-tab-bg": s.tab_background || "",
        "--lb-tab-active-bg": s.tab_active_background || "",
        "--lb-tab-content-color": s.content_color || "",
        "--lb-tab-content-bg": s.content_background || "",
        "--lb-tab-border-color": s.border_color || "",
        "--lb-tab-border-width": unit(s.border_width),
        "--lb-tab-padding": s.tab_padding || "",
        "--lb-tab-content-padding": s.content_padding || "",
      },
    )}><div class="lb-tabs-nav" role="tablist">${nav}</div><div class="lb-tabs-panels">${panels}</div></div>`;
  }
  function nestedCollapseHTML(n) {
    const s = n.settings || {};
    const single = n.type !== "nested_toggle";
    const slots = app.slotList(n);
    const tag = tagOf(s.title_tag, "div");
    const pos = s.icon_position === "left" ? "left" : "right";
    const activeId = app.activeSlot(n);
    const iconOpen = single ? chevron(true) : plusMinus(true);
    const iconClosed = single ? chevron(false) : plusMinus(false);
    const icon2 = `<span class="lb-collapse-icon" aria-hidden="true"><span class="lb-collapse-icon-closed">${iconClosed}</span><span class="lb-collapse-icon-opened">${iconOpen}</span></span>`;
    const items = slots
      .map((slot, i) => {
        const key = n.id + ":" + slot.id;
        const stored = app.nestedActive[key];
        const open = single
          ? slot.id === activeId
          : Object.prototype.hasOwnProperty.call(app.nestedActive, key)
            ? stored === true
            : i === 0 && s.first_open !== false && s.first_open !== 0;
        const title = slot.title || app.t("Item %s", i + 1);
        const inner = kidsInSlot(n, slot.id).map(app.nodeHTML).join("");
        return `<div class="lb-collapse-item${open ? " is-open" : ""}" data-lb-slot="${app.esc(slot.id)}"><${tag} class="lb-collapse-title" role="button" tabindex="0" aria-expanded="${open ? "true" : "false"}" data-lb-nested-acc="${app.esc(n.id)}" data-slot="${app.esc(slot.id)}">${pos === "left" ? icon2 : ""}<span class="lb-collapse-heading">${app.esc(title)}</span>${pos === "right" ? icon2 : ""}</${tag}><div class="lb-collapse-content lb-slot-panel" data-lb-slot="${app.esc(slot.id)}" data-lb-host="${app.esc(n.id)}"${open ? "" : " hidden"}>${inner}${dropZone(n, slot)}</div></div>`;
      })
      .join("");
    return `<div class="${single ? "lb-accordion lb-nested-accordion" : "lb-toggle lb-nested-toggle"} lb-collapse lb-collapse-icon-${pos}" data-lb-collapse="${single ? "single" : "multi"}"${styleAttr(
      {
        "--lb-acc-title-color": s.title_color || "",
        "--lb-acc-active-color": s.active_color || "",
        "--lb-acc-title-bg": s.title_background || "",
        "--lb-acc-content-color": s.content_color || "",
        "--lb-acc-content-bg": s.content_background || "",
        "--lb-acc-icon-color": s.icon_color || "",
        "--lb-acc-icon-active-color": s.icon_active_color || "",
        "--lb-acc-border-color": s.border_color || "",
        "--lb-acc-border-width": unit(s.border_width),
        "--lb-acc-title-padding": s.title_padding || "",
        "--lb-acc-content-padding": s.content_padding || "",
        "--lb-acc-icon-space": unit(s.icon_space),
        "--lb-acc-gap": unit(s.space_between),
      },
    )}>${items || '<div class="lb-embed-placeholder">' + app.t("Add items") + "</div>"}</div>`;
  }
  function intSetting(s, key, fallback, max) {
    let v = s && s[key];
    if (v && typeof v === "object" && !Array.isArray(v)) v = v[app.device] ?? v.desktop ?? v.size ?? fallback;
    if (v && typeof v === "object") v = v.size ?? fallback;
    const n = parseInt(v, 10);
    const out = Number.isFinite(n) && n > 0 ? n : fallback;
    return Math.max(1, Math.min(max, out));
  }
  function lengthSetting(v) {
    if (v && typeof v === "object") {
      const row = v[app.device] ?? v.desktop ?? v;
      if (row && typeof row === "object") {
        const size = row.size;
        const unit2 = row.unit || "px";
        if (size === "" || size == null) return "0px";
        return (isNaN(size) ? "0" : String(size)) + (/^(px|em|rem|%)$/.test(unit2) ? unit2 : "px");
      }
      v = row;
    }
    if (v === "" || v == null) return "0px";
    return isNaN(v) ? "0px" : v + "px";
  }
  function nestedCarouselHTML(n) {
    const s = n.settings || {};
    const slots = app.slotList(n);
    if (!slots.length) {
      return '<div class="cp-ncarousel"><p class="cp-live-note">' + app.esc(app.t("Add slides")) + "</p></div>";
    }
    const show = intSetting(s, "slides_to_show", 1, 10);
    const scroll = Math.min(show, intSetting(s, "slides_to_scroll", 1, 10));
    const navMode = ["arrows", "dots", "both", "none"].includes(s.navigation) ? s.navigation : "arrows";
    const dir = s.slide_direction === "rtl" ? "rtl" : "ltr";
    const speed = Math.max(0, parseInt(s.speed, 10) || 500);
    const activeId = app.activeSlot(n);
    let index = slots.findIndex((slot) => slot.id === activeId);
    if (index < 0) index = 0;
    const maxStart = Math.max(0, slots.length - show);
    index = Math.max(0, Math.min(maxStart, index));
    const pages = Math.max(1, Math.ceil(maxStart / scroll) + 1);
    const slides = slots
      .map((slot) => {
        const inner = kidsInSlot(n, slot.id).map(app.nodeHTML).join("");
        const label = slot.title || app.t("Slide");
        const hint = inner
          ? ""
          : `<div class="lb-slot-hint" data-lb-slot-drop="${app.esc(n.id)}" data-slot="${app.esc(slot.id)}">${app.esc(app.t("Drop into %s", label))}</div>`;
        return `<div class="cp-ncarousel-slide lb-slot-panel lb-slot-drop" draggable="false" data-lb-slot-drop="${app.esc(n.id)}" data-slot="${app.esc(slot.id)}" data-lb-slot="${app.esc(slot.id)}" data-lb-host="${app.esc(n.id)}" role="group" aria-label="${app.esc(label)}">${inner}${hint}</div>`;
      })
      .join("");
    const arrows =
      navMode === "arrows" || navMode === "both"
        ? `<button type="button" class="cp-slides-prev" tabindex="-1" data-lb-ncarousel="${app.esc(n.id)}" data-lb-ncarousel-dir="-1" aria-label="${app.esc(app.t("Previous slide"))}"><i class="cp-nav-chevron" aria-hidden="true"></i>${app.esc(app.t("Back"))}</button><button type="button" class="cp-slides-next" tabindex="-1" data-lb-ncarousel="${app.esc(n.id)}" data-lb-ncarousel-dir="1" aria-label="${app.esc(app.t("Next slide"))}">${app.esc(app.t("Forward"))}<i class="cp-nav-chevron" aria-hidden="true"></i></button>`
        : "";
    const dots =
      navMode === "dots" || navMode === "both"
        ? `<div class="cp-ncarousel-dots">${Array.from({ length: pages }, (_, i) => `<button type="button" class="cp-ncarousel-dot${i === Math.round(index / scroll) ? " is-active" : ""}" tabindex="-1" data-lb-ncarousel="${app.esc(n.id)}" data-lb-ncarousel-page="${i}" aria-label="${app.esc(app.t("Go to slide %s", i + 1))}"></button>`).join("")}</div>`
        : "";
    const nav = arrows || dots ? `<div class="cp-ncarousel-nav">${arrows}${dots}</div>` : "";
    const gap = lengthSetting(s.slide_gap);
    const offset = lengthSetting(s.offset);
    const basis =
      show <= 1
        ? offset === "0px"
          ? "100%"
          : "calc(100% - " + offset + ")"
        : "calc((100% - " + offset + " - " + (show - 1) + " * " + gap + ") / " + show + ")";
    const style = `--cp-show:${show};--cp-slide:${basis};--cp-gap:${gap};--cp-offset:${offset};--cp-speed:${speed}ms`;
    const equal = s.equal_height === false || s.equal_height === 0 ? "" : " cp-ncarousel-equal";
    return `<div class="cp-ncarousel${equal}" data-cp-nested data-lb-host="${app.esc(n.id)}" data-show="${show}" data-scroll="${scroll}" data-index="${index}" dir="${dir}" style="${style}"><div class="cp-ncarousel-viewport"><div class="cp-ncarousel-track">${slides}</div></div>${nav}</div>`;
  }
  function holdScroll(doc, run) {
    const scroller = doc && (doc.scrollingElement || doc.documentElement);
    const top = scroller ? scroller.scrollTop : 0;
    const left = scroller ? scroller.scrollLeft : 0;
    const parent = doc && doc.defaultView && doc.defaultView.parent;
    const parentTop = parent && parent !== doc.defaultView ? parent.scrollY : null;
    const parentLeft = parent && parent !== doc.defaultView ? parent.scrollX : null;
    run();
    if (scroller) {
      scroller.scrollTop = top;
      scroller.scrollLeft = left;
    }
    if (parent && parentTop != null) parent.scrollTo(parentLeft || 0, parentTop);
  }
  function applyEditorCarousel(root) {
    if (!root) return 0;
    const track = root.querySelector(":scope > .cp-ncarousel-viewport > .cp-ncarousel-track");
    const slides = track ? Array.from(track.querySelectorAll(":scope > .cp-ncarousel-slide")) : [];
    const show = Math.max(1, parseInt(root.dataset.show, 10) || 1);
    const scroll = Math.max(1, Math.min(show, parseInt(root.dataset.scroll, 10) || 1));
    const maxStart = Math.max(0, slides.length - show);
    let index = parseInt(root.dataset.index, 10) || 0;
    if (index > maxStart) index = 0;
    if (index < 0) index = maxStart;
    const rtl = root.getAttribute("dir") === "rtl";
    const gap = track
      ? parseFloat(getComputedStyle(track).columnGap) || parseFloat(getComputedStyle(track).gap) || 0
      : 0;
    const slideW = slides[0] ? slides[0].getBoundingClientRect().width : 0;
    const x = index * (slideW + (Number.isFinite(gap) ? gap : 0));
    if (track) track.style.transform = "translate3d(" + (rtl ? x : -x) + "px,0,0)";
    slides.forEach((slide, i) => {
      const on = i >= index && i < index + show;
      slide.setAttribute("aria-hidden", on ? "false" : "true");
    });
    const page = Math.round(index / scroll);
    root.querySelectorAll(":scope .cp-ncarousel-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === page);
    });
    root.dataset.index = String(index);
    return index;
  }
  const prevBody = app.bodyHTML;
  app.bodyHTML = function bodyHTML(n) {
    if (n.type === "nested_tabs") return nestedTabsHTML(n);
    if (n.type === "nested_accordion" || n.type === "nested_toggle") return nestedCollapseHTML(n);
    if (n.type === "nested_carousel") return nestedCarouselHTML(n);
    return prevBody(n);
  };
  app.treeHTML = function treeHTML(nodes, depth = 0) {
    return (nodes || [])
      .map((n) => {
        let kids = "";
        if (app.isSlotParent(n)) {
          kids = app
            .slotList(n)
            .map((slot) => {
              const group = kidsInSlot(n, slot.id);
              return `<div class="lb-tree-slot-group"><div class="lb-tree-slot" style="padding-left:${8 + (depth + 1) * 15}px">${app.esc(slot.title || app.t("Panel"))}</div>${group.length ? treeHTML(group, depth + 2) : ""}</div>`;
            })
            .join("");
        } else if (n.children && n.children.length) {
          kids = treeHTML(n.children, depth + 1);
        }
        return `<div class="lb-tree-item"><div class="lb-tree-row ${app.selected === n.id ? "active" : ""}" data-tree-id="${app.esc(n.id)}" style="padding-left:${8 + depth * 15}px"><span class="lb-tree-grip">\u22EE\u22EE</span><span>${app.esc(app.meta(n.type).title || n.type)}</span></div>${kids}</div>`;
      })
      .join("");
  };
  app.convertToNested = function convertToNested(id) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    const map = { tabs: "nested_tabs", accordion: "nested_accordion", toggle: "nested_toggle" };
    const next = map[r.node.type];
    if (!next) return;
    app.commit();
    const src = r.node;
    const key = next === "nested_tabs" ? "tabs" : "items";
    const settings = JSON.parse(JSON.stringify(src.settings || {}));
    let items = Array.isArray(settings[key]) ? settings[key] : [];
    if (!items.length && (settings.title || settings.text)) {
      items = [{ _id: app.eid(), title: String(settings.title || "Item"), content: String(settings.text || "") }];
    }
    const children = [];
    items = items.map((item, i) => {
      const copy = Object.assign({}, item);
      const slot = String(copy._id || app.eid());
      copy._id = slot;
      const content = copy.content != null ? String(copy.content) : "";
      delete copy.content;
      if (content.trim()) {
        const text = app.makeNode("text") || {
          id: app.eid(),
          type: "text",
          settings: app.defaults("text") || {},
          styles: { base: {} },
          interactions: [],
          editor_settings: {},
        };
        text.settings = Object.assign({}, text.settings || {}, { text: content });
        text.slot = slot;
        children.push(text);
      }
      if (!copy.title) copy.title = app.t("Item %s", i + 1);
      return copy;
    });
    const defaults = app.defaults(next) || {};
    src.type = next;
    src.settings = Object.assign({}, defaults, settings, { [key]: items.length ? items : defaults[key] });
    src.children = children;
    if (src.settings.content) delete src.settings.content;
    app.selected = src.id;
    app.nestedActive[src.id] = items[0] && items[0]._id;
    app.render();
  };
  function bindSlotDrops(fd) {
    if (!fd.__lbSlotDrop) {
      fd.__lbSlotDrop = true;
      fd.addEventListener(
        "dragover",
        (e) => {
          if (!dragMightLand(e)) return;
          const hit = slotHit(pointed(e));
          if (!hit) return;
          e.preventDefault();
          clearSlotOver(fd);
          hit.el.classList.add("is-over");
          const payload = readDragPayload(e);
          if (e.dataTransfer) e.dataTransfer.dropEffect = payload.startsWith("node:") ? "move" : "copy";
        },
        true,
      );
      fd.addEventListener(
        "drop",
        (e) => {
          const hit = slotHit(pointed(e));
          if (!hit) return;
          const payload = readDragPayload(e);
          if (!/^unit:|^node:/.test(payload)) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          clearSlotOver(fd);
          placeDrag(payload, hit);
        },
        true,
      );
      fd.addEventListener("dragend", () => clearSlotOver(fd), true);
      fd.addEventListener(
        "mousedown",
        (e) => {
          const btn = e.target && e.target.closest && e.target.closest("[data-lb-ncarousel]");
          if (!btn) return;
          e.preventDefault();
        },
        true,
      );
      fd.addEventListener(
        "click",
        (e) => {
          const btn = e.target && e.target.closest && e.target.closest("[data-lb-ncarousel]");
          if (!btn || !fd.contains(btn)) return;
          e.preventDefault();
          e.stopPropagation();
          const hostId = btn.dataset.lbNcarousel;
          const root = btn.closest("[data-cp-nested]");
          if (!root || root.dataset.lbHost !== hostId) return;
          const loc = app.locate(app.state.root, hostId);
          holdScroll(fd, () => {
            const show = Math.max(1, parseInt(root.dataset.show, 10) || 1);
            const scroll = Math.max(1, Math.min(show, parseInt(root.dataset.scroll, 10) || 1));
            const track = root.querySelector(":scope > .cp-ncarousel-viewport > .cp-ncarousel-track");
            const count = track ? track.querySelectorAll(":scope > .cp-ncarousel-slide").length : 0;
            const maxStart = Math.max(0, count - show);
            let index = parseInt(root.dataset.index, 10) || 0;
            if (btn.dataset.lbNcarouselPage != null && btn.dataset.lbNcarouselPage !== "") {
              index = (parseInt(btn.dataset.lbNcarouselPage, 10) || 0) * scroll;
            } else {
              const dir = parseInt(btn.dataset.lbNcarouselDir, 10) || 1;
              index += dir * scroll;
              if (index > maxStart) index = 0;
              if (index < 0) index = maxStart;
            }
            root.dataset.index = String(Math.max(0, Math.min(maxStart, index)));
            const at = applyEditorCarousel(root);
            const slide = track && track.querySelectorAll(":scope > .cp-ncarousel-slide")[at];
            if (slide && slide.dataset.lbSlot) app.nestedActive[hostId] = slide.dataset.lbSlot;
            if (loc)
              app.nestedActive[hostId] =
                app.nestedActive[hostId] || (app.slotList(loc.node)[at] && app.slotList(loc.node)[at].id);
            if (loc) app.selectNode(hostId);
          });
        },
        true,
      );
    }
    fd.querySelectorAll("[data-cp-nested]").forEach((root) => applyEditorCarousel(root));
    if (fd.defaultView) {
      fd.defaultView.requestAnimationFrame(() => {
        fd.querySelectorAll("[data-cp-nested]").forEach((root) => applyEditorCarousel(root));
      });
    }
    fd.querySelectorAll("[data-lb-ncarousel]").forEach((btn) => {
      if (btn.dataset.lbNestedBound === "1") return;
      btn.dataset.lbNestedBound = "1";
      btn.addEventListener("mousedown", (e) => e.preventDefault());
    });
    fd.querySelectorAll("[data-lb-nested-tab]").forEach((btn) => {
      if (btn.dataset.lbNestedBound === "1") return;
      btn.dataset.lbNestedBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const hostId = btn.dataset.lbHost;
        const slot = btn.dataset.lbNestedTab;
        app.nestedActive[hostId] = slot;
        const host = btn.closest(".lb-node");
        if (!host) return;
        host.querySelectorAll(":scope [data-lb-nested-tab]").forEach((b) => {
          if (b.dataset.lbHost !== hostId) return;
          const on = b.dataset.lbNestedTab === slot;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
        host.querySelectorAll(':scope .lb-slot-panel[data-lb-host="' + CSS.escape(hostId) + '"]').forEach((p) => {
          p.hidden = p.dataset.lbSlot !== slot;
        });
        app.selectNode(hostId);
      });
    });
    fd.querySelectorAll("[data-lb-nested-acc]").forEach((title) => {
      if (title.dataset.lbNestedBound === "1") return;
      title.dataset.lbNestedBound = "1";
      title.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const hostId = title.dataset.lbNestedAcc;
        const slot = title.dataset.slot;
        const item = title.closest(".lb-collapse-item");
        const root = title.closest("[data-lb-collapse]");
        const single = root && root.dataset.lbCollapse === "single";
        const loc = app.locate(app.state.root, hostId);
        if (single) {
          const already = !!(item && item.classList.contains("is-open"));
          app.nestedActive[hostId] = already ? false : slot;
          if (root) {
            root.querySelectorAll(":scope > .lb-collapse-item").forEach((el) => {
              const on = !already && el === item;
              el.classList.toggle("is-open", on);
              const t3 = el.querySelector(":scope > .lb-collapse-title");
              const c = el.querySelector(":scope > .lb-collapse-content");
              if (t3) t3.setAttribute("aria-expanded", on ? "true" : "false");
              if (c) c.hidden = !on;
            });
          }
        } else {
          const open = !(item && item.classList.contains("is-open"));
          app.nestedActive[hostId + ":" + slot] = open;
          if (item) {
            item.classList.toggle("is-open", open);
            title.setAttribute("aria-expanded", open ? "true" : "false");
            const c = item.querySelector(":scope > .lb-collapse-content");
            if (c) c.hidden = !open;
          }
        }
        if (loc) app.selectNode(hostId);
      });
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          title.click();
        }
      });
    });
  }
  if (!window.__lbSlotInsert) {
    window.__lbSlotInsert = true;
    document.addEventListener(
      "dblclick",
      (e) => {
        const card = e.target && e.target.closest && e.target.closest(".lb-unit-card");
        if (!card || (app.proUnitLocked && app.proUnitLocked(card.dataset.type))) return;
        const where = insertionForSelection();
        if (!where) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        app.add(card.dataset.type, where.parentId, where.index, where.slot);
      },
      true,
    );
  }
  const prevPatch = app.patchCanvasNode;
  if (typeof prevPatch === "function") {
    app.patchCanvasNode = function patchCanvasNode(id) {
      const ok = prevPatch.apply(this, arguments);
      const fd = app.frameDoc();
      if (ok && fd) {
        fd.querySelectorAll("[data-cp-nested]").forEach((root) => applyEditorCarousel(root));
        if (fd.defaultView) {
          fd.defaultView.requestAnimationFrame(() => {
            fd.querySelectorAll("[data-cp-nested]").forEach((root) => applyEditorCarousel(root));
          });
        }
      }
      return ok;
    };
  }
  const prevBindFrame = app.bindFrame;
  app.bindFrame = function bindFrame() {
    prevBindFrame();
    const fd = app.frameDoc();
    if (!fd) return;
    bindSlotDrops(fd);
  };
  const prevRender = app.render;
  app.render = function render() {
    (app.state.root || []).forEach((n) => app.syncSlots(n));
    return prevRender();
  };
  const prevFrameHTML = app.frameHTML;
  app.frameHTML = function frameHTML() {
    let html = prevFrameHTML();
    const extra =
      ".lb-insert-zone.lb-slot-drop{min-height:44px;margin-top:8px}.lb-slot-drop.is-over,.lb-slot-panel.is-over{border-color:#2f73d9!important;background:#eef3fa;color:#2463b4}.lb-nested-tabs .lb-tab-button,.lb-nested-accordion .lb-collapse-title,.lb-nested-toggle .lb-collapse-title{cursor:pointer}.lb-node.lb-node-nested_carousel{display:flex!important;flex-direction:column!important;align-items:stretch!important;width:100%;min-width:0;min-height:220px;box-sizing:border-box}.lb-node.lb-node-nested_carousel>.cp-ncarousel{position:relative;display:flex!important;flex-direction:column!important;flex:1 1 auto!important;align-self:stretch!important;width:100%!important;max-width:100%!important;min-width:0!important;min-height:200px!important;height:auto!important;box-sizing:border-box!important;background:#fff;color:#1d2327}.lb-node-nested_carousel .cp-ncarousel-viewport{overflow:hidden;width:100%;flex:1 1 auto;min-height:180px}.lb-node-nested_carousel .cp-ncarousel-track{display:flex;align-items:stretch;width:100%;min-height:180px;height:100%;gap:var(--cp-gap,0px);transition:transform var(--cp-speed,500ms) ease}.lb-node-nested_carousel .cp-ncarousel-slide{flex:0 0 var(--cp-slide,100%)!important;width:var(--cp-slide,100%)!important;max-width:var(--cp-slide,100%)!important;min-width:0!important;min-height:180px!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important;gap:8px;padding:12px;border:1px dashed #c5ccd4;background:#fafbfc;position:relative}.lb-node-nested_carousel .cp-ncarousel-slide>.lb-node{width:100%;max-width:100%;min-width:0;flex:0 0 auto}.lb-node-nested_carousel .cp-ncarousel-equal .cp-ncarousel-slide>.lb-node{flex:1 1 auto}.lb-node-nested_carousel .lb-slot-hint{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:140px;margin:0;border:1px dashed #c5ccd4;border-radius:6px;background:#fff;color:#8b939c;font:500 13px/1.4 system-ui,sans-serif;text-align:center;pointer-events:auto;position:relative;z-index:2}.lb-node-nested_carousel .cp-ncarousel-nav{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;position:relative;z-index:6}.lb-node-nested_carousel .cp-slides-prev,.lb-node-nested_carousel .cp-slides-next{display:inline-flex!important;align-items:center;gap:5px;position:static!important;top:auto!important;inset:auto!important;transform:none!important;width:auto!important;height:auto!important;min-width:0;min-height:0;padding:2px 7px;border:1px solid #14181c!important;border-radius:5px!important;background:linear-gradient(180deg,#6a727a 0%,#3a424a 42%,#1c2228 100%)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 3px rgba(0,0,0,.55),0 2px 0 #0c0f12,0 3px 5px rgba(0,0,0,.35)!important;font:700 10px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;appearance:none}.lb-node-nested_carousel .cp-nav-chevron{display:block;box-sizing:border-box;width:9px;height:9px;border-style:solid;border-color:#fff;border-width:0 2.5px 2.5px 0;filter:drop-shadow(0 1px 0 rgba(0,0,0,.65)) drop-shadow(0 -1px 0 rgba(255,255,255,.45));flex:0 0 auto}.lb-node-nested_carousel .cp-slides-prev .cp-nav-chevron{transform:translateX(1px) rotate(135deg)}.lb-node-nested_carousel .cp-slides-next .cp-nav-chevron{transform:translateX(-1px) rotate(-45deg)}.lb-node-nested_carousel .cp-slides-prev:hover,.lb-node-nested_carousel .cp-slides-next:hover{background:linear-gradient(180deg,#7c858e 0%,#4a545c 42%,#262d34 100%)!important}.lb-node-nested_carousel .cp-slides-prev:active,.lb-node-nested_carousel .cp-slides-next:active{transform:translateY(1px)!important;box-shadow:inset 0 2px 4px rgba(0,0,0,.55),0 1px 0 #0c0f12!important}.lb-node-nested_carousel .cp-ncarousel-dots{display:flex;justify-content:center;gap:6px;margin:0}.lb-node-nested_carousel .cp-ncarousel-dot{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:#c3c4c7;cursor:pointer}.lb-node-nested_carousel .cp-ncarousel-dot.is-active{background:#1d2327}";
    if (html.includes("</style></head>")) html = html.replace("</style></head>", extra + "</style></head>");
    return html;
  };
}

export { installNested };
