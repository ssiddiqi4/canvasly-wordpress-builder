import { app } from "./app.js";
function installNavigator() {
  app.treeHTML = function treeHTML(nodes, depth = 0) {
    return nodes
      .map(
        (n) =>
          `<div class="lb-tree-item"><div class="lb-tree-row ${app.selected === n.id ? "active" : ""}" data-tree-id="${app.esc(n.id)}" style="padding-left:${8 + depth * 15}px"><span class="lb-tree-grip">\u22EE\u22EE</span><span>${app.esc(app.meta(n.type).title || n.type)}</span></div>${n.children?.length ? treeHTML(n.children, depth + 1) : ""}</div>`,
      )
      .join("");
  };
  app.structureHTML = function structureHTML() {
    const showPage = typeof app.pageShowsThemeChrome === "function" && app.pageShowsThemeChrome();
    const inherit = typeof app.pageInheritsThemeChrome === "function" && app.pageInheritsThemeChrome();
    const site = (part) => typeof app.sitePart === "function" && !!app.sitePart(part);
    const showHeader = showPage || site("header");
    const showFooter = showPage || site("footer");
    const section = (label, part, nodes) => {
      const active = app.chromeFocus === part && !app.selected ? " active" : "";
      const text = site(part) ? label + " \xB7 " + app.t("Site-wide") : label;
      return `<div class="lb-tree-section"><div class="lb-tree-row lb-tree-region${active}" data-lb-region="${part}"><span>${app.esc(text)}</span></div>${app.treeHTML(nodes || [])}</div>`;
    };
    const inherited = (label, part) => {
      const active = app.chromeFocus === part && !app.selected ? " active" : "";
      return `<div class="lb-tree-section"><div class="lb-tree-row lb-tree-region${active}" data-lb-region="${part}"><span>${app.esc(label + " \xB7 " + app.t("Theme"))}</span></div>${app.treeHTML(app.state[part] || [])}</div>`;
    };
    if (!showHeader && !showFooter && !inherit) return app.treeHTML(app.state.root || []);
    let html = "";
    if (showHeader) html += section(app.t("Header"), "header", app.state.header);
    else if (inherit) html += inherited(app.t("Header"), "header");
    html +=
      typeof app.designsHeaderAndFooter === "function" && app.designsHeaderAndFooter()
        ? `<div class="lb-tree-section"><div class="lb-tree-row"><span>${app.esc(app.t("Page content"))}</span></div></div>`
        : section(app.t("Page"), "root", app.state.root);
    if (showFooter) html += section(app.t("Footer"), "footer", app.state.footer);
    else if (inherit) html += inherited(app.t("Footer"), "footer");
    return html;
  };
  app.optionLabel = function optionLabel(k, o) {
    const map = {
      single: app.t("Single"),
      multiple: app.t("Multiple"),
      default: app.t("Default"),
      random: app.t("Random"),
      date: app.t("Date"),
      title: app.t("Title"),
      left: app.t("Left"),
      center: app.t("Center"),
      right: app.t("Right"),
      none: app.t("None"),
      file: app.t("Media File"),
      attachment: app.t("Attachment Page"),
      start: app.t("Start"),
      end: app.t("End"),
      stretch: app.t("Stretch"),
      top: app.t("Top"),
      middle: app.t("Middle"),
      bottom: app.t("Bottom"),
      auto: app.t("Auto"),
      grid: app.t("Grid"),
      masonry: app.t("Masonry"),
      justified: app.t("Justified"),
      fit: app.t("Fit"),
      grow: app.t("Grow"),
    };
    return map[o] || (o ? String(o).replace(/_/g, " ") : app.t("Default"));
  };
}

export { installNavigator };
