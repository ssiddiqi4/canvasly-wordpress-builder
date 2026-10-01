import { app } from "./app.js";
function installTemplates() {
  app.lb106TinyMCECleanup = function lb106TinyMCECleanup(id) {
    const api = window.wp?.oldEditor || window.wp?.editor;
    try {
      if (api && typeof api.remove === "function") api.remove(id);
    } catch (e) {}
    const ed = window.tinymce?.get?.(id);
    if (ed) {
      try {
        ed.save();
        ed.remove();
      } catch (e) {}
    }
  };
  app.lb106ActiveTinyMCE = null;
  app.lb106OldCloseModal = app.closeModal;
  app.closeModal = function () {
    if (app.lb106ActiveTinyMCE) {
      app.lb106TinyMCECleanup(app.lb106ActiveTinyMCE);
      app.lb106ActiveTinyMCE = null;
    }
    app.lb106OldCloseModal();
  };
  app.lb106EnsureSkin = function lb106EnsureSkin() {
    const href = String(app.D.tinymceSkinUrl || "").trim();
    if (!href || document.getElementById("lb-tinymce-skin")) return;
    const link = document.createElement("link");
    link.id = "lb-tinymce-skin";
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  };
  app.lb106LoadTinyMCE = function lb106LoadTinyMCE() {
    return new Promise((resolve, reject) => {
      if (window.tinymce?.init) {
        resolve();
        return;
      }
      const base = String(app.D.tinymceBaseUrl || "").replace(/\/$/, "");
      if (!base) {
        reject(new Error("TinyMCE URL missing"));
        return;
      }
      const trySrc = (src, next) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () =>
          window.tinymce?.init ? resolve() : next ? next() : reject(new Error("TinyMCE failed to load"));
        s.onerror = () => (next ? next() : reject(new Error("TinyMCE failed to load")));
        document.head.appendChild(s);
      };
      trySrc(base + "/wp-tinymce.js", () => trySrc(base + "/tinymce.min.js", null));
    });
  };
  app.lb106RteContent = function lb106RteContent(overlay, editorId) {
    const ed = window.tinymce?.get?.(editorId);
    if (ed) {
      try {
        return ed.getContent();
      } catch (e) {}
    }
    const visual = overlay.querySelector(".lb-rte-visual");
    if (visual) return visual.innerHTML;
    const ta = overlay.querySelector("#" + editorId);
    return ta ? ta.value : "";
  };
  app.lb106InsertHtml = function lb106InsertHtml(overlay, editorId, html) {
    const ed = window.tinymce?.get?.(editorId);
    if (ed) {
      ed.execCommand("mceInsertContent", false, html);
      return;
    }
    const visual = overlay.querySelector(".lb-rte-visual");
    if (visual) {
      visual.focus();
      try {
        document.execCommand("insertHTML", false, html);
      } catch (e) {
        visual.insertAdjacentHTML("beforeend", html);
      }
      return;
    }
    const ta = overlay.querySelector("#" + editorId);
    if (ta) ta.value += html;
  };
  app.lb106BindRteBar = function lb106BindRteBar(overlay) {
    const visual = overlay.querySelector(".lb-rte-visual");
    const bar = overlay.querySelector(".lb-rte-bar");
    if (!visual || !bar) return;
    bar.addEventListener("mousedown", (e) => {
      const btn = e.target.closest("[data-cmd]");
      if (!btn) return;
      e.preventDefault();
      visual.focus();
      const cmd = btn.dataset.cmd,
        val = btn.dataset.val || null;
      if (cmd === "formatBlock")
        document.execCommand("formatBlock", false, val && val.charAt(0) === "<" ? val : "<" + val + ">");
      else if (cmd === "createLink") {
        const url = window.prompt(app.t("Link URL"), "https://");
        if (url) document.execCommand("createLink", false, url);
      } else document.execCommand(cmd, false, val);
    });
  };
  app.lb106TinyReady = function lb106TinyReady(overlay, editorId) {
    const bar = overlay.querySelector(".lb-rte-bar");
    if (bar) bar.hidden = true;
    const visual = overlay.querySelector(".lb-rte-visual");
    if (visual) visual.dataset.lbTinyReady = "1";
    overlay.classList.add("is-lb-mce");
  };
  app.lb106InitTinyMCE = function lb106InitTinyMCE(overlay, editorId) {
    const visual = overlay.querySelector(".lb-rte-visual");
    if (!visual || !window.tinymce?.init) return Promise.resolve(false);
    visual.id = editorId;
    app.lb106EnsureSkin();
    const base = String(app.D.tinymceBaseUrl || "").replace(/\/$/, "");
    const setup = (ed) => ed.on("init", () => app.lb106TinyReady(overlay, editorId));
    const common = {
      selector: "#" + editorId,
      inline: true,
      menubar: false,
      branding: false,
      elementpath: false,
      statusbar: false,
      relative_urls: false,
      convert_urls: false,
      browser_spellcheck: true,
      forced_root_block: "p",
      theme: "modern",
      skin: "lightgray",
      setup,
    };
    if (base) {
      common.base_url = base;
      common.suffix = ".min";
    }
    const tries = [
      Object.assign({}, common, {
        plugins: "lists link paste textcolor colorpicker",
        toolbar:
          "formatselect | bold italic underline strikethrough | bullist numlist | alignleft aligncenter alignright | link unlink | undo redo",
      }),
      Object.assign({}, common, {
        plugins: "",
        toolbar: "bold italic underline | alignleft aligncenter alignright | undo redo",
      }),
    ];
    const run = (i) =>
      new Promise((resolve) => {
        if (i >= tries.length) {
          resolve(false);
          return;
        }
        try {
          app.lb106TinyMCECleanup(editorId);
        } catch (e) {}
        try {
          window.tinymce.init(tries[i]);
        } catch (e) {
          run(i + 1).then(resolve);
          return;
        }
        setTimeout(() => {
          if (window.tinymce?.get?.(editorId)) {
            app.lb106TinyReady(overlay, editorId);
            resolve(true);
            return;
          }
          run(i + 1).then(resolve);
        }, 450);
      });
    return run(0);
  };
  app.openTinyMCEEditor = function openTinyMCEEditor(id = app.selected) {
    const r = id && app.locate(app.state.root, id);
    if (!r || r.node.type !== "tinymce_text_editor") return;
    app.closeModal();
    const editorId = "lb-tinymce-editor-" + String(r.node.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const current = String(r.node.settings?.content ?? "<p>Start writing your content here.</p>");
    const overlay = document.createElement("div");
    overlay.className = "lb-rte-overlay";
    overlay.innerHTML = `<div class="lb-rte-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-rte-title">
  <div class="lb-rte-head">
   <strong id="lb-rte-title">TinyMCE Text Editor</strong>
   <button type="button" class="lb-rte-close" aria-label="${app.t("Close")}">\xD7</button>
  </div>
  <div class="lb-rte-body">
   <p class="lb-rte-intro">Edit this content in the visual editor. Changes apply to the Sidcraft Syntex unit when you click <strong>Save Content</strong>.</p>
   <div class="lb-rte-tools"><button type="button" class="lb-btn" data-rte-media>Add Media</button></div>
   <div class="lb-rte-bar" role="toolbar" aria-label="Formatting">
    <button type="button" data-cmd="formatBlock" data-val="p" title="Paragraph">P</button>
    <button type="button" data-cmd="formatBlock" data-val="h2" title="Heading 2">H2</button>
    <button type="button" data-cmd="formatBlock" data-val="h3" title="Heading 3">H3</button>
    <span class="lb-rte-sep"></span>
    <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
    <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
    <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
    <button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
    <span class="lb-rte-sep"></span>
    <button type="button" data-cmd="insertUnorderedList" title="Bulleted list">\u2022 List</button>
    <button type="button" data-cmd="insertOrderedList" title="Numbered list">1. List</button>
    <span class="lb-rte-sep"></span>
    <button type="button" data-cmd="justifyLeft" title="Align left">Left</button>
    <button type="button" data-cmd="justifyCenter" title="Align center">Center</button>
    <button type="button" data-cmd="justifyRight" title="Align right">Right</button>
    <span class="lb-rte-sep"></span>
    <button type="button" data-cmd="createLink" title="Insert link">Link</button>
    <button type="button" data-cmd="unlink" title="Remove link">Unlink</button>
    <button type="button" data-cmd="removeFormat" title="Clear formatting">Clear</button>
   </div>
   <div class="lb-rte-visual" id="${app.esc(editorId)}" contenteditable="true" spellcheck="true"></div>
  </div>
  <div class="lb-rte-foot">
   <button type="button" class="lb-btn" data-rte-cancel>Cancel</button>
   <button type="button" class="lb-btn primary" data-rte-save>Save Content</button>
  </div>
 </div>`;
    document.body.appendChild(overlay);
    app.lb106ActiveTinyMCE = editorId;
    const visual = overlay.querySelector(".lb-rte-visual");
    visual.innerHTML = current || "<p>Start writing your content here.</p>";
    app.lb106BindRteBar(overlay);
    const dismiss = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      app.closeModal();
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) dismiss(e);
    });
    overlay.querySelector(".lb-rte-close").addEventListener("click", dismiss);
    overlay.querySelector("[data-rte-cancel]").addEventListener("click", dismiss);
    overlay.querySelector("[data-rte-save]").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = app.locate(app.state.root, id);
      if (!target) return;
      app.commit();
      target.node.settings.content = app.lb106RteContent(overlay, editorId);
      app.closeModal();
      app.render();
    });
    overlay.querySelector("[data-rte-media]").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.wp?.media) return;
      const f = wp.media({ title: "Add Media", button: { text: "Insert into content" }, multiple: true });
      f.on("select", () => {
        const html = (f.state().get("selection").toJSON() || [])
          .map((a) => {
            const url = a.url || "";
            const isImg = a.type === "image" || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(url);
            return isImg
              ? '<p><img src="' + app.esc(url) + '" alt="' + app.esc(a.alt || "") + '" /></p>'
              : '<p><a href="' + app.esc(url) + '">' + app.esc(a.title || a.filename || url) + "</a></p>";
          })
          .join("");
        app.lb106InsertHtml(overlay, editorId, html);
      });
      f.open();
    });
    overlay.querySelector(".lb-rte-dialog").addEventListener("click", (e) => e.stopPropagation());
    setTimeout(() => {
      app
        .lb106LoadTinyMCE()
        .then(() => app.lb106InitTinyMCE(overlay, editorId))
        .catch(() => {});
      visual.focus();
    }, 30);
  };
  app.lb106OldBody = app.bodyHTML;
  app.bodyHTML = function (n) {
    if (n.type === "tinymce_text_editor") {
      const s = n.settings || {},
        st = app.styleInline(n),
        html = s.content || "<p>Start writing your content here.</p>";
      return `<div class="lb-tinymce-preview" style="${st}">${html}</div>`;
    }
    return app.lb106OldBody(n);
  };
  app.lb106OldBindFrame = app.bindFrame;
  app.bindFrame = function () {
    app.lb106OldBindFrame();
    const fd = app.frameDoc();
    if (!fd) return;
    fd.querySelectorAll('.lb-node[data-type="tinymce_text_editor"]').forEach((n) => {
      if (n.dataset.lb106TinyBound === "1") return;
      n.dataset.lb106TinyBound = "1";
      n.ondblclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.openTinyMCEEditor(n.dataset.id);
      };
    });
  };
  app.lb106OldSettingsHTML = app.settingsHTML;
  app.settingsHTML = function () {
    if (app.selected) {
      const r = app.locate(app.state.root, app.selected);
      if (r?.node?.type === "tinymce_text_editor" && app.styleTab === "content") {
        const s = r.node.settings || {};
        const preview = (s.content || "<p>Start writing your content here.</p>")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        let h = `<div class="lb-selection-head"><strong>TinyMCE Text Editor</strong><span class="lb-selection-id">${app.esc(r.node.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
        h += app.lb09Section(
          app.t("Content"),
          `<div class="lb-tinymce-setting-preview">${app.esc(preview || "No content")}</div><button type="button" class="lb-btn primary lb-tinymce-open" id="lb-tinymce-open">Edit with TinyMCE</button>`,
          true,
        );
        h += `<div class="lb-action-grid"><button class="lb-btn" id="lb-duplicate">${app.t("Duplicate")}</button><button class="lb-btn danger" id="lb-delete">${app.t("Delete")}</button></div>`;
        return h;
      }
    }
    return app.lb106OldSettingsHTML();
  };
  app.lb106OldBindFeatureUI = app.lb010BindFeatureUI;
  app.lb010BindFeatureUI = function () {
    app.lb106OldBindFeatureUI();
    app.root.querySelector("#lb-tinymce-open")?.addEventListener("click", () => app.openTinyMCEEditor(app.selected));
  };
  app.lb110ComponentEdit = null;
  app.lb110ClassData = function lb110ClassData() {
    return app.D.classes && typeof app.D.classes === "object" ? app.D.classes : {};
  };
  app.lb110ClassNames = function lb110ClassNames() {
    return Object.keys(app.lb110ClassData());
  };
  app.lb110ClassDecl = function lb110ClassDecl(c) {
    if (typeof c === "string") return c;
    return c?.base || "";
  };
  app.lb110ClassInheritedCss = function lb110ClassInheritedCss(name, seen = /* @__PURE__ */ new Set()) {
    const all = app.lb110ClassData(),
      d = all[name];
    if (!d || seen.has(name)) return "";
    seen.add(name);
    let out = "";
    for (const p of d.extends || []) out += lb110ClassInheritedCss(p, seen);
    out += app.lb110ClassDecl(d);
    return out;
  };
  app.lb110DesignCss = function lb110DesignCss() {
    const v = app.D.variables || {},
      out = [];
    const rootVars = [];
    Object.entries(v.colors || {}).forEach(([k, x]) => rootVars.push(`--lb-color-${k}:${x};`));
    Object.entries(v.sizes || {}).forEach(([k, x]) => rootVars.push(`--lb-size-${k}:${x};`));
    Object.entries(v.fonts || {}).forEach(([k, x]) => {
      if (x) rootVars.push(`--lb-font-${k}:${x};`);
    });
    Object.entries(v.effects || {}).forEach(([k, x]) => rootVars.push(`--lb-effect-${k}:${x};`));
    Object.entries(v.custom || {}).forEach(([g, items]) =>
      Object.entries(items || {}).forEach(([k, item]) =>
        rootVars.push(`--lb-${g}-${k}:${typeof item === "object" ? item.value || "" : item};`),
      ),
    );
    if (rootVars.length) out.push(":root{" + rootVars.join("") + "}");
    const all = app.lb110ClassData();
    for (const [name, d0] of Object.entries(all)) {
      const d = typeof d0 === "string" ? { base: d0 } : d0 || {};
      const states = { base: "", hover: ":hover", focus: ":focus", active: ":active", focus_visible: ":focus-visible" };
      for (const [st, suffix] of Object.entries(states)) {
        let decl = "";
        const seen = /* @__PURE__ */ new Set();
        const walk = (n) => {
          if (seen.has(n)) return;
          seen.add(n);
          const x = all[n];
          if (!x) return;
          (x.extends || []).forEach(walk);
          decl += typeof x === "string" ? (st === "base" ? x : "") : x[st] || "";
        };
        walk(name);
        if (decl.trim()) out.push(`.lb-class-${name}${suffix}{${decl}}`);
      }
    }
    return out.join("");
  };
  app.lb110RefreshDesignData = async function lb110RefreshDesignData(doRender = false) {
    try {
      const r = await fetch(`${app.D.api}/design-system`, { headers: { "X-WP-Nonce": app.D.nonce } });
      if (r.ok) {
        const d = await r.json();
        app.D.classes = d.classes || {};
        app.D.variables = d.variables || {};
        app.D.designSystem = d;
        app.D.designCss = app.lb110DesignCss();
        if (doRender) app.render();
      }
    } catch (e) {}
  };
  app.openClassManager110 = function () {
    app.showModal(
      app.t("Global Classes"),
      `<p class="lb-muted">${app.t("Global classes with custom CSS are no longer available. Style units with their own controls, or use XEditor classes.")}</p>`,
    );
  };
  app.lb110ClassControl = function lb110ClassControl(n) {
    return app.lb09Section(
      app.t("Variable Reference"),
      `<label class="lb-control"><span>Variable Reference</span><input id="lb-ds-variable-ref" placeholder="{{var:colors.primary}}" value="${app.esc(n.settings?.variable_ref || "")}"></label><p class="lb-muted">Use token references such as <code>{{var:colors.primary}}</code> in supported style fields.</p>`,
      false,
    );
  };
  app.lb110BindClassControl = function lb110BindClassControl() {
    app.root.querySelectorAll("[data-lb-class-check]").forEach(
      (x) =>
        (x.onchange = () => {
          const names = [...app.root.querySelectorAll("[data-lb-class-check]:checked")].map(
            (b) => b.dataset.lbClassCheck,
          );
          app.update("global_class", names.join(" "));
        }),
    );
    app.root.querySelector("#lb-ds-manage-classes")?.addEventListener("click", app.openClassManager110);
    app.root
      .querySelector("#lb-ds-variable-ref")
      ?.addEventListener("change", (e) => app.update("variable_ref", e.target.value));
  };
  app.lb110VariableManager = function lb110VariableManager() {
    const v = app.D.variables || {},
      groups = ["colors", "sizes", "fonts", "effects"];
    const sections = groups
      .map(
        (g) =>
          `<div class="lb-ds-variable-group"><h4>${app.esc(g)}</h4>${Object.entries(v[g] || {})
            .map(
              ([k, val]) =>
                `<label><span>${app.esc(k)}</span><input data-lb-var-group="${app.esc(g)}" data-lb-var-name="${app.esc(k)}" value="${app.esc(val)}" ${g === "colors" ? 'type="color"' : ""}></label>`,
            )
            .join("")}</div>`,
      )
      .join("");
    const custom = Object.entries(v.custom || {})
      .flatMap(([g, items]) =>
        Object.entries(items || {}).map(
          ([k, item]) =>
            `<label><span>${app.esc(g)}.${app.esc(k)}</span><input data-lb-custom-value="${app.esc(g)}.${app.esc(k)}" value="${app.esc(typeof item === "object" ? item.value || "" : item)}"></label>`,
        ),
      )
      .join("");
    app.showModal(
      app.t("Global Variables 2.0"),
      `<p class="lb-muted">Variables are emitted as CSS custom properties and can be used by classes or instance styles. Reference them as <code>{{var:colors.primary}}</code>.</p><div class="lb-ds-variable-grid">${sections}</div><div class="lb-ds-variable-group"><h4>Custom Tokens</h4><div id="lb-ds-custom-list">${custom || '<span class="lb-muted">No custom tokens.</span>'}</div><div class="lb-form-row"><input id="lb-ds-custom-group" placeholder="group"><input id="lb-ds-custom-name" placeholder="token-name"><input id="lb-ds-custom-value" placeholder="value"><button class="lb-btn" id="lb-ds-custom-add">${app.t("Add")}</button></div></div><div class="lb-ds-actions"><button class="lb-btn primary" id="lb-ds-vars-save">Save Variables</button></div>`,
      () => {
        app.$("#lb-ds-custom-add")?.addEventListener("click", () => {
          const g = app.$("#lb-ds-custom-group")?.value.trim(),
            n = app.$("#lb-ds-custom-name")?.value.trim(),
            val = app.$("#lb-ds-custom-value")?.value;
          if (!g || !n) return;
          v.custom = v.custom || {};
          v.custom[g] = v.custom[g] || {};
          v.custom[g][n] = { value: val, type: "text", label: n };
          app.closeModal();
          app.openVariables110();
        });
        app.$("#lb-ds-vars-save")?.addEventListener("click", async () => {
          for (const el of app.root.querySelectorAll("[data-lb-var-group]")) {
            const g = el.dataset.lbVarGroup,
              n = el.dataset.lbVarName;
            v[g] = v[g] || {};
            v[g][n] = el.value;
          }
          for (const el of app.root.querySelectorAll("[data-lb-custom-value]")) {
            const [g, n] = el.dataset.lbCustomValue.split(".");
            v.custom = v.custom || {};
            v.custom[g] = v.custom[g] || {};
            v.custom[g][n] =
              typeof v.custom[g][n] === "object"
                ? { ...v.custom[g][n], value: el.value }
                : { value: el.value, type: "text", label: n };
          }
          const r = await fetch(`${app.D.api}/variables`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
            body: JSON.stringify(v),
          });
          if (r.ok) {
            app.D.variables = await r.json();
            app.D.designCss = app.lb110DesignCss();
            app.closeModal();
            app.render();
          }
        });
      },
    );
  };
  app.openVariables110 = app.lb110VariableManager;
  app.lb110ComponentNodes = function lb110ComponentNodes(doc) {
    const out = [];
    const walk = (nodes, path = "") =>
      (nodes || []).forEach((n, i) => {
        const p = path ? path + "/" + i : String(i);
        out.push({ node: n, path: p });
        walk(n.children, p);
      });
    walk(doc?.root || []);
    return out;
  };
  app.lb110ExposedEditor = function lb110ExposedEditor(c) {
    const nodes = app.lb110ComponentNodes(c.document),
      existing = {};
    (c.exposed || []).forEach((x) => (existing[x.name] = x));
    const rows = [];
    for (const x of nodes) {
      Object.entries(x.node.settings || {}).forEach(([k, v]) => {
        if (["css_id", "css_class", "global_class", "custom_css", "component_id", "overrides"].includes(k)) return;
        const name = existing[`${x.path}_${k}`]?.name || `${x.path}_${k}`;
        const label = existing[name]?.label || `${app.meta(x.node.type).title || x.node.type}: ${k.replace(/_/g, " ")}`;
        const type =
          typeof v === "number"
            ? "number"
            : typeof v === "boolean"
              ? "switch"
              : String(v).length > 120
                ? "textarea"
                : "text";
        rows.push(
          `<label class="lb-ds-exposed-row"><input type="checkbox" data-lb-expose="${app.esc(name)}" data-lb-expose-path="${app.esc(x.path)}" data-lb-expose-setting="${app.esc(k)}" ${existing[name] ? "checked" : ""}><span><strong>${app.esc(label)}</strong><small>${app.esc(x.path)} \xB7 ${app.esc(k)}</small></span></label>`,
        );
      });
    }
    return `<div class="lb-ds-exposed-list">${rows.join("") || '<p class="lb-muted">No editable settings found.</p>'}</div>`;
  };
  app.lb110SaveComponentDefinition = async function lb110SaveComponentDefinition(c) {
    const exposed = [...app.root.querySelectorAll("[data-lb-expose]:checked")].map((x) => ({
      name: x.dataset.lbExpose,
      path: x.dataset.lbExposePath,
      setting: x.dataset.lbExposeSetting,
      label: x.parentElement?.querySelector("strong")?.textContent || x.dataset.lbExpose,
      type: "text",
    }));
    const title = app.root.querySelector("#lb-comp-title")?.value || c.title;
    const r = await fetch(`${app.D.api}/components/${c.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ title, document: c.document, exposed }),
    });
    if (!r.ok) {
      alert(app.t("Could not save component."));
      return;
    }
    await app.lb110RefreshDesignData();
    app.closeModal();
    app.openComponentLibrary110();
  };
  app.lb110EditComponentDefinition = async function lb110EditComponentDefinition(id) {
    app.closeModal();
    const r = await fetch(`${app.D.api}/components/${id}`, { headers: { "X-WP-Nonce": app.D.nonce } });
    if (!r.ok) return;
    const c = await r.json();
    app.showModal(
      app.t("Edit Component"),
      `<label class="lb-control"><span>Component Name</span><input id="lb-comp-title" value="${app.esc(c.title)}"></label><p class="lb-muted">Choose which component settings become exposed properties. Every page instance can override these values independently.</p>${app.lb110ExposedEditor(c)}<div class="lb-ds-actions"><button class="lb-btn primary" id="lb-comp-save-def">${app.t("Save Component")}</button></div>`,
      () => app.$("#lb-comp-save-def")?.addEventListener("click", () => app.lb110SaveComponentDefinition(c)),
    );
  };
  app.lb110EnterComponentEdit = async function lb110EnterComponentEdit(id) {
    const r = await fetch(`${app.D.api}/components/${id}`, { headers: { "X-WP-Nonce": app.D.nonce } });
    if (!r.ok) return;
    const c = await r.json();
    if (
      app.dirty &&
      !confirm(
        "Your current page has unsaved changes. Continue editing the component? The page changes remain in memory until you return.",
      )
    )
      return;
    app.lb110ComponentEdit = {
      id: c.id,
      title: c.title,
      key: c.key || "",
      exposed: c.exposed || [],
      pageState: JSON.parse(JSON.stringify(app.state)),
      pageSelected: app.selected,
      pageDirty: app.dirty,
      componentVersion: c.version,
    };
    app.state = JSON.parse(JSON.stringify(c.document || { version: "2.1", root: [], settings: {} }));
    app.selected = null;
    app.history = [];
    app.future = [];
    app.dirty = false;
    app.closeModal();
    app.render();
  };
  app.lb110SaveComponentEdit = async function lb110SaveComponentEdit() {
    if (!app.lb110ComponentEdit) return;
    const payload = {
      title: app.lb110ComponentEdit.title,
      document: app.state,
      exposed: app.lb110ComponentEdit.exposed,
    };
    const r = await fetch(`${app.D.api}/components/${app.lb110ComponentEdit.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      alert(app.t("Component could not be saved."));
      return;
    }
    const old = app.lb110ComponentEdit;
    app.lb110ComponentEdit = null;
    app.state = old.pageState;
    app.selected = old.pageSelected;
    app.dirty = old.pageDirty;
    await app.lb110RefreshDesignData();
    app.render();
    alert(app.t("Component saved. All instances will use the updated component definition."));
  };
  app.lb110CancelComponentEdit = function lb110CancelComponentEdit() {
    if (!app.lb110ComponentEdit) return;
    const old = app.lb110ComponentEdit;
    app.lb110ComponentEdit = null;
    app.state = old.pageState;
    app.selected = old.pageSelected;
    app.dirty = old.pageDirty;
    app.render();
  };
  app.openComponentLibrary110 = function openComponentLibrary110() {
    fetch(`${app.D.api}/components`, { headers: { "X-WP-Nonce": app.D.nonce } })
      .then((r) => r.json())
      .then((items) =>
        app.showModal(
          app.t("Components 2.0"),
          `<p class="lb-muted">Edit the source component once and all page instances automatically use the latest definition. Exposed properties allow per-instance overrides.</p><div class="lb-library-list">${items.length ? items.map((i) => `<div class="lb-library-row"><div><strong>${app.esc(i.title)}</strong><small class="lb-ds-meta">v${app.esc(i.version)} \xB7 ${(i.exposed || []).length} exposed properties</small></div><button class="lb-btn" data-comp-insert="${i.id}">${app.t("Insert")}</button><button class="lb-btn" data-comp-edit="${i.id}">Properties</button><button class="lb-btn" data-comp-structure="${i.id}">Edit Structure</button><button class="lb-btn" data-comp-dup="${i.id}">${app.t("Duplicate")}</button><button class="lb-btn danger" data-comp-del="${i.id}">${app.t("Delete")}</button></div>`).join("") : '<p class="lb-muted">No components saved yet.</p>'}</div>`,
          () => {
            app.$$("[data-comp-insert]").forEach((b) => (b.onclick = () => app.loadComponent(b.dataset.compInsert)));
            app
              .$$("[data-comp-edit]")
              .forEach((b) => (b.onclick = () => app.lb110EditComponentDefinition(b.dataset.compEdit)));
            app
              .$$("[data-comp-structure]")
              .forEach((b) => (b.onclick = () => app.lb110EnterComponentEdit(b.dataset.compStructure)));
            app.$$("[data-comp-dup]").forEach(
              (b) =>
                (b.onclick = async () => {
                  await fetch(`${app.D.api}/components/${b.dataset.compDup}/duplicate`, {
                    method: "POST",
                    headers: { "X-WP-Nonce": app.D.nonce },
                  });
                  app.closeModal();
                  openComponentLibrary110();
                }),
            );
            app.$$("[data-comp-del]").forEach(
              (b) =>
                (b.onclick = async () => {
                  if (!confirm("Delete this component? Existing instances will show a missing component placeholder."))
                    return;
                  await fetch(`${app.D.api}/components/${b.dataset.compDel}`, {
                    method: "DELETE",
                    headers: { "X-WP-Nonce": app.D.nonce },
                  });
                  app.closeModal();
                  openComponentLibrary110();
                }),
            );
          },
        ),
      );
  };
  app.lb110ComponentControl = function lb110ComponentControl(n) {
    const comps = Array.isArray(app.D.designSystem?.components) ? app.D.designSystem.components : [];
    const s = n.settings || {},
      c = comps.find((x) => Number(x.id) === Number(s.component_id));
    let fields = "";
    if (c) {
      fields =
        (c.exposed || [])
          .map((x) => {
            const v = s.overrides?.[x.name] ?? "";
            return `<label class="lb-control"><span>${app.esc(x.label || x.name)}</span><input data-lb-comp-override="${app.esc(x.name)}" value="${app.esc(v)}" placeholder="${app.esc(x.name)}"></label>`;
          })
          .join("") || '<p class="lb-muted">This component has no exposed properties.</p>';
    }
    return app.lb09Section(
      app.t("Component"),
      `<label class="lb-control"><span>Component</span><select id="lb-component-select"><option value="0">Select component</option>${comps.map((x) => `<option value="${x.id}" ${Number(x.id) === Number(s.component_id) ? "selected" : ""}>${app.esc(x.title)}</option>`).join("")}</select></label>${fields}<button class="lb-btn" id="lb-component-library-open">Manage Components</button>`,
      true,
    );
  };
  app.lb110BindComponentControl = function lb110BindComponentControl() {
    app.root.querySelector("#lb-component-select")?.addEventListener("change", (e) => {
      app.update("component_id", Number(e.target.value || 0));
    });
    app.root.querySelectorAll("[data-lb-comp-override]").forEach((x) =>
      x.addEventListener("change", (e) => {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        const o = { ...(r.node.settings.overrides || {}) };
        o[e.target.dataset.lbCompOverride] = e.target.value;
        app.update("overrides", o);
      }),
    );
    app.root.querySelector("#lb-component-library-open")?.addEventListener("click", app.openComponentLibrary110);
  };
  app.lb110InjectEditorClasses = function lb110InjectEditorClasses(n, html) {
    const names = String(n.settings?.global_class || "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((x) => "lb-class-" + x.replace(/[^a-zA-Z0-9_-]/g, ""))
      .join(" ");
    if (!names || !html) return html;
    return html.replace(/^(\s*<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>)/, (m, tag) => {
      if (/class=\"[^\"]*\"/.test(tag)) return tag.replace(/class=\"([^\"]*)\"/, (_, c) => `class="${c} ${names}"`);
      return tag.replace(/^(<[^\s>]+)/, `$1 class="${names}"`);
    });
  };
  app.lb110PreviousBody = app.bodyHTML;
  app.bodyHTML = function (n) {
    return app.lb110InjectEditorClasses(n, app.lb110PreviousBody(n));
  };
  app.lb110AtomicSection = function lb110AtomicSection(n) {
    const isXe = /^xe_/.test(String(n.type || ""));
    return app.lb09Section(
      app.t("XEditor"),
      `<div class="lb-atomic-badge">${isXe ? app.t("XEditor element") : app.t("Classic unit")}</div><p class="lb-muted">${app.esc(isXe ? app.t("This element prints one HTML element. Style it with stacked classes from the XEditor Classes manager; local styles never override a class.") : app.t("Classic units can also stack XEditor classes. Insert XEditor elements from the XEditor menu in the top bar."))}</p><label class="lb-control lb-switch"><input type="checkbox" id="lb-css-first-mode" ${n.settings?.class_mode === "class-first" ? "checked" : ""}><span>${app.t("CSS-first class styling")}</span></label>`,
      false,
    );
  };
  app.lb010Atomic = app.lb110AtomicSection;
  app.lb110BaseSettings = app.settingsHTML;
  app.settingsHTML = function () {
    if (!app.selected) return app.lb110BaseSettings();
    const r = app.locate(app.state.root, app.selected);
    if (!r) return app.lb110BaseSettings();
    let h = app.lb110BaseSettings();
    if (app.styleTab === "advanced") h += app.lb110ClassControl(r.node);
    if (r.node.type === "component" && app.styleTab === "content") h += app.lb110ComponentControl(r.node);
    return h;
  };
  app.lb110BaseFeatureBind = app.lb010BindFeatureUI;
  app.lb010BindFeatureUI = function () {
    app.lb110BaseFeatureBind();
    app.lb110BindClassControl();
    app.lb110BindComponentControl();
    app.root.querySelector("#lb-convert-atomic")?.addEventListener("click", () => {
      const r = app.selected && app.locate(app.state.root, app.selected),
        sel2 = app.root.querySelector("#lb-atomic-type");
      if (!r || !sel2 || !app.meta(sel2.value).type) return;
      app.commit();
      r.node.type = sel2.value;
      r.node.atomic = true;
      r.node.settings = { ...app.defaults(sel2.value), ...r.node.settings };
      app.selected = r.node.id;
      app.render();
    });
    app.root
      .querySelector("#lb-css-first-mode")
      ?.addEventListener("change", (e) => app.update("class_mode", e.target.checked ? "class-first" : "inline"));
  };
  app.lb110OriginalSave = app.save;
  app.save = async function (auto) {
    if (app.lb110ComponentEdit) return;
    return app.lb110OriginalSave(auto);
  };
  app.lb110OriginalSchedule = app.scheduleSave;
  app.scheduleSave = function () {
    if (app.lb110ComponentEdit) {
      clearTimeout(app.saveTimer);
      return;
    }
    return app.lb110OriginalSchedule();
  };
  app.lb110BaseRender = app.render;
  app.render = function () {
    app.lb110BaseRender();
    if (app.lb110ComponentEdit) {
      const top = app.root.querySelector(".lb-top");
      if (top && !top.querySelector("#lb-component-edit-cancel")) {
        const brand = top.querySelector(".lb-brand-button");
        if (brand && !brand.querySelector(".lb-component-edit-badge"))
          brand.insertAdjacentHTML(
            "beforeend",
            '<span class="lb-component-edit-badge">' + app.t("Editing Component") + "</span>",
          );
        const saveBtn = top.querySelector("#lb-save");
        if (saveBtn) {
          saveBtn.textContent = app.t("Save Component");
          saveBtn.onclick = app.lb110SaveComponentEdit;
        }
        const cancel = document.createElement("button");
        cancel.className = "lb-btn danger";
        cancel.id = "lb-component-edit-cancel";
        cancel.textContent = app.t("Exit Component");
        top.insertBefore(cancel, saveBtn);
        cancel.onclick = app.lb110CancelComponentEdit;
      }
    }
  };
  app.lb110OldClassOpen = app.openClassManager;
  app.openClassManager = app.openClassManager110;
  app.lb110OldVarOpen = app.openVariables;
  app.openVariables = app.openVariables110;
  app.lb110OldCompOpen = app.openComponentLibrary;
  app.openComponentLibrary = app.openComponentLibrary110;
  app.saveComponent = async function () {
    if (!app.selected) return;
    const r = app.locate(app.state.root, app.selected);
    if (!r) return;
    const title = prompt(app.t("Component name:"), app.t("%s Component", app.meta(r.node.type).title));
    if (!title) return;
    const source = app.clone(r.node),
      document2 = { version: "2.1", root: [source], settings: {}, atomic: true };
    const exposed = Object.entries(source.settings || {})
      .filter(([k]) => !["css_id", "css_class", "global_class", "custom_css", "component_id", "overrides"].includes(k))
      .map(([k, v]) => ({
        name: "0_" + k,
        path: "0",
        setting: k,
        label: `${app.meta(source.type).title || source.type}: ${k.replace(/_/g, " ")}`,
        type: typeof v === "number" ? "number" : typeof v === "boolean" ? "switch" : "text",
      }));
    const resp = await fetch(`${app.D.api}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ title, document: document2, exposed }),
    });
    if (!resp.ok) {
      alert(app.t("Could not save component."));
      return;
    }
    await app.lb110RefreshDesignData();
    app.openComponentLibrary110();
  };
  app.lb010OpenDesignSystem = async function () {
    await app.lb110RefreshDesignData(false);
    app.showModal(
      app.t("Design System 2.0"),
      `<div class="lb-ds-overview"><div><strong>${app.t("Classes")}</strong><span>${app.lb110ClassNames().length}</span></div><div><strong>${app.t("Variables")}</strong><span>${Object.values(app.D.variables || {}).reduce((n, x) => n + (x && typeof x === "object" ? Object.keys(x).length : 0), 0)}</span></div><div><strong>${app.t("Components")}</strong><span>${(app.D.designSystem?.components || []).length}</span></div><div><strong>Atomic types</strong><span>${Object.keys(app.D.atomicTypes || {}).length}</span></div></div><div class="lb-ds-actions"><button class="lb-btn" id="lb-ds-manage-classes-main">Global Classes</button><button class="lb-btn" id="lb-ds-manage-vars-main">Global Variables</button><button class="lb-btn" id="lb-ds-manage-components-main">${app.t("Components")}</button><button class="lb-btn" id="lb-ds-export-main">${app.t("Export Design System")}</button><select id="lb-ds-import-mode"><option value="merge">Merge on import</option><option value="replace">Replace classes/variables</option></select><button class="lb-btn" id="lb-ds-import-main">${app.t("Import Design System")}</button><input id="lb-ds-import-file-main" type="file" accept="application/json" hidden></div><p class="lb-muted">Design-system exports include variables, classes with inheritance, components with exposed properties, global settings, and atomic metadata.</p>`,
      () => {
        app.$("#lb-ds-manage-classes-main")?.addEventListener("click", app.openClassManager110);
        app.$("#lb-ds-manage-vars-main")?.addEventListener("click", app.openVariables110);
        app.$("#lb-ds-manage-components-main")?.addEventListener("click", app.openComponentLibrary110);
        app.$("#lb-ds-export-main")?.addEventListener("click", async () => {
          const r = await fetch(`${app.D.api}/design-system/export`, { headers: { "X-WP-Nonce": app.D.nonce } });
          const d = await r.json();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
          a.download = "sidcraft-syntex-design-system-v2.json";
          a.click();
          URL.revokeObjectURL(a.href);
        });
        app.$("#lb-ds-import-main")?.addEventListener("click", () => app.$("#lb-ds-import-file-main")?.click());
        app.$("#lb-ds-import-file-main")?.addEventListener("change", (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = async () => {
            try {
              const d = JSON.parse(rd.result);
              await fetch(`${app.D.api}/design-system/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
                body: JSON.stringify({ ...d, mode: app.$("#lb-ds-import-mode")?.value || "merge" }),
              });
              await app.lb110RefreshDesignData(true);
              alert(app.t("Design system imported successfully."));
            } catch (err) {
              alert(app.t("Could not import design system."));
            }
          };
          rd.readAsText(f);
        });
      },
    );
  };
  app.lb110RefreshDesignData(false);
  app.lb111TypeControl = function lb111TypeControl(item, value) {
    const type = item?.type || "text",
      v = value ?? "";
    if (type === "switch")
      return `<label class="lb-control"><span>${app.esc(item.label || item.name)}</span><input type="checkbox" data-lb-comp-override="${app.esc(item.name)}" ${v ? "checked" : ""}></label>`;
    if (type === "number")
      return `<label class="lb-control"><span>${app.esc(item.label || item.name)}</span><input type="number" data-lb-comp-override="${app.esc(item.name)}" value="${app.esc(v)}"></label>`;
    if (type === "color")
      return `<label class="lb-control"><span>${app.esc(item.label || item.name)}</span><input type="color" data-lb-comp-override="${app.esc(item.name)}" value="${app.esc(/^#[0-9a-f]{6}$/i.test(String(v)) ? v : "#000000")}"></label>`;
    if (type === "textarea")
      return `<label class="lb-control"><span>${app.esc(item.label || item.name)}</span><textarea data-lb-comp-override="${app.esc(item.name)}" rows="4">${app.esc(v)}</textarea></label>`;
    return `<label class="lb-control"><span>${app.esc(item.label || item.name)}</span><input type="text" data-lb-comp-override="${app.esc(item.name)}" value="${app.esc(v)}"></label>`;
  };
  app.lb111ComponentControl = function lb111ComponentControl(n) {
    const comps = Array.isArray(app.D.designSystem?.components) ? app.D.designSystem.components : [],
      s = n.settings || {},
      c = comps.find((x) => Number(x.id) === Number(s.component_id));
    let fields = "";
    if (c)
      fields =
        (c.exposed || []).map((x) => app.lb111TypeControl(x, s.overrides?.[x.name] ?? "")).join("") ||
        '<p class="lb-muted">No exposed properties. Open Manage Components \u2192 Properties.</p>';
    return app.lb09Section(
      app.t("Component"),
      `<label class="lb-control"><span>Component</span><select id="lb-component-select"><option value="0">Select component</option>${comps.map((x) => `<option value="${x.id}" ${Number(x.id) === Number(s.component_id) ? "selected" : ""}>${app.esc(x.title)} \xB7 v${app.esc(x.version || 1)}</option>`).join("")}</select></label>${fields}<button class="lb-btn" id="lb-component-library-open">Manage Components</button>`,
      true,
    );
  };
  app.lb110ComponentControl = app.lb111ComponentControl;
  app.lb111BindComponentControl = function lb111BindComponentControl() {
    app.root.querySelector("#lb-component-select")?.addEventListener("change", (e) => {
      app.commit();
      app.update("component_id", Number(e.target.value || 0));
    });
    app.root.querySelectorAll("[data-lb-comp-override]").forEach((x) =>
      x.addEventListener("change", (e) => {
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        const o = { ...(r.node.settings.overrides || {}) };
        let v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        if (e.target.type === "number") v = e.target.value === "" ? "" : Number(e.target.value);
        o[e.target.dataset.lbCompOverride] = v;
        app.update("overrides", o);
      }),
    );
    app.root.querySelector("#lb-component-library-open")?.addEventListener("click", app.openComponentLibrary110);
  };
  app.lb110BindComponentControl = app.lb111BindComponentControl;
  app.lb111ExposedEditor = function lb111ExposedEditor(c) {
    const nodes = app.lb110ComponentNodes(c.document),
      existing = {};
    (c.exposed || []).forEach((x) => (existing[x.name] = x));
    const rows = [];
    for (const x of nodes)
      Object.entries(x.node.settings || {}).forEach(([k, v]) => {
        if (["css_id", "css_class", "global_class", "custom_css", "component_id", "overrides"].includes(k)) return;
        const name = existing[`${x.path}_${k}`]?.name || `${x.path}_${k}`,
          old = existing[name] || {},
          type =
            old.type ||
            (typeof v === "number"
              ? "number"
              : typeof v === "boolean"
                ? "switch"
                : String(v).length > 120
                  ? "textarea"
                  : "text"),
          label = old.label || `${app.meta(x.node.type).title || x.node.type}: ${k.replace(/_/g, " ")}`;
        rows.push(
          `<div class="lb-ds-exposed-row lb-ds-exposed-editor-row"><input type="checkbox" data-lb-expose="${app.esc(name)}" data-lb-expose-path="${app.esc(x.path)}" data-lb-expose-setting="${app.esc(k)}" ${existing[name] ? "checked" : ""}><div><input class="lb-ds-expose-label" data-lb-expose-label="${app.esc(name)}" value="${app.esc(label)}"><small>${app.esc(x.path)} \xB7 ${app.esc(k)}</small></div><select data-lb-expose-type="${app.esc(name)}"><option value="text" ${type === "text" ? "selected" : ""}>Text</option><option value="textarea" ${type === "textarea" ? "selected" : ""}>Textarea</option><option value="number" ${type === "number" ? "selected" : ""}>Number</option><option value="color" ${type === "color" ? "selected" : ""}>Color</option><option value="switch" ${type === "switch" ? "selected" : ""}>Switch</option></select></div>`,
        );
      });
    return `<div class="lb-ds-exposed-list">${rows.join("") || '<p class="lb-muted">No editable settings found.</p>'}</div>`;
  };
  app.lb110ExposedEditor = app.lb111ExposedEditor;
  app.lb111SaveComponentDefinition = async function lb111SaveComponentDefinition(c) {
    const exposed = [...app.root.querySelectorAll("[data-lb-expose]:checked")].map((x) => ({
      name: x.dataset.lbExpose,
      path: x.dataset.lbExposePath,
      setting: x.dataset.lbExposeSetting,
      label:
        app.root.querySelector(`[data-lb-expose-label="${CSS.escape(x.dataset.lbExpose)}"]`)?.value ||
        x.dataset.lbExpose,
      type: app.root.querySelector(`[data-lb-expose-type="${CSS.escape(x.dataset.lbExpose)}"]`)?.value || "text",
    }));
    const title = app.root.querySelector("#lb-comp-title")?.value || c.title;
    const r = await fetch(`${app.D.api}/components/${c.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ title, key: c.key || "", document: c.document, exposed }),
    });
    if (!r.ok) {
      alert(app.t("Could not save component."));
      return;
    }
    await app.lb110RefreshDesignData(true);
    app.closeModal();
    app.openComponentLibrary110();
  };
  app.lb110SaveComponentDefinition = app.lb111SaveComponentDefinition;
  app.lb111FindNodeByPath = function lb111FindNodeByPath(doc, path) {
    const parts = String(path || "")
      .split("/")
      .filter(Boolean);
    let list = doc?.root || [],
      node = null;
    for (const part of parts) {
      node = list[Number(part)];
      if (!node) return null;
      list = node.children || [];
    }
    return node;
  };
  app.lb111ApplyComponentOverrides = function lb111ApplyComponentOverrides(doc, overrides, exposed) {
    const d = app.clone(doc || { version: "2.1", root: [], settings: {} });
    (exposed || []).forEach((x) => {
      if (!Object.prototype.hasOwnProperty.call(overrides || {}, x.name) || !x.path || !x.setting) return;
      const n = app.lb111FindNodeByPath(d, x.path);
      if (n) {
        n.settings = n.settings || {};
        n.settings[x.setting] = overrides[x.name];
      }
    });
    return d;
  };
  app.lb111ComponentDepth = 0;
  app.lb111RenderComponent = function lb111RenderComponent(id, overrides) {
    if (app.lb111ComponentDepth > 4)
      return '<div class="lb-component-placeholder">Nested component depth limit reached.</div>';
    const c = (app.D.designSystem?.components || []).find((x) => Number(x.id) === Number(id));
    if (!c) return `<div class="lb-component-placeholder">Component #${app.esc(id)} not found.</div>`;
    const doc = app.lb111ApplyComponentOverrides(c.document, overrides || {}, c.exposed || []);
    app.lb111ComponentDepth++;
    try {
      return `<div class="lb-component-preview" data-lb-component="${app.esc(id)}"><div class="lb-component-preview-head"><span>Component</span><strong>${app.esc(c.title)}</strong><small>v${app.esc(c.version || 1)}</small></div><div class="lb-component-preview-body">${(doc.root || []).map((n) => app.bodyHTML(n)).join("")}</div></div>`;
    } finally {
      app.lb111ComponentDepth--;
    }
  };
  app.lb111BodyBeforeComponent = app.bodyHTML;
  app.bodyHTML = function (n) {
    if (n.type === "component") {
      const s = n.settings || {};
      return app.lb111RenderComponent(s.component_id, s.overrides || {});
    }
    return app.lb111BodyBeforeComponent(n);
  };
  app.lb111NodeBefore = app.nodeHTML;
  app.nodeHTML = function (n) {
    const html = app.lb111NodeBefore(n),
      s = n.settings || {};
    if (!(app.D.atomicTypes || {})[n.type]) return html;
    return html.replace(
      `data-type="${app.esc(n.type)}"`,
      `data-type="${app.esc(n.type)}" data-atomic="1" data-class-mode="${app.esc(s.class_mode || "inherit")}"`,
    );
  };
  app.lb111OpenDesignSystem = async function lb111OpenDesignSystem() {
    await app.lb110RefreshDesignData(false);
    const vars = app.D.variables || {},
      comps = app.D.designSystem?.components || [];
    app.showModal(
      app.t("Design System 2.1"),
      `<div class="lb-ds-overview"><div><strong>Global Classes</strong><span>${app.lb110ClassNames().length}</span><small>Reusable CSS states and inheritance</small></div><div><strong>${app.t("Variables")}</strong><span>${Object.values(vars).reduce((n, x) => n + (x && typeof x === "object" ? Object.keys(x).length : 0), 0)}</span><small>Design tokens</small></div><div><strong>${app.t("Components")}</strong><span>${comps.length}</span><small>Reusable structures</small></div><div><strong>Atomic types</strong><span>${Object.keys(app.D.atomicTypes || {}).length}</span><small>CSS-first units</small></div></div><div class="lb-ds-actions"><button class="lb-btn primary" id="lb111-classes">Global Classes</button><button class="lb-btn primary" id="lb111-vars">${app.t("Variables")}</button><button class="lb-btn primary" id="lb111-comps">${app.t("Components")}</button><button class="lb-btn" id="lb111-export">${app.t("Export")}</button><select id="lb111-import-mode"><option value="merge">Merge</option><option value="replace">Replace</option></select><button class="lb-btn" id="lb111-import">${app.t("Import")}</button><input id="lb111-import-file" type="file" accept="application/json" hidden></div><div class="lb-ds-feature-list"><div><strong>CSS-first architecture</strong><span>Classes and Variables are emitted to the editor iframe and frontend.</span></div><div><strong>Inheritance</strong><span>Class cycles are rejected when saved.</span></div><div><strong>Propagation</strong><span>Instances resolve the latest saved component definition and version.</span></div><div><strong>Exposed properties</strong><span>Instances can override only explicitly exposed settings.</span></div></div>`,
      () => {
        app.$("#lb111-classes")?.addEventListener("click", app.openClassManager110);
        app.$("#lb111-vars")?.addEventListener("click", app.openVariables);
        app.$("#lb111-comps")?.addEventListener("click", app.openComponentLibrary110);
        app.$("#lb111-export")?.addEventListener("click", async () => {
          const r = await fetch(`${app.D.api}/design-system/export`, { headers: { "X-WP-Nonce": app.D.nonce } }),
            d = await r.json(),
            a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
          a.download = "sidcraft-syntex-design-system-2.1.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
        });
        app.$("#lb111-import")?.addEventListener("click", () => app.$("#lb111-import-file")?.click());
        app.$("#lb111-import-file")?.addEventListener("change", (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = async () => {
            try {
              const d = JSON.parse(rd.result),
                r = await fetch(`${app.D.api}/design-system/import`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
                  body: JSON.stringify({ ...d, mode: app.$("#lb111-import-mode")?.value || "merge" }),
                });
              if (!r.ok) throw new Error();
              await app.lb110RefreshDesignData(true);
              alert(app.t("Design system imported successfully."));
            } catch (err) {
              alert("Could not import the design system.");
            }
          };
          rd.readAsText(f);
        });
      },
    );
  };
  app.lb010OpenDesignSystem = app.lb111OpenDesignSystem;
  app.lb111VariableManager = function lb111VariableManager() {
    const v = JSON.parse(JSON.stringify(app.D.variables || {})),
      groups = ["colors", "sizes", "fonts", "effects"];
    const sections = groups
      .map(
        (g) =>
          `<div class="lb-ds-variable-group"><h4>${app.esc(g)}</h4>${Object.entries(v[g] || {})
            .map(
              ([k, val]) =>
                `<label><span>${app.esc(k)}</span><input data-lb-var-group="${app.esc(g)}" data-lb-var-name="${app.esc(k)}" value="${app.esc(val)}" ${g === "colors" ? 'type="color"' : ""}></label>`,
            )
            .join("")}</div>`,
      )
      .join("");
    const customRows = Object.entries(v.custom || {})
      .flatMap(([g, items]) =>
        Object.entries(items || {}).map(
          ([k, item]) =>
            `<div class="lb-ds-custom-row"><label><span>${app.esc(g)}.${app.esc(k)}</span><input data-lb-custom-value="${app.esc(g)}.${app.esc(k)}" value="${app.esc(typeof item === "object" ? item.value || "" : item)}"></label><button class="lb-btn danger" data-lb-custom-delete="${app.esc(g)}.${app.esc(k)}">${app.t("Delete")}</button></div>`,
        ),
      )
      .join("");
    app.showModal(
      app.t("Global Variables 2.1"),
      `<p class="lb-muted">Variables are CSS custom properties. Use <code>{{var:group.name}}</code> in supported style fields or classes.</p><div class="lb-ds-variable-grid">${sections}</div><div class="lb-ds-variable-group"><h4>Custom Tokens</h4><div id="lb111-custom-list">${customRows || '<span class="lb-muted">No custom tokens.</span>'}</div><div class="lb-form-row lb111-token-add"><input id="lb111-token-group" placeholder="group"><input id="lb111-token-name" placeholder="token-name"><input id="lb111-token-value" placeholder="value"><select id="lb111-token-type"><option value="text">Text</option><option value="color">Color</option><option value="size">Size</option><option value="font">Font</option></select><button class="lb-btn" id="lb111-token-add">${app.t("Add")}</button></div></div><div class="lb-ds-actions"><button class="lb-btn primary" id="lb111-vars-save">Save Variables</button></div>`,
      () => {
        app.$("#lb111-token-add")?.addEventListener("click", () => {
          const g = app.$("#lb111-token-group")?.value.trim(),
            n = app.$("#lb111-token-name")?.value.trim(),
            val = app.$("#lb111-token-value")?.value || "",
            type = app.$("#lb111-token-type")?.value || "text";
          if (!g || !n) {
            alert("Group and token name are required.");
            return;
          }
          v.custom = v.custom || {};
          v.custom[g] = v.custom[g] || {};
          v.custom[g][n] = { value: val, type, label: n };
          app.closeModal();
          app.openVariables();
        });
        app.$$("[data-lb-custom-delete]").forEach(
          (b) =>
            (b.onclick = async () => {
              const [g, n] = b.dataset.lbCustomDelete.split(".");
              if (!confirm(`Delete ${g}.${n}?`)) return;
              const r = await fetch(`${app.D.api}/variables/custom/${encodeURIComponent(g)}/${encodeURIComponent(n)}`, {
                method: "DELETE",
                headers: { "X-WP-Nonce": app.D.nonce },
              });
              if (r.ok) {
                await app.lb110RefreshDesignData(true);
                app.closeModal();
                app.openVariables();
              }
            }),
        );
        app.$("#lb111-vars-save")?.addEventListener("click", async () => {
          for (const el of app.root.querySelectorAll("[data-lb-var-group]")) {
            const g = el.dataset.lbVarGroup,
              n = el.dataset.lbVarName;
            v[g] = v[g] || {};
            v[g][n] = el.value;
          }
          for (const el of app.root.querySelectorAll("[data-lb-custom-value]")) {
            const [g, n] = el.dataset.lbCustomValue.split(".");
            v.custom = v.custom || {};
            v.custom[g] = v.custom[g] || {};
            const old = v.custom[g][n];
            v.custom[g][n] =
              typeof old === "object" ? { ...old, value: el.value } : { value: el.value, type: "text", label: n };
          }
          const r = await fetch(`${app.D.api}/variables`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
            body: JSON.stringify(v),
          });
          if (r.ok) {
            app.D.variables = await r.json();
            app.D.designCss = app.lb110DesignCss();
            app.closeModal();
            app.render();
          }
        });
      },
    );
  };
  app.openVariables = app.lb111VariableManager;
  app.lb111OldTinySettings = app.settingsHTML;
  app.settingsHTML = function () {
    const html = app.lb111OldTinySettings();
    if (!app.selected) return html;
    const r = app.locate(app.state.root, app.selected);
    if (r?.node?.type !== "tinymce_text_editor") return html;
    return html.replace(
      '<div class="lb-action-grid"><button class="lb-btn" id="lb-duplicate">' +
        app.t("Duplicate") +
        '</button><button class="lb-btn danger" id="lb-delete">' +
        app.t("Delete") +
        "</button></div>",
      '<div class="lb-action-grid lb-tinymce-actions-secondary"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">' +
        app.t("Duplicate") +
        '</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">' +
        app.t("Delete") +
        "</button></div>",
    );
  };
  app.lb111BuildExposedFromState = function lb111BuildExposedFromState(oldExposed) {
    const labels = {};
    (oldExposed || []).forEach((x) => (labels[x.path + "|" + x.setting] = x));
    const out = [];
    for (const x of app.lb110ComponentNodes(app.state)) {
      for (const [k, v] of Object.entries(x.node.settings || {})) {
        if (["css_id", "css_class", "global_class", "custom_css", "component_id", "overrides"].includes(k)) continue;
        const old = labels[x.path + "|" + k];
        out.push({
          name: old?.name || `${x.path}_${k}`,
          path: x.path,
          setting: k,
          label: old?.label || `${app.meta(x.node.type).title || x.node.type}: ${k.replace(/_/g, " ")}`,
          type: old?.type || (typeof v === "number" ? "number" : typeof v === "boolean" ? "switch" : "text"),
        });
      }
    }
    return out;
  };
  app.lb111OldComponentSaveEdit = app.lb110SaveComponentEdit;
  app.lb110SaveComponentEdit = async function () {
    if (!app.lb110ComponentEdit) return;
    const exposed = app.lb111BuildExposedFromState(app.lb110ComponentEdit.exposed);
    const payload = {
      title: app.lb110ComponentEdit.title,
      document: app.state,
      exposed,
      key: app.lb110ComponentEdit.key || "",
    };
    const r = await fetch(`${app.D.api}/components/${app.lb110ComponentEdit.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      alert(app.t("Component could not be saved."));
      return;
    }
    const old = app.lb110ComponentEdit;
    app.lb110ComponentEdit = null;
    app.state = old.pageState;
    app.selected = old.pageSelected;
    app.dirty = old.pageDirty;
    await app.lb110RefreshDesignData(true);
    app.render();
    alert(app.t("Component saved. All instances now use the updated component definition."));
  };
  (function () {
    const lb116BaseSettings = app.settingsHTML;
    app.settingsHTML = function () {
      if (app.selected) {
        const r = app.locate(app.state.root, app.selected);
        if (r?.node?.type === "tinymce_text_editor") {
          const s = r.node.settings || {};
          const content = String(s.content || "<p>Start writing your content here.</p>");
          let h = `<div class="lb-selection-head"><strong>TinyMCE Text Editor</strong><span class="lb-selection-id">${app.esc(r.node.id)}</span></div>`;
          h += `<div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
          if (app.styleTab === "content") {
            h += `<div class="lb-section"><div class="lb-section-title"><span>\u25BE</span><strong>Content</strong></div><div class="lb-section-body"><label class="lb-control"><span>Content</span><textarea id="lb-tinymce-inline-content" rows="9" spellcheck="true">${app.esc(content)}</textarea><small class="lb-muted">Edit the content directly, or use Edit with TinyMCE for rich-text formatting.</small></label><button type="button" class="lb-btn primary lb-tinymce-open" id="lb-tinymce-open">Edit with TinyMCE</button></div></div>`;
          } else {
            const e = app.meta(r.node.type),
              groups = { style: [], advanced: [] };
            Object.entries(e.controls || {}).forEach(([k, t3]) => {
              if (k === "content") return;
              const g = app.advancedKeys.has(k) ? "advanced" : "style";
              groups[g].push([
                k,
                t3,
                s[k] ?? (t3 === "spacing" || t3 === "dimensions" || t3 === "box_shadow" ? {} : ""),
              ]);
            });
            h += groups[app.styleTab].map((x) => app.control(x[0], x[1], x[2])).join("");
            h += app.lb091Universal(r.node, app.styleTab);
            if (app.styleTab === "advanced") {
              const warn = app.accessibilityWarnings(r.node);
              h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div>`;
            }
          }
          h += `<div class="lb-action-grid lb-tinymce-actions-secondary"><button type="button" class="lb-btn lb-secondary-action" id="lb-duplicate">${app.t("Duplicate")}</button><button type="button" class="lb-btn lb-danger-action" id="lb-delete">${app.t("Delete")}</button></div>`;
          return h;
        }
      }
      return lb116BaseSettings();
    };
    const lb116BaseBind = app.bindRightPanel;
    app.bindRightPanel = function () {
      lb116BaseBind();
      if (!app.selected) return;
      const r = app.locate(app.state.root, app.selected);
      if (r?.node?.type !== "tinymce_text_editor") return;
      const ta = app.root.querySelector("#lb-tinymce-inline-content");
      if (ta) {
        ta.value = String(r.node.settings?.content || "<p>Start writing your content here.</p>");
        ta.addEventListener("input", () => {
          const rr = app.locate(app.state.root, app.selected);
          if (!rr) return;
          rr.node.settings = rr.node.settings || {};
          rr.node.settings.content = ta.value;
          app.dirty = true;
        });
        ta.addEventListener("blur", () => {
          app.render();
        });
      }
      app.root.querySelector("#lb-tinymce-open")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.openTinyMCEEditor(app.selected);
      });
    };
  })();
  app.lb20OldNodeHTML = app.nodeHTML;
  app.nodeHTML = function (n) {
    const s = n.settings || {},
      r = app.lb20OldNodeHTML(n);
    let extra = "";
    if (r && app.locate(app.state.root, n.id)?.parent?.type === "grid") {
      const cv = (k) => {
        const v = s[k];
        return v && typeof v === "object" ? (v[app.device] ?? v.desktop ?? "") : (v ?? "");
      };
      const cs = cv("grid_column_start"),
        cspan = cv("grid_column_span"),
        rs = cv("grid_row_start"),
        rspan = cv("grid_row_span");
      if (cs) extra += "grid-column-start:" + app.esc(cs) + ";";
      if (cspan) extra += "grid-column:span " + Math.max(1, Number(cspan)) + ";";
      if (rs) extra += "grid-row-start:" + app.esc(rs) + ";";
      if (rspan) extra += "grid-row:span " + Math.max(1, Number(rspan)) + ";";
      if (s.justify_self) extra += "justify-self:" + app.esc(s.justify_self) + ";";
      if (s.align_self) extra += "align-self:" + app.esc(s.align_self) + ";";
    }
    return extra
      ? r.replace(' data-id="' + app.esc(n.id) + '"', ' data-id="' + app.esc(n.id) + '" style="' + extra + '"')
      : r;
  };
}

export { installTemplates };
