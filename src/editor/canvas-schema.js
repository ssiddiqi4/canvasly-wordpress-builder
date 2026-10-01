import { app } from "./app.js";
function installCanvasSchema() {
  const SKIP_SIZE = /* @__PURE__ */ new Set([
    "image",
    "video",
    "gallery",
    "carousel",
    "audio",
    "image_box",
    "soundcloud",
    "embed",
    "tinymce_text_editor",
  ]);
  const SIZE_KEYS = /* @__PURE__ */ new Set(["width", "max_width", "height", "min_height"]);
  function cssSafe(value) {
    let s = String(value == null ? "" : value);
    if (typeof app.lbResolveToken === "function") s = String(app.lbResolveToken(s));
    return s
      .replace(/<\/style/gi, "")
      .replace(/[{}<>]/g, "")
      .replace(/[\r\n]/g, " ");
  }
  function breakpoint(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("desktop" in value || "tablet" in value || "mobile" in value) &&
      !("top" in value) &&
      !("left" in value) &&
      !("x" in value)
    );
  }
  function current(def, value) {
    if ((def && def.responsive) || breakpoint(value)) return app.resp(value);
    return value;
  }
  function conditionMet(cond, settings) {
    if (!cond || typeof cond !== "object") return true;
    return Object.keys(cond).every(function (raw) {
      const neg = raw.slice(-1) === "!";
      const key = neg ? raw.slice(0, -1) : raw;
      let have = settings[key];
      if (have && typeof have === "object") have = have.desktop != null ? have.desktop : have[app.device];
      if (typeof have === "boolean") have = have ? "1" : "";
      have = String(have == null ? "" : have);
      const wants = Array.isArray(cond[raw]) ? cond[raw] : [cond[raw]];
      const hit = wants.some(function (want) {
        if (typeof want === "boolean") want = want ? "1" : "";
        return String(want) === have;
      });
      return neg ? !hit : hit;
    });
  }
  function lengthOf(value) {
    const raw = String(app.resp(value) == null ? "" : app.resp(value)).trim();
    if (!raw || raw === "0") return raw === "0" ? "0" : "";
    return /^-?\d+(\.\d+)?$/.test(raw) ? raw + "px" : raw;
  }
  function boxOf(value) {
    if (value == null || value === "") return "";
    if (Array.isArray(value) && !value.length) return "";
    if (typeof value === "object") {
      const sides = ["top", "right", "bottom", "left"].map(function (k) {
        return value[k];
      });
      if (
        sides.every(function (side) {
          return side == null || side === "" || side === 0 || side === "0";
        })
      )
        return "";
    }
    return typeof app.formatBox === "function" ? app.formatBox(value) : "";
  }
  function lengthToken(raw) {
    const str = String(raw == null ? "" : raw).trim();
    if (!str || str === "0") return str === "0" ? "0" : "";
    if (str === "auto") return "auto";
    return /^-?\d+(\.\d+)?$/.test(str) ? str + "px" : str;
  }
  function quoteFamily(family) {
    family = String(family || "").trim();
    if (!family) return "";
    if (family.charAt(0) === '"' || family.charAt(0) === "'" || family.indexOf(",") !== -1) return family;
    if (/\s/.test(family)) return '"' + family.replace(/"/g, "") + '"';
    return family;
  }
  function typographyCss(raw) {
    if (!raw || typeof raw !== "object") return typeof raw === "string" ? raw : "";
    const size = function (value) {
      return lengthToken(app.resp(value));
    };
    const rows = [
      ["font-family", quoteFamily(raw.font_family)],
      ["font-size", size(raw.font_size)],
      ["font-weight", raw.font_weight || ""],
      ["font-style", raw.font_style || ""],
      ["text-transform", raw.text_transform || ""],
      ["text-decoration", raw.text_decoration || ""],
      ["line-height", raw.line_height != null && raw.line_height !== "" ? size(raw.line_height) : ""],
      ["letter-spacing", raw.letter_spacing != null && raw.letter_spacing !== "" ? size(raw.letter_spacing) : ""],
    ];
    return rows
      .filter(function (row) {
        return row[1];
      })
      .map(function (row) {
        return row[0] + ":" + row[1];
      })
      .join(";");
  }
  function borderCss(raw) {
    if (!raw || typeof raw !== "object") return typeof raw === "string" ? raw : "";
    const rows = [];
    if (raw.style) rows.push("border-style:" + raw.style);
    const width = boxOf(raw.width);
    if (width) rows.push("border-width:" + width);
    if (raw.color) rows.push("border-color:" + raw.color);
    const radius = boxOf(raw.radius);
    if (radius) rows.push("border-radius:" + radius);
    return rows.join(";");
  }
  function shadowOf(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value !== "object") return "";
    const x = Number(value.x) || 0;
    const y = Number(value.y) || 0;
    const blur = Number(value.blur) || 0;
    const spread = Number(value.spread) || 0;
    if (!x && !y && !blur && !spread) return "";
    return (
      (value.inset ? "inset " : "") +
      x +
      "px " +
      y +
      "px " +
      blur +
      "px " +
      spread +
      "px " +
      (value.color || "rgba(0,0,0,.15)")
    );
  }
  function tokens(def, raw) {
    const type = def && def.type ? def.type : "text";
    if (type === "dimensions" || type === "spacing") {
      return { VALUE: boxOf(raw), RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "box_shadow") {
      return { VALUE: shadowOf(raw), RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "text_shadow" && typeof app.lbCompileTextShadow === "function") {
      return { VALUE: app.lbCompileTextShadow(raw) || "", RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "background" && typeof app.lbCompileBackground === "function") {
      const compiled = app.lbCompileBackground(raw) || {};
      const joined = Object.keys(compiled)
        .map(function (prop) {
          return prop + ":" + compiled[prop];
        })
        .join(";");
      return { VALUE: joined, RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "typography") {
      return { VALUE: typographyCss(raw), RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "border") {
      return { VALUE: borderCss(raw), RAW: "", SIZE: "", UNIT: "" };
    }
    if (type === "gaps") {
      return {
        VALUE: typeof app.lbCompileGaps === "function" ? app.lbCompileGaps(raw) : "",
        RAW: "",
        SIZE: "",
        UNIT: "",
      };
    }
    let str = raw;
    if (str && typeof str === "object" && !Array.isArray(str)) str = str.desktop != null ? str.desktop : "";
    if (typeof str === "boolean") str = str ? "1" : "";
    str = String(str == null ? "" : str).trim();
    let size = "";
    let unit = "";
    const match = str.match(/^(-?\d*\.?\d+)\s*([a-z%]*)\s*$/i);
    if (match) {
      size = match[1];
      unit = (match[2] || "").toLowerCase();
      if (!unit && def && Array.isArray(def.units) && def.units.length && def.units[0] !== "")
        unit = String(def.units[0]);
    }
    let css = str;
    if (size && unit && !/[a-z%]/i.test(str)) css = size + unit;
    if (def && def.map && Object.prototype.hasOwnProperty.call(def.map, str)) css = String(def.map[str]);
    return { VALUE: css, RAW: str, SIZE: size, UNIT: unit };
  }
  // The canvas renders many units with inline style="color:..;background:.." on the inner
  // element (button link, heading tag, text box). Inline styles beat any :hover rule in a
  // stylesheet, so Hover colors never showed in the editor. Mark hover/focus declarations
  // !important here (canvas only; the front end has no inline colors to fight).
  function hoverImportant(rule) {
    return (
      rule
        .split(";")
        .map(function (d) {
          const t = d.trim();
          if (!t || t.indexOf(":") < 1 || /^--/.test(t) || /!important\s*$/i.test(t)) return t;
          return t + " !important";
        })
        .filter(Boolean)
        .join(";") + ";"
    );
  }
  function rules(def, raw, wrapper) {
    const tok = tokens(def, current(def, raw));
    if (!tok.VALUE && !tok.SIZE && !tok.RAW) return "";
    let out = "";
    Object.keys(def.selectors || {}).forEach(function (selector) {
      const decl = def.selectors[selector];
      if (typeof selector !== "string" || typeof decl !== "string" || !decl) return;
      const sel2 = selector.replace(/\{\{WRAPPER\}\}/g, wrapper);
      let value = tok.VALUE;
      if (
        decl.indexOf("font-family:") !== -1 &&
        /\s/.test(value) &&
        value.indexOf(",") === -1 &&
        value.charAt(0) !== '"'
      )
        value = '"' + value.replace(/"/g, "") + '"';
      let rule = decl
        .replace(/\{\{VALUE\}\}/g, cssSafe(value))
        .replace(/\{\{RAW\}\}/g, cssSafe(tok.RAW))
        .replace(/\{\{SIZE\}\}/g, cssSafe(tok.SIZE))
        .replace(/\{\{UNIT\}\}/g, cssSafe(tok.UNIT))
        .trim();
      if (!rule) return;
      if (rule.slice(-1) !== ";") rule += ";";
      if (/:(hover|focus|focus-visible|focus-within)\b/.test(sel2)) rule = hoverImportant(rule);
      out += sel2 + "{" + rule + "}";
    });
    return out;
  }
  function declarations(node, selectorKeys) {
    const s = node.settings || {};
    const parts = [];
    function put(prop, value) {
      if (value == null || value === "") return;
      parts.push(prop + ":" + cssSafe(value) + ";");
    }
    if (!selectorKeys.has("color") && s.color) put("color", app.resp(s.color));
    if (!selectorKeys.has("font_family") && s.font_family) put("font-family", app.resp(s.font_family));
    if (!selectorKeys.has("font_size") && s.font_size != null && s.font_size !== "")
      put("font-size", lengthOf(s.font_size));
    if (!selectorKeys.has("font_weight") && s.font_weight) put("font-weight", app.resp(s.font_weight));
    if (!selectorKeys.has("font_style") && s.font_style) put("font-style", s.font_style);
    if (!selectorKeys.has("text_transform") && s.text_transform) put("text-transform", s.text_transform);
    if (!selectorKeys.has("text_decoration") && s.text_decoration) put("text-decoration", s.text_decoration);
    if (!selectorKeys.has("line_height") && s.line_height != null && s.line_height !== "")
      put("line-height", String(app.resp(s.line_height)));
    if (!selectorKeys.has("letter_spacing") && s.letter_spacing != null && s.letter_spacing !== "")
      put("letter-spacing", lengthOf(s.letter_spacing));
    if (!selectorKeys.has("margin")) put("margin", boxOf(s.margin));
    if (!selectorKeys.has("padding")) put("padding", boxOf(s.padding));
    if (!selectorKeys.has("border_width") && s.border_style) put("border-width", boxOf(s.border_width));
    if (!selectorKeys.has("border_style") && s.border_style) put("border-style", s.border_style);
    if (!selectorKeys.has("border_color") && s.border_color) put("border-color", s.border_color);
    else if (
      !selectorKeys.has("border_color") &&
      node.type !== "button" &&
      ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"].indexOf(s.border_style) !== -1
    )
      put("border-color", "#ffffff");
    if (!selectorKeys.has("border_radius")) put("border-radius", boxOf(s.border_radius));
    if (!selectorKeys.has("opacity") && s.opacity != null && s.opacity !== "")
      put("opacity", String(app.resp(s.opacity)));
    if (!selectorKeys.has("filter") && s.filter)
      put(
        "filter",
        typeof app.lbCompileFilter === "function"
          ? app.lbCompileFilter(s.filter)
          : typeof s.filter === "string"
            ? s.filter
            : "",
      );
    if (!selectorKeys.has("transform") && s.transform) {
      const tv =
        typeof app.lbCompileTransform === "function"
          ? app.lbCompileTransform(s.transform)
          : typeof s.transform === "string"
            ? s.transform
            : "";
      put("transform", tv);
      if (tv && typeof s.transform === "object" && s.transform.origin) put("transform-origin", s.transform.origin);
    }
    if (!selectorKeys.has("transition") && s.transition)
      put(
        "transition",
        typeof app.lbCompileTransition === "function"
          ? app.lbCompileTransition(s.transition)
          : typeof s.transition === "string"
            ? s.transition
            : "",
      );
    if (!selectorKeys.has("mix_blend_mode") && s.mix_blend_mode) put("mix-blend-mode", s.mix_blend_mode);
    if (!selectorKeys.has("shadow")) put("box-shadow", shadowOf(s.shadow || s.box_shadow));
    if (!selectorKeys.has("background") && s.background && typeof app.lbCompileBackground === "function") {
      const compiled = app.lbCompileBackground(s.background, s) || {};
      Object.keys(compiled).forEach(function (prop) {
        put(prop, compiled[prop]);
      });
    } else if (!selectorKeys.has("background") && typeof s.background === "string") {
      put("background", s.background);
    }
    if (!parts.length) return "";
    return "#lb-node-" + String(node.id).replace(/[^a-zA-Z0-9_-]/g, "") + "{" + parts.join("") + "}";
  }
  function customCss(node) {
    const css = String((node.settings || {}).custom_css || "")
      .replace(/<\/style/gi, "")
      .trim();
    if (!css) return "";
    const sel2 = "#lb-node-" + String(node.id).replace(/[^a-zA-Z0-9_-]/g, "");
    return css.replace(/\bselector\b/g, sel2);
  }
  function nodeCss(node) {
    if (!node || !node.id) return "";
    const controls = (app.meta(node.type) || {}).controls || {};
    const settings = node.settings || {};
    const wrapper = "#lb-node-" + String(node.id).replace(/[^a-zA-Z0-9_-]/g, "");
    const selectorKeys = /* @__PURE__ */ new Set();
    let css = "";
    Object.keys(controls).forEach(function (key) {
      const def = controls[key];
      if (!def || typeof def !== "object" || !def.selectors) return;
      if (SKIP_SIZE.has(node.type) && SIZE_KEYS.has(key)) return;
      selectorKeys.add(key);
      if (!conditionMet(def.condition, settings) || !Object.prototype.hasOwnProperty.call(settings, key)) return;
      css += rules(def, settings[key], wrapper);
    });
    css += declarations(node, selectorKeys);
    css += customCss(node);
    return css;
  }
  function walk(nodes, out) {
    (nodes || []).forEach(function (node) {
      out.push(nodeCss(node));
      walk(node.children, out);
    });
  }
  app.lbSchemaCanvasCss = function lbSchemaCanvasCss() {
    const state = app.state || {};
    const out = [];
    walk(state.header, out);
    walk(state.root, out);
    walk(state.footer, out);
    return out.join("");
  };
  app.lbSyncSchemaCss = function lbSyncSchemaCss() {
    const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
    if (!fd || !fd.head) return;
    let style = fd.getElementById("lb-schema-css");
    if (!style) {
      style = fd.createElement("style");
      style.id = "lb-schema-css";
      fd.head.appendChild(style);
    }
    const css = app.lbSchemaCanvasCss();
    if (style.textContent !== css) style.textContent = css;
  };
  const EFFECT_PROPS = /^(opacity|transform|transform-origin|filter|mix-blend-mode|transition)$/i;
  const prevStyleInline = app.styleInline;
  if (typeof prevStyleInline === "function" && !prevStyleInline.__lbEffectsOnWrapper) {
    app.styleInline = function styleInlineEffectsOnWrapper(n) {
      const css = prevStyleInline.apply(this, arguments);
      if (!css) return css;
      return String(css)
        .split(";")
        .filter(function (d) {
          return !EFFECT_PROPS.test(d.split(":")[0].trim());
        })
        .join(";");
    };
    app.styleInline.__lbEffectsOnWrapper = true;
  }
  const prevPaint = app.lbPaintCanvas;
  if (typeof prevPaint === "function") {
    app.lbPaintCanvas = function lbPaintCanvasWithSchema() {
      const ok = prevPaint.apply(this, arguments);
      if (ok) app.lbSyncSchemaCss();
      return ok;
    };
  }
  const prevPatch = app.patchCanvasNode;
  if (typeof prevPatch === "function") {
    app.patchCanvasNode = function patchCanvasNodeWithSchema(id) {
      const ok = prevPatch.apply(this, arguments);
      if (ok) app.lbSyncSchemaCss();
      return ok;
    };
  }
  const prevRender = app.render;
  if (typeof prevRender === "function") {
    app.render = function renderWithSchema() {
      const out = prevRender.apply(this, arguments);
      app.lbSyncSchemaCss();
      return out;
    };
  }
}

export { installCanvasSchema };
