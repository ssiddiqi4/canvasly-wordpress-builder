import { app } from "./app.js";
import { normalizePreferences, applyUiTheme } from "./preferences.js";
function installState() {
  app.root = document.getElementById("lb-editor");
  if (!app.root) return false;
  app.D = window.SidcraftPageBuilderData || {};
  app.t = function t3(key) {
    const map = app.D.i18n && typeof app.D.i18n === "object" ? app.D.i18n : {};
    let s = Object.prototype.hasOwnProperty.call(map, key) ? String(map[key] ?? "") : String(key);
    if (arguments.length > 1) {
      const args = Array.prototype.slice.call(arguments, 1).map((v) => String(v));
      s = s.replace(/%(\d+)\$s/g, (_, n) => args[Number(n) - 1] ?? "");
      for (let i = 0; i < args.length; i++) s = s.replace("%s", args[i]);
    }
    return s;
  };
  if (app.LB) app.LB.t = app.t;
  app.esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c],
    );
  app.lbDevMode = !!app.D.devMode;
  if (window.SidcraftPageBuilder) window.SidcraftPageBuilder.devMode = app.lbDevMode;
  app.LB_DYNAMIC_KEYS = { title: 1, excerpt: 1, url: 1, featured_image: 1, author: 1, date: 1 };
  app.lbLooksLikeEval = function lbLooksLikeEval(s) {
    return /\b(?:eval|Function|setTimeout|setInterval)\s*\(|new\s+Function\s*\(|javascript\s*:|vbscript\s*:|<\?php|<\?=|\{\{[\s]*[=#\/]|\{%/i.test(
      String(s || ""),
    );
  };
  app.lbSanitizeCss = function lbSanitizeCss(v) {
    let s = String(v ?? "");
    s = s
      .replace(/<[^>]*>/g, "")
      .replace(/\b(?:eval|Function)\s*\(/gi, "(")
      .replace(/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding\s*:|@import/gi, "")
      .replace(/url\s*\(\s*['"]?\s*(javascript|vbscript|data\s*:\s*text)/gi, "url(");
    return s.replace(/<\/?/g, "");
  };
  app.lbSanitizeUrl = function lbSanitizeUrl(v) {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (/^\s*(javascript|vbscript|data)\s*:/i.test(s)) return "";
    return s;
  };
  app.lbSanitizeHtml = function lbSanitizeHtml(html) {
    let s = String(html ?? "");
    s = s
      .replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, "")
      .replace(/<(script|iframe|object|embed|link|meta|base|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|iframe|object|embed|link|meta|base)[^>]*\/?>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(
        /\s(href|src|xlink:href|action|formaction|poster)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\s*\/\s*html)\b[^"'\s>]*/gi,
        " $1=$2",
      )
      .replace(/expression\s*\(|javascript\s*:|vbscript\s*:/gi, "");
    if (app.lbLooksLikeEval(s))
      s = s.replace(/\b(?:eval|Function)\s*\([^)]*\)/gi, "").replace(/new\s+Function\s*\([^)]*\)/gi, "");
    return s;
  };
  app.lbResolveSafeDynamic = function lbResolveSafeDynamic(v) {
    if (typeof v !== "string" || v.indexOf("{{") === -1) return v;
    const map = app.D.dynamic && typeof app.D.dynamic === "object" ? app.D.dynamic : {};
    const token = (key) => {
      key = String(key || "").toLowerCase();
      if (key === "content" || key.indexOf("meta:") === 0) return "";
      if (!app.LB_DYNAMIC_KEYS[key]) return "";
      if (!Object.prototype.hasOwnProperty.call(map, key)) return "";
      const out = map[key];
      return out == null ? "" : String(out);
    };
    v = v.replace(/\{\{lb:([a-z0-9_:-]+)\}\}/gi, (_, k) => token(k));
    v = v.replace(
      /\{\{(?!var:[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|lb:[a-z0-9_:-]+|\s*(?:post|term|loop|site)\.[a-z_]+(?::[a-zA-Z0-9_-]+)?\s*\}\})[\s\S]*?\}\}/gi,
      "",
    );
    if (app.lbLooksLikeEval(v)) v = v.replace(/\b(?:eval|Function)\s*\([^)]*\)/gi, "");
    return v;
  };
  app.lbSanitizeSettingForCanvas = function lbSanitizeSettingForCanvas(k, v, type) {
    if (Array.isArray(v)) return v.map((x2) => lbSanitizeSettingForCanvas(k, x2, type));
    if (v && typeof v === "object") {
      const o = {};
      Object.keys(v).forEach((ck) => {
        o[ck] = lbSanitizeSettingForCanvas(ck, v[ck], type);
      });
      return o;
    }
    if (typeof v !== "string") return v;
    if (k === "code" && type === "code") return v.replace(/\b(?:eval|Function)\s*\(/gi, "(");
    let x = app.lbResolveSafeDynamic(v);
    if (
      k === "url" ||
      k === "link" ||
      k === "image_url" ||
      k === "background_image" ||
      k === "background_video" ||
      k === "video_url" ||
      k === "video_poster"
    )
      x = app.lbSanitizeUrl(x);
    if (k === "custom_css" || k === "background_gradient" || k === "custom") x = app.lbSanitizeCss(x);
    if (
      k === "html" ||
      k === "content" ||
      k === "text" ||
      k === "quote" ||
      k === "front" ||
      k === "back" ||
      k === "front_text" ||
      k === "back_text" ||
      k === "tabs"
    )
      x = app.lbSanitizeHtml(x);
    if (k === "dynamic_key" && x && !app.LB_DYNAMIC_KEYS[x] && x !== "content") x = "";
    if (k === "dynamic_meta_key") x = String(x).replace(/[^a-z0-9_-]/gi, "");
    return x;
  };
  app.lbSanitizeNodeForCanvas = function lbSanitizeNodeForCanvas(n) {
    if (!n || typeof n !== "object") return n;
    const out = Object.assign({}, n);
    if (n.settings && typeof n.settings === "object") {
      const s = {};
      Object.keys(n.settings).forEach((k) => {
        s[k] = app.lbSanitizeSettingForCanvas(k, n.settings[k], n.type);
      });
      out.settings = s;
    }
    if (Array.isArray(n.children)) out.children = n.children.map(lbSanitizeNodeForCanvas);
    return out;
  };
  function lbKeepMapFrame(tag) {
    const raw = String(tag || "");
    if (!/^<iframe\b[^>]*>\s*<\/iframe>$/i.test(raw) && !/^<iframe\b[^>]*\/?>$/i.test(raw)) return "";
    if (/\b(?:srcdoc|formaction)\s*=/i.test(raw)) return "";
    const m = raw.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!m) return "";
    const url = (m[1] || m[2] || "")
      .replace(/&amp;/gi, "&")
      .replace(/&#0*38;/gi, "&")
      .trim();
    if (!/^https:\/\/(?:www\.google\.com\/maps(?:\/embed\/v1\/place)?|maps\.google\.com\/maps)(?:\?|#|$)/i.test(url))
      return "";
    if (/[\s<>"']/.test(url)) return "";
    const src = url.replace(/&/g, "&amp;");
    return (
      '<iframe class="lb-map-frame" title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="' +
      src +
      '" style="width:100%;height:100%;border:0;display:block;pointer-events:none"></iframe>'
    );
  }
  app.lbSanitizeCanvasMarkup = function lbSanitizeCanvasMarkup(html) {
    let s = String(html ?? "");
    s = s.replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, "");
    s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, lbKeepMapFrame);
    s = s.replace(/<iframe\b[^>]*\/>/gi, lbKeepMapFrame);
    s = s.replace(/<iframe\b[^>]*>/gi, (open) => {
      const m = open.match(/\ssrc\s*=\s*"([^"]*)"/i);
      const url = m
        ? (m[1] || "")
            .replace(/&amp;/gi, "&")
            .replace(/&#0*38;/gi, "&")
            .trim()
        : "";
      return /^https:\/\/(?:www\.google\.com\/maps(?:\/embed\/v1\/place)?|maps\.google\.com\/maps)(?:\?|#|$)/i.test(url)
        ? open
        : "";
    });
    s = s.replace(
      /<(script|object|embed|link|meta|base|math|foreignObject|annotation-xml)\b[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    );
    s = s.replace(/<(script|object|embed|link|meta|base|foreignObject|annotation-xml)\b[^>]*\/?>/gi, "");
    s = s.replace(/<form\b([^>]*)>/gi, (full, attrs) => {
      const cls = String(attrs).match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i) || [];
      const id = String(attrs).match(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i) || [];
      const className = [cls[1] || cls[2] || "", "lb-form-shell"].filter(Boolean).join(" ").replace(/["<>]/g, "");
      const idAttr = id[1] || id[2] ? ' id="' + String(id[1] || id[2]).replace(/["<>]/g, "") + '"' : "";
      return '<div class="' + className + '"' + idAttr + ">";
    });
    s = s.replace(/<\/form\s*>/gi, "</div>");
    s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    s = s.replace(
      /\s(href|src|xlink:href|action|formaction|poster)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\s*\/\s*html)\b[^"'\s>]*/gi,
      " $1=$2",
    );
    s = s.replace(/expression\s*\(|javascript\s*:|vbscript\s*:/gi, "");
    if (app.lbLooksLikeEval(s))
      s = s.replace(/\b(?:eval|Function)\s*\([^)]*\)/gi, "").replace(/new\s+Function\s*\([^)]*\)/gi, "");
    return s;
  };
  app.eid = () => `n_${Math.random().toString(36).slice(2, 10)}`;
  app.acceptsInside = function acceptsInside(n) {
    if (!n) return false;
    const type = typeof n === "string" ? n : n.type;
    const meta = app.meta(type);
    return !!(
      meta.children ||
      meta.slots ||
      meta.slot_source ||
      [
        "container",
        "grid",
        "inner_section",
        "collection_loop",
        "nested_carousel",
        "nested_tabs",
        "nested_accordion",
        "nested_toggle",
        "off_canvas",
      ].includes(type)
    );
  };
  app.proLicensed = function proLicensed() {
    const lic = app.D && app.D.proLicense;
    return !!(lic && lic.active);
  };
  app.proUnitLocked = function proUnitLocked(typeOrUnit) {
    const unit = typeOrUnit && typeof typeOrUnit === "object" ? typeOrUnit : app.meta ? app.meta(typeOrUnit) : null;
    return !!(unit && unit.source === "pro" && !app.proLicensed());
  };
  app.makeNode = function makeNode(type) {
    if (app.proUnitLocked(type)) return null;
    const e = app.meta(type);
    if (!e.type) return null;
    const n = {
      id: app.eid(),
      type,
      settings: app.defaults(type),
      atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
      styles: { base: {} },
      interactions: [],
      editor_settings: {},
    };
    if (e.children) n.children = [];
    return n;
  };
  app.frameDoc = () => document.getElementById("lb-editor-frame")?.contentDocument || null;
  app.$ = (s) => {
    const host = document.querySelector(".lb-modal-backdrop,.lb-rte-overlay");
    return (
      (host && host.querySelector(s)) ||
      app.root.querySelector(s) ||
      document.querySelector(s) ||
      app.frameDoc()?.querySelector(s)
    );
  };
  app.$$ = (s) => {
    const host = document.querySelector(".lb-modal-backdrop,.lb-rte-overlay");
    const extra = host ? [...host.querySelectorAll(s)] : [];
    const a = [...app.root.querySelectorAll(s)];
    extra.forEach((n) => {
      if (!a.includes(n)) a.push(n);
    });
    const d = app.frameDoc();
    return d ? [...a, ...d.querySelectorAll(s)] : a;
  };
  app.meta = (t3) => (app.D.units || []).find((e) => e.type === t3) || {};
  app.clone = (n) => {
    const c = JSON.parse(JSON.stringify(n));
    c.id = app.eid();
    if (c.children) c.children = c.children.map(app.clone);
    return c;
  };
  ((app.menuOpen = false),
    (app.menuDialog = null),
    (app.contextMenuEl = null),
    (app.styleClipboard = null),
    (app.pageClipboard = null));
  function lbReadBootDocument() {
    const parse = (raw) => {
      try {
        const d = JSON.parse(raw);
        return d && typeof d === "object" && !Array.isArray(d) ? d : null;
      } catch (e) {
        return null;
      }
    };
    const node = document.getElementById("lb-editor-document");
    if (node) {
      const d = parse(String(node.textContent || "").trim());
      if (d) return d;
    }
    const attr = app.root.dataset.document || "";
    if (attr && attr !== "{}") {
      const d = parse(attr);
      if (d) return d;
    }
    return { version: "1.0", root: [], header: [], footer: [], settings: {} };
  }
  ((app.state = lbReadBootDocument()),
    (app.selected = null),
    (app.history = []),
    (app.future = []),
    (app.historyLimit = 40),
    (app.clipboard = null),
    (app.dirty = false),
    (app.device = "desktop"),
    (app.saveTimer = null),
    (app.category = "all"),
    (app.unitSearch = ""),
    (app.leftWidth = 250),
    (app.rightWidth = 330),
    (app.leftHidden = false),
    (app.rightHidden = false),
    (app.activeTab = "navigator"),
    (app.styleTab = "content"),
    (app.modal = null),
    (app.dragNode = null),
    (app.suppressUnitClick = false));
  if (!Array.isArray(app.state.header)) app.state.header = [];
  if (!Array.isArray(app.state.footer)) app.state.footer = [];
  app.sitePart = function sitePart(part) {
    const all = app.D && app.D.siteParts;
    const slot = all && all[part];
    if (!slot || !Number(slot.id)) return null;
    return slot;
  };
  app.mountSiteParts = function mountSiteParts() {
    app.pageChrome = {
      header: JSON.parse(JSON.stringify(app.state.header || [])),
      footer: JSON.parse(JSON.stringify(app.state.footer || [])),
    };
    app.sitePartMeta = {};
    ["header", "footer"].forEach((part) => {
      const slot = app.sitePart(part);
      if (!slot) return;
      app.sitePartMeta[part] = {
        id: Number(slot.id),
        type: String(slot.type || ""),
        version: slot.version || app.state.version || "2.8",
        settings: slot.settings && typeof slot.settings === "object" ? slot.settings : {},
        header: Array.isArray(slot.header) ? slot.header : [],
        footer: Array.isArray(slot.footer) ? slot.footer : [],
      };
      app.state[part] = Array.isArray(slot.nodes) ? JSON.parse(JSON.stringify(slot.nodes)) : [];
    });
  };
  app.lbDocumentHasNodes = function lbDocumentHasNodes(d) {
    d = d || {};
    return !!(
      (Array.isArray(d.root) && d.root.length) ||
      (Array.isArray(d.header) && d.header.length) ||
      (Array.isArray(d.footer) && d.footer.length)
    );
  };
  app.lbHydrateDocument = function lbHydrateDocument() {
    if (
      !app.root ||
      app.root.dataset.lbHasDocument !== "1" ||
      app.lbDocumentHasNodes(app.state) ||
      !app.D ||
      !app.D.postId ||
      !app.D.api
    )
      return;
    const api = String(app.D.api).replace(/\/$/, "");
    fetch(api + "/document/" + encodeURIComponent(app.D.postId), {
      headers: { "X-WP-Nonce": app.D.nonce || "" },
      credentials: "same-origin",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!doc || typeof doc !== "object" || !app.lbDocumentHasNodes(doc)) return;
        const added = app.dirty && Array.isArray(app.state.root) ? app.state.root.slice() : [];
        app.state = doc;
        if (added.length) {
          app.state.root = (Array.isArray(app.state.root) ? app.state.root : []).concat(added);
          app.dirty = true;
        } else app.dirty = false;
        if (!Array.isArray(app.state.header)) app.state.header = [];
        if (!Array.isArray(app.state.footer)) app.state.footer = [];
        if (typeof app.mountSiteParts === "function") app.mountSiteParts();
        if (typeof app.render === "function") app.render();
      })
      .catch(() => {});
  };
  app.pageDocumentForSave = function pageDocumentForSave() {
    const payload = JSON.parse(JSON.stringify(app.state));
    const parts = [];
    const byId = {};
    ["header", "footer"].forEach((part) => {
      const meta = app.sitePartMeta && app.sitePartMeta[part];
      if (!meta || !meta.id) return;
      const nodes = payload[part] || [];
      if (meta.type === "header_footer") {
        let entry = byId[meta.id];
        if (!entry) {
          entry = {
            id: meta.id,
            document: {
              version: meta.version || payload.version || "2.8",
              root: [],
              header: Array.isArray(meta.header) ? JSON.parse(JSON.stringify(meta.header)) : [],
              footer: Array.isArray(meta.footer) ? JSON.parse(JSON.stringify(meta.footer)) : [],
              settings: meta.settings || {},
            },
          };
          byId[meta.id] = entry;
          parts.push(entry);
        }
        entry.document[part] = nodes;
      } else
        parts.push({
          id: meta.id,
          document: {
            version: meta.version || payload.version || "2.8",
            root: nodes,
            header: meta.header || [],
            footer: meta.footer || [],
            settings: meta.settings || {},
          },
        });
      payload[part] = JSON.parse(JSON.stringify((app.pageChrome && app.pageChrome[part]) || []));
    });
    return { page: payload, parts };
  };
  app.mountSiteParts();
  app.chromeFocus = String((app.D && app.D.templateType) || "") === "header_footer" ? "header" : null;
  app.chromeInsert = null;
  app.prefs = normalizePreferences(app.D.preferences);
  app.leftWidth = app.prefs.panel_width_left;
  app.rightWidth = app.prefs.panel_width;
  if (app.prefs.navigator_default === "closed") app.activeTab = "settings";
  applyUiTheme(app.prefs.ui_theme);
  app.repeaterOpen = {};
  app.fav = new Set(app.D.favorites || []);
  app.locateTree = function locateTree(nodes, id) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) return { node: n, nodes, index: i, parent: null };
      const r = locateTree(n.children || [], id);
      if (r) {
        r.parent = n;
        return r;
      }
    }
    return null;
  };
  app.locate = function locate(nodes, id) {
    const hit = app.locateTree(nodes, id);
    if (hit || nodes !== app.state.root) return hit;
    return app.locateTree(app.state.header || [], id) || app.locateTree(app.state.footer || [], id);
  };
  app.regionOf = function regionOf(id) {
    if (!id) return null;
    if (app.locateTree(app.state.header || [], id)) return "header";
    if (app.locateTree(app.state.footer || [], id)) return "footer";
    if (app.locateTree(app.state.root || [], id)) return "root";
    return null;
  };
  app.chromeList = function chromeList(part) {
    if (part !== "header" && part !== "footer") return app.state.root;
    if (!Array.isArray(app.state[part])) app.state[part] = [];
    return app.state[part];
  };
  app.contains = function contains(n, id) {
    return n?.id === id || (n?.children || []).some((c) => contains(c, id));
  };
  app.snap = function snap() {
    return JSON.stringify(app.state);
  };
  app.commit = function commit(label, target) {
    if (app.previewingRevision) return false;
    app.history.push({
      s: app.snap(),
      label: label || app.t("Change"),
      target: target || app.selected || "",
      t: Date.now(),
    });
    const cap = app.historyLimit || 40;
    if (app.history.length > cap) app.history.shift();
    app.future = [];
    app.dirty = true;
    app.scheduleSave();
    return true;
  };
  app.defaults = function defaults(t3) {
    return JSON.parse(JSON.stringify(app.meta(t3).defaults || {}));
  };
  app.setPath = function setPath(o, path, v) {
    const a = String(path || "").split(".");
    const bp = ["desktop", "tablet", "mobile", "laptop", "widescreen", "tablet_extra", "mobile_extra"];
    let y = o;
    for (let i = 0; i < a.length - 1; i++) {
      const k = a[i],
        next = a[i + 1];
      const cur = y[k];
      if (Array.isArray(cur) && /^\d+$/.test(next)) {
        y = cur;
        continue;
      }
      if (cur == null || typeof cur !== "object" || Array.isArray(cur)) {
        const prev = cur;
        y[k] = /^\d+$/.test(next) ? [] : {};
        if (prev != null && typeof prev !== "object" && !Array.isArray(prev) && bp.indexOf(next) !== -1)
          y[k].desktop = prev;
      }
      y = y[k];
    }
    y[a[a.length - 1]] = v;
  };
  app.getPath = function getPath(o, path) {
    const a = String(path || "").split(".");
    let y = o;
    for (let i = 0; i < a.length; i++) {
      if (y == null) return;
      y = y[a[i]];
    }
    return y;
  };
  app.lbTrackCount = function lbTrackCount(raw, fallback) {
    const t3 = String(raw && typeof raw === "object" ? (raw[app.device] ?? raw.desktop ?? "") : (raw ?? "")).trim();
    if (!t3) return fallback;
    if (/^\d+$/.test(t3)) return Math.max(1, Math.min(24, parseInt(t3, 10)));
    let n = 0,
      i = 0;
    while (i < t3.length) {
      while (i < t3.length && /\s/.test(t3[i])) i++;
      if (i >= t3.length) break;
      let d = 0,
        j = i;
      for (; j < t3.length; j++) {
        if (t3[j] === "(") d++;
        else if (t3[j] === ")") d--;
        else if (/\s/.test(t3[j]) && d === 0) break;
      }
      const tok = t3.slice(i, j),
        m = tok.match(/^repeat\(\s*(\d+)\s*,/i);
      n += m ? Math.max(1, parseInt(m[1], 10)) : 1;
      i = j + 1;
    }
    return Math.max(1, Math.min(24, n || fallback));
  };
  app.lbIsGridNode = function lbIsGridNode(p) {
    return !!p && (p.type === "grid" || (p.type === "container" && String(p.settings?.layout || "") === "grid"));
  };
  app.lbFirstFreeCell = function lbFirstFreeCell(g) {
    const s = g.settings || {},
      v = (x) => (x && typeof x === "object" ? (x[app.device] ?? x.desktop ?? "") : x);
    const cols = app.lbTrackCount(v(s.grid_template_columns) || v(s.columns), g.type === "grid" ? 3 : 2);
    const rows = app.lbTrackCount(v(s.grid_template_rows) || v(s.rows) || v(s.grid_rows), 3);
    const used = /* @__PURE__ */ new Set();
    (g.children || []).forEach((c) => {
      const cs = c.settings || {},
        c0 = Math.max(1, parseInt(v(cs.grid_column_start), 10) || 1),
        r0 = Math.max(1, parseInt(v(cs.grid_row_start), 10) || 1),
        cw = Math.max(1, parseInt(v(cs.grid_column_span), 10) || 1),
        rh = Math.max(1, parseInt(v(cs.grid_row_span), 10) || 1);
      for (let r = r0; r < r0 + rh; r++) for (let k = c0; k < c0 + cw; k++) used.add(k + "," + r);
    });
    for (let r = 1; r <= rows + (g.children || []).length; r++)
      for (let c = 1; c <= cols; c++) if (!used.has(c + "," + r)) return { col: c, row: r };
    return { col: 1, row: rows + 1 };
  };
  app.add = function add(type, parentId = null, index = null, slotId = null) {
    if (app.previewingRevision || app.proUnitLocked(type)) return;
    const n = app.makeNode(type);
    if (!n) return;
    app.commit(app.t("Added %s", app.meta(type).title || type), n.id);
    if (parentId) {
      const p = app.locate(app.state.root, parentId);
      if (!p || !app.acceptsInside(p.node)) {
        app.history.pop();
        return;
      }
      p.node.children = p.node.children || [];
      if (typeof app.assignSlot === "function") app.assignSlot(n, p.node, slotId);
      if (app.lbIsGridNode(p.node) && n.settings.grid_column_start == null && n.settings.grid_row_start == null) {
        const c = app.lbFirstFreeCell(p.node);
        Object.assign(n.settings, {
          grid_column_start: c.col,
          grid_row_start: c.row,
          grid_column_span: 1,
          grid_row_span: 1,
          justify_self: "stretch",
          align_self: "stretch",
        });
      }
      index == null ? p.node.children.push(n) : p.node.children.splice(index, 0, n);
    } else {
      let region = app.chromeInsert || "";
      if (region === "root") region = "";
      else if (!region && app.selected) {
        const where = app.regionOf(app.selected);
        if (where === "header" || where === "footer") region = where;
      } else if (!region && !app.selected && (app.chromeFocus === "header" || app.chromeFocus === "footer"))
        region = app.chromeFocus;
      const list = region === "header" || region === "footer" ? app.chromeList(region) : app.state.root;
      if (index == null && region && app.selected && app.regionOf(app.selected) === region) {
        const hit = app.locateTree(list, app.selected);
        if (hit) index = hit.index + 1;
      }
      index == null ? list.push(n) : list.splice(index, 0, n);
    }
    const placed = app.regionOf(n.id);
    app.chromeFocus = placed === "header" || placed === "footer" ? placed : null;
    app.selected = n.id;
    app.activeTab = "settings";
    app.render();
  };
  app.remove = function remove(id = app.selected) {
    if (app.previewingRevision) return;
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    app.commit(app.t("Deleted %s", app.meta(r.node.type).title || r.node.type), r.node.id);
    r.nodes.splice(r.index, 1);
    app.selected = r.parent?.id || null;
    app.render();
  };
  app.duplicate = function duplicate() {
    if (app.previewingRevision) return;
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r || app.proUnitLocked(r.node.type)) return;
    app.commit(app.t("Duplicated %s", app.meta(r.node.type).title || r.node.type), r.node.id);
    const c = app.clone(r.node);
    r.nodes.splice(r.index + 1, 0, c);
    app.selected = c.id;
    app.render();
  };
  app.copy = function copy() {
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (r) app.clipboard = JSON.parse(JSON.stringify(r.node));
  };
  app.copyStyle = function copyStyle(id = app.selected) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    const out = {};
    Object.keys(r.node.settings || {})
      .filter((k) => app.styleKeys.has(k))
      .forEach((k) => (out[k] = JSON.parse(JSON.stringify(r.node.settings[k]))));
    app.styleClipboard = out;
  };
  app.pasteStyle = function pasteStyle(id = app.selected) {
    const r = id && app.locate(app.state.root, id);
    if (!r || !app.styleClipboard) return;
    app.commit(app.t("Pasted style"), id);
    Object.entries(app.styleClipboard).forEach(([k, v]) =>
      app.setPath(r.node.settings, k, JSON.parse(JSON.stringify(v))),
    );
    app.selected = id;
    app.render();
  };
  app.resetStyle = function resetStyle(id = app.selected) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    const d = app.defaults(r.node.type);
    app.commit(app.t("Reset style"), id);
    Object.keys(r.node.settings || {})
      .filter((k) => app.styleKeys.has(k))
      .forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(d, k)) r.node.settings[k] = JSON.parse(JSON.stringify(d[k]));
        else delete r.node.settings[k];
      });
    app.selected = id;
    app.render();
  };
  app.copyAllContent = function copyAllContent() {
    app.pageClipboard = JSON.parse(JSON.stringify(app.state.root));
  };
  app.pasteAllContent = function pasteAllContent() {
    if (!app.pageClipboard) return;
    app.commit(app.t("Pasted all content"));
    app.state.root = app.pageClipboard.map(app.clone);
    app.selected = null;
    app.render();
  };
  app.deleteAllContent = function deleteAllContent() {
    if (!app.state.root.length) return;
    if (!window.confirm(app.t("Delete all content from this page?"))) return;
    app.commit(app.t("Deleted all content"));
    app.state.root = [];
    app.selected = null;
    app.render();
  };
  return true;
}

export { installState };
