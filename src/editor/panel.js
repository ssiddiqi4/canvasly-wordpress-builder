import { app } from "./app.js";
function installPanel() {
  app.optionsFor = function optionsFor(k) {
    if (k === "class_mode") return ["inline", "class-first"];
    if (k === "mode") return ["single", "multiple"];
    if (k === "gallery_layout") return ["justified", "grid", "masonry"];
    if (k === "image_ratio") return ["1:1", "3:2", "4:3", "16:9", "9:16", "auto"];
    if (k === "last_row") return ["auto", "fit", "grow"];
    if (k === "order_by") return ["default", "random", "date", "title"];
    if (k === "alignment") return ["left", "center", "right"];
    if (k === "sidebar") return (app.D.sidebars || []).map((x) => x.id);
    return (
      {
        tag: ["h1", "h2", "h3", "h4", "h5", "h6"],
        target: ["_self", "_blank"],
        layout: ["flex", "grid", "block"],
        direction: ["row", "row-reverse", "column", "column-reverse"],
        wrap: ["nowrap", "wrap", "wrap-reverse"],
        justify: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
        align: ["stretch", "flex-start", "center", "flex-end", "baseline"],
        align_self: ["auto", "stretch", "flex-start", "center", "flex-end", "baseline"],
        object_fit: ["cover", "contain", "fill", "none"],
        object_position: ["center", "top", "right", "bottom", "left"],
        link: ["none", "file"],
        size: ["small", "medium", "large"],
        preload: ["none", "metadata", "auto"],
        auto_flow: ["row", "column", "dense", "row dense", "column dense"],
        position: ["", "relative", "absolute", "fixed", "sticky"],
        display: ["", "block", "inline-block", "flex", "grid", "none"],
        visibility: ["", "visible", "hidden"],
        overflow: ["", "visible", "hidden", "auto", "scroll"],
        border_style: ["", "solid", "dashed", "dotted", "double", "none"],
        background_size: ["", "cover", "contain", "auto"],
        background_repeat: ["", "no-repeat", "repeat", "repeat-x", "repeat-y"],
        cursor: ["", "default", "pointer", "move", "text", "not-allowed"],
        mix_blend_mode: ["", "normal", "multiply", "screen", "overlay", "darken", "lighten"],
        interaction: ["", "fade", "slide-up", "scale"],
        interaction_trigger: ["viewport", "hover"],
        interaction_easing: ["ease", "ease-in", "ease-out", "ease-in-out", "linear"],
        loading: ["lazy", "eager", "auto"],
        caption: ["none", "title", "caption"],
        hover_animation: ["", "zoom", "lift", "fade"],
        transition: ["slide", "fade"],
        icon_position: ["left", "right"],
      }[k] || []
    );
  };
  app.formatControlValue = function formatControlValue(v) {
    return v && typeof v === "object" ? JSON.stringify(v) : (v ?? "");
  };
  app.lbRepeaterItems = function lbRepeaterItems(v, fields) {
    const keys = Object.keys(fields || {});
    if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object" && !Array.isArray(x));
    return String(v || "")
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "")
      .map((l) => {
        const cols = l.split("|").map((x) => x.trim()),
          item = { _id: app.eid() };
        keys.forEach((k, i) => {
          const def = app.lbCtrlDef((fields || {})[k]);
          let x = cols[i] ?? "";
          if ((def.type || "") === "switch") x = x === "1" || x === "true" || x === "required" || x === true;
          item[k] = x;
        });
        return item;
      });
  };
  app.lbRepeaterTitle = function lbRepeaterTitle(item, titleField, index) {
    const tf = String(titleField || "");
    if (tf && item && item[tf] != null && String(item[tf]).trim() !== "")
      return String(item[tf])
        .replace(/<[^>]+>/g, "")
        .trim()
        .slice(0, 60);
    const html = tf.replace(/\{\{\{?\s*([\w-]+)\s*\}?\}\}/g, (_, k) =>
      item && item[k] != null ? String(item[k]) : "",
    );
    const text = html.replace(/<[^>]+>/g, "").trim();
    return text || "Item " + (index + 1);
  };
  app.lbEmptyRepeaterItem = function lbEmptyRepeaterItem(fields) {
    const item = { _id: app.eid() };
    Object.keys(fields || {}).forEach((k) => {
      const def = app.lbCtrlDef(fields[k]);
      if (Object.prototype.hasOwnProperty.call(def, "default"))
        item[k] = typeof def.default === "object" ? JSON.parse(JSON.stringify(def.default)) : def.default;
      else if (def.type === "switch") item[k] = false;
      else if (def.type === "media" || def.type === "number") item[k] = 0;
      else item[k] = "";
    });
    return item;
  };
  app.lbRepeaterHTML = function lbRepeaterHTML(k, def, v, label) {
    const fields = def.fields && typeof def.fields === "object" ? def.fields : {};
    const items = app.lbRepeaterItems(v, fields);
    const r = app.selected && app.locate(app.state.root, app.selected);
    const storeKey = (r ? r.node.id : "") + "|" + k;
    let open = app.repeaterOpen[storeKey];
    if (!open) {
      open = app.repeaterOpen[storeKey] = {};
      if (items[0]) open[items[0]._id || "0"] = true;
    }
    const rows = items
      .map((item, i) => {
        const id = item._id || String(i);
        const isOpen = !!open[id];
        let body = "";
        if (isOpen) {
          Object.keys(fields).forEach((fk) => {
            const fdef = app.lbCtrlDef(fields[fk]);
            if (fdef.hidden || !app.lbConditionMet(fdef.condition, item)) return;
            const path = k + "." + i + "." + fk;
            const fv =
              item[fk] !== void 0
                ? item[fk]
                : Object.prototype.hasOwnProperty.call(fdef, "default")
                  ? fdef.default
                  : "";
            let html = app.control(path, fdef, fv, fdef.label);
            if (fdef.description) html += `<p class="lb-control-desc">${app.esc(fdef.description)}</p>`;
            body += html;
          });
        }
        return `<div class="lb-repeater-item${isOpen ? " is-open" : ""}" data-repeater-index="${i}" data-repeater-id="${app.esc(id)}"><div class="lb-repeater-head"><span class="lb-repeater-handle" title="${app.t("Drag to reorder")}" draggable="true" aria-hidden="true">\u22EE\u22EE</span><button type="button" class="lb-repeater-toggle" aria-expanded="${isOpen ? "true" : "false"}">${app.esc(app.lbRepeaterTitle(item, def.title_field, i))}</button><button type="button" class="lb-repeater-dup" title="${app.t("Duplicate")}" aria-label="${app.t("Duplicate")}">\u29C9</button><button type="button" class="lb-repeater-del" title="${app.t("Remove")}" aria-label="${app.t("Remove")}"${def.prevent_empty && items.length < 2 ? " disabled" : ""}>\u00D7</button></div>${isOpen ? `<div class="lb-repeater-body">${body}</div>` : ""}</div>`;
      })
      .join("");
    return `<div class="lb-control lb-repeater" data-repeater-key="${app.esc(k)}" data-prevent-empty="${def.prevent_empty ? "1" : "0"}"><span>${app.esc(label || def.label || k.replace(/_/g, " "))}</span><div class="lb-repeater-items">${rows || '<div class="lb-repeater-empty">No items yet</div>'}</div><button type="button" class="lb-btn lb-repeater-add">+ Add Item</button></div>`;
  };
  app.bindRepeater = function bindRepeater() {
    app.root.querySelectorAll(".lb-repeater[data-repeater-key]").forEach((box) => {
      if (box.__lbRepBound) return;
      box.__lbRepBound = true;
      const key = box.dataset.repeaterKey,
        prevent = box.dataset.preventEmpty === "1";
      const nodeOf = () => app.selected && app.locate(app.state.root, app.selected);
      const listOf = () => {
        const r = nodeOf();
        if (!r) return null;
        const s = r.node.settings || (r.node.settings = {});
        const raw = app.meta(r.node.type).controls || {};
        const fields = app.lbCtrlDef(raw[key]).fields || {};
        if (!Array.isArray(s[key])) s[key] = app.lbRepeaterItems(s[key], fields);
        else {
          const dense = app.lbRepeaterItems(s[key], fields);
          if (dense.length !== s[key].length || dense.some((item, i) => item !== s[key][i])) s[key] = dense;
        }
        return s[key];
      };
      const storeOf = () => {
        const r = nodeOf();
        return (r ? r.node.id : "") + "|" + key;
      };
      const indexOf = (row) => {
        const list = listOf();
        if (!list || !row) return { list, i: -1 };
        const id = row.dataset.repeaterId || "";
        let i = Number(row.dataset.repeaterIndex);
        if (id) {
          const byId = list.findIndex((x) => x && String(x._id) === String(id));
          if (byId >= 0) i = byId;
        }
        return { list, i: Number.isFinite(i) ? i : -1 };
      };
      box.querySelector(".lb-repeater-add")?.addEventListener("click", () => {
        const r = nodeOf(),
          list = listOf();
        if (!r || !list) return;
        const fields = app.lbCtrlDef((app.meta(r.node.type).controls || {})[key]).fields || {};
        app.commit();
        list.push(app.lbEmptyRepeaterItem(fields));
        const item = list[list.length - 1];
        app.repeaterOpen[storeOf()] = { [item._id]: true };
        app.render();
      });
      box.querySelectorAll(".lb-repeater-toggle").forEach(
        (b) =>
          (b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = b.closest(".lb-repeater-item");
            if (!item) return;
            const id = item.dataset.repeaterId;
            const map = app.repeaterOpen[storeOf()] || (app.repeaterOpen[storeOf()] = {});
            map[id] = !map[id];
            app.refreshRightPanel();
          }),
      );
      box.querySelectorAll(".lb-repeater-dup").forEach(
        (b) =>
          (b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { list, i } = indexOf(b.closest(".lb-repeater-item"));
            if (!list || i < 0 || !list[i]) return;
            app.commit();
            const copy = JSON.parse(JSON.stringify(list[i]));
            copy._id = app.eid();
            list.splice(i + 1, 0, copy);
            app.repeaterOpen[storeOf()] = { [copy._id]: true };
            app.render();
          }),
      );
      box.querySelectorAll(".lb-repeater-del").forEach(
        (b) =>
          (b.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { list, i } = indexOf(b.closest(".lb-repeater-item"));
            if (!list || i < 0) return;
            if (prevent && list.length < 2) return;
            app.commit();
            list.splice(i, 1);
            app.render();
          }),
      );
      box.querySelectorAll(".lb-repeater-item").forEach((item) => {
        const handle = item.querySelector(".lb-repeater-handle");
        if (handle) {
          handle.addEventListener("dragstart", (e) => {
            e.stopPropagation();
            e.dataTransfer.setData("text/plain", item.dataset.repeaterId || item.dataset.repeaterIndex);
            e.dataTransfer.effectAllowed = "move";
            item.classList.add("is-dragging");
          });
          handle.addEventListener("dragend", () => item.classList.remove("is-dragging"));
        }
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          item.classList.add("is-drop-target");
        });
        item.addEventListener("dragleave", () => item.classList.remove("is-drop-target"));
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.classList.remove("is-drop-target");
          const { list, i: to } = indexOf(item);
          if (!list || to < 0) return;
          const token = e.dataTransfer.getData("text/plain");
          let from = list.findIndex((x) => x && String(x._id) === String(token));
          if (from < 0) from = Number(token);
          if (!Number.isFinite(from) || !list[from] || from === to) return;
          app.commit();
          const [moved] = list.splice(from, 1);
          list.splice(from < to ? to - 1 : to, 0, moved);
          app.render();
        });
      });
    });
  };
  app.control = function control(k, t3, v, label) {
    const def = app.lbCtrlDef(t3),
      type = def.type || "text";
    const l = label || def.label || k.replace(/_/g, " ");
    const ph = def.placeholder ? ` placeholder="${app.esc(def.placeholder)}"` : "";
    if (type === "repeater") return app.lbRepeaterHTML(k, def, v, l);
    if (type === "spacing" || type === "dimensions") return app.boxControl(k, v, l);
    if (type === "box_shadow") return app.shadowControl(k, v, l);
    if (type === "gradient")
      return typeof app.lbGradientHTML === "function"
        ? app.lbGradientHTML(k, v, l)
        : `<label class="lb-control"><span>${app.esc(l)}</span><input data-setting="${app.esc(k)}" value="${app.esc(app.formatControlValue(v))}" placeholder="${app.t("linear-gradient(...)")}" type="text"></label>`;
    if (k === "icon" && type === "text")
      return `<div class="lb-control"><span>${app.esc(l)}</span><button type="button" class="lb-btn lb-icon-picker" data-icon-picker="1">${app.esc(v || "Choose icon")}</button></div>`;
    if (type === "slider") {
      const units = Array.isArray(def.units) ? def.units : ["px"];
      const range2 = def.range || {};
      const key = def.responsive ? k + "." + app.device : k;
      const val = def.responsive
        ? v && typeof v === "object" && !Array.isArray(v)
          ? (v[app.device] ?? v.desktop ?? "")
          : v
        : v;
      return app.lbSlider(key, l, val, {
        units,
        min: range2.min ?? 0,
        max: range2.max ?? 1e3,
        step: range2.step ?? 1,
        unitless: !units.length,
      });
    }
    if (type === "switch")
      return `<label class="lb-control lb-switch"><input data-setting="${app.esc(k)}" type="checkbox" ${v ? "checked" : ""}><span>${app.esc(l)}</span></label>`;
    if (type === "color")
      return `<label class="lb-control"><span>${app.esc(l)}</span><input data-setting="${app.esc(k)}" type="color" value="${app.esc(v || "#000000")}"></label>`;
    if (type === "font" || k === "font_family" || /(^|\.)font_family$/.test(k)) {
      const opts =
        typeof app.lb104FontOptions === "function"
          ? app.lb104FontOptions(typeof v === "string" ? v : "")
          : `<option value="">${app.esc(app.t("Default"))}</option>`;
      return `<label class="lb-control lb-font-family-control"><span>${app.esc(l)} <small>${app.esc(app.t("Google Fonts"))}</small></span><select data-setting="${app.esc(k)}" class="lb-font-family-select" aria-label="${app.esc(l)}">${opts}</select></label>`;
    }
    if (type === "select" || type === "choose") {
      const opts = app.lbCtrlOpts(def, k);
      return `<label class="lb-control"><span>${app.esc(l)}</span><select data-setting="${app.esc(k)}">${opts.map((o) => `<option value="${app.esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${app.esc(app.lbCtrlOptLabel(def, k, o))}</option>`).join("")}</select></label>`;
    }
    if (type === "media") {
      const id = parseInt(v, 10) || 0,
        urlKey = k.replace(/_id$/, "_url"),
        st = (app.selected && app.locate(app.state.root, app.selected)?.node?.settings) || {},
        url = app.getPath(st, urlKey) || "",
        lib = Array.isArray(def.media_types) ? def.media_types.join(",") : def.media_types || "image",
        video = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(String(url || "")),
        label2 =
          lib === "video"
            ? app.t("Choose video")
            : String(lib).indexOf("video") >= 0
              ? app.t("Choose image or video")
              : app.t("Choose image");
      return `<div class="lb-control lb32-media"><span>${app.esc(l)}</span><div class="lb32-media-row"><button type="button" class="lb32-media-preview lb-media-open" data-media-key="${app.esc(k)}" data-media-library="${app.esc(lib)}" title="${app.esc(label2)}">${id || url ? (video ? `<span>${app.esc(app.t("Video"))}</span>` : `<img src="${app.esc(url)}" alt="" data-lb28-att="${app.esc(id)}" data-lb28-size="thumbnail">`) : "<span>" + app.esc(label2) + "</span>"}</button><input data-setting="${app.esc(k)}" type="hidden" value="${app.esc(id || 0)}">${id || url ? `<button type="button" class="lb-btn lb28-media-clear" data-media-key="${app.esc(k)}">${app.t("Remove")}</button>` : ""}</div></div>`;
    }
    if (type === "gallery") {
      const ids = String(v || "")
          .split(/[,\s]+/)
          .filter(Boolean),
        st = (app.selected && app.locate(app.state.root, app.selected)?.node?.settings) || {};
      return `<div class="lb-control lb32-gallery"><span>${app.esc(l)}</span><div class="lb32-thumbs lb-gallery-open" role="button" title="${app.t("Choose images")}">${ids.map((id) => `<img class="lb32-thumb" src="${app.esc(app.galleryUrlOf(st, id) || app.LB_ATT_PLACEHOLDER)}" data-lb28-att="${app.esc(id)}" data-lb28-size="thumbnail" alt="">`).join("") || '<span class="lb32-thumbs-empty">' + app.t("Choose images") + "</span>"}</div><input data-setting="${app.esc(k)}" type="hidden" value="${app.esc(v || "")}"><button type="button" class="lb-btn lb-gallery-open">${app.t("Choose images")}</button></div>`;
    }
    if (type === "wysiwyg")
      return `<label class="lb-control"><span>${app.esc(l)}</span><textarea data-setting="${app.esc(k)}" rows="6"${ph}>${app.esc(v || "")}</textarea></label>`;
    if (type === "textarea")
      return `<label class="lb-control"><span>${app.esc(l)}</span><textarea data-setting="${app.esc(k)}" rows="4"${ph}>${app.esc(v || "")}</textarea></label>`;
    if (def.responsive || app.responsiveKeys.has(k)) return app.responsiveFieldsHTML(k, v, l);
    const input = type === "number" ? "number" : type === "url" ? "url" : "text";
    const range = def.range || {};
    const extra =
      (range.min != null ? ` min="${range.min}"` : "") +
      (range.max != null ? ` max="${range.max}"` : "") +
      (range.step != null ? ` step="${range.step}"` : "");
    return `<label class="lb-control"><span>${app.esc(l)}</span><input data-setting="${app.esc(k)}" type="${input}" value="${app.esc(v ?? "")}"${ph}${extra}></label>`;
  };
  app.boxControl = function boxControl(k, v, l) {
    const x = typeof v === "object" && v ? v : {};
    return `<div class="lb-control"><span>${app.esc(l)}</span><div class="lb-box-grid"><input data-setting="${k}.top" value="${app.esc(x.top ?? "")}" placeholder="${app.t("Top")}"><input data-setting="${k}.right" value="${app.esc(x.right ?? "")}" placeholder="${app.t("Right")}"><input data-setting="${k}.bottom" value="${app.esc(x.bottom ?? "")}" placeholder="${app.t("Bottom")}"><input data-setting="${k}.left" value="${app.esc(x.left ?? "")}" placeholder="${app.t("Left")}"></div></div>`;
  };
  app.shadowControl = function shadowControl(k, v, l) {
    const x = typeof v === "object" && v ? v : {};
    return `<div class="lb-control"><span>${app.esc(l)}</span><div class="lb-shadow-grid"><input data-setting="${k}.x" type="number" value="${app.esc(x.x ?? 0)}" placeholder="${app.t("X")}"><input data-setting="${k}.y" type="number" value="${app.esc(x.y ?? 0)}" placeholder="${app.t("Y")}"><input data-setting="${k}.blur" type="number" value="${app.esc(x.blur ?? 0)}" placeholder="${app.t("Blur")}"><input data-setting="${k}.spread" type="number" value="${app.esc(x.spread ?? 0)}" placeholder="${app.t("Spread")}"><input data-setting="${k}.color" type="text" value="${app.esc(x.color ?? "rgba(0,0,0,.15)")}" placeholder="${app.t("Color")}"><label class="lb-switch"><input data-setting="${k}.inset" type="checkbox" ${x.inset ? "checked" : ""}><span>${app.t("Inset")}</span></label></div></div>`;
  };
  app.lb091Universal = function lb091Universal(n, tab) {
    const s = n.settings || {};
    if (tab === "style")
      return app.lb09Section(
        app.t("Layout & Effects"),
        app.lbSlider("width", "Width", s.width || "", { units: ["%", "px", "vw", "em"], min: 0, max: 1e3 }) +
          app.lbSlider("max_width", "Max Width", s.max_width || "", {
            units: ["px", "%", "vw", "em"],
            min: 0,
            max: 2e3,
          }) +
          app.lbSlider("height", "Height", s.height || "", {
            units: ["px", "%", "vh", "em", "auto"],
            min: 0,
            max: 2e3,
          }) +
          app.lbSlider("min_height", "Min Height", s.min_height || "", {
            units: ["px", "%", "vh", "em"],
            min: 0,
            max: 2e3,
          }) +
          app.lbSlider("opacity", "Opacity", s.opacity ?? 1, { unitless: true, min: 0, max: 1, step: 0.05 }) +
          app.lb09Select("overflow", app.t("Overflow"), s.overflow || "", ["", "visible", "hidden", "auto", "scroll"]) +
          app.lb09Field("background", app.t("Background"), "text", s.background || "") +
          app.lb09Field("background_image", app.t("Background Image"), "url", s.background_image || "") +
          app.lb09Select("background_size", app.t("Background Size"), s.background_size || "", [
            "",
            "cover",
            "contain",
            "auto",
          ]) +
          app.lb09Field(
            "background_position",
            app.t("Background Position"),
            "text",
            s.background_position || "center",
          ) +
          app.lb09Select("background_repeat", app.t("Background Repeat"), s.background_repeat || "", [
            "",
            "no-repeat",
            "repeat",
            "repeat-x",
            "repeat-y",
          ]) +
          app.lb09Select("mix_blend_mode", app.t("Blend Mode"), s.mix_blend_mode || "", [
            "",
            "normal",
            "multiply",
            "screen",
            "overlay",
            "darken",
            "lighten",
          ]),
        false,
      );
    if (tab === "advanced") return app.lb09AdvancedTab(n);
    return "";
  };
  app.settingsHTML = function settingsHTML() {
    if (!app.selected)
      return '<div class="lb-empty-settings">' + app.t("Select a unit to edit its settings.") + "</div>";
    const r = app.locate(app.state.root, app.selected),
      e = app.meta(r.node.type),
      s = r.node.settings || {},
      groups = { content: [], style: [], advanced: [] };
    Object.entries(e.controls || {}).forEach(([k, t3]) => {
      let g = app.advancedKeys.has(k) ? "advanced" : app.styleKeys.has(k) ? "style" : "content";
      groups[g].push([k, t3, s[k] ?? (t3 === "spacing" || t3 === "dimensions" || t3 === "box_shadow" ? {} : "")]);
    });
    let h = `<div class="lb-selection-head"><strong>${app.esc(e.title || r.node.type)}</strong><span class="lb-selection-id">${app.esc(r.node.id)}</span></div><div class="lb-settings-tabs">${["content", "style", "advanced"].map((x) => `<button data-style-tab="${x}" class="${app.styleTab === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>`;
    h += groups[app.styleTab].map((x) => app.control(x[0], x[1], x[2])).join("");
    h += app.lb091Universal(r.node, app.styleTab);
    if (app.styleTab === "advanced") {
      const warn = app.accessibilityWarnings(r.node);
      h += `<div class="lb-a11y-box"><strong>Accessibility</strong>${warn.length ? warn.map((w) => `<div>\u26A0 ${app.esc(w)}</div>`).join("") : "<div>\u2713 No obvious issues detected.</div>"}</div>`;
    }
    h += `<div class="lb-action-grid"><button class="lb-btn" id="lb-duplicate">${app.t("Duplicate")}</button><button class="lb-btn danger" id="lb-delete">${app.t("Delete")}</button></div>`;
    return h;
  };
  app.accessibilityWarnings = function accessibilityWarnings(n) {
    const s = n.settings || {},
      w = [];
    if (n.type === "image" && !s.alt) w.push("Add alternative text to the image.");
    if (["button", "read_more"].includes(n.type) && !String(s.text || "").trim()) w.push("Add descriptive link text.");
    if (n.type === "heading" && !/^h[1-6]$/.test(s.tag || "")) w.push("Choose a semantic heading level.");
    if (n.type === "link_in_bio" && !String(s.title || "").trim()) w.push("Add a descriptive title.");
    return w;
  };
  app.unitIsPro = function unitIsPro(e) {
    return !!(e && e.source === "pro");
  };
  app.unitInCategory = function unitInCategory(e) {
    const pro = app.unitIsPro(e);
    if (app.category === "all") return true;
    if (app.category === "pro") return pro;
    return !pro && e.category === app.category;
  };
  app.unitGroup = function unitGroup(e) {
    return app.unitIsPro(e) ? "pro" : e.category || "basic";
  };
  app.unitGroupOrder = function unitGroupOrder(keys) {
    const order = ["layout", "basic", "pro", "media", "content", "advanced"];
    return keys.slice().sort((a, b) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib) || a.localeCompare(b);
    });
  };
  app.unitCategories = function unitCategories() {
    const cats = ["all", "layout", "basic", "media", "content", "advanced"];
    if ((app.D.units || []).some((e) => app.unitIsPro(e))) cats.splice(cats.indexOf("basic") + 1, 0, "pro");
    return cats;
  };
  app.unitCategoryLabel = function unitCategoryLabel(c) {
    return c === "pro" ? "PRO" : app.t(c[0].toUpperCase() + c.slice(1));
  };
  app.unitPanel = function unitPanel() {
    const q = app.unitSearch.trim().toLowerCase();
    let list = (app.D.units || []).filter(
      (e) =>
        app.unitInCategory(e) &&
        (!q || [e.title, e.type, e.category, ...(e.keywords || [])].join(" ").toLowerCase().includes(q)),
    );
    list.sort((a, b) => app.fav.has(b.type) - app.fav.has(a.type) || a.title.localeCompare(b.title));
    if (!list.length) return '<div class="lb-no-results">' + app.t("No units found.") + "</div>";
    const groups = {};
    list.forEach((e) => {
      const g = app.unitGroup(e);
      (groups[g] || (groups[g] = [])).push(e);
    });
    return app
      .unitGroupOrder(Object.keys(groups))
      .map((c) => {
        const a = groups[c];
        const label = c === "pro" ? "PRO" : c;
        return `<div class="lb-unit-group${c === "pro" ? " lb-unit-group-pro" : ""}"><h4>${app.esc(label)} ${a.some((e) => app.fav.has(e.type)) ? "<span>\u2605 " + app.t("Favorites") + "</span>" : ""}</h4><div class="lb-unit-grid">${a
          .map((e) =>
            (() => {
              const locked = app.proUnitLocked(e);
              const hint = locked ? app.t("Sidcraft Builder Pro license required") : app.t("Double-click to add");
              return `<div class="lb-unit-card ${app.fav.has(e.type) ? "is-favorite" : ""}${locked ? " is-pro-locked" : ""}" role="button" tabindex="0" draggable="${locked ? "false" : "true"}" ${locked ? 'aria-disabled="true"' : ""} data-type="${app.esc(e.type)}" title="${app.esc(locked ? hint : e.title)}" data-lb-hint="${app.esc(hint)}"><span class="lb-icon" aria-hidden="true">${app.esc(e.icon || "\u25A1")}</span><span>${app.esc(e.title)}</span><b class="lb-fav" data-fav="${app.esc(e.type)}" title="${app.t("Favorite")}">${app.fav.has(e.type) ? "\u2605" : "\u2606"}</b></div>`;
            })(),
          )
          .join("")}</div></div>`;
      })
      .join("");
  };
  app.modalHTML = function modalHTML(title, body) {
    return `<div class="lb-modal-backdrop"><div class="lb-modal" role="dialog" aria-modal="true"><div class="lb-modal-head"><strong>${app.esc(title)}</strong><button data-close-modal aria-label="${app.t("Close")}">\u00D7</button></div><div class="lb-modal-body">${body}</div></div></div>`;
  };
  app.showModal = function showModal(title, body, after) {
    app.closeModal();
    const wrap = document.createElement("div");
    wrap.innerHTML = app.modalHTML(title, body);
    const el = wrap.firstElementChild;
    if (!el) return;
    document.body.appendChild(el);
    app.modal = el;
    app.bindModal();
    after && after();
  };
  app.closeModal = function closeModal() {
    document.querySelectorAll(".lb-modal-backdrop,.lb-rte-overlay").forEach((n) => n.remove());
    if (app.root) app.root.querySelectorAll(".lb-modal-backdrop").forEach((n) => n.remove());
    app.modal = null;
  };
  app.openIconLibrary = function openIconLibrary() {
    const icons = app.D.icons || [];
    app.showModal(
      app.t("Sidcraft Page Builder Icon Manager"),
      `<input class="lb-modal-search" id="lb-icon-search" placeholder="${app.t("Search icons\u2026")}"><div class="lb-form-row"><input id="lb-icon-id" placeholder="${app.t("ID")}"><input id="lb-icon-title" placeholder="${app.t("Title")}"><input id="lb-icon-category" placeholder="${app.t("Category")}" value="Custom"><textarea id="lb-icon-svg" rows="2" placeholder="<svg viewBox=...>...</svg>"></textarea><button class="lb-btn primary" id="lb-icon-add">${app.t("Add SVG")}</button></div><div class="lb-icon-grid">${icons.map((i) => `<button class="lb-icon-choice" data-icon-id="${app.esc(i.id)}" title="${app.esc(i.title)}"><span>${i.svg}</span><small>${app.esc(i.title)}</small></button>`).join("")}</div>`,
      () => {
        app.$("#lb-icon-search")?.addEventListener("input", (e) => {
          app
            .$$(".lb-icon-choice")
            .forEach((x) => (x.hidden = !x.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
        });
        app.$("#lb-icon-add")?.addEventListener("click", async () => {
          const d = {
            id: app.$("#lb-icon-id")?.value,
            title: app.$("#lb-icon-title")?.value,
            category: app.$("#lb-icon-category")?.value,
            svg: app.$("#lb-icon-svg")?.value,
          };
          const r = await fetch(`${app.D.api}/icons/custom`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
            body: JSON.stringify(d),
          });
          if (r.ok) {
            app.D.icons = app.D.icons || [];
            app.D.icons = app.D.icons.filter((x) => x.id !== d.id).concat([await r.json()]);
            app.closeModal();
            openIconLibrary();
          }
        });
      },
    );
  };
  app.openTemplateLibrary = async function openTemplateLibrary() {
    try {
      const items = await (await fetch(`${app.D.api}/templates`, { headers: { "X-WP-Nonce": app.D.nonce } })).json();
      app.showModal(
        app.t("Template Library"),
        `<input class="lb-modal-search" id="lb-template-search" placeholder="${app.t("Search templates\u2026")}"><div class="lb-library-list">${
          items.length
            ? items
                .map((i) => {
                  const count = (i.document?.root || []).length;
                  return `<div class="lb-library-row"><strong>${app.esc(i.title)}</strong><span>${app.esc(i.type || "page")} \u00B7 ${count} root unit(s)</span><button class="lb-btn" data-template-id="${i.id}">${app.t("Insert")}</button><button class="lb-btn" data-template-dup="${i.id}">${app.t("Duplicate")}</button><button class="lb-btn danger" data-template-del="${i.id}">${app.t("Delete")}</button></div>`;
                })
                .join("")
            : "<p>" + app.t("No templates saved yet.") + "</p>"
        }</div>`,
        () => {
          app.$("#lb-template-search")?.addEventListener("input", (e) => {
            app
              .$$(".lb-library-row")
              .forEach((x) => (x.hidden = !x.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
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
                if (confirm(app.t("Delete this template?"))) {
                  await fetch(`${app.D.api}/templates/${b.dataset.templateDel}`, {
                    method: "DELETE",
                    headers: { "X-WP-Nonce": app.D.nonce },
                  });
                  app.closeModal();
                  openTemplateLibrary();
                }
              }),
          );
        },
      );
    } catch (e) {
      alert(app.t("Could not load templates."));
    }
  };
  app.openComponentLibrary = async function openComponentLibrary() {
    try {
      const items = await (await fetch(`${app.D.api}/components`, { headers: { "X-WP-Nonce": app.D.nonce } })).json();
      app.showModal(
        app.t("Components"),
        `<div class="lb-library-list">${items.length ? items.map((i) => `<div class="lb-library-row"><strong>${app.esc(i.title)}</strong><button class="lb-btn" data-component-id="${i.id}">${app.t("Insert")}</button></div>`).join("") : "<p>" + app.t("No components saved yet.") + "</p>"}</div>`,
      );
    } catch (e) {
      alert(app.t("Could not load components."));
    }
  };
  app.openVariables = function openVariables() {
    const v = app.D.variables || {};
    app.showModal(
      app.t("Global Variables"),
      `<p class="lb-muted">Use these design tokens in custom CSS with CSS variables.</p><div class="lb-form-grid">${Object.entries(
        v.colors || {},
      )
        .map(
          ([k, val]) =>
            `<label><span>${app.esc(k)}</span><input id="lb-v-color-${app.esc(k)}" type="color" value="${app.esc(val)}"></label>`,
        )
        .join("")}${Object.entries(v.sizes || {})
        .map(
          ([k, val]) =>
            `<label><span>${app.esc(k)}</span><input id="lb-v-size-${app.esc(k)}" value="${app.esc(val)}"></label>`,
        )
        .join(
          "",
        )}</div><button class="lb-btn primary" id="lb-var-save">${app.t("Save variables")}</button> <button class="lb-btn" id="lb-ds-export">${app.t("Export Design System")}</button>`,
    );
    app.$("#lb-var-save")?.addEventListener("click", async () => {
      const colors = { ...(v.colors || {}) },
        sizes = { ...(v.sizes || {}) };
      Object.keys(colors).forEach((k) => (colors[k] = app.$(`#lb-v-color-${k}`)?.value || colors[k]));
      Object.keys(sizes).forEach((k) => (sizes[k] = app.$(`#lb-v-size-${k}`)?.value || sizes[k]));
      const r = await fetch(`${app.D.api}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify({ colors, sizes, fonts: v.fonts || {} }),
      });
      if (r.ok) {
        app.D.variables = await r.json();
        app.closeModal();
      }
    });
    app.$("#lb-ds-export")?.addEventListener("click", async () => {
      const r = await fetch(`${app.D.api}/design-system/export`, { headers: { "X-WP-Nonce": app.D.nonce } });
      const d = await r.json();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
      a.download = "sidcraft-page-builder-design-system.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };
  app.openClassManager = function () {
    app.showModal(
      app.t("Global Classes"),
      `<p class="lb-muted">${app.t("Global classes with custom CSS are no longer available. Style units with their own controls, or use XEditor classes.")}</p>`,
    );
  };
  app.openRevisions = async function openRevisions() {
    try {
      const items = await (
        await fetch(`${app.D.api}/document/${app.D.postId}/revisions`, { headers: { "X-WP-Nonce": app.D.nonce } })
      ).json();
      app.showModal(
        app.t("Revision History"),
        `<p class="lb-muted">Select a revision to restore. The current document is preserved as a new revision when saved.</p><div class="lb-library-list">${
          items.length
            ? items
                .slice()
                .reverse()
                .map(
                  (i) =>
                    `<div class="lb-library-row"><strong>${app.esc(i.time)}</strong><span>${app.t("Revision %s", i.index + 1)}</span><button class="lb-btn" data-revision="${i.index}">${app.t("Restore")}</button></div>`,
                )
                .join("")
            : "<p>" + app.t("No revisions yet.") + "</p>"
        }</div>`,
      );
    } catch (e) {
      alert(app.t("Could not load revisions."));
    }
  };
  app.openNavigation = function openNavigation() {
    const items = app.D.navigation || [];
    app.showModal(
      app.t("Site Navigation"),
      `<input class="lb-modal-search" id="lb-nav-search" placeholder="${app.t("Search pages and posts\u2026")}"><div class="lb-library-list">${items.map((i) => `<div class="lb-library-row"><strong>${app.esc(i.title)}</strong><span>${app.esc(i.type)} \u00B7 ${app.esc(i.status)}</span><button class="lb-btn" data-nav-id="${i.id}">${app.t("Open")}</button></div>`).join("")}</div>`,
      () =>
        app.$("#lb-nav-search")?.addEventListener("input", (e) => {
          app
            .$$(".lb-library-row")
            .forEach((x) => (x.hidden = !x.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
        }),
    );
  };
  app.openPageSettings = function openPageSettings() {
    const s = app.state.settings || {};
    const tpl = app.pageTemplate();
    const opts = [
      ["default", app.t("Default")],
      ["full_width", app.t("Full Width")],
      ["canvas", app.t("Canvas")],
    ]
      .map(([v, l]) => `<option value="${v}" ${tpl === v ? "selected" : ""}>${l}</option>`)
      .join("");
    app.showModal(
      app.t("Page Settings"),
      `<label class="lb-control"><span>${app.t("Page template")}</span><select id="lb-page-template">${opts}</select></label><p class="lb-muted">${app.t("Default uses the theme layout. Full Width keeps the header and footer. Canvas inherits the theme header and footer when the theme has them, and is a blank document otherwise.")}</p>${app.themeChromeScopeHTML()}${app.pageStatusHTML()}<label class="lb-control"><span>${app.t("Page title")}</span><input id="lb-page-title" value="${app.esc(s.title || "")}"></label><label class="lb-control"><span>${app.t("Body class")}</span><input id="lb-body-class" value="${app.esc(s.body_class || "")}"></label><label class="lb-control"><span>${app.t("Content width")}</span><input id="lb-page-width" value="${app.esc(s.page_width || (typeof app.kitContentWidth === "function" ? app.kitContentWidth() : "") || app.D.globals?.content_width || "1180px")}"></label><button type="button" class="lb-btn primary" id="lb-page-save">${app.t("Save")}</button>`,
    );
    const readSettings = () => {
      const next = Object.assign({}, app.state.settings || {}, {
        title: app.$("#lb-page-title")?.value || "",
        body_class: app.$("#lb-body-class")?.value || "",
        page_width: app.$("#lb-page-width")?.value || "",
        template: app.$("#lb-page-template")?.value || "default",
      });
      if (!["default", "full_width", "canvas"].includes(next.template)) next.template = "default";
      return next;
    };
    const preview = () => {
      app.state.settings = Object.assign({}, app.state.settings || {}, {
        template: app.$("#lb-page-template")?.value || "default",
        page_width: app.$("#lb-page-width")?.value || "",
        body_class: app.$("#lb-body-class")?.value || "",
      });
      if (!["default", "full_width", "canvas"].includes(app.state.settings.template))
        app.state.settings.template = "default";
      app.applyPageTemplatePreview();
    };
    app.$("#lb-page-template")?.addEventListener("change", () => {
      app.commit(app.t("Edited page settings"));
      preview();
      app.dirty = true;
    });
    app.$$('input[name="lb-chrome-scope"]').forEach((el) =>
      el.addEventListener("change", () => {
        if (el.disabled) return;
        const next = el.value === "theme" && app.canPublishThemeChrome() ? "theme" : "page";
        if (next === app.themeChromeScope) return;
        app.themeChromeScope = next;
        app.themeChromeScopeDirty = true;
        app.dirty = true;
        app.syncInheritScopeLabels();
        if (app.scheduleSave) app.scheduleSave();
      }),
    );
    app.$("#lb-page-width")?.addEventListener("input", preview);
    app.$("#lb-body-class")?.addEventListener("input", preview);
    app.$("#lb-page-status")?.addEventListener("change", (e) => {
      const v = String(e.target.value || "");
      app.statusIntent = v || null;
      if (typeof app.refreshSaveButton === "function") app.refreshSaveButton();
    });
    app.$("#lb-page-save")?.addEventListener("click", () => {
      app.commit(app.t("Edited page settings"));
      app.state.settings = readSettings();
      app.closeModal();
      app.render();
    });
  };
  app.pageStatusHTML = function pageStatusHTML() {
    if (typeof app.isPublishablePost !== "function" || !app.isPublishablePost()) return "";
    const current = app.postStatus();
    const selected =
      app.statusIntent ||
      (typeof app.publishTarget === "function" ? app.publishTarget() : current) ||
      current ||
      "draft";
    const canPublish = !!(app.D && app.D.canPublish);
    const opts = [
      ["draft", app.t("Draft")],
      ["pending", app.t("Pending review")],
      ["publish", app.t("Published")],
      ["private", app.t("Private")],
    ];
    if (current && !opts.some((o) => o[0] === current)) opts.unshift([current, current]);
    const html = opts
      .map(([v, l]) => {
        const locked = (v === "publish" || v === "private") && !canPublish && v !== current;
        return `<option value="${app.esc(v)}"${selected === v ? " selected" : ""}${locked ? " disabled" : ""}>${app.esc(l)}</option>`;
      })
      .join("");
    return `<label class="lb-control"><span>${app.t("Status")}</span><select id="lb-page-status">${html}</select></label><p class="lb-muted">${app.t("Drafts are only visible to logged-in editors. Publish applies when you save.")}</p>`;
  };
  app.pageTemplate = function pageTemplate() {
    const t3 = String((app.state.settings || {}).template || "default");
    return t3 === "full_width" || t3 === "canvas" ? t3 : "default";
  };
  app.pageTemplateBodyClass = function pageTemplateBodyClass() {
    const extra = String((app.state.settings || {}).body_class || "")
      .replace(/[^\w\s-]/g, "")
      .trim();
    return ("lb-template-" + app.pageTemplate().replace(/_/g, "-") + (extra ? " " + extra : "")).trim();
  };
  app.pageInheritsThemeChrome = function pageInheritsThemeChrome() {
    const kind = String((app.D && app.D.templateType) || "");
    if (kind && kind !== "page") return false;
    const chrome = app.D && app.D.themeChrome;
    return !!(chrome && chrome.header && chrome.footer);
  };
  app.designsHeaderAndFooter = function designsHeaderAndFooter() {
    return String((app.D && app.D.templateType) || "") === "header_footer";
  };
  app.pageShowsThemeChrome = function pageShowsThemeChrome() {
    const kind = String((app.D && app.D.templateType) || "");
    if (kind === "header_footer") return true;
    if (kind && kind !== "page") return false;
    return !app.pageInheritsThemeChrome();
  };
  app.lbDropStrayClosers = function lbDropStrayClosers(html) {
    html = String(html || "");
    if (html.indexOf("</") === -1) return html;
    const voids = {
      area: 1,
      base: 1,
      br: 1,
      col: 1,
      embed: 1,
      hr: 1,
      img: 1,
      input: 1,
      link: 1,
      meta: 1,
      param: 1,
      source: 1,
      track: 1,
      wbr: 1,
    };
    const stack = [];
    return html.replace(
      /<!--[\s\S]*?-->|<(style|textarea|title)\b[^>]*>[\s\S]*?<\/\1\s*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>/g,
      (all, raw, close, tag) => {
        if (!tag) return all;
        const name = tag.toLowerCase();
        if (close !== "/") {
          if (!voids[name] && all.slice(-2) !== "/>") stack.push(name);
          return all;
        }
        const at = stack.lastIndexOf(name);
        if (at === -1) return "";
        stack.length = at;
        return all;
      },
    );
  };
  app.lbIsolateThemeChrome = function lbIsolateThemeChrome(html) {
    html = app.lbDropStrayClosers(html);
    if (!html || typeof DOMParser === "undefined") return html;
    const doc = new DOMParser().parseFromString('<div id="lb-chrome-root">' + html + "</div>", "text/html");
    const root = doc.getElementById("lb-chrome-root");
    if (!root) return html;
    doc.head.querySelectorAll("link,style").forEach((el) => root.insertBefore(el, root.firstChild));
    const unwrap = (el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
    };
    const chromeLandmark = (el) => {
      if (!el || !el.tagName) return false;
      const tag = el.tagName;
      if (tag === "HEADER" || tag === "FOOTER" || tag === "NAV") return true;
      const id = String(el.id || "").toLowerCase();
      if (["colophon", "masthead", "site-header", "site-footer", "header", "footer"].indexOf(id) !== -1) return true;
      const role = String(el.getAttribute("role") || "").toLowerCase();
      if (role === "contentinfo" || role === "banner") return true;
      const type = String(el.getAttribute("data-elementor-type") || "").toLowerCase();
      if (type === "header" || type === "footer") return true;
      const tokens = String(el.getAttribute("class") || "")
        .toLowerCase()
        .split(/\s+/);
      if (id) tokens.push(id);
      return tokens.some(
        (token) =>
          /(^|-)(footer|colophon)($|-)/.test(token) ||
          (/(^|-)(header|masthead)($|-)/.test(token) && token.indexOf("content") === -1),
      );
    };
    root
      .querySelectorAll(
        "#preloader,.preloader,.page-loader,.site-loader,.loader-wrapper,.loading-screen,.preloader-wrap",
      )
      .forEach((el) => el.remove());
    root.querySelectorAll("[style]").forEach((el) => {
      if (!el.parentNode || chromeLandmark(el)) return;
      const style = String(el.getAttribute("style") || "").toLowerCase();
      if (!/position\s*:\s*fixed/.test(style)) return;
      if (
        /(?:inset\s*:\s*0|height\s*:\s*100(?:%|vh)|bottom\s*:\s*0)/.test(style) &&
        /(?:width\s*:\s*100%|left\s*:\s*0|inset\s*:\s*0)/.test(style)
      )
        el.remove();
    });
    root
      .querySelectorAll("#content,#primary,#main,main,.site-content,.content-area,.site-main,.content-wrap")
      .forEach((el) => {
        if (!el.parentNode) return;
        const tag = el.tagName;
        if (tag === "HEADER" || tag === "FOOTER") return;
        if (
          el.querySelector("header,footer,nav") ||
          Array.prototype.some.call(el.querySelectorAll("*"), chromeLandmark)
        ) {
          unwrap(el);
          return;
        }
        if ((el.textContent || "").trim() || el.querySelector("img,svg,video,picture")) {
          unwrap(el);
          return;
        }
        el.remove();
      });
    root.querySelectorAll("#page,#wrapper,#wrap,.hfeed,div").forEach((el) => {
      if (!el.parentNode) return;
      const tag = el.tagName;
      if (tag === "HEADER" || tag === "FOOTER" || tag === "NAV") return;
      const id = String(el.id || "").toLowerCase();
      const tokens = String(el.getAttribute("class") || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const shell =
        id === "page" ||
        id === "wrapper" ||
        id === "wrap" ||
        tokens.indexOf("site") !== -1 ||
        tokens.indexOf("hfeed") !== -1;
      if (shell) unwrap(el);
    });
    return root.innerHTML;
  };
  app.lbSanitizeThemeChrome = function lbSanitizeThemeChrome(html) {
    let s = String(html || "");
    s = s.replace(/<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    s = s.replace(/<(script|iframe|object|embed)\b[^>]*\/?>/gi, "");
    s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    s = s.replace(/javascript\s*:|vbscript\s*:/gi, "");
    s = app.lbDropStrayClosers(s);
    const isolated = app.lbIsolateThemeChrome(s);
    return app.chromeFragmentVisible(isolated) || !app.chromeFragmentVisible(s) ? isolated : s;
  };
  app.themeChromeScope = app.themeChromeScope || "page";
  app.normChrome = function normChrome(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim();
  };
  app.canPublishThemeChrome = function canPublishThemeChrome() {
    return !(app.D && app.D.caps && app.D.caps.design === false);
  };
  app.themeChromeScopeHTML = function themeChromeScopeHTML() {
    if (typeof app.pageInheritsThemeChrome !== "function" || !app.pageInheritsThemeChrome()) return "";
    const scope = app.themeChromeScope === "theme" ? "theme" : "page";
    const can = app.canPublishThemeChrome();
    const page = `<label class="lb-check"><input type="radio" name="lb-chrome-scope" value="page" ${scope === "page" ? "checked" : ""}> ${app.esc(app.t("This page only"))}</label>`;
    const theme = `<label class="lb-check"><input type="radio" name="lb-chrome-scope" value="theme" ${scope === "theme" ? "checked" : ""} ${can ? "" : "disabled"}> ${app.esc(app.t("Entire theme"))}</label>`;
    return `<fieldset class="lb-chrome-scope"><legend>${app.esc(app.t("Theme header and footer"))}</legend><p class="lb-muted">${app.esc(app.t("Click the header or footer on the canvas to edit it. Choose where those edits are saved."))}</p>${page}${theme}</fieldset>`;
  };
  app.chromeFragmentVisible = function chromeFragmentVisible(html) {
    const raw = app.lbDropStrayClosers(
      String(html || "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<link\b[^>]*>/gi, ""),
    );
    if (!raw.trim()) return false;
    if (typeof DOMParser === "undefined") return raw.replace(/<[^>]+>/g, "").trim().length > 0;
    const doc = new DOMParser().parseFromString('<div id="lb-vis">' + raw + "</div>", "text/html");
    const root = doc.getElementById("lb-vis");
    if (!root) return false;
    if (root.querySelector("img,svg,picture,video,canvas")) return true;
    return (root.textContent || "").replace(/\s+/g, " ").trim().length > 0;
  };
  app.inheritedChromePlaceholder = function inheritedChromePlaceholder(part) {
    const label = part === "header" ? app.t("Header") : app.t("Footer");
    return (
      '<div class="lb-chrome-empty"><span>' +
      app.esc(label) +
      "</span><small>" +
      app.esc(app.t("Inherited from the theme")) +
      "</small></div>"
    );
  };
  app.inheritedChromeInner = function inheritedChromeInner(part) {
    const html = app.themeChromeHtml && app.themeChromeHtml[part];
    if (html && app.chromeFragmentVisible(html)) return app.lbSanitizeThemeChrome(html);
    return app.inheritedChromePlaceholder(part);
  };
  app.inheritToolbarHTML = function inheritToolbarHTML() {
    const scope = app.themeChromeScope === "theme" ? app.t("Entire theme") : app.t("This page only");
    return (
      '<div class="lb-inherit-toolbar" contenteditable="false"><button type="button" data-lb-cmd="bold" title="' +
      app.esc(app.t("Bold")) +
      '"><b>B</b></button><button type="button" data-lb-cmd="italic" title="' +
      app.esc(app.t("Italic")) +
      '"><i>I</i></button><button type="button" data-lb-cmd="link" title="' +
      app.esc(app.t("Link")) +
      '">' +
      app.esc(app.t("Link")) +
      '</button><button type="button" data-lb-chrome-scope title="' +
      app.esc(app.t("Theme header and footer")) +
      '">' +
      app.esc(scope) +
      "</button></div>"
    );
  };
  app.syncInheritScopeLabels = function syncInheritScopeLabels() {
    const fd = app.frameDoc();
    if (!fd) return;
    const label = app.themeChromeScope === "theme" ? app.t("Entire theme") : app.t("This page only");
    fd.querySelectorAll("[data-lb-chrome-scope]").forEach((b) => {
      b.textContent = label;
    });
  };
  app.readUnitJson = function readUnitJson(raw) {
    try {
      if (!raw) return null;
      const node = JSON.parse(decodeURIComponent(escape(atob(String(raw)))));
      return node && typeof node === "object" ? node : null;
    } catch (err) {
      return null;
    }
  };
  app.writeUnitJson = function writeUnitJson(node) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(node))));
    } catch (err) {
      return "";
    }
  };
  app.splitChromeAssets = function splitChromeAssets(html) {
    let body = String(html || "");
    const links = [];
    const styles = [];
    body = body.replace(/<link\b[^>]*>/gi, (tag) => {
      links.push(tag);
      return "";
    });
    body = body.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (tag) => {
      styles.push(tag);
      return "";
    });
    return { body: body.trim(), links, styles };
  };
  app.lbRewriteScopeSelectors = function lbRewriteScopeSelectors(css) {
    let s = String(css || "");
    const out = [];
    let i = 0;
    let quote = "";
    let comment = false;
    while (i < s.length) {
      const ch = s[i];
      const next = s[i + 1] || "";
      if (comment) {
        out.push(ch);
        if (ch === "*" && next === "/") {
          out.push(next);
          i += 2;
          comment = false;
          continue;
        }
        i++;
        continue;
      }
      if (quote) {
        out.push(ch);
        if (ch === "\\" && next) {
          out.push(next);
          i += 2;
          continue;
        }
        if (ch === quote) quote = "";
        i++;
        continue;
      }
      if (ch === "/" && next === "*") {
        out.push(ch, next);
        i += 2;
        comment = true;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        out.push(ch);
        i++;
        continue;
      }
      if (ch !== "{") {
        out.push(ch);
        i++;
        continue;
      }
      let start = out.length - 1;
      while (start >= 0 && /\s/.test(out[start])) start--;
      let from = start;
      while (from >= 0 && out[from] !== "{" && out[from] !== "}") from--;
      const head = out.slice(from + 1, start + 1).join("");
      const prelude = /^\s*@/.test(head);
      if (!prelude && head.trim()) {
        const rewritten = head
          .split(",")
          .map((sel2) =>
            sel2.replace(/:root\b/g, ":scope").replace(/(^|[\s>+~,(])(?:html|body)(?=$|[\s.#:[>+~,),])/g, "$1:scope"),
          )
          .join(",");
        out.splice(from + 1, head.length, rewritten);
      }
      out.push("{");
      i++;
    }
    return out.join("");
  };
  app.lbScopeThemeCss = function lbScopeThemeCss(css, base) {
    let s = String(css || "").replace(/@charset\s+["'][^"']*["']\s*;/gi, "");
    if (base) {
      s = s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (all, q, raw) => {
        const u = String(raw || "").trim();
        if (!u || /^(?:data:|https?:|\/\/|#)/i.test(u)) return all;
        try {
          return "url(" + q + new URL(u, base).href + q + ")";
        } catch (err) {
          return all;
        }
      });
    }
    s = app.lbRewriteScopeSelectors(s);
    return "@scope (.lb-theme-inherit){\n" + s + "\n}";
  };
  app.themeChromeFetched = app.themeChromeFetched || {};
  app.installThemeChromeStyles = function installThemeChromeStyles(fd) {
    if (!fd || !fd.head) return;
    const pack = app.themeChromeStyles || { css: "", links: [], home: "" };
    if (pack.home && !fd.querySelector("base[data-lb-theme-base]")) {
      const base = fd.createElement("base");
      base.href = pack.home;
      base.setAttribute("data-lb-theme-base", "1");
      fd.head.prepend(base);
    }
    fd.querySelectorAll("link[data-lb-theme-style]").forEach((link) => link.remove());
    (pack.links || []).forEach((href) => {
      if (!href || Object.prototype.hasOwnProperty.call(app.themeChromeFetched, href)) return;
      app.themeChromeFetched[href] = "";
      fetch(href, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((css) => {
          app.themeChromeFetched[href] = css ? app.lbScopeThemeCss(css, href) : "";
          app.installThemeChromeStyles(fd);
        })
        .catch(() => {
          app.themeChromeFetched[href] = "";
        });
    });
    let tag = fd.getElementById("lb-theme-chrome-css");
    if (!tag) {
      tag = fd.createElement("style");
      tag.id = "lb-theme-chrome-css";
      (fd.head || fd.documentElement).appendChild(tag);
    }
    const fetched = Object.keys(app.themeChromeFetched)
      .map((href) => app.themeChromeFetched[href] || "")
      .join("\n");
    tag.textContent =
      app.lbScopeThemeCss([pack.css || "", ...(app.themeChromeInlineCss || [])].join("\n")) + "\n" + fetched;
    if (typeof app.ensureFrameStage === "function") app.ensureFrameStage(fd);
  };
  app.adoptChromeAssets = function adoptChromeAssets(fd, split) {
    if (!fd || !split) return;
    if (!app.themeChromeInlineCss) app.themeChromeInlineCss = [];
    (split.styles || []).forEach((tag) => {
      const css = String(tag)
        .replace(/<\/?style\b[^>]*>/gi, "")
        .trim();
      if (css && app.themeChromeInlineCss.indexOf(css) === -1) app.themeChromeInlineCss.push(css);
    });
    (split.links || []).forEach((tag) => {
      const match = String(tag).match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = match ? match[1] || match[2] || match[3] || "" : "";
      if (!href) return;
      app.themeChromeStyles = app.themeChromeStyles || { css: "", links: [], home: "" };
      if (!Array.isArray(app.themeChromeStyles.links)) app.themeChromeStyles.links = [];
      if (app.themeChromeStyles.links.indexOf(href) === -1) app.themeChromeStyles.links.push(href);
    });
    app.installThemeChromeStyles(fd);
  };
  app.chromeUnitMarkup = function chromeUnitMarkup(node) {
    const raw = typeof app.lbSanitizeNodeForCanvas === "function" ? app.lbSanitizeNodeForCanvas(node) : node;
    let html = app.nodeHTML(raw);
    if (typeof app.lbSanitizeCanvasMarkup === "function") html = app.lbSanitizeCanvasMarkup(html);
    return html;
  };
  app.scrubUnitDropText = function scrubUnitDropText(root) {
    if (!root || !root.ownerDocument) return;
    const types = new Set(((app.D && app.D.units) || []).map((u) => u.type));
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text;
    while ((text = walker.nextNode())) nodes.push(text);
    nodes.forEach((node) => {
      if (
        node.parentElement &&
        node.parentElement.closest &&
        node.parentElement.closest("[data-lb-unit],.lb-node,.lb-inherit-toolbar")
      )
        return;
      const next = String(node.nodeValue || "")
        .replace(/\bunit:([a-z0-9_-]+)/gi, (all, type) => (types.has(type) ? "" : all))
        .replace(/\bnode:n_[a-z0-9]+\b/g, "");
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  };
  app.importChromeUnits = function importChromeUnits(part, html) {
    if ((part !== "header" && part !== "footer") || !html || typeof DOMParser === "undefined") return;
    const doc = new DOMParser().parseFromString(
      '<div id="lb-chrome-import">' + app.lbDropStrayClosers(html) + "</div>",
      "text/html",
    );
    const root = doc.getElementById("lb-chrome-import");
    if (!root) return;
    root.querySelectorAll("[data-lb-unit]").forEach((host) => {
      const id = host.getAttribute("data-lb-unit") || "";
      if (!id || app.locate(app.state.root, id)) return;
      const node = app.readUnitJson(host.getAttribute("data-lb-unit-json") || "");
      if (!node || !node.type) return;
      node.id = id;
      app.chromeList(part).push(node);
    });
  };
  app.rangeInChrome = function rangeInChrome(doc, body, x, y) {
    if (!doc || !body) return null;
    let range = null;
    if (typeof doc.caretRangeFromPoint === "function") range = doc.caretRangeFromPoint(x, y);
    else if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) {
        range = doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range) return null;
    const node = range.startContainer;
    if (!node || !body.contains(node)) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (el && el.closest && el.closest("[data-lb-unit],.lb-node,.lb-inherit-toolbar")) return null;
    return range;
  };
  app.captureInheritedChrome = function captureInheritedChrome(el, quiet) {
    const part = el && el.dataset ? el.dataset.lbThemeInherit : "";
    if (part !== "header" && part !== "footer") return;
    const body = el.querySelector(":scope > .lb-inherit-body");
    if (!body) return;
    const clone = body.cloneNode(true);
    clone.querySelectorAll(".lb-chrome-empty").forEach((el2) => el2.remove());
    if (!String(clone.innerHTML || "").trim()) return;
    clone.querySelectorAll("[data-lb-unit]").forEach((host) => {
      const id = host.getAttribute("data-lb-unit") || "";
      const hit = id && app.locate(app.state.root, id);
      if (hit) host.setAttribute("data-lb-unit-json", app.writeUnitJson(hit.node));
      else if (!host.getAttribute("data-lb-unit-json")) {
        host.remove();
        return;
      }
      host.innerHTML = "";
    });
    const assets = (app.themeChromeAssetHtml && app.themeChromeAssetHtml[part]) || "";
    const html = app.lbSanitizeThemeChrome(assets + clone.innerHTML);
    if (!app.themeChromeHtml) app.themeChromeHtml = { header: "", footer: "" };
    app.themeChromeHtml[part] = html;
    const base = app.themeChromeBaseline || {};
    if (app.normChrome(html) !== app.normChrome(base[part] || "")) {
      app.themeChromeHtmlDirty = true;
      app.dirty = true;
      if (!quiet && app.scheduleSave) app.scheduleSave();
    }
  };
  app.hydrateChromeUnits = function hydrateChromeUnits(el) {
    const part = el && el.dataset ? el.dataset.lbThemeInherit : "";
    if (part !== "header" && part !== "footer") return;
    const body = el.querySelector(":scope > .lb-inherit-body") || el;
    const list = Array.isArray(app.state[part]) ? app.state[part] : [];
    let changed = false;
    body.querySelectorAll("[data-lb-unit]").forEach((host) => {
      const id = host.getAttribute("data-lb-unit") || "";
      const node = list.find((n) => n.id === id);
      if (!node) {
        host.remove();
        changed = true;
        return;
      }
      host.setAttribute("contenteditable", "false");
      const markup = app.chromeUnitMarkup(node);
      if (host.__lbMarkup !== markup) {
        host.innerHTML = markup;
        host.__lbMarkup = markup;
      }
    });
    list.forEach((node) => {
      if (!node || !node.id || body.querySelector('[data-lb-unit="' + String(node.id).replace(/"/g, "") + '"]')) return;
      const host = el.ownerDocument.createElement("div");
      host.className = "lb-chrome-unit";
      host.setAttribute("data-lb-unit", node.id);
      host.setAttribute("contenteditable", "false");
      const markup = app.chromeUnitMarkup(node);
      host.innerHTML = markup;
      host.__lbMarkup = markup;
      body.appendChild(host);
      changed = true;
    });
    if (typeof app.bindCanvasTree === "function") app.bindCanvasTree(el);
    if (changed) app.captureInheritedChrome(el);
  };
  app.insertInheritedUnit = function insertInheritedUnit(bar, typeOrId, e, moving) {
    const part = bar && bar.dataset ? bar.dataset.lbThemeInherit : "";
    if (part !== "header" && part !== "footer") return;
    app.ensureInheritEditor(bar);
    const body = bar.querySelector(":scope > .lb-inherit-body");
    const doc = bar.ownerDocument;
    if (!body || !doc) return;
    app.scrubUnitDropText(body);
    const fd = app.frameDoc();
    if (moving && fd)
      fd.querySelectorAll('[data-lb-unit="' + String(typeOrId).replace(/"/g, "") + '"]').forEach((host2) =>
        host2.remove(),
      );
    const host = doc.createElement("div");
    host.className = "lb-chrome-unit";
    host.setAttribute("contenteditable", "false");
    const range = !moving && e ? app.rangeInChrome(doc, body, e.clientX, e.clientY) : null;
    if (range) range.insertNode(host);
    else body.appendChild(host);
    let node = null;
    if (moving) {
      const found = app.locate(app.state.root, typeOrId);
      if (!found) {
        host.remove();
        return;
      }
      app.commit(app.t("Moved %s", app.meta(found.node.type).title || found.node.type), found.node.id);
      found.nodes.splice(found.index, 1);
      if (found.node.slot) delete found.node.slot;
      app.chromeList(part).push(found.node);
      node = found.node;
    } else {
      node = app.makeNode(typeOrId);
      if (!node) {
        host.remove();
        return;
      }
      app.commit(app.t("Added %s", app.meta(node.type).title || node.type), node.id);
      app.chromeList(part).push(node);
    }
    host.setAttribute("data-lb-unit", node.id);
    host.setAttribute("data-lb-unit-json", app.writeUnitJson(node));
    app.chromeFocus = part;
    app.selected = node.id;
    app.activeTab = "settings";
    app.captureInheritedChrome(bar);
    app.render();
  };
  app.applyInheritCommand = function applyInheritCommand(el, cmd) {
    const body = el.querySelector(":scope > .lb-inherit-body");
    const doc = el.ownerDocument;
    if (!body || !doc) return;
    body.focus();
    if (cmd === "link") {
      const url = window.prompt(app.t("Link URL"), "https://");
      if (!url) return;
      doc.execCommand("createLink", false, url);
    } else if (cmd === "bold" || cmd === "italic") {
      doc.execCommand(cmd, false, null);
    }
    app.captureInheritedChrome(el);
  };
  app.ensureInheritEditor = function ensureInheritEditor(el) {
    if (!el || (el.dataset.lbThemeInherit !== "header" && el.dataset.lbThemeInherit !== "footer")) return;
    const doc = el.ownerDocument;
    if (!el.querySelector(":scope > .lb-inherit-toolbar"))
      el.insertAdjacentHTML("afterbegin", app.inheritToolbarHTML());
    let body = el.querySelector(":scope > .lb-inherit-body");
    if (!body) {
      body = doc.createElement("div");
      body.className = "lb-inherit-body";
      const toolbar = el.querySelector(":scope > .lb-inherit-toolbar");
      [...el.childNodes].filter((n) => n !== toolbar).forEach((n) => body.appendChild(n));
      el.appendChild(body);
    }
    body.setAttribute("contenteditable", "true");
    body.setAttribute("spellcheck", "true");
    if (el.__lbInheritBound) return;
    el.__lbInheritBound = true;
    const part = el.dataset.lbThemeInherit;
    el.addEventListener("focusin", () => {
      app.chromeFocus = part;
      el.classList.add("is-editing");
      if (typeof app.syncChromeFocus === "function") app.syncChromeFocus();
    });
    el.addEventListener("focusout", (ev) => {
      if (el.contains(ev.relatedTarget)) return;
      el.classList.remove("is-editing");
      app.captureInheritedChrome(el);
    });
    body.addEventListener("input", () => {
      app.scrubUnitDropText(body);
      app.captureInheritedChrome(el);
    });
    el.addEventListener(
      "dragover",
      (ev) => {
        const payload = window.__lbDragPayload || "";
        if (!/^unit:|^node:/.test(payload)) return;
        if (ev.target.closest && ev.target.closest(".lb-node")) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = payload.startsWith("node:") ? "move" : "copy";
        el.classList.add("canvas-drop");
      },
      true,
    );
    el.addEventListener("dragleave", (ev) => {
      if (!el.contains(ev.relatedTarget)) el.classList.remove("canvas-drop");
    });
    el.addEventListener(
      "drop",
      (ev) => {
        const payload = ev.dataTransfer.getData("text/plain") || window.__lbDragPayload || "";
        if (!/^unit:|^node:/.test(payload)) return;
        if (ev.target.closest && ev.target.closest(".lb-node")) return;
        ev.preventDefault();
        ev.stopPropagation();
        el.classList.remove("canvas-drop");
        if (payload.startsWith("unit:")) app.insertInheritedUnit(el, payload.slice(5), ev, false);
        else app.insertInheritedUnit(el, payload.slice(5), ev, true);
      },
      true,
    );
    el.querySelectorAll(".lb-inherit-toolbar [data-lb-cmd]").forEach((btn) => {
      btn.addEventListener("mousedown", (ev) => ev.preventDefault());
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        app.applyInheritCommand(el, btn.dataset.lbCmd);
      });
    });
    const scopeBtn = el.querySelector("[data-lb-chrome-scope]");
    if (scopeBtn) {
      scopeBtn.addEventListener("mousedown", (ev) => ev.preventDefault());
      scopeBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        app.openPageSettings();
      });
    }
  };
  app.bindInheritedChrome = function bindInheritedChrome(fd) {
    if (!fd) return;
    fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) => app.ensureInheritEditor(el));
    if (fd.__lbInheritNav) return;
    fd.__lbInheritNav = true;
    fd.addEventListener(
      "click",
      (e) => {
        const bar = e.target.closest && e.target.closest("[data-lb-theme-inherit]");
        if (!bar || (e.target.closest && e.target.closest(".lb-inherit-toolbar"))) return;
        const link = e.target.closest && e.target.closest("a,button");
        if (link) e.preventDefault();
      },
      true,
    );
  };
  app.applyThemeBodyClass = function applyThemeBodyClass(el) {
    if (!el || !el.classList) return;
    String(app.themeChromeBodyClass || "")
      .split(/\s+/)
      .forEach((name) => {
        if (name && name !== "lb-theme-inherit") el.classList.add(name);
      });
  };
  app.chromeMediaUrl = function chromeMediaUrl(url) {
    const value = String(url || "").trim();
    if (!value || /[\s"'<>]/.test(value)) return "";
    if (/^(?:https?:)?\/\//i.test(value) || value.charAt(0) === "/") return value;
    return "";
  };
  app.revealChromeMedia = function revealChromeMedia(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const lazy =
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-ll-src") ||
        img.getAttribute("data-orig-src") ||
        img.getAttribute("data-src") ||
        "";
      const next = app.chromeMediaUrl(lazy);
      const placeholder =
        !src ||
        src === "#" ||
        /^data:/i.test(src) ||
        /^about:blank$/i.test(src) ||
        /placeholder|blank\.(?:gif|png|svg)|1x1|lazy/i.test(src);
      if (next && placeholder) img.setAttribute("src", next);
      const set = img.getAttribute("data-lazy-srcset") || img.getAttribute("data-srcset") || "";
      if (set && placeholder && !/["'<>]/.test(set)) img.setAttribute("srcset", set);
    });
    root.querySelectorAll("[data-settings]").forEach((el) => {
      let data = null;
      try {
        data = JSON.parse(el.getAttribute("data-settings") || "");
      } catch (err) {
        return;
      }
      const url = data && data.background_image && data.background_image.url;
      const next = app.chromeMediaUrl(url);
      if (!next) return;
      const view = el.ownerDocument && el.ownerDocument.defaultView;
      const painted =
        view && view.getComputedStyle
          ? String(view.getComputedStyle(el).backgroundImage || "")
          : String(el.style.backgroundImage || "");
      if (painted && painted !== "none") return;
      el.style.backgroundImage = 'url("' + next.replace(/"/g, "") + '")';
      if (!el.style.backgroundRepeat) el.style.backgroundRepeat = "no-repeat";
      if (!el.style.backgroundPosition) el.style.backgroundPosition = "center center";
      if (!el.style.backgroundSize) el.style.backgroundSize = data.background_size || "contain";
    });
  };
  app.freezeChromeMedia = function freezeChromeMedia(root) {
    if (!root || !root.querySelectorAll) return;
    app.revealChromeMedia(root);
    root.querySelectorAll("img,svg,picture,video").forEach((node) => {
      node.setAttribute("contenteditable", "false");
      node.setAttribute("draggable", "false");
    });
  };
  app.paintInheritedChrome = function paintInheritedChrome(fd) {
    if (!fd || !app.themeChromeHtml) return;
    fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) => app.applyThemeBodyClass(el));
    app.installThemeChromeStyles(fd);
    const typing = fd.activeElement && fd.activeElement.closest && fd.activeElement.closest(".lb-inherit-body");
    fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) => {
      const part = el.dataset.lbThemeInherit;
      const html = app.themeChromeHtml[part];
      app.ensureInheritEditor(el);
      const editing = typing && typing.closest("[data-lb-theme-inherit]") === el;
      if (!editing) {
        const safe = html && app.chromeFragmentVisible(html) ? app.lbSanitizeThemeChrome(html) : "";
        const split = app.splitChromeAssets(safe);
        app.adoptChromeAssets(fd, split);
        const body = el.querySelector(":scope > .lb-inherit-body");
        const next = safe ? split.body : app.inheritedChromePlaceholder(part);
        if (body && body.__lbChromeSrc !== next) {
          body.innerHTML = next;
          body.__lbChromeSrc = next;
          app.freezeChromeMedia(body);
        }
      }
      app.hydrateChromeUnits(el);
    });
    app.bindInheritedChrome(fd);
  };
  app.ensureThemeChrome = function ensureThemeChrome() {
    if (!app.pageInheritsThemeChrome() || app.themeChromeHtml || app.themeChromeLoading) return;
    if (app.sitePart && app.sitePart("header") && app.sitePart("footer")) return;
    const api = String((app.D && app.D.api) || "").replace(/\/$/, "");
    if (!api) return;
    app.themeChromeLoading = true;
    const post = parseInt(app.D.postId || 0, 10) || 0;
    fetch(api + "/theme-chrome?post_id=" + post, { headers: { "X-WP-Nonce": app.D.nonce || "" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        app.themeChromeLoading = false;
        if (!data) return;
        const header = app.lbDropStrayClosers(String(data.header || ""));
        const footer = app.lbDropStrayClosers(String(data.footer || ""));
        app.themeChromeHtml = { header, footer };
        app.themeChromeBaseline = { header, footer };
        app.themeChromeLive = {
          header: String((data.live && data.live.header) || ""),
          footer: String((data.live && data.live.footer) || ""),
        };
        const styles = data.styles && typeof data.styles === "object" ? data.styles : {};
        app.themeChromeStyles = {
          css: String(styles.css || ""),
          links: Array.isArray(styles.links) ? styles.links.slice() : [],
          home: String(data.home || ""),
        };
        app.themeChromeBodyClass = String(data.bodyClass || "");
        app.themeChromeInlineCss = [];
        app.themeChromeAssetHtml = { header: "", footer: "" };
        ["header", "footer"].forEach((part) => {
          const split = app.splitChromeAssets(app.themeChromeHtml[part] || "");
          app.themeChromeAssetHtml[part] = (split.links || []).join("") + (split.styles || []).join("");
          app.importChromeUnits(part, app.themeChromeHtml[part]);
        });
        app.themeChromeScope = data.scope === "theme" ? "theme" : "page";
        app.themeChromeSavedScope = app.themeChromeScope;
        app.paintInheritedChrome(app.frameDoc());
        app.syncInheritScopeLabels();
      })
      .catch(() => {
        app.themeChromeLoading = false;
      });
  };
  app.persistThemeChrome = async function persistThemeChrome() {
    if (!app.pageInheritsThemeChrome()) return;
    const fd = app.frameDoc();
    if (fd) fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) => app.captureInheritedChrome(el, true));
    if (!app.themeChromeHtmlDirty && !app.themeChromeScopeDirty) return;
    const id = parseInt((app.D && app.D.postId) || 0, 10);
    if (!id) return;
    const base = app.themeChromeBaseline || {};
    const cur = app.themeChromeHtml || {};
    const parts = {};
    ["header", "footer"].forEach((part) => {
      if (app.normChrome(cur[part]) !== app.normChrome(base[part])) parts[part] = cur[part] || "";
    });
    let scope = app.themeChromeScope === "theme" ? "theme" : "page";
    if (scope === "theme" && !app.canPublishThemeChrome()) scope = "page";
    const api = String((app.D && app.D.api) || "").replace(/\/$/, "");
    const r = await fetch(api + "/theme-chrome", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce || "" },
      body: JSON.stringify({ post_id: id, scope, parts }),
    });
    if (!r.ok) throw Error();
    const now = app.themeChromeHtml || {};
    const nextBase = {
      header:
        app.normChrome(now.header) === app.normChrome(cur.header)
          ? String(cur.header || "")
          : String((app.themeChromeBaseline || {}).header || ""),
      footer:
        app.normChrome(now.footer) === app.normChrome(cur.footer)
          ? String(cur.footer || "")
          : String((app.themeChromeBaseline || {}).footer || ""),
    };
    app.themeChromeBaseline = nextBase;
    app.themeChromeSavedScope = scope;
    app.themeChromeHtmlDirty =
      app.normChrome(now.header) !== app.normChrome(nextBase.header) ||
      app.normChrome(now.footer) !== app.normChrome(nextBase.footer);
    const liveScope = app.themeChromeScope === "theme" ? "theme" : "page";
    app.themeChromeScopeDirty = liveScope !== scope;
    if (!app.canPublishThemeChrome() && app.themeChromeScope === "theme") app.themeChromeScopeDirty = false;
    if (app.themeChromeHtmlDirty || app.themeChromeScopeDirty) {
      app.dirty = true;
      if (app.scheduleSave) app.scheduleSave();
    }
  };
  app.chromeInnerHTML = function chromeInnerHTML(part) {
    const label = part === "header" ? app.t("Header") : app.t("Footer");
    const list = Array.isArray(app.state[part]) ? app.state[part] : [];
    const nodes = list
      .map((n) => app.lbSanitizeNodeForCanvas(n))
      .map(app.nodeHTML)
      .join("");
    const badge =
      app.sitePart && app.sitePart(part)
        ? '<div class="lb-chrome-label"><span>' +
          app.esc(label) +
          "</span><small>" +
          app.esc(app.t("Site-wide")) +
          "</small></div>"
        : "";
    if (nodes) return badge + app.lbSanitizeCanvasMarkup(nodes);
    return (
      badge +
      '<div class="lb-chrome-empty"><span>' +
      app.esc(label) +
      "</span><small>" +
      app.esc(app.t("Drag a unit here")) +
      "</small></div>"
    );
  };
  app.pageChromeHTML = function pageChromeHTML(part) {
    const tag = part === "header" ? "header" : "footer";
    if (app.sitePart && app.sitePart(part)) {
      const editing2 = app.chromeFocus === part ? " is-editing" : "";
      return (
        "<" +
        tag +
        ' class="lb-theme-bar lb-theme-' +
        tag +
        " lb-chrome lb-site-part" +
        editing2 +
        '" data-lb-chrome="' +
        part +
        '" data-lb-site-part="' +
        part +
        '">' +
        app.chromeInnerHTML(part) +
        "</" +
        tag +
        ">"
      );
    }
    if (app.pageInheritsThemeChrome()) {
      return (
        "<" +
        tag +
        ' class="lb-theme-bar lb-theme-' +
        tag +
        ' lb-theme-inherit" data-lb-theme-inherit="' +
        part +
        '">' +
        app.inheritedChromeInner(part) +
        "</" +
        tag +
        ">"
      );
    }
    const hidden = app.pageShowsThemeChrome() ? "" : " is-hidden";
    const editing = app.chromeFocus === part ? " is-editing" : "";
    return (
      "<" +
      tag +
      ' class="lb-theme-bar lb-theme-' +
      tag +
      " lb-chrome" +
      hidden +
      editing +
      '" data-lb-chrome="' +
      part +
      '">' +
      app.chromeInnerHTML(part) +
      "</" +
      tag +
      ">"
    );
  };
  app.paintChrome = function paintChrome(fd) {
    if (!fd) return;
    fd.querySelectorAll("[data-lb-chrome]").forEach((el) => {
      const part = el.dataset.lbChrome;
      if (part !== "header" && part !== "footer") return;
      el.innerHTML = app.chromeInnerHTML(part);
      el.classList.toggle("is-hidden", el.classList.contains("lb-site-part") ? false : !app.pageShowsThemeChrome());
      el.classList.toggle("is-editing", app.chromeFocus === part);
    });
  };
  app.focusChrome = function focusChrome(part) {
    if (part !== "header" && part !== "footer" && part !== "root") return;
    app.chromeFocus = part === "root" ? null : part;
    app.selected = null;
    app.activeTab = "navigator";
    const fd = app.frameDoc();
    if (fd) {
      app.paintChrome(fd);
      fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) => {
        const on = el.dataset.lbThemeInherit === app.chromeFocus;
        el.classList.toggle("is-editing", on);
        if (on) el.scrollIntoView({ block: "nearest" });
      });
    }
    if (typeof app.refreshRightPanel === "function") app.refreshRightPanel();
    else if (typeof app.render === "function") app.render();
  };
  app.syncChromeFocus = function syncChromeFocus() {
    const fd = app.frameDoc();
    if (!fd) return;
    fd.querySelectorAll("[data-lb-chrome]").forEach((el) =>
      el.classList.toggle("is-editing", el.dataset.lbChrome === app.chromeFocus),
    );
    fd.querySelectorAll("[data-lb-theme-inherit]").forEach((el) =>
      el.classList.toggle("is-editing", el.dataset.lbThemeInherit === app.chromeFocus),
    );
  };
  app.pageDropHTML = function pageDropHTML() {
    const btn = (action, cls, title, inner) =>
      '<button type="button" class="lb-page-drop-btn ' +
      cls +
      '" data-lb-drop-action="' +
      action +
      '" title="' +
      app.esc(title) +
      '" aria-label="' +
      app.esc(title) +
      '">' +
      inner +
      "</button>";
    const folder =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3.5 6.2A2.2 2.2 0 015.7 4h3.2l1.6 1.8h7.8a2.2 2.2 0 012.2 2.2v8.6a2.2 2.2 0 01-2.2 2.2H5.7a2.2 2.2 0 01-2.2-2.2V6.2z"/></svg>';
    const grid =
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 4h6.2v6.2H4V4zm9.8 0H20v6.2h-6.2V4zM4 13.8h6.2V20H4v-6.2zm9.8 0H20V20h-6.2v-6.2z"/></svg>';
    return (
      '<div class="lb-empty lb-page-drop" data-lb-page-drop><div class="lb-page-drop-inner"><div class="lb-page-drop-actions">' +
      btn("container", "is-plus", app.t("Add container"), "+") +
      btn("templates", "is-folder", app.t("Templates"), folder) +
      btn("widgets", "is-brand", app.t("Add widget"), "C") +
      btn("grid", "is-grid", app.t("Add grid"), grid) +
      '</div><p class="lb-page-drop-label">' +
      app.esc(app.t("Drag widget here")) +
      "</p></div></div>"
    );
  };
  app.canvasMarkup = function canvasMarkup() {
    if (typeof app.designsHeaderAndFooter === "function" && app.designsHeaderAndFooter()) {
      return (
        '<div class="lb-hf-placeholder"><span>' +
        app.esc(app.t("Page content")) +
        "</span><small>" +
        app.esc(app.t("Design the header above and the footer below.")) +
        "</small></div>"
      );
    }
    const tree = (app.state.root || []).map((n) => app.lbSanitizeNodeForCanvas(n));
    return app.lbSanitizeCanvasMarkup(tree.map(app.nodeHTML).join("") + app.pageDropHTML());
  };
  app.pageStageStyle = function pageStageStyle(important) {
    const b = important ? "!important" : "";
    return (
      "body{display:flex" +
      b +
      ";flex-direction:column" +
      b +
      ";min-height:100%" +
      b +
      ";height:auto" +
      b +
      ";overflow:visible" +
      b +
      ";margin:0" +
      b +
      ";padding:0" +
      b +
      ";background:#fff" +
      b +
      ";box-sizing:border-box" +
      b +
      "}.lb-page-stage{display:flex" +
      b +
      ";flex-direction:column" +
      b +
      ";flex:1 1 auto" +
      b +
      ";min-height:100%" +
      b +
      ";width:100%" +
      b +
      ";box-sizing:border-box" +
      b +
      ";background:#fff" +
      b +
      "}.lb-theme-bar{flex:0 0 auto" +
      b +
      ";display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-height:72px;width:100%;background:#f7f8f9;color:#8b939c;font:500 13px/1 system-ui,sans-serif;box-sizing:border-box;pointer-events:auto}.lb-theme-header{border-bottom:1px solid #e6eaee}.lb-theme-footer{border-top:1px solid #e6eaee;min-height:84px}.lb-theme-bar.is-hidden{display:none" +
      b +
      "}.lb-theme-inherit{position:relative;display:block" +
      b +
      ";flex:0 0 auto" +
      b +
      ";background:transparent" +
      b +
      ";color:inherit" +
      b +
      ";font:inherit" +
      b +
      ";min-height:0" +
      b +
      ";height:auto" +
      b +
      ";padding:0" +
      b +
      ";margin:0" +
      b +
      ";border:0" +
      b +
      ";pointer-events:auto" +
      b +
      ";cursor:text}.lb-theme-inherit #page,.lb-theme-inherit #wrapper,.lb-theme-inherit #wrap,.lb-theme-inherit #content,.lb-theme-inherit #primary,.lb-theme-inherit #main,.lb-theme-inherit .site,.lb-theme-inherit .hfeed,.lb-theme-inherit .site-content,.lb-theme-inherit .content-area,.lb-theme-inherit main,.lb-theme-inherit .elementor-section,.lb-theme-inherit .elementor-top-section,.lb-theme-inherit .elementor-section-height-full,.lb-theme-inherit .elementor-section-height-min-height{min-height:0" +
      b +
      ";height:auto" +
      b +
      ";max-height:none" +
      b +
      ";flex:0 0 auto" +
      b +
      "}.lb-theme-inherit #preloader,.lb-theme-inherit .preloader,.lb-theme-inherit .page-loader,.lb-theme-inherit .site-loader,.lb-theme-inherit .loader-wrapper,.lb-theme-inherit .loading-screen{display:none" +
      b +
      "}.lb-theme-header.lb-theme-inherit,.lb-theme-footer.lb-theme-inherit{border:0" +
      b +
      ";min-height:0" +
      b +
      "}.lb-theme-inherit .custom-logo,.lb-theme-inherit .custom-logo-link img,.lb-theme-inherit .site-logo img,.lb-theme-inherit .site-branding img,.lb-theme-inherit .elementor-widget-theme-site-logo img,.lb-theme-inherit .elementor-widget-image .elementor-widget-container img{max-width:100%;height:auto}.lb-theme-header.lb-theme-inherit .elementor-widget-theme-site-logo,.lb-theme-header.lb-theme-inherit .elementor-widget-image,.lb-theme-header.lb-theme-inherit .elementor-widget-hfe-site-logo,.lb-theme-header.lb-theme-inherit .custom-logo-link,.lb-theme-header.lb-theme-inherit .site-logo,.lb-theme-header.lb-theme-inherit .site-branding,.lb-theme-header.lb-theme-inherit .hfe-site-logo,.lb-theme-header.lb-theme-inherit .elementor-widget-theme-site-logo > .elementor-widget-container,.lb-theme-header.lb-theme-inherit .elementor-widget-image > .elementor-widget-container,.lb-theme-header.lb-theme-inherit .elementor-widget-hfe-site-logo > .elementor-widget-container{flex:0 0 auto" +
      b +
      ";width:max-content" +
      b +
      ";max-width:220px" +
      b +
      ";min-width:64px" +
      b +
      ";min-height:0" +
      b +
      ";overflow:visible" +
      b +
      ";align-self:center" +
      b +
      "}.lb-theme-header.lb-theme-inherit .e-con:is(:has(> .elementor-widget-theme-site-logo),:has(> .elementor-widget-image),:has(> .elementor-widget-hfe-site-logo),:has(> .e-con-inner > .elementor-widget-theme-site-logo),:has(> .e-con-inner > .elementor-widget-image),:has(> .e-con-inner > .elementor-widget-hfe-site-logo)):not(:has(.elementor-widget-nav-menu,.elementor-nav-menu,.elementor-widget-icon-list,.elementor-widget-social-icons)),.lb-theme-header.lb-theme-inherit .elementor-column:is(:has(> .elementor-widget-wrap > .elementor-widget-theme-site-logo),:has(> .elementor-widget-wrap > .elementor-widget-image),:has(> .elementor-widget-wrap > .elementor-widget-hfe-site-logo)):not(:has(.elementor-nav-menu,.elementor-widget-icon-list,.elementor-widget-social-icons)){flex:0 0 auto" +
      b +
      ";width:max-content" +
      b +
      ";max-width:240px" +
      b +
      ";min-width:64px" +
      b +
      ";overflow:visible" +
      b +
      "}.lb-theme-header.lb-theme-inherit .custom-logo,.lb-theme-header.lb-theme-inherit .custom-logo-link img,.lb-theme-header.lb-theme-inherit .custom-logo-link svg,.lb-theme-header.lb-theme-inherit .site-logo img,.lb-theme-header.lb-theme-inherit .site-branding img,.lb-theme-header.lb-theme-inherit .site-branding svg,.lb-theme-header.lb-theme-inherit .elementor-widget-theme-site-logo img,.lb-theme-header.lb-theme-inherit .elementor-widget-theme-site-logo svg,.lb-theme-header.lb-theme-inherit .elementor-widget-image img,.lb-theme-header.lb-theme-inherit .elementor-widget-hfe-site-logo img,.lb-theme-header.lb-theme-inherit .hfe-site-logo-img{display:block" +
      b +
      ";visibility:visible" +
      b +
      ";opacity:1" +
      b +
      ";width:auto" +
      b +
      ";height:auto" +
      b +
      ";max-width:100%" +
      b +
      ";max-height:110px" +
      b +
      ";min-width:0" +
      b +
      ";min-height:0" +
      b +
      ";object-fit:contain" +
      b +
      "}.lb-theme-footer.lb-theme-inherit:has(.lb-chrome-empty){min-height:84px" +
      b +
      "}.lb-theme-inherit:hover{box-shadow:inset 0 0 0 1px #c5ccd4}.lb-theme-inherit.canvas-drop{background:transparent" +
      b +
      ";box-shadow:inset 0 0 0 2px #3f7fdf}.lb-theme-inherit .lb-chrome-empty{min-height:48px}.lb-inherit-body{min-height:0;outline:none;cursor:text;font:inherit;color:inherit}.lb-chrome-unit{display:block;flex:0 1 auto;min-width:0;max-width:100%;margin:0}.lb-theme-inherit .lb-chrome-unit>.lb-node{width:auto;max-width:100%;background:transparent}.lb-inherit-toolbar{display:none;align-items:center;gap:4px;position:absolute;top:6px;right:8px;z-index:5;padding:4px;background:#1d2327;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.18)}.lb-theme-inherit.is-editing .lb-inherit-toolbar,.lb-theme-inherit:focus-within .lb-inherit-toolbar{display:flex}.lb-inherit-toolbar button{border:0;background:transparent;color:#fff;font:600 12px/1 system-ui,sans-serif;padding:4px 6px;cursor:pointer;border-radius:4px}.lb-inherit-toolbar button:hover{background:#2c3338}.lb-theme-bar.is-editing{box-shadow:inset 0 0 0 2px #3f7fdf}.lb-site-part{position:relative;outline:1px dashed #3f7fdf;outline-offset:-1px}.lb-chrome-label{display:flex;align-items:center;gap:8px;min-height:22px;padding:0 10px;background:#1d2327;color:#fff;font:600 11px/22px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;pointer-events:none}.lb-chrome-label small{font-weight:500;letter-spacing:0;text-transform:none;color:#c3c4c7}.lb-theme-bar.canvas-drop{background:#f4f8fd}.lb-chrome-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:72px;width:100%;pointer-events:none}.lb-theme-inherit .lb-inherit-body,.lb-theme-inherit .lb-chrome-empty{pointer-events:auto}.lb-theme-footer .lb-chrome-empty{min-height:84px}.lb-chrome-empty small{font:italic 12px/1.3 system-ui,sans-serif;color:#8e969e}.lb-theme-bar>.lb-node{width:100%;background:#fff}.lb-frame-root{display:flex" +
      b +
      ";flex-direction:column" +
      b +
      ";flex:1 1 auto" +
      b +
      ";box-sizing:border-box" +
      b +
      ";width:100%" +
      b +
      ";max-width:none" +
      b +
      ";margin:0" +
      b +
      ";min-height:0" +
      b +
      ";height:auto" +
      b +
      ";padding:0" +
      b +
      ";background:#fff" +
      b +
      ";position:relative" +
      b +
      ";overflow:visible" +
      b +
      "}.lb-frame-root>.lb-node{flex:0 0 auto" +
      b +
      "}.lb-hf-placeholder{flex:1 1 auto" +
      b +
      ";min-height:180px" +
      b +
      ";margin:22px 28px" +
      b +
      ";display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed #c5ccd4;background:#f7f8f9;color:#50575e;pointer-events:none;box-sizing:border-box}.lb-hf-placeholder span{font:600 14px/1.3 system-ui,sans-serif}.lb-hf-placeholder small{font:italic 12px/1.3 system-ui,sans-serif;color:#8e969e}.lb-frame-root>.lb-page-drop,.lb-frame-root>.lb-empty{flex:1 1 auto" +
      b +
      ";min-height:160px" +
      b +
      ";height:auto" +
      b +
      ";margin:22px 28px" +
      b +
      ";box-sizing:border-box" +
      b +
      ";display:flex;align-items:center;justify-content:center;border:1px dashed #c5ccd4;background:#fff;color:#8b939c}.lb-page-drop.is-drag-over{border:2px dashed #3f7fdf!important;background:#f0f6ff!important}.lb-page-drop.is-drag-over .lb-page-drop-label{color:#2463b4!important}.lb-page-drop-inner{display:flex;flex-direction:column;align-items:center;gap:12px}.lb-page-drop-actions{display:flex;align-items:center;justify-content:center;gap:10px}.lb-page-drop-btn{width:36px;height:36px;padding:0;border:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font:700 18px/1 system-ui,sans-serif}.lb-page-drop-btn.is-plus{background:#e6e8eb;color:#2c3136;font-size:22px;font-weight:500}.lb-page-drop-btn.is-folder{background:#1c1e22}.lb-page-drop-btn.is-brand{background:#2f73d9;font-size:14px;font-weight:800}.lb-page-drop-btn.is-grid{background:#7b5ea7;border-radius:10px}.lb-page-drop-btn:hover{filter:brightness(1.06)}.lb-page-drop-label{margin:0;font:italic 14px/1.3 system-ui,sans-serif;color:#8e969e}.lb-frame-root.canvas-drop>.lb-page-drop{border-color:#3f7fdf;background:#f4f8fd}body.lb-template-full-width .lb-frame-root,body.lb-template-canvas .lb-frame-root,body.lb-template-default .lb-frame-root{padding:0" +
      b +
      ";width:100%" +
      b +
      ";max-width:none" +
      b +
      ";margin:0" +
      b +
      ";min-height:0" +
      b +
      "}.lb-page-stage>.lb-frame-root{display:flex" +
      b +
      ";visibility:visible" +
      b +
      ";opacity:1" +
      b +
      ";position:relative" +
      b +
      ";z-index:1" +
      b +
      ";min-height:160px" +
      b +
      ";height:auto" +
      b +
      ";overflow:visible" +
      b +
      "}.lb-frame-root>.lb-node,.lb-frame-root>.lb-page-drop{visibility:visible" +
      b +
      ";position:relative" +
      b +
      "}.lb-frame-root .lb-interact-fade,.lb-frame-root .lb-interact-slide-up,.lb-frame-root .lb-interact-scale,.lb-frame-root .lb-interact-slide-right,.lb-frame-root .lb-interact-rotate,.lb-frame-root .lb-interact-blur,.lb-frame-root .lb-fx{opacity:1" +
      b +
      ";transform:none" +
      b +
      ";filter:none" +
      b +
      ";animation:none" +
      b +
      ";visibility:visible" +
      b +
      "}"
    );
  };
  app.ensureFrameStage = function ensureFrameStage(fd) {
    if (!fd || !fd.head) return;
    let st = fd.getElementById("lb-stage-style");
    if (!st) {
      st = fd.createElement("style");
      st.id = "lb-stage-style";
      (fd.head || fd.documentElement).appendChild(st);
    }
    st.textContent =
      "html{margin:0!important;padding:0!important;height:100%!important;background:#fff!important;box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:scroll!important;scrollbar-gutter:stable!important}html::-webkit-scrollbar{width:12px}html::-webkit-scrollbar-track{background:#eef1f4}html::-webkit-scrollbar-thumb{background:#b7c0ca;border-radius:6px}" +
      app.pageStageStyle(true);
    if (fd.head.lastElementChild !== st) fd.head.appendChild(st);
  };
  app.applyPageTemplatePreview = function applyPageTemplatePreview() {
    const fd = app.frameDoc();
    if (!fd || !fd.body) return;
    app.ensureFrameStage(fd);
    const tpl = app.pageTemplate();
    const slug = "lb-template-" + tpl.replace(/_/g, "-");
    fd.body.className = app.pageTemplateBodyClass();
    if (fd.documentElement) {
      ["lb-template-default", "lb-template-full-width", "lb-template-canvas"].forEach((c) =>
        fd.documentElement.classList.remove(c),
      );
      fd.documentElement.classList.add(slug);
    }
    const root = fd.querySelector(".lb-frame-root");
    if (!root) return;
    const width = String(
      (app.state.settings || {}).page_width ||
        (typeof app.kitContentWidth === "function" ? app.kitContentWidth() : "") ||
        app.D.globals?.content_width ||
        "",
    ).trim();
    if (tpl === "default" && width) root.style.setProperty("--lb-page-width", width);
    else root.style.removeProperty("--lb-page-width");
    const show = app.pageShowsThemeChrome();
    const inherit = app.pageInheritsThemeChrome();
    fd.querySelectorAll(".lb-theme-bar").forEach((el) => {
      if (el.classList.contains("lb-site-part")) {
        el.classList.remove("is-hidden");
        return;
      }
      const inherited = el.classList.contains("lb-theme-inherit");
      el.classList.toggle("is-hidden", inherited ? !inherit : !show);
    });
    if (inherit) app.ensureThemeChrome();
  };
  app.addNewPage = async function addNewPage() {
    const input = document.getElementById("lb-new-page-title");
    const title = (input?.value || "").trim() || "Sidcraft Page Builder Page";
    const button = document.getElementById("lb-create-page");
    if (button) {
      button.disabled = true;
      button.textContent = app.t("Creating\u2026");
    }
    try {
      const r = await fetch(`${app.D.api}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify({ title }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.id) throw new Error(data?.message || "WordPress could not create the page.");
      window.location.href = data.url || `${app.D.adminUrl}admin.php?page=sidcraft-page-builder&post_id=${data.id}`;
    } catch (e) {
      const msg = document.getElementById("lb-new-page-error");
      if (msg) msg.textContent = e?.message || "Could not create the page.";
      if (button) {
        button.disabled = false;
        button.textContent = app.t("Add Page");
      }
    }
  };
  app.openPageMenu = function openPageMenu() {
    app.showModal(
      app.t("Page"),
      `<div class="lb-page-actions"><button type="button" class="lb-btn" id="lb-open-page-settings">${app.t("Page Settings")}</button><button type="button" class="lb-btn primary" id="lb-open-add-page">Add New Page</button></div>`,
      () => {
        document.getElementById("lb-open-page-settings")?.addEventListener("click", () => {
          app.closeModal();
          app.openPageSettings();
        });
        document.getElementById("lb-open-add-page")?.addEventListener("click", () => {
          const body = `<p>Create a new WordPress Page and open it directly in Sidcraft Page Builder. This avoids leaving the Sidcraft Page Builder workspace.</p><label class="lb-control"><span>Page title</span><input id="lb-new-page-title" value="Sidcraft Page Builder Page" autofocus></label><div id="lb-new-page-error" class="lb-tinymce-error" aria-live="polite"></div><div class="lb-tinymce-actions"><button type="button" class="lb-btn" data-close-modal>Cancel</button><button type="button" class="lb-btn primary" id="lb-create-page">${app.t("Add Page")}</button></div>`;
          app.showModal(app.t("Add New Page"), body, () => {
            document.getElementById("lb-create-page")?.addEventListener("click", app.addNewPage);
            document.getElementById("lb-new-page-title")?.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                app.addNewPage();
              }
            });
          });
        });
      },
    );
  };
  app.bindModal = function bindModal() {
    document.querySelectorAll(".lb-modal-backdrop").forEach((b) =>
      b.addEventListener("click", (e) => {
        if (e.target === b || e.target.closest("[data-close-modal]")) app.closeModal();
      }),
    );
    document.querySelectorAll(".lb-modal-backdrop [data-icon-id]").forEach(
      (b) =>
        (b.onclick = () => {
          if (app.selected) app.update("icon", b.dataset.iconId);
          app.closeModal();
        }),
    );
    document
      .querySelectorAll(".lb-modal-backdrop [data-template-id]")
      .forEach((b) => (b.onclick = () => app.loadTemplate(b.dataset.templateId)));
    document
      .querySelectorAll(".lb-modal-backdrop [data-component-id]")
      .forEach((b) => (b.onclick = () => app.loadComponent(b.dataset.componentId)));
    document
      .querySelectorAll(".lb-modal-backdrop [data-revision]")
      .forEach((b) => (b.onclick = () => app.restoreRevision(b.dataset.revision)));
    document.querySelectorAll(".lb-modal-backdrop [data-nav-id]").forEach(
      (b) =>
        (b.onclick = () => {
          const n = (app.D.navigation || []).find((x) => String(x.id) === String(b.dataset.navId));
          if (n?.id) window.open(`${app.D.adminUrl}admin.php?page=sidcraft-page-builder&post_id=${n.id}`, "_blank");
        }),
    );
  };
  app.loadTemplate = async function loadTemplate(id) {
    const r = await fetch(`${app.D.api}/templates/${id}`, { headers: { "X-WP-Nonce": app.D.nonce } }),
      doc = await r.json();
    if (doc.root) {
      app.commit(app.t("Inserted template"));
      app.state.root = app.state.root.concat(doc.root.map(app.clone));
      app.selected = null;
      app.closeModal();
      app.render();
    }
  };
  app.loadComponent = async function loadComponent(id) {
    const n = { id: app.eid(), type: "component", settings: { component_id: Number(id), css_class: "" } };
    app.commit(app.t("Added component"), n.id);
    app.state.root.push(n);
    app.selected = n.id;
    app.closeModal();
    app.render();
  };
  app.restoreRevision = async function restoreRevision(i) {
    if (!confirm("Restore this revision? Current changes will be saved as a new revision first.")) return;
    const r = await fetch(`${app.D.api}/document/${app.D.postId}/revisions/${i}/restore`, {
      method: "POST",
      headers: { "X-WP-Nonce": app.D.nonce },
    });
    if (r.ok) {
      const d = await r.json();
      app.state = d.document || app.state;
      app.dirty = true;
      app.closeModal();
      app.render();
    }
  };
  app.saveTemplate = async function saveTemplate() {
    const title = prompt(app.t("Template name:"), "My Template");
    if (!title) return;
    const type = prompt(app.t("Template type: page, section or block"), "page") || "page";
    const r = await fetch(`${app.D.api}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ title, type, document: app.state }),
    });
    if (!r.ok) alert(app.t("Could not save template."));
  };
  app.saveComponent = async function saveComponent() {
    if (!app.selected) return;
    const r = app.locate(app.state.root, app.selected),
      title = prompt(app.t("Component name:"), "Reusable Component");
    if (!r || !title) return;
    const x = await fetch(`${app.D.api}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({
        title,
        document: { version: "2.1", root: [app.clone(r.node)], atomic: true },
        exposed: ["text", "title", "url", "image_url", "color", "background"],
      }),
    });
    if (!x.ok) alert(app.t("Could not save component."));
  };
  app.openMedia = function openMedia(e) {
    if (!window.wp?.media || !app.selected) return;
    const btn = e && e.currentTarget;
    const key = (btn && btn.dataset && btn.dataset.mediaKey) || "image_id";
    const raw = String((btn && btn.dataset && btn.dataset.mediaLibrary) || "image");
    const types = raw.split(/[,\s]+/).filter(Boolean);
    const libraryType = types.length === 1 ? types[0] : types.length ? types : "image";
    const videoOnly = types.length === 1 && types[0] === "video";
    const f = wp.media({
      title: app.t(videoOnly ? "Select Video" : "Select Image"),
      button: { text: app.t(videoOnly ? "Use Video" : "Use this file") },
      multiple: false,
      library: { type: libraryType },
    });
    f.on("select", () => {
      const a = f.state().get("selection").first().toJSON(),
        r = app.locate(app.state.root, app.selected);
      if (!r) return;
      app.commit();
      app.setPath(r.node.settings, key, a.id);
      const urlKey = key.replace(/_id$/, "_url");
      const file =
        a.type === "video" || videoOnly
          ? a.url || ""
          : (a.sizes && a.sizes.medium && a.sizes.medium.url) || a.url || "";
      if (urlKey !== key) app.setPath(r.node.settings, urlKey, file);
      if (key === "image_id" && a.type !== "video" && !r.node.settings.alt) r.node.settings.alt = a.alt || "";
      app.render();
    });
    f.open();
  };
  app.openGallery = function openGallery() {
    if (!window.wp?.media || !app.selected) return;
    const r = app.locate(app.state.root, app.selected);
    if (!r) return;
    const f = wp.media({
      title: app.t("Select Gallery Images"),
      button: { text: app.t("Use Images") },
      multiple: true,
      library: { type: "image" },
    });
    f.on("select", () => {
      const items = app.mediaSelectionItems(f),
        ids = items.map((x) => x.id).filter(Boolean);
      app.commit();
      app.rememberGalleryUrls(r.node.settings, items);
      if ((r.node.settings.mode || "single") === "multiple") {
        const list = Array.isArray(r.node.settings.collections) ? r.node.settings.collections.slice() : [];
        if (!list.length) list.push({ label: app.t("Gallery 1"), ids: "" });
        list[0] = Object.assign({}, list[0], { ids: ids.join(",") });
        r.node.settings.collections = list;
        app.persistGalleryIds(r.node.settings);
      } else r.node.settings.ids = ids.join(",");
      app.render();
    });
    f.open();
  };
  app.toggleFavorite = function toggleFavorite(type) {
    if (app.fav.has(type)) app.fav.delete(type);
    else app.fav.add(type);
    fetch(`${app.D.api}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ items: [...app.fav] }),
    });
    app.render();
  };
  app.startResize = function startResize(side, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX,
      start = side === "left" ? app.leftWidth : app.rightWidth;
    document.body.classList.add("lb-resizing");
    const move = (ev) => {
      let w = side === "left" ? start + ev.clientX - sx : start - (ev.clientX - sx);
      w = Math.max(side === "right" ? 260 : 190, Math.min(560, w));
      if (side === "left") app.leftWidth = w;
      else app.rightWidth = w;
      app.root
        .querySelector(".lb-work")
        ?.style.setProperty(side === "left" ? "--lb-left-width" : "--lb-right-width", w + "px");
    };
    const up = () => {
      document.body.classList.remove("lb-resizing");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  app.syncPanelColumns = function syncPanelColumns(work) {
    work = work || app.root?.querySelector(".lb-work");
    if (!work) return;
    work.style.setProperty("--lb-left-width", (app.leftHidden ? 0 : app.leftWidth) + "px");
    work.style.setProperty("--lb-right-width", (app.rightHidden ? 0 : app.rightWidth) + "px");
  };
  app.togglePanel = function togglePanel(side) {
    if (side === "left") app.leftHidden = !app.leftHidden;
    else app.rightHidden = !app.rightHidden;
    app.render();
  };
  app.closeMainMenu = function closeMainMenu() {
    app.menuOpen = false;
    app.root.querySelector(".lb-main-menu")?.remove();
  };
  app.openMainMenu = function openMainMenu() {
    app.closeMainMenu();
    app.menuOpen = true;
    const items = [
      ["site-settings", app.t("Site Settings"), app.t("Adjust page and site-wide editor settings.")],
      ["theme-builder", app.t("Theme Builder"), app.t("Open Sidcraft Page Builder theme-building tools.")],
      ["notes", app.t("Notes"), app.t("Keep private notes for this page.")],
      ["preferences", app.t("User Preferences"), app.t("Configure editor preferences.")],
      ["shortcuts", app.t("Keyboard Shortcuts"), app.t("View Sidcraft Page Builder keyboard shortcuts.")],
      ["help", app.t("Help Center"), app.t("View help and editor guidance.")],
      ["account", app.t("My Sidcraft Page Builder"), app.t("Sidcraft Page Builder account and product information.")],
      ["exit", app.t("Exit to WordPress Dashboard"), app.t("Return to the WordPress dashboard.")],
    ];
    const html = `<div class="lb-main-menu" role="menu" aria-label="${app.t("Sidcraft Page Builder menu")}">
   <div class="lb-main-menu-head"><strong>Sidcraft Page Builder</strong><button type="button" data-menu-close aria-label="${app.t("Close menu")}">\u00D7</button></div>
   ${items.map((it, i) => `<button type="button" class="lb-main-menu-item ${it[0] === "exit" ? "is-exit" : ""}" data-main-menu="${it[0]}" role="menuitem"><span class="lb-menu-mark lb-menu-${it[0]}" aria-hidden="true">${i === 0 ? "\u2699" : i === 1 ? "\u25A4" : i === 2 ? "\u25A2" : i === 3 ? "\u25C9" : i === 4 ? "\u2328" : i === 5 ? "?" : i === 6 ? "\u25CE" : "\u21AA"}</span><span><b>${app.esc(it[1])}</b><small>${app.esc(it[2])}</small></span></button>`).join("")}
 </div>`;
    app.root.insertAdjacentHTML("beforeend", html);
    app.root.querySelector("[data-menu-close]").onclick = app.closeMainMenu;
    app.root
      .querySelectorAll("[data-main-menu]")
      .forEach((b) => (b.onclick = () => app.handleMainMenu(b.dataset.mainMenu)));
  };
  app.showMenuDialog = function showMenuDialog(title, body) {
    app.closeMainMenu();
    const html = app.modalHTML(title, body);
    app.root.insertAdjacentHTML("beforeend", html);
    app.bindModal();
  };
  app.handleMainMenu = function handleMainMenu(action) {
    if (action === "site-settings") {
      app.openPageSettings();
      return;
    }
    if (action === "theme-builder") {
      app.showMenuDialog(
        app.t("Theme Builder"),
        '<p>Theme Builder is the Sidcraft Page Builder workspace for site templates such as headers, footers, single posts, archives and other theme areas.</p><p class="lb-menu-note">The full Theme Builder is planned for the Pro module. Your current page remains open.</p>',
      );
      return;
    }
    if (action === "notes") {
      app.showMenuDialog(
        app.t("Notes"),
        '<label class="lb-control"><span>Page notes</span><textarea id="lb-page-notes" rows="8" placeholder="' +
          app.t("Add private notes for this page\u2026") +
          '">' +
          app.esc(app.state.settings?.notes || "") +
          '</textarea></label><button type="button" class="lb-btn primary" id="lb-save-notes">' +
          app.t("Save Notes") +
          "</button>",
      );
      app.$("#lb-save-notes")?.addEventListener("click", () => {
        app.state.settings = app.state.settings || {};
        app.state.settings.notes = app.$("#lb-page-notes")?.value || "";
        app.dirty = true;
        app.scheduleSave();
        app.closeModal();
      });
      return;
    }
    if (action === "preferences") {
      if (typeof app.openPreferences === "function") {
        app.openPreferences();
        return;
      }
      app.showMenuDialog(
        app.t("User Preferences"),
        '<div class="lb-preference-list"><label><input type="checkbox" id="lb-pref-autosave" checked> ' +
          app.t("Enable autosave") +
          '</label><label><input type="checkbox" id="lb-pref-tips" checked> ' +
          app.t("Show editor tips") +
          '</label><label><input type="checkbox" id="lb-pref-confirm-delete" checked> ' +
          app.t("Confirm destructive actions") +
          '</label></div><button type="button" class="lb-btn primary" id="lb-save-preferences">' +
          app.t("Save Preferences") +
          "</button>",
      );
      return;
    }
    if (action === "shortcuts") {
      app.showMenuDialog(
        app.t("Keyboard Shortcuts"),
        '<div class="lb-shortcuts"><div><kbd>Ctrl / Cmd</kbd> + <kbd>P</kbd><span>Show or hide side panels</span></div><div><kbd>Ctrl / Cmd</kbd> + <kbd>Z</kbd><span>Undo</span></div><div><kbd>Ctrl / Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd><span>Redo</span></div><div><kbd>Ctrl / Cmd</kbd> + <kbd>C</kbd><span>Copy selected unit</span></div><div><kbd>Ctrl / Cmd</kbd> + <kbd>V</kbd><span>Paste unit</span></div><div><kbd>Ctrl / Cmd</kbd> + <kbd>D</kbd><span>Duplicate selected unit</span></div><div><kbd>Delete</kbd><span>Delete selected unit</span></div><div><kbd>Esc</kbd><span>Close menus and dialogs</span></div></div>',
      );
      return;
    }
    if (action === "help") {
      app.showMenuDialog(
        app.t("Help Center"),
        '<div class="lb-help"><p><strong>Getting started</strong></p><p>Choose a unit from the left panel, drag it onto the canvas, then edit its settings in the right panel.</p><p>Use the device controls for responsive editing. Use Navigator to select nested units.</p><p class="lb-menu-note">Sidcraft Page Builder help documentation can be connected here as the documentation library grows.</p></div>',
      );
      return;
    }
    if (action === "account") {
      app.showMenuDialog(
        app.t("My Sidcraft Page Builder"),
        '<p><strong>Sidcraft Page Builder account</strong></p><p>Account, licensing and product services will be available here when the Sidcraft Page Builder account service is enabled.</p><p class="lb-menu-note">Core editing does not require an account.</p>',
      );
      return;
    }
    if (action === "exit") {
      if (app.dirty && !window.confirm(app.t("You have unsaved changes. Leave the editor?"))) return;
      window.location.href = app.D.adminUrl + "index.php";
    }
  };
  app.frameHTML = function frameHTML() {
    const body = app.canvasMarkup();
    const css = app.D.editorCss || "",
      designCss = app.lbSanitizeCss(app.D.designCss || "");
    const tpl = app.pageTemplate();
    const slug = tpl.replace(/_/g, "-");
    const width =
      tpl === "default"
        ? String(
            (app.state.settings || {}).page_width ||
              (typeof app.kitContentWidth === "function" ? app.kitContentWidth() : "") ||
              app.D.globals?.content_width ||
              "",
          ).trim()
        : "";
    const widthStyle = width ? "--lb-page-width:" + app.esc(width) + ";" : "";
    return (
      '<!doctype html><html class="lb-template-' +
      slug +
      '" dir="' +
      (app.D.isRtl ? "rtl" : "ltr") +
      '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="' +
      app.esc(css) +
      '"><style>' +
      designCss +
      "html,body{margin:0;padding:0;background:#fff;font-family:system-ui,sans-serif;box-sizing:border-box}html{height:100%;overflow-x:hidden;overflow-y:scroll;scrollbar-gutter:stable}html::-webkit-scrollbar{width:12px}html::-webkit-scrollbar-track{background:#eef1f4}html::-webkit-scrollbar-thumb{background:#b7c0ca;border-radius:6px}" +
      app.pageStageStyle(false) +
      '.lb-node{position:relative;margin:0;max-width:100%}.lb-insert-zone{min-height:18px}.lb-grid-inner,.lb-container-inner{box-sizing:border-box}.lb-grid-inner>.lb-insert-zone,.lb-container-inner[style*="display:grid"]>.lb-insert-zone{display:none}.lb21-hover-tab{position:absolute;width:max-content;height:25px;min-width:88px;max-height:25px;padding:0 6px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;background:#dca6ef;border-radius:7px 7px 0 0;z-index:2147483000;pointer-events:auto}</style></head><body class="' +
      app.esc(app.pageTemplateBodyClass()) +
      '"><div class="lb-page-stage">' +
      app.pageChromeHTML("header") +
      '<div class="lb-frame-root lb-scope" style="' +
      widthStyle +
      '">' +
      body +
      "</div>" +
      app.pageChromeHTML("footer") +
      "</div></body></html>"
    );
  };
  app.lbPaintCanvas = function lbPaintCanvas(opts) {
    const frame = document.getElementById("lb-editor-frame");
    const fd = frame && frame.contentDocument;
    if (
      document.body.classList.contains("lb123-resizing") ||
      (fd && fd.body && fd.body.classList.contains("lb123-resizing"))
    )
      return true;
    const canvas = fd && fd.querySelector(".lb-frame-root");
    const work = app.root.querySelector(".lb-work");
    if (!canvas || !work) return false;
    canvas.innerHTML = app.canvasMarkup();
    app.paintChrome(fd);
    if (typeof app.paintInheritedChrome === "function") app.paintInheritedChrome(fd);
    app.applyPageTemplatePreview();
    app.bindFrame();
    app.syncFrameSelection();
    if (!(opts && opts.skipPanel)) app.refreshRightPanel();
    const els = app.root.querySelector(".lb-units");
    if (els) els.innerHTML = app.unitPanel();
    const search = app.root.querySelector("#lb-unit-search");
    if (search && document.activeElement !== search) search.value = app.unitSearch;
    app.root
      .querySelectorAll(".lb-categories button")
      .forEach((b) => b.classList.toggle("active", b.dataset.cat === app.category));
    const both = app.leftHidden && app.rightHidden;
    work.classList.toggle("lb-panels-hidden", both);
    work.querySelector(".lb-panel.left")?.classList.toggle("is-collapsed", app.leftHidden);
    work.querySelector(".lb-panel.right")?.classList.toggle("is-collapsed", app.rightHidden);
    if (typeof app.syncPanelColumns === "function") app.syncPanelColumns(work);
    const lt = work.querySelector('[data-panel-toggle="left"]'),
      rt = work.querySelector('[data-panel-toggle="right"]');
    if (lt) lt.textContent = app.leftHidden ? "\u203A" : "\u2039";
    if (rt) rt.textContent = app.rightHidden ? "\u2039" : "\u203A";
    const status = document.getElementById("lb-status");
    if (status) status.textContent = app.dirty ? app.t("Unsaved") : app.t("Saved");
    if (app.applyCanvasWidth) app.applyCanvasWidth();
    if (app.syncDeviceButtons) app.syncDeviceButtons();
    if (app.refreshRevisionBanner) app.refreshRevisionBanner();
    if (app.historyOpen && app.refreshHistoryPanel) app.refreshHistoryPanel();
    if (typeof app.hydrateShortcodes === "function") app.hydrateShortcodes();
    return true;
  };
  app.render = function render() {
    app.closeContextMenu();
    if (app.lbPaintCanvas()) return;
    const both = app.leftHidden && app.rightHidden;
    app.root.innerHTML = `<header class="lb-top"><button type="button" class="lb-brand-button" id="lb-main-menu-button" aria-haspopup="true" aria-expanded="false" title="${app.t("Sidcraft Page Builder menu")}"><span class="lb-brand-mark" aria-hidden="true">S</span><span class="lb-brand-text">Sidcraft Page Builder</span><small>Core ${app.esc((app.D && app.D.version) || "")}</small></button><div class="lb-history"><button class="lb-btn" id="lb-undo" title="${app.t("Undo")}">\u21B6</button><button class="lb-btn" id="lb-redo" title="${app.t("Redo")}">\u21B7</button></div>${app.deviceSwitcherHTML()}<span id="lb-status" class="lb-status">${app.dirty ? "Unsaved changes" : "Saved"}</span><button class="lb-btn" id="lb-navigation">${app.t("Site")}</button><button class="lb-btn" id="lb-page-settings">${app.t("Page")}</button><button class="lb-btn" id="lb-revisions">${app.t("History")}</button><button class="lb-btn" id="lb-icon-library">${app.t("Icons")}</button><button class="lb-btn" id="lb-class-manager">${app.t("Classes")}</button><button class="lb-btn" id="lb-component-library">${app.t("Components")}</button><button class="lb-btn" id="lb-variable-manager">${app.t("Variables")}</button><button class="lb-btn" id="lb-template-save">${app.t("Save Template")}</button><button class="lb-btn" id="lb-template-load">${app.t("Templates")}</button><button class="lb-btn" id="lb-component-save">${app.t("Save Component")}</button><button class="lb-btn" id="lb-preview">${app.t("Preview")}</button><button class="lb-btn primary" id="lb-save">${typeof app.saveButtonLabel === "function" ? app.saveButtonLabel() : app.t("Save")}</button></header><div class="lb-work ${both ? "lb-panels-hidden" : ""}" style="--lb-left-width:${app.leftHidden ? 0 : app.leftWidth}px;--lb-right-width:${app.rightHidden ? 0 : app.rightWidth}px"><aside class="lb-panel left ${app.leftHidden ? "is-collapsed" : ""}"><div class="lb-panel-title"><span>${app.t("Units")}</span><button class="lb-panel-toggle" data-panel-toggle="left">${app.leftHidden ? "\u203A" : "\u2039"}</button></div><div class="lb-unit-tools"><input id="lb-unit-search" type="search" value="${app.esc(app.unitSearch)}" placeholder="${app.t("Search units\u2026")}" aria-label="${app.t("Search units")}"><button class="lb-search-clear" id="lb-search-clear">\u00D7</button></div><div class="lb-categories">${app
      .unitCategories()
      .map(
        (c) =>
          `<button data-cat="${c}" class="${app.category === c ? "active" : ""}">${app.unitCategoryLabel(c)}</button>`,
      )
      .join(
        "",
      )}</div><div class="lb-units">${app.unitPanel()}</div><div class="lb-panel-resizer lb-resize-left" data-resize="left"></div></aside><main class="lb-canvas-wrap"><div class="lb-canvas-device ${app.device}"><iframe id="lb-editor-frame" class="lb-editor-frame" title="${app.t("Sidcraft Page Builder isolated canvas")}" sandbox="allow-same-origin allow-scripts"></iframe></div></main><aside class="lb-panel right ${app.rightHidden ? "is-collapsed" : ""}"><div class="lb-panel-title"><span>${app.t("Navigator / Settings")}</span><button class="lb-panel-toggle" data-panel-toggle="right">${app.rightHidden ? "\u2039" : "\u203A"}</button></div><div class="lb-tabs"><button data-tab="navigator" class="${app.activeTab === "navigator" ? "active" : ""}">${app.t("Navigator")}</button><button data-tab="settings" class="${app.activeTab === "settings" ? "active" : ""}">${app.t("Settings")}</button></div><section class="lb-tab-content ${app.activeTab === "navigator" ? "visible" : ""} lb-navigator">${app.structureHTML()}</section><section class="lb-tab-content ${app.activeTab === "settings" ? "visible" : ""} lb-settings">${app.settingsHTML()}</section><div class="lb-panel-resizer lb-resize-right" data-resize="right"></div></aside></div>`;
    app.bind();
    const frame = document.getElementById("lb-editor-frame");
    if (frame) {
      frame.style.background = "#dfe3e8";
      const load = () => {
        app.bindFrame();
        app.syncFrameSelection();
        if (app.lbRunTextPaths) app.lbRunTextPaths(frame.contentDocument);
      };
      frame.addEventListener("load", load, { once: true });
      try {
        frame.srcdoc = app.frameHTML();
      } catch (err) {
        if (window.console) console.error("[Sidcraft Page Builder] canvas render failed", err);
        frame.srcdoc =
          '<!doctype html><html><body style="margin:24px;font:14px/1.4 system-ui,sans-serif;color:#1d2327">The canvas could not be drawn. Reload the editor. If this page was just converted, open it again after saving.</body></html>';
      }
      setTimeout(() => {
        if (frame.contentDocument && frame.contentDocument.readyState === "complete") {
          app.bindFrame();
          app.syncFrameSelection();
          if (app.lbRunTextPaths) app.lbRunTextPaths(frame.contentDocument);
        }
      }, 0);
    }
  };
  app.syncFrameSelection = function syncFrameSelection() {
    const fd = app.frameDoc();
    if (!fd) return;
    fd.querySelectorAll(".lb-node.is-selected").forEach((x) => x.classList.remove("is-selected"));
    if (app.selected) {
      const n = fd.querySelector('.lb-node[data-id="' + CSS.escape(String(app.selected)) + '"]');
      if (n) n.classList.add("is-selected");
    }
  };
  app.refreshRightPanel = function refreshRightPanel() {
    const nav = app.root.querySelector(".lb-navigator"),
      set = app.root.querySelector(".lb-settings");
    if (!nav || !set) return;
    nav.innerHTML = app.structureHTML();
    set.innerHTML = app.settingsHTML();
    app.root
      .querySelectorAll(".lb-tabs [data-tab]")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === app.activeTab));
    app.root
      .querySelectorAll(".lb-tab-content")
      .forEach((x) => x.classList.toggle("visible", x.classList.contains("lb-" + app.activeTab)));
    app.bindRightPanel();
  };
  app.selectNode = function selectNode(id) {
    const r = app.locate(app.state.root, id);
    if (!r) return;
    const same = app.selected === id && app.activeTab === "settings";
    const where = app.regionOf ? app.regionOf(id) : "root";
    app.chromeFocus = where === "header" || where === "footer" ? where : null;
    app.selected = id;
    app.activeTab = "settings";
    app.syncFrameSelection();
    if (typeof app.syncChromeFocus === "function") app.syncChromeFocus();
    if (!same) app.refreshRightPanel();
  };
  app.bindRightPanel = function bindRightPanel() {
    app.root.querySelectorAll(".lb-tabs [data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          app.activeTab = b.dataset.tab;
          app.refreshRightPanel();
        }),
    );
    app.root.querySelectorAll("[data-tree-id]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.selectNode(b.dataset.treeId);
        }),
    );
    app.root.querySelectorAll("[data-lb-region]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.focusChrome(b.dataset.lbRegion);
        }),
    );
    app.root.querySelectorAll("[data-tree-id]").forEach((b) =>
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = app.locate(app.state.root, b.dataset.treeId);
        if (r) app.showContextMenu("unit", { id: r.node.id, type: r.node.type, x: e.clientX, y: e.clientY });
      }),
    );
    app.root.querySelectorAll("[data-style-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          app.styleTab = b.dataset.styleTab;
          app.refreshRightPanel();
        }),
    );
    app.bindSettingInputs();
    app.root.querySelectorAll(".lb-media-open").forEach((b) => (b.onclick = app.openMedia));
    app.root.querySelectorAll(".lb-gallery-open").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          app.openGallery();
        }),
    );
    app.bindRepeater();
    app.root.querySelector(".lb31-gal-add")?.addEventListener("click", () => {
      const r = app.selected && app.locate(app.state.root, app.selected);
      if (!r || r.node.type !== "gallery") return;
      app.commit();
      const s = r.node.settings;
      s.mode = "multiple";
      s.collections = Array.isArray(s.collections) ? s.collections.slice() : [];
      s.collections.push({ label: app.t("Gallery %s", s.collections.length + 1), ids: "" });
      app.render();
    });
    app.root.querySelectorAll(".lb31-gal-del").forEach(
      (b) =>
        (b.onclick = () => {
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r) return;
          const i = Number(b.closest("[data-gal-index]")?.dataset.galIndex);
          if (!Number.isFinite(i)) return;
          app.commit();
          r.node.settings.collections = Array.isArray(r.node.settings.collections)
            ? r.node.settings.collections.slice()
            : [];
          r.node.settings.collections.splice(i, 1);
          app.render();
        }),
    );
    app.root.querySelectorAll(".lb31-gal-pick").forEach(
      (b) =>
        (b.onclick = () => {
          const r = app.selected && app.locate(app.state.root, app.selected);
          if (!r) return;
          const i = Number(b.closest("[data-gal-index]")?.dataset.galIndex);
          if (!Number.isFinite(i)) return;
          app.openCollectionPicker(r.node.settings, i, (items, ids) => {
            app.commit();
            app.rememberGalleryUrls(r.node.settings, items);
            const list = Array.isArray(r.node.settings.collections) ? r.node.settings.collections.slice() : [];
            list[i] = Object.assign({}, list[i], { ids: ids.join(",") });
            r.node.settings.collections = list;
            app.persistGalleryIds(r.node.settings);
            app.render();
          });
        }),
    );
    app.root.querySelectorAll("[data-icon-picker]").forEach((b) => (b.onclick = app.openIconLibrary));
    app.root.querySelector("#lb-duplicate")?.addEventListener("click", app.duplicate);
    app.root.querySelector("#lb-delete")?.addEventListener("click", () => app.remove());
    app.bindSliders();
    if (app.bindCounterLive) app.bindCounterLive();
  };
  /** Drag payload ("unit:type" or "node:id") of a drag event, or "". */
  app.dragPayload = function dragPayload(e) {
    let v = typeof window.__lbDragPayload === "string" ? window.__lbDragPayload : "";
    if (!/^unit:|^node:/.test(v)) {
      try {
        v = (e && e.dataTransfer && e.dataTransfer.getData("text/plain")) || "";
      } catch (err) {
        v = "";
      }
    }
    return /^unit:|^node:/.test(v) ? v : "";
  };
  /** Add a unit, or move a node, to the end of the page body. */
  app.dropOnPage = function dropOnPage(v) {
    if (!v) return false;
    if (v.startsWith("unit:")) {
      const prev = app.chromeInsert;
      app.chromeInsert = "root";
      try {
        app.add(v.slice(5));
      } finally {
        app.chromeInsert = prev;
      }
      return true;
    }
    if (v.startsWith("node:")) {
      const r = app.locate(app.state.root, v.slice(5));
      if (!r) return false;
      app.commit();
      r.nodes.splice(r.index, 1);
      if (r.node.slot) delete r.node.slot;
      app.state.root.push(r.node);
      app.selected = r.node.id;
      app.chromeFocus = null;
      app.render();
      return true;
    }
    return false;
  };
  /*
   * The "Drag widget here" area at the bottom of the page. Whether a drop over it
   * reached the page used to depend on which element was under the pointer: a
   * neighbouring grid's cell finder, a theme header/footer layer or an overlapping
   * element could take the event first, so the drop was lost and a container had
   * to be added first. The area is now matched by position, in the capture phase
   * on the frame window (before any element or document listener), so a drop
   * anywhere inside its dashed box always lands at the end of the page.
   */
  app.bindPageDropZone = function bindPageDropZone(fd, locked) {
    const fw = fd && fd.defaultView;
    if (!fw) return;
    fw.__lbPageDropLocked = !!locked;
    if (fw.__lbPageDropRoute) return;
    fw.__lbPageDropRoute = true;
    const zoneAt = (e) => {
      if (fw.__lbPageDropLocked) return null;
      const z = fd.querySelector(".lb-frame-root > .lb-page-drop");
      if (!z) return null;
      const r = z.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? z : null;
    };
    const clear = () => fd.querySelectorAll(".lb-page-drop.is-drag-over").forEach((z) => z.classList.remove("is-drag-over"));
    fw.addEventListener(
      "dragover",
      (e) => {
        const z = zoneAt(e);
        const v = z ? app.dragPayload(e) : "";
        if (!z || !v) {
          clear();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = v.startsWith("node:") ? "move" : "copy";
        z.classList.add("is-drag-over");
      },
      true,
    );
    fw.addEventListener(
      "dragenter",
      (e) => {
        if (zoneAt(e) && app.dragPayload(e)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    fw.addEventListener(
      "drop",
      (e) => {
        const z = zoneAt(e);
        const v = z ? app.dragPayload(e) : "";
        clear();
        if (!z || !v) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        fd.querySelectorAll(".canvas-drop,.drop-target").forEach((x) => x.classList.remove("canvas-drop", "drop-target"));
        app.dropOnPage(v);
      },
      true,
    );
    fw.addEventListener("dragend", clear, true);
    fw.addEventListener(
      "dragleave",
      (e) => {
        if (!e.relatedTarget) clear();
      },
      true,
    );
  };
  app.bindFrame = function bindFrame() {
    const fd = app.frameDoc();
    if (!fd) return;
    app.ensureFrameStage(fd);
    app.ensureThemeChrome();
    app.bindInheritedChrome(fd);
    const rootCanvas = fd.querySelector(".lb-frame-root");
    if (!rootCanvas) return;
    if (!fd.__lbNavigationGuard) {
      fd.__lbNavigationGuard = true;
      fd.addEventListener(
        "click",
        (e) => {
          const node = e.target.closest?.(".lb-node");
          if (!node) return;
          if (e.target.closest(".lb-node-toolbar")) return;
          const interactive = e.target.closest?.("a,button,[role=button],input,select,textarea");
          if (interactive) e.preventDefault();
        },
        true,
      );
      fd.addEventListener(
        "auxclick",
        (e) => {
          if (e.target.closest?.(".lb-node")) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );
      fd.addEventListener(
        "keydown",
        (e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target.closest?.(".lb-node")) {
            const interactive = e.target.closest("a,button,[role=button]");
            if (interactive) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
        true,
      );
    }
    app.bindCanvasTree(rootCanvas);
    fd.querySelectorAll("[data-lb-drop-action]").forEach((b) => {
      if (b.__lbDropAct) return;
      b.__lbDropAct = true;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const act = b.dataset.lbDropAction;
        const onPage = () => {
          const prev = app.chromeInsert;
          app.chromeInsert = "root";
          try {
            if (act === "container") app.add("container");
            else if (act === "grid") app.add("grid");
          } finally {
            app.chromeInsert = prev;
          }
        };
        if (act === "container" || act === "grid") onPage();
        else if (act === "templates" && typeof app.openTemplateLibrary === "function") app.openTemplateLibrary();
        else if (act === "widgets") {
          app.chromeFocus = null;
          app.leftHidden = false;
          app.render();
          setTimeout(() => document.getElementById("lb-unit-search")?.focus(), 30);
        }
      });
    });
    if (!rootCanvas.__lbChromeClear) {
      rootCanvas.__lbChromeClear = true;
      rootCanvas.addEventListener("click", (e) => {
        if (e.target.closest(".lb-node")) return;
        if (app.chromeFocus) {
          app.chromeFocus = null;
          app.syncChromeFocus();
          if (app.activeTab === "navigator" && typeof app.refreshRightPanel === "function") app.refreshRightPanel();
        }
      });
    }
    const lockPage = typeof app.designsHeaderAndFooter === "function" && app.designsHeaderAndFooter();
    rootCanvas.ondragover = lockPage
      ? null
      : (e) => {
          e.preventDefault();
          e.stopPropagation();
          rootCanvas.classList.add("canvas-drop");
        };
    rootCanvas.ondragleave = lockPage ? null : () => rootCanvas.classList.remove("canvas-drop");
    rootCanvas.ondrop = lockPage
      ? null
      : (e) => {
          e.preventDefault();
          e.stopPropagation();
          rootCanvas.classList.remove("canvas-drop");
          app.dropOnPage(app.dragPayload(e));
        };
    app.bindPageDropZone(fd, lockPage);
    fd.querySelectorAll("[data-lb-chrome]").forEach((bar) => {
      if (bar.__lbChromeBound) {
        app.bindCanvasTree(bar);
        return;
      }
      bar.__lbChromeBound = true;
      const part = () => bar.dataset.lbChrome;
      bar.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        bar.classList.add("canvas-drop");
      });
      bar.addEventListener("dragleave", (e) => {
        if (!bar.contains(e.relatedTarget)) bar.classList.remove("canvas-drop");
      });
      bar.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        bar.classList.remove("canvas-drop");
        const region = part();
        if (region !== "header" && region !== "footer") return;
        const v = e.dataTransfer.getData("text/plain") || window.__lbDragPayload || "";
        if (v.startsWith("unit:")) {
          const prev = app.chromeInsert;
          app.chromeInsert = region;
          try {
            app.add(v.slice(5));
          } finally {
            app.chromeInsert = prev;
          }
        } else if (v.startsWith("node:")) {
          const r = app.locate(app.state.root, v.slice(5));
          if (!r) return;
          app.commit();
          r.nodes.splice(r.index, 1);
          if (r.node.slot) delete r.node.slot;
          app.chromeList(region).push(r.node);
          app.selected = r.node.id;
          app.chromeFocus = region;
          app.render();
        }
      });
      bar.addEventListener("click", (e) => {
        if (e.target.closest(".lb-node")) return;
        e.preventDefault();
        app.focusChrome(part());
      });
      app.bindCanvasTree(bar);
    });
    if (!fd.__lbContextBound) {
      fd.__lbContextBound = true;
      fd.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const node = e.target.closest(".lb-node");
        if (node) {
          app.selectNode(node.dataset.id);
          const r = app.locate(app.state.root, node.dataset.id);
          app.showContextMenu("unit", {
            id: node.dataset.id,
            type: node.dataset.type,
            x: e.clientX,
            y: e.clientY,
            inFrame: true,
          });
          return;
        }
        app.showContextMenu("canvas", { x: e.clientX, y: e.clientY, inFrame: true });
      });
    }
  };
  app.bind = function bind() {
    app.$("#lb-main-menu-button")?.addEventListener("click", (e) => {
      e.stopPropagation();
      app.openMainMenu();
      const b = app.$("#lb-main-menu-button");
      if (b) b.setAttribute("aria-expanded", "true");
    });
    app.$$(".lb-panel-resizer").forEach((x) => {
      x.onmousedown = (e) => app.startResize(x.dataset.resize, e);
      x.ondblclick = (e) => {
        e.preventDefault();
        const side = x.dataset.resize;
        const def = side === "left" ? 235 : 285;
        if (side === "left") app.leftWidth = def;
        else app.rightWidth = def;
        app.root
          .querySelector(".lb-work")
          ?.style.setProperty(side === "left" ? "--lb-left-width" : "--lb-right-width", def + "px");
      };
    });
    app.$$("[data-panel-toggle]").forEach((b) => (b.onclick = () => app.togglePanel(b.dataset.panelToggle)));
    const search = app.$("#lb-unit-search");
    if (search)
      search.oninput = () => {
        app.unitSearch = search.value;
        app.render();
        const n = app.$("#lb-unit-search");
        if (n) {
          n.focus();
          n.setSelectionRange(n.value.length, n.value.length);
        }
      };
    app.$("#lb-search-clear")?.addEventListener("click", () => {
      app.unitSearch = "";
      app.render();
    });
    app.$$(".lb-categories button").forEach(
      (b) =>
        (b.onclick = () => {
          app.category = b.dataset.cat;
          app.render();
        }),
    );
    // Unit cards are not <button>s (Firefox will not drag a button), so Enter and
    // Space on a focused card add the unit, the same as a double-click.
    if (app.root && !app.root.__lbUnitCardKeys) {
      app.root.__lbUnitCardKeys = true;
      app.root.addEventListener("keydown", (e) => {
        const card = e.target && e.target.closest && e.target.closest(".lb-unit-card[data-type]");
        if (!card || e.target !== card || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        card.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
      });
    }
    app.$$(".lb-unit-card").forEach((b) => {
      b.onclick = (e) => {
        if (e.target.closest("[data-fav]")) return;
      };
      b.ondblclick = (e) => {
        if (e.target.closest("[data-fav]")) return;
        if (app.proUnitLocked(b.dataset.type)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const r = app.selected && app.locate(app.state.root, app.selected);
        app.add(b.dataset.type, r && app.acceptsInside(r.node) ? app.selected : null);
      };
      b.ondragstart = (e) => {
        if (app.proUnitLocked(b.dataset.type)) {
          e.preventDefault();
          return;
        }
        app.suppressUnitClick = true;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", "unit:" + b.dataset.type);
        window.__lbDragPayload = "unit:" + b.dataset.type;
      };
      b.ondragend = () => {
        window.__lbDragPayload = null;
        window.setTimeout(() => {
          app.suppressUnitClick = false;
        }, 250);
      };
    });
    app.$$(".lb-unit-card").forEach((b) =>
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.showContextMenu("unit-card", { type: b.dataset.type, x: e.clientX, y: e.clientY });
      }),
    );
    app.$$("[data-fav]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          app.toggleFavorite(b.dataset.fav);
        }),
    );
    app.bindSettingInputs();
    app.$$(".lb-media-open").forEach((b) => (b.onclick = app.openMedia));
    app.$$(".lb-gallery-open").forEach((b) => (b.onclick = app.openGallery));
    app.$$("[data-icon-picker]").forEach((b) => (b.onclick = app.openIconLibrary));
    app.$$("[data-style-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          app.styleTab = b.dataset.styleTab;
          app.refreshRightPanel();
        }),
    );
    app.$$("[data-tree-id]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.selectNode(b.dataset.treeId);
        }),
    );
    app.$$("[data-lb-region]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.focusChrome(b.dataset.lbRegion);
        }),
    );
    app.$("#lb-save").onclick = () => app.save(false);
    app.$("#lb-template-save").onclick = app.saveTemplate;
    app.$("#lb-template-load").onclick = app.openTemplateLibrary;
    app.$("#lb-component-save").onclick = app.saveComponent;
    app.$("#lb-component-library").onclick = app.openComponentLibrary;
    app.$("#lb-class-manager").onclick = app.openClassManager;
    app.$("#lb-variable-manager").onclick = app.openVariables;
    app.$("#lb-icon-library").onclick = app.openIconLibrary;
    app.$("#lb-navigation").onclick = app.openNavigation;
    app.$("#lb-page-settings").onclick = app.openPageMenu;
    app.$("#lb-revisions").onclick = app.openRevisions;
    app.$("#lb-preview").onclick = app.openPagePreview;
    app.$("#lb-undo").onclick = app.undo;
    app.$("#lb-redo").onclick = app.redo;
    app.$("#lb-duplicate")?.addEventListener("click", app.duplicate);
    app.$("#lb-delete")?.addEventListener("click", () => app.remove());
    app.$$("[data-device]").forEach(
      (b) =>
        (b.onclick = () => {
          app.device = b.dataset.device;
          app.render();
        }),
    );
    app.$$("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          app.activeTab = b.dataset.tab;
          app.refreshRightPanel();
        }),
    );
    app.bindSliders();
    app.bindRepeater();
  };
  app.inlineEdit = function inlineEdit(el) {
    const node = app.locate(app.state.root, el.closest(".lb-node")?.dataset.id)?.node;
    if (!node) return;
    const before = el.innerHTML;
    el.contentEditable = "true";
    el.focus();
    const finish = () => {
      el.contentEditable = "false";
      if (el.innerHTML !== before) {
        app.commit();
        node.settings.text = el.innerHTML;
      }
      app.render();
    };
    el.addEventListener("blur", finish, { once: true });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        el.innerHTML = before;
        el.blur();
      }
      if (e.key === "Enter" && !e.shiftKey && node.type !== "text") {
        e.preventDefault();
        el.blur();
      }
    });
  };
}

export { installPanel };
