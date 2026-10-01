import { app } from "./app.js";
function installGrid() {
  (function () {
    const lb20OldSettings = app.settingsHTML;
    function lb20ResponsiveValue(v) {
      if (v && typeof v === "object") return v[app.device] ?? v.desktop ?? "";
      return v ?? "";
    }
    function lb20GridMetrics(n) {
      const s = n?.settings || {};
      let cols = Number(s.columns || 3),
        rows = 0;
      const parse = (v) =>
        String(v || "")
          .trim()
          .split(/\s+(?![^()]*\))/)
          .filter(Boolean);
      if (s.grid_template_columns) cols = parse(s.grid_template_columns).length || cols;
      cols = Math.max(1, Math.min(12, cols));
      if (s.grid_template_rows) rows = parse(s.grid_template_rows).length;
      if (!rows && s.rows) rows = parse(s.rows).length;
      if (!rows) {
        const children = n.children || [];
        rows = Math.max(
          4,
          ...children.map(
            (c) => Number(c.settings?.grid_row_start || 0) + Math.max(1, Number(c.settings?.grid_row_span || 1)),
          ),
        );
      }
      return { cols: Math.max(1, Math.min(12, cols)), rows: Math.max(4, Math.min(12, rows)) };
    }
    function lb20Placement(n) {
      const s = n.settings || {},
        r = app.locate(app.state.root, n.id),
        p = r?.parent;
      if (!p || p.type !== "grid") return "";
      const g = lb20GridMetrics(p),
        cs = Math.max(1, Math.min(g.cols, Number(lb20ResponsiveValue(s.grid_column_start) || 1))),
        rs = Math.max(1, Math.min(g.rows, Number(lb20ResponsiveValue(s.grid_row_start) || 1))),
        cspan = Math.max(1, Math.min(g.cols - cs + 1, Number(lb20ResponsiveValue(s.grid_column_span) || 1))),
        rspan = Math.max(1, Math.min(g.rows - rs + 1, Number(lb20ResponsiveValue(s.grid_row_span) || 1)));
      let html = '<div class="lb20-grid-placement">';
      html +=
        '<div class="lb20-grid-summary"><strong>Placement</strong><span>' +
        app.esc(`Column ${cs} \xB7 Row ${rs} \xB7 ${cspan} \xD7 ${rspan}`) +
        "</span></div>";
      html +=
        '<div class="lb20-grid-matrix" data-grid-matrix="placement" style="--lb20-cols:' +
        g.cols +
        ";--lb20-rows:" +
        g.rows +
        '">';
      for (let row = 1; row <= g.rows; row++)
        for (let col = 1; col <= g.cols; col++) {
          const active = col >= cs && col < cs + cspan && row >= rs && row < rs + rspan;
          html += `<button type="button" class="lb20-grid-cell ${active ? "is-active" : ""}" data-grid-cell data-row="${row}" data-col="${col}" aria-label="Column ${col}, Row ${row}">${active ? "\u2022" : ""}</button>`;
        }
      html += "</div>";
      html +=
        '<div class="lb20-grid-placement-fields">' +
        app.lb09Responsive("grid_column_start", app.t("Column Start"), s.grid_column_start ?? 1) +
        app.lb09Responsive("grid_column_span", app.t("Column Span"), s.grid_column_span ?? 1) +
        app.lb09Responsive("grid_row_start", app.t("Row Start"), s.grid_row_start ?? 1) +
        app.lb09Responsive("grid_row_span", app.t("Row Span"), s.grid_row_span ?? 1) +
        "</div>";
      html +=
        '<p class="lb20-grid-help">Drag across cells to place and span this item. Nested Grid units can be placed inside any grid cell.</p></div>';
      return html;
    }
    function lb20GridEditor(n) {
      const s = n.settings || {},
        g = lb20GridMetrics(n);
      let h = '<div class="lb20-grid-editor">';
      h +=
        '<div class="lb20-grid-editor-head"><strong>Visual Grid Editor</strong><span>' +
        app.esc(`${g.cols} columns \xD7 ${g.rows} rows`) +
        "</span></div>";
      h +=
        '<div class="lb20-track-grid">' +
        app.lb09Field(
          "grid_template_columns",
          app.t("Column Tracks"),
          "text",
          s.grid_template_columns || "",
          'placeholder="repeat(3, 1fr)"',
        ) +
        app.lb09Field(
          "grid_template_rows",
          app.t("Row Tracks"),
          "text",
          s.grid_template_rows || "",
          'placeholder="auto auto"',
        ) +
        app.lb09Field("columns", app.t("Column Count"), "number", s.columns || 3, 'min="1" max="12"') +
        app.lb09Field("rows", app.t("Row Tracks (fallback)"), "text", s.rows || "", 'placeholder="auto auto auto"') +
        "</div>";
      h += app.lb09Section(
        app.t("Track Sizing"),
        app.lb09Field("min_column", app.t("Minimum Column Size"), "text", s.min_column || "120px") +
          app.lb09Field("min_row", app.t("Minimum Auto Row Size"), "text", s.min_row || "auto") +
          app.lb09Field("grid_auto_columns", app.t("Implicit Column Size"), "text", s.grid_auto_columns || "auto") +
          app.lb09Field("grid_auto_rows", app.t("Implicit Row Size"), "text", s.grid_auto_rows || "auto"),
        true,
      );
      h += app.lb09Section(
        app.t("Auto Flow & Alignment"),
        app.lb09Select("auto_flow", app.t("Auto Flow"), s.auto_flow || "row", [
          "row",
          "column",
          "dense",
          "row dense",
          "column dense",
        ]) +
          app.lb09Select("align", app.t("Align Items"), s.align || "stretch", ["stretch", "start", "center", "end"]) +
          app.lb09Select("justify", app.t("Justify Items"), s.justify || "stretch", [
            "stretch",
            "start",
            "center",
            "end",
          ]),
        true,
      );
      h += app.lb09Section(
        app.t("Responsive Grid"),
        app.lb09Responsive("grid_template_columns", app.t("Column Tracks"), s.grid_template_columns || "") +
          app.lb09Responsive("grid_template_rows", app.t("Row Tracks"), s.grid_template_rows || "") +
          app.lb09Responsive("grid_auto_columns", app.t("Implicit Columns"), s.grid_auto_columns || "auto") +
          app.lb09Responsive("grid_auto_rows", app.t("Implicit Rows"), s.grid_auto_rows || "auto") +
          app.lb09Responsive("auto_flow", app.t("Auto Flow"), s.auto_flow || "row") +
          app.lb09Responsive("columns", app.t("Column Count"), s.columns || g.cols) +
          app.lb09Responsive("rows", app.t("Row Definition"), s.rows || ""),
        true,
      );
      h += `<label class="lb-control lb-switch"><input data-setting="show_outline" type="checkbox" ${s.show_outline ? "checked" : ""}><span>Show Grid Guides on Canvas</span></label>`;
      h +=
        '<p class="lb20-grid-help">Use explicit tracks for precise layouts. Auto-flow controls how unplaced children fill remaining cells. A Grid can contain another Grid for nested layouts.</p>';
      h += "</div>";
      return h;
    }
    function lb20GridSettings(n) {
      let h = "";
      if (n.type === "grid" && app.styleTab === "content") h += lb20GridEditor(n);
      const r = app.locate(app.state.root, n.id);
      if (r?.parent?.type === "grid" && app.styleTab === "content") h += lb20Placement(n);
      return h;
    }
    app.settingsHTML = function () {
      let h = lb20OldSettings();
      if (app.selected) {
        const r = app.locate(app.state.root, app.selected);
        if (r) h += lb20GridSettings(r.node);
      }
      return h;
    };
    const lb20OldRender = app.render;
    app.render = function () {
      lb20OldRender();
      lb20BindGridUI();
    };
    function lb20ApplyGridGuides() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-editor-active,.lb-grid-item-active").forEach((x) =>
        x.classList.remove("lb-grid-editor-active", "lb-grid-item-active"),
      );
      fd.querySelectorAll(".lb-grid-inner").forEach((x) => x.style.removeProperty("--lb20-cols"));
      if (!app.selected) return;
      const r = app.locate(app.state.root, app.selected);
      if (!r) return;
      let grid = r.node.type === "grid" ? r.node : null;
      if (!grid && r.parent?.type === "grid") grid = r.parent;
      if (!grid) return;
      const gm = lb20GridMetrics(grid),
        gn = fd.querySelector("#lb-node-" + CSS.escape(grid.id));
      if (!gn) return;
      gn.classList.add("lb-grid-editor-active");
      const inner = gn.querySelector(".lb-grid-inner");
      if (inner) {
        inner.style.setProperty("--lb20-cols", String(gm.cols));
        inner.style.setProperty("--lb20-rows", String(gm.rows));
      }
      if (r.node !== grid) fd.querySelector("#lb-node-" + CSS.escape(r.node.id))?.classList.add("lb-grid-item-active");
    }
    function lb20BindMatrix(matrix) {
      if (!matrix || matrix.__lb20Bound) return;
      matrix.__lb20Bound = true;
      let start = null,
        last = null;
      const apply = (a, b) => {
        if (!app.selected || !a || !b) return;
        const r = app.locate(app.state.root, app.selected);
        if (!r) return;
        const parent = r.parent;
        if (!parent || parent.type !== "grid") return;
        const gm = lb20GridMetrics(parent);
        const c1 = Math.min(a.col, b.col),
          c2 = Math.max(a.col, b.col),
          r1 = Math.min(a.row, b.row),
          r2 = Math.max(a.row, b.row);
        const cs = Math.max(1, Math.min(gm.cols, c1)),
          rs = Math.max(1, Math.min(gm.rows, r1));
        const cspan = Math.max(1, Math.min(gm.cols - cs + 1, c2 - c1 + 1)),
          rspan = Math.max(1, Math.min(gm.rows - rs + 1, r2 - r1 + 1));
        app.commit();
        r.node.settings.grid_column_start = cs;
        r.node.settings.grid_column_span = cspan;
        r.node.settings.grid_row_start = rs;
        r.node.settings.grid_row_span = rspan;
        app.selected = r.node.id;
        app.render();
      };
      matrix.querySelectorAll("[data-grid-cell]").forEach((cell) => {
        cell.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          start = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
          last = start;
          matrix.classList.add("is-dragging");
        });
        cell.addEventListener("pointerenter", () => {
          if (start) {
            last = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
            matrix.querySelectorAll("[data-grid-cell]").forEach((c) => {
              const rr = Number(c.dataset.row),
                cc = Number(c.dataset.col);
              const r1 = Math.min(start.row, last.row),
                r2 = Math.max(start.row, last.row),
                c1 = Math.min(start.col, last.col),
                c2 = Math.max(start.col, last.col);
              c.classList.toggle("is-preview", rr >= r1 && rr <= r2 && cc >= c1 && cc <= c2);
            });
          }
        });
      });
      window.addEventListener("pointerup", () => {
        if (start) {
          const a = start,
            b = last;
          start = last = null;
          matrix.classList.remove("is-dragging");
          matrix.querySelectorAll(".is-preview").forEach((c) => c.classList.remove("is-preview"));
          apply(a, b);
        }
      });
    }
    function lb20BindGridUI() {
      lb20ApplyGridGuides();
      app.root.querySelectorAll(".lb20-grid-matrix").forEach(lb20BindMatrix);
      app.root
        .querySelectorAll(
          '.lb20-grid-editor input[data-setting="columns"],.lb20-grid-editor input[data-setting="rows"]',
        )
        .forEach((x) => x.addEventListener("change", () => setTimeout(lb20ApplyGridGuides, 0)));
    }
  })();
  (function () {
    function lb122Value(v) {
      return v && typeof v === "object" ? (v[app.device] ?? v.desktop ?? "") : (v ?? "");
    }
    function lb122RepeatCount(v, fallback) {
      const t3 = String(v || "").trim();
      if (!t3) return fallback;
      if (/^\d+$/.test(t3)) return Math.max(1, Math.min(24, parseInt(t3, 10)));
      let count = 0,
        i = 0;
      while (i < t3.length) {
        while (i < t3.length && /\s/.test(t3[i])) i++;
        if (i >= t3.length) break;
        if (/^repeat\(/i.test(t3.slice(i))) {
          let d = 0,
            j = i;
          for (; j < t3.length; j++) {
            if (t3[j] === "(") d++;
            else if (t3[j] === ")") {
              d--;
              if (d === 0) break;
            }
          }
          const inside = t3.slice(i + 7, j),
            comma = inside.indexOf(",");
          const n = comma > 0 ? parseInt(inside.slice(0, comma).trim(), 10) : NaN;
          count += Number.isFinite(n) && n > 0 ? n : 1;
          i = j + 1;
        } else {
          let d = 0,
            j = i;
          for (; j < t3.length; j++) {
            if (t3[j] === "(") d++;
            else if (t3[j] === ")") d--;
            else if (/\s/.test(t3[j]) && d === 0) break;
          }
          count++;
          i = j + 1;
        }
      }
      return Math.max(1, Math.min(24, count || fallback));
    }
    function lb122Counts(n) {
      const s = n?.settings || {};
      const cols = lb122RepeatCount(
        lb122Value(s.grid_template_columns),
        Math.max(1, parseInt(lb122Value(s.columns), 10) || 3),
      );
      const rows = lb122RepeatCount(
        lb122Value(s.grid_template_rows),
        Math.max(1, parseInt(lb122Value(s.rows), 10) || 3),
      );
      return { cols, rows };
    }
    function lb122Node(fd, id) {
      if (!fd || !id) return null;
      for (const n of fd.querySelectorAll(".lb-node")) if (String(n.dataset.id) === String(id)) return n;
      return null;
    }
    function lb122Style(fd) {
      if (!fd || fd.getElementById("lb122-style")) return;
      const st = fd.createElement("style");
      st.id = "lb122-style";
      st.textContent = `
      .lb-grid-inner.lb122-grid-active{position:relative!important;overflow:visible!important;}
      .lb-grid-inner.lb122-grid-active:before{content:""!important;position:absolute!important;inset:0!important;z-index:999999!important;pointer-events:none!important;border:2px solid rgba(45,114,217,.9)!important;background-image:linear-gradient(to right,rgba(45,114,217,.48) 1px,transparent 1px),linear-gradient(to bottom,rgba(45,114,217,.48) 1px,transparent 1px)!important;background-repeat:repeat!important;background-size:calc(100% / var(--lb122-cols)) 100%,100% calc(100% / var(--lb122-rows))!important;box-sizing:border-box!important;}
      .lb122-grid-guide{position:absolute!important;inset:0!important;z-index:1000000!important;pointer-events:none!important;display:grid!important;box-sizing:border-box!important;}
      .lb122-grid-cell{border-right:1px dashed rgba(45,114,217,.55)!important;border-bottom:1px dashed rgba(45,114,217,.55)!important;box-sizing:border-box!important;padding:4px!important;color:#2467c5!important;font:700 10px/1 system-ui,sans-serif!important;text-shadow:0 1px #fff!important;min-width:0!important;min-height:0!important;}
      .lb122-grid-label{position:absolute!important;background:#2d72d9!important;color:#fff!important;padding:2px 5px!important;border-radius:3px!important;font:700 10px/1 system-ui,sans-serif!important;box-sizing:border-box!important;}
      body.lb122-resizing,body.lb122-resizing *{cursor:inherit!important;}
    `;
      (fd.head || fd.documentElement).appendChild(st);
    }
    function lb122Grid() {
      const fd = app.frameDoc();
      if (!fd) return;
      lb122Style(fd);
      fd.querySelectorAll(".lb122-grid-guide").forEach((x) => x.remove());
      fd.querySelectorAll(".lb122-grid-active").forEach((x) => {
        x.classList.remove("lb122-grid-active");
        x.style.removeProperty("--lb122-cols");
        x.style.removeProperty("--lb122-rows");
      });
    }
    function lb122Delete(e) {
      if (app.lbShortcutOwner) return;
      if (e.key !== "Delete" || !app.selected) return;
      const t3 = e.target;
      if (t3?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t3?.tagName)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = app.selected;
      app.remove(id);
    }
    function lb122BindFrame() {
      const f = document.getElementById("lb-editor-frame");
      if (!f) return;
      if (f.__lb122Load) return;
      f.__lb122Load = true;
      f.addEventListener("load", () => {
        const fd2 = app.frameDoc();
        if (!fd2) return;
        if (!fd2.__lb122Keys) {
          fd2.__lb122Keys = true;
          fd2.addEventListener("keydown", lb122Delete, true);
          fd2.defaultView?.addEventListener("keydown", lb122Delete, true);
        }
        setTimeout(lb122Grid, 0);
        setTimeout(lb122Grid, 100);
        setTimeout(lb122Grid, 300);
      });
      const fd = app.frameDoc();
      if (fd && !fd.__lb122Keys) {
        fd.__lb122Keys = true;
        fd.addEventListener("keydown", lb122Delete, true);
        fd.defaultView?.addEventListener("keydown", lb122Delete, true);
      }
    }
    if (!window.__lb122ParentDelete) {
      window.__lb122ParentDelete = true;
      window.addEventListener("keydown", lb122Delete, true);
      document.addEventListener("keydown", lb122Delete, true);
    }
    const oldSelect122 = app.selectNode;
    app.selectNode = function (id) {
      oldSelect122(id);
    };
    const oldRender122 = app.render;
    app.render = function () {
      oldRender122();
      lb122BindFrame();
    };
    lb122BindFrame();
  })();
  (function () {
    "use strict";
    const LB123_MIN = 40;
    let lb123Resize = null;
    function lb123Frame() {
      return document.getElementById("lb-editor-frame");
    }
    function lb123Doc() {
      return lb123Frame()?.contentDocument || null;
    }
    function lb123Node(id) {
      const fd = lb123Doc();
      return fd?.querySelector('.lb-node[data-id="' + CSS.escape(String(id)) + '"]') || null;
    }
    function lb123Inner(id) {
      const n = lb123Node(id);
      return n?.querySelector(":scope > .lb-container-inner, :scope > .lb-grid-inner") || null;
    }
    function lb123Num(v, f = 0) {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : f;
    }
    function lb123Clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }
    function lb123ResponsiveSet(node, key, value) {
      node.settings = node.settings || {};
      if (app.setResponsiveValue) app.setResponsiveValue(node.settings, key, value);
      else {
        const old = node.settings[key];
        if (old && typeof old === "object" && !Array.isArray(old)) old[app.device] = value;
        else if (app.device === "desktop") node.settings[key] = value;
        else node.settings[key] = { desktop: old ?? "", [app.device]: value };
      }
    }
    function lb123HistoryStart() {
      if (typeof app.commit === "function") {
        app.commit(app.t("Edited layout"));
        return;
      }
      app.history.push(app.snap());
      if (app.history.length > (app.historyLimit || 40)) app.history.shift();
      app.future = [];
      app.dirty = true;
    }
    function lb123Finish() {
      app.dirty = true;
      app.scheduleSave();
    }
    function lb123IsBoxType(t3) {
      return t3 === "container" || t3 === "grid" || t3 === "inner_section";
    }
    function lb123ParentMetrics(node) {
      const parentEl = node.parentElement;
      if (!parentEl)
        return {
          w: node.getBoundingClientRect().width || 1,
          h: node.getBoundingClientRect().height || 1,
          gapX: 0,
          gapY: 0,
        };
      const cs = parentEl.ownerDocument.defaultView.getComputedStyle(parentEl);
      return {
        w: parentEl.clientWidth || node.getBoundingClientRect().width || 1,
        h: parentEl.clientHeight || node.getBoundingClientRect().height || 1,
        gapX: parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0,
        gapY: parseFloat(cs.rowGap) || parseFloat(cs.gap) || 0,
      };
    }
    function lb123WidthValue(px, parentW, current) {
      const cur = String(current || "").trim();
      if (/px$/i.test(cur) || /^\d+(\.\d+)?$/.test(cur)) return Math.round(px) + "px";
      if (!(parentW > 0)) return Math.round(px) + "px";
      return Math.round(Math.min(100, Math.max(1, (px / parentW) * 100)) * 10) / 10 + "%";
    }
    function lb123CanSplit(parent, axis) {
      if (!parent || parent.type !== "container") return false;
      const layout = parent.settings?.layout || "flex";
      if (layout === "grid") return false;
      const dir = String(
        (typeof app.resp === "function" ? app.resp(parent.settings?.direction) : parent.settings?.direction) || "row",
      );
      if (axis === "x") return dir === "row" || dir === "row-reverse";
      return dir === "column" || dir === "column-reverse";
    }
    function lb123AdjacentSibling(node, edge, parentNode, gap) {
      if (!parentNode || !lb123IsBoxType(node.dataset.type)) return null;
      const axis = edge === "e" || edge === "w" ? "x" : "y";
      if (!lb123CanSplit(parentNode, axis)) return null;
      const kids = (parentNode.children || []).filter(
        (c) => c && c.id && c.id !== node.dataset.id && lb123IsBoxType(c.type),
      );
      if (!kids.length) return null;
      const my = node.getBoundingClientRect();
      const tol = Math.max(28, (gap || 0) + 20);
      let best = null,
        bestDist = tol;
      kids.forEach((c) => {
        const el = lb123Node(c.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        let dist = Infinity;
        if (edge === "e") dist = Math.abs(r.left - my.right);
        else if (edge === "w") dist = Math.abs(my.left - r.right);
        else if (edge === "s") dist = Math.abs(r.top - my.bottom);
        else if (edge === "n") dist = Math.abs(my.top - r.bottom);
        if (dist < bestDist) {
          bestDist = dist;
          best = { id: c.id, node: c, el, startW: r.width, startH: r.height };
        }
      });
      return best;
    }
    function lb123SetMarginSide(n, side, px) {
      n.settings = n.settings || {};
      const cur = n.settings.margin;
      const box =
        cur && typeof cur === "object" && !Array.isArray(cur)
          ? Object.assign({}, cur)
          : { top: "", right: "", bottom: "", left: "" };
      box[side] = Math.round(px);
      n.settings.margin = box;
    }
    function lb123FreezeFlex(n, basis) {
      lb123ResponsiveSet(n, "flex_grow", 0);
      lb123ResponsiveSet(n, "flex_shrink", 0);
      if (basis != null && basis !== "") lb123ResponsiveSet(n, "flex_basis", basis);
    }
    function lb123Tip(fd, text, x, y) {
      if (!fd || !fd.body) return;
      let t3 = fd.getElementById("lb123-size-tip");
      if (!t3) {
        t3 = fd.createElement("div");
        t3.id = "lb123-size-tip";
        t3.className = "lb123-size-tip";
        fd.body.appendChild(t3);
      }
      t3.textContent = text;
      t3.style.left = Math.round(x) + "px";
      t3.style.top = Math.round(y) + "px";
    }
    function lb123IsTyping(target) {
      if (!target) return false;
      const tag = (target.tagName || "").toUpperCase();
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }
    function lb123ParseTracks(value, count, total) {
      const raw = String(value || "").trim();
      let out = [];
      if (raw) {
        const matches = raw.match(/(?:\d*\.?\d+)px/g);
        if (matches) out = matches.map((x) => parseFloat(x)).filter(Number.isFinite);
      }
      if (out.length !== count) {
        const each = Math.max(LB123_MIN, total / count);
        out = Array.from({ length: count }, () => each);
      }
      const sum = out.reduce((a, b) => a + b, 0);
      if (sum > 0 && total > 0) {
        const scale = total / sum;
        out = out.map((x) => x * scale);
      }
      return out;
    }
    function lb123TrackInfo(inner, axis, count) {
      const cs = inner.ownerDocument.defaultView.getComputedStyle(inner);
      const rect = inner.getBoundingClientRect();
      const gap = axis === "x" ? lb123Num(cs.columnGap) : lb123Num(cs.rowGap);
      const total = (axis === "x" ? rect.width : rect.height) - gap * Math.max(0, count - 1);
      const prop = axis === "x" ? cs.gridTemplateColumns : cs.gridTemplateRows;
      const values =
        String(prop)
          .match(/-?\d*\.?\d+px/g)
          ?.map((x) => parseFloat(x))
          .filter((n) => Number.isFinite(n) && n > 1) || [];
      let tracks = values.length >= 2 ? values : lb123ParseTracks("", Math.max(2, count || values.length || 3), total);
      if (tracks.length < 2) tracks = lb123ParseTracks("", Math.max(2, count || 3), total);
      return { rect, gap, total, tracks };
    }
    function lb123RemoveHandles(fd) {
      fd?.querySelectorAll(
        ".lb123-resize-handle,.lb123-box-handle,.lb123-grid-track-handle,.lb26-img-handle,.lb26-img-label,.lb-tiny-handle,.lb-tiny-label,.lb123-size-tip",
      ).forEach((x) => x.remove());
      fd?.getElementById("lb123-handle-layer")?.replaceChildren();
      fd?.querySelectorAll(".lb123-resize-active").forEach((x) => x.classList.remove("lb123-resize-active"));
    }
    function lb123ResizeCSS(fd) {
      if (!fd) return;
      let st = fd.getElementById("lb123-resize-style");
      if (!st) {
        st = fd.createElement("style");
        st.id = "lb123-resize-style";
        fd.head.appendChild(st);
      }
      st.textContent = `
      .lb-node.lb123-resize-active,.lb-grid-inner>.lb-node.lb123-resize-active,.lb-container-inner>.lb-node.lb123-resize-active{outline:1px solid #2d72d9!important;outline-offset:-1px!important;overflow:visible!important;}
      #lb123-handle-layer{position:absolute!important;top:0!important;left:0!important;width:0!important;height:0!important;right:auto!important;bottom:auto!important;z-index:2147483646!important;pointer-events:none!important;overflow:visible!important;}
      .lb123-resize-handle{position:absolute!important;z-index:2147483000!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important;display:block!important;}
      .lb123-resize-handle.e,.lb123-resize-handle.w{top:7px!important;bottom:7px!important;width:12px!important;cursor:ew-resize!important;}
      .lb123-resize-handle.e{right:-6px!important;}
      .lb123-resize-handle.w{left:-6px!important;}
      .lb123-resize-handle.n,.lb123-resize-handle.s{left:7px!important;right:7px!important;height:12px!important;cursor:ns-resize!important;}
      .lb123-resize-handle.n{top:-6px!important;}
      .lb123-resize-handle.s{bottom:-6px!important;}
      .lb123-resize-handle.nw,.lb123-resize-handle.ne,.lb123-resize-handle.sw,.lb123-resize-handle.se{width:14px!important;height:14px!important;}
      .lb123-resize-handle.nw{left:-7px!important;top:-7px!important;cursor:nwse-resize!important;}
      .lb123-resize-handle.se{right:-7px!important;bottom:-7px!important;cursor:nwse-resize!important;}
      .lb123-resize-handle.ne{right:-7px!important;top:-7px!important;cursor:nesw-resize!important;}
      .lb123-resize-handle.sw{left:-7px!important;bottom:-7px!important;cursor:nesw-resize!important;}
      .lb123-box-handle{position:absolute!important;z-index:2147483646!important;background:transparent!important;border:0!important;box-sizing:border-box!important;pointer-events:auto!important;touch-action:none!important;margin:0!important;padding:0!important;}
      .lb123-box-handle.n,.lb123-box-handle.s{height:14px!important;cursor:ns-resize!important;}
      .lb123-box-handle.e,.lb123-box-handle.w{width:14px!important;cursor:ew-resize!important;}
      .lb123-box-handle.n:before,.lb123-box-handle.s:before{content:"";position:absolute;left:10px;right:10px;top:5px;height:4px;border-radius:2px;background:rgba(45,114,217,.55);}
      .lb123-box-handle.e:before,.lb123-box-handle.w:before{content:"";position:absolute;top:10px;bottom:10px;left:5px;width:4px;border-radius:2px;background:rgba(45,114,217,.55);}
      .lb123-box-handle.nw,.lb123-box-handle.se{width:14px!important;height:14px!important;cursor:nwse-resize!important;}
      .lb123-box-handle.ne,.lb123-box-handle.sw{width:14px!important;height:14px!important;cursor:nesw-resize!important;}
      .lb123-box-handle.nw:before,.lb123-box-handle.ne:before,.lb123-box-handle.sw:before,.lb123-box-handle.se:before{content:"";position:absolute;inset:3px;border-radius:2px;background:rgba(45,114,217,.55);}
      .lb123-box-handle:hover:before,.lb123-box-handle.is-dragging:before{background:#2d72d9!important;}
      .lb123-size-tip{position:fixed!important;z-index:2147483647!important;background:#0c0d0e!important;color:#fff!important;font:600 11px/1 system-ui,sans-serif!important;padding:5px 8px!important;border-radius:3px!important;pointer-events:none!important;white-space:nowrap!important;transform:translate(-50%,-130%)!important;box-shadow:0 1px 4px rgba(0,0,0,.35)!important;}
      .lb123-grid-track-handle{position:absolute!important;z-index:2147483645!important;background:rgba(45,114,217,.55)!important;opacity:.9!important;border:0!important;padding:0!important;margin:0!important;pointer-events:auto!important;box-sizing:border-box!important;transform:none!important;touch-action:none!important;user-select:none!important;}
      .lb123-grid-track-handle.x{width:14px!important;cursor:col-resize!important;}
      .lb123-grid-track-handle.y{height:16px!important;cursor:row-resize!important;}
      .lb123-grid-track-handle:hover,.lb123-grid-track-handle.is-dragging{opacity:1!important;background:rgba(45,114,217,.95)!important;}
      body.lb123-resizing,body.lb123-resizing *{cursor:inherit!important;user-select:none!important;}
      body.lb123-resizing-y,body.lb123-resizing-y *{cursor:row-resize!important;}
      body.lb123-resizing-x,body.lb123-resizing-x *{cursor:col-resize!important;}
    `;
    }
    function lb123AddUnitHandles(fd, node) {
      if (!node) return;
      lb123ResizeCSS(fd);
      node.classList.add("lb123-resize-active");
      if (node.dataset.type === "image" && node.querySelector("img")) {
        lb123AddImageHandles(fd, node);
        return;
      }
      ["n", "e", "s", "w", "nw", "ne", "se", "sw"].forEach((edge) => {
        const h = fd.createElement("span");
        h.className = "lb123-resize-handle " + edge;
        h.dataset.edge = edge;
        h.setAttribute("aria-hidden", "true");
        h.addEventListener("pointerdown", (e) => lb123StartUnitResize(e, node, edge), true);
        node.appendChild(h);
      });
    }
    function lb123Viewport(fd) {
      const win = fd?.defaultView;
      const de = fd?.documentElement;
      const body = fd?.body;
      const contentW = body?.clientWidth || 0;
      const rootW = de?.clientWidth || win?.innerWidth || 0;
      return {
        w: Math.max(0, contentW > 0 ? Math.min(contentW, rootW || contentW) : rootW || 0),
        h: Math.max(0, de?.clientHeight || win?.innerHeight || 0),
      };
    }
    function lb123HandleLayer(fd) {
      if (!fd || !fd.body) return null;
      let layer = fd.getElementById("lb123-handle-layer");
      if (!layer) {
        layer = fd.createElement("div");
        layer.id = "lb123-handle-layer";
        layer.setAttribute("aria-hidden", "true");
        fd.body.appendChild(layer);
      }
      return layer;
    }
    function lb123BoxLayout(rect, edge) {
      const t3 = 14,
        c = 14,
        g = 8;
      const L = {
        n: { left: rect.left + g, top: rect.top - t3 / 2, width: Math.max(16, rect.width - 2 * g), height: t3 },
        s: { left: rect.left + g, top: rect.bottom - t3 / 2, width: Math.max(16, rect.width - 2 * g), height: t3 },
        w: { left: rect.left - t3 / 2, top: rect.top + g, width: t3, height: Math.max(16, rect.height - 2 * g) },
        e: { left: rect.right - t3 / 2, top: rect.top + g, width: t3, height: Math.max(16, rect.height - 2 * g) },
        nw: { left: rect.left - c / 2, top: rect.top - c / 2, width: c, height: c },
        ne: { left: rect.right - c / 2, top: rect.top - c / 2, width: c, height: c },
        sw: { left: rect.left - c / 2, top: rect.bottom - c / 2, width: c, height: c },
        se: { left: rect.right - c / 2, top: rect.bottom - c / 2, width: c, height: c },
      }[edge];
      return L || { left: 0, top: 0, width: c, height: c };
    }
    function lb123KeepHandleVisible(L, vp) {
      const gap = 2;
      if (vp.w > 0) {
        if (L.left + L.width > vp.w - gap) L.left = Math.max(gap, vp.w - gap - L.width);
        else if (L.left < gap) L.left = gap;
      }
      return L;
    }
    function lb123Page(fd) {
      const win = fd?.defaultView;
      return { x: win ? win.scrollX || win.pageXOffset || 0 : 0, y: win ? win.scrollY || win.pageYOffset || 0 : 0 };
    }
    function lb123PlaceBoxHandles(fd, node) {
      const rect = node.getBoundingClientRect();
      const page = lb123Page(fd);
      const vp = lb123Viewport(fd);
      fd.querySelectorAll(".lb123-box-handle").forEach((h) => {
        const L = lb123KeepHandleVisible(lb123BoxLayout(rect, h.dataset.edge), vp);
        h.style.left = Math.round(L.left + page.x) + "px";
        h.style.top = Math.round(L.top + page.y) + "px";
        h.style.width = Math.round(L.width) + "px";
        h.style.height = Math.round(L.height) + "px";
      });
    }
    // Edge grab strips straddle the border, so their inner half sits on top of the
    // unit's content (a child widget, a menu link, an open dropdown). That blocked
    // :hover there. While the pointer is over such content, let it fall through;
    // the outer half of the strip and the corner squares still resize.
    function lb123BindHandlePassThrough(fd) {
      if (!fd || fd.__lb123PassThrough) return;
      fd.__lb123PassThrough = true;
      const INTERACTIVE = "a,button,input,select,textarea,summary,label,[role=button],[tabindex]:not(.lb-node)";
      fd.addEventListener(
        "pointermove",
        (e) => {
          if (fd.body && fd.body.classList.contains("lb123-resizing")) return;
          const strips = fd.querySelectorAll(
            ".lb123-box-handle.n,.lb123-box-handle.s,.lb123-box-handle.e,.lb123-box-handle.w",
          );
          if (!strips.length) return;
          const x = e.clientX,
            y = e.clientY;
          let under = null,
            looked = false;
          strips.forEach((h) => {
            if (h.classList.contains("is-dragging")) return;
            const r = h.getBoundingClientRect();
            const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
            let pass = false;
            if (inside) {
              if (!looked) {
                looked = true;
                const stack = typeof fd.elementsFromPoint === "function" ? fd.elementsFromPoint(x, y) : [];
                under = stack.find((el) => !el.closest("#lb123-handle-layer")) || null;
              }
              const sel = fd.querySelector(".lb-node.lb123-resize-active");
              if (under && sel && sel.contains(under) && under !== sel) {
                const child = under.closest(".lb-node");
                pass = !!(child && child !== sel) || !!under.closest(INTERACTIVE);
              }
            }
            if (pass && !h.__lbPass) {
              h.style.setProperty("pointer-events", "none", "important");
              h.__lbPass = true;
            } else if (!pass && h.__lbPass) {
              h.style.removeProperty("pointer-events");
              h.__lbPass = false;
            }
          });
        },
        true,
      );
    }
    function lb123AddBoxHandles(fd, node) {
      if (!node) return;
      lb123ResizeCSS(fd);
      lb123BindHandlePassThrough(fd);
      node.classList.add("lb123-resize-active");
      const layer = lb123HandleLayer(fd) || fd.body;
      const titles = {
        n: "Resize top",
        s: "Resize bottom",
        e: "Resize right",
        w: "Resize left",
        nw: "Resize top-left",
        ne: "Resize top-right",
        sw: "Resize bottom-left",
        se: "Resize bottom-right",
      };
      ["n", "s", "e", "w", "nw", "ne", "se", "sw"].forEach((edge) => {
        const h = fd.createElement("span");
        h.className = "lb123-box-handle " + edge;
        h.dataset.edge = edge;
        h.title = titles[edge];
        h.setAttribute("aria-hidden", "true");
        h.addEventListener(
          "pointerdown",
          (e) => {
            if (e.button != null && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            try {
              h.setPointerCapture(e.pointerId);
            } catch (err) {}
            h.classList.add("is-dragging");
            lb123StartUnitResize(e, node, edge, h);
          },
          true,
        );
        layer.appendChild(h);
      });
      lb123PlaceBoxHandles(fd, node);
    }
    function lb123CellWidth(node) {
      const inner = node.parentElement;
      if (!inner) return node.getBoundingClientRect().width || 0;
      const ics = inner.ownerDocument.defaultView.getComputedStyle(inner),
        ncs = inner.ownerDocument.defaultView.getComputedStyle(node);
      const px = [...String(ics.gridTemplateColumns || "").matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1]));
      const start = Math.max(1, parseInt(ncs.gridColumnStart, 10) || 1);
      const end = String(ncs.gridColumnEnd || "");
      const sm = end.match(/span\s+(\d+)/i);
      const span = sm
        ? Math.max(1, parseInt(sm[1], 10))
        : /^\d+$/.test(end)
          ? Math.max(1, parseInt(end, 10) - start)
          : 1;
      if (px.length) {
        let w = 0,
          gap = parseFloat(ics.columnGap) || 0;
        for (let i = start - 1; i < start - 1 + span && i < px.length; i++) w += px[i] + (i > start - 1 ? gap : 0);
        if (w > 1) return w;
      }
      return Math.max(node.getBoundingClientRect().width || 0, inner.clientWidth || 0);
    }
    function lb123AddImageHandles(fd, node) {
      if (!fd.getElementById("lb26-style")) {
        const st = fd.createElement("style");
        st.id = "lb26-style";
        st.textContent =
          ".lb26-img-handle{position:absolute!important;z-index:2147483646!important;background:#2d72d9;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);touch-action:none;box-sizing:border-box;margin:0;padding:0;pointer-events:auto!important}.lb26-img-handle.e{width:14px;height:42px;border-radius:7px;cursor:ew-resize}.lb26-img-handle.s{width:42px;height:14px;border-radius:7px;cursor:ns-resize}.lb26-img-handle.se{width:18px;height:18px;border-radius:50%;cursor:nwse-resize}.lb26-img-label{position:absolute;transform:translateX(-50%);z-index:2147483647;background:rgba(23,25,29,.92);color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:nowrap}";
        fd.head.appendChild(st);
      }
      const win = fd.defaultView,
        img = node.querySelector("img"),
        id = node.dataset.id;
      if (!img) return;
      if (win.getComputedStyle(node).position === "static") node.style.position = "relative";
      const mk = (edge) => {
        const h = fd.createElement("span");
        h.className = "lb26-img-handle " + edge;
        h.dataset.edge = edge;
        h.setAttribute("aria-hidden", "true");
        h.title = edge === "se" ? "Drag to resize (hold Shift to stretch freely)" : "Drag to resize";
        fd.body.appendChild(h);
        return h;
      };
      const hs = { e: mk("e"), s: mk("s"), se: mk("se") };
      const place = () => {
        const ir = img.getBoundingClientRect(),
          W = ir.width,
          H = ir.height,
          page = lb123Page(fd);
        hs.e.style.left = ir.right - 7 + page.x + "px";
        hs.e.style.top = ir.top + H / 2 - 21 + page.y + "px";
        hs.s.style.left = ir.left + W / 2 - 21 + page.x + "px";
        hs.s.style.top = ir.bottom - 7 + page.y + "px";
        hs.se.style.left = ir.right - 9 + page.x + "px";
        hs.se.style.top = ir.bottom - 9 + page.y + "px";
      };
      place();
      img.addEventListener("load", place, { once: true });
      Object.keys(hs).forEach((edge) => {
        const h = hs[edge],
          stop = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
          };
        h.addEventListener("mousedown", stop);
        h.addEventListener("dragstart", stop);
        h.addEventListener("click", (ev) => ev.stopPropagation());
        h.addEventListener("pointerdown", (e) => {
          if (e.button !== 0) return;
          stop(e);
          const r = app.locate(app.state.root, id);
          if (!r) return;
          const s = (r.node.settings = r.node.settings || {}),
            ir = img.getBoundingClientRect(),
            startW = ir.width || 1,
            startH = ir.height || 1,
            startX = e.clientX,
            startY = e.clientY;
          let maxW = lb123CellWidth(node);
          if (!(maxW > 0)) maxW = startW;
          const curW = String(app.resp(s.width) || "").trim(),
            usePx = /px$/i.test(curW) || /^\d+(\.\d+)?$/.test(curW),
            hadHeight = String(app.resp(s.height) || "").trim() !== "";
          let w = startW,
            hgt = startH,
            touchW = false,
            touchH = false,
            moved = false;
          const lab = fd.createElement("div");
          lab.className = "lb26-img-label";
          fd.body.appendChild(lab);
          const live = (nw, nh) => {
            const px = Math.round(nw) + "px";
            node.style.setProperty("width", px, "important");
            node.style.setProperty("max-width", "100%", "important");
            node.style.setProperty("height", touchH ? Math.round(nh) + "px" : "auto", "important");
            img.style.setProperty("width", "100%", "important");
            img.style.setProperty("max-width", "100%", "important");
            img.style.setProperty("height", touchH ? Math.round(nh) + "px" : "auto", "important");
          };
          const label = () => {
            const b = img.getBoundingClientRect(),
              page = lb123Page(fd);
            lab.textContent =
              Math.round(w) + " \xD7 " + Math.round(hgt) + " px  \xB7  " + Math.round((w / maxW) * 100) + "%";
            lab.style.left = b.left + b.width / 2 + page.x + "px";
            lab.style.top = b.top + 8 + page.y + "px";
          };
          fd.body.classList.add("lb123-resizing");
          document.body.classList.add("lb123-resizing");
          live(startW, startH);
          label();
          const move = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            moved = true;
            const dx = ev.clientX - startX,
              dy = ev.clientY - startY;
            if (edge === "e" || edge === "se") {
              w = Math.min(maxW, Math.max(LB123_MIN, startW + dx));
              touchW = true;
              hgt = (startH * w) / startW;
            }
            if (edge === "s" || (edge === "se" && (ev.shiftKey || hadHeight))) {
              hgt = edge === "se" && !ev.shiftKey ? (startH * w) / startW : Math.max(LB123_MIN, startH + dy);
              touchH = true;
            }
            live(w, hgt);
            place();
            label();
          };
          const up = () => {
            fd.removeEventListener("pointermove", move, true);
            fd.removeEventListener("pointerup", up, true);
            fd.removeEventListener("pointercancel", up, true);
            fd.body.classList.remove("lb123-resizing");
            document.body.classList.remove("lb123-resizing");
            lab.remove();
            if (!moved) {
              place();
              return;
            }
            lb123HistoryStart();
            if (touchW)
              lb123ResponsiveSet(
                r.node,
                "width",
                usePx ? Math.round(w) + "px" : w >= maxW - 1 ? "100%" : Math.round((w / maxW) * 1e3) / 10 + "%",
              );
            if (touchH) lb123ResponsiveSet(r.node, "height", Math.round(hgt) + "px");
            app.selected = id;
            lb123Finish();
            app.render();
          };
          try {
            h.setPointerCapture(e.pointerId);
          } catch (_) {}
          fd.addEventListener("pointermove", move, true);
          fd.addEventListener("pointerup", up, true);
          fd.addEventListener("pointercancel", up, true);
        });
      });
    }
    function lb123AddTinyHandles(fd, node) {
      if (!fd.getElementById("lb-tiny-handle-style")) {
        const st = fd.createElement("style");
        st.id = "lb-tiny-handle-style";
        st.textContent =
          ".lb-tiny-handle{position:absolute!important;z-index:2147483646!important;background:#2d72d9;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);touch-action:none;box-sizing:border-box;margin:0;padding:0;pointer-events:auto!important}.lb-tiny-handle.e{width:14px;height:42px;border-radius:7px;cursor:ew-resize}.lb-tiny-handle.s{width:42px;height:14px;border-radius:7px;cursor:ns-resize}.lb-tiny-handle.se{width:18px;height:18px;border-radius:50%;cursor:nwse-resize}.lb-tiny-label{position:absolute;transform:translateX(-50%);z-index:2147483647;background:rgba(23,25,29,.92);color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:nowrap}";
        fd.head.appendChild(st);
      }
      const box = node.querySelector(".lb-tinymce-preview,.lb-tinymce-text-editor") || node,
        id = node.dataset.id;
      const mk = (edge) => {
        const h = fd.createElement("span");
        h.className = "lb-tiny-handle " + edge;
        h.dataset.edge = edge;
        h.setAttribute("aria-hidden", "true");
        h.title = "Drag to resize";
        fd.body.appendChild(h);
        return h;
      };
      const hs = { e: mk("e"), s: mk("s"), se: mk("se") };
      const place = () => {
        const ir = box.getBoundingClientRect(),
          W = ir.width,
          H = ir.height,
          page = lb123Page(fd);
        hs.e.style.left = ir.right - 7 + page.x + "px";
        hs.e.style.top = ir.top + H / 2 - 21 + page.y + "px";
        hs.s.style.left = ir.left + W / 2 - 21 + page.x + "px";
        hs.s.style.top = ir.bottom - 7 + page.y + "px";
        hs.se.style.left = ir.right - 9 + page.x + "px";
        hs.se.style.top = ir.bottom - 9 + page.y + "px";
      };
      place();
      Object.keys(hs).forEach((edge) => {
        const h = hs[edge],
          stop = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
          };
        h.addEventListener("mousedown", stop);
        h.addEventListener("dragstart", stop);
        h.addEventListener("click", (ev) => ev.stopPropagation());
        h.addEventListener("pointerdown", (e) => {
          if (e.button !== 0) return;
          stop(e);
          const r = app.locate(app.state.root, id);
          if (!r) return;
          const s = (r.node.settings = r.node.settings || {}),
            ir = box.getBoundingClientRect(),
            startW = ir.width || 1,
            startH = ir.height || 1,
            startX = e.clientX,
            startY = e.clientY;
          let maxW = lb123CellWidth(node);
          if (!(maxW > 0)) maxW = startW;
          const curW = String(app.resp(s.width) || "").trim(),
            usePx = /px$/i.test(curW) || /^\d+(\.\d+)?$/.test(curW),
            hadHeight = String(app.resp(s.height) || "").trim() !== "";
          let w = startW,
            hgt = startH,
            touchW = false,
            touchH = false,
            moved = false;
          const lab = fd.createElement("div");
          lab.className = "lb-tiny-label";
          fd.body.appendChild(lab);
          const live = (nw, nh) => {
            const wp2 = Math.round(nw) + "px",
              hp = Math.round(nh) + "px";
            node.style.setProperty("--lb-tiny-w", wp2);
            node.style.setProperty("--lb-tiny-max-w", "100%");
            box.style.setProperty("width", wp2, "important");
            box.style.setProperty("max-width", "100%", "important");
            if (touchH) {
              node.style.setProperty("--lb-tiny-h", hp);
              box.style.setProperty("height", hp, "important");
            }
          };
          const label = () => {
            const b = box.getBoundingClientRect(),
              page = lb123Page(fd);
            lab.textContent =
              Math.round(w) + " \xD7 " + Math.round(hgt) + " px  \xB7  " + Math.round((w / maxW) * 100) + "%";
            lab.style.left = b.left + b.width / 2 + page.x + "px";
            lab.style.top = b.top + 8 + page.y + "px";
          };
          fd.body.classList.add("lb123-resizing");
          document.body.classList.add("lb123-resizing");
          live(startW, startH);
          label();
          const move = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            moved = true;
            const dx = ev.clientX - startX,
              dy = ev.clientY - startY;
            if (edge === "e" || edge === "se") {
              w = Math.min(maxW, Math.max(LB123_MIN, startW + dx));
              touchW = true;
              if (!hadHeight && edge !== "s") hgt = startH;
            }
            if (edge === "s" || edge === "se") {
              hgt = Math.max(LB123_MIN, startH + dy);
              touchH = true;
            }
            live(w, hgt);
            place();
            label();
          };
          const up = () => {
            fd.removeEventListener("pointermove", move, true);
            fd.removeEventListener("pointerup", up, true);
            fd.removeEventListener("pointercancel", up, true);
            fd.body.classList.remove("lb123-resizing");
            document.body.classList.remove("lb123-resizing");
            lab.remove();
            if (!moved) {
              place();
              return;
            }
            lb123HistoryStart();
            if (touchW)
              lb123ResponsiveSet(
                r.node,
                "width",
                usePx ? Math.round(w) + "px" : w >= maxW - 1 ? "100%" : Math.round((w / maxW) * 1e3) / 10 + "%",
              );
            if (touchH) lb123ResponsiveSet(r.node, "height", Math.round(hgt) + "px");
            app.selected = id;
            lb123Finish();
            app.render();
          };
          try {
            h.setPointerCapture(e.pointerId);
          } catch (_) {}
          fd.addEventListener("pointermove", move, true);
          fd.addEventListener("pointerup", up, true);
          fd.addEventListener("pointercancel", up, true);
        });
      });
    }
    function lb123StartUnitResize(e, node, edge, handle) {
      e.preventDefault();
      e.stopPropagation();
      const id = node.dataset.id,
        r = app.locate(app.state.root, id);
      if (!r) return;
      const rect = node.getBoundingClientRect();
      const inner = node.querySelector(":scope > .lb-grid-inner, :scope > .lb-container-inner");
      const cs = inner ? inner.ownerDocument.defaultView.getComputedStyle(inner) : null;
      const colPx = cs
        ? [...String(cs.gridTemplateColumns || "").matchAll(/(-?\d*\.?\d+)px/g)]
            .map((m) => parseFloat(m[1]))
            .filter((n) => n > 1)
        : [];
      const rowPx = cs
        ? [...String(cs.gridTemplateRows || "").matchAll(/(-?\d*\.?\d+)px/g)]
            .map((m) => parseFloat(m[1]))
            .filter((n) => n > 1)
        : [];
      const ncs = node.ownerDocument.defaultView.getComputedStyle(node);
      const metrics = lb123ParentMetrics(node);
      const xEdge = edge.includes("e") ? "e" : edge.includes("w") ? "w" : "";
      const yEdge = edge.includes("s") ? "s" : edge.includes("n") ? "n" : "";
      const sibX = xEdge ? lb123AdjacentSibling(node, xEdge, r.parent, metrics.gapX) : null;
      const sibY = yEdge ? lb123AdjacentSibling(node, yEdge, r.parent, metrics.gapY) : null;
      lb123HistoryStart();
      lb123Resize = {
        kind: "unit",
        id,
        edge,
        xEdge,
        yEdge,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        startML: parseFloat(ncs.marginLeft) || 0,
        startMT: parseFloat(ncs.marginTop) || 0,
        parentW: metrics.w,
        parentH: metrics.h,
        curW: app.resp?.(r.node.settings?.width) ?? r.node.settings?.width,
        doc: node.ownerDocument,
        node,
        handle,
        inner,
        startCols: colPx,
        startRows: rowPx,
        sibX,
        sibY,
      };
      node.ownerDocument.body.classList.add("lb123-resizing");
      document.body.classList.add("lb123-resizing");
      if (xEdge) node.ownerDocument.body.classList.add("lb123-resizing-x");
      if (yEdge) node.ownerDocument.body.classList.add("lb123-resizing-y");
      try {
        (handle || node).setPointerCapture(e.pointerId);
      } catch (_) {}
      const move = (ev) => lb123UnitMove(ev);
      const up = (ev) => lb123UnitEnd(ev, move, up);
      node.ownerDocument.addEventListener("pointermove", move, true);
      node.ownerDocument.addEventListener("pointerup", up, true);
      node.ownerDocument.addEventListener("pointercancel", up, true);
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    }
    function lb123ApplySize(n, el, axis, px, parentPx, currentWidth) {
      if (!n || !el) return "";
      if (axis === "x") {
        const val = lb123WidthValue(px, parentPx, currentWidth);
        lb123ResponsiveSet(n, "width", val);
        lb123FreezeFlex(n, val);
        el.style.setProperty("width", Math.round(px) + "px", "important");
        el.style.setProperty("flex-grow", "0", "important");
        el.style.setProperty("flex-shrink", "0", "important");
        el.style.setProperty("flex-basis", Math.round(px) + "px", "important");
        el.style.setProperty("max-width", "100%", "important");
        return val;
      }
      const pxv = Math.round(px) + "px";
      lb123ResponsiveSet(n, "min_height", pxv);
      if (n.type === "container" || n.type === "grid") {
        if (n.settings) delete n.settings.height;
      } else lb123ResponsiveSet(n, "height", pxv);
      el.style.setProperty("min-height", pxv, "important");
      if (n.type !== "container" && n.type !== "grid") el.style.setProperty("height", pxv, "important");
      const inner = el.querySelector(":scope > .lb-grid-inner, :scope > .lb-container-inner");
      if (inner) inner.style.setProperty("min-height", pxv, "important");
      return pxv;
    }
    function lb123UnitMove(e) {
      const a = lb123Resize;
      if (!a || a.kind !== "unit") return;
      e.preventDefault();
      e.stopPropagation();
      const dx = e.clientX - a.startX,
        dy = e.clientY - a.startY;
      let w = a.startW,
        h = a.startH,
        ml = a.startML,
        mt = a.startMT;
      if (a.xEdge === "e") w = a.startW + dx;
      if (a.xEdge === "w") w = a.startW - dx;
      if (a.yEdge === "s") h = a.startH + dy;
      if (a.yEdge === "n") h = a.startH - dy;
      const r = app.locate(app.state.root, a.id);
      if (!r) return;
      const n = r.node;
      let sibXW = 0,
        sibYH = 0;
      if (a.sibX && a.xEdge) {
        const pair = a.startW + a.sibX.startW;
        w = lb123Clamp(w, LB123_MIN, Math.max(LB123_MIN, pair - LB123_MIN));
        sibXW = pair - w;
      } else {
        w = Math.max(LB123_MIN, w);
        if (a.xEdge === "w") ml = a.startML + a.startW - w;
      }
      if (a.sibY && a.yEdge) {
        const pair = a.startH + a.sibY.startH;
        h = lb123Clamp(h, LB123_MIN, Math.max(LB123_MIN, pair - LB123_MIN));
        sibYH = pair - h;
      } else {
        h = Math.max(LB123_MIN, h);
        if (a.yEdge === "n") mt = a.startMT + a.startH - h;
      }
      if (a.xEdge) {
        lb123ApplySize(n, lb123Node(a.id), "x", w, a.parentW, a.curW);
        if (a.sibX) {
          const sib = app.locate(app.state.root, a.sibX.id)?.node;
          lb123ApplySize(
            sib,
            lb123Node(a.sibX.id),
            "x",
            sibXW,
            a.parentW,
            app.resp?.(sib?.settings?.width) ?? sib?.settings?.width,
          );
        } else if (a.xEdge === "w") {
          lb123SetMarginSide(n, "left", ml);
          const live2 = lb123Node(a.id);
          if (live2) live2.style.setProperty("margin-left", Math.round(ml) + "px", "important");
        }
      }
      if (a.yEdge) {
        lb123ApplySize(n, lb123Node(a.id), "y", h, a.parentH, "");
        if (a.sibY) {
          const sib = app.locate(app.state.root, a.sibY.id)?.node;
          lb123ApplySize(sib, lb123Node(a.sibY.id), "y", sibYH, a.parentH, "");
        } else if (a.yEdge === "n") {
          lb123SetMarginSide(n, "top", mt);
          const live2 = lb123Node(a.id);
          if (live2) live2.style.setProperty("margin-top", Math.round(mt) + "px", "important");
        }
      }
      const live = lb123Node(a.id);
      if (live) {
        const inner = live.querySelector(":scope > .lb-grid-inner, :scope > .lb-container-inner");
        if (inner && (n.type === "grid" || n.settings?.layout === "grid") && !a.sibX && !a.sibY) {
          if (a.startRows && a.startRows.length && a.yEdge) {
            const rows = a.startRows.slice();
            const dh = h - a.startH;
            if (a.yEdge === "s") rows[rows.length - 1] = Math.max(LB123_MIN, a.startRows[a.startRows.length - 1] + dh);
            else if (a.yEdge === "n") rows[0] = Math.max(LB123_MIN, a.startRows[0] + dh);
            const css = rows.map((v) => Math.round(v) + "px").join(" ");
            inner.style.setProperty("grid-template-rows", css, "important");
            lb123ResponsiveSet(n, "grid_template_rows", css);
          }
          if (a.startCols && a.startCols.length && a.xEdge) {
            const cols = a.startCols.slice();
            const dw = w - a.startW;
            if (a.xEdge === "e") cols[cols.length - 1] = Math.max(LB123_MIN, a.startCols[a.startCols.length - 1] + dw);
            else cols[0] = Math.max(LB123_MIN, a.startCols[0] + dw);
            const css = cols.map((v) => Math.round(v) + "px").join(" ");
            inner.style.setProperty("grid-template-columns", css, "important");
            lb123ResponsiveSet(n, "grid_template_columns", css);
          }
          const overlay = a.doc.getElementById("lb23-grid-overlay");
          if (overlay) {
            const ir = inner.getBoundingClientRect();
            overlay.style.width = Math.round(ir.width) + "px";
            overlay.style.height = Math.round(ir.height) + "px";
            if (inner.style.gridTemplateRows) overlay.style.gridTemplateRows = inner.style.gridTemplateRows;
            if (inner.style.gridTemplateColumns) overlay.style.gridTemplateColumns = inner.style.gridTemplateColumns;
          }
        }
        lb123PlaceBoxHandles(a.doc, live);
        const lr = live.getBoundingClientRect();
        let tx = lr.left + lr.width / 2,
          ty = lr.top;
        if (a.xEdge === "e") {
          tx = lr.right;
          ty = lr.top + lr.height / 2;
        } else if (a.xEdge === "w") {
          tx = lr.left;
          ty = lr.top + lr.height / 2;
        }
        if (a.yEdge === "s") {
          tx = lr.left + lr.width / 2;
          ty = lr.bottom;
        } else if (a.yEdge === "n") {
          tx = lr.left + lr.width / 2;
          ty = lr.top;
        }
        const bits = [];
        if (a.xEdge) bits.push(Math.round((w / a.parentW) * 1e3) / 10 + "%");
        if (a.yEdge) bits.push(Math.round(h) + "px");
        lb123Tip(a.doc, bits.join(" \xD7 ") || "", tx, ty);
      }
    }
    function lb123UnitEnd(e, move, up) {
      const a = lb123Resize;
      if (!a || a.kind !== "unit") return;
      a.doc.removeEventListener("pointermove", move, true);
      a.doc.removeEventListener("pointerup", up, true);
      a.doc.removeEventListener("pointercancel", up, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      a.doc.body.classList.remove("lb123-resizing", "lb123-resizing-x", "lb123-resizing-y");
      document.body.classList.remove("lb123-resizing", "lb123-resizing-x", "lb123-resizing-y");
      a.handle?.classList?.remove("is-dragging");
      a.doc.getElementById("lb123-size-tip")?.remove();
      const r = app.locate(app.state.root, a.id);
      if (r) app.selected = a.id;
      lb123Resize = null;
      lb123Finish();
      app.render();
    }
    function lb123GridTrackHandles(fd, grid) {
      if (!grid || lb123Resize) return;
      const inner = grid.querySelector(":scope > .lb-grid-inner, :scope > .lb-container-inner");
      if (!inner) return;
      lb123ResizeCSS(fd);
      if (fd.defaultView.getComputedStyle(inner).position === "static") inner.style.position = "relative";
      const s = app.locate(app.state.root, grid.dataset.id)?.node?.settings || {};
      const x = lb123TrackInfo(inner, "x", Math.max(1, Math.min(24, parseInt(app.resp(s.columns || 3), 10) || 3)));
      const y = lb123TrackInfo(
        inner,
        "y",
        Math.max(1, Math.min(24, parseInt(app.resp(s.grid_rows || s.rows || 3), 10) || 3)),
      );
      const rect = inner.getBoundingClientRect();
      const page = lb123Page(fd);
      const cols = x.tracks.length,
        rows = y.tracks.length;
      let pos = 0;
      for (let i = 1; i < cols; i++) {
        pos += x.tracks[i - 1] + x.gap;
        const h = fd.createElement("span");
        h.className = "lb123-grid-track-handle x";
        h.style.left = Math.round(rect.left + page.x + pos - 7) + "px";
        h.style.top = Math.round(rect.top + page.y + 18) + "px";
        h.style.height = Math.round(Math.max(12, rect.height - 36)) + "px";
        h.dataset.axis = "x";
        h.dataset.index = String(i);
        h.title = "Resize column boundary " + i;
        h.addEventListener(
          "pointerdown",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
              h.setPointerCapture(e.pointerId);
            } catch (err) {}
            lb123StartTrackResize(e, inner, "x", i, cols, rows);
          },
          true,
        );
        fd.body.appendChild(h);
      }
      pos = 0;
      for (let i = 1; i < rows; i++) {
        pos += y.tracks[i - 1] + y.gap;
        const h = fd.createElement("span");
        h.className = "lb123-grid-track-handle y";
        h.style.left = Math.round(rect.left + page.x + 18) + "px";
        h.style.top = Math.round(rect.top + page.y + pos - 8) + "px";
        h.style.width = Math.round(Math.max(12, rect.width - 36)) + "px";
        h.dataset.axis = "y";
        h.dataset.index = String(i);
        h.title = "Resize row boundary " + i;
        h.addEventListener(
          "pointerdown",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
              h.setPointerCapture(e.pointerId);
            } catch (err) {}
            lb123StartTrackResize(e, inner, "y", i, cols, rows);
          },
          true,
        );
        fd.body.appendChild(h);
      }
    }
    function lb123StartTrackResize(e, inner, axis, index, cols, rows) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
      const grid = inner.closest(".lb-node");
      if (!grid) return;
      const r = app.locate(app.state.root, grid.dataset.id);
      if (!r) return;
      const count = axis === "x" ? cols : rows;
      const info = lb123TrackInfo(inner, axis, count);
      if (info.tracks.length < 2 || index < 1 || index >= info.tracks.length) return;
      lb123HistoryStart();
      lb123Resize = {
        kind: "track",
        gridId: grid.dataset.id,
        inner,
        axis,
        index,
        cols,
        rows,
        startX: e.clientX,
        startY: e.clientY,
        tracks: info.tracks.slice(),
        gap: info.gap,
        doc: inner.ownerDocument,
        pointerId: e.pointerId,
      };
      inner.ownerDocument.body.classList.add("lb123-resizing", "lb123-resizing-" + axis);
      document.body.classList.add("lb123-resizing", "lb123-resizing-" + axis);
      (e.currentTarget || e.target)?.classList?.add("is-dragging");
      const handle = e.currentTarget;
      const move = (ev) => lb123TrackMove(ev);
      const up = (ev) => lb123TrackEnd(ev, move, up, handle);
      if (handle && handle.addEventListener) {
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", up);
      }
      inner.ownerDocument.addEventListener("pointermove", move, true);
      inner.ownerDocument.addEventListener("pointerup", up, true);
      inner.ownerDocument.addEventListener("pointercancel", up, true);
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    }
    function lb123TrackMove(e) {
      const a = lb123Resize;
      if (!a || a.kind !== "track") return;
      e.preventDefault();
      e.stopPropagation();
      const delta = a.axis === "x" ? e.clientX - a.startX : e.clientY - a.startY;
      const tracks = a.tracks.slice(),
        i = a.index - 1;
      if (!Number.isFinite(tracks[i]) || !Number.isFinite(tracks[i + 1])) return;
      const totalPair = tracks[i] + tracks[i + 1];
      const next = lb123Clamp(tracks[i] + delta, LB123_MIN, Math.max(LB123_MIN, totalPair - LB123_MIN));
      tracks[i] = next;
      tracks[i + 1] = totalPair - next;
      const css = tracks.map((v) => Math.max(1, Math.round(v)) + "px").join(" ");
      const r = app.locate(app.state.root, a.gridId);
      if (!r) return;
      const key = a.axis === "x" ? "grid_template_columns" : "grid_template_rows";
      const cssProp = a.axis === "x" ? "grid-template-columns" : "grid-template-rows";
      lb123ResponsiveSet(r.node, key, css);
      a.inner.style.setProperty(cssProp, css, "important");
      const total = tracks.reduce((s, v) => s + v, 0) + a.gap * Math.max(0, tracks.length - 1);
      if (a.axis === "y") {
        a.inner.style.setProperty("min-height", Math.round(total) + "px", "important");
        const host = a.inner.closest(".lb-node");
        if (host) host.style.setProperty("min-height", Math.round(total) + "px", "important");
        lb123ResponsiveSet(r.node, "min_height", Math.round(total) + "px");
      }
      const overlay = a.doc.getElementById("lb23-grid-overlay");
      if (overlay) {
        overlay.style.setProperty(cssProp, css);
        if (a.axis === "y") overlay.style.height = Math.round(total) + "px";
        else overlay.style.width = Math.round(total) + "px";
      }
      const rect = a.inner.getBoundingClientRect();
      const page = lb123Page(a.doc);
      let p = 0;
      const hs = [...a.doc.querySelectorAll(".lb123-grid-track-handle." + (a.axis === "x" ? "x" : "y"))];
      hs.forEach((h, idx) => {
        p += tracks[idx] + a.gap;
        if (a.axis === "x") {
          h.style.left = Math.round(rect.left + page.x + p - 7) + "px";
          h.style.top = Math.round(rect.top + page.y + 18) + "px";
          h.style.height = Math.round(Math.max(12, rect.height - 36)) + "px";
        } else {
          h.style.left = Math.round(rect.left + page.x + 18) + "px";
          h.style.top = Math.round(rect.top + page.y + p - 8) + "px";
          h.style.width = Math.round(Math.max(12, rect.width - 36)) + "px";
        }
      });
    }
    function lb123TrackEnd(e, move, up, handle) {
      const a = lb123Resize;
      if (!a || a.kind !== "track") return;
      a.doc.removeEventListener("pointermove", move, true);
      a.doc.removeEventListener("pointerup", up, true);
      a.doc.removeEventListener("pointercancel", up, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      if (handle && handle.removeEventListener) {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      }
      a.doc.body.classList.remove("lb123-resizing", "lb123-resizing-x", "lb123-resizing-y");
      document.body.classList.remove("lb123-resizing", "lb123-resizing-x", "lb123-resizing-y");
      a.doc.querySelectorAll(".lb123-grid-track-handle.is-dragging").forEach((h) => h.classList.remove("is-dragging"));
      lb123Resize = null;
      lb123Finish();
      app.render();
    }
    function lb123Install() {
      if (lb123Resize) return;
      const fd = lb123Doc();
      if (!fd) return;
      lb123RemoveHandles(fd);
      lb123ResizeCSS(fd);
      if (!app.selected) return;
      const node = lb123Node(app.selected);
      if (!node) return;
      const kind = node.dataset.type;
      const isGrid =
        kind === "grid" ||
        (kind === "container" && app.locate(app.state.root, app.selected)?.node?.settings?.layout === "grid");
      if (kind === "image" && node.querySelector("img")) lb123AddImageHandles(fd, node);
      else if (kind === "tinymce_text_editor") lb123AddTinyHandles(fd, node);
      else {
        lb123AddBoxHandles(fd, node);
        if (isGrid) lb123GridTrackHandles(fd, node);
      }
    }
    function lb123Bind() {
      const f = lb123Frame();
      if (!f) return;
      const refresh = () => setTimeout(lb123Install, 30);
      if (!f.__lb123Load) {
        f.__lb123Load = true;
        f.addEventListener("load", refresh);
      }
      const fd = lb123Doc();
      if (fd && !fd.__lb123Scroll) {
        fd.__lb123Scroll = true;
        const relocate = () => {
          if (lb123Resize) return;
          const node = app.selected && lb123Node(app.selected);
          if (node && fd.querySelector(".lb123-box-handle")) lb123PlaceBoxHandles(fd, node);
        };
        fd.addEventListener("scroll", relocate, true);
        fd.documentElement?.addEventListener("scroll", relocate);
        fd.defaultView?.addEventListener("scroll", relocate);
        fd.defaultView?.addEventListener("resize", relocate);
      }
      refresh();
    }
    const oldSelect123 = app.selectNode;
    app.selectNode = function (id) {
      oldSelect123(id);
      if (!lb123Resize) lb123Install();
    };
    const oldRender123 = app.render;
    app.render = function () {
      oldRender123();
      if (!lb123Resize) requestAnimationFrame(lb123Install);
    };
    lb123Bind();
  })();
  (function () {
    const lb14OldSettings = app.settingsHTML;
    const lb14OldRender = app.render;
    function lb14ChildSettings(direction, size) {
      return {
        layout: "flex",
        direction: "column",
        wrap: "nowrap",
        justify: "flex-start",
        align: "stretch",
        gap: 16,
        column_gap: 16,
        row_gap: 16,
        width: direction === "row" ? "auto" : "100%",
        flex_grow: 1,
        flex_shrink: 1,
        flex_basis: "0px",
        min_height: direction === "column" ? size : "",
        padding: [],
        margin: [],
        background: "",
      };
    }
    function lb14NewChild(direction, size) {
      const e = app.meta("container");
      return {
        id: app.eid(),
        type: "container",
        settings: lb14ChildSettings(direction, size),
        atomic: true,
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
        children: [],
      };
    }
    function lb14StructurePanel(n) {
      if (!n || n.type !== "container" || app.styleTab !== "content") return "";
      const count = n.children?.length || 0;
      return `<section class="lb14-structure-section">
      <div class="lb14-structure-title"><strong>Container Structure</strong><span>${count} child${count === 1 ? "" : "ren"}</span></div>
      <p class="lb14-structure-help">Divide this container into columns or rows using child containers. This is the same structural model used by modern visual builders: the parent controls the direction and the child containers form the divisions.</p>
      <div class="lb14-structure-presets">
        <button type="button" class="lb14-preset" data-lb14-split="row:2"><span class="lb14-icon-grid cols2"></span><b>2 Columns</b><small>50 / 50</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="row:3"><span class="lb14-icon-grid cols3"></span><b>3 Columns</b><small>1 / 1 / 1</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="row:4"><span class="lb14-icon-grid cols4"></span><b>4 Columns</b><small>1 / 1 / 1 / 1</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="column:2"><span class="lb14-icon-grid rows2"></span><b>2 Rows</b><small>50 / 50</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="column:3"><span class="lb14-icon-grid rows3"></span><b>3 Rows</b><small>1 / 1 / 1</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="grid:2x2"><span class="lb14-icon-grid grid2x2"></span><b>2 \xD7 2</b><small>4 cells</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="grid:3x2"><span class="lb14-icon-grid grid3x2"></span><b>3 \xD7 2</b><small>6 cells</small></button>
        <button type="button" class="lb14-preset" data-lb14-split="grid:2x3"><span class="lb14-icon-grid grid2x3"></span><b>2 \xD7 3</b><small>6 cells</small></button>
      </div>
      <div class="lb14-custom-split">
        <label>Custom columns <input type="number" min="1" max="12" value="2" data-lb14-cols></label>
        <label>Custom rows <input type="number" min="1" max="12" value="1" data-lb14-rows></label>
        <button type="button" class="lb-btn primary" id="lb14-apply-custom">Divide Container</button>
      </div>
      <div class="lb14-structure-actions">
        <button type="button" class="lb-btn" id="lb14-add-column">+ Add Column</button>
        <button type="button" class="lb-btn" id="lb14-add-row">+ Add Row</button>
      </div>
      <div class="lb14-structure-note">Existing child units are kept. If this container already contains content, the existing children are moved into the first new child container.</div>
    </section>`;
    }
    app.settingsHTML = function () {
      let h = lb14OldSettings();
      if (app.selected) {
        const r = app.locate(app.state.root, app.selected);
        if (r && r.node.type === "container") h += lb14StructurePanel(r.node);
      }
      return h;
    };
    function lb14SplitContainer(id, mode, a, b) {
      const r = app.locate(app.state.root, id);
      if (!r || r.node.type !== "container") return;
      const oldChildren = Array.isArray(r.node.children) ? r.node.children.slice() : [];
      const children = [];
      if (mode === "row" || mode === "column") {
        const count = Math.max(1, Math.min(12, Number(a) || 2));
        for (let i = 0; i < count; i++) children.push(lb14NewChild(mode === "row" ? "row" : "column", ""));
        if (oldChildren.length) children[0].children = oldChildren;
        app.commit();
        r.node.children = children;
        r.node.settings = r.node.settings || {};
        r.node.settings.layout = "flex";
        r.node.settings.direction = mode === "row" ? "row" : "column";
        r.node.settings.wrap = "nowrap";
        r.node.settings.gap = Number(r.node.settings.gap || 16);
      } else {
        const cols = Math.max(1, Math.min(12, Number(a) || 2)),
          rows = Math.max(1, Math.min(12, Number(b) || 2));
        for (let i = 0; i < cols * rows; i++) children.push(lb14NewChild("column", ""));
        if (oldChildren.length) children[0].children = oldChildren;
        app.commit();
        r.node.children = children;
        r.node.settings = r.node.settings || {};
        r.node.settings.layout = "grid";
        r.node.settings.columns = cols;
        r.node.settings.grid_rows = rows;
        r.node.settings.column_gap = Number(r.node.settings.column_gap ?? r.node.settings.gap ?? 16);
        r.node.settings.row_gap = Number(r.node.settings.row_gap ?? r.node.settings.gap ?? 16);
      }
      app.selected = r.node.id;
      app.activeTab = "settings";
      app.render();
    }
    function lb14AddDivision(id, axis) {
      const r = app.locate(app.state.root, id);
      if (!r || r.node.type !== "container") return;
      const old = Array.isArray(r.node.children) ? r.node.children : [];
      app.commit();
      if (r.node.settings?.layout === "grid") {
        const cols = Math.max(1, Number(r.node.settings.columns) || 2),
          rows = Math.max(1, Number(r.node.settings.grid_rows) || 1);
        if (axis === "row") {
          const add = [];
          for (let i = 0; i < cols; i++) add.push(lb14NewChild("column", ""));
          r.node.children = old.concat(add);
          r.node.settings.grid_rows = rows + 1;
        } else {
          const add = [];
          for (let i = 0; i < rows; i++) add.push(lb14NewChild("column", ""));
          r.node.children = old.concat(add);
          r.node.settings.columns = cols + 1;
        }
      } else {
        const direction = r.node.settings?.direction === "column" ? "column" : "row";
        r.node.children = old.concat([lb14NewChild(direction, "")]);
      }
      app.selected = r.node.id;
      app.render();
    }
    function lb14Bind() {
      app.root.querySelectorAll("[data-lb14-split]").forEach((btn) => {
        if (btn.__lb14) return;
        btn.__lb14 = true;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const r = app.locate(app.state.root, app.selected);
          if (!r || r.node.type !== "container") return;
          const [mode, val] = btn.dataset.lb14Split.split(":");
          if (
            (r.node.children || []).length &&
            !window.confirm(
              "This container already contains content. Keep it by moving the existing content into the first new cell?",
            )
          )
            return;
          if (mode === "grid") {
            const [c, rr] = val.split("x").map(Number);
            lb14SplitContainer(app.selected, "grid", c, rr);
          } else lb14SplitContainer(app.selected, mode, Number(val));
        });
      });
      app.root.querySelector("#lb14-apply-custom")?.addEventListener("click", (e) => {
        e.preventDefault();
        const c = Math.max(1, Math.min(12, Number(app.root.querySelector("[data-lb14-cols]")?.value) || 2));
        const rr = Math.max(1, Math.min(12, Number(app.root.querySelector("[data-lb14-rows]")?.value) || 1));
        const r = app.locate(app.state.root, app.selected);
        if (!r || r.node.type !== "container") return;
        if (
          (r.node.children || []).length &&
          !window.confirm(
            "This container already contains content. Keep it by moving the existing content into the first new cell?",
          )
        )
          return;
        if (rr === 1) lb14SplitContainer(app.selected, "row", c);
        else lb14SplitContainer(app.selected, "grid", c, rr);
      });
      app.root
        .querySelector("#lb14-add-column")
        ?.addEventListener("click", () => lb14AddDivision(app.selected, "column"));
      app.root.querySelector("#lb14-add-row")?.addEventListener("click", () => lb14AddDivision(app.selected, "row"));
    }
    const lb14PrevRender = app.render;
    app.render = function () {
      lb14PrevRender();
      setTimeout(lb14Bind, 0);
    };
    const st = document.createElement("style");
    st.textContent = `
    .lb14-structure-section{margin:16px 0;padding:14px;border:1px solid #d9dee7;border-radius:8px;background:#fff}
    .lb14-structure-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.lb14-structure-title span{font-size:11px;color:#788393}
    .lb14-structure-help,.lb14-structure-note{font-size:12px;line-height:1.45;color:#697586;margin:8px 0}
    .lb14-structure-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}
    .lb14-preset{background:#fff;border:1px solid #d7dce4;border-radius:6px;padding:8px 6px;cursor:pointer;text-align:left;display:grid;grid-template-columns:34px 1fr;grid-template-rows:auto auto;column-gap:7px;align-items:center}
    .lb14-preset:hover{border-color:#2d72d9;background:#f7faff}.lb14-preset b{font-size:12px}.lb14-preset small{font-size:10px;color:#7b8491}
    .lb14-icon-grid{grid-row:1 / span 2;width:32px;height:25px;border:1px dashed #8c97a5;display:grid;gap:1px;background:#fff;padding:1px}
    .lb14-icon-grid:before{content:'';display:block;background:#dfe7f2;grid-column:1;grid-row:1}.lb14-icon-grid.cols2{grid-template-columns:1fr 1fr}.lb14-icon-grid.cols3{grid-template-columns:1fr 1fr 1fr}.lb14-icon-grid.cols4{grid-template-columns:1fr 1fr 1fr 1fr}.lb14-icon-grid.rows2{grid-template-rows:1fr 1fr}.lb14-icon-grid.rows3{grid-template-rows:1fr 1fr 1fr}.lb14-icon-grid.grid2x2{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.lb14-icon-grid.grid3x2{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}.lb14-icon-grid.grid2x3{grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr)}
    .lb14-custom-split{display:grid;grid-template-columns:1fr 1fr;gap:7px;align-items:end;margin-top:10px}.lb14-custom-split label{font-size:11px;color:#5d6877}.lb14-custom-split input{width:100%;box-sizing:border-box;margin-top:4px}.lb14-custom-split #lb14-apply-custom{grid-column:1 / -1}
    .lb14-structure-actions{display:flex;gap:7px;margin-top:8px}.lb14-structure-actions .lb-btn{flex:1}
  `;
    document.head.appendChild(st);
    lb14Bind();
  })();
  (function () {
    let lb15CellTarget = null;
    let lb15Bound = false;
    function lb15Value(v) {
      return v && typeof v === "object" ? (v[app.device] ?? v.desktop ?? "") : (v ?? "");
    }
    function lb15Node(id) {
      const fd = app.frameDoc();
      return fd?.querySelector('.lb-node[data-id="' + CSS.escape(String(id)) + '"]') || null;
    }
    function lb15GridNode2(id) {
      const n = lb15Node(id);
      return n?.dataset.type === "grid" ? n : null;
    }
    function lb15GridMetrics2(inner) {
      const cs = inner.ownerDocument.defaultView.getComputedStyle(inner),
        rect = inner.getBoundingClientRect();
      const cols =
        String(cs.gridTemplateColumns || "")
          .match(/-?\d*\.?\d+px/g)
          ?.map(parseFloat)
          .filter(Number.isFinite) || [];
      const rows =
        String(cs.gridTemplateRows || "")
          .match(/-?\d*\.?\d+px/g)
          ?.map(parseFloat)
          .filter(Number.isFinite) || [];
      const cCount = Math.max(
        1,
        cols.length ||
          parseInt(inner.closest(".lb-node")?.querySelector(":scope > .lb-grid-inner")?.dataset?.cols || "", 10) ||
          3,
      );
      const rCount = Math.max(1, rows.length || 3);
      const gapX = parseFloat(cs.columnGap) || 0,
        gapY = parseFloat(cs.rowGap) || 0;
      const contentW =
        rect.width -
        (parseFloat(cs.paddingLeft) || 0) -
        (parseFloat(cs.paddingRight) || 0) -
        (parseFloat(cs.borderLeftWidth) || 0) -
        (parseFloat(cs.borderRightWidth) || 0);
      const contentH =
        rect.height -
        (parseFloat(cs.paddingTop) || 0) -
        (parseFloat(cs.paddingBottom) || 0) -
        (parseFloat(cs.borderTopWidth) || 0) -
        (parseFloat(cs.borderBottomWidth) || 0);
      const norm = (a, count, total, gap) => {
        if (a.length === count) return a;
        const v = Math.max(1, (total - gap * Math.max(0, count - 1)) / count);
        return Array(count).fill(v);
      };
      return {
        rect,
        cols: norm(cols, cCount, contentW, gapX),
        rows: norm(rows, rCount, contentH, gapY),
        gapX,
        gapY,
        contentLeft: rect.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0),
        contentTop: rect.top + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.borderTopWidth) || 0),
      };
    }
    function lb15TrackAt(value, tracks, gap) {
      let p = 0;
      for (let i = 0; i < tracks.length; i++) {
        const end = p + tracks[i];
        if (value <= end + gap / 2) return i + 1;
        p = end + gap;
      }
      return tracks.length;
    }
    function lb15CellFromPoint(inner, x, y) {
      const g = lb15GridMetrics2(inner);
      return {
        row: lb15TrackAt(y - g.contentTop, g.rows, g.gapY),
        col: lb15TrackAt(x - g.contentLeft, g.cols, g.gapX),
      };
    }
    function lb15SetCellVisual2(inner, cell) {
      let guide = inner.querySelector(":scope > .lb15-cell-target");
      if (!guide) {
        guide = inner.ownerDocument.createElement("div");
        guide.className = "lb15-cell-target";
        guide.setAttribute("aria-hidden", "true");
        inner.appendChild(guide);
      }
      const g = lb15GridMetrics2(inner),
        r = Math.max(1, Math.min(g.rows.length, cell.row)),
        c = Math.max(1, Math.min(g.cols.length, cell.col));
      let x = 0;
      for (let i = 0; i < c - 1; i++) x += g.cols[i] + g.gapX;
      let y = 0;
      for (let i = 0; i < r - 1; i++) y += g.rows[i] + g.gapY;
      guide.style.left = x + "px";
      guide.style.top = y + "px";
      guide.style.width = g.cols[c - 1] + "px";
      guide.style.height = g.rows[r - 1] + "px";
      guide.style.display = "block";
    }
    function lb15ClearCellVisual2(inner) {
      inner?.querySelector(":scope > .lb15-cell-target")?.remove();
    }
    function lb15AddAtGridCell(type, gridId, cell) {
      if (app.proUnitLocked(type)) return;
      const p = app.locate(app.state.root, gridId);
      if (!p || p.node.type !== "grid") return;
      const e = app.meta(type);
      if (!e.type) return;
      const n = {
        id: app.eid(),
        type,
        settings: app.defaults(type),
        atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
      };
      if (e.children) n.children = [];
      app.commit();
      p.node.children = p.node.children || [];
      const cols = Math.max(
        1,
        lb15GridMetrics2(
          lb15GridNode2(gridId)?.querySelector(":scope > .lb-grid-inner") || document.createElement("div"),
        ).cols.length,
      );
      n.settings.grid_column_start = Math.max(1, Math.min(cols, cell.col));
      n.settings.grid_column_span = 1;
      n.settings.grid_row_start = Math.max(1, cell.row);
      n.settings.grid_row_span = 1;
      p.node.children.push(n);
      app.selected = n.id;
      app.activeTab = "settings";
      lb15CellTarget = null;
      app.render();
    }
    function lb15StableNodeHTML() {
      const old = app.nodeHTML;
      app.nodeHTML = function (n) {
        let html = old(n),
          extra = "";
        const s = n.settings || {};
        const r = app.locate(app.state.root, n.id),
          parent = r?.parent;
        const rv = (k) => lb15Value(s[k]);
        if (parent?.type === "grid") {
          const cs = rv("grid_column_start"),
            rs = rv("grid_row_start"),
            cspan = Number(rv("grid_column_span") || 1),
            rspan = Number(rv("grid_row_span") || 1);
          extra += "min-width:0;max-width:100%;";
          if (cs) extra += "grid-column-start:" + app.esc(cs) + ";";
          if (rs) extra += "grid-row-start:" + app.esc(rs) + ";";
          extra += "grid-column-end:span " + Math.max(1, cspan) + ";grid-row-end:span " + Math.max(1, rspan) + ";";
          extra += "justify-self:" + (s.justify_self || "stretch") + ";align-self:" + (s.align_self || "stretch") + ";";
        }
        if (n.type === "container" || n.type === "grid") {
          const w = rv("width"),
            mh = rv("min_height"),
            mw = rv("max_width");
          if (w) extra += "width:" + app.esc(w) + ";";
          if (mh) extra += "min-height:" + app.esc(mh) + ";";
          if (mw) extra += "max-width:" + app.esc(mw) + ";";
          const margin = app.formatBox(s.margin);
          if (margin && margin !== "0 0 0 0") extra += "margin:" + margin + ";";
          if (parent?.type === "container" && parent.settings?.layout !== "grid") {
            const cw = String(w || "").trim();
            if (cw && cw !== "auto") extra += "flex-grow:0;flex-shrink:0;flex-basis:" + app.esc(cw) + ";";
          }
          extra += "box-sizing:border-box;min-width:0;";
        }
        if (!extra) return html;
        const attr = 'data-id="' + app.esc(n.id) + '"';
        return html.replace(attr, attr + ' style="' + extra + '"');
      };
    }
    lb15StableNodeHTML();
    const lb16OldNodeHTML = app.nodeHTML;
    app.nodeHTML = function (n) {
      let html = lb16OldNodeHTML(n);
      const r = app.locate(app.state.root, n.id),
        parent = r?.parent,
        s = n.settings || {};
      if (parent?.type !== "grid") return html;
      const rv = (k) => lb15Value(s[k]);
      const cs = Math.max(1, Number(rv("grid_column_start") || 1));
      const rs = Math.max(1, Number(rv("grid_row_start") || 1));
      const cspan = Math.max(1, Number(rv("grid_column_span") || 1));
      const rspan = Math.max(1, Number(rv("grid_row_span") || 1));
      const selfJ = rv("justify_self") || "stretch",
        selfA = rv("align_self") || "stretch";
      const placement = `grid-column:${cs} / span ${cspan};grid-row:${rs} / span ${rspan};justify-self:${app.esc(selfJ)};align-self:${app.esc(selfA)};min-width:0;box-sizing:border-box;`;
      html = html.replace(/\sstyle="[^"]*"(?=\s|>)/, "");
      return html.replace(
        ' data-id="' + app.esc(n.id) + '"',
        ' data-id="' + app.esc(n.id) + '" style="' + placement + '"',
      );
    };
    function lb16GridDropPlacement(inner, x, y) {
      const g = lb15GridMetrics2(inner);
      const localX = x - g.contentLeft,
        localY = y - g.contentTop;
      let col = 1,
        row = 1,
        cur = 0;
      for (let i = 0; i < g.cols.length; i++) {
        const end = cur + g.cols[i];
        if (localX <= end + g.gapX / 2) {
          col = i + 1;
          break;
        }
        cur = end + g.gapX;
        col = i + 1;
      }
      cur = 0;
      for (let i = 0; i < g.rows.length; i++) {
        const end = cur + g.rows[i];
        if (localY <= end + g.gapY / 2) {
          row = i + 1;
          break;
        }
        cur = end + g.gapY;
        row = i + 1;
      }
      return { col, row };
    }
    function lb16GridChildResizeStart(e, node) {
      if (document.body.classList.contains("lb123-resizing")) return false;
      if (
        e.target &&
        e.target.closest &&
        e.target.closest(".lb123-grid-track-handle,.lb123-box-handle,.lb123-resize-handle")
      )
        return false;
      const selectedNode = app.selected && app.locate(app.state.root, app.selected)?.node;
      if (
        selectedNode &&
        (selectedNode.type === "grid" ||
          (selectedNode.type === "container" && selectedNode.settings?.layout === "grid"))
      )
        return false;
      const r = app.locate(app.state.root, node.dataset.id);
      if (!r || r.parent?.type !== "grid") return false;
      if (r.node.type === "tinymce_text_editor" || r.node.type === "image") return false;
      const gridNode = lb15GridNode2(r.parent.id),
        inner = gridNode?.querySelector(":scope > .lb-grid-inner");
      if (!inner) return false;
      const rect = node.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top,
        edge = 10;
      const side = x < edge ? "w" : x > rect.width - edge ? "e" : y < edge ? "n" : y > rect.height - edge ? "s" : "";
      if (!side) return false;
      e.preventDefault();
      e.stopImmediatePropagation();
      const gm = lb15GridMetrics2(inner),
        start = { ...lb16GridDropPlacement(inner, e.clientX, e.clientY) };
      const s = r.node.settings || {};
      const original = {
        cs: Number(lb15Value(s.grid_column_start) || start.col),
        rs: Number(lb15Value(s.grid_row_start) || start.row),
        cspan: Number(lb15Value(s.grid_column_span) || 1),
        rspan: Number(lb15Value(s.grid_row_span) || 1),
      };
      const startX = e.clientX,
        startY = e.clientY;
      node.ownerDocument.body.classList.add("lb123-resizing");
      const move = (ev) => {
        const dx = ev.clientX - startX,
          dy = ev.clientY - startY;
        const colStep = Math.max(
          20,
          (gm.cols.reduce((a, b) => a + b, 0) + gm.gapX * (gm.cols.length - 1)) / gm.cols.length + gm.gapX,
        );
        const rowStep = Math.max(
          20,
          (gm.rows.reduce((a, b) => a + b, 0) + gm.gapY * (gm.rows.length - 1)) / gm.rows.length + gm.gapY,
        );
        let cs = original.cs,
          rs = original.rs,
          csn = original.cspan,
          rsn = original.rspan;
        if (side === "e") csn = Math.max(1, Math.min(gm.cols - cs + 1, original.cspan + Math.round(dx / colStep)));
        if (side === "w") {
          const d = Math.round(-dx / colStep);
          cs = Math.max(1, Math.min(original.cs + original.cspan - 1, original.cs - d));
          csn = original.cspan + (original.cs - cs);
        }
        if (side === "s") rsn = Math.max(1, Math.min(gm.rows - rs + 1, original.rspan + Math.round(dy / rowStep)));
        if (side === "n") {
          const d = Math.round(-dy / rowStep);
          rs = Math.max(1, Math.min(original.rs + original.rspan - 1, original.rs - d));
          rsn = original.rspan + (original.rs - rs);
        }
        r.node.settings.grid_column_start = cs;
        r.node.settings.grid_column_span = csn;
        r.node.settings.grid_row_start = rs;
        r.node.settings.grid_row_span = rsn;
        app.dirty = true;
        app.render();
      };
      const up = () => {
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", up, true);
        node.ownerDocument.body.classList.remove("lb123-resizing");
        app.scheduleSave();
      };
      document.addEventListener("pointermove", move, true);
      document.addEventListener("pointerup", up, true);
      return true;
    }
    function lb16InstallGridChildResize() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-inner > .lb-node").forEach((node) => {
        if (node.__lb16Resize) return;
        node.__lb16Resize = true;
        node.addEventListener(
          "pointerdown",
          (e) => {
            if (lb16GridChildResizeStart(e, node)) e.stopImmediatePropagation();
          },
          true,
        );
      });
    }
    function lb16Refresh() {
      lb15Refresh();
      lb16InstallGridChildResize();
    }
    function lb16InstallGridTargeting() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-inner").forEach((inner) => {
        inner.addEventListener(
          "dragover",
          (e) => {
            const v = e.dataTransfer?.getData("text/plain") || "";
            if (!v.startsWith("unit:")) return;
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb16GridDropPlacement(inner, e.clientX, e.clientY);
            lb15CellTarget = { gridId: grid.dataset.id, row: cell.row, col: cell.col };
          },
          true,
        );
      });
    }
    const lb16OldRender = app.render;
    app.render = function () {
      lb16OldRender();
      requestAnimationFrame(lb16Refresh);
    };
    lb16InstallGridTargeting = function () {};
    lb16Refresh();
    function lb16Css() {
      const fd = app.frameDoc();
      if (!fd || fd.getElementById("lb16-grid-style")) return;
      const st = fd.createElement("style");
      st.id = "lb16-grid-style";
      st.textContent = `
      .lb-grid-inner{position:relative;}
      .lb-grid-inner>.lb-node:not(.lb-node-image):not(.lb-node-flip_box):not(.lb-node-payment_form){width:auto!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;}
      .lb-grid-inner>.lb-node.lb-node-image{max-width:100%!important;min-width:0!important;box-sizing:border-box!important;}
      .lb-grid-inner>.lb-node.lb-node-image img{max-width:100%;}
      .lb-grid-inner>.lb-node.lb-node-heading,.lb-grid-inner>.lb-node.lb-node-text{width:auto!important;}
      .lb-grid-inner>.lb-node.is-selected{z-index:10;}
      .lb123-resizing,.lb123-resizing *{cursor:inherit!important;}
    `;
      fd.head.appendChild(st);
    }
    const lb16OldRefresh = lb16Refresh;
    lb16Refresh = function () {
      lb16OldRefresh();
      lb16Css();
      lb16InstallGridChildResize();
      lb16InstallGridTargeting();
    };
    setTimeout(lb16Refresh, 50);
    function lb16PatchAdd() {
      const oldAddAt = lb15AddAtGridCell;
      if (typeof oldAddAt !== "function") return;
    }
    function lb16EnsurePanelDrop() {
      const cards = app.root.querySelectorAll(".lb-unit-card");
      cards.forEach((card) => {
        if (card.__lb16) return;
        card.__lb16 = true;
        card.addEventListener(
          "dblclick",
          (e) => {
            if (e.target.closest("[data-fav]") || !lb15CellTarget) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            lb15AddAtGridCell(card.dataset.type, lb15CellTarget.gridId, {
              row: lb15CellTarget.row,
              col: lb15CellTarget.col,
            });
          },
          true,
        );
      });
    }
    let lb16PanelRaf = 0;
    const lb16PanelObserver = new MutationObserver(() => {
      if (lb16PanelRaf) return;
      lb16PanelRaf = requestAnimationFrame(() => {
        lb16PanelRaf = 0;
        lb16EnsurePanelDrop();
      });
    });
    lb16PanelObserver.observe(app.root, { childList: true, subtree: true });
    lb16EnsurePanelDrop();
    function lb15InstallGridTargeting() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-inner").forEach((inner) => {
        if (inner.__lb15) return;
        inner.__lb15 = true;
        inner.addEventListener(
          "pointermove",
          (e) => {
            if (e.target.closest(".lb-node") && e.target.closest(".lb-node") !== inner.closest(".lb-node")) return;
            const cell = lb15CellFromPoint(inner, e.clientX, e.clientY);
            lb15CellTarget = { gridId: inner.closest(".lb-node")?.dataset.id, row: cell.row, col: cell.col };
            lb15SetCellVisual2(inner, cell);
          },
          true,
        );
        inner.addEventListener(
          "pointerleave",
          () => {
            lb15CellTarget = null;
            lb15ClearCellVisual2(inner);
          },
          true,
        );
        inner.addEventListener(
          "click",
          (e) => {
            if (e.target.closest(".lb-node") && e.target.closest(".lb-node") !== inner.closest(".lb-node")) return;
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb15CellFromPoint(inner, e.clientX, e.clientY);
            lb15CellTarget = { gridId: grid.dataset.id, row: cell.row, col: cell.col };
            app.selectNode(grid.dataset.id);
            lb15SetCellVisual2(inner, cell);
          },
          true,
        );
        inner.addEventListener(
          "dragover",
          (e) => {
            const v = e.dataTransfer?.getData("text/plain") || "";
            if (!v.startsWith("unit:")) return;
            e.preventDefault();
            e.stopPropagation();
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb15CellFromPoint(inner, e.clientX, e.clientY);
            lb15CellTarget = { gridId: grid.dataset.id, row: cell.row, col: cell.col };
            lb15SetCellVisual2(inner, cell);
            e.dataTransfer.dropEffect = "copy";
          },
          true,
        );
        inner.addEventListener(
          "drop",
          (e) => {
            const v = e.dataTransfer?.getData("text/plain") || "";
            if (!v.startsWith("unit:")) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb15CellFromPoint(inner, e.clientX, e.clientY);
            lb15AddAtGridCell(v.slice(5), grid.dataset.id, cell);
          },
          true,
        );
      });
    }
    function lb15InstallPanelHandler() {
      if (lb15Bound) return;
      lb15Bound = true;
      app.root.addEventListener(
        "dblclick",
        (e) => {
          const card = e.target.closest(".lb-unit-card");
          if (!card || e.target.closest("[data-fav]")) return;
          if (lb15CellTarget) {
            e.preventDefault();
            e.stopImmediatePropagation();
            lb15AddAtGridCell(card.dataset.type, lb15CellTarget.gridId, {
              row: lb15CellTarget.row,
              col: lb15CellTarget.col,
            });
          }
        },
        true,
      );
    }
    function lb15HideGridInsertZone() {
      const fd = app.frameDoc();
      if (!fd || fd.getElementById("lb15-style")) return;
      const st = fd.createElement("style");
      st.id = "lb15-style";
      st.textContent = `
      .lb-grid-inner>.lb-insert-zone{display:none!important;}
      .lb-grid-inner>.lb-node{min-width:0!important;max-width:100%;}
      .lb15-cell-target{position:absolute!important;display:none;z-index:2147482990!important;pointer-events:none!important;box-sizing:border-box!important;border:2px solid rgba(45,114,217,.85)!important;background:rgba(45,114,217,.10)!important;}
    `;
      fd.head.appendChild(st);
    }
    function lb15Refresh() {
      lb15HideGridInsertZone();
      lb15InstallGridTargeting();
      lb15InstallPanelHandler();
    }
    const oldRender15 = app.render;
    app.render = function () {
      oldRender15();
      requestAnimationFrame(lb15Refresh);
    };
    const oldSelect15 = app.selectNode;
    app.selectNode = function (id) {
      oldSelect15(id);
    };
    lb15InstallPanelHandler = function () {};
    lb15InstallGridTargeting = function () {};
    lb15Refresh();
  })();
  (function () {
    "use strict";
    const lb17Val = (v) => (v && typeof v === "object" ? (v[app.device] ?? v.desktop ?? "") : (v ?? ""));
    const lb17Esc = (v) => app.esc(v);
    const lb17NodeDataId = (n) => String(n?.id || "");
    const lb17FindParent = (n) => (n ? app.locate(app.state.root, n.id)?.parent : null);
    const lb17PreviousNodeHTML = app.nodeHTML;
    app.nodeHTML = function (n) {
      let html = lb17PreviousNodeHTML(n);
      const parent = lb17FindParent(n),
        s = n.settings || {};
      if (parent?.type !== "grid") {
        if (n.type === "container" || n.type === "grid") {
          const w = lb17Val(s.width),
            mh = lb17Val(s.min_height),
            mw = lb17Val(s.max_width);
          if (w || mh || mw) {
            const m2 = html.match(/^<div\b[^>]*>/);
            if (m2) {
              let tag2 = m2[0].replace(/\sstyle="[^"]*"/, "");
              const extra = [
                w ? "width:" + lb17Esc(w) + ";" : "",
                mh ? "min-height:" + lb17Esc(mh) + ";" : "",
                mw ? "max-width:" + lb17Esc(mw) + ";" : "",
              ].join("");
              tag2 = tag2.replace(/>$/, ' style="' + extra + '">');
              html = tag2 + html.slice(m2[0].length);
            }
          }
        }
        return html;
      }
      const cs = Math.max(1, Number(lb17Val(s.grid_column_start) || 1));
      const rs = Math.max(1, Number(lb17Val(s.grid_row_start) || 1));
      const cspan = Math.max(1, Number(lb17Val(s.grid_column_span) || 1));
      const rspan = Math.max(1, Number(lb17Val(s.grid_row_span) || 1));
      const j = String(lb17Val(s.justify_self) || "stretch");
      const a = String(lb17Val(s.align_self) || "stretch");
      const placement = `grid-column:${cs} / span ${cspan};grid-row:${rs} / span ${rspan};justify-self:${lb17Esc(j)};align-self:${lb17Esc(a)};min-width:0;max-width:100%;box-sizing:border-box;`;
      const m = html.match(/^<div\b[^>]*>/);
      if (!m) return html;
      let tag = m[0].replace(/\sstyle="[^"]*"/g, "");
      tag = tag.replace(/>$/, ' style="' + placement + '">');
      return tag + html.slice(m[0].length);
    };
    function lb17GridAtPoint(inner, x, y) {
      // eslint-disable-next-line no-undef -- Known bug kept by the verbatim restore: the lb15* helpers are scoped to the IIFE above, so this name is unbound here.
      const g = lb15GridMetrics(inner);
      const lx = x - g.contentLeft,
        ly = y - g.contentTop;
      const pick = (v, tracks, gap) => {
        let p = 0;
        for (let i = 0; i < tracks.length; i++) {
          if (v >= p && v <= p + tracks[i]) return i + 1;
          p += tracks[i] + gap;
        }
        return tracks.length;
      };
      return { col: pick(lx, g.cols, g.gapX), row: pick(ly, g.rows, g.gapY) };
    }
    function lb17Add(type, gridId, cell) {
      if (app.proUnitLocked(type)) return;
      const p = app.locate(app.state.root, gridId);
      if (!p || p.node.type !== "grid") return;
      const e = app.meta(type);
      if (!e.type) return;
      const n = {
        id: app.eid(),
        type,
        settings: app.defaults(type),
        atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
      };
      if (e.children) n.children = [];
      /* eslint-disable no-undef -- Known bug kept by the verbatim restore: the lb15* helpers are scoped to the IIFE above, so these names are unbound here. */
      const g = lb15GridMetrics(
        lb15GridNode(gridId)?.querySelector(":scope > .lb-grid-inner") || document.createElement("div"),
      );
      /* eslint-enable no-undef */
      const cols = g.cols.length,
        rows = g.rows.length;
      n.settings.grid_column_start = Math.max(1, Math.min(cols, Number(cell.col) || 1));
      n.settings.grid_row_start = Math.max(1, Math.min(rows, Number(cell.row) || 1));
      n.settings.grid_column_span = 1;
      n.settings.grid_row_span = 1;
      n.settings.justify_self = n.settings.justify_self || "stretch";
      n.settings.align_self = n.settings.align_self || "stretch";
      app.commit();
      p.node.children = p.node.children || [];
      p.node.children.push(n);
      app.selected = n.id;
      app.activeTab = "settings";
      app.dirty = true;
      app.render();
    }
    function lb17BindGridDrops() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-inner").forEach((inner) => {
        if (inner.__lb17Drop) return;
        inner.__lb17Drop = true;
        inner.addEventListener(
          "dragover",
          (e) => {
            const v = e.dataTransfer?.getData("text/plain") || "";
            if (!v.startsWith("unit:")) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb17GridAtPoint(inner, e.clientX, e.clientY);
            window.__lb17Target = { grid: grid.dataset.id, col: cell.col, row: cell.row };
            // eslint-disable-next-line no-undef -- Known bug kept by the verbatim restore: the lb15* helpers are scoped to the IIFE above, so this name is unbound here.
            if (typeof lb15SetCellVisual === "function") lb15SetCellVisual(inner, { col: cell.col, row: cell.row });
            e.dataTransfer.dropEffect = "copy";
          },
          true,
        );
        inner.addEventListener(
          "drop",
          (e) => {
            const v = e.dataTransfer?.getData("text/plain") || "";
            if (!v.startsWith("unit:")) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const cell = lb17GridAtPoint(inner, e.clientX, e.clientY);
            window.__lb17Target = { grid: grid.dataset.id, col: cell.col, row: cell.row };
            lb17Add(v.slice(5), grid.dataset.id, cell);
          },
          true,
        );
      });
    }
    function lb17BindCards() {
      app.root.querySelectorAll(".lb-unit-card").forEach((card) => {
        if (card.__lb17Card) return;
        card.__lb17Card = true;
        card.addEventListener(
          "dblclick",
          (e) => {
            if (e.target.closest("[data-fav]")) return;
            const t3 = window.__lb17Target;
            if (!t3) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            lb17Add(card.dataset.type, t3.grid, { col: t3.col, row: t3.row });
          },
          true,
        );
      });
    }
    function lb17BindGridPointer() {
      const fd = app.frameDoc();
      if (!fd) return;
      fd.querySelectorAll(".lb-grid-inner").forEach((inner) => {
        if (inner.__lb17Pointer) return;
        inner.__lb17Pointer = true;
        inner.addEventListener(
          "pointermove",
          (e) => {
            if (e.target.closest(".lb-node") && e.target.closest(".lb-node") !== inner.closest(".lb-node")) return;
            const grid = inner.closest(".lb-node");
            if (!grid) return;
            const c = lb17GridAtPoint(inner, e.clientX, e.clientY);
            window.__lb17Target = { grid: grid.dataset.id, col: c.col, row: c.row };
            // eslint-disable-next-line no-undef -- Known bug kept by the verbatim restore: the lb15* helpers are scoped to the IIFE above, so this name is unbound here.
            if (typeof lb15SetCellVisual === "function") lb15SetCellVisual(inner, c);
          },
          true,
        );
        inner.addEventListener(
          "pointerleave",
          () => {
            const grid = inner.closest(".lb-node");
            if (grid && window.__lb17Target?.grid === grid.dataset.id) window.__lb17Target = null;
            // eslint-disable-next-line no-undef -- Known bug kept by the verbatim restore: the lb15* helpers are scoped to the IIFE above, so this name is unbound here.
            if (typeof lb15ClearCellVisual === "function") lb15ClearCellVisual(inner);
          },
          true,
        );
      });
    }
    function lb17Css() {
      const fd = app.frameDoc();
      if (!fd || fd.getElementById("lb17-style")) return;
      const st = fd.createElement("style");
      st.id = "lb17-style";
      st.textContent = `
      .lb-grid-inner{position:relative;min-width:0;}
      .lb-grid-inner>.lb-insert-zone{display:none!important;}
      .lb-grid-inner>.lb-node:not(.lb-node-image):not(.lb-node-flip_box):not(.lb-node-payment_form){width:auto!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;}
      .lb-grid-inner>.lb-node.lb-node-image{max-width:100%!important;min-width:0!important;box-sizing:border-box!important;}
      .lb-grid-inner>.lb-node.lb-node-image img{display:block;max-width:100%;width:100%;height:auto;box-sizing:border-box;}
      .lb-grid-inner>.lb-node.lb-node-heading,.lb-grid-inner>.lb-node.lb-node-text{width:auto!important;}
      .lb-grid-inner>.lb-node.is-selected{z-index:100;}
    `;
      fd.head.appendChild(st);
    }
    function lb17Refresh() {
      lb17Css();
      lb17BindGridDrops();
      lb17BindCards();
    }
    const lb17OldRender = app.render;
    app.render = function () {
      lb17OldRender();
    };
    const lb17OldSelect = app.selectNode;
    app.selectNode = function (id) {
      lb17OldSelect(id);
    };
    lb17BindGridDrops = function () {};
    lb17BindCards = function () {};
    setTimeout(lb17Refresh, 30);
    function lb17ContainerSettings(n) {
      if (!n || n.type !== "container" || app.styleTab !== "content") return "";
      return `<section class="lb17-structure"><strong>Container Structure</strong>
      <p>Divide this Container into real child Containers. Widgets dropped into a child stay inside that column or row.</p>
      <div class="lb17-presets">
        <button type="button" data-lb17-split="2x1">2 Columns</button>
        <button type="button" data-lb17-split="3x1">3 Columns</button>
        <button type="button" data-lb17-split="4x1">4 Columns</button>
        <button type="button" data-lb17-split="1x2">2 Rows</button>
        <button type="button" data-lb17-split="1x3">3 Rows</button>
        <button type="button" data-lb17-split="2x2">2 \xD7 2</button>
        <button type="button" data-lb17-split="3x2">3 \xD7 2</button>
        <button type="button" data-lb17-split="2x3">2 \xD7 3</button>
      </div>
    </section>`;
    }
    const lb17OldSettings = app.settingsHTML;
    app.settingsHTML = function () {
      let h = lb17OldSettings();
      if (app.selected) {
        const r = app.locate(app.state.root, app.selected);
        if (r?.node?.type === "container") h += lb17ContainerSettings(r.node);
      }
      return h;
    };
    function lb17MakeChild() {
      return {
        id: app.eid(),
        type: "container",
        settings: {
          layout: "flex",
          direction: "column",
          wrap: "nowrap",
          justify: "flex-start",
          align: "stretch",
          gap: 16,
          width: "auto",
          flex_grow: 1,
          flex_shrink: 1,
          flex_basis: "0px",
          padding: [],
          margin: [],
        },
        atomic: true,
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
        children: [],
      };
    }
    function lb17Split(id, cols, rows) {
      const r = app.locate(app.state.root, id);
      if (!r || r.node.type !== "container") return;
      const old = r.node.children || [],
        kids = [];
      for (let i = 0; i < cols * rows; i++) kids.push(lb17MakeChild());
      if (old.length) kids[0].children = old.slice();
      app.commit();
      r.node.children = kids;
      if (rows === 1) {
        r.node.settings.layout = "flex";
        r.node.settings.direction = "row";
        r.node.settings.wrap = "nowrap";
        r.node.settings.grid_rows = "";
      } else if (cols === 1) {
        r.node.settings.layout = "flex";
        r.node.settings.direction = "column";
        r.node.settings.wrap = "nowrap";
        r.node.settings.grid_rows = "";
      } else {
        r.node.settings.layout = "grid";
        r.node.settings.columns = cols;
        r.node.settings.grid_rows = rows;
        r.node.settings.grid_template_columns = `repeat(${cols}, minmax(0,1fr))`;
        r.node.settings.grid_template_rows = `repeat(${rows}, minmax(0,1fr))`;
      }
      app.selected = id;
      app.render();
    }
    function lb17BindStructure() {
      app.root.querySelectorAll("[data-lb17-split]").forEach((b) => {
        if (b.__lb17) return;
        b.__lb17 = true;
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const [c, r] = b.dataset.lb17Split.split("x").map(Number);
          lb17Split(app.selected, c, r);
        });
      });
    }
    const lb17SettingsRender = app.render;
    app.render = function () {
      lb17SettingsRender();
      setTimeout(lb17BindStructure, 0);
    };
    const lb17Style = document.createElement("style");
    lb17Style.textContent = `
    .lb17-structure{margin:14px 0;padding:12px;border:1px solid #d8dee7;border-radius:7px;background:#fff}
    .lb17-structure p{font-size:11px;line-height:1.4;color:#68727e;margin:7px 0 10px}
    .lb17-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    .lb17-presets button{padding:8px 6px;border:1px solid #d7dde6;border-radius:5px;background:#fff;cursor:pointer;font-size:11px}
    .lb17-presets button:hover{border-color:#2d72d9;background:#f6f9ff}
  `;
    document.head.appendChild(lb17Style);
    lb17BindStructure();
  })();
  (function () {
    "use strict";
    const gridParent21 = (p) =>
      !!p && (p.type === "grid" || (p.type === "container" && String(p.settings?.layout || "") === "grid"));
    const node21 = (id) => (id ? app.locate(app.state.root, id)?.node : null);
    const frame21 = () => app.frameDoc();
    const cssEsc21 = (id) => {
      try {
        return CSS.escape(String(id));
      } catch (e) {
        return String(id).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
      }
    };
    function gridHit21(e) {
      const t3 = e.target?.nodeType === 1 ? e.target : null;
      const inner = t3?.closest?.(".lb-grid-inner,.lb-container-inner");
      if (!inner) return null;
      const pe = inner.closest(".lb-node");
      const p = node21(pe?.dataset?.id);
      if (!pe || !gridParent21(p)) return null;
      return { inner, parentEl: pe, parent: p };
    }
    function trackList21(raw, total, gap) {
      const v = String(raw || "").trim();
      if (v && !/repeat\s*\(/i.test(v)) {
        const px = [...v.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1])).filter(Number.isFinite);
        if (px.length) return px;
      }
      const rep = v.match(/repeat\(\s*(\d+)\s*,/i);
      const n = Math.max(1, parseInt(rep?.[1] || "1", 10));
      return Array(n).fill(Math.max(1, (total - gap * Math.max(0, n - 1)) / n));
    }
    function metrics21(inner) {
      const w = inner.getBoundingClientRect();
      const cs = inner.ownerDocument.defaultView.getComputedStyle(inner);
      const bl = parseFloat(cs.borderLeftWidth) || 0,
        br = parseFloat(cs.borderRightWidth) || 0;
      const bt = parseFloat(cs.borderTopWidth) || 0,
        bb = parseFloat(cs.borderBottomWidth) || 0;
      const pl = parseFloat(cs.paddingLeft) || 0,
        pr = parseFloat(cs.paddingRight) || 0;
      const pt = parseFloat(cs.paddingTop) || 0,
        pb = parseFloat(cs.paddingBottom) || 0;
      const gx = parseFloat(cs.columnGap) || 0,
        gy = parseFloat(cs.rowGap) || 0;
      const left = w.left + bl + pl,
        top = w.top + bt + pt;
      const totalW = Math.max(1, w.width - bl - br - pl - pr),
        totalH = Math.max(1, w.height - bt - bb - pt - pb);
      return {
        cols: trackList21(cs.gridTemplateColumns, totalW, gx),
        rows: trackList21(cs.gridTemplateRows, totalH, gy),
        gx,
        gy,
        left,
        top,
      };
    }
    function cell21(inner, x, y) {
      const g = metrics21(inner);
      const pick = (v, a, gap) => {
        let pos = 0;
        for (let i = 0; i < a.length; i++) {
          const start = pos,
            end = start + a[i];
          if (v >= start && v <= end) return i + 1;
          if (v < start) return i + 1;
          pos = end + gap;
        }
        return a.length;
      };
      return {
        col: Math.max(1, Math.min(g.cols.length, pick(x - g.left, g.cols, g.gx))),
        row: Math.max(1, Math.min(g.rows.length, pick(y - g.top, g.rows, g.gy))),
      };
    }
    function placement21(n, c) {
      n.settings = n.settings || {};
      n.settings.grid_column_start = Math.max(1, Number(c.col) || 1);
      n.settings.grid_row_start = Math.max(1, Number(c.row) || 1);
      n.settings.grid_column_span = 1;
      n.settings.grid_row_span = 1;
      n.settings.justify_self = "stretch";
      n.settings.align_self = "stretch";
    }
    function addAt21(type, parentId, c) {
      if (app.proUnitLocked(type)) return false;
      const r = app.locate(app.state.root, parentId);
      if (!r || !gridParent21(r.node)) return false;
      const e = app.meta(type);
      if (!e.type) return false;
      const n = {
        id: app.eid(),
        type,
        settings: app.defaults(type),
        atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
      };
      if (e.children) n.children = [];
      placement21(n, c);
      app.commit();
      r.node.children = r.node.children || [];
      r.node.children.push(n);
      app.selected = n.id;
      app.activeTab = "settings";
      app.render();
      return true;
    }
    function moveAt21(id, parentId, c) {
      const src = app.locate(app.state.root, id),
        dst = app.locate(app.state.root, parentId);
      if (!src || !dst || !gridParent21(dst.node) || id === parentId || app.contains(src.node, parentId)) return false;
      app.commit();
      src.nodes.splice(src.index, 1);
      dst.node.children = dst.node.children || [];
      placement21(src.node, c);
      dst.node.children.push(src.node);
      app.selected = id;
      app.activeTab = "settings";
      app.render();
      return true;
    }
    function ensureGridStyles21(inner) {
      inner.classList.add("lb21-grid-target");
      inner.style.position = "relative";
      const ins = inner.querySelector(":scope > .lb-insert-zone");
      if (ins) ins.style.display = "none";
    }
    function showGuide21(inner, c) {
      ensureGridStyles21(inner);
      const g = metrics21(inner);
      let x = 0,
        y = 0;
      for (let i = 0; i < c.col - 1; i++) x += g.cols[i] + g.gx;
      for (let i = 0; i < c.row - 1; i++) y += g.rows[i] + g.gy;
      inner.style.setProperty("--lb21-left", x + "px");
      inner.style.setProperty("--lb21-top", y + "px");
      inner.style.setProperty("--lb21-width", g.cols[c.col - 1] + "px");
      inner.style.setProperty("--lb21-height", g.rows[c.row - 1] + "px");
      inner.classList.add("lb21-drop-active");
      window.__lb21Target = { parentId: inner.closest(".lb-node")?.dataset?.id, col: c.col, row: c.row };
    }
    function clearGuide21() {
      const fd = frame21();
      fd?.querySelectorAll(".lb21-drop-active").forEach((x) => x.classList.remove("lb21-drop-active"));
      window.__lb21Target = null;
    }
    function routeDrop21(e) {
      const h = gridHit21(e);
      if (!h) return;
      const v = e.dataTransfer?.getData("text/plain") || window.__lbDragPayload || "";
      if (!(v.startsWith("unit:") || v.startsWith("node:"))) return;
      const c = cell21(h.inner, e.clientX, e.clientY);
      if (e.type === "dragover") {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.dataTransfer.dropEffect = v.startsWith("node:") ? "move" : "copy";
        showGuide21(h.inner, c);
        return;
      }
      if (e.type === "drop") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (v.startsWith("unit:")) addAt21(v.slice(5), h.parentEl.dataset.id, c);
        else moveAt21(v.slice(5), h.parentEl.dataset.id, c);
        clearGuide21();
      }
    }
    function bindDrop21() {
      const fd = frame21();
      if (!fd || fd.__lb21Drop) return;
      fd.__lb21Drop = true;
      fd.addEventListener("dragover", routeDrop21, true);
      fd.addEventListener("drop", routeDrop21, true);
      fd.addEventListener(
        "dragend",
        () => {
          window.__lbDragPayload = null;
          clearGuide21();
        },
        true,
      );
      fd.addEventListener(
        "dragleave",
        (e) => {
          if (e.target === fd.documentElement || e.target === fd.body) clearGuide21();
        },
        true,
      );
    }
    function bindPanel21() {
      if (app.root.__lb21Panel) return;
      app.root.__lb21Panel = true;
      app.root.addEventListener(
        "dblclick",
        (e) => {
          const card = e.target?.closest?.(".lb-unit-card");
          if (!card || e.target.closest("[data-fav]")) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          const t3 = window.__lb21Target;
          if (t3 && node21(t3.parentId) && gridParent21(node21(t3.parentId))) {
            addAt21(card.dataset.type, t3.parentId, { col: t3.col, row: t3.row });
            clearGuide21();
            return;
          }
          const r = app.selected && app.locate(app.state.root, app.selected);
          app.add(card.dataset.type, r && app.acceptsInside(r.node) ? app.selected : null);
        },
        true,
      );
    }
    function renderPlacement21() {
      const old = app.nodeHTML;
      if (old.__lb21Wrapped) return;
      const wrapped = function (n) {
        let html = old(n),
          r = app.locate(app.state.root, n.id),
          p = r?.parent;
        if (!gridParent21(p)) return html;
        const s = n.settings || {};
        const cs = Math.max(1, parseInt(app.resp(s.grid_column_start) || 1, 10) || 1);
        const rs = Math.max(1, parseInt(app.resp(s.grid_row_start) || 1, 10) || 1);
        const cspan = Math.max(1, parseInt(app.resp(s.grid_column_span) || 1, 10) || 1);
        const rspan = Math.max(1, parseInt(app.resp(s.grid_row_span) || 1, 10) || 1);
        const j = String(app.resp(s.justify_self) || "stretch");
        const a = String(app.resp(s.align_self) || "stretch");
        const placement = `grid-column:${cs} / span ${cspan};grid-row:${rs} / span ${rspan};justify-self:${app.esc(j)};align-self:${app.esc(a)};min-width:0;max-width:100%;box-sizing:border-box;`;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0].replace(/\sstyle="[^"]*"/g, "");
        tag = tag.replace(/>$/, ' style="' + placement + '">');
        return tag + html.slice(m[0].length);
      };
      wrapped.__lb21Wrapped = true;
      app.nodeHTML = wrapped;
    }
    function tabNode21(fd, id) {
      if (!id || !fd) return null;
      return fd.querySelector('.lb-node[data-id="' + cssEsc21(id) + '"]');
    }
    function ensureTab21(fd) {
      fd.querySelectorAll(".lb18-hover-tab,.lb19-hover-tab,.lb20-hover-tab").forEach((x) => x.remove());
      let tab = fd.querySelector("body > .lb21-hover-tab");
      if (!tab) {
        tab = fd.createElement("div");
        tab.className = "lb21-hover-tab";
        tab.innerHTML =
          '<button type="button" class="lb21-plus" title="Add">+</button><button type="button" class="lb21-grip" title="Unit menu" aria-label="Unit menu"><i></i><i></i><i></i><i></i><i></i><i></i></button><button type="button" class="lb21-close" title="' +
          app.t("Delete") +
          '">\xD7</button>';
        fd.body.appendChild(tab);
        tab.querySelector(".lb21-plus").onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = tab.dataset.for;
          if (id) app.selectNode(id);
          app.activeTab = "settings";
          app.refreshRightPanel();
        };
        tab.querySelector(".lb21-grip").onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = tab.dataset.for,
            n = tabNode21(fd, id);
          if (!n) return;
          app.showContextMenu("unit", {
            id: n.dataset.id,
            type: n.dataset.type,
            x: e.clientX,
            y: e.clientY,
            inFrame: true,
          });
        };
        tab.querySelector(".lb21-close").onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = tab.dataset.for;
          if (id) app.remove(id);
        };
      } else if (tab.parentNode !== fd.body) {
        fd.body.appendChild(tab);
      }
      return tab;
    }
    function pinTab21(tab, n) {
      if (!tab || !n) return;
      const nr = n.getBoundingClientRect(),
        th = 25;
      const win = n.ownerDocument.defaultView;
      const sx = win ? win.scrollX || win.pageXOffset || 0 : 0;
      const sy = win ? win.scrollY || win.pageYOffset || 0 : 0;
      tab.style.setProperty("position", "absolute", "important");
      tab.style.setProperty("width", "max-content", "important");
      tab.style.setProperty("height", "25px", "important");
      tab.style.setProperty("min-width", "88px", "important");
      tab.style.setProperty("max-height", "25px", "important");
      tab.style.setProperty("margin", "0", "important");
      tab.style.setProperty("display", "flex", "important");
      const tw = Math.max(88, tab.getBoundingClientRect().width || 96);
      let top = nr.top + sy - th,
        left = nr.right + sx - tw;
      if (left < sx) left = Math.max(sx, nr.left + sx);
      tab.style.setProperty("top", Math.round(top) + "px", "important");
      tab.style.setProperty("left", Math.round(left) + "px", "important");
      tab.style.setProperty("right", "auto", "important");
      tab.style.setProperty("bottom", "auto", "important");
      tab.style.setProperty("transform", "none", "important");
      tab.style.setProperty("z-index", "2147483000", "important");
      tab.dataset.for = n.dataset.id || "";
      tab.hidden = false;
    }
    function showTabFor21(fd, n) {
      if (!fd) return;
      if (!n) {
        fd.querySelectorAll(".lb21-hover-tab").forEach((x) => x.remove());
        return;
      }
      pinTab21(ensureTab21(fd), n);
      requestAnimationFrame(() => {
        const tab = fd.querySelector("body > .lb21-hover-tab");
        if (tab) pinTab21(tab, n);
      });
    }
    function bindHover21(fd) {
      if (!fd || fd.__lb21Hover) return;
      fd.__lb21Hover = true;
      fd.addEventListener(
        "pointerover",
        (e) => {
          if (e.target.closest?.(".lb21-hover-tab")) return;
          const n = e.target.closest?.(".lb-node");
          if (n) showTabFor21(fd, n);
        },
        true,
      );
      fd.addEventListener(
        "pointerleave",
        () => {
          showTabFor21(fd, tabNode21(fd, app.selected));
        },
        true,
      );
    }
    function bindScroll21(fd) {
      if (!fd || fd.__lb21Scroll) return;
      fd.__lb21Scroll = true;
      const move = () => {
        const tab = fd.querySelector("body > .lb21-hover-tab");
        const n = tabNode21(fd, tab?.dataset.for || app.selected);
        if (tab && n) pinTab21(tab, n);
      };
      fd.addEventListener("scroll", move, true);
      fd.documentElement?.addEventListener("scroll", move);
      fd.defaultView?.addEventListener("scroll", move);
      fd.defaultView?.addEventListener("resize", move);
    }
    function singleTab21() {
      const fd = frame21();
      if (!fd) return;
      showTabFor21(fd, tabNode21(fd, app.selected));
    }
    function css21() {
      const fd = frame21();
      if (!fd) return;
      let st = fd.getElementById("lb21-style");
      if (!st) {
        st = fd.createElement("style");
        st.id = "lb21-style";
        fd.head.appendChild(st);
      }
      st.textContent = `
      .lb18-hover-tab,.lb19-hover-tab,.lb20-hover-tab{display:none!important}
      .lb21-grid-target{position:relative!important;}
      .lb21-grid-target>.lb-insert-zone{display:none!important;}
      .lb21-grid-target>.lb-node:not(.lb-node-image):not(.lb-node-flip_box){min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important;width:auto!important;}
      .lb21-grid-target>.lb-node.lb-node-image{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;}
      .lb21-grid-target>.lb-node.lb-node-image img{display:block;max-width:100%!important;max-height:100%;width:100%;height:auto;object-fit:contain;box-sizing:border-box;}
      .lb21-grid-target.lb21-drop-active::after{content:"";position:absolute;left:var(--lb21-left);top:var(--lb21-top);width:var(--lb21-width);height:var(--lb21-height);border:2px solid rgba(220,166,239,.98);background:rgba(220,166,239,.16);box-sizing:border-box;pointer-events:none;z-index:999999;}
      .lb-node{position:relative;}
      body>.lb21-hover-tab,.lb21-hover-tab{position:absolute!important;width:max-content!important;height:25px!important;min-width:88px!important;min-height:0!important;max-height:25px!important;max-width:none!important;margin:0!important;padding:0 6px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;background:#dca6ef!important;border-radius:7px 7px 0 0!important;z-index:2147483000!important;box-shadow:0 1px 3px rgba(0,0,0,.18)!important;white-space:nowrap!important;flex:none!important;pointer-events:auto!important;}
      .lb-grid-inner>.lb-node,.lb-container-inner[style*="display:grid"]>.lb-node,.lb-layout-grid>.lb-node{height:auto!important;max-height:none!important;overflow:visible!important;}
      .lb-node:not(.lb-node-container):not(.lb-node-grid):not(.lb-node-image):not(.lb-node-tinymce_text_editor):not(.lb-node-social)>:not(.lb-node-toolbar):not(.lb-insert-zone):not(.lb21-hover-tab):not(.lb-flip-box):not(.xe-el){flex:0 0 auto!important;position:relative!important;height:auto!important;min-height:0!important;}
      .lb-grid-inner>.lb-node.lb-node-flip_box,.lb-container-inner>.lb-node.lb-node-flip_box,.lb-layout-grid>.lb-node.lb-node-flip_box,.lb21-grid-target>.lb-node.lb-node-flip_box,.lb22-grid-host>.lb-node.lb-node-flip_box{position:relative!important;min-height:var(--lb-el-min-h,var(--lb-flip-height,280px))!important;align-self:stretch!important;}
      .lb-node-flip_box>.lb-flip-box{flex:1 1 auto!important;align-self:stretch!important;position:relative!important;display:grid!important;grid-template:minmax(var(--lb-flip-height,280px),1fr)/1fr!important;width:100%!important;height:100%!important;min-height:var(--lb-flip-height,280px)!important;box-sizing:border-box!important;}
      .lb-node-flip_box>.lb-flip-box>.lb-flip-layer{position:relative!important;inset:auto!important;grid-area:1/1!important;width:100%!important;height:100%!important;min-height:100%!important;}
      .lb21-hover-tab button{border:0;background:transparent;color:#111;font:700 18px/1 system-ui,sans-serif;width:22px;height:22px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;}
      .lb21-hover-tab .lb21-grip{width:28px;display:grid;grid-template-columns:repeat(3,4px);grid-template-rows:repeat(2,4px);gap:3px;}
      .lb21-hover-tab .lb21-grip i{width:4px;height:4px;border-radius:50%;background:#111;display:block;}
      .lb21-hover-tab .lb21-close{font-size:23px;}
      .lb21-hover-tab button:hover{background:rgba(255,255,255,.28);border-radius:4px;}
    `;
    }
    function refresh21() {
      css21();
      bindDrop21();
      bindPanel21();
      renderPlacement21();
      bindScroll21(frame21());
      bindHover21(frame21());
      singleTab21();
      frame21()
        ?.querySelectorAll(".lb-grid-inner,.lb-container-inner")
        .forEach((inner) => {
          const p = node21(inner.closest(".lb-node")?.dataset?.id);
          if (gridParent21(p)) ensureGridStyles21(inner);
        });
    }
    let chrome21 = 0;
    function schedule21() {
      if (chrome21) return;
      chrome21 = requestAnimationFrame(() => {
        chrome21 = 0;
        refresh21();
      });
    }
    const r21 = app.render;
    app.render = function () {
      r21();
      schedule21();
    };
    const s21 = app.selectNode;
    app.selectNode = function (id) {
      s21(id);
      schedule21();
    };
    bindDrop21 = function () {};
    bindPanel21 = function () {};
    setTimeout(refresh21, 30);
  })();
  (function () {
    "use strict";
    const isGridParent22 = (p) =>
      !!p && (p.type === "grid" || (p.type === "container" && String(p.settings?.layout || "") === "grid"));
    const node22 = (id) => (id ? app.locate(app.state.root, id)?.node : null);
    const frame22 = () => app.frameDoc();
    const esc22 = (id) => {
      try {
        return CSS.escape(String(id));
      } catch (e) {
        return String(id).replace(/[^a-zA-Z0-9_-]/g, "$&");
      }
    };
    function cleanOldGridEditor22(fd) {
      if (!fd) return;
      fd.querySelectorAll(".lb122-grid-guide,.lb15-cell-target,.lb21-grid-overlay,.lb22-grid-guide").forEach((x) =>
        x.remove(),
      );
      fd.querySelectorAll(".lb122-grid-active").forEach((x) => {
        x.classList.remove("lb122-grid-active");
        x.style.removeProperty("--lb122-cols");
        x.style.removeProperty("--lb122-rows");
      });
      fd.querySelectorAll(".lb21-drop-active").forEach((x) => x.classList.remove("lb21-drop-active"));
      fd.querySelectorAll(".lb18-grid-overlay,.lb19-grid-overlay,.lb20-grid-overlay").forEach((x) => x.remove());
    }
    function tracks22(raw, total, gap, fallback) {
      const v = String(raw || "").trim();
      const px = [...v.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1])).filter(Number.isFinite);
      if (px.length === fallback) return px;
      const rep = v.match(/repeat\(\s*(\d+)\s*,/i);
      const n = Math.max(1, parseInt(rep?.[1] || fallback || 1, 10));
      return Array.from({ length: n }, () => Math.max(1, (total - gap * Math.max(0, n - 1)) / n));
    }
    function metrics22(inner) {
      const r = inner.getBoundingClientRect(),
        cs = inner.ownerDocument.defaultView.getComputedStyle(inner);
      const bl = parseFloat(cs.borderLeftWidth) || 0,
        br = parseFloat(cs.borderRightWidth) || 0;
      const bt = parseFloat(cs.borderTopWidth) || 0,
        bb = parseFloat(cs.borderBottomWidth) || 0;
      const pl = parseFloat(cs.paddingLeft) || 0,
        pr = parseFloat(cs.paddingRight) || 0;
      const pt = parseFloat(cs.paddingTop) || 0,
        pb = parseFloat(cs.paddingBottom) || 0;
      const gx = parseFloat(cs.columnGap) || 0,
        gy = parseFloat(cs.rowGap) || 0;
      const contentW = Math.max(1, r.width - bl - br - pl - pr),
        contentH = Math.max(1, r.height - bt - bb - pt - pb);
      const p = node22(inner.closest(".lb-node")?.dataset?.id),
        s = p?.settings || {};
      const fc = Math.max(1, parseInt(app.resp(s.columns || 3), 10) || 3),
        fr = Math.max(1, parseInt(app.resp(s.grid_rows || s.rows || 3), 10) || 3);
      const cols = tracks22(cs.gridTemplateColumns, contentW, gx, fc);
      const rows = tracks22(cs.gridTemplateRows, contentH, gy, fr);
      return {
        r,
        cs,
        bl,
        bt,
        pl,
        pt,
        gx,
        gy,
        cols,
        rows,
        left: bl + pl,
        top: bt + pt,
        width: contentW,
        height: contentH,
      };
    }
    function trackAt22(v, a, gap) {
      if (v <= 0) return 1;
      let pos = 0;
      for (let i = 0; i < a.length; i++) {
        const end = pos + a[i];
        if (v <= end) return i + 1;
        if (v <= end + gap) {
          const before = v - pos,
            after = end + gap - v;
          return after < before ? Math.min(a.length, i + 2) : i + 1;
        }
        pos = end + gap;
      }
      return a.length;
    }
    function cell22(inner, x, y) {
      const g = metrics22(inner);
      return {
        col: trackAt22(x - (g.r.left + g.left), g.cols, g.gx),
        row: trackAt22(y - (g.r.top + g.top), g.rows, g.gy),
      };
    }
    function guide22(inner, active) {
      if (!inner) return;
      const fd = inner.ownerDocument,
        g = metrics22(inner);
      inner.classList.add("lb22-grid-host");
      let guide = inner.querySelector(":scope > .lb22-grid-guide");
      if (!guide) {
        guide = fd.createElement("div");
        guide.className = "lb22-grid-guide";
        guide.setAttribute("aria-hidden", "true");
        inner.appendChild(guide);
      }
      guide.innerHTML = "";
      guide.style.left = g.left + "px";
      guide.style.top = g.top + "px";
      guide.style.width = g.width + "px";
      guide.style.height = g.height + "px";
      guide.style.gridTemplateColumns = g.cols.map((v) => v + "px").join(" ");
      guide.style.gridTemplateRows = g.rows.map((v) => v + "px").join(" ");
      guide.style.columnGap = g.gx + "px";
      guide.style.rowGap = g.gy + "px";
      for (let row = 1; row <= g.rows.length; row++)
        for (let col = 1; col <= g.cols.length; col++) {
          const c = fd.createElement("div");
          c.className = "lb22-grid-cell" + (active && active.col === col && active.row === row ? " is-active" : "");
          c.textContent = col + "/" + row;
          guide.appendChild(c);
        }
    }
    function removeGuide22(fd) {
      fd?.querySelectorAll(".lb22-grid-guide").forEach((x) => x.remove());
      fd?.querySelectorAll(".lb22-grid-host").forEach((x) => x.classList.remove("lb22-grid-host"));
    }
    function placement22(n, c) {
      n.settings = n.settings || {};
      n.settings.grid_column_start = Math.max(1, Number(c.col) || 1);
      n.settings.grid_row_start = Math.max(1, Number(c.row) || 1);
      n.settings.grid_column_span = 1;
      n.settings.grid_row_span = 1;
      n.settings.justify_self = "stretch";
      n.settings.align_self = "start";
    }
    function addAtCell22(type, parentId, c) {
      if (app.proUnitLocked(type)) return false;
      const r = app.locate(app.state.root, parentId);
      if (!r || !isGridParent22(r.node)) return false;
      const e = app.meta(type);
      if (!e.type) return false;
      const n = {
        id: app.eid(),
        type,
        settings: app.defaults(type),
        atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
        styles: { base: {} },
        interactions: [],
        editor_settings: {},
      };
      if (e.children) n.children = [];
      placement22(n, c);
      app.commit();
      r.node.children = r.node.children || [];
      r.node.children.push(n);
      app.selected = n.id;
      app.activeTab = "settings";
      app.render();
      return true;
    }
    function moveAtCell22(id, parentId, c) {
      const src = app.locate(app.state.root, id),
        dst = app.locate(app.state.root, parentId);
      if (!src || !dst || !isGridParent22(dst.node) || id === parentId || app.contains(src.node, parentId))
        return false;
      app.commit();
      src.nodes.splice(src.index, 1);
      dst.node.children = dst.node.children || [];
      placement22(src.node, c);
      dst.node.children.push(src.node);
      app.selected = id;
      app.activeTab = "settings";
      app.render();
      return true;
    }
    function renderPlacement22() {
      const old = app.nodeHTML;
      if (old.__lb22Wrapped) return;
      const wrapped = function (n) {
        let html = old(n),
          r = app.locate(app.state.root, n.id),
          p = r?.parent;
        if (!isGridParent22(p)) return html;
        const s = n.settings || {},
          cs = Math.max(1, parseInt(app.resp(s.grid_column_start) || 1, 10) || 1),
          rs = Math.max(1, parseInt(app.resp(s.grid_row_start) || 1, 10) || 1);
        const cspan = Math.max(1, parseInt(app.resp(s.grid_column_span) || 1, 10) || 1),
          rspan = Math.max(1, parseInt(app.resp(s.grid_row_span) || 1, 10) || 1);
        const placement = `grid-column:${cs} / span ${cspan};grid-row:${rs} / span ${rspan};justify-self:${app.esc(app.resp(s.justify_self) || "stretch")};align-self:${app.esc(app.resp(s.align_self) || "stretch")};min-width:0;max-width:100%;width:auto;box-sizing:border-box;`;
        const m = html.match(/^<div\b[^>]*>/);
        if (!m) return html;
        let tag = m[0].replace(/\sstyle="[^"]*"/g, "");
        tag = tag.replace(/>$/, ' style="' + placement + '">');
        return tag + html.slice(m[0].length);
      };
      wrapped.__lb22Wrapped = true;
      app.nodeHTML = wrapped;
    }
    function bindPanel22() {
      app.root.querySelectorAll(".lb-unit-card").forEach((card) => {
        if (card.__lb22Clean) return;
        const clone = card.cloneNode(true);
        clone.__lb22Clean = true;
        card.replaceWith(clone);
        clone.addEventListener(
          "dblclick",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.target.closest("[data-fav]")) return;
            const t3 = window.__lb22CellTarget;
            if (t3 && node22(t3.parentId) && isGridParent22(node22(t3.parentId))) {
              addAtCell22(clone.dataset.type, t3.parentId, { col: t3.col, row: t3.row });
              window.__lb22CellTarget = null;
              return;
            }
            const r = app.selected && app.locate(app.state.root, app.selected);
            app.add(clone.dataset.type, r && app.acceptsInside(r.node) ? app.selected : null);
          },
          true,
        );
        clone.addEventListener("dragstart", (e) => {
          if (app.proUnitLocked(clone.dataset.type)) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.setData("text/plain", "unit:" + clone.dataset.type);
          window.__lbDragPayload = "unit:" + clone.dataset.type;
        });
        clone.addEventListener("dragend", () => {
          window.__lbDragPayload = null;
        });
        clone.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          app.showContextMenu("unit-card", { type: clone.dataset.type, x: e.clientX, y: e.clientY });
        });
        const fav = clone.querySelector("[data-fav]");
        if (fav)
          fav.addEventListener("click", (e) => {
            e.stopPropagation();
            app.toggleFavorite(fav.dataset.fav);
          });
      });
    }
    function dropTarget22(e) {
      const cell = e.target?.closest?.(".lb22-grid-cell");
      if (cell)
        return { parentId: cell.dataset.parentId, col: Number(cell.dataset.col), row: Number(cell.dataset.row) };
      const t3 = e.target?.nodeType === 1 ? e.target : null,
        inner = t3?.closest?.(".lb-grid-inner,.lb-container-inner");
      if (!inner) return null;
      const pe = inner.closest(".lb-node"),
        p = node22(pe?.dataset?.id);
      if (!pe || !isGridParent22(p)) return null;
      const c = cell22(inner, e.clientX, e.clientY);
      return { parentId: pe.dataset.id, col: c.col, row: c.row, inner };
    }
    function removeAllGuideLabels22(fd) {
      fd?.querySelectorAll(".lb122-grid-guide,.lb15-cell-target,.lb20-grid-guide,.lb21-grid-guide").forEach((x) =>
        x.remove(),
      );
      fd?.querySelectorAll(".lb122-grid-active").forEach((x) => x.classList.remove("lb122-grid-active"));
    }
    function bindDrop22() {
      const fd = frame22();
      if (!fd || fd.__lb22Drop) return;
      fd.__lb22Drop = true;
      fd.addEventListener(
        "dragover",
        (e) => {
          const v = e.dataTransfer?.getData("text/plain") || "";
          if (!(v.startsWith("unit:") || v.startsWith("node:"))) return;
          const t3 = dropTarget22(e);
          if (!t3) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (t3.inner) {
            guide22(t3.inner, { col: t3.col, row: t3.row });
            window.__lb22CellTarget = { parentId: t3.parentId, col: t3.col, row: t3.row };
          }
          e.dataTransfer.dropEffect = v.startsWith("node:") ? "move" : "copy";
        },
        true,
      );
      fd.addEventListener(
        "drop",
        (e) => {
          const v = e.dataTransfer?.getData("text/plain") || "";
          if (!(v.startsWith("unit:") || v.startsWith("node:"))) return;
          const t3 = dropTarget22(e);
          if (!t3) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (v.startsWith("unit:")) addAtCell22(v.slice(5), t3.parentId, { col: t3.col, row: t3.row });
          else moveAtCell22(v.slice(5), t3.parentId, { col: t3.col, row: t3.row });
          window.__lb22CellTarget = null;
          removeGuide22(fd);
        },
        true,
      );
      fd.addEventListener(
        "dragend",
        () => {
          window.__lb22CellTarget = null;
          removeGuide22(fd);
        },
        true,
      );
    }
    function css22(fd) {
      if (!fd || fd.getElementById("lb22-style")) return;
      const st = fd.createElement("style");
      st.id = "lb22-style";
      st.textContent = `
      .lb122-grid-active::before{display:none!important;}
      .lb22-grid-host{position:relative!important;}
      .lb22-grid-host>.lb22-grid-guide{position:absolute!important;display:grid!important;pointer-events:none!important;z-index:999990!important;box-sizing:border-box!important;margin:0!important;padding:0!important;}
      .lb22-grid-cell{position:relative!important;box-sizing:border-box!important;border:1px dashed rgba(45,114,217,.42)!important;color:#2467c5!important;font:700 10px/1 system-ui,sans-serif!important;padding:4px!important;text-shadow:0 1px #fff!important;min-width:0!important;min-height:0!important;background:rgba(63,127,223,.035)!important;}
      .lb22-grid-cell.is-active{border:2px solid rgba(220,166,239,.98)!important;background:rgba(220,166,239,.18)!important;}
      .lb22-grid-host>.lb-node:not(.lb-node-image):not(.lb-node-flip_box){width:auto!important;min-width:0!important;max-width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box!important;}
      .lb22-grid-host>.lb-node.lb-node-image{min-width:0!important;max-width:100%!important;box-sizing:border-box!important;}
      .lb22-grid-host>.lb-node.lb-node-image img{display:block!important;width:100%;max-width:100%!important;max-height:100%;height:auto;object-fit:contain;box-sizing:border-box!important;}
    `;
      fd.head.appendChild(st);
    }
    function refresh22() {
      const fd = frame22();
      if (!fd) return;
      css22(fd);
      cleanOldGridEditor22(fd);
      removeGuide22(fd);
      bindDrop22();
      renderPlacement22();
      bindPanel22();
    }
    const oldRender22 = app.render;
    app.render = function () {
      oldRender22();
      requestAnimationFrame(refresh22);
    };
    const oldSelect22 = app.selectNode;
    app.selectNode = function (id) {
      oldSelect22(id);
    };
    bindDrop22 = function () {};
    bindPanel22 = function () {};
    setTimeout(refresh22, 50);
  })();
  app.lb23Frame = () => document.getElementById("lb-editor-frame")?.contentDocument || null;
  app.lb23Escape = (id) => {
    try {
      return CSS.escape(String(id));
    } catch (e) {
      return String(id).replace(/[^a-zA-Z0-9_-]/g, "$&");
    }
  };
  app.lb23CleanGuides = function lb23CleanGuides(fd) {
    if (!fd) return;
    fd.querySelectorAll(
      ".lb122-grid-guide,.lb15-cell-target,.lb18-grid-overlay,.lb19-grid-overlay,.lb20-grid-overlay,.lb20-grid-guide,.lb21-grid-overlay,.lb21-grid-guide,.lb22-grid-guide,.lb23-grid-overlay",
    ).forEach((x) => x.remove());
    fd.querySelectorAll(".lb122-grid-active,.lb21-grid-target,.lb22-grid-host").forEach((x) => {
      x.classList.remove("lb122-grid-active", "lb21-grid-target", "lb22-grid-host");
      ["--lb122-cols", "--lb122-rows", "--lb21-left", "--lb21-top", "--lb21-width", "--lb21-height"].forEach((k) =>
        x.style.removeProperty(k),
      );
    });
  };
  app.lb23Node = function lb23Node(id) {
    return typeof app.locate === "function" ? app.locate(app.state.root, id)?.node : null;
  };
  app.lb23IsGrid = function lb23IsGrid(n) {
    return !!n && (n.type === "grid" || (n.type === "container" && n.settings?.layout === "grid"));
  };
  app.lb23Tracks = function lb23Tracks(raw, total, gap, fallback) {
    const v = String(raw || "").trim();
    const px = [...v.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1])).filter(Number.isFinite);
    if (px.length) return px;
    const rep = v.match(/^repeat\(\s*(\d+)\s*,/i);
    const count = rep ? Math.max(1, parseInt(rep[1], 10)) : fallback;
    return Array.from({ length: count }, () => Math.max(1, (total - gap * Math.max(0, count - 1)) / count));
  };
  app.lb23GridMetrics = function lb23GridMetrics(inner) {
    const r = inner.getBoundingClientRect(),
      cs = getComputedStyle(inner);
    const bl = parseFloat(cs.borderLeftWidth) || 0,
      br = parseFloat(cs.borderRightWidth) || 0,
      bt = parseFloat(cs.borderTopWidth) || 0,
      bb = parseFloat(cs.borderBottomWidth) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0,
      pr = parseFloat(cs.paddingRight) || 0,
      pt = parseFloat(cs.paddingTop) || 0,
      pb = parseFloat(cs.paddingBottom) || 0;
    const gx = parseFloat(cs.columnGap) || 0,
      gy = parseFloat(cs.rowGap) || 0;
    const w = Math.max(1, r.width - bl - br - pl - pr),
      h = Math.max(1, r.height - bt - bb - pt - pb);
    const p = app.lb23Node(inner.closest(".lb-node")?.dataset?.id),
      s = p?.settings || {};
    const fallbackCols = Math.max(1, parseInt(s.columns || 3, 10) || 3),
      fallbackRows = Math.max(1, parseInt(s.grid_rows || s.rows || 3, 10) || 3);
    const cols = app.lb23Tracks(cs.gridTemplateColumns, w, gx, fallbackCols),
      rows = app.lb23Tracks(cs.gridTemplateRows, h, gy, fallbackRows);
    const left = r.left + bl + pl,
      top = r.top + bt + pt;
    return { r, bl, br, bt, bb, pl, pr, pt, pb, gx, gy, w, h, left, top, cols, rows };
  };
  app.lb23Cell = function lb23Cell(inner, x, y) {
    const g = app.lb23GridMetrics(inner),
      localX = x - (g.r.left + g.bl + g.pl),
      localY = y - (g.r.top + g.bt + g.pt);
    const pick = (v, a, gap) => {
      let pos = 0;
      for (let i = 0; i < a.length; i++) {
        const end = pos + a[i];
        if (v <= end) return i + 1;
        pos = end + gap;
        if (v <= pos) return i + 1;
      }
      return a.length;
    };
    return { col: pick(localX, g.cols, g.gx), row: pick(localY, g.rows, g.gy) };
  };
  app.lb23ShowGrid = function lb23ShowGrid(inner, active) {
    const fd = inner?.ownerDocument;
    if (!fd) return;
    app.lb23CleanGuides(fd);
    const g = app.lb23GridMetrics(inner),
      overlay = fd.createElement("div");
    overlay.id = "lb23-grid-overlay";
    overlay.className = "lb23-grid-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.display = "grid";
    overlay.style.boxSizing = "border-box";
    overlay.style.margin = "0";
    overlay.style.padding = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999990";
    const cols = g.cols.map((v) => Math.max(0, v));
    const rows = g.rows.map((v) => Math.max(0, v));
    const trackW = cols.reduce((a, v) => a + v, 0) + g.gx * Math.max(0, cols.length - 1);
    const trackH = rows.reduce((a, v) => a + v, 0) + g.gy * Math.max(0, rows.length - 1);
    const win = fd.defaultView;
    const left = Math.ceil(g.left + (win ? win.scrollX || win.pageXOffset || 0 : 0));
    const top = Math.ceil(g.top + (win ? win.scrollY || win.pageYOffset || 0 : 0));
    const fullW = Math.max(1, Math.floor(trackW));
    const fullH = Math.max(1, Math.floor(trackH));
    overlay.style.left = left + "px";
    overlay.style.top = top + "px";
    overlay.style.width = fullW + "px";
    overlay.style.height = fullH + "px";
    overlay.style.gridTemplateColumns = cols.map((v) => v + "px").join(" ");
    overlay.style.gridTemplateRows = rows.map((v) => v + "px").join(" ");
    overlay.style.columnGap = g.gx + "px";
    overlay.style.rowGap = g.gy + "px";
    for (let row = 1; row <= g.rows.length; row++)
      for (let col = 1; col <= g.cols.length; col++) {
        const c = fd.createElement("div");
        c.className = "lb23-grid-cell";
        c.textContent = col + "/" + row;
        c.style.boxSizing = "border-box";
        c.style.minWidth = "0";
        c.style.minHeight = "0";
        c.style.padding = "4px";
        c.style.border = "1px dashed rgba(45,114,217,.42)";
        c.style.color = "#2467c5";
        c.style.font = "700 10px/1 system-ui,sans-serif";
        c.style.textShadow = "0 1px #fff";
        c.style.background = "rgba(63,127,223,.035)";
        if (active && active.col === col && active.row === row) {
          c.classList.add("is-active");
          c.style.border = "2px solid rgba(220,166,239,.98)";
          c.style.background = "rgba(220,166,239,.18)";
        }
        overlay.appendChild(c);
      }
    fd.body.appendChild(overlay);
    return overlay;
  };
  app.lb23Placement = function lb23Placement(n, c) {
    n.settings = n.settings || {};
    n.settings.grid_column_start = Math.max(1, Number(c.col) || 1);
    n.settings.grid_row_start = Math.max(1, Number(c.row) || 1);
    n.settings.grid_column_span = 1;
    n.settings.grid_row_span = 1;
    n.settings.justify_self = "stretch";
    n.settings.align_self = "stretch";
  };
  app.lb23AddAtCell = function lb23AddAtCell(type, parentId, c) {
    if (app.proUnitLocked(type)) return false;
    const r = app.locate(app.state.root, parentId);
    if (!r || !app.lb23IsGrid(r.node)) return false;
    const e = app.meta(type);
    if (!e.type) return false;
    const n = {
      id: app.eid(),
      type,
      settings: app.defaults(type),
      atomic: ["container", "grid", "heading", "text", "image", "button", "icon", "spacer", "divider"].includes(type),
      styles: { base: {} },
      interactions: [],
      editor_settings: {},
    };
    if (e.children) n.children = [];
    app.lb23Placement(n, c);
    app.commit();
    r.node.children = r.node.children || [];
    r.node.children.push(n);
    app.selected = n.id;
    app.activeTab = "settings";
    app.render();
    return true;
  };
  app.lb23MoveAtCell = function lb23MoveAtCell(id, parentId, c) {
    const src = app.locate(app.state.root, id),
      dst = app.locate(app.state.root, parentId);
    if (!src || !dst || !app.lb23IsGrid(dst.node) || id === parentId || app.contains(src.node, parentId)) return false;
    app.commit();
    src.nodes.splice(src.index, 1);
    dst.node.children = dst.node.children || [];
    app.lb23Placement(src.node, c);
    dst.node.children.push(src.node);
    app.selected = id;
    app.activeTab = "settings";
    app.render();
    return true;
  };
  app.lb23DropTarget = function lb23DropTarget(e) {
    const fd = app.lb23Frame();
    if (!fd) return null;
    let el = e.target?.nodeType === 1 ? e.target : null;
    const inner = el?.closest?.(".lb-grid-inner,.lb-container-inner");
    if (!inner) return null;
    const host = inner.closest(".lb-node"),
      parent = host && app.lb23Node(host.dataset.id);
    if (!host || !app.lb23IsGrid(parent)) return null;
    const c = app.lb23Cell(inner, e.clientX, e.clientY);
    return { parentId: host.dataset.id, col: c.col, row: c.row, inner };
  };
  app.lb23BindDrop = function lb23BindDrop() {
    const fd = app.lb23Frame();
    if (!fd || fd.__lb23Drop) return;
    fd.__lb23Drop = true;
    fd.addEventListener(
      "dragover",
      (e) => {
        const v = e.dataTransfer?.getData("text/plain") || window.__lbDragPayload || "";
        if (!/^unit:|^node:/.test(v)) return;
        const t3 = app.lb23DropTarget(e);
        if (!t3) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        app.lb23ShowGrid(t3.inner, { col: t3.col, row: t3.row });
        window.__lb23CellTarget = { parentId: t3.parentId, col: t3.col, row: t3.row };
        e.dataTransfer.dropEffect = v.startsWith("node:") ? "move" : "copy";
      },
      true,
    );
    fd.addEventListener(
      "drop",
      (e) => {
        const v = e.dataTransfer?.getData("text/plain") || window.__lbDragPayload || "";
        if (!/^unit:|^node:/.test(v)) return;
        const t3 = app.lb23DropTarget(e);
        if (!t3) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (v.startsWith("unit:")) app.lb23AddAtCell(v.slice(5), t3.parentId, { col: t3.col, row: t3.row });
        else app.lb23MoveAtCell(v.slice(5), t3.parentId, { col: t3.col, row: t3.row });
        window.__lb23CellTarget = null;
        app.lb23CleanGuides(fd);
      },
      true,
    );
    fd.addEventListener(
      "dragend",
      () => {
        window.__lb23CellTarget = null;
        app.lb23CleanGuides(fd);
      },
      true,
    );
  };
  app.lb23BindCards = function lb23BindCards() {
    app.root.querySelectorAll(".lb-unit-card").forEach((card) => {
      if (card.__lb23Card) return;
      const clone = card.cloneNode(true);
      clone.__lb23Card = true;
      card.replaceWith(clone);
      clone.addEventListener(
        "dblclick",
        (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (e.target.closest("[data-fav]")) return;
          const t3 = window.__lb23CellTarget;
          if (t3 && app.lb23Node(t3.parentId) && app.lb23IsGrid(app.lb23Node(t3.parentId))) {
            app.lb23AddAtCell(clone.dataset.type, t3.parentId, t3);
            window.__lb23CellTarget = null;
            return;
          }
          const r = app.selected && app.locate(app.state.root, app.selected);
          app.add(clone.dataset.type, r && app.acceptsInside(r.node) ? app.selected : null);
        },
        true,
      );
      clone.addEventListener("dragstart", (e) => {
        if (app.proUnitLocked(clone.dataset.type)) {
          e.preventDefault();
          return;
        }
        const payload = "unit:" + clone.dataset.type;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", payload);
        window.__lbDragPayload = payload;
      });
      clone.addEventListener("dragend", () => {
        window.__lbDragPayload = null;
        window.__lb23CellTarget = null;
      });
      clone.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.showContextMenu("unit-card", { type: clone.dataset.type, x: e.clientX, y: e.clientY });
      });
      const favBtn = clone.querySelector("[data-fav]");
      if (favBtn)
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          app.toggleFavorite(favBtn.dataset.fav);
        });
    });
  };
  app.lb23GridRefresh = function lb23GridRefresh() {
    const fd = app.lb23Frame();
    if (!fd) return;
    app.lb23CleanGuides(fd);
    app.lb23BindDrop();
    app.lb23BindCards();
    const n = app.selected && app.lb23Node(app.selected),
      el = n && fd.querySelector('.lb-node[data-id="' + app.lb23Escape(app.selected) + '"]');
    if (el && app.lb23IsGrid(n)) {
      const inner = el.querySelector(":scope > .lb-grid-inner,:scope > .lb-container-inner");
      if (inner) app.lb23ShowGrid(inner, null);
    }
  };
  app.lb23NodeRender = window.__lb23NodeRender || app.nodeHTML;
  window.__lb23NodeRender = app.lb23NodeRender;
  app.nodeHTML = function (n) {
    let html = app.lb23NodeRender(n),
      r = app.locate(app.state.root, n.id),
      p = r?.parent;
    if (!app.lb23IsGrid(p)) return html;
    const s = n.settings || {},
      cs = Math.max(1, parseInt(app.resp(s.grid_column_start) || 1, 10) || 1),
      rs = Math.max(1, parseInt(app.resp(s.grid_row_start) || 1, 10) || 1),
      cspan = Math.max(1, parseInt(app.resp(s.grid_column_span) || 1, 10) || 1),
      rspan = Math.max(1, parseInt(app.resp(s.grid_row_span) || 1, 10) || 1);
    const savedAlign = String(app.resp(s.align_self) || "");
    const alignSelf =
      savedAlign === "center" ||
      savedAlign === "end" ||
      savedAlign === "flex-end" ||
      savedAlign === "flex-start" ||
      savedAlign === "baseline"
        ? savedAlign
        : "start";
    const style = `grid-column:${cs} / span ${cspan};grid-row:${rs} / span ${rspan};justify-self:${app.esc(app.resp(s.justify_self) || "stretch")};align-self:${app.esc(alignSelf)};min-width:0;max-width:100%;width:auto;height:auto;max-height:none;overflow:visible;box-sizing:border-box;`;
    const m = html.match(/^<div\b[^>]*>/);
    if (!m) return html;
    let tag = m[0].replace(/\sstyle="[^"]*"/g, "");
    tag = tag.replace(/>$/, ' style="' + style + '">');
    return tag + html.slice(m[0].length);
  };
  app.lb23DisableLegacyGuides = function lb23DisableLegacyGuides() {
    const fd = app.lb23Frame();
    if (!fd) return;
    fd.querySelectorAll(
      ".lb122-grid-guide,.lb15-cell-target,.lb18-grid-overlay,.lb19-grid-overlay,.lb20-grid-overlay,.lb20-grid-guide,.lb21-grid-overlay,.lb21-grid-guide,.lb22-grid-guide",
    ).forEach((x) => x.remove());
  };
  app.lb23Export = function lb23Export() {
    fetch(`${app.D.api}/document/${app.D.postId}/export`, { headers: { "X-WP-Nonce": app.D.nonce } })
      .then((r) => r.json())
      .then((d) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
        a.download = `canvasly-lite-${app.D.postId || "document"}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
      })
      .catch(() => alert(app.t("Export failed.")));
  };
  app.lb23Import = function lb23Import() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          if (!Array.isArray(d.root)) throw Error();
          app.commit();
          app.state = d;
          app.selected = null;
          app.render();
        } catch (e) {
          alert(app.t("Invalid Canvasly document."));
        }
      };
      rd.readAsText(f);
    };
    input.click();
  };
  app.lb23More = function lb23More() {
    app.root.querySelector(".lb23-more-menu")?.remove();
    const m = document.createElement("div");
    m.className = "lb23-more-menu";
    m.innerHTML = `<div class="lb23-more-title">${app.t("Editor")}</div><button data-more="page">${app.t("Page Settings")}</button><button data-more="site">${app.t("Site")}</button><button data-more="history">${app.t("History")}</button><button data-more="icons">${app.t("Icons")}</button><button data-more="classes">${app.t("Classes")}</button><button data-more="components">${app.t("Components")}</button><button data-more="variables">${app.t("Variables")}</button><div class="lb23-more-sep"></div><button data-more="save-template">${app.t("Save Template")}</button><button data-more="templates">${app.t("Templates")}</button><button data-more="save-component">${app.t("Save Component")}</button><div class="lb23-more-sep"></div><button data-more="export">${app.t("Export")}</button><button data-more="import">${app.t("Import")}</button><button data-more="breakpoints">${app.t("Breakpoints")}</button><button data-more="audit">Accessibility</button><button data-more="assets">Performance & Assets</button><button data-more="shortcuts">${app.t("Keyboard Shortcuts")}</button></div>`;
    app.root.querySelector(".lb-top")?.appendChild(m);
    const action = (a) => {
      m.remove();
      ({
        page: app.openPageSettings,
        site: app.openNavigation,
        history: app.openRevisions,
        icons: app.openIconLibrary,
        classes: app.openClassManager,
        components: app.openComponentLibrary,
        variables: app.openVariables,
        "save-template": app.saveTemplate,
        templates: app.openTemplateLibrary,
        "save-component": app.saveComponent,
        export: app.lb23Export,
        import: app.lb23Import,
        breakpoints: () => app.openBreakpointsModal(),
        audit: () => {
          const issues = [];
          const walk = (nodes) =>
            nodes.forEach((n) => {
              issues.push(...app.accessibilityWarnings(n).map((x) => ({ node: n, type: n.type, msg: x })));
              if (n.children) walk(n.children);
            });
          walk(app.state.root);
          app.showModal(
            app.t("Accessibility Audit"),
            issues.length
              ? issues
                  .map(
                    (i) =>
                      `<div class="lb-library-row"><strong>${app.esc(app.meta(i.type).title || i.type)}</strong><span>${app.esc(i.msg)}</span></div>`,
                  )
                  .join("")
              : "<p>\u2713 No obvious issues detected in the current document.</p>",
          );
        },
        assets: app.openPerformance,
        shortcuts: () => app.handleMainMenu("shortcuts"),
      })[a]?.();
    };
    m.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => action(b.dataset.more)));
    setTimeout(
      () =>
        document.addEventListener(
          "mousedown",
          function f(e) {
            if (!m.contains(e.target) && !e.target.closest("#lb-more")) {
              m.remove();
              document.removeEventListener("mousedown", f, true);
            }
          },
          true,
        ),
      0,
    );
  };
  app.lb23Topbar = function lb23Topbar() {
    const top = app.root.querySelector(".lb-top");
    if (!top) return;
    const title = app.state.settings?.title || app.D.postTitle || app.t("Untitled Page");
    if (top.querySelector(".lb24-top-left")) {
      const pageTitle = top.querySelector(".lb24-page-title");
      if (pageTitle) pageTitle.textContent = title;
      const status = top.querySelector("#lb-status");
      if (status) status.textContent = app.dirty ? app.t("Unsaved") : app.t("Saved");
      if (app.syncDeviceButtons) app.syncDeviceButtons();
      if (app.applyCanvasWidth) app.applyCanvasWidth();
      return;
    }
    top.innerHTML = `<div class="lb24-top-left"><button type="button" class="lb-brand-button" id="lb-main-menu-button" aria-haspopup="true" aria-expanded="false" title="${app.t("Canvasly menu")}"><span class="lb-brand-mark">C</span><span class="lb-brand-text">Canvasly</span><small>Core ${app.esc((app.D && app.D.version) || "")}</small></button><button class="lb24-icon-btn" id="lb-add" title="${app.t("Add Unit")}">+</button><button class="lb24-icon-btn" id="lb-undo" title="${app.t("Undo (Ctrl/Cmd+Z)")}">\u21B6</button><button class="lb24-icon-btn" id="lb-redo" title="${app.t("Redo (Ctrl/Cmd+Shift+Z)")}">\u21B7</button></div><div class="lb24-top-center"><button class="lb24-page-btn" id="lb-page-settings" title="${app.t("Page Settings")}" aria-label="${app.t("Page Settings")}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.15 7.15 0 00-1.63-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.74 8.84a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.86 14.52a.5.5 0 00-.12.64l1.92 3.32c.14.23.41.32.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.19.1.46.01.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/></svg></button><div class="lb24-page-title" title="${app.t("Page Settings")}">${app.esc(title)}</div>${app.deviceSwitcherHTML()}</div><div class="lb24-top-right"><span id="lb-status" class="lb-status">${app.dirty ? "Unsaved" : "Saved"}</span><button class="lb24-icon-btn" id="lb-structure" title="${app.t("Structure / Navigator (Ctrl/Cmd+I)")}">\u2637</button><button class="lb24-icon-btn" id="lb-preview" title="${app.t("Preview page")}" aria-label="${app.t("Preview page")}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 5C5 5 1.73 11.11 1.73 12S5 19 12 19s10.27-6.11 10.27-7S19 5 12 5zm0 12c-5.05 0-8.27-4.18-8.27-5S6.95 7 12 7s8.27 4.18 8.27 5-3.22 5-8.27 5zm0-8a3 3 0 100 6 3 3 0 000-6zm0 4.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg></button><button class="lb24-save" id="lb-save" title="${app.t("Save (Ctrl/Cmd+S)")}">${typeof app.saveButtonLabel === "function" ? app.saveButtonLabel() : app.t("Save")}</button><button class="lb24-more" id="lb-more" title="${app.t("More editor tools")}">\u22EE</button></div>`;
    app.$("#lb-main-menu-button").onclick = (e) => {
      e.stopPropagation();
      app.openMainMenu();
    };
    app.$("#lb-add").onclick = () => {
      if (app.leftHidden) {
        app.leftHidden = false;
        app.render();
      } else {
        app.$("#lb-unit-search")?.focus();
      }
    };
    app.$("#lb-undo").onclick = app.undo;
    app.$("#lb-redo").onclick = app.redo;
    app.$("#lb-page-settings").onclick = app.openPageSettings;
    app.$(".lb24-page-title")?.addEventListener("click", app.openPageSettings);
    app.$("#lb-structure").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      app.lb23More();
    };
    app.$("#lb-preview").onclick = app.openPagePreview;
    app.$("#lb-save").onclick = () => app.save(false);
    app.$("#lb-more").onclick = (e) => {
      e.stopPropagation();
      app.lb23More();
    };
    app.$$("[data-device]").forEach(
      (b) =>
        (b.onclick = () => {
          app.device = b.dataset.device;
          app.render();
        }),
    );
    if (app.applyCanvasWidth) app.applyCanvasWidth();
  };
  app.lb23BaseRender = app.render;
  app.render = function () {
    app.lb23BaseRender();
    setTimeout(app.lb23Topbar, 0);
    setTimeout(app.lb23GridRefresh, 40);
  };
  document.addEventListener(
    "keydown",
    (e) => {
      if (app.lbShortcutOwner) return;
      const mod = e.ctrlKey || e.metaKey,
        key = e.key.toLowerCase(),
        editing =
          ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
          document.activeElement?.isContentEditable;
      if (e.key === "Escape") {
        app.root.querySelector(".lb23-more-menu")?.remove();
        return;
      }
      if (!mod) return;
      if (editing && ["c", "v", "x", "z", "y", "u", "i"].includes(key)) return;
      if (key === "c" && app.selected) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.copy();
        return;
      }
      if (key === "v" && e.shiftKey && app.selected && app.styleClipboard) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.pasteStyle();
        return;
      }
      if (key === "v" && app.clipboard) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.paste();
        return;
      }
      if (key === "x" && app.selected) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.copy();
        app.remove();
        return;
      }
      if (key === "d" && app.selected) {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.duplicate();
        return;
      }
      if (key === "s") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.save(false);
        return;
      }
      if (key === "p") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.leftHidden = !app.leftHidden;
        app.rightHidden = !app.rightHidden;
        app.render();
        return;
      }
      if (key === "i") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.activeTab = "navigator";
        app.rightHidden = false;
        app.render();
        return;
      }
      if (key === "u") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.handleMainMenu("preferences");
        return;
      }
      if (key === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.handleMainMenu("site-settings");
        return;
      }
      if (key === "e") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.leftHidden = false;
        app.render();
        setTimeout(() => app.$("#lb-unit-search")?.focus(), 20);
        return;
      }
      if (key === "z") {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.shiftKey ? app.redo() : app.undo();
        return;
      }
      if (key === "y") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.redo();
        return;
      }
      if (e.shiftKey && key === "m") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (app.cycleDevice) app.cycleDevice();
        else app.device = app.device === "desktop" ? "tablet" : app.device === "tablet" ? "mobile" : "desktop";
        app.render();
        return;
      }
      if (e.shiftKey && key === "l") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.openTemplateLibrary();
        return;
      }
      if (e.shiftKey && key === "h") {
        e.preventDefault();
        e.stopImmediatePropagation();
        (app.toggleHistory || app.openRevisions)();
        return;
      }
      if (e.shiftKey && key === "y") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.openPageSettings();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        e.stopImmediatePropagation();
        app.handleMainMenu("shortcuts");
        return;
      }
    },
    true,
  );
  app.lb23OldShortcut = app.handleMainMenu;
  app.handleMainMenu = function (action) {
    if (action === "shortcuts") {
      app.showMenuDialog(
        app.t("Keyboard Shortcuts"),
        '<div class="lb-shortcuts"><div><kbd>Ctrl / Cmd + Z</kbd><span>Undo</span></div><div><kbd>Ctrl / Cmd + Shift + Z</kbd><span>Redo</span></div><div><kbd>Ctrl / Cmd + C</kbd><span>Copy selected unit</span></div><div><kbd>Ctrl / Cmd + V</kbd><span>Paste unit</span></div><div><kbd>Ctrl / Cmd + X</kbd><span>Cut selected unit</span></div><div><kbd>Ctrl / Cmd + Shift + V</kbd><span>Paste Style</span></div><div><kbd>Ctrl / Cmd + D</kbd><span>Duplicate selected unit</span></div><div><kbd>Ctrl / Cmd + S</kbd><span>' +
          app.t("Save") +
          "</span></div><div><kbd>Delete</kbd><span>Delete selected unit</span></div><div><kbd>Ctrl / Cmd + P</kbd><span>Show / hide panels</span></div><div><kbd>Ctrl / Cmd + E</kbd><span>Focus Units / Finder</span></div><div><kbd>Ctrl / Cmd + I</kbd><span>Open Structure / Navigator</span></div><div><kbd>Ctrl / Cmd + U</kbd><span>Open User Preferences</span></div><div><kbd>Ctrl / Cmd + K</kbd><span>Open Site Settings</span></div><div><kbd>Ctrl / Cmd + Shift + M</kbd><span>Cycle enabled breakpoints</span></div><div><kbd>Ctrl / Cmd + Shift + L</kbd><span>Open Templates</span></div><div><kbd>Ctrl / Cmd + Shift + H</kbd><span>Open History</span></div><div><kbd>Esc</kbd><span>Close menus and dialogs</span></div></div>",
      );
      return;
    }
    return app.lb23OldShortcut(action);
  };
  app.lb23CanvasInit = function lb23CanvasInit() {
    const fd = app.lb23Frame();
    if (!fd || fd.__lb23Init) return;
    fd.__lb23Init = true;
    app.lb23GridRefresh();
  };
  app.fr = document.getElementById("lb-editor-frame");
  app.fr?.addEventListener("load", () => setTimeout(app.lb23CanvasInit, 30));
  setTimeout(app.lb23Topbar, 0);
  setTimeout(app.lb23GridRefresh, 50);
  {
    let lbExtBindControls = function () {
      app.root.querySelectorAll(".lb-ext-control").forEach((w) => {
        const def = app.LB.controls[w.dataset.lbControl];
        if (!def || !def.bind || w.__lbBound) return;
        w.__lbBound = true;
        try {
          def.bind(w, {
            key: w.dataset.lbKey,
            type: w.dataset.lbControl,
            node: app.LB.getNode(),
            update: (v) => app.update(w.dataset.lbKey, v),
          });
        } catch (e) {
          console.error('[Canvasly] control "' + w.dataset.lbControl + '" bind failed:', e);
        }
      });
    };
    app.LB.data = app.D;
    app.LB.controlTypes = app.D.controlTypes || {};
    app.LB.esc = app.esc;
    app.LB.meta = app.meta;
    app.LB.getState = () => app.state;
    app.LB.getSelected = () => app.selected;
    app.LB.getNode = (id) => {
      const r = app.locate(app.state.root, id || app.selected);
      return r ? r.node : null;
    };
    app.LB.locate = (id) => app.locate(app.state.root, id);
    app.LB.update = (path, v) => app.update(path, v);
    app.LB.commit = () => app.commit();
    app.LB.render = () => app.render();
    app.LB.refreshPanel = () => app.refreshRightPanel();
    app.LB.select = (id) => app.selectNode(id);
    app.LB.add = (type, parentId = null, index = null) => app.add(type, parentId, index);
    app.LB.save = () => app.save(false);
    const lbExtCtx = (k, t3, v, label) => {
      const def = app.lbCtrlDef(t3),
        type = def.type || "text",
        r = app.selected && app.locate(app.state.root, app.selected),
        node = r ? r.node : null;
      return {
        key: k,
        type,
        value: v,
        label: label || def.label || k.replace(/_/g, " "),
        node,
        settings: node ? node.settings || {} : {},
        esc: app.esc,
        meta: app.LB.controlTypes[type] || {},
        schema: def,
        update: (val) => app.update(k, val),
      };
    };
    const lbExtOldControl = app.control;
    app.control = function (k, t3, v, label) {
      const ctx = lbExtCtx(k, t3, v, label),
        type = ctx.type,
        def = app.LB.controls[type];
      let html;
      if (def) {
        let inner = "";
        try {
          inner = String(def.render(ctx) ?? "");
        } catch (e) {
          console.error('[Canvasly] control "' + type + '" render failed:', e);
        }
        html = `<div class="lb-ext-control" data-lb-control="${app.esc(type)}" data-lb-key="${app.esc(k)}">${inner}</div>`;
      } else html = lbExtOldControl(k, t3, v, label);
      return app.LB.hooks.applyFilters("editor/control/html", html, ctx);
    };
    app.root.addEventListener("change", (e) => {
      const t3 = e.target,
        wrap = t3 && t3.closest ? t3.closest(".lb-ext-control") : null;
      if (!wrap) return;
      const def = app.LB.controls[wrap.dataset.lbControl];
      if (!def || !def.read || t3.hasAttribute("data-setting")) return;
      let v;
      try {
        v = def.read(wrap, {
          key: wrap.dataset.lbKey,
          type: wrap.dataset.lbControl,
          target: t3,
          node: app.LB.getNode(),
        });
      } catch (err) {
        console.error('[Canvasly] control "' + wrap.dataset.lbControl + '" read failed:', err);
        return;
      }
      if (v !== void 0) app.update(wrap.dataset.lbKey, v);
    });
    const lbExtOldBody = app.bodyHTML;
    app.bodyHTML = function (n) {
      const helpers = {
        esc: app.esc,
        styleInline: app.styleInline,
        meta: app.meta,
        t: app.t,
        nodeHTML: (child) => app.nodeHTML(child),
      };
      const own = app.LB.hooks.applyFilters("editor/node/body_html/" + n.type, void 0, n, helpers);
      const html = typeof own === "string" ? own : lbExtOldBody(n);
      return app.LB.hooks.applyFilters("editor/node/body_html", html, n, helpers);
    };
    const lbExtOldSettings = app.settingsHTML;
    app.settingsHTML = function () {
      const html = lbExtOldSettings();
      const r = app.selected && app.locate(app.state.root, app.selected);
      return app.LB.hooks.applyFilters("editor/settings/html", html, r ? r.node : null, app.styleTab);
    };
    const lbExtOldRender = app.render;
    app.render = function () {
      lbExtOldRender();
      lbExtBindControls();
      app.LB.hooks.doAction("editor/render", app.LB);
    };
    const lbExtOldRefresh = app.refreshRightPanel;
    app.refreshRightPanel = function () {
      lbExtOldRefresh();
      lbExtBindControls();
      app.LB.hooks.doAction("editor/panel", app.LB.getNode(), app.LB);
    };
    const lbExtOldSelect = app.selectNode;
    app.selectNode = function (id) {
      lbExtOldSelect(id);
      app.LB.hooks.doAction("editor/select", id, app.LB.getNode(id), app.LB);
    };
    const lbExtOldUpdate = app.update;
    app.update = function (path, v) {
      const nv = app.LB.hooks.applyFilters("editor/setting/update", v, path, app.LB.getNode());
      return lbExtOldUpdate(path, nv);
    };
    const lbExtOldSave = app.save;
    app.save = async function (auto) {
      app.LB.hooks.doAction("editor/save/before", app.state, !!auto);
      const out = await lbExtOldSave(auto);
      app.LB.hooks.doAction("editor/save/after", app.state, !!auto, !app.dirty);
      return out;
    };
    const lbExtInit = () => {
      if (app.LB._ready) return;
      app.LB._ready = true;
      app.LB.hooks.doAction("editor/init", app.LB);
      const f = app.LB.hooks._store.filters;
      if (
        Object.keys(app.LB.controls).length ||
        Object.keys(f).some(
          (n) =>
            n.indexOf("editor/node/body_html") === 0 || n === "editor/settings/html" || n === "editor/control/html",
        )
      )
        app.render();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lbExtInit, { once: true });
    else setTimeout(lbExtInit, 0);
  }
}

export { installGrid };
