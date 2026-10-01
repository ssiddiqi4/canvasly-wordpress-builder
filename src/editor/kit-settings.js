import { app } from "./app.js";
function installKitSettings() {
  const SIZES = ["cover", "contain", "auto"];
  const REPEATS = ["no-repeat", "repeat", "repeat-x", "repeat-y"];
  const ATTACH = ["scroll", "fixed"];
  const CAPTIONS = ["none", "alt", "caption", "title"];
  const TEMPLATES = [
    { id: "default", label: "Default" },
    { id: "full_width", label: "Full Width" },
    { id: "canvas", label: "Canvas" },
  ];
  app.kitSettingsDefaults = function kitSettingsDefaults() {
    return {
      layout: { content_width: "", widgets_space: "", page_title_selector: "", default_template: "default" },
      identity: { title: "", description: "", logo_id: 0, logo_url: "", favicon_id: 0, favicon_url: "" },
      lightbox: {
        overlay_color: "",
        ui_color: "",
        show_close: true,
        show_counter: false,
        show_fullscreen: false,
        caption_source: "caption",
      },
      background: {
        color: "",
        image_id: 0,
        image_url: "",
        size: "cover",
        position: "center center",
        repeat: "no-repeat",
        attachment: "scroll",
      },
    };
  };
  app.kitSettingsData = function kitSettingsData() {
    const d = app.kitSettingsDefaults();
    const cur = app.D.kitSettings && typeof app.D.kitSettings === "object" ? app.D.kitSettings : {};
    const merge = (base, extra) => {
      if (!extra || typeof extra !== "object") return base;
      Object.keys(base).forEach((k) => {
        if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) base[k] = merge(base[k], extra[k] || {});
        else if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
      });
      return base;
    };
    return merge(d, cur);
  };
  app.kitDefaultTemplate = function kitDefaultTemplate() {
    const t3 = String(app.kitSettingsData().layout?.default_template || "default");
    return t3 === "full_width" || t3 === "canvas" ? t3 : "default";
  };
  app.kitContentWidth = function kitContentWidth() {
    return String(app.kitSettingsData().layout?.content_width || app.D.globals?.content_width || "").trim();
  };
  function cssVal(v) {
    let s = String(v ?? "").trim();
    if (!s) return "";
    s = app.lbResolveToken ? String(app.lbResolveToken(s)) : s;
    return s;
  }
  function sel2(suffix) {
    const parts = [".lb-page", ".lb-frame-root"];
    if (!suffix) return parts.join(", ");
    return parts.map((r) => r + suffix).join(", ");
  }
  function rule(selector, decls) {
    const d = (decls || []).filter(Boolean);
    return d.length ? selector + "{" + d.join(";") + ";}" : "";
  }
  function prefixSel(prefix, selector) {
    return String(selector)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => prefix + " " + s)
      .join(", ");
  }
  app.kitSettingsCss = function kitSettingsCss(data) {
    const d = data || app.kitSettingsData();
    const vars = {};
    let out = "";
    const width = cssVal(d.layout.content_width);
    if (width) vars["page-width"] = width;
    const space = cssVal(d.layout.widgets_space);
    if (space) {
      vars["widgets-space"] = space;
      out += rule(sel2(" > .lb-node:not(:last-child)"), ["margin-block-end:" + space]);
    }
    const overlay = cssVal(d.lightbox.overlay_color);
    if (overlay) vars["lightbox-overlay"] = overlay;
    const ui = cssVal(d.lightbox.ui_color);
    if (ui) vars["lightbox-ui"] = ui;
    const titleSel = String(d.layout.page_title_selector || "").trim();
    if (titleSel) out += rule(prefixSel("body.lb-document", titleSel), ["display:none"]);
    const bgDecl = [];
    const bgc = cssVal(d.background.color);
    if (bgc) {
      bgDecl.push("background-color:" + bgc);
      vars["site-bg-color"] = bgc;
    }
    const bgUrl = String(d.background.image_url || "").trim();
    if (bgUrl) {
      bgDecl.push("background-image:url(" + bgUrl + ")");
      bgDecl.push("background-size:" + cssVal(d.background.size || "cover"));
      bgDecl.push("background-position:" + cssVal(d.background.position || "center center"));
      bgDecl.push("background-repeat:" + cssVal(d.background.repeat || "no-repeat"));
      bgDecl.push("background-attachment:" + cssVal(d.background.attachment || "scroll"));
    }
    if (bgDecl.length) out += rule(sel2("") + ",body.lb-template-canvas,body.lb-template-full-width", bgDecl);
    let custom = "";
    Object.keys(vars).forEach((name) => {
      if (!vars[name]) return;
      custom += `--lb-${name}:${vars[name]};`;
      if (name === "lightbox-overlay") custom += `--lb-lightbox-overlay:${vars[name]};`;
      if (name === "lightbox-ui") custom += `--lb-lightbox-ui:${vars[name]};`;
      if (name === "page-width") custom += `--lb-page-width:${vars[name]};`;
      if (name === "widgets-space") custom += `--lb-widgets-space:${vars[name]};`;
    });
    return (custom ? sel2("") + "{" + custom + "}" : "") + out;
  };
  app.applyKitSettingsCss = function applyKitSettingsCss() {
    const css = app.kitSettingsCss();
    const wrapped = css ? "/*lb-kit-style*/" + css + "/*lb-kit-style-end*/" : "";
    app.D.designCss = String(app.D.designCss || "").replace(
      /\/\*lb-kit-style\*\/[\s\S]*?\/\*lb-kit-style-end\*\//g,
      "",
    );
    app.D.designCss += wrapped;
    const fd = app.frameDoc();
    if (!fd || !fd.head) return;
    [...fd.querySelectorAll("style")].forEach((el) => {
      if (el.id === "lb-kit-style") return;
      const t3 = el.textContent || "";
      if (/\/\*lb-kit-style\*\//.test(t3))
        el.textContent = t3.replace(/\/\*lb-kit-style\*\/[\s\S]*?\/\*lb-kit-style-end\*\//g, wrapped);
    });
    let st = fd.getElementById("lb-kit-style");
    if (!st) {
      st = fd.createElement("style");
      st.id = "lb-kit-style";
      fd.head.appendChild(st);
    }
    st.textContent = css;
    const root = fd.querySelector(".lb-frame-root");
    const width = app.kitContentWidth();
    if (
      root &&
      width &&
      app.pageTemplate &&
      app.pageTemplate() === "default" &&
      !String((app.state.settings || {}).page_width || "").trim()
    ) {
      root.style.setProperty("--lb-page-width", width);
    }
  };
  let saveTimer = null;
  app.saveKitSettings = function saveKitSettings(next) {
    if (next) app.D.kitSettings = next;
    const width = String(app.D.kitSettings?.layout?.content_width || "").trim();
    if (width) {
      app.D.globals = app.D.globals || {};
      app.D.globals.content_width = width;
    }
    app.applyDesignCss();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const r = await fetch(`${app.D.api}/kit-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
          body: JSON.stringify(app.D.kitSettings || {}),
        });
        if (r.ok) {
          const saved = await r.json();
          if (saved && typeof saved === "object" && saved.layout) app.D.kitSettings = saved;
          app.applyDesignCss();
        }
      } catch (e) {}
    }, 350);
  };
  function field(label, control) {
    return `<label class="lb-control"><span>${app.esc(label)}</span>${control}</label>`;
  }
  function textField(path, label, value, placeholder) {
    return field(
      label,
      `<input data-kit-path="${app.esc(path)}" value="${app.esc(value || "")}" placeholder="${app.esc(placeholder || "")}">`,
    );
  }
  function selectField(path, label, value, options, labels) {
    const opts = options
      .map(
        (o) =>
          `<option value="${app.esc(o)}" ${String(value || "") === o ? "selected" : ""}>${app.esc((labels && labels[o]) || o)}</option>`,
      )
      .join("");
    return field(label, `<select data-kit-path="${app.esc(path)}">${opts}</select>`);
  }
  function switchField(path, label, on) {
    return `<label class="lb-control lb-switch"><input data-kit-path="${app.esc(path)}" type="checkbox" ${on ? "checked" : ""}><span>${app.esc(label)}</span></label>`;
  }
  function colorField(path, value, label) {
    if (typeof app.themeColorField === "function")
      return app
        .themeColorField(path, value, label)
        .replace(/data-ts-path=/g, "data-kit-path=")
        .replace(/data-ts-color=/g, "data-kit-color=")
        .replace(/data-ts-empty=/g, "data-kit-empty=")
        .replace(/data-globals-theme=/g, "data-globals-kit=");
    const hex = app.isHexColor && app.isHexColor(value) ? value : "#000000";
    return `<div class="lb-control lb-color-control" data-kit-color="${app.esc(path)}" style="--lb-picked:${app.esc(hex)}"><div class="lb-control-head"><span>${app.esc(label)}</span></div><div class="lb-color-row"><input data-kit-path="${app.esc(path)}" type="color" value="${app.esc(hex)}" data-kit-empty="${value && String(value).trim() ? "0" : "1"}"><span class="lb-color-hex">${app.esc(value || app.t("Default"))}</span></div></div>`;
  }
  function mediaField(idPath, urlPath, id, url, label) {
    id = parseInt(id, 10) || 0;
    url = String(url || "");
    return `<div class="lb-control lb32-media" data-kit-media-id="${app.esc(idPath)}" data-kit-media-url="${app.esc(urlPath)}"><span>${app.esc(label)}</span><div class="lb32-media-row"><button type="button" class="lb32-media-preview lb-kit-media-open" title="${app.t("Choose image")}">${id || url ? `<img src="${app.esc(url)}" alt="">` : "<span>" + app.t("Choose image") + "</span>"}</button>${id || url ? `<button type="button" class="lb-btn lb-kit-media-clear">${app.t("Remove")}</button>` : ""}</div></div>`;
  }
  app.kitSettingsHTML = function kitSettingsHTML() {
    const d = app.kitSettingsData();
    const capLabels = { none: app.t("None"), alt: app.t("Alt Text"), caption: app.t("Caption"), title: app.t("Title") };
    const tplOpts = TEMPLATES.map(
      (t3) =>
        `<option value="${t3.id}" ${d.layout.default_template === t3.id ? "selected" : ""}>${app.t(t3.label)}</option>`,
    ).join("");
    return `<div class="lb-ss-kit-panel">
			<div class="lb-ss-section"><h4>${app.t("Layout")}</h4>
				${textField("layout.content_width", app.t("Content Width"), d.layout.content_width, app.D.globals?.content_width || "1180px")}
				<p class="lb-muted">${app.t("Used when a page does not set its own content width.")}</p>
				${textField("layout.widgets_space", app.t("Widgets Space"), d.layout.widgets_space, "20px")}
				${textField("layout.page_title_selector", app.t("Page Title Selector"), d.layout.page_title_selector, ".entry-title")}
				<p class="lb-muted">${app.t("Hides matching theme title units on Sidcraft Syntex pages.")}</p>
				${field(app.t("Default Template"), `<select data-kit-path="layout.default_template">${tplOpts}</select>`)}
			</div>
			<div class="lb-ss-section"><h4>${app.t("Site Identity")}</h4>
				${textField("identity.title", app.t("Site Title"), d.identity.title, "")}
				<label class="lb-control"><span>${app.t("Tagline")}</span><textarea data-kit-path="identity.description" rows="2">${app.esc(d.identity.description || "")}</textarea></label>
				${mediaField("identity.logo_id", "identity.logo_url", d.identity.logo_id, d.identity.logo_url, app.t("Logo"))}
				${mediaField("identity.favicon_id", "identity.favicon_url", d.identity.favicon_id, d.identity.favicon_url, app.t("Favicon"))}
				<p class="lb-muted">${app.t("Title, tagline, logo and favicon are stored in WordPress site settings.")}</p>
			</div>
			<div class="lb-ss-section"><h4>${app.t("Lightbox")}</h4>
				${colorField("lightbox.overlay_color", d.lightbox.overlay_color, app.t("Overlay Color"))}
				${colorField("lightbox.ui_color", d.lightbox.ui_color, app.t("UI Color"))}
				${switchField("lightbox.show_close", app.t("Close Button"), !!d.lightbox.show_close)}
				${switchField("lightbox.show_counter", app.t("Counter"), !!d.lightbox.show_counter)}
				${switchField("lightbox.show_fullscreen", app.t("Fullscreen"), !!d.lightbox.show_fullscreen)}
				${selectField("lightbox.caption_source", app.t("Caption Source"), d.lightbox.caption_source, CAPTIONS, capLabels)}
			</div>
			<div class="lb-ss-section"><h4>${app.t("Site Background")}</h4>
				${colorField("background.color", d.background.color, app.t("Background Color"))}
				${mediaField("background.image_id", "background.image_url", d.background.image_id, d.background.image_url, app.t("Background Image"))}
				${selectField("background.size", app.t("Background Size"), d.background.size, SIZES)}
				${textField("background.position", app.t("Background Position"), d.background.position, "center center")}
				${selectField("background.repeat", app.t("Background Repeat"), d.background.repeat, REPEATS)}
				${selectField("background.attachment", app.t("Background Attachment"), d.background.attachment, ATTACH)}
			</div>
		</div>`;
  };
  app.readKitSettingsFromPanel = function readKitSettingsFromPanel() {
    const d = app.kitSettingsData();
    app.root.querySelectorAll("[data-kit-path]").forEach((el) => {
      const path = el.dataset.kitPath;
      if (!path) return;
      if (el.disabled && el.type === "color") return;
      let val = el.type === "checkbox" ? el.checked : el.value;
      if (el.type === "color" && el.dataset.kitEmpty === "1") val = "";
      else if (el.type === "color" && val && app.isHexColor && !app.isHexColor(val)) val = "";
      app.setPath(d, path, val);
    });
    app.root.querySelectorAll("[data-kit-color]").forEach((wrap) => {
      const path = wrap.dataset.kitColor;
      const input = wrap.querySelector("[data-kit-path]");
      if (!path || !input || !input.disabled) return;
      const cur = app.getPath(d, path);
      if (!app.parseColorGlobal(cur)) {
        const hex = wrap.querySelector(".lb-color-hex")?.textContent;
        const id = app.globalColors().find((c) => c.title === hex)?.id;
        if (id) app.setPath(d, path, `{{var:colors.${id}}}`);
      }
    });
    return d;
  };
  function openKitMedia(idPath, urlPath) {
    if (!window.wp?.media) return;
    const f = wp.media({
      title: app.t("Select Image"),
      button: { text: app.t("Use Image") },
      multiple: false,
      library: { type: "image" },
    });
    f.on("select", () => {
      const a = f.state().get("selection").first().toJSON();
      const d = app.kitSettingsData();
      app.setPath(d, idPath, a.id);
      app.setPath(d, urlPath, (a.sizes && a.sizes.medium && a.sizes.medium.url) || a.url || "");
      app.saveKitSettings(d);
      app.refreshRightPanel();
    });
    f.open();
  }
  app.bindKitSettings = function bindKitSettings() {
    if (app.siteSettingsTab !== "site") return;
    const persist = () => app.saveKitSettings(app.readKitSettingsFromPanel());
    app.root.querySelectorAll(".lb-ss-kit-panel [data-kit-path]").forEach((el) => {
      el.addEventListener("change", persist);
      if (
        el.type === "color" ||
        el.tagName === "TEXTAREA" ||
        (el.tagName === "INPUT" && el.type !== "checkbox" && el.type !== "color")
      ) {
        el.addEventListener("input", () => {
          if (el.type === "color") el.dataset.kitEmpty = "0";
          persist();
        });
      }
    });
    app.root.querySelectorAll(".lb-ss-kit-panel .lb-globals-btn").forEach((b) => {
      if (b.__lbKitGlobals) return;
      b.__lbKitGlobals = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.openGlobalsPopover(b);
      });
    });
    app.root.querySelectorAll("[data-kit-media-id]").forEach((wrap) => {
      wrap.querySelector(".lb-kit-media-open")?.addEventListener("click", (e) => {
        e.preventDefault();
        openKitMedia(wrap.dataset.kitMediaId, wrap.dataset.kitMediaUrl);
      });
      wrap.querySelector(".lb-kit-media-clear")?.addEventListener("click", (e) => {
        e.preventDefault();
        const d = app.kitSettingsData();
        app.setPath(d, wrap.dataset.kitMediaId, 0);
        app.setPath(d, wrap.dataset.kitMediaUrl, "");
        app.saveKitSettings(d);
        app.refreshRightPanel();
      });
    });
  };
  const oldOpenGlobals = app.openGlobalsPopover;
  app.openGlobalsPopover = function openGlobalsPopoverWithKit(btn) {
    const kitPath = btn.dataset.globalsKit;
    if (!kitPath) return oldOpenGlobals.call(this, btn);
    app.closeGlobalsPopover();
    const settings = app.kitSettingsData();
    const boundColor = app.parseColorGlobal(app.getPath(settings, kitPath));
    const items = app
      .globalColors()
      .map(
        (c) =>
          `<button type="button" class="lb-globals-item${boundColor === c.id ? " is-active" : ""}" data-global-id="${app.esc(c.id)}"><i style="background:${app.esc(c.value)}"></i><span>${app.esc(c.title)}</span></button>`,
      )
      .join("");
    const pop = document.createElement("div");
    pop.className = "lb-globals-popover";
    pop.innerHTML = `<header>${app.esc(app.t("Global Colors"))}</header><div class="lb-globals-list">${items || '<p class="lb-muted">' + app.t("No globals yet.") + "</p>"}</div><div class="lb-globals-actions">${boundColor ? `<button type="button" class="lb-btn" data-global-clear>${app.t("Unlink")}</button>` : ""}<button type="button" class="lb-btn" data-open-site-settings>${app.t("Manage Globals")}</button></div>`;
    document.body.appendChild(pop);
    app.globalsPopover = pop;
    const rect = btn.getBoundingClientRect();
    const w = pop.offsetWidth || 240;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.right - w));
    let top = rect.bottom + 6;
    if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - pop.offsetHeight - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.querySelectorAll("[data-global-id]").forEach((b) => {
      b.onclick = () => {
        const d = app.kitSettingsData();
        app.setPath(d, kitPath, `{{var:colors.${b.dataset.globalId}}}`);
        app.saveKitSettings(d);
        app.closeGlobalsPopover();
        app.refreshRightPanel();
      };
    });
    pop.querySelector("[data-global-clear]")?.addEventListener("click", () => {
      const d = app.kitSettingsData();
      const id = app.parseColorGlobal(app.getPath(d, kitPath));
      app.setPath(d, kitPath, id ? app.globalColorValue(id) : "");
      app.saveKitSettings(d);
      app.closeGlobalsPopover();
      app.refreshRightPanel();
    });
    pop.querySelector("[data-open-site-settings]")?.addEventListener("click", () => {
      app.closeGlobalsPopover();
      app.openSiteSettings("colors");
    });
  };
  const oldApply = app.applyDesignCss;
  app.applyDesignCss = function applyDesignCssWithKit() {
    if (typeof oldApply === "function") oldApply();
    app.applyKitSettingsCss();
  };
  if (typeof app.bindFrame === "function") {
    const oldBind = app.bindFrame;
    app.bindFrame = function bindFrameWithKit() {
      oldBind();
      app.applyKitSettingsCss();
    };
  }
  if (typeof app.lb110DesignCss === "function") {
    const oldDesignCss = app.lb110DesignCss;
    app.lb110DesignCss = function lb110DesignCssWithKit() {
      const rest = String(oldDesignCss() || "").replace(/\/\*lb-kit-style\*\/[\s\S]*?\/\*lb-kit-style-end\*\//g, "");
      const css = app.kitSettingsCss();
      return rest + (css ? "/*lb-kit-style*/" + css + "/*lb-kit-style-end*/" : "");
    };
  }
  if (typeof app.lb110RefreshDesignData === "function") {
    const oldRefreshDs = app.lb110RefreshDesignData;
    app.lb110RefreshDesignData = async function lb110RefreshDesignDataWithKit(doRender) {
      const result = await oldRefreshDs(doRender);
      const incoming = app.D.designSystem && app.D.designSystem.kit_settings;
      if (incoming && typeof incoming === "object") {
        app.D.kitSettings = incoming;
        app.D.designCss = app.lb110DesignCss();
        if (!doRender) app.applyKitSettingsCss();
      }
      return result;
    };
  }
  if (typeof app.pageTemplate === "function") {
    const oldTpl = app.pageTemplate;
    app.pageTemplate = function pageTemplateWithKit() {
      const explicit = String((app.state.settings || {}).template || "");
      if (explicit === "full_width" || explicit === "canvas" || explicit === "default") return oldTpl();
      return app.kitDefaultTemplate();
    };
  }
  if (!app.D.kitSettings || typeof app.D.kitSettings !== "object") app.D.kitSettings = app.kitSettingsDefaults();
  if (app.state && (!app.state.settings || !app.state.settings.template)) {
    app.state.settings = Object.assign({}, app.state.settings || {}, { template: app.kitDefaultTemplate() });
  }
  app.applyKitSettingsCss();
}

export { installKitSettings };
