import { app } from "./app.js";
import { formatCounterNumber, applyCounterLive, isCounterSliderKey } from "./counter-live.js";
  function installDesignSystem() {
    app.lb09Num = (v) => v === "" ? "" : Number(v);
    app.lb09Val = (s, k, d = "") => s && s[k] !== void 0 ? s[k] : d;
    app.lb09Field = (k, label, type = "text", v = "", extra = "") => `<label class="lb-control"><span>${app.esc(label)}</span><input data-setting="${app.esc(k)}" type="${type}" value="${app.esc(v ?? "")}" ${extra}></label>`;
    app.lb09Select = (k, label, v, opts) => `<label class="lb-control"><span>${app.esc(label)}</span><select data-setting="${app.esc(k)}">${opts.map((o) => `<option value="${app.esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${app.esc(app.optionLabel(k, o))}</option>`).join("")}</select></label>`;
    app.lb09Section = function lb09Section(title, body, open = true) {
      return `<details class="lb-control-section" ${open ? "open" : ""}><summary>${app.esc(title)}</summary><div class="lb-section-body">${body}</div></details>`;
    };
    app.lb09Responsive = function lb09Responsive(k, label, v, type = "text") {
      return app.responsiveFieldsHTML(k, v, label);
    };
    app.lb09Box = function lb09Box(k, label, v) {
      const x = typeof v === "object" && v ? v : {};
      return `<div class="lb-control"><span>${app.esc(label)}</span><div class="lb-box-grid lb-box-grid-labeled"><input data-setting="${k}.top" value="${app.esc(x.top ?? "")}" placeholder="${app.t("Top")}"><input data-setting="${k}.right" value="${app.esc(x.right ?? "")}" placeholder="${app.t("Right")}"><input data-setting="${k}.bottom" value="${app.esc(x.bottom ?? "")}" placeholder="${app.t("Bottom")}"><input data-setting="${k}.left" value="${app.esc(x.left ?? "")}" placeholder="${app.t("Left")}"></div></div>`;
    };
    app.lbParseSize = function lbParseSize(v) {
      const raw = String(app.resp(v) ?? "").trim();
      if (!raw || raw === "auto") return { size: "", unit: raw === "auto" ? "auto" : "px" };
      const m = raw.match(/^(-?\d*\.?\d+)\s*(px|%|em|rem|vw|vh|auto)?$/i);
      if (!m) return { size: "", unit: "px" };
      return { size: m[1], unit: (m[2] || "px").toLowerCase() };
    };
    app.lbSlider = function lbSlider(k, label, v, opts = {}) {
      const unitless = !!opts.unitless, units = unitless ? [] : opts.units || ["px", "%", "em", "rem", "vw"], min = opts.min ?? 0, max = opts.max ?? 1e3, step = opts.step ?? 1;
      const raw = String(app.resp(v) ?? "").trim();
      const p = unitless ? { size: raw === "" ? "" : String(parseFloat(raw)), unit: "" } : app.lbParseSize(v);
      const unit = unitless ? "" : units.includes(p.unit) ? p.unit : units[0], size = p.size;
      const smax = unit === "%" ? 100 : max, snum = parseFloat(size), srest = min <= 0 && smax >= 0 ? 0 : min, sval = size === "" || !Number.isFinite(snum) ? srest : Math.max(min, Math.min(smax, snum));
      const unitSel = unitless ? "" : `<select class="lb-slider-unit">${units.map((u) => `<option value="${app.esc(u)}" ${u === unit ? "selected" : ""}>${app.esc(u)}</option>`).join("")}</select>`;
      return `<div class="lb-control lb-slider${unitless ? " lb-slider-unitless" : ""}" data-slider-key="${app.esc(k)}" data-slider-max="${max}" data-slider-unitless="${unitless ? "1" : "0"}"><span>${app.esc(label)}</span><div class="lb-slider-row"><input class="lb-slider-range" type="range" min="${min}" max="${smax}" step="${step}" value="${app.esc(sval)}" ${unit === "auto" ? "disabled" : ""}><input class="lb-slider-num" type="number" size="5" min="${min}" max="${smax}" step="${step}" value="${app.esc(size)}" placeholder="\u2014" ${unit === "auto" ? "disabled" : ""}>${unitSel}</div></div>`;
    };
    app.lb09LayoutSliders = function lb09LayoutSliders(s) {
      return app.lb09Section(app.t("Layout"), app.lbSlider("width", "Width", s.width || "", { units: ["%", "px", "vw", "em"], min: 0, max: 1e3 }) + app.lbSlider("max_width", "Max Width", s.max_width || "", { units: ["px", "%", "vw", "em"], min: 0, max: 2e3 }) + app.lbSlider("height", "Height", s.height || "", { units: ["px", "%", "vh", "em", "auto"], min: 0, max: 2e3 }) + app.lbSlider("min_height", "Min Height", s.min_height || "", { units: ["px", "%", "vh", "em"], min: 0, max: 2e3 }), true);
    };
    app.lb09AdvancedTab = function lb09AdvancedTab(n) {
      const s = n.settings || {};
      return app.lb09LayoutSliders(s) + app.lb09Section(app.t("Spacing"), app.lb09Box("margin", app.t("Margin"), s.margin) + app.lb09Box("padding", app.t("Padding"), s.padding), false) + app.lb09Section(app.t("Position"), app.lb09Select("position", app.t("Position"), s.position || "", ["", "relative", "absolute", "fixed", "sticky"]) + app.lb09Field("z_index", app.t("Z-index"), "number", s.z_index ?? 0) + app.lb09Select("overflow", app.t("Overflow"), s.overflow || "", ["", "visible", "hidden", "auto", "scroll"]), false) + app.lb09Section(app.t("Responsive"), app.hideOnHTML(s), false) + app.lb09Section(app.t("Custom CSS"), app.lb09Field("css_id", app.t("CSS ID"), "text", s.css_id) + app.lb09Field("css_class", app.t("CSS Classes"), "text", s.css_class) + app.lb09Field("global_class", app.t("Global Classes"), "text", s.global_class) + app.control("custom_css", { type: "code", language: "css", rows: 8 }, s.custom_css || "", app.t("Custom CSS")) + `<label class="lb-control"><span>Attributes</span><textarea data-setting="html_attributes" rows="4" placeholder="title=Example">${app.esc(s.html_attributes || "")}</textarea></label>`, false);
    };
    app.lbFormatCounterNumber = formatCounterNumber;
    app.lbApplyCounterLive = applyCounterLive;
    app.lbApplySliderLive = function lbApplySliderLive(node, key, v) {
      if (!node) return;
      if (node.classList.contains("lb-node-counter") && isCounterSliderKey(key)) {
        const r = app.selected && app.locate(app.state.root, app.selected);
        applyCounterLive(node, r && r.node && r.node.settings || {}, key, v);
        return;
      }
      if (typeof app.lbApplyGradientLive === "function" && /(?:^|\.)gradient_/.test(String(key))) {
        app.lbApplyGradientLive(node, key, v);
        return;
      }
      if (key === "opacity") {
        if (v === "" || v == null) node.style.removeProperty("opacity");
        else node.style.opacity = String(v);
        return;
      }
      if (key === "button_radius") {
        const sel2 = ".lb-button,.lb-form button,.lb-read-more,.lb-price-table>a,.lb-login button,.lb-link-bio-links a,.lb-flip-button,.lb-loop-more,.lb-loop-page";
        if (v === "" || v == null) {
          node.style.removeProperty("--lb-btn-radius");
          node.querySelectorAll(sel2).forEach((el) => el.style.removeProperty("border-radius"));
          return;
        }
        node.style.setProperty("--lb-btn-radius", String(v));
        node.querySelectorAll(sel2).forEach((el) => el.style.borderRadius = String(v));
        return;
      }
      if (node.classList.contains("lb-node-tinymce_text_editor")) {
        const box = node.querySelector(".lb-tinymce-preview,.lb-tinymce-text-editor") || node;
        const dim = String(key || "").split(".")[0];
        if (dim === "width") {
          node.style.setProperty("--lb-tiny-w", v || "100%");
          box.style.width = v || "100%";
          return;
        }
        if (dim === "max_width") {
          node.style.setProperty("--lb-tiny-max-w", v || "100%");
          if (v) box.style.maxWidth = v;
          return;
        }
        if (dim === "height") {
          node.style.setProperty("--lb-tiny-h", v || "auto");
          box.style.height = v && v !== "auto" ? v : "auto";
          return;
        }
        if (dim === "min_height") {
          node.style.setProperty("--lb-tiny-min-h", v || "0");
          if (v) box.style.minHeight = v;
          return;
        }
      }
      if (node.classList.contains("lb-node-image") || node.classList.contains("lb-node-video") || node.classList.contains("lb-node-image_box") || node.classList.contains("lb-node-carousel") || node.classList.contains("lb-node-gallery") || node.classList.contains("lb-node-audio")) {
        if (key === "width") {
          node.style.setProperty("--lb-img-w", v || "100%");
          const inner = node.querySelector(".lb-image-preview,.lb-image,.lb-video,.lb-image-box,.lb-carousel,.lb-gallery-shell,.lb-audio");
          if (inner) inner.style.width = v || "100%";
          return;
        }
        if (key === "max_width") {
          node.style.setProperty("--lb-img-max-w", v || "100%");
          return;
        }
        if (key === "height") {
          node.style.setProperty("--lb-img-h", v || "auto");
          const img = node.querySelector("img,video,.lb-video-frame");
          if (img && v && v !== "auto") img.style.height = v;
          return;
        }
      }
      const layoutDim = String(key || "").split(".")[0];
      if (layoutDim === "box_height") {
        node.style.setProperty("--lb-flip-height", v || "280px");
        const box = node.querySelector(".lb-flip-box");
        if (box) box.style.minHeight = v || "280px";
        return;
      }
      if (["width", "max_width", "height", "min_height"].includes(layoutDim) && !node.classList.contains("lb-node-container") && !node.classList.contains("lb-node-grid")) {
        const map = { width: ["--lb-el-w", "width"], max_width: ["--lb-el-max-w", "max-width"], height: ["--lb-el-h", "height"], min_height: ["--lb-el-min-h", "min-height"] };
        const pair = map[layoutDim], cssVar = pair[0], prop2 = pair[1];
        if (v && v !== "auto") {
          node.style.setProperty(cssVar, String(v));
          node.style.setProperty(prop2, String(v));
        } else {
          node.style.removeProperty(cssVar);
          node.style.removeProperty(prop2);
        }
        const inner = node.querySelector(":scope > :not(.lb-node-toolbar):not(.lb-insert-zone)");
        if (inner) {
          inner.style.width = "100%";
          if (layoutDim === "height" || layoutDim === "min_height") {
            inner.style.height = "100%";
            inner.style.minHeight = "inherit";
          }
        }
        return;
      }
      if (key === "columns" || key === "gap" || key === "row_height") {
        const gal = node.querySelector(".lb-gallery");
        if (!gal) return;
        if (key === "columns") {
          const n = Math.max(1, Math.min(12, parseInt(v, 10) || 4));
          gal.style.setProperty("--lb-cols", n);
          if (gal.classList.contains("is-grid")) gal.style.gridTemplateColumns = "repeat(" + n + ",minmax(0,1fr))";
          if (gal.classList.contains("is-masonry")) gal.style.columnCount = n;
        } else if (key === "gap") {
          const g = Math.max(0, parseFloat(v) || 0);
          gal.style.setProperty("--lb-gap", g + "px");
          gal.style.gap = g + "px";
          gal.style.columnGap = g + "px";
        } else {
          gal.style.setProperty("--lb-row-h", (parseInt(v, 10) || 220) + "px");
        }
        if (typeof window.lbPackGalleries === "function") window.lbPackGalleries(gal);
        return;
      }
      const prop = key.replace(/_/g, "-");
      if (v && v !== "auto") node.style.setProperty(prop, v);
      else if (v === "auto") node.style.setProperty(prop, "auto");
      else node.style.removeProperty(prop);
    };
    app.bindSliders = function bindSliders() {
      app.root.querySelectorAll(".lb-slider").forEach((el) => {
        if (el.__lbBound) return;
        el.__lbBound = true;
        const range = el.querySelector(".lb-slider-range"), num2 = el.querySelector(".lb-slider-num"), unit = el.querySelector(".lb-slider-unit"), key = el.dataset.sliderKey, max = Number(el.dataset.sliderMax || 1e3), unitless = el.dataset.sliderUnitless === "1";
        let started = false;
        const current = () => {
          const n = String(num2.value).trim();
          if (unitless) return n === "" ? "" : Number(n);
          const u = unit ? unit.value : "px";
          if (u === "auto") return "auto";
          if (n === "") return "";
          return n + u;
        };
        const live = () => {
          const v = current(), r = app.selected && app.locate(app.state.root, app.selected);
          if (!r) return;
          if (!started) {
            app.commit();
            started = true;
          }
          app.setPath(r.node.settings, key, v);
          app.dirty = true;
          app.scheduleSave();
          if (typeof app.previewSetting === "function") app.previewSetting(key, r.node.id);
          else app.lbApplySliderLive(app.frameDoc()?.querySelector('.lb-node[data-id="' + CSS.escape(String(r.node.id)) + '"]'), key, v);
        };
        const finish = () => {
          started = false;
        };
        range.addEventListener("input", () => {
          num2.value = range.value;
          live();
        });
        range.addEventListener("change", finish);
        num2.addEventListener("input", () => {
          if (num2.value !== "") range.value = num2.value;
          live();
        });
        num2.addEventListener("change", finish);
        unit?.addEventListener("change", () => {
          const u = unit.value;
          range.max = u === "%" ? 100 : max;
          range.disabled = num2.disabled = u === "auto";
          if (u === "auto") num2.value = "";
          live();
          finish();
        });
      });
      app.bindCounterLive();
    };
    app.bindCounterLive = function bindCounterLive() {
      const r = app.selected && app.locate(app.state.root, app.selected);
      if (!r || r.node.type !== "counter") return;
      const keys = /* @__PURE__ */ new Set(["number", "start", "prefix", "suffix", "title", "thousand_separator", "separator_char"]);
      app.root.querySelectorAll("[data-setting]").forEach((x) => {
        if (!keys.has(x.dataset.setting) || x.__lbCounterLive) return;
        x.__lbCounterLive = true;
        const apply = () => {
          let v = x.type === "checkbox" ? x.checked : x.value;
          if (x.type === "number") v = x.value === "" ? "" : Number(x.value);
          app.setPath(r.node.settings, x.dataset.setting, v);
          app.dirty = true;
          if (app.scheduleSave) app.scheduleSave();
          const node = app.frameDoc && app.frameDoc()?.querySelector('.lb-node[data-id="' + CSS.escape(String(r.node.id)) + '"]');
          app.lbApplyCounterLive(node, r.node.settings, x.dataset.setting, v);
        };
        x.addEventListener("input", apply);
        if (x.type === "checkbox" || x.tagName === "SELECT") x.addEventListener("change", apply);
      });
    };
    app.lb09GallerySettings = function lb09GallerySettings(n) {
      const s = n.settings || {};
      const layout = app.galleryLayoutOf(s);
      let h = `<div class="lb-selection-head"><strong>Gallery</strong><span class="lb-selection-id">${app.esc(n.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
      if (app.styleTab === "content") {
        h += `<label class="lb-control"><span>Type</span><select data-setting="mode"><option value="single" ${(s.mode || "single") === "single" ? "selected" : ""}>Single</option><option value="multiple" ${s.mode === "multiple" ? "selected" : ""}>Multiple</option></select></label>`;
        if ((s.mode || "single") === "multiple") {
          const list = Array.isArray(s.collections) ? s.collections : [];
          h += `<div class="lb-control lb31-gal-list"><span>Galleries</span>`;
          list.forEach((g, i) => {
            h += `<div class="lb31-gal-row" data-gal-index="${i}"><input class="lb31-gal-label" value="${app.esc(g.label || "")}" placeholder="${app.t("Gallery name")}"><button type="button" class="lb-btn lb31-gal-pick" title="${app.t("Choose images")}" aria-label="Choose images">\u{1F5BC}</button><button type="button" class="lb-btn lb31-gal-dup" title="${app.t("Duplicate")}">\u29C9</button><button type="button" class="lb-btn lb31-gal-del" title="${app.t("Remove")}">\xD7</button></div>`;
          });
          h += `<button type="button" class="lb-btn lb31-gal-add">+ Add Item</button></div>`;
          h += `<label class="lb-control lb-switch"><input data-setting="show_all" type="checkbox" ${s.show_all !== false ? "checked" : ""}><span>Show All tab</span></label>`;
          h += app.lb09Field("all_label", app.t("All tab label"), "text", s.all_label || "All");
        } else {
          h += app.control("ids", "gallery", s.ids || "", "Images");
        }
        h += `<label class="lb-control"><span>Order By</span><select data-setting="order_by">${[["default", "Default"], ["random", "Random"], ["date", "Date"], ["title", "Title"]].map(([v, l]) => `<option value="${v}" ${(s.order_by || "default") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
        h += `<label class="lb-control lb-switch"><input data-setting="lazy_load" type="checkbox" ${s.lazy_load !== false ? "checked" : ""}><span>Lazy Load</span></label>`;
        h += `<label class="lb-control"><span>Layout</span><select data-setting="gallery_layout">${[["justified", "Justified"], ["grid", "Grid"], ["masonry", "Masonry"]].map(([v, l]) => `<option value="${v}" ${layout === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
        if (layout === "justified") {
          h += app.lbSlider("row_height", "Row Height", s.row_height ?? 220, { unitless: true, min: 80, max: 600, step: 1 });
          h += `<label class="lb-control"><span>Last Row</span><select data-setting="last_row">${[["auto", "Auto"], ["fit", "Fit"], ["grow", "Grow"]].map(([v, l]) => `<option value="${v}" ${(s.last_row || "auto") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
        }
        if (layout !== "justified") h += app.lbSlider("columns", "Columns", s.columns ?? 4, { unitless: true, min: 1, max: 10, step: 1 });
        if (layout === "grid") {
          h += `<label class="lb-control"><span>Image Ratio</span><select data-setting="image_ratio">${[["1:1", "1:1"], ["3:2", "3:2"], ["4:3", "4:3"], ["16:9", "16:9"], ["9:16", "9:16"], ["auto", "Auto"]].map(([v, l]) => `<option value="${v}" ${(s.image_ratio || "1:1") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
        }
        h += app.lbSlider("gap", "Spacing", s.gap ?? 10, { unitless: true, min: 0, max: 80, step: 1 });
        h += app.control("link", "select", s.link || "file", "Link");
        h += `<label class="lb-control lb-switch"><input data-setting="lightbox" type="checkbox" ${s.lightbox !== false ? "checked" : ""}><span>Lightbox</span></label>`;
        h += app.control("caption", "select", s.caption || "none", "Caption");
        h += app.control("size", "select", s.size || "medium", "Image size");
      } else if (app.styleTab === "style") {
        h += app.lb09Section(app.t("Images"), app.lbSlider("image_radius", "Border Radius", s.image_radius || 0, { unitless: true, min: 0, max: 80, step: 1 }) + app.control("hover_animation", "select", s.hover_animation || "", "Hover Animation"), true);
        h += app.lb09Section(app.t("Caption"), app.lb09Select("caption_align", app.t("Alignment"), s.caption_align || "center", ["left", "center", "right"]) + `<label class="lb-control"><span>Text Color</span><input data-setting="caption_color" type="color" value="${app.esc(s.caption_color || "#30343a")}"></label>` + app.lbSlider("caption_size", "Size", s.caption_size || 12, { unitless: true, min: 8, max: 32, step: 1 }), true);
        h += app.lb09GeneralSettings(n, app.meta("gallery"), s);
      } else {
        h += app.lb09AdvancedTab(n);
      }
      const warn = app.accessibilityWarnings(n);
      h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div><div class="lb-action-grid"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
      return h;
    };
    app.lb09GridChild = function lb09GridChild(n) {
      const r = app.locate(app.state.root, n.id), p = r?.parent;
      if (!p || p.type !== "grid") return "";
      const s = n.settings || {};
      return app.lb09Section(app.t("Grid Child"), app.lb09Field("grid_column_start", app.t("Column Start"), "text", s.grid_column_start) + app.lb09Field("grid_column_span", app.t("Column Span"), "number", s.grid_column_span ?? 1) + app.lb09Field("grid_row_start", app.t("Row Start"), "text", s.grid_row_start) + app.lb09Field("grid_row_span", app.t("Row Span"), "number", s.grid_row_span ?? 1) + app.lb09Select("align_self", app.t("Align Self"), s.align_self || "auto", ["auto", "stretch", "start", "center", "end"]) + app.lb09Select("justify_self", app.t("Justify Self"), s.justify_self || "auto", ["auto", "stretch", "start", "center", "end"]) + app.lb09Field("order", app.t("Order"), "number", s.order ?? 0), true);
    };
    app.lb09GeneralSettings = function lb09GeneralSettings(n, e, s) {
      let h = "";
      h += app.lb09LayoutSliders(s);
      h += app.lb09Section(app.t("Spacing"), app.lb09Box("margin", app.t("Margin"), s.margin) + app.lb09Box("padding", app.t("Padding"), s.padding) + app.lb09Select("display", app.t("Display"), s.display || "", ["", "block", "inline-block", "flex", "grid", "none"]), true);
      h += app.lb09Section(app.t("Typography"), app.lb09Field("font_family", app.t("Font Family"), "text", s.font_family) + app.lb09Responsive("font_size", app.t("Font Size"), s.font_size ?? s.size) + app.lb09Select("font_weight", app.t("Weight"), s.font_weight || s.weight || "", ["", "300", "400", "500", "600", "700", "800", "900"]) + app.lb09Select("font_style", app.t("Style"), s.font_style || "", ["", "normal", "italic", "oblique"]) + app.lb09Select("text_transform", app.t("Transform"), s.text_transform || "", ["", "none", "uppercase", "lowercase", "capitalize"]) + app.lb09Select("text_decoration", app.t("Decoration"), s.text_decoration || "", ["", "none", "underline", "overline", "line-through"]) + app.lb09Responsive("line_height", app.t("Line Height"), s.line_height) + app.lb09Responsive("letter_spacing", app.t("Letter Spacing"), s.letter_spacing), true);
      h += app.lb09Section(app.t("Background"), app.control("background", "background", typeof s.background === "object" ? s.background : s.background ? { type: "classic", color: s.background } : {}, app.t("Background")), true);
      h += app.lb09Section(app.t("Border & Effects"), app.lb09Box("border_width", app.t("Border Width"), s.border_width) + app.lb09Select("border_style", app.t("Border Style"), s.border_style || "", ["", "solid", "dashed", "dotted", "double", "none"]) + `<label class="lb-control"><span>Border Color</span><input data-setting="border_color" type="color" value="${app.esc(s.border_color || "#dddddd")}"></label>` + app.lb09Box("border_radius", app.t("Radius"), s.border_radius) + app.control("shadow", "box_shadow", s.shadow || {}, "Shadow") + app.lbSlider("opacity", "Opacity", s.opacity ?? 1, { unitless: true, min: 0, max: 1, step: 0.05 }) + app.control("filter", "css_filter", s.filter || {}, app.t("CSS Filter")) + app.control("transform", "transform", s.transform || {}, app.t("Transform")), true);
      return h;
    };
    app.settingsHTML = function() {
      if (!app.selected) return '<div class="lb-empty-settings">' + app.t("Select a unit to edit its settings.") + "</div>";
      const r = app.locate(app.state.root, app.selected), e = app.meta(r.node.type), s = r.node.settings || {};
      if (r.node.type === "gallery") return app.lb09GallerySettings(r.node);
      let h = `<div class="lb-selection-head"><strong>${app.esc(e.title || r.node.type)}</strong><span class="lb-selection-id">${app.esc(r.node.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
      if (app.styleTab === "content") {
        h += e.controls ? Object.entries(e.controls).map(([k, t3]) => app.control(k, t3, s[k] ?? (t3 === "spacing" || t3 === "dimensions" || t3 === "box_shadow" ? {} : ""))).join("") : "";
      }
      if (app.styleTab === "style") {
        h += app.lb09GeneralSettings(r.node, e, s);
      }
      if (app.styleTab === "advanced") {
        h += app.lb09AdvancedTab(r.node) + app.lb09GridChild(r.node);
      }
      if (r.node.type === "grid" && app.styleTab === "content") h += app.lb09Section(app.t("Grid Layout"), app.lb09Field("grid_template_columns", app.t("Column Tracks"), "text", s.grid_template_columns, 'placeholder="repeat(3, 1fr)"') + app.lb09Field("grid_template_rows", app.t("Row Tracks"), "text", s.grid_template_rows, 'placeholder="auto auto"') + app.lb09Field("min_column", app.t("Min Column Size"), "text", s.min_column || "120px") + app.lb09Field("min_row", app.t("Auto Row Size"), "text", s.min_row || "auto") + app.lb09Select("auto_flow", app.t("Auto Flow"), s.auto_flow || "row", ["row", "column", "dense", "row dense", "column dense"]) + app.lb09Responsive("column_gap", app.t("Column Gap"), s.column_gap) + app.lb09Responsive("row_gap", app.t("Row Gap"), s.row_gap) + `<label class="lb-control lb-switch"><input data-setting="show_outline" type="checkbox" ${s.show_outline ? "checked" : ""}><span>Show Grid Outline (editor only)</span></label>`, true);
      const warn = app.accessibilityWarnings(r.node);
      h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div><div class="lb-action-grid"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
      return h;
    };
    app.lb09StyleFor = function lb09StyleFor(n) {
      const s = n.settings || {}, a = [];
      const put = (p, v) => {
        if (v !== "" && v != null && typeof v !== "object") a.push(p + ":" + app.esc(v));
      };
      const box = (v) => app.formatBox(app.resp(v));
      put("width", app.resp(s.width));
      put("height", app.resp(s.height));
      put("min-height", app.resp(s.min_height));
      put("max-width", app.resp(s.max_width));
      put("margin", box(s.margin));
      put("padding", box(s.padding));
      put("opacity", app.resp(s.opacity));
      put("position", s.position);
      put("z-index", s.z_index);
      put("top", app.resp(s.top));
      put("right", app.resp(s.right));
      put("bottom", app.resp(s.bottom));
      put("left", app.resp(s.left));
      put("display", s.display);
      put("overflow", s.overflow);
      if (s.background && typeof s.background === "object" && typeof app.lbCompileBackground === "function") {
        const bg = app.lbCompileBackground(s.background, s);
        Object.keys(bg).forEach((p) => put(p, bg[p]));
      } else {
        put("background", s.background_gradient || (typeof s.background === "string" ? s.background : ""));
        if (s.background_image) put("background-image", `url(${app.esc(s.background_image)})`);
        put("background-size", s.background_size);
        put("background-position", s.background_position);
        put("background-repeat", s.background_repeat);
      }
      put("color", app.resp(s.color || s.text_color));
      if (s.typography && typeof s.typography === "object") {
        put("font-family", s.typography.font_family);
        put("font-size", app.resp(s.typography.font_size));
        put("font-weight", s.typography.font_weight);
        put("font-style", s.typography.font_style);
        put("text-transform", s.typography.text_transform);
        put("text-decoration", s.typography.text_decoration);
        put("line-height", app.resp(s.typography.line_height));
        put("letter-spacing", app.resp(s.typography.letter_spacing));
      }
      put("font-family", s.font_family);
      put("font-size", app.resp(s.font_size ?? s.size));
      put("font-weight", s.font_weight ?? s.weight);
      put("font-style", s.font_style);
      put("text-transform", s.text_transform);
      put("text-decoration", s.text_decoration);
      put("line-height", app.resp(s.line_height));
      put("letter-spacing", app.resp(s.letter_spacing));
      if (s.border && typeof s.border === "object") {
        put("border-style", s.border.style);
        put("border-width", box(s.border.width));
        put("border-color", s.border.color);
        put("border-radius", box(s.border.radius));
      }
      put("border-width", app.formatBox(app.resp(s.border_width)));
      put("border-style", s.border_style);
      put("border-color", s.border_color || (n.type !== "button" && ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"].indexOf(s.border_style) !== -1 ? "#ffffff" : ""));
      put("border-radius", app.formatBox(app.resp(s.border_radius)) || s.radius);
      if (s.shadow && typeof s.shadow === "object") {
        const sh = s.shadow;
        put("box-shadow", `${sh.inset ? "inset " : ""}${sh.x || 0}px ${sh.y || 0}px ${sh.blur || 0}px ${sh.spread || 0}px ${sh.color || "rgba(0,0,0,.15)"}`);
      }
      put("object-fit", s.object_fit);
      put("object-position", s.object_position);
      put("filter", typeof app.lbCompileFilter === "function" ? app.lbCompileFilter(s.filter) : s.filter);
      put("transform", typeof app.lbCompileTransform === "function" ? app.lbCompileTransform(s.transform) : s.transform);
      put("transition", typeof app.lbCompileTransition === "function" ? app.lbCompileTransition(s.transition) : typeof s.transition === "string" ? s.transition : "");
      put("text-shadow", typeof app.lbCompileTextShadow === "function" ? app.lbCompileTextShadow(s.text_shadow) : typeof s.text_shadow === "string" ? s.text_shadow : "");
      const itemsGapNow = s.items_gap && typeof app.lbCompileGaps === "function" ? app.lbCompileGaps(app.lbGapsValue ? app.lbGapsValue(s.items_gap) : "") : "";
      if (itemsGapNow) put("gap", itemsGapNow);
      else if (s.gaps && typeof s.gaps === "object") put("gap", s.gaps.linked || s.gaps.row === s.gaps.column ? s.gaps.row || s.gaps.column || "" : (s.gaps.row || "0") + " " + (s.gaps.column || "0"));
      put("mix-blend-mode", s.mix_blend_mode);
      return a.join(";");
    };
    app.lb09LayoutStyleFor = app.styleInline;
    app.lb09LayoutProps = /^(display|flex(-[a-z]+)?|justify-(content|items)|align-items|(column-|row-)?gap|grid-[a-z-]+)$/;
    app.styleInline = function(n) {
      const generic = app.lb09StyleFor(n);
      if (n.type !== "container" && n.type !== "grid") return generic;
      const layout = String(app.lb09LayoutStyleFor(n) || "").split(/;(?![^()]*\))/).map((x) => x.trim()).filter((x) => x && app.lb09LayoutProps.test(x.split(":")[0].trim()));
      return layout.concat(generic ? [generic] : []).join(";");
    };
    app.lb09OldBody = app.bodyHTML;
    app.bodyHTML = function(n) {
      if (n.type === "image") {
        const s = n.settings || {}, u = s.image_url || "";
        const src = u || "";
        const img = src ? `<img class="lb-image-img" src="${app.esc(src)}" alt="${app.esc(s.alt || "")}" style="${app.styleInline(n)}" loading="${app.esc(s.loading || "lazy")}" decoding="${app.esc(s.decoding || "async")}">` : '<div class="lb-image-placeholder">' + app.t("Choose image") + "</div>";
        let wrapped = img;
        if (s.lightbox && src) wrapped = `<a class="lb-image-lightbox" href="${app.esc(src)}" data-lb-lightbox="1">${img}</a>`;
        else if (s.link) wrapped = `<a href="${app.esc(s.link)}" target="${app.esc(s.link_target || "_self")}">${img}</a>`;
        const cap = s.caption_type && s.caption_type !== "none" ? `<figcaption>${app.esc(s.caption || "")}</figcaption>` : "";
        return `<figure class="lb-image-preview">${wrapped}${cap}</figure>`;
      }
      return app.lb09OldBody(n);
    };
    app.lb09OldNode = app.nodeHTML;
    app.nodeHTML = function(n) {
      return app.lb09OldNode(n);
    };
    app.lb09OldNodeHTML = app.nodeHTML;
    app.nodeHTML = function(n) {
      const s = n.settings || {}, r = app.lb09OldNodeHTML(n);
      let extra = "";
      if (s.grid_column_start) extra += "grid-column-start:" + app.esc(s.grid_column_start) + ";";
      if (s.grid_column_span) extra += "grid-column:span " + Math.max(1, Number(s.grid_column_span)) + ";";
      if (s.grid_row_start) extra += "grid-row-start:" + app.esc(s.grid_row_start) + ";";
      if (s.grid_row_span) extra += "grid-row:span " + Math.max(1, Number(s.grid_row_span)) + ";";
      if (s.justify_self) extra += "justify-self:" + app.esc(s.justify_self) + ";";
      if (s.align_self) extra += "align-self:" + app.esc(s.align_self) + ";";
      const br = app.resp ? app.resp(s.button_radius) : s.button_radius;
      if (br !== "" && br != null) {
        const raw = String(br).trim();
        if (raw) extra += "--lb-btn-radius:" + app.esc(/^-?\d+(\.\d+)?$/.test(raw) ? raw + "px" : raw) + ";";
      }
      return extra ? r.replace(' data-id="' + app.esc(n.id) + '"', ' data-id="' + app.esc(n.id) + '" style="' + extra + '"') : r;
    };
    app.openPerformance = async function openPerformance() {
      try {
        const r = await fetch(`${app.D.api}/performance/${app.D.postId}`, { headers: { "X-WP-Nonce": app.D.nonce } }), d = await r.json();
        app.showModal(app.t("Performance & Assets"), `<div class="lb-library-list"><div class="lb-library-row"><strong>Asset version</strong><code>${app.esc(d.version || "")}</code></div><div class="lb-library-row"><strong>Editor CSS/JS</strong><code>Isolated iframe + versioned assets</code></div><div class="lb-library-row"><strong>Frontend CSS</strong><code>Document CSS cache + invalidation</code></div><div class="lb-library-row"><strong>Interaction JS</strong><code>Loaded only when interactions are present</code></div><div class="lb-library-row"><strong>Image delivery</strong><code>srcset + sizes + lazy loading</code></div></div>`);
      } catch (e) {
        alert(app.t("Could not load performance information."));
      }
    };
    app.lb09Toolbar = function lb09Toolbar() {
      const top = app.$(".lb-top");
      if (!top) return;
      if (!app.$("#lb-export")) top.insertAdjacentHTML("beforeend", '<button class="lb-btn" id="lb-export" title="Export document">' + app.t("Export") + '</button><button class="lb-btn" id="lb-import" title="Import document">' + app.t("Import") + '</button><button class="lb-btn" id="lb-breakpoints" title="Responsive breakpoints">' + app.t("Breakpoints") + '</button><button class="lb-btn" id="lb-audit" title="Accessibility audit">' + app.t("A11y") + '</button><button class="lb-btn" id="lb-lock" title="Document lock">' + app.t("Lock") + '</button><button class="lb-btn" id="lb-performance" title="Performance and assets">' + app.t("Assets") + '</button><input id="lb-import-file" type="file" accept="application/json" hidden>');
      app.$("#lb-export")?.addEventListener("click", async () => {
        try {
          const r = await fetch(`${app.D.api}/document/${app.D.postId}/export`, { headers: { "X-WP-Nonce": app.D.nonce } }), d = await r.json();
          const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }), a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `canvasly-lite-${app.D.postId || "document"}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (e) {
          alert(app.t("Export failed."));
        }
      });
      app.$("#lb-import")?.addEventListener("click", () => app.$("#lb-import-file")?.click());
      app.$("#lb-breakpoints")?.addEventListener("click", () => app.openBreakpointsModal());
      app.$("#lb-audit")?.addEventListener("click", () => {
        const issues = [];
        const walk = (nodes) => nodes.forEach((n) => {
          issues.push(...app.accessibilityWarnings(n).map((x) => ({ node: n, type: n.type, msg: x })));
          if (n.children) walk(n.children);
        });
        walk(app.state.root);
        app.showModal(app.t("Accessibility Audit"), issues.length ? issues.map((i) => `<div class="lb-library-row"><strong>${app.esc(app.meta(i.type).title || i.type)}</strong><span>${app.esc(i.msg)}</span></div>`).join("") : "<p>\u2713 No obvious issues detected in the current document.</p>");
      });
      app.$("#lb-performance")?.addEventListener("click", app.openPerformance);
      app.$("#lb-lock")?.addEventListener("click", async () => {
        if (typeof app.checkLock === "function") return app.checkLock();
        try {
          const r = await fetch(`${app.D.api}/lock/${app.D.postId}`, { method: "POST", headers: { "X-WP-Nonce": app.D.nonce } });
          const x = await r.json();
          if (x.locked) alert(app.t("%s is currently editing this document.", x.name || app.t("another user")));
          else alert(app.t("Document lock is active for this session."));
        } catch (e) {
        }
      });
      app.$("#lb-import-file")?.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const d = JSON.parse(rd.result);
            if (!Array.isArray(d.root)) throw Error();
            app.commit();
            app.state = d;
            app.selected = null;
            app.render();
          } catch (x) {
            alert(app.t("Invalid Canvasly document."));
          }
        };
        rd.readAsText(f);
      });
    };
    app.lb09Render = app.render;
    app.render = function() {
      app.lb09Render();
      app.lb09Toolbar();
    };
    app.lb09Schedule = app.scheduleSave;
    app.scheduleSave = function() {
      if (app.previewingRevision) return;
      if (typeof app.lb09Schedule === "function") return app.lb09Schedule();
      clearTimeout(app.saveTimer);
      app.saveTimer = setTimeout(() => app.save(true), 1500);
    };
    app.lb09Recovery = async function lb09Recovery() {
      if (typeof app.recoverAutosave === "function") return app.recoverAutosave();
      try {
        const r = await fetch(`${app.D.api}/document/${app.D.postId}/autosave`, { headers: { "X-WP-Nonce": app.D.nonce } });
        const a = await r.json();
        if (a?.document && JSON.stringify(a.document) !== JSON.stringify(app.state) && typeof app.showAutosaveBanner === "function") app.showAutosaveBanner(a, "", String(a.time || ""));
      } catch (e) {
      }
    };
    setTimeout(app.lb09Recovery, 700);
    document.addEventListener("keydown", (e) => {
      if (app.lbShortcutOwner) return;
      if (e.key === "Escape") {
        if (app.previewingRevision && app.cancelRevisionPreview) {
          e.preventDefault();
          app.cancelRevisionPreview();
          return;
        }
        if (app.historyOpen && app.closeHistory) {
          e.preventDefault();
          app.closeHistory();
          return;
        }
        if (app.menuOpen) app.closeMainMenu();
        if (document.querySelector(".lb-modal-backdrop,.lb-rte-overlay")) app.closeModal();
        return;
      }
      if (document.querySelector(".lb-rte-overlay") || document.activeElement?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        app.leftHidden = !app.leftHidden;
        app.rightHidden = !app.rightHidden;
        app.render();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? app.redo() : app.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        app.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && app.selected) {
        e.preventDefault();
        app.copy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && app.clipboard) {
        e.preventDefault();
        app.paste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && app.selected) {
        e.preventDefault();
        app.duplicate();
      } else if (e.key === "Delete" && app.selected) app.remove();
    });
    document.addEventListener("click", (e) => {
      if (app.menuOpen && !e.target.closest(".lb-main-menu") && !e.target.closest("#lb-main-menu-button")) app.closeMainMenu();
    });
    window.addEventListener("beforeunload", (e) => {
      if (app.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    app.render();
    app.lb010OriginalSettings = app.settingsHTML;
    app.lb010ResponsiveTriple = function lb010ResponsiveTriple(k, label, s, kind = "text") {
      return app.responsiveFieldsHTML(k, s?.[k], label);
    };
    app.lb010DesignSection = function lb010DesignSection(n) {
      const s = n.settings || {};
      return app.lb09Section(
        app.t("Typography & Design"),
        app.lb010ResponsiveTriple("font_size", "Font Size", s, "text") + app.lb09Field("font_family", app.t("Font Family"), "text", s.font_family || "") + app.lb09Select("font_weight", app.t("Font Weight"), s.font_weight || s.weight || "", ["", "300", "400", "500", "600", "700", "800"]) + app.lb09Select("font_style", app.t("Font Style"), s.font_style || "", ["", "normal", "italic", "oblique"]) + app.lb09Select("text_transform", app.t("Text Transform"), s.text_transform || "", ["", "none", "uppercase", "lowercase", "capitalize"]) + app.lb09Select("text_decoration", app.t("Text Decoration"), s.text_decoration || "", ["", "none", "underline", "line-through"]) + app.lb010ResponsiveTriple("line_height", "Line Height", s, "text") + app.lb010ResponsiveTriple("letter_spacing", "Letter Spacing", s, "text") + app.control("text_shadow", "text_shadow", s.text_shadow || {}, app.t("Text Shadow")) + app.control("background", "background", typeof s.background === "object" ? s.background : {}, app.t("Background")) + app.lb09Select("background_clip", app.t("Background Clip"), s.background_clip || "", ["", "border-box", "padding-box", "text"]) + app.control("filter", "css_filter", s.filter || {}, app.t("Filter")) + app.control("transform", "transform", s.transform || {}, app.t("Transform")),
        true
      );
    };
    app.lb010Borders = function lb010Borders(n) {
      const s = n.settings || {};
      return app.lb09Section(app.t("Border & Shadow"), app.lb09Select("border_style", app.t("Border Style"), s.border_style || "", ["", "solid", "dashed", "dotted", "double", "none"]) + app.boxControl("border_width", typeof s.border_width === "object" ? s.border_width : {}, app.t("Border Width")) + app.lb09Field("border_color", app.t("Border Color"), "color", s.border_color || "") + app.boxControl("border_radius", typeof s.border_radius === "object" ? s.border_radius : {}, app.t("Border Radius")) + app.control("shadow", "box_shadow", s.shadow || s.box_shadow || {}, app.t("Box Shadow")), false);
    };
    app.lb010Dynamic = function lb010Dynamic(n) {
      const s = n.settings || {};
      return app.lb09Section(app.t("Dynamic Content"), app.lb09Select("dynamic_source", app.t("Source"), s.dynamic_source || "", ["", "post", "site"]) + app.lb09Select("dynamic_key", app.t("Dynamic Field"), s.dynamic_key || "", ["", "title", "content", "excerpt", "featured_image", "author", "date", "url"]) + app.lb09Field("dynamic_meta_key", app.t("Custom Field"), "text", s.dynamic_meta_key || ""), false);
    };
    app.lb010Atomic = function lb010Atomic(n) {
      const atomicTypes = ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"];
      return app.lb09Section(app.t("Atomic Unit"), `<div class="lb-atomic-badge">${atomicTypes.includes(n.type) ? "Atomic" : "Classic"} unit</div><label class="lb-control"><span>Unit Type</span><select id="lb-atomic-type">${Object.entries(app.D.atomicTypes || {}).map(([k, v]) => `<option value="${app.esc(k)}" ${k === n.type ? "selected" : ""}>${app.esc(v)}</option>`).join("")}</select></label><button class="lb-btn" id="lb-convert-atomic">Apply Type</button>`, false);
    };
    app.settingsHTML = function() {
      if (!app.selected) return app.lb010OriginalSettings();
      const r = app.locate(app.state.root, app.selected);
      if (!r) return app.lb010OriginalSettings();
      let h = app.lb010OriginalSettings();
      let extra = "";
      if (app.styleTab === "style") extra += app.lb010DesignSection(r.node) + app.lb010Borders(r.node);
      if (app.styleTab === "content") extra += app.lb010Dynamic(r.node);
      if (app.styleTab === "advanced") extra += app.lb010Atomic(r.node);
      if (extra) {
        if (h.includes("lb-action-grid")) h = h.replace('<div class="lb-action-grid"', extra + '<div class="lb-action-grid"');
        else h += extra;
      }
      return h;
    };
    app.lb010OldRender = app.render;
    app.render = function() {
      app.lb010OldRender();
      app.lb010BindFeatureUI();
    };
    app.lb010BindFeatureUI = function lb010BindFeatureUI() {
      app.root.querySelectorAll(".lb010-responsive input").forEach((x) => {
        if (x.__lbLiveBound) return;
        x.onchange = () => app.update(x.dataset.setting, x.value);
      });
      app.root.querySelector("#lb-convert-atomic")?.addEventListener("click", () => {
        const r = app.selected && app.locate(app.state.root, app.selected), sel2 = app.root.querySelector("#lb-atomic-type");
        if (!r || !sel2 || !app.meta(sel2.value).type) return;
        app.commit();
        r.node.type = sel2.value;
        r.node.settings = { ...app.defaults(sel2.value), ...r.node.settings };
        app.selected = r.node.id;
        app.render();
      });
    };
    app.lb010OpenDesignSystem = function lb010OpenDesignSystem() {
      Promise.all([fetch(`${app.D.api}/design-system`, { headers: { "X-WP-Nonce": app.D.nonce } }).then((r) => r.json()), fetch(`${app.D.api}/classes`, { headers: { "X-WP-Nonce": app.D.nonce } }).then((r) => r.json())]).then(([d, c]) => app.showModal(app.t("Design System"), `<div class="lb-library-list"><div class="lb-library-row"><strong>${app.t("Variables")}</strong><span>${Object.keys(d.variables?.colors || {}).length} colors \xB7 ${Object.keys(d.variables?.sizes || {}).length} sizes</span></div><div class="lb-library-row"><strong>Global Classes</strong><span>${Object.keys(c || {}).length}</span></div><div class="lb-library-row"><strong>Atomic Units</strong><span>${Object.keys(d.atomic || {}).length}</span></div><button class="lb-btn" id="lb-ds-export">${app.t("Export Design System")}</button><button class="lb-btn" id="lb-ds-import">${app.t("Import Design System")}</button><input id="lb-ds-file" type="file" accept="application/json" hidden></div>`)).then(() => {
        app.root.querySelector("#lb-ds-export")?.addEventListener("click", async () => {
          const r = await fetch(`${app.D.api}/design-system`, { headers: { "X-WP-Nonce": app.D.nonce } }), d = await r.json();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
          a.download = "canvasly-lite-design-system.json";
          a.click();
        });
        app.root.querySelector("#lb-ds-import")?.addEventListener("click", () => app.root.querySelector("#lb-ds-file")?.click());
        app.root.querySelector("#lb-ds-file")?.addEventListener("change", (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = async () => {
            try {
              const d = JSON.parse(rd.result);
              await fetch(`${app.D.api}/design-system/import`, { method: "POST", headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce }, body: JSON.stringify({ ...d, mode: app.$("#lb-ds-import-mode")?.value || "merge" }) });
              alert("Design system imported.");
              app.render();
            } catch (err) {
              alert(app.t("Could not import design system."));
            }
          };
          rd.readAsText(f);
        });
      });
    };
    app.lb010OpenTemplateManager = function lb010OpenTemplateManager() {
      fetch(`${app.D.api}/templates`, { headers: { "X-WP-Nonce": app.D.nonce } }).then((r) => r.json()).then((list) => {
        app.showModal(app.t("Template Library"), `<div class="lb-template-grid">${(list || []).map((tpl) => `<article class="lb-template-card"><div class="lb-template-thumb"><span>${app.esc((tpl.type || "page").toUpperCase())}</span></div><strong>${app.esc(tpl.title)}</strong><small>${app.esc(tpl.type || "page")}</small><div><button class="lb-btn" data-tpl-insert="${tpl.id}">${app.t("Insert")}</button><button class="lb-btn" data-tpl-export="${tpl.id}">${app.t("Export")}</button></div></article>`).join("") || "<p>" + app.t("No templates saved yet.") + "</p>"}</div>`);
        app.root.querySelectorAll("[data-tpl-insert]").forEach((b) => b.onclick = async () => {
          const r = await fetch(`${app.D.api}/templates/${b.dataset.tplInsert}`, { headers: { "X-WP-Nonce": app.D.nonce } }), d = await r.json();
          if (Array.isArray(d.root)) {
            app.commit();
            app.state.root = d.root.map(app.clone);
            app.selected = null;
            app.render();
          }
        });
        app.root.querySelectorAll("[data-tpl-export]").forEach((b) => b.onclick = async () => {
          const r = await fetch(`${app.D.api}/templates/${b.dataset.tplExport}`, { headers: { "X-WP-Nonce": app.D.nonce } }), d = await r.json();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
          a.download = `canvasly-lite-template-${b.dataset.tplExport}.json`;
          a.click();
        });
      });
    };
    app.lb010OldToolbar = app.lb09Toolbar;
    app.lb09Toolbar = function() {
      app.lb010OldToolbar();
      const top = app.$(".lb-top");
      if (top && !app.$("#lb-design-system")) top.insertAdjacentHTML("beforeend", '<button class="lb-btn" id="lb-design-system">Design System</button>');
      app.$("#lb-design-system")?.addEventListener("click", app.lb010OpenDesignSystem);
      /* XEditor: the legacy "Atomic" modal was replaced by the XEditor menu (assets/js/xeditor.js). */
    };
    app.lb010TemplateBtn = document.getElementById("lb-template-load");
    if (app.lb010TemplateBtn) app.lb010TemplateBtn.onclick = app.lb010OpenTemplateManager;
    app.lb101Icons = Array.isArray(app.D.icons) ? app.D.icons.slice() : [];
    app.lb101GoogleFonts = Array.isArray(app.D.googleFonts) ? app.D.googleFonts.slice() : [];
    app.lb101IconsReady = false, app.lb101FontsReady = false;
    app.lb101IconTitle = function lb101IconTitle(id) {
      const x = app.lb101Icons.find((i) => i.id === id);
      return x?.title || String(id || "Choose icon").replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    };
    app.lb101IconSvg = function lb101IconSvg(id, cls = "") {
      const x = app.lb101Icons.find((i) => i.id === id);
      if (!x) return '<span class="lb-icon-fallback">\u2605</span>';
      if (x.svg) {
        return String(x.svg).replace(/<svg\b/i, '<svg class="lb-fa-icon ' + app.esc(cls) + '" width="1em" height="1em"').replace(/<svg\s+class="[^"]*"/, '<svg class="lb-fa-icon ' + app.esc(cls) + '" width="1em" height="1em"');
      }
      return `<svg class="lb-fa-icon ${app.esc(cls)}" width="1em" height="1em" viewBox="0 0 ${Number(x.width) || 512} ${Number(x.height) || 512}" aria-hidden="true" focusable="false"><path d="${app.esc(x.path || "")}" fill="currentColor"></path></svg>`;
    };
    app.lb101EnsureIcons = async function lb101EnsureIcons() {
      if (app.lb101IconsReady) return app.lb101Icons;
      try {
        const u = app.D.iconLibraryUrl;
        if (u) {
          const r = await fetch(u, { credentials: "same-origin" });
          if (r.ok) {
            const all = await r.json();
            if (Array.isArray(all)) {
              const custom = app.lb101Icons.filter((x) => x && x.svg && !x.path);
              const byId = {};
              all.concat(custom).forEach((x) => {
                if (x && x.id) byId[x.id] = x;
              });
              app.lb101Icons = Object.values(byId);
            }
          }
        }
      } catch (e) {
      }
      app.lb101IconsReady = true;
      return app.lb101Icons;
    };
    app.lb101EnsureFonts = async function lb101EnsureFonts() {
      if (app.lb101FontsReady) return app.lb101GoogleFonts;
      if (!app.lb101GoogleFonts.length) {
        try {
          const u = app.D.googleFontsUrl;
          if (u) {
            const r = await fetch(u, { credentials: "same-origin", cache: "no-store" });
            if (r.ok) {
              const all = await r.json();
              if (Array.isArray(all)) app.lb101GoogleFonts = all;
            }
          }
        } catch (e) {
        }
      }
      app.lb101FontsReady = true;
      return app.lb101GoogleFonts;
    };
    app.lb101FontSelect = function lb101FontSelect(v) {
      const current = v || "";
      const fonts = app.lb101GoogleFonts.length ? app.lb101GoogleFonts : ["Arial", "Helvetica", "Georgia", "Times New Roman", "Verdana", "Tahoma"];
      return `<label class="lb-control lb-font-family-control"><span>Font Family <small>Google Fonts</small></span><select data-setting="font_family" class="lb-font-family-select"><option value="">Default</option>${fonts.map((f) => `<option value="${app.esc(f)}" ${f === current ? "selected" : ""}>${app.esc(f)}</option>`).join("")}</select></label>`;
    };
    app.lb101FontDisplay = function lb101FontDisplay() {
      const d = app.D.fontDisplay || app.D.globals?.font_display || "swap";
      return ["auto", "block", "swap", "fallback", "optional"].indexOf(d) >= 0 ? d : "swap";
    };
    app.lb101EditorWeights = [300, 400, 500, 600, 700, 800, 900];
    app.lb101FontUrl = function lb101FontUrl(font, variants) {
      if (!font) return "";
      const display = app.lb101FontDisplay();
      const family = encodeURIComponent(font).replace(/%20/g, "+");
      let weights, italic;
      if (variants && (Array.isArray(variants.weights) || Array.isArray(variants.italic))) {
        weights = [...new Set((variants.weights || []).map(Number).filter((n) => n >= 100 && n <= 900))].sort((a, b) => a - b);
        italic = [...new Set((variants.italic || []).map(Number).filter((n) => n >= 100 && n <= 900))].sort((a, b) => a - b);
        if (!weights.length) weights = italic.length ? italic.slice() : [400];
      } else {
        weights = app.lb101EditorWeights.slice();
        italic = [];
      }
      let axis;
      if (italic.length) {
        const pairs = [];
        weights.forEach((w) => pairs.push("0," + w));
        italic.forEach((w) => pairs.push("1," + w));
        axis = ":ital,wght@" + [...new Set(pairs)].join(";");
      } else {
        axis = ":wght@" + weights.join(";");
      }
      return "https://fonts.googleapis.com/css2?family=" + family + axis + "&display=" + display;
    };
    app.lb101LoadEditorFont = function lb101LoadEditorFont(font, variants) {
      if (!font) return;
      const href = app.lb101FontUrl(font, variants);
      const id = "lb-google-font-" + font.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const apply = (doc) => {
        if (!doc) return;
        let link = doc.getElementById(id);
        if (link) {
          if (link.getAttribute("href") !== href) link.setAttribute("href", href);
          return;
        }
        link = doc.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        (doc.head || doc.documentElement).appendChild(link);
      };
      apply(document);
      const f = app.frameDoc();
      if (f) apply(f);
    };
    app.lb101CollectFonts = function lb101CollectFonts(nodes) {
      const usage = {};
      const take = (fam, w, style) => {
        if (typeof fam !== "string" || !fam || /[,\"']/.test(fam) || fam.indexOf("{{") !== -1) return;
        if (!usage[fam]) usage[fam] = { weights: [], italic: [] };
        const n = String(w || "").toLowerCase();
        let weight = 0;
        if (n === "normal") weight = 400;
        else if (n === "bold" || n === "bolder") weight = 700;
        else if (n === "lighter") weight = 300;
        else if (/^[1-9]00$/.test(n)) weight = Number(n);
        const ital = style === "italic" || style === "oblique";
        if (weight) {
          if (usage[fam].weights.indexOf(weight) < 0) usage[fam].weights.push(weight);
          if (ital && usage[fam].italic.indexOf(weight) < 0) usage[fam].italic.push(weight);
        } else if (ital) {
          if (usage[fam].weights.indexOf(400) < 0) usage[fam].weights.push(400);
          if (usage[fam].italic.indexOf(400) < 0) usage[fam].italic.push(400);
        }
      };
      const scan = (obj, depth) => {
        if (!obj || typeof obj !== "object" || depth > 16) return;
        if (typeof obj.font_family === "string") take(obj.font_family, obj.font_weight || obj.weight, obj.font_style);
        Object.keys(obj).forEach((k) => {
          if (k !== "font_family" && k !== "font_weight" && k !== "weight" && k !== "font_style" && obj[k] && typeof obj[k] === "object") scan(obj[k], depth + 1);
        });
      };
      (function walk(items) {
        (items || []).forEach((n) => {
          scan(n.settings || {}, 0);
          if (n.children) walk(n.children);
        });
      })(nodes || []);
      Object.keys(usage).forEach((fam) => {
        if (!usage[fam].weights.length && !usage[fam].italic.length) usage[fam].weights = [400];
      });
      return usage;
    };
    app.lb101ApplyFontsInFrame = function lb101ApplyFontsInFrame() {
      const f = app.frameDoc();
      if (!f) return;
      const usage = app.lb101CollectFonts(app.state.root);
      Object.keys(usage).forEach((fam) => app.lb101LoadEditorFont(fam, usage[fam]));
    };
    app.lb101OldBody = app.bodyHTML;
    app.bodyHTML = function(n) {
      if (n.type === "icon") {
        const s = n.settings || {};
        const size = app.resp(s.size ?? 32) || 32;
        const color = s.color || "#222222";
        const rot = Number(s.rotate || 0);
        const link = s.link ? `<a href="${app.esc(s.link)}" class="lb-icon-link" data-lb-editor-link="1">${app.lb101IconSvg(s.icon || "star")}</a>` : app.lb101IconSvg(s.icon || "star");
        return `<div class="lb-icon-glyph" style="font-size:${app.esc(size)}px;color:${app.esc(color)};text-align:${app.esc(s.align || "left")};transform:rotate(${rot}deg);transform-origin:center">${link}</div>`;
      }
      return app.lb101OldBody(n);
    };
    app.lb101OldControl = app.control;
    app.control = function(k, t3, v, label) {
      if (k === "icon" && app.lbCtrlType(t3) === "text") {
        return `<div class="lb-control lb-icon-control"><span>${app.esc(label || "Icon")}</span><button type="button" class="lb-icon-picker lb-icon-picker-visual" data-icon-picker="1" data-icon-key="${app.esc(k)}" title="Choose icon"><span class="lb-icon-picker-preview">${app.lb101IconSvg(v || "star")}</span><span class="lb-icon-picker-name">${app.esc(app.lb101IconTitle(v || "star"))}</span><span class="lb-icon-picker-arrow">\u2304</span></button></div>`;
      }
      return app.lb101OldControl(k, t3, v, label);
    };
    app.lb101OpenIconLibrary = function lb101OpenIconLibrary() {
      const key = app.lbPendingIconKey || "icon";
      app.lbPendingIconKey = null;
      app.lb101EnsureIcons().then(() => {
        const families = ["all", "solid", "regular", "brands"];
        const body = `<div class="lb-icon-library-toolbar"><input class="lb-modal-search" id="lb101-icon-search" placeholder="${app.t("Search icons\u2026")}"><select id="lb101-icon-family"><option value="all">All</option><option value="solid">Solid</option><option value="regular">Regular</option><option value="brands">Brands</option></select></div><div class="lb-icon-library-count" id="lb101-icon-count"></div><div class="lb-icon-grid lb-icon-grid-large" id="lb101-icon-grid">${app.lb101Icons.map((i) => `<button type="button" class="lb-icon-choice" data-icon-id="${app.esc(i.id)}" data-family="${app.esc(i.family || "custom")}" title="${app.esc(i.title)}">${app.lb101IconSvg(i.id)}<small>${app.esc(i.title)}</small></button>`).join("")}</div>`;
        app.showModal(app.t("Canvasly Icon Library"), body, () => {
          const filter = () => {
            const q = (app.$("#lb101-icon-search")?.value || "").toLowerCase();
            const fam = app.$("#lb101-icon-family")?.value || "all";
            let count = 0;
            app.$$("#lb101-icon-grid .lb-icon-choice").forEach((b) => {
              const ok = (!q || b.title.toLowerCase().includes(q)) && (fam === "all" || b.dataset.family === fam);
              b.hidden = !ok;
              if (ok) count++;
            });
            const c = app.$("#lb101-icon-count");
            if (c) c.textContent = count + " icons";
          };
          app.$("#lb101-icon-search")?.addEventListener("input", filter);
          app.$("#lb101-icon-family")?.addEventListener("change", filter);
          filter();
          app.$$("#lb101-icon-grid [data-icon-id]").forEach((b) => b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (app.selected) app.update(key, b.dataset.iconId);
            app.closeModal();
          });
        });
      });
    };
    app.openIconLibrary = app.lb101OpenIconLibrary;
    app.lb101OldUnitPanel = app.unitPanel;
    app.unitPanel = function() {
      const q = app.unitSearch.trim().toLowerCase();
      let list = (app.D.units || []).filter((e) => (app.unitInCategory ? app.unitInCategory(e) : app.category === "all" || e.category === app.category) && (!q || [e.title, e.type, e.category, ...e.keywords || []].join(" ").toLowerCase().includes(q)));
      list.sort((a, b) => app.fav.has(b.type) - app.fav.has(a.type) || a.title.localeCompare(b.title));
      if (!list.length) return '<div class="lb-no-results">' + app.t("No units found.") + "</div>";
      const groups = {};
      list.forEach((e) => {
        const g = app.unitGroup ? app.unitGroup(e) : e.category || "basic";
        (groups[g] || (groups[g] = [])).push(e);
      });
      const keys = app.unitGroupOrder ? app.unitGroupOrder(Object.keys(groups)) : Object.keys(groups);
      return keys.map((c) => {
        const a = groups[c];
        const label = c === "pro" ? "PRO" : c;
        return `<div class="lb-unit-group${c === "pro" ? " lb-unit-group-pro" : ""}"><h4>${app.esc(label)} ${a.some((e) => app.fav.has(e.type)) ? "<span>\u2605 " + app.t("Favorites") + "</span>" : ""}</h4><div class="lb-unit-grid">${a.map((e) => {
          const ico = e.type === "icon" ? app.lb101IconSvg("star", "lb-unit-svg-icon") : app.esc(e.icon || "\u25A1");
          return `<button class="lb-unit-card ${app.fav.has(e.type) ? "is-favorite" : ""}" draggable="true" data-type="${app.esc(e.type)}" title="${app.esc(e.title)}" data-lb-hint="${app.esc(app.t("Double-click to add"))}"><span class="lb-icon" aria-hidden="true">${ico}</span><span>${app.esc(e.title)}</span><b class="lb-fav" data-fav="${app.esc(e.type)}" title="${app.t("Favorite")}">${app.fav.has(e.type) ? "\u2605" : "\u2606"}</b></button>`;
        }).join("")}</div></div>`;
      }).join("");
    };
    app.lb101OldDesignSection = app.lb010DesignSection;
    app.lb010DesignSection = function(n) {
      const s = n.settings || {};
      return app.lb09Section(app.t("Typography & Design"), app.lb010ResponsiveTriple("font_size", "Font Size", s, "text") + app.lb101FontSelect(s.font_family || "") + app.lb09Select("font_weight", app.t("Font Weight"), s.font_weight || s.weight || "", ["", "300", "400", "500", "600", "700", "800", "900"]) + app.lb09Select("font_style", app.t("Font Style"), s.font_style || "", ["", "normal", "italic", "oblique"]) + app.lb09Select("text_transform", app.t("Text Transform"), s.text_transform || "", ["", "none", "uppercase", "lowercase", "capitalize"]) + app.lb09Select("text_decoration", app.t("Text Decoration"), s.text_decoration || "", ["", "none", "underline", "line-through"]) + app.lb010ResponsiveTriple("line_height", "Line Height", s, "text") + app.lb010ResponsiveTriple("letter_spacing", "Letter Spacing", s, "text") + app.control("text_shadow", "text_shadow", s.text_shadow || {}, app.t("Text Shadow")) + app.control("background", "background", typeof s.background === "object" ? s.background : {}, app.t("Background")) + app.lb09Select("background_clip", app.t("Background Clip"), s.background_clip || "", ["", "border-box", "padding-box", "text"]) + app.control("filter", "css_filter", s.filter || {}, app.t("Filter")) + app.control("transform", "transform", s.transform || {}, app.t("Transform")), true);
    };
    app.lb101OldBind = app.lb010BindFeatureUI;
    app.lb010BindFeatureUI = function() {
      app.lb101OldBind();
      const load = () => {
        const sel2 = app.root.querySelector('[data-setting="font_family"]');
        const fam = sel2 && sel2.value;
        if (fam) app.lb101LoadEditorFont(fam);
      };
      app.root.querySelectorAll('[data-setting="font_family"],[data-setting="font_weight"],[data-setting="weight"],[data-setting="font_style"]').forEach((x) => x.addEventListener("change", load));
    };
    Promise.all([app.lb101EnsureIcons(), app.lb101EnsureFonts()]).then(() => {
      app.lb101ApplyFontsInFrame();
      app.render();
    });
    app.lb104FontOptions = function lb104FontOptions(current) {
      const fonts = Array.isArray(app.D.googleFonts) && app.D.googleFonts.length ? app.D.googleFonts : app.lb101GoogleFonts.length ? app.lb101GoogleFonts : [];
      const value = typeof current === "string" ? current : "";
      return '<option value="">Default</option>' + fonts.map((f) => `<option value="${app.esc(f)}" ${f === value ? "selected" : ""}>${app.esc(f)}</option>`).join("");
    };
    app.lb104MakeFontSelect = function lb104MakeFontSelect(field) {
      if (!field) return null;
      const current = field.tagName === "SELECT" ? field.value || "" : field.getAttribute("value") || field.value || "";
      if (field.tagName === "SELECT") {
        field.classList.add("lb-font-family-select");
        field.setAttribute("aria-label", "Font Family");
        field.innerHTML = app.lb104FontOptions(current);
        field.value = current;
        return field;
      }
      const select = document.createElement("select");
      select.className = "lb-font-family-select";
      select.setAttribute("data-setting", field.getAttribute("data-setting") || "font_family");
      select.setAttribute("aria-label", "Font Family");
      select.innerHTML = app.lb104FontOptions(current);
      select.value = current;
      field.replaceWith(select);
      return select;
    };
    app.lb104FixFontFamilyControls = function lb104FixFontFamilyControls() {
      const fields = [...document.querySelectorAll('#lb-editor [data-setting="font_family"], #lb-editor [data-setting$=".font_family"]')];
      fields.forEach((field) => {
        const select = app.lb104MakeFontSelect(field);
        if (!select) return;
        if (!select.dataset.lb104Bound) {
          select.dataset.lb104Bound = "1";
          select.addEventListener("change", () => {
            const path = select.getAttribute("data-setting") || "font_family";
            app.lb101LoadEditorFont(select.value);
            app.update(path, select.value || "");
          });
        }
      });
    };
    app.lb104OldRender = app.render;
    app.render = function() {
      app.lb104OldRender();
      app.lb104FixFontFamilyControls();
      requestAnimationFrame(app.lb104FixFontFamilyControls);
      setTimeout(app.lb104FixFontFamilyControls, 0);
    };
    app.lb104FixFontFamilyControls();
    Promise.resolve(app.lb101EnsureFonts()).then(() => {
      app.lb104FixFontFamilyControls();
    });
  }


export { installDesignSystem };
