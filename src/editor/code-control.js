import { app } from "./app.js";
function installCodeControl() {
  const LANG = {
    html: "html",
    xml: "html",
    css: "css",
    js: "javascript",
    javascript: "javascript",
    json: "json",
    php: "php",
    text: "text",
    txt: "text",
  };
  const MODE = {
    html: "text/html",
    css: "text/css",
    javascript: "application/javascript",
    json: "application/json",
    php: "application/x-httpd-php",
    text: "text/plain",
  };
  app.lbCodeLangKey = function lbCodeLangKey(lang) {
    const k = String(lang || "")
      .toLowerCase()
      .trim();
    return LANG[k] || "text";
  };
  app.lbCodeLangOf = function lbCodeLangOf(k, def, s) {
    def = app.lbCtrlDef(def);
    if (def.language) return app.lbCodeLangKey(def.language);
    if (k === "custom_css" || k === "css") return "css";
    if (k === "html") return "html";
    s = s || (((app.selected && app.locate(app.state.root, app.selected)) || {}).node || {}).settings || {};
    if (def.language_setting && s[def.language_setting]) return app.lbCodeLangKey(s[def.language_setting]);
    if (s.language) return app.lbCodeLangKey(s.language);
    return "text";
  };
  app.lbCodeSettings = function lbCodeSettings(lang) {
    const map = app.D.codeEditor && typeof app.D.codeEditor === "object" ? app.D.codeEditor : {};
    const key = app.lbCodeLangKey(lang);
    return map[key] || map.css || map.html || null;
  };
  app.lbCodeHTML = function lbCodeHTML(k, def, v, label) {
    def = app.lbCtrlDef(def);
    const lang = app.lbCodeLangOf(k, def);
    const rows = Math.max(4, parseInt(def.rows, 10) || (lang === "css" ? 8 : 12));
    const l = label || def.label || k.replace(/_/g, " ");
    return `<div class="lb-control lb-code-editor" data-code-key="${app.esc(k)}" data-code-lang="${app.esc(lang)}"><span>${app.esc(l)}</span><textarea class="lb-code-textarea" data-code-setting="${app.esc(k)}" data-code-lang="${app.esc(lang)}" rows="${rows}" spellcheck="false">${app.esc(v || "")}</textarea></div>`;
  };
  app.lbCodeFlush = function lbCodeFlush(root) {
    const scope = root || document;
    scope.querySelectorAll("textarea.lb-code-textarea, textarea[data-lb-code]").forEach((ta) => {
      try {
        if (ta.__lbCm && ta.__lbCm.codemirror) ta.__lbCm.codemirror.save();
      } catch (e) {}
    });
  };
  app.lbCodeLiveCanvas = function lbCodeLiveCanvas(key, value) {
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return;
    if (typeof app.previewSetting === "function") {
      app.previewSetting(key, r.node.id);
      return;
    }
    const fd = app.frameDoc && app.frameDoc();
    const node = fd && fd.querySelector('.lb-node[data-id="' + CSS.escape(String(r.node.id)) + '"]');
    if (!node) return;
    if (key === "html") {
      const box = node.querySelector(".lb-html") || node;
      box.innerHTML = app.lbSanitizeHtml(value);
      return;
    }
    if (key === "code") {
      const code = node.querySelector(".lb-code code") || node.querySelector("code");
      if (code) code.textContent = value;
    }
  };
  app.lbMountCodeEditor = function lbMountCodeEditor(ta, lang, opts) {
    if (!ta || ta.__lbCm) return ta && ta.__lbCm;
    lang = app.lbCodeLangKey(lang || ta.getAttribute("data-code-lang") || ta.getAttribute("data-lb-code") || "text");
    ta.setAttribute("data-code-lang", lang);
    const wrap = ta.closest(".lb-control") || ta.parentElement;
    if (wrap && !wrap.classList.contains("lb-code-editor")) wrap.classList.add("lb-code-editor");
    const api = window.wp && wp.codeEditor;
    const base = app.lbCodeSettings(lang);
    if (api && typeof api.initialize === "function" && base) {
      const settings = JSON.parse(JSON.stringify(base));
      settings.codemirror = Object.assign({}, settings.codemirror || {}, {
        mode: MODE[lang] || "text/plain",
        inputStyle: "contenteditable",
        lineNumbers: true,
        lineWrapping: true,
      });
      if (opts && opts.height) settings.codemirror.viewportMargin = Infinity;
      try {
        const inst = api.initialize(ta, settings);
        ta.__lbCm = inst;
        const cm = inst && inst.codemirror;
        if (cm) {
          if (opts && opts.height) cm.setSize(null, opts.height);
          let started = false;
          cm.on("change", () => {
            cm.save();
            const key = ta.getAttribute("data-code-setting");
            if (!key) return;
            const r = app.selected && app.locate(app.state.root, app.selected);
            if (!r) return;
            if (!started) {
              app.commit();
              started = true;
            }
            app.setPath(r.node.settings, key, cm.getValue());
            app.dirty = true;
            app.scheduleSave();
            app.lbCodeLiveCanvas(key, cm.getValue());
          });
          cm.on("blur", () => {
            started = false;
          });
          const details = ta.closest("details");
          if (details)
            details.addEventListener("toggle", () => {
              if (details.open) setTimeout(() => cm.refresh(), 0);
            });
          setTimeout(() => cm.refresh(), 0);
        }
        return inst;
      } catch (e) {
        console.error("[Canvasly] code editor failed:", e);
      }
    }
    if (!ta.__lbFallback) {
      ta.__lbFallback = true;
      let started = false;
      ta.addEventListener("input", () => {
        const key = ta.getAttribute("data-code-setting");
        if (!key) return;
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        if (!started) {
          app.commit();
          started = true;
        }
        app.setPath(r.node.settings, key, ta.value);
        app.dirty = true;
        if (app.scheduleSave) app.scheduleSave();
        if (typeof app.previewSetting === "function") app.previewSetting(key, r.node.id);
        else app.lbCodeLiveCanvas(key, ta.value);
      });
      ta.addEventListener("change", () => {
        started = false;
      });
    }
    return null;
  };
  app.bindCodeEditors = function bindCodeEditors(root) {
    const scope = root || app.root || document;
    scope.querySelectorAll("textarea.lb-code-textarea, textarea[data-lb-code]").forEach((ta) => {
      const lang = ta.getAttribute("data-code-lang") || ta.getAttribute("data-lb-code") || "text";
      const tall = !!ta.closest(".lb-modal, .lb-modal-backdrop, .lb-ds-editor");
      app.lbMountCodeEditor(ta, lang, tall ? { height: 180 } : null);
    });
  };
  const oldControl = app.control;
  app.control = function controlCode(k, t3, v, label) {
    const def = app.lbCtrlDef(t3);
    if ((def.type || "text") === "code") return app.lbCodeHTML(k, def, v, label);
    return oldControl(k, t3, v, label);
  };
  const oldBind = app.bindRightPanel;
  app.bindRightPanel = function bindRightPanelCode() {
    oldBind();
    app.bindCodeEditors(app.root);
  };
  const oldBindModal = app.bindModal;
  app.bindModal = function bindModalCode() {
    oldBindModal();
    const host = document.querySelector(".lb-modal-backdrop");
    if (host) app.bindCodeEditors(host);
  };
  const oldSaveClass = app.lb110SaveClass;
  if (typeof oldSaveClass === "function") {
    app.lb110SaveClass = function lb110SaveClassCode(name) {
      app.lbCodeFlush(document);
      return oldSaveClass(name);
    };
  }
  const oldPage = app.openPageSettings;
  app.openPageSettings = function openPageSettingsCode() {
    oldPage();
    const ta = app.$("#lb-page-css");
    if (ta) {
      ta.classList.add("lb-code-textarea");
      ta.setAttribute("data-lb-code", "css");
      app.lbMountCodeEditor(ta, "css", { height: 220 });
    }
    app.$("#lb-page-save")?.addEventListener("click", () => app.lbCodeFlush(document), true);
  };
  const oldSave = app.save;
  app.save = async function saveCode(auto) {
    app.lbCodeFlush(document);
    return oldSave(auto);
  };
}

export { installCodeControl };
