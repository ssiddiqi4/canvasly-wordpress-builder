import { app } from "./app.js";
function installControls() {
  app.resp = function resp(v) {
    return app.respVal ? app.respVal(v) : v && typeof v === "object" ? (v[app.device] ?? v.desktop ?? "") : (v ?? "");
  };
  app.lbCtrlDef = function lbCtrlDef(t3) {
    return t3 && typeof t3 === "object" && !Array.isArray(t3) ? t3 : { type: String(t3 || "text") };
  };
  app.lbCtrlType = function lbCtrlType(t3) {
    return String(app.lbCtrlDef(t3).type || "text");
  };
  app.lbCtrlOpts = function lbCtrlOpts(def, k) {
    const o = def && def.options;
    if (Array.isArray(o)) return o;
    if (o && typeof o === "object") return Object.keys(o);
    return app.optionsFor(k);
  };
  app.lbCtrlOptLabel = function lbCtrlOptLabel(def, k, o) {
    const opts = def && def.options;
    if (opts && !Array.isArray(opts) && opts[o] != null) return String(opts[o]);
    return app.optionLabel(k, o);
  };
  app.lbConditionMet = function lbConditionMet(cond, s) {
    if (!cond || typeof cond !== "object" || !Object.keys(cond).length) return true;
    s = s || {};
    return Object.keys(cond).every((k) => {
      const neg = k.slice(-1) === "!";
      const key = neg ? k.slice(0, -1) : k;
      let have = s[key];
      if (have && typeof have === "object" && !Array.isArray(have)) have = have.desktop ?? Object.values(have)[0];
      if (typeof have === "boolean") have = have ? "1" : "";
      have = have == null ? "" : String(have);
      const want = Array.isArray(cond[k]) ? cond[k] : [cond[k]];
      const hit = want.some((w) => {
        let x = w;
        if (typeof x === "boolean") x = x ? "1" : "";
        return String(x) === have;
      });
      return neg ? !hit : hit;
    });
  };
  app.LB_ATT_PLACEHOLDER =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23e5e8ec"/></svg>';
  app.galleryGroupsOf = function galleryGroupsOf(s) {
    s = s || {};
    if ((s.mode || "single") === "multiple" && Array.isArray(s.collections) && s.collections.length) {
      return s.collections.map((c, i) => ({
        label: String((c && c.label) || "").trim() || "Gallery " + (i + 1),
        ids: String((c && c.ids) || "")
          .split(/[,\s]+/)
          .filter(Boolean),
      }));
    }
    return [
      {
        label: "",
        ids: String(s.ids || "")
          .split(/[,\s]+/)
          .filter(Boolean),
      },
    ];
  };
  app.galleryIdsOf = function galleryIdsOf(s) {
    return app.galleryGroupsOf(s).flatMap((g) => g.ids);
  };
  app.galleryColsOf = function galleryColsOf(s) {
    const n = parseInt(app.resp((s || {}).columns), 10);
    return Math.max(1, Math.min(10, n > 0 ? n : 4));
  };
  app.galleryLayoutOf = function galleryLayoutOf(s) {
    const v = String((s && s.gallery_layout) || "justified");
    return v === "grid" || v === "masonry" || v === "justified" ? v : "justified";
  };
  app.galleryRowHOf = function galleryRowHOf(s) {
    return Math.max(80, Math.min(800, parseInt(app.resp((s || {}).row_height), 10) || 220));
  };
  app.galleryRatioOf = function galleryRatioOf(s) {
    return (
      { "1:1": "1 / 1", "3:2": "3 / 2", "4:3": "4 / 3", "16:9": "16 / 9", "9:16": "9 / 16", auto: "auto" }[
        String((s || {}).image_ratio || "1:1")
      ] || "1 / 1"
    );
  };
  app.galleryUrlOf = function galleryUrlOf(s, id) {
    s = s || {};
    const map = s.media_urls && typeof s.media_urls === "object" ? s.media_urls : {};
    if (map[id] || map[String(id)]) return map[id] || map[String(id)];
    const hit = ((typeof window !== "undefined" && window.CanvaslyLite1228 && window.CanvaslyLite1228.attCache) || {})[
      parseInt(id, 10)
    ];
    if (hit)
      return (
        (hit.sizes &&
          ((hit.sizes.medium && hit.sizes.medium.url) ||
            (hit.sizes.large && hit.sizes.large.url) ||
            (hit.sizes.thumbnail && hit.sizes.thumbnail.url))) ||
        hit.url ||
        ""
      );
    return "";
  };
  app.galleryItemRatio = function galleryItemRatio(s, id) {
    const map = s && s.media_ratios && typeof s.media_ratios === "object" ? s.media_ratios : {};
    let r = parseFloat(map[id] || map[String(id)] || 0);
    if (r > 0.05 && r < 20) return r;
    const hit = ((typeof window !== "undefined" && window.CanvaslyLite1228 && window.CanvaslyLite1228.attCache) || {})[
      parseInt(id, 10)
    ];
    if (hit) {
      const w =
        hit.width ||
        (hit.sizes && ((hit.sizes.full && hit.sizes.full.width) || (hit.sizes.large && hit.sizes.large.width)));
      const h =
        hit.height ||
        (hit.sizes && ((hit.sizes.full && hit.sizes.full.height) || (hit.sizes.large && hit.sizes.large.height)));
      if (w && h) return w / h;
    }
    return 1.5;
  };
  app.galleryBoxStyle = function galleryBoxStyle(s) {
    const cols = app.galleryColsOf(s),
      gap = Math.max(0, parseInt(app.resp(s.gap), 10) || 10),
      layout = app.galleryLayoutOf(s),
      ratio = app.galleryRatioOf(s),
      rowH = app.galleryRowHOf(s);
    const vars = `--lb-cols:${cols};--lb-gap:${gap}px;--lb-gallery-ratio:${ratio};--lb-row-h:${rowH}px`;
    if (layout === "masonry")
      return `${vars};display:block;column-count:${cols};column-gap:${gap}px;width:100%;height:auto`;
    if (layout === "grid")
      return `${vars};display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;width:100%`;
    return `${vars};display:flex;flex-wrap:wrap;align-content:flex-start;gap:${gap}px;width:100%`;
  };
  app.galleryItemStyle = function galleryItemStyle(s, id) {
    const layout = app.galleryLayoutOf(s),
      gap = Math.max(0, parseInt(app.resp(s.gap), 10) || 10),
      rowH = app.galleryRowHOf(s),
      r = app.galleryItemRatio(s, id);
    if (layout === "justified") {
      const w = Math.max(40, Math.round(rowH * r));
      return `height:${rowH}px;width:${w}px;flex:1 1 ${w}px;overflow:hidden;margin:0`;
    }
    if (layout === "masonry")
      return `display:inline-block;width:100%;margin:0 0 ${gap}px;break-inside:avoid;overflow:hidden;position:static`;
    return "margin:0;min-width:0;overflow:hidden";
  };
  app.galleryCanvasHTML = function galleryCanvasHTML(s) {
    s = s || {};
    const groups = app.galleryGroupsOf(s),
      multiple = (s.mode || "single") === "multiple",
      many = multiple && groups.length > 1,
      showAll = s.show_all !== false;
    const cols = app.galleryColsOf(s),
      layout = app.galleryLayoutOf(s),
      ratio = app.galleryRatioOf(s);
    const layoutCls = ` is-${layout}${ratio === "auto" ? " is-ratio-auto" : ""}`;
    const box = app.galleryBoxStyle(s);
    let items = "";
    groups.forEach((g, i) => {
      const hide = many && !showAll && i !== 0;
      (g.ids.length ? g.ids : []).forEach((id) => {
        const r = app.galleryItemRatio(s, id);
        items += `<figure class="lb-gallery-item" style="${app.galleryItemStyle(s, id)}" data-lb-ratio="${r}"${multiple ? ` data-lb-in="${i}"` : ""}${hide ? " hidden" : ""}><img src="${app.esc(app.galleryUrlOf(s, id) || app.LB_ATT_PLACEHOLDER)}" data-lb28-att="${app.esc(id)}" data-lb28-size="${app.esc(s.size || "medium")}" alt=""${s.lazy_load === false ? "" : ' loading="lazy"'}></figure>`;
      });
    });
    if (!items)
      return `<div class="lb-gallery lb-gallery-empty is-grid" data-lb-open-gallery="1" style="${app.galleryBoxStyle(Object.assign({}, s, { gallery_layout: "grid" }))}">${Array.from({ length: cols }, () => '<div class="lb-gallery-placeholder" data-lb-open-gallery="1">' + app.t("Choose images") + "</div>").join("")}</div>`;
    let nav = "";
    if (many) {
      const all = String(s.all_label || "All").trim() || "All";
      nav = '<nav class="lb-gallery-nav" role="tablist" aria-label="' + app.t("Gallery") + '">';
      if (showAll)
        nav += `<button type="button" class="is-active" role="tab" aria-selected="true" data-lb-set="">${app.esc(all)}</button>`;
      groups.forEach((g, i) => {
        nav += `<button type="button" role="tab" aria-selected="${!showAll && i === 0 ? "true" : "false"}"${showAll ? "" : ` class="${i === 0 ? "is-active" : ""}"`} data-lb-set="${i}">${app.esc(g.label)}</button>`;
      });
      nav += "</nav>";
    }
    return `<div class="lb-gallery-shell${many ? " lb-gallery-has-nav" : ""}"${many ? ' data-lb-gallery-filter-host="1"' : ""}>${nav}<div class="lb-gallery${layoutCls}" data-lb-gal-layout="${layout}" data-lb-last-row="${app.esc(s.last_row || "auto")}" style="${box}">${items}</div></div>`;
  };
  app.persistGalleryIds = function persistGalleryIds(s) {
    s = s || {};
    const groups = app.galleryGroupsOf(s);
    s.ids = groups
      .flatMap((g) => g.ids)
      .filter(Boolean)
      .join(",");
    return s.ids;
  };
  app.applyGalleryFilter = function applyGalleryFilter(host, key) {
    if (!host) return;
    key = key == null ? "" : String(key);
    host.querySelectorAll(".lb-gallery-nav [data-lb-set]").forEach((b) => {
      const on = String(b.getAttribute("data-lb-set") || "") === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    host.querySelectorAll("[data-lb-in]").forEach((item) => {
      const show = key === "" || String(item.getAttribute("data-lb-in")) === key;
      item.hidden = !show;
      item.classList.toggle("is-lb-out", !show);
      if (!show) item.style.setProperty("display", "none", "important");
      else item.style.removeProperty("display");
    });
    const gal = host.querySelector(".lb-gallery");
    if (gal && typeof window.lbPackGalleries === "function") window.lbPackGalleries(gal);
  };
  app.openCollectionPicker = function openCollectionPicker(settings, index, done) {
    if (!window.wp?.media) return;
    const current = String((Array.isArray(settings.collections) ? settings.collections[index] : null)?.ids || "")
      .split(/[,\s]+/)
      .filter(Boolean);
    const f = wp.media({
      title: app.t("Select collection images"),
      button: { text: app.t("Use Images") },
      multiple: true,
      library: { type: "image" },
    });
    f.on("open", () => {
      try {
        const sel2 = f.state().get("selection");
        sel2.reset();
        current.forEach((id) => {
          const a = wp.media.attachment(id);
          if (!a) return;
          a.fetch();
          sel2.add(a);
        });
      } catch (e) {}
    });
    f.on("select", () => {
      const items = app.mediaSelectionItems(f);
      done(items, items.map((x) => x.id).filter(Boolean));
    });
    f.open();
  };
  app.mediaSelectionItems = function mediaSelectionItems(frame) {
    try {
      return frame.state().get("selection").toJSON() || [];
    } catch (e) {
      return [];
    }
  };
  app.rememberGalleryUrls = function rememberGalleryUrls(settings, items) {
    const urls = Object.assign(
      {},
      settings.media_urls && typeof settings.media_urls === "object" ? settings.media_urls : {},
    );
    const ratios = Object.assign(
      {},
      settings.media_ratios && typeof settings.media_ratios === "object" ? settings.media_ratios : {},
    );
    items.forEach((x) => {
      if (!x || !x.id) return;
      const url =
        (x.sizes &&
          ((x.sizes.medium && x.sizes.medium.url) ||
            (x.sizes.large && x.sizes.large.url) ||
            (x.sizes.thumbnail && x.sizes.thumbnail.url) ||
            (x.sizes.full && x.sizes.full.url))) ||
        x.url ||
        "";
      if (url) urls[x.id] = url;
      const w =
        x.width || (x.sizes && ((x.sizes.full && x.sizes.full.width) || (x.sizes.large && x.sizes.large.width)));
      const h =
        x.height || (x.sizes && ((x.sizes.full && x.sizes.full.height) || (x.sizes.large && x.sizes.large.height)));
      if (w && h) ratios[x.id] = w / h;
    });
    settings.media_urls = urls;
    settings.media_ratios = ratios;
    return urls;
  };
  app.responsiveKeys = /* @__PURE__ */ new Set([
    "size",
    "font_size",
    "width",
    "height",
    "min_height",
    "max_width",
    "max_height",
    "gap",
    "column_gap",
    "row_gap",
    "radius",
    "letter_spacing",
    "line_height",
    "padding",
    "margin",
    "opacity",
    "order",
    "flex_grow",
    "flex_shrink",
    "flex_basis",
    "top",
    "right",
    "bottom",
    "left",
  ]);
  app.styleKeys = /* @__PURE__ */ new Set([
    "background",
    "color",
    "text_color",
    "font_family",
    "font_size",
    "size",
    "weight",
    "line_height",
    "letter_spacing",
    "align",
    "alignment",
    "padding",
    "margin",
    "width",
    "height",
    "min_height",
    "max_width",
    "max_height",
    "gap",
    "column_gap",
    "row_gap",
    "radius",
    "border_width",
    "border_color",
    "border_style",
    "border_radius",
    "shadow",
    "icon_color",
    "title_color",
    "icon_size",
    "object_fit",
    "object_position",
    "background_image",
    "background_size",
    "background_position",
    "background_repeat",
    "background_overlay",
    "opacity",
    "filter",
    "transform",
    "transition",
    "cursor",
    "mix_blend_mode",
  ]);
  app.advancedKeys = /* @__PURE__ */ new Set([
    "class_mode",
    "variable_ref",
    "css_id",
    "css_class",
    "custom_css",
    "z_index",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "display",
    "visibility",
    "order",
    "flex_grow",
    "flex_shrink",
    "flex_basis",
    "align_self",
    "filter",
    "transform",
    "transition",
    "cursor",
    "mix_blend_mode",
    "hide_desktop",
    "hide_laptop",
    "hide_tablet_extra",
    "hide_tablet",
    "hide_mobile_extra",
    "hide_mobile",
    "hide_widescreen",
    "interaction",
    "interaction_duration",
    "interaction_delay",
    "interaction_trigger",
    "interaction_easing",
    "global_class",
    "aria_label",
    "role",
    "html_attributes",
    "button_radius",
  ]);
  app.lbResolveToken = function lbResolveToken(v) {
    if (typeof v !== "string") return v;
    v = app.lbResolveSafeDynamic(v);
    return v.replace(/\{\{var:([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}\}/g, (_, g, k) => `var(--lb-${g}-${k})`);
  };
  app.styleInline = function styleInline(n) {
    const s = n.settings || {},
      a = [];
    const put = (p, v, suf = "") => {
      v = app.lbResolveToken(v);
      if (v !== "" && v != null) {
        v = String(v);
        if (suf && /[^0-9.\s-]/.test(v)) suf = "";
        a.push(p + ":" + app.esc(v) + suf);
      }
    };
    const paintBg = (bg) => {
      if (!bg) return;
      if (typeof bg === "string") {
        put("background", bg);
        return;
      }
      if (typeof bg === "object" && typeof app.lbCompileBackground === "function") {
        const c = app.lbCompileBackground(bg, s) || {};
        Object.keys(c).forEach((p) => put(p, c[p]));
      }
    };
    if (n.type === "container" || n.type === "inner_section" || n.type === "grid") {
      put("width", app.resp(s.width));
      put("min-height", app.resp(s.min_height), "px");
      put("max-width", app.resp(s.max_width));
      paintBg(s.background);
      put("padding", app.formatBox(app.resp(s.padding)));
      put("margin", app.formatBox(app.resp(s.margin)));
      if ((n.type === "container" || n.type === "inner_section") && s.layout === "flex") {
        put("display", "flex");
        put("flex-direction", app.resp(s.direction));
        put("flex-wrap", app.resp(s.wrap));
        put("justify-content", app.resp(s.justify));
        put("align-items", app.resp(s.align));
        const itemsGap =
          typeof app.lbCompileGaps === "function"
            ? app.lbCompileGaps(app.lbGapsValue ? app.lbGapsValue(s.items_gap) : "")
            : "";
        if (itemsGap) put("gap", itemsGap);
        else put("gap", app.resp(s.gap), "px");
        put("flex-grow", app.resp(s.flex_grow));
        put("flex-shrink", app.resp(s.flex_shrink));
        put("flex-basis", app.resp(s.flex_basis));
      }
      if ((n.type === "container" || n.type === "inner_section") && s.layout === "grid") {
        put("display", "grid");
        const cc = String(app.resp(s.grid_template_columns) || "").trim();
        const rr = String(app.resp(s.grid_template_rows) || "").trim();
        const cols = Math.max(1, Math.min(24, parseInt(app.resp(s.columns || 2), 10) || 2));
        const rows = Math.max(1, Math.min(24, parseInt(app.resp(s.grid_rows || s.rows || 3), 10) || 3));
        put("grid-template-columns", cc || `repeat(${cols},minmax(0,1fr))`);
        put("grid-template-rows", rr || `repeat(${rows},minmax(0,1fr))`);
        put("grid-auto-flow", app.resp(s.auto_flow) || "row");
        put("grid-auto-columns", app.resp(s.grid_auto_columns) || "auto");
        put("grid-auto-rows", app.resp(s.grid_auto_rows) || "auto");
        put("align-items", app.resp(s.align) || "stretch");
        put("justify-items", app.resp(s.justify) || "stretch");
        const itemsGapGrid =
          typeof app.lbCompileGaps === "function"
            ? app.lbCompileGaps(app.lbGapsValue ? app.lbGapsValue(s.items_gap) : "")
            : "";
        if (itemsGapGrid) put("gap", itemsGapGrid);
        else {
          put("column-gap", app.resp(s.column_gap ?? s.gap), "px");
          put("row-gap", app.resp(s.row_gap ?? s.gap), "px");
        }
      }
      if (n.type === "grid") {
        put("display", "grid");
        const gcRaw = String(app.resp(s.grid_template_columns) || "").trim();
        const grRaw = String(app.resp(s.grid_template_rows) || "").trim();
        const cols = Math.max(1, Math.min(24, parseInt(app.resp(s.columns || 3), 10) || 3));
        const rowRaw = String(app.resp(s.rows) || "").trim();
        const rows = /^\d+$/.test(rowRaw)
          ? Math.max(1, Math.min(24, parseInt(rowRaw, 10)))
          : Math.max(1, Math.min(24, grRaw ? grRaw.split(/\s+(?![^()]*\))/).filter(Boolean).length : 3));
        const gc = /^\d+$/.test(gcRaw)
          ? `repeat(${Math.max(1, Math.min(24, parseInt(gcRaw, 10)))},minmax(${app.esc(app.resp(s.min_column || "0px"))},1fr))`
          : gcRaw;
        const gr = /^\d+$/.test(grRaw)
          ? `repeat(${Math.max(1, Math.min(24, parseInt(grRaw, 10)))},minmax(${app.esc(app.resp(s.min_row || "0px"))},1fr))`
          : grRaw;
        put("grid-template-columns", gc || `repeat(${cols},minmax(${app.esc(app.resp(s.min_column || "0px"))},1fr))`);
        put("grid-template-rows", gr || `repeat(${rows},minmax(${app.esc(app.resp(s.min_row || "0px"))},1fr))`);
        put("grid-auto-flow", app.resp(s.auto_flow) || "row");
        put("grid-auto-columns", app.resp(s.grid_auto_columns) || "auto");
        put("grid-auto-rows", app.resp(s.grid_auto_rows || s.min_row) || "auto");
        put("align-items", app.resp(s.align) || "stretch");
        put("justify-items", app.resp(s.justify) || "stretch");
        put("column-gap", app.resp(s.column_gap), "px");
        put("row-gap", app.resp(s.row_gap), "px");
      }
    }
    if (["heading", "text"].includes(n.type)) {
      put("text-align", s.align || "");
      put("font-size", app.resp(s.size ?? s.font_size), "px");
      put("font-weight", s.weight);
      put("font-family", s.font_family);
      put("line-height", app.resp(s.line_height));
      put("letter-spacing", app.resp(s.letter_spacing), "px");
      put("color", s.color);
    }
    if (n.type === "button") {
      put("background", s.background);
      put("color", s.text_color || s.color);
      put("border-radius", s.radius, "px");
      put("padding", s.padding);
      put("border-width", s.border_width, "px");
      put("border-style", s.border_width ? "solid" : "none");
      put("border-color", s.border_color);
    }
    if (n.type === "image") {
      put("width", app.resp(s.width));
      put("height", app.resp(s.height));
      put("border-radius", s.radius, "px");
      put("object-fit", s.object_fit);
      put("object-position", s.object_position);
    }
    return a.join(";");
  };
  app.formatBox = function formatBox(v) {
    if (!v) return "";
    if (typeof v === "string") {
      const t3 = v.trim();
      if (!t3) return "";
      return /^-?\d+(\.\d+)?$/.test(t3) ? t3 + "px" : t3;
    }
    if (typeof v === "object")
      return ["top", "right", "bottom", "left"]
        .map((k) => {
          const x = v[k];
          if (x === "" || x == null) return "0";
          const s = String(x).trim();
          if (s === "" || s === "0") return "0";
          return /^-?\d+(\.\d+)?$/.test(s) ? s + "px" : s;
        })
        .join(" ");
    return "";
  };
}

export { installControls };
