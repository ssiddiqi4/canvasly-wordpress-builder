import { app } from "./app.js";
var INLINE_EDITABLE_TYPES = ["heading", "text", "button", "icon_list"];
var ALLOWED_TAGS = {
  a: ["href", "title", "target", "rel"],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  strike: [],
  sub: [],
  sup: [],
  br: [],
  p: ["style"],
  div: ["style"],
  span: ["style"],
  font: [],
};
var STYLE_ALLOW = /^(font-weight|font-style|text-decoration|text-align)\s*:/i;
var ALIGN_CMD = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
  justify: "justifyFull",
};
var session = null;
function isInlineEditableType(type) {
  const t3 = String(type || "");
  let list = INLINE_EDITABLE_TYPES;
  if (app.LB && app.LB.hooks && typeof app.LB.hooks.applyFilters === "function") {
    const filtered = app.LB.hooks.applyFilters("editor/inline-editable-types", list.slice());
    if (Array.isArray(filtered)) list = filtered;
  }
  return list.includes(t3);
}
function inlineSettingPath(type, itemIndex) {
  const t3 = String(type || "");
  if (t3 === "icon_list") {
    const i = Number(itemIndex);
    if (!Number.isFinite(i) || i < 0) return "";
    return "items." + i + ".text";
  }
  if (isInlineEditableType(t3)) return "text";
  return "";
}
function inlineAlignKey(type) {
  const t3 = String(type || "");
  if (t3 === "icon_list") return "icon_align";
  if (isInlineEditableType(t3)) return "align";
  return "";
}
function normalizeAlign(value) {
  const s = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (s === "center" || s === "justifycenter" || s === "middle") return "center";
  if (s === "right" || s === "justifyright" || s === "end") return "right";
  if (s === "justify" || s === "justifyfull" || s === "justifyall") return "justify";
  return "left";
}
function sanitizeHref(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(javascript|data|vbscript):/i.test(raw)) return "";
  if (/^www\./i.test(raw)) return "https://" + raw;
  return raw;
}
function filterInlineStyle(style) {
  return String(style || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && STYLE_ALLOW.test(part))
    .join("; ");
}
function decodeAttr(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
function encodeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
function sanitizeInlineHtml(html) {
  let s = String(html == null ? "" : html);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(
    /<\/?(script|style|iframe|object|embed|link|meta|form|input|button|textarea|svg|math|video|audio)[^>]*>/gi,
    "",
  );
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (full, rawTag, rawAttrs) => {
    const closing = /^<\//.test(full);
    const selfClose = /\/\s*>$/.test(full);
    const tag = String(rawTag).toLowerCase();
    const allowed = ALLOWED_TAGS[tag];
    if (!allowed) return "";
    if (closing) return "</" + tag + ">";
    if (!rawAttrs || allowed.length === 0) return "<" + tag + (selfClose || tag === "br" ? " />" : ">");
    const kept = [];
    String(rawAttrs).replace(
      /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g,
      (_, name, _q, d, sq, bare) => {
        const attr = String(name).toLowerCase();
        if (!allowed.includes(attr)) return "";
        let value = decodeAttr(d != null ? d : sq != null ? sq : bare);
        if (attr === "href") {
          value = sanitizeHref(value);
          if (!value) return "";
        }
        if (attr === "style") {
          value = filterInlineStyle(value);
          if (!value) return "";
        }
        if (attr === "target" && value !== "_blank" && value !== "_self") value = "_self";
        kept.push(attr + '="' + encodeAttr(value) + '"');
        return "";
      },
    );
    if (tag === "a" && kept.some((x) => x.startsWith("href=")) && !kept.some((x) => x.startsWith("rel="))) {
      kept.push('rel="noopener noreferrer"');
    }
    return "<" + tag + (kept.length ? " " + kept.join(" ") : "") + (selfClose || tag === "br" ? " />" : ">");
  });
  return s;
}
function markIconListInline(html) {
  let i = 0;
  return String(html || "").replace(/<span\b[^>]*>/gi, (tag) => {
    if (!/\bclass\s*=\s*(['"])[^'"]*\blb-icon-list-text\b[^'"]*\1/i.test(tag)) return tag;
    let next = tag;
    if (!/\bdata-inline\s*=/i.test(next)) next = next.replace(/>$/, ' data-inline="text">');
    if (!/\bdata-inline-index\s*=/i.test(next)) next = next.replace(/>$/, ' data-inline-index="' + i++ + '">');
    else i++;
    return next;
  });
}
function t(key) {
  return typeof app.t === "function" ? app.t(key) : key;
}
function icon(paths) {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">${paths}</svg>`;
}
function toolbarButtons() {
  return [
    { cmd: "bold", title: "Bold", html: "<b>B</b>" },
    { cmd: "italic", title: "Italic", html: "<i>I</i>" },
    { cmd: "underline", title: "Underline", html: "<u>U</u>" },
    {
      cmd: "link",
      title: "Link",
      html: icon(
        '<path fill="currentColor" d="M6.3 9.7a3 3 0 0 1 0-4.2l1.4-1.4a3 3 0 0 1 4.2 4.2l-.8.8-.8-.8.8-.8a1.8 1.8 0 1 0-2.5-2.5L7.2 6.3a1.8 1.8 0 0 0 0 2.5l.4.4-.8.8zm3.4-3.4a3 3 0 0 1 0 4.2l-1.4 1.4a3 3 0 1 1-4.2-4.2l.8-.8.8.8-.8.8a1.8 1.8 0 1 0 2.5 2.5l1.4-1.4a1.8 1.8 0 0 0 0-2.5l-.4-.4z"/>',
      ),
    },
    { sep: true },
    {
      cmd: "align-left",
      title: "Align left",
      html: icon('<path fill="currentColor" d="M2 3h12v1.4H2zm0 4h8v1.4H2zm0 4h12v1.4H2z"/>'),
      align: "left",
    },
    {
      cmd: "align-center",
      title: "Align center",
      html: icon('<path fill="currentColor" d="M2 3h12v1.4H2zm2 4h8v1.4H4zm-2 4h12v1.4H2z"/>'),
      align: "center",
    },
    {
      cmd: "align-right",
      title: "Align right",
      html: icon('<path fill="currentColor" d="M2 3h12v1.4H2zm4 4h8v1.4H6zm-4 4h12v1.4H2z"/>'),
      align: "right",
    },
    { sep: true },
    { cmd: "clear", title: "Clear formatting", html: '<span class="lb-inline-clear">T<sub>x</sub></span>' },
  ];
}
function toolbarHTML() {
  const buttons = toolbarButtons()
    .map((b) => {
      if (b.sep) return '<span class="lb-inline-sep" aria-hidden="true"></span>';
      return `<button type="button" class="lb-inline-btn" data-cmd="${b.cmd}"${b.align ? ` data-align="${b.align}"` : ""} title="${app.esc ? app.esc(t(b.title)) : t(b.title)}" aria-label="${app.esc ? app.esc(t(b.title)) : t(b.title)}" aria-pressed="false">${b.html}</button>`;
    })
    .join("");
  return `<div class="lb-inline-toolbar" id="lb-inline-toolbar" role="toolbar" aria-label="${app.esc ? app.esc(t("Text formatting")) : t("Text formatting")}" hidden>
		<div class="lb-inline-toolbar-row">${buttons}</div>
		<div class="lb-inline-link-pop" hidden>
			<input type="text" class="lb-inline-link-input" id="lb-inline-link-input" placeholder="${app.esc ? app.esc(t("Link URL")) : t("Link URL")}" autocomplete="off" spellcheck="false">
			<button type="button" class="lb-inline-btn lb-inline-link-apply" data-cmd="apply-link">${t("Apply")}</button>
			<button type="button" class="lb-inline-btn lb-inline-link-remove" data-cmd="unlink">${t("Remove link")}</button>
		</div>
	</div>`;
}
function hostDoc() {
  return (app.root && app.root.ownerDocument) || document;
}
function ensureToolbar() {
  const doc = hostDoc();
  let bar = doc.getElementById("lb-inline-toolbar");
  if (bar) return bar;
  const wrap = doc.createElement("div");
  wrap.innerHTML = toolbarHTML();
  bar = wrap.firstElementChild;
  (doc.body || app.root || doc.documentElement).appendChild(bar);
  bar.addEventListener("mousedown", (e) => {
    if (e.target.closest("input")) return;
    e.preventDefault();
  });
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cmd]");
    if (!btn || !bar.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    runToolbarCommand(btn.dataset.cmd, btn.dataset.align);
  });
  bar.querySelector("#lb-inline-link-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runToolbarCommand("apply-link");
    }
    if (e.key === "Escape") {
      e.preventDefault();
      hideLinkPopover();
      session?.el?.focus();
    }
  });
  return bar;
}
function hideToolbar() {
  const bar = hostDoc().getElementById("lb-inline-toolbar");
  if (!bar) return;
  bar.hidden = true;
  hideLinkPopover();
}
function hideLinkPopover() {
  const bar = hostDoc().getElementById("lb-inline-toolbar");
  if (!bar) return;
  const pop = bar.querySelector(".lb-inline-link-pop");
  if (pop) pop.hidden = true;
}
function showLinkPopover() {
  const bar = ensureToolbar();
  const pop = bar.querySelector(".lb-inline-link-pop");
  const input = bar.querySelector("#lb-inline-link-input");
  if (!pop || !input) return;
  pop.hidden = false;
  input.value = currentLinkHref();
  setTimeout(() => input.focus(), 0);
}
function currentLinkHref() {
  if (!session) return "";
  if (session.node.type === "button" || session.node.type === "icon_list") return String(session.url || "");
  if (session.node.type === "heading" && session.node.settings?.link) return String(session.node.settings.link);
  const node = linkAround(session.el);
  return node ? node.getAttribute("href") || "" : "";
}
function linkAround(el) {
  const doc = el.ownerDocument;
  const sel2 = doc.getSelection();
  let node = sel2 && sel2.anchorNode;
  if (node && node.nodeType === 3) node = node.parentElement;
  while (node && node !== el) {
    if (node.tagName === "A") return node;
    node = node.parentElement;
  }
  return el.closest?.("a") || el.querySelector?.("a") || null;
}
function frameEl() {
  return document.getElementById("lb-editor-frame");
}
function positionToolbar() {
  if (!session) return;
  const bar = ensureToolbar();
  const frame = frameEl();
  const el = session.el;
  if (!frame || !el || !bar) return;
  bar.hidden = false;
  const fr = frame.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const width = bar.offsetWidth || 280;
  const height = bar.offsetHeight || 40;
  let left = fr.left + er.left + er.width / 2;
  let top = fr.top + er.top - height - 10;
  if (top < 8) top = fr.top + er.bottom + 8;
  left = Math.max(width / 2 + 8, Math.min(window.innerWidth - width / 2 - 8, left));
  top = Math.max(8, Math.min(window.innerHeight - height - 8, top));
  bar.style.left = left + "px";
  bar.style.top = top + "px";
}
function saveSelection() {
  if (!session) return;
  const sel2 = session.el.ownerDocument.getSelection();
  session.range = sel2 && sel2.rangeCount ? sel2.getRangeAt(0).cloneRange() : null;
}
function restoreSelection() {
  if (!session || !session.range) return;
  const doc = session.el.ownerDocument;
  const sel2 = doc.getSelection();
  sel2.removeAllRanges();
  try {
    sel2.addRange(session.range);
  } catch (e) {}
}
function exec(cmd, value) {
  if (!session) return;
  restoreSelection();
  session.el.focus();
  const doc = session.el.ownerDocument;
  try {
    doc.execCommand(cmd, false, value == null ? null : value);
  } catch (e) {}
  saveSelection();
  refreshToolbarState();
}
function applyAlign(align) {
  if (!session) return;
  const next = normalizeAlign(align);
  session.align = next;
  const el = session.el;
  const nodeEl = el.closest(".lb-node");
  el.style.textAlign = next;
  if (session.node.type === "button") {
    const wrap = nodeEl?.querySelector(".lb-button-wrap") || nodeEl;
    if (wrap) {
      wrap.classList.remove(
        "lb-button-align-left",
        "lb-button-align-center",
        "lb-button-align-right",
        "lb-button-align-justify",
      );
      wrap.classList.add("lb-button-align-" + next);
    }
  } else if (session.node.type === "icon_list") {
    const list = nodeEl?.querySelector(".lb-icon-list") || nodeEl;
    if (list) {
      list.classList.remove("lb-icon-list-align-left", "lb-icon-list-align-center", "lb-icon-list-align-right");
      list.classList.add("lb-icon-list-align-" + (next === "justify" ? "left" : next));
    }
  } else if (nodeEl) {
    nodeEl.style.textAlign = next;
  }
  if (ALIGN_CMD[next]) exec(ALIGN_CMD[next]);
  refreshToolbarState();
}
function readUnitUrl(node, el) {
  if (!node) return "";
  if (node.type === "button") return String(node.settings?.url || "");
  if (node.type === "icon_list") {
    const i = Number(el?.getAttribute("data-inline-index"));
    const items = Array.isArray(node.settings?.items) ? node.settings.items : [];
    return String((Number.isFinite(i) && items[i] && items[i].url) || "");
  }
  return "";
}
function previewUnitUrl(href) {
  if (!session) return;
  session.url = href;
  if (session.node.type === "button") {
    const host = session.nodeEl?.querySelector("[data-link-url], a.lb-button, a.lb-editor-button");
    if (host) {
      host.setAttribute("data-link-url", href);
      if (host.tagName === "A") host.setAttribute("href", href || "#");
    }
  }
}
function applyLink() {
  if (!session) return;
  const input = hostDoc().querySelector("#lb-inline-link-input");
  const href = sanitizeHref(input?.value || "");
  if (session.node.type === "button" || session.node.type === "icon_list") {
    previewUnitUrl(href);
    hideLinkPopover();
    refreshToolbarState();
    return;
  }
  if (!href) {
    exec("unlink");
    hideLinkPopover();
    return;
  }
  restoreSelection();
  const doc = session.el.ownerDocument;
  const sel2 = doc.getSelection();
  if (!sel2 || sel2.isCollapsed) {
    const existing = linkAround(session.el);
    if (existing && session.el.contains(existing)) {
      existing.setAttribute("href", href);
      existing.setAttribute("rel", "noopener noreferrer");
    } else {
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("rel", "noopener noreferrer");
      a.textContent = href;
      if (sel2 && sel2.rangeCount) sel2.getRangeAt(0).insertNode(a);
      else session.el.appendChild(a);
    }
  } else {
    exec("createLink", href);
    session.el.querySelectorAll("a[href]").forEach((a) => {
      if (!a.getAttribute("rel")) a.setAttribute("rel", "noopener noreferrer");
    });
  }
  hideLinkPopover();
  refreshToolbarState();
}
function clearFormatting() {
  if (!session) return;
  exec("removeFormat");
  exec("unlink");
  const text = session.el.innerText != null ? session.el.innerText : session.el.textContent;
  if (session.node.type === "text") {
    session.el.innerHTML = sanitizeInlineHtml(session.el.innerHTML.replace(/<(?!\/?(p|br)\b)[^>]+>/gi, ""));
  } else {
    session.el.innerHTML = (text || "").replace(/</g, "&lt;");
  }
  saveSelection();
  refreshToolbarState();
}
function runToolbarCommand(cmd, align) {
  if (!session) return;
  if (cmd === "bold" || cmd === "italic" || cmd === "underline") exec(cmd);
  else if (cmd === "link") {
    saveSelection();
    showLinkPopover();
  } else if (cmd === "apply-link") applyLink();
  else if (cmd === "unlink") {
    if (session.node.type === "button" || session.node.type === "icon_list") previewUnitUrl("");
    else exec("unlink");
    hideLinkPopover();
    refreshToolbarState();
  } else if (cmd === "clear") clearFormatting();
  else if (cmd.indexOf("align-") === 0) applyAlign(align || cmd.slice(6));
}
function refreshToolbarState() {
  const bar = hostDoc().getElementById("lb-inline-toolbar");
  if (!bar || !session) return;
  const doc = session.el.ownerDocument;
  ["bold", "italic", "underline"].forEach((cmd) => {
    const btn = bar.querySelector('[data-cmd="' + cmd + '"]');
    if (!btn) return;
    let on = false;
    try {
      on = !!doc.queryCommandState(cmd);
    } catch (e) {
      on = false;
    }
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  bar.querySelectorAll("[data-align]").forEach((btn) => {
    const on = normalizeAlign(btn.dataset.align) === session.align;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const linkBtn = bar.querySelector('[data-cmd="link"]');
  if (linkBtn) {
    const on =
      session.node.type === "button" || session.node.type === "icon_list" ? !!session.url : !!linkAround(session.el);
    linkBtn.classList.toggle("is-active", on);
    linkBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
function bindSessionChrome() {
  if (!session) return;
  const { el, nodeEl } = session;
  const onScroll = () => positionToolbar();
  const onSel = () => {
    if (!session) return;
    saveSelection();
    refreshToolbarState();
  };
  session.unbind = () => {
    el.removeEventListener("blur", session.onBlur, true);
    el.removeEventListener("keydown", session.onKey);
    el.removeEventListener("keyup", onSel);
    el.removeEventListener("mouseup", onSel);
    el.ownerDocument.removeEventListener("selectionchange", onSel);
    el.ownerDocument.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onScroll);
    frameEl()?.contentWindow?.removeEventListener("scroll", onScroll);
  };
  session.onBlur = (e) => {
    const related = e.relatedTarget;
    const bar = hostDoc().getElementById("lb-inline-toolbar");
    if (bar && related && bar.contains(related)) return;
    setTimeout(() => {
      if (!session) return;
      const active = hostDoc().activeElement;
      if (bar && (bar.contains(active) || bar.contains(session.el.ownerDocument.activeElement))) return;
      if (session.el.contains(session.el.ownerDocument.activeElement)) return;
      finishInlineSession();
    }, 0);
  };
  session.onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finishInlineSession({ cancel: true });
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && session.node.type !== "text") {
      e.preventDefault();
      finishInlineSession();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = String(e.key || "").toLowerCase();
      if (k === "b") {
        e.preventDefault();
        exec("bold");
      }
      if (k === "i") {
        e.preventDefault();
        exec("italic");
      }
      if (k === "u") {
        e.preventDefault();
        exec("underline");
      }
      if (k === "k") {
        e.preventDefault();
        saveSelection();
        showLinkPopover();
      }
    }
  };
  el.addEventListener("blur", session.onBlur, true);
  el.addEventListener("keydown", session.onKey);
  el.addEventListener("keyup", onSel);
  el.addEventListener("mouseup", onSel);
  el.ownerDocument.addEventListener("selectionchange", onSel);
  el.ownerDocument.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
  frameEl()?.contentWindow?.addEventListener("scroll", onScroll);
  void nodeEl;
}
function flushInlineSession() {
  finishInlineSession({ skipRender: true });
}
function closeInlineSession() {
  finishInlineSession({ skipRender: true, cancel: false });
}
function finishInlineSession(opts) {
  if (!session) return;
  const current = session;
  const { el, node, beforeHtml, beforeAlign, path, alignKey, nodeEl } = current;
  const cancel = !!(opts && opts.cancel);
  const skipRender = !!(opts && opts.skipRender);
  if (current.unbind) current.unbind();
  session = null;
  app.inlineEditing = false;
  hideToolbar();
  el.contentEditable = "false";
  el.classList.remove("is-inline-editing");
  nodeEl?.classList.remove("is-inline-editing");
  if (current.wasDraggable != null && nodeEl) nodeEl.draggable = current.wasDraggable;
  if (cancel) {
    el.innerHTML = beforeHtml;
    if (app.LB?.hooks) app.LB.hooks.doAction("editor/inline-edit/end", node, el, { cancel: true });
    if (!skipRender && typeof app.render === "function") app.render();
    return;
  }
  const html = sanitizeInlineHtml(el.innerHTML);
  const align = normalizeAlign(current.align);
  const urlChanged =
    (current.node.type === "button" || current.node.type === "icon_list") &&
    String(current.url || "") !== String(current.beforeUrl || "");
  const changed = html !== beforeHtml || align !== beforeAlign || urlChanged;
  if (changed && node && node.settings) {
    if (typeof app.commit === "function") {
      app.commit(t("Edited %s", (app.meta && app.meta(node.type).title) || node.type), node.id);
    }
    if (path) app.setPath(node.settings, path, html);
    if (alignKey) node.settings[alignKey] = align;
    if (urlChanged) {
      if (current.node.type === "button") node.settings.url = current.url || "";
      if (current.node.type === "icon_list") {
        const i = Number(el.getAttribute("data-inline-index"));
        if (Number.isFinite(i) && Array.isArray(node.settings.items) && node.settings.items[i]) {
          node.settings.items[i].url = current.url || "";
        }
      }
    }
    app.dirty = true;
    if (typeof app.scheduleSave === "function") app.scheduleSave();
  }
  if (app.LB?.hooks) app.LB.hooks.doAction("editor/inline-edit/end", node, el, { cancel: false, changed });
  if (!skipRender && typeof app.render === "function") app.render();
}
function startInlineSession(el, node) {
  if (!el || !node) return;
  if (session) finishInlineSession({ skipRender: true });
  const nodeEl = el.closest(".lb-node");
  const itemIndex = el.getAttribute("data-inline-index");
  const path = inlineSettingPath(node.type, itemIndex);
  if (!path) return;
  const alignKey = inlineAlignKey(node.type);
  const beforeHtml = el.innerHTML;
  const beforeAlign = normalizeAlign(node.settings?.[alignKey]);
  const beforeUrl = readUnitUrl(node, el);
  if (typeof app.selectNode === "function") app.selectNode(node.id);
  else app.selected = node.id;
  el.contentEditable = "true";
  el.spellcheck = true;
  el.classList.add("is-inline-editing");
  nodeEl?.classList.add("is-inline-editing");
  const wasDraggable = nodeEl ? nodeEl.draggable : null;
  if (nodeEl) nodeEl.draggable = false;
  session = {
    el,
    node,
    nodeEl,
    path,
    alignKey,
    beforeHtml,
    beforeAlign,
    beforeUrl,
    url: beforeUrl,
    align: beforeAlign,
    wasDraggable,
    range: null,
  };
  app.inlineEditing = true;
  ensureToolbar();
  el.focus();
  try {
    const doc = el.ownerDocument;
    const range = doc.createRange();
    range.selectNodeContents(el);
    const sel2 = doc.getSelection();
    sel2.removeAllRanges();
    sel2.addRange(range);
    session.range = range.cloneRange();
  } catch (e) {}
  bindSessionChrome();
  positionToolbar();
  refreshToolbarState();
  if (app.LB?.hooks) app.LB.hooks.doAction("editor/inline-edit/start", node, el);
}
function installInlineToolbar() {
  const prev = app.inlineEdit;
  app.inlineEdit = function inlineEditWithToolbar(el) {
    const host = el && el.closest ? el.closest(".lb-node") : null;
    const id = host && host.dataset ? host.dataset.id : "";
    const found = id && app.locate ? app.locate(app.state.root, id) : null;
    const node = found && found.node;
    if (node && isInlineEditableType(node.type)) {
      startInlineSession(el.closest("[data-inline]") || el, node);
      return;
    }
    if (typeof prev === "function") return prev.call(this, el);
  };
  app.flushInlineSession = flushInlineSession;
  app.closeInlineSession = closeInlineSession;
  const prevBody = app.bodyHTML;
  if (typeof prevBody === "function") {
    app.bodyHTML = function bodyHTMLWithInline(n) {
      const html = prevBody.call(this, n);
      if (n && n.type === "icon_list") return markIconListInline(html);
      return html;
    };
  }
  if (app.LB) {
    app.LB.flushInlineSession = flushInlineSession;
    app.LB.sanitizeInlineHtml = sanitizeInlineHtml;
  }
}

export {
  INLINE_EDITABLE_TYPES,
  ALLOWED_TAGS,
  STYLE_ALLOW,
  ALIGN_CMD,
  session,
  isInlineEditableType,
  inlineSettingPath,
  inlineAlignKey,
  normalizeAlign,
  sanitizeHref,
  filterInlineStyle,
  decodeAttr,
  encodeAttr,
  sanitizeInlineHtml,
  markIconListInline,
  t,
  icon,
  toolbarButtons,
  toolbarHTML,
  hostDoc,
  ensureToolbar,
  hideToolbar,
  hideLinkPopover,
  showLinkPopover,
  currentLinkHref,
  linkAround,
  frameEl,
  positionToolbar,
  saveSelection,
  restoreSelection,
  exec,
  applyAlign,
  readUnitUrl,
  previewUnitUrl,
  applyLink,
  clearFormatting,
  runToolbarCommand,
  refreshToolbarState,
  bindSessionChrome,
  flushInlineSession,
  closeInlineSession,
  finishInlineSession,
  startInlineSession,
  installInlineToolbar,
};
