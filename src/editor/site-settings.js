import { app } from "./app.js";
  function installSiteSettings() {
    const SYSTEM_COLORS = ["primary", "secondary", "text", "accent"];
    const SYSTEM_TYPO = ["primary", "secondary", "text", "accent"];
    const TYPO_PROPS = ["font_family", "font_size", "font_weight", "font_style", "text_transform", "text_decoration", "line_height", "letter_spacing"];
    const PREFIX = { colors: "color", fonts: "font", sizes: "size", effects: "effect", typography: "typo", typo: "typo" };
    const GLOBE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><ellipse cx="8" cy="8" rx="2.4" ry="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.8 8h12.4M8 1.8c1.8 2 2.7 4.1 2.7 6.2S9.8 12.2 8 14.2C6.2 12.2 5.3 10.1 5.3 8S6.2 3.8 8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
    app.siteSettingsOpen = false;
    app.siteSettingsTab = "colors";
    app.siteSettingsOpenId = null;
    app.siteSettingsTabs = { colors: 1, typography: 1, theme: 1, site: 1, kit: 1 };
    app.lbGlobalPrefix = PREFIX;
    const oldResolve = app.lbResolveToken;
    app.lbResolveToken = function lbResolveTokenAliased(v) {
      if (typeof v !== "string") return v;
      let out = oldResolve ? oldResolve(v) : v;
      out = String(out).replace(/\{\{var:([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}\}/g, (_, g, k) => `var(--lb-${PREFIX[g] || g}-${k})`);
      return out.replace(/var\(--lb-colors-/g, "var(--lb-color-").replace(/var\(--lb-fonts-/g, "var(--lb-font-").replace(/var\(--lb-sizes-/g, "var(--lb-size-").replace(/var\(--lb-effects-/g, "var(--lb-effect-").replace(/var\(--lb-typography-/g, "var(--lb-typo-");
    };
    app.parseColorGlobal = function parseColorGlobal(v) {
      const s = String(v ?? "").trim();
      let m = s.match(/^\{\{var:colors\.([a-zA-Z0-9_-]+)\}\}$/);
      if (m) return m[1];
      m = s.match(/^var\(--lb-color-([a-zA-Z0-9_-]+)\)$/i);
      return m ? m[1] : "";
    };
    app.isHexColor = function isHexColor(v) {
      return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(String(v || "").trim());
    };
    app.globalColors = function globalColors() {
      const v = app.D.variables || {};
      const map = v.colors && typeof v.colors === "object" ? v.colors : {};
      const titles = Object.assign({}, {
        primary: app.t("Primary"),
        secondary: app.t("Secondary"),
        text: app.t("Text"),
        accent: app.t("Accent")
      }, v.color_titles || {});
      const customIds = Object.keys(map).filter((id) => !SYSTEM_COLORS.includes(id));
      const ids = SYSTEM_COLORS.concat(customIds);
      return ids.map((id) => {
        const raw = map[id];
        const value = raw && typeof raw === "object" ? raw.value || "#000000" : raw || "#000000";
        return { id, value, title: titles[id] || id.replace(/[-_]/g, " "), system: SYSTEM_COLORS.includes(id) };
      });
    };
    app.globalColorValue = function globalColorValue(id) {
      const hit = app.globalColors().find((c) => c.id === id);
      return hit ? hit.value : "#000000";
    };
    app.globalColorTitle = function globalColorTitle(id) {
      const hit = app.globalColors().find((c) => c.id === id);
      return hit ? hit.title : id;
    };
    app.globalTypography = function globalTypography() {
      const v = app.D.variables || {};
      const map = v.typography && typeof v.typography === "object" ? v.typography : {};
      const defaults = {
        primary: { title: app.t("Primary Headline"), font_size: "32px", font_weight: "600", line_height: "1.2" },
        secondary: { title: app.t("Secondary Headline"), font_size: "24px", font_weight: "600", line_height: "1.3" },
        text: { title: app.t("Body Text"), font_size: "16px", font_weight: "400", line_height: "1.6" },
        accent: { title: app.t("Accent Text"), font_size: "16px", font_weight: "500", line_height: "1.5" }
      };
      const customIds = Object.keys(map).filter((id) => !SYSTEM_TYPO.includes(id));
      const ids = SYSTEM_TYPO.concat(customIds);
      return ids.map((id) => {
        const item = Object.assign({}, defaults[id] || { title: id }, map[id] || {});
        item.id = id;
        item.system = SYSTEM_TYPO.includes(id) || !!item.system;
        TYPO_PROPS.forEach((p) => {
          if (item[p] == null) item[p] = "";
        });
        return item;
      });
    };
    app.typographyPreset = function typographyPreset(id) {
      return app.globalTypography().find((t3) => t3.id === id) || null;
    };
    app.variablesToCss = function variablesToCss(v) {
      v = v || app.D.variables || {};
      const parts = [":root{"];
      const quote = (fam) => {
        const s = String(fam || "").trim();
        if (!s) return "";
        if (s[0] === '"' || s[0] === "'" || s.indexOf(",") !== -1) return s;
        return /\s/.test(s) ? `"${s}"` : s;
      };
      Object.entries(v.colors || {}).forEach(([k, val]) => {
        const hex = val && typeof val === "object" ? val.value : val;
        if (hex) parts.push(`--lb-color-${k}:${hex};`);
      });
      Object.entries(v.sizes || {}).forEach(([k, val]) => {
        if (val) parts.push(`--lb-size-${k}:${val};`);
      });
      Object.entries(v.fonts || {}).forEach(([k, val]) => {
        if (val) parts.push(`--lb-font-${k}:${quote(val)};`);
      });
      Object.entries(v.effects || {}).forEach(([k, val]) => {
        if (val) parts.push(`--lb-effect-${k}:${val};`);
      });
      Object.entries(v.breakpoints || {}).forEach(([k, val]) => {
        const n = val && typeof val === "object" ? val.value : val;
        if (n) parts.push(`--lb-bp-${k}:${parseInt(n, 10)}px;`);
      });
      Object.entries(v.typography || {}).forEach(([id, item]) => {
        if (!item || typeof item !== "object") return;
        TYPO_PROPS.forEach((prop) => {
          let val = String(item[prop] || "").trim();
          if (!val) return;
          if (prop === "font_family") val = quote(val);
          parts.push(`--lb-typo-${id}-${prop.replace(/_/g, "-")}:${val};`);
        });
      });
      Object.entries(v.custom || {}).forEach(([group, items]) => {
        Object.entries(items || {}).forEach(([name, item]) => {
          const value = item && typeof item === "object" ? item.value : item;
          if (value) parts.push(`--lb-${group}-${name}:${value};`);
        });
      });
      parts.push("}");
      return parts.join("");
    };
    app.applyDesignCss = function applyDesignCss() {
      const varsCss = app.variablesToCss(app.D.variables);
      app.D.designCss = varsCss + String(app.D.designCss || "").replace(/:root\{[\s\S]*?\}/, "");
      const fd = app.frameDoc();
      if (!fd) return;
      let updated = false;
      [...fd.querySelectorAll("style")].forEach((st) => {
        const t3 = st.textContent || "";
        if (/:root\{/.test(t3) && /--lb-(color|typo|size|font)-/.test(t3)) {
          st.textContent = t3.replace(/:root\{[\s\S]*?\}/, varsCss);
          updated = true;
        }
      });
      if (!updated && fd.head) {
        let st = fd.getElementById("lb-design-css");
        if (!st) {
          st = fd.createElement("style");
          st.id = "lb-design-css";
          fd.head.insertBefore(st, fd.head.firstChild);
        }
        st.textContent = varsCss;
      }
    };
    let saveTimer = null;
    app.saveVariables = async function saveVariables(next) {
      if (next) app.D.variables = next;
      app.applyDesignCss();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const r = await fetch(`${app.D.api}/variables`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
            body: JSON.stringify(app.D.variables || {})
          });
          if (r.ok) {
            const saved = await r.json();
            if (saved && typeof saved === "object" && saved.colors) app.D.variables = saved;
            app.applyDesignCss();
          }
        } catch (e) {
        }
      }, 350);
    };
    app.uniqueTokenId = function uniqueTokenId(base, used) {
      let id = String(base || "custom").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "custom";
      if (/^\d/.test(id)) id = "c-" + id;
      let n = 2, cand = id;
      while (used[cand]) {
        cand = id + "-" + n;
        n += 1;
      }
      return cand;
    };
    app.colorControlHTML = function colorControlHTML(k, v, label) {
      const bound = app.parseColorGlobal(v);
      const hex = bound ? app.globalColorValue(bound) || "#000000" : app.isHexColor(v) ? v : v || "#000000";
      const rawColor = bound ? "" : String(v ?? "").trim();
      const parsed = rawColor && typeof app.lbParseColor === "function" ? app.lbParseColor(rawColor) : null;
      const display = parsed ? rawColor : app.isHexColor(hex) ? hex : "#000000";
      return `<div class="lb-control lb-color-control${bound ? " is-global" : ""}" data-color-key="${app.esc(k)}" style="--lb-picked:${app.esc(display)}"><div class="lb-control-head"><span>${app.esc(label || k.replace(/_/g, " "))}</span><button type="button" class="lb-globals-btn${bound ? " is-active" : ""}" data-globals-kind="color" data-globals-key="${app.esc(k)}" title="${app.t("Global Colors")}" aria-label="${app.t("Global Colors")}" aria-pressed="${bound ? "true" : "false"}">${GLOBE}</button></div><div class="lb-color-row"><input data-setting="${app.esc(k)}" type="color" value="${app.esc(display)}" data-lb-color="${app.esc(bound ? display : parsed || !rawColor ? rawColor : display)}"${bound ? ' data-global-bound="1" disabled' : ""}><span class="lb-color-hex">${app.esc(bound ? app.globalColorTitle(bound) : display)}</span></div></div>`;
    };
    const oldControl = app.control;
    app.control = function controlWithGlobals(k, t3, v, label) {
      const def = app.lbCtrlDef(t3);
      if ((def.type || "") === "color") return app.colorControlHTML(k, v, label || def.label);
      return oldControl(k, t3, v, label);
    };
    if (typeof app.lb09Field === "function") {
      const oldField = app.lb09Field;
      app.lb09Field = function lb09FieldWithGlobals(k, label, type, v, extra) {
        if (type === "color") return app.colorControlHTML(k, v, label);
        return oldField(k, label, type, v, extra);
      };
    }
    app.closeGlobalsPopover = function closeGlobalsPopover() {
      document.querySelectorAll(".lb-globals-popover").forEach((n) => n.remove());
      app.globalsPopover = null;
    };
    app.openGlobalsPopover = function openGlobalsPopover(btn) {
      app.closeGlobalsPopover();
      const kind = btn.dataset.globalsKind || "color";
      const key = btn.dataset.globalsKey || "";
      const r = app.selected && app.locate(app.state.root, app.selected);
      const settings = r && r.node && r.node.settings || {};
      const boundColor = kind === "color" ? app.parseColorGlobal(app.getPath(settings, key)) : "";
      const boundTypo = String(settings.typography_global || "");
      let items = "";
      if (kind === "color") {
        items = app.globalColors().map((c) => `<button type="button" class="lb-globals-item${boundColor === c.id ? " is-active" : ""}" data-global-id="${app.esc(c.id)}"><i style="background:${app.esc(c.value)}"></i><span>${app.esc(c.title)}</span></button>`).join("");
      } else {
        items = app.globalTypography().map((t3) => `<button type="button" class="lb-globals-item${boundTypo === t3.id ? " is-active" : ""}" data-global-id="${app.esc(t3.id)}"><span class="lb-globals-typo-preview" style="font-family:${app.esc(t3.font_family || "inherit")};font-weight:${app.esc(t3.font_weight || "600")}">Aa</span><span>${app.esc(t3.title)}</span></button>`).join("");
      }
      const bound = kind === "color" ? boundColor : boundTypo;
      const pop = document.createElement("div");
      pop.className = "lb-globals-popover";
      pop.innerHTML = `<header>${app.esc(kind === "color" ? app.t("Global Colors") : app.t("Global Typography"))}</header><div class="lb-globals-list">${items || '<p class="lb-muted">' + app.t("No globals yet.") + "</p>"}</div><div class="lb-globals-actions">${bound ? `<button type="button" class="lb-btn" data-global-clear>${app.t("Unlink")}</button>` : ""}<button type="button" class="lb-btn" data-open-site-settings>${app.t("Manage Globals")}</button></div>`;
      document.body.appendChild(pop);
      app.globalsPopover = pop;
      const rect = btn.getBoundingClientRect();
      const w = pop.offsetWidth || 240;
      const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.right - w));
      let top = rect.bottom + 6;
      if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - pop.offsetHeight - 6);
      pop.style.left = left + "px";
      pop.style.top = top + "px";
      pop.querySelectorAll("[data-global-id]").forEach((b) => {
        b.onclick = () => {
          if (kind === "color") app.bindColorGlobal(key, b.dataset.globalId);
          else app.bindTypographyGlobal(b.dataset.globalId);
          app.closeGlobalsPopover();
        };
      });
      pop.querySelector("[data-global-clear]")?.addEventListener("click", () => {
        if (kind === "color") app.unbindColorGlobal(key);
        else app.unbindTypographyGlobal();
        app.closeGlobalsPopover();
      });
      pop.querySelector("[data-open-site-settings]")?.addEventListener("click", () => {
        app.closeGlobalsPopover();
        app.openSiteSettings(kind === "color" ? "colors" : "typography");
      });
    };
    app.bindColorGlobal = function bindColorGlobal(key, id) {
      if (!key || !id) return;
      app.update(key, `{{var:colors.${id}}}`);
    };
    app.unbindColorGlobal = function unbindColorGlobal(key) {
      const r = app.selected && app.locate(app.state.root, app.selected);
      if (!r || !key) return;
      const cur = app.getPath(r.node.settings, key);
      const id = app.parseColorGlobal(cur);
      app.update(key, id ? app.globalColorValue(id) : "#000000");
    };
    app.bindTypographyGlobal = function bindTypographyGlobal(id) {
      if (!id) return;
      const r = app.selected && app.locate(app.state.root, app.selected);
      if (!r) return;
      app.commit();
      r.node.settings.typography_global = id;
      if (app.typographyPreset(id)?.font_family) app.lb101LoadEditorFont?.(app.typographyPreset(id).font_family);
      app.render();
    };
    app.unbindTypographyGlobal = function unbindTypographyGlobal() {
      const r = app.selected && app.locate(app.state.root, app.selected);
      if (!r) return;
      app.commit();
      r.node.settings.typography_global = "";
      app.render();
    };
    app.enhanceGlobalsControls = function enhanceGlobalsControls() {
      const root = app.root?.querySelector(".lb-settings");
      if (!root || app.siteSettingsOpen) return;
      root.querySelectorAll('input[type="color"][data-setting]').forEach((input) => {
        if (input.closest(".lb-color-control")) return;
        const key = input.dataset.setting;
        const wrap = input.closest(".lb-control") || input.parentElement;
        if (!wrap) return;
        const label = wrap.querySelector("span")?.textContent || key;
        const r = app.selected && app.locate(app.state.root, app.selected);
        const val = r ? app.getPath(r.node.settings, key) : input.value;
        const html = app.colorControlHTML(key, val, label);
        wrap.insertAdjacentHTML("beforebegin", html);
        const created = wrap.previousElementSibling;
        wrap.remove();
        if (created && typeof app.bindSettingInputs === "function") app.bindSettingInputs(created);
        else created?.querySelector("[data-setting]")?.addEventListener("input", (e) => {
          const el = e.currentTarget;
          app.update(el.dataset.setting, el.value);
        });
      });
      root.querySelectorAll(".lb-control-section").forEach((sec) => {
        if (sec.querySelector(":scope > summary .lb-globals-btn")) return;
        if (!sec.querySelector('[data-setting="font_family"], .lb-font-family-select, [data-setting="font_weight"], [data-setting="weight"]')) return;
        const summary = sec.querySelector(":scope > summary");
        if (!summary) return;
        const r = app.selected && app.locate(app.state.root, app.selected);
        const bound = String(r && r.node.settings && r.node.settings.typography_global || "");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lb-globals-btn" + (bound ? " is-active" : "");
        btn.dataset.globalsKind = "typography";
        btn.dataset.globalsKey = "typography_global";
        btn.title = app.t("Global Typography");
        btn.setAttribute("aria-label", app.t("Global Typography"));
        btn.innerHTML = GLOBE;
        summary.appendChild(btn);
        if (bound) {
          sec.classList.add("is-global");
          const name = document.createElement("span");
          name.className = "lb-global-badge";
          name.textContent = (app.typographyPreset(bound) || {}).title || bound;
          summary.appendChild(name);
          sec.querySelectorAll("input,select,textarea").forEach((el) => {
            el.disabled = true;
          });
        }
      });
      root.querySelectorAll(".lb-globals-btn").forEach((b) => {
        if (b.__lbGlobals) return;
        b.__lbGlobals = true;
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.openGlobalsPopover(b);
        });
      });
    };
    app.siteSettingsHTML = function siteSettingsHTML() {
      const tab = app.siteSettingsTabs[app.siteSettingsTab] ? app.siteSettingsTab : "colors";
      let blurb = app.t("Global colors and typography presets are stored as CSS variables and can be bound from any color or typography control.");
      if (tab === "theme") blurb = app.t("Theme Style sets site-wide defaults for body text, headings, links, buttons, images and form fields. Individual units can still override them.");
      if (tab === "site") blurb = app.t("Layout, site identity, lightbox and background apply across the site. Title, tagline, logo and favicon write to WordPress settings.");
      if (tab === "kit") blurb = app.t("Export or import a ZIP kit of site settings, design tokens, templates and optional content with media.");
      let body = "";
      if (tab === "theme") {
        body = typeof app.themeStyleHTML === "function" ? app.themeStyleHTML() : "";
      } else if (tab === "site") {
        body = typeof app.kitSettingsHTML === "function" ? app.kitSettingsHTML() : "";
      } else if (tab === "kit") {
        body = typeof app.kitExportHTML === "function" ? app.kitExportHTML() : "";
      } else if (tab === "colors") {
        const colors = app.globalColors();
        const system = colors.filter((c) => c.system);
        const custom = colors.filter((c) => !c.system);
        body += `<div class="lb-ss-section"><h4>${app.t("System Colors")}</h4>${system.map((c) => app.siteColorRow(c)).join("")}</div>`;
        body += `<div class="lb-ss-section"><h4>${app.t("Custom Colors")}</h4>${custom.map((c) => app.siteColorRow(c)).join("") || '<p class="lb-muted">' + app.t("No custom colors yet.") + "</p>"}<button type="button" class="lb-btn" id="lb-ss-add-color">+ ${app.t("Add Color")}</button></div>`;
      } else {
        const list = app.globalTypography();
        const system = list.filter((t3) => t3.system);
        const custom = list.filter((t3) => !t3.system);
        body += `<div class="lb-ss-section"><h4>${app.t("System Typography")}</h4>${system.map((t3) => app.siteTypoRow(t3)).join("")}</div>`;
        body += `<div class="lb-ss-section"><h4>${app.t("Custom Typography")}</h4>${custom.map((t3) => app.siteTypoRow(t3)).join("") || '<p class="lb-muted">' + app.t("No custom typography yet.") + "</p>"}<button type="button" class="lb-btn" id="lb-ss-add-typo">+ ${app.t("Add Typography")}</button></div>`;
      }
      return `<div class="lb-site-settings"><div class="lb-ss-head"><button type="button" class="lb-btn" id="lb-ss-back" aria-label="${app.t("Back")}">\u2190</button><strong>${app.t("Site Settings")}</strong></div><p class="lb-muted">${blurb}</p><div class="lb-settings-tabs lb-ss-tabs"><button type="button" data-site-tab="colors" class="${tab === "colors" ? "active" : ""}">${app.t("Global Colors")}</button><button type="button" data-site-tab="typography" class="${tab === "typography" ? "active" : ""}">${app.t("Global Typography")}</button><button type="button" data-site-tab="theme" class="${tab === "theme" ? "active" : ""}">${app.t("Theme Style")}</button><button type="button" data-site-tab="site" class="${tab === "site" ? "active" : ""}">${app.t("Layout")}</button><button type="button" data-site-tab="kit" class="${tab === "kit" ? "active" : ""}">${app.t("Kit")}</button></div>${body}</div>`;
    };
    app.siteColorRow = function siteColorRow(c) {
      return `<div class="lb-ss-row" data-color-id="${app.esc(c.id)}"><input type="color" class="lb-ss-color" value="${app.esc(c.value)}"><input type="text" class="lb-ss-title" value="${app.esc(c.title)}" ${c.system ? "readonly" : ""}><code>${app.esc(c.id)}</code>${c.system ? "" : `<button type="button" class="lb-btn lb-ss-del" title="${app.t("Remove")}" aria-label="${app.t("Remove")}">\xD7</button>`}</div>`;
    };
    app.siteTypoRow = function siteTypoRow(t3) {
      const open = app.siteSettingsOpenId === t3.id ? " open" : "";
      const fonts = typeof app.lb104FontOptions === "function" ? app.lb104FontOptions(t3.font_family || "") : `<option value="">${app.t("Default")}</option>`;
      const weights = ["", "300", "400", "500", "600", "700", "800", "900"];
      return `<details class="lb-ss-typo" data-typo-id="${app.esc(t3.id)}"${open}><summary><span class="lb-ss-typo-preview" style="font-family:${app.esc(t3.font_family || "inherit")};font-weight:${app.esc(t3.font_weight || "600")};font-size:16px">Aa</span><input type="text" class="lb-ss-typo-title" value="${app.esc(t3.title)}" ${t3.system ? "readonly" : ""}>${t3.system ? "" : `<button type="button" class="lb-btn lb-ss-del" title="${app.t("Remove")}" aria-label="${app.t("Remove")}">\xD7</button>`}</summary><div class="lb-ss-typo-body"><label class="lb-control"><span>${app.t("Font Family")}</span><select class="lb-ss-typo-font">${fonts}</select></label><label class="lb-control"><span>${app.t("Size")}</span><input class="lb-ss-typo-size" value="${app.esc(t3.font_size || "")}" placeholder="16px"></label><label class="lb-control"><span>${app.t("Weight")}</span><select class="lb-ss-typo-weight">${weights.map((w) => `<option value="${w}" ${String(t3.font_weight || "") === w ? "selected" : ""}>${w || app.t("Default")}</option>`).join("")}</select></label><label class="lb-control"><span>${app.t("Line Height")}</span><input class="lb-ss-typo-lh" value="${app.esc(t3.line_height || "")}" placeholder="1.4"></label><label class="lb-control"><span>${app.t("Letter Spacing")}</span><input class="lb-ss-typo-ls" value="${app.esc(t3.letter_spacing || "")}" placeholder="0"></label><label class="lb-control"><span>${app.t("Transform")}</span><select class="lb-ss-typo-tt">${["", "none", "uppercase", "lowercase", "capitalize"].map((o) => `<option value="${o}" ${String(t3.text_transform || "") === o ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label><label class="lb-control"><span>${app.t("Style")}</span><select class="lb-ss-typo-fs">${["", "normal", "italic", "oblique"].map((o) => `<option value="${o}" ${String(t3.font_style || "") === o ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label><label class="lb-control"><span>${app.t("Decoration")}</span><select class="lb-ss-typo-td">${["", "none", "underline", "overline", "line-through"].map((o) => `<option value="${o}" ${String(t3.text_decoration || "") === o ? "selected" : ""}>${o || app.t("Default")}</option>`).join("")}</select></label></div></details>`;
    };
    app.readSiteSettingsFromPanel = function readSiteSettingsFromPanel() {
      const v = app.D.variables || (app.D.variables = {});
      v.colors = Object.assign({}, v.colors || {});
      v.color_titles = Object.assign({}, v.color_titles || {});
      v.typography = Object.assign({}, v.typography || {});
      app.root.querySelectorAll(".lb-ss-row[data-color-id]").forEach((row) => {
        const id = row.dataset.colorId;
        v.colors[id] = row.querySelector(".lb-ss-color")?.value || v.colors[id];
        v.color_titles[id] = row.querySelector(".lb-ss-title")?.value || v.color_titles[id] || id;
      });
      app.root.querySelectorAll(".lb-ss-typo[data-typo-id]").forEach((row) => {
        const id = row.dataset.typoId;
        const cur = Object.assign({}, v.typography[id] || { title: id, system: SYSTEM_TYPO.includes(id) });
        cur.title = row.querySelector(".lb-ss-typo-title")?.value || cur.title;
        cur.font_family = row.querySelector(".lb-ss-typo-font")?.value ?? cur.font_family;
        cur.font_size = row.querySelector(".lb-ss-typo-size")?.value ?? cur.font_size;
        cur.font_weight = row.querySelector(".lb-ss-typo-weight")?.value ?? cur.font_weight;
        cur.line_height = row.querySelector(".lb-ss-typo-lh")?.value ?? cur.line_height;
        cur.letter_spacing = row.querySelector(".lb-ss-typo-ls")?.value ?? cur.letter_spacing;
        cur.text_transform = row.querySelector(".lb-ss-typo-tt")?.value ?? cur.text_transform;
        cur.font_style = row.querySelector(".lb-ss-typo-fs")?.value ?? cur.font_style;
        cur.text_decoration = row.querySelector(".lb-ss-typo-td")?.value ?? cur.text_decoration;
        cur.system = SYSTEM_TYPO.includes(id);
        v.typography[id] = cur;
        if (id === "primary") {
          v.fonts = v.fonts || {};
          v.fonts.heading = cur.font_family || "";
        }
        if (id === "text") {
          v.fonts = v.fonts || {};
          v.fonts.body = cur.font_family || "";
        }
        if (cur.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(cur.font_family);
      });
      return v;
    };
    app.bindSiteSettings = function bindSiteSettings() {
      const persist = () => app.saveVariables(app.readSiteSettingsFromPanel());
      app.root.querySelector("#lb-ss-back")?.addEventListener("click", () => {
        app.siteSettingsOpen = false;
        app.refreshRightPanel();
      });
      app.root.querySelectorAll("[data-site-tab]").forEach((b) => b.addEventListener("click", () => {
        if (app.siteSettingsTab === "theme" && typeof app.saveThemeStyle === "function") app.saveThemeStyle(app.readThemeStyleFromPanel());
        else if (app.siteSettingsTab === "site" && typeof app.saveKitSettings === "function") app.saveKitSettings(app.readKitSettingsFromPanel());
        else if (app.siteSettingsTab !== "kit") persist();
        app.siteSettingsTab = b.dataset.siteTab;
        app.refreshRightPanel();
      }));
      app.root.querySelectorAll(".lb-ss-row input").forEach((el) => el.addEventListener("change", persist));
      app.root.querySelectorAll('.lb-ss-row input[type="color"]').forEach((el) => el.addEventListener("input", persist));
      app.root.querySelectorAll(".lb-ss-typo input, .lb-ss-typo select").forEach((el) => el.addEventListener("change", persist));
      app.root.querySelectorAll(".lb-ss-typo").forEach((d) => d.addEventListener("toggle", () => {
        if (d.open) app.siteSettingsOpenId = d.dataset.typoId;
      }));
      app.root.querySelectorAll(".lb-ss-typo-title").forEach((el) => el.addEventListener("click", (e) => e.stopPropagation()));
      app.root.querySelector("#lb-ss-add-color")?.addEventListener("click", () => {
        const v = app.readSiteSettingsFromPanel();
        v.colors = Object.assign({}, v.colors || {});
        v.color_titles = Object.assign({}, v.color_titles || {});
        const id = app.uniqueTokenId("custom", v.colors);
        v.colors[id] = "#6c7a89";
        v.color_titles[id] = app.t("Custom");
        app.saveVariables(v);
        app.refreshRightPanel();
      });
      app.root.querySelector("#lb-ss-add-typo")?.addEventListener("click", () => {
        const v = app.readSiteSettingsFromPanel();
        v.typography = Object.assign({}, v.typography || {});
        const id = app.uniqueTokenId("custom", v.typography);
        v.typography[id] = { title: app.t("Custom"), system: false, font_family: "", font_size: "16px", font_weight: "400", font_style: "", text_transform: "", text_decoration: "", line_height: "1.5", letter_spacing: "" };
        app.siteSettingsOpenId = id;
        app.saveVariables(v);
        app.refreshRightPanel();
      });
      app.root.querySelectorAll(".lb-ss-row .lb-ss-del").forEach((b) => b.addEventListener("click", () => {
        const id = b.closest("[data-color-id]")?.dataset.colorId;
        if (!id || SYSTEM_COLORS.includes(id)) return;
        const v = app.readSiteSettingsFromPanel();
        delete v.colors[id];
        delete v.color_titles[id];
        app.saveVariables(v);
        app.refreshRightPanel();
      }));
      app.root.querySelectorAll(".lb-ss-typo .lb-ss-del").forEach((b) => b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = b.closest("[data-typo-id]")?.dataset.typoId;
        if (!id || SYSTEM_TYPO.includes(id)) return;
        const v = app.readSiteSettingsFromPanel();
        delete v.typography[id];
        app.saveVariables(v);
        app.refreshRightPanel();
      }));
    };
    app.openSiteSettings = function openSiteSettings(tab) {
      app.closeMainMenu?.();
      app.closeGlobalsPopover();
      app.siteSettingsOpen = true;
      app.siteSettingsTab = app.siteSettingsTabs[tab] ? tab : app.siteSettingsTabs[app.siteSettingsTab] ? app.siteSettingsTab : "colors";
      app.activeTab = "settings";
      app.rightHidden = false;
      app.refreshRightPanel();
    };
    const oldSettings = app.settingsHTML;
    app.settingsHTML = function settingsHTMLWithSite() {
      if (app.siteSettingsOpen) return app.siteSettingsHTML();
      return oldSettings();
    };
    const oldRefresh = app.refreshRightPanel;
    app.refreshRightPanel = function refreshRightPanelWithGlobals() {
      oldRefresh();
      if (app.siteSettingsOpen) {
        app.bindSiteSettings();
        if (app.siteSettingsTab === "theme" && typeof app.bindThemeStyle === "function") app.bindThemeStyle();
        if (app.siteSettingsTab === "site" && typeof app.bindKitSettings === "function") app.bindKitSettings();
        if (app.siteSettingsTab === "kit" && typeof app.bindKitExport === "function") app.bindKitExport();
      } else app.enhanceGlobalsControls();
    };
    const oldSelect = app.selectNode;
    app.selectNode = function selectNodeCloseSite(id) {
      if (app.siteSettingsOpen) app.siteSettingsOpen = false;
      return oldSelect(id);
    };
    const oldMenu = app.handleMainMenu;
    app.handleMainMenu = function handleMainMenuWithSite(action) {
      if (action === "site-settings") {
        app.openSiteSettings();
        return;
      }
      return oldMenu(action);
    };
    if (typeof app.lb110DesignCss === "function") {
      const oldDesignCss = app.lb110DesignCss;
      app.lb110DesignCss = function lb110DesignCssWithTypo() {
        const rest = String(oldDesignCss() || "").replace(/:root\{[\s\S]*?\}/, "");
        return app.variablesToCss() + rest;
      };
    }
    if (app.styleKeys && app.styleKeys.add) app.styleKeys.add("typography_global");
    const oldStyle = app.styleInline;
    app.styleInline = function styleInlineWithGlobals(n) {
      let css = oldStyle(n);
      const s = n.settings || {};
      const id = String(s.typography_global || "");
      if (id) {
        const extra = ["font-family", "font-size", "font-weight", "font-style", "text-transform", "text-decoration", "line-height", "letter-spacing"].map((p) => `${p}:var(--lb-typo-${id}-${p})`).join(";");
        css = (css ? css.replace(/;?$/, ";") : "") + extra;
      }
      return css;
    };
    if (typeof app.lb09StyleFor === "function") {
      const old09 = app.lb09StyleFor;
      app.lb09StyleFor = function lb09StyleForWithGlobals(n) {
        if (n.settings && n.settings.typography_global) {
          const s = Object.assign({}, n.settings);
          TYPO_PROPS.concat(["weight", "size"]).forEach((k) => {
            delete s[k];
          });
          return old09(Object.assign({}, n, { settings: s }));
        }
        return old09(n);
      };
    }
    document.addEventListener("click", (e) => {
      if (app.globalsPopover && !e.target.closest(".lb-globals-popover") && !e.target.closest(".lb-globals-btn")) app.closeGlobalsPopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") app.closeGlobalsPopover();
    });
    app.globalTypography().forEach((t3) => {
      if (t3.font_family && app.lb101LoadEditorFont) app.lb101LoadEditorFont(t3.font_family);
    });
    app.applyDesignCss();
  }


export { installSiteSettings };
