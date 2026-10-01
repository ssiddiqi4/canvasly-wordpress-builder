import { app } from "./app.js";
function installSavedTemplates() {
  app.templateTypes = function templateTypes() {
    const raw = app.D.templateTypes && typeof app.D.templateTypes === "object" ? app.D.templateTypes : {};
    const keys = Object.keys(raw);
    if (keys.length) return raw;
    return {
      page: app.t("Page"),
      section: app.t("Section"),
      container: app.t("Container"),
      header: app.t("Header"),
      footer: app.t("Footer"),
      single: app.t("Single"),
      archive: app.t("Archive"),
      loop_item: app.t("Loop Item"),
      floating_button: app.t("Floating Button"),
    };
  };
  app.templateTypeLabel = function templateTypeLabel(type) {
    const types = app.templateTypes();
    const key = String(type || "page");
    return types[key] || (key === "block" ? types.container || app.t("Container") : key);
  };
  app.templateCategoryNames = function templateCategoryNames() {
    return app.D.templateCategories && typeof app.D.templateCategories === "object" ? app.D.templateCategories : {};
  };
  app.templateTypeOptions = function templateTypeOptions(selected) {
    const cur = String(selected || "page");
    return Object.entries(app.templateTypes())
      .map(([k, l]) => `<option value="${app.esc(k)}" ${k === cur ? "selected" : ""}>${app.esc(l)}</option>`)
      .join("");
  };
  app.guessTemplateType = function guessTemplateType(node) {
    if (!node) return "page";
    if (node.type === "container" || node.type === "grid") return "section";
    return "container";
  };
  app.drawFallbackThumb = function drawFallbackThumb(ctx, w, h, title, type) {
    ctx.fillStyle = "#f3f5f8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2f73d9";
    ctx.fillRect(0, 0, w, 8);
    ctx.fillStyle = "#20252b";
    ctx.font = "600 28px system-ui,sans-serif";
    ctx.fillText(String(title || app.t("Template")).slice(0, 28), 28, 80);
    ctx.fillStyle = "#5d6877";
    ctx.font = "16px system-ui,sans-serif";
    ctx.fillText(app.templateTypeLabel(type), 28, 112);
  };
  app.captureCanvasThumbnail = function captureCanvasThumbnail(title, type) {
    const w = 640,
      h = 400;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const fallback = () => {
      app.drawFallbackThumb(ctx, w, h, title, type);
      return canvas.toDataURL("image/png");
    };
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value);
      };
      const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
      if (!fd || !ctx) {
        finish(fallback());
        return;
      }
      try {
        const root = fd.querySelector(".lb-frame-root") || fd.body;
        if (!root) {
          finish(fallback());
          return;
        }
        const clone = root.cloneNode(true);
        clone
          .querySelectorAll(".lb-insert-zone,.lb-node-outline,.lb-inline-toolbar,.lb-grid-outline,.lb-page-drop")
          .forEach((n) => n.remove());
        const html = new XMLSerializer().serializeToString(clone);
        const scale = Math.min(1, w / Math.max(1, root.scrollWidth || w));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${Math.round(w / scale)}px;background:#fff;transform:scale(${scale});transform-origin:top left">${html}</div></foreignObject></svg>`;
        const img = new Image();
        img.onload = () => {
          try {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0);
            finish(canvas.toDataURL("image/png"));
          } catch (e) {
            finish(fallback());
          }
        };
        img.onerror = () => finish(fallback());
        setTimeout(() => finish(fallback()), 1500);
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      } catch (e) {
        finish(fallback());
      }
    });
  };
  app.uploadTemplateThumbnail = async function uploadTemplateThumbnail(id, title, type) {
    if (!id) return;
    try {
      const image = await app.captureCanvasThumbnail(title, type);
      if (!image) return;
      await fetch(`${app.D.api}/templates/${id}/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify({ image }),
      });
    } catch (e) {}
  };
  app.downloadTemplateJson = function downloadTemplateJson(data, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = filename || "sidcraft-page-builder-template.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  };
  app.exportTemplate = async function exportTemplate(id) {
    try {
      const r = await fetch(`${app.D.api}/templates/${id}/export`, { headers: { "X-WP-Nonce": app.D.nonce } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      app.downloadTemplateJson(d, `sidcraft-page-builder-template-${id}.json`);
    } catch (e) {
      alert(app.t("Could not export template."));
    }
  };
  app.importTemplateFile = function importTemplateFile(file) {
    if (!file) return;
    const send = async (body, headers) => {
      const r = await fetch(`${app.D.api}/templates/import`, {
        method: "POST",
        headers: Object.assign({ "X-WP-Nonce": app.D.nonce }, headers || {}),
        body,
      });
      if (!r.ok) throw new Error();
      return r.json();
    };
    const done = () => {
      alert(app.t("Templates imported."));
      app.openTemplateLibrary();
    };
    const fail = () => alert(app.t("Could not import templates."));
    if (/\.zip$/i.test(file.name || "")) {
      const fd = new FormData();
      fd.append("file", file);
      send(fd).then(done).catch(fail);
      return;
    }
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        send(JSON.stringify(d), { "Content-Type": "application/json" }).then(done).catch(fail);
      } catch (e) {
        fail();
      }
    };
    rd.readAsText(file);
  };
  app.openSaveTemplateDialog = function openSaveTemplateDialog(opts = {}) {
    const node = opts.node || null;
    const suggested = opts.title || (node ? app.t("%s Template", app.meta(node.type).title) : "My Template");
    const type = opts.type || app.guessTemplateType(node);
    const cats = app.templateCategoryNames();
    const catOpts = Object.entries(cats)
      .map(([slug, name]) => `<option value="${app.esc(slug)}">${app.esc(name)}</option>`)
      .join("");
    const body = `<form class="lb-save-template-form" id="lb-save-template-form">
			<label class="lb-control"><span>${app.t("Template name")}</span><input id="lb-save-tpl-title" value="${app.esc(suggested)}" autofocus></label>
			<label class="lb-control"><span>${app.t("Type")}</span><select id="lb-save-tpl-type">${app.templateTypeOptions(type)}</select></label>
			<label class="lb-control"><span>${app.t("Category")}</span><input id="lb-save-tpl-category" list="lb-save-tpl-cats" placeholder="${app.t("Optional")}">
			<datalist id="lb-save-tpl-cats">${catOpts}</datalist></label>
			<p class="lb-muted">${app.t("A thumbnail is captured from the canvas after save.")}</p>
			<div class="lb-tinymce-actions"><button type="button" class="lb-btn" data-close-modal>${app.t("Cancel")}</button><button type="submit" class="lb-btn primary">${app.t("Save Template")}</button></div>
		</form>`;
    app.showModal(app.t("Save as Template"), body, () => {
      const form = app.$("#lb-save-template-form");
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = (app.$("#lb-save-tpl-title")?.value || "").trim();
        if (!title) return;
        const nextType = app.$("#lb-save-tpl-type")?.value || type;
        const category = (app.$("#lb-save-tpl-category")?.value || "").trim();
        const document2 = opts.document || app.state;
        const payload = { title, type: nextType, document: document2 };
        if (category) payload.categories = [category];
        try {
          const r = await fetch(`${app.D.api}/templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
            body: JSON.stringify(payload),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || !d.id) throw new Error();
          app.closeModal();
          await app.uploadTemplateThumbnail(d.id, title, nextType);
        } catch (err) {
          alert(app.t("Could not save template."));
        }
      });
    });
  };
  app.saveTemplate = async function saveTemplate() {
    app.openSaveTemplateDialog({ title: "My Template", type: "page", document: app.state });
  };
  app.saveTemplateFor = async function saveTemplateFor(id) {
    const r = id && app.locate(app.state.root, id);
    if (!r) return;
    app.openSaveTemplateDialog({
      node: r.node,
      title: app.t("%s Template", app.meta(r.node.type).title),
      type: app.guessTemplateType(r.node),
      document: { version: app.state.version || "2.1", root: [r.node], settings: {} },
    });
  };
  app.templateCardHTML = function templateCardHTML(i) {
    const count = (i.document?.root || []).length;
    const cats = Array.isArray(i.categories) && i.categories.length ? i.categories.join(", ") : "";
    const thumb = i.thumbnail
      ? `<img src="${app.esc(i.thumbnail)}" alt="">`
      : `<span>${app.esc(app.templateTypeLabel(i.type))}</span>`;
    return `<article class="lb-template-card" data-tpl-card="${i.id}" data-tpl-type="${app.esc(i.type || "page")}" data-tpl-search="${app.esc((i.title || "") + " " + (i.type || "") + " " + cats)}">
			<div class="lb-template-thumb">${thumb}</div>
			<strong>${app.esc(i.title)}</strong>
			<small>${app.esc(app.templateTypeLabel(i.type))}${cats ? " \xB7 " + app.esc(cats) : ""} \xB7 ${count} ${app.t("root unit(s)")}</small>
			<div class="lb-template-card-actions">
				<button class="lb-btn" data-template-id="${i.id}">${app.t("Insert")}</button>
				<button class="lb-btn" data-tpl-export="${i.id}">${app.t("Export")}</button>
				<button class="lb-btn" data-template-dup="${i.id}">${app.t("Duplicate")}</button>
				<button class="lb-btn danger" data-template-del="${i.id}">${app.t("Delete")}</button>
			</div>
		</article>`;
  };
  app.openTemplateLibrary = async function openTemplateLibrary() {
    try {
      const items = await (await fetch(`${app.D.api}/templates`, { headers: { "X-WP-Nonce": app.D.nonce } })).json();
      const list = Array.isArray(items) ? items : [];
      const types = ["", ...Object.keys(app.templateTypes())];
      const typeFilter = types
        .map(
          (k) =>
            `<button type="button" class="lb-chip ${k === "" ? "active" : ""}" data-tpl-filter="${app.esc(k)}">${app.esc(k ? app.templateTypeLabel(k) : app.t("All"))}</button>`,
        )
        .join("");
      const body = `<div class="lb-template-toolbar">
				<input class="lb-modal-search" id="lb-template-search" placeholder="${app.t("Search templates\u2026")}">
				<div class="lb-template-filters">${typeFilter}</div>
				<div class="lb-template-toolbar-actions">
					<button type="button" class="lb-btn" id="lb-tpl-import">${app.t("Import")}</button>
					<input id="lb-tpl-import-file" type="file" accept=".json,.zip,application/json,application/zip" hidden>
				</div>
			</div>
			<div class="lb-template-grid" id="lb-template-grid">${list.length ? list.map(app.templateCardHTML).join("") : "<p>" + app.t("No templates saved yet.") + "</p>"}</div>`;
      app.showModal(app.t("Template Library"), body, () => {
        const apply = () => {
          const q = (app.$("#lb-template-search")?.value || "").toLowerCase();
          const type = app.$(".lb-template-filters .lb-chip.active")?.dataset.tplFilter || "";
          app.$$("[data-tpl-card]").forEach((card) => {
            const hay = (card.dataset.tplSearch || "").toLowerCase();
            const okType = !type || card.dataset.tplType === type;
            card.hidden = !(okType && (!q || hay.includes(q)));
          });
        };
        app.$("#lb-template-search")?.addEventListener("input", apply);
        app.$$("[data-tpl-filter]").forEach(
          (b) =>
            (b.onclick = () => {
              app.$$("[data-tpl-filter]").forEach((x) => x.classList.toggle("active", x === b));
              apply();
            }),
        );
        app.$("#lb-tpl-import")?.addEventListener("click", () => app.$("#lb-tpl-import-file")?.click());
        app.$("#lb-tpl-import-file")?.addEventListener("change", (e) => {
          const f = e.target.files?.[0];
          if (f) app.importTemplateFile(f);
        });
        app.$$("[data-template-dup]").forEach(
          (b) =>
            (b.onclick = async () => {
              await fetch(`${app.D.api}/templates/${b.dataset.templateDup}/duplicate`, {
                method: "POST",
                headers: { "X-WP-Nonce": app.D.nonce },
              });
              app.closeModal();
              openTemplateLibrary();
            }),
        );
        app.$$("[data-template-del]").forEach(
          (b) =>
            (b.onclick = async () => {
              if (!confirm(app.t("Delete this template?"))) return;
              await fetch(`${app.D.api}/templates/${b.dataset.templateDel}`, {
                method: "DELETE",
                headers: { "X-WP-Nonce": app.D.nonce },
              });
              app.closeModal();
              openTemplateLibrary();
            }),
        );
        app.$$("[data-tpl-export]").forEach((b) => (b.onclick = () => app.exportTemplate(b.dataset.tplExport)));
      });
    } catch (e) {
      alert(app.t("Could not load templates."));
    }
  };
  app.lb010OpenTemplateManager = function lb010OpenTemplateManager() {
    return app.openTemplateLibrary();
  };
}

export { installSavedTemplates };
