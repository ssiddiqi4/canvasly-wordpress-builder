import { app } from "./app.js";
var CLIPBOARD_STORAGE = "sidcraft-page-builder.clipboard";
var CLIPBOARD_SCHEMA = "2.6";
var BP_NAMES = ["mobile", "mobile_extra", "tablet", "tablet_extra", "laptop", "desktop", "widescreen"];
var REPEATER_MAP = {
  accordion: { key: "items", cols: ["title", "content"] },
  toggle: { key: "items", cols: ["title", "content"] },
  tabs: { key: "tabs", cols: ["title", "content"] },
  icon_list: { key: "items", cols: ["text", "icon", "url"] },
  social: { key: "links", cols: ["network", "url", "icon"] },
  price_table: { key: "features", cols: ["text", "icon"] },
  form: { key: "fields", cols: ["label", "type", "required", "placeholder"] },
};
function versionCompare(a, b) {
  const pa = String(a || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}
function emptyClipboard(schema) {
  return { schema: schema || CLIPBOARD_SCHEMA, updated: 0, unit: null, style: null, page: null };
}
function readStorage() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CLIPBOARD_STORAGE) : null;
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : null;
  } catch (e) {
    return null;
  }
}
function writeStorage(payload) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CLIPBOARD_STORAGE, JSON.stringify(payload));
    return true;
  } catch (e) {
    return false;
  }
}
function isBpMap(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return BP_NAMES.some((name) => Object.prototype.hasOwnProperty.call(v, name));
}
function migrateBreakpointMap(v) {
  if (!isBpMap(v)) return v;
  const out = {};
  BP_NAMES.forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(v, name)) out[name] = v[name];
  });
  return out;
}
function pipeItems(text, cols) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const parts = line.split("|").map((x) => x.trim());
      const item = { _id: "r_" + Math.random().toString(36).slice(2, 10) };
      cols.forEach((k, i) => {
        let x = parts[i] ?? "";
        if (k === "required") x = x === "1" || x === "true" || x === "required" || x === "yes";
        item[k] = x;
      });
      return item;
    });
}
function migrateRepeaters(node) {
  if (!node || typeof node !== "object") return node;
  const s = node.settings && typeof node.settings === "object" ? node.settings : (node.settings = {});
  const spec = REPEATER_MAP[node.type];
  if (spec && typeof s[spec.key] === "string") s[spec.key] = pipeItems(s[spec.key], spec.cols);
  if ((node.type === "accordion" || node.type === "toggle") && !Array.isArray(s.items) && (s.title || s.text)) {
    s.items = [
      {
        _id: "r_" + Math.random().toString(36).slice(2, 10),
        title: String(s.title || "Item"),
        content: String(s.text || ""),
      },
    ];
    delete s.title;
    delete s.text;
    delete s.open;
  }
  if (node.type === "testimonial" && !Array.isArray(s.items) && (s.quote || s.author || s.image_id)) {
    s.items = [
      {
        _id: "r_" + Math.random().toString(36).slice(2, 10),
        quote: s.quote || "",
        author: s.author || "",
        role: s.role || "",
        image_id: s.image_id || 0,
        image_url: s.image_url || "",
        link: s.link || "",
        link_target: s.link_target || "_self",
      },
    ];
  }
  if (node.type === "carousel" && typeof s.link === "string" && /^https?:\/\/(none|file|custom)\/?$/i.test(s.link))
    s.link = s.link.replace(/^https?:\/\/|\/$/gi, "").toLowerCase();
  if (node.type === "carousel" && !Array.isArray(s.slides)) {
    const ids = String(s.ids || "")
      .split(/[,\s]+/)
      .filter(Boolean);
    const urls = String(s.custom_urls || "").split(/\r?\n/);
    s.slides = ids.map((id, i) => ({
      _id: "r_sl" + i,
      image_id: parseInt(id, 10) || 0,
      caption: "",
      link: String(urls[i] || "").trim(),
      alt: "",
    }));
  }
  return node;
}
function parseFnMap(css, names) {
  const out = {};
  if (Array.isArray(names))
    names.forEach((n) => {
      out[n] = "";
    });
  String(css || "").replace(
    /(blur|brightness|contrast|saturate|hue-rotate|grayscale|invert|sepia|translate|translateX|translateY|rotate|scale|scaleX|scaleY|skewX|skewY)\(\s*([^)]+)\s*\)/gi,
    (_, fn, val) => {
      const f = fn.toLowerCase();
      const v = String(val).trim();
      if (f === "hue-rotate") out.hue = v;
      else if (f === "translate") {
        const parts = v.split(",");
        out.translate_x = (parts[0] || "").trim();
        out.translate_y = (parts[1] || "").trim();
      } else if (f === "translatex") out.translate_x = v;
      else if (f === "translatey") out.translate_y = v;
      else if (f === "scale") {
        const parts = v.split(",");
        out.scale_x = (parts[0] || "").trim();
        out.scale_y = (parts[1] || parts[0] || "").trim();
      } else if (f === "scalex") out.scale_x = v;
      else if (f === "scaley") out.scale_y = v;
      else if (f === "skewx") out.skew_x = v;
      else if (f === "skewy") out.skew_y = v;
      else out[f] = v;
      return "";
    },
  );
  return out;
}
function parseShadow(css, text) {
  const s = String(css || "").trim();
  const out = { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,.15)", inset: false };
  if (!s) return out;
  out.inset = /\binset\b/i.test(s);
  const color = s.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/i);
  if (color) out.color = color[1];
  const nums = s
    .replace(/inset/gi, "")
    .replace(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (nums[0]) out.x = parseFloat(nums[0]) || 0;
  if (nums[1]) out.y = parseFloat(nums[1]) || 0;
  if (nums[2]) out.blur = parseFloat(nums[2]) || 0;
  if (!text && nums[3]) out.spread = parseFloat(nums[3]) || 0;
  return out;
}
function migrateGroupSettings(s) {
  if (!s || typeof s !== "object") return s;
  if (typeof s.transform === "string") {
    const p = parseFnMap(s.transform);
    s.transform = {
      translate_x: p.translate_x || "",
      translate_y: p.translate_y || "",
      rotate: p.rotate || "",
      scale_x: p.scale_x || "",
      scale_y: p.scale_y || "",
      skew_x: p.skew_x || "",
      skew_y: p.skew_y || "",
      origin: "",
    };
  }
  if (typeof s.filter === "string") {
    const p = parseFnMap(s.filter);
    s.filter = {
      blur: p.blur || "",
      brightness: p.brightness || "",
      contrast: p.contrast || "",
      saturate: p.saturate || "",
      hue: p.hue || "",
      grayscale: p.grayscale || "",
      invert: p.invert || "",
      sepia: p.sepia || "",
    };
  }
  if (typeof s.transition === "string") {
    const parts = String(s.transition).trim().split(/\s+/);
    s.transition = {
      property: parts[0] || "all",
      duration: parts[1] || "",
      easing: parts[2] || "",
      delay: parts[3] || "",
    };
  }
  if (typeof s.text_shadow === "string") s.text_shadow = parseShadow(s.text_shadow, true);
  if (typeof s.box_shadow === "string") s.box_shadow = parseShadow(s.box_shadow, false);
  if (typeof s.shadow === "string") s.shadow = parseShadow(s.shadow, false);
  const bg = s.background;
  if (typeof bg === "string" && bg) {
    if (/gradient\(/i.test(bg)) s.background = { type: "gradient", custom: bg, color: "" };
    else s.background = { type: "classic", color: bg };
  } else if (!bg || typeof bg !== "object") {
    if (s.background_image || s.background_gradient || s.background_video) {
      s.background = {
        type: s.background_video ? "video" : s.background_gradient ? "gradient" : "classic",
        color: "",
        image_url: s.background_image || "",
        custom: typeof s.background_gradient === "string" ? s.background_gradient : "",
        video_url: s.background_video || "",
      };
    }
  }
  if (!s.gaps || typeof s.gaps !== "object") {
    if (s.column_gap != null || s.row_gap != null) {
      const row = s.row_gap && typeof s.row_gap === "object" ? (s.row_gap.desktop ?? "") : (s.row_gap ?? "");
      const col =
        s.column_gap && typeof s.column_gap === "object" ? (s.column_gap.desktop ?? "") : (s.column_gap ?? "");
      s.gaps = { column: col, row, linked: false };
    }
  }
  Object.keys(s).forEach((k) => {
    if (isBpMap(s[k])) s[k] = migrateBreakpointMap(s[k]);
  });
  return s;
}
function migrateNode(node, fromVersion) {
  if (!node || typeof node !== "object") return node;
  const out = JSON.parse(JSON.stringify(node));
  out.settings = out.settings && typeof out.settings === "object" ? out.settings : {};
  if (versionCompare(fromVersion, "2.2") < 0) migrateRepeaters(out);
  if (versionCompare(fromVersion, "2.6") < 0) migrateGroupSettings(out.settings);
  if (versionCompare(fromVersion, "2.4") < 0) {
    Object.keys(out.settings).forEach((k) => {
      if (isBpMap(out.settings[k])) out.settings[k] = migrateBreakpointMap(out.settings[k]);
    });
  }
  if (Array.isArray(out.children)) out.children = out.children.map((c) => migrateNode(c, fromVersion));
  return out;
}
function migrateClipboard(payload, currentSchema) {
  const schema = currentSchema || CLIPBOARD_SCHEMA;
  const src = payload && typeof payload === "object" ? payload : emptyClipboard(schema);
  const from = String(src.schema || "1.0");
  if (versionCompare(from, schema) >= 0) {
    return {
      schema,
      updated: src.updated || Date.now(),
      unit: src.unit || null,
      style: src.style && typeof src.style === "object" ? src.style : null,
      page: Array.isArray(src.page) ? src.page : null,
    };
  }
  return {
    schema,
    updated: src.updated || Date.now(),
    unit: src.unit ? migrateNode(src.unit, from) : null,
    style:
      src.style && typeof src.style === "object" ? migrateGroupSettings(JSON.parse(JSON.stringify(src.style))) : null,
    page: Array.isArray(src.page) ? src.page.map((n) => migrateNode(n, from)) : null,
  };
}
function packClipboard(partial, schema) {
  const cur = schema || CLIPBOARD_SCHEMA;
  return {
    schema: cur,
    updated: Date.now(),
    unit: partial.unit !== void 0 ? partial.unit : null,
    style: partial.style !== void 0 ? partial.style : null,
    page: partial.page !== void 0 ? partial.page : null,
  };
}
function installClipboard() {
  if (!app.root) return;
  app.clipboardSchema = (app.D && app.D.schema) || CLIPBOARD_SCHEMA;
  function persist(next) {
    const cur = readStorage() || emptyClipboard(app.clipboardSchema);
    const payload = packClipboard(
      {
        unit: next && "unit" in next ? next.unit : (app.clipboard ?? cur.unit),
        style: next && "style" in next ? next.style : (app.styleClipboard ?? cur.style),
        page: next && "page" in next ? next.page : (app.pageClipboard ?? cur.page),
      },
      app.clipboardSchema,
    );
    app.clipboard = payload.unit;
    app.styleClipboard = payload.style;
    app.pageClipboard = payload.page;
    writeStorage(payload);
    return payload;
  }
  app.hydrateClipboard = function hydrateClipboard() {
    const raw = readStorage();
    if (!raw) return emptyClipboard(app.clipboardSchema);
    const migrated = migrateClipboard(raw, app.clipboardSchema);
    app.clipboard = migrated.unit;
    app.styleClipboard = migrated.style;
    app.pageClipboard = migrated.page;
    if (versionCompare(String(raw.schema || "1.0"), app.clipboardSchema) < 0) writeStorage(migrated);
    return migrated;
  };
  app.hasUnitClipboard = function hasUnitClipboard() {
    if (app.clipboard) return true;
    const raw = readStorage();
    return !!(raw && raw.unit);
  };
  app.hasStyleClipboard = function hasStyleClipboard() {
    if (app.styleClipboard && Object.keys(app.styleClipboard).length) return true;
    const raw = readStorage();
    return !!(raw && raw.style && Object.keys(raw.style).length);
  };
  app.hasPageClipboard = function hasPageClipboard() {
    if (Array.isArray(app.pageClipboard) && app.pageClipboard.length) return true;
    const raw = readStorage();
    return !!(raw && Array.isArray(raw.page) && raw.page.length);
  };
  app.copy = function copy(id) {
    const target = id || app.selected;
    const r = target && app.locate(app.state.root, target);
    if (!r) return;
    persist({ unit: JSON.parse(JSON.stringify(r.node)) });
  };
  app.copyStyle = function copyStyle(id) {
    const target = id || app.selected;
    const r = target && app.locate(app.state.root, target);
    if (!r) return;
    const out = {};
    Object.keys(r.node.settings || {})
      .filter((k) => app.styleKeys.has(k))
      .forEach((k) => {
        out[k] = JSON.parse(JSON.stringify(r.node.settings[k]));
      });
    persist({ style: out });
  };
  const oldPaste = typeof app.paste === "function" ? app.paste : null;
  app.paste = function paste() {
    app.hydrateClipboard();
    if (!app.clipboard) return;
    if (oldPaste) return oldPaste();
  };
  app.pasteStyle = function pasteStyle(id) {
    app.hydrateClipboard();
    const target = id || app.selected;
    const r = target && app.locate(app.state.root, target);
    if (!r || !app.styleClipboard) return;
    app.commit(app.t("Pasted style"), target);
    Object.entries(app.styleClipboard).forEach(([k, v]) =>
      app.setPath(r.node.settings, k, JSON.parse(JSON.stringify(v))),
    );
    app.selected = target;
    app.render();
  };
  app.resetStyle = function resetStyle(id) {
    const target = id || app.selected;
    const r = target && app.locate(app.state.root, target);
    if (!r) return;
    const d = app.defaults(r.node.type);
    app.commit(app.t("Reset style"), target);
    Object.keys(r.node.settings || {})
      .filter((k) => app.styleKeys.has(k))
      .forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(d, k)) r.node.settings[k] = JSON.parse(JSON.stringify(d[k]));
        else delete r.node.settings[k];
      });
    app.selected = target;
    app.render();
  };
  app.copyAllContent = function copyAllContent() {
    persist({ page: JSON.parse(JSON.stringify(app.state.root || [])) });
  };
  app.pasteAllContent = function pasteAllContent() {
    app.hydrateClipboard();
    if (!Array.isArray(app.pageClipboard) || !app.pageClipboard.length) return;
    app.commit(app.t("Pasted all content"));
    app.state.root = app.pageClipboard.map(app.clone);
    app.selected = null;
    app.render();
  };
  app.hydrateClipboard();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === CLIPBOARD_STORAGE) app.hydrateClipboard();
    });
  }
  if (app.LB) {
    app.LB.hasClipboard = () => app.hasUnitClipboard();
    app.LB.hasStyleClipboard = () => app.hasStyleClipboard();
    app.LB.hasPageClipboard = () => app.hasPageClipboard();
    app.LB.copy = (id) => app.copy(id);
    app.LB.paste = () => app.paste();
    app.LB.copyStyle = (id) => app.copyStyle(id);
    app.LB.pasteStyle = (id) => app.pasteStyle(id);
    app.LB.copyAllContent = () => app.copyAllContent();
    app.LB.pasteAllContent = () => app.pasteAllContent();
    app.LB.resetStyle = (id) => app.resetStyle(id);
  }
}

export {
  CLIPBOARD_STORAGE,
  CLIPBOARD_SCHEMA,
  BP_NAMES,
  REPEATER_MAP,
  versionCompare,
  emptyClipboard,
  readStorage,
  writeStorage,
  isBpMap,
  migrateBreakpointMap,
  pipeItems,
  migrateRepeaters,
  parseFnMap,
  parseShadow,
  migrateGroupSettings,
  migrateNode,
  migrateClipboard,
  packClipboard,
  installClipboard,
};
