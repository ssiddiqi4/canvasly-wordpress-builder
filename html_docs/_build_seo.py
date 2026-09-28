# -*- coding: utf-8 -*-
"""One-shot SEO pass for the static pages and the WordPress WXR."""
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORIGIN = "https://canvasly.pro"
MODIFIED = "2026-09-24"
MODIFIED_DISPLAY = "September 24, 2026"
LOCAL = "2026-09-24 17:10:00"
GMT = "2026-09-24 21:10:00"
PUB = "Thu, 24 Sep 2026 21:10:00 +0000"
LOGO_URL = "https://canvasly.pro/assets/canvasly-logo.png"
LOGO_LINK = "https://canvasly.pro"
LOGO_ALT = "Canvasly. Design your pages visually."

DIMS = {
    "assets/editor-layout.svg": (880, 420),
    "assets/settings-panel.svg": (880, 280),
    "assets/grid.svg": (880, 260),
    "assets/context-menu.svg": (420, 360),
    "assets/ai-flow.svg": (880, 220),
}

LINK_MAP = {
    "index.html": "/canvasly/",
    "https://canvasly.pro/": "/canvasly/",
    "https://canvasly.pro": "/canvasly/",
    "overview.html": "/canvasly-overview/",
    "https://canvasly.pro/overview.html": "/canvasly-overview/",
    "https://canvasly.local/overview.html": "/canvasly-overview/",
    "price.html": "/canvasly-price/",
    "https://canvasly.pro/price.html": "/canvasly-price/",
    "https://canvasly.pro/price": "/canvasly-price/",
    "https://canvasly.local/price.html": "/canvasly-price/",
    "installation.html": "/canvasly-install/",
    "https://canvasly.local/installation.html": "/canvasly-install/",
    "settings.html": "/canvasly-settings/",
    "https://canvasly.local/settings.html": "/canvasly-settings/",
    "shortcodes.html": "/canvasly-shortcodes/",
    "https://canvasly.local/shortcodes.html": "/canvasly-shortcodes/",
    "blocks.html": "/canvasly-units/",
    "https://canvasly.local/blocks.html": "/canvasly-units/",
    "faq.html": "/canvasly-faq/",
    "https://canvasly.local/faq.html": "/canvasly-faq/",
    "ai-connectivity.html": "/canvasly-ai/",
    "https://canvasly.local/ai-connectivity.html": "/canvasly-ai/",
    "support.html": "/canvasly-support/",
    "https://canvasly.pro/support.html": "/canvasly-support/",
    "https://canvasly.local/support.html": "/canvasly-support/",
}

PAGES = [
    {
        "file": "index.html",
        "slug": "canvasly",
        "id": 91001,
        "parent": 0,
        "order": 0,
        "crumb": "Home",
        "h1": None,
        "title": "Canvasly and VidCellar | WordPress Pages and Video",
        "description": "Canvasly is a visual WordPress page builder. VidCellar is a WordPress video library with private playback. Each product has a free plugin and an optional Pro add-on.",
        "focus": "Canvasly page builder",
        "image": "assets/editor-layout.svg",
        "related": [],
    },
    {
        "file": "overview.html",
        "slug": "canvasly-overview",
        "id": 91008,
        "parent": 91001,
        "order": 1,
        "crumb": "Overview",
        "h1": None,
        "title": "Canvasly Documentation | Visual WordPress Page Builder",
        "description": "Canvasly is a visual page builder for WordPress. Design a page on a canvas, then publish it in WordPress. Covers install, settings, units, shortcodes, AI and MCP.",
        "focus": "Canvasly documentation",
        "image": "assets/editor-layout.svg",
        "related": [],
    },
    {
        "file": "price.html",
        "slug": "canvasly-price",
        "id": 91009,
        "parent": 91001,
        "order": 2,
        "crumb": "Price",
        "h1": None,
        "title": "Canvasly Lite vs Canvasly Pro | Pricing",
        "description": "Compare Canvasly Lite and Canvasly Pro. Lite is free. Pro annual plans start at $59 and add theme parts, shop units, popups, forms, and payments.",
        "focus": "Canvasly Pro pricing",
        "image": "",
        "related": [],
    },
    {
        "file": "installation.html",
        "slug": "canvasly-install",
        "id": 91002,
        "parent": 91001,
        "order": 3,
        "crumb": "Install",
        "h1": ("<h1>Install and start editing</h1>", "<h1>Install Canvasly and start editing</h1>"),
        "title": "Install Canvasly and Canvasly Pro | WordPress",
        "description": "Install Canvasly on WordPress 6.9+ and PHP 7.4+, then activate Canvasly Pro 0.12.73 or newer. Open any page or post with Edit with Canvasly.",
        "focus": "install Canvasly",
        "image": "assets/settings-panel.svg",
        "related": [("settings.html", "Canvasly settings"), ("faq.html", "Common questions")],
    },
    {
        "file": "settings.html",
        "slug": "canvasly-settings",
        "id": 91003,
        "parent": 91001,
        "order": 4,
        "crumb": "Settings",
        "h1": ("<h1>Settings</h1>", "<h1>Canvasly settings</h1>"),
        "title": "Canvasly Settings | Options, Defaults, and Roles",
        "description": "Every Canvasly settings screen: General, Integrations, Advanced, Performance, Tools, Features, Design System, Role Manager, and Units Manager, with each default.",
        "focus": "Canvasly settings",
        "image": "assets/settings-panel.svg",
        "related": [("installation.html", "Install Canvasly"), ("blocks.html", "Canvasly units"), ("faq.html", "Common questions")],
    },
    {
        "file": "shortcodes.html",
        "slug": "canvasly-shortcodes",
        "id": 91004,
        "parent": 91001,
        "order": 5,
        "crumb": "Shortcodes",
        "h1": ("<h1>Shortcodes</h1>", "<h1>Canvasly shortcodes</h1>"),
        "title": "Canvasly Shortcodes | Templates, Anchors, and Menus",
        "description": "Canvasly shortcodes for a saved template, a menu anchor, and a site menu, plus the Canvasly Template sidebar widget. Copy the examples into WordPress.",
        "focus": "Canvasly shortcodes",
        "image": "",
        "related": [("blocks.html", "Canvasly units"), ("faq.html", "Common questions")],
    },
    {
        "file": "blocks.html",
        "slug": "canvasly-units",
        "id": 91005,
        "parent": 91001,
        "order": 6,
        "crumb": "Units",
        "h1": None,
        "title": "Canvasly Units | Grid, Library, and Template Block",
        "description": "Canvasly units you place on the canvas, including Grid, the right-click menu, layout and shop units, and the WordPress Canvasly Template block.",
        "focus": "Canvasly units",
        "image": "assets/editor-layout.svg",
        "related": [("shortcodes.html", "Canvasly shortcodes"), ("settings.html", "Canvasly settings")],
    },
    {
        "file": "ai-connectivity.html",
        "slug": "canvasly-ai",
        "id": 91007,
        "parent": 91001,
        "order": 7,
        "crumb": "AI and MCP",
        "h1": ("<h1>AI connectivity and MCP</h1>", "<h1>Canvasly AI connectivity and MCP</h1>"),
        "title": "Canvasly AI Connection and MCP | Pro Setup Guide",
        "description": "Connect an outside agent such as Cursor or Claude to Canvasly Pro with AI Connection and a read-only MCP server. Saving a page still needs a WordPress editor.",
        "focus": "Canvasly MCP",
        "image": "assets/ai-flow.svg",
        "related": [("settings.html", "Canvasly settings"), ("faq.html", "Common questions")],
    },
    {
        "file": "faq.html",
        "slug": "canvasly-faq",
        "id": 91006,
        "parent": 91001,
        "order": 8,
        "crumb": "FAQ",
        "h1": ("<h1>Questions</h1>", "<h1>Canvasly questions</h1>"),
        "title": "Canvasly FAQ | Install, Editor, Units, and Pro",
        "description": "Answers for installing Canvasly, editing a page, missing units, reusable templates, maintenance mode, popups, URL replacement, and site-wide colors.",
        "focus": "Canvasly FAQ",
        "image": "",
        "related": [("installation.html", "Install Canvasly"), ("settings.html", "Canvasly settings"), ("ai-connectivity.html", "AI and MCP")],
    },
    {
        "file": "support.html",
        "slug": "canvasly-support",
        "id": 91010,
        "parent": 91001,
        "order": 9,
        "crumb": "Support",
        "h1": None,
        "title": "Contact Canvasly Support",
        "description": "Contact Canvasly support about Canvasly or VidCellar. Send your name, email address, and a message written in English.",
        "focus": "Canvasly support",
        "image": "",
        "related": [],
    },
]


def enhance_imgs(text):
    n = {"i": 0}

    def repl(match):
        n["i"] += 1
        tag = match.group(0)[:-1]
        src = re.search(r'src="([^"]+)"', tag).group(1)
        w, h = DIMS[src]
        extras = []
        if "width=" not in tag:
            extras.append(f'width="{w}" height="{h}"')
        if "decoding=" not in tag:
            extras.append('decoding="async"')
        if n["i"] == 1 and "fetchpriority=" not in tag:
            extras.append('fetchpriority="high"')
        elif n["i"] > 1 and "loading=" not in tag:
            extras.append('loading="lazy"')
        if extras:
            tag = tag + " " + " ".join(extras)
        return tag + ">"

    return re.sub(r"<img\b[^>]*>", repl, text)


def repair_imgs(text):
    text = re.sub(
        r'height="(\d+) decoding="async (fetchpriority="high"|loading="lazy")',
        r'height="\1" decoding="async" \2',
        text,
    )
    text = re.sub(
        r'height="(\d+) decoding=" async (fetchpriority="high"|loading="lazy")',
        r'height="\1" decoding="async" \2',
        text,
    )
    return text


def breadcrumb(page):
    if page["file"] == "index.html":
        return (
            '    <nav class="crumbs" aria-label="Breadcrumb">\n'
            '      <ol>\n'
            '        <li aria-current="page">Canvasly documentation</li>\n'
            "      </ol>\n"
            "    </nav>\n"
        )
    return (
        '    <nav class="crumbs" aria-label="Breadcrumb">\n'
        "      <ol>\n"
        '        <li><a href="index.html">Canvasly documentation</a></li>\n'
        f'        <li aria-current="page">{html.escape(page["crumb"])}</li>\n'
        "      </ol>\n"
        "    </nav>\n"
    )


def related_nav(page):
    if not page["related"]:
        return ""
    links = "\n".join(
        f'      <a href="{href}">{html.escape(label)}</a>' for href, label in page["related"]
    )
    return (
        '    <nav class="card toc" aria-label="Related">\n'
        "      <h2>Related</h2>\n"
        f"{links}\n"
        "    </nav>\n"
    )


def json_ld(page, faq_entities):
    url = f"{ORIGIN}/{page['file']}"
    crumbs = [
        {"@type": "ListItem", "position": 1, "name": "Canvasly documentation", "item": f"{ORIGIN}/index.html"}
    ]
    if page["file"] != "index.html":
        crumbs.append(
            {"@type": "ListItem", "position": 2, "name": page["crumb"], "item": url}
        )
    graph = [
        {
            "@type": "BreadcrumbList",
            "@id": url + "#breadcrumb",
            "itemListElement": crumbs,
        }
    ]
    if page["file"] == "faq.html":
        graph.insert(
            0,
            {
                "@type": "FAQPage",
                "@id": url + "#faq",
                "url": url,
                "name": page["title"],
                "description": page["description"],
                "inLanguage": "en",
                "dateModified": MODIFIED,
                "isPartOf": {"@type": "WebSite", "name": "Canvasly Help", "url": f"{ORIGIN}/index.html"},
                "mainEntity": faq_entities,
            },
        )
    else:
        page_node = {
            "@type": "TechArticle",
            "@id": url + "#article",
            "headline": page["title"],
            "description": page["description"],
            "inLanguage": "en",
            "datePublished": MODIFIED,
            "dateModified": MODIFIED,
            "mainEntityOfPage": url,
            "author": {"@type": "Organization", "name": "Canvasly"},
            "publisher": {"@type": "Organization", "name": "Canvasly"},
            "isPartOf": {"@type": "WebSite", "name": "Canvasly Help", "url": f"{ORIGIN}/index.html"},
        }
        if page["image"]:
            page_node["image"] = f"{ORIGIN}/{page['image']}"
        graph.insert(0, page_node)
    if page["file"] == "index.html":
        graph.append(
            {
                "@type": "ItemList",
                "@id": url + "#guide",
                "name": "Canvasly documentation",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": i,
                        "name": other["title"],
                        "url": f"{ORIGIN}/{other['file']}",
                    }
                    for i, other in enumerate([p for p in PAGES if p["file"] != "index.html"], start=1)
                ],
            }
        )
    payload = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(payload, ensure_ascii=False, indent=2)


def head(page, faq_entities):
    url = f"{ORIGIN}/{page['file']}"
    image_meta = ""
    if page["image"]:
        image = f"{ORIGIN}/{page['image']}"
        w, h = DIMS[page["image"]]
        image_meta = (
            f'  <meta property="og:image" content="{image}">\n'
            f'  <meta property="og:image:width" content="{w}">\n'
            f'  <meta property="og:image:height" content="{h}">\n'
            f'  <meta property="og:image:alt" content="{html.escape(page["title"], quote=True)}">\n'
            f'  <meta name="twitter:image" content="{image}">\n'
        )
    return f"""  <!-- Replace https://canvasly.local with the live origin before publishing. Host either these HTML files or the imported WordPress pages, not both. -->
  <title>{html.escape(page["title"])}</title>
  <meta name="description" content="{html.escape(page["description"], quote=True)}">
  <meta name="author" content="Canvasly">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="{url}">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Canvasly Help">
  <meta property="og:title" content="{html.escape(page["title"], quote=True)}">
  <meta property="og:description" content="{html.escape(page["description"], quote=True)}">
  <meta property="og:url" content="{url}">
{image_meta}  <meta property="article:modified_time" content="{MODIFIED}T23:45:00+00:00">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(page["title"], quote=True)}">
  <meta name="twitter:description" content="{html.escape(page["description"], quote=True)}">
  <script type="application/ld+json">
{json_ld(page, faq_entities)}
  </script>
  <link rel="stylesheet" href="assets/style.css?v=20260923">"""


def faq_from_html(text):
    articles = re.findall(r"<article>(.*?)</article>", text, flags=re.S)
    entities = []
    for article in articles:
        q = re.search(r"<h2>(.*?)</h2>", article, flags=re.S)
        if not q:
            continue
        question = re.sub(r"<[^>]+>", "", q.group(1)).strip()
        paragraphs = re.findall(r"(<p\b[^>]*>)(.*?)</p>", article, flags=re.S)
        answers = []
        for open_tag, para in paragraphs:
            if "todo" in open_tag or para.strip().startswith("<strong>TODO"):
                continue
            plain = re.sub(r"<[^>]+>", "", para)
            plain = html.unescape(re.sub(r"\s+", " ", plain)).strip()
            if plain.lower().startswith("todo:"):
                continue
            answers.append(plain)
        if not answers:
            continue
        entities.append(
            {
                "@type": "Question",
                "name": question,
                "acceptedAnswer": {"@type": "Answer", "text": " ".join(answers)},
            }
        )
    return entities


def update_html(page):
    path = ROOT / page["file"]
    text = path.read_text(encoding="utf-8")
    if 'rel="canonical"' in text:
        text = repair_imgs(text)
        text = text.replace(
            "This guide covers install, settings, units, shortcodes, and MCP.",
            "Covers install, settings, units, shortcodes, and MCP.",
        )
        text = re.sub(
            r"Canvasly AI Connection and MCP \| Pro Setup(?! Guide)",
            "Canvasly AI Connection and MCP | Pro Setup Guide",
            text,
        )
        path.write_text(text, encoding="utf-8", newline="\n")
        print(f"{page['file']}: already optimized, repaired")
        return text
    if page["h1"]:
        old, new = page["h1"]
        if old not in text:
            raise SystemExit(f"missing h1 in {page['file']}")
        text = text.replace(old, new, 1)
    text = enhance_imgs(text)
    text = text.replace(
        '<p class="brand">Canvasly <span>Help</span></p>',
        '<p class="brand"><a href="index.html">Canvasly</a> <span>Help</span></p>',
        1,
    )
    text = text.replace("<body>\n", '<body>\n  <a class="skip" href="#content">Skip to content</a>\n', 1)
    text = text.replace("<main>\n", '<main id="content">\n' + breadcrumb(page), 1)
    lede = re.search(r'<p class="lede">.*?</p>\n', text, flags=re.S)
    if not lede:
        raise SystemExit(f"missing lede in {page['file']}")
    stamp = (
        f'{lede.group(0)}'
        f'      <p class="meta">Updated <time datetime="{MODIFIED}">{MODIFIED_DISPLAY}</time>. '
        "Covers Canvasly 0.12.76 and Canvasly Pro 0.6.3.</p>\n"
    )
    text = text[: lede.start()] + stamp + text[lede.end() :]
    rel = related_nav(page)
    if rel:
        text = text.replace("  </main>", rel + "  </main>", 1)
    # FAQ schema must be built after h1/body edits, from the body copy.
    entities = faq_from_html(text) if page["file"] == "faq.html" else []
    text = re.sub(
        r"  <title>.*?\n  <link rel=\"stylesheet\" href=\"assets/style.css(?:\?v=[^\"]*)?\">",
        head(page, entities),
        text,
        count=1,
        flags=re.S,
    )
    path.write_text(text, encoding="utf-8", newline="\n")
    desc = page["description"]
    title = page["title"]
    print(f"{page['file']}: title {len(title)} chars, description {len(desc)} chars, faq {len(entities)}")
    if not (40 <= len(title) <= 65):
        print("  TITLE LENGTH WARNING")
    if not (120 <= len(desc) <= 165):
        print("  DESCRIPTION LENGTH WARNING")
    return text


VOID = {"img", "br", "hr", "meta", "link", "input", "source"}


class TreeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = []
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": attrs, "children": []}
        self.stack[-1].append(node)
        if tag not in VOID:
            self.stack.append(node["children"])

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if len(self.stack) > 1:
            self.stack.pop()

    def handle_data(self, data):
        self.stack[-1].append(data)

    def handle_entityref(self, name):
        self.stack[-1].append(html.unescape(f"&{name};"))

    def handle_charref(self, name):
        self.stack[-1].append(html.unescape(f"&#{name};"))


def parse_main(text):
    main = re.search(r"<main id=\"content\">(.*)</main>", text, flags=re.S)
    if not main:
        raise SystemExit("main missing")
    parser = TreeParser()
    parser.feed(main.group(1))
    parser.close()
    return parser.root


def attr_map(node):
    return {k: v for k, v in node["attrs"]}


def esc_text(value):
    return html.escape(value, quote=False)


def rewrite_href(href, wp):
    if not wp:
        return href
    return LINK_MAP.get(href, href)


def serialize(node, wp):
    if isinstance(node, str):
        return esc_text(node)
    attrs = []
    for key, value in node["attrs"]:
        if value is None:
            attrs.append(key)
            continue
        if key == "href":
            value = rewrite_href(value, wp)
        attrs.append(f'{key}="{html.escape(value, quote=True)}"')
    attr = (" " + " ".join(attrs)) if attrs else ""
    if node["tag"] in VOID:
        return f"<{node['tag']}{attr}>"
    inner = "".join(serialize(child, wp) for child in node["children"])
    return f"<{node['tag']}{attr}>{inner}</{node['tag']}>"


def inner_html(node, wp):
    return "".join(serialize(child, wp) for child in node["children"]).strip()


def plain_text(node):
    if isinstance(node, str):
        return node
    return "".join(plain_text(child) for child in node["children"])


def blocks_from(nodes, wp, inherited_id=None):
    out = []
    pending_id = inherited_id
    for node in nodes:
        if isinstance(node, str):
            if node.strip():
                out.append(paragraph_block(esc_text(node.strip()), "", wp))
            continue
        tag = node["tag"]
        attrs = attr_map(node)
        classes = attrs.get("class", "")
        if tag in {"header", "article", "section", "div"}:
            out.extend(blocks_from(node["children"], wp, attrs.get("id")))
            continue
        if tag == "nav" and "toc" in classes.split():
            out.extend(toc_blocks(node, wp))
            continue
        if tag == "nav":
            out.append(html_block(serialize(node, wp)))
            continue
        if tag in {"h1", "h2", "h3", "h4"}:
            level = int(tag[1])
            anchor = attrs.get("id") or pending_id
            pending_id = None
            out.append(heading_block(level, inner_html(node, wp), anchor))
            continue
        pending_id = None
        if tag == "p":
            out.append(paragraph_block(inner_html(node, wp), classes, wp))
            continue
        if tag in {"ul", "ol"}:
            out.append(list_block(node, wp))
            continue
        if tag in {"table", "figure", "pre", "dl", "blockquote"}:
            out.append(html_block(serialize(node, wp)))
            continue
        out.append(html_block(serialize(node, wp)))
    return out


def heading_block(level, inner, anchor):
    tag = f"h{level}"
    id_attr = f' id="{html.escape(anchor, quote=True)}"' if anchor else ""
    if level == 2 and not anchor:
        comment = "<!-- wp:heading -->"
    else:
        data = {"level": level}
        if anchor:
            data["anchor"] = anchor
        comment = "<!-- wp:heading " + json.dumps(data, ensure_ascii=False) + " -->"
    return f"{comment}\n<{tag} class=\"wp-block-heading\"{id_attr}>{inner}</{tag}>\n<!-- /wp:heading -->"


def paragraph_block(inner, classes, wp):
    class_list = [c for c in classes.split() if c]
    if class_list:
        payload = json.dumps({"className": " ".join(class_list)}, ensure_ascii=False)
        class_attr = " " + " ".join(class_list)
        return (
            f"<!-- wp:paragraph {payload} -->\n"
            f"<p class=\"{html.escape(' '.join(class_list), quote=True)}\">{inner}</p>\n"
            "<!-- /wp:paragraph -->"
        )
    return f"<!-- wp:paragraph -->\n<p>{inner}</p>\n<!-- /wp:paragraph -->"


def list_block(node, wp):
    ordered = node["tag"] == "ol"
    items = []
    for child in node["children"]:
        if isinstance(child, str) or child["tag"] != "li":
            continue
        items.append(
            "<!-- wp:list-item -->\n"
            f"<li>{inner_html(child, wp)}</li>\n"
            "<!-- /wp:list-item -->"
        )
    body = "\n".join(items)
    if ordered:
        return (
            '<!-- wp:list {"ordered":true} -->\n'
            f'<ol class="wp-block-list">\n{body}\n</ol>\n'
            "<!-- /wp:list -->"
        )
    return f'<!-- wp:list -->\n<ul class="wp-block-list">\n{body}\n</ul>\n<!-- /wp:list -->'


def toc_blocks(node, wp):
    out = []
    links = []
    for child in node["children"]:
        if isinstance(child, str):
            continue
        if child["tag"] in {"h1", "h2", "h3"}:
            out.append(heading_block(int(child["tag"][1]), inner_html(child, wp), attr_map(child).get("id")))
        elif child["tag"] == "a":
            links.append(child)
    if links:
        items = []
        for link in links:
            items.append(
                "<!-- wp:list-item -->\n"
                f"<li>{serialize(link, wp)}</li>\n"
                "<!-- /wp:list-item -->"
            )
        body = "\n".join(items)
        out.append(f'<!-- wp:list -->\n<ul class="wp-block-list">\n{body}\n</ul>\n<!-- /wp:list -->')
    return out


def html_block(markup):
    return f"<!-- wp:html -->\n{markup}\n<!-- /wp:html -->"


def cdata(value):
    return value.replace("]]>", "]]]]><![CDATA[>")


def meta_block(key, value):
    return (
        "\t\t<wp:postmeta>\n"
        f"\t\t\t<wp:meta_key><![CDATA[{key}]]></wp:meta_key>\n"
        f"\t\t\t<wp:meta_value><![CDATA[{cdata(value)}]]></wp:meta_value>\n"
        "\t\t</wp:postmeta>"
    )


def h1_text(text):
    match = re.search(r"<h1>(.*?)</h1>", text, flags=re.S)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip()


def logo_node(page):
    return {
        "id": f"{page['slug']}-logo",
        "type": "image",
        "settings": {
            "image_url": LOGO_URL,
            "alt": LOGO_ALT,
            "link_to": "custom",
            "link": LOGO_LINK,
            "link_target": "_self",
            "alignment": "left",
            "width": "120px",
            "height": "96px",
            "object_fit": "contain",
        },
        "styles": {"base": {}},
        "children": [],
    }


def logo_block():
    markup = (
        f'<p class="brand"><a href="{LOGO_LINK}">'
        f'<img class="brand-logo" src="{LOGO_URL}" alt="{html.escape(LOGO_ALT, quote=True)}" '
        'width="400" height="320" style="height:96px;width:auto;border-radius:12px">'
        "</a></p>"
    )
    return html_block(markup)


def document_json(page, main_html):
    doc = {
        "version": "2.8",
        "root": [
            logo_node(page),
            {
                "id": f"{page['slug']}-wrap",
                "type": "container",
                "settings": {},
                "styles": {"base": {}},
                "children": [
                    {
                        "id": f"{page['slug']}-body",
                        "type": "html",
                        "settings": {"html": main_html},
                        "styles": {"base": {}},
                        "children": [],
                    }
                ],
            },
        ],
        "header": [],
        "footer": [],
        "settings": {"template": "default"},
    }
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":"))


def page_item(page, content, main_html):
    url = f"{ORIGIN}/{page['slug']}/"
    title = h1_text(ROOT.joinpath(page["file"]).read_text(encoding="utf-8"))
    metas = [
        meta_block("_yoast_wpseo_title", page["title"]),
        meta_block("_yoast_wpseo_metadesc", page["description"]),
        meta_block("_yoast_wpseo_focuskw", page["focus"]),
        meta_block("_yoast_wpseo_meta-robots-noindex", "0"),
        meta_block("_yoast_wpseo_meta-robots-nofollow", "0"),
        meta_block("_yoast_wpseo_opengraph-title", page["title"]),
        meta_block("_yoast_wpseo_opengraph-description", page["description"]),
        meta_block("_yoast_wpseo_twitter-title", page["title"]),
        meta_block("_yoast_wpseo_twitter-description", page["description"]),
        meta_block("rank_math_title", page["title"]),
        meta_block("rank_math_description", page["description"]),
        meta_block("rank_math_focus_keyword", page["focus"]),
        meta_block("rank_math_robots", 'a:1:{i:0;s:5:"index";}'),
        meta_block("rank_math_twitter_card_type", "summary_large_image"),
        meta_block("rank_math_facebook_title", page["title"]),
        meta_block("rank_math_facebook_description", page["description"]),
        meta_block("rank_math_twitter_title", page["title"]),
        meta_block("rank_math_twitter_description", page["description"]),
        meta_block("_lb_document_data", document_json(page, main_html)),
        meta_block("_lb_document_version", "0.12.76"),
        meta_block("_lb_document_updated", LOCAL),
    ]
    meta_xml = "\n".join(metas)
    return f"""\t<item>
\t\t<title>{html.escape(title)}</title>
\t\t<link>{url}</link>
\t\t<pubDate>{PUB}</pubDate>
\t\t<dc:creator><![CDATA[canvasly]]></dc:creator>
\t\t<guid isPermaLink="false">{ORIGIN}/?page_id={page['id']}</guid>
\t\t<description></description>
\t\t<content:encoded><![CDATA[{cdata(content)}]]></content:encoded>
\t\t<excerpt:encoded><![CDATA[{cdata(page['description'])}]]></excerpt:encoded>
\t\t<wp:post_id>{page['id']}</wp:post_id>
\t\t<wp:post_date><![CDATA[{LOCAL}]]></wp:post_date>
\t\t<wp:post_date_gmt><![CDATA[{GMT}]]></wp:post_date_gmt>
\t\t<wp:post_modified><![CDATA[{LOCAL}]]></wp:post_modified>
\t\t<wp:post_modified_gmt><![CDATA[{GMT}]]></wp:post_modified_gmt>
\t\t<wp:comment_status><![CDATA[closed]]></wp:comment_status>
\t\t<wp:ping_status><![CDATA[closed]]></wp:ping_status>
\t\t<wp:post_name><![CDATA[{page['slug']}]]></wp:post_name>
\t\t<wp:status><![CDATA[publish]]></wp:status>
\t\t<wp:post_parent>{page['parent']}</wp:post_parent>
\t\t<wp:menu_order>{page['order']}</wp:menu_order>
\t\t<wp:post_type><![CDATA[page]]></wp:post_type>
\t\t<wp:post_password><![CDATA[]]></wp:post_password>
\t\t<wp:is_sticky>0</wp:is_sticky>
{meta_xml}
\t</item>"""


def menu_item(label, page, menu_id, order):
    url = f"{ORIGIN}/{page['slug']}/"
    return f"""\t<item>
\t\t<title>{html.escape(label)}</title>
\t\t<link>{url}</link>
\t\t<pubDate>{PUB}</pubDate>
\t\t<dc:creator><![CDATA[canvasly]]></dc:creator>
\t\t<guid isPermaLink="false">{ORIGIN}/?p={menu_id}</guid>
\t\t<description></description>
\t\t<content:encoded><![CDATA[]]></content:encoded>
\t\t<excerpt:encoded><![CDATA[]]></excerpt:encoded>
\t\t<wp:post_id>{menu_id}</wp:post_id>
\t\t<wp:post_date><![CDATA[{LOCAL}]]></wp:post_date>
\t\t<wp:post_date_gmt><![CDATA[{GMT}]]></wp:post_date_gmt>
\t\t<wp:post_modified><![CDATA[{LOCAL}]]></wp:post_modified>
\t\t<wp:post_modified_gmt><![CDATA[{GMT}]]></wp:post_modified_gmt>
\t\t<wp:comment_status><![CDATA[closed]]></wp:comment_status>
\t\t<wp:ping_status><![CDATA[closed]]></wp:ping_status>
\t\t<wp:post_name><![CDATA[{page['slug']}-menu]]></wp:post_name>
\t\t<wp:status><![CDATA[publish]]></wp:status>
\t\t<wp:post_parent>0</wp:post_parent>
\t\t<wp:menu_order>{order}</wp:menu_order>
\t\t<wp:post_type><![CDATA[nav_menu_item]]></wp:post_type>
\t\t<wp:post_password><![CDATA[]]></wp:post_password>
\t\t<wp:is_sticky>0</wp:is_sticky>
\t\t<category domain="nav_menu" nicename="canvasly-help"><![CDATA[Canvasly Help]]></category>
{meta_block("_menu_item_type", "post_type")}
{meta_block("_menu_item_menu_item_parent", "0")}
{meta_block("_menu_item_object_id", str(page["id"]))}
{meta_block("_menu_item_object", "page")}
{meta_block("_menu_item_target", "")}
{meta_block("_menu_item_classes", 'a:1:{i:0;s:0:"";}')}
{meta_block("_menu_item_xfn", "")}
{meta_block("_menu_item_url", "")}
\t</item>"""


def main_inner_for_canvasly(text, wp):
    main = re.search(r"<main id=\"content\">\n(.*)\n  </main>", text, flags=re.S)
    if not main:
        raise SystemExit("main inner missing")
    body = main.group(1)
    if not wp:
        return body
    # Rewrite doc links to the imported permalinks.
    def repl(match):
        href = match.group(1)
        return f'href="{LINK_MAP.get(href, href)}"'

    return re.sub(r'href="([^"]+)"', repl, body)


def write_wxr(contents):
    items = "\n".join(item for item, _ in contents)
    menus = []
    for order, page in enumerate(PAGES):
        label = page["crumb"]
        menus.append(menu_item(label, page, 91020 + order, order))
    wxr = f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
\txmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
\txmlns:content="http://purl.org/rss/1.0/modules/content/"
\txmlns:wfw="http://wellformedweb.org/CommentAPI/"
\txmlns:dc="http://purl.org/dc/elements/1.1/"
\txmlns:wp="http://wordpress.org/export/1.2/">
<channel>
\t<title>Canvasly documentation</title>
\t<link>{ORIGIN}</link>
\t<description>Help pages for Canvasly and Canvasly Pro. Replace {ORIGIN} with the live site before import if this origin is not the real domain.</description>
\t<pubDate>{PUB}</pubDate>
\t<language>en-US</language>
\t<wp:wxr_version>1.2</wp:wxr_version>
\t<wp:base_site_url>{ORIGIN}</wp:base_site_url>
\t<wp:base_blog_url>{ORIGIN}</wp:base_blog_url>
\t<wp:author>
\t\t<wp:author_id>1</wp:author_id>
\t\t<wp:author_login><![CDATA[canvasly]]></wp:author_login>
\t\t<wp:author_email><![CDATA[docs@canvasly.local]]></wp:author_email>
\t\t<wp:author_display_name><![CDATA[Canvasly]]></wp:author_display_name>
\t\t<wp:author_first_name><![CDATA[]]></wp:author_first_name>
\t\t<wp:author_last_name><![CDATA[]]></wp:author_last_name>
\t</wp:author>
\t<wp:term>
\t\t<wp:term_id>9101</wp:term_id>
\t\t<wp:term_taxonomy>nav_menu</wp:term_taxonomy>
\t\t<wp:term_slug><![CDATA[canvasly-help]]></wp:term_slug>
\t\t<wp:term_parent><![CDATA[]]></wp:term_parent>
\t\t<wp:term_name><![CDATA[Canvasly Help]]></wp:term_name>
\t</wp:term>
{items}
{chr(10).join(menus)}
</channel>
</rss>
"""
    (ROOT / "canvasly-docs.wxr").write_text(wxr, encoding="utf-8", newline="\n")


def write_sitemap():
    urls = []
    for page in PAGES:
        priority = "1.0" if page["file"] == "index.html" else "0.8"
        urls.append(
            "  <url>\n"
            f"    <loc>{ORIGIN}/{page['file']}</loc>\n"
            f"    <lastmod>{MODIFIED}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8", newline="\n")
    (ROOT / "robots.txt").write_text(
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {ORIGIN}/sitemap.xml\n",
        encoding="utf-8",
        newline="\n",
    )


def main():
    block_dir = ROOT / "wp-blocks"
    rendered = []
    for page in PAGES:
        text = update_html(page)
        nodes = parse_main(text)
        content = logo_block() + "\n\n" + "\n\n".join(blocks_from(nodes, wp=True))
        if "]]>" in content:
            raise SystemExit("CDATA breaker in " + page["file"])
        (block_dir / (Path(page["file"]).stem + ".txt")).write_text(content + "\n", encoding="utf-8", newline="\n")
        main_html = main_inner_for_canvasly(text, wp=True)
        rendered.append((page_item(page, content, main_html), content))
        # Sanity: one h1, description present.
        if text.count("<h1>") != 1:
            raise SystemExit(f"h1 count {text.count('<h1>')} in {page['file']}")
        if 'rel="canonical"' not in text or 'application/ld+json' not in text:
            raise SystemExit("seo head missing " + page["file"])
    write_wxr(rendered)
    write_sitemap()
    print("wrote wxr, sitemap, robots, wp-blocks")


if __name__ == "__main__":
    main()
