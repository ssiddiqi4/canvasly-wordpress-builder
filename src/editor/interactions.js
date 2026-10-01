import { app } from "./app.js";
function fxCatalog() {
  const raw = (app.D && app.D.interactions) || {};
  const presets = Array.isArray(raw.presets) ? raw.presets : [];
  return {
    presets,
    groups: raw.groups && typeof raw.groups === "object" ? raw.groups : {},
    triggers: raw.triggers && typeof raw.triggers === "object" ? raw.triggers : {},
    kinds: raw.kinds && typeof raw.kinds === "object" ? raw.kinds : {},
    easings: raw.easings && typeof raw.easings === "object" ? raw.easings : {},
  };
}
function fxDefault() {
  return {
    id: typeof app.eid === "function" ? app.eid() : "i_" + Math.random().toString(36).slice(2, 10),
    kind: "entrance",
    trigger: "viewport",
    effect: "fade",
    duration: 0.6,
    delay: 0,
    easing: "ease",
    iteration: 1,
    repeat: false,
    threshold: 0.15,
    exclude: [],
    keyframes: [
      { offset: 0, opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, blur: 0 },
      { offset: 100, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, blur: 0 },
    ],
  };
}
function fxList(node) {
  if (!node) return [];
  if (Array.isArray(node.interactions) && node.interactions.length) return node.interactions;
  const s = node.settings || {};
  if (s.interaction) {
    return [
      {
        id: "i_legacy",
        kind: "entrance",
        trigger: s.interaction_trigger || "viewport",
        effect: s.interaction,
        duration: s.interaction_duration ?? 0.6,
        delay: s.interaction_delay ?? 0,
        easing: s.interaction_easing || "ease",
        iteration: 1,
        repeat: !!s.interaction_repeat,
        threshold: s.interaction_threshold ?? 0.15,
        exclude: [],
        keyframes: [],
      },
    ];
  }
  return [];
}
function fxTitle(item, index) {
  const cat = fxCatalog();
  const kind = cat.kinds[item.kind] || item.kind || "entrance";
  let effect = item.effect || "fade";
  if (item.kind === "custom" || effect === "custom") effect = cat.kinds.custom || "Custom";
  else {
    const p = cat.presets.find((x) => x.id === effect);
    effect = p ? p.label : effect;
  }
  const trigger = cat.triggers[item.trigger] || item.trigger || "viewport";
  return kind + " \xB7 " + effect + " \xB7 " + trigger || "Item " + (index + 1);
}
function fxPreviewClasses(item) {
  const kind = item.kind || "entrance";
  const trigger = item.trigger || "viewport";
  const effect = item.effect || "fade";
  const cls = ["lb-fx", "lb-fx-preview"];
  if (kind === "exit") cls.push("lb-fx-exit");
  if (trigger === "scroll") cls.push("lb-fx-scroll");
  if (kind === "custom" || effect === "custom") cls.push("lb-fx-custom-0");
  else cls.push("lb-fx-" + String(effect).replace(/[^a-z0-9_-]/gi, ""));
  return cls;
}
function t(key) {
  return typeof app.t === "function" ? app.t(key) : key;
}
function sel(name, value, options, data) {
  const opts = Object.entries(options)
    .map(
      ([k, label]) =>
        `<option value="${app.esc(k)}" ${String(k) === String(value) ? "selected" : ""}>${app.esc(label)}</option>`,
    )
    .join("");
  return `<label class="lb-control"><span>${app.esc(name)}</span><select ${data}>${opts}</select></label>`;
}
function num(name, value, data, extra) {
  return `<label class="lb-control"><span>${app.esc(name)}</span><input type="number" value="${app.esc(value ?? "")}" ${data} ${extra || ""}></label>`;
}
function panelHTML(node) {
  const cat = fxCatalog();
  const items = fxList(node);
  const storeKey = (node.id || "") + "|fx";
  const open = app.fxOpen || (app.fxOpen = {});
  let map = open[storeKey];
  if (!map) {
    map = open[storeKey] = {};
    if (items[0]) map[items[0].id || "0"] = true;
  }
  const grouped = {};
  cat.presets.forEach((p) => {
    const g = p.group || "special";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  });
  const groupLabels = cat.groups || {};
  const effectSelect = (current, index) => {
    let html = `<label class="lb-control"><span>${app.esc(t("Effect"))}</span><select data-fx-field="effect" data-fx-index="${index}">`;
    Object.keys(grouped).forEach((g) => {
      html += `<optgroup label="${app.esc(groupLabels[g] || g)}">`;
      grouped[g].forEach((p) => {
        html += `<option value="${app.esc(p.id)}" ${p.id === current ? "selected" : ""}>${app.esc(p.label)}</option>`;
      });
      html += "</optgroup>";
    });
    html += "</select></label>";
    return html;
  };
  const bp = typeof app.enabledBreakpoints === "function" ? app.enabledBreakpoints() : [];
  const rows = items
    .map((item, i) => {
      const id = item.id || String(i);
      const isOpen = !!map[id];
      let body = "";
      if (isOpen) {
        body += sel(t("Kind"), item.kind || "entrance", cat.kinds, `data-fx-field="kind" data-fx-index="${i}"`);
        body += sel(
          t("Trigger"),
          item.trigger || "viewport",
          cat.triggers,
          `data-fx-field="trigger" data-fx-index="${i}"`,
        );
        if ((item.kind || "entrance") !== "custom") {
          body += effectSelect(item.effect || "fade", i);
        } else {
          body += keyframeEditor(item, i);
        }
        body += num(
          t("Duration"),
          item.duration ?? 0.6,
          `data-fx-field="duration" data-fx-index="${i}" step="0.05" min="0" max="30"`,
        );
        body += num(
          t("Delay"),
          item.delay ?? 0,
          `data-fx-field="delay" data-fx-index="${i}" step="0.05" min="0" max="30"`,
        );
        body += sel(t("Easing"), item.easing || "ease", cat.easings, `data-fx-field="easing" data-fx-index="${i}"`);
        body += num(
          t("Iteration"),
          item.iteration === "infinite" ? "" : (item.iteration ?? 1),
          `data-fx-field="iteration" data-fx-index="${i}" min="1" max="20" step="1" placeholder="${app.esc(t("Infinite"))}"`,
        );
        if ((item.trigger || "viewport") === "viewport") {
          body += num(
            t("Viewport Threshold"),
            item.threshold ?? 0.15,
            `data-fx-field="threshold" data-fx-index="${i}" step="0.05" min="0" max="1"`,
          );
          body += `<label class="lb-control lb-switch"><input type="checkbox" data-fx-field="repeat" data-fx-index="${i}" ${item.repeat ? "checked" : ""}><span>${app.esc(t("Repeat when leaving view"))}</span></label>`;
        }
        if (bp.length) {
          const ex = Array.isArray(item.exclude) ? item.exclude : [];
          body += `<div class="lb-control"><span>${app.esc(t("Skip on"))}</span><div class="lb-fx-exclude">${bp.map((b) => `<label class="lb-switch"><input type="checkbox" data-fx-exclude="${app.esc(b.name)}" data-fx-index="${i}" ${ex.includes(b.name) ? "checked" : ""}><span>${app.esc(b.label || b.name)}</span></label>`).join("")}</div></div>`;
        }
        body += `<button type="button" class="lb-btn lb-fx-preview-btn" data-fx-preview="${i}">${app.esc(t("Preview"))}</button>`;
      }
      return `<div class="lb-repeater-item${isOpen ? " is-open" : ""}" data-fx-id="${app.esc(id)}" data-fx-index="${i}"><div class="lb-repeater-head"><span class="lb-repeater-handle" aria-hidden="true">\u22EE\u22EE</span><button type="button" class="lb-repeater-toggle lb-fx-toggle" aria-expanded="${isOpen ? "true" : "false"}">${app.esc(fxTitle(item, i))}</button><button type="button" class="lb-repeater-dup lb-fx-dup" title="${app.esc(t("Duplicate"))}">\u29C9</button><button type="button" class="lb-repeater-del lb-fx-del" title="${app.esc(t("Remove"))}">\xD7</button></div>${isOpen ? `<div class="lb-repeater-body">${body}</div>` : ""}</div>`;
    })
    .join("");
  return app.lb09Section(
    t("Interactions"),
    `<div class="lb-fx-panel" data-fx-panel="1"><div class="lb-repeater-items">${rows || `<div class="lb-repeater-empty">${app.esc(t("No motion effects yet"))}</div>`}</div><button type="button" class="lb-btn lb-fx-add">+ ${app.esc(t("Add interaction"))}</button><p class="lb-control-desc">${app.esc(t("Respects the visitor reduced-motion preference. Use Preview to play the effect in the canvas."))}</p></div>`,
    true,
  );
}
function keyframeEditor(item, index) {
  const frames = Array.isArray(item.keyframes) && item.keyframes.length ? item.keyframes : fxDefault().keyframes;
  const rows = frames
    .map(
      (f, fi) => `<div class="lb-fx-kf" data-fx-kf="${fi}" data-fx-index="${index}">
		<input type="number" min="0" max="100" step="1" value="${app.esc(f.offset ?? 0)}" data-fx-kf-field="offset" title="${app.esc(t("Offset"))}">
		<input type="number" min="0" max="1" step="0.05" value="${app.esc(f.opacity ?? 1)}" data-fx-kf-field="opacity" title="${app.esc(t("Opacity"))}">
		<input type="number" step="1" value="${app.esc(f.x ?? 0)}" data-fx-kf-field="x" title="X">
		<input type="number" step="1" value="${app.esc(f.y ?? 0)}" data-fx-kf-field="y" title="Y">
		<input type="number" min="0" max="5" step="0.05" value="${app.esc(f.scale ?? 1)}" data-fx-kf-field="scale" title="${app.esc(t("Scale"))}">
		<input type="number" step="1" value="${app.esc(f.rotate ?? 0)}" data-fx-kf-field="rotate" title="${app.esc(t("Rotate"))}">
		<button type="button" class="lb-fx-kf-del" title="${app.esc(t("Remove"))}">\xD7</button>
	</div>`,
    )
    .join("");
  return `<div class="lb-control lb-fx-keyframes"><span>${app.esc(t("Keyframes"))}</span><div class="lb-fx-kf-head"><span>%</span><span>${app.esc(t("Opacity"))}</span><span>X</span><span>Y</span><span>${app.esc(t("Scale"))}</span><span>${app.esc(t("Rotate"))}</span><span></span></div>${rows}<button type="button" class="lb-btn lb-fx-kf-add" data-fx-index="${index}">+ ${app.esc(t("Add keyframe"))}</button></div>`;
}
function ensureList(node) {
  if (!Array.isArray(node.interactions)) node.interactions = fxList(node).map((x) => JSON.parse(JSON.stringify(x)));
  return node.interactions;
}
function previewItem(node, item) {
  const fd = typeof app.frameDoc === "function" ? app.frameDoc() : null;
  const el = fd && fd.querySelector('.lb-node[data-id="' + CSS.escape(String(node.id)) + '"]');
  if (!el) return;
  const cls = fxPreviewClasses(item);
  el.classList.remove("lb-fx-play", "lb-fx-preview");
  cls.forEach((c) => el.classList.add(c));
  el.style.setProperty("--lb-fx-duration", (Number(item.duration) || 0.6) + "s");
  el.style.setProperty("--lb-fx-delay", (Number(item.delay) || 0) + "s");
  el.style.setProperty("--lb-fx-easing", item.easing || "ease");
  el.style.setProperty("--lb-fx-iteration", item.iteration === "infinite" ? "infinite" : String(item.iteration || 1));
  if (item.kind === "custom" || item.effect === "custom") applyPreviewKeyframes(el, node, item);
  void el.offsetWidth;
  el.classList.add("lb-fx-play");
  const ms = ((Number(item.duration) || 0.6) + (Number(item.delay) || 0)) * 1e3 + 80;
  clearTimeout(el.__lbFxTimer);
  el.__lbFxTimer = setTimeout(
    () => {
      cls.forEach((c) => el.classList.remove(c));
      el.classList.remove("lb-fx-play", "lb-fx-preview");
      const tag = el.querySelector("style[data-lb-fx-preview]");
      if (tag) tag.remove();
    },
    Math.min(8e3, Math.max(400, ms)),
  );
}
function applyPreviewKeyframes(el, node, item) {
  const frames = Array.isArray(item.keyframes) ? item.keyframes : [];
  if (!frames.length) return;
  const name = "lb-fx-preview-" + String(node.id).replace(/[^a-zA-Z0-9_-]/g, "");
  const body = frames
    .map((f) => {
      const op = f.opacity == null ? 1 : f.opacity;
      const x = Number(f.x) || 0;
      const y = Number(f.y) || 0;
      const sc = f.scale == null ? 1 : f.scale;
      const rot = Number(f.rotate) || 0;
      const blur = Number(f.blur) || 0;
      return `${Number(f.offset) || 0}%{opacity:${op};transform:translate(${x}px,${y}px) scale(${sc}) rotate(${rot}deg);filter:blur(${blur}px)}`;
    })
    .join("");
  let tag = el.querySelector("style[data-lb-fx-preview]");
  if (!tag) {
    tag = el.ownerDocument.createElement("style");
    tag.setAttribute("data-lb-fx-preview", "1");
    el.appendChild(tag);
  }
  tag.textContent = `@keyframes ${name}{${body}}`;
  el.style.animationName = name;
}
function installInteractions() {
  app.fxOpen = app.fxOpen || {};
  app.fxCatalog = fxCatalog;
  app.fxList = fxList;
  app.fxDefault = fxDefault;
  app.fxPreview = previewItem;
  const prevSettings = app.settingsHTML;
  app.settingsHTML = function settingsHTMLWithFx() {
    let html = prevSettings();
    if (!app.selected || app.styleTab !== "advanced") return html;
    const r = app.locate(app.state.root, app.selected);
    if (!r || !r.node) return html;
    const extra = panelHTML(r.node);
    if (html.includes("lb-a11y-box"))
      html = html.replace('<div class="lb-a11y-box"', extra + '<div class="lb-a11y-box"');
    else if (html.includes("lb-action-grid"))
      html = html.replace('<div class="lb-action-grid"', extra + '<div class="lb-action-grid"');
    else html += extra;
    return html;
  };
  const prevBind = app.bind;
  app.bind = function bindWithFx() {
    prevBind();
    bindPanel();
  };
  const prevRefresh = app.refreshRightPanel;
  app.refreshRightPanel = function refreshRightPanelWithFx() {
    prevRefresh();
    bindPanel();
  };
}
function bindPanel() {
  const box = app.root && app.root.querySelector("[data-fx-panel]");
  if (!box || box.__lbFxBound) return;
  box.__lbFxBound = true;
  const nodeOf = () => app.selected && app.locate(app.state.root, app.selected);
  const listOf = () => {
    const r = nodeOf();
    if (!r) return null;
    return ensureList(r.node);
  };
  const storeOf = () => {
    const r = nodeOf();
    return (r ? r.node.id : "") + "|fx";
  };
  const touch = () => {
    app.dirty = true;
    if (typeof app.scheduleSave === "function") app.scheduleSave();
  };
  box.querySelector(".lb-fx-add")?.addEventListener("click", () => {
    const r = nodeOf(),
      list = listOf();
    if (!r || !list) return;
    app.commit();
    const item = fxDefault();
    list.push(item);
    app.fxOpen[storeOf()] = { [item.id]: true };
    touch();
    app.refreshRightPanel();
  });
  box.querySelectorAll(".lb-fx-toggle").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const item = b.closest("[data-fx-id]");
      if (!item) return;
      const id = item.dataset.fxId;
      const map = app.fxOpen[storeOf()] || (app.fxOpen[storeOf()] = {});
      map[id] = !map[id];
      app.refreshRightPanel();
    }),
  );
  box.querySelectorAll(".lb-fx-dup").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const list = listOf();
      if (!list) return;
      const i = Number(b.closest("[data-fx-index]")?.dataset.fxIndex);
      if (!Number.isFinite(i) || !list[i]) return;
      app.commit();
      const copy = JSON.parse(JSON.stringify(list[i]));
      copy.id = app.eid();
      list.splice(i + 1, 0, copy);
      app.fxOpen[storeOf()] = { [copy.id]: true };
      touch();
      app.refreshRightPanel();
    }),
  );
  box.querySelectorAll(".lb-fx-del").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const r = nodeOf(),
        list = listOf();
      if (!r || !list) return;
      const i = Number(b.closest("[data-fx-index]")?.dataset.fxIndex);
      if (!Number.isFinite(i)) return;
      app.commit();
      list.splice(i, 1);
      touch();
      app.refreshRightPanel();
    }),
  );
  box.querySelectorAll("[data-fx-field]").forEach((el) => {
    const apply = () => {
      const list = listOf();
      if (!list) return;
      const i = Number(el.dataset.fxIndex);
      if (!list[i]) return;
      const field = el.dataset.fxField;
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.type === "number") {
        if (field === "iteration" && String(el.value).trim() === "") v = "infinite";
        else v = el.value === "" ? "" : Number(el.value);
      }
      if (!el.__lbFxStarted) {
        app.commit();
        el.__lbFxStarted = true;
      }
      list[i][field] = v;
      if (field === "kind" && v === "custom") list[i].effect = "custom";
      touch();
      if (el.tagName === "SELECT" || field === "kind" || field === "trigger") app.refreshRightPanel();
    };
    el.addEventListener("change", () => {
      apply();
      el.__lbFxStarted = false;
    });
    if (el.type === "number") el.addEventListener("input", apply);
  });
  box.querySelectorAll("[data-fx-exclude]").forEach((el) => {
    el.addEventListener("change", () => {
      const list = listOf();
      if (!list) return;
      const i = Number(el.dataset.fxIndex);
      if (!list[i]) return;
      app.commit();
      const bp = el.dataset.fxExclude;
      const cur = Array.isArray(list[i].exclude) ? list[i].exclude.slice() : [];
      const has = cur.includes(bp);
      list[i].exclude = el.checked ? (has ? cur : cur.concat(bp)) : cur.filter((x) => x !== bp);
      touch();
    });
  });
  box.querySelectorAll("[data-fx-kf-field]").forEach((el) => {
    el.addEventListener("change", () => {
      const list = listOf();
      if (!list) return;
      const wrap = el.closest("[data-fx-kf]");
      const i = Number(wrap?.dataset.fxIndex);
      const fi = Number(wrap?.dataset.fxKf);
      if (!list[i] || !Array.isArray(list[i].keyframes) || !list[i].keyframes[fi]) return;
      app.commit();
      list[i].keyframes[fi][el.dataset.fxKfField] = el.value === "" ? 0 : Number(el.value);
      touch();
    });
  });
  box.querySelectorAll(".lb-fx-kf-add").forEach((b) =>
    b.addEventListener("click", () => {
      const list = listOf();
      if (!list) return;
      const i = Number(b.dataset.fxIndex);
      if (!list[i]) return;
      app.commit();
      if (!Array.isArray(list[i].keyframes)) list[i].keyframes = fxDefault().keyframes;
      list[i].keyframes.push({ offset: 100, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, blur: 0 });
      touch();
      app.refreshRightPanel();
    }),
  );
  box.querySelectorAll(".lb-fx-kf-del").forEach((b) =>
    b.addEventListener("click", () => {
      const list = listOf();
      if (!list) return;
      const wrap = b.closest("[data-fx-kf]");
      const i = Number(wrap?.dataset.fxIndex);
      const fi = Number(wrap?.dataset.fxKf);
      if (!list[i] || !Array.isArray(list[i].keyframes) || list[i].keyframes.length < 2) return;
      app.commit();
      list[i].keyframes.splice(fi, 1);
      touch();
      app.refreshRightPanel();
    }),
  );
  box.querySelectorAll("[data-fx-preview]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = nodeOf(),
        list = listOf();
      if (!r || !list) return;
      const i = Number(b.dataset.fxPreview);
      if (!list[i]) return;
      previewItem(r.node, list[i]);
    }),
  );
}

export {
  fxCatalog,
  fxDefault,
  fxList,
  fxTitle,
  fxPreviewClasses,
  t,
  sel,
  num,
  panelHTML,
  keyframeEditor,
  ensureList,
  previewItem,
  applyPreviewKeyframes,
  installInteractions,
  bindPanel,
};
