/*!
 * Canvasly XEditor — editor module (Canvasly Lite).
 *
 * Public API (window.XEditor):
 *   XEditor.engine          XEditorEngine   canvas rendering, menu, drops, CSS injection
 *   XEditor.classes         XEditorClassesManager  variables (--xe-var-*) + classes (.xe-class-*)
 *   XEditor.access          XEditorAccess   Pro guard for Loop Architecture
 *
 * Built on the public Lite extension API (window.CanvaslyLite.hooks). No build step.
 */
(function () {
	'use strict';

	const W = window;
	const LB = (W.CanvaslyLite = W.CanvaslyLite || {});
	const DATA = () => (LB.data && LB.data.xeditor) || (W.CanvaslyLiteData && W.CanvaslyLiteData.xeditor) || {};
	const t = (s) => (typeof LB.t === 'function' ? LB.t(s) : s);
	const esc = (v) =>
		String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
	const clone = (o) => JSON.parse(JSON.stringify(o));
	const XE_TYPES = ['xe_div_block', 'xe_flexbox', 'xe_grid', 'xe_heading', 'xe_paragraph', 'xe_image', 'xe_button', 'xe_loop', 'xe_loop_layout', 'xe_loop_item'];
	const CONTAINERS = ['xe_div_block', 'xe_flexbox', 'xe_grid', 'xe_loop', 'xe_loop_layout', 'xe_loop_item'];
	const isXe = (type) => XE_TYPES.indexOf(String(type || '')) !== -1;

	/* ================================================================== *
	 * XEditorAccess — Pro guard (middleware)
	 * ================================================================== */
	class XEditorAccess {
		static guarded() {
			const a = DATA().access || {};
			return Array.isArray(a.guarded) && a.guarded.length ? a.guarded : ['xe_loop', 'xe_loop_layout', 'xe_loop_item'];
		}
		static isGuarded(type) {
			return XEditorAccess.guarded().indexOf(String(type || '')) !== -1;
		}
		/** Mirrors CanvaslyPro.isActive(); Pro defines the real one. */
		static isProActive() {
			const pro = W.CanvaslyPro;
			if (pro && typeof pro.isActive === 'function') {
				try {
					return !!pro.isActive();
				} catch (e) {
					return false;
				}
			}
			const lic = LB.data && LB.data.proLicense;
			return !!((lic && lic.active) || (DATA().access || {}).proActive);
		}
		/** True when the node (or any descendant) uses Loop Architecture. */
		static usesLoop(node) {
			if (!node) return false;
			if (XEditorAccess.isGuarded(node.type)) return true;
			return (node.children || []).some(XEditorAccess.usesLoop);
		}
		/**
		 * Middleware: validate an action ('insert' | 'render' | 'select' | 'edit' | 'drag') on a node/type.
		 * Returns true when allowed; otherwise notifies once and returns false.
		 */
		static validate(nodeOrType, action) {
			const node = typeof nodeOrType === 'string' ? { type: nodeOrType } : nodeOrType;
			if (!XEditorAccess.usesLoop(node) || XEditorAccess.isProActive()) return true;
			if (action !== 'render') XEditorAccess.notice();
			return false;
		}
		static notice() {
			const a = DATA().access || {};
			XEditorUI.toast(a.message || t('XEditor Loop is a Canvasly Pro feature.'), a.upgrade || '');
		}
		static lockedHTML(title) {
			const a = DATA().access || {};
			return `<div class="xe-locked" data-xe-locked="1"><strong>&#128274; ${esc(title || t('XEditor Loop'))}</strong><span>${esc(a.message || t('Canvasly Pro license required.'))}</span></div>`;
		}
	}

	/* ================================================================== *
	 * XEditorClassesManager — variables + classes, compile + inject
	 * ================================================================== */
	class XEditorClassesManager {
		constructor(design) {
			this.design = XEditorClassesManager.normalize(design);
			this.dirty = false;
			this.listeners = [];
		}
		static normalize(d) {
			d = d && typeof d === 'object' ? clone(d) : {};
			return { version: 1, variables: Array.isArray(d.variables) ? d.variables : [], classes: Array.isArray(d.classes) ? d.classes : [], updated: d.updated || '' };
		}
		static slug(name) {
			let s = String(name || '').toLowerCase().trim().replace(/^(--xe-var-|xe-class-|\.|\$)/, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
			if (/^[0-9]/.test(s)) s = 'x' + s;
			return s.slice(0, 48);
		}
		static value(v) {
			let s = String(v == null ? '' : v).trim().replace(/[{};<>\\]/g, '');
			if (/(expression\s*\(|javascript:|@import|behaviou?r\s*:|-moz-binding)/i.test(s)) return '';
			return s.replace(/\$([a-z0-9][a-z0-9-]*)/gi, (m, n) => 'var(--xe-var-' + XEditorClassesManager.slug(n) + ')').slice(0, 400);
		}
		static uid(p) {
			return p + '_' + Math.random().toString(36).slice(2, 12);
		}
		on(fn) {
			this.listeners.push(fn);
		}
		changed() {
			this.dirty = true;
			this.listeners.forEach((fn) => {
				try {
					fn(this);
				} catch (e) {
					/* keep going */
				}
			});
		}
		/* ---- lookup ---- */
		classes() {
			return this.design.classes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
		}
		variables() {
			return this.design.variables;
		}
		findClass(name) {
			const n = XEditorClassesManager.slug(name);
			return this.design.classes.find((c) => c.name === n) || null;
		}
		findClassById(id) {
			return this.design.classes.find((c) => c.id === id) || null;
		}
		/* ---- classes ---- */
		ensureClass(name) {
			const n = XEditorClassesManager.slug(name);
			if (!n) return null;
			let c = this.findClass(n);
			if (!c) {
				c = { id: XEditorClassesManager.uid('c'), name: n, label: n, order: this.design.classes.length, styles: {} };
				this.design.classes.push(c);
				this.changed();
			}
			return c;
		}
		setProp(cls, state, bp, prop, value) {
			prop = String(prop || '').trim().toLowerCase();
			if (!cls || !/^-{0,2}[a-z][a-z0-9-]*$/.test(prop)) return;
			const v = XEditorClassesManager.value(value);
			cls.styles = cls.styles || {};
			const st = (cls.styles[state] = cls.styles[state] || {});
			const map = (st[bp] = st[bp] || {});
			if (v === '') delete map[prop];
			else map[prop] = v;
			if (!Object.keys(map).length) delete st[bp];
			if (!Object.keys(st).length) delete cls.styles[state];
			this.changed();
		}
		renameClass(cls, name) {
			const n = XEditorClassesManager.slug(name);
			if (!cls || !n || n === cls.name || this.findClass(n)) return false;
			const old = cls.name;
			cls.name = n;
			cls.label = n;
			this.changed();
			return old;
		}
		duplicateClass(cls) {
			let n = cls.name + '-copy';
			let i = 2;
			while (this.findClass(n)) n = cls.name + '-copy-' + i++;
			const c = clone(cls);
			c.id = XEditorClassesManager.uid('c');
			c.name = c.label = n;
			c.order = this.design.classes.length;
			this.design.classes.push(c);
			this.changed();
			return c;
		}
		removeClass(cls) {
			this.design.classes = this.design.classes.filter((c) => c !== cls);
			this.reindex();
			this.changed();
		}
		moveClass(cls, dir) {
			const list = this.classes();
			const i = list.indexOf(cls);
			const j = i + dir;
			if (i < 0 || j < 0 || j >= list.length) return;
			list.splice(i, 1);
			list.splice(j, 0, cls);
			list.forEach((c, k) => (c.order = k));
			this.changed();
		}
		reindex() {
			this.classes().forEach((c, k) => (c.order = k));
		}
		/* ---- variables ---- */
		addVariable(type) {
			let base = type === 'color' ? 'color' : type === 'font' ? 'font' : type === 'spacing' ? 'space' : 'size';
			let n = base + '-1';
			let i = 2;
			while (this.variables().some((v) => v.name === n)) n = base + '-' + i++;
			const v = { id: XEditorClassesManager.uid('v'), name: n, label: n, type: type || 'custom', value: type === 'color' ? '#e2498a' : type === 'font' ? 'system-ui, sans-serif' : '16px', values: {} };
			this.design.variables.push(v);
			this.changed();
			return v;
		}
		updateVariable(v, key, value) {
			if (key === 'name') {
				const n = XEditorClassesManager.slug(value);
				if (!n || this.variables().some((x) => x !== v && x.name === n)) return false;
				v.name = n;
			} else if (key === 'type') v.type = ['color', 'font', 'size', 'spacing', 'custom'].indexOf(value) !== -1 ? value : 'custom';
			else if (key === 'value') v.value = XEditorClassesManager.value(value);
			else if (key.indexOf('bp:') === 0) {
				const bp = key.slice(3);
				v.values = v.values && !Array.isArray(v.values) ? v.values : {};
				const val = XEditorClassesManager.value(value);
				if (val) v.values[bp] = val;
				else delete v.values[bp];
			}
			this.changed();
			return true;
		}
		removeVariable(v) {
			this.design.variables = this.design.variables.filter((x) => x !== v);
			this.changed();
		}
		/* ---- compile (mirrors XEditorClassesManager::compile in PHP) ---- */
		static bpOrder() {
			const bps = (LB.data && LB.data.breakpoints) || {};
			const max = Object.keys(bps)
				.filter((k) => bps[k] && bps[k].enabled && bps[k].direction === 'max')
				.sort((a, b) => Number(bps[b].value) - Number(bps[a].value));
			if (bps.widescreen && bps.widescreen.enabled) max.push('widescreen');
			return max.length ? max : ['tablet', 'mobile'];
		}
		static query(bp) {
			const bps = (LB.data && LB.data.breakpoints) || {};
			const b = bps[bp];
			if (!b) return bp === 'tablet' ? '(max-width:1024px)' : bp === 'mobile' ? '(max-width:767px)' : '';
			if (!b.enabled || b.direction === 'base') return '';
			return (b.direction === 'min' ? '(min-width:' : '(max-width:') + parseInt(b.value, 10) + 'px)';
		}
		static decl(props) {
			return Object.keys(props || {})
				.map((p) => p + ':' + props[p] + ';')
				.join('');
		}
		compile() {
			const pseudo = { base: '', hover: ':hover', focus: ':focus', active: ':active', focus_visible: ':focus-visible' };
			let root = '';
			const byBp = {};
			this.variables().forEach((v) => {
				if (v.value) root += '--xe-var-' + v.name + ':' + v.value + ';';
				Object.keys(v.values || {}).forEach((bp) => (byBp[bp] = (byBp[bp] || '') + '--xe-var-' + v.name + ':' + v.values[bp] + ';'));
			});
			const order = XEditorClassesManager.bpOrder();
			let css = root ? ':root{' + root + '}' : '';
			order.forEach((bp) => {
				const q = XEditorClassesManager.query(bp);
				if (byBp[bp] && q) css += '@media' + q + '{:root{' + byBp[bp] + '}}';
			});
			const media = {};
			this.classes().forEach((c) => {
				Object.keys(c.styles || {}).forEach((state) => {
					const sel = '.xe-class-' + c.name + (pseudo[state] || '');
					Object.keys(c.styles[state] || {}).forEach((bp) => {
						const rule = sel + '{' + XEditorClassesManager.decl(c.styles[state][bp]) + '}';
						if (bp === 'desktop') css += rule;
						else media[bp] = (media[bp] || '') + rule;
					});
				});
			});
			order.forEach((bp) => {
				const q = XEditorClassesManager.query(bp);
				if (media[bp] && q) css += '@media' + q + '{' + media[bp] + '}';
			});
			return css;
		}
		/* ---- persistence ---- */
		async save() {
			const url = DATA().rest;
			if (!url) throw new Error('No REST endpoint');
			const res = await fetch(url, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': (LB.data && LB.data.nonce) || '' },
				body: JSON.stringify({ design: this.design }),
			});
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const out = await res.json();
			if (out && out.design) this.design = XEditorClassesManager.normalize(out.design);
			this.dirty = false;
			this.listeners.forEach((fn) => fn(this));
			return this.design;
		}
	}

	/* ================================================================== *
	 * Small UI helpers
	 * ================================================================== */
	const XEditorUI = {
		toast(msg, link) {
			let el = document.getElementById('xe-toast');
			if (!el) {
				el = document.createElement('div');
				el.id = 'xe-toast';
				el.setAttribute('role', 'status');
				el.setAttribute('aria-live', 'polite');
				document.body.appendChild(el);
			}
			el.innerHTML = esc(msg) + (link ? ` <a href="${esc(link)}" target="_blank" rel="noopener">${esc(t('Activate Pro'))}</a>` : '');
			el.classList.add('is-on');
			clearTimeout(el._t);
			el._t = setTimeout(() => el.classList.remove('is-on'), 4200);
		},
	};

	/* ================================================================== *
	 * XEditorEngine
	 * ================================================================== */
	const XEditorEngine = {
		manager: null,
		booted: false,
		ui: { tab: 'classes', classId: '', state: 'base', bp: 'desktop' },

		boot() {
			if (this.booted || !LB.hooks) return;
			this.booted = true;
			this.manager = new XEditorClassesManager(DATA().design);
			this.manager.on(() => {
				this.injectCss();
				this.syncButton();
			});
			const h = LB.hooks;
			XE_TYPES.forEach((type) => h.addFilter('editor/node/body_html/' + type, (html, n, helpers) => this.body(n, helpers), 10, 'xeditor'));
			h.addFilter('editor/node/body_html', (html, n) => this.decorateClassic(html, n), 90, 'xeditor-classes');
			h.addFilter('editor/node/body_html/turnstile', (html, n) => this.turnstilePreview(n), 10, 'xeditor-turnstile');
			h.addFilter('editor/settings/html', (html, node, tab) => this.panel(html, node, tab), 10, 'xeditor');
			h.addFilter('editor/setting/update', (v, path, node) => (node && !XEditorAccess.validate(node, 'edit') ? (node.settings || {})[path] : v), 1, 'xeditor-guard');
			h.addAction('editor/render', () => this.afterRender(), 20, 'xeditor');
			h.addAction('editor/panel', () => this.syncButton(), 20, 'xeditor');
			h.addAction('editor/select', (id, node) => this.onSelect(node), 20, 'xeditor');
			h.addAction('editor/save/before', () => {
				if (this.manager.dirty && DATA().canSave) this.manager.save().catch(() => XEditorUI.toast(t('XEditor design could not be saved.')));
			}, 10, 'xeditor');
			document.addEventListener('click', (e) => this.onPanelClick(e));
			document.addEventListener('keydown', (e) => this.onPanelKey(e));
			document.addEventListener('change', (e) => this.onPanelChange(e));
			this.afterRender();
			if (typeof LB.render === 'function') LB.render();
		},

		/* ---------------- canvas rendering ---------------- */
		classNames(n) {
			const s = n.settings || {};
			const out = ['xe-el', 'xe-' + String(n.type).replace(/^xe_/, '').replace(/_/g, '-'), 'lb-unit'];
			String(s.css_class || '').split(/\s+/).filter(Boolean).forEach((c) => out.push(c.replace(/[^a-zA-Z0-9_-]/g, '')));
			String(s.global_class || '').split(/[\s,]+/).filter(Boolean).forEach((c) => out.push('lb-class-' + c.replace(/[^a-zA-Z0-9_-]/g, '')));
			this.stack(s.xe_classes).forEach((c) => out.push('xe-class-' + c));
			if (n.type === 'xe_loop_layout') out.push('xe-loop-layout--' + (['grid', 'list', 'masonry'].indexOf(s.layout) !== -1 ? s.layout : 'grid'));
			return out.filter(Boolean).join(' ');
		},
		stack(v) {
			const list = Array.isArray(v) ? v : String(v || '').split(/[\s,]+/);
			const out = [];
			list.forEach((x) => {
				const n = XEditorClassesManager.slug(x);
				if (n && out.indexOf(n) === -1) out.push(n);
			});
			return out;
		},
		pickTag(s, allowed) {
			const tag = String((s && s.tag) || '').toLowerCase();
			return allowed.indexOf(tag) !== -1 ? tag : allowed[0];
		},
		body(n, helpers) {
			const s = n.settings || {};
			const cls = esc(this.classNames(n));
			const kids = (n.children || []).map((c) => (helpers && helpers.nodeHTML ? helpers.nodeHTML(c) : '')).join('');
			if (XEditorAccess.isGuarded(n.type) && !XEditorAccess.isProActive()) return XEditorAccess.lockedHTML((LB.data && n.type === 'xe_loop' && t('XEditor Loop')) || t('Loop part'));
			const drop = (label) => (kids ? kids : `<div class="xe-drop-hint" data-xe-drop-hint="1">${esc(label || t('Drop elements here'))}</div>`);
			switch (n.type) {
				case 'xe_div_block':
				case 'xe_flexbox':
				case 'xe_grid': {
					let tag = this.pickTag(s, ['div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'figure', 'a', 'span']);
					if (tag === 'a') tag = 'div';
					return `<${tag} class="${cls}" data-xe-drop="${esc(n.id)}">${drop()}</${tag}>`;
				}
				case 'xe_loop': {
					const tag = this.pickTag(s, ['div', 'section', 'aside', 'nav']);
					return `<${tag} class="${cls}" data-xe-drop="${esc(n.id)}">${drop(t('Add a Loop Layout'))}</${tag}>`;
				}
				case 'xe_loop_layout': {
					const tag = this.pickTag(s, ['div', 'ul', 'ol']);
					return `<${tag} class="${cls}" data-xe-layout="${esc(s.layout || 'grid')}" data-xe-drop="${esc(n.id)}">${drop(t('Add a Loop Item'))}</${tag}>`;
				}
				case 'xe_loop_item': {
					const tag = this.pickTag(s, ['article', 'div', 'li']);
					return `<${tag} class="${cls}" data-xe-drop="${esc(n.id)}" data-xe-item-template="1">${drop(t('Design one item: drop Heading, Image, Paragraph…'))}</${tag}>`;
				}
				case 'xe_heading': {
					const tag = this.pickTag(s, ['h2', 'h1', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span']);
					if (String(s.link || '').trim()) return `<${tag} class="${cls}"><a>${esc(s.text)}</a></${tag}>`;
					return `<${tag} class="${cls}" data-inline="text">${esc(s.text)}</${tag}>`;
				}
				case 'xe_paragraph': {
					const tag = this.pickTag(s, ['p', 'div', 'span', 'blockquote', 'small']);
					const raw = String(s.text || '');
					const safe = typeof LB.sanitizeInlineHtml === 'function' ? LB.sanitizeInlineHtml(raw) : esc(raw);
					return `<${tag} class="${cls}" data-inline="text">${safe.replace(/\n/g, '<br>')}</${tag}>`;
				}
				case 'xe_button': {
					const tag = String(s.link || '').trim() ? 'a' : 'button';
					return `<${tag} class="${cls}"${tag === 'button' ? ' type="button"' : ''} data-inline="text">${esc(s.text)}</${tag}>`;
				}
				case 'xe_image': {
					const src = this.imageSrc(s);
					const alt = s.alt || '';
					return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" draggable="false"${s.source === 'featured' ? ' data-xe-src="featured"' : s.source === 'url' ? ' data-xe-src-token="' + esc(s.src || '') + '"' : ''}>`;
				}
			}
			return '';
		},
		/** Canvas mock of the Cloudflare Turnstile widget (the real one renders on the frontend only). */
		turnstilePreview(n) {
			const s = n.settings || {};
			const ts = (LB.data && LB.data.turnstile) || {};
			const dark = s.theme === 'dark';
			const size = s.size || 'normal';
			const w = size === 'compact' ? '150px' : size === 'flexible' ? '100%' : '300px';
			const h = size === 'compact' ? '140px' : '65px';
			const align = { center: 'center', 'flex-end': 'flex-end' }[s.align] || 'flex-start';
			const note = ts.enabled ? '' : `<div class="xe-ts-note" style="margin-top:6px;font:12px system-ui;color:#b32d2e">${esc(t('Add Turnstile keys in Settings → Integrations to show it on the site.'))}</div>`;
			return `<div class="lb-turnstile-wrap" style="display:flex;flex-direction:column;align-items:${align}"><div role="img" aria-label="Cloudflare Turnstile" style="box-sizing:border-box;width:${w};max-width:100%;height:${h};display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid ${dark ? '#444' : '#e0e0e0'};border-radius:4px;background:${dark ? '#232323' : '#fafafa'};color:${dark ? '#eee' : '#222'};font:14px system-ui,sans-serif"><span style="width:24px;height:24px;border:2px solid #9ca3af;border-radius:3px;flex:none"></span><span style="flex:1">${esc(t('Verify you are human'))}</span><span style="font:600 10px system-ui;color:#f48120">CLOUDFLARE</span></div>${note}</div>`;
		},
		imageSrc(s) {
			const ph = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#e7e9ee"/><path d="M110 125l35-40 25 28 18-20 32 32z" fill="#b8bfca"/><circle cx="205" cy="70" r="14" fill="#b8bfca"/></svg>');
			if (s.source === 'featured') {
				const dyn = (LB.data && LB.data.dynamic) || {};
				return dyn.featured_image || dyn['lb:featured_image'] || ph;
			}
			if (s.source === 'url') {
				const u = String(s.src || '');
				return !u || u.indexOf('{{') !== -1 ? ph : u;
			}
			return s.image_url || ph;
		},
		/** Classic units: add stacked XEditor classes onto their first element in the canvas. */
		decorateClassic(html, n) {
			if (!n || isXe(n.type) || typeof html !== 'string') return html;
			const names = this.stack((n.settings || {}).xe_classes);
			if (!names.length) return html;
			const add = names.map((c) => 'xe-class-' + c).join(' ');
			return html.replace(/^(\s*<[a-zA-Z0-9]+)([^>]*)>/, (m, open, rest) => {
				if (/\sclass="/.test(rest)) return open + rest.replace(/\sclass="([^"]*)"/, (mm, c) => ` class="${c} ${add}"`) + '>';
				return open + ` class="${add}"` + rest + '>';
			});
		},

		/* ---------------- canvas CSS ---------------- */
		frameDoc() {
			const f = document.getElementById('lb-editor-frame');
			return f && f.contentDocument;
		},
		canvasHelperCss() {
			const X = '.lb-node[data-type^="xe_"]';
			return (
				`${X}{display:contents!important}` +
				`${X}>:not(.xe-el):not(.xe-locked){display:none!important}` +
				`${X}.is-selected>.xe-el{outline:2px solid #e2498a!important;outline-offset:-2px}` +
				`${X}>.xe-el[data-xe-drop]:empty,${X}>.xe-el[data-xe-drop]{min-height:24px}` +
				`.xe-drop-hint{min-height:56px;display:flex;align-items:center;justify-content:center;padding:10px;border:1px dashed #d38cb5;border-radius:6px;color:#9a5a80;font:12px/1.3 system-ui,sans-serif;background:rgba(226,73,138,.04);box-sizing:border-box;flex:1 1 100%;grid-column:1/-1}` +
				`.xe-drop-target{outline:2px dashed #e2498a!important;outline-offset:2px}` +
				`.xe-drop-line{position:fixed;z-index:2147483600;height:3px;background:#e2498a;border-radius:2px;pointer-events:none}` +
				`.xe-locked{display:flex;flex-direction:column;gap:4px;padding:18px;border:1px dashed #b98ab0;border-radius:8px;background:#fbf4f9;color:#5b3552;font:13px/1.45 system-ui,sans-serif}` +
				`.xe-el[data-xe-item-template]{outline:1px dashed rgba(226,73,138,.55);outline-offset:-1px}` +
				`#xe-sel-label{position:fixed;z-index:2147483646;padding:2px 7px;border-radius:4px 4px 0 0;background:#e2498a;color:#fff;font:600 11px/18px system-ui,sans-serif;pointer-events:none;white-space:nowrap}`
			);
		},
		injectCss() {
			const fd = this.frameDoc();
			if (!fd || !fd.head) return;
			let st = fd.getElementById('xe-canvas-css');
			if (!st) {
				st = fd.createElement('style');
				st.id = 'xe-canvas-css';
				fd.head.appendChild(st);
			}
			const css = (DATA().baseCss || '') + this.canvasHelperCss() + this.manager.compile();
			if (st.textContent !== css) st.textContent = css;
			// Keep the design stylesheet last so classes beat earlier canvas rules of equal specificity.
			if (st.nextSibling) fd.head.appendChild(st);
		},
		afterRender() {
			const frame = document.getElementById('lb-editor-frame');
			if (frame && !frame.__xeLoad) {
				frame.__xeLoad = true;
				frame.addEventListener('load', () => {
					this.injectCss();
					this.bindFrame();
				});
			}
			this.injectCss();
			this.bindFrame();
			this.mountButton();
			// The top bar is rebuilt asynchronously after a full render; re-mount afterwards.
			setTimeout(() => this.mountButton(), 0);
			setTimeout(() => this.mountButton(), 80);
			this.observeTop();
			this.labelSelection();
			const sel = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
			if (sel) this.onSelect(LB.getNode(sel), true);
		},
		observeTop() {
			const top = document.querySelector('.lb-top');
			if (!top || top.__xeObserved || typeof MutationObserver !== 'function') return;
			top.__xeObserved = true;
			new MutationObserver(() => {
				if (!document.getElementById('xe-menu-button')) this.mountButton();
			}).observe(top, { childList: true });
		},

		/* ---------------- selection label ---------------- */
		labelSelection() {
			const fd = this.frameDoc();
			if (!fd || !fd.body) return;
			let lab = fd.getElementById('xe-sel-label');
			const id = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
			const host = id ? fd.getElementById('lb-node-' + id) : null;
			const el = host && host.getAttribute('data-type') && isXe(host.getAttribute('data-type')) ? host.querySelector(':scope > .xe-el') : null;
			if (!el) {
				if (lab) lab.remove();
				return;
			}
			if (!lab) {
				lab = fd.createElement('div');
				lab.id = 'xe-sel-label';
				fd.body.appendChild(lab);
			}
			const node = LB.getNode(id) || {};
			const meta = ((LB.data && LB.data.units) || []).find((u) => u.type === node.type) || {};
			const stack = this.stack((node.settings || {}).xe_classes);
			lab.textContent = (meta.title || node.type) + (stack.length ? '  .' + stack.join(' .') : '');
			const r = el.getBoundingClientRect();
			lab.style.left = Math.max(0, r.left) + 'px';
			lab.style.top = Math.max(0, r.top - 20) + 'px';
		},
		onSelect(node, quiet) {
			if (node && !quiet && XEditorAccess.usesLoop(node)) XEditorAccess.validate(node, 'select');
			// A Loop inserted from the Units panel starts empty: give it Layout > Item > elements once.
			if (node && node.type === 'xe_loop' && !(node.children || []).length && XEditorAccess.isProActive() && !this.seeding) {
				this.seeding = true;
				setTimeout(() => {
					try {
						const live = LB.getNode(node.id);
						if (live && !(live.children || []).length) this.seedLoop(node.id);
					} finally {
						this.seeding = false;
					}
				}, 0);
			}
			setTimeout(() => this.labelSelection(), 0);
		},

		/* ---------------- drag & drop into XEditor containers ---------------- */
		bindFrame() {
			const fd = this.frameDoc();
			const win = fd && fd.defaultView;
			if (!win || win.__xeBound) return;
			win.__xeBound = true;
			const payload = (e) => (e.dataTransfer && e.dataTransfer.getData('text/plain')) || W.__lbDragPayload || '';
			const line = () => {
				let l = fd.getElementById('xe-drop-line');
				if (!l) {
					l = fd.createElement('div');
					l.id = 'xe-drop-line';
					l.className = 'xe-drop-line';
					fd.body.appendChild(l);
				}
				return l;
			};
			const clear = () => {
				fd.querySelectorAll('.xe-drop-target').forEach((x) => x.classList.remove('xe-drop-target'));
				const l = fd.getElementById('xe-drop-line');
				if (l) l.remove();
			};
			const target = (e) => {
				const el = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
				const host = el && el.closest && el.closest('[data-xe-drop]');
				if (!host) return null;
				const pid = host.getAttribute('data-xe-drop');
				// Only when the pointer is inside the XEditor container itself, not inside a nested classic unit.
				const nestedClassic = el.closest('.lb-node');
				if (nestedClassic && !host.contains(nestedClassic) && nestedClassic !== host.parentElement) return null;
				const kids = Array.from(host.children).filter((c) => c.classList.contains('lb-node'));
				const vertical = /column|block|grid/.test(win.getComputedStyle(host).flexDirection || '') || win.getComputedStyle(host).display !== 'flex';
				let index = kids.length;
				let ref = null;
				for (let i = 0; i < kids.length; i++) {
					const box = (kids[i].getAttribute('data-type') || '').indexOf('xe_') === 0 ? kids[i].querySelector(':scope > .xe-el') || kids[i] : kids[i];
					const r = box.getBoundingClientRect();
					const before = vertical ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
					if (before) {
						index = i;
						ref = r;
						break;
					}
				}
				return { host, pid, index, ref };
			};
			win.addEventListener(
				'dragover',
				(e) => {
					const p = payload(e);
					if (!/^unit:|^node:/.test(p)) return;
					const tg = target(e);
					if (!tg) return clear();
					const moving = p.indexOf('node:') === 0 ? p.slice(5) : '';
					if (moving && (moving === tg.pid || this.isInside(tg.pid, moving))) return;
					e.preventDefault();
					e.stopImmediatePropagation();
					clear();
					tg.host.classList.add('xe-drop-target');
					if (tg.ref) {
						const l = line();
						l.style.left = tg.ref.left + 'px';
						l.style.top = tg.ref.top - 2 + 'px';
						l.style.width = tg.ref.width + 'px';
					}
					if (e.dataTransfer) e.dataTransfer.dropEffect = moving ? 'move' : 'copy';
				},
				true
			);
			win.addEventListener(
				'drop',
				(e) => {
					const p = payload(e);
					if (!/^unit:|^node:/.test(p)) return;
					const tg = target(e);
					if (!tg) return;
					e.preventDefault();
					e.stopImmediatePropagation();
					clear();
					if (p.indexOf('unit:') === 0) this.insert(p.slice(5), tg.pid, tg.index);
					else this.move(p.slice(5), tg.pid, tg.index);
				},
				true
			);
			win.addEventListener('dragend', clear, true);
			win.addEventListener(
				'dragstart',
				(e) => {
					const host = e.target && e.target.closest && e.target.closest('.lb-node');
					const node = host && LB.getNode(host.getAttribute('data-id'));
					if (node && !XEditorAccess.validate(node, 'drag')) {
						e.preventDefault();
						e.stopImmediatePropagation();
					}
				},
				true
			);
			win.addEventListener('scroll', () => this.labelSelection(), { passive: true });
			win.addEventListener('resize', () => this.labelSelection());
		},
		/** Tree helpers over root/header/footer. */
		find(id, list, parent) {
			const st = LB.getState ? LB.getState() : null;
			const lists = list ? [list] : st ? [st.root || [], st.header || [], st.footer || []] : [];
			for (const arr of lists) {
				for (let i = 0; i < arr.length; i++) {
					const n = arr[i];
					if (n && n.id === id) return { node: n, list: arr, index: i, parent: parent || null };
					if (n && n.children) {
						const hit = this.find(id, n.children, n);
						if (hit) return hit;
					}
				}
			}
			return null;
		},
		isInside(childId, ancestorId) {
			const a = this.find(ancestorId);
			return !!(a && a.node.children && this.find(childId, a.node.children));
		},
		insert(type, parentId, index) {
			if (!XEditorAccess.validate(type, 'insert')) return null;
			const before = LB.getSelected();
			LB.add(type, parentId || null, index == null ? null : index);
			const id = LB.getSelected();
			return id;
		},
		move(id, parentId, index) {
			const src = this.find(id);
			const dst = this.find(parentId);
			if (!src || !dst || id === parentId || this.isInside(parentId, id)) return;
			if (!XEditorAccess.validate(src.node, 'drag')) return;
			LB.commit();
			src.list.splice(src.index, 1);
			dst.node.children = dst.node.children || [];
			let at = index == null ? dst.node.children.length : index;
			if (src.list === dst.node.children && src.index < at) at -= 1;
			dst.node.children.splice(at, 0, src.node);
			LB.render();
			LB.select(id);
		},
		/** A new Loop gets Layout > Item > Image, Heading, Paragraph, Button with tokens. */
		seedLoop(loopId) {
			LB.add('xe_loop_layout', loopId);
			const layoutId = LB.getSelected();
			LB.add('xe_loop_item', layoutId);
			const itemId = LB.getSelected();
			const kids = [
				['xe_image', { source: 'featured', alt: '{{post.title}}' }],
				['xe_heading', { text: '{{post.title}}', tag: 'h3', link: '{{post.url}}' }],
				['xe_paragraph', { text: '{{post.excerpt}}' }],
				['xe_button', { text: t('Read more'), link: '{{post.url}}' }],
			];
			kids.forEach(([type, s]) => {
				LB.add(type, itemId);
				const n = LB.getNode(LB.getSelected());
				if (n) Object.assign(n.settings, s);
			});
			LB.render();
			LB.select(loopId);
		},

		/* ---------------- top-bar menu ---------------- */
		mountButton() {
			const top = document.querySelector('.lb-top');
			if (!top) return;
			document.querySelectorAll('#lb-atomic').forEach((b) => b.remove());
			if (document.getElementById('xe-menu-button')) return this.syncButton();
			const b = document.createElement('button');
			b.type = 'button';
			b.id = 'xe-menu-button';
			b.className = 'xe-menu-button';
			b.setAttribute('aria-haspopup', 'true');
			b.setAttribute('aria-expanded', 'false');
			b.title = t('XEditor: elements, classes and variables');
			b.innerHTML = '<span aria-hidden="true">X</span>Editor<i class="xe-dirty" aria-hidden="true"></i>';
			const anchor = top.querySelector('#lb-add') || top.querySelector('.lb24-top-left') || top.firstElementChild;
			if (anchor && anchor.id === 'lb-add') anchor.insertAdjacentElement('afterend', b);
			else if (anchor && anchor.classList.contains('lb24-top-left')) anchor.appendChild(b);
			else top.insertBefore(b, top.firstChild && top.firstChild.nextSibling);
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				this.toggleMenu(b);
			});
			this.syncButton();
		},
		syncButton() {
			const b = document.getElementById('xe-menu-button');
			if (b) b.classList.toggle('is-dirty', !!(this.manager && this.manager.dirty));
		},
		toggleMenu(btn) {
			const open = document.getElementById('xe-menu');
			if (open) {
				open.remove();
				btn.setAttribute('aria-expanded', 'false');
				return;
			}
			const rows = DATA().elements || [];
			const pro = XEditorAccess.isProActive();
			const group = (g, title) => {
				const items = rows.filter((r) => r.group === g);
				if (!items.length) return '';
				return `<div class="xe-menu-group"><div class="xe-menu-title">${esc(title)}</div><div class="xe-menu-grid">${items
					.map((r) => {
						const locked = g === 'pro' && !pro;
						return `<button type="button" role="menuitem" class="xe-menu-item${locked ? ' is-locked' : ''}" data-xe-add="${esc(r.type)}" draggable="${locked ? 'false' : 'true'}"><span class="xe-menu-icon" aria-hidden="true">${esc(r.icon)}</span><span>${esc(r.title)}</span>${locked ? '<em>PRO</em>' : ''}</button>`;
					})
					.join('')}</div></div>`;
			};
			const m = document.createElement('div');
			m.id = 'xe-menu';
			m.className = 'xe-menu';
			m.setAttribute('role', 'menu');
			m.setAttribute('aria-label', 'XEditor');
			m.innerHTML =
				`<div class="xe-menu-head"><strong>XEditor</strong><small>${esc(t('Click to insert into the selected container, or drag onto the canvas.'))}</small></div>` +
				group('structure', t('Structure')) +
				group('basic', t('Basic')) +
				group('pro', t('Loop Architecture')) +
				group('classic', t('Classic units')) +
				`<div class="xe-menu-foot"><button type="button" data-xe-open="classes">${esc(t('Classes'))}</button><button type="button" data-xe-open="variables">${esc(t('Variables'))}</button></div>`;
			document.body.appendChild(m);
			const r = btn.getBoundingClientRect();
			m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
			m.style.top = r.bottom + 6 + 'px';
			btn.setAttribute('aria-expanded', 'true');
			const close = () => {
				m.remove();
				btn.setAttribute('aria-expanded', 'false');
				document.removeEventListener('mousedown', outside, true);
			};
			const outside = (e) => {
				if (!m.contains(e.target) && e.target !== btn) close();
			};
			document.addEventListener('mousedown', outside, true);
			m.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					close();
					btn.focus();
				}
			});
			m.querySelectorAll('[data-xe-add]').forEach((it) => {
				it.addEventListener('click', () => {
					const type = it.getAttribute('data-xe-add');
					if (!XEditorAccess.validate(type, 'insert')) return;
					const sel = LB.getSelected();
					const node = sel && LB.getNode(sel);
					const meta = node && ((LB.data.units || []).find((u) => u.type === node.type) || {});
					const inside = node && meta && meta.children && (!XEditorAccess.isGuarded(node.type) || node.type === 'xe_loop_item');
					close();
					if (inside) return this.insert(type, sel, null);
					// Not a container: insert right after the selected element, in the same parent.
					const hit = sel ? this.find(sel) : null;
					if (hit && hit.parent) return this.insert(type, hit.parent.id, hit.index + 1);
					this.insert(type, null, null);
				});
				it.addEventListener('dragstart', (e) => {
					const type = it.getAttribute('data-xe-add');
					W.__lbDragPayload = 'unit:' + type;
					if (e.dataTransfer) {
						e.dataTransfer.setData('text/plain', 'unit:' + type);
						e.dataTransfer.effectAllowed = 'copy';
					}
				});
				it.addEventListener('dragend', () => {
					W.__lbDragPayload = '';
					close();
				});
			});
			m.querySelectorAll('[data-xe-open]').forEach((it) =>
				it.addEventListener('click', () => {
					close();
					this.openManager(it.getAttribute('data-xe-open'));
				})
			);
			const first = m.querySelector('.xe-menu-item');
			if (first) first.focus();
		},

		/* ---------------- class stacking chips in the settings panel ---------------- */
		panel(html, node, tab) {
			if (!node) return html;
			if (XEditorAccess.usesLoop(node) && !XEditorAccess.isProActive()) {
				return XEditorAccess.lockedHTML(t('XEditor Loop')) + `<p class="xe-panel-note">${esc(t('Settings are read-only until Canvasly Pro is active. The loop stays saved in this page.'))}</p>`;
			}
			if (!isXe(node.type) && tab === 'content') return html;
			const stack = this.stack((node.settings || {}).xe_classes);
			const chips = stack
				.map((name) => {
					const exists = !!this.manager.findClass(name);
					return `<span class="xe-chip${exists ? '' : ' is-missing'}" title="${esc(exists ? t('Edit class') : t('Class not defined yet'))}"><button type="button" class="xe-chip-name" data-xe-edit-class="${esc(name)}">.${esc(name)}</button><button type="button" class="xe-chip-x" data-xe-remove-class="${esc(name)}" aria-label="${esc(t('Remove class') + ' ' + name)}">&times;</button></span>`;
				})
				.join('');
			const opts = this.manager
				.classes()
				.filter((c) => stack.indexOf(c.name) === -1)
				.map((c) => `<option value="${esc(c.name)}"></option>`)
				.join('');
			const tokens = isXe(node.type) ? `<details class="xe-tokens"><summary>${esc(t('Dynamic tokens'))}</summary><p>${esc(t('Use inside a Loop Item (or on single posts). Click to copy.'))}</p>${(DATA().tokens || []).map((tk) => `<button type="button" class="xe-token" data-xe-copy="${esc(tk.token)}" title="${esc(tk.label)}">${esc(tk.token)}</button>`).join('')}</details>` : '';
			const box = `<div class="xe-classes-bar" data-xe-node="${esc(node.id)}"><div class="xe-classes-head"><span>${esc(t('Classes'))}</span><button type="button" class="xe-link" data-xe-open="classes">${esc(t('Manager'))}</button></div><div class="xe-chips">${chips || `<span class="xe-chips-empty">${esc(t('No classes. Styles from classes win over local styles.'))}</span>`}</div><div class="xe-class-add"><input type="text" list="xe-class-options" data-xe-class-input placeholder="${esc(t('Add or create class…'))}" aria-label="${esc(t('Add class'))}"><datalist id="xe-class-options">${opts}</datalist><button type="button" data-xe-class-add>${esc(t('Add'))}</button></div>${tokens}</div>`;
			return box + html;
		},
		setStack(list) {
			LB.update('xe_classes', list);
			if (typeof LB.refreshPanel === 'function') LB.refreshPanel();
			this.labelSelection();
		},
		addClassFromInput(input) {
			const name = XEditorClassesManager.slug(input && input.value);
			if (!name) return;
			const node = LB.getNode();
			if (!node) return;
			this.manager.ensureClass(name);
			const stack = this.stack((node.settings || {}).xe_classes);
			if (stack.indexOf(name) === -1) stack.push(name);
			this.setStack(stack);
		},
		onPanelClick(e) {
			const el = e.target && e.target.closest ? e.target.closest('[data-xe-remove-class],[data-xe-edit-class],[data-xe-class-add],[data-xe-copy],.xe-classes-bar [data-xe-open]') : null;
			if (!el) return;
			e.preventDefault();
			if (el.hasAttribute('data-xe-remove-class')) {
				const node = LB.getNode();
				if (!node) return;
				const name = el.getAttribute('data-xe-remove-class');
				this.setStack(this.stack(node.settings.xe_classes).filter((n) => n !== name));
			} else if (el.hasAttribute('data-xe-edit-class')) {
				const c = this.manager.ensureClass(el.getAttribute('data-xe-edit-class'));
				this.ui.classId = c ? c.id : '';
				this.openManager('classes');
			} else if (el.hasAttribute('data-xe-class-add')) {
				this.addClassFromInput(el.parentElement.querySelector('[data-xe-class-input]'));
			} else if (el.hasAttribute('data-xe-copy')) {
				const v = el.getAttribute('data-xe-copy');
				if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
				XEditorUI.toast(t('Copied') + ' ' + v);
			} else if (el.hasAttribute('data-xe-open')) this.openManager(el.getAttribute('data-xe-open'));
		},
		onPanelKey(e) {
			if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('[data-xe-class-input]')) {
				e.preventDefault();
				this.addClassFromInput(e.target);
			}
		},
		onPanelChange() {},

		/* ---------------- Classes & Variables Manager ---------------- */
		usage(name) {
			let count = 0;
			const walk = (list) =>
				(list || []).forEach((n) => {
					if (this.stack((n.settings || {}).xe_classes).indexOf(name) !== -1) count++;
					walk(n.children);
				});
			const st = LB.getState ? LB.getState() : {};
			walk(st.root);
			walk(st.header);
			walk(st.footer);
			return count;
		},
		renameUsages(oldName, newName) {
			const st = LB.getState ? LB.getState() : {};
			let touched = false;
			const walk = (list) =>
				(list || []).forEach((n) => {
					const s = this.stack((n.settings || {}).xe_classes);
					const i = s.indexOf(oldName);
					if (i !== -1) {
						if (!touched) {
							LB.commit();
							touched = true;
						}
						s[i] = newName;
						n.settings.xe_classes = s;
					}
					walk(n.children);
				});
			walk(st.root);
			walk(st.header);
			walk(st.footer);
			if (touched) LB.render();
		},
		breakpoints() {
			const bps = (LB.data && LB.data.breakpoints) || {};
			const out = [{ key: 'desktop', label: t('Desktop') }];
			XEditorClassesManager.bpOrder().forEach((k) => out.push({ key: k, label: (bps[k] && bps[k].label) || k }));
			return out;
		},
		groups() {
			return [
				[t('Layout'), [['display', 'select', ['', 'block', 'flex', 'grid', 'inline-flex', 'inline-block', 'none']], ['flex-direction', 'select', ['', 'row', 'column', 'row-reverse', 'column-reverse']], ['justify-content', 'select', ['', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']], ['align-items', 'select', ['', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline']], ['flex-wrap', 'select', ['', 'wrap', 'nowrap']], ['gap', 'text'], ['grid-template-columns', 'text']]],
				[t('Spacing'), [['padding', 'text'], ['margin', 'text']]],
				[t('Size'), [['width', 'text'], ['max-width', 'text'], ['height', 'text'], ['min-height', 'text']]],
				[t('Typography'), [['font-family', 'text'], ['font-size', 'text'], ['font-weight', 'select', ['', '300', '400', '500', '600', '700', '800']], ['line-height', 'text'], ['letter-spacing', 'text'], ['color', 'color'], ['text-align', 'select', ['', 'left', 'center', 'right', 'justify']], ['text-transform', 'select', ['', 'none', 'uppercase', 'lowercase', 'capitalize']], ['text-decoration', 'select', ['', 'none', 'underline']]]],
				[t('Background & Border'), [['background-color', 'color'], ['background-image', 'text'], ['border', 'text'], ['border-radius', 'text']]],
				[t('Effects'), [['box-shadow', 'text'], ['opacity', 'text'], ['transition', 'text'], ['transform', 'text'], ['cursor', 'select', ['', 'pointer', 'default', 'text']]]],
			];
		},
		openManager(tab) {
			if (tab) this.ui.tab = tab;
			let m = document.getElementById('xe-manager');
			if (!m) {
				m = document.createElement('div');
				m.id = 'xe-manager';
				m.className = 'xe-manager-backdrop';
				m.innerHTML = '<div class="xe-manager" role="dialog" aria-modal="true" aria-labelledby="xe-manager-title"></div>';
				document.body.appendChild(m);
				m.addEventListener('mousedown', (e) => {
					if (e.target === m) this.closeManager();
				});
				m.addEventListener('keydown', (e) => {
					if (e.key === 'Escape') this.closeManager();
				});
				m.addEventListener('click', (e) => this.managerClick(e));
				m.addEventListener('change', (e) => this.managerInput(e, true));
				m.addEventListener('input', (e) => this.managerInput(e, false));
			}
			this.renderManager();
			const f = m.querySelector('[data-xe-autofocus]') || m.querySelector('button');
			if (f) f.focus();
		},
		closeManager() {
			const m = document.getElementById('xe-manager');
			if (m) m.remove();
			if (typeof LB.refreshPanel === 'function') LB.refreshPanel();
			this.syncButton();
		},
		renderManager() {
			const m = document.getElementById('xe-manager');
			if (!m) return;
			const box = m.firstElementChild;
			const mg = this.manager;
			const vars = mg.variables();
			const datalist = `<datalist id="xe-var-list">${vars.map((v) => `<option value="$${esc(v.name)}">${esc(v.label || v.name)}</option>`).join('')}</datalist>`;
			const head = `<div class="xe-m-head"><strong id="xe-manager-title">XEditor</strong><div class="xe-m-tabs" role="tablist"><button type="button" role="tab" aria-selected="${this.ui.tab === 'classes'}" data-xe-tab="classes" class="${this.ui.tab === 'classes' ? 'is-on' : ''}">${esc(t('Classes'))} <small>${mg.classes().length}</small></button><button type="button" role="tab" aria-selected="${this.ui.tab === 'variables'}" data-xe-tab="variables" class="${this.ui.tab === 'variables' ? 'is-on' : ''}">${esc(t('Variables'))} <small>${vars.length}</small></button></div><span class="xe-m-status">${mg.dirty ? esc(t('Unsaved changes')) : esc(t('All changes saved'))}</span><button type="button" class="xe-m-save" data-xe-save ${DATA().canSave ? '' : 'disabled title="' + esc(t('You need design permission to save')) + '"'}>${esc(t('Save design'))}</button><button type="button" class="xe-m-close" data-xe-close aria-label="${esc(t('Close'))}">&times;</button></div>`;
			box.innerHTML = head + (this.ui.tab === 'variables' ? this.variablesHTML() : this.classesHTML()) + datalist;
		},
		variablesHTML() {
			const bps = this.breakpoints().slice(1);
			const types = ['color', 'font', 'size', 'spacing', 'custom'];
			const rows = this.manager
				.variables()
				.map((v) => {
					const color = v.type === 'color' && /^#[0-9a-f]{3,8}$/i.test(v.value) ? `<input type="color" value="${esc(v.value.length === 4 ? '#' + v.value.slice(1).split('').map((c) => c + c).join('') : v.value.slice(0, 7))}" data-xe-var="${esc(v.id)}" data-key="value" aria-label="${esc(t('Pick color'))}">` : '';
					return `<tr><td><input type="text" value="${esc(v.name)}" data-xe-var="${esc(v.id)}" data-key="name" aria-label="${esc(t('Variable name'))}"><code class="xe-var-token" data-xe-copy="var(--xe-var-${esc(v.name)})" title="${esc(t('Copy CSS'))}">--xe-var-${esc(v.name)}</code></td><td><select data-xe-var="${esc(v.id)}" data-key="type" aria-label="${esc(t('Type'))}">${types.map((ty) => `<option ${ty === v.type ? 'selected' : ''}>${ty}</option>`).join('')}</select></td><td class="xe-var-val">${color}<input type="text" value="${esc(v.value)}" data-xe-var="${esc(v.id)}" data-key="value" aria-label="${esc(t('Value'))}"></td>${bps.map((b) => `<td><input type="text" value="${esc((v.values || {})[b.key] || '')}" placeholder="—" data-xe-var="${esc(v.id)}" data-key="bp:${esc(b.key)}" aria-label="${esc(b.label)}"></td>`).join('')}<td><button type="button" class="xe-icon-btn" data-xe-var-del="${esc(v.id)}" aria-label="${esc(t('Delete variable'))}">&times;</button></td></tr>`;
				})
				.join('');
			return `<div class="xe-m-body xe-vars"><p class="xe-help">${esc(t('Variables are global design tokens printed as CSS custom properties. Use them in any class value as $name (for example $brand or $space-m), or in custom CSS as var(--xe-var-name).'))}</p><table><thead><tr><th>${esc(t('Name'))}</th><th>${esc(t('Type'))}</th><th>${esc(t('Value'))}</th>${bps.map((b) => `<th>${esc(b.label)}</th>`).join('')}<th></th></tr></thead><tbody>${rows || `<tr><td colspan="${4 + bps.length}" class="xe-empty">${esc(t('No variables yet.'))}</td></tr>`}</tbody></table><div class="xe-row-actions">${types.map((ty) => `<button type="button" data-xe-var-add="${ty}" ${ty === 'color' ? 'data-xe-autofocus' : ''}>+ ${esc(ty)}</button>`).join('')}</div></div>`;
		},
		classesHTML() {
			const mg = this.manager;
			const list = mg.classes();
			let cur = mg.findClassById(this.ui.classId) || list[0] || null;
			if (cur) this.ui.classId = cur.id;
			const side = list
				.map((c, i) => `<li class="${cur && c.id === cur.id ? 'is-on' : ''}"><button type="button" class="xe-cls-pick" data-xe-cls="${esc(c.id)}">.${esc(c.name)}<small>${this.usage(c.name)}</small></button><span class="xe-cls-order"><button type="button" data-xe-cls-up="${esc(c.id)}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('Lower priority'))}">&uarr;</button><button type="button" data-xe-cls-down="${esc(c.id)}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="${esc(t('Higher priority'))}">&darr;</button></span></li>`)
				.join('');
			const sideHTML = `<aside class="xe-cls-list"><div class="xe-cls-new"><input type="text" placeholder="${esc(t('new-class-name'))}" data-xe-new-class data-xe-autofocus aria-label="${esc(t('New class name'))}"><button type="button" data-xe-new-class-btn>+</button></div><ul>${side || `<li class="xe-empty">${esc(t('No classes yet.'))}</li>`}</ul><p class="xe-help">${esc(t('Lower in the list = higher priority when two stacked classes set the same property.'))}</p></aside>`;
			if (!cur) return `<div class="xe-m-body xe-classes">${sideHTML}<section class="xe-cls-edit xe-empty">${esc(t('Create a class to start. Classes are reusable utility presets you can stack on any element.'))}</section></div>`;
			const st = this.ui.state;
			const bp = this.ui.bp;
			const props = ((cur.styles || {})[st] || {})[bp] || {};
			const known = {};
			const field = ([prop, type, opts]) => {
				known[prop] = true;
				const val = props[prop] || '';
				const attrs = `data-xe-prop="${esc(prop)}" aria-label="${esc(prop)}"`;
				let input;
				if (type === 'select') input = `<select ${attrs}>${opts.map((o) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select>`;
				else if (type === 'color') input = `<span class="xe-color"><input type="color" value="${/^#[0-9a-f]{6}$/i.test(val) ? esc(val) : '#000000'}" data-xe-prop-color="${esc(prop)}" aria-label="${esc(prop)} ${esc(t('picker'))}"><input type="text" list="xe-var-list" value="${esc(val)}" ${attrs} placeholder="#hex / $var"></span>`;
				else input = `<input type="text" list="xe-var-list" value="${esc(val)}" ${attrs}>`;
				return `<label class="xe-field"><span>${esc(prop)}</span>${input}</label>`;
			};
			const groups = this.groups()
				.map(([title, fields]) => `<fieldset><legend>${esc(title)}</legend>${fields.map(field).join('')}</fieldset>`)
				.join('');
			const custom = Object.keys(props)
				.filter((p) => !known[p])
				.map((p) => `<label class="xe-field"><span>${esc(p)}</span><input type="text" list="xe-var-list" value="${esc(props[p])}" data-xe-prop="${esc(p)}"></label>`)
				.join('');
			const states = [['base', t('Normal')], ['hover', t('Hover')], ['focus', t('Focus')], ['active', t('Active')], ['focus_visible', t('Focus visible')]];
			const edit = `<section class="xe-cls-edit"><div class="xe-cls-top"><label class="xe-field xe-cls-name"><span>${esc(t('Class name'))}</span><input type="text" value="${esc(cur.name)}" data-xe-rename="${esc(cur.id)}"></label><code>.xe-class-${esc(cur.name)}</code><button type="button" data-xe-cls-dup="${esc(cur.id)}">${esc(t('Duplicate'))}</button><button type="button" class="xe-danger" data-xe-cls-del="${esc(cur.id)}">${esc(t('Delete'))}</button><button type="button" data-xe-apply="${esc(cur.name)}">${esc(t('Apply to selected'))}</button></div><div class="xe-seg">${states.map(([k, l]) => `<button type="button" data-xe-state="${k}" class="${k === st ? 'is-on' : ''}">${esc(l)}</button>`).join('')}</div><div class="xe-seg">${this.breakpoints().map((b) => `<button type="button" data-xe-bp="${esc(b.key)}" class="${b.key === bp ? 'is-on' : ''}">${esc(b.label)}</button>`).join('')}</div><div class="xe-fields">${groups}<fieldset><legend>${esc(t('Custom properties'))}</legend>${custom}<div class="xe-custom-add"><input type="text" placeholder="property" data-xe-custom-prop aria-label="${esc(t('Property'))}"><input type="text" list="xe-var-list" placeholder="value" data-xe-custom-val aria-label="${esc(t('Value'))}"><button type="button" data-xe-custom-add>+</button></div></fieldset></div></section>`;
			return `<div class="xe-m-body xe-classes">${sideHTML}${edit}</div>`;
		},
		managerClick(e) {
			const el = e.target.closest('button,code[data-xe-copy]');
			if (!el) return;
			const mg = this.manager;
			const d = el.dataset;
			const cur = mg.findClassById(this.ui.classId);
			if (d.xeClose !== undefined) return this.closeManager();
			if (d.xeTab) this.ui.tab = d.xeTab;
			else if (d.xeSave !== undefined) {
				el.disabled = true;
				mg.save()
					.then(() => XEditorUI.toast(t('XEditor design saved.')))
					.catch(() => XEditorUI.toast(t('XEditor design could not be saved.')))
					.finally(() => this.renderManager());
				return;
			} else if (d.xeVarAdd) mg.addVariable(d.xeVarAdd);
			else if (d.xeVarDel) {
				const v = mg.variables().find((x) => x.id === d.xeVarDel);
				if (v) mg.removeVariable(v);
			} else if (d.xeCopy) {
				if (navigator.clipboard) navigator.clipboard.writeText(d.xeCopy).catch(() => {});
				XEditorUI.toast(t('Copied') + ' ' + d.xeCopy);
				return;
			} else if (d.xeCls) this.ui.classId = d.xeCls;
			else if (d.xeClsUp) mg.moveClass(mg.findClassById(d.xeClsUp), -1);
			else if (d.xeClsDown) mg.moveClass(mg.findClassById(d.xeClsDown), 1);
			else if (d.xeNewClassBtn !== undefined) {
				const inp = el.parentElement.querySelector('[data-xe-new-class]');
				const c = mg.ensureClass(inp && inp.value);
				if (c) this.ui.classId = c.id;
			} else if (d.xeClsDup && cur) this.ui.classId = mg.duplicateClass(cur).id;
			else if (d.xeClsDel && cur) {
				mg.removeClass(cur);
				this.ui.classId = '';
			} else if (d.xeState) this.ui.state = d.xeState;
			else if (d.xeBp) this.ui.bp = d.xeBp;
			else if (d.xeApply) {
				const node = LB.getNode();
				if (!node) return XEditorUI.toast(t('Select an element first.'));
				const s = this.stack(node.settings.xe_classes);
				if (s.indexOf(d.xeApply) === -1) s.push(d.xeApply);
				this.setStack(s);
				XEditorUI.toast(t('Class applied.'));
			} else if (d.xeCustomAdd !== undefined && cur) {
				const box = el.parentElement;
				mg.setProp(cur, this.ui.state, this.ui.bp, box.querySelector('[data-xe-custom-prop]').value, box.querySelector('[data-xe-custom-val]').value);
			} else return;
			this.renderManager();
		},
		managerInput(e, committed) {
			const el = e.target;
			const mg = this.manager;
			const cur = mg.findClassById(this.ui.classId);
			if (el.dataset.xeProp && cur) {
				mg.setProp(cur, this.ui.state, this.ui.bp, el.dataset.xeProp, el.value);
				if (committed && el.tagName === 'SELECT') this.renderManager();
			} else if (el.dataset.xePropColor && cur) {
				mg.setProp(cur, this.ui.state, this.ui.bp, el.dataset.xePropColor, el.value);
				const txt = el.parentElement.querySelector('[data-xe-prop]');
				if (txt) txt.value = el.value;
			} else if (el.dataset.xeVar && committed) {
				const v = mg.variables().find((x) => x.id === el.dataset.xeVar);
				if (v && !mg.updateVariable(v, el.dataset.key, el.value)) XEditorUI.toast(t('That variable name is empty or already used.'));
				this.renderManager();
			} else if (el.dataset.xeVar && el.type === 'color') {
				const v = mg.variables().find((x) => x.id === el.dataset.xeVar);
				if (v) mg.updateVariable(v, 'value', el.value);
			} else if (el.dataset.xeRename && committed && cur) {
				const old = mg.renameClass(cur, el.value);
				if (old) this.renameUsages(old, cur.name);
				else if (XEditorClassesManager.slug(el.value) !== cur.name) XEditorUI.toast(t('That class name is empty or already used.'));
				this.renderManager();
			} else if (el.dataset.xeNewClass !== undefined && committed && el.value) {
				const c = mg.ensureClass(el.value);
				if (c) this.ui.classId = c.id;
				this.renderManager();
			}
		},
	};

	/* ================================================================== *
	 * Boot
	 * ================================================================== */
	W.XEditor = { version: DATA().version || '1.0.0', engine: XEditorEngine, access: XEditorAccess, ClassesManager: XEditorClassesManager, get classes() { return XEditorEngine.manager; } };
	W.CanvaslyPro = W.CanvaslyPro || {};
	if (typeof W.CanvaslyPro.isActive !== 'function') {
		// Lite fallback. Canvasly Pro replaces this with its license-backed check.
		W.CanvaslyPro.isActive = () => {
			const lic = W.CanvaslyLiteData && W.CanvaslyLiteData.proLicense;
			return !!(lic && lic.active);
		};
	}
	const start = () => XEditorEngine.boot();
	if (LB.hooks && typeof LB.hooks.addAction === 'function') {
		if (LB._ready) start();
		else LB.hooks.addAction('editor/init', start, 5, 'xeditor');
	} else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => LB.hooks && (LB._ready ? start() : LB.hooks.addAction('editor/init', start, 5, 'xeditor')));
})();
