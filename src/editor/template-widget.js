import { app } from "./app.js";
function installTemplateWidget() {
  function templateLabel(id) {
    id = String(id || "0");
    const meta = app.meta("template");
    const opts = meta && meta.controls && meta.controls.template_id && meta.controls.template_id.options;
    if (opts && typeof opts === "object" && !Array.isArray(opts) && opts[id]) return String(opts[id]);
    if (id === "0" || id === "") return app.t("None selected");
    return "#" + id;
  }
  function templateHTML(n) {
    const s = n.settings || {};
    const id = String(s.template_id || "0");
    if (!id || id === "0") {
      return '<div class="lb-embed-placeholder">' + app.esc(app.t("Select a saved template")) + "</div>";
    }
    return `<div class="lb-template-widget">
			<div class="lb-template-note">${app.esc(app.t("Using saved template: %s", templateLabel(id)))}</div>
			<div class="lb-loop-meta">${app.esc(app.t("Template \u2014 rendered on the frontend"))}</div>
		</div>`;
  }
  const prevBody = app.bodyHTML;
  app.bodyHTML = function bodyHTML(n) {
    if (n && n.type === "template") return templateHTML(n);
    return prevBody(n);
  };
  const prevFrame = app.frameHTML;
  app.frameHTML = function frameHTML() {
    let html = prevFrame();
    const extra =
      ".lb-template-note{padding:18px;border:1px dashed #cbd2da;border-radius:6px;color:#6b7280;text-align:center}";
    if (html.includes("</style></head>")) html = html.replace("</style></head>", extra + "</style></head>");
    return html;
  };
}

export { installTemplateWidget };
