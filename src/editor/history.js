import { app } from "./app.js";
  function historySnap(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && typeof item.s === "string") return item.s;
    return "";
  }
  function historyLabel(item, fallback) {
    if (item && typeof item === "object" && item.label) return String(item.label);
    return fallback || "Change";
  }
  function historyTarget(item) {
    if (item && typeof item === "object" && item.target) return String(item.target);
    return "";
  }
  function makeHistoryEntry(snap, label, target) {
    return { s: String(snap || ""), label: label || "Change", target: target || "", t: Date.now() };
  }
  function jumpUndoCount(historyLength, index) {
    return Math.max(0, (historyLength | 0) - 1 - (index | 0));
  }
  function jumpRedoCount(futureIndex) {
    return Math.max(0, (futureIndex | 0) + 1);
  }
  var HISTORY_LIMIT = 40;
  function parseHistoryState(item) {
    const raw = historySnap(item);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return d && typeof d === "object" ? d : null;
    } catch (e) {
      return null;
    }
  }
  function installHistory() {
    app.historyTab = app.historyTab || "actions";
    app.historyOpen = !!app.historyOpen;
    app.previewingRevision = app.previewingRevision || null;
    app.revisionPreviewLive = app.revisionPreviewLive || null;
    app.wpRevisions = Array.isArray(app.wpRevisions) ? app.wpRevisions : [];
    app.unitTitle = function unitTitle(idOrType) {
      if (!idOrType) return "";
      const r = app.locate && app.locate(app.state.root, idOrType);
      const type = r && r.node ? r.node.type : idOrType;
      const meta = app.meta ? app.meta(type) : {};
      return String(meta && meta.title || type || "").trim();
    };
    app.normalizeHistoryItem = function normalizeHistoryItem(item, fallback) {
      if (item && typeof item === "object" && typeof item.s === "string") return item;
      return makeHistoryEntry(historySnap(item), historyLabel(item, fallback || app.t("Change")), historyTarget(item));
    };
    app.commit = function commit(label, target) {
      if (app.previewingRevision) return false;
      const snap = app.snap();
      const last = app.history[app.history.length - 1];
      if (last && historySnap(last) === snap) {
        app.dirty = true;
        app.scheduleSave();
        return true;
      }
      app.history.push(makeHistoryEntry(snap, label || app.t("Change"), target || app.selected || ""));
      const cap = app.historyLimit || HISTORY_LIMIT;
      while (app.history.length > cap) app.history.shift();
      app.future = [];
      app.dirty = true;
      app.scheduleSave();
      app.refreshHistoryPanel();
      return true;
    };
    app.applyHistoryEntry = function applyHistoryEntry(item) {
      const next = parseHistoryState(item);
      if (!next) return false;
      app.state = next;
      const target = historyTarget(item);
      app.selected = target && app.locate(app.state.root, target) ? target : null;
      app.dirty = true;
      app.render(false);
      app.refreshHistoryPanel();
      return true;
    };
    app.undo = function undo() {
      if (!app.history.length || app.previewingRevision) return;
      const item = app.history.pop();
      app.future.push(app.normalizeHistoryItem({ s: app.snap(), label: historyLabel(item, app.t("Change")), target: app.selected || historyTarget(item) }));
      app.applyHistoryEntry(item);
    };
    app.redo = function redo() {
      if (!app.future.length || app.previewingRevision) return;
      const item = app.future.pop();
      app.history.push(app.normalizeHistoryItem({ s: app.snap(), label: historyLabel(item, app.t("Change")), target: app.selected || historyTarget(item) }));
      app.applyHistoryEntry(item);
    };
    app.jumpToHistory = function jumpToHistory(kind, index) {
      if (app.previewingRevision) return;
      if (kind === "current") return;
      if (kind === "history") {
        const n = jumpUndoCount(app.history.length, index);
        for (let i = 0; i < n; i++) app.undo();
        return;
      }
      if (kind === "future") {
        const n = jumpRedoCount(index);
        for (let i = 0; i < n; i++) app.redo();
      }
    };
    app.actionHistoryItems = function actionHistoryItems() {
      const items = [];
      for (let i = app.future.length - 1; i >= 0; i--) {
        const e = app.normalizeHistoryItem(app.future[i], app.t("Change"));
        items.push({ kind: "future", index: i, label: e.label, target: e.target, current: false });
      }
      items.push({ kind: "current", index: -1, label: app.t("Current"), target: app.selected || "", current: true });
      for (let i = app.history.length - 1; i >= 0; i--) {
        const e = app.normalizeHistoryItem(app.history[i], app.t("Change"));
        items.push({ kind: "history", index: i, label: e.label, target: e.target, current: false });
      }
      return items;
    };
    app.scheduleSave = function scheduleSave() {
      if (app.previewingRevision) return;
      clearTimeout(app.saveTimer);
      app.saveTimer = setTimeout(() => app.save(true), 1500);
    };
    app.postStatus = function postStatus() {
      return String(app.D && app.D.postStatus || "").toLowerCase();
    };
    app.isPublishablePost = function isPublishablePost() {
      if (!app.D || !app.D.postId) return false;
      const type = String(app.D.postType || "");
      if (type === "lb_template" || type === "revision") return false;
      return true;
    };
    app.publishTarget = function publishTarget() {
      if (!app.isPublishablePost()) return "";
      const current = app.postStatus();
      if (app.statusIntent) return app.statusIntent;
      if (current === "draft" || current === "auto-draft" || current === "pending" || current === "") return app.D.canPublish ? "publish" : current;
      return current;
    };
    app.saveButtonLabel = function saveButtonLabel() {
      const target = app.publishTarget(), current = app.postStatus();
      if (target && target !== current) {
        if (target === "publish" || target === "private") return app.t("Publish");
        if (target === "draft") return app.t("Save Draft");
      }
      return app.t("Save");
    };
    app.refreshSaveButton = function refreshSaveButton() {
      const btn = app.$("#lb-save");
      if (btn && !btn.disabled) btn.textContent = app.saveButtonLabel();
    };
    app.applyPostStatus = async function applyPostStatus(target) {
      const id = parseInt(app.D.postId || app.root.dataset.postId || 0, 10);
      if (!id || !target || !app.isPublishablePost()) return { ok: true, changed: false };
      if (target === app.postStatus()) {
        app.statusIntent = null;
        return { ok: true, changed: false };
      }
      const r = await fetch(`${app.D.api}/document/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
        body: JSON.stringify({ status: target })
      });
      if (!r.ok) return { ok: false, changed: false };
      const d = await r.json().catch(() => null);
      if (!d || !d.success) return { ok: false, changed: false };
      app.D.postStatus = String(d.status || target);
      if (d.permalink) app.D.permalink = d.permalink;
      if (d.previewUrl) app.D.previewUrl = d.previewUrl;
      app.statusIntent = null;
      return { ok: true, changed: !!d.changed, status: app.D.postStatus };
    };
    app.save = async function save(auto) {
      const id = parseInt(app.D.postId || app.root.dataset.postId || 0, 10);
      if (!id || app.previewingRevision) return;
      const status = app.$("#lb-status"), btn = app.$("#lb-save");
      const target = auto ? "" : app.publishTarget();
      const publishing = !!target && target !== app.postStatus() && (target === "publish" || target === "private");
      if (!auto && btn) {
        btn.disabled = true;
        btn.textContent = publishing ? app.t("Publishing\u2026") : app.t("Saving\u2026");
      }
      try {
        const persist = (nodes) => (nodes || []).forEach((n) => {
          if (n.type === "gallery") app.persistGalleryIds(n.settings = n.settings || {});
          persist(n.children);
        });
        persist(app.state.root);
        ["header", "footer"].forEach((part) => {
          if (app.sitePartMeta && app.sitePartMeta[part] || typeof app.designsHeaderAndFooter === "function" && app.designsHeaderAndFooter()) persist(app.state[part]);
        });
        const packed = typeof app.pageDocumentForSave === "function" ? app.pageDocumentForSave() : { page: app.state, parts: [] };
        const headers = { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce };
        for (const part of packed.parts || []) {
          const partUrl = auto ? `${app.D.api}/document/${part.id}/autosave` : `${app.D.api}/document/${part.id}`;
          const saved2 = await fetch(partUrl, { method: "POST", headers, body: JSON.stringify(part.document) });
          if (!saved2.ok) throw Error();
        }
        const url = auto ? `${app.D.api}/document/${id}/autosave` : `${app.D.api}/document/${id}`;
        const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(packed.page) });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw Error(err && err.message ? String(err.message) : "");
        }
        const saved = await r.json().catch(() => null);
        if (!saved || saved.success === false) throw Error();
        if (saved && saved.status && app.D) app.D.postStatus = String(saved.status);
        if (typeof app.persistThemeChrome === "function") await app.persistThemeChrome();
        let statusResult = { ok: true, changed: false };
        if (!auto && target) statusResult = await app.applyPostStatus(target).catch(() => ({ ok: false, changed: false }));
        if (!auto) {
          app.dirty = false;
          app.D.updated = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
          app.loadWpRevisions();
        }
        const when = (/* @__PURE__ */ new Date()).toLocaleTimeString();
        if (status) {
          if (auto) status.textContent = app.t("Autosaved %s", when);
          else if (!statusResult.ok) status.textContent = app.t("Saved, but the page could not be published.");
          else if (statusResult.changed && app.postStatus() === "publish") status.textContent = app.t("Published %s", when);
          else status.textContent = app.t("Saved %s", when);
        }
        if (btn && !auto) {
          btn.textContent = statusResult.changed && app.postStatus() === "publish" ? app.t("Published") : app.t("Saved");
          setTimeout(() => {
            btn.textContent = app.saveButtonLabel();
            btn.disabled = false;
          }, 700);
        }
      } catch (e) {
        const why = e && e.message ? String(e.message) : "";
        if (status) status.textContent = why ? app.t("Save failed") + ": " + why : app.t("Save failed");
        if (btn && !auto) {
          btn.textContent = app.saveButtonLabel();
          btn.disabled = false;
        }
      }
    };
    app.openPagePreview = async function openPagePreview() {
      const url = String(app.D.previewUrl || app.D.permalink || "").trim();
      if (!url) {
        alert(app.t("Save this page first, then preview it."));
        return;
      }
      if (app.dirty) await app.save(true);
      window.open(url, "_blank", "noopener");
    };
    app.openHistory = function openHistory(tab) {
      app.historyOpen = true;
      if (tab === "actions" || tab === "revisions") app.historyTab = tab;
      app.mountHistoryPanel();
      app.refreshHistoryPanel();
      if (app.historyTab === "revisions") app.loadWpRevisions();
    };
    app.openRevisions = function openRevisions() {
      app.toggleHistory();
    };
    app.closeHistory = function closeHistory() {
      app.historyOpen = false;
      document.getElementById("lb-history-panel")?.remove();
      document.getElementById("lb-history-backdrop")?.remove();
    };
    app.toggleHistory = function toggleHistory() {
      if (app.historyOpen) app.closeHistory();
      else app.openHistory(app.historyTab || "actions");
    };
    app.mountHistoryPanel = function mountHistoryPanel() {
      if (document.getElementById("lb-history-panel")) return;
      const back = document.createElement("div");
      back.id = "lb-history-backdrop";
      back.className = "lb-history-backdrop";
      back.addEventListener("click", () => app.closeHistory());
      const el = document.createElement("aside");
      el.id = "lb-history-panel";
      el.className = "lb-history-panel";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", app.t("History"));
      document.body.appendChild(back);
      document.body.appendChild(el);
    };
    app.refreshHistoryPanel = function refreshHistoryPanel() {
      if (!app.historyOpen) return;
      app.mountHistoryPanel();
      const el = document.getElementById("lb-history-panel");
      if (!el) return;
      const tab = app.historyTab === "revisions" ? "revisions" : "actions";
      const actions = app.actionHistoryItems();
      const actionHtml = actions.length ? actions.map((a) => `<button type="button" class="lb-history-item${a.current ? " is-current" : ""}" data-hist-kind="${a.kind}" data-hist-index="${a.index}" title="${app.esc(app.t("Jump to this change"))}"><span>${app.esc(a.label)}</span>${a.target && !a.current ? `<small>${app.esc(a.target)}</small>` : ""}</button>`).join("") : `<p class="lb-muted">${app.t("No actions yet.")}</p>`;
      const revs = app.wpRevisions || [];
      const previewId = app.previewingRevision && app.previewingRevision.id;
      const revHtml = revs.length ? revs.map((r) => {
        const active = String(r.id) === String(previewId);
        const who = r.author ? app.t("Saved by %s", r.author) : r.autosave ? app.t("Autosave") : app.t("WordPress revision");
        const label = r.label || who;
        return `<div class="lb-history-rev${active ? " is-active" : ""}" data-revision-id="${r.id}">
					<button type="button" class="lb-history-item" data-revision-preview="${r.id}"><strong>${app.esc(r.time || "")}</strong><span>${app.esc(label)}</span></button>
					<button type="button" class="lb-btn" data-revision-restore="${r.id}">${app.t("Restore")}</button>
				</div>`;
      }).join("") : `<p class="lb-muted">${app.t("No revisions yet.")}</p>`;
      el.innerHTML = `<div class="lb-history-head"><strong>${app.t("History")}</strong><button type="button" data-history-close aria-label="${app.t("Close history")}">\xD7</button></div>
			<div class="lb-history-tabs">
				<button type="button" data-history-tab="actions" class="${tab === "actions" ? "active" : ""}">${app.t("Actions")}</button>
				<button type="button" data-history-tab="revisions" class="${tab === "revisions" ? "active" : ""}">${app.t("Revisions")}</button>
			</div>
			<div class="lb-history-body">${tab === "actions" ? `<p class="lb-muted">${app.t("Jump to any change in this session.")}</p><div class="lb-history-list">${actionHtml}</div>` : `<p class="lb-muted">${app.t("Select a revision to preview it on the canvas before restoring.")}</p><div class="lb-history-list">${revHtml}</div>`}</div>`;
      el.querySelector("[data-history-close]")?.addEventListener("click", () => app.closeHistory());
      el.querySelectorAll("[data-history-tab]").forEach((b) => {
        b.onclick = () => app.openHistory(b.dataset.historyTab);
      });
      el.querySelectorAll("[data-hist-kind]").forEach((b) => {
        b.onclick = () => {
          const kind = b.dataset.histKind;
          const index = Number(b.dataset.histIndex);
          app.jumpToHistory(kind, index);
        };
      });
      el.querySelectorAll("[data-revision-preview]").forEach((b) => {
        b.onclick = () => app.previewRevision(b.dataset.revisionPreview);
      });
      el.querySelectorAll("[data-revision-restore]").forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          app.restoreRevision(b.dataset.revisionRestore);
        };
      });
      app.refreshRevisionBanner();
    };
    app.loadWpRevisions = async function loadWpRevisions() {
      const id = parseInt(app.D.postId || 0, 10);
      if (!id) return [];
      try {
        const r = await fetch(`${app.D.api}/document/${id}/revisions`, { headers: { "X-WP-Nonce": app.D.nonce } });
        if (!r.ok) throw Error();
        const items = await r.json();
        app.wpRevisions = Array.isArray(items) ? items : [];
        if (app.historyOpen && app.historyTab === "revisions") app.refreshHistoryPanel();
        return app.wpRevisions;
      } catch (e) {
        if (app.historyOpen && app.historyTab === "revisions") alert(app.t("Could not load revisions."));
        return [];
      }
    };
    app.previewRevision = async function previewRevision(revisionId) {
      const id = parseInt(app.D.postId || 0, 10);
      const rev = parseInt(revisionId, 10);
      if (!id || !rev) return;
      try {
        const r = await fetch(`${app.D.api}/document/${id}/revisions/${rev}`, { headers: { "X-WP-Nonce": app.D.nonce } });
        if (!r.ok) throw Error();
        const d = await r.json();
        if (!d || !d.document) throw Error();
        if (!app.revisionPreviewLive) {
          app.revisionPreviewLive = {
            state: JSON.parse(JSON.stringify(app.state)),
            selected: app.selected,
            dirty: app.dirty
          };
        }
        app.previewingRevision = { id: d.id || rev, time: d.time || "", author: d.author || "", label: d.label || "" };
        app.state = d.document;
        app.selected = null;
        app.render(false);
        app.refreshHistoryPanel();
      } catch (e) {
        alert(app.t("Could not load revision."));
      }
    };
    app.cancelRevisionPreview = function cancelRevisionPreview() {
      if (app.revisionPreviewLive) {
        app.state = app.revisionPreviewLive.state;
        app.selected = app.revisionPreviewLive.selected;
        app.dirty = app.revisionPreviewLive.dirty;
      }
      app.previewingRevision = null;
      app.revisionPreviewLive = null;
      app.render(false);
      app.refreshHistoryPanel();
    };
    app.restoreRevision = async function restoreRevision(revisionId) {
      const id = parseInt(app.D.postId || 0, 10);
      const rev = parseInt(revisionId, 10);
      if (!id || !rev) return;
      if (!confirm(app.t("Restore this revision? Current changes will be saved as a new revision first."))) return;
      try {
        const r = await fetch(`${app.D.api}/document/${id}/revisions/${rev}/restore`, { method: "POST", headers: { "X-WP-Nonce": app.D.nonce } });
        if (!r.ok) throw Error();
        const d = await r.json();
        app.previewingRevision = null;
        app.revisionPreviewLive = null;
        app.state = d.document || app.state;
        app.selected = null;
        app.dirty = false;
        app.history = [];
        app.future = [];
        app.closeModal && app.closeModal();
        app.render(false);
        app.loadWpRevisions();
        app.refreshHistoryPanel();
        app.refreshRevisionBanner();
      } catch (e) {
        alert(app.t("Could not restore revision."));
      }
    };
    app.refreshRevisionBanner = function refreshRevisionBanner() {
      const wrap = app.root && app.root.querySelector(".lb-canvas-wrap");
      if (!wrap) return;
      wrap.querySelector(".lb-revision-banner")?.remove();
      if (!app.previewingRevision) return;
      const p = app.previewingRevision;
      const banner = document.createElement("div");
      banner.className = "lb-revision-banner";
      banner.innerHTML = `<span>${app.t("Previewing revision from %s", p.time || "")}</span>
			<button type="button" class="lb-btn primary" data-rev-restore>${app.t("Restore")}</button>
			<button type="button" class="lb-btn" data-rev-cancel>${app.t("Cancel preview")}</button>`;
      banner.querySelector("[data-rev-restore]").onclick = () => app.restoreRevision(p.id);
      banner.querySelector("[data-rev-cancel]").onclick = () => app.cancelRevisionPreview();
      wrap.insertBefore(banner, wrap.firstChild);
    };
    app.showAutosaveBanner = function showAutosaveBanner(auto, key, time) {
      const shell = document.getElementById("lb-editor-shell") || app.root;
      if (!shell || document.getElementById("lb-autosave-banner")) return;
      const bar = document.createElement("div");
      bar.id = "lb-autosave-banner";
      bar.className = "lb-autosave-banner";
      bar.setAttribute("role", "status");
      const when = time ? " (" + app.esc(time.slice(11, 16) || time) + ")" : "";
      bar.innerHTML = "<span>" + app.esc(app.t("A newer autosave of this page is available.")) + when + '</span><button type="button" class="lb-btn" data-lb-autosave="restore">' + app.esc(app.t("Restore")) + '</button><button type="button" class="lb-btn" data-lb-autosave="dismiss" aria-label="' + app.esc(app.t("Dismiss")) + '">\u00D7</button>';
      const close = () => {
        bar.remove();
        try {
          if (key && window.sessionStorage) sessionStorage.setItem(key, time || "1");
        } catch (e) {
        }
      };
      bar.addEventListener("click", (e) => {
        const b = e.target.closest("[data-lb-autosave]");
        if (!b) return;
        if (b.getAttribute("data-lb-autosave") === "restore") {
          app.commit(app.t("Recovered autosave"));
          app.state = auto.document;
          app.selected = null;
          app.dirty = true;
          app.render(false);
        }
        close();
      });
      const top = shell.querySelector(".lb-top");
      if (top && top.parentNode) top.insertAdjacentElement("afterend", bar);
      else shell.insertBefore(bar, shell.firstChild);
      setTimeout(() => { if (bar.isConnected) bar.classList.add("is-quiet"); }, 12e3);
    };
    app.recoverAutosave = async function recoverAutosave() {
      const id = parseInt(app.D.postId || 0, 10);
      if (!id || app.__lbAutosaveChecked) return;
      app.__lbAutosaveChecked = true;
      try {
        const r = await fetch(`${app.D.api}/document/${id}/autosave`, { headers: { "X-WP-Nonce": app.D.nonce } });
        if (!r.ok) return;
        const auto = await r.json();
        if (!auto || !auto.document) return;
        const saved = String(app.D.updated || "");
        const time = String(auto.time || "");
        if (time && saved && time <= saved) return;
        const strip = (doc) => JSON.stringify({ root: doc && doc.root || [], header: doc && doc.header || [], footer: doc && doc.footer || [] });
        if (strip(auto.document) === strip(app.state)) return;
        let key = "";
        try {
          key = "lb-autosave-dismissed-" + id;
          if (window.sessionStorage && sessionStorage.getItem(key) === time) return;
        } catch (e2) {
        }
        app.showAutosaveBanner(auto, key, time);
      } catch (e) {
      }
    };
  }


export { historySnap, historyLabel, historyTarget, makeHistoryEntry, jumpUndoCount, jumpRedoCount, HISTORY_LIMIT, parseHistoryState, installHistory };
