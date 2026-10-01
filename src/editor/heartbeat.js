import { app } from "./app.js";
function lockFromPayload(data) {
  const lb = data && data["sidcraft-syntex-lock"];
  const wp2 = data && data["wp-refresh-post-lock"];
  const out = lb && typeof lb === "object" ? { ...lb } : {};
  if (wp2 && wp2.new_lock) out.lock = wp2.new_lock;
  if (wp2 && wp2.lock_error) {
    out.locked = true;
    const err = wp2.lock_error;
    out.name = err.name || err.text || out.name || "";
    out.user = err.user_id || err.user || out.user || 0;
  }
  return out;
}
function installHeartbeat() {
  app.postLocked = !!(app.D.lock && app.D.lock.locked);
  app.lockToken = String(app.D.postLock || (app.D.lock && app.D.lock.lock) || "");
  app.lockTakeover = false;
  app.lockUserName = String((app.D.lock && app.D.lock.name) || "");
  app.applyLockState = function applyLockState(lock) {
    if (!lock || typeof lock !== "object") return;
    if (lock.lock) app.lockToken = String(lock.lock);
    const locked = !!lock.locked;
    app.postLocked = locked;
    if (lock.name) app.lockUserName = String(lock.name);
    app.renderLockBanner();
    const btn = app.$("#lb-lock");
    if (btn) btn.classList.toggle("is-locked", locked);
  };
  app.lockMessage = function lockMessage() {
    const name = app.lockUserName || app.t("another user");
    return app.t("%s is currently editing this document.", name);
  };
  app.renderLockBanner = function renderLockBanner() {
    const shell = document.getElementById("lb-editor-shell") || app.root;
    if (!shell) return;
    let bar = document.getElementById("lb-lock-banner");
    if (!app.postLocked) {
      if (bar) bar.remove();
      shell.classList.remove("lb-is-locked");
      return;
    }
    shell.classList.add("lb-is-locked");
    const html =
      "<span>" +
      app.esc(app.lockMessage()) +
      '</span><button type="button" class="lb-btn" id="lb-lock-takeover">' +
      app.t("Take over") +
      "</button>";
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "lb-lock-banner";
      bar.className = "lb-lock-banner";
      bar.setAttribute("role", "status");
      const top = shell.querySelector(".lb-top");
      if (top && top.parentNode) top.insertAdjacentElement("afterend", bar);
      else shell.insertBefore(bar, shell.firstChild);
    }
    bar.innerHTML = html;
    bar.querySelector("#lb-lock-takeover")?.addEventListener("click", () => app.takeOverLock());
  };
  app.takeOverLock = async function takeOverLock() {
    if (!confirm(app.t("Take over editing? The other user may lose unsaved changes."))) return;
    app.lockTakeover = true;
    try {
      const x = await app.refreshLock(true);
      if (x && !x.locked) {
        app.lockTakeover = false;
        app.postLocked = false;
        app.renderLockBanner();
      }
    } catch (e) {
      app.lockTakeover = false;
    }
  };
  app.refreshLock = async function refreshLock(takeover) {
    const id = parseInt(app.D.postId || 0, 10);
    if (!id) return null;
    const r = await fetch(`${app.D.api}/lock/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": app.D.nonce },
      body: JSON.stringify({ takeover: !!takeover }),
    });
    const x = await r.json();
    app.applyLockState(x);
    return x;
  };
  app.checkLock = async function checkLock() {
    try {
      const x = await app.refreshLock(false);
      if (!x) return;
      if (x.locked) alert(app.lockMessage());
      else alert(app.t("Document lock is active for this session."));
    } catch (e) {}
  };
  app.showLockModal = function showLockModal() {
    if (!app.postLocked) return;
    const name = app.lockUserName || app.t("another user");
    app.showModal(
      app.t("Document is locked"),
      "<p>" +
        app.esc(app.t("%s is currently editing this document.", name)) +
        '</p><p class="lb-muted">' +
        app.esc(app.t("Saving is paused until you take over or they leave.")) +
        '</p><p><button type="button" class="lb-btn primary" id="lb-lock-takeover-modal">' +
        app.t("Take over") +
        "</button></p>",
    );
    document.getElementById("lb-lock-takeover-modal")?.addEventListener("click", () => {
      app.closeModal();
      app.takeOverLock();
    });
  };
  const prevSave = app.save;
  if (typeof prevSave === "function") {
    app.save = async function saveWhileLocked(auto) {
      if (app.postLocked && !app.lockTakeover) {
        if (!auto) {
          app.renderLockBanner();
          alert(app.lockMessage());
        }
        return;
      }
      return prevSave.apply(this, arguments);
    };
  }
  const $ = window.jQuery;
  const hasHb = !!(window.wp && wp.heartbeat && $ && typeof $.fn === "object");
  if (hasHb && app.D.postId) {
    $(document).on("heartbeat-send.sidcraft-syntex", function (_e, data) {
      if (!data || !app.D.postId) return;
      data["sidcraft-syntex-lock"] = { post_id: app.D.postId, takeover: !!app.lockTakeover };
      data["wp-refresh-post-lock"] = { post_id: app.D.postId, lock: app.lockToken };
    });
    $(document).on("heartbeat-tick.sidcraft-syntex", function (_e, data) {
      const lock = lockFromPayload(data || {});
      if (lock && (lock.locked || lock.lock || Object.keys(lock).length)) app.applyLockState(lock);
      if (lock && !lock.locked) app.lockTakeover = false;
    });
    if (typeof wp.heartbeat.interval === "function") wp.heartbeat.interval(15);
  } else if (app.D.postId) {
    if (app.lockTimer) clearInterval(app.lockTimer);
    app.lockTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      app.refreshLock(false).catch(() => {});
    }, 6e4);
  }
  app.renderLockBanner();
  if (app.postLocked) setTimeout(app.showLockModal, 400);
}

export { lockFromPayload, installHeartbeat };
