=== Canvasly - Visual Page Builder ===
Contributors: ssiddiqi4
Tags: page builder, drag and drop, landing page, website builder, turnstile
Requires at least: 6.9
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.13.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Drag-and-drop WordPress page builder with CSS Grid, 50+ units, templates, a design system and spam-safe forms with Cloudflare Turnstile.

== Description ==

**Canvasly is a free visual page builder for WordPress.** Build landing pages, home pages, blog layouts and complete websites on a live canvas with drag and drop, nested containers, CSS Grid and responsive controls, then publish through the normal WordPress workflow. No coding needed, and clean HTML and CSS when you want it.

= Why Canvasly? =

* **True visual editing**: drag units from the library, edit text inline, undo and redo, right-click menus, and preview desktop, tablet and mobile side by side.
* **CSS-first output**: XEditor elements print one clean HTML element each, with no wrapper divs, so pages stay light and fast.
* **Design once, reuse everywhere**: global colors, typography, classes, variables, components and site kits keep every page on brand.
* **Performance built in**: per-page CSS and scripts, external CSS files, a unit cache, lazy images and self-hosted Google Fonts.
* **Spam-safe forms and logins**: honeypot, Google reCAPTCHA or privacy-friendly Cloudflare Turnstile, with the Submit or Log In button kept disabled until the visitor passes the check.

= Visual editor =

* Drag-and-drop canvas with Containers, Inner Sections and CSS Grid (tracks, gaps, spans, drag-to-resize).
* Desktop, tablet and mobile views with per-breakpoint values and custom breakpoints.
* Inline text editing, undo/redo, revisions and history, autosave with restore bar, favorites and a searchable unit library.
* Canvasly colour picker with HEX, RGB, HSL, opacity, eyedropper and Global Colors.
* Content, Style and Advanced tabs on every unit: spacing, borders, shadows, backgrounds (image, gradient, video, slideshow), transforms, filters and blend modes.
* Style > Items flex controls (direction, justify, align, gaps, wrap) on containers and widgets.
* Editing lock so two people never overwrite each other.

= XEditor (CSS-first layer) =

* Atomic elements: Div Block, Flexbox, Grid, Heading, Paragraph, Image and Button.
* Classes & Variables Manager: global `--xe-var-*` tokens and reusable `.xe-class-*` utility classes with Normal, Hover, Focus and Active states and breakpoints.
* Class stacking on every unit (XEditor and classic).
* XEditor Loop data model with dynamic tokens such as `{{post.title}}` and `{{post.url}}` (rendering comes with Canvasly Pro).

= 50+ free units =

* **Layout**: Container, Inner Section, Grid, Spacer, Divider, Menu Anchor, Sidebar, Template, Component, Collection Loop.
* **Content**: Heading, Text, Text Editor, Image, Button, Icon, Icon Box, Image Box, Icon List, Read More, Text Path, Code, HTML, Shortcode, WordPress Widget.
* **Media**: Gallery, Image Carousel, Video, Audio, SoundCloud, Embed, Google Maps.
* **Interactive**: Tabs, Accordion, Toggle, Nested Tabs, Nested Accordion, Nested Toggle, Flip Box, Counter, Progress Bar, Alert.
* **Marketing**: Price Table, Testimonial, Star Rating, Rating, Social Icons, Link in Bio.
* **Site**: Site Menu (responsive navigation), Login, Form, Cloudflare Turnstile.

= Forms, login and spam protection =

* **Form unit**: text, email, phone, URL, textarea, select and checkbox fields; stacked, inline or two-column layout; custom recipient and success message.
* **Cloudflare Turnstile (new)**: under Settings → Integrations, paste your site and secret keys, or let Canvasly create the Turnstile widget for you with a Cloudflare API token. Test keys, theme, size and appearance options are included.
* **Require Turnstile per form**: the Form unit (Spam protection → Require Cloudflare Turnstile) and the Login unit (Require Cloudflare Turnstile) keep the Submit or Log In button disabled until the visitor completes the check. The button locks again if the token expires or after each submission, and every token is verified on the server with Cloudflare Siteverify.
* **Site-wide protection**: optionally protect every Canvasly form, the WordPress login form (wp-login.php) and the comment form.
* **Cloudflare Turnstile unit**: drop it next to any Canvasly form to protect that form.
* Honeypot and Google reCAPTCHA (v2 or v3) are also supported.

= Templates and theme =

* Save any section as a template and place it with the Template unit, the Canvasly Template block, a sidebar widget or the `[canvasly_lite_template]` shortcode.
* Canvas and Full Width page templates, header and footer editing, and template import and export.
* Works with any theme; optionally turn off Canvasly's default colors and fonts so your theme keeps them.

= Motion and accessibility =

* Entrance and exit animation presets, custom keyframes, scroll triggers and hover effects.
* ARIA label, role and custom attributes placed on the real link, button, field or image.
* RTL styles and translation-ready strings.

= Site tools =

* Maintenance and Coming Soon mode, Safe mode for troubleshooting, and one-click rollback to an earlier Canvasly version.
* Replace URL tool, system info, roles and capabilities, Units Manager and experiments.
* Yoast SEO and Rank Math see your Canvasly content; WPML and Polylang can translate it.
* Import pages and templates built with Elementor (when Elementor is active) into new Canvasly documents.
* REST routes, WP-CLI commands and hooks for developers.

= Canvasly Pro =

[Canvasly Pro](https://canvasly.pro/price.html#lite-vs-pro) is a separate add-on that adds Theme Builder, popups, display conditions, dynamic tags, Loop Grid and Loop Carousel, 70+ extra units, WooCommerce builder units, hosted payments (Stripe, PayPal, Square, Authorize.Net, Razorpay, Mollie) with Payment Forms, form actions and submissions, custom fonts and icons, custom code, editor notes and an AI assistant with an MCP server. Pro's Login & Register and Payment Form units also include the "Require Cloudflare Turnstile" option.

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

= Set up Cloudflare Turnstile (optional) =

1. Go to **Canvasly → Settings → Integrations → Cloudflare Turnstile**.
2. Paste the site key and secret key from your Cloudflare dashboard, or paste an API token and Account ID and click **Create Turnstile widget for this site**.
3. In the editor, select a Form and set **Spam protection** to **Require Cloudflare Turnstile**, or select a Login unit and turn on **Require Cloudflare Turnstile**.

Step-by-step install for Canvasly and Canvasly Pro, including the license screen, is in the [installation guide](https://canvasly.pro/installation.html). Settings for post types, CSS, fonts, maps, and performance are in the [settings guide](https://canvasly.pro/settings.html).

== Frequently Asked Questions ==

= How do I install Canvasly? =

From the WordPress dashboard go to Plugins → Add New → Upload Plugin, upload the Canvasly zip, then Activate. You can also copy the plugin folder into `wp-content/plugins/`. The [installation guide](https://canvasly.pro/installation.html) covers Canvasly Pro as well.

= Is Canvasly free? =

Yes. Canvasly is free and GPL licensed, with no limit on pages or sites. [Canvasly Pro](https://canvasly.pro/price.html) is an optional paid add-on.

= What does Canvasly require? =

WordPress 6.9 or later and PHP 7.4 or later. The plugin is tested up to WordPress 7.1. Canvasly Pro needs Canvasly 0.12.73 or newer; the Turnstile options in Pro's Login & Register and Payment Form units need Canvasly 0.13.2 or newer.

= How do I edit a page? =

Open the page and choose **Edit with Canvasly**, or use the admin-bar link. Posts and Pages work as soon as you activate the plugin. Other public types stay off until you enable them under Canvasly → Settings → General.

= Where are the settings? =

[Canvasly → Settings](https://canvasly.pro/settings.html) covers post types, maps, reCAPTCHA, Cloudflare Turnstile (Integrations tab), CSS, fonts, performance, tools, and experiments. Colors, type, and breakpoints are under Design System.

= How do I add Cloudflare Turnstile to a form or login? =

Add your Turnstile keys under Canvasly → Settings → Integrations. Then select the Form unit and set Content → Spam protection to **Require Cloudflare Turnstile**, or select the Login unit and turn on **Security → Require Cloudflare Turnstile**. With Canvasly Pro, the Login & Register and Payment Form units have the same switch under Security.

= Why is the Submit or Log In button greyed out? =

That form requires Cloudflare Turnstile. The button stays disabled until the visitor completes the Turnstile check, then it turns on. It locks again if the check expires or after each submission, because every Turnstile token can be used only once. If the button never turns on, make sure your site key allows this domain and that nothing blocks challenges.cloudflare.com.

= Is Cloudflare Turnstile better than reCAPTCHA? =

Turnstile is a free, privacy-friendly CAPTCHA alternative from Cloudflare that usually passes without puzzles. You do not need to use Cloudflare for DNS. Canvasly supports both, so choose per form.

= Does the Turnstile option protect wp-login.php too? =

The Login unit's switch protects logins sent from that unit. To protect the standard WordPress login screen as well, turn on Settings → Integrations → WordPress forms → Login form. The comment form can be protected there too.

= How can I test Turnstile before going live? =

Click **Use Cloudflare test keys** under Settings → Integrations. Every challenge passes with these keys, so replace them with your real keys before launch.

= Does Canvasly work with my theme and with Gutenberg? =

On the normal WordPress editing screen, Canvasly does not load its full editor. The Canvasly Template block and the Edit with Canvasly launcher still appear. You can turn off Canvasly's default colors and fonts so the theme keeps those. See the [FAQ](https://canvasly.pro/faq.html).

= Do I need to know how to code? =

No. The free unit library, templates, and design system cover a typical page. Custom CSS, HTML, and the Code unit are there when you want them.

= Can I build landing pages with Canvasly? =

Yes. Use the Canvas page template for a blank page without the theme header and footer, then add a hero, pricing, testimonials and a form with Turnstile protection.

= Is Canvasly responsive and mobile friendly? =

Yes. Every layout and style value can be set per breakpoint, and the editor previews desktop, tablet and mobile.

= Can I reuse a section on another page? =

Right-click a Container or Grid and choose Save as Template. Place it later with the Template unit, `[canvasly_lite_template id="42"]`, the Canvasly Template block, or the Canvasly Template sidebar widget. Attributes are listed on the [shortcodes page](https://canvasly.pro/shortcodes.html).

= Why is a unit missing from the library? =

Units Manager can disable a type or hide it from your role. Nested Tabs, Accordion, and Toggle, Collection Loop, and Grid container can also be switched off under Settings → Features. Shop units are absent unless WooCommerce is active. Pro units are absent unless [Canvasly Pro](https://canvasly.pro/price.html) has started.

= I saved a page but visitors still see the old version. Why? =

A page cache (from a caching plugin, your host, or a CDN) is serving an older copy. Canvasly clears the page from WP-Optimize, WP Super Cache, W3 Total Cache, WP Rocket, LiteSpeed Cache, SiteGround Optimizer, Breeze, WP Fastest Cache, FlyingPress, NitroPack, Hummingbird and Cache Enabler when you save. For any other cache, purge it from that plugin, your host panel or your CDN after saving.

= Will Canvasly slow down my site? =

CSS and scripts load only for the units on the page. You can print CSS as external files, cache non-dynamic unit HTML, lazy-load images, and self-host Google Fonts. The Turnstile script loads only on pages with a protected form. See [Performance](https://canvasly.pro/settings.html#performance).

= Is Canvasly SEO friendly? =

Yes. Canvasly prints semantic HTML with real heading tags, and Yoast SEO and Rank Math can analyze the content you build.

= Can I translate Canvasly pages? =

Yes. Canvasly works with WPML and Polylang and is translation ready.

= How do I move the site to a new address? =

Use Canvasly → Settings → Tools → Replace URL. Run Dry run first. The replacement cannot be undone from that screen.

= What is the difference between Canvasly and Canvasly Pro? =

Canvasly is the free page builder: the visual editor, the free unit library, the design system, forms with Turnstile, entrance and exit motion, page templates, the collection loop, and basic dynamic tags. [Canvasly Pro](https://canvasly.pro/price.html#lite-vs-pro) adds Theme Builder, popups, Loop Grid, 70+ extra units, shop units, hosted payments, extra form actions, editor notes, and the AI connection. Every Pro plan includes the same features.

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

* **Cloudflare Turnstile** (Cloudflare, Inc.) — used when you add Turnstile keys under Settings → Integrations. Pages with a protected form or login (and the WordPress login or comment form, if you enable them) load `api.js` from challenges.cloudflare.com; your server sends the visitor's token and IP address to the Siteverify endpoint when the form is submitted. If you enter a Cloudflare API token, the admin screen calls api.cloudflare.com only when you click Verify or Create widget. [Terms](https://www.cloudflare.com/website-terms/), [Privacy](https://www.cloudflare.com/privacypolicy/).
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

= 0.13.3 =
* Fixed: With WP-Optimize page caching on, visitors kept seeing the old version of a page after it was saved in Canvasly (for example, a newly added Form did not appear). Canvasly now clears that page from the WP-Optimize cache on every save, as it already did for WP Super Cache, W3 Total Cache, WP Rocket, LiteSpeed, SiteGround, Breeze and others.

= 0.13.2 =
* New: "Require Cloudflare Turnstile" on the Login unit (Security section). The Log In button stays disabled until the visitor completes the Turnstile check, and the login is rejected without a valid token.
* New: Submit gate for every Turnstile-protected form. The Form unit (Spam protection → Require Cloudflare Turnstile), the Login unit, and the WordPress login and comment forms keep their Submit / Log In button disabled until the check passes, lock it again when the token expires, errors, or is used, and block Enter-key submits while locked.
* New: Turnstile verification for Canvasly login, register and lost-password forms that post to wp-login.php, used by the Login unit and by Canvasly Pro's Login & Register unit.
* New: Turnstile widgets inside hidden tabs render when the tab opens.
* Changed: If Settings → Integrations → WordPress forms → Login form is on, the Login unit now shows the Turnstile check automatically so its logins are not rejected.
* Docs: readme rewritten with the full feature list, Turnstile setup steps and new FAQ entries.

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

= Earlier versions =
The complete history is in `changelog.txt` inside the plugin folder.

== Upgrade Notice ==

= 0.13.3 =
Saved pages now refresh right away on sites that use the WP-Optimize page cache.

= 0.13.2 =
Adds "Require Cloudflare Turnstile" to the Login unit and keeps Submit and Log In buttons disabled until the Turnstile check passes.

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
