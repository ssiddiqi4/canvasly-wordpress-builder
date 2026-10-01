import { app } from "./app.js";
function installGroups() {
  const ICONS = {
    left: "\u2B05",
    center: "\u2194",
    right: "\u27A1",
    justify: "\u2630",
    flex: "\u25A4",
    grid: "\u25A6",
    block: "\u25A0",
    row: "\u2194",
    column: "\u2195",
    top: "\u2B06",
    middle: "\u25CF",
    bottom: "\u2B07",
    stretch: "\u2922",
    solid: "\u2014",
    dashed: "- -",
    dotted: "\xB7\xB7\xB7",
    none: "\u25CB",
    linear: "\u2571",
    radial: "\u25CE",
  };
  app.lbGroupVal = function lbGroupVal(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  };
  const GRAD_POS = [
    "center center",
    "center left",
    "center right",
    "top center",
    "top left",
    "top right",
    "bottom center",
    "bottom left",
    "bottom right",
  ];
  app.lbColorInputValue = function lbColorInputValue(c, fallback) {
    const v = String(c || "").trim();
    if (/^#([A-Fa-f0-9]{3})$/.test(v)) return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(v)) return v;
    return fallback || "#000000";
  };
  app.lbParseGradientString = function lbParseGradientString(css) {
    const raw = String(css || "").trim();
    const out = { type: "gradient", custom: raw };
    let m = raw.match(
      /linear-gradient\s*\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*([^,]+?)\s+(\d+%)?\s*,\s*([^,)]+?)\s+(\d+%)?\s*\)/i,
    );
    if (m) {
      out.gradient_type = "linear";
      out.gradient_angle = parseInt(m[1], 10);
      out.gradient_a = m[2].trim();
      out.gradient_a_pos = m[3] ? parseInt(m[3], 10) : 0;
      out.gradient_b = m[4].trim();
      out.gradient_b_pos = m[5] ? parseInt(m[5], 10) : 100;
      out.custom = "";
      return out;
    }
    m = raw.match(/linear-gradient\s*\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*([^,]+)\s*,\s*([^)]+)\)/i);
    if (m) {
      out.gradient_type = "linear";
      out.gradient_angle = parseInt(m[1], 10);
      out.gradient_a = m[2].trim();
      out.gradient_b = m[3].trim();
      out.custom = "";
    }
    return out;
  };
  app.lbNormGradient = function lbNormGradient(v) {
    if (typeof v === "string" && v) v = app.lbParseGradientString(v);
    const x = app.lbGroupVal(v);
    let aPos = Number(x.gradient_a_pos);
    let bPos = Number(x.gradient_b_pos);
    if (!Number.isFinite(aPos)) aPos = 0;
    if (!Number.isFinite(bPos)) bPos = 100;
    const pos = String(x.gradient_position || "center center");
    return {
      gradient_type: x.gradient_type === "radial" ? "radial" : "linear",
      gradient_angle: Math.max(0, Math.min(360, parseInt(x.gradient_angle ?? 180, 10) || 0)),
      gradient_position: GRAD_POS.indexOf(pos) !== -1 ? pos : "center center",
      gradient_a: x.gradient_a || x.color || "#000000",
      gradient_b: x.gradient_b || "#ffffff",
      gradient_a_pos: Math.max(0, Math.min(100, aPos)),
      gradient_b_pos: Math.max(0, Math.min(100, bPos)),
      custom: x.custom || "",
    };
  };
  app.lbCompileGradientCss = function lbCompileGradientCss(v) {
    const raw = typeof v === "string" ? app.lbParseGradientString(v) : app.lbGroupVal(v);
    if (raw.custom && !raw.gradient_a && !raw.gradient_b) return raw.custom;
    const g = app.lbNormGradient(raw);
    const stops = g.gradient_a + " " + g.gradient_a_pos + "%, " + g.gradient_b + " " + g.gradient_b_pos + "%";
    if (g.gradient_type === "radial") return "radial-gradient(circle at " + g.gradient_position + ", " + stops + ")";
    return "linear-gradient(" + g.gradient_angle + "deg, " + stops + ")";
  };
  app.lbGradientFieldsHTML = function lbGradientFieldsHTML(k, v) {
    const g = app.lbNormGradient(v);
    const bar =
      "linear-gradient(90deg, " +
      g.gradient_a +
      " " +
      g.gradient_a_pos +
      "%, " +
      g.gradient_b +
      " " +
      g.gradient_b_pos +
      "%)";
    const posOpts = GRAD_POS.map(
      (p) =>
        `<option value="${app.esc(p)}" ${p === g.gradient_position ? "selected" : ""}>${app.esc(app.t(p.replace(/\b\w/g, (c) => c.toUpperCase())))}</option>`,
    ).join("");
    return `<div class="lb-gradient" data-grad-key="${app.esc(k)}" data-grad-active="a">
			${app.lbChooseHTML(k + ".gradient_type", { options: { linear: app.t("Linear"), radial: app.t("Radial") } }, g.gradient_type, app.t("Type"))}
			<div class="lb-grad-bar-wrap"><span>${app.t("Location")}</span>
				<div class="lb-grad-bar" style="background:${app.esc(bar)}" role="slider" aria-label="${app.t("Gradient")}">
					<button type="button" class="lb-grad-stop is-active" data-grad-stop="a" style="left:${g.gradient_a_pos}%;background:${app.esc(g.gradient_a)}" title="${app.t("Color A")}" aria-label="${app.t("Color A")}"></button>
					<button type="button" class="lb-grad-stop" data-grad-stop="b" style="left:${g.gradient_b_pos}%;background:${app.esc(g.gradient_b)}" title="${app.t("Color B")}" aria-label="${app.t("Color B")}"></button>
				</div>
			</div>
			<label class="lb-control"><span>${app.t("Color A")}</span><input data-setting="${k}.gradient_a" type="color" value="${app.esc(app.lbColorInputValue(g.gradient_a, "#000000"))}" data-lb-color="${app.esc(g.gradient_a || "#000000")}"></label>
			${app.lbSlider(k + ".gradient_a_pos", app.t("Location"), g.gradient_a_pos, { unitless: true, min: 0, max: 100, step: 1 })}
			<label class="lb-control"><span>${app.t("Color B")}</span><input data-setting="${k}.gradient_b" type="color" value="${app.esc(app.lbColorInputValue(g.gradient_b, "#ffffff"))}" data-lb-color="${app.esc(g.gradient_b || "#ffffff")}"></label>
			${app.lbSlider(k + ".gradient_b_pos", app.t("Location"), g.gradient_b_pos, { unitless: true, min: 0, max: 100, step: 1 })}
			${g.gradient_type === "radial" ? `<label class="lb-control"><span>${app.t("Position")}</span><select data-setting="${k}.gradient_position">${posOpts}</select></label>` : app.lbSlider(k + ".gradient_angle", app.t("Angle"), g.gradient_angle, { unitless: true, min: 0, max: 360, step: 1 })}
		</div>`;
  };
  app.lbGradientHTML = function lbGradientHTML(k, v, l) {
    return `<div class="lb-control lb-group lb-gradient-control"><span>${app.esc(l)}</span><div class="lb-group-body">${app.lbGradientFieldsHTML(k, v)}</div></div>`;
  };
  app.lbPaintTargetForSetting = function lbPaintTargetForSetting(node, settingKey) {
    if (!node) return null;
    const root = String(settingKey || "").split(".")[0];
    if (root === "front_background") return node.querySelector(".lb-flip-front");
    if (root === "back_background") return node.querySelector(".lb-flip-back");
    if (root === "background") return node.querySelector(".lb-container-inner, .lb-grid-inner") || node;
    return node.querySelector(".lb-flip-front, .lb-flip-back, .lb-container-inner") || node;
  };
  app.lbRefreshGradientBar = function lbRefreshGradientBar(box, settings) {
    if (!box) return;
    const key = box.dataset.gradKey;
    const g = app.lbNormGradient(settings ? app.getPath(settings, key) : {});
    const bar = box.querySelector(".lb-grad-bar");
    if (bar)
      bar.style.background =
        "linear-gradient(90deg, " +
        g.gradient_a +
        " " +
        g.gradient_a_pos +
        "%, " +
        g.gradient_b +
        " " +
        g.gradient_b_pos +
        "%)";
    const a = box.querySelector('.lb-grad-stop[data-grad-stop="a"]');
    const b = box.querySelector('.lb-grad-stop[data-grad-stop="b"]');
    if (a) {
      a.style.left = g.gradient_a_pos + "%";
      a.style.background = g.gradient_a;
    }
    if (b) {
      b.style.left = g.gradient_b_pos + "%";
      b.style.background = g.gradient_b;
    }
  };
  app.lbApplyGradientLive = function lbApplyGradientLive(node, key) {
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return;
    const parts = String(key || "").split(".");
    const field = parts.pop();
    const bgPath = parts.join(".");
    const settings = r.node.settings || {};
    if (bgPath) {
      const bg = app.getPath(settings, bgPath);
      if (bg && typeof bg === "object") {
        if (String(field).indexOf("gradient_") === 0) app.setPath(settings, bgPath + ".custom", "");
        const compiled = app.lbCompileBackground(Object.assign({}, bg, { type: bg.type || "gradient" }), settings);
        const target = app.lbPaintTargetForSetting(node, bgPath);
        if (target)
          Object.keys(compiled).forEach((p) => {
            if (compiled[p] != null && compiled[p] !== "") target.style.setProperty(p, compiled[p]);
          });
      }
    }
    const barKey = bgPath || key;
    app.root.querySelectorAll(".lb-gradient[data-grad-key]").forEach((box) => {
      if (box.dataset.gradKey === barKey) app.lbRefreshGradientBar(box, settings);
    });
  };
  app.lbSeedGradient = function lbSeedGradient(cur) {
    const x = app.lbGroupVal(cur);
    const g = app.lbNormGradient(x);
    return Object.assign({}, x, {
      type: "gradient",
      gradient_type: g.gradient_type,
      gradient_angle: g.gradient_angle,
      gradient_position: g.gradient_position,
      gradient_a: x.gradient_a || x.color || "#000000",
      gradient_b: x.gradient_b || "#ffffff",
      gradient_a_pos: x.gradient_a_pos ?? 0,
      gradient_b_pos: x.gradient_b_pos ?? 100,
      custom: "",
    });
  };
  const SVG_ICONS = (() => {
    const sv = (body) =>
      `<svg class="lb-ico" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
    const bar = (x, y, w, h) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="currentColor" stroke="none"/>`;
    const hl = (y) => `<path d="M3 ${y}h14"/>`;
    const vl = (x) => `<path d="M${x} 3v14"/>`;
    return {
      "lbi-dir-row": sv('<path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5"/>'),
      "lbi-dir-column": sv('<path d="M10 3v13M5.5 11.5 10 16l4.5-4.5"/>'),
      "lbi-dir-row-reverse": sv('<path d="M17 10H4M8.5 5.5 4 10l4.5 4.5"/>'),
      "lbi-dir-column-reverse": sv('<path d="M10 17V4M5.5 8.5 10 4l4.5 4.5"/>'),
      "lbi-justify-start": sv(hl(2.75) + bar(6, 5, 8, 2.5) + bar(6, 9.5, 8, 2.5)),
      "lbi-justify-center": sv(hl(10) + bar(6, 5.5, 8, 2.5) + bar(6, 12, 8, 2.5)),
      "lbi-justify-end": sv(hl(17.25) + bar(6, 8, 8, 2.5) + bar(6, 12.5, 8, 2.5)),
      "lbi-justify-between": sv(hl(2.75) + hl(17.25) + bar(6, 4.5, 8, 2.5) + bar(6, 13, 8, 2.5)),
      "lbi-justify-around": sv(hl(2.75) + hl(17.25) + bar(6, 5.75, 8, 2.5) + bar(6, 11.75, 8, 2.5)),
      "lbi-justify-evenly": sv(hl(2.75) + hl(17.25) + bar(6, 6.5, 8, 2.5) + bar(6, 11, 8, 2.5)),
      "lbi-align-start": sv(vl(2.75) + bar(4.5, 5.5, 9, 3) + bar(4.5, 11.5, 6, 3)),
      "lbi-align-center": sv(vl(10) + bar(5.5, 5.5, 9, 3) + bar(7, 11.5, 6, 3)),
      "lbi-align-end": sv(vl(17.25) + bar(6.5, 5.5, 9, 3) + bar(9.5, 11.5, 6, 3)),
      "lbi-align-stretch": sv(vl(2.75) + vl(17.25) + bar(4.5, 5.5, 11, 3) + bar(4.5, 11.5, 11, 3)),
      "lbi-align-baseline": sv('<path d="M3 13h14"/>' + bar(4.5, 5, 4.5, 8) + bar(11, 8.5, 4.5, 4.5)),
      "lbi-nowrap": sv('<path d="M3.5 5v10M7 10h9.5M12.5 6l4 4-4 4"/>'),
      "lbi-wrap": sv('<path d="M3.5 5v10M7 6h6.5a3.25 3.25 0 0 1 0 6.5H8M10.5 10 8 12.5l2.5 2.5"/>'),
      "lbi-link": sv(
        '<path d="M8.5 11.5a3 3 0 0 0 4.24 0l2.5-2.5a3 3 0 0 0-4.24-4.24l-.9.9M11.5 8.5a3 3 0 0 0-4.24 0l-2.5 2.5a3 3 0 0 0 4.24 4.24l.9-.9"/>',
      ),
      "lbi-unlink": sv(
        '<path d="M8.5 11.5a3 3 0 0 0 4.24 0l2.5-2.5a3 3 0 0 0-4.24-4.24M11.5 8.5a3 3 0 0 0-4.24 0l-2.5 2.5a3 3 0 0 0 4.24 4.24M4 4l2 2M16 16l-2-2"/>',
      ),
      "lbi-desktop": sv(
        '<rect x="2.75" y="3.75" width="14.5" height="9.5" rx="1"/><path d="M7.5 16.25h5M10 13.25v3"/>',
      ),
      "lbi-tablet": sv('<rect x="4.75" y="2.75" width="10.5" height="14.5" rx="1.25"/><path d="M9 14.75h2"/>'),
      "lbi-mobile": sv('<rect x="6.25" y="2.75" width="7.5" height="14.5" rx="1.25"/><path d="M9.25 14.75h1.5"/>'),
    };
  })();
  app.lbSvgIcon = function lbSvgIcon(name) {
    return SVG_ICONS[name] || "";
  };
  /** Device glyph for responsive controls. Clicking it steps the canvas to the next enabled breakpoint. */
  app.lbRespDeviceHTML = function lbRespDeviceHTML() {
    const dev = String(app.device || "desktop");
    const icon = /mobile/.test(dev) ? "lbi-mobile" : /tablet/.test(dev) ? "lbi-tablet" : "lbi-desktop";
    const bp = typeof app.breakpoint === "function" ? app.breakpoint(dev) : null;
    const name = bp && bp.label ? app.t(bp.label) || bp.label : dev;
    return `<button type="button" class="lb-resp-device" data-lb-resp-cycle="1" title="${app.esc(app.t("Responsive") + ": " + name)}" aria-label="${app.esc(app.t("Responsive") + ": " + name)}">${SVG_ICONS[icon]}</button>`;
  };
  /** Current flex direction of the node that owns an Items control (drives icon orientation). */
  app.lbAxisDirection = function lbAxisDirection(def, s) {
    if (!def || !def.axis_key) return "";
    if (!s) {
      const r = app.selected && app.locate(app.state.root, app.selected);
      s = (r && r.node.settings) || {};
    }
    const raw = s[def.axis_key];
    const cur = raw && typeof raw === "object" && !Array.isArray(raw) ? app.resp(raw) : raw;
    return String(cur || def.axis_default || "row");
  };
  app.lbAxisClass = function lbAxisClass(kind, dir) {
    if (kind === "justify") {
      if (dir === "row") return "lb-axis-t";
      if (dir === "row-reverse") return "lb-axis-rot";
      if (dir === "column-reverse") return "lb-axis-flipy";
      return "";
    }
    if (kind === "align") return dir === "row" || dir === "row-reverse" ? "lb-axis-t" : "";
    return "";
  };
  app.lbChooseHTML = function lbChooseHTML(k, def, v, label) {
    def = def || {};
    const opts = app.lbCtrlOpts(def, k);
    const icons = def.icons && typeof def.icons === "object" ? def.icons : ICONS;
    const responsive = !!def.responsive;
    const setting = responsive ? k + "." + (app.device || "desktop") : k;
    const current = responsive ? (v && typeof v === "object" && !Array.isArray(v) ? app.resp(v) : v) : v;
    const iconsOnly = !!def.icons_only;
    const buttons = opts
      .map((o) => {
        const lab = app.lbCtrlOptLabel(def, k, o);
        const ic = icons[o] || "";
        const svg = ic && SVG_ICONS[ic] ? SVG_ICONS[ic] : "";
        const on = String(o) === String(current ?? "");
        const glyph = svg
          ? `<span class="lb-choose-ico" aria-hidden="true">${svg}</span>`
          : ic
            ? `<span aria-hidden="true">${ic}</span>`
            : "";
        const text =
          iconsOnly && glyph ? `<span class="lb-sr">${app.esc(lab)}</span>` : `<small>${app.esc(lab)}</small>`;
        return `<button type="button" class="lb-choose-btn${on ? " is-active" : ""}" data-choose-key="${app.esc(setting)}" data-choose-value="${app.esc(o)}"${def.toggle ? ' data-choose-toggle="1"' : ""} title="${app.esc(lab)}" aria-pressed="${on ? "true" : "false"}">${glyph}${text}</button>`;
      })
      .join("");
    if (iconsOnly) {
      const axis = def.axis ? app.lbAxisClass(def.axis, app.lbAxisDirection(def)) : "";
      const axisAttrs = def.axis
        ? ` data-axis="${app.esc(def.axis)}" data-axis-key="${app.esc(def.axis_key || "")}" data-axis-default="${app.esc(def.axis_default || "row")}"`
        : "";
      const block = !!def.label_block;
      return `<div class="lb-control lb-choose lb-choose-icons${block ? " is-block" : " is-inline"}${axis ? " " + axis : ""}" data-choose-for="${app.esc(k)}"${axisAttrs}><div class="lb-choose-label"><span>${app.esc(label)}</span>${responsive ? app.lbRespDeviceHTML() : ""}</div><div class="lb-choose-row lb-choose-seg" role="group" aria-label="${app.esc(label)}">${buttons}</div></div>`;
    }
    return `<div class="lb-control lb-choose"><span>${app.esc(label)}${responsive ? " <small>" + app.t("responsive") + "</small>" : ""}</span><div class="lb-choose-row" role="group">${buttons}</div></div>`;
  };
  app.boxControl = function boxControl(k, v, l) {
    const x = app.lbGroupVal(v);
    const linked = !!x.linked;
    const lock = linked ? "is-linked" : "";
    return `<div class="lb-control lb-dimensions ${lock}" data-dim-key="${app.esc(k)}"><div class="lb-control-head"><span>${app.esc(l)}</span><button type="button" class="lb-link-btn${linked ? " is-active" : ""}" data-link-key="${app.esc(k)}" title="${app.t("Link sides")}" aria-pressed="${linked ? "true" : "false"}">${linked ? "\u{1F517}" : "\u22B6"}</button></div><div class="lb-box-grid lb-box-grid-labeled"><input data-setting="${k}.top" value="${app.esc(x.top ?? "")}" placeholder="${app.t("Top")}"><input data-setting="${k}.right" value="${app.esc(x.right ?? "")}" placeholder="${app.t("Right")}" ${linked ? "disabled" : ""}><input data-setting="${k}.bottom" value="${app.esc(x.bottom ?? "")}" placeholder="${app.t("Bottom")}" ${linked ? "disabled" : ""}><input data-setting="${k}.left" value="${app.esc(x.left ?? "")}" placeholder="${app.t("Left")}" ${linked ? "disabled" : ""}></div></div>`;
  };
  app.shadowControl = function shadowControl(k, v, l, opts) {
    const x = app.lbGroupVal(v);
    const text = !!(opts && opts.text);
    return `<div class="lb-control lb-shadow"><span>${app.esc(l)}</span><div class="lb-shadow-grid">${app.lbSlider(k + ".x", app.t("X"), x.x ?? 0, { unitless: true, min: -50, max: 50, step: 1 })}${app.lbSlider(k + ".y", app.t("Y"), x.y ?? 0, { unitless: true, min: -50, max: 50, step: 1 })}${app.lbSlider(k + ".blur", app.t("Blur"), x.blur ?? 0, { unitless: true, min: 0, max: 80, step: 1 })}${text ? "" : app.lbSlider(k + ".spread", app.t("Spread"), x.spread ?? 0, { unitless: true, min: -40, max: 40, step: 1 })}<label class="lb-control"><span>${app.t("Color")}</span><input data-setting="${k}.color" type="color" value="${app.esc(x.color && x.color[0] === "#" ? x.color : "#000000")}"></label>${text ? "" : `<label class="lb-switch"><input data-setting="${k}.inset" type="checkbox" ${x.inset ? "checked" : ""}><span>${app.t("Inset")}</span></label>`}</div></div>`;
  };
  app.lbTypographyHTML = function lbTypographyHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    return `<div class="lb-control lb-group lb-typography"><span>${app.esc(l)}</span><div class="lb-group-body">
			<label class="lb-control lb-font-family-control"><span>${app.t("Font Family")} <small>${app.t("Google Fonts")}</small></span><select data-setting="${k}.font_family" class="lb-font-family-select" aria-label="${app.t("Font Family")}">${typeof app.lb104FontOptions === "function" ? app.lb104FontOptions(x.font_family || "") : `<option value="">${app.t("Default")}</option>`}</select></label>
			${app.lbSlider(k + ".font_size", app.t("Font Size"), x.font_size || "", { units: ["px", "em", "rem"], min: 6, max: 200 })}
			<label class="lb-control"><span>${app.t("Weight")}</span><select data-setting="${k}.font_weight">${["", "300", "400", "500", "600", "700", "800", "900"].map((o) => `<option value="${o}" ${String(o) === String(x.font_weight || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>
			<label class="lb-control"><span>${app.t("Style")}</span><select data-setting="${k}.font_style">${["", "normal", "italic", "oblique"].map((o) => `<option value="${o}" ${String(o) === String(x.font_style || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>
			<label class="lb-control"><span>${app.t("Transform")}</span><select data-setting="${k}.text_transform">${["", "none", "uppercase", "lowercase", "capitalize"].map((o) => `<option value="${o}" ${String(o) === String(x.text_transform || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>
			<label class="lb-control"><span>${app.t("Decoration")}</span><select data-setting="${k}.text_decoration">${["", "none", "underline", "overline", "line-through"].map((o) => `<option value="${o}" ${String(o) === String(x.text_decoration || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>
			${app.lbSlider(k + ".line_height", app.t("Line Height"), x.line_height || "", { unitless: true, min: 0.6, max: 3, step: 0.05 })}
			${app.lbSlider(k + ".letter_spacing", app.t("Letter Spacing"), x.letter_spacing || "", { units: ["px", "em"], min: -5, max: 20, step: 0.1 })}
		</div></div>`;
  };
  app.lbBorderHTML = function lbBorderHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    return `<div class="lb-control lb-group lb-border"><span>${app.esc(l)}</span><div class="lb-group-body">
			${app.lbChooseHTML(k + ".style", { options: { "": app.t("None"), solid: app.t("Solid"), dashed: app.t("Dashed"), dotted: app.t("Dotted"), double: app.t("Double") } }, x.style || "", app.t("Style"))}
			${app.boxControl(k + ".width", x.width || {}, app.t("Width"))}
			<label class="lb-control"><span>${app.t("Color")}</span><input data-setting="${k}.color" type="color" value="${app.esc(x.color || "#dddddd")}"></label>
			${app.boxControl(k + ".radius", x.radius || {}, app.t("Radius"))}
		</div></div>`;
  };
  app.lbBackgroundHTML = function lbBackgroundHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    const type = x.type || "classic";
    const types = [
      ["classic", app.t("Classic")],
      ["gradient", app.t("Gradient")],
      ["video", app.t("Video")],
      ["slideshow", app.t("Slideshow")],
    ];
    const tabs = types
      .map(
        ([id2, lab]) =>
          `<button type="button" class="lb-bg-type${type === id2 ? " is-active" : ""}" data-setting-set="${k}.type" data-set-value="${id2}">${app.esc(lab)}</button>`,
      )
      .join("");
    const id = parseInt(x.image_id, 10) || 0;
    const url = x.image_url || "";
    let body = "";
    if (type === "classic") {
      body += `<label class="lb-control"><span>${app.t("Color")}</span><input data-setting="${k}.color" type="color" value="${app.esc(x.color || "#ffffff")}"></label>`;
      body += `<div class="lb-control lb32-media"><span>${app.t("Image")}</span><div class="lb32-media-row"><button type="button" class="lb32-media-preview lb-media-open" data-media-key="${k}.image_id" title="${app.t("Choose image")}">${id || url ? `<img src="${app.esc(url)}" alt="">` : "<span>" + app.t("Choose image") + "</span>"}</button><input data-setting="${k}.image_id" type="hidden" value="${app.esc(id || 0)}">${id || url ? `<button type="button" class="lb-btn lb28-media-clear" data-media-key="${k}.image_id">${app.t("Remove")}</button>` : ""}</div></div>`;
      body += `<label class="lb-control"><span>${app.t("Size")}</span><select data-setting="${k}.size">${["", "cover", "contain", "auto"].map((o) => `<option value="${o}" ${String(o) === String(x.size || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>`;
      body += `<label class="lb-control"><span>${app.t("Position")}</span><input data-setting="${k}.position" value="${app.esc(x.position || "center")}"></label>`;
      body += `<label class="lb-control"><span>${app.t("Repeat")}</span><select data-setting="${k}.repeat">${["", "no-repeat", "repeat", "repeat-x", "repeat-y"].map((o) => `<option value="${o}" ${String(o) === String(x.repeat || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>`;
      body += `<label class="lb-control"><span>${app.t("Attachment")}</span><select data-setting="${k}.attachment">${["", "scroll", "fixed"].map((o) => `<option value="${o}" ${String(o) === String(x.attachment || "") ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label>`;
    } else if (type === "gradient") {
      body += app.lbGradientFieldsHTML(k, x);
    } else if (type === "video") {
      body += `<label class="lb-control"><span>${app.t("Video URL")}</span><input data-setting="${k}.video_url" type="url" value="${app.esc(x.video_url || "")}"></label>`;
      body += `<label class="lb-control"><span>${app.t("Poster")}</span><input data-setting="${k}.video_poster" type="url" value="${app.esc(x.video_poster || "")}"></label>`;
      body += `<label class="lb-control"><span>${app.t("Start")}</span><input data-setting="${k}.video_start" type="number" min="0" value="${app.esc(x.video_start ?? 0)}"></label>`;
      body += `<label class="lb-control"><span>${app.t("End")}</span><input data-setting="${k}.video_end" type="number" min="0" value="${app.esc(x.video_end ?? 0)}"></label>`;
      body += `<label class="lb-control lb-switch"><input data-setting="${k}.video_loop" type="checkbox" ${x.video_loop !== false ? "checked" : ""}><span>${app.t("Loop")}</span></label>`;
      body += `<label class="lb-control lb-switch"><input data-setting="${k}.video_mobile" type="checkbox" ${x.video_mobile ? "checked" : ""}><span>${app.t("Play on mobile")}</span></label>`;
    } else {
      const ids = String(x.slideshow_ids || "")
        .split(/[,\s]+/)
        .filter(Boolean);
      body += `<div class="lb-control lb32-gallery"><span>${app.t("Slides")}</span><div class="lb32-thumbs lb-bg-slides-open" role="button">${ids.map((id2) => `<img class="lb32-thumb" src="${app.esc((x.slideshow_urls && (x.slideshow_urls[id2] || x.slideshow_urls[String(id2)])) || app.LB_ATT_PLACEHOLDER)}" alt="">`).join("") || '<span class="lb32-thumbs-empty">' + app.t("Choose images") + "</span>"}</div><input data-setting="${k}.slideshow_ids" type="hidden" value="${app.esc(x.slideshow_ids || "")}"><button type="button" class="lb-btn lb-bg-slides-open" data-slides-key="${k}">${app.t("Choose images")}</button></div>`;
      body += app.lbSlider(k + ".slideshow_duration", app.t("Duration"), x.slideshow_duration ?? 5, {
        unitless: true,
        min: 1,
        max: 30,
        step: 1,
      });
      body += `<label class="lb-control"><span>${app.t("Transition")}</span><select data-setting="${k}.slideshow_transition"><option value="fade" ${x.slideshow_transition !== "slide" ? "selected" : ""}>${app.t("Fade")}</option><option value="slide" ${x.slideshow_transition === "slide" ? "selected" : ""}>${app.t("Slide")}</option></select></label>`;
    }
    body += `<label class="lb-control"><span>${app.t("Overlay Color")}</span><input data-setting="${k}.overlay_color" type="color" value="${app.esc(x.overlay_color || "#000000")}"></label>`;
    body += app.lbSlider(k + ".overlay_opacity", app.t("Overlay Opacity"), x.overlay_opacity ?? 0.5, {
      unitless: true,
      min: 0,
      max: 1,
      step: 0.05,
    });
    return `<div class="lb-control lb-group lb-background"><span>${app.esc(l)}</span><div class="lb-bg-types">${tabs}</div><div class="lb-group-body">${body}</div></div>`;
  };
  app.lbFilterHTML = function lbFilterHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    return `<div class="lb-control lb-group lb-filters"><span>${app.esc(l)}</span><div class="lb-group-body">
			${app.lbSlider(k + ".blur", app.t("Blur"), x.blur || "", { units: ["px"], min: 0, max: 40, step: 0.5 })}
			${app.lbSlider(k + ".brightness", app.t("Brightness"), x.brightness || "", { unitless: true, min: 0, max: 2, step: 0.05 })}
			${app.lbSlider(k + ".contrast", app.t("Contrast"), x.contrast || "", { unitless: true, min: 0, max: 2, step: 0.05 })}
			${app.lbSlider(k + ".saturate", app.t("Saturate"), x.saturate || "", { unitless: true, min: 0, max: 3, step: 0.05 })}
			${app.lbSlider(k + ".hue", app.t("Hue"), x.hue || "", { units: ["deg"], min: 0, max: 360, step: 1 })}
			${app.lbSlider(k + ".grayscale", app.t("Grayscale"), x.grayscale || "", { unitless: true, min: 0, max: 1, step: 0.05 })}
			${app.lbSlider(k + ".invert", app.t("Invert"), x.invert || "", { unitless: true, min: 0, max: 1, step: 0.05 })}
			${app.lbSlider(k + ".sepia", app.t("Sepia"), x.sepia || "", { unitless: true, min: 0, max: 1, step: 0.05 })}
		</div></div>`;
  };
  app.lbTransformHTML = function lbTransformHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    return `<div class="lb-control lb-group lb-transform"><span>${app.esc(l)}</span><div class="lb-group-body">
			${app.lbSlider(k + ".translate_x", app.t("Translate X"), x.translate_x || "", { units: ["px", "%", "em", "vw"], min: -200, max: 200 })}
			${app.lbSlider(k + ".translate_y", app.t("Translate Y"), x.translate_y || "", { units: ["px", "%", "em", "vh"], min: -200, max: 200 })}
			${app.lbSlider(k + ".rotate", app.t("Rotate"), x.rotate || "", { units: ["deg"], min: -180, max: 180 })}
			${app.lbSlider(k + ".scale_x", app.t("Scale X"), x.scale_x || "", { unitless: true, min: 0, max: 3, step: 0.05 })}
			${app.lbSlider(k + ".scale_y", app.t("Scale Y"), x.scale_y || "", { unitless: true, min: 0, max: 3, step: 0.05 })}
			${app.lbSlider(k + ".skew_x", app.t("Skew X"), x.skew_x || "", { units: ["deg"], min: -45, max: 45 })}
			${app.lbSlider(k + ".skew_y", app.t("Skew Y"), x.skew_y || "", { units: ["deg"], min: -45, max: 45 })}
			<label class="lb-control"><span>${app.t("Origin")}</span><input data-setting="${k}.origin" value="${app.esc(x.origin || "")}" placeholder="center center"></label>
		</div></div>`;
  };
  app.lbTransitionHTML = function lbTransitionHTML(k, v, l) {
    const x = app.lbGroupVal(v);
    return `<div class="lb-control lb-group lb-transition"><span>${app.esc(l)}</span><div class="lb-group-body">
			<label class="lb-control"><span>${app.t("Property")}</span><input data-setting="${k}.property" value="${app.esc(x.property || "all")}"></label>
			${app.lbSlider(k + ".duration", app.t("Duration"), x.duration || "0.3s", { units: ["s", "ms"], min: 0, max: 5, step: 0.05 })}
			${app.lbSlider(k + ".delay", app.t("Delay"), x.delay || "0s", { units: ["s", "ms"], min: 0, max: 5, step: 0.05 })}
			<label class="lb-control"><span>${app.t("Easing")}</span><select data-setting="${k}.easing">${["ease", "ease-in", "ease-out", "ease-in-out", "linear"].map((o) => `<option value="${o}" ${String(o) === String(x.easing || "ease") ? "selected" : ""}>${o}</option>`).join("")}</select></label>
		</div></div>`;
  };
  /** Split a stored length ("20px", "1.5em", 20) into [number, unit]. */
  app.lbSplitLength = function lbSplitLength(val) {
    const m = String(val ?? "")
      .trim()
      .match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i);
    return m ? [m[1], (m[2] || "").toLowerCase()] : ["", ""];
  };
  /** Gaps value for the canvas device: unwraps a responsive {desktop:{row,column}} map. */
  app.lbGapsValue = function lbGapsValue(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return v ?? "";
    if ("row" in v || "column" in v) return v;
    return app.resp(v);
  };
  /** CSS `gap` shorthand (row column) from a Gaps value, mirroring Groups::compile_gaps(). */
  app.lbCompileGaps = function lbCompileGaps(v) {
    if (v == null || v === "") return "";
    if (typeof v !== "object") v = { row: v, column: v, linked: true };
    const len = (x) => {
      const t = String(x ?? "").trim();
      if (t === "") return "";
      return /^-?\d*\.?\d+$/.test(t) ? t + "px" : t;
    };
    const row = len(v.row),
      col = len(v.linked ? v.row : v.column);
    if (!row && !col) return "";
    if (v.linked || row === col) return row || col;
    return (row || "0") + " " + (col || "0");
  };
  app.lbGapsHTML = function lbGapsHTML(k, v, l, def) {
    def = def || {};
    const responsive = !!def.responsive;
    const isMap =
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      ("desktop" in v || app.device in v) &&
      !("row" in v) &&
      !("column" in v);
    let x = responsive && isMap ? app.resp(v) : v;
    if (!x || typeof x !== "object") x = x !== "" && x != null ? { row: x, column: x, linked: true } : {};
    const empty = (x.row == null || x.row === "") && (x.column == null || x.column === "");
    const linked = empty && x.linked == null ? true : !!x.linked;
    const units = Array.isArray(def.units) && def.units.length ? def.units : ["px", "em", "rem", "%", "vw"];
    const [colNum, colUnit] = app.lbSplitLength(x.column);
    const [rowNum, rowUnit] = app.lbSplitLength(x.row);
    const unit = x.unit || colUnit || rowUnit || units[0];
    let phCol = "",
      phRow = "";
    if (empty && Array.isArray(def.fallback)) {
      const r = app.selected && app.locate(app.state.root, app.selected);
      const s = (r && r.node.settings) || {};
      for (const fk of def.fallback) {
        const fv = s[fk];
        if (fv == null || fv === "") continue;
        if (typeof fv === "object" && ("row" in fv || "column" in fv)) {
          phRow = app.lbSplitLength(fv.row)[0];
          phCol = app.lbSplitLength(fv.column)[0];
        } else {
          phRow = phCol = app.lbSplitLength(app.resp(fv))[0];
        }
        if (phRow !== "" || phCol !== "") break;
      }
    }
    const base = responsive ? k + "." + (app.device || "desktop") : k;
    const unitOpts = units
      .map((u) => `<option value="${app.esc(u)}"${u === unit ? " selected" : ""}>${app.esc(u)}</option>`)
      .join("");
    return `<div class="lb-control lb-gaps lb-gaps-pair${linked ? " is-linked" : ""}" data-gaps-key="${app.esc(k)}" data-gaps-base="${app.esc(base)}">
			<div class="lb-control-head"><span class="lb-choose-label"><span>${app.esc(l)}</span>${responsive ? app.lbRespDeviceHTML() : ""}</span><select class="lb-gaps-unit" data-gaps-unit="1" aria-label="${app.esc(app.t("Unit"))}">${unitOpts}</select></div>
			<div class="lb-gaps-fields">
				<label><input type="number" step="any" data-gaps-part="column" value="${app.esc(colNum)}" placeholder="${app.esc(phCol)}" aria-label="${app.esc(app.t("Column"))}"><small>${app.t("Column")}</small></label>
				<label><input type="number" step="any" data-gaps-part="row" value="${app.esc(rowNum)}" placeholder="${app.esc(phRow)}" aria-label="${app.esc(app.t("Row"))}"><small>${app.t("Row")}</small></label>
				<button type="button" class="lb-gaps-link${linked ? " is-active" : ""}" data-gaps-link="1" title="${app.esc(linked ? app.t("Unlink values") : app.t("Link values together"))}" aria-pressed="${linked ? "true" : "false"}">${SVG_ICONS[linked ? "lbi-link" : "lbi-unlink"]}</button>
			</div>
		</div>`;
  };
  app.lbCompileFilter = function lbCompileFilter(v) {
    if (!v || typeof v !== "object") return typeof v === "string" ? v : "";
    const parts = [];
    if (v.blur && parseFloat(v.blur))
      parts.push("blur(" + v.blur + (String(v.blur).match(/[a-z%]/i) ? "" : "px") + ")");
    if (v.brightness !== "" && v.brightness != null && Number(v.brightness) !== 1)
      parts.push("brightness(" + v.brightness + ")");
    if (v.contrast !== "" && v.contrast != null && Number(v.contrast) !== 1) parts.push("contrast(" + v.contrast + ")");
    if (v.saturate !== "" && v.saturate != null && Number(v.saturate) !== 1) parts.push("saturate(" + v.saturate + ")");
    if (v.hue && parseFloat(v.hue))
      parts.push("hue-rotate(" + v.hue + (String(v.hue).match(/deg/i) ? "" : "deg") + ")");
    if (v.grayscale && parseFloat(v.grayscale)) parts.push("grayscale(" + v.grayscale + ")");
    if (v.invert && parseFloat(v.invert)) parts.push("invert(" + v.invert + ")");
    if (v.sepia && parseFloat(v.sepia)) parts.push("sepia(" + v.sepia + ")");
    return parts.join(" ");
  };
  app.lbCompileTransform = function lbCompileTransform(v) {
    if (!v || typeof v !== "object") return typeof v === "string" ? v : "";
    const parts = [];
    const len = (x) => {
      const t3 = String(x == null ? "" : x).trim();
      return t3 === "" ? "0" : /^-?\d*\.?\d+$/.test(t3) ? t3 + "px" : t3;
    };
    if (v.translate_x || v.translate_y) parts.push("translate(" + len(v.translate_x) + ", " + len(v.translate_y) + ")");
    if (v.rotate && parseFloat(v.rotate))
      parts.push("rotate(" + v.rotate + (String(v.rotate).match(/deg/i) ? "" : "deg") + ")");
    if (
      (v.scale_x !== "" && v.scale_x != null && Number(v.scale_x) !== 1) ||
      (v.scale_y !== "" && v.scale_y != null && Number(v.scale_y) !== 1)
    )
      parts.push("scale(" + (v.scale_x || "1") + ", " + (v.scale_y || "1") + ")");
    if (v.skew_x && parseFloat(v.skew_x))
      parts.push("skewX(" + v.skew_x + (String(v.skew_x).match(/deg/i) ? "" : "deg") + ")");
    if (v.skew_y && parseFloat(v.skew_y))
      parts.push("skewY(" + v.skew_y + (String(v.skew_y).match(/deg/i) ? "" : "deg") + ")");
    return parts.join(" ");
  };
  app.lbCompileTransition = function lbCompileTransition(v) {
    if (!v || typeof v !== "object") return typeof v === "string" ? v : "";
    const dur = v.duration || "0s";
    if (dur === "0s" && (!v.delay || v.delay === "0s") && (v.property || "all") === "all") return "";
    return (
      (v.property || "all") +
      " " +
      dur +
      " " +
      (v.easing || "ease") +
      (v.delay && v.delay !== "0s" ? " " + v.delay : "")
    );
  };
  app.lbCompileTextShadow = function lbCompileTextShadow(v) {
    if (!v || typeof v !== "object") return typeof v === "string" ? v : "";
    if (!parseFloat(v.x) && !parseFloat(v.y) && !parseFloat(v.blur)) return "";
    return (v.x || 0) + "px " + (v.y || 0) + "px " + (v.blur || 0) + "px " + (v.color || "rgba(0,0,0,.25)");
  };
  app.lbCompileBackground = function lbCompileBackground(v, s) {
    if (typeof v === "string" && v) return { background: v };
    const x = app.lbGroupVal(v);
    const out = {};
    if ((x.type || "classic") === "gradient") {
      out["background-image"] = app.lbCompileGradientCss(x);
      if (x.color) out["background-color"] = x.color;
      return out;
    }
    if (x.color) out["background-color"] = x.color;
    const url = x.image_url || (s && s.background_image) || "";
    if (url && (x.type || "classic") === "classic") out["background-image"] = "url(" + url + ")";
    if (x.size) out["background-size"] = x.size;
    if (x.position) out["background-position"] = x.position;
    if (x.repeat) out["background-repeat"] = x.repeat;
    if (x.attachment) out["background-attachment"] = x.attachment;
    return out;
  };
  app.lbBgLayersHTML = function lbBgLayersHTML(s) {
    const x = app.lbGroupVal(s.background);
    const type = x.type || "";
    let html = "";
    const video = x.video_url || s.background_video || "";
    if ((type === "video" || (!type && video)) && video) {
      const poster = x.video_poster || s.background_video_poster || "";
      html += `<div class="lb-container-video${x.video_mobile || s.background_video_mobile ? "" : " lb-hide-mobile-video"}" aria-hidden="true"><video class="lb-container-video-media" muted playsinline preload="metadata"${poster ? ` poster="${app.esc(poster)}"` : ""}><source src="${app.esc(video)}"></video></div>`;
    }
    if (type === "slideshow" && x.slideshow_ids) {
      const ids = String(x.slideshow_ids)
        .split(/[,\s]+/)
        .filter(Boolean);
      const urls = x.slideshow_urls || {};
      html += `<div class="lb-bg-slideshow lb-bg-slideshow-${app.esc(x.slideshow_transition || "fade")}" aria-hidden="true">`;
      ids.forEach((id, i) => {
        const u = urls[id] || urls[String(id)] || "";
        if (u) html += `<img src="${app.esc(u)}" alt="" class="${i === 0 ? "is-active" : ""}">`;
      });
      html += "</div>";
    }
    const overlay = x.overlay_color || s.overlay_color || s.background_overlay || "";
    if (overlay) {
      const op = x.overlay_color ? (x.overlay_opacity ?? 0.5) : (s.overlay_opacity ?? 0.5);
      const blend = x.overlay_blend || s.overlay_blend_mode || "";
      html += `<div class="lb-container-overlay" aria-hidden="true" style="background:${app.esc(overlay)};opacity:${op};${blend ? "mix-blend-mode:" + app.esc(blend) + ";" : ""}"></div>`;
    }
    return html;
  };
  app.bindGradientControls = function bindGradientControls() {
    app.root.querySelectorAll(".lb-gradient[data-grad-key]").forEach((box) => {
      if (box.__lbGrad) return;
      box.__lbGrad = true;
      const key = box.dataset.gradKey;
      const r0 = app.selected && app.locate(app.state.root, app.selected);
      if (r0 && typeof app.getPath(r0.node.settings, key) === "string") {
        app.setPath(r0.node.settings, key, app.lbNormGradient(app.getPath(r0.node.settings, key)));
      }
      const bar = box.querySelector(".lb-grad-bar");
      const posOf = (clientX) => {
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        const w = rect.width || 1;
        return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / w) * 100)));
      };
      const applyPos = (which, pos) => {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        app.setPath(r.node.settings, key + ".gradient_" + which + "_pos", pos);
        app.setPath(r.node.settings, key + ".custom", "");
        const row = box.querySelector('[data-slider-key="' + key + ".gradient_" + which + '_pos"]');
        const range = row && row.querySelector(".lb-slider-range");
        const num2 = row && row.querySelector(".lb-slider-num");
        if (range) range.value = pos;
        if (num2) num2.value = pos;
        app.dirty = true;
        if (app.scheduleSave) app.scheduleSave();
        if (typeof app.previewSetting === "function")
          app.previewSetting(key + ".gradient_" + which + "_pos", r.node.id);
        else {
          const node =
            app.frameDoc && app.frameDoc()?.querySelector('.lb-node[data-id="' + CSS.escape(String(r.node.id)) + '"]');
          app.lbApplyGradientLive(node, key + ".gradient_" + which + "_pos");
        }
      };
      box.querySelectorAll(".lb-grad-stop").forEach((stop) => {
        stop.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const which = stop.dataset.gradStop;
          box.dataset.gradActive = which;
          box.querySelectorAll(".lb-grad-stop").forEach((s) => s.classList.toggle("is-active", s === stop));
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (r) app.commit();
          const move = (ev) => applyPos(which, posOf(ev.clientX));
          const up = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
          };
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
        });
      });
      if (bar) {
        bar.addEventListener("pointerdown", (e) => {
          if (e.target.closest(".lb-grad-stop")) return;
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r) return;
          const pos = posOf(e.clientX);
          const cur = app.lbNormGradient(app.getPath(r.node.settings, key));
          const which = Math.abs(pos - cur.gradient_a_pos) <= Math.abs(pos - cur.gradient_b_pos) ? "a" : "b";
          box.dataset.gradActive = which;
          box
            .querySelectorAll(".lb-grad-stop")
            .forEach((s) => s.classList.toggle("is-active", s.dataset.gradStop === which));
          app.commit();
          applyPos(which, pos);
        });
      }
      box.querySelectorAll('input[type="color"][data-setting]').forEach((input) => {
        if (input.__lbGradColor) return;
        input.__lbGradColor = true;
        input.addEventListener("input", () => {
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r) return;
          app.setPath(r.node.settings, input.dataset.setting, input.value);
          app.setPath(r.node.settings, key + ".custom", "");
          app.dirty = true;
          if (app.scheduleSave) app.scheduleSave();
          if (typeof app.previewSetting === "function") app.previewSetting(input.dataset.setting, r.node.id);
          else {
            const node =
              app.frameDoc &&
              app.frameDoc()?.querySelector('.lb-node[data-id="' + CSS.escape(String(r.node.id)) + '"]');
            app.lbApplyGradientLive(node, input.dataset.setting);
          }
        });
      });
    });
  };
  app.bindGroupControls = function bindGroupControls() {
    app.root.querySelectorAll("[data-choose-key]").forEach((b) => {
      if (b.__lbChoose) return;
      b.__lbChoose = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const active = b.classList.contains("is-active");
        const value = active && b.dataset.chooseToggle ? "" : b.dataset.chooseValue;
        const row = b.parentElement;
        if (row)
          row.querySelectorAll(".lb-choose-btn").forEach((x) => {
            const on = x === b && value !== "";
            x.classList.toggle("is-active", on);
            x.setAttribute("aria-pressed", on ? "true" : "false");
          });
        app.update(b.dataset.chooseKey, value);
        const key = String(b.dataset.chooseKey || "").split(".")[0];
        app.root.querySelectorAll('.lb-choose[data-axis-key="' + key + '"]').forEach((ctl) => {
          const dir = String(value || ctl.dataset.axisDefault || "row");
          ctl.classList.remove("lb-axis-t", "lb-axis-rot", "lb-axis-flipy");
          const cls = app.lbAxisClass(ctl.dataset.axis, dir);
          if (cls) ctl.classList.add(cls);
        });
      });
    });
    app.root.querySelectorAll("[data-lb-resp-cycle]").forEach((b) => {
      if (b.__lbRespCycle) return;
      b.__lbRespCycle = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        let list =
          typeof app.enabledBreakpoints === "function"
            ? app.enabledBreakpoints().map((x) => x.name)
            : ["desktop", "tablet", "mobile"];
        if (list.indexOf("mobile") !== -1 && list.indexOf("desktop") > list.indexOf("mobile"))
          list = list.slice().reverse();
        if (!list.length) return;
        const next = list[(list.indexOf(app.device) + 1) % list.length];
        const btn = document.querySelector('.lb-device [data-device="' + next + '"]');
        if (btn) btn.click();
        else {
          app.device = next;
          if (typeof app.applyCanvasWidth === "function") app.applyCanvasWidth();
          if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
        }
      });
    });
    app.root.querySelectorAll(".lb-gaps-pair[data-gaps-base]").forEach((box) => {
      if (box.__lbGaps) return;
      box.__lbGaps = true;
      const base = box.dataset.gapsBase;
      const inputs = () => ({
        column: box.querySelector('[data-gaps-part="column"]'),
        row: box.querySelector('[data-gaps-part="row"]'),
      });
      const unitSel = box.querySelector("[data-gaps-unit]");
      let started = false;
      const node = () => app.selected && app.locate(app.state.root, app.selected);
      const write = (patch, repaint) => {
        if (app.previewingRevision) return;
        const r = node();
        if (!r) return;
        if (!started) {
          app.commit(app.t("Edited %s", app.meta(r.node.type).title || r.node.type), r.node.id);
          started = true;
        }
        const cur = app.getPath(r.node.settings, base);
        const next = Object.assign({}, cur && typeof cur === "object" ? cur : {}, patch);
        app.setPath(r.node.settings, base, next);
        app.dirty = true;
        if (app.scheduleSave) app.scheduleSave();
        if (typeof app.previewSetting === "function") app.previewSetting(box.dataset.gapsKey, r.node.id);
        else app.render();
        if (repaint && typeof app.refreshRightPanel === "function") app.refreshRightPanel();
      };
      const len = (num) => (num === "" || num == null ? "" : String(num) + (unitSel ? unitSel.value : "px"));
      const linked = () => box.classList.contains("is-linked");
      ["column", "row"].forEach((part) => {
        const el = inputs()[part];
        if (!el) return;
        el.addEventListener("input", () => {
          const patch = { [part]: len(el.value), unit: unitSel ? unitSel.value : "px", linked: linked() };
          if (linked()) {
            const other = inputs()[part === "row" ? "column" : "row"];
            if (other) other.value = el.value;
            patch.row = patch.column = patch[part];
          }
          write(patch, false);
        });
        el.addEventListener("change", () => {
          started = false;
        });
      });
      if (unitSel)
        unitSel.addEventListener("change", () => {
          const f = inputs();
          write(
            {
              column: len(f.column ? f.column.value : ""),
              row: len(f.row ? f.row.value : ""),
              unit: unitSel.value,
              linked: linked(),
            },
            false,
          );
          started = false;
        });
      const linkBtn = box.querySelector("[data-gaps-link]");
      if (linkBtn)
        linkBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const f = inputs();
          const on = !linked();
          const patch = { linked: on, unit: unitSel ? unitSel.value : "px" };
          if (on) {
            const val = f.column && f.column.value !== "" ? f.column.value : f.row ? f.row.value : "";
            patch.column = patch.row = len(val);
          }
          write(patch, true);
          started = false;
        });
    });
    app.root.querySelectorAll("[data-link-key]").forEach((b) => {
      if (b.__lbLink) return;
      b.__lbLink = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        const key = b.dataset.linkKey;
        const cur = app.getPath(r.node.settings, key) || {};
        const next = Object.assign({}, typeof cur === "object" ? cur : {}, { linked: !cur.linked });
        if (next.linked) {
          if (next.top != null) next.right = next.bottom = next.left = next.top;
          if (next.row != null) next.column = next.row;
        }
        app.commit();
        app.setPath(r.node.settings, key, next);
        app.render();
      });
    });
    app.root.querySelectorAll("[data-setting-set]").forEach((b) => {
      if (b.__lbSet) return;
      b.__lbSet = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const path = b.dataset.settingSet;
        const value = b.dataset.setValue;
        if (value === "gradient" && path && path.endsWith(".type")) {
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (r) {
            const key = path.slice(0, -5);
            const cur = app.getPath(r.node.settings, key) || {};
            app.commit();
            app.setPath(r.node.settings, key, app.lbSeedGradient(cur));
            app.render();
            return;
          }
        }
        app.update(path, value);
      });
    });
    app.bindGradientControls();
    app.root.querySelectorAll(".lb-bg-slides-open").forEach((b) => {
      if (b.__lbSlides) return;
      b.__lbSlides = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        if (!window.wp?.media || !app.selected) return;
        const key = b.dataset.slidesKey || "background";
        const r = app.locate(app.state.root, app.selected);
        if (!r) return;
        const f = wp.media({
          title: app.t("Choose images"),
          button: { text: app.t("Use Images") },
          multiple: true,
          library: { type: "image" },
        });
        f.on("select", () => {
          const items = app.mediaSelectionItems(f);
          const ids = items.map((x) => x.id).filter(Boolean);
          const urls = {};
          items.forEach((x) => {
            if (!x || !x.id) return;
            urls[x.id] =
              (x.sizes && ((x.sizes.large && x.sizes.large.url) || (x.sizes.medium && x.sizes.medium.url))) ||
              x.url ||
              "";
          });
          app.commit();
          app.setPath(r.node.settings, key + ".slideshow_ids", ids.join(","));
          app.setPath(r.node.settings, key + ".slideshow_urls", urls);
          app.setPath(r.node.settings, key + ".type", "slideshow");
          app.render();
        });
        f.open();
      });
    });
    app.root.querySelectorAll('.lb-dimensions.is-linked input[data-setting$=".top"]').forEach((input) => {
      if (input.__lbSync) return;
      input.__lbSync = true;
      input.addEventListener("input", () => {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        const key = input.dataset.setting.replace(/\.top$/, "");
        const box = app.getPath(r.node.settings, key) || {};
        if (!box.linked) return;
        ["right", "bottom", "left"].forEach((side) => app.setPath(r.node.settings, key + "." + side, input.value));
        if (typeof app.previewSetting === "function") app.previewSetting(key, r.node.id);
      });
    });
  };
  const oldControl = app.control;
  app.control = function controlGroups(k, t3, v, label) {
    const def = app.lbCtrlDef(t3);
    const type = def.type || "text";
    const l = label || def.label || k.replace(/_/g, " ");
    if (type === "choose") return app.lbChooseHTML(k, def, v, l);
    if (type === "gradient") return app.lbGradientHTML(k, v, l);
    if (type === "typography") return app.lbTypographyHTML(k, v, l);
    if (type === "border") return app.lbBorderHTML(k, v, l);
    if (type === "background") return app.lbBackgroundHTML(k, v, l);
    if (type === "text_shadow") return app.shadowControl(k, v, l, { text: true });
    if (type === "css_filter") return app.lbFilterHTML(k, v, l);
    if (type === "transform") return app.lbTransformHTML(k, v, l);
    if (type === "transition") return app.lbTransitionHTML(k, v, l);
    if (type === "gaps") return app.lbGapsHTML(k, v, l, def);
    if (type === "box_shadow") return app.shadowControl(k, v, l);
    return oldControl(k, t3, v, label);
  };
  const oldBind = app.bindRightPanel;
  app.bindRightPanel = function bindRightPanelGroups() {
    oldBind();
    app.bindGroupControls();
  };
}

export { installGroups };
