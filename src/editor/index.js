import { installHooks } from "./hooks.js";
import { app } from "./app.js";
  installHooks();
  // Image Carousel: live canvas preview. Mirrors assets/js/frontend.js so the canvas is
  // WYSIWYG: arrows, dots, autoplay, slide/fade effect, speed, loop and RTL all work here.
  function installImageCarouselPreview() {
    const memory = app.lbCarouselMemory || (app.lbCarouselMemory = {});
    const int = (v, min, max, d) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
    };
    function controller(c) {
      const node = c.closest(".lb-node");
      const id = node && node.dataset.id || "";
      const win = c.ownerDocument.defaultView;
      const track = c.querySelector(".lb-carousel-track");
      const slides = track ? Array.from(track.children).filter((el) => el.classList.contains("lb-carousel-slide")) : [];
      if (!slides.length || !win) return null;
      const show = int(c.dataset.show, 1, 10, 1), step = int(c.dataset.scroll, 1, show, 1);
      const fade = c.dataset.effect === "fade", loop = c.dataset.loop === "1", rtl = c.dataset.direction === "rtl";
      const pages = Math.max(1, Math.ceil((slides.length - show) / step) + 1);
      const mem = memory[id] || (memory[id] = { page: 0, count: slides.length });
      if (slides.length > mem.count) mem.page = pages - 1;
      mem.count = slides.length;
      let page = Math.max(0, Math.min(pages - 1, mem.page)), timer = null, hover = false;
      const dots = Array.from(c.querySelectorAll(".lb-carousel-dots button"));
      const prev = c.querySelector(".lb-carousel-prev"), next = c.querySelector(".lb-carousel-next");
      const gap = () => parseFloat(win.getComputedStyle(c).getPropertyValue("--lb-carousel-spacing")) || 10;
      function apply(animate) {
        if (!animate && track) {
          track.style.transition = "none";
          slides.forEach((s) => s.style.transition = "none");
        }
        if (fade) {
          slides.forEach((s, k) => s.classList.toggle("is-active", k === page));
        } else if (track) {
          const start = Math.min(page * step, Math.max(0, slides.length - show));
          const w = slides[0].getBoundingClientRect().width + gap();
          track.style.transform = "translateX(" + (rtl ? start * w : -start * w) + "px)";
        }
        dots.forEach((d, k) => d.classList.toggle("is-active", k === page));
        if (prev) prev.disabled = !loop && page === 0;
        if (next) next.disabled = !loop && page >= pages - 1;
        mem.page = page;
        if (!animate && track) {
          track.getBoundingClientRect();
          win.requestAnimationFrame(() => {
            track.style.transition = "";
            slides.forEach((s) => s.style.transition = "");
          });
        }
      }
      function go(n) {
        if (loop) n = (n + pages) % pages;
        page = Math.max(0, Math.min(pages - 1, n));
        apply(true);
      }
      function stop() {
        if (timer) win.clearInterval(timer);
        timer = null;
      }
      function start() {
        stop();
        const reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (c.dataset.autoplay !== "1" || pages < 2 || reduce) return;
        timer = win.setInterval(() => {
          if (!c.isConnected) return stop();
          // In the editor, autoplay always rests while the pointer is over the carousel so it can be edited.
          if (hover || win.document.hidden) return;
          if (!loop && page >= pages - 1) return stop();
          go(page + 1);
        }, int(c.dataset.interval, 500, 6e4, 5e3));
      }
      c.addEventListener("mouseenter", () => { hover = true; });
      c.addEventListener("mouseleave", () => { hover = false; });
      const ctl = {
        prev: () => { rtl ? go(page + 1) : go(page - 1); if (c.dataset.pauseInteraction === "1") stop(); },
        next: () => { rtl ? go(page - 1) : go(page + 1); if (c.dataset.pauseInteraction === "1") stop(); },
        to: (n) => { go(n); if (c.dataset.pauseInteraction === "1") stop(); },
        relayout: () => apply(false),
        stop
      };
      apply(false);
      start();
      return ctl;
    }
    function initAll(fd) {
      if (!fd || !fd.body) return;
      fd.querySelectorAll(".lb-node-carousel .lb-carousel[data-lb-carousel]").forEach((c) => {
        if (!c.__lbCanvasCarousel) c.__lbCanvasCarousel = controller(c) || { relayout() {}, stop() {} };
      });
      const win = fd.defaultView;
      if (!win || win.__lbCarouselBound) return;
      win.__lbCarouselBound = true;
      // Window-level capture runs before the editor's document-level selection handlers.
      const hit = (e) => {
        const t = e.target && e.target.closest ? e.target.closest(".lb-carousel-prev,.lb-carousel-next,.lb-carousel-dots button") : null;
        const c = t && t.closest(".lb-node-carousel .lb-carousel[data-lb-carousel]");
        return c && c.__lbCanvasCarousel && c.__lbCanvasCarousel.to ? { t, c } : null;
      };
      win.addEventListener("mousedown", (e) => { if (hit(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
      win.addEventListener("click", (e) => {
        const h = hit(e);
        if (!h) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const ctl = h.c.__lbCanvasCarousel;
        if (h.t.classList.contains("lb-carousel-prev")) ctl.prev();
        else if (h.t.classList.contains("lb-carousel-next")) ctl.next();
        else ctl.to(Array.from(h.t.parentNode.children).indexOf(h.t));
      }, true);
      win.addEventListener("resize", () => {
        fd.querySelectorAll(".lb-node-carousel .lb-carousel[data-lb-carousel]").forEach((c) => c.__lbCanvasCarousel && c.__lbCanvasCarousel.relayout());
      });
      // Re-renders replace nodes without always calling bindFrame; watch for new carousels.
      if (win.MutationObserver) {
        let queued = false;
        new win.MutationObserver(() => {
          if (queued) return;
          queued = true;
          win.requestAnimationFrame(() => { queued = false; initAll(fd); });
        }).observe(fd.body, { childList: true, subtree: true });
      }
      // Images that finish loading change slide width; re-measure the slide offset.
      fd.addEventListener("load", (e) => {
        const c = e.target && e.target.closest && e.target.closest(".lb-node-carousel .lb-carousel[data-lb-carousel]");
        if (c && c.__lbCanvasCarousel) c.__lbCanvasCarousel.relayout();
      }, true);
    }
    const prevBind = app.bindFrame;
    app.bindFrame = function bindFrame() {
      const out = typeof prevBind === "function" ? prevBind.apply(this, arguments) : void 0;
      try { initAll(app.frameDoc()); } catch (err) { if (window.console) console.error("[Canvasly] carousel preview", err); }
      return out;
    };
  }

export { installImageCarouselPreview };
