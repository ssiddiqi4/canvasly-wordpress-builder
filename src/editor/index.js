// Editor entry point. The import order is the module order in the bundle, and boot()
// runs the installers in a fixed order: later installers wrap functions earlier ones
// put on `app`, so do not reorder them.
import "./rest-url-fix.js";
import { app } from "./app.js";
import { installHooks } from "./hooks.js";
import { installState } from "./state.js";
import { installBreakpoints } from "./breakpoints.js";
import { installContextmenu } from "./contextmenu.js";
import { installHistory } from "./history.js";
import { installControls } from "./controls.js";
import { installCanvas } from "./canvas.js";
import { installNavigator } from "./navigator.js";
import { installPanel } from "./panel.js";
import { installDesignSystem } from "./design-system.js";
import { installTemplates } from "./templates.js";
import { installGrid } from "./grid.js";
import { installWidgetDepth } from "./widget-depth.js";
import { installNested } from "./nested.js";
import { installSiteSettings } from "./site-settings.js";
import { installThemeStyle } from "./theme-style.js";
import { installKitSettings } from "./kit-settings.js";
import { installKitExport } from "./kit-export.js";
import { installGroups } from "./groups.js";
import { installCodeControl } from "./code-control.js";
import { installShortcuts } from "./shortcuts.js";
import { installClipboard } from "./copy-paste.js";
import { installPreferences } from "./preferences.js";
import { installInlineToolbar } from "./inline-toolbar.js";
import { installDynamicTags } from "./dynamic-tags.js";
import { installCollectionLoop } from "./collection-loop.js";
import { installTemplateWidget } from "./template-widget.js";
import { installInteractions } from "./interactions.js";
import { installSavedTemplates } from "./saved-templates.js";
import { installRoleCaps } from "./role-caps.js";
import { installHeartbeat } from "./heartbeat.js";
import { installCanvasSchema } from "./canvas-schema.js";
import { installEffectsReset } from "./effects-reset.js";
import { installImageCarouselPreview } from "./carousel-preview.js";
import { installColorPicker } from "./color-picker.js";

installHooks();

function boot() {
  if (installState() === false) return;
  installBreakpoints();
  installContextmenu();
  installHistory();
  installControls();
  installCanvas();
  installNavigator();
  installPanel();
  installDesignSystem();
  installTemplates();
  installGrid();
  installWidgetDepth();
  installNested();
  installSiteSettings();
  installThemeStyle();
  installKitSettings();
  installKitExport();
  installGroups();
  installCodeControl();
  installShortcuts();
  installClipboard();
  installPreferences();
  installInlineToolbar();
  installDynamicTags();
  installCollectionLoop();
  installTemplateWidget();
  installInteractions();
  installSavedTemplates();
  installRoleCaps();
  installHeartbeat();
  installCanvasSchema();
  if (typeof app.nodeHTML === "function" && !app.nodeHTML.__lbSafe) {
    const paintNode = app.nodeHTML;
    app.nodeHTML = function nodeHTMLSafe(n) {
      try {
        return paintNode(n);
      } catch (err) {
        if (window.console) console.error("[Sidcraft Page Builder] unit render failed", n && n.type, err);
        const title = (app.meta(n && n.type) || {}).title || (n && n.type) || "Unit";
        return (
          '<div class="lb-node lb-node-error" data-id="' +
          app.esc((n && n.id) || "") +
          '" data-type="' +
          app.esc((n && n.type) || "") +
          '"><div class="lb-embed-placeholder">' +
          app.esc(title) +
          "</div></div>"
        );
      }
    };
    app.nodeHTML.__lbSafe = true;
  }
  const paint = app.lbPaintCanvas;
  if (typeof paint === "function") {
    app.lbPaintCanvas = function lbPaintCanvasWrapped() {
      if (app.flushInlineSession) app.flushInlineSession();
      const ok = paint.apply(this, arguments);
      if (ok) {
        if (app.refreshRevisionBanner) app.refreshRevisionBanner();
        if (app.historyOpen && app.refreshHistoryPanel) app.refreshHistoryPanel();
        if (app.applyPreferencesChrome) app.applyPreferencesChrome();
        if (app.enhanceEyedropper) app.enhanceEyedropper(app.root);
        if (app.lbRunTextPaths) app.lbRunTextPaths(app.frameDoc());
      }
      return ok;
    };
  }
  installImageCarouselPreview();
  installEffectsReset();
  installColorPicker();
  if (typeof app.render === "function") app.render();
  if (typeof app.lbHydrateDocument === "function") app.lbHydrateDocument();
}
boot();
