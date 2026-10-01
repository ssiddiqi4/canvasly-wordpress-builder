import { app } from "./app.js";
import { brandIconSvg } from "./brand-icons.js";
  function installWidgetDepth() {
    (function() {
      const HOVER = ["", "zoom", "grow", "shrink", "lift", "sink", "fade", "rotate", "float", "pulse", "skew", "wobble", "buzz"];
      const LCR = ["left", "center", "right"], TITLE = ["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"], TARGET = ["_self", "_blank"], VIEW = ["default", "stacked", "framed"], SHAPE = ["circle", "rounded", "square"];
      const SIZES = ["thumbnail", "medium", "medium_large", "large", "1536x1536", "2048x2048", "full"], WEIGHT = ["", "100", "200", "300", "400", "500", "600", "700", "800", "900"], CAPTION = ["none", "title", "caption", "description"];
      const SHAPES = ["", "wave", "tilt", "triangle", "curve", "arrow", "zigzag", "mountains"];
      const BLEND = ["", "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
      const widgetIds = () => (app.D.widgets || []).map((x) => x.id), sidebarIds = () => (app.D.sidebars || []).map((x) => x.id);
      const OPTIONS = {
        text: { align: ["left", "center", "right", "justify"], weight: WEIGHT, drop_cap_view: VIEW, text_columns: ["1", "2", "3", "4", "5", "6"] },
        accordion: { title_tag: TITLE, icon_position: ["left", "right"] },
        toggle: { title_tag: TITLE, icon_position: ["left", "right"] },
        tabs: { orientation: ["horizontal", "vertical"], tabs_align: ["start", "center", "end", "stretch"], title_tag: TITLE },
        alert: { type: ["info", "success", "warning", "danger"] },
        video: { source: ["youtube", "vimeo", "dailymotion", "videopress", "hosted"], preload: ["none", "metadata", "auto"], aspect_ratio: ["16:9", "21:9", "4:3", "3:2", "1:1", "9:16"] },
        counter: { separator_char: [",", ".", " ", "'"], title_tag: TITLE, title_position: ["before", "after"], align: LCR },
        progress: { title_tag: TITLE, bar_style: ["default", "info", "success", "warning", "danger"] },
        divider: { style: ["solid", "double", "dotted", "dashed", "wavy", "zigzag", "curly", "slashes", "squared", "multiple"], align: LCR, look: ["line", "line_text", "line_icon"], text_tag: TITLE, unit_align: LCR, icon_view: VIEW },
        icon_box: { icon_view: VIEW, shape: SHAPE, title_tag: TITLE, link_target: TARGET, box_layout: ["top", "left", "right"], content_align: LCR, vertical_align: ["top", "middle", "bottom"], hover_animation: HOVER },
        image_box: { image_size: SIZES, title_tag: TITLE, link_target: TARGET, box_layout: ["top", "left", "right"], content_align: LCR, vertical_align: ["top", "middle", "bottom"], hover_animation: HOVER },
        icon_list: { list_layout: ["traditional", "inline"], link_target: TARGET, icon_align: LCR, divider_style: ["solid", "double", "dotted", "dashed"] },
        social: { target: TARGET, shape: ["square", "rounded", "circle"], color_scheme: ["official", "custom"], align: LCR, hover_animation: HOVER },
        star_rating: { scale: ["5", "10"], unmarked_style: ["solid", "outline"], align: LCR },
        testimonial: { image_size: SIZES, image_position: ["aside", "top"], align: LCR, link_target: TARGET, name_tag: TITLE },
        gallery: { mode: ["single", "multiple"], gallery_layout: ["justified", "grid", "masonry"], link: ["none", "file", "attachment"], size: SIZES, caption: CAPTION, hover_animation: HOVER, caption_align: LCR, order_by: ["default", "random", "date", "title"], last_row: ["auto", "fit", "grow"] },
        carousel: { image_size: SIZES, navigation: ["both", "arrows", "dots", "none"], link: ["none", "file", "custom"], caption: CAPTION, effect: ["slide", "fade"], slide_direction: ["ltr", "rtl"], caption_align: LCR }
      };
      const lb28OldOptions = app.optionsFor;
      app.optionsFor = function(k) {
        if (k === "widget") return widgetIds();
        if (k === "sidebar") return sidebarIds();
        const r = app.selected && app.locate(app.state.root, app.selected), type = r && r.node && r.node.type, o = type && OPTIONS[type] && OPTIONS[type][k];
        if (o) return o;
        if (k === "hover_animation") return HOVER;
        if (k === "link_target") return TARGET;
        if (k === "title_tag" || k === "name_tag" || k === "text_tag") return TITLE;
        if (k === "weight") return WEIGHT;
        return lb28OldOptions(k);
      };
      const STYLE_RE = /(_color|_background|_size|_gap|_space|_spacing|_padding|_radius|_width|_height|_opacity|_weight|_indent|_style|_stretch|_shadow|_filter|_transform|_decoration)$|^(hover_|secondary_color|unmarked_color|space_between|unit_spacing|thickness|pattern_size|nav_width|overlay_color|overlay_opacity|overlay_blend_mode|shape_top|shape_bottom|dots_|arrows_|typography|caption_align|shadow|filter)/;
      const CONTENT_KEYS = /* @__PURE__ */ new Set(["image_size", "size", "dismiss_icon", "background_video", "background_video_poster"]);
      (app.D.units || []).forEach((e) => Object.keys(e.controls || {}).forEach((k) => {
        if (STYLE_RE.test(k) && !app.advancedKeys.has(k) && !CONTENT_KEYS.has(k)) app.styleKeys.add(k);
      }));
      const val = (x) => app.resp(x);
      const unit = (x, u = "px") => {
        x = val(x);
        if (x === "" || x == null) return "";
        const n = parseFloat(x);
        return isNaN(n) ? String(x) : /[a-z%]/i.test(String(x)) ? String(x) : n + u;
      };
      const vars = (o) => Object.entries(o).filter(([, x]) => x !== "" && x != null && x !== false).map(([k, x]) => k + ":" + app.esc(String(x))).join(";");
      const styleAttr = (o) => {
        const s = vars(o);
        return s ? ` style="${s}"` : "";
      };
      const typoCss = (v) => {
        if (!v || typeof v !== "object") return "";
        const map = { font_family: "font-family", font_size: "font-size", font_weight: "font-weight", font_style: "font-style", text_transform: "text-transform", text_decoration: "text-decoration", line_height: "line-height", letter_spacing: "letter-spacing" };
        return Object.keys(map).map((k) => {
          let x = val(v[k]);
          if (x === "" || x == null) return "";
          x = String(x);
          if (k === "font_family" && /\s/.test(x) && !/^["']/.test(x)) x = '"' + x.replace(/"/g, "") + '"';
          if ((k === "font_size" || k === "letter_spacing") && /^-?\d+(\.\d+)?$/.test(x)) x += "px";
          return map[k] + ":" + x;
        }).filter(Boolean).join(";");
      };
      const rows = (t3) => String(t3 || "").split(/\r?\n/).filter((l) => l.trim() !== "").map((l) => l.split("|").map((x) => x.trim()));
      const repeaterItems = (v, cols) => {
        if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object" && !Array.isArray(x));
        return rows(v).map((r) => {
          const o = {};
          (cols || []).forEach((k, i) => o[k] = r[i] || "");
          return o;
        });
      };
      const deepGet = (o, path) => {
        const a = String(path || "").split(".");
        let y = o;
        for (let i = 0; i < a.length; i++) {
          if (y == null) return;
          y = y[a[i]];
        }
        return y;
      };
      const deepSet = (o, path, v) => {
        const a = String(path).split(".");
        let y = o;
        for (let i = 0; i < a.length - 1; i++) {
          const k = a[i], next = a[i + 1];
          if (y[k] == null || typeof y[k] !== "object") y[k] = /^\d+$/.test(next) ? [] : {};
          y = y[k];
        }
        y[a[a.length - 1]] = v;
      };
      const pick = (x, allowed, fb) => allowed.includes(String(x ?? "")) ? String(x) : fb;
      const tagOf = (x, fb) => pick(String(x || "").toLowerCase(), TITLE, fb);
      const hover = (s) => s.hover_animation ? " lb-hover-" + app.esc(String(s.hover_animation).replace(/[^a-z0-9_-]/gi, "")) : "";
      const svg = (id, cls) => {
        try {
          return app.lb101IconSvg(id || "star", cls || "");
        } catch (e) {
          return "";
        }
      };
      const para = (t3) => {
        t3 = String(t3 || "");
        return /<(p|div|ul|ol|h\d|blockquote)\b/i.test(t3) ? t3 : "<p>" + t3.split(/\n{2,}/).join("</p><p>") + "</p>";
      };
      const iconVars = (s, sizeKey = "icon_size", colorKey = "icon_color") => ({ "--lb-icon-size": unit(s[sizeKey]), "--lb-icon-primary": s[colorKey] || "", "--lb-icon-secondary": s.secondary_color || "", "--lb-icon-hover-primary": s.hover_color || "", "--lb-icon-hover-secondary": s.hover_secondary_color || "", "--lb-icon-padding": unit(s.icon_padding), "--lb-icon-border": unit(s.icon_border_width), "--lb-icon-radius": unit(s.icon_radius), "--lb-icon-rotate": unit(s.rotate, "deg") });
      const attCache = {};
      let attPending = {};
      function attUrl(id, size) {
        id = parseInt(id, 10);
        if (!id) return "";
        const hit = attCache[id];
        if (hit) return size && hit.sizes && hit.sizes[size] && hit.sizes[size].url || hit.url || "";
        fetchAtt(id);
        return "";
      }
      function wpMediaBase() {
        const rest = String(app.D.wpRest || "").replace(/\/$/, "");
        if (rest) return rest;
        return String(app.D.api || "").replace(/canvasly-lite\/v1\/?$/, "wp/v2");
      }
      function fetchRestAtt(id) {
        return fetch(wpMediaBase() + "/media/" + id + "?context=edit", { headers: { "X-WP-Nonce": app.D.nonce } }).then((r) => {
          if (!r.ok) throw 0;
          return r.json();
        }).then((j) => {
          const sizes = {};
          const md = j.media_details && j.media_details.sizes || {};
          Object.keys(md).forEach((k) => {
            if (md[k] && md[k].source_url) sizes[k] = { url: md[k].source_url, width: md[k].width, height: md[k].height };
          });
          return { id: j.id, url: j.source_url || "", sizes, width: j.media_details && j.media_details.width, height: j.media_details && j.media_details.height, title: j.title && j.title.rendered || "", alt: j.alt_text || "", caption: j.caption && j.caption.rendered || "", description: j.description && j.description.rendered || "" };
        });
      }
      function fetchAtt(id) {
        id = parseInt(id, 10);
        if (!id || attPending[id]) return;
        attPending[id] = true;
        const done = (hit) => {
          attCache[id] = hit;
          delete attPending[id];
          patchAtt(id);
        };
        const fail = () => {
          delete attPending[id];
        };
        try {
          if (window.wp && wp.media && wp.media.attachment) {
            const a = wp.media.attachment(id);
            a.fetch().then(() => done(a.toJSON())).catch(() => fetchRestAtt(id).then(done).catch(fail));
            return;
          }
        } catch (e) {
        }
        fetchRestAtt(id).then(done).catch(fail);
      }
      function persistGalleryAtt(id, hit) {
        const url = hit.sizes && (hit.sizes.medium && hit.sizes.medium.url || hit.sizes.large && hit.sizes.large.url || hit.sizes.thumbnail && hit.sizes.thumbnail.url) || hit.url || "";
        if (!url) return;
        const walk = (nodes) => (nodes || []).forEach((n) => {
          if (n && n.type === "gallery") {
            const s = n.settings = n.settings || {};
            s.media_urls = Object.assign({}, s.media_urls && typeof s.media_urls === "object" ? s.media_urls : {});
            s.media_urls[id] = url;
            if (hit.width && hit.height) {
              s.media_ratios = Object.assign({}, s.media_ratios && typeof s.media_ratios === "object" ? s.media_ratios : {});
              s.media_ratios[id] = hit.width / hit.height;
            }
          }
          if (n && n.children) walk(n.children);
        });
        walk(app.state.root);
      }
      function patchAtt(id) {
        const hit = attCache[id];
        if (!hit) return;
        persistGalleryAtt(id, hit);
        const apply = (doc) => doc && doc.querySelectorAll(`[data-lb28-att="${id}"]`).forEach((el) => {
          const size = el.dataset.lb28Size, u = size && hit.sizes && hit.sizes[size] && hit.sizes[size].url || hit.url;
          if (!u) return;
          if (el.tagName === "IMG") {
            el.src = u;
            el.classList.remove("lb28-att-loading");
          } else el.style.backgroundImage = `url(${u})`;
        });
        apply(document);
        apply(app.frameDoc());
      }
      const attImg = (id, size, cls, alt) => {
        const u = attUrl(id, size);
        return `<img class="${app.esc(cls || "")}${u ? "" : " lb28-att-loading"}" data-lb28-att="${app.esc(id)}" data-lb28-size="${app.esc(size || "")}" src="${app.esc(u || "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22><rect width=%22400%22 height=%22300%22 fill=%22%23e5e8ec%22/></svg>")}" alt="${app.esc(alt || "")}" loading="lazy">`;
      };
      const mediaUrl = (id, url, size) => url || attUrl(id, size);
      let iconKey = null;
      const lb28OldControl = app.control;
      app.control = function(k, t3, v, label) {
        const l = label || app.lbCtrlDef(t3).label || k.replace(/_/g, " "), type = app.lbCtrlType(t3);
        if (/_url$/.test(k) && type === "url") {
          const idKey = k.replace(/_url$/, "_id"), r = app.selected && app.locate(app.state.root, app.selected), c = r && app.meta(r.node.type).controls;
          if (c && app.lbCtrlType(c[idKey]) === "media") return "";
        }
        if (type === "repeater") return lb28OldControl(k, t3, v, label);
        if (type === "icon") return `<div class="lb-control lb-icon-control"><span>${app.esc(l)}</span><button type="button" class="lb-icon-picker lb-icon-picker-visual" data-icon-picker="1" data-icon-key="${app.esc(k)}" title="Choose icon"><span class="lb-icon-picker-preview">${svg(v || "star")}</span><span class="lb-icon-picker-name">${app.esc(typeof app.lb101IconTitle === "function" ? app.lb101IconTitle(v || "star") : v || "star")}</span><span class="lb-icon-picker-arrow">\u2304</span></button></div>`;
        if (type === "media") {
          const def = app.lbCtrlDef(t3), id = parseInt(v, 10) || 0, urlKey = k.replace(/_id$/, "_url"), s = app.selected && app.locate(app.state.root, app.selected)?.node?.settings || {}, url = deepGet(s, urlKey) || attUrl(id, "thumbnail"), lib = Array.isArray(def.media_types) ? def.media_types.join(",") : def.media_types || "image", video = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(String(url || "")), label2 = lib === "video" ? app.t("Choose video") : String(lib).indexOf("video") >= 0 ? app.t("Choose image or video") : app.t("Choose image");
          return `<div class="lb-control lb32-media"><span>${app.esc(l)}</span><div class="lb32-media-row"><button type="button" class="lb32-media-preview lb-media-open" data-media-key="${app.esc(k)}" data-media-library="${app.esc(lib)}" title="${app.esc(label2)}">${id || url ? video ? `<span>${app.esc(app.t("Video"))}</span>` : `<img src="${app.esc(url)}" alt="" data-lb28-att="${app.esc(id)}" data-lb28-size="thumbnail">` : "<span>" + app.esc(label2) + "</span>"}</button><input data-setting="${app.esc(k)}" type="hidden" value="${app.esc(id || 0)}">${id || url ? `<button type="button" class="lb-btn lb28-media-clear" data-media-key="${app.esc(k)}">${app.t("Remove")}</button>` : ""}</div></div>`;
        }
        if (type === "select" && (k === "widget" || k === "sidebar")) {
          const list = k === "widget" ? app.D.widgets || [] : app.D.sidebars || [];
          return `<label class="lb-control"><span>${app.esc(l)}</span><select data-setting="${app.esc(k)}"><option value="">\u2014 ${k === "widget" ? "Choose a widget" : "Choose a sidebar"} \u2014</option>${list.map((x) => `<option value="${app.esc(x.id)}" ${String(x.id) === String(v) ? "selected" : ""}>${app.esc(x.name || x.id)}</option>`).join("")}</select></label>`;
        }
        if (type === "select" && k === "menu") {
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r || r.node.type === "menu_anchor" || r.node.type === "site_nav") return app.menuAnchorSelect(k, l, v);
        }
        return lb28OldControl(k, t3, v, label);
      };
      const lb28OldUpdate = app.update;
      app.update = function(path, v) {
        if (path === "icon" && iconKey && iconKey !== "icon") {
          path = iconKey;
        }
        if (path === iconKey || path === "icon") iconKey = null;
        return lb28OldUpdate(path, v);
      };
      const lb28OldCloseModal = app.closeModal;
      app.closeModal = function() {
        iconKey = null;
        return lb28OldCloseModal();
      };
      function openMediaFor(key) {
        if (!window.wp || !wp.media || !app.selected) return;
        const f = wp.media({ title: app.t("Select Image"), button: { text: app.t("Use Image") }, multiple: false, library: { type: "image" } });
        f.on("select", () => {
          const a = f.state().get("selection").first().toJSON(), r = app.locate(app.state.root, app.selected);
          if (!r) return;
          app.commit();
          attCache[a.id] = a;
          deepSet(r.node.settings, key, a.id);
          const urlKey = key.replace(/_id$/, "_url");
          if (urlKey !== key) deepSet(r.node.settings, urlKey, a.sizes && a.sizes.medium && a.sizes.medium.url || a.url || "");
          if (key === "image_id" && !r.node.settings.alt) r.node.settings.alt = a.alt || "";
          app.render();
        });
        f.open();
      }
      function bindControls() {
        app.root.querySelectorAll("[data-icon-picker]").forEach((b) => {
          b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = b.dataset.iconKey || "icon";
            iconKey = next;
            app.lbPendingIconKey = next;
            app.openIconLibrary();
          };
        });
        app.root.querySelectorAll(".lb-media-open").forEach((b) => {
          b.onclick = (e) => {
            e.preventDefault();
            openMediaFor(b.dataset.mediaKey || "image_id");
          };
        });
        app.root.querySelectorAll(".lb28-media-clear[data-media-key]").forEach((b) => {
          b.onclick = (e) => {
            e.preventDefault();
            const r = app.selected && app.locate(app.state.root, app.selected);
            if (!r) return;
            app.commit();
            const k = b.dataset.mediaKey;
            deepSet(r.node.settings, k, 0);
            const urlKey = k.replace(/_id$/, "_url");
            if (urlKey !== k) deepSet(r.node.settings, urlKey, "");
            app.render();
          };
        });
      }
      app.openGallery = function() {
        if (!window.wp || !wp.media || !app.selected) return;
        const r = app.locate(app.state.root, app.selected);
        if (!r) return;
        const f = wp.media({ title: app.t("Select Gallery Images"), button: { text: app.t("Use Images") }, multiple: true, library: { type: "image" } });
        f.on("select", () => {
          const items = app.mediaSelectionItems(f), ids = items.map((x) => x.id).filter(Boolean);
          items.forEach((j) => {
            if (j && j.id) attCache[j.id] = j;
          });
          app.commit();
          app.rememberGalleryUrls(r.node.settings, items);
          if ((r.node.settings.mode || "single") === "multiple") {
            const list = Array.isArray(r.node.settings.collections) ? r.node.settings.collections.slice() : [];
            if (!list.length) list.push({ label: app.t("Gallery 1"), ids: "" });
            list[0] = Object.assign({}, list[0], { ids: ids.join(",") });
            r.node.settings.collections = list;
            app.persistGalleryIds(r.node.settings);
          } else r.node.settings.ids = ids.join(",");
          app.render();
        });
        f.open();
      };
      function migrate(nodes) {
        (nodes || []).forEach((n) => {
          const s = n.settings || (n.settings = {});
          if ((n.type === "accordion" || n.type === "toggle") && (s.items == null || s.items === "") && (s.title || s.text)) {
            s.items = String(s.title || "Item").replace(/\|/g, "/") + "|" + String(s.text || "").replace(/\r?\n/g, " ");
            s.first_open = s.open != null ? !!s.open : true;
            delete s.title;
            delete s.text;
            delete s.open;
          }
          if (n.type === "tabs" && s.active == null && s.tabs) s.active = 0;
          if (n.type === "gallery" && !s.gallery_layout_set) {
            if (!s.gallery_layout || s.gallery_layout === "grid") s.gallery_layout = "justified";
            s.gallery_layout_set = true;
          }
          const pipe = { accordion: ["items", ["title", "content"]], toggle: ["items", ["title", "content"]], tabs: ["tabs", ["title", "content"]], icon_list: ["items", ["text", "icon", "url"]], social: ["links", ["network", "url", "icon"]], price_table: ["features", ["text", "icon"]], form: ["fields", ["label", "type", "required", "placeholder"]] };
          const spec = pipe[n.type];
          if (spec && typeof s[spec[0]] === "string") {
            s[spec[0]] = rows(s[spec[0]]).map((r) => {
              const o = { _id: "r_" + Math.random().toString(36).slice(2, 10) };
              spec[1].forEach((k, i) => {
                let x = r[i] || "";
                if (k === "required") x = x === "required" || x === "1" || x === "true";
                o[k] = x;
              });
              return o;
            });
          }
          if (n.type === "testimonial" && !Array.isArray(s.items) && (s.quote || s.author || s.image_id)) {
            s.items = [{ _id: "r_" + Math.random().toString(36).slice(2, 10), quote: s.quote || "", author: s.author || "", role: s.role || "", image_id: s.image_id || 0, image_url: s.image_url || "", link: s.link || "", link_target: s.link_target || "_self" }];
          }
          if (n.type === "carousel" && typeof s.link === "string" && /^https?:\/\/(none|file|custom)\/?$/i.test(s.link)) s.link = s.link.replace(/^https?:\/\/|\/$/gi, "").toLowerCase();
          if (n.type === "carousel" && !Array.isArray(s.slides)) {
            const ids = String(s.ids || "").split(/[,\s]+/).filter(Boolean), urls = String(s.custom_urls || "").split(/\r?\n/);
            s.slides = ids.map((id, i) => ({ _id: "r_sl" + i, image_id: parseInt(id, 10) || 0, caption: "", link: String(urls[i] || "").trim(), alt: "" }));
          }
          migrate(n.children);
        });
      }
      const lb28OldBody = app.bodyHTML;
      app.bodyHTML = function(n) {
        const s = n.settings || {}, t3 = n.type;
        switch (t3) {
          case "heading": {
            const preset = pick(s.size_preset, ["default", "small", "medium", "large", "xl", "xxl"], "default");
            return `<div class="lb-heading-wrap lb-heading-size-${preset}${s.link ? " lb-heading-linked" : ""}"${styleAttr({ "--lb-heading-hover": s.hover_color || "", "text-align": val(s.align) || "" })}>${lb28OldBody(n)}</div>`;
          }
          case "text": {
            const cols = Math.max(1, Math.min(10, parseInt(val(s.text_columns) || 1, 10) || 1)), view = pick(s.drop_cap_view, VIEW, "default");
            const cls = "lb-text-wrap" + (cols > 1 ? " lb-text-columns" : "") + (s.drop_cap ? " lb-text-drop-cap lb-drop-cap-" + view : "");
            return `<div class="${cls}"${styleAttr({ "--lb-text-columns": cols > 1 ? cols : "", "--lb-text-column-gap": unit(s.column_gap), "--lb-paragraph-spacing": unit(s.paragraph_spacing), "--lb-link-color": s.link_color || "", "--lb-link-hover": s.link_hover_color || "", "--lb-text-hover": s.hover_color || "", "--lb-drop-cap-color": s.drop_cap_color || "", "--lb-drop-cap-secondary": s.drop_cap_secondary_color || "", "--lb-drop-cap-size": unit(s.drop_cap_size), "--lb-drop-cap-space": unit(s.drop_cap_space), "--lb-drop-cap-radius": unit(s.drop_cap_radius), "--lb-drop-cap-border": unit(s.drop_cap_border_width), "text-align": val(s.align) || "" })}>${lb28OldBody(n)}</div>`;
          }
          case "button": {
            const size = pick(s.size, ["xs", "small", "medium", "large", "xl"], "medium"), align = pick(val(s.align), ["left", "center", "right", "justify"], "left"), place = s.icon_placement === "after" ? "after" : "before", btype = pick(s.button_type, ["default", "info", "success", "warning", "danger"], "default");
            const icon2 = s.icon ? `<span class="lb-button-icon lb-button-icon-${place}" aria-hidden="true">${svg(s.icon)}</span>` : "";
            const label = `<span class="lb-button-text" data-inline="text">${s.text || "Click Here"}</span>`;
            const st = app.styleInline(n);
            return `<div class="lb-button-wrap lb-button-align-${align}"><a class="lb-button lb-button-${size} lb-button-type-${btype}${icon2 ? " lb-button-has-icon" : ""}${hover(s)} lb-editor-button" href="${app.esc(s.url || "#")}" data-lb-editor-link="1" data-link-url="${app.esc(s.url || "")}" data-link-target="${app.esc(s.target || "_self")}" style="${st};${vars({ "--lb-button-icon-gap": unit(s.icon_spacing), "--lb-button-hover-border": s.hover_border_color || "", "--lb-button-hover-bg": s.hover_background || "", "--lb-button-hover-color": s.hover_text_color || "", "--lb-btn-radius": unit(s.button_radius), "border-radius": unit(s.button_radius) })}">${place === "before" ? icon2 + label : label + icon2}</a></div>`;
          }
          case "divider": {
            const style2 = pick(s.style, OPTIONS.divider.style, "solid"), align = pick(s.align, LCR, "center"), look = pick(s.look, ["line", "line_text", "line_icon"], "line"), ealign = pick(s.unit_align, LCR, "center"), view = pick(s.icon_view, VIEW, "default");
            const line = '<span class="lb-divider-line" aria-hidden="true"></span>';
            let el = "";
            if (look === "line_text" && s.text) el = `<${tagOf(s.text_tag, "span")} class="lb-divider-text" data-inline="text">${app.esc(s.text)}</${tagOf(s.text_tag, "span")}>`;
            else if (look === "line_icon") el = `<span class="lb-divider-icon lb-icon-view-${view}">${svg(s.icon || "star")}</span>`;
            return `<div class="lb-divider lb-divider-${style2} lb-divider-align-${align} lb-divider-look-${look.replace("_", "-")} lb-divider-unit-${ealign}"${styleAttr({ "--lb-divider-width": s.divider_width || "100%", "--lb-divider-color": s.color || "", "--lb-divider-weight": unit(Math.max(1, parseFloat(s.thickness) || 1)), "--lb-divider-gap": unit(s.divider_gap), "--lb-divider-pattern": unit(s.pattern_size), "--lb-divider-spacing": unit(s.unit_spacing), "--lb-divider-text-color": s.text_color || "", "--lb-divider-icon-color": s.icon_color || "", "--lb-divider-icon-size": unit(s.icon_size) })}>${line}${el ? el + line : ""}</div>`;
          }
          case "icon": {
            const view = pick(s.icon_view, VIEW, "default"), shape = pick(s.shape, SHAPE, "circle"), align = pick(val(s.align), LCR, "center");
            const glyph = s.link ? `<a class="lb-icon-glyph${hover(s)}" href="${app.esc(s.link)}" data-lb-editor-link="1">${svg(s.icon || "star")}</a>` : `<span class="lb-icon-glyph${hover(s)}">${svg(s.icon || "star")}</span>`;
            return `<div class="lb-icon-wrap lb-icon-view-${view} lb-icon-shape-${shape}"${styleAttr(Object.assign(iconVars(s, "size", "color"), { "text-align": align }))}>${glyph}</div>`;
          }
          case "icon_box": {
            const view = pick(s.icon_view, VIEW, "default"), shape = pick(s.shape, SHAPE, "circle"), layout = pick(s.box_layout, ["top", "left", "right"], "top"), align = pick(s.content_align, LCR, "center"), valign = pick(s.vertical_align, ["top", "middle", "bottom"], "top"), tag = tagOf(s.title_tag, "h3");
            const glyph = `<span class="lb-icon-glyph${hover(s)}">${svg(s.icon || "star")}</span>`;
            const title = s.title ? `<${tag} class="lb-icon-box-title">${s.link ? `<a href="${app.esc(s.link)}" data-lb-editor-link="1">${app.esc(s.title)}</a>` : app.esc(s.title)}</${tag}>` : "";
            return `<div class="lb-icon-box lb-icon-box-${layout} lb-icon-box-align-${align} lb-icon-box-valign-${valign} lb-icon-view-${view} lb-icon-shape-${shape}"${styleAttr(Object.assign(iconVars(s), { "--lb-box-icon-space": unit(s.icon_space), "--lb-box-title-space": unit(s.title_space), "--lb-box-title-color": s.title_color || "", "--lb-box-title-hover": s.title_hover_color || "", "--lb-box-text-color": s.text_color || "" }))}><div class="lb-icon-box-icon">${glyph}</div><div class="lb-icon-box-content">${title}${s.text ? `<div class="lb-icon-box-text">${s.text}</div>` : ""}</div></div>`;
          }
          case "image_box": {
            const layout = pick(s.box_layout, ["top", "left", "right"], "top"), align = pick(s.content_align, LCR, "center"), valign = pick(s.vertical_align, ["top", "middle", "bottom"], "top"), tag = tagOf(s.title_tag, "h3");
            const u = mediaUrl(s.image_id, s.image_url, s.image_size || "large");
            const img = u || s.image_id ? attImgOrUrl(s.image_id, u, s.image_size || "large", "lb-image-box-img" + hover(s), s.alt) : '<span class="lb-image-placeholder">Choose an image</span>';
            const title = s.title ? `<${tag} class="lb-image-box-title">${s.link ? `<a href="${app.esc(s.link)}" data-lb-editor-link="1">${app.esc(s.title)}</a>` : app.esc(s.title)}</${tag}>` : "";
            return `<div class="lb-image-box lb-image-box-${layout} lb-image-box-align-${align} lb-image-box-valign-${valign}"${styleAttr({ "--lb-box-image-width": s.image_width || "", "--lb-box-image-space": unit(s.image_space), "--lb-box-title-space": unit(s.title_space), "--lb-box-image-radius": unit(s.image_radius), "--lb-box-image-opacity": s.image_opacity || "", "--lb-box-image-hover-opacity": s.image_hover_opacity || "", "--lb-box-title-color": s.title_color || "", "--lb-box-title-hover": s.title_hover_color || "", "--lb-box-text-color": s.text_color || "" })}><figure class="lb-image-box-figure">${img}</figure><div class="lb-image-box-content">${title}${s.text ? `<div class="lb-image-box-text">${s.text}</div>` : ""}</div></div>`;
          }
          case "icon_list": {
            const layout = s.list_layout === "inline" ? "inline" : "traditional", align = pick(s.icon_align, LCR, "left"), dstyle = pick(s.divider_style, ["solid", "double", "dotted", "dashed"], "solid");
            const items = repeaterItems(s.items, ["text", "icon", "url"]).map((r) => {
              const text = r.text || "", icon2 = r.icon || s.icon || "check", url = r.url || "";
              const inner = `<span class="lb-icon-list-icon" aria-hidden="true">${svg(icon2)}</span><span class="lb-icon-list-text">${text}</span>`;
              return `<li class="lb-icon-list-item">${url ? `<a href="${app.esc(url)}" data-lb-editor-link="1">${inner}</a>` : inner}</li>`;
            }).join("");
            return `<ul class="lb-icon-list lb-icon-list-${layout} lb-icon-list-align-${align}${s.divider ? " lb-icon-list-divided" : ""}"${styleAttr({ "--lb-list-gap": unit(s.space_between), "--lb-list-icon-size": unit(s.icon_size), "--lb-list-icon-color": s.icon_color || s.color || "", "--lb-list-icon-hover": s.icon_hover_color || "", "--lb-list-text-color": s.text_color || "", "--lb-list-text-hover": s.text_hover_color || "", "--lb-list-indent": unit(s.text_indent), "--lb-list-divider-style": dstyle, "--lb-list-divider-weight": unit(s.divider_weight), "--lb-list-divider-color": s.divider_color || "", "--lb-list-divider-width": s.divider_width || "" })}>${items || '<li class="lb-icon-list-item"><span class="lb-icon-list-text">Add list items</span></li>'}</ul>`;
          }
          case "social": {
            const shape = pick(s.shape, ["square", "rounded", "circle"], "rounded"), scheme = s.color_scheme === "custom" ? "custom" : "official", align = pick(s.align, LCR, "left"), cols = Math.max(0, parseInt(s.columns, 10) || 0);
            const items = repeaterItems(s.links, ["network", "url", "icon"]).map((r) => {
              const label = r.network || "", url = r.url || "#", [net, icon2, brand] = detectNetwork(label, url);
              return `<a class="lb-social-item lb-social-${app.esc(net)}${hover(s)}" href="${app.esc(url)}" data-lb-editor-link="1" aria-label="${app.esc(label || net)}"${scheme === "official" ? ` style="--lb-social-brand:${app.esc(brand)}"` : ""}>${r.icon ? svg(r.icon) : brandIconSvg(net) || svg(icon2)}<span class="lb-sr-only">${app.esc(label)}</span></a>`;
            }).join("");
            return `<div class="lb-social lb-social-${shape} lb-social-${scheme}${cols ? " lb-social-grid" : ""}"${styleAttr({ "--lb-social-size": unit(s.size), "--lb-social-padding": unit(s.icon_padding), "--lb-social-gap": unit(s.gap), "--lb-social-row-gap": unit(s.row_gap), "--lb-social-radius": unit(s.icon_radius), "--lb-social-bg": scheme === "custom" ? s.color || "" : "", "--lb-social-color": s.icon_color || "", "--lb-social-hover-bg": s.hover_color || "", "--lb-social-hover-color": s.hover_icon_color || "", "--lb-social-cols": cols || "", "justify-content": align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center" })}>${items || '<span class="lb-embed-placeholder">Add social icons</span>'}</div>`;
          }
          case "star_rating": {
            const max = String(s.scale) === "10" ? 10 : 5, rating = Math.max(0, Math.min(max, parseFloat(s.rating) || 0)), align = pick(s.align, LCR, "left"), unmarked = s.unmarked_style === "outline" ? "outline" : "solid";
            const star = (cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 L14.76 8.2 L22.46 8.6 L16.47 13.45 L18.47 20.9 L12 16.7 L5.53 20.9 L7.53 13.45 L1.54 8.6 L9.24 8.2 Z"/></svg>`;
            let stars = "";
            for (let i = 0; i < max; i++) {
              const fill = Math.max(0, Math.min(1, rating - i));
              stars += `<span class="lb-star" style="--lb-star-fill:${Math.round(fill * 100)}%">${star("lb-star-base")}${star("lb-star-fill")}</span>`;
            }
            return `<div class="lb-star-rating lb-star-rating-${align} lb-star-unmarked-${unmarked}"${styleAttr({ "--lb-star-size": unit(s.size), "--lb-star-gap": unit(s.star_gap), "--lb-star-color": s.color || "", "--lb-star-unmarked": s.unmarked_color || "", "--lb-star-title-color": s.title_color || "", "--lb-star-title-gap": unit(s.title_gap) })}>${s.title ? `<span class="lb-star-rating-title">${app.esc(s.title)}</span>` : ""}<span class="lb-stars">${stars}</span></div>`;
          }
          case "testimonial": {
            const pos = s.image_position === "top" ? "top" : "aside", align = pick(s.align, LCR, "center"), tag = tagOf(s.name_tag, "div");
            const people = repeaterItems(s.items, ["quote", "author", "role"]);
            const one = people[0] || { quote: s.quote || "", author: s.author || "", role: s.role || "", image_id: s.image_id, image_url: s.image_url };
            const card = (it) => {
              const u = mediaUrl(it.image_id, it.image_url, s.image_size || "thumbnail");
              const img = u || it.image_id ? `<div class="lb-testimonial-image">${attImgOrUrl(it.image_id, u, s.image_size || "thumbnail", "", it.author)}</div>` : "";
              return `<figure class="lb-testimonial lb-testimonial-image-${pos} lb-testimonial-align-${align}">${it.quote ? `<blockquote class="lb-testimonial-quote">${it.quote}</blockquote>` : ""}<figcaption class="lb-testimonial-meta">${img}<div class="lb-testimonial-details">${it.author ? `<${tag} class="lb-testimonial-name">${app.esc(it.author)}</${tag}>` : ""}${it.role ? `<div class="lb-testimonial-role">${app.esc(it.role)}</div>` : ""}</div></figcaption></figure>`;
            };
            const wrap = styleAttr({ "--lb-testimonial-quote-color": s.quote_color || "", "--lb-testimonial-name-color": s.name_color || "", "--lb-testimonial-role-color": s.role_color || "", "--lb-testimonial-image-width": unit(s.image_width), "--lb-testimonial-image-radius": unit(s.image_radius) });
            return people.length > 1 ? `<div class="lb-testimonial-list"${wrap}>${people.map(card).join("")}</div>` : `<div${wrap}>${card(one)}</div>`;
          }
          case "accordion":
          case "toggle": {
            const single = t3 === "accordion", tag = tagOf(s.title_tag, "div"), pos = s.icon_position === "left" ? "left" : "right";
            let list = repeaterItems(s.items, ["title", "content"]);
            if (!list.length && (s.title || s.text)) list = [{ title: s.title || "", content: s.text || "" }];
            const icon2 = `<span class="lb-collapse-icon" aria-hidden="true"><span class="lb-collapse-icon-closed">${svg(s.icon || (single ? "chevron-down" : "plus"))}</span><span class="lb-collapse-icon-opened">${svg(s.active_icon || (single ? "chevron-up" : "minus"))}</span></span>`;
            const items = list.map((r, i) => {
              const open = i === 0 && (s.first_open == null || s.first_open);
              return `<div class="lb-collapse-item${open ? " is-open" : ""}"><${tag} class="lb-collapse-title" role="button" aria-expanded="${open}">${pos === "left" ? icon2 : ""}<span class="lb-collapse-heading">${r.title || ""}</span>${pos === "right" ? icon2 : ""}</${tag}><div class="lb-collapse-content"${open ? "" : " hidden"}>${para(r.content || "")}</div></div>`;
            }).join("");
            return `<div class="${single ? "lb-accordion" : "lb-toggle"} lb-collapse lb-collapse-icon-${pos}" data-lb-collapse="${single ? "single" : "multi"}"${styleAttr({ "--lb-acc-title-color": s.title_color || "", "--lb-acc-active-color": s.active_color || "", "--lb-acc-title-bg": s.title_background || "", "--lb-acc-content-color": s.content_color || "", "--lb-acc-content-bg": s.content_background || "", "--lb-acc-icon-color": s.icon_color || "", "--lb-acc-icon-active-color": s.icon_active_color || "", "--lb-acc-border-color": s.border_color || "", "--lb-acc-border-width": unit(s.border_width), "--lb-acc-title-padding": s.title_padding || "", "--lb-acc-content-padding": s.content_padding || "", "--lb-acc-icon-space": unit(s.icon_space), "--lb-acc-gap": unit(s.space_between) })}>${items || '<div class="lb-embed-placeholder">Add items</div>'}</div>`;
          }
          case "tabs": {
            const list = repeaterItems(s.tabs, ["title", "content"]);
            if (!list.length) return '<div class="lb-embed-placeholder">Add tabs</div>';
            const active = Math.max(0, Math.min(list.length - 1, parseInt(s.active, 10) || 0)), vertical = s.orientation === "vertical", align = pick(s.tabs_align, ["start", "center", "end", "stretch"], "start"), tag = tagOf(s.title_tag, "div");
            const nav = list.map((r, i) => `<${tag} class="lb-tab-button${i === active ? " is-active" : ""}" role="tab" aria-selected="${i === active}">${r.title || ""}</${tag}>`).join(""), panels = list.map((r, i) => `<div class="lb-tab-panel" role="tabpanel"${i === active ? "" : " hidden"}>${para(r.content || "")}</div>`).join("");
            return `<div class="lb-tabs-widget lb-tabs-${vertical ? "vertical" : "horizontal"} lb-tabs-align-${align}" data-active="${active}"${styleAttr({ "--lb-tabs-nav-width": vertical ? s.nav_width || "25%" : "", "--lb-tab-color": s.tab_color || "", "--lb-tab-active-color": s.tab_active_color || "", "--lb-tab-bg": s.tab_background || "", "--lb-tab-active-bg": s.tab_active_background || "", "--lb-tab-content-color": s.content_color || "", "--lb-tab-content-bg": s.content_background || "", "--lb-tab-border-color": s.border_color || "", "--lb-tab-border-width": unit(s.border_width), "--lb-tab-padding": s.tab_padding || "", "--lb-tab-content-padding": s.content_padding || "" })}><div class="lb-tabs-nav" role="tablist">${nav}</div><div class="lb-tabs-panels">${panels}</div></div>`;
          }
          case "alert": {
            const type = pick(s.type, ["info", "success", "warning", "danger"], "info");
            return `<div class="lb-alert lb-alert-${type}" role="alert"${styleAttr({ "--lb-alert-bg": s.background || "", "--lb-alert-border": s.border_color || "", "--lb-alert-title": s.title_color || "", "--lb-alert-text": s.text_color || "", "--lb-alert-dismiss": s.dismiss_color || "", "--lb-alert-dismiss-size": unit(s.dismiss_size) })}>${s.title ? `<span class="lb-alert-title">${app.esc(s.title)}</span>` : ""}${s.text ? `<span class="lb-alert-text">${s.text}</span>` : ""}${s.dismissible ? `<button type="button" class="lb-alert-dismiss" aria-label="Dismiss" tabindex="-1">${svg(s.dismiss_icon || "times")}</button>` : ""}</div>`;
          }
          case "video": {
            if (!s.url) return '<div class="lb-video-placeholder">Add a video URL</div>';
            const ratio = { "16:9": "16 / 9", "21:9": "21 / 9", "4:3": "4 / 3", "3:2": "3 / 2", "1:1": "1 / 1", "9:16": "9 / 16" }[s.aspect_ratio] || "16 / 9";
            const src = embedUrl(s), hosted = src === "hosted";
            const overlay = s.show_overlay ? mediaUrl(s.overlay_image_id, s.overlay_image_url, "large") : "";
            const play = (s.show_play_icon || s.lightbox) && (overlay || s.lightbox) ? `<button type="button" class="lb-video-play" aria-label="Play video" tabindex="-1">${svg(s.play_icon || "play")}</button>` : "";
            const media = overlay ? "" : hosted ? `<video class="lb-video-media" src="${app.esc(s.url)}" preload="metadata"${mediaUrl(s.poster_id, s.poster_url, "large") ? ` poster="${app.esc(mediaUrl(s.poster_id, s.poster_url, "large"))}"` : ""}${s.controls ? " controls" : ""} muted playsinline></video>` : `<div class="lb-video-media lb28-video-embed" style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:13px/1.4 system-ui">${app.esc(hostLabel(s.url))} video \xB7 plays on the live page</div>`;
            return `<div class="lb-video lb-video-${hosted ? "hosted" : src ? "embed" : "oembed"}${overlay ? " lb-video-has-overlay" : ""}${s.lightbox ? " lb-video-lightbox" : ""}"${styleAttr({ "--lb-video-ratio": ratio, "--lb-play-color": s.play_icon_color || "", "--lb-play-size": unit(s.play_icon_size) })}><div class="lb-video-frame${overlay || s.lightbox ? " lb-video-overlay" : ""}"${overlay ? ` style="background-image:url(${app.esc(overlay)})"` : ""}>${media}${play}</div></div>`;
          }
          case "counter": {
            const end = parseFloat(s.number) || 0, sep = s.thousand_separator ? s.separator_char || "," : "", tag = tagOf(s.title_tag, "div"), pos = s.title_position === "before" ? "before" : "after", align = pick(s.align, LCR, "center");
            const fmt = (n2) => {
              const p = String(Math.round(n2 * 100) / 100).split(".");
              if (sep) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
              return p.join(".");
            };
            const title = s.title ? `<${tag} class="lb-counter-title">${app.esc(s.title)}</${tag}>` : "";
            const value = `<div class="lb-counter-value"><span class="lb-counter-prefix">${app.esc(s.prefix || "")}</span><span class="lb-counter-number">${app.esc(fmt(end))}</span><span class="lb-counter-suffix">${app.esc(s.suffix || "")}</span></div>`;
            return `<div class="lb-counter lb-counter-title-${pos}"${styleAttr({ "--lb-counter-number-color": s.number_color || "", "--lb-counter-title-color": s.title_color || "", "--lb-counter-number-size": unit(s.number_size), "--lb-counter-gap": unit(s.title_gap), "text-align": align })}>${pos === "before" ? title + value : value + title}</div>`;
          }
          case "progress": {
            const v = Math.max(0, Math.min(100, parseFloat(s.value) || 0)), style2 = pick(s.bar_style, ["default", "info", "success", "warning", "danger"], "default"), tag = tagOf(s.title_tag, "span");
            return `<div class="lb-progress lb-progress-${style2}"${styleAttr({ "--lb-bar-color": s.color || "", "--lb-bar-bg": s.background || "", "--lb-bar-height": unit(s.bar_height), "--lb-bar-radius": unit(s.bar_radius), "--lb-bar-inner-color": s.inner_color || "", "--lb-bar-title-color": s.title_color || "" })}>${s.label ? `<${tag} class="lb-progress-label">${app.esc(s.label)}</${tag}>` : ""}<div class="lb-progress-track" role="progressbar" aria-valuenow="${v}"><span class="lb-progress-fill" style="width:${v}%">${s.inner_text ? `<span class="lb-progress-inner">${app.esc(s.inner_text)}</span>` : ""}${s.show_percentage ? `<span class="lb-progress-percent">${String(Math.round(v * 10) / 10)}%</span>` : ""}</span></div></div>`;
          }
          case "gallery": {
            return app.galleryCanvasHTML(s);
          }
          case "carousel": {
            const slideItems = repeaterItems(s.slides, []);
            const rows2 = slideItems.length ? slideItems : String(s.ids || "").split(/[ ,]+/).filter(Boolean).map((id) => ({ image_id: id }));
            const ready = rows2.filter((x) => x && (x.image_id || x.image_url));
            if (!ready.length) return '<div class="lb-carousel-placeholder">' + app.t("Choose images for the carousel") + "</div>";
            const show = Math.max(1, Math.min(10, parseInt(s.slides_to_show, 10) || 1)), effect = s.effect === "fade" && show === 1 ? "fade" : "slide", dir = s.slide_direction === "rtl" ? "rtl" : "ltr", capAlign = pick(s.caption_align, LCR, "center"), nav = pick(s.navigation, ["both", "arrows", "dots", "none"], "both");
            let anyCap = false;
            const slides = ready.map((row, i) => {
              const id = row.image_id, file = row.image_url || "", video = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(String(file)), cap = row.caption || (s.caption && s.caption !== "none" && id ? captionOf(id, s.caption) : "");
              let media = video ? `<video class="lb-carousel-video" src="${app.esc(file)}" controls playsinline muted></video>` : id ? attImg(id, s.image_size || "large", "", row.alt || "") : file ? `<img src="${app.esc(file)}" alt="${app.esc(row.alt || "")}">` : "";
              if (cap) anyCap = true;
              if (id && file && !video && media.indexOf("lb28-att-loading") >= 0) media = media.replace(/src="[^"]*"/, `src="${app.esc(file)}"`);
              return `<figure class="lb-carousel-slide${effect === "fade" && i === 0 ? " is-active" : ""}" role="group">${media}${cap ? `<figcaption class="lb-carousel-caption">${app.esc(cap)}</figcaption>` : ""}</figure>`;
            }).join("");
            const arrows = ["both", "arrows"].includes(nav) ? '<button type="button" class="lb-carousel-prev" tabindex="-1" aria-label="${app.esc(app.t("Previous slide"))}">${dir === "rtl" ? "\u203A" : "\u2039"}</button><button type="button" class="lb-carousel-next" tabindex="-1" aria-label="${app.esc(app.t("Next slide"))}">${dir === "rtl" ? "\u2039" : "\u203A"}</button>' : "";
            const scroll = Math.max(1, Math.min(show, parseInt(s.slides_to_scroll, 10) || 1));
            const pages = Math.max(1, Math.ceil((ready.length - show) / scroll) + 1);
            const on = (v, d) => v === void 0 || v === null || v === "" ? d : !(v === false || v === 0 || v === "0" || v === "false");
            const dataAttrs = ` data-lb-carousel data-show="${show}" data-scroll="${scroll}" data-effect="${effect}" data-direction="${dir}" data-autoplay="${on(s.autoplay, true) ? 1 : 0}" data-interval="${Math.max(500, parseInt(s.interval, 10) || 5e3)}" data-loop="${on(s.loop, true) ? 1 : 0}" data-arrows="${["both", "arrows"].includes(nav) ? 1 : 0}" data-dots="${["both", "dots"].includes(nav) ? 1 : 0}" data-pause-hover="${on(s.pause_on_hover, true) ? 1 : 0}" data-pause-interaction="${on(s.pause_on_interaction, true) ? 1 : 0}"`;
            const dots = ["both", "dots"].includes(nav) && pages > 1 ? `<div class="lb-carousel-dots">${Array.from({ length: pages }, (_, i) => `<button type="button" tabindex="-1" class="${i === 0 ? "is-active" : ""}"></button>`).join("")}</div>` : "";
            return `<div class="lb-carousel lb-carousel-effect-${effect}${effect === "fade" ? " lb-carousel-fade" : ""} lb-carousel-${dir}${s.image_stretch ? " lb-carousel-stretch" : ""}${anyCap ? " lb-carousel-has-caption" : ""} lb-carousel-caption-${capAlign}" dir="${dir}"${dataAttrs}${styleAttr({ "--lb-carousel-show": show, "--lb-carousel-speed": Math.max(0, parseInt(s.speed, 10) || 500) + "ms", "--lb-carousel-spacing": unit(s.image_spacing), "--lb-carousel-radius": unit(s.image_radius), "--lb-carousel-height": unit(val(s.height)), "--lb-carousel-arrow-size": unit(s.arrows_size), "--lb-carousel-arrow-color": s.arrows_color || "", "--lb-carousel-dot-size": unit(s.dots_size), "--lb-carousel-dot-color": s.dots_color || "", "--lb-carousel-caption-color": s.caption_color || "" })}><div class="lb-carousel-track">${slides}</div>${arrows}${dots}</div>`;
          }
          case "soundcloud": {
            if (!s.url) return '<div class="lb-embed-placeholder">Add a SoundCloud track or playlist URL</div>';
            const h = s.visual ? 450 : Math.max(80, parseInt(val(s.height), 10) || 166);
            return `<div class="lb-soundcloud${s.visual ? " lb-soundcloud-visual" : ""}"><div class="lb-embed-placeholder" style="height:${h}px;display:flex;align-items:center;justify-content:center;background:${app.esc(s.player_color || "#ff5500")}22;border-color:${app.esc(s.player_color || "#ff5500")}">\u266B SoundCloud ${s.visual ? "visual" : "classic"} player \xB7 ${app.esc(s.url)}</div></div>`;
          }
          case "audio": {
            if (!s.url) return '<div class="lb-embed-placeholder">Add an audio file URL</div>';
            if (/\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|wma)(\?|#|$)/i.test(String(s.url))) return `<audio class="lb-audio" preload="${app.esc(s.preload || "metadata")}"${s.controls !== false ? " controls" : ""} src="${app.esc(s.url)}"></audio>`;
            return `<div class="lb-audio-embed"><div class="lb-embed-placeholder">\u266B ${app.esc(hostLabel(s.url))} \xB7 ${app.esc(s.url)} \xB7 plays on the live page</div></div>`;
          }
          case "embed": {
            if (!s.url) return '<div class="lb-embed-placeholder">Paste a URL to embed</div>';
            const er = { "16:9": "16 / 9", "21:9": "21 / 9", "4:3": "4 / 3", "1:1": "1 / 1", "9:16": "9 / 16" }[s.aspect_ratio] || "";
            return `<div class="lb-embed-wrap"><div class="lb-embed${er ? " lb-embed-has-ratio" : ""}"${styleAttr({ "--lb-embed-ratio": er, "max-width": unit(s.max_width) })}><div class="lb-embed-placeholder">${app.esc(hostLabel(s.url))} \xB7 ${app.esc(s.url)} \xB7 plays on the live page</div></div></div>`;
          }
          case "html": {
            const raw = String(s.html || "").trim();
            if (/^https?:\/\/\S+$/i.test(raw) && raw.indexOf("<") < 0) return `<div class="lb-html lb-html-embed"><div class="lb-embed-placeholder">${app.esc(hostLabel(raw))} \xB7 ${app.esc(raw)} \xB7 plays on the live page</div></div>`;
            return `<div class="lb-html">${s.html || ""}</div>`;
          }
          case "menu_anchor":
            return menuAnchorPreview(s);
          case "site_nav":
            return siteNavPreview(s);
          case "wordpress_widget": {
            const w = (app.D.widgets || []).find((x) => x.id === s.widget);
            const label = w ? w.name : s.sidebar ? "Sidebar: " + s.sidebar : "";
            return `<div class="lb-wordpress-widget">${s.title ? `<h3 class="lb-wp-widget-title">${app.esc(s.title)}</h3>` : ""}<div class="lb-embed-placeholder">${label ? "WordPress Widget \xB7 " + app.esc(label) : "Choose a WordPress widget"}</div></div>`;
          }
          case "sidebar": {
            const sb = (app.D.sidebars || []).find((x) => x.id === s.sidebar);
            return `<aside class="lb-sidebar"><div class="lb-embed-placeholder">${sb ? "Sidebar \xB7 " + app.esc(sb.name) : "Choose an active sidebar"}</div></aside>`;
          }
          case "price_table": {
            const feats = repeaterItems(s.features, ["text", "icon"]).map((r) => `<li${styleAttr({ color: s.feature_color || "" })}>${r.icon ? `<span class="lb-price-feature-icon"${styleAttr({ color: s.feature_icon_color || "" })}>${svg(r.icon)}</span>` : ""}${app.esc(r.text || "")}</li>`).join("");
            const btnBg = s.button_background || "#222222", btnFg = s.button_text_color || "#ffffff";
            const piece = (color, typo) => [color ? `color:${color}` : "", typoCss(typo)].filter(Boolean).join(";");
            return `<div class="lb-price-table"${styleAttr({ "--lb-btn-radius": unit(s.button_radius), "--lb-price-btn": btnBg, "--lb-price-btn-text": btnFg, "--lb-price-btn-hover": s.button_hover_background || "", "--lb-price-btn-hover-text": s.button_hover_color || "", background: s.table_background || "", "text-align": s.align || "" })}><h3 style="${app.esc(piece(s.title_color, s.title_typography))}">${app.esc(s.title || "Plan")}</h3><div class="lb-price"><strong style="${app.esc(piece(s.price_color, s.price_typography))}">${app.esc(s.price || "$0")}</strong><span style="${app.esc(piece(s.period_color, s.period_typography))}">${app.esc(s.period || "")}</span></div><ul style="${app.esc(typoCss(s.feature_typography))}">${feats}</ul><a href="${app.esc(s.url || "#")}" style="${app.esc(["background:" + btnBg, "color:" + btnFg, typoCss(s.button_typography), ((p) => p && p !== "0 0 0 0" ? "padding:" + p : "")(app.formatBox(s.button_padding)), unit(s.button_border_radius) ? "border-radius:" + unit(s.button_border_radius) : ""].filter(Boolean).join(";"))}">${app.esc(s.button || "Get Started")}</a></div>`;
          }
          case "call_to_action":
            return callToActionCanvas(s);
          case "flip_box":
            return flipBoxCanvas(n, s);
          case "form": {
            const layout = pick(s.layout, ["stack", "inline", "two-column"], "stack"), known = ["text", "email", "tel", "url", "textarea", "select", "checkbox"];
            const fields = repeaterItems(s.fields, ["label", "type", "required", "placeholder"]).map((r) => {
              const label = String(r.label || "").trim();
              if (!label) return "";
              const raw = String(r.type || "text"), type = known.includes(raw) ? raw : "text", req = r.required === true || r.required === "required" || r.required === "1" || r.required === "true" ? " required" : "", ph = r.placeholder ? ` placeholder="${app.esc(r.placeholder)}"` : "";
              if (type === "checkbox") return `<div class="lb-form-field"><label><input type="checkbox" tabindex="-1"${req}> ${app.esc(label)}</label></div>`;
              let input = "";
              if (type === "textarea") input = `<textarea tabindex="-1" readonly${req}${ph}></textarea>`;
              else if (type === "select") {
                const opts = String(r.options || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((o) => `<option>${app.esc(o)}</option>`).join("");
                input = `<select tabindex="-1"${req}><option>${app.esc(app.t("Select\u2026"))}</option>${opts}</select>`;
              } else input = `<input type="${app.esc(type)}" tabindex="-1" readonly${req}${ph}>`;
              return `<div class="lb-form-field"><label>${app.esc(label)}</label>${input}</div>`;
            }).join("");
            return `<div class="lb-form lb-form-${app.esc(layout)}"${styleAttr({ "--lb-btn-radius": unit(s.button_radius), "pointer-events": "none" })}>${s.title ? `<h3>${app.esc(s.title)}</h3>` : ""}${fields}<button type="button" tabindex="-1">${app.esc(s.submit || "Send Message")}</button></div>`;
          }
          case "inner_section":
          case "container": {
            let html = lb28OldBody(n);
            const layers = containerLayers(s);
            if (!layers) return html;
            return html.replace(/<div class="lb-container-inner([^"]*)"([^>]*)>/, (m, extra, rest) => `<div class="lb-container-inner${extra} lb-has-layers"${rest}>${layers}`);
          }
        }
        return lb28OldBody(n);
      };
      function callToActionCanvas(s) {
        const title = String(s.title || "").trim();
        const text = String(s.description || "").trim();
        const button = String(s.button || "").trim();
        if (!title && !text && !button) return '<div class="lb-embed-placeholder">' + app.t("Add a title, description, and button") + "</div>";
        let url = String(s.url || "").trim();
        if (url && !/^(https?:|mailto:|tel:|\/|#)/i.test(url)) url = "https://" + url;
        const target = s.target === "_blank" ? "_blank" : "_self";
        const rel = target === "_blank" ? ' rel="noopener noreferrer"' : "";
        let inner = "";
        if (title) inner += `<h2 class="cp-cta-title">${app.esc(title)}</h2>`;
        if (text) inner += `<p class="cp-cta-text">${app.esc(text)}</p>`;
        if (button) inner += `<a class="cp-cta-button" href="${app.esc(url || "#")}" target="${app.esc(target)}" data-lb-editor-link="1"${rel}>${app.esc(button)}</a>`;
        return `<div class="cp-cta">${inner}</div>`;
      }
      function anchorSlug(v) {
        const slug = String(v || "section").trim().toLowerCase().replace(/^#+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return slug || "section";
      }
      function menuAnchorPreview(s) {
        const id = anchorSlug(s.anchor);
        const anchor = `<span class="lb-menu-anchor" id="${app.esc(id)}"><span class="lb-menu-anchor-label">#${app.esc(id)}</span></span>`;
        const menuId = String(s.menu || "");
        if (!menuId) return anchor;
        const menu = (app.D.menus || []).find((x) => String(x.id) === menuId);
        if (!menu) return anchor + `<nav class="lb-anchor-menu"><div class="lb-embed-placeholder">${app.esc(app.t("Missing menu"))}</div></nav>`;
        const items = (menu.items || []).filter((it) => !parseInt(it.parent, 10));
        const links = items.length ? items.map((it) => `<li class="lb-anchor-menu-item"><a href="${app.esc(it.url || "#")}" data-lb-editor-link="1">${app.esc(it.title || "")}</a></li>`).join("") : `<li class="lb-anchor-menu-item"><span>${app.esc(menu.name || "")}</span></li>`;
        return anchor + `<nav class="lb-anchor-menu" aria-label="${app.esc(menu.name || app.t("Menu"))}"><ul class="lb-anchor-menu-list">${links}</ul></nav>`;
      }
      app.menuAnchorInPlace = function menuAnchorInPlace(n) {
        const region = typeof app.regionOf === "function" ? app.regionOf(n && n.id) : "root";
        return region === "header" || region === "footer" || region === "root" || region == null;
      };
      function navRadius(v) {
        if (v && typeof v === "object") v = v.size ?? v.desktop ?? "";
        const s = String(v ?? "").trim();
        const m = s.match(/^(-?\d*\.?\d+)\s*(px)?$/i);
        if (!m) return "";
        let n = parseFloat(m[1]);
        if (!Number.isFinite(n)) return "";
        n = Math.max(0, Math.min(48, n));
        return String(n) + "px";
      }
      function siteNavPreview(s) {
        const layout = s.layout === "vertical" ? "vertical" : s.layout === "dropdown" ? "dropdown" : "horizontal";
        const raw = s.breakpoint && typeof s.breakpoint === "object" ? s.breakpoint.size ?? s.breakpoint.desktop ?? 782 : s.breakpoint;
        const bp = Math.max(320, Math.min(1600, parseInt(raw, 10) || 782));
        const id = String(s.menu || "");
        const menu = id ? (app.D.menus || []).find((x) => String(x.id) === id) : null;
        const items = menu ? menu.items || [] : [];
        const by = {};
        items.forEach((it) => {
          const p = parseInt(it.parent, 10) || 0;
          if (!by[p]) by[p] = [];
          by[p].push(it);
        });
        const branch = (parent, root) => {
          const list2 = by[parent] || [];
          if (!list2.length) return "";
          const cls = root ? "lb-site-nav__list" : "lb-site-nav__sub";
          return `<ul class="${cls}"${root ? ' id="lb-site-nav-preview"' : ""}>${list2.map((it) => `<li class="lb-site-nav__item${(by[parseInt(it.id, 10) || 0] || []).length ? " lb-site-nav__item--has-children" : ""}"><a href="${app.esc(it.url || "#")}" data-lb-editor-link="1">${app.esc(it.title || "")}</a>${branch(parseInt(it.id, 10) || 0, false)}</li>`).join("")}</ul>`;
        };
        const list = items.length ? branch(0, true) : `<p class="lb-embed-placeholder">${app.esc(id ? app.t("Missing menu") : app.t("Choose a menu"))}</p>`;
        const label = menu && menu.name || app.t("Menu");
        const toggle = String(s.display_name || "").trim() || label;
        const custom = bp === 782 ? "" : " lb-site-nav--custom-bp";
        const device = app.device || "desktop";
        const previewOpen = layout === "dropdown" || device === "mobile" || device === "mobile_extra";
        const radius = navRadius(s.radius);
        const vars2 = ["--lb-nav-color:" + (s.color || ""), "--lb-nav-hover:" + (s.hover_color || ""), "--lb-nav-bg:" + (s.background || ""),"--lb-nav-btn-color:" + (s.button_color || ""), "--lb-nav-btn-border:" + (s.button_border_color || ""), "--lb-nav-btn-hover-color:" + (s.button_hover_color || ""), "--lb-nav-btn-hover-bg:" + (s.button_hover_background || ""), "--lb-nav-btn-hover-border:" + (s.button_hover_border || ""),  "--lb-nav-radius:" + radius].filter((bit) => !bit.endsWith(":"));
        const style2 = vars2.length ? ` style="${vars2.map((bit) => app.esc(bit)).join(";")}"` : "";
        const inner = `<button type="button" class="lb-site-nav__toggle" aria-expanded="${previewOpen ? "true" : "false"}" aria-controls="lb-site-nav-preview" tabindex="-1"><span class="lb-site-nav__burger" aria-hidden="true"></span><span class="lb-site-nav__toggle-text">${app.esc(toggle)}</span><span class="lb-site-nav__caret" aria-hidden="true">\u25BE</span></button>${list}`;
        const body = layout === "dropdown" ? `<div class="lb-site-nav__drop">${inner}</div>` : inner;
        return `<nav class="lb-site-nav lb-site-nav--${layout}${custom}${previewOpen ? " is-open" : ""}" data-breakpoint="${bp}" aria-label="${app.esc(toggle)}"${style2}>${body}</nav>`;
      }
      app.menuAnchorSelect = function menuAnchorSelect(k, label, v) {
        const menus = Array.isArray(app.D.menus) ? app.D.menus : [];
        const group = (source, title) => {
          const rows2 = menus.filter((m) => m.source === source);
          if (!rows2.length) return "";
          return `<optgroup label="${app.esc(title)}">${rows2.map((m) => `<option value="${app.esc(m.id)}" ${String(m.id) === String(v) ? "selected" : ""}>${app.esc(m.name || m.id)}</option>`).join("")}</optgroup>`;
        };
        const known = !v || menus.some((m) => String(m.id) === String(v));
        const missing = v && !known ? `<option value="${app.esc(v)}" selected>${app.esc(app.t("Missing menu"))}</option>` : "";
        return `<label class="lb-control"><span>${app.esc(label)}</span><select data-setting="${app.esc(k)}"><option value="">${app.esc(app.t("Select a menu"))}</option>${missing}${group("menu", app.t("Menus"))}${group("nav", app.t("Navigation"))}</select></label><p class="lb-control-desc">${app.esc(app.t("Classic menus (Appearance \u2192 Menus) and Navigation (Appearance \u2192 Editor)."))}</p>`;
      };
      function flipBoxCanvas(n, s) {
        const effect = pick(s.flip_effect, ["flip", "slide", "push", "zoom", "fade"], "flip");
        const dir = pick(s.flip_direction, ["left", "right", "up", "down"], "right");
        const trigger = s.flip_trigger === "click" ? "click" : "hover";
        const depth = !!s.flip_3d && effect === "flip";
        const dur = (() => {
          const x = val(s.flip_duration);
          const n2 = parseFloat(x);
          return (isNaN(n2) || n2 <= 0 ? 0.8 : n2) + "s";
        })();
        const wrapVars = styleAttr({ "--lb-flip-height": unit(s.box_height || 280), "--lb-el-w": unit(s.width), "--lb-el-max-w": unit(s.max_width), "--lb-el-h": unit(s.height), "--lb-el-min-h": unit(s.min_height), "--lb-flip-duration": dur, "--lb-flip-depth": unit(s.flip_depth || 50), "--lb-flip-perspective": effect === "flip" ? "1000px" : "none", "--lb-btn-radius": unit(s.button_radius) });
        const face = (side) => {
          const align = pick(s[side + "_align"], LCR, "center"), valign = pick(s[side + "_valign"], ["top", "middle", "bottom"], "middle");
          const view = pick(s[side + "_icon_view"], VIEW, "default"), shape = pick(s[side + "_shape"], SHAPE, "circle");
          const graphic = pick(s[side + "_graphic"], ["none", "icon", "image"], "none");
          const bg = typeof app.lbCompileBackground === "function" ? app.lbCompileBackground(s[side + "_background"] || {}) : {};
          const pad = s[side + "_padding"] && typeof s[side + "_padding"] === "object" ? [s[side + "_padding"].top || "0", s[side + "_padding"].right || "0", s[side + "_padding"].bottom || "0", s[side + "_padding"].left || "0"].join(" ") : "";
          const extra = {
            "--lb-flip-title-color": s[side + "_title_color"] || "",
            "--lb-flip-desc-color": s[side + "_desc_color"] || "",
            "--lb-flip-title-space": unit(s[side + "_title_space"]),
            "--lb-flip-graphic-space": unit(s[side + "_icon_space"]),
            "--lb-flip-icon-size": unit(s[side + "_icon_size"]),
            "--lb-flip-icon-color": s[side + "_icon_color"] || "",
            "--lb-flip-image-width": unit(s[side + "_image_width"]),
            "--lb-flip-image-radius": unit(s[side + "_image_radius"]),
            "--lb-flip-padding": pad
          };
          if (side === "back") {
            extra["--lb-flip-btn-bg"] = s.button_background || "#ffffff";
            extra["--lb-flip-btn-color"] = s.button_text_color || "#1f2124";
            extra["--lb-flip-btn-hover-bg"] = s.button_hover_background || "";
            extra["--lb-flip-btn-hover-color"] = s.button_hover_color || "";
          }
          const faceStyle = styleAttr(Object.assign({}, bg, extra));
          const layers = typeof app.lbBgLayersHTML === "function" ? app.lbBgLayersHTML({ background: s[side + "_background"] || {} }) : "";
          let g = "";
          if (graphic === "icon") g = `<div class="lb-flip-graphic"${styleAttr({ "--lb-icon-size": unit(s[side + "_icon_size"] || 40), "--lb-icon-primary": s[side + "_icon_color"] || "" })}><span class="lb-icon-glyph">${svg(s[side + "_icon"] || "star")}</span></div>`;
          else if (graphic === "image") {
            const u = mediaUrl(s[side + "_image_id"], s[side + "_image_url"], s[side + "_image_size"] || "large");
            if (u || s[side + "_image_id"]) g = `<div class="lb-flip-graphic">${attImgOrUrl(s[side + "_image_id"], u, s[side + "_image_size"] || "large", "lb-flip-image", s[side + "_title"])}</div>`;
          }
          const tag = tagOf(s[side + "_title_tag"], "h3");
          const title = s[side + "_title"] ? `<${tag} class="lb-flip-title">${app.esc(s[side + "_title"])}</${tag}>` : "";
          const desc = s[side + "_text"] ? `<div class="lb-flip-desc">${app.esc(s[side + "_text"]).replace(/\n/g, "<br>")}</div>` : "";
          const btn = side === "back" && s.show_button !== false && s.back_button_text ? `<a class="lb-flip-button" href="${app.esc(s.back_button_url || "#")}" data-lb-editor-link="1"${styleAttr({ background: s.button_background || "#ffffff", color: s.button_text_color || "#1f2124" })}>${app.esc(s.back_button_text)}</a>` : "";
          return `<div class="lb-flip-${side} lb-flip-align-${align} lb-flip-valign-${valign} lb-icon-view-${view} lb-icon-shape-${shape}"${faceStyle}>${layers}<div class="lb-flip-content">${g}${title}${desc}${btn}</div></div>`;
        };
        return `<div class="lb-flip-box lb-flip-effect-${effect} lb-flip-dir-${dir} lb-flip-trigger-${trigger}${depth ? " lb-flip-3d" : ""}" data-lb-flip="${trigger}"${wrapVars}><div class="lb-flip-layer">${face("front")}${face("back")}</div></div>`;
      }
      function attImgOrUrl(id, url, size, cls, alt) {
        if (url && !parseInt(id, 10)) return `<img class="${app.esc(cls || "")}" src="${app.esc(url)}" alt="${app.esc(alt || "")}" loading="lazy">`;
        if (url) return `<img class="${app.esc(cls || "")}" data-lb28-att="${app.esc(id)}" data-lb28-size="${app.esc(size || "")}" src="${app.esc(url)}" alt="${app.esc(alt || "")}" loading="lazy">`;
        return attImg(id, size, cls, alt);
      }
      function captionOf(id, mode) {
        const a = attCache[parseInt(id, 10)];
        if (!a) return "";
        if (mode === "title") return a.title || "";
        if (mode === "caption") return a.caption || "";
        if (mode === "description") return a.description || "";
        return "";
      }
      function hostLabel(url) {
        url = String(url).toLowerCase();
        if (url.includes("youtu")) return "YouTube";
        if (url.includes("vimeo")) return "Vimeo";
        if (url.includes("dailymotion") || url.includes("dai.ly")) return "Dailymotion";
        if (url.includes("videopress")) return "VideoPress";
        if (url.includes("spotify")) return "Spotify";
        if (url.includes("twitter.com") || url.includes("//x.com")) return "X";
        if (url.includes("tiktok")) return "TikTok";
        if (url.includes("ted.com")) return "TED";
        if (url.includes("soundcloud")) return "SoundCloud";
        try {
          const h = new URL(url).hostname.replace(/^www\./, "");
          if (h) return h;
        } catch (e) {
        }
        return "Embedded";
      }
      function embedUrl(s) {
        const u = String(s.url || "");
        if (/\.(mp4|webm|ogv|ogg|m4v|mov)(\?|#|$)/i.test(u)) return "hosted";
        if (/youtu/i.test(u)) {
          const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{6,})/);
          return m ? "youtube:" + m[1] : "";
        }
        if (/vimeo/i.test(u)) {
          const m = u.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/);
          return m ? "vimeo:" + m[1] : "";
        }
        if (/dailymotion|dai\.ly/i.test(u)) {
          const m = u.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([A-Za-z0-9]+)/);
          return m ? "dailymotion:" + m[1] : "";
        }
        if (/videopress/i.test(u)) {
          const m = u.match(/videopress\.com\/(?:v|embed)\/([A-Za-z0-9]+)/);
          return m ? "videopress:" + m[1] : "";
        }
        return s.source === "hosted" ? "hosted" : "";
      }
      const NETWORKS = { facebook: ["facebook-f", "#1877f2"], x: ["x-twitter", "#1da1f2"], twitter: ["twitter", "#1da1f2"], instagram: ["instagram", "#e4405f"], linkedin: ["linkedin-in", "#0a66c2"], youtube: ["youtube", "#ff0000"], tiktok: ["tiktok", "#010101"], pinterest: ["pinterest", "#e60023"], github: ["github", "#181717"], whatsapp: ["whatsapp", "#25d366"], telegram: ["telegram", "#2aabee"], googleplus: ["google-plus", "#db4437"], "google-plus": ["google-plus", "#db4437"], discord: ["discord", "#5865f2"], reddit: ["reddit", "#ff4500"], snapchat: ["snapchat", "#fffc00"], spotify: ["spotify", "#1db954"], twitch: ["twitch", "#9146ff"], vimeo: ["vimeo", "#1ab7ea"], dribbble: ["dribbble", "#ea4c89"], behance: ["behance", "#1769ff"], medium: ["medium", "#000000"], threads: ["threads", "#000000"], mastodon: ["mastodon", "#6364ff"], soundcloud: ["soundcloud", "#ff5500"], rss: ["rss", "#f26522"], skype: ["skype", "#00aff0"], slack: ["slack", "#4a154b"], tumblr: ["tumblr", "#36465d"], flickr: ["flickr", "#0063dc"], apple: ["apple", "#000000"], android: ["android", "#3ddc84"], yelp: ["yelp", "#d32323"], steam: ["steam", "#000000"], xing: ["xing", "#006567"], weibo: ["weibo", "#df2029"], vk: ["vk", "#0077ff"], wordpress: ["wordpress", "#21759b"], email: ["envelope", "#ea4335"], mail: ["envelope", "#ea4335"], website: ["globe", "#3f7fdf"], link: ["link", "#3f7fdf"] };
      function hostHas(host, k) {
        if (!host || !k) return false;
        if (host === k) return true;
        const dot = "." + k;
        return host.startsWith(k + ".") || host.endsWith(dot) || host.includes(dot + ".");
      }
      function detectNetwork(label, url) {
        const key = String(label || "").toLowerCase().replace(/\+/g, "plus").replace(/\s+/g, "").replace(/[^a-z0-9_-]/g, "");
        if (NETWORKS[key]) return [key, NETWORKS[key][0], NETWORKS[key][1]];
        let host = "";
        try {
          host = new URL(url, location.href).hostname.replace(/^www\./, "").toLowerCase();
        } catch (e) {
        }
        for (const k in NETWORKS) {
          if (hostHas(host, k)) return [k, NETWORKS[k][0], NETWORKS[k][1]];
        }
        if (String(url).startsWith("mailto:")) return ["email", "envelope", app.t("#ea4335")];
        return ["custom", "link", app.t("#3f7fdf")];
      }
      const SHAPE_PATHS = { wave: "M0,60 C150,110 350,10 500,60 C650,110 850,10 1000,60 L1000,100 L0,100 Z", tilt: "M0,100 L1000,0 L1000,100 Z", triangle: "M0,100 L500,0 L1000,100 Z", curve: "M0,100 C250,0 750,0 1000,100 Z", arrow: "M0,100 L0,60 L450,60 L500,20 L550,60 L1000,60 L1000,100 Z", mountains: "M0,100 L0,70 L200,30 L350,65 L500,15 L700,60 L850,35 L1000,75 L1000,100 Z", zigzag: (() => {
        let d = "M0,100 L0,50";
        for (let x = 0; x < 1e3; x += 100) d += ` L${x + 50},100 L${x + 100},50`;
        return d + " L1000,100 Z";
      })() };
      function containerLayers(s) {
        let out = typeof app.lbBgLayersHTML === "function" ? app.lbBgLayersHTML(s) : "";
        if (!out) {
          if (s.background_video) {
            const poster = mediaUrl(0, s.background_video_poster, "large");
            out += `<div class="lb-container-video${s.background_video_mobile ? "" : " lb-hide-mobile-video"}" aria-hidden="true"><video class="lb-container-video-media" muted playsinline preload="metadata"${poster ? ` poster="${app.esc(poster)}"` : ""}><source src="${app.esc(s.background_video)}"></video></div>`;
          }
          if (s.overlay_color) {
            const op = Math.max(0, Math.min(1, parseFloat(s.overlay_opacity) || 0.5));
            out += `<div class="lb-container-overlay" aria-hidden="true" style="background:${app.esc(s.overlay_color)};opacity:${op};${s.overlay_blend_mode ? `mix-blend-mode:${app.esc(s.overlay_blend_mode)};` : ""}"></div>`;
          }
        }
        ["top", "bottom"].forEach((side) => {
          const shape = s["shape_" + side];
          if (!shape || !SHAPE_PATHS[shape]) return;
          const h = s["shape_" + side + "_height"], w = s["shape_" + side + "_width"] || "100%";
          out += `<div class="lb-shape lb-shape-${side}${s["shape_" + side + "_front"] ? " lb-shape-front" : ""}${s["shape_" + side + "_flip"] ? " lb-shape-flip" : ""}" aria-hidden="true" style="--lb-shape-height:${app.esc(unit(h) || "80px")};--lb-shape-width:${app.esc(w)}"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="${SHAPE_PATHS[shape]}" fill="${app.esc(s["shape_" + side + "_color"] || "#ffffff")}"/></svg></div>`;
        });
        if (s.link) out += `<span class="lb-container-link lb28-container-link" title="${app.t("Links to %s", s.link)}"></span>`;
        return out;
      }
      const lb28OldFrameHTML = app.frameHTML;
      app.frameHTML = function() {
        let html = lb28OldFrameHTML();
        const css = app.D.frontendCss || "";
        if (css && !html.includes(css)) html = html.replace('<link rel="stylesheet"', `<link rel="stylesheet" href="${app.esc(css)}"><link rel="stylesheet"`);
        return html.replace("</style></head>", ".lb-heading-wrap{display:block}.lb-heading-size-small>*{font-size:15px}.lb-heading-size-medium>*{font-size:19px}.lb-heading-size-large>*{font-size:29px}.lb-heading-size-xl>*{font-size:39px}.lb-heading-size-xxl>*{font-size:59px}.lb-heading-wrap .lb-heading-link{color:inherit;text-decoration:none}.lb-text-wrap.lb-text-columns>.lb-text-content{column-count:var(--lb-text-columns,1);column-gap:var(--lb-text-column-gap,2em)}.lb-text-wrap>.lb-text-content p{margin:0 0 var(--lb-paragraph-spacing,1em)}.lb-text-wrap>.lb-text-content a{color:var(--lb-link-color,inherit)}.lb-text-drop-cap>.lb-text-content>p:first-of-type::first-letter,.lb-text-drop-cap>.lb-text-content::first-letter{float:left;font-size:var(--lb-drop-cap-size,3.4em);line-height:.8;margin:.08em var(--lb-drop-cap-space,10px) 0 0;font-weight:700;color:var(--lb-drop-cap-color,inherit)}.lb-drop-cap-stacked>.lb-text-content>p:first-of-type::first-letter,.lb-drop-cap-stacked>.lb-text-content::first-letter{background:var(--lb-drop-cap-color,#222);color:var(--lb-drop-cap-secondary,#fff);padding:.15em .3em;border-radius:var(--lb-drop-cap-radius,4px)}.lb-drop-cap-framed>.lb-text-content>p:first-of-type::first-letter,.lb-drop-cap-framed>.lb-text-content::first-letter{border:var(--lb-drop-cap-border,3px) solid var(--lb-drop-cap-color,#222);padding:.1em .25em;border-radius:var(--lb-drop-cap-radius,4px)}.lb-editor-button.lb-button{cursor:default}.lb28-container-link{pointer-events:none;background:transparent}.lb-has-layers>.lb-node,.lb-has-layers>.lb-insert-zone{position:relative;z-index:1}.lb-video-overlay,.lb-video-play,.lb-alert-dismiss,.lb-carousel-prev,.lb-carousel-next,.lb-carousel-dots button,.lb-tab-button,.lb-collapse-title{cursor:default}.lb28-att-loading{background:#e5e8ec;min-height:60px}.lb28-video-embed{font-size:13px}.cp-cta{display:flex;flex-direction:column;align-items:flex-start;gap:.55rem}.cp-cta-title,.cp-cta-text{margin:0}.cp-cta-button{display:inline-flex;align-items:center;padding:.45rem .8rem;border:1px solid currentColor;border-radius:var(--lb-btn-radius,0);background:transparent;color:inherit;font:inherit;text-decoration:none;cursor:pointer}</style></head>");
      };
      const style = document.createElement("style");
      style.textContent = '.lb28-media-control .lb-media-row{display:flex;align-items:center;gap:6px}.lb28-media-control .lb-media-row input[type="number"]{display:none}.lb28-media-thumb{flex:0 0 auto;width:72px;height:72px;border-radius:6px;object-fit:cover;background:#eef0f3;border:1px solid #d9dee5;display:inline-block}.lb28-media-clear{padding:0 8px}.lb32-media-row{display:flex;align-items:flex-start;gap:8px}.lb32-media-preview{display:flex;align-items:center;justify-content:center;width:96px;height:96px;padding:0;margin:0;border:1px dashed #c5ccd4;border-radius:6px;background:#f4f6f8;overflow:hidden;cursor:pointer;color:#6b7280;font-size:12px;text-align:center}.lb32-media-preview img{width:100%;height:100%;object-fit:cover;display:block;background:#eef0f3}.lb32-thumbs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.lb32-thumb{width:56px;height:56px;object-fit:cover;border-radius:4px;background:#e5e8ec;border:1px solid #d9dee5}.lb32-thumbs-empty{color:#8a919a;font-size:12px}';
      document.head.appendChild(style);
      function hydrateAtt() {
        const run = () => {
          [document, app.frameDoc()].forEach((doc) => doc && doc.querySelectorAll && doc.querySelectorAll("[data-lb28-att]").forEach((el) => {
            const id = parseInt(el.dataset.lb28Att, 10);
            if (id) fetchAtt(id);
          }));
        };
        run();
        [50, 160, 400, 900].forEach((ms) => setTimeout(run, ms));
      }
      const lb28OldRender = app.render;
      app.render = function() {
        migrate(app.state.root);
        lb28OldRender();
        setTimeout(bindControls, 0);
        setTimeout(hydrateAtt, 0);
      };
      const lb28OldRefresh = typeof app.refreshRightPanel === "function" ? app.refreshRightPanel : null;
      if (lb28OldRefresh) app.refreshRightPanel = function() {
        lb28OldRefresh();
        setTimeout(bindControls, 0);
      };
      window.CanvaslyLite1228 = { attCache, migrate, OPTIONS, attImg, captionOf };
    })();
    (function() {
      const lb30OldStyle = app.styleInline;
      app.styleInline = function(n) {
        let css = lb30OldStyle(n);
        if (n.type === "image") css = css.replace(/(?:^|;)\s*width:[^;]+/g, "").replace(/(?:^|;)\s*height:[^;]+/g, "").replace(/^;+/, "");
        return css;
      };
      const lb30OldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = lb30OldNode(n);
        if (n.type !== "image") return html;
        const w = String(app.resp((n.settings || {}).width) || "100%").trim() || "100%";
        const h = String(app.resp((n.settings || {}).height) || "").trim();
        const just = { left: "start", center: "center", right: "end", start: "start", end: "end", stretch: "stretch" }[String(app.resp((n.settings || {}).alignment || (n.settings || {}).justify_self) || "start")] || "start";
        const aln = { top: "start", middle: "center", bottom: "end", start: "start", center: "center", end: "end", stretch: "stretch" }[String(app.resp((n.settings || {}).align_self) || "start")] || "start";
        const extra = "max-width:100%;min-width:0;overflow:hidden;justify-self:stretch;align-self:" + aln + ";text-align:" + ({ start: "left", center: "center", end: "right" }[just] || "left") + ";--lb-img-w:" + app.esc(w) + ";--lb-img-h:" + app.esc(h || "auto") + ";--lb-media-items:" + (just === "center" ? "center" : just === "end" ? "flex-end" : "flex-start") + ";";
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, s) => 'style="' + s + extra + '"');
        else tag = tag.replace(/>$/, ' style="' + extra + '">');
        return tag + html.slice(m[0].length);
      };
      const CELL_CSS = `
    .lb-node-toolbar{display:none!important}
    .lb-grid-inner>.lb-node,.lb-container-inner[style*="display:grid"]>.lb-node{
      min-width:0!important;max-width:100%;height:auto;max-height:none;overflow:visible;box-sizing:border-box
    }
    .lb-node.lb-node-image,.lb-node.lb-node-video,.lb-node.lb-node-gallery,.lb-node.lb-node-carousel,.lb-node.lb-node-audio,.lb-node.lb-node-image_box,.lb-node.lb-node-soundcloud,.lb-node.lb-node-embed{min-width:0;min-height:0;max-width:100%;box-sizing:border-box;overflow:hidden}
    .lb-node.lb-node-image .lb-image,.lb-node.lb-node-image .lb-image-preview{
      margin:0;width:var(--lb-img-w,100%);max-width:var(--lb-img-max-w,100%);height:var(--lb-img-h,auto);overflow:hidden;display:block;line-height:0;flex:0 0 auto
    }
    .lb-node.lb-node-image img{display:block;width:100%;max-width:100%;height:var(--lb-img-h,auto);object-fit:var(--lb-object-fit,cover);object-position:var(--lb-object-position,center);box-sizing:border-box}
    .lb-grid-inner>.lb-node.lb-node-gallery,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-gallery{max-height:none;height:auto;align-self:start;overflow:hidden}
    .lb-grid-inner>.lb-node.lb-node-image,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-image,
    .lb-grid-inner>.lb-node.lb-node-video,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-video,
    .lb-grid-inner>.lb-node.lb-node-carousel,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-carousel,
    .lb-grid-inner>.lb-node.lb-node-audio,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-audio,
    .lb-grid-inner>.lb-node.lb-node-image_box,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-image_box{
      max-width:100%;width:auto;min-width:0;overflow:hidden;display:flex;flex-direction:column;align-items:var(--lb-media-items,stretch);box-sizing:border-box
    }
    .lb-node.lb-node-image.lb-img-align-left{align-items:flex-start;text-align:left}
    .lb-node.lb-node-image.lb-img-align-center{align-items:center;text-align:center}
    .lb-node.lb-node-image.lb-img-align-right{align-items:flex-end;text-align:right}
    .lb-gallery-shell,.lb-node.lb-node-gallery,.lb-gallery{width:100%;max-width:100%;min-width:0;height:auto!important;max-height:none!important;align-self:start}
    .lb-gallery{overflow:visible}
    .lb-gallery.is-grid{display:grid!important;grid-template-columns:repeat(var(--lb-cols,4),minmax(0,1fr))!important;gap:var(--lb-gap,10px)!important}
    .lb-gallery.is-justified{display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;align-items:stretch!important;gap:var(--lb-gap,10px)!important;column-count:auto!important}
    .lb-gallery.is-masonry{display:block!important;column-count:var(--lb-cols,4)!important;column-gap:var(--lb-gap,10px)!important;column-fill:balance!important;height:auto!important;position:static!important;overflow:visible!important}
    .lb-gallery-item{margin:0;min-width:0;overflow:hidden;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;box-sizing:border-box}
    .lb-gallery.is-masonry .lb-gallery-item{display:inline-block!important;width:100%!important;margin:0 0 var(--lb-gap,10px)!important;position:static!important;left:auto!important;top:auto!important;height:auto!important}
    .lb-gallery.is-grid .lb-gallery-item{aspect-ratio:var(--lb-gallery-ratio,1)}
    .lb-gallery.is-ratio-auto .lb-gallery-item,.lb-gallery.is-masonry .lb-gallery-item,.lb-gallery.is-justified .lb-gallery-item{aspect-ratio:auto}
    .lb-gallery.is-justified .lb-gallery-item{height:var(--lb-row-h,220px);flex:1 1 auto}
    .lb-gallery-item img{width:100%;max-width:100%;height:auto;display:block;background:#eef0f3;object-fit:cover}
    .lb-gallery.is-grid .lb-gallery-item img{height:100%;min-height:0;object-fit:cover}
    .lb-gallery.is-justified .lb-gallery-item img{width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important}
    .lb-gallery.is-masonry .lb-gallery-item img{height:auto;object-fit:contain}
    .lb-gallery-placeholder{min-height:120px!important;cursor:pointer;border:1px dashed #cfd5dc;background:#f5f6f8;display:flex;align-items:center;justify-content:center}
    .lb-gallery-nav{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:0;margin:0 0 22px;padding:0;border:0;border-bottom:1px solid #d8dde3}
    .lb-gallery-nav button{appearance:none;border:1px solid transparent;border-bottom:none;background:transparent;color:#5c6570;cursor:pointer;font:600 13px/1.2 system-ui,sans-serif;margin:0 2px -1px;padding:9px 16px;border-radius:7px 7px 0 0}
    .lb-gallery-nav button:hover{color:#1f242a;background:#f4f6f8}
    .lb-gallery-nav button.is-active{background:#fff;color:#14181c;border-color:#d8dde3;border-bottom-color:#fff}
    .lb-gallery-item[hidden],.lb-gallery-item.is-lb-out,
    .lb-gallery.is-masonry .lb-gallery-item[hidden],.lb-gallery.is-justified .lb-gallery-item[hidden],.lb-gallery.is-grid .lb-gallery-item[hidden],
    .lb-gallery.is-masonry .lb-gallery-item.is-lb-out,.lb-gallery.is-justified .lb-gallery-item.is-lb-out,.lb-gallery.is-grid .lb-gallery-item.is-lb-out{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
    .lb26-img-handle{pointer-events:auto!important}
    .lb21-hover-tab{pointer-events:auto!important;position:absolute!important;width:max-content!important;height:25px!important;min-width:88px!important;min-height:0!important;max-height:25px!important;flex:none!important}
    .lb21-hover-tab:after{content:"";position:absolute;left:0;right:0;top:100%;height:12px}
  `;
      const lb30OldFrame = app.frameHTML;
      app.frameHTML = function() {
        return lb30OldFrame().replace("</style></head>", CELL_CSS + "</style></head>");
      };
      function lb30Css(fd) {
        if (!fd) return;
        let st = fd.getElementById("lb30-style");
        if (!st) {
          st = fd.createElement("style");
          st.id = "lb30-style";
          fd.head.appendChild(st);
        }
        st.textContent = CELL_CSS;
        fd.getElementById("lb29-style")?.remove();
      }
      function lb30Sync() {
        const fd = app.frameDoc();
        if (!fd) return;
        lb30Css(fd);
        fd.querySelectorAll(".lb-node-toolbar").forEach((t3) => {
          t3.hidden = true;
          t3.setAttribute("aria-hidden", "true");
        });
        const tabs = [...fd.querySelectorAll(".lb21-hover-tab")];
        if (tabs.length > 1) tabs.slice(0, -1).forEach((t3) => t3.remove());
      }
      const lb30OldRender = app.render;
      app.render = function() {
        lb30OldRender();
        requestAnimationFrame(lb30Sync);
      };
      const lb30OldSelect = app.selectNode;
      app.selectNode = function(id) {
        lb30OldSelect(id);
        requestAnimationFrame(lb30Sync);
      };
      document.getElementById("lb-editor-frame")?.addEventListener("load", lb30Sync);
      requestAnimationFrame(lb30Sync);
      setTimeout(app.render, 0);
    })();
    (function() {
      const api = () => window.CanvaslyLite1228 || {};
      function groupsOf(s) {
        if ((s.mode || "single") === "multiple" && Array.isArray(s.collections) && s.collections.length) {
          return s.collections.map((c, i) => ({ label: String(c.label || "").trim() || "Gallery " + (i + 1), ids: String(c.ids || "").split(/[,\s]+/).filter(Boolean) }));
        }
        return [{ label: "", ids: String(s.ids || "").split(/[,\s]+/).filter(Boolean) }];
      }
      function galleryMarkup(s) {
        return app.galleryCanvasHTML(s);
      }
      const lb31OldBody = app.bodyHTML;
      app.bodyHTML = function(n) {
        return n.type === "gallery" ? galleryMarkup(n.settings || {}) : lb31OldBody(n);
      };
      const lb31OldSettings = app.settingsHTML;
      app.settingsHTML = function() {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r || r.node.type !== "gallery") return lb31OldSettings();
        return app.lb09GallerySettings(r.node);
      };
      function bindGalleryPanel() {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r || r.node.type !== "gallery") return;
        const s = r.node.settings = r.node.settings || {};
        app.root.querySelector(".lb31-gal-add")?.addEventListener("click", () => {
          app.commit();
          s.mode = "multiple";
          s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
          s.collections.push({ label: app.t("Gallery %s", s.collections.length + 1), ids: "" });
          app.render();
        });
        app.root.querySelectorAll(".lb31-gal-del").forEach((b) => b.onclick = () => {
          const i = Number(b.closest("[data-gal-index]")?.dataset.galIndex);
          if (!Number.isFinite(i)) return;
          app.commit();
          s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
          s.collections.splice(i, 1);
          app.render();
        });
        app.root.querySelectorAll(".lb31-gal-dup").forEach((b) => b.onclick = () => {
          const i = Number(b.closest("[data-gal-index]")?.dataset.galIndex);
          if (!Number.isFinite(i)) return;
          app.commit();
          s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
          const src = s.collections[i] || { label: "", ids: "" };
          s.collections.splice(i + 1, 0, { label: (src.label || "Gallery") + " copy", ids: src.ids || "" });
          app.render();
        });
        app.root.querySelectorAll(".lb31-gal-label").forEach((inp) => {
          if (inp.__lbLiveBound) return;
          inp.__lbLiveBound = true;
          let started = false;
          const apply = () => {
            const i = Number(inp.closest("[data-gal-index]")?.dataset.galIndex);
            if (!Number.isFinite(i)) return;
            if (!started) {
              app.commit();
              started = true;
            }
            s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
            s.collections[i] = Object.assign({}, s.collections[i], { label: inp.value });
            app.dirty = true;
            app.scheduleSave();
            if (typeof app.previewSetting === "function") app.previewSetting("collections", app.selected);
          };
          inp.addEventListener("input", apply);
          inp.addEventListener("change", () => {
            if (!started) apply();
            started = false;
          });
        });
        app.root.querySelectorAll(".lb31-gal-pick").forEach((b) => b.onclick = () => {
          const i = Number(b.closest("[data-gal-index]")?.dataset.galIndex);
          if (!Number.isFinite(i)) return;
          app.openCollectionPicker(s, i, (items, ids) => {
            items.forEach((j) => {
              if (j && j.id && api().attCache) api().attCache[j.id] = j;
            });
            app.commit();
            app.rememberGalleryUrls(s, items);
            s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
            s.collections[i] = Object.assign({}, s.collections[i], { ids: ids.join(",") });
            app.persistGalleryIds(s);
            app.render();
          });
        });
      }
      function bindGalleryFilters(fd) {
        fd = fd || app.frameDoc();
        if (!fd) return;
        fd.querySelectorAll("[data-lb-gallery-filter-host]").forEach((host) => {
          if (host.__lb31Gal) return;
          host.__lb31Gal = true;
          host.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-lb-set]");
            if (!btn || !host.contains(btn)) return;
            e.preventDefault();
            e.stopPropagation();
            app.applyGalleryFilter(host, btn.getAttribute("data-lb-set"));
          });
        });
      }
      const lb31OldUpdate = app.update;
      app.update = function(path, v) {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (r && r.node.type === "gallery" && path === "mode" && v === "multiple") {
          const s = r.node.settings = r.node.settings || {};
          if (!Array.isArray(s.collections) || !s.collections.length) s.collections = [{ label: app.t("Gallery 1"), ids: s.ids || "" }];
        }
        return lb31OldUpdate(path, v);
      };
      const style = document.createElement("style");
      style.textContent = ".lb31-gal-list{display:grid;gap:8px}.lb31-gal-row{display:grid;grid-template-columns:1fr 38px 38px 38px;gap:6px;align-items:center}.lb31-gal-row input{min-width:0}.lb31-gal-add{justify-self:start}";
      document.head.appendChild(style);
      const lb31OldRender = app.render;
      app.render = function() {
        const frame = document.getElementById("lb-editor-frame"), fd = frame && frame.contentDocument;
        if (document.body.classList.contains("lb123-resizing") || fd && fd.body && fd.body.classList.contains("lb123-resizing")) return;
        lb31OldRender();
        setTimeout(bindGalleryPanel, 0);
        setTimeout(() => {
          bindGalleryFilters(app.frameDoc());
          if (typeof window.lbPackGalleries === "function") window.lbPackGalleries();
        }, 20);
      };
      const lb31OldRefresh = app.refreshRightPanel;
      app.refreshRightPanel = function() {
        lb31OldRefresh();
        setTimeout(bindGalleryPanel, 0);
      };
      setTimeout(bindGalleryPanel, 0);
    })();
    (function() {
      const lb32OldStyle = app.styleInline;
      app.styleInline = function(n) {
        let css = lb32OldStyle(n);
        if (["container", "grid"].includes(n.type)) return css;
        return css.replace(/(?:^|;)\s*(?:max-)?width:[^;]+/g, "").replace(/(?:^|;)\s*(?:min-)?height:[^;]+/g, "").replace(/^;+/, "");
      };
      const lb32OldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = lb32OldNode(n);
        if (["container", "grid"].includes(n.type)) return html;
        const s = n.settings || {};
        const extra = ["width", "height", "max_width", "min_height"].map((k) => {
          const v = String(app.resp(s[k]) || "").trim();
          if (!v) return "";
          if (["image", "video", "carousel", "audio", "image_box", "gallery", "soundcloud", "embed", "tinymce_text_editor"].includes(n.type) && (k === "width" || k === "height" || k === "max_width" || k === "min_height")) return "";
          return k.replace(/_/g, "-") + ":" + app.esc(v) + ";";
        }).join("");
        if (!extra) return html;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + extra + '"');
        else tag = tag.replace(/>$/, ' style="' + extra + '">');
        return tag + html.slice(m[0].length);
      };
      const lb32OldRefresh = app.refreshRightPanel;
      app.refreshRightPanel = function() {
        lb32OldRefresh();
        app.bindSliders();
      };
    })();
    (function() {
      const lb33OldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = lb33OldNode(n);
        const s = n.settings || {};
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        const extra = [];
        const margin = app.formatBox(s.margin), padding = app.formatBox(s.padding);
        if (margin && margin !== "0 0 0 0") extra.push("margin:" + margin);
        if (padding && padding !== "0 0 0 0") extra.push("padding:" + padding);
        if (n.type === "image") {
          const w = String(app.resp(s.width) || "100%").trim() || "100%";
          const align = ["center", "right"].includes(String(s.alignment || "left")) ? s.alignment : "left";
          const cls = "lb-img-align-" + align;
          if (!tag.includes(cls)) tag = tag.replace("lb-node-image", "lb-node-image " + cls);
          extra.push("--lb-img-w:" + w);
        }
        if (!extra.length) return tag === m[0] ? html : tag + html.slice(m[0].length);
        const css = extra.join(";") + ";";
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + css + '"');
        else tag = tag.replace(/>$/, ' style="' + css + '">');
        return tag + html.slice(m[0].length);
      };
    })();
    (function() {
      function ratioOf(el) {
        const d = parseFloat(el.getAttribute("data-lb-ratio"));
        if (d > 0.05 && d < 20) return d;
        const img = el.querySelector("img");
        if (img && img.naturalWidth && img.naturalHeight) {
          const r = img.naturalWidth / img.naturalHeight;
          el.setAttribute("data-lb-ratio", String(Math.round(r * 1e3) / 1e3));
          return r;
        }
        return 1.5;
      }
      function packJustified(gal) {
        const items = [...gal.querySelectorAll(".lb-gallery-item")].filter((el) => !el.hidden);
        const W = gal.clientWidth;
        if (!W || !items.length) return;
        const cs = getComputedStyle(gal);
        const gap = parseFloat(cs.columnGap || cs.gap) || parseFloat(gal.style.getPropertyValue("--lb-gap")) || 10;
        const rh = parseFloat(cs.getPropertyValue("--lb-row-h")) || 220;
        const last = gal.getAttribute("data-lb-last-row") || "auto";
        let row = [], aspect = 0;
        function flush(fit) {
          if (!row.length) return;
          const avail = Math.max(1, W - gap * (row.length - 1));
          const sum = row.reduce((a, it) => a + it.r, 0) || 1;
          const h = fit ? avail / sum : rh;
          row.forEach((it) => {
            it.el.style.width = h * it.r + "px";
            it.el.style.height = h + "px";
            it.el.style.flexGrow = fit ? "1" : "0";
            it.el.style.flexShrink = "0";
            it.el.style.flexBasis = h * it.r + "px";
          });
          row = [];
          aspect = 0;
        }
        items.forEach((el, i) => {
          const r = ratioOf(el);
          if (row.length && (aspect + r) * rh + gap * row.length > W) flush(true);
          row.push({ el, r });
          aspect += r;
          if (i === items.length - 1) {
            const used = aspect * rh + gap * (row.length - 1);
            const fit = last === "fit" || last === "grow" || last === "auto" && used / W >= 0.72;
            flush(fit);
          }
        });
      }
      function packMasonry(gal) {
        gal.style.position = "";
        gal.style.height = "";
        gal.style.columnCount = "";
        gal.style.display = "";
        [...gal.querySelectorAll(".lb-gallery-item")].forEach((el) => {
          if (el.hidden || el.classList.contains("is-lb-out")) {
            el.style.setProperty("display", "none", "important");
            return;
          }
          el.style.position = "";
          el.style.left = "";
          el.style.top = "";
          el.style.width = "";
          el.style.height = "";
          el.style.margin = "";
          el.style.display = "";
        });
      }
      function packOne(gal) {
        if (!gal) return;
        if (gal.classList.contains("is-justified")) packJustified(gal);
        else if (gal.classList.contains("is-masonry")) packMasonry(gal);
      }
      function packAll(root) {
        const docs = [];
        if (root && root.querySelectorAll) docs.push(root);
        else {
          docs.push(document);
          const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
          if (fd) docs.push(fd);
        }
        docs.forEach((doc) => doc.querySelectorAll && doc.querySelectorAll(".lb-gallery.is-justified,.lb-gallery.is-masonry").forEach((gal) => {
          packOne(gal);
          gal.querySelectorAll("img").forEach((img) => {
            if (img.complete) return;
            img.addEventListener("load", () => packOne(gal), { once: true });
          });
        }));
      }
      window.lbPackGalleries = function(target) {
        if (target && target.classList && target.classList.contains("lb-gallery")) packOne(target);
        else packAll(target);
      };
      const lb34OldRender = app.render;
      app.render = function() {
        lb34OldRender();
        setTimeout(() => packAll(), 30);
        setTimeout(() => packAll(), 200);
      };
      window.addEventListener("resize", () => packAll());
    })();
    (function() {
      const LABELS = {
        text: "Title",
        tag: "HTML Tag",
        size_preset: "Size",
        link: "Link",
        link_target: "Link Target",
        align: "Alignment",
        color: "Text Color",
        hover_color: "Hover Color",
        font_family: "Font Family",
        size: "Size",
        weight: "Weight",
        line_height: "Line Height",
        letter_spacing: "Letter Spacing",
        drop_cap: "Drop Cap",
        drop_cap_view: "Drop Cap View",
        drop_cap_color: "Primary Color",
        drop_cap_secondary_color: "Secondary Color",
        drop_cap_size: "Drop Cap Size",
        drop_cap_space: "Drop Cap Space",
        drop_cap_radius: "Drop Cap Radius",
        drop_cap_border_width: "Drop Cap Border",
        text_columns: "Columns",
        column_gap: "Columns Gap",
        paragraph_spacing: "Paragraph Spacing",
        link_color: "Link Color",
        link_hover_color: "Link Hover Color",
        url: "Link",
        target: "Open In",
        background: "Background Color",
        text_color: "Text Color",
        hover_background: "Hover Background",
        hover_text_color: "Hover Text Color",
        hover_border_color: "Hover Border Color",
        padding: "Padding",
        radius: "Border Radius",
        border_color: "Border Color",
        border_width: "Border Width",
        border_style: "Border Style",
        icon: "Icon",
        icon_placement: "Icon Position",
        icon_spacing: "Icon Spacing",
        hover_animation: "Hover Animation",
        button_id: "Button ID",
        style: "Style",
        divider_width: "Width",
        thickness: "Weight",
        divider_gap: "Gap",
        pattern_size: "Pattern Size",
        look: "Look",
        text_tag: "Text HTML Tag",
        unit_align: "Unit Align",
        unit_spacing: "Unit Spacing",
        icon_color: "Icon Color",
        icon_size: "Icon Size",
        icon_view: "View",
        shape: "Shape",
        secondary_color: "Secondary Color",
        hover_secondary_color: "Hover Secondary",
        rotate: "Rotate",
        icon_padding: "Icon Padding",
        icon_border_width: "Icon Border",
        icon_radius: "Icon Radius",
        box_layout: "Position",
        content_align: "Content Alignment",
        vertical_align: "Vertical Align",
        icon_space: "Icon Spacing",
        title_space: "Title Spacing",
        title_color: "Title Color",
        title_hover_color: "Title Hover",
        title_tag: "Title HTML Tag",
        image_id: "Choose Image",
        image_url: "Image URL",
        image_size: "Image Size",
        alt: "Alt Text",
        image_width: "Image Width",
        image_space: "Image Spacing",
        image_radius: "Border Radius",
        image_opacity: "Opacity",
        image_hover_opacity: "Hover Opacity",
        items: "Items",
        list_layout: "Layout",
        space_between: "Space Between",
        icon_align: "Alignment",
        divider: "Divider",
        divider_style: "Divider Style",
        divider_weight: "Divider Weight",
        divider_color: "Divider Color",
        icon_hover_color: "Icon Hover",
        text_indent: "Text Indent",
        text_hover_color: "Text Hover",
        links: "Icons",
        color_scheme: "Color",
        icon_padding: "Padding",
        gap: "Spacing",
        row_gap: "Rows Gap",
        columns: "Columns",
        hover_icon_color: "Hover Icon Color",
        scale: "Rating Scale",
        rating: "Rating",
        unmarked_style: "Unmarked Style",
        title: "Title",
        title_gap: "Gap",
        star_gap: "Spacing",
        unmarked_color: "Unmarked Color",
        quote: "Content",
        author: "Name",
        role: "Title",
        image_position: "Image Position",
        name_tag: "Name HTML Tag",
        quote_color: "Content Color",
        name_color: "Name Color",
        role_color: "Title Color",
        source: "Source",
        start: "Start Time",
        end: "End Time",
        autoplay: "Autoplay",
        play_on_mobile: "Play On Mobile",
        mute: "Mute",
        loop: "Loop",
        controls: "Player Controls",
        show_related: "Suggested Videos",
        privacy_mode: "Privacy Mode",
        lazy_load: "Lazy Load",
        preload: "Preload",
        download_button: "Download Button",
        poster_id: "Poster",
        show_overlay: "Image Overlay",
        overlay_image_id: "Choose Image",
        show_play_icon: "Play Icon",
        play_icon: "Icon",
        play_icon_color: "Play Icon Color",
        play_icon_size: "Play Icon Size",
        lightbox: "Lightbox",
        aspect_ratio: "Aspect Ratio",
        label: "Title",
        value: "Percentage",
        bar_style: "Type",
        show_percentage: "Display Percentage",
        inner_text: "Inner Text",
        bar_height: "Height",
        bar_radius: "Border Radius",
        inner_color: "Inner Text Color",
        number: "Number",
        prefix: "Number Prefix",
        suffix: "Number Suffix",
        duration: "Animation Duration",
        thousand_separator: "Thousand Separator",
        separator_char: "Separator",
        title_position: "Title Position",
        number_color: "Number Color",
        number_size: "Number Size",
        type: "Type",
        dismissible: "Dismiss Button",
        dismiss_icon: "Dismiss Icon",
        dismiss_color: "Dismiss Color",
        dismiss_size: "Dismiss Size",
        orientation: "Position",
        tabs: "Tabs",
        tabs_align: "Alignment",
        nav_width: "Navigation Width",
        tab_color: "Color",
        tab_active_color: "Active Color",
        tab_background: "Background",
        tab_active_background: "Active Background",
        content_color: "Content Color",
        content_background: "Content Background",
        tab_padding: "Title Padding",
        content_padding: "Content Padding",
        first_open: "Open First Item",
        faq_schema: "FAQ Schema",
        active_icon: "Active Icon",
        icon_position: "Icon Position",
        active_color: "Active Color",
        title_background: "Title Background",
        icon_active_color: "Active Icon Color",
        ids: "Images",
        slides_to_show: "Slides to Show",
        slides_to_scroll: "Slides to Scroll",
        image_stretch: "Image Stretch",
        navigation: "Navigation",
        custom_urls: "Custom Links",
        caption: "Caption",
        lazyload: "Lazy Load",
        pause_on_hover: "Pause on Hover",
        pause_on_interaction: "Pause on Interaction",
        interval: "Autoplay Speed",
        effect: "Effect",
        speed: "Animation Speed",
        slide_direction: "Direction",
        image_spacing: "Image Spacing",
        arrows_size: "Arrows Size",
        arrows_color: "Arrows Color",
        dots_size: "Dots Size",
        dots_color: "Dots Color",
        caption_align: "Caption Align",
        caption_color: "Caption Color",
        address: "Address",
        zoom: "Zoom",
        height: "Height",
        visual: "Visual Player",
        auto_play: "Autoplay",
        buying: "Buy Button",
        liking: "Like Button",
        download: "Download",
        show_artwork: "Artwork",
        sharing: "Share",
        show_comments: "Comments",
        show_playcount: "Play Count",
        show_user: "Username",
        player_color: "Color",
        html: "HTML",
        shortcode: "Shortcode",
        code: "Code",
        language: "Language",
        anchor: "Anchor ID",
        display_name: "Display name",
        widget: "Widget",
        widget_options: "Options",
        sidebar: "Sidebar",
        layout: "Layout",
        html_tag: "HTML Tag",
        overlay_color: "Overlay Color",
        overlay_opacity: "Overlay Opacity",
        overlay_blend_mode: "Blend Mode",
        shape_top: "Top Shape",
        shape_bottom: "Bottom Shape",
        shape_top_color: "Top Shape Color",
        shape_bottom_color: "Bottom Shape Color",
        shape_top_height: "Top Shape Height",
        shape_bottom_height: "Bottom Shape Height",
        background_video: "Background Video",
        background_video_poster: "Video Poster",
        background_video_mobile: "Play Video on Mobile",
        justify: "Justify",
        wrap: "Wrap",
        direction: "Direction",
        min_height: "Min Height",
        max_width: "Max Width",
        overflow: "Overflow",
        front_title: "Front Title",
        front_text: "Front Text",
        back_title: "Back Title",
        back_text: "Back Text",
        price: "Price",
        period: "Period",
        features: "Features",
        button: "Button Text",
        submit: "Submit",
        success: "Success Message",
        email: "Send To",
        honeypot: "Honeypot",
        fields: "Fields",
        subtitle: "Subtitle",
        avatar: "Avatar",
        speed: "Speed",
        redirect: "Redirect",
        component_id: "Component",
        template_id: "Saved Template",
        object_fit: "Object Fit",
        object_position: "Object Position",
        loading: "Lazy Load",
        mask_shape: "Mask",
        button_type: "Type",
        link_to: "Link",
        shape_top_width: "Top Shape Width",
        shape_bottom_width: "Bottom Shape Width",
        shape_top_flip: "Flip Top Shape",
        shape_bottom_flip: "Flip Bottom Shape",
        shape_top_front: "Bring Top Shape Front",
        shape_bottom_front: "Bring Bottom Shape Front",
        background_video_start: "Video Start",
        background_video_end: "Video End",
        background_video_loop: "Loop Video",
        front_background: "Background",
        back_background: "Background",
        front_align: "Horizontal Align",
        back_align: "Horizontal Align",
        front_valign: "Vertical Align",
        back_valign: "Vertical Align"
      };
      const STYLE_KEY = /(_color|_background|_size|_gap|_space|_spacing|_padding|_radius|_width|_height|_opacity|_weight|_indent|_stretch)$|^(hover_|secondary_color|unmarked_color|space_between|unit_spacing|thickness|pattern_size|nav_width|overlay_|shape_|dots_|arrows_|font_|weight|color|background|border|shadow|opacity|filter|transform)/;
      const SKIP = /* @__PURE__ */ new Set(["image_url", "poster_url", "overlay_image_url", "css_class", "css_id", "global_class", "custom_css", "html_attributes", "hide_desktop", "hide_laptop", "hide_tablet_extra", "hide_tablet", "hide_mobile_extra", "hide_mobile", "hide_widescreen", "class_mode", "variable_ref", "width", "height", "max_width", "min_height", "margin", "padding", "opacity", "overflow", "position", "z_index", "top", "right", "bottom", "left", "display", "visibility", "background", "background_image", "background_size", "background_position", "background_repeat", "background_gradient", "background_overlay", "border_width", "border_style", "border_color", "border_radius", "shadow", "box_shadow", "filter", "transform", "mix_blend_mode", "font_family", "font_size", "font_weight", "font_style", "text_transform", "text_decoration", "line_height", "letter_spacing", "text_shadow", "mask_shape", "collections", "media_urls", "media_ratios"]);
      const SLIDER = {
        size: { unitless: true, min: 8, max: 200 },
        font_size: { units: ["px", "em", "rem"], min: 6, max: 200 },
        line_height: { unitless: true, min: 0.6, max: 3, step: 0.05 },
        letter_spacing: { unitless: true, min: -5, max: 20, step: 0.1 },
        gap: { unitless: true, min: 0, max: 80 },
        column_gap: { unitless: true, min: 0, max: 80 },
        row_gap: { unitless: true, min: 0, max: 80 },
        icon_size: { unitless: true, min: 8, max: 200 },
        icon_spacing: { unitless: true, min: 0, max: 60 },
        icon_space: { unitless: true, min: 0, max: 80 },
        icon_padding: { unitless: true, min: 0, max: 80 },
        icon_border_width: { unitless: true, min: 0, max: 20 },
        icon_radius: { unitless: true, min: 0, max: 200 },
        rotate: { unitless: true, min: 0, max: 360 },
        thickness: { unitless: true, min: 1, max: 20 },
        divider_gap: { unitless: true, min: 0, max: 80 },
        pattern_size: { unitless: true, min: 4, max: 80 },
        unit_spacing: { unitless: true, min: 0, max: 80 },
        space_between: { unitless: true, min: 0, max: 80 },
        title_space: { unitless: true, min: 0, max: 80 },
        title_gap: { unitless: true, min: 0, max: 80 },
        star_gap: { unitless: true, min: 0, max: 40 },
        text_indent: { unitless: true, min: 0, max: 80 },
        drop_cap_size: { unitless: true, min: 20, max: 200 },
        drop_cap_space: { unitless: true, min: 0, max: 40 },
        paragraph_spacing: { unitless: true, min: 0, max: 80 },
        radius: { unitless: true, min: 0, max: 80 },
        border_width: { unitless: true, min: 0, max: 20 },
        image_space: { unitless: true, min: 0, max: 80 },
        image_radius: { unitless: true, min: 0, max: 200 },
        image_opacity: { unitless: true, min: 0, max: 1, step: 0.05 },
        image_hover_opacity: { unitless: true, min: 0, max: 1, step: 0.05 },
        play_icon_size: { unitless: true, min: 20, max: 160 },
        bar_height: { unitless: true, min: 2, max: 80 },
        bar_radius: { unitless: true, min: 0, max: 40 },
        value: { unitless: true, min: 0, max: 100 },
        rating: { unitless: true, min: 0, max: 10, step: 0.1 },
        number_size: { unitless: true, min: 12, max: 120 },
        title_gap: { unitless: true, min: 0, max: 40 },
        duration: { unitless: true, min: 0, max: 8e3, step: 50 },
        start: { unitless: true, min: 0, max: 36e3 },
        end: { unitless: true, min: 0, max: 36e3 },
        number: { unitless: true, min: 0, max: 5e7 },
        height: { unitless: true, min: 0, max: 1200 },
        zoom: { unitless: true, min: 1, max: 21 },
        slides_to_show: { unitless: true, min: 1, max: 10 },
        slides_to_scroll: { unitless: true, min: 1, max: 10 },
        interval: { unitless: true, min: 500, max: 15e3, step: 100 },
        speed: { unitless: true, min: 100, max: 3e3, step: 50 },
        image_spacing: { unitless: true, min: 0, max: 80 },
        arrows_size: { unitless: true, min: 10, max: 80 },
        dots_size: { unitless: true, min: 4, max: 40 },
        overlay_opacity: { unitless: true, min: 0, max: 1, step: 0.05 },
        shape_top_height: { unitless: true, min: 10, max: 400 },
        shape_bottom_height: { unitless: true, min: 10, max: 400 },
        columns: { unitless: true, min: 0, max: 12 },
        nav_width: { units: ["%", "px"], min: 10, max: 80 },
        opacity: { unitless: true, min: 0, max: 1, step: 0.05 },
        max: { unitless: true, min: 1, max: 10 },
        dismiss_size: { unitless: true, min: 8, max: 48 },
        icon_active_color: null
      };
      function pretty(k) {
        return LABELS[k] || String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
      function inferType(k, e) {
        if (e.controls && e.controls[k]) return app.lbCtrlType(e.controls[k]);
        if (/(_id)$/.test(k)) return "media";
        if (/color/.test(k)) return "color";
        if (/^(url|link)$/.test(k) || /_url$/.test(k)) return "url";
        if (SLIDER[k]) return "number";
        return "text";
      }
      function lbParityControl(n, k) {
        const e = app.meta(n.type), s = n.settings || {}, raw = e.controls && e.controls[k], def = app.lbCtrlDef(raw), t3 = def.type || inferType(k, e), v = s[k], label = def.label || pretty(k);
        if (def.hidden || !app.lbConditionMet(def.condition, s)) return "";
        if (k === "menu" && n.type === "menu_anchor") {
          if (!app.menuAnchorInPlace(n)) return "";
          return app.menuAnchorSelect(k, label, v ?? "");
        }
        if (t3 === "slider") return app.control(k, raw || t3, v ?? "", label);
        if (t3 === "icon" || k === "icon" || /_icon$/.test(k)) return app.control(k, t3 === "icon" && raw ? raw : "icon", v || "", label);
        if (t3 !== "select" && t3 !== "choose" && t3 !== "switch" && t3 !== "color" && t3 !== "media" && t3 !== "gallery" && t3 !== "wysiwyg" && t3 !== "textarea" && t3 !== "code" && t3 !== "icon" && (t3 === "number" || SLIDER[k])) {
          const spec = SLIDER[k] || { unitless: true, min: 0, max: 200, step: 1 };
          return app.lbSlider(k, label, v ?? "", spec);
        }
        if (t3 === "select" || t3 === "choose") {
          if (def.options) return app.control(k, raw || t3, v ?? "", label);
          let opts = app.optionsFor(k);
          if (!opts || !opts.length) opts = [""];
          return app.lb09Select(k, label, v ?? opts[0] ?? "", opts);
        }
        if (t3 === "switch") return `<label class="lb-control lb-switch"><input data-setting="${app.esc(k)}" type="checkbox" ${v ? "checked" : ""}><span>${app.esc(label)}</span></label>`;
        return app.control(k, raw || t3, v ?? (t3 === "spacing" || t3 === "dimensions" || t3 === "box_shadow" ? {} : ""), label);
      }
      const UI = {
        text: { content: [["Text Editor", ["text", "drop_cap", "text_columns", "column_gap"]]], style: [["Text Editor", ["align", "color", "font_family", "font_size", "weight", "line_height", "letter_spacing", "paragraph_spacing", "link_color", "link_hover_color"]], ["Drop Cap", ["drop_cap_view", "drop_cap_color", "drop_cap_secondary_color", "drop_cap_size", "drop_cap_space", "drop_cap_radius", "drop_cap_border_width"]]] },
        tinymce_text_editor: { content: [["Text Editor", ["content"]]], style: [["Layout", ["width", "max_width", "height", "min_height"]], ["Text Editor", ["align", "color", "font_family", "font_size", "font_weight", "weight"]]] },
        divider: { content: [["Divider", ["style", "look", "text", "text_tag", "icon", "icon_view", "align", "unit_align"]]], style: [["Divider", ["color", "thickness", "divider_width", "divider_gap", "pattern_size", "unit_spacing", "text_color", "icon_color", "icon_size"]]] },
        spacer: { content: [["Spacer", ["height"]]] },
        icon_box: { content: [["Icon Box", ["icon", "icon_view", "shape", "title", "title_tag", "text", "link", "link_target", "box_layout", "content_align", "vertical_align", "hover_animation"]]], style: [["Icon", ["icon_size", "icon_space", "icon_color", "secondary_color", "hover_color", "hover_secondary_color", "icon_padding", "icon_border_width", "icon_radius", "rotate"]], ["Content", ["title_space", "title_color", "title_hover_color", "text_color"]]] },
        image_box: { content: [["Image Box", ["image_id", "image_size", "alt", "title", "title_tag", "text", "link", "link_target", "box_layout", "content_align", "vertical_align", "hover_animation"]]], style: [["Image", ["image_width", "image_space", "image_radius", "image_opacity", "image_hover_opacity"]], ["Content", ["title_space", "title_color", "title_hover_color", "text_color"]]] },
        icon_list: { content: [["Icon List", ["items", "icon", "list_layout", "link_target", "icon_align", "divider"]]], style: [["List", ["space_between", "icon_size", "icon_color", "icon_hover_color", "text_color", "text_hover_color", "text_indent"]], ["Divider", ["divider_style", "divider_weight", "divider_color", "divider_width"]]] },
        social: { content: [["Social Icons", ["links", "target", "shape", "color_scheme", "align", "columns", "hover_animation"]]], style: [["Icon", ["color", "icon_color", "hover_color", "hover_icon_color", "size", "icon_padding", "gap", "row_gap", "icon_radius"]]] },
        star_rating: { content: [["Star Rating", ["scale", "rating", "unmarked_style", "title", "align"]]], style: [["Title", ["title_color", "title_gap"]], ["Stars", ["size", "star_gap", "color", "unmarked_color"]]] },
        rating: { content: [["Rating", ["rating", "max", "label", "icon", "empty_icon"]]], style: [["Stars", ["color", "size"]]] },
        testimonial: { content: [["Testimonial", ["quote", "image_id", "image_size", "author", "role", "link", "link_target", "image_position", "align", "name_tag"]]], style: [["Content", ["quote_color"]], ["Image", ["image_width", "image_radius"]], ["Name", ["name_color"]], ["Title", ["role_color"]]] },
        video: { content: [["Video", ["source", "url", "start", "end", "autoplay", "play_on_mobile", "mute", "loop", "controls", "show_related", "privacy_mode", "lazy_load", "preload", "download_button", "poster_id"]], ["Image Overlay", ["show_overlay", "overlay_image_id", "show_play_icon", "play_icon", "lightbox"]]], style: [["Video", ["aspect_ratio"]], ["Play Icon", ["play_icon_color", "play_icon_size"]]] },
        progress: { content: [["Progress Bar", ["label", "title_tag", "bar_style", "value", "show_percentage", "inner_text"]]], style: [["Progress Bar", ["title_color", "color", "background", "bar_height", "bar_radius", "inner_color"]]] },
        counter: { content: [["Counter", ["start", "number", "prefix", "suffix", "duration", "thousand_separator", "separator_char", "title", "title_tag", "title_position", "align"]]], style: [["Number", ["number_color", "number_size"]], ["Title", ["title_color", "title_gap"]]] },
        alert: { content: [["Alert", ["title", "text", "type", "dismissible", "dismiss_icon"]]], style: [["Alert", ["background", "border_color", "title_color", "text_color", "dismiss_color", "dismiss_size"]]] },
        accordion: { content: [["Accordion", ["items", "title_tag", "icon", "active_icon", "icon_position", "first_open", "faq_schema"]]], style: [["Title", ["title_color", "active_color", "title_background", "title_padding"]], ["Content", ["content_color", "content_background", "content_padding"]], ["Icon", ["icon_color", "icon_active_color", "icon_space"]], ["Border", ["border_color", "border_width", "space_between"]]] },
        toggle: { content: [["Toggle", ["items", "title_tag", "icon", "active_icon", "icon_position", "first_open"]]], style: [["Title", ["title_color", "active_color", "title_background", "title_padding"]], ["Content", ["content_color", "content_background", "content_padding"]], ["Icon", ["icon_color", "icon_active_color", "icon_space"]], ["Border", ["border_color", "border_width", "space_between"]]] },
        tabs: { content: [["Tabs", ["tabs", "orientation", "tabs_align", "title_tag"]]], style: [["Tabs", ["nav_width", "border_width", "border_color", "tab_background"]], ["Title", ["tab_color", "tab_active_color", "tab_active_background", "tab_padding"]], ["Content", ["content_color", "content_background", "content_padding"]]] },
        carousel: { content: [["Image Carousel", ["ids", "image_size", "slides_to_show", "slides_to_scroll", "image_stretch", "navigation", "link", "custom_urls", "lightbox", "caption", "lazyload", "autoplay", "pause_on_hover", "pause_on_interaction", "interval", "loop", "effect", "speed", "slide_direction"]]], style: [["Images", ["height", "image_spacing", "image_radius"]], ["Arrows", ["arrows_size", "arrows_color"]], ["Dots", ["dots_size", "dots_color"]], ["Caption", ["caption_align", "caption_color"]]] },
        google_maps: { content: [["Map", ["address", "zoom", "height"]]] },
        audio: { content: [["Audio", ["url", "preload", "autoplay", "loop", "controls"]]] },
        soundcloud: { content: [["SoundCloud", ["url", "visual", "height", "auto_play", "buying", "liking", "download", "show_artwork", "sharing", "show_comments", "show_playcount", "show_user", "player_color"]]] },
        html: { content: [["HTML", ["html"]]] },
        embed: { content: [["Embed", ["url"]]], style: [["Embed", ["aspect_ratio", "max_width"]]] },
        shortcode: { content: [["Shortcode", ["shortcode"]]] },
        code: { content: [["Code", ["code", "language"]]] },
        menu_anchor: { content: [["Menu Anchor", ["menu", "anchor"]]] },
        site_nav: { content: [["Site Menu", ["menu", "display_name", "layout", "breakpoint"]]], style: [["Site Menu", ["color", "hover_color", "background", "radius"]], ["Menu Button", ["button_color", "button_border_color", "button_hover_color", "button_hover_background", "button_hover_border"]]] },
        read_more: { content: [["Read More", ["text", "url", "target"]]] },
        sidebar: { content: [["Sidebar", ["sidebar"]]] },
        wordpress: { content: [["WordPress Widget", ["widget", "title", "widget_options", "sidebar"]]] },
        wordpress_widget: { content: [["WordPress Widget", ["widget", "title", "widget_options", "sidebar"]]] },
        link_in_bio: { content: [["Link In Bio", ["title", "subtitle", "avatar", "links", "layout"]]] },
        text_path: { content: [["Text Path", ["text", "link", "link_target", "path", "show_path", "speed"]]], style: [["Text", ["align", "color", "hover_color", "font_family", "font_size", "font_weight", "font_style", "text_transform", "text_decoration", "line_height", "letter_spacing", "word_spacing"]], ["Stroke", ["stroke_width", "stroke_color"]], ["Path", ["size", "path_color", "path_width"]]] },
        price_table: { content: [["Price Table", ["title", "price", "period", "features", "button", "url"]]] },
        login: { content: [["Login", ["title", "button", "redirect"]]] },
        form: { content: [["Form", ["title", "fields", "submit", "success", "email", "honeypot", "layout"]]] },
        flip_box: { content: [["Front", ["front_graphic", "front_icon", "front_icon_view", "front_shape", "front_image_id", "front_image_size", "front_title", "front_title_tag", "front_text"]], ["Back", ["back_graphic", "back_icon", "back_icon_view", "back_shape", "back_image_id", "back_image_size", "back_title", "back_title_tag", "back_text", "show_button", "back_button_text", "back_button_url", "back_button_target", "button_background", "button_text_color"]], ["Settings", ["flip_effect", "flip_direction", "flip_3d", "flip_depth", "flip_duration", "flip_trigger", "box_height"]]], style: [["Front", ["front_background", "front_align", "front_valign", "front_padding", "front_title_color", "front_title_typography", "front_title_space", "front_desc_color", "front_desc_typography", "front_icon_size", "front_icon_color", "front_icon_space", "front_image_width", "front_image_radius"]], ["Back", ["back_background", "back_align", "back_valign", "back_padding", "back_title_color", "back_title_typography", "back_title_space", "back_desc_color", "back_desc_typography", "back_icon_size", "back_icon_color", "back_icon_space", "back_image_width", "back_image_radius"]], ["Button", ["button_typography", "button_hover_background", "button_hover_color", "button_padding"]]] },
        component: { content: [["Component", ["component_id"]]] },
        template: { content: [["Template", ["template_id"]]] },
        inner_section: { content: [["Inner Section", ["layout", "direction", "wrap", "justify", "align", "gap", "columns"]]] },
        grid: { content: [["Grid", ["columns", "rows", "grid_template_columns", "grid_template_rows", "column_gap", "row_gap", "auto_flow", "align", "justify", "min_column", "min_row", "show_outline"]]] }
      };
      function leftovers(n, tab, used) {
        const e = app.meta(n.type), s = n.settings || {};
        let body = "";
        Object.entries(e.controls || {}).forEach(([k, t3]) => {
          const def = app.lbCtrlDef(t3);
          if (def.hidden || used.has(k) || SKIP.has(k) || app.advancedKeys.has(k)) return;
          const style = STYLE_KEY.test(k);
          if (tab === "content" && style) return;
          if (tab === "style" && !style) return;
          body += lbParityControl(n, k);
        });
        return body ? app.lb09Section(app.t("More"), body, false) : "";
      }
      function renderGroups(n, groups, used) {
        if (!groups) return "";
        return groups.map(([title, keys]) => {
          const body = keys.map((k) => {
            used.add(k);
            return lbParityControl(n, k);
          }).join("");
          return body ? app.lb09Section(title, body, true) : "";
        }).join("");
      }
      function lbParityAdvanced(n) {
        return app.lb09AdvancedTab(n);
      }
      function lbParityChrome(n) {
        const s = n.settings || {};
        const family = typeof app.lb104FontOptions === "function" ? `<label class="lb-control lb-font-family-control"><span>${app.esc(app.t("Font Family"))} <small>${app.esc(app.t("Google Fonts"))}</small></span><select data-setting="font_family" class="lb-font-family-select">${app.lb104FontOptions(s.font_family || "")}</select></label>` : app.lb09Field("font_family", app.t("Font Family"), "text", s.font_family);
        return app.lb09Section(app.t("Typography"), family + `<label class="lb-control"><span>${app.esc(app.t("Text Color"))}</span><input data-setting="color" type="color" value="${app.esc(s.color || s.text_color || "#222222")}"></label>` + app.lb09Select("font_weight", app.t("Weight"), s.font_weight || s.weight || "", ["", "300", "400", "500", "600", "700", "800", "900"]) + app.lb09Select("font_style", app.t("Style"), s.font_style || "", ["", "normal", "italic", "oblique"]) + app.lb09Select("text_transform", app.t("Transform"), s.text_transform || "", ["", "none", "uppercase", "lowercase", "capitalize"]) + app.lb09Select("text_decoration", app.t("Decoration"), s.text_decoration || "", ["", "none", "underline", "overline", "line-through"]) + app.control("text_shadow", "text_shadow", s.text_shadow || {}, app.t("Text Shadow")), true) + app.lb09Section(app.t("Background"), app.control("background", "background", typeof s.background === "object" ? s.background : s.background ? { type: "classic", color: s.background } : {}, app.t("Background")), false) + app.lb09Section(app.t("Border"), app.lb09Box("border_width", app.t("Border Width"), s.border_width) + app.lb09Select("border_style", app.t("Border Style"), s.border_style || "", ["", "solid", "dashed", "dotted", "double", "none"]) + `<label class="lb-control"><span>Border Color</span><input data-setting="border_color" type="color" value="${app.esc(s.border_color || "#dddddd")}"></label>` + app.lb09Box("border_radius", app.t("Radius"), s.border_radius) + app.control("shadow", "box_shadow", s.shadow || {}, "Shadow"), false);
      }
      function lbParitySettings(n) {
        const e = app.meta(n.type), s = n.settings || {}, spec = UI[n.type] || {};
        let h = `<div class="lb-selection-head"><strong>${app.esc(e.title || n.type)}</strong><span class="lb-selection-id">${app.esc(n.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
        const used = /* @__PURE__ */ new Set();
        if (app.styleTab === "content") {
          h += renderGroups(n, spec.content, used) + leftovers(n, "content", used);
        } else if (app.styleTab === "style") {
          h += renderGroups(n, spec.style, used) + leftovers(n, "style", used);
          if (!spec.style || !spec.style.length) h += lbParityChrome(n);
        } else {
          h += lbParityAdvanced(n);
        }
        const warn = app.accessibilityWarnings(n);
        h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div><div class="lb-action-grid"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
        return h;
      }
      const MASK = { circle: "circle(50% at 50% 50%)", ellipse: "ellipse(50% 42% at 50% 50%)", hexagon: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", triangle: "polygon(50% 0%,0% 100%,100% 100%)", diamond: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", pill: "inset(0 round 999px)" };
      const lb35OldLabel = app.optionLabel;
      app.optionLabel = function(k, o) {
        const extra = { youtube: "YouTube", vimeo: "Vimeo", dailymotion: "Dailymotion", videopress: "VideoPress", hosted: "Self Hosted", info: "Info", success: "Success", warning: "Warning", danger: "Danger", xs: "Extra Small", xl: "Extra Large", xxl: "XXL", before: "Before", after: "After", traditional: "Traditional", inline: "Inline", aside: "Aside", official: "Official", custom: "Custom", solid: "Solid", outline: "Outline", horizontal: "Horizontal", vertical: "Vertical", both: "Arrows and Dots", arrows: "Arrows", dots: "Dots", slide: "Slide", fade: "Fade", ltr: "Left to Right", rtl: "Right to Left", circle: "Circle", ellipse: "Ellipse", hexagon: "Hexagon", triangle: "Triangle", diamond: "Diamond", pill: "Pill", line: "None", line_text: "Text", line_icon: "Icon", stacked: "Stacked", framed: "Framed", file: "Media File", attachment: "Attachment Page", none: "None", pop: "Pop", "grow-rotate": "Grow Rotate", stack: "Stacked", two_column: "Two Columns" };
        return extra[o] || lb35OldLabel(k, o);
      };
      const lb35OldOpts = app.optionsFor;
      app.optionsFor = function(k) {
        const r = app.selected && app.locate(app.state.root, app.selected), type = r && r.node && r.node.type;
        if (k === "button_type") return ["default", "info", "success", "warning", "danger"];
        if (k === "link_to") return ["none", "file", "custom"];
        if (k === "mask_shape") return ["", "circle", "ellipse", "hexagon", "triangle", "diamond", "pill"];
        if (k === "html_tag") return ["div", "section", "header", "footer", "main", "article", "aside", "nav"];
        if (k === "language") return ["html", "css", "js", "php", "json", "text"];
        if (type === "form" && k === "layout") return ["stack", "inline", "two-column"];
        if (k === "hover_animation") {
          const base = lb35OldOpts(k) || [];
          return [...new Set(base.concat(["", "zoom", "grow", "shrink", "lift", "sink", "fade", "rotate", "float", "pulse", "skew", "wobble", "buzz", "pop", "grow-rotate"]))];
        }
        const got = lb35OldOpts(k);
        return got && got.length ? got : [];
      };
      const BUTTON_TYPES = /* @__PURE__ */ new Set(["button", "form", "flip_box", "price_table", "login", "read_more", "link_in_bio", "collection_loop"]);
      function usesButton(n) {
        const e = app.meta(n && n.type) || {};
        if (Object.prototype.hasOwnProperty.call(e, "uses_button")) return !!e.uses_button;
        return BUTTON_TYPES.has(n && n.type);
      }
      const lb35OldAdv = app.lb09AdvancedTab;
      app.lb09AdvancedTab = function(n) {
        const s = n.settings || {}, pos = s.position || "";
        const offset = pos && pos !== "relative" ? app.lb09Section(app.t("Offset"), app.lbSlider("top", "Top", s.top || "", { units: ["px", app.t("%"), "em"], min: -400, max: 400 }) + app.lbSlider("right", "Right", s.right || "", { units: ["px", app.t("%"), "em"], min: -400, max: 400 }) + app.lbSlider("bottom", "Bottom", s.bottom || "", { units: ["px", app.t("%"), "em"], min: -400, max: 400 }) + app.lbSlider("left", "Left", s.left || "", { units: ["px", app.t("%"), "em"], min: -400, max: 400 }), false) : "";
        const btnRadius = usesButton(n) ? app.lbSlider("button_radius", app.t("Button Radius"), s.button_radius || "", { units: ["px", app.t("%")], min: 0, max: 80 }) : "";
        return lb35OldAdv(n) + offset + app.lb09Section(app.t("Transform"), app.control("transform", "transform", s.transform || {}, app.t("Transform")) + app.control("filter", "css_filter", s.filter || {}, app.t("CSS Filter")) + app.control("transition", "transition", s.transition || {}, app.t("Transition")) + app.lb09Select("mix_blend_mode", app.t("Blend Mode"), s.mix_blend_mode || "", ["", "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"]), false) + app.lb09Section(app.t("Mask"), app.lb09Select("mask_shape", app.t("Shape"), s.mask_shape || "", ["", "circle", "ellipse", "hexagon", "triangle", "diamond", "pill"]), false) + app.lb09Section(app.t("Border"), app.lb09Box("border_width", app.t("Border Width"), s.border_width) + app.lb09Select("border_style", app.t("Border Style"), s.border_style || "", ["", "solid", "dashed", "dotted", "double", "none"]) + `<label class="lb-control"><span>Border Color</span><input data-setting="border_color" type="color" value="${app.esc(s.border_color || "#dddddd")}"></label>` + app.lb09Box("border_radius", app.t("Radius"), s.border_radius) + btnRadius + app.control("shadow", "box_shadow", s.shadow || {}, "Shadow"), false) + app.lb09GridChild(n);
      };
      const lb35OldStyle = app.styleInline;
      app.styleInline = function(n) {
        let css = lb35OldStyle(n);
        const m = MASK[(n.settings || {}).mask_shape];
        if (m) css += (css && !css.endsWith(";") ? ";" : "") + "clip-path:" + m;
        return css;
      };
      const lb35OldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = lb35OldNode(n);
        const s = n.settings || {};
        const extra = [];
        const m = MASK[s.mask_shape];
        if (m) extra.push("clip-path:" + m);
        if (s.position) extra.push("position:" + s.position);
        ["top", "right", "bottom", "left"].forEach((k) => {
          const v = String(app.resp(s[k]) || "").trim();
          if (v) extra.push(k + ":" + v);
        });
        if (!extra.length) return html;
        const tag = html.match(/^<div\b[^>]*>/);
        if (!tag) return html;
        let open = tag[0];
        const css = extra.join(";") + ";";
        if (/\sstyle="/i.test(open)) open = open.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + css + '"');
        else open = open.replace(/>$/, ' style="' + css + '">');
        return open + html.slice(tag[0].length);
      };
      const lb35OldBody = app.bodyHTML;
      app.bodyHTML = function(n) {
        if (n.type !== "image") return lb35OldBody(n);
        const s = Object.assign({}, n.settings || {});
        if (s.link_to === "file") s.lightbox = true;
        if (s.link_to === "none") {
          s.lightbox = false;
          s.link = "";
        }
        return lb35OldBody(Object.assign({}, n, { settings: s }));
      };
      const lb35OldSettings = app.settingsHTML;
      app.settingsHTML = function() {
        if (!app.selected) return '<div class="lb-empty-settings">' + app.t("Select a unit to edit its settings.") + "</div>";
        const r = app.locate(app.state.root, app.selected);
        if (!r) return lb35OldSettings();
        if (r.node.type === "gallery") return app.lb09GallerySettings(r.node);
        return lbParitySettings(r.node);
      };
      const lb35OldRefresh = app.refreshRightPanel;
      app.refreshRightPanel = function() {
        lb35OldRefresh();
        app.bindSliders();
      };
    })();
    (function() {
      const MEDIA = ["image", "video", "gallery", "carousel", "audio", "image_box", "soundcloud", "embed"];
      const FIT = ["cover", "contain", "fill", "none", "scale-down"];
      function lb40Vars(n) {
        const s = n.settings || {};
        const w = String(app.resp(s.width) || "100%").trim() || "100%";
        const mw = String(app.resp(s.max_width) || "100%").trim() || "100%";
        const h = String(app.resp(s.height) || "").trim() || "auto";
        const fit = FIT.includes(String(s.object_fit || "")) ? s.object_fit : "cover";
        const pos = String(s.object_position || "center").trim() || "center";
        const align = String(s.alignment || "left");
        const items = { left: "flex-start", center: "center", right: "flex-end" }[align] || "flex-start";
        const margin = app.formatBox(s.margin), padding = app.formatBox(s.padding);
        const css = [
          "--lb-img-w:" + w,
          "--lb-img-max-w:" + mw,
          "--lb-img-h:" + h,
          "--lb-object-fit:" + fit,
          "--lb-object-position:" + pos,
          "--lb-media-items:" + items,
          "max-width:100%",
          "min-width:0",
          "overflow:hidden",
          "box-sizing:border-box"
        ];
        if (margin && margin !== "0 0 0 0") css.push("margin:" + margin);
        if (padding && padding !== "0 0 0 0") css.push("padding:" + padding);
        return css.join(";") + ";";
      }
      const CSS2 = `
    .lb-grid-inner>.lb-node,.lb-container-inner[style*="display:grid"]>.lb-node{
      min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important
    }
    .lb-grid-inner>.lb-node.lb-node-image,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-image,
    .lb-grid-inner>.lb-node.lb-node-video,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-video,
    .lb-grid-inner>.lb-node.lb-node-carousel,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-carousel,
    .lb-grid-inner>.lb-node.lb-node-audio,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-audio,
    .lb-grid-inner>.lb-node.lb-node-image_box,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-image_box,
    .lb-grid-inner>.lb-node.lb-node-gallery,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-gallery,
    .lb-grid-inner>.lb-node.lb-node-soundcloud,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-soundcloud,
    .lb-grid-inner>.lb-node.lb-node-embed,.lb-container-inner[style*="display:grid"]>.lb-node.lb-node-embed{
      width:auto!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;
      display:flex!important;flex-direction:column!important;align-items:var(--lb-media-items,stretch)!important;
      justify-self:stretch!important;box-sizing:border-box!important
    }
    .lb-node.lb-node-image .lb-image,.lb-node.lb-node-image .lb-image-preview{
      width:var(--lb-img-w,100%)!important;max-width:min(100%,var(--lb-img-max-w,100%))!important;
      height:var(--lb-img-h,auto)!important;overflow:hidden!important;margin:0;line-height:0
    }
    .lb-node.lb-node-image img,.lb-node.lb-node-image .lb-image-img{
      display:block!important;width:100%!important;max-width:100%!important;
      height:var(--lb-img-h,auto)!important;max-height:100%;
      object-fit:var(--lb-object-fit,cover)!important;object-position:var(--lb-object-position,center)!important
    }
    .lb-node.lb-node-video,.lb-node.lb-node-carousel,.lb-node.lb-node-audio,.lb-node.lb-node-image_box{
      width:100%;max-width:var(--lb-img-max-w,100%);overflow:hidden
    }
    .lb-node.lb-node-video .lb-video,.lb-node.lb-node-carousel .lb-carousel,.lb-node.lb-node-image_box .lb-image-box{
      width:var(--lb-img-w,100%);max-width:100%;overflow:hidden
    }
    .lb-node.lb-node-video video,.lb-node.lb-node-video .lb-video-media,.lb-node.lb-node-carousel img,.lb-node.lb-node-image_box img{
      max-width:100%;object-fit:var(--lb-object-fit,cover);object-position:var(--lb-object-position,center)
    }
  `;
      const lb40OldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = lb40OldNode(n);
        if (!MEDIA.includes(n.type)) return html;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        const extra = lb40Vars(n);
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + extra + '"');
        else tag = tag.replace(/>$/, ' style="' + extra + '">');
        const s = n.settings || {}, align = ["center", "right"].includes(String(s.alignment || "left")) ? s.alignment : "left";
        if (n.type === "image") {
          const cls = "lb-img-align-" + align;
          if (!tag.includes(cls)) tag = tag.replace("lb-node-image", "lb-node-image " + cls);
        }
        return tag + html.slice(m[0].length);
      };
      function lb40Inject(fd) {
        if (!fd || !fd.head) return;
        let st = fd.getElementById("lb40-media-style");
        if (!st) {
          st = fd.createElement("style");
          st.id = "lb40-media-style";
          fd.head.appendChild(st);
        }
        st.textContent = CSS2;
      }
      const lb40OldFrame = app.frameHTML;
      app.frameHTML = function() {
        return lb40OldFrame().replace("</style></head>", CSS2 + "</style></head>");
      };
      const lb40OldRender = app.render;
      app.render = function() {
        lb40OldRender();
        const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
        if (fd) lb40Inject(fd);
      };
      document.getElementById("lb-editor-frame")?.addEventListener("load", () => lb40Inject(app.frameDoc()));
    })();
    (function() {
      function lbSchemaEmpty(def) {
        const t3 = def.type || "text";
        if (t3 === "spacing" || t3 === "dimensions" || t3 === "box_shadow" || t3 === "typography" || t3 === "border" || t3 === "background" || t3 === "text_shadow" || t3 === "css_filter" || t3 === "transform" || t3 === "transition" || t3 === "gaps") return {};
        if (t3 === "switch") return false;
        if (t3 === "repeater") return Array.isArray(def.default) ? JSON.parse(JSON.stringify(def.default)) : [];
        return Object.prototype.hasOwnProperty.call(def, "default") ? def.default : "";
      }
      function lbSchemaField(k, def, s) {
        if (!def || def.hidden) return "";
        if (!app.lbConditionMet(def.condition, s)) return "";
        const v = s[k] !== void 0 ? s[k] : lbSchemaEmpty(def);
        let html = app.control(k, def, v, def.label);
        if (!html) return "";
        if (def.description) html += `<p class="lb-control-desc">${app.esc(def.description)}</p>`;
        if (def.separator === "before") html = `<hr class="lb-control-separator">` + html;
        if (def.separator === "after") html += `<hr class="lb-control-separator">`;
        return html;
      }
      function lbSchemaSettings(n) {
        const e = app.meta(n.type), s = n.settings || {}, controls = e.controls || {};
        const loc = app.locate(app.state.root, n.id);
        const parent = loc && loc.parent;
        const inGrid = !!parent && (parent.type === "grid" || parent.type === "container" && String(parent.settings && parent.settings.layout || "") === "grid");
        let h = `<div class="lb-selection-head"><strong>${app.esc(e.title || n.type)}</strong><span class="lb-selection-id">${app.esc(n.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
        const map = {}, order = [];
        Object.entries(controls).forEach(([k, raw]) => {
          const def = app.lbCtrlDef(raw);
          if (def.hidden) return;
          const tab = def.tab || "content";
          if (tab !== app.styleTab) return;
          if (!app.lbConditionMet(def.condition, s)) return;
          const section = def.section || (tab === "style" ? "Style" : tab === "advanced" ? "Advanced" : "General");
          if (section === "Grid Item" && !inGrid) return;
          if (!map[section]) {
            map[section] = [];
            order.push(section);
          }
          map[section].push([k, def]);
        });
        h += order.map((title) => {
          const body = map[title].map(([k, def]) => lbSchemaField(k, def, s)).join("");
          return body ? app.lb09Section(title, body, true) : "";
        }).join("");
        const warn = app.accessibilityWarnings(n);
        h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div><div class="lb-action-grid"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
        return h;
      }
      const lb02OldSettings = app.settingsHTML;
      app.settingsHTML = function() {
        if (!app.selected) return '<div class="lb-empty-settings">' + app.t("Select a unit to edit its settings.") + "</div>";
        const r = app.locate(app.state.root, app.selected);
        if (!r) return lb02OldSettings();
        const html = app.meta(r.node.type).schema ? lbSchemaSettings(r.node) : lb02OldSettings();
        return app.LB.hooks.applyFilters("editor/settings/html", html, r.node, app.styleTab);
      };
    })();
    (function() {
      const CSS2 = `
    .lb-node.lb-node-tinymce_text_editor{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;}
    .lb-node.lb-node-tinymce_text_editor .lb-tinymce-preview,
    .lb-node.lb-node-tinymce_text_editor .lb-tinymce-text-editor{
      width:var(--lb-tiny-w,100%)!important;max-width:min(100%,var(--lb-tiny-max-w,100%))!important;
      height:var(--lb-tiny-h,auto)!important;min-height:var(--lb-tiny-min-h,0);
      box-sizing:border-box!important;overflow:auto;min-width:0;
    }
  `;
      function tinyVars(n) {
        const s = n.settings || {};
        const w = String(app.resp(s.width) || "").trim();
        const mw = String(app.resp(s.max_width) || "").trim();
        const h = String(app.resp(s.height) || "").trim();
        const mh = String(app.resp(s.min_height) || "").trim();
        const css = [
          "max-width:100%",
          "min-width:0",
          "box-sizing:border-box",
          "--lb-tiny-w:" + (w || "100%"),
          "--lb-tiny-max-w:" + (mw || "100%"),
          "--lb-tiny-h:" + (h || "auto"),
          "--lb-tiny-min-h:" + (mh || "0")
        ];
        return css.join(";") + ";";
      }
      const oldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = oldNode(n);
        if (n.type !== "tinymce_text_editor") return html;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        const extra = tinyVars(n);
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + extra + '"');
        else tag = tag.replace(/>$/, ' style="' + extra + '">');
        return tag + html.slice(m[0].length);
      };
      function inject(fd) {
        if (!fd || !fd.head) return;
        let st = fd.getElementById("lb-tiny-size-style");
        if (!st) {
          st = fd.createElement("style");
          st.id = "lb-tiny-size-style";
          fd.head.appendChild(st);
        }
        st.textContent = CSS2;
      }
      const oldFrame = app.frameHTML;
      app.frameHTML = function() {
        return oldFrame().replace("</style></head>", CSS2 + "</style></head>");
      };
      const oldSettings = app.settingsHTML;
      app.settingsHTML = function() {
        if (!app.selected) return oldSettings();
        const r = app.locate(app.state.root, app.selected);
        if (!r || r.node.type !== "tinymce_text_editor") return oldSettings();
        if (app.styleTab === "content") {
          const s = r.node.settings || {};
          const content = String(s.content || "<p>Start writing your content here.</p>");
          let h = `<div class="lb-selection-head"><strong>TinyMCE Text Editor</strong><span class="lb-selection-id">${app.esc(r.node.id)}</span></div>`;
          h += `<div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
          h += `<div class="lb-section"><div class="lb-section-title"><span>\u25BE</span><strong>Content</strong></div><div class="lb-section-body"><label class="lb-control"><span>Content</span><textarea id="lb-tinymce-inline-content" rows="9" spellcheck="true">${app.esc(content)}</textarea><small class="lb-muted">Edit the content directly, or use Edit with TinyMCE for rich-text formatting.</small></label><button type="button" class="lb-btn primary lb-tinymce-open" id="lb-tinymce-open">Edit with TinyMCE</button></div></div>`;
          h += `<div class="lb-action-grid lb-tinymce-actions-secondary"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
          return h;
        }
        let html = oldSettings();
        if (app.styleTab === "style" && !/data-slider-key="width/.test(html)) {
          html = html.replace('<div class="lb-action-grid"', app.lb09LayoutSliders(r.node.settings || {}) + '<div class="lb-action-grid"');
        }
        return html;
      };
      function bindTiny() {
        if (!app.selected) return;
        const r = app.locate(app.state.root, app.selected);
        if (!r || r.node.type !== "tinymce_text_editor") return;
        const ta = app.root.querySelector("#lb-tinymce-inline-content");
        if (ta && ta.dataset.lbTinyBound !== "1") {
          ta.dataset.lbTinyBound = "1";
          ta.addEventListener("input", () => {
            const rr = app.locate(app.state.root, app.selected);
            if (!rr) return;
            rr.node.settings = rr.node.settings || {};
            rr.node.settings.content = ta.value;
            app.dirty = true;
            if (app.scheduleSave) app.scheduleSave();
            if (typeof app.previewSetting === "function") app.previewSetting("content", rr.node.id);
          });
          ta.addEventListener("blur", () => {
            if (typeof app.previewSetting !== "function") app.render();
          });
        }
        const btn = app.root.querySelector("#lb-tinymce-open");
        if (btn && btn.dataset.lbTinyBound !== "1") {
          btn.dataset.lbTinyBound = "1";
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.openTinyMCEEditor(app.selected);
          });
        }
      }
      const oldRender = app.render;
      app.render = function() {
        oldRender();
        inject(typeof app.frameDoc === "function" ? app.frameDoc() : null);
        setTimeout(bindTiny, 0);
      };
      const oldRefresh = app.refreshRightPanel;
      app.refreshRightPanel = function() {
        oldRefresh();
        app.bindSliders();
        setTimeout(bindTiny, 0);
      };
      document.getElementById("lb-editor-frame")?.addEventListener("load", () => inject(app.frameDoc()));
    })();
    (function() {
      const SKIP = /* @__PURE__ */ new Set(["container", "grid", "image", "tinymce_text_editor"]);
      function sizeCss(n) {
        const s = n.settings || {};
        const val = (k) => {
          const v = String(typeof app.resp === "function" ? app.resp(s[k]) : s[k] || "").trim();
          if (!v) return "";
          return /^-?\d+(\.\d+)?$/.test(v) ? v + "px" : v;
        };
        const w = val("width"), mw = val("max_width"), h = val("height"), mh = val("min_height");
        const css = [];
        if (w) css.push("--lb-el-w:" + w, "width:" + w);
        if (mw) css.push("--lb-el-max-w:" + mw, "max-width:" + mw);
        if (h) css.push("--lb-el-h:" + h, "height:" + h);
        if (mh) css.push("--lb-el-min-h:" + mh, "min-height:" + mh);
        return css.length ? css.join(";") + ";" : "";
      }
      const oldNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = oldNode(n);
        if (!n || SKIP.has(n.type)) return html;
        const extra = sizeCss(n);
        if (!extra) return html;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        if (/\sstyle="/i.test(tag)) tag = tag.replace(/style="([^"]*)"/i, (_, st) => 'style="' + st + extra + '"');
        else tag = tag.replace(/>$/, ' style="' + extra + '">');
        return tag + html.slice(m[0].length);
      };
    })();
    (function() {
      function childBox(axis) {
        const row = axis === "row";
        return {
          id: app.eid(),
          type: "container",
          settings: {
            layout: "flex",
            direction: "column",
            wrap: "nowrap",
            justify: "flex-start",
            align: "stretch",
            gap: 16,
            width: row ? "" : "100%",
            flex_grow: row ? 1 : 0,
            flex_shrink: 1,
            flex_basis: row ? "0%" : "auto",
            min_height: "80px",
            padding: [],
            margin: []
          },
          atomic: true,
          styles: { base: {} },
          interactions: [],
          editor_settings: {},
          children: []
        };
      }
      function occupied(nodes) {
        return (nodes || []).some((n) => n.type !== "container" || n.children && n.children.length);
      }
      function keepFirst(nodes, cells) {
        if (nodes && nodes.length) cells[0].children = nodes.slice();
        return cells;
      }
      function applySplit(id, cols, rows) {
        const r = app.locate(app.state.root, id);
        if (!r || r.node.type !== "container") return;
        cols = Math.max(1, Math.min(12, cols | 0));
        rows = Math.max(1, Math.min(12, rows | 0));
        const old = Array.isArray(r.node.children) ? r.node.children.slice() : [];
        if (occupied(old) && !window.confirm("This container already has content. Move it into the first cell?")) return;
        const axis = rows === 1 ? "row" : cols === 1 ? "column" : "grid";
        const cells = [];
        for (let i = 0; i < cols * rows; i++) cells.push(childBox(axis === "row" ? "row" : "column"));
        app.commit();
        r.node.children = keepFirst(old, cells);
        r.node.settings = r.node.settings || {};
        if (axis === "grid") {
          r.node.settings.layout = "grid";
          r.node.settings.columns = cols;
          r.node.settings.grid_rows = rows;
          r.node.settings.grid_template_columns = "repeat(" + cols + ", minmax(0, 1fr))";
          r.node.settings.grid_template_rows = "repeat(" + rows + ", minmax(80px, auto))";
        } else {
          r.node.settings.layout = "flex";
          r.node.settings.direction = axis === "row" ? "row" : "column";
          r.node.settings.wrap = "nowrap";
          r.node.settings.align = "stretch";
          r.node.settings.grid_template_columns = "";
          r.node.settings.grid_template_rows = "";
          r.node.settings.grid_rows = "";
        }
        app.selected = id;
        app.activeTab = "settings";
        app.styleTab = "content";
        app.dirty = true;
        app.render();
      }
      function markColumns(nodes) {
        nodes.forEach((c) => {
          if (c.type !== "container") return;
          c.settings = c.settings || {};
          c.settings.flex_grow = 1;
          c.settings.flex_shrink = 1;
          c.settings.flex_basis = "0%";
          c.settings.width = "";
          if (!c.settings.min_height) c.settings.min_height = "80px";
        });
      }
      function addAxis(id, axis) {
        const r = app.locate(app.state.root, id);
        if (!r || r.node.type !== "container") return;
        const s = r.node.settings = r.node.settings || {};
        const old = Array.isArray(r.node.children) ? r.node.children.slice() : [];
        app.commit();
        if (s.layout === "grid") {
          const cols = Math.max(1, parseInt(s.columns, 10) || 1);
          const rows = Math.max(1, parseInt(s.grid_rows || s.rows, 10) || 1);
          if (axis === "column") {
            const next = [];
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) next.push(old[row * cols + col] || childBox("column"));
              next.push(childBox("column"));
            }
            r.node.children = next;
            s.columns = cols + 1;
            s.grid_template_columns = "repeat(" + (cols + 1) + ", minmax(0, 1fr))";
          } else {
            for (let i = 0; i < cols; i++) old.push(childBox("column"));
            r.node.children = old;
            s.grid_rows = rows + 1;
            s.grid_template_rows = "repeat(" + (rows + 1) + ", minmax(80px, auto))";
          }
        } else if (axis === "column") {
          const dirNow = app.resp(s.direction);
          const rowish = dirNow === "row" || dirNow === "row-reverse";
          if (rowish && old.length && old.every((n) => n.type === "container")) {
            old.push(childBox("row"));
            markColumns(old);
            r.node.children = old;
          } else {
            const first = childBox("row");
            if (old.length) first.children = old;
            const second = childBox("row");
            r.node.children = old.length ? [first, second] : [childBox("row"), second];
            markColumns(r.node.children);
          }
          s.layout = "flex";
          s.direction = "row";
          s.wrap = "nowrap";
          s.align = "stretch";
          s.grid_template_columns = "";
          s.grid_template_rows = "";
          s.grid_rows = "";
        } else if ((app.resp(s.direction) === "row" || app.resp(s.direction) === "row-reverse") && old.length) {
          const cols = Math.max(1, old.length);
          for (let i = 0; i < cols; i++) old.push(childBox("column"));
          r.node.children = old;
          s.layout = "grid";
          s.columns = cols;
          s.grid_rows = 2;
          s.grid_template_columns = "repeat(" + cols + ", minmax(0, 1fr))";
          s.grid_template_rows = "repeat(2, minmax(80px, auto))";
        } else {
          old.push(childBox("column"));
          old.forEach((c) => {
            if (c.type !== "container") return;
            c.settings = c.settings || {};
            c.settings.width = "100%";
            c.settings.flex_grow = 0;
            c.settings.flex_basis = "auto";
            if (!c.settings.min_height) c.settings.min_height = "80px";
          });
          r.node.children = old;
          s.layout = "flex";
          s.direction = "column";
          s.wrap = "nowrap";
          s.align = "stretch";
        }
        app.selected = id;
        app.dirty = true;
        app.render();
      }
      function structureHTML() {
        return `<section class="lb-structure">
      <div class="lb-structure-title"><strong>Structure</strong><span>Columns and rows</span></div>
      <p>Divide this container into columns, rows, or a grid. Each cell is its own container.</p>
      <div class="lb-structure-presets">
        <button type="button" data-lb-split="2x1"><i class="lb-structure-icon cols-2"></i><b>2 Columns</b></button>
        <button type="button" data-lb-split="3x1"><i class="lb-structure-icon cols-3"></i><b>3 Columns</b></button>
        <button type="button" data-lb-split="4x1"><i class="lb-structure-icon cols-4"></i><b>4 Columns</b></button>
        <button type="button" data-lb-split="1x2"><i class="lb-structure-icon rows-2"></i><b>2 Rows</b></button>
        <button type="button" data-lb-split="1x3"><i class="lb-structure-icon rows-3"></i><b>3 Rows</b></button>
        <button type="button" data-lb-split="2x2"><i class="lb-structure-icon grid-2"></i><b>2 \xD7 2</b></button>
        <button type="button" data-lb-split="3x2"><i class="lb-structure-icon grid-3"></i><b>3 \xD7 2</b></button>
        <button type="button" data-lb-split="2x3"><i class="lb-structure-icon grid-2x3"></i><b>2 \xD7 3</b></button>
      </div>
      <div class="lb-structure-custom">
        <label>Columns <input type="number" min="1" max="12" value="2" data-lb-split-cols></label>
        <label>Rows <input type="number" min="1" max="12" value="1" data-lb-split-rows></label>
        <button type="button" class="lb-btn primary" data-lb-split-apply>Divide</button>
      </div>
      <div class="lb-structure-actions">
        <button type="button" class="lb-btn" data-lb-add-axis="column">+ Column</button>
        <button type="button" class="lb-btn" data-lb-add-axis="row">+ Row</button>
      </div>
    </section>`;
      }
      function commonStyle(html, n) {
        const schema = !!(app.meta(n.type) && app.meta(n.type).schema);
        const s = n.settings || {};
        let extra = "";
        if (app.styleTab === "style") {
          if (!html.includes('data-setting="font_family"') && !html.includes('.font_family"') && !html.includes('data-slider-key="font_size"')) {
            const family = typeof app.lb104FontOptions === "function" ? `<label class="lb-control lb-font-family-control"><span>${app.esc(app.t("Font Family"))} <small>${app.esc(app.t("Google Fonts"))}</small></span><select data-setting="font_family" class="lb-font-family-select">${app.lb104FontOptions(s.font_family || "")}</select></label>` : app.lb09Field("font_family", app.t("Font Family"), "text", s.font_family || "");
            extra += app.lb09Section(
              app.t("Typography"),
              family + app.lbSlider("font_size", app.t("Size"), s.font_size ?? s.size ?? "", { units: ["px", "em", "rem"], min: 6, max: 200 }) + app.lb09Select("font_weight", app.t("Weight"), s.font_weight || s.weight || "", ["", "300", "400", "500", "600", "700", "800", "900"]) + app.lb09Select("font_style", app.t("Style"), s.font_style || "", ["", "normal", "italic", "oblique"]) + app.lb09Select("text_transform", app.t("Transform"), s.text_transform || "", ["", "none", "uppercase", "lowercase", "capitalize"]) + app.lb09Select("text_decoration", app.t("Decoration"), s.text_decoration || "", ["", "none", "underline", "overline", "line-through"]) + app.lbSlider("line_height", app.t("Line Height"), s.line_height ?? "", { unitless: true, min: 0.6, max: 3, step: 0.05 }) + app.lbSlider("letter_spacing", app.t("Letter Spacing"), s.letter_spacing ?? "", { units: ["px", "em"], min: -5, max: 20, step: 0.1 }) + (html.includes('data-setting="color"') ? "" : `<label class="lb-control"><span>${app.esc(app.t("Text Color"))}</span><input data-setting="color" type="color" value="${app.esc(s.color || s.text_color || "#30343a")}"></label>`),
              true
            );
          }
          if (!schema && n.type !== "container" && n.type !== "inner_section" && !html.includes('data-choose-for="items_direction"')) {
            const ctrls = (app.meta(n.type) || {}).controls || {};
            const itemsBody = ["items_direction", "items_justify", "items_align", "items_gap", "items_flex_wrap"].map((key) => {
              if (!ctrls[key]) return "";
              const def = app.lbCtrlDef(ctrls[key]);
              if (def.hidden || !app.lbConditionMet(def.condition, s)) return "";
              let h = app.control(key, def, s[key] !== void 0 ? s[key] : def.type === "gaps" ? {} : "", def.label);
              if (!h) return "";
              if (def.description) h += `<p class="lb-control-desc">${app.esc(def.description)}</p>`;
              if (def.separator === "before") h = `<hr class="lb-control-separator">` + h;
              return h;
            }).join("");
            if (itemsBody) extra = app.lb09Section(app.t("Items"), itemsBody, false) + extra;
          }
          if (schema) {
            if (!extra) return html;
            if (html.includes('<div class="lb-a11y-box"')) return html.replace('<div class="lb-a11y-box"', extra + '<div class="lb-a11y-box"');
            if (html.includes('<div class="lb-action-grid"')) return html.replace('<div class="lb-action-grid"', extra + '<div class="lb-action-grid"');
            return html + extra;
          }
          if (!html.includes('data-setting="align"') && n.type !== "container" && n.type !== "grid") {
            extra += app.lb09Section(app.t("Alignment"), app.lb09Select("align", app.t("Align"), s.align || "", ["", "left", "center", "right", "justify"]), false);
          }
          if (!html.includes("lb-background") && !html.includes('data-setting="background"') && !html.includes('name="background"')) {
            extra += app.lb09Section(app.t("Background"), app.control("background", "background", typeof s.background === "object" ? s.background : s.background ? { type: "classic", color: s.background } : {}, app.t("Background")), false);
          }
          if (!html.includes('data-setting="border_style"')) {
            extra += app.lb09Section(
              app.t("Border"),
              app.lb09Select("border_style", app.t("Border Style"), s.border_style || "", ["", "solid", "dashed", "dotted", "double", "none"]) + app.lb09Box("border_width", app.t("Border Width"), s.border_width) + `<label class="lb-control"><span>${app.esc(app.t("Border Color"))}</span><input data-setting="border_color" type="color" value="${app.esc(s.border_color || "#d0d5dd")}"></label>` + app.lb09Box("border_radius", app.t("Border Radius"), s.border_radius) + app.control("shadow", "box_shadow", s.shadow || {}, app.t("Box Shadow")),
              false
            );
          }
          if (!html.includes('data-setting="hover_animation"')) {
            extra += app.lb09Section(app.t("Hover"), app.lb09Select("hover_animation", app.t("Hover Animation"), s.hover_animation || "", ["", "zoom", "grow", "shrink", "lift", "sink", "fade", "rotate", "float", "pulse", "skew", "wobble", "buzz"]), false);
          }
        }
        if (app.styleTab === "advanced") {
          const parent = app.locate(app.state.root, n.id)?.parent;
          const inFlex = parent && (parent.type === "container" || parent.type === "grid");
          if (inFlex && !html.includes('data-setting="flex_grow"') && !html.includes('data-setting="align_self"')) {
            extra += app.lb09Section(
              app.t("Flex Item"),
              app.lb09Select("align_self", app.t("Align Self"), s.align_self || "", ["", "auto", "stretch", "flex-start", "center", "flex-end"]) + app.lb09Field("order", app.t("Order"), "number", s.order ?? "") + app.lb09Field("flex_grow", app.t("Flex Grow"), "number", s.flex_grow ?? "") + app.lb09Field("flex_shrink", app.t("Flex Shrink"), "number", s.flex_shrink ?? "") + app.lb09Field("flex_basis", app.t("Flex Basis"), "text", s.flex_basis || ""),
              false
            );
          }
        }
        if (!extra) return html;
        if (html.includes('<div class="lb-a11y-box"')) return html.replace('<div class="lb-a11y-box"', extra + '<div class="lb-a11y-box"');
        if (html.includes('<div class="lb-action-grid"')) return html.replace('<div class="lb-action-grid"', extra + '<div class="lb-action-grid"');
        return html + extra;
      }
      const prevSettings = app.settingsHTML;
      app.settingsHTML = function() {
        let html = prevSettings();
        if (!app.selected) return html;
        const r = app.locate(app.state.root, app.selected);
        if (!r) return html;
        if (r.node.type === "container" && app.styleTab === "content" && !html.includes("lb-structure")) {
          const block = structureHTML();
          const at = html.indexOf("lb-settings-tabs");
          if (at >= 0) {
            const end = html.indexOf("</div>", at);
            if (end >= 0) html = html.slice(0, end + 6) + block + html.slice(end + 6);
            else html = block + html;
          } else html = block + html;
        }
        return commonStyle(html, r.node);
      };
      function onStructureClick(e) {
        const preset = e.target.closest("[data-lb-split]");
        const apply = e.target.closest("[data-lb-split-apply]");
        const add = e.target.closest("[data-lb-add-axis]");
        if (!preset && !apply && !add) return;
        e.preventDefault();
        e.stopPropagation();
        if (!app.selected) return;
        if (preset) {
          const parts = preset.dataset.lbSplit.split("x").map(Number);
          applySplit(app.selected, parts[0], parts[1]);
          return;
        }
        if (apply) {
          const root = app.root;
          const cols = Number(root.querySelector("[data-lb-split-cols]")?.value) || 2;
          const rows = Number(root.querySelector("[data-lb-split-rows]")?.value) || 1;
          if (rows <= 1) applySplit(app.selected, cols, 1);
          else if (cols <= 1) applySplit(app.selected, 1, rows);
          else applySplit(app.selected, cols, rows);
          return;
        }
        addAxis(app.selected, add.dataset.lbAddAxis);
      }
      const prevRender = app.render;
      app.render = function() {
        prevRender();
        const root = app.root;
        if (root && !root.__lbSplit) {
          root.__lbSplit = true;
          root.addEventListener("click", onStructureClick);
        }
      };
      const prevStyle = app.styleInline;
      app.styleInline = function(n) {
        let css = prevStyle(n) || "";
        const s = n.settings || {};
        if (n.type !== "container" && n.type !== "grid" && s.align && !/(^|;)\s*text-align:/.test(css)) {
          css += (css && !css.endsWith(";") ? ";" : "") + "text-align:" + app.esc(s.align);
        }
        return css;
      };
      const prevNode = app.nodeHTML;
      app.nodeHTML = function(n) {
        let html = prevNode(n);
        const s = n.settings || {};
        const anim = String(s.hover_animation || "").replace(/[^a-z0-9-]/gi, "");
        const r = app.locate(app.state.root, n.id);
        const parent = r && r.parent;
        let cls = "";
        if (parent && parent.type === "container" && parent.settings && parent.settings.layout !== "grid" && parent.settings.layout !== "block") {
          const dir = String(app.resp(parent.settings.direction) || "column");
          const grow = Number(s.flex_grow);
          if ((dir === "row" || dir === "row-reverse") && grow > 0) cls = "lb-flex-col";
        }
        if (!cls && !anim) return html;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0];
        if (anim && !tag.includes("lb-hover-" + anim)) tag = tag.replace('class="', 'class="lb-hover-' + anim + " ");
        if (cls && !tag.includes(cls)) tag = tag.replace('class="', 'class="' + cls + " ");
        return tag + html.slice(m[0].length);
      };
    })();
    (function() {
      app.lbFlipSide = "front";
      const oldSection = app.lb09Section;
      if (typeof oldSection === "function") {
        app.lb09Section = function(title, body, open) {
          let html = oldSection(title, body, open);
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r || r.node.type !== "flip_box") return html;
          const blob = String(body || "");
          const side = /data-setting="front_/.test(blob) ? "front" : /data-setting="back_/.test(blob) ? "back" : "";
          if (!side) return html;
          return html.replace("<details ", '<details data-flip-side="' + side + '" ');
        };
      }
      app.lbFlipClicked = app.lbFlipClicked || {};
      app.lbApplyFlipSide = function lbApplyFlipSide() {
        const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
        if (!fd) return;
        const showBack = app.lbFlipSide === "back";
        fd.querySelectorAll(".lb-node-flip_box").forEach((node) => {
          const revealed = showBack && node.classList.contains("is-selected");
          node.classList.toggle("lb-flip-show-back", revealed);
          const box = node.querySelector(":scope > .lb-flip-box");
          if (box && box.getAttribute("data-lb-flip") === "click") box.classList.toggle("is-flipped", !!(revealed || app.lbFlipClicked[node.dataset.id]));
        });
        if (!fd.__lbFlipClick) {
          fd.__lbFlipClick = true;
          fd.addEventListener("click", function(e) {
            const box = e.target.closest && e.target.closest('.lb-flip-box[data-lb-flip="click"]');
            if (!box) return;
            if (e.target.closest("a,button,input,textarea,select")) return;
            const node = box.closest(".lb-node-flip_box");
            const id = node && node.dataset.id;
            if (!id) return;
            app.lbFlipClicked[id] = !app.lbFlipClicked[id];
            const revealed = app.lbFlipSide === "back" && node.classList.contains("is-selected");
            box.classList.toggle("is-flipped", !!(app.lbFlipClicked[id] || revealed));
          }, true);
        }
      };
      function sideOf(target) {
        const sec = target && target.closest && target.closest("[data-flip-side]");
        return sec ? sec.getAttribute("data-flip-side") : "";
      }
      function watch(e) {
        const side = sideOf(e.target);
        if (side !== "front" && side !== "back") return;
        if (app.lbFlipSide === side) return;
        app.lbFlipSide = side;
        app.lbApplyFlipSide();
      }
      if (app.root && !app.root.__lbFlipSide) {
        app.root.__lbFlipSide = true;
        app.root.addEventListener("focusin", watch);
        app.root.addEventListener("click", watch);
      }
      const prevPatch = app.patchCanvasNode;
      if (typeof prevPatch === "function") {
        app.patchCanvasNode = function(id) {
          const ok = prevPatch.apply(this, arguments);
          app.lbApplyFlipSide();
          return ok;
        };
      }
      const prevPaint = app.lbPaintCanvas;
      if (typeof prevPaint === "function") {
        app.lbPaintCanvas = function() {
          const ok = prevPaint.apply(this, arguments);
          app.lbApplyFlipSide();
          return ok;
        };
      }
      const prevSelect = app.selectNode;
      if (typeof prevSelect === "function") {
        app.selectNode = function(id) {
          if (id !== app.selected) app.lbFlipSide = "front";
          const result = prevSelect.apply(this, arguments);
          app.lbApplyFlipSide();
          return result;
        };
      }
    })();
    (function() {
      const CSS2 = `
.lb-site-nav{position:relative;max-width:100%;background:transparent;color:var(--lb-nav-color,inherit)}
.lb-site-nav a:hover,.lb-site-nav a:focus-visible,.lb-site-nav__item--current>a{color:var(--lb-nav-hover,inherit)}
.lb-site-nav__toggle:hover,.lb-site-nav__toggle:focus-visible{color:var(--lb-nav-hover,inherit)}
.lb-site-nav .lb-site-nav__toggle.lb-site-nav__toggle,.lb-site-nav .lb-site-nav__toggle.lb-site-nav__toggle:focus,.lb-site-nav .lb-site-nav__toggle.lb-site-nav__toggle:active{background-color:var(--lb-nav-bg,transparent);background-image:none;border-color:var(--lb-nav-btn-border,currentColor);color:var(--lb-nav-btn-color,currentColor);box-shadow:none}
.lb-site-nav .lb-site-nav__toggle.lb-site-nav__toggle:hover,.lb-site-nav .lb-site-nav__toggle.lb-site-nav__toggle:focus-visible{background-color:var(--lb-nav-btn-hover-bg,var(--lb-nav-bg,transparent));background-image:none;border-color:var(--lb-nav-btn-hover-border,currentColor);color:var(--lb-nav-btn-hover-color,var(--lb-nav-hover,currentColor))}
.lb-heading-wrap[style*="--lb-heading-hover"]:hover>*,.lb-heading-wrap[style*="--lb-heading-hover"]:hover a{color:var(--lb-heading-hover)!important}
.lb-text-wrap[style*="--lb-text-hover"]:hover .lb-text-content{color:var(--lb-text-hover)!important}
.lb-site-nav__list,.lb-site-nav__sub{list-style:none;margin:0;padding:0}
.lb-site-nav--horizontal>.lb-site-nav__list{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem 1rem}
.lb-site-nav--vertical>.lb-site-nav__list{display:flex;flex-direction:column;align-items:stretch}
.lb-site-nav a{color:inherit;text-decoration:none;display:inline-block;padding:.4rem .65rem}
.lb-site-nav__sub{display:none}
.lb-site-nav__item--has-children:hover>.lb-site-nav__sub,.lb-site-nav__item--has-children:focus-within>.lb-site-nav__sub,.lb-site-nav--vertical .lb-site-nav__sub,.lb-site-nav.is-mobile:not(.lb-site-nav--dropdown) .lb-site-nav__sub{display:block;position:static;padding-left:.75rem}
.lb-site-nav--dropdown{display:inline-block;align-self:flex-start;width:fit-content!important;max-width:100%;height:fit-content;vertical-align:top;background:transparent}
.lb-site-nav__drop{position:relative;display:inline-block;width:max-content;max-width:100%;vertical-align:top}
.lb-site-nav--dropdown:not(.is-open)>.lb-site-nav__list,.lb-site-nav--dropdown:not(.is-open)>.lb-site-nav__drop>.lb-site-nav__list{display:none}
.lb-site-nav--dropdown.is-open>.lb-site-nav__list,.lb-site-nav--dropdown.is-open>.lb-site-nav__drop>.lb-site-nav__list{display:flex!important;flex-direction:column;position:absolute!important;z-index:30;top:100%;left:0;width:auto!important;min-width:14rem;margin:.35rem 0 0!important;padding:.35rem 0;list-style:none!important;background:#fff;color:var(--lb-nav-color,#1d2327);border:1px solid #dcdcde;border-radius:var(--lb-nav-radius,4px);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.lb-site-nav--dropdown.is-open .lb-site-nav__sub{display:block;position:static;padding-left:.75rem}
.lb-node-site_nav,.lb-node-nav_menu,.lb-node-post_navigation{overflow:visible!important;height:auto!important;max-height:none!important}
.lb-node-site_nav>.lb-site-nav--dropdown{width:auto!important;flex:0 0 auto!important}
.lb-site-nav.is-open:not(.lb-site-nav--dropdown)>.lb-site-nav__list{display:flex!important;position:static!important;flex-direction:column!important;align-items:stretch;width:100%;min-width:0;margin-top:.35rem;padding:.35rem 0;background:#fff;border:1px solid #dcdcde;border-radius:var(--lb-nav-radius,4px);overflow:hidden;opacity:1;visibility:visible;transform:none;box-shadow:none}
.lb-site-nav.is-open:not(.lb-site-nav--dropdown) .lb-site-nav__sub{display:block;position:static;opacity:1;visibility:visible}
.lb-site-nav__toggle{display:none;align-items:center;justify-content:center;width:auto;min-width:2.75rem;height:2.75rem;padding:0;border:1px solid currentColor;border-radius:var(--lb-nav-radius,4px);background-color:var(--lb-nav-bg,transparent);color:inherit;cursor:pointer}
.lb-site-nav__burger{display:block;width:1.1rem;height:2px;background:currentColor;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
.lb-site-nav__toggle-text,.lb-site-nav__caret{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__toggle{display:inline-flex;width:auto;height:auto;min-height:0;gap:.5rem;padding:.45rem .75rem}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__toggle-text,.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__caret{position:static;width:auto;height:auto;overflow:visible;clip:auto}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__burger{display:none}
.lb-site-nav.is-mobile .lb-site-nav__toggle{display:inline-flex;width:2.75rem;padding:0}
.lb-site-nav.is-mobile:not(.is-open)>.lb-site-nav__list{display:none}
.lb-site-nav.is-mobile.is-open>.lb-site-nav__list,.lb-site-nav.is-mobile>.lb-site-nav__list{flex-direction:column;align-items:stretch}
.lb-site-nav.is-mobile .lb-site-nav__burger{display:block}
.lb-site-nav.is-mobile .lb-site-nav__toggle-text,.lb-site-nav.is-mobile .lb-site-nav__caret{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
@media (max-width:782px){
.lb-site-nav:not(.lb-site-nav--custom-bp):not(.lb-site-nav--dropdown) .lb-site-nav__toggle{display:inline-flex;width:2.75rem;padding:0}
.lb-site-nav:not(.lb-site-nav--custom-bp):not(.lb-site-nav--dropdown):not(.is-open)>.lb-site-nav__list{display:none}
.lb-site-nav:not(.lb-site-nav--custom-bp):not(.lb-site-nav--dropdown).is-open>.lb-site-nav__list{display:flex;flex-direction:column;align-items:stretch}
.lb-site-nav:not(.lb-site-nav--custom-bp):not(.lb-site-nav--dropdown) .lb-site-nav__burger{display:block}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__toggle{display:inline-flex;width:auto;height:auto;min-height:0;gap:.5rem;padding:.45rem .75rem}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__toggle-text,.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__caret{position:static;width:auto;height:auto;overflow:visible;clip:auto}
.lb-site-nav--dropdown:not(.is-mobile) .lb-site-nav__burger{display:none}
}
@media (max-width:767px){
.lb-node{max-width:100%;min-width:0}
.lb-node img,.lb-node video,.lb-node iframe,.lb-node svg,.lb-node canvas{max-width:100%;height:auto}
.lb-icon-box-left,.lb-icon-box-right,.lb-image-box-left,.lb-image-box-right{flex-direction:column}
.lb-image-box-left .lb-image-box-figure,.lb-image-box-right .lb-image-box-figure{width:100%}
.lb-gallery,.lb-gallery.is-grid{grid-template-columns:minmax(0,1fr)!important}
.lb-gallery.is-masonry{column-count:1!important}
.lb-tabs-vertical,.lb-form-inline,.lb-form-two-column{flex-direction:column}
.lb-social,.lb-icon-list-inline{flex-wrap:wrap}
.lb-price-table,.lb-testimonial,.lb-counter,.lb-button-wrap,.lb-form,.lb-carousel{max-width:100%}
}
`;
      const JS = `(function(){function bp(n){var v=parseInt(n.getAttribute("data-breakpoint"),10);return v>=320&&v<=1600?v:782}function drop(n){return n.classList.contains("lb-site-nav--dropdown")||n.classList.contains("cp-nav--dropdown")||n.classList.contains("cp-post-nav-menu--dropdown")}function sync(){var w=document.documentElement.clientWidth||window.innerWidth||0,nodes=document.querySelectorAll("[data-breakpoint]"),i;for(i=0;i<nodes.length;i++)nodes[i].classList.toggle("is-mobile",w<=bp(nodes[i]))}document.addEventListener("click",function(e){var btn=e.target&&e.target.closest?e.target.closest(".lb-site-nav__toggle,.cp-nav-burger,.cp-nav-drop,.cp-post-nav-drop"):null,nav;if(!btn)return;nav=btn.closest(".lb-site-nav,.cp-nav,.cp-post-nav-menu");if(!nav)return;if(!drop(nav)&&!nav.classList.contains("is-mobile")&&!nav.classList.contains("is-open"))return;nav.classList.add("is-open");btn.setAttribute("aria-expanded","true")});window.addEventListener("resize",sync);var root=document.querySelector(".lb-frame-root");if(window.MutationObserver&&root)new MutationObserver(sync).observe(root,{childList:true,subtree:true});sync();setTimeout(sync,50)})();`;
      const prevMarkup = app.canvasMarkup;
      if (typeof prevMarkup === "function") {
        app.canvasMarkup = function() {
          if (window.CanvaslyLite) window.CanvaslyLite.editorDevice = app.device || "desktop";
          return prevMarkup.apply(this, arguments);
        };
      }
      const prev = app.frameHTML;
      if (typeof prev !== "function") return;
      app.frameHTML = function() {
        let html = prev.apply(this, arguments);
        if (html.indexOf("lb-nav-responsive") !== -1) return html;
        html = html.replace("</style></head>", CSS2 + "</style></head>");
        html = html.replace("</body>", '<script id="lb-nav-responsive">' + JS + "<\/script></body>");
        return html;
      };
    })();
  }


export { installWidgetDepth };
