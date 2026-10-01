import { app } from "./app.js";
function dynEligible(def) {
  if (!def || def.hidden) return false;
  const d = def.dynamic;
  if (!d) return false;
  if (d === true) return true;
  if (typeof d === "object" && d.active === false) return false;
  return !!(d.categories && d.categories.length) || !!d.active;
}
function dynCategories(def) {
  const d = def && def.dynamic;
  if (d && typeof d === "object" && Array.isArray(d.categories) && d.categories.length) return d.categories;
  const type = String((def && def.type) || "text");
  return (
    {
      text: ["text"],
      textarea: ["text"],
      wysiwyg: ["text", "html"],
      code: ["text", "html"],
      url: ["url", "text"],
      media: ["image"],
      number: ["number"],
      slider: ["number"],
      color: ["color"],
    }[type] || ["text"]
  );
}
function dynTagsFor(def, tags) {
  const want = new Set(dynCategories(def));
  return (Array.isArray(tags) ? tags : []).filter((tag) => (tag.categories || []).some((c) => want.has(c)));
}
function dynHost(settings, path) {
  const parts = String(path || "")
    .split(".")
    .filter(Boolean);
  if (!parts.length || !settings) return null;
  const last = parts[parts.length - 1];
  const bps = ["desktop", "tablet", "mobile", "mobile_extra", "tablet_extra", "laptop", "widescreen"];
  if (bps.indexOf(last) !== -1) return null;
  let host = settings;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (host == null || typeof host !== "object") return null;
    host = host[p];
  }
  if (!host || typeof host !== "object" || Array.isArray(host)) return null;
  return { host, key: last };
}
function dynPreview(binding, catalog) {
  if (!binding || !binding.tag) return "";
  const cat = catalog && typeof catalog === "object" ? catalog : {};
  const previews = cat.previews && typeof cat.previews === "object" ? cat.previews : {};
  let raw = "";
  if (binding.tag === "post_meta" && binding.key) raw = previews.post_meta || "{" + binding.key + "}";
  else if (binding.tag === "request_parameter" && binding.key) raw = "{" + binding.key + "}";
  else if (binding.tag === "shortcode" && binding.shortcode) raw = String(binding.shortcode);
  else raw = previews[binding.tag] != null ? String(previews[binding.tag]) : "";
  if (raw === "" && binding.fallback) raw = String(binding.fallback);
  if (raw === "") return "";
  return String(binding.before || "") + raw + String(binding.after || "");
}
function dynApplyPreviews(settings, catalog) {
  if (!settings || typeof settings !== "object") return settings;
  const out = Array.isArray(settings) ? settings.slice() : Object.assign({}, settings);
  const map = out._dynamic;
  const tags = catalog && Array.isArray(catalog.tags) ? catalog.tags : [];
  if (map && typeof map === "object") {
    Object.keys(map).forEach((key) => {
      const b = map[key];
      if (!b || !b.tag) return;
      const preview = dynPreview(b, catalog);
      const meta = tags.find((t3) => t3.name === b.tag) || null;
      const cats = (meta && meta.categories) || [];
      if (cats.indexOf("image") !== -1) {
        const url = preview || (catalog && catalog.previews && catalog.previews[b.tag]) || "";
        if (/_id$/.test(key)) {
          out[key] = 0;
          const urlKey = key.replace(/_id$/, "_url");
          if (url) out[urlKey] = url;
        } else if (url) {
          out[key] = url;
        }
      } else if (preview !== "") {
        out[key] = preview;
      } else if (b.fallback) {
        out[key] = String(b.before || "") + String(b.fallback) + String(b.after || "");
      }
    });
  }
  Object.keys(out).forEach((k) => {
    if (k === "_dynamic") return;
    if (Array.isArray(out[k]) && out[k].length && out[k][0] && typeof out[k][0] === "object") {
      out[k] = out[k].map((item) => (item && typeof item === "object" ? dynApplyPreviews(item, catalog) : item));
    }
  });
  return out;
}
function installDynamicTags() {
  app.lbDynCatalog = function lbDynCatalog() {
    const d = app.D && app.D.dynamicTags && typeof app.D.dynamicTags === "object" ? app.D.dynamicTags : {};
    return {
      tags: Array.isArray(d.tags) ? d.tags : [],
      groups: d.groups && typeof d.groups === "object" ? d.groups : {},
      categories: d.categories && typeof d.categories === "object" ? d.categories : {},
      previews: d.previews && typeof d.previews === "object" ? d.previews : {},
    };
  };
  app.lbDynControlDef = function lbDynControlDef(k, t3) {
    const passed = app.lbCtrlDef(t3);
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return passed;
    const controls = app.meta(r.node.type).controls || {};
    const parts = String(k || "").split(".");
    let schema = app.lbCtrlDef(controls[parts[0]]);
    if (parts.length >= 3 && (schema.type || "") === "repeater") {
      schema = app.lbCtrlDef((schema.fields || {})[parts[parts.length - 1]]);
    } else if (parts.length > 1 && /^\d+$/.test(parts[1]) === false) {
      schema = app.lbCtrlDef(controls[parts[0]] || passed);
    }
    return Object.assign({}, schema, passed, {
      dynamic: passed.dynamic || schema.dynamic || false,
    });
  };
  app.lbDynEligible = dynEligible;
  app.lbDynCategories = dynCategories;
  app.lbDynTagsFor = function lbDynTagsFor(def) {
    return dynTagsFor(def, app.lbDynCatalog().tags);
  };
  app.lbDynTagMeta = function lbDynTagMeta(name) {
    return app.lbDynCatalog().tags.find((t3) => t3.name === name) || null;
  };
  app.lbDynHost = dynHost;
  app.lbDynGet = function lbDynGet(path, settings) {
    const r = app.selected && app.locate(app.state.root, app.selected);
    const s = settings || (r && r.node && r.node.settings) || {};
    const loc = dynHost(s, path);
    if (!loc) return null;
    const map = loc.host._dynamic;
    const b = map && map[loc.key];
    return b && typeof b === "object" && b.tag ? b : null;
  };
  app.lbDynSet = function lbDynSet(path, binding) {
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return;
    const s = r.node.settings || (r.node.settings = {});
    const loc = dynHost(s, path);
    if (!loc) return;
    app.commit(app.t("Edited %s", app.meta(r.node.type).title || r.node.type), r.node.id);
    if (!loc.host._dynamic || typeof loc.host._dynamic !== "object") loc.host._dynamic = {};
    if (!binding || !binding.tag) {
      delete loc.host._dynamic[loc.key];
      if (!Object.keys(loc.host._dynamic).length) delete loc.host._dynamic;
    } else {
      loc.host._dynamic[loc.key] = binding;
    }
    app.render();
  };
  app.lbDynPreview = function lbDynPreview(binding) {
    return dynPreview(binding, app.lbDynCatalog());
  };
  app.lbDynApplyPreviews = function lbDynApplyPreviews(settings) {
    return dynApplyPreviews(settings, app.lbDynCatalog());
  };
  app.lbDynActiveHTML = function lbDynActiveHTML(k, def, binding) {
    const meta = app.lbDynTagMeta(binding.tag) || { name: binding.tag, title: binding.tag, controls: {} };
    const preview = dynPreview(binding, app.lbDynCatalog());
    const extra = meta.controls && typeof meta.controls === "object" ? meta.controls : {};
    let fields = "";
    Object.keys(extra).forEach((fk) => {
      const f = extra[fk] || {};
      const val = binding[fk] != null ? binding[fk] : f.default || "";
      const label = f.label || fk;
      if (f.type === "select") {
        const opts =
          f.options && typeof f.options === "object" && !Array.isArray(f.options)
            ? Object.keys(f.options)
                .map(
                  (ok) =>
                    `<option value="${app.esc(ok)}" ${String(ok) === String(val) ? "selected" : ""}>${app.esc(f.options[ok])}</option>`,
                )
                .join("")
            : (Array.isArray(f.options) ? f.options : [])
                .map(
                  (ok) =>
                    `<option value="${app.esc(ok)}" ${String(ok) === String(val) ? "selected" : ""}>${app.esc(ok)}</option>`,
                )
                .join("");
        fields += `<label class="lb-control"><span>${app.esc(label)}</span><select data-dyn-field="${app.esc(fk)}">${opts}</select></label>`;
      } else if (f.type === "textarea") {
        fields += `<label class="lb-control"><span>${app.esc(label)}</span><textarea data-dyn-field="${app.esc(fk)}" rows="3" placeholder="${app.esc(f.placeholder || "")}">${app.esc(val)}</textarea></label>`;
      } else {
        fields += `<label class="lb-control"><span>${app.esc(label)}</span><input data-dyn-field="${app.esc(fk)}" type="text" value="${app.esc(val)}" placeholder="${app.esc(f.placeholder || "")}"></label>`;
      }
      if (f.description) fields += `<p class="lb-control-desc">${app.esc(f.description)}</p>`;
    });
    return `<div class="lb-dyn-active">
			<div class="lb-dyn-chip"><strong>${app.esc(meta.title || binding.tag)}</strong><span class="lb-dyn-preview">${app.esc(preview || app.t("No preview"))}</span></div>
			<div class="lb-dyn-actions"><button type="button" class="lb-btn lb-dyn-change">${app.t("Change")}</button><button type="button" class="lb-btn lb-dyn-clear">${app.t("Remove")}</button></div>
			${fields}
			<label class="lb-control"><span>${app.t("Before")}</span><input data-dyn-field="before" type="text" value="${app.esc(binding.before || "")}"></label>
			<label class="lb-control"><span>${app.t("After")}</span><input data-dyn-field="after" type="text" value="${app.esc(binding.after || "")}"></label>
			<label class="lb-control"><span>${app.t("Fallback")}</span><input data-dyn-field="fallback" type="text" value="${app.esc(binding.fallback || "")}"></label>
		</div>`;
  };
  app.lbDynWrap = function lbDynWrap(k, def, html) {
    const binding = app.lbDynGet(k);
    const on = !!(binding && binding.tag);
    return `<div class="lb-dyn${on ? " is-on" : ""}" data-dyn-key="${app.esc(k)}"><button type="button" class="lb-dyn-toggle${on ? " is-on" : ""}" title="${app.t("Dynamic Tags")}" aria-pressed="${on ? "true" : "false"}" aria-label="${app.t("Dynamic Tags")}">\u26A1</button><div class="lb-dyn-static"${on ? " hidden" : ""}>${html}</div>${on ? app.lbDynActiveHTML(k, def, binding) : ""}</div>`;
  };
  app.lbDynClosePicker = function lbDynClosePicker() {
    document.querySelectorAll(".lb-dyn-popover").forEach((n) => n.remove());
    app.dynPicker = null;
  };
  app.lbDynOpenPicker = function lbDynOpenPicker(btn) {
    app.lbDynClosePicker();
    app.closeGlobalsPopover && app.closeGlobalsPopover();
    const wrap = btn.closest("[data-dyn-key]");
    if (!wrap) return;
    const key = wrap.dataset.dynKey;
    const r = app.selected && app.locate(app.state.root, app.selected);
    if (!r) return;
    const def = app.lbDynControlDef(key, (app.meta(r.node.type).controls || {})[String(key).split(".")[0]] || {});
    const tags = dynTagsFor(def, app.lbDynCatalog().tags);
    const groups = app.lbDynCatalog().groups;
    const current = (app.lbDynGet(key) || {}).tag || "";
    const byGroup = {};
    tags.forEach((tag) => {
      const g = tag.group || "post";
      (byGroup[g] || (byGroup[g] = [])).push(tag);
    });
    let body = "";
    Object.keys(byGroup).forEach((g) => {
      body += `<div class="lb-dyn-group"><h5>${app.esc(groups[g] || g)}</h5>${byGroup[g]
        .map((tag) => {
          const prev = app.lbDynCatalog().previews[tag.name];
          return `<button type="button" class="lb-dyn-item${tag.name === current ? " is-active" : ""}" data-dyn-tag="${app.esc(tag.name)}"><span>${app.esc(tag.title)}</span>${prev ? `<small>${app.esc(String(prev))}</small>` : ""}</button>`;
        })
        .join("")}</div>`;
    });
    const pop = document.createElement("div");
    pop.className = "lb-dyn-popover";
    pop.innerHTML = `<header>${app.esc(app.t("Dynamic Tags"))}</header><div class="lb-dyn-list">${body || '<p class="lb-muted">' + app.t("No tags for this control.") + "</p>"}</div>`;
    document.body.appendChild(pop);
    app.dynPicker = pop;
    const rect = btn.getBoundingClientRect();
    const w = pop.offsetWidth || 260;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.right - w));
    let top = rect.bottom + 6;
    if (top + pop.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - pop.offsetHeight - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.querySelectorAll("[data-dyn-tag]").forEach((b) => {
      b.onclick = () => {
        const name = b.dataset.dynTag;
        const prev = app.lbDynGet(key) || {};
        app.lbDynSet(key, Object.assign({ before: "", after: "", fallback: "" }, prev, { tag: name }));
        app.lbDynClosePicker();
      };
    });
  };
  app.lbDynBind = function lbDynBind() {
    if (!app.root) return;
    app.root.querySelectorAll(".lb-dyn-toggle").forEach((btn) => {
      if (btn.__lbDyn) return;
      btn.__lbDyn = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wrap = btn.closest("[data-dyn-key]");
        if (!wrap) return;
        if (wrap.classList.contains("is-on")) {
          app.lbDynSet(wrap.dataset.dynKey, null);
          return;
        }
        app.lbDynOpenPicker(btn);
      });
    });
    app.root.querySelectorAll(".lb-dyn-change").forEach((btn) => {
      if (btn.__lbDyn) return;
      btn.__lbDyn = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const wrap = btn.closest("[data-dyn-key]");
        const toggle = wrap && wrap.querySelector(".lb-dyn-toggle");
        if (toggle) app.lbDynOpenPicker(toggle);
      });
    });
    app.root.querySelectorAll(".lb-dyn-clear").forEach((btn) => {
      if (btn.__lbDyn) return;
      btn.__lbDyn = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const wrap = btn.closest("[data-dyn-key]");
        if (wrap) app.lbDynSet(wrap.dataset.dynKey, null);
      });
    });
    app.root.querySelectorAll("[data-dyn-field]").forEach((el) => {
      if (el.__lbDyn) return;
      el.__lbDyn = true;
      const apply = () => {
        const wrap = el.closest("[data-dyn-key]");
        if (!wrap) return;
        const cur = app.lbDynGet(wrap.dataset.dynKey) || {};
        if (!cur.tag) return;
        const next = Object.assign({}, cur, { [el.dataset.dynField]: el.value });
        const r = app.selected && app.locate(app.state.root, app.selected);
        if (!r) return;
        const loc = dynHost(r.node.settings, wrap.dataset.dynKey);
        if (!loc) return;
        if (!loc.host._dynamic) loc.host._dynamic = {};
        loc.host._dynamic[loc.key] = next;
        app.dirty = true;
        app.scheduleSave && app.scheduleSave();
        const chip = wrap.querySelector(".lb-dyn-preview");
        if (chip) chip.textContent = dynPreview(next, app.lbDynCatalog()) || app.t("No preview");
        app.lbPaintCanvas && app.lbPaintCanvas();
      };
      el.addEventListener("change", () => {
        const wrap = el.closest("[data-dyn-key]");
        if (!wrap) return;
        const cur = Object.assign({}, app.lbDynGet(wrap.dataset.dynKey) || {}, { [el.dataset.dynField]: el.value });
        app.lbDynSet(wrap.dataset.dynKey, cur);
      });
      el.addEventListener("input", apply);
    });
  };
  const oldControl = app.control;
  app.control = function controlDynamic(k, t3, v, label) {
    const html = oldControl(k, t3, v, label);
    const def = app.lbDynControlDef(k, t3);
    if (!html || !dynEligible(def) || (def.type || "") === "repeater") return html;
    return app.lbDynWrap(k, def, html);
  };
  const oldSanitize = app.lbSanitizeNodeForCanvas;
  app.lbSanitizeNodeForCanvas = function lbSanitizeNodeForCanvasDynamic(n) {
    const out = oldSanitize ? oldSanitize(n) : n;
    if (!out || typeof out !== "object") return out;
    const next = Object.assign({}, out);
    if (next.settings && typeof next.settings === "object")
      next.settings = dynApplyPreviews(next.settings, app.lbDynCatalog());
    if (Array.isArray(next.children)) next.children = next.children.map(app.lbSanitizeNodeForCanvas);
    return next;
  };
  const oldBind = app.bindRightPanel;
  app.bindRightPanel = function bindRightPanelDynamic() {
    oldBind && oldBind();
    app.lbDynBind();
  };
  if (typeof app.lb010Dynamic === "function") {
    app.lb010Dynamic = function lb010DynamicHelp() {
      return app.lb09Section(
        app.t("Dynamic Content"),
        `<p class="lb-control-desc">${app.t("Use the lightning button on a control to insert post, site, or user data.")}</p>`,
        false,
      );
    };
  }
  document.addEventListener("mousedown", (e) => {
    if (
      app.dynPicker &&
      !e.target.closest(".lb-dyn-popover") &&
      !e.target.closest(".lb-dyn-toggle") &&
      !e.target.closest(".lb-dyn-change")
    ) {
      app.lbDynClosePicker();
    }
  });
}

export { dynEligible, dynCategories, dynTagsFor, dynHost, dynPreview, dynApplyPreviews, installDynamicTags };
