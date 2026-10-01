import { app } from "./app.js";
  function installCollectionLoop() {
    const prevMake = app.makeNode;
    app.makeNode = function makeNodeWithLoop(type) {
      const n = prevMake(type);
      if (!n || type !== "collection_loop") return n;
      if (n.children && n.children.length) return n;
      n.children = [];
      const heading = prevMake("heading");
      if (heading) {
        heading.settings = Object.assign({}, heading.settings || {}, { text: "Post Title", tag: "h3" });
        heading.settings._dynamic = { text: { tag: "post_title" } };
        n.children.push(heading);
      }
      const text = prevMake("text");
      if (text) {
        text.settings = Object.assign({}, text.settings || {}, { text: "Post excerpt" });
        text.settings._dynamic = { text: { tag: "post_excerpt" } };
        n.children.push(text);
      }
      return n;
    };
    function templateLabel(id) {
      id = String(id || "0");
      const meta = app.meta("collection_loop");
      const opts = meta && meta.controls && meta.controls.template_id && meta.controls.template_id.options;
      if (opts && typeof opts === "object" && !Array.isArray(opts) && opts[id]) return String(opts[id]);
      if (id === "0" || id === "") return app.t("None selected");
      return "#" + id;
    }
    function columnsOf(s) {
      let v = s && s.columns;
      if (v && typeof v === "object") v = v[app.device] ?? v.desktop ?? 3;
      const n = parseInt(v, 10);
      return Math.max(1, Math.min(8, n || 3));
    }
    function intSetting(s, key, fallback, max) {
      let v = s && s[key];
      if (v && typeof v === "object" && !Array.isArray(v)) v = v[app.device] ?? v.desktop ?? v.size ?? fallback;
      if (v && typeof v === "object") v = v.size ?? fallback;
      const n = parseInt(v, 10);
      const out = Number.isFinite(n) && n > 0 ? n : fallback;
      return Math.max(1, Math.min(max, out));
    }
    function staticCard(s) {
      if (!s.static_enable) return "";
      const span = intSetting(s, "static_column_span", 1, 8);
      return `<div class="lb-loop-item lb-loop-static" style="--lb-loop-span:${span}"><div class="lb-loop-template-note">${app.esc(app.t("Static item: %s", templateLabel(s.static_template_id)))}</div></div>`;
    }
    function loopHTML(n) {
      const s = n.settings || {};
      const layout = ["list", "carousel"].includes(s.layout) ? s.layout : "grid";
      const source = s.item_source === "template" ? "template" : "inline";
      const equal = s.equal_height ? " lb-loop-equal" : "";
      const cols = columnsOf(s);
      const show = intSetting(s, "carousel_show", 3, 8);
      let inner;
      if (source === "template") {
        inner = '<div class="lb-loop-template-note">' + app.esc(app.t("Using saved template: %s", templateLabel(s.template_id))) + "</div>";
      } else {
        inner = (n.children || []).map(app.nodeHTML).join("") + '<div class="lb-insert-zone lb-loop-dropzone" draggable="false" data-lb-loop-drop="' + app.esc(n.id) + '">' + app.esc(app.t("Drop item template here")) + "</div>";
      }
      const card = source === "inline" ? `<div class="lb-loop-item lb-loop-item-edit lb-loop-drop" draggable="false" data-lb-loop-drop="${app.esc(n.id)}">${inner}</div>` : `<div class="lb-loop-item">${inner}</div>`;
      const position = Math.max(1, parseInt(s.static_position, 10) || 2);
      const stat = staticCard(s);
      const cells = position <= 1 && stat ? stat + card : card + stat;
      if (layout === "carousel") {
        const nav = ["arrows", "dots", "both", "none"].includes(s.carousel_nav) ? s.carousel_nav : "arrows";
        const ghosts = Array.from({ length: Math.max(0, show - 1) }, () => `<div class="lb-loop-item lb-loop-ghost" aria-hidden="true"><span>${app.esc(app.t("Repeated on the live page"))}</span></div>`).join("");
        const arrows = nav === "arrows" || nav === "both" ? `<button type="button" class="lb-loop-arrow lb-loop-prev" tabindex="-1" data-lb-loop-move="${app.esc(n.id)}" data-lb-loop-dir="-1" aria-label="${app.esc(app.t("Previous slide"))}">&lsaquo;</button><button type="button" class="lb-loop-arrow lb-loop-next" tabindex="-1" data-lb-loop-move="${app.esc(n.id)}" data-lb-loop-dir="1" aria-label="${app.esc(app.t("Next slide"))}">&rsaquo;</button>` : "";
        return `<div class="lb-loop lb-loop-carousel${equal}" data-lb-loop-carousel="1" data-show="${show}" data-scroll="1" data-index="0" style="--lb-loop-show:${show}">
				<div class="lb-loop-viewport"><div class="lb-loop-track">${cells}${ghosts}</div></div>${arrows}
				<div class="lb-loop-meta">${app.esc(app.t("Loop carousel \u2014 arrows slide items here. They do not open the saved page."))}</div>
			</div>`;
      }
      return `<div class="lb-loop lb-loop-${layout}${equal}" style="--lb-loop-cols:${cols};--lb-loop-show:${show}">
			<div class="lb-loop-items">${cells}</div>
			<div class="lb-loop-meta">${app.esc(app.t("Collection Loop \u2014 items repeat on the frontend"))}</div>
		</div>`;
    }
    function applyLoopCarousel(root) {
      const track = root.querySelector(":scope > .lb-loop-viewport > .lb-loop-track");
      const slides = track ? Array.from(track.children).filter((el) => el.classList.contains("lb-loop-item")) : [];
      const show = Math.max(1, parseInt(root.dataset.show, 10) || 1);
      const maxStart = Math.max(0, slides.length - show);
      let index = parseInt(root.dataset.index, 10) || 0;
      if (index > maxStart) index = 0;
      if (index < 0) index = maxStart;
      const gap = track ? parseFloat(getComputedStyle(track).columnGap) || 0 : 0;
      const slideW = slides[0] ? slides[0].getBoundingClientRect().width : 0;
      if (track) track.style.transform = "translate3d(" + -index * (slideW + gap) + "px,0,0)";
      root.dataset.index = String(index);
    }
    const prevBody = app.bodyHTML;
    app.bodyHTML = function bodyHTML(n) {
      if (n && n.type === "collection_loop") return loopHTML(n);
      return prevBody(n);
    };
    const prevFrame = app.frameHTML;
    app.frameHTML = function frameHTML() {
      let html = prevFrame();
      const extra = ".lb-loop-item-edit{min-height:48px}.lb-loop-meta{margin-top:10px;font-size:12px;color:#6b7280}.lb-loop-template-note{padding:18px;border:1px dashed #cbd2da;border-radius:6px;color:#6b7280;text-align:center}.lb-loop-dropzone{position:relative;z-index:5;min-height:72px;margin-top:8px;border:1px dashed #c5ccd4;border-radius:6px;background:#fff;color:#8b939c;pointer-events:auto}.lb-loop-drop.is-over,.lb-loop-dropzone.is-over{border-color:#2f73d9!important;background:#eef3fa;color:#2463b4}.lb-loop-static{grid-column:span var(--lb-loop-span,1)}.lb-loop-carousel{position:relative}.lb-loop-carousel .lb-loop-viewport{overflow:hidden}.lb-loop-carousel .lb-loop-track{display:flex;gap:16px;transition:transform .35s ease}.lb-loop-carousel .lb-loop-item{flex:0 0 calc((100% - (var(--lb-loop-show,1) - 1) * 16px) / var(--lb-loop-show,1));min-width:0;box-sizing:border-box}.lb-loop-ghost{display:flex;align-items:center;justify-content:center;min-height:72px;border:1px dashed #cbd2da;color:#8b939c;font-size:12px}.lb-loop-arrow{position:absolute;top:42%;z-index:4;width:2rem;height:2rem;border:0;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer}.lb-loop-prev{inset-inline-start:.4rem}.lb-loop-next{inset-inline-end:.4rem}";
      if (html.includes("</style></head>")) html = html.replace("</style></head>", extra + "</style></head>");
      return html;
    };
    function readDragPayload(e) {
      const cached = typeof window.__lbDragPayload === "string" ? window.__lbDragPayload : "";
      if (/^unit:|^node:/.test(cached)) return cached;
      try {
        const v = e && e.dataTransfer && e.dataTransfer.getData("text/plain") || "";
        if (/^unit:|^node:/.test(v)) return v;
      } catch (err) {
      }
      return "";
    }
    function dragMightLand(e) {
      if (readDragPayload(e)) return true;
      const types = e && e.dataTransfer && e.dataTransfer.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i++) if (types[i] === "text/plain") return true;
      return false;
    }
    function loopZone(e) {
      const direct = e && e.target && e.target.nodeType === 1 ? e.target : e && e.target && e.target.parentElement;
      const doc = direct && direct.ownerDocument;
      let el = direct;
      if (doc && doc.elementFromPoint && e && Number.isFinite(e.clientX)) {
        const under = doc.elementFromPoint(e.clientX, e.clientY);
        if (under) el = under;
      }
      if (!el || !el.closest) return null;
      if (el.closest("[data-lb-slot-drop]")) return null;
      const zone = el.closest("[data-lb-loop-drop]");
      if (zone && zone.dataset.lbLoopDrop) return zone;
      const host = el.closest(".lb-node-collection_loop");
      if (host && host.dataset.id) return { dataset: { lbLoopDrop: host.dataset.id }, classList: host.classList };
      return null;
    }
    function placeInLoop(payload, parentId) {
      if (!parentId) return false;
      if (payload.startsWith("unit:")) {
        app.add(payload.slice(5), parentId);
        return true;
      }
      if (payload.startsWith("node:")) {
        const id = payload.slice(5);
        if (id === parentId) return false;
        app.moveExisting(id, parentId, "inside");
        return true;
      }
      return false;
    }
    function bindLoopDrops(fd) {
      if (fd.__lbLoopDrop) return;
      fd.__lbLoopDrop = true;
      const clear = () => fd.querySelectorAll(".lb-loop-drop.is-over,.lb-loop-dropzone.is-over").forEach((el) => el.classList.remove("is-over"));
      fd.addEventListener("dragover", (e) => {
        if (!dragMightLand(e)) return;
        const zone = loopZone(e);
        if (!zone) return;
        e.preventDefault();
        e.stopPropagation();
        clear();
        zone.classList.add("is-over");
        const payload = readDragPayload(e);
        if (e.dataTransfer) e.dataTransfer.dropEffect = payload.startsWith("node:") ? "move" : "copy";
      }, true);
      fd.addEventListener("drop", (e) => {
        const zone = loopZone(e);
        if (!zone) return;
        const payload = readDragPayload(e);
        if (!/^unit:|^node:/.test(payload)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        clear();
        placeInLoop(payload, zone.dataset.lbLoopDrop);
      }, true);
      fd.addEventListener("dragleave", (e) => {
        const zone = e.target && e.target.closest && e.target.closest("[data-lb-loop-drop]");
        if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("is-over");
      }, true);
      fd.addEventListener("dragend", clear, true);
    }
    const prevBind = app.bindFrame;
    app.bindFrame = function bindFrame() {
      prevBind();
      const fd = app.frameDoc();
      if (!fd) return;
      bindLoopDrops(fd);
      fd.querySelectorAll("[data-lb-loop-carousel]").forEach((root) => applyLoopCarousel(root));
      fd.querySelectorAll("[data-lb-loop-move]").forEach((btn) => {
        if (btn.dataset.lbLoopBound === "1") return;
        btn.dataset.lbLoopBound = "1";
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const root = btn.closest("[data-lb-loop-carousel]");
          if (!root) return;
          const doc = btn.ownerDocument;
          const scroller = doc.scrollingElement || doc.documentElement;
          const top = scroller ? scroller.scrollTop : 0;
          const show = Math.max(1, parseInt(root.dataset.show, 10) || 1);
          const track = root.querySelector(":scope > .lb-loop-viewport > .lb-loop-track");
          const count = track ? track.querySelectorAll(":scope > .lb-loop-item").length : 0;
          const maxStart = Math.max(0, count - show);
          let index = parseInt(root.dataset.index, 10) || 0;
          index += parseInt(btn.dataset.lbLoopDir, 10) || 1;
          if (index > maxStart) index = 0;
          if (index < 0) index = maxStart;
          root.dataset.index = String(index);
          applyLoopCarousel(root);
          if (scroller) scroller.scrollTop = top;
        }, true);
      });
    };
  }


export { installCollectionLoop };
