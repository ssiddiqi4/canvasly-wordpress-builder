import { app } from "./app.js";

// Elementor-style colour picker. Replaces the browser / OS colour dialog (the Windows one has the
// "Define Custom Colors >>" button) for every <input type="color"> in the editor UI. Accepts and
// keeps HEX, HEXA, RGB(A), HSL(A) and CSS named colours, with an opacity slider.
function installColorPicker() {
  const NATIVE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const PRESETS = [
    "#000000",
    "#ffffff",
    "#6ec1e4",
    "#54595f",
    "#7a7a7a",
    "#61ce70",
    "#4054b2",
    "#23a455",
    "#e74c3c",
    "#f39c12",
    "#f1c40f",
    "#8e44ad",
    "transparent",
  ];
  const recent = [];
  let probe = null;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const round = (n, d) => {
    const p = Math.pow(10, d || 0);
    return Math.round(n * p) / p;
  };
  /** Parse any CSS colour the browser understands into {r,g,b,a}; null when invalid. */
  function parse(str) {
    const s = String(str == null ? "" : str).trim();
    if (!s) return null;
    if (/^\{\{var:/.test(s) || /^var\(/i.test(s)) return null;
    const hex = s.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length <= 4)
        h = h
          .split("")
          .map((c) => c + c)
          .join("");
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255, 3) : 1,
      };
    }
    if (typeof CSS !== "undefined" && CSS.supports && !CSS.supports("color", s)) return null;
    if (/^currentcolor$/i.test(s) || /^(inherit|initial|unset|revert)$/i.test(s)) return null;
    if (!probe) probe = document.createElement("canvas").getContext("2d");
    if (!probe) return null;
    probe.fillStyle = "#010203";
    probe.fillStyle = s;
    const out = String(probe.fillStyle);
    if (out === "#010203" && !/^#?010203$/i.test(s) && !/^rgba?\(\s*1\s*,\s*2\s*,\s*3\s*[,)]/i.test(s)) return null;
    const m6 = out.match(/^#([0-9a-f]{6})$/i);
    if (m6) return parse(out);
    const m = out.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
  }
  function formatOf(str) {
    const s = String(str || "")
      .trim()
      .toLowerCase();
    if (s.startsWith("rgb")) return "rgb";
    if (s.startsWith("hsl")) return "hsl";
    if (s.startsWith("#")) return "hex";
    return /^[a-z]+$/.test(s) ? "name" : "hex";
  }
  const hx = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  function hex6(c) {
    return c ? "#" + hx(c.r) + hx(c.g) + hx(c.b) : "#000000";
  }
  function toHsl(c) {
    const r = c.r / 255,
      g = c.g / 255,
      b = c.b / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function format(c, fmt) {
    if (!c) return "";
    const a = round(clamp(c.a, 0, 1), 2);
    if (fmt === "rgb")
      return a < 1
        ? `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`
        : `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
    if (fmt === "hsl") {
      const h = toHsl(c);
      return a < 1 ? `hsla(${h.h}, ${h.s}%, ${h.l}%, ${a})` : `hsl(${h.h}, ${h.s}%, ${h.l}%)`;
    }
    return hex6(c) + (a < 1 ? hx(a * 255) : "");
  }
  function rgbToHsv(c) {
    const r = c.r / 255,
      g = c.g / 255,
      b = c.b / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }
  function hsvToRgb(h, s, v) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
  }
  /** Full colour string behind a color input (the native value only holds #rrggbb). */
  function fullValue(input) {
    if (input.__lbFull !== void 0) return input.__lbFull;
    const cand = input.dataset.lbColor != null ? input.dataset.lbColor : input.getAttribute("value");
    if (cand && parse(cand)) return cand;
    if (input.dataset.lbColor === "" || input.dataset.tsEmpty === "1" || input.dataset.kitEmpty === "1") return "";
    return NATIVE.get.call(input);
  }
  /** Make `input.value` carry the full colour string so existing handlers store rgba()/hsl()/names as typed. */
  function prep(input) {
    if (!input || input.__lbColorPrep || input.type !== "color") return;
    const start = fullValue(input);
    input.__lbColorPrep = true;
    input.__lbFull = start;
    Object.defineProperty(input, "value", {
      configurable: true,
      get() {
        return input.__lbFull;
      },
      set(v) {
        input.__lbFull = v == null ? "" : String(v);
        const c = parse(input.__lbFull);
        NATIVE.set.call(input, c ? hex6(c) : "#000000");
        paintSwatch(input);
      },
    });
    input.classList.add("lb-cp-input");
    input.setAttribute("aria-haspopup", "dialog");
    paintSwatch(input);
  }
  function paintSwatch(input) {
    const v = input.__lbFull;
    const c = parse(v);
    input.style.setProperty("--lb-cp-val", c ? format(c, "rgb") : "transparent");
    input.classList.toggle("is-empty", !c);
    input.title = v || app.t("Default");
  }
  app.lbColorPrep = function lbColorPrep(root) {
    (root || document).querySelectorAll('input[type="color"]').forEach(prep);
  };
  app.lbParseColor = parse;
  app.lbFormatColor = format;
  let pop = null,
    current = null;
  function reflect(input, str) {
    const host = input.closest(".lb-color-control, .lb-control");
    if (host) {
      if (str) host.style.setProperty("--lb-picked", str);
      const label = host.querySelector(".lb-color-hex");
      if (label && !input.closest(".is-global")) label.textContent = str || app.t("Default");
    }
    input.dataset.tsEmpty = str ? "0" : "1";
    input.dataset.kitEmpty = str ? "0" : "1";
  }
  function emit(input, str, kind) {
    input.value = str;
    reflect(input, str);
    input.dispatchEvent(new Event(kind || "input", { bubbles: true }));
  }
  function close(commit) {
    if (!pop) return;
    const st = current;
    pop.remove();
    pop = null;
    current = null;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (st && st.dirty && commit !== false) {
      const v = st.input.value;
      if (v && parse(v)) {
        const i = recent.indexOf(v);
        if (i !== -1) recent.splice(i, 1);
        recent.unshift(v);
        recent.length = Math.min(recent.length, 8);
      }
      st.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (st && st.input && st.input.isConnected) st.input.focus({ preventScroll: true });
  }
  function onOutside(e) {
    if (!pop) return;
    if (pop.contains(e.target) || (current && e.target === current.input)) return;
    close();
  }
  function onKey(e) {
    if (e.key === "Escape" && pop) {
      e.preventDefault();
      e.stopPropagation();
      if (current && current.dirty) {
        emit(current.input, current.original);
        current.dirty = true;
      }
      close();
    }
  }
  function onResize() {
    if (current) place(current.input);
  }
  function place(input) {
    const r = input.getBoundingClientRect();
    const w = pop.offsetWidth || 260,
      h = pop.offsetHeight || 380;
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    pop.style.left = Math.max(8, left) + "px";
    pop.style.top = top + "px";
  }
  function swatchHTML(value, title, extra) {
    const c = parse(value);
    return `<button type="button" class="lb-cp-sw${extra ? " " + extra : ""}" data-cp-swatch="${app.esc(value)}" title="${app.esc(title || value)}" aria-label="${app.esc(title || value)}"><i style="background:${app.esc(c ? format(c, "rgb") : "transparent")}"></i></button>`;
  }
  function open(input) {
    if (current && current.input === input) {
      close();
      return;
    }
    close();
    prep(input);
    const original = input.value;
    const c0 = parse(original) || { r: 0, g: 0, b: 0, a: 1 };
    const hsv = rgbToHsv(c0);
    const st = (current = {
      input,
      original,
      dirty: false,
      h: hsv.h,
      s: hsv.s,
      v: hsv.v,
      a: c0.a,
      fmt: formatOf(original) === "name" ? "hex" : formatOf(original),
      name: formatOf(original) === "name" ? original : "",
    });
    const globals = typeof app.globalColors === "function" ? app.globalColors() : [];
    pop = document.createElement("div");
    pop.className = "lb-cp";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", app.t("Color Picker"));
    pop.innerHTML = `
        <div class="lb-cp-sv" tabindex="0" aria-label="${app.esc(app.t("Saturation and brightness"))}"><div class="lb-cp-sv-white"></div><div class="lb-cp-sv-black"></div><span class="lb-cp-knob"></span></div>
        <div class="lb-cp-mid">
          <span class="lb-cp-preview"><i></i></span>
          <div class="lb-cp-bars">
            <div class="lb-cp-bar lb-cp-hue" tabindex="0" aria-label="${app.esc(app.t("Hue"))}"><span class="lb-cp-thumb"></span></div>
            <div class="lb-cp-bar lb-cp-alpha" tabindex="0" aria-label="${app.esc(app.t("Opacity"))}"><i></i><span class="lb-cp-thumb"></span></div>
          </div>
        </div>
        <div class="lb-cp-entry">
          <div class="lb-cp-formats" role="group">${["hex", "rgb", "hsl"].map((f) => `<button type="button" data-cp-fmt="${f}">${f.toUpperCase()}</button>`).join("")}</div>
          <input type="text" class="lb-cp-text" spellcheck="false" autocomplete="off" aria-label="${app.esc(app.t("Color value"))}" placeholder="#000000, rgb(0,0,0), hsl(0,0%,0%), red">
        </div>
        ${globals.length ? `<div class="lb-cp-group"><small>${app.esc(app.t("Global Colors"))}</small><div class="lb-cp-swatches">${globals.map((g) => swatchHTML(g.value, g.title)).join("")}</div></div>` : ""}
        <div class="lb-cp-group"><small>${app.esc(app.t("Swatches"))}</small><div class="lb-cp-swatches">${PRESETS.map((p) => swatchHTML(p, p === "transparent" ? app.t("Transparent") : p)).join("")}</div></div>
        ${recent.length ? `<div class="lb-cp-group"><small>${app.esc(app.t("Recent"))}</small><div class="lb-cp-swatches">${recent.map((p) => swatchHTML(p)).join("")}</div></div>` : ""}
        <div class="lb-cp-actions"><button type="button" class="lb-cp-clear" data-cp-clear>${app.esc(app.t("Clear"))}</button>${window.EyeDropper ? `<button type="button" class="lb-cp-eye" data-cp-eye title="${app.esc(app.t("Pick color"))}">${app.esc(app.t("Eyedropper"))}</button>` : ""}<button type="button" class="lb-cp-done" data-cp-done>${app.esc(app.t("Done"))}</button></div>`;
    document.body.appendChild(pop);
    const $ = (s) => pop.querySelector(s);
    const sv = $(".lb-cp-sv"),
      knob = $(".lb-cp-knob"),
      hue = $(".lb-cp-hue"),
      alpha = $(".lb-cp-alpha"),
      text = $(".lb-cp-text");
    const rgb = () => Object.assign(hsvToRgb(st.h, st.s, st.v), { a: st.a });
    const paint = (skipText) => {
      const c = rgb();
      const pure = hsvToRgb(st.h, 1, 1);
      sv.style.background = format(Object.assign(pure, { a: 1 }), "rgb");
      knob.style.left = st.s * 100 + "%";
      knob.style.top = (1 - st.v) * 100 + "%";
      hue.querySelector(".lb-cp-thumb").style.left = (st.h / 360) * 100 + "%";
      alpha.querySelector("i").style.background =
        `linear-gradient(to right, ${format(Object.assign({}, c, { a: 0 }), "rgb")}, ${format(Object.assign({}, c, { a: 1 }), "rgb")})`;
      alpha.querySelector(".lb-cp-thumb").style.left = st.a * 100 + "%";
      $(".lb-cp-preview i").style.background = format(c, "rgb");
      pop.querySelectorAll("[data-cp-fmt]").forEach((b) => b.classList.toggle("is-active", b.dataset.cpFmt === st.fmt));
      if (!skipText) {
        text.value = st.name || (st.cleared ? "" : format(c, st.fmt));
        text.classList.remove("is-invalid");
      }
    };
    let raf = 0;
    const push = () => {
      st.name = "";
      st.cleared = false;
      paint();
      st.dirty = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => emit(input, format(rgb(), st.fmt)));
    };
    const drag = (el, fn) => {
      const move = (e) => {
        const r = el.getBoundingClientRect();
        fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
        push();
      };
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.focus({ preventScroll: true });
        move(e);
        const up = () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      });
    };
    drag(sv, (x, y) => {
      st.s = x;
      st.v = 1 - y;
    });
    drag(hue, (x) => {
      st.h = x * 360;
    });
    drag(alpha, (x) => {
      st.a = round(x, 2);
    });
    const keys = (el, fn) =>
      el.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 10 : 1;
        const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (!map[e.key]) return;
        e.preventDefault();
        fn(map[e.key][0], map[e.key][1]);
        push();
      });
    keys(sv, (dx, dy) => {
      st.s = clamp(st.s + dx / 100, 0, 1);
      st.v = clamp(st.v - dy / 100, 0, 1);
    });
    keys(hue, (dx, dy) => {
      st.h = clamp(st.h + (dx || -dy), 0, 360);
    });
    keys(alpha, (dx, dy) => {
      st.a = round(clamp(st.a + (dx || -dy) / 100, 0, 1), 2);
    });
    const setFrom = (str, keepText) => {
      const c = parse(str);
      if (!c) return false;
      const h = rgbToHsv(c);
      if (h.s > 0 && h.v > 0) st.h = h.h;
      st.s = h.s;
      st.v = h.v;
      st.a = c.a;
      const f = formatOf(str);
      st.name = f === "name" ? String(str).trim().toLowerCase() : "";
      if (f !== "name") st.fmt = f;
      st.cleared = false;
      paint(keepText);
      st.dirty = true;
      emit(input, st.name || String(str).trim());
      return true;
    };
    text.addEventListener("input", () => {
      const ok = !text.value.trim() || parse(text.value);
      text.classList.toggle("is-invalid", !ok);
      if (text.value.trim() && ok) setFrom(text.value, true);
    });
    text.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!text.value.trim()) {
        st.cleared = true;
        st.dirty = true;
        emit(input, "");
        close();
        return;
      }
      if (setFrom(text.value)) close();
      else text.classList.add("is-invalid");
    });
    text.addEventListener("blur", () => {
      if (text.value.trim() && parse(text.value)) paint();
    });
    pop.querySelectorAll("[data-cp-fmt]").forEach((b) =>
      b.addEventListener("click", () => {
        st.fmt = b.dataset.cpFmt;
        if (st.cleared) {
          paint();
          return;
        }
        push();
      }),
    );
    pop
      .querySelectorAll("[data-cp-swatch]")
      .forEach((b) => b.addEventListener("click", () => setFrom(b.dataset.cpSwatch)));
    $("[data-cp-clear]").addEventListener("click", () => {
      st.cleared = true;
      st.dirty = true;
      emit(input, "");
      paint();
      close();
    });
    $("[data-cp-done]").addEventListener("click", () => close());
    const eye = $("[data-cp-eye]");
    if (eye)
      eye.addEventListener("click", async () => {
        try {
          const res = await new window.EyeDropper().open();
          if (res && res.sRGBHex) setFrom(res.sRGBHex);
        } catch (e) {}
      });
    paint();
    place(input);
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    setTimeout(() => text.focus({ preventScroll: true }), 0);
  }
  app.lbOpenColorPicker = open;
  app.lbCloseColorPicker = close;
  document.addEventListener(
    "click",
    (e) => {
      const input = e.target && e.target.closest ? e.target.closest('input[type="color"]') : null;
      if (!input || input.disabled || input.dataset.nativePicker === "1") return;
      e.preventDefault();
      open(input);
    },
    true,
  );
  document.addEventListener(
    "focusin",
    (e) => {
      const t3 = e.target;
      if (t3 && t3.type === "color") prep(t3);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      const t3 = e.target;
      if (!t3 || t3.type !== "color" || t3.disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(t3);
      }
    },
    true,
  );
  const prepAll = () => app.lbColorPrep(document);
  const oldRefresh = app.refreshRightPanel;
  if (typeof oldRefresh === "function") {
    app.refreshRightPanel = function refreshRightPanelColorPicker() {
      const out = oldRefresh.apply(this, arguments);
      prepAll();
      return out;
    };
  }
  const oldEnhance = app.enhanceEyedropper;
  app.enhanceEyedropper = function enhanceEyedropperColorPicker() {
    const out = typeof oldEnhance === "function" ? oldEnhance.apply(this, arguments) : void 0;
    prepAll();
    return out;
  };
  if (typeof MutationObserver === "function") {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        prepAll();
        if (current && !current.input.isConnected) close(false);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
}

export { installColorPicker };
