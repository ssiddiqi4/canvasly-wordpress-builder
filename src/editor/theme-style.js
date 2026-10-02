import { app } from "./app.js";
function installThemeStyle() {
  const ROOT = ".lb-page, .lb-frame-root";
  const TYPO_PROPS = [
    "font_family",
    "font_size",
    "font_weight",
    "font_style",
    "text_transform",
    "text_decoration",
    "line_height",
    "letter_spacing",
  ];
  const TYPO_TARGETS = ["body", "paragraph", "h1", "h2", "h3", "h4", "h5", "h6", "link"];
  const WEIGHTS = ["", "300", "400", "500", "600", "700", "800", "900"];
  const TRANSFORMS = ["", "none", "uppercase", "lowercase", "capitalize"];
  const STYLES = ["", "normal", "italic", "oblique"];
  const DECOS = ["", "none", "underline", "overline", "line-through"];
  const BORDERS = ["", "none", "solid", "dashed", "dotted", "double"];
  const GLOBE =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><ellipse cx="8" cy="8" rx="2.4" ry="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.8 8h12.4M8 1.8c1.8 2 2.7 4.1 2.7 6.2S9.8 12.2 8 14.2C6.2 12.2 5.3 10.1 5.3 8S6.2 3.8 8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  const COLOR_KEYS = {
    color: 1,
    background: 1,
    border_color: 1,
    hover_color: 1,
    hover_background: 1,
    hover_border_color: 1,
    focus_background: 1,
    focus_border_color: 1,
    caption_color: 1,
    label_color: 1,
    placeholder_color: 1,
  };
  app.themeStyleOpenId = app.themeStyleOpenId || "typography.body";
  function emptyTypo(extra) {
    const o = { color: "" };
    TYPO_PROPS.forEach((p) => {
      o[p] = "";
    });
    return Object.assign(o, extra || {});
  }
  app.themeStyleDefaults = function themeStyleDefaults() {
    const typography = {};
    TYPO_TARGETS.forEach((id) => {
      typography[id] = emptyTypo(
        id === "paragraph"
          ? { margin_bottom: "" }
          : id === "link"
            ? { hover_color: "", hover_text_decoration: "" }
            : {},
      );
    });
    return {
      typography,
      buttons: Object.assign(emptyTypo(), {
        background: "",
        border_width: "",
        border_style: "",
        border_color: "",
        border_radius: "",
        padding: "",
        shadow: "",
        hover_color: "",
        hover_background: "",
        hover_border_color: "",
        hover_shadow: "",
        transition: "",
      }),
      images: {
        border_width: "",
        border_style: "",
        border_color: "",
        border_radius: "",
        opacity: "",
        shadow: "",
        css_filter: "",
        hover_opacity: "",
        hover_shadow: "",
        hover_css_filter: "",
        caption_color: "",
        caption_spacing: "",
      },
      form_fields: Object.assign(emptyTypo(), {
        background: "",
        placeholder_color: "",
        border_width: "",
        border_style: "",
        border_color: "",
        border_radius: "",
        padding: "",
        shadow: "",
        label_color: "",
        label_spacing: "",
        hover_background: "",
        hover_border_color: "",
        focus_background: "",
        focus_border_color: "",
        focus_shadow: "",
        transition: "",
      }),
    };
  };
  app.themeStyleData = function themeStyleData() {
    const d = app.themeStyleDefaults();
    const cur = app.D.themeStyle && typeof app.D.themeStyle === "object" ? app.D.themeStyle : {};
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
  function quoteFont(fam) {
    const s = String(fam || "").trim();
    if (!s) return "";
    if (s[0] === '"' || s[0] === "'" || s.indexOf(",") !== -1 || s.indexOf("var(") === 0) return s;
    return /\s/.test(s) ? `"${s}"` : s;
  }
  function cssVal(v, font) {
    let s = String(v ?? "").trim();
    if (!s) return "";
    s = app.lbResolveToken ? String(app.lbResolveToken(s)) : s;
    return font ? quoteFont(s) : s;
  }
  function sel2(suffix) {
    const parts = ROOT.split(",").map((s) => s.trim());
    if (!suffix) return parts.join(", ");
    return parts.map((r) => r + suffix).join(", ");
  }
  function each(selector, suffix) {
    return String(selector)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s + suffix)
      .join(", ");
  }
  function rule(selector, decls) {
    const d = (decls || []).filter(Boolean);
    return d.length ? selector + "{" + d.join(";") + ";}" : "";
  }
  function typoDecls(item, includeColor) {
    item = item || {};
    const map = {
      font_family: "font-family",
      font_size: "font-size",
      font_weight: "font-weight",
      font_style: "font-style",
      text_transform: "text-transform",
      text_decoration: "text-decoration",
      line_height: "line-height",
      letter_spacing: "letter-spacing",
    };
    const d = [];
    Object.keys(map).forEach((k) => {
      const v = cssVal(item[k], k === "font_family");
      if (v) d.push(map[k] + ":" + v);
    });
    if (includeColor !== false) {
      const c = cssVal(item.color);
      if (c) d.push("color:" + c);
    }
    return d;
  }
  function boxDecls(item) {
    item = item || {};
    const d = [];
    const put = (css, key) => {
      const v = cssVal(item[key]);
      if (v) d.push(css + ":" + v);
    };
    put("color", "color");
    put("background", "background");
    put("border-width", "border_width");
    put("border-style", "border_style");
    put("border-color", "border_color");
    put("border-radius", "border_radius");
    put("padding", "padding");
    put("box-shadow", "shadow");
    put("transition", "transition");
    return d;
  }
  function hoverDecls(item) {
    item = item || {};
    const d = [];
    const put = (css, key) => {
      const v = cssVal(item[key]);
      if (v) d.push(css + ":" + v);
    };
    put("color", "hover_color");
    put("background", "hover_background");
    put("border-color", "hover_border_color");
    put("box-shadow", "hover_shadow");
    return d;
  }
  function collectVars(vars, prefix, item) {
    item = item || {};
    TYPO_PROPS.forEach((p) => {
      const v = cssVal(item[p], p === "font_family");
      if (v) vars[prefix + "-" + p.replace(/_/g, "-")] = v;
    });
    const c = cssVal(item.color);
    if (c) vars[prefix + "-color"] = c;
  }
  function collectBoxVars(vars, prefix, item) {
    item = item || {};
    [
      "color",
      "background",
      "border_width",
      "border_style",
      "border_color",
      "border_radius",
      "padding",
      "shadow",
      "transition",
      "hover_color",
      "hover_background",
      "hover_border_color",
      "hover_shadow",
    ].forEach((k) => {
      const v = cssVal(item[k]);
      if (v) vars[prefix + "-" + k.replace(/_/g, "-")] = v;
    });
  }
  app.themeStyleCss = function themeStyleCss(data) {
    const d = data || app.themeStyleData();
    const vars = {};
    let out = "";
    const body = d.typography.body || {};
    out += rule(sel2(""), typoDecls(body));
    collectVars(vars, "body", body);
    const p = d.typography.paragraph || {};
    const pDecl = typoDecls(p);
    const mb = cssVal(p.margin_bottom);
    if (mb) {
      pDecl.push("margin-bottom:" + mb);
      vars["paragraph-spacing"] = mb;
    }
    out += rule(sel2(" p") + "," + sel2(" .lb-text") + "," + sel2(" .lb-text-content"), pDecl);
    collectVars(vars, "paragraph", p);
    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((tag) => {
      const item = d.typography[tag] || {};
      out += rule(sel2(" " + tag), typoDecls(item));
      collectVars(vars, tag, item);
    });
    const link = d.typography.link || {};
    const linkSel = sel2(
      " a:not(.lb-button):not(.lb-tab-button):not(:where(.lb-flip-button)):not(:where(.lb-social-item)):not(:where(.lb-icon-glyph)):not(:where(.lb-heading-link)):not(:where(.lb-site-nav a)):not(:where(.lb-icon-box-title a)):not(:where(.lb-image-box-title a)):not(:where(.lb-icon-list-item>a)):not(:where(.lb-testimonial-name a)):not(:where(.lb-anchor-menu a))",
    );
    out += rule(linkSel, typoDecls(link));
    const linkHover = [];
    const hc = cssVal(link.hover_color);
    if (hc) {
      linkHover.push("color:" + hc);
      vars["link-hover-color"] = hc;
    }
    const hd = cssVal(link.hover_text_decoration);
    if (hd) linkHover.push("text-decoration:" + hd);
    out += rule(each(linkSel, ":hover") + "," + each(linkSel, ":focus"), linkHover);
    collectVars(vars, "link", link);
    const lc = cssVal(link.color);
    if (lc) vars["link-color"] = lc;
    const btn = d.buttons || {};
    const btnSel =
      sel2(" .lb-button") +
      "," +
      sel2(" .lb-form button") +
      "," +
      sel2(" .lb-read-more") +
      "," +
      sel2(" .lb-price-table>a") +
      "," +
      sel2(" .lb-login button") +
      "," +
      sel2(" .lb-link-bio-links a");
    out += rule(btnSel, typoDecls(btn, false).concat(boxDecls(btn)));
    out += rule(each(btnSel, ":hover") + "," + each(btnSel, ":focus"), hoverDecls(btn));
    collectVars(vars, "button", btn);
    collectBoxVars(vars, "button", btn);
    const img = d.images || {};
    const imgSel = sel2(" .lb-image-img") + "," + sel2(" .lb-image img") + "," + sel2(" .lb-node-image img");
    const imgDecl = boxDecls({
      border_width: img.border_width,
      border_style: img.border_style,
      border_color: img.border_color,
      border_radius: img.border_radius,
      shadow: img.shadow,
    });
    const iop = cssVal(img.opacity);
    if (iop) imgDecl.push("opacity:" + iop);
    const ift = cssVal(img.css_filter);
    if (ift) imgDecl.push("filter:" + ift);
    out += rule(imgSel, imgDecl);
    const imgHover = [];
    const hop = cssVal(img.hover_opacity);
    if (hop) imgHover.push("opacity:" + hop);
    const hsh = cssVal(img.hover_shadow);
    if (hsh) imgHover.push("box-shadow:" + hsh);
    const hft = cssVal(img.hover_css_filter);
    if (hft) imgHover.push("filter:" + hft);
    out += rule(each(imgSel, ":hover"), imgHover);
    const cap = [];
    const cc = cssVal(img.caption_color);
    if (cc) cap.push("color:" + cc);
    const cs = cssVal(img.caption_spacing);
    if (cs) cap.push("margin-top:" + cs);
    out += rule(sel2(" .lb-image figcaption") + "," + sel2(" .lb-image-preview figcaption"), cap);
    const form = d.form_fields || {};
    const fieldSel =
      sel2(" .lb-form-field input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=hidden])") +
      "," +
      sel2(" .lb-form-field textarea") +
      "," +
      sel2(" .lb-form-field select") +
      "," +
      sel2(" .lb-login input[type=text]") +
      "," +
      sel2(" .lb-login input[type=password]");
    out += rule(fieldSel, typoDecls(form, false).concat(boxDecls(form)));
    const ph = cssVal(form.placeholder_color);
    if (ph) out += rule(each(fieldSel, "::placeholder"), ["color:" + ph]);
    out += rule(each(fieldSel, ":hover"), hoverDecls(form));
    out += rule(
      each(fieldSel, ":focus") + "," + each(fieldSel, ":focus-visible"),
      hoverDecls({
        hover_color: "",
        hover_background: form.focus_background,
        hover_border_color: form.focus_border_color,
        hover_shadow: form.focus_shadow,
      }),
    );
    const lab = [];
    const lbc = cssVal(form.label_color);
    if (lbc) lab.push("color:" + lbc);
    const lbs = cssVal(form.label_spacing);
    if (lbs) lab.push("margin-bottom:" + lbs);
    out += rule(sel2(" .lb-form-field > label") + "," + sel2(" .lb-form-field label"), lab);
    collectVars(vars, "form", form);
    collectBoxVars(vars, "form", form);
    [
      "placeholder_color",
      "label_color",
      "label_spacing",
      "focus_background",
      "focus_border_color",
      "focus_shadow",
    ].forEach((k) => {
      const v = cssVal(form[k]);
      if (v) vars["form-" + k.replace(/_/g, "-")] = v;
    });
    let custom = "";
    Object.keys(vars).forEach((name) => {
      if (!vars[name]) return;
      custom += `--lb-theme-${name}:${vars[name]};`;
      if (name === "link-color") custom += `--lb-link-color:${vars[name]};`;
      if (name === "link-hover-color") custom += `--lb-link-hover:${vars[name]};`;
      if (name === "paragraph-spacing") custom += `--lb-paragraph-spacing:${vars[name]};`;
    });
    return (custom ? sel2("") + "{" + custom + "}" : "") + out;
  };
  app.applyThemeStyleCss = function applyThemeStyleCss() {
    const css = app.themeStyleCss();
    const wrapped = css ? "/*lb-theme-style*/" + css + "/*lb-theme-style-end*/" : "";
    app.D.designCss = String(app.D.designCss || "").replace(
      /\/\*lb-theme-style\*\/[\s\S]*?\/\*lb-theme-style-end\*\//g,
      "",
    );
    app.D.designCss += wrapped;
    const fd = app.frameDoc();
    if (!fd || !fd.head) return;
    [...fd.querySelectorAll("style")].forEach((el) => {
      if (el.id === "lb-theme-style") return;
      const t3 = el.textContent || "";
      if (/\/\*lb-theme-style\*\//.test(t3))
        el.textContent = t3.replace(/\/\*lb-theme-style\*\/[\s\S]*?\/\*lb-theme-style-end\*\//g, wrapped);
    });
    let st = fd.getElementById("lb-theme-style");
    if (!st) {
      st = fd.createElement("style");
      st.id = "lb-theme-style";
      (fd.head || fd.documentElement).appendChild(st);
    }
    st.textContent = css;
  };
  let saveTimer = null;
  app.saveThemeStyle = function saveThemeStyle(next) {
    if (next) app.D.themeStyle = next;
    app.applyDesignCss();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const r = await fetch(`${app.D.api}/theme-style`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
          body: JSON.stringify(app.D.themeStyle || {}),
        });
        if (r.ok) {
          const saved = await r.json();
          if (saved && typeof saved === "object" && saved.typography) app.D.themeStyle = saved;
          app.applyDesignCss();
        }
      } catch (e) {}
    }, 350);
  };
  function selectOpts(list, cur, emptyLabel) {
    return list
      .map(
        (o) => `<option value="${app.esc(o)}" ${String(cur || "") === o ? "selected" : ""}>${o || emptyLabel}</option>`,
      )
      .join("");
  }
  function field(path, label, control) {
    return `<label class="lb-control"><span>${app.esc(label)}</span>${control}</label>`;
  }
  function textField(path, label, value, placeholder) {
    return field(
      path,
      label,
      `<input data-ts-path="${app.esc(path)}" value="${app.esc(value || "")}" placeholder="${app.esc(placeholder || "")}">`,
    );
  }
  function selectField(path, label, value, options, emptyLabel) {
    return field(
      path,
      label,
      `<select data-ts-path="${app.esc(path)}">${selectOpts(options, value, emptyLabel || app.t("Default"))}</select>`,
    );
  }
  app.themeColorField = function themeColorField(path, value, label) {
    const bound = app.parseColorGlobal ? app.parseColorGlobal(value) : "";
    const hex = bound
      ? app.globalColorValue(bound) || "#000000"
      : app.isHexColor && app.isHexColor(value)
        ? value
        : value || "#000000";
    const display = app.isHexColor && app.isHexColor(hex) ? hex : "#000000";
    return `<div class="lb-control lb-color-control${bound ? " is-global" : ""}" data-ts-color="${app.esc(path)}" style="--lb-picked:${app.esc(display)}"><div class="lb-control-head"><span>${app.esc(label)}</span><button type="button" class="lb-globals-btn${bound ? " is-active" : ""}" data-globals-kind="color" data-globals-theme="${app.esc(path)}" title="${app.t("Global Colors")}" aria-label="${app.t("Global Colors")}" aria-pressed="${bound ? "true" : "false"}">${GLOBE}</button></div><div class="lb-color-row"><input data-ts-path="${app.esc(path)}" type="color" value="${app.esc(display)}" data-ts-empty="${bound || (value && String(value).trim()) ? "0" : "1"}"${bound ? ' data-global-bound="1" disabled' : ""}><span class="lb-color-hex">${app.esc(bound ? app.globalColorTitle(bound) : value ? display : app.t("Default"))}</span></div></div>`;
  };
  function typoFields(path, item, extras) {
    item = item || {};
    const fonts =
      typeof app.lb104FontOptions === "function"
        ? app.lb104FontOptions(item.font_family || "")
        : `<option value="">${app.t("Default")}</option>`;
    let h = field(
      path + ".font_family",
      app.t("Font Family"),
      `<select data-ts-path="${app.esc(path + ".font_family")}">${fonts}</select>`,
    );
    h += textField(path + ".font_size", app.t("Size"), item.font_size, "16px");
    h += selectField(path + ".font_weight", app.t("Weight"), item.font_weight, WEIGHTS);
    h += textField(path + ".line_height", app.t("Line Height"), item.line_height, "1.4");
    h += textField(path + ".letter_spacing", app.t("Letter Spacing"), item.letter_spacing, "0");
    h += selectField(path + ".text_transform", app.t("Transform"), item.text_transform, TRANSFORMS);
    h += selectField(path + ".font_style", app.t("Style"), item.font_style, STYLES);
    h += selectField(path + ".text_decoration", app.t("Decoration"), item.text_decoration, DECOS);
    h += app.themeColorField(path + ".color", item.color, app.t("Text Color"));
    (extras || []).forEach((x) => {
      h += x;
    });
    return h;
  }
  function boxFields(path, item, opts) {
    item = item || {};
    opts = opts || {};
    let h = "";
    if (!opts.noFill) {
      h += app.themeColorField(path + ".color", item.color, app.t("Text Color"));
      h += app.themeColorField(path + ".background", item.background, app.t("Background Color"));
    }
    h += textField(path + ".border_width", app.t("Border Width"), item.border_width, "1px");
    h += selectField(path + ".border_style", app.t("Border Style"), item.border_style, BORDERS, app.t("Default"));
    h += app.themeColorField(path + ".border_color", item.border_color, app.t("Border Color"));
    h += textField(path + ".border_radius", app.t("Border Radius"), item.border_radius, "4px");
    if (!opts.noPadding) h += textField(path + ".padding", app.t("Padding"), item.padding, "10px 18px");
    h += textField(path + ".shadow", app.t("Box Shadow"), item.shadow, "0 8px 24px rgba(0,0,0,.12)");
    return h;
  }
  function hoverFields(path, item, keys) {
    item = item || {};
    let h = `<div class="lb-ss-subhead">${app.t("Hover")}</div>`;
    (keys || ["hover_color", "hover_background", "hover_border_color", "hover_shadow"]).forEach((k) => {
      const label =
        {
          hover_color: app.t("Hover Text Color"),
          hover_background: app.t("Hover Background"),
          hover_border_color: app.t("Hover Border Color"),
          hover_shadow: app.t("Hover Shadow"),
          hover_opacity: app.t("Hover Opacity"),
          hover_css_filter: app.t("Hover CSS Filter"),
          hover_text_decoration: app.t("Hover Decoration"),
        }[k] || k;
      if (COLOR_KEYS[k]) h += app.themeColorField(path + "." + k, item[k], label);
      else if (k === "hover_text_decoration") h += selectField(path + "." + k, label, item[k], DECOS);
      else h += textField(path + "." + k, label, item[k], "");
    });
    return h;
  }
  function details(id, title, body) {
    const open = app.themeStyleOpenId === id ? " open" : "";
    return `<details class="lb-ss-theme" data-ts-id="${app.esc(id)}"${open}><summary>${app.esc(title)}</summary><div class="lb-ss-typo-body">${body}</div></details>`;
  }
  app.themeStyleHTML = function themeStyleHTML() {
    const d = app.themeStyleData();
    const labels = {
      body: app.t("Body"),
      paragraph: app.t("Paragraph"),
      h1: "H1",
      h2: "H2",
      h3: "H3",
      h4: "H4",
      h5: "H5",
      h6: "H6",
      link: app.t("Links"),
    };
    let typo = "";
    TYPO_TARGETS.forEach((id) => {
      const item = d.typography[id] || {};
      const extra = [];
      if (id === "paragraph")
        extra.push(
          textField("typography.paragraph.margin_bottom", app.t("Paragraph Spacing"), item.margin_bottom, "1em"),
        );
      if (id === "link") extra.push(hoverFields("typography.link", item, ["hover_color", "hover_text_decoration"]));
      typo += details("typography." + id, labels[id] || id, typoFields("typography." + id, item, extra));
    });
    const btn = d.buttons || {};
    const images = d.images || {};
    const form = d.form_fields || {};
    return `<div class="lb-ss-theme-panel">
			<div class="lb-ss-section"><h4>${app.t("Typography")}</h4>${typo}</div>
			<div class="lb-ss-section"><h4>${app.t("Buttons")}</h4>${details("buttons", app.t("Buttons"), typoFields("buttons", btn, [app.themeColorField("buttons.background", btn.background, app.t("Background Color")), boxFields("buttons", btn, { noFill: true }), textField("buttons.transition", app.t("Transition"), btn.transition, "0.3s"), hoverFields("buttons", btn)]))}</div>
			<div class="lb-ss-section"><h4>${app.t("Images")}</h4>${details("images", app.t("Images"), boxFields("images", images, { noFill: true, noPadding: true }) + textField("images.opacity", app.t("Opacity"), images.opacity, "1") + textField("images.css_filter", app.t("CSS Filter"), images.css_filter, "none") + app.themeColorField("images.caption_color", images.caption_color, app.t("Caption")) + textField("images.caption_spacing", app.t("Caption Spacing"), images.caption_spacing, "8px") + hoverFields("images", images, ["hover_opacity", "hover_shadow", "hover_css_filter"]))}</div>
			<div class="lb-ss-section"><h4>${app.t("Form Fields")}</h4>${details("form_fields", app.t("Form Fields"), typoFields("form_fields", form, [app.themeColorField("form_fields.background", form.background, app.t("Background Color")), boxFields("form_fields", form, { noFill: true }), app.themeColorField("form_fields.placeholder_color", form.placeholder_color, app.t("Placeholder Color")), app.themeColorField("form_fields.label_color", form.label_color, app.t("Label Color")), textField("form_fields.label_spacing", app.t("Label Spacing"), form.label_spacing, "6px"), textField("form_fields.transition", app.t("Transition"), form.transition, "0.3s"), hoverFields("form_fields", form, ["hover_background", "hover_border_color"]), `<div class="lb-ss-subhead">${app.t("Focus")}</div>` + app.themeColorField("form_fields.focus_background", form.focus_background, app.t("Focus Background")) + app.themeColorField("form_fields.focus_border_color", form.focus_border_color, app.t("Focus Border Color")) + textField("form_fields.focus_shadow", app.t("Focus Shadow"), form.focus_shadow, "")]))}</div>
		</div>`;
  };
  app.readThemeStyleFromPanel = function readThemeStyleFromPanel() {
    const d = app.themeStyleData();
    app.root.querySelectorAll("[data-ts-path]").forEach((el) => {
      const path = el.dataset.tsPath;
      if (!path) return;
      if (el.disabled && el.type === "color") return;
      let val = el.value;
      if (el.type === "color" && el.dataset.tsEmpty === "1") val = "";
      else if (el.type === "color" && val && app.isHexColor && !app.isHexColor(val)) val = "";
      app.setPath(d, path, val);
    });
    app.root.querySelectorAll("[data-ts-color]").forEach((wrap) => {
      const path = wrap.dataset.tsColor;
      const input = wrap.querySelector("[data-ts-path]");
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
  app.bindThemeStyle = function bindThemeStyle() {
    if (app.siteSettingsTab !== "theme") return;
    const persist = () => {
      const d = app.readThemeStyleFromPanel();
      Object.keys(d.typography || {}).forEach((id) => {
        const fam = d.typography[id]?.font_family;
        if (fam && app.lb101LoadEditorFont) app.lb101LoadEditorFont(fam);
      });
      if (d.buttons?.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(d.buttons.font_family);
      if (d.form_fields?.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(d.form_fields.font_family);
      app.saveThemeStyle(d);
    };
    app.root.querySelectorAll(".lb-ss-theme-panel [data-ts-path]").forEach((el) => {
      el.addEventListener("change", persist);
      if (el.type === "color")
        el.addEventListener("input", () => {
          el.dataset.tsEmpty = "0";
          persist();
        });
    });
    app.root.querySelectorAll(".lb-ss-theme").forEach((d) =>
      d.addEventListener("toggle", () => {
        if (d.open) app.themeStyleOpenId = d.dataset.tsId;
      }),
    );
    app.root.querySelectorAll(".lb-ss-theme-panel .lb-globals-btn").forEach((b) => {
      if (b.__lbThemeGlobals) return;
      b.__lbThemeGlobals = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.openGlobalsPopover(b);
      });
    });
  };
  const oldOpenGlobals = app.openGlobalsPopover;
  app.openGlobalsPopover = function openGlobalsPopoverWithTheme(btn) {
    const themePath = btn.dataset.globalsTheme;
    if (!themePath) return oldOpenGlobals(btn);
    app.closeGlobalsPopover();
    const settings = app.themeStyleData();
    const boundColor = app.parseColorGlobal(app.getPath(settings, themePath));
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
        const d = app.themeStyleData();
        app.setPath(d, themePath, `{{var:colors.${b.dataset.globalId}}}`);
        app.saveThemeStyle(d);
        app.closeGlobalsPopover();
        app.refreshRightPanel();
      };
    });
    pop.querySelector("[data-global-clear]")?.addEventListener("click", () => {
      const d = app.themeStyleData();
      const id = app.parseColorGlobal(app.getPath(d, themePath));
      app.setPath(d, themePath, id ? app.globalColorValue(id) : "");
      app.saveThemeStyle(d);
      app.closeGlobalsPopover();
      app.refreshRightPanel();
    });
    pop.querySelector("[data-open-site-settings]")?.addEventListener("click", () => {
      app.closeGlobalsPopover();
      app.openSiteSettings("colors");
    });
  };
  const oldApply = app.applyDesignCss;
  app.applyDesignCss = function applyDesignCssWithTheme() {
    oldApply();
    app.applyThemeStyleCss();
  };
  if (typeof app.bindFrame === "function") {
    const oldBind = app.bindFrame;
    app.bindFrame = function bindFrameWithTheme() {
      oldBind();
      app.applyThemeStyleCss();
    };
  }
  if (typeof app.lb110DesignCss === "function") {
    const oldDesignCss = app.lb110DesignCss;
    app.lb110DesignCss = function lb110DesignCssWithTheme() {
      const rest = String(oldDesignCss() || "").replace(
        /\/\*lb-theme-style\*\/[\s\S]*?\/\*lb-theme-style-end\*\//g,
        "",
      );
      const css = app.themeStyleCss();
      return rest + (css ? "/*lb-theme-style*/" + css + "/*lb-theme-style-end*/" : "");
    };
  }
  if (typeof app.lb110RefreshDesignData === "function") {
    const oldRefreshDs = app.lb110RefreshDesignData;
    app.lb110RefreshDesignData = async function lb110RefreshDesignDataWithTheme(doRender) {
      const result = await oldRefreshDs(doRender);
      const incoming = app.D.designSystem && app.D.designSystem.theme_style;
      if (incoming && typeof incoming === "object") {
        app.D.themeStyle = incoming;
        app.D.designCss = app.lb110DesignCss();
        if (!doRender) app.applyThemeStyleCss();
      }
      return result;
    };
  }
  if (!app.D.themeStyle || typeof app.D.themeStyle !== "object") app.D.themeStyle = app.themeStyleDefaults();
  const scan = app.themeStyleData();
  Object.keys(scan.typography || {}).forEach((id) => {
    const f = scan.typography[id]?.font_family;
    if (f && app.lb101LoadEditorFont) app.lb101LoadEditorFont(f);
  });
  if (scan.buttons?.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(scan.buttons.font_family);
  if (scan.form_fields?.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(scan.form_fields.font_family);
  app.applyThemeStyleCss();
}

export { installThemeStyle };
