import { app } from "./app.js";
function installCanvas() {
  app.lbTextPathSeconds = function (raw) {
    if (raw && typeof raw === "object") raw = raw.size != null ? raw.size : raw.desktop != null ? raw.desktop : "";
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 20;
  };
  app.lbTextPathPhase = app.lbTextPathPhase || {};
  app.lbRunTextPaths = function (root) {
    if (!root || !root.querySelectorAll) return;
    const list = [];
    if (root.classList && root.classList.contains("lb-text-path")) list.push(root);
    root.querySelectorAll(".lb-text-path").forEach((el) => {
      if (!list.includes(el)) list.push(el);
    });
    list.forEach((box) => {
      if (box.dataset.lbPathRun === "1") return;
      const path = box.querySelector("path"),
        textPath = box.querySelector("textPath");
      if (!path || !textPath || typeof path.getTotalLength !== "function") return;
      box.dataset.lbPathRun = "1";
      const text = textPath.parentNode;
      const key = path.id || "tp-" + list.indexOf(box);
      const phase = app.lbTextPathPhase[key] || (app.lbTextPathPhase[key] = { pos: 0, last: 0, len: 0 });
      phase.len = 0;
      const view = box.ownerDocument.defaultView || window;
      if (view.matchMedia && view.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        textPath.setAttribute("startOffset", "0");
        if (text) text.style.visibility = "visible";
        return;
      }
      if (text) text.style.visibility = "hidden";
      const measure = () => {
        const svg = path.ownerSVGElement;
        if (!svg || !text) return phase.len || 0;
        const probe = text.cloneNode(false);
        probe.textContent = textPath.textContent || "";
        probe.removeAttribute("visibility");
        probe.style.visibility = "visible";
        probe.setAttribute("x", "0");
        probe.setAttribute("y", "20");
        svg.appendChild(probe);
        let n = 0;
        try {
          n = probe.getComputedTextLength() || 0;
        } catch (e) {
          n = 0;
        }
        svg.removeChild(probe);
        if (n > 1) phase.len = n;
        return phase.len || 0;
      };
      let tries = 0;
      const step = (now) => {
        if (!box.isConnected) return;
        if (!phase.last) phase.last = now;
        const dt = Math.min(80, Math.max(0, now - phase.last));
        phase.last = now;
        let pathLen = 0;
        try {
          pathLen = path.getTotalLength() || 0;
        } catch (e) {
          pathLen = 0;
        }
        const textLen = phase.len > 1 ? phase.len : measure();
        if (pathLen > 1 && textLen > 1) {
          const span = pathLen + textLen;
          const secs = app.lbTextPathSeconds(
            view.getComputedStyle(box).getPropertyValue("--lb-speed") || box.getAttribute("data-lb-speed"),
          );
          phase.pos = (phase.pos + dt / (secs * 1e3)) % 1;
          textPath.setAttribute("startOffset", String(-textLen + phase.pos * span));
          if (text) text.style.visibility = "visible";
        } else if (++tries > 45) {
          textPath.setAttribute("startOffset", "0");
          if (text) text.style.visibility = "visible";
        }
        view.requestAnimationFrame(step);
      };
      const fonts = view.document && view.document.fonts;
      if (fonts && fonts.ready)
        fonts.ready.then(() => {
          measure();
        });
      view.requestAnimationFrame(step);
    });
  };
  app.lbMapSrc = function lbMapSrc(addr, zoom) {
    const q = encodeURIComponent(String(addr || "").trim());
    const z = Math.max(1, Math.min(21, parseInt(zoom, 10) || 14));
    const key = app.D && app.D.googleMapsEmbed ? String(app.D.googleMapsKey || "").trim() : "";
    if (key && /^[A-Za-z0-9_.-]{8,200}$/.test(key))
      return "https://www.google.com/maps/embed/v1/place?key=" + encodeURIComponent(key) + "&q=" + q + "&zoom=" + z;
    return "https://www.google.com/maps?q=" + q + "&output=embed&z=" + z;
  };
  app.bodyHTML = function bodyHTML(n) {
    const s = n.settings || {},
      st = app.styleInline(n);
    if (n.type === "container" || n.type === "inner_section" || n.type === "grid") {
      const inner = n.type === "grid" ? "lb-grid-inner lb-grid" : "lb-container-inner lb-container";
      return `<div class="${inner}" style="${st}">${(n.children || []).map(app.nodeHTML).join("")}<div class="lb-insert-zone">${app.t("Drop unit here")}</div></div>`;
    }
    if (n.type === "heading") {
      const tag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(s.tag) ? s.tag : "h2";
      return `<${tag} style="${st}" data-inline="text">${s.text || ""}</${tag}>`;
    }
    if (n.type === "text") return `<div class="lb-text-content" style="${st}" data-inline="text">${s.text || ""}</div>`;
    if (n.type === "image") {
      const u = s.image_url || "";
      return u
        ? `<img src="${app.esc(u)}" alt="${app.esc(s.alt || "")}" style="${st}" loading="lazy">`
        : '<div class="lb-image-placeholder">' + app.t("Choose image") + "</div>";
    }
    if (n.type === "button")
      return `<button type="button" class="lb-button lb-editor-button" style="${st}" data-inline="text" data-link-url="${app.esc(s.url || "")}" data-link-target="${app.esc(s.target || "_self")}">${s.text || "Button"}</button>`;
    if (n.type === "divider")
      return `<hr class="lb-divider" style="border-top:${Math.max(1, Number(s.thickness || 1))}px ${app.esc(s.style || "solid")} ${app.esc(s.color || "#ddd")}">`;
    if (n.type === "spacer")
      return `<div class="lb-spacer" style="height:${Math.max(0, Number(s.height || 40))}px"></div>`;
    if (n.type === "icon")
      return `<div class="lb-icon-glyph" style="font-size:${Number(s.size || 32)}px;color:${app.esc(s.color || "#222")}">${app.esc(s.icon || "\u2726")}</div>`;
    if (n.type === "icon_box")
      return `<div class="lb-icon-box"><div class="lb-icon-box-icon">${app.esc(s.icon || "\u2727")}</div><h3>${app.esc(s.title || "Icon Box")}</h3><div>${s.text || ""}</div></div>`;
    if (n.type === "rating" || n.type === "star_rating") {
      const max = Math.max(1, Math.min(10, Number(s.max || 5))),
        r = Math.max(0, Math.min(max, Number(s.rating || 5)));
      const size = Math.max(8, Number(s.size || 24));
      const label = s.label
        ? `<span class="lb-rating-label" style="margin-left:8px;font-size:.55em;color:inherit">${app.esc(s.label)}</span>`
        : "";
      return `<div class="lb-rating" style="color:${app.esc(s.color || "#f4b400")};font-size:${size}px" aria-label="${app.t("Rating %s of %s", r, max)}">${app.esc((s.icon || "\u2605").repeat(Math.floor(r)))}${r % 1 >= 0.5 ? "\xBD" : ""}${app.esc((s.empty_icon || "\u2606").repeat(Math.max(0, max - Math.ceil(r))))}${label}</div>`;
    }
    if (n.type === "audio") {
      if (!s.url) return '<div class="lb-embed-placeholder">' + app.t("Add audio URL") + "</div>";
      if (/\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|wma)(\?|#|$)/i.test(String(s.url)))
        return `<audio class="lb-audio" controls src="${app.esc(s.url)}"></audio>`;
      return `<div class="lb-audio-embed"><div class="lb-embed-placeholder">${app.esc(s.url)} \xB7 ${app.t("plays on the live page")}</div></div>`;
    }
    if (n.type === "embed")
      return s.url
        ? `<div class="lb-embed-wrap"><div class="lb-embed"><div class="lb-embed-placeholder">${app.esc(s.url)} \xB7 ${app.t("plays on the live page")}</div></div></div>`
        : '<div class="lb-embed-placeholder">' + app.t("Paste a URL to embed") + "</div>";
    if (n.type === "soundcloud")
      return s.url
        ? `<iframe class="lb-audio" title="${app.t("Audio")}" height="${Number(s.height || 166)}" src="${app.esc(s.url)}"></iframe>`
        : '<div class="lb-embed-placeholder">' + app.t("Add audio URL") + "</div>";
    if (n.type === "wordpress_widget" || n.type === "sidebar")
      return `<div class="lb-embed-placeholder">WordPress Widget: ${app.esc(s.sidebar || "select a sidebar")}</div>`;
    if (n.type === "link_in_bio") {
      const layout = s.layout === "inline" ? "inline" : "stack";
      const avatar = String(s.avatar || "").trim()
        ? `<img class="lb-link-bio-avatar" src="${app.esc(s.avatar)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:50%">`
        : "";
      return `<div class="lb-link-bio lb-link-bio-${layout}" style="display:flex;flex-direction:${layout === "inline" ? "row" : "column"};gap:12px;align-items:${layout === "inline" ? "center" : "flex-start"}">${avatar}<div><h3 style="margin:0">${app.esc(s.title || "My Links")}</h3><p style="margin:4px 0 0">${app.esc(s.subtitle || "")}</p></div><div class="lb-link-bio-links" style="display:flex;flex-direction:column;gap:8px;width:100%">${String(
        s.links || "",
      )
        .split(/\r?\n/)
        .filter(Boolean)
        .map((x) => {
          const p = x.split("|");
          return `<a href="${app.esc(p[1] || "#")}" target="${app.esc(s.target || "_self")}">${app.esc(p[0])}</a>`;
        })
        .join("")}</div></div>`;
    }
    if (n.type === "gallery") return app.galleryCanvasHTML(s);
    if (n.type === "carousel")
      return `<div class="lb-carousel"><div class="lb-carousel-placeholder">Image Carousel${s.ids ? ": " + app.esc(s.ids) : ""}</div></div>`;
    if (n.type === "accordion" || n.type === "toggle")
      return `<details class="lb-accordion" ${s.open ? "open" : ""}><summary>${app.esc(s.title || n.type)}</summary><div>${s.text || ""}</div></details>`;
    if (n.type === "tabs")
      return `<div class="lb-tabs-widget">${String(s.tabs || "")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((x, i) => {
          const p = x.split("|");
          return `<button class="lb-tab-button" data-tab-index="${i}">${app.esc(p[0])}</button><div class="lb-tab-panel" data-panel-index="${i}">${p[1] || ""}</div>`;
        })
        .join("")}</div>`;
    if (n.type === "social")
      return `<div class="lb-social">${String(s.links || "")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((x) => {
          const p = x.split("|");
          return `<a href="${app.esc(p[1] || "#")}" target="_blank" rel="noopener">${app.esc(p[0])}</a>`;
        })
        .join("")}</div>`;
    if (n.type === "testimonial")
      return `<figure class="lb-testimonial"><blockquote>${s.quote || ""}</blockquote><figcaption><strong>${app.esc(s.author || "Customer")}</strong> ${app.esc(s.role || "")}</figcaption></figure>`;
    if (n.type === "menu_anchor") {
      const aid =
        String(s.anchor || "section")
          .trim()
          .toLowerCase()
          .replace(/^#+/, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "section";
      const anchor = `<span class="lb-menu-anchor" id="${app.esc(aid)}"><span class="lb-menu-anchor-label">#${app.esc(aid)}</span></span>`;
      const id = String(s.menu || "");
      if (!id) return anchor;
      const menu = (app.D.menus || []).find((x) => String(x.id) === id);
      const items = menu ? (menu.items || []).filter((it) => !parseInt(it.parent, 10)) : [];
      const links = items.length
        ? items
            .map(
              (it) =>
                `<li class="lb-anchor-menu-item"><a href="${app.esc(it.url || "#")}" data-lb-editor-link="1">${app.esc(it.title || "")}</a></li>`,
            )
            .join("")
        : `<li class="lb-anchor-menu-item"><span>${app.esc((menu && menu.name) || app.t("Missing menu"))}</span></li>`;
      return (
        anchor +
        `<nav class="lb-anchor-menu" aria-label="${app.esc((menu && menu.name) || app.t("Menu"))}"><ul class="lb-anchor-menu-list">${links}</ul></nav>`
      );
    }
    if (n.type === "read_more")
      return `<a class="lb-read-more" href="${app.esc(s.url || "#")}" target="${app.esc(s.target || "_self")}">${app.esc(s.text || "Read More")}</a>`;
    if (n.type === "google_maps") {
      const h = Math.max(80, Number(s.height || 320) || 320);
      const z = Math.max(1, Math.min(21, parseInt(s.zoom, 10) || 14));
      const addr = String(s.address || "").trim();
      if (!addr)
        return `<div class="lb-map-placeholder" style="height:${h}px;min-height:${h}px">${app.t("Add a map address")}</div>`;
      return `<div class="lb-map" style="height:${h}px;min-height:${h}px"><iframe class="lb-map-frame" title="${app.esc(app.t("Map"))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${app.esc(app.lbMapSrc(addr, z))}" style="width:100%;height:100%;border:0;display:block;pointer-events:none"></iframe></div>`;
    }
    if (n.type === "text_path") {
      const paths = {
        wave: "M 20 80 Q 140 16 260 80 T 500 80 T 740 80 T 980 80",
        arc: "M 36 112 Q 500 8 964 112",
        circle: "M 500 46 A 150 32 0 1 1 499 46",
        line: "M 20 96 H 980",
      };
      const kind = ["wave", "arc", "circle", "line"].includes(s.path) ? s.path : "wave";
      const d = paths[kind];
      const pid = "lb-tp-" + String(n.id || "x").replace(/[^a-zA-Z0-9_-]/g, "");
      const guide = s.show_path ? "" : ' stroke="none"';
      const speed = Math.max(5, app.lbTextPathSeconds(s.speed));
      return `<div class="lb-text-path lb-text-path-${kind}" data-lb-speed="${speed}" style="${st};--lb-speed:${speed}s"><svg viewBox="0 0 1000 160" overflow="visible" role="img"><path id="${pid}" class="lb-text-path-guide" d="${d}" fill="none"${guide}></path><text visibility="hidden" style="${st}"><textPath href="#${pid}" startOffset="0">${app.esc(s.text || "Sidcraft Page Builder")}</textPath></text></svg></div>`;
    }
    if (n.type === "code") return `<pre class="lb-code"><code>${app.esc(s.code || "")}</code></pre>`;
    if (n.type === "price_table")
      return `<div class="lb-price-table"><h3>${app.esc(s.title || "Plan")}</h3><strong>${app.esc(s.price || "$0")}</strong><p>${app.esc(s.description || "")}</p></div>`;
    if (n.type === "flip_box")
      return `<div class="lb-flip-box lb-flip-effect-flip lb-flip-dir-right lb-flip-trigger-hover"><div class="lb-flip-layer"><div class="lb-flip-front lb-flip-align-center lb-flip-valign-middle"><div class="lb-flip-content"><h3 class="lb-flip-title">${app.esc(s.front_title || s.front || "Front")}</h3><div class="lb-flip-desc">${app.esc(s.front_text || "")}</div></div></div><div class="lb-flip-back lb-flip-align-center lb-flip-valign-middle"><div class="lb-flip-content"><h3 class="lb-flip-title">${app.esc(s.back_title || s.back || "Back")}</h3><div class="lb-flip-desc">${app.esc(s.back_text || "")}</div></div></div></div></div>`;
    if (n.type === "login")
      return `<div class="lb-login" style="max-width:360px"><h3 style="margin:0 0 12px">${app.esc(s.title || "Login")}</h3><div class="lb-form-field"><label>${app.t("Username")}</label><input type="text" tabindex="-1" readonly></div><div class="lb-form-field"><label>${app.t("Password")}</label><input type="password" tabindex="-1" readonly></div><button type="button" class="lb-button" tabindex="-1">${app.esc(s.button || app.t("Log In"))}</button></div>`;
    if (n.type === "progress")
      return `<div class="lb-progress"><strong>${app.esc(s.label || "Progress")}</strong><div class="lb-progress-track"><span style="width:${Math.min(100, Math.max(0, Number(s.value || 0)))}%"></span></div></div>`;
    if (n.type === "counter")
      return `<div class="lb-counter"><strong>${app.esc(s.prefix || "")}${app.esc(s.number || 0)}${app.esc(s.suffix || "")}</strong><span>${app.esc(s.title || "")}</span></div>`;
    if (n.type === "alert")
      return `<div class="lb-alert"><strong>${app.esc(s.title || "Notice")}</strong><div>${app.esc(s.text || "")}</div></div>`;
    if (n.type === "html") {
      const raw = String(s.html || "").trim();
      if (/^https?:\/\/\S+$/i.test(raw) && raw.indexOf("<") < 0)
        return `<div class="lb-html lb-html-embed"><div class="lb-embed-placeholder">${app.esc(raw)} \xB7 ${app.t("plays on the live page")}</div></div>`;
      return `<div class="lb-html">${s.html || ""}</div>`;
    }
    if (n.type === "shortcode") {
      const code = String(s.shortcode || "").trim();
      const pack = app.shortcodePreview && app.shortcodePreview[code];
      if (pack && pack.html) return '<div class="lb-shortcode lb-shortcode-live">' + pack.html + "</div>";
      if (code) app.queueShortcodePreview(code);
      return `<div class="lb-shortcode">${app.esc(code || "[shortcode]")}</div>`;
    }
    if (n.type === "video") {
      if (!s.url) return '<div class="lb-video-placeholder">Add video URL</div>';
      if (/\.(mp4|webm|ogv|ogg|m4v|mov)(\?|#|$)/i.test(String(s.url)))
        return `<video class="lb-video" src="${app.esc(s.url)}" controls></video>`;
      return `<div class="lb-video lb-video-oembed"><div class="lb-video-placeholder">${app.esc(s.url)} \xB7 plays on the live page</div></div>`;
    }
    return `<div class="lb-embed-placeholder">${app.esc(app.meta(n.type).title || n.type)}</div>`;
  };
  app.nodeHTML = function nodeHTML(n) {
    try {
      const s = n.settings || {},
        e = app.meta(n.type),
        sel2 = app.selected === n.id ? " is-selected" : "",
        globalNames = String(s.global_class || "")
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean)
          .map((x) => "lb-class-" + x.replace(/[^a-zA-Z0-9_-]/g, ""))
          .filter(Boolean),
        classes = "lb-node lb-node-" + app.esc(n.type) + sel2 + (globalNames.length ? " " + globalNames.join(" ") : "");
      return `<div class="${classes}" id="lb-node-${app.esc(n.id)}" data-id="${app.esc(n.id)}" data-type="${app.esc(n.type)}" draggable="true" tabindex="0" aria-label="${app.esc(e.title || n.type)}">${app.bodyHTML(n)}<div class="lb-node-toolbar"><span>${app.esc(e.title || n.type)}</span><button type="button" data-act="move-up" title="${app.t("Move up")}">\u2191</button><button type="button" data-act="move-down" title="${app.t("Move down")}">\u2193</button><button type="button" data-act="duplicate" title="${app.t("Duplicate")}">\uFF0B</button><button type="button" data-act="delete" title="${app.t("Delete")}">\xD7</button></div></div>`;
    } catch (err) {
      if (window.console) console.error(err);
      const title = (app.meta(n && n.type) || {}).title || (n && n.type) || "Unit";
      return `<div class="lb-node lb-node-error" data-id="${app.esc((n && n.id) || "")}" data-type="${app.esc((n && n.type) || "")}"><div class="lb-embed-placeholder">${app.esc(title)}</div></div>`;
    }
  };
  app.settingNeedsPanel = function settingNeedsPanel(path) {
    const key = String(path || "");
    if (!key) return false;
    if (
      /(^|\.)(type|mode|gallery_layout|look|graphic|orientation|box_layout|list_layout|flip_effect|show_button)$/.test(
        key,
      )
    )
      return true;
    if (/(^|\.)([a-zA-Z0-9]+_)?icon$/.test(key)) return true;
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return false;
    const controls = app.meta(r.node.type).controls || {};
    const defOf =
      typeof app.lbCtrlDef === "function" ? app.lbCtrlDef : (t3) => (t3 && typeof t3 === "object" ? t3 : {});
    return Object.keys(controls).some((k) => {
      const cond = defOf(controls[k]).condition;
      if (!cond || typeof cond !== "object") return false;
      return Object.keys(cond).some((c) => c.replace(/!$/, "") === key);
    });
  };
  app.previewSetting = function previewSetting(path, id) {
    const status = document.getElementById("lb-status");
    if (status) status.textContent = app.dirty ? app.t("Unsaved") : app.t("Saved");
    const paint = () => {
      if (!app.patchCanvasNode(id || app.selected) && typeof app.lbPaintCanvas === "function")
        app.lbPaintCanvas({ skipPanel: true });
    };
    const nodeId = id || app.selected;
    const hit = nodeId && app.locate(app.state.root, nodeId);
    if (hit && hit.node.type === "google_maps" && (path === "address" || path === "zoom")) {
      clearTimeout(app.__lbMapPreview);
      app.__lbMapPreview = setTimeout(() => {
        const still = app.locate(app.state.root, nodeId);
        if (still && still.node.type === "google_maps") paint();
      }, 400);
      return;
    }
    paint();
  };
  app.bindSettingInputs = function bindSettingInputs(root) {
    const host = root || app.root;
    if (!host || !host.querySelectorAll) return;
    host.querySelectorAll("[data-setting]").forEach((x) => {
      if (x.__lbLiveBound) return;
      x.__lbLiveBound = true;
      let started = false;
      const read = () => {
        let v = x.type === "checkbox" ? x.checked : x.value;
        if (x.type === "number") v = x.value === "" ? "" : Number(x.value);
        return v;
      };
      const apply = () => {
        if (app.previewingRevision) return;
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        if (!started) {
          app.commit(app.t("Edited %s", app.meta(r.node.type).title || r.node.type), r.node.id);
          started = true;
        }
        app.setPath(r.node.settings, x.dataset.setting, read());
        app.dirty = true;
        if (app.scheduleSave) app.scheduleSave();
        app.previewSetting(x.dataset.setting, r.node.id);
      };
      x.addEventListener("input", apply);
      x.addEventListener("change", () => {
        if (!started) apply();
        started = false;
        if (app.settingNeedsPanel(x.dataset.setting) && typeof app.refreshRightPanel === "function")
          app.refreshRightPanel();
      });
    });
  };
  app.bindCanvasNode = function bindCanvasNode(n) {
    if (!n || n.__lbCanvasBound) return;
    n.__lbCanvasBound = true;
    n.onclick = (e) => {
      if (e.target.closest(".lb-node-toolbar")) return;
      e.preventDefault();
      e.stopPropagation();
      if (n.dataset.type === "gallery") {
        const host = e.target.closest("[data-lb-gallery-filter-host]"),
          btn = e.target.closest("[data-lb-set]");
        if (btn && host) {
          app.selectNode(n.dataset.id);
          app.applyGalleryFilter(host, btn.getAttribute("data-lb-set"));
          return;
        }
      }
      app.selectNode(n.dataset.id);
      if (
        n.dataset.type === "gallery" &&
        (e.target.closest("[data-lb-open-gallery]") ||
          e.target.closest(".lb-gallery-placeholder") ||
          !app.galleryIdsOf(app.locate(app.state.root, n.dataset.id)?.node?.settings || {}).length)
      ) {
        setTimeout(() => app.openGallery(), 0);
      }
      if (n.dataset.type === "image" && e.target.closest(".lb-image-placeholder")) setTimeout(() => app.openMedia(), 0);
    };
    n.ondblclick = (e) => {
      const target = e.target.closest("[data-inline]");
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        app.inlineEdit(target);
      }
    };
    if (
      ["nested_carousel", "nested_tabs", "nested_accordion", "nested_toggle", "collection_loop"].includes(
        n.dataset.type,
      )
    )
      n.setAttribute("draggable", "false");
    n.ondragstart = (e) => {
      if (n.getAttribute("draggable") === "false") {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      app.dragNode = n.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "node:" + app.dragNode);
      window.__lbDragPayload = "node:" + app.dragNode;
    };
    n.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      n.classList.add("drop-target");
    };
    n.ondragleave = () => n.classList.remove("drop-target");
    n.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      n.classList.remove("drop-target");
      let v = typeof window.__lbDragPayload === "string" ? window.__lbDragPayload : "";
      if (!/^unit:|^node:/.test(v)) {
        try {
          v = e.dataTransfer.getData("text/plain") || "";
        } catch (err) {
          v = "";
        }
      }
      const land = app.dropLanding ? app.dropLanding(e, n) : null;
      if (land && /^unit:|^node:/.test(v)) {
        if (land.kind === "slot" && land.slot && app.nestedActive) app.nestedActive[land.parentId] = land.slot;
        if (v.startsWith("unit:")) app.add(v.slice(5), land.parentId, null, land.slot || null);
        else app.moveExisting(v.slice(5), land.parentId, "inside", land.slot || null);
        return;
      }
      if (v.startsWith("unit:")) {
        if (app.acceptsInside({ type: n.dataset.type })) app.add(v.slice(5), n.dataset.id);
        else {
          const r = app.locate(app.state.root, n.dataset.id);
          if (r) {
            const pos =
              e.clientY < n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2 ? "before" : "after";
            const node = app.makeNode(v.slice(5));
            if (node) {
              if (r.parent && typeof app.assignSlot === "function") app.assignSlot(node, r.parent, r.node.slot);
              app.commit();
              r.nodes.splice(r.index + (pos === "after" ? 1 : 0), 0, node);
              app.selected = node.id;
              app.render();
            }
          }
        }
      } else if (v.startsWith("node:")) {
        const rect = n.getBoundingClientRect();
        const pos =
          e.clientY < rect.top + rect.height / 2
            ? "before"
            : app.acceptsInside({ type: n.dataset.type })
              ? "inside"
              : "after";
        app.moveExisting(v.slice(5), n.dataset.id, pos);
      }
    };
    n.querySelectorAll(":scope > .lb-node-toolbar [data-act]").forEach((b) => {
      if (b.__lbAct) return;
      b.__lbAct = true;
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const node = b.closest(".lb-node"),
          id = node?.dataset.id;
        if (!id) return;
        app.selected = id;
        const r = app.locate(app.state.root, id);
        if (b.dataset.act === "duplicate") app.duplicate();
        else if (b.dataset.act === "delete") app.remove(id);
        else if (r) {
          const dir = b.dataset.act === "move-up" ? -1 : 1;
          if (r.index + dir >= 0 && r.index + dir < r.nodes.length) {
            app.commit();
            [r.nodes[r.index], r.nodes[r.index + dir]] = [r.nodes[r.index + dir], r.nodes[r.index]];
            app.render();
          }
        }
      };
    });
  };
  app.bindCanvasTree = function bindCanvasTree(el) {
    if (!el) return;
    if (el.classList && el.classList.contains("lb-node")) app.bindCanvasNode(el);
    if (el.querySelectorAll) el.querySelectorAll(".lb-node").forEach((n) => app.bindCanvasNode(n));
  };
  app.patchCanvasNode = function patchCanvasNode(id) {
    const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
    if (!fd) return false;
    const r = id && app.locate(app.state.root, id);
    if (!r) return false;
    const el = fd.querySelector('.lb-node[data-id="' + CSS.escape(String(id)) + '"]');
    const raw = typeof app.lbSanitizeNodeForCanvas === "function" ? app.lbSanitizeNodeForCanvas(r.node) : r.node;
    let html = app.nodeHTML(raw);
    if (typeof app.lbSanitizeCanvasMarkup === "function") html = app.lbSanitizeCanvasMarkup(html);
    if (!el) {
      if (typeof app.lbPaintCanvas === "function") app.lbPaintCanvas({ skipPanel: true });
      return true;
    }
    const wrap = fd.createElement("div");
    wrap.innerHTML = html;
    const next = wrap.firstElementChild;
    if (!next) return false;
    const from = el.querySelectorAll("img,video,audio,iframe");
    const to = next.querySelectorAll("img,video,audio,iframe");
    if (from.length && from.length === to.length) {
      for (let i = 0; i < from.length; i++) {
        if (from[i].tagName === to[i].tagName && from[i].getAttribute("src") === to[i].getAttribute("src"))
          to[i].replaceWith(from[i]);
      }
    }
    el.replaceWith(next);
    app.bindCanvasTree(next);
    if (typeof app.lbRunTextPaths === "function") app.lbRunTextPaths(next);
    if (typeof app.syncFrameSelection === "function") app.syncFrameSelection();
    if (r.node.type === "gallery" && typeof window.lbPackGalleries === "function") window.lbPackGalleries();
    if (r.node.type === "shortcode" && typeof app.hydrateShortcodes === "function") app.hydrateShortcodes();
    return true;
  };
  app.shortcodePreview = app.shortcodePreview || {};
  app.shortcodePreviewPending = app.shortcodePreviewPending || {};
  app.lbSanitizePreviewHtml = function lbSanitizePreviewHtml(html) {
    let s = String(html || "");
    s = s.replace(/<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    s = s.replace(/<(script|iframe|object|embed)\b[^>]*\/?>/gi, "");
    s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    s = s.replace(/javascript\s*:|vbscript\s*:/gi, "");
    return s;
  };
  app.installShortcodePreviewStyles = function installShortcodePreviewStyles(fd) {
    if (!fd || !fd.head) return;
    const packs = app.shortcodePreview || {};
    const css =
      ".lb-shortcode-live{pointer-events:none}\n" +
      Object.keys(packs)
        .map((key) => packs[key].css || "")
        .join("\n");
    const links = [];
    Object.keys(packs).forEach((key) =>
      (packs[key].links || []).forEach((href) => {
        if (href && links.indexOf(href) === -1) links.push(href);
      }),
    );
    fd.querySelectorAll("link[data-lb-shortcode-style]").forEach((el) => {
      if (links.indexOf(el.getAttribute("href")) === -1) el.remove();
    });
    links.forEach((href) => {
      if (fd.querySelector('link[data-lb-shortcode-style][href="' + String(href).replace(/"/g, "") + '"]')) return;
      const link = fd.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-lb-shortcode-style", "1");
      fd.head.appendChild(link);
    });
    let tag = fd.getElementById("lb-shortcode-preview-css");
    if (!tag) {
      tag = fd.createElement("style");
      tag.id = "lb-shortcode-preview-css";
    }
    tag.textContent = css;
    fd.head.appendChild(tag);
  };
  app.queueShortcodePreview = function queueShortcodePreview(code) {
    const key = String(code || "").trim();
    if (!key || !/\[[\w-]+/.test(key)) return;
    if (Object.prototype.hasOwnProperty.call(app.shortcodePreview, key) || app.shortcodePreviewPending[key]) return;
    const api = String((app.D && app.D.api) || "").replace(/\/$/, "");
    if (!api) return;
    app.shortcodePreviewPending[key] = true;
    const post = parseInt((app.D && app.D.postId) || 0, 10) || 0;
    fetch(api + "/shortcode/preview", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": (app.D && app.D.nonce) || "" },
      body: JSON.stringify({ post_id: post, shortcode: key }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        delete app.shortcodePreviewPending[key];
        if (!data) return;
        const html = app.lbSanitizePreviewHtml(data.html || "");
        app.shortcodePreview[key] = {
          html,
          css: String(data.css || ""),
          links: Array.isArray(data.links) ? data.links.filter(Boolean) : [],
        };
        if (html.trim() && typeof app.lbPaintCanvas === "function") app.lbPaintCanvas({ skipPanel: true });
        else if (typeof app.frameDoc === "function") app.installShortcodePreviewStyles(app.frameDoc());
      })
      .catch(() => {
        delete app.shortcodePreviewPending[key];
      });
  };
  app.widgetPreviewKey = function widgetPreviewKey(type, s) {
    s = s || {};
    const pick = {
      sidebar: s.sidebar || "",
      widget: s.widget || "",
      title: s.title || "",
      widget_options: s.widget_options || "",
    };
    if (type === "sidebar") return pick.sidebar ? "widget:sidebar:" + pick.sidebar : "";
    if (!pick.widget && !pick.sidebar) return "";
    return "widget:" + type + ":" + JSON.stringify(pick);
  };
  app.queueWidgetPreview = function queueWidgetPreview(type, s) {
    const key = app.widgetPreviewKey(type, s);
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(app.shortcodePreview, key) || app.shortcodePreviewPending[key]) return;
    const api = String((app.D && app.D.api) || "").replace(/\/$/, "");
    if (!api) return;
    app.shortcodePreviewPending[key] = true;
    const post = parseInt((app.D && app.D.postId) || 0, 10) || 0;
    fetch(api + "/widget/preview", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": (app.D && app.D.nonce) || "" },
      body: JSON.stringify({ post_id: post, type, settings: s || {} }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        delete app.shortcodePreviewPending[key];
        if (!data) return;
        const html = app.lbSanitizePreviewHtml(data.html || "");
        app.shortcodePreview[key] = {
          html,
          css: String(data.css || ""),
          links: Array.isArray(data.links) ? data.links.filter(Boolean) : [],
        };
        if (html.trim() && typeof app.lbPaintCanvas === "function") app.lbPaintCanvas({ skipPanel: true });
        else if (typeof app.frameDoc === "function") app.installShortcodePreviewStyles(app.frameDoc());
      })
      .catch(() => {
        delete app.shortcodePreviewPending[key];
      });
  };
  app.widgetPreviewHTML = function widgetPreviewHTML(type, s) {
    const key = app.widgetPreviewKey(type, s);
    const pack = key && app.shortcodePreview && app.shortcodePreview[key];
    if (pack && pack.html && pack.html.trim()) return '<div class="lb-shortcode-live">' + pack.html + "</div>";
    if (key) app.queueWidgetPreview(type, s);
    return "";
  };
  app.hydrateShortcodes = function hydrateShortcodes() {
    const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
    if (fd) app.installShortcodePreviewStyles(fd);
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        if (!n) return;
        if (n.type === "shortcode") app.queueShortcodePreview(n.settings && n.settings.shortcode);
        if (n.type === "sidebar" || n.type === "wordpress_widget") app.queueWidgetPreview(n.type, n.settings);
        if (Array.isArray(n.children)) walk(n.children);
      });
    };
    if (!app.state) return;
    walk(app.state.root);
    walk(app.state.header);
    walk(app.state.footer);
  };
}

export { installCanvas };
