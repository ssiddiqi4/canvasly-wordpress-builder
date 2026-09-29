=== Canvasly - Visual Page Builder ===
Contributors: ssiddiqi4
Tags: page builder, drag-and-drop, landing page, website builder, responsive
Requires at least: 6.9
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.13.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A visual WordPress page builder with nested containers, CSS Grid, templates, a design system, and responsive editing.

== Description ==

Canvasly is a visual page builder for WordPress. Design pages directly on a canvas with nested containers, CSS Grid and responsive controls, then publish them through the normal WordPress workflow.

= Highlights =

* **Visual editor**: drag units from the library into Containers, Grids and XEditor elements, edit text inline, undo and redo, and preview desktop, tablet and mobile.
* **XEditor (CSS-first)**: atomic Div Block, Flexbox, Grid, Heading, Paragraph, Image and Button elements that print one clean HTML element each.
* **Classes & Variables**: global variables (`--xe-var-*`) and reusable utility classes (`.xe-class-*`) with states and breakpoints. Stack classes on any unit.
* **Design system**: global colors, typography, components and site kits.
* **Layout**: CSS Grid tracks, gaps and spans; flex containers; shape dividers; background video.
* **Motion**: entrance and exit presets, custom keyframes and scroll triggers.
* **Templates**: save sections and place them with a unit, block, widget or shortcode.
* **Forms**: email forms with honeypot, reCAPTCHA or Cloudflare Turnstile.
* **Accessibility**: ARIA label, role and custom attributes on every unit.
* **Performance**: per-page CSS and scripts, optional external CSS files, unit cache, lazy images and self-hosted Google Fonts.
* **Developers**: REST routes, WP-CLI commands and hooks for add-ons.

= Canvasly Pro =

[Canvasly Pro](https://canvasly.pro/price.html#lite-vs-pro) adds the XEditor Loop, Theme Builder, popups, WooCommerce units, hosted payments, extra widgets and more.

The full unit list and user guide are at [canvasly.pro](https://canvasly.pro/blocks.html). For third-party services used by optional features, see the FAQ entry "Does Canvasly connect to external services?".

== Installation ==

= Minimum requirements =

* WordPress 6.9 or greater
* PHP 7.4 or greater
* MySQL 5.7 or MariaDB 10.3 or greater

= Recommended =

* WordPress 6.9 or greater, tested up to 7.1
* PHP 8.1 or greater

Shop units appear only while WooCommerce is active. [Canvasly Pro](https://canvasly.pro/installation.html) will not start if Canvasly is missing, switched off, or older than 0.12.73.

= Installation =

1. Install using **Plugins → Add New → Upload Plugin**, or place the plugin folder in `wp-content/plugins/`.
2. Activate **Canvasly** on the Plugins screen.
3. Open a page or post and choose **Edit with Canvasly**. The same link is in the admin bar.
4. Drag units from the left library onto the canvas, then save. Publish or update the page in WordPress.

Step-by-step install for Canvasly and Canvasly Pro, including the license screen, is in the [installation guide](https://canvasly.pro/installation.html). Settings for post types, CSS, fonts, maps, and performance are in the [settings guide](https://canvasly.pro/settings.html).

== Frequently Asked Questions ==

= How do I install Canvasly? =

From the WordPress dashboard go to Plugins → Add New → Upload Plugin, upload the Canvasly zip, then Activate. You can also copy the plugin folder into `wp-content/plugins/`. The [installation guide](https://canvasly.pro/installation.html) covers Canvasly Pro as well.

= What does Canvasly require? =

WordPress 6.9 or later and PHP 7.4 or later. The plugin is tested up to WordPress 7.1. Canvasly Pro 0.11 needs Canvasly 0.13.0 or newer.

= How do I edit a page? =

Open the page and choose **Edit with Canvasly**, or use the admin-bar link. Posts and Pages work as soon as you activate the plugin. Other public types stay off until you enable them under Canvasly → Settings → General.

= Where are the settings? =

[Canvasly → Settings](https://canvasly.pro/settings.html) covers post types, maps, reCAPTCHA, CSS, fonts, performance, tools, and experiments. Colors, type, and breakpoints are under Design System.

= Does Canvasly work with my theme and with Gutenberg? =

On the normal WordPress editing screen, Canvasly does not load its full editor. The Canvasly Template block and the Edit with Canvasly launcher still appear. You can turn off Canvasly’s default colors and fonts so the theme keeps those. See the [FAQ](https://canvasly.pro/faq.html).

= Do I need to know how to code? =

No. The free unit library, templates, and design system cover a typical page. Custom CSS, HTML, and the Code unit are there when you want them.

= Can I reuse a section on another page? =

Right-click a Container or Grid and choose Save as Template. Place it later with the Template unit, `[canvasly_lite_template id="42"]`, the Canvasly Template block, or the Canvasly Template sidebar widget. Attributes are listed on the [shortcodes page](https://canvasly.pro/shortcodes.html).

= Why is a unit missing from the library? =

Units Manager can disable a type or hide it from your role. Nested Tabs, Accordion, and Toggle, Collection Loop, and Grid container can also be switched off under Settings → Features. Shop units are absent unless WooCommerce is active. Pro units are absent unless [Canvasly Pro](https://canvasly.pro/price.html) has started.

= Will Canvasly slow down my site? =

CSS and scripts load for the units on the page. You can print CSS as external files, cache non-dynamic unit HTML, lazy-load images, and self-host Google Fonts. See [Performance](https://canvasly.pro/settings.html#performance).

= How do I move the site to a new address? =

Use Canvasly → Settings → Tools → Replace URL. Run Dry run first. The replacement cannot be undone from that screen.

= What is the difference between Canvasly and Canvasly Pro? =

Canvasly is the free page builder: the visual editor, the free unit library, the design system, entrance and exit motion, page templates, the collection loop, and basic dynamic tags. [Canvasly Pro](https://canvasly.pro/price.html#lite-vs-pro) adds Theme Builder, popups, shop units, hosted payments, extra form actions, editor notes, and the AI connection. Every Pro plan includes the same features.

= The editor looks broken. What should I try? =

Under Settings → Advanced, set Editor loader to Iframe. Under Settings → Tools, turn on Safe mode for your account. Safe mode loads the editor without other plugins and without the theme. More answers are in the [FAQ](https://canvasly.pro/faq.html).

= Does Canvasly work with other page builders? =

Canvasly is a standalone page builder and does not require any other builder. If Elementor is installed and active on your site, Canvasly can:

* Import pages, posts and library templates that were built with Elementor into new Canvasly documents. The original content is never changed or deleted.
* Show a theme header or footer built with Elementor correctly in the Canvasly editor, by loading the stylesheets that your installed copy of Elementor already provides.

Canvasly does not include, copy or redistribute any Elementor code, stylesheets or images. It only references the files already installed on your site, and this compatibility only applies while Elementor is active.

= Is Canvasly affiliated with Elementor? =

No. Elementor is a trademark of its respective owner. Canvasly is an independent plugin and is not affiliated with, sponsored by or endorsed by Elementor or its owner. The name is used only to describe compatibility.

= Does Canvasly connect to external services? =

Only when you turn on a feature that needs one. Nothing below is contacted by default.

* **Cloudflare Turnstile** (Cloudflare, Inc.) — used when you add Turnstile keys under Settings → Integrations. Pages with a protected form (and the login or comment form, if you enable them) load `api.js` from challenges.cloudflare.com; your server sends the visitor's token and IP address to the Siteverify endpoint when the form is submitted. If you enter a Cloudflare API token, the admin screen calls api.cloudflare.com only when you click Verify or Create widget. [Terms](https://www.cloudflare.com/website-terms/), [Privacy](https://www.cloudflare.com/privacypolicy/).
* **Google reCAPTCHA** (Google LLC) — used when reCAPTCHA keys are set: loads the reCAPTCHA script and verifies the token on submit. [Terms](https://policies.google.com/terms), [Privacy](https://policies.google.com/privacy).
* **Google Maps** — the Google Maps unit embeds a map from google.com (Maps Embed API when a key is set). Same Google terms and privacy policy.
* **Google Fonts** — fonts chosen in the editor load from fonts.googleapis.com unless "Load Google Fonts locally" is on.
* **Video and embed units** (YouTube, Vimeo, SoundCloud and others) — the player loads from the provider you link to.

= Where do I get help? =

Read the [documentation](https://canvasly.pro/overview.html) or [contact support](https://canvasly.pro/support.html).

== Screenshots ==

1. **Visual editor** - Unit library on the left, the page canvas in the center, and Content, Style, and Advanced on the right.
2. **Responsive editing** - Switch the canvas between desktop, tablet, and mobile.
3. **CSS Grid** - Place children in rows and columns, span cells, and resize by dragging an edge.
4. **Design system** - Global colors, typography, classes, variables, and components.
5. **Templates** - Save a section and embed it with a shortcode, a block, a unit, or a sidebar widget.
6. **Canvasly Pro** - Theme Builder, popups, shop units, and the annual plans.

== Changelog ==

= 0.13.1 =
* Plugin Check: documented why the Cloudflare Turnstile script and Siteverify endpoint are loaded from Cloudflare (required by the service, only after keys are entered), marked loop "exclude" settings as editor settings, shortened the readme Description and Changelog (full history now in changelog.txt), and added an "external services" FAQ entry.

= 0.13.0 =
* New: XEditor — a unified, CSS-first editing layer. The broken "Atomic" menu is replaced by an XEditor button in the top bar that inserts working elements (click into the selected container or drag onto the canvas).
* New: XEditor Atomic Elements — Div Block, Flexbox, Grid, Heading, Paragraph, Image and Button. Each prints ONE HTML element on the live page (no wrapper divs); aria-label, role and custom attributes go on that element.
* New: XEditor Classes & Variables Manager. Variables are global tokens printed as `--xe-var-*` custom properties (colors, fonts, sizes, spacing, per-breakpoint values). Classes are reusable utility presets printed as `.xe-class-*`, with Normal/Hover/Focus/Active states and per-breakpoint values; use `$name` in any value to reference a variable. Class priority is set by the order in the manager.
* New: Class stacking on every unit (XEditor and classic): add, create or remove classes from the Classes bar at the top of the settings panel. Element "Local Style" values use zero-specificity selectors, so a stacked class always wins.
* New: XEditor Loop data model (Loop > Loop Layout > Loop Item) with dynamic tokens such as {{post.title}}, {{post.url}}, {{post.featured_image}}, {{term.name}} and {{loop.number}}. Rendering and editor preview come from Canvasly Pro; without a Pro license loops are locked in the editor, not rendered, and kept in the page data.
* New: Cloudflare Turnstile. Canvasly → Settings → Integrations: site key, secret key, optional Cloudflare API token (Verify, or Create a Turnstile widget with your Account ID), Cloudflare test keys, default look, and optional protection for all Canvasly forms, the WordPress login form and comments. New "Cloudflare Turnstile" unit protects the form in the same container; the Form unit has a new "Spam protection" option. Tokens are verified server-side (Siteverify) and reset after each submission.
* Fixed: ARIA Label had no effect on most units because it was printed on a generic wrapper <div>. It is now placed on the unit's link, button, field, form or image; containers and multi-link units get role="group" so the name is announced.
* Fixed: Form errors now show the server's message (for example a failed security check) instead of a generic error.

= 0.12.113 =
* Fixed: A container (or any group background, border, or shadow) set to a Global Color showed in the editor but not on the live page: the page stylesheet printed the raw binding (`background-color:{{var:colors.primary}}`), which browsers ignore. Global Color bindings are now turned into their CSS variables (`var(--lb-color-primary)`) in group controls and, as a safety net, in the compiled page and global CSS. Existing pages pick up the fix on their next view; no re-save needed. This also brings back shape dividers that were drawn in a contrasting colour on top of that background.

= 0.12.112 =
* Changed: Autosave now runs silently in the background. The "An autosave is newer than the last save. Restore it?" browser dialog is gone; when a newer autosave exists, a small bar under the top menu offers Restore or dismiss, and it is not shown when the autosave matches the page or after you dismiss it in that session.

= 0.12.111 =
* Added: Canvasly colour picker for every colour control, replacing the browser / Windows colour dialog (the one with the "Define Custom Colors >>" button). It has a saturation area, hue and opacity sliders, HEX / RGB / HSL format switch, a value box, Global Colors, preset and recent swatches, Clear and Eyedropper.
* Added: Colour values can be typed as HEX (#rgb, #rrggbb, #rrggbbaa), rgb()/rgba(), hsl()/hsla() or CSS colour names (tomato, transparent). The value is saved as typed, and Global Colors accept the same formats.

= Earlier versions =
The complete history is in `changelog.txt` inside the plugin folder.

== Upgrade Notice ==

= 0.12.107 =
Borders with a style but no colour now default to white instead of a dark box.

= 0.12.106 =
Adds button hover colours to Site Menu, Form, Login, Link in Bio and Collection Loop, and fixes sliders that showed 0 at the minimum position.

= 0.12.105 =
Stops themes from recolouring the Site Menu button and other Canvasly buttons on hover (for example turning them red).

= 0.12.104 =
Fixes Hover colours not showing in the editor canvas, adds Hover to the Site Menu button, and fixes Social Icons hover background.

= 0.12.103 =
Fixes Site Menu Hover/Text colours being overridden by the global link colour, and the same bug in other units with links.

= 0.12.102 =
Fixes "Reset to Default" in Effects sections so it can be used repeatedly without saving and reloading.

= 0.12.101 =
Adds a "Reset to Default" button to the Effects settings of every unit.

= 0.12.100 =
Effects settings (Transform, CSS Filter, Transition, Blend Mode) now preview live in the canvas.

= 0.12.99 =
Fixes corrupted symbols in the editor and makes the Image Carousel work in the canvas: arrows, dots, effects and autoplay. Also fixes Link and Lightbox saving.

= 0.12.74 =
Menu Anchor now shows its jump target on the canvas and supports a scroll offset for sticky headers.
