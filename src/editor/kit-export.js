import { app } from "./app.js";
function installKitExport() {
  app.kitExportBusy = false;
  app.kitExportHTML = function kitExportHTML() {
    const pages = Array.isArray(app.D.navigation) ? app.D.navigation : [];
    const rows = pages
      .map(
        (p) =>
          `<label class="lb-kit-page"><input type="checkbox" data-kit-page="${app.esc(String(p.id))}"> <span>${app.esc(p.title || app.t("Untitled Page"))}</span> <small>${app.esc(p.type || "page")}</small></label>`,
      )
      .join("");
    return `<div class="lb-ss-kit">
<div class="lb-ss-section">
<h4>${app.t("Export Kit")}</h4>
<p class="lb-muted">${app.t("Download a ZIP of site settings, design tokens, templates and optional pages with media.")}</p>
<label class="lb-kit-check"><input type="checkbox" id="lb-kit-ex-templates" checked> ${app.t("Saved templates")}</label>
<label class="lb-kit-check"><input type="checkbox" id="lb-kit-ex-media" checked> ${app.t("Media files")}</label>
<label class="lb-kit-check"><input type="checkbox" id="lb-kit-ex-content"> ${app.t("Selected pages and posts")}</label>
<div class="lb-kit-pages">${rows || '<p class="lb-muted">' + app.t("No Sidcraft Page Builder pages were found.") + "</p>"}</div>
<button type="button" class="lb-btn primary" id="lb-kit-export">${app.t("Download Kit ZIP")}</button>
</div>
<div class="lb-ss-section">
<h4>${app.t("Import Kit")}</h4>
<p class="lb-muted">${app.t("Merge keeps existing tokens. Replace overwrites site settings, tokens, classes, components and templates.")}</p>
<label class="lb-control"><span>${app.t("Conflict mode")}</span>
<select id="lb-kit-im-mode"><option value="merge">${app.t("Merge")}</option><option value="replace">${app.t("Replace")}</option></select>
</label>
<label class="lb-kit-check"><input type="checkbox" id="lb-kit-im-content" checked> ${app.t("Import pages included in the kit (as drafts)")}</label>
<input id="lb-kit-im-file" type="file" accept=".zip,.json,application/zip,application/json" hidden>
<div class="lb-ds-actions"><button type="button" class="lb-btn primary" id="lb-kit-import">${app.t("Import Kit")}</button></div>
<p class="lb-muted" id="lb-kit-status"></p>
</div>
</div>`;
  };
  app.kitExportStatus = function kitExportStatus(msg, isError) {
    const el = app.root.querySelector("#lb-kit-status");
    if (el) {
      el.textContent = msg || "";
      el.classList.toggle("lb-kit-error", !!isError);
    }
  };
  app.exportKitZip = async function exportKitZip() {
    if (app.kitExportBusy) return;
    app.kitExportBusy = true;
    app.kitExportStatus(app.t("Exporting kit\u2026"));
    try {
      const includeContent = !!app.root.querySelector("#lb-kit-ex-content")?.checked;
      const ids = includeContent
        ? [...app.root.querySelectorAll("[data-kit-page]:checked")]
            .map((el) => Number(el.dataset.kitPage))
            .filter(Boolean)
        : [];
      const body = {
        include_templates: !!app.root.querySelector("#lb-kit-ex-templates")?.checked,
        include_media: !!app.root.querySelector("#lb-kit-ex-media")?.checked,
        include_content: includeContent,
        content_ids: ids,
      };
      const r = await fetch(`${app.D.api}/kit/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.message || app.t("Could not export kit."));
      const a = document.createElement("a");
      a.href = d.url;
      a.download = d.filename || "sidcraft-page-builder-kit.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      app.kitExportStatus(app.t("Kit download started."));
    } catch (err) {
      app.kitExportStatus(err.message || app.t("Could not export kit."), true);
    } finally {
      app.kitExportBusy = false;
    }
  };
  app.importKitZip = async function importKitZip(file) {
    if (!file || app.kitExportBusy) return;
    app.kitExportBusy = true;
    app.kitExportStatus(app.t("Importing kit\u2026"));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", app.root.querySelector("#lb-kit-im-mode")?.value || "merge");
      fd.append("include_content", app.root.querySelector("#lb-kit-im-content")?.checked ? "1" : "0");
      const r = await fetch(`${app.D.api}/kit/import`, {
        method: "POST",
        headers: { "X-WP-Nonce": app.D.nonce },
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.success === false) throw new Error(d.message || app.t("Could not import kit."));
      if (d.kit) {
        app.D.designSystem = d.kit;
        if (d.kit.variables) app.D.variables = d.kit.variables;
        if (d.kit.theme_style) app.D.themeStyle = d.kit.theme_style;
        if (d.kit.kit_settings) app.D.kitSettings = d.kit.kit_settings;
        if (d.kit.classes) app.D.classes = d.kit.classes;
        if (d.kit.global_settings) app.D.globals = d.kit.global_settings;
      }
      if (typeof app.lb110RefreshDesignData === "function") await app.lb110RefreshDesignData(true);
      if (typeof app.lb110DesignCss === "function") app.D.designCss = app.lb110DesignCss();
      app.render();
      app.kitExportStatus(app.t("Kit imported successfully."));
    } catch (err) {
      app.kitExportStatus(err.message || app.t("Could not import kit."), true);
    } finally {
      app.kitExportBusy = false;
    }
  };
  app.bindKitExport = function bindKitExport() {
    app.root.querySelector("#lb-kit-export")?.addEventListener("click", () => app.exportKitZip());
    app.root
      .querySelector("#lb-kit-import")
      ?.addEventListener("click", () => app.root.querySelector("#lb-kit-im-file")?.click());
    app.root.querySelector("#lb-kit-im-file")?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (f) app.importKitZip(f);
    });
  };
}

export { installKitExport };
