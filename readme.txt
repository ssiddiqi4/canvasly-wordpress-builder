=== Sidcraft Page Builder w/ AI MCP ===
Contributors: ssiddiqi4
Donate link: https://paypal.me/SSiddiqi275
Tags: page builder, drag and drop, landing page, website builder, templates
Requires at least: 6.9
Tested up to: 7.2
Requires PHP: 7.4
Stable tag: 2.4.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Drag-and-drop WordPress page builder with CSS Grid, 50+ units, templates, a design system and spam-safe forms with Cloudflare Turnstile.

== Description ==

**Sidcraft Page Builder is a free visual page builder for WordPress.** Build landing pages, home pages, blog layouts and complete websites on a live canvas with drag and drop, nested containers, CSS Grid and responsive controls, then publish through the normal WordPress workflow. No coding needed, and clean HTML and CSS when you want it.

Unlock full potential of [Sidcraft Page Builder with PRO](https://canvasly.pro/sidcraft/). **Do not like image or video in your browser?  Edit it within [Sidcraft Page Builder Pro](https://canvasly.pro/sidcraft/) with built-in image/video editor. No need to upload a new image.

https://www.youtube.com/watch?v=ymDQiDvtQjg

= Design WordPress Pages by Chatting: AI Chat Bot in Sidcraft Page Builder (Lite & Pro) =

https://www.youtube.com/watch?v=WqqTkmUaMDo

[Sidcraft Page Builder PRO](https://canvasly.pro/sidcraft/) with upgraded AI/MCP capability. Now, the AI Chatbot can read any live URL and recreate the layout using native Sidcraft blocks. Whether you're migrating from another page builder or adapting a design you love, it’s easier than ever.

No complicated prompts or scripts needed—just type:

👉 "Read entire website https://example.com and recreate all pages with Sidcraft Page Builder blocks."

Plus, after your pages are created, you can seamlessly convert and save them as static HTML pages from Sidcraft Page Builder > Tools. 

= Why Sidcraft Page Builder? =

* **True visual editing**: drag units from the library, edit text inline, undo and redo, right-click menus, and preview desktop, tablet and mobile side by side.
* **CSS-first output**: XEditor elements print one clean HTML element each, with no wrapper divs, so pages stay light and fast.
* **Design once, reuse everywhere**: global colors, typography, classes, variables, components and site kits keep every page on brand.
* **Performance built in**: per-page CSS and scripts, external CSS files, a unit cache, lazy images and self-hosted Google Fonts.
* **Spam-safe forms and logins**: honeypot, Google reCAPTCHA or privacy-friendly Cloudflare Turnstile, with the Submit or Log In button kept disabled until the visitor passes the check.
* **AI Chat Bot and HTML import**: turn an HTML page into native, editable layout in one click, or describe a change and preview it on the canvas before applying it.

== Features ==

= Visual editor =

* Drag-and-drop canvas with Containers, Inner Sections and CSS Grid; desktop, tablet and mobile views with custom breakpoints.
* Inline text editing, undo/redo, revisions, autosave, favorites and a searchable unit library.
* Colour picker with HEX, RGB, HSL, opacity, eyedropper and Global Colors.
* Content, Style and Advanced tabs on every unit: spacing, borders, shadows, backgrounds (image, gradient, video, slideshow), transforms, filters and blend modes.
* Navigator, and an editing lock so two people never overwrite each other.

= AI Chat Bot and HTML import =

* **AI Chat Bot**: a docked chat panel that works through the AI Client built into WordPress 7.0 and later, with the provider you connect under Settings → Connectors (OpenAI, Anthropic, Google and others). No separate API key. Ask for a section, a restyle, a layout change or a translation, preview the plan on the canvas, untick any step, then Apply or Discard. Each applied plan is one undo step.
* **HTML import, no AI needed**: upload or paste HTML or CSS. Sections, text, images, buttons and lists become XEditor elements, stylesheet classes become reusable classes and CSS custom properties become design variables.
* Sidcraft Builder Pro adds image input: upload a screenshot or mockup and get a native layout.

= Your content stays yours =

* Every layout is also saved as clean, readable content (core blocks), so pages stay readable if the builder is switched off. The saved format is documented as a JSON Schema, not hidden in shortcodes.
* Saving an unchanged page writes nothing and page views make no database writes. `wp sidcraft-page-builder benchmark` measures your own site.

= XEditor (CSS-first layer) =

* Atomic elements (Div Block, Flexbox, Grid, Heading, Paragraph, Image, Button), global `--xe-var-*` tokens, reusable `.xe-class-*` classes with states and breakpoints, and a Loop data model with tokens such as `{{post.title}}` (rendering comes with Sidcraft Builder Pro).

= 50+ free units =

* **Layout**: Container, Inner Section, Grid, Spacer, Divider, Menu Anchor, Sidebar, Template, Component, Collection Loop.
* **Content**: Heading, Text, Text Editor, Image, Button, Icon, Icon Box, Image Box, Icon List, Read More, Text Path, Code, HTML, Shortcode, WordPress Widget.
* **Media**: Gallery, Image Carousel, Video, Audio, SoundCloud, Embed, Google Maps.
* **Interactive**: Tabs, Accordion, Toggle, Nested Tabs, Nested Accordion, Nested Toggle, Flip Box, Counter, Progress Bar, Alert.
* **Marketing**: Price Table, Testimonial, Star Rating, Rating, Social Icons, Link in Bio.
* **Site**: Site Menu (responsive navigation), Login, Form, Cloudflare Turnstile.

= Forms, login and spam protection =

* **Form unit**: text, email, phone, URL, textarea, select and checkbox fields; stacked, inline or two-column layout; custom recipient and success message. Form Entries keeps every submission (the newest 50 per form by default, no visitor IPs, included in the WordPress personal data export and erase tools).
* **Newsletter signup (new)**: add the people who fill in a form to Mailchimp, Kit (ConvertKit), MailerLite, Brevo, ActiveCampaign, Klaviyo, Beehiiv, FluentCRM, MailPoet or Listmonk, with a list ID, a consent checkbox, tags and double opt-in. Sidcraft Commerce subscribers (Newsletter Signup unit and checkout box) can be added to a default service too, after they confirm, in the background.
* **Form emails through a service (new)**: send the notification through Resend, Postmark, Amazon SES, Mailgun, SendGrid or Brevo, with a test email and a fallback to normal WordPress mail. Everything is set up under Settings → Email services.
* **Spam protection**: honeypot, Google reCAPTCHA (v2 or v3) and Cloudflare Turnstile. Turnstile can be required per form or for every form, the login form and comments; the Submit button stays disabled until the check passes and every token is verified on the server. Paste keys under Settings → Integrations, or create the widget with a Cloudflare API token.

= Templates and theme =

* Save any section as a template and place it with the Template unit, block, widget or `[sidcraft_page_builder_template]` shortcode. Canvas and Full Width page templates, header and footer editing, template import and export.
* Works with any theme; optionally turn off the builder's default colors and fonts so your theme keeps them.

= Motion and accessibility =

* Entrance and exit animations, custom keyframes, scroll triggers and hover effects; ARIA label, role and attributes on the real element; RTL styles and translation-ready strings.

= Site tools =

* Link any button to `#open-menu-buy-tickets` (the menu item name in lowercase with dashes) to open that dropdown in the Site Menu (Settings > General).
* Maintenance and Coming Soon mode, Safe mode, one-click rollback to an earlier version, Replace URL tool, system info, roles, Units Manager and experiments.
* Yoast SEO and Rank Math see your content; WPML and Polylang can translate it. Import Elementor pages with a side-by-side review and revert at any time. REST routes, WP-CLI commands and hooks for developers.

= Sidcraft Builder Pro =

[Sidcraft Builder Pro](https://canvasly.pro/sidcraft/price.html#lite-vs-pro) is a separate add-on that adds Theme Builder, popups, display conditions, dynamic tags, Loop Grid and Loop Carousel, 70+ extra units, WooCommerce builder units, hosted payments (Stripe, PayPal, Square, Authorize.Net, Razorpay, Mollie) with Payment Forms, form actions and submissions, custom fonts and icons, custom code, editor notes and an AI assistant with an MCP server. Pro's Login & Register and Payment Form units also include the "Require Cloudflare Turnstile" option.

Every install also serves a read-only MCP endpoint at `/wp-json/sidcraft-page-builder/v1/mcp`, so AI agents such as Claude Desktop, Cursor and VS Code can read the site, the builder guide, the document schema and pages after signing in with a WordPress application password. Writing pages, templates, design tokens, media, menus, components and store data needs Sidcraft Builder Pro 2.1.3 and its own MCP endpoint.

The full unit list and user guide are at [canvasly.pro](https://canvasly.pro/sidcraft/blocks.html). For third-party services used by optional features, see "External services" below.

Unlock full potential of [Sidcraft Page Builder with PRO](https://canvasly.pro/sidcraft/)

== External services ==

Sidcraft Page Builder works without any external service. The services below are contacted only when you use the feature that needs them; none of them is used to track you or your visitors, and no data is sent to the plugin author.

= Google Fonts (Google LLC) =

Used to show the Google fonts you pick in the editor. When a published page uses a Google font, the visitor's browser loads the font stylesheet from fonts.googleapis.com and the font files from fonts.gstatic.com, which sends the visitor's IP address and browser user agent to Google. If you turn on "Load Google Fonts locally", your server downloads the stylesheet and font files from the same two hosts once, when you save that setting or click Download, and visitors load the fonts from your own site instead.
[Terms of Service](https://developers.google.com/terms), [Privacy Policy](https://policies.google.com/privacy).

= Google reCAPTCHA (Google LLC) =

Used to protect forms from spam, only after you enter reCAPTCHA keys under Settings. Pages with a protected form load the reCAPTCHA script from www.google.com, which sends the visitor's IP address, browser data and interaction data to Google. When the form is submitted, your server sends the reCAPTCHA response token, your secret key and the visitor's IP address to www.google.com/recaptcha/api/siteverify to check it.
[Terms of Service](https://policies.google.com/terms), [Privacy Policy](https://policies.google.com/privacy).

= Email services (only after you connect one under Settings, Email services) =

Contacted only after you enter a service's details and choose it in a Form unit, as the default newsletter service or as the mailer. Keys stay on your server. A newsletter service receives the subscriber's email address, name, list or audience ID and tags: when a visitor submits a connected form (and ticked the consent box, if the form has one), or after a Sidcraft Commerce subscriber confirms. A mailer receives each form notification (recipient, sender, subject and message text). The settings screen sends your key to the service when you press a Save and show or test button.

* Mailchimp (Intuit), api.mailchimp.com: [Terms](https://mailchimp.com/legal/terms/), [Privacy](https://www.intuit.com/privacy/statement/).
* Kit (Kit, Inc.), api.kit.com: [Terms](https://kit.com/terms), [Privacy](https://kit.com/privacy).
* MailerLite, connect.mailerlite.com: [Terms](https://www.mailerlite.com/legal/terms-of-service), [Privacy](https://www.mailerlite.com/legal/privacy-policy).
* Brevo, api.brevo.com: [Terms](https://www.brevo.com/legal/termsofuse/), [Privacy](https://www.brevo.com/legal/privacypolicy/).
* ActiveCampaign, your account address on api-us1.com or activehosted.com: [Terms](https://www.activecampaign.com/legal/terms-of-service), [Privacy](https://www.activecampaign.com/legal/privacy-policy).
* Klaviyo, a.klaviyo.com: [Terms](https://www.klaviyo.com/legal/terms-of-service), [Privacy](https://www.klaviyo.com/legal/privacy).
* Beehiiv, api.beehiiv.com: [Terms](https://www.beehiiv.com/tou), [Privacy](https://www.beehiiv.com/privacy).
* Listmonk: your own server. FluentCRM and MailPoet: plugins on your own site; nothing leaves your server.
* Resend, api.resend.com: [Terms](https://resend.com/legal/terms-of-service), [Privacy](https://resend.com/legal/privacy-policy).
* Postmark, api.postmarkapp.com: [Terms](https://postmarkapp.com/terms-of-service), [Privacy](https://postmarkapp.com/privacy-policy).
* Amazon SES, email.REGION.amazonaws.com: [Terms](https://aws.amazon.com/service-terms/), [Privacy](https://aws.amazon.com/privacy/).
* Mailgun, api.mailgun.net or api.eu.mailgun.net: [Terms](https://www.mailgun.com/legal/terms/), [Privacy](https://www.mailgun.com/legal/privacy-policy/).
* SendGrid (Twilio), api.sendgrid.com: [Terms](https://www.twilio.com/en-us/legal/tos), [Privacy](https://www.twilio.com/en-us/legal/privacy).

= Cloudflare Turnstile (Cloudflare, Inc.) =

Used to protect forms, the WordPress login form and comments from spam, only after you enter Turnstile keys under Settings, Integrations. Protected pages load the Turnstile script from challenges.cloudflare.com, which sends the visitor's IP address and browser data to Cloudflare. When the form is submitted, your server sends the Turnstile token, your secret key and the visitor's IP address to challenges.cloudflare.com/turnstile/v0/siteverify. If you also enter a Cloudflare API token, the settings screen sends that token and your account ID to api.cloudflare.com, only when you click Verify or Create widget.
[Terms of Service](https://www.cloudflare.com/website-terms/), [Privacy Policy](https://www.cloudflare.com/privacypolicy/), [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

= Google Maps (Google LLC) =

Used by the Google Maps unit to show a map. The page embeds a map from www.google.com for the address you enter, which sends that address and the visitor's IP address and browser data to Google when the page is viewed. If you enter a Google Maps API key under Settings, the key is sent with the request to the Maps Embed API.
[Terms of Service](https://maps.google.com/help/terms_maps/), [Privacy Policy](https://policies.google.com/privacy).

= YouTube (Google LLC) =

Used by the Video unit when you link a YouTube video. The page embeds the player from www.youtube.com, or www.youtube-nocookie.com when privacy mode is on, which sends the video ID and the visitor's IP address and browser data to YouTube when the page is viewed.
[Terms of Service](https://www.youtube.com/t/terms), [Privacy Policy](https://policies.google.com/privacy).

= Vimeo (Vimeo.com, Inc.) =

Used by the Video unit when you link a Vimeo video. The page embeds the player from player.vimeo.com, which sends the video ID and the visitor's IP address and browser data to Vimeo when the page is viewed.
[Terms of Service](https://vimeo.com/terms), [Privacy Policy](https://vimeo.com/privacy).

= Dailymotion (Dailymotion SA) =

Used by the Video unit when you link a Dailymotion video. The page embeds the player from www.dailymotion.com, which sends the video ID and the visitor's IP address and browser data to Dailymotion when the page is viewed.
[Terms of Service](https://legal.dailymotion.com/en/terms-of-use/), [Privacy Policy](https://legal.dailymotion.com/en/privacy-policy/).

= VideoPress (Automattic Inc.) =

Used by the Video unit when you link a VideoPress video. The page embeds the player from videopress.com, which sends the video ID and the visitor's IP address and browser data to Automattic when the page is viewed.
[Terms of Service](https://wordpress.com/tos/), [Privacy Policy](https://automattic.com/privacy/).

= SoundCloud (SoundCloud Global Limited & Co. KG) =

Used by the SoundCloud unit to play a track or playlist. The page embeds the player from w.soundcloud.com with the track URL you enter, which sends that URL and the visitor's IP address and browser data to SoundCloud when the page is viewed.
[Terms of Use](https://soundcloud.com/terms-of-use), [Privacy Policy](https://soundcloud.com/pages/privacy).

= AI Chat Bot (WordPress AI Client) =

The AI Chat Bot is optional. Sidcraft Page Builder does not contact any AI service itself and stores no AI credentials. When you send a chat message, it is passed to the WordPress AI Client (WordPress 7.0 and later), which sends it to the AI provider that a site administrator connected under Settings → Connectors. The request contains your message, the conversation so far and an outline of the page you are editing (unit types, text, layout settings, class and variable names). The provider's own terms and privacy policy apply; they are linked from the provider's connector. Nothing is sent when the chat is not used, and importing HTML sends nothing.

= Kit and template import =

When you import a kit or template file whose images are listed by URL rather than packed in the file, your server downloads each image from the address in the file so it can be added to your Media Library. The request goes to whichever site hosts that image, and sends only your server's IP address and a WordPress user agent.

== Source code ==

The editor script (assets/js/editor.js) is built from the files in src/editor/ with esbuild. The full source, the build script (build.mjs) and instructions are on GitHub: [github.com/ssiddiqi4/canvasly-wordpress-builder](https://github.com/ssiddiqi4/canvasly-wordpress-builder). Run `npm ci` and then `npm run build` to rebuild it. The other scripts in assets/js, including frontend.js, xeditor.js and editor-ai.js, are not compiled: the shipped files are the source.

== Other plugins from the same author ==

* [Sidcraft Media Offload](https://wordpress.org/plugins/sidcraft-cloud-media-offload)
* [Sidcraft Commerce for Sidcraft Page Builder](https://wordpress.org/plugins/sidcraft-commerce-for-sidcraft-page-builder)
* [Sidcraft Restaurant](https://wordpress.org/plugins/sidcraft-restaurant-for-sidcraft-commerce)
* [VidCellar](https://wordpress.org/plugins/vidcellar-lite)
* [Canvasly Web Studio](https://canvasly.pro)

== Installation ==

= Minimum requirements =

* WordPress 6.9 or greater
* PHP 7.4 or greater
* MySQL 5.7 or MariaDB 10.3 or greater

= Recommended =

* WordPress 6.9 or greater, tested up to 7.1
* PHP 8.1 or greater

Shop units appear only while WooCommerce is active. [Sidcraft Builder Pro](https://canvasly.pro/sidcraft/installation.html) will not start if Sidcraft Page Builder is missing, switched off, or older than 0.12.73.

= Installation =

1. Install using **Plugins → Add New → Upload Plugin**, or place the plugin folder in `wp-content/plugins/`.
2. Activate **Sidcraft Page Builder** on the Plugins screen.
3. Open a page or post and choose **Edit with Sidcraft Page Builder**. The same link is in the admin bar.
4. Drag units from the left library onto the canvas, then save. Publish or update the page in WordPress.

= Set up Cloudflare Turnstile (optional) =

1. Go to **Sidcraft Page Builder → Settings → Integrations → Cloudflare Turnstile**.
2. Paste the site key and secret key from your Cloudflare dashboard, or paste an API token and Account ID and click **Create Turnstile widget for this site**.
3. In the editor, select a Form and set **Spam protection** to **Require Cloudflare Turnstile**, or select a Login unit and turn on **Require Cloudflare Turnstile**.

Step-by-step install for Sidcraft Page Builder and Sidcraft Builder Pro, including the license screen, is in the [installation guide](https://canvasly.pro/sidcraft/installation.html). Settings for post types, CSS, fonts, maps, and performance are in the [settings guide](https://canvasly.pro/sidcraft/settings.html).

== Frequently Asked Questions ==

= How do I install Sidcraft Page Builder? =

From the WordPress dashboard go to Plugins → Add New → Upload Plugin, upload the Sidcraft Page Builder zip, then Activate. You can also copy the plugin folder into `wp-content/plugins/`. The [installation guide](https://canvasly.pro/sidcraft/installation.html) covers Sidcraft Builder Pro as well.

= Is Sidcraft Page Builder free? =

Yes. Sidcraft Page Builder is free and GPL licensed, with no limit on pages or sites. [Sidcraft Builder Pro](https://canvasly.pro/sidcraft/price.html) is an optional paid add-on.

= What does Sidcraft Page Builder require? =

WordPress 6.9 or later and PHP 7.4 or later. The plugin is tested up to WordPress 7.1. Sidcraft Builder Pro needs Sidcraft Page Builder 0.12.73 or newer; the Turnstile options in Pro's Login & Register and Payment Form units need Sidcraft Page Builder 0.13.2 or newer.

= How do I edit a page? =

Open the page and choose **Edit with Sidcraft Page Builder**, or use the admin-bar link. Posts and Pages work as soon as you activate the plugin. Other public types stay off until you enable them under Sidcraft Page Builder → Settings → General.

= Where are the settings? =

[Sidcraft Page Builder → Settings](https://canvasly.pro/sidcraft/settings.html) covers post types, maps, reCAPTCHA, Cloudflare Turnstile (Integrations tab), CSS, fonts, performance, tools, and experiments. Colors, type, and breakpoints are under Design System.

= How do I add Cloudflare Turnstile to a form or login? =

Add your Turnstile keys under Sidcraft Page Builder → Settings → Integrations. Then select the Form unit and set Content → Spam protection to **Require Cloudflare Turnstile**, or select the Login unit and turn on **Security → Require Cloudflare Turnstile**. With Sidcraft Builder Pro, the Login & Register and Payment Form units have the same switch under Security.

= Why is the Submit or Log In button greyed out? =

That form requires Cloudflare Turnstile. The button stays disabled until the visitor completes the Turnstile check, then it turns on. It locks again if the check expires or after each submission, because every Turnstile token can be used only once. If the button never turns on, make sure your site key allows this domain and that nothing blocks challenges.cloudflare.com.

= Is Cloudflare Turnstile better than reCAPTCHA? =

Turnstile is a free, privacy-friendly CAPTCHA alternative from Cloudflare that usually passes without puzzles. You do not need to use Cloudflare for DNS. Sidcraft Page Builder supports both, so choose per form.

= Does the Turnstile option protect wp-login.php too? =

The Login unit's switch protects logins sent from that unit. To protect the standard WordPress login screen as well, turn on Settings → Integrations → WordPress forms → Login form. The comment form can be protected there too.

= How can I test Turnstile before going live? =

Click **Use Cloudflare test keys** under Settings → Integrations. Every challenge passes with these keys, so replace them with your real keys before launch.

= Does Sidcraft Page Builder work with my theme and with Gutenberg? =

On the normal WordPress editing screen, Sidcraft Page Builder does not load its full editor. The Sidcraft Page Builder Template block and the Edit with Sidcraft Page Builder launcher still appear. You can turn off Sidcraft Page Builder's default colors and fonts so the theme keeps those. See the [FAQ](https://canvasly.pro/sidcraft/faq.html).

= Do I need to know how to code? =

No. The free unit library, templates, and design system cover a typical page. Custom CSS, HTML, and the Code unit are there when you want them.

= Can I build landing pages with Sidcraft Page Builder? =

Yes. Use the Canvas page template for a blank page without the theme header and footer, then add a hero, pricing, testimonials and a form with Turnstile protection.

= Is Sidcraft Page Builder responsive and mobile friendly? =

Yes. Every layout and style value can be set per breakpoint, and the editor previews desktop, tablet and mobile.

= Can I reuse a section on another page? =

Right-click a Container or Grid and choose Save as Template. Place it later with the Template unit, `[sidcraft_page_builder_template id="42"]`, the Sidcraft Page Builder Template block, or the Sidcraft Page Builder Template sidebar widget. Attributes are listed on the [shortcodes page](https://canvasly.pro/sidcraft/shortcodes.html).

= Why is a unit missing from the library? =

Units Manager can disable a type or hide it from your role. Nested Tabs, Accordion, and Toggle, Collection Loop, and Grid container can also be switched off under Settings → Features. Shop units are absent unless WooCommerce is active. Pro units are absent unless [Sidcraft Builder Pro](https://canvasly.pro/sidcraft/price.html) has started.

= I saved a page but visitors still see the old version. Why? =

A page cache (from a caching plugin, your host, or a CDN) is serving an older copy. Sidcraft Page Builder clears the page from WP-Optimize, WP Super Cache, W3 Total Cache, WP Rocket, LiteSpeed Cache, SiteGround Optimizer, Breeze, WP Fastest Cache, FlyingPress, NitroPack, Hummingbird and Cache Enabler when you save. For any other cache, purge it from that plugin, your host panel or your CDN after saving.

= Will Sidcraft Page Builder slow down my site? =

CSS and scripts load only for the units on the page. You can print CSS as external files, cache non-dynamic unit HTML, lazy-load images, and self-host Google Fonts. The Turnstile script loads only on pages with a protected form. See [Performance](https://canvasly.pro/sidcraft/settings.html#performance).

= Is Sidcraft Page Builder SEO friendly? =

Yes. Sidcraft Page Builder prints semantic HTML with real heading tags, and Yoast SEO and Rank Math can analyze the content you build.

= Can I translate Sidcraft Page Builder pages? =

Yes. Sidcraft Page Builder works with WPML and Polylang and is translation ready.

= How do I move the site to a new address? =

Use Sidcraft Page Builder → Settings → Tools → Replace URL. Run Dry run first. The replacement cannot be undone from that screen.

= What is the difference between Sidcraft Page Builder and Sidcraft Builder Pro? =

Sidcraft Page Builder is the free page builder: the visual editor, the free unit library, the design system, forms with Turnstile, entrance and exit motion, page templates, the collection loop, and basic dynamic tags. [Sidcraft Builder Pro](https://canvasly.pro/sidcraft/price.html#lite-vs-pro) adds Theme Builder, popups, Loop Grid, 70+ extra units, shop units, hosted payments, extra form actions, editor notes, and the AI connection. Every Pro plan includes the same features.

= The editor looks broken. What should I try? =

Under Settings → Advanced, set Editor loader to Iframe. Under Settings → Tools, turn on Safe mode for your account. Safe mode loads the editor without other plugins and without the theme. More answers are in the [FAQ](https://canvasly.pro/sidcraft/faq.html).

= Does Sidcraft Page Builder work with other page builders? =

Sidcraft Page Builder is a standalone page builder and does not require any other builder. If Elementor is installed and active on your site, Sidcraft Page Builder can:

* Import pages, posts and library templates that were built with Elementor into new Sidcraft Page Builder documents. The original content is never changed or deleted. Each conversion can wait in Review Conversions, where you compare it side by side with the current page, see any text, widgets or dynamic data that did not carry over, and accept it, keep it as a copy, or discard it. Accepted pages can be reverted.
* Show a theme header or footer built with Elementor correctly in the Sidcraft Page Builder editor, by loading the stylesheets that your installed copy of Elementor already provides.

Sidcraft Page Builder does not include, copy or redistribute any Elementor code, stylesheets or images. It only references the files already installed on your site, and this compatibility only applies while Elementor is active.

= Is Sidcraft Page Builder affiliated with Elementor? =

No. Elementor is a trademark of its respective owner. Sidcraft Page Builder is an independent plugin and is not affiliated with, sponsored by or endorsed by Elementor or its owner. The name is used only to describe compatibility.

= What happens to my pages if I deactivate Sidcraft Page Builder? =

Each page keeps a readable copy of its layout in the normal WordPress content: headings, text, links, images, lists and tables, as blocks you can edit in the block editor. Builder-only features such as forms, sliders and animations are not in the copy. Reactivate Sidcraft Page Builder and the full layouts are back, since they are stored separately. Pages built before 0.15.0 get their copy the next time they are saved, or all at once with `wp sidcraft-page-builder fallback`.

= Where is the saved format documented? =

On the [document format page](https://canvasly.pro/sidcraft/document-format.html), and as a JSON Schema at /wp-json/sidcraft-page-builder/v1/schema on your own site.

= Does Sidcraft Page Builder connect to external services? =

Only when you use a feature that needs one, such as Google Fonts, a captcha, a map or a video embed. The "External services" section above lists each service, what is sent and when, and links to its terms and privacy policy.

= Where do I get help? =

Read the [documentation](https://canvasly.pro/sidcraft/overview.html) or [contact support](https://canvasly.pro/sidcraft/support.html).

== Screenshots ==

1. **Visual editor** - Unit library on the left, the page canvas in the center, and Content, Style, and Advanced on the right.
2. **Responsive editing** - Switch the canvas between desktop, tablet, and mobile.
3. **CSS Grid** - Place children in rows and columns, span cells, and resize by dragging an edge.
4. **Design system** - Global colors, typography, classes, variables, and components.
5. **Templates** - Save a section and embed it with a shortcode, a block, a unit, or a sidebar widget.
6. **Sidcraft Builder Pro** - Theme Builder, popups, shop units, and the annual plans.
7. **AI Chat Bot and HTML import agent.
8. **AI Chat-Bot Sidcraft Commerce for Page Builder 3 decimal price entry.
9. **AI Chat Bot can read any live URL and recreate the layout using native Sidcraft blocks. Whether you're migrating from another page builder or adapting a design you love, it’s easier than ever.  

== Changelog ==

= 2.4.2 =
* Fix: the editor canvas repaints at once after a unit is moved or dropped, so no marks are left behind until you click.
* Fix: the Flip Box keeps its text and Read more button inside the card on the front end. Its text no longer takes the theme's heading and link sizes, and the card grows with its text.
* Fix: the container tab in the editor is blue again.
* Fix: the split front-end CSS stays on when the plugin is checked out with Windows line endings.

= 2.4.1 =
* New: Sidcraft Commerce subscribers (Newsletter Signup unit and the checkout box) can also be added to a default newsletter service and list, after they confirm, in the background.
* Readme: shortened to fit the WordPress.org limits, Tested up to 7.2.

= 2.4.0 =
* New: Settings → Email services. Connect Mailchimp, Kit (ConvertKit), MailerLite, Brevo, ActiveCampaign, Klaviyo, Beehiiv, FluentCRM, MailPoet or Listmonk and add the people who fill in a Form unit to a list (list ID, optional consent checkbox, tags and double opt-in are set in the form, under Email service).
* New: send the Form unit's notification email through Resend, Postmark, Amazon SES, Mailgun, SendGrid or Brevo instead of the web server's mail, with a test email, a fallback to normal WordPress mail and an option to use the service for all site email.
* Keys are stored on the server only, shown masked, and every service is contacted only after you set it up.

= 2.3.8 =
* Fix: a PHP warning ("Array to string conversion") when saving a page that had an autosave.

= 2.3.7 =
* Fix: the Remove button on the header and footer a page inherits from its theme now really removes them. It sets a new page setting, "Hide the theme header and footer on this page", that works on the page itself (before, it only switched the template to Canvas, which keeps the theme's header and footer). The editor shows the page's own Header and Footer areas instead. To bring the theme's back, open Page Settings, untick the new box, save and reload.
* Fix: documentation links now point to canvasly.pro/sidcraft/.

= 2.3.6 =
* Fix: restoring a site from a kit. Imported pages are now published by default (a new "Publish imported pages" tick box; untick to keep drafts), and importing a kit no longer turns an already-live page back into a draft. The export form now has "Selected pages and posts" and every page ticked by default, so a kit made with Export keeps your pages. If you import a kit file that has no pages in it, you now see a clear message instead of a silent success.

= 2.3.5 =
* New: the header and footer that a page inherits from the theme now have a Reset button (use the theme's own again, discarding saved changes made on this page or for the whole theme) and a Remove button (hide them on this page by setting the page template to Canvas) in their toolbar. Before, a header or footer you had edited stayed on the page, even after the theme was deleted, and could not be removed.

= 2.3.4 =
* New: classes typed under Advanced > CSS Classes now also apply to the unit in the editor canvas, so a theme or page stylesheet that targets them shows while you edit (it already did on the live page).

= 2.3.3 =
* Fix: a Shortcode unit's live preview that arrived while the editor canvas was still starting was never drawn, so the unit showed the raw shortcode text. The canvas now repaints once more after the preview loads.

= 2.3.2 =
* Fix: searching the Icon Library now shows only the matching icons. Before, the count changed but every icon stayed on screen.

= 2.3.1 =
* Fix: the editor's Preview button now opens the new tab at once and shows "Saving your changes…" there while the page saves, then loads the preview. Before, nothing happened until the save finished, which felt broken on slow servers and could trigger the browser's pop-up blocker.

= 2.3.0 =
* New: Tools > "Redesign this site from an example landing page" card. The feature itself is part of Sidcraft Builder Pro; in Sidcraft Page Builder the card is shown with the Go button switched off and a PRO note.

= 2.2.0 =
* New: Settings > General > Open a menu from a button. A button or link set to `#open-menu-<menu item name>` (for example `#open-menu-buy-tickets`) scrolls to the top and opens that dropdown in the Site Menu, and unfolds the menu first on phones. Optional scroll-to-top.

= 2.1.4 =
* Security: template deletion now verifies the target is a saved template and requires `delete_post`, so an Editor can no longer delete ordinary pages through the template endpoint.
* Security: reCAPTCHA and Google Maps API secrets are removed from design-system REST responses, editor bootstrap data and public global-settings responses. Exports and imports preserve existing secrets when a masked or omitted value is sent back.
* Security: roles with `edit_pages` keep full access, roles with only `edit_posts` default to content-only, and a one-time migration downgrades legacy content-only roles that were stored as full. Core site identity fields now require `manage_options`.
* Security: form recipients are resolved from the saved form node instead of the request's `_to` field, and public submissions are throttled per IP/form (default 10 per hour, filterable).
* Security: template management and import require both `edit_pages` and the Role Manager's edit capability.
* Security: local media import accepts basenames inside the extracted media directory only and rejects symlinks.
* Security: `/loop` denies password-protected and non-viewable posts unless the caller can edit the post.
* Security: draft/private pages and templates are filtered from navigation, template lists and kit exports unless the caller can edit the post.
* Fixed: form submissions rendered outside the standard renderer fall back to the site admin address rather than trusting a request-supplied recipient.

= 2.1.3 =
* Fixed: PHP warnings from Text, Button, Icon Box, Divider and Icon List units when a saved layout predates a newer setting.
* Fixed: "conditional query tag called before the query" notices from early display-rule and maintenance checks.
* Fixed: the "translation loading too early" notice by registering bundled translations after setup.
* Fixed: the page fallback must-use plugin no longer checks query tags before the main query.

= 2.1.2 =
* Fixed: Plugin Check warning about reading the fallback result flag without a nonce.
* Fixed: the readme changelog now fits the WordPress.org 5,000-character limit.

= 2.1.1 =
* Fixed: the fallback must-use plugin is installed only from the explicit control on the Tools screen (or when Safe Mode is turned on). It is no longer recreated automatically on activation, updates or admin requests.
* Fixed: duplicate copies of the fallback or Safe Mode must-use plugin are removed on update, and both are removed on uninstall.
* Fixed: the plugin package uses standard forward-slash paths so WordPress can install and activate it.

= 2.1.0 =
* New: a read-only MCP endpoint at `/wp-json/sidcraft-page-builder/v1/mcp` for AI agents, with `sidcraft-site-info`, `sidcraft-builder-guide`, `sidcraft-schema` and `sidcraft-content`. Writing content, templates, design tokens, media, menus, components and store data is part of Sidcraft Builder Pro 2.1.0.

= 2.0.0 =
* Faster pages: per-page stylesheets that keep only the CSS parts a page uses, plus cached unit and asset maps.
* Fixed: right-to-left frontend and editor stylesheets were out of date; both are regenerated from the current styles.
* Fixed: template styles could be lost when a template rendered after the page stylesheet; they now print with the template.
* Fixed: HTML import could miss the end of a page while it was still loading.
* Fixed: imported SVG logos lost their colors and could restyle the page.
* Fixed: web-font subsets and variable-font weights were added incorrectly.
* Fixed: Google Maps embedded by coordinates used the region code as the address.
* Fixed: an inline SVG with an empty link or numeric icon id could fail the whole import.
* Rebuild a website: detects the builder used, reuses this site's media, and reports copied, reused and failed files.

= Earlier versions =
* See `changelog.txt` for the full history.

== Upgrade Notice ==

= 2.4.2 =
Fixes the editor canvas repaint after drag and drop, and the Flip Box layout on the front end.

= 2.4.1 =
Sidcraft Commerce mailing-list sign-ups can also be added to Mailchimp and other services. Sidcraft Commerce 2.1.1 documents it (updating Commerce is not required for it to work).

= 2.4.0 =
New Settings → Email services: newsletter signup and email sending through Mailchimp, Kit, Brevo, Resend, Amazon SES and more. Nothing is sent to a service until you set it up.

= 2.3.5 =
Inherited header and footer can be reset or removed from the page.

= 2.3.4 =
The editor canvas now shows CSS classes on units, so styled pages look right while editing.

= 2.3.3 =
Shortcode units now always show their preview in the editor.

= 2.3.2 =
Icon Library search now filters the icons.

= 2.3.1 =
Preview opens instantly instead of waiting for the save.

= 2.3.0 =
Adds the Pro site-redesign card to Tools.

= 2.2.0 =
Adds buttons that open a Site Menu dropdown (Settings > General).

= 2.1.4 =
Security release. Update promptly. Fixes template deletion authorization, secret disclosure, Contributor role overreach, form mail relay, template-management bypass, media path handling, `/loop` access and draft/private filtering. Review content-only role grants after migration.

= 1.3.0 =
Fixes remaining insecure-content warnings for builder stylesheets on HTTPS sites behind a proxy or CDN.

= 1.2.5 =
Fixes insecure-content warnings: builder stylesheets now load over HTTPS on HTTPS sites.

= 1.2.4 =
HTML import keeps the colors of outline and text-style buttons.

= 1.2.3 =
The AI Chat Bot now uses WordPress's built-in AI Client (Settings → Connectors, WordPress 7.0+). Reconnect AI there; the chat's old API key is removed.

= 1.2.2 =
The AI Chat Bot now works with Azure OpenAI, Perplexity, Groq, Mistral and DeepSeek too.

= 1.2.1 =
Adds the AI Chat Bot with HTML import, Form Entries for form submissions, and a fix for the crowded top bar.

= 0.15.4 =
Dragging a widget onto "Drag widget here" works in Firefox.

= 0.15.3 =
Dropping a widget on "Drag widget here" works in Firefox.

= 0.15.2 =
A widget dropped on "Drag widget here" now gets its own container automatically.

= 0.15.1 =
Dropping a unit on the "Drag widget here" area at the bottom of the page works every time.

= 0.15.0 =
Pages keep a readable copy in WordPress if the builder is switched off, Elementor conversions can be reviewed side by side before they replace a page, and the Navigator can collapse, rename, hide and lock.

= 0.14.4 =
Units can be dragged onto the canvas in Firefox again.

= 0.14.3 =
Brings back the "Add to Favorites" right-click menu on units.

= 0.14.2 =
Fixes a fatal error in the block editor when Sidcraft Builder Pro and Safe Mode are both on. Update Sidcraft Builder Pro to 0.11.5 as well.

= 0.14.1 =
Hook names changed to the sidcraft_page_builder_ prefix. Update Sidcraft Builder Pro to 0.11.3 at the same time.

= 0.14.0 =
The plugin is now called Sidcraft Page Builder. Custom CSS fields and Global Classes are removed; move any custom CSS into XEditor classes before updating.

= 0.13.3 =
Saved pages now refresh right away on sites that use the WP-Optimize page cache.

= 0.13.2 =
Adds "Require Cloudflare Turnstile" to the Login unit and keeps Submit and Log In buttons disabled until the Turnstile check passes.

= 0.12.107 =
Borders with a style but no colour now default to white instead of a dark box.

= 0.12.106 =
Adds button hover colours to Site Menu, Form, Login, Link in Bio and Collection Loop, and fixes sliders that showed 0 at the minimum position.

= 0.12.105 =
Stops themes from recolouring the Site Menu button and other Sidcraft Page Builder buttons on hover (for example turning them red).

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
