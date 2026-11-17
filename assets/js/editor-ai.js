/*!
 * Sidcraft Page Builder: AI Chat Bot, editor drawer and page operations.
 *
 * Public API added to window.SidcraftPageBuilder:
 *   LB.topbar.register(item)       Add a button to the editor top bar ({ id, label, title, icon, after: 'xeditor', onClick }).
 *                                  Items also pass through the `editor/topbar/items` filter.
 *   LB.drawer.register(id, def)    A docked side panel ({ title, render(body, api) }); LB.drawer.open(id) / close() / isOpen(id).
 *   LB.applyOps(ops, { label })    Apply page operations as ONE undo step. Returns { ok, applied, warnings, inverse, created, changed }.
 *   LB.previewOps(ops)             Show operations on the canvas without committing; LB.discardPreview() restores the page.
 *   LB.pageOutline(options)        Compact JSON outline of the open page (used as AI context).
 *   LB.htmlToPlan(html, css)       Convert HTML/CSS into a plan of operations (XEditor elements, classes, variables).
 *   LB.planMedia(ops)              The image, background and video addresses a plan points at ([{ url, kind }]).
 *   LB.copyPlanMedia(plan, opts)   With Sidcraft Builder Pro: copy them (and opts.fonts) to the Media Library (files
 *                                  this site already has are used; opts.localOnly downloads nothing) and
 *                                  resolve { ops, summary, details } with the plan pointed at the copies.
 *
 * No build step. Loaded after editor.js and xeditor.js.
 */
(function () {
	'use strict';

	const W = window;
	const LB = (W.SidcraftPageBuilder = W.SidcraftPageBuilder || {});
	const DATA = () => LB.data || W.SidcraftPageBuilderData || {};
	const CFG = () => DATA().aiChat || {};
	const t = (s) => (typeof LB.t === 'function' ? LB.t(s) : s);
	const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
	const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
	const hooks = () => LB.hooks || { addAction() {}, addFilter() {}, doAction() {}, applyFilters: (n, v) => v };
	const store = {
		get(k) {
			try {
				return W.sessionStorage.getItem(k);
			} catch (e) {
				return null;
			}
		},
		set(k, v) {
			try {
				W.sessionStorage.setItem(k, v);
			} catch (e) {
				/* storage full or blocked: the chat still works for this page view */
			}
		},
		local(k, v) {
			try {
				if (v === undefined) return W.localStorage.getItem(k);
				W.localStorage.setItem(k, v);
			} catch (e) {
				return null;
			}
			return null;
		},
	};

	/* ================================================================== *
	 * Top bar items
	 * ================================================================== */
	const topbarItems = [];
	LB.topbar = {
		register(item) {
			if (!item || !item.id) return false;
			const i = topbarItems.findIndex((x) => x.id === item.id);
			if (i !== -1) topbarItems.splice(i, 1);
			topbarItems.push(item);
			LB.topbar.mount();
			return true;
		},
		mount() {
			const top = document.querySelector('.lb-top');
			if (!top || !top.querySelector('.lb24-top-left')) return;
			const items = hooks().applyFilters('editor/topbar/items', topbarItems.slice()) || [];
			items.forEach((item) => {
				let b = document.getElementById(item.id);
				if (!b) {
					b = document.createElement('button');
					b.type = 'button';
					b.id = item.id;
					b.className = 'lb-topbar-item ' + (item.className || '');
					b.title = item.title || item.label || '';
					b.setAttribute('aria-label', item.label || item.title || item.id);
					b.innerHTML = (item.icon || '') + '<span class="lb-topbar-item-label">' + esc(item.label || '') + '</span><i class="lb-topbar-item-dot" aria-hidden="true"></i>';
					b.addEventListener('click', (e) => {
						e.stopPropagation();
						if (typeof item.onClick === 'function') item.onClick(e, b);
					});
				}
				const xe = document.getElementById('xe-menu-button');
				const add = document.getElementById('lb-add');
				const anchor = item.after === 'xeditor' && xe ? xe : add;
				if (anchor && anchor.parentNode && anchor.nextElementSibling !== b) anchor.insertAdjacentElement('afterend', b);
				else if (!anchor && !b.parentNode) top.querySelector('.lb24-top-left').appendChild(b);
			});
		},
	};

	/* ================================================================== *
	 * Docked drawer
	 * ================================================================== */
	const drawers = {};
	let drawerEl = null;
	let drawerOpen = '';
	const WIDTH_KEY = 'sidcraftPageBuilderDrawerWidth';
	const shell = () => document.getElementById('lb-editor-shell') || document.querySelector('.lb-admin');
	LB.drawer = {
		register(id, def) {
			drawers[id] = def || {};
		},
		isOpen(id) {
			return id ? drawerOpen === id : !!drawerOpen;
		},
		el() {
			return drawerEl;
		},
		open(id) {
			const def = drawers[id];
			const host = shell();
			if (!def || !host) return false;
			if (!drawerEl) {
				drawerEl = document.createElement('aside');
				drawerEl.className = 'lb-drawer';
				drawerEl.setAttribute('role', 'complementary');
				drawerEl.innerHTML = '<div class="lb-drawer-resize" role="separator" aria-orientation="vertical" tabindex="0" aria-label="' + esc(t('Resize panel')) + '"></div><div class="lb-drawer-body"></div>';
				host.appendChild(drawerEl);
				bindResize(drawerEl.querySelector('.lb-drawer-resize'));
				drawerEl.addEventListener('keydown', (e) => {
					if (e.key === 'Escape' && !e.defaultPrevented) {
						e.preventDefault();
						LB.drawer.close();
					}
				});
			}
			const w = parseInt(store.local(WIDTH_KEY) || '', 10);
			if (w) host.style.setProperty('--lb-drawer-w', Math.max(320, Math.min(600, w)) + 'px');
			drawerOpen = id;
			drawerEl.setAttribute('aria-label', def.title || id);
			drawerEl.dataset.drawer = id;
			host.classList.add('lb-has-drawer');
			def.render(drawerEl.querySelector('.lb-drawer-body'), { close: () => LB.drawer.close() });
			hooks().doAction('editor/drawer/open', id);
			return true;
		},
		close() {
			const host = shell();
			const was = drawerOpen;
			drawerOpen = '';
			if (host) host.classList.remove('lb-has-drawer');
			if (drawerEl) drawerEl.dataset.drawer = '';
			if (was && drawers[was] && typeof drawers[was].onClose === 'function') drawers[was].onClose();
			hooks().doAction('editor/drawer/close', was);
		},
	};
	function bindResize(handle) {
		if (!handle) return;
		const set = (px) => {
			const host = shell();
			const w = Math.max(320, Math.min(600, Math.round(px)));
			if (host) host.style.setProperty('--lb-drawer-w', w + 'px');
			store.local(WIDTH_KEY, String(w));
		};
		handle.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			handle.setPointerCapture(e.pointerId);
			const move = (ev) => set(W.innerWidth - ev.clientX);
			const up = () => {
				handle.removeEventListener('pointermove', move);
				handle.removeEventListener('pointerup', up);
			};
			handle.addEventListener('pointermove', move);
			handle.addEventListener('pointerup', up);
		});
		handle.addEventListener('keydown', (e) => {
			if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
			e.preventDefault();
			const cur = drawerEl ? drawerEl.getBoundingClientRect().width : 380;
			set(cur + (e.key === 'ArrowLeft' ? 24 : -24));
		});
	}

	/* ================================================================== *
	 * Page operations engine
	 * ================================================================== */
	const XE_CONTAINERS = ['xe_div_block', 'xe_flexbox', 'xe_grid'];
	const MAX_STRING = 20000;

	function regions(state) {
		const out = [];
		if (Array.isArray(state.root)) out.push(state.root);
		if (Array.isArray(state.header)) out.push(state.header);
		if (Array.isArray(state.footer)) out.push(state.footer);
		return out;
	}
	function locateIn(state, id) {
		if (!id) return null;
		let hit = null;
		const walk = (nodes, parent) => {
			for (let i = 0; i < nodes.length && !hit; i++) {
				const n = nodes[i];
				if (!n) continue;
				if (n.id === id) {
					hit = { node: n, nodes, index: i, parent };
					return;
				}
				if (Array.isArray(n.children)) walk(n.children, n);
			}
		};
		regions(state).forEach((list) => !hit && walk(list, null));
		return hit;
	}
	function contains(node, id) {
		return !!node && (node.id === id || (node.children || []).some((c) => contains(c, id)));
	}
	function meta(type) {
		return typeof LB.meta === 'function' ? LB.meta(type) || {} : {};
	}
	function acceptsChildren(node) {
		if (!node) return false;
		if (typeof LB.acceptsInside === 'function') return !!LB.acceptsInside(node);
		return XE_CONTAINERS.indexOf(node.type) !== -1 || !!meta(node.type).children;
	}
	/* ------------------------------------------------------------------ *
	 * Classic unit settings for the AI
	 *
	 * The model needs to know which settings a classic unit has (and their
	 * value format) to fill it with real content. Only content-tab controls
	 * that carry content are described; style and advanced controls are left
	 * to the unit's defaults and the class system.
	 * ------------------------------------------------------------------ */
	const XE_DOCUMENTED = ['xe_div_block', 'xe_flexbox', 'xe_grid', 'xe_heading', 'xe_paragraph', 'xe_image', 'xe_button'];
	const SCHEMA_TYPES = { text: 'text', textarea: 'text', wysiwyg: 'html', code: 'html', url: 'url', select: 'select', choose: 'select', switch: 'switch', number: 'number', slider: 'number', repeater: 'list' };
	const SCHEMA_BUDGET = 24000; // characters of unit settings sent per turn
	const NODE_SETTINGS_BUDGET = 16000; // characters of current classic-unit content in the page tree
	let schemaCache = null;
	function unitDefs() {
		const map = {};
		(DATA().units || []).forEach((u) => {
			if (u && u.type) map[u.type] = u;
		});
		return map;
	}
	function describeControl(key, c, def) {
		const kind = SCHEMA_TYPES[c && c.type];
		if (!kind || c.hidden || /^cp_/.test(key)) return null;
		const out = { kind };
		if (kind === 'select') {
			const opts = Object.keys(c.options || {});
			if (!opts.length) return null; // options filled at runtime (menus, popups): nothing useful to choose from
			out.options = opts;
		}
		if (kind === 'switch') out.str = typeof def === 'string';
		if (kind === 'list') {
			out.fields = {};
			Object.keys(c.fields || {}).forEach((f) => {
				const d = describeControl(f, c.fields[f], undefined);
				if (d && d.kind !== 'list') out.fields[f] = d;
			});
			if (!Object.keys(out.fields).length) return null;
			const sample = Array.isArray(def) ? def.find((x) => x && typeof x === 'object') : null;
			if (sample) Object.keys(out.fields).forEach((f) => {
				if (out.fields[f].kind === 'switch') out.fields[f].str = typeof sample[f] === 'string';
			});
		}
		return out;
	}
	function fieldText(key, d) {
		if (d.kind === 'select') return key + ':' + d.options.slice(0, 10).map((o) => (o === '' ? "''" : o)).join('|') + (d.options.length > 10 ? '|…' : '');
		if (d.kind === 'list') return key + ':list of {' + Object.keys(d.fields).map((f) => fieldText(f, d.fields[f])).join(', ') + '}';
		return key + ':' + d.kind;
	}
	/** type => { fields: {key: descriptor}, line: "key:kind; …" } for classic units. */
	function unitSchemas() {
		if (schemaCache) return schemaCache;
		schemaCache = {};
		const defs = unitDefs();
		Object.keys(defs).forEach((type) => {
			const u = defs[type];
			if (XE_DOCUMENTED.indexOf(type) !== -1 || !u.controls || typeof u.controls !== 'object') return;
			const defaults = u.defaults && typeof u.defaults === 'object' ? u.defaults : {};
			const fields = {};
			Object.keys(u.controls).forEach((k) => {
				const c = u.controls[k];
				if (!c || c.tab !== 'content') return;
				const d = describeControl(k, c, defaults[k]);
				if (d) fields[k] = d;
			});
			const keys = Object.keys(fields);
			if (!keys.length) return;
			schemaCache[type] = { fields, line: keys.map((k) => fieldText(k, fields[k])).join('; ').slice(0, 1600) };
		});
		return schemaCache;
	}
	/**
	 * Bring AI-written settings into the shape the unit stores: switches as
	 * booleans (or "yes"/"" where the unit uses strings) and an _id on every
	 * new list item.
	 */
	function normalizeUnitSettings(type, settings) {
		const sc = unitSchemas()[type] || { fields: {} };
		const def = unitDefs()[type];
		if (!def || !settings || typeof settings !== 'object') return settings;
		const sw = (d, v) => {
			const on = v === true || v === 'yes' || v === 'true' || v === 1 || v === '1' || v === 'on';
			return d.str ? (on ? 'yes' : '') : on;
		};
		const controls = def.controls && typeof def.controls === 'object' ? def.controls : {};
		const defaults = def.defaults && typeof def.defaults === 'object' ? def.defaults : {};
		Object.keys(settings).forEach((k) => {
			const d = sc.fields[k];
			if (!d) {
				// Other tabs (effects, motion): on/off and number settings in the stored form.
				const c = controls[k];
				const v = settings[k];
				if (!c || v === null || typeof v === 'object') return;
				const base = k in defaults ? defaults[k] : c.default;
				if (c.type === 'switch') settings[k] = sw({ str: typeof base === 'string' }, v);
				else if ((c.type === 'number' || c.type === 'slider') && typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) settings[k] = Number(v);
				return;
			}
			if (d.kind === 'switch' && typeof settings[k] !== 'object') settings[k] = sw(d, settings[k]);
			if (d.kind === 'list' && Array.isArray(settings[k])) {
				settings[k] = settings[k]
					.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
					.map((item) => {
						const o = Object.assign({}, item);
						if (!o._id) o._id = 'r_' + Math.random().toString(36).slice(2, 10);
						Object.keys(d.fields).forEach((f) => {
							if (d.fields[f].kind === 'switch' && f in o && typeof o[f] !== 'object') o[f] = sw(d.fields[f], o[f]);
						});
						return o;
					});
			}
		});
		return settings;
	}
	/**
	 * Settings of the classic units most likely to matter for this turn,
	 * within SCHEMA_BUDGET: units on the page or selected first, then units
	 * named in the user's message, then core units.
	 */
	function rankedUnitSettings(types, query, onPage) {
		const sc = unitSchemas();
		const defs = unitDefs();
		const words = String(query || '')
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length >= 3);
		const matches = (u) => {
			if (!words.length) return false;
			const hay = [u.type, u.title || ''].concat(Array.isArray(u.keywords) ? u.keywords : [])
				.join(' ')
				.toLowerCase()
				.split(/[^a-z0-9]+/)
				.filter((x) => x.length >= 3);
			return words.some((w) => hay.some((h) => h === w || (w.length >= 4 && h.length >= 4 && h.slice(0, 4) === w.slice(0, 4))));
		};
		const scored = types
			.filter((type) => sc[type])
			.map((type, i) => {
				const u = defs[type] || { type };
				const score = (onPage[type] ? 100 : 0) + (matches(u) ? 50 : 0) + (u.source === 'lite' ? 10 : 0);
				return { type, score, i };
			})
			.sort((a, b) => b.score - a.score || a.i - b.i);
		const out = {};
		let used = 0;
		scored.forEach((s) => {
			const line = sc[s.type].line;
			if (used + line.length + s.type.length + 6 > SCHEMA_BUDGET) return;
			out[s.type] = line;
			used += line.length + s.type.length + 6;
		});
		return out;
	}
	/** Effect settings of a node that differ from the unit's defaults (keys from aiChat.effectKeys). */
	function unitEffects(n) {
		const keys = Array.isArray(CFG().effectKeys) ? CFG().effectKeys : [];
		if (!keys.length) return null;
		const s = n.settings || {};
		const u = unitDefs()[n.type] || {};
		const defaults = u.defaults && typeof u.defaults === 'object' ? u.defaults : {};
		const controls = u.controls && typeof u.controls === 'object' ? u.controls : {};
		const out = {};
		keys.forEach((k) => {
			if (!(k in s) || !controls[k]) return;
			const v = s[k];
			const base = k in defaults ? defaults[k] : controls[k].default;
			if (v == null || v === '' || JSON.stringify(v) === JSON.stringify(base)) return;
			out[k] = v;
		});
		// An effect that is off carries no meaning on its own.
		if (!out.interaction && !s.interaction) Object.keys(out).forEach((k) => k.indexOf('interaction_') === 0 && delete out[k]);
		if (!s.cp_sticky) ['cp_sticky_offset', 'cp_sticky_parent'].forEach((k) => delete out[k]);
		return Object.keys(out).length ? out : null;
	}
	/** Current content of a classic unit, limited to its described settings. */
	function unitContent(n) {
		const sc = unitSchemas()[n.type];
		if (!sc) return null;
		const s = n.settings || {};
		const out = {};
		Object.keys(sc.fields).forEach((k) => {
			const v = s[k];
			if (v == null || v === '' || (Array.isArray(v) && !v.length) || TEXT_KEYS.indexOf(k) !== -1 || LAYOUT_KEYS.indexOf(k) !== -1) return;
			out[k] = sc.fields[k].kind === 'list' && Array.isArray(v) ? v.slice(0, 30).map((it) => {
				const o = {};
				Object.keys(sc.fields[k].fields).forEach((f) => {
					if (it && it[f] != null && it[f] !== '') o[f] = typeof it[f] === 'string' ? plain(it[f]).slice(0, 160) : it[f];
				});
				return o;
			}) : typeof v === 'string' ? plain(v).slice(0, 200) : v;
		});
		return Object.keys(out).length ? out : null;
	}

	function cleanValue(v, depth) {
		depth = depth || 0;
		if (depth > 6) return null;
		if (typeof v === 'string') return v.slice(0, MAX_STRING);
		if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
		if (typeof v === 'boolean' || v === null) return v;
		if (Array.isArray(v)) return v.slice(0, 200).map((x) => cleanValue(x, depth + 1));
		if (v && typeof v === 'object') {
			const o = {};
			Object.keys(v)
				.slice(0, 200)
				.forEach((k) => {
					if (/^[A-Za-z0-9_\-]{1,80}$/.test(k)) o[k] = cleanValue(v[k], depth + 1);
				});
			return o;
		}
		return null;
	}
	function slug(name) {
		const C = W.XEditor && W.XEditor.ClassesManager;
		if (C && typeof C.slug === 'function') return C.slug(name);
		return String(name || '')
			.toLowerCase()
			.replace(/^(--xe-var-|xe-class-|\.)/, '')
			.replace(/[^a-z0-9-]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 48);
	}
	function setPath(obj, path, value) {
		const parts = String(path).split('.');
		let o = obj;
		for (let i = 0; i < parts.length - 1; i++) {
			const k = parts[i];
			if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) {
				const prev = o[k];
				o[k] = {};
				if (prev != null && typeof prev !== 'object' && ['desktop', 'tablet', 'mobile', 'laptop', 'widescreen', 'tablet_extra', 'mobile_extra'].indexOf(parts[i + 1]) !== -1) o[k].desktop = prev;
			}
			o = o[k];
		}
		const last = parts[parts.length - 1];
		if (value === undefined) delete o[last];
		else o[last] = value;
	}
	function getPath(obj, path) {
		return String(path)
			.split('.')
			.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
	}
	function nodeLabel(n) {
		if (!n) return '';
		const m = meta(n.type);
		return String(m.title || n.type || '');
	}

	/**
	 * Run node operations on a state object. Design operations (class, var) run
	 * only when ctx.design is true. Returns what changed and the inverse ops.
	 */
	function runOps(state, ops, ctx) {
		ctx = ctx || {};
		const res = { applied: 0, warnings: [], inverse: [], created: [], changed: [], removed: 0, refs: ctx.refs || {} };
		const resolve = (id) => {
			if (id == null || id === '' || id === 'root' || id === 'null') return null;
			id = String(id);
			if (id.indexOf('ref:') === 0) return res.refs[id.slice(4)] || '';
			if (res.refs[id]) return res.refs[id];
			return id;
		};
		const warn = (msg) => {
			if (res.warnings.length < 30) res.warnings.push(msg);
		};
		const build = (spec, keepIds) => {
			if (!spec || typeof spec !== 'object') return null;
			if (keepIds && spec.id && spec.type) return clone(spec);
			const type = String(spec.type || '').trim();
			if (!type || !meta(type).type) {
				warn(t('Skipped an unknown unit type:') + ' ' + type);
				return null;
			}
			const n = typeof LB.makeNode === 'function' ? LB.makeNode(type) : null;
			if (!n) {
				warn(t('This unit is not available here:') + ' ' + (meta(type).title || type));
				return null;
			}
			const s = normalizeUnitSettings(type, cleanValue(spec.settings && typeof spec.settings === 'object' ? spec.settings : {}) || {});
			Object.keys(s).forEach((k) => {
				if (k === 'xe_classes') n.settings.xe_classes = toClassList(s[k]);
				else n.settings[k] = s[k];
			});
			if (spec.ref) res.refs[String(spec.ref)] = n.id;
			if (Array.isArray(spec.children) && spec.children.length) {
				if (!acceptsChildren(n)) warn(t('Children were dropped from a unit that cannot hold them:') + ' ' + nodeLabel(n));
				else {
					n.children = n.children || [];
					spec.children.forEach((c) => {
						const k = build(c, keepIds);
						if (k) n.children.push(k);
					});
				}
			}
			return n;
		};
		const listFor = (parentId) => {
			if (parentId == null) return { list: state.root, parent: null };
			const p = locateIn(state, parentId);
			if (!p) return null;
			if (!acceptsChildren(p.node)) return null;
			p.node.children = p.node.children || [];
			return { list: p.node.children, parent: p.node };
		};
		const design = () => (W.XEditor && W.XEditor.classes) || null;

		(Array.isArray(ops) ? ops : []).forEach((op, i) => {
			if (!op || typeof op !== 'object') return;
			const kind = String(op.op || '').toLowerCase();
			try {
				switch (kind) {
					case 'insert': {
						let parentId = resolve(op.parent);
						let target = listFor(parentId);
						if (!target) {
							warn(t('The target container was not found, so new units were added to the page.'));
							parentId = null;
							target = listFor(null);
						}
						let index = Number.isInteger(op.index) ? op.index : target.list.length;
						index = Math.max(0, Math.min(target.list.length, index));
						const specs = Array.isArray(op.nodes) ? op.nodes : op.node ? [op.node] : [];
						specs.forEach((spec) => {
							const n = build(spec, !!op.raw);
							if (!n) return;
							target.list.splice(index++, 0, n);
							res.created.push(n.id);
							res.inverse.unshift({ op: 'remove', id: n.id });
							res.applied++;
						});
						break;
					}
					case 'update': {
						const r = locateIn(state, resolve(op.id));
						if (!r) {
							warn(t('A unit to change was not found.'));
							break;
						}
						const s = normalizeUnitSettings(r.node.type, cleanValue(op.settings && typeof op.settings === 'object' ? op.settings : {}) || {});
						const prev = {};
						const unset = [];
						r.node.settings = r.node.settings || {};
						Object.keys(s).forEach((k) => {
							const before = getPath(r.node.settings, k);
							if (before === undefined) unset.push(k);
							else prev[k] = clone(before);
							const v = k === 'xe_classes' ? toClassList(s[k]) : s[k];
							setPath(r.node.settings, k, op.unset && op.unset.indexOf(k) !== -1 ? undefined : v);
						});
						(Array.isArray(op.unset) ? op.unset : []).forEach((k) => {
							if (Object.prototype.hasOwnProperty.call(s, k)) return;
							const before = getPath(r.node.settings, k);
							if (before !== undefined) prev[k] = clone(before);
							setPath(r.node.settings, k, undefined);
						});
						res.inverse.unshift({ op: 'update', id: r.node.id, settings: prev, unset });
						res.changed.push(r.node.id);
						res.applied++;
						break;
					}
					case 'add_class':
					case 'remove_class': {
						const r = locateIn(state, resolve(op.id));
						if (!r) {
							warn(t('A unit to change was not found.'));
							break;
						}
						r.node.settings = r.node.settings || {};
						const before = toClassList(r.node.settings.xe_classes);
						const names = toClassList(op.classes || op.names || op.class);
						const next = kind === 'add_class' ? before.concat(names.filter((n) => before.indexOf(n) === -1)) : before.filter((n) => names.indexOf(n) === -1);
						r.node.settings.xe_classes = next;
						res.inverse.unshift({ op: 'update', id: r.node.id, settings: { xe_classes: before } });
						res.changed.push(r.node.id);
						res.applied++;
						break;
					}
					case 'move': {
						const id = resolve(op.id);
						const r = locateIn(state, id);
						if (!r) {
							warn(t('A unit to move was not found.'));
							break;
						}
						const parentId = resolve(op.parent);
						if (parentId && contains(r.node, parentId)) {
							warn(t('A unit cannot move inside itself.'));
							break;
						}
						const from = { parent: r.parent ? r.parent.id : null, index: r.index };
						r.nodes.splice(r.index, 1);
						const target = listFor(parentId);
						if (!target) {
							r.nodes.splice(r.index, 0, r.node);
							warn(t('The move target was not found.'));
							break;
						}
						let index = Number.isInteger(op.index) ? op.index : target.list.length;
						index = Math.max(0, Math.min(target.list.length, index));
						target.list.splice(index, 0, r.node);
						res.inverse.unshift({ op: 'move', id: r.node.id, parent: from.parent, index: from.index });
						res.changed.push(r.node.id);
						res.applied++;
						break;
					}
					case 'remove': {
						const r = locateIn(state, resolve(op.id));
						if (!r) {
							warn(t('A unit to delete was not found.'));
							break;
						}
						r.nodes.splice(r.index, 1);
						res.inverse.unshift({ op: 'insert', raw: true, parent: r.parent ? r.parent.id : null, index: r.index, nodes: [clone(r.node)] });
						res.removed++;
						res.applied++;
						break;
					}
					case 'class':
					case 'class_restore': {
						if (!ctx.design) break;
						const mg = design();
						if (!mg) {
							warn(t('XEditor classes are not available, so styles were skipped.'));
							break;
						}
						const name = slug(op.name);
						if (!name) break;
						const existing = mg.findClass(name);
						if (kind === 'class_restore') {
							if (!op.styles) {
								if (existing) mg.removeClass(existing);
							} else {
								const c = existing || mg.ensureClass(name);
								c.styles = clone(op.styles);
								mg.changed();
							}
							res.applied++;
							break;
						}
						res.inverse.unshift({ op: 'class_restore', name, styles: existing ? clone(existing.styles || {}) : null });
						const c = mg.ensureClass(name);
						const styles = op.styles && typeof op.styles === 'object' ? op.styles : {};
						Object.keys(styles).forEach((stateKey) => {
							const st = stateKey === 'normal' ? 'base' : stateKey;
							if (['base', 'hover', 'focus', 'active', 'focus_visible'].indexOf(st) === -1) return;
							const byBp = styles[stateKey] || {};
							Object.keys(byBp).forEach((bp) => {
								const props = byBp[bp] || {};
								if (typeof props !== 'object') return;
								Object.keys(props).forEach((p) => mg.setProp(c, st, bp, String(p).toLowerCase(), String(props[p] == null ? '' : props[p])));
							});
						});
						res.applied++;
						break;
					}
					case 'var':
					case 'var_restore': {
						if (!ctx.design) break;
						const mg = design();
						if (!mg) break;
						const name = slug(op.name);
						if (!name) break;
						const existing = mg.variables().find((v) => v.name === name) || null;
						if (kind === 'var_restore') {
							if (!op.prev) {
								if (existing) mg.removeVariable(existing);
							} else if (existing) {
								Object.assign(existing, clone(op.prev));
								mg.changed();
							}
							res.applied++;
							break;
						}
						res.inverse.unshift({ op: 'var_restore', name, prev: existing ? clone(existing) : null });
						const type = ['color', 'font', 'size', 'spacing', 'custom'].indexOf(op.type) !== -1 ? op.type : 'custom';
						let v = existing;
						if (!v) {
							v = mg.addVariable(type);
							if (!mg.updateVariable(v, 'name', name)) {
								mg.removeVariable(v);
								warn(t('A design variable could not be created:') + ' ' + name);
								break;
							}
						}
						if (op.type) mg.updateVariable(v, 'type', type);
						if (op.value != null) mg.updateVariable(v, 'value', String(op.value));
						if (op.values && typeof op.values === 'object') Object.keys(op.values).forEach((bp) => mg.updateVariable(v, 'bp:' + bp, String(op.values[bp])));
						res.applied++;
						break;
					}
					default:
						warn(t('Skipped an unknown operation:') + ' ' + (kind || '#' + (i + 1)));
				}
			} catch (e) {
				warn(t('An operation failed:') + ' ' + kind);
			}
		});
		return res;
	}
	function toClassList(v) {
		const list = Array.isArray(v) ? v : String(v || '').split(/[\s,]+/);
		const out = [];
		list.forEach((x) => {
			const n = slug(x);
			if (n && out.indexOf(n) === -1) out.push(n);
		});
		return out;
	}
	const isDesignOp = (op) => op && ['class', 'var', 'class_restore', 'var_restore'].indexOf(String(op.op)) !== -1;

	let preview = null;
	function canEdit() {
		return typeof LB.getState === 'function' && typeof LB.setState === 'function' && !(LB.isPreviewingRevision && LB.isPreviewingRevision());
	}
	LB.applyOps = function applyOps(ops, opts) {
		opts = opts || {};
		if (!canEdit()) return { ok: false, applied: 0, warnings: [t('The page cannot be changed right now.')], inverse: [], created: [], changed: [] };
		if (preview) LB.discardPreview();
		const list = Array.isArray(ops) ? ops : [];
		const draft = clone(LB.getState());
		const res = runOps(draft, list.filter((o) => !isDesignOp(o)), { design: false });
		const designOps = list.filter(isDesignOp);
		if (!res.applied && !designOps.length) return Object.assign({ ok: false }, res);
		if (res.applied) {
			LB.commit(opts.label || t('AI change'), res.created[0] || res.changed[0] || '');
			LB.setState(draft);
		}
		const d = runOps(draft, designOps, { design: true, refs: res.refs });
		res.inverse = d.inverse.concat(res.inverse);
		res.warnings = res.warnings.concat(d.warnings);
		res.applied += d.applied;
		const first = res.created[0] || res.changed[0];
		if (first && typeof LB.select === 'function') {
			try {
				LB.select(first);
			} catch (e) {
				/* selection is a convenience */
			}
		}
		if (typeof LB.render === 'function') LB.render();
		hooks().doAction('editor/ai/applied', res, opts);
		return Object.assign({ ok: res.applied > 0 }, res);
	};
	/**
	 * Build a page document from a plan without touching the open page (used
	 * to create other pages). Class and variable operations go to the shared
	 * XEditor design; save it with XEditor.classes.save().
	 */
	LB.planToDocument = function planToDocument(ops) {
		const doc = { root: [], header: [], footer: [] };
		const list = Array.isArray(ops) ? ops : [];
		const res = runOps(doc, list.filter((o) => !isDesignOp(o)), { design: false });
		const d = runOps(doc, list.filter(isDesignOp), { design: true, refs: res.refs });
		return { document: doc, applied: res.applied + d.applied, warnings: res.warnings.concat(d.warnings) };
	};
	LB.previewOps = function previewOps(ops) {
		if (!canEdit()) return { ok: false, warnings: [t('The page cannot be changed right now.')] };
		if (preview) LB.discardPreview();
		const list = Array.isArray(ops) ? ops : [];
		const before = clone(LB.getState());
		const draft = clone(before);
		const res = runOps(draft, list.filter((o) => !isDesignOp(o)), { design: false });
		const d = runOps(draft, list.filter(isDesignOp), { design: true, refs: res.refs });
		preview = { before, created: res.created, changed: res.changed, designInverse: d.inverse, removed: res.removed };
		LB.setState(draft);
		const host = shell();
		if (host) host.classList.add('lb-ai-previewing');
		if (typeof LB.render === 'function') LB.render();
		markPreview();
		return { ok: true, applied: res.applied + d.applied, warnings: res.warnings.concat(d.warnings), created: res.created, changed: res.changed, removed: res.removed };
	};
	LB.discardPreview = function discardPreview() {
		if (!preview) return false;
		const p = preview;
		preview = null;
		LB.setState(p.before);
		runOps({ root: [] }, p.designInverse, { design: true });
		const host = shell();
		if (host) host.classList.remove('lb-ai-previewing');
		if (typeof LB.render === 'function') LB.render();
		hooks().doAction('editor/ai/preview-end');
		return true;
	};
	LB.isPreviewingOps = () => !!preview;
	function markPreview() {
		if (!preview || typeof LB.frameDoc !== 'function') return;
		const doc = LB.frameDoc();
		if (!doc) return;
		if (!doc.getElementById('lb-ai-ghost-style')) {
			const st = doc.createElement('style');
			st.id = 'lb-ai-ghost-style';
			st.textContent =
				'.lb-ai-ghost-new{outline:2px dashed #16a34a!important;outline-offset:2px;box-shadow:0 0 0 4px rgba(22,163,74,.12)!important}' +
				'.lb-ai-ghost-changed{outline:2px dashed #d97706!important;outline-offset:2px;box-shadow:0 0 0 4px rgba(217,119,6,.12)!important}' +
				'.lb-ai-ghost-new .lb-ai-ghost-new{outline:none!important;box-shadow:none!important}';
			doc.head.appendChild(st);
		}
		const mark = (ids, cls) =>
			ids.forEach((id) => {
				const el = doc.querySelector('[data-id="' + (W.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
				if (!el) return;
				el.classList.add(cls);
				const inner = el.querySelector(':scope > .xe-el');
				if (inner) inner.classList.add(cls);
			});
		mark(preview.created, 'lb-ai-ghost-new');
		mark(preview.changed, 'lb-ai-ghost-changed');
		const first = doc.querySelector('.lb-ai-ghost-new,.lb-ai-ghost-changed');
		if (first && first.scrollIntoView) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	/* ================================================================== *
	 * Page outline (AI context)
	 * ================================================================== */
	const TEXT_KEYS = ['text', 'title', 'heading', 'content', 'description', 'button_text', 'label', 'caption'];
	const LAYOUT_KEYS = ['tag', 'direction', 'justify', 'align', 'wrap', 'gap', 'columns', 'template', 'col_gap', 'row_gap', 'layout', 'link', 'url', 'src', 'alt', 'source'];
	const plain = (v) =>
		String(v == null ? '' : v)
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	LB.pageOutline = function pageOutline(o) {
		o = o || {};
		const state = typeof LB.getState === 'function' ? LB.getState() : { root: [] };
		let count = 0;
		const limit = o.limit || 700;
		const onPage = {};
		let contentUsed = 0;
		const walk = (nodes, depth) =>
			(nodes || [])
				.filter(Boolean)
				.map((n) => {
					if (count++ > limit) return null;
					const s = n.settings || {};
					const row = { id: n.id, type: n.type };
					onPage[n.type] = true;
					TEXT_KEYS.forEach((k) => {
						if (typeof s[k] === 'string' && s[k].trim()) row[k] = plain(s[k]).slice(0, 160);
					});
					LAYOUT_KEYS.forEach((k) => {
						const v = s[k];
						if (v == null || v === '' || (typeof v === 'string' && v.indexOf('data:') === 0)) return;
						row[k] = typeof v === 'object' ? v : String(v).slice(0, 200);
					});
					const cls = toClassList(s.xe_classes);
					if (cls.length) row.classes = cls;
					// Effects in use (entrance animations, add-on motion settings), so the model can change or remove them.
					const fx = unitEffects(n);
					if (fx) row.effects = fx;
					// Classic units: their current content, so the model can edit lists and options in place.
					if (contentUsed < NODE_SETTINGS_BUDGET) {
						const content = unitContent(n);
						const json = content ? JSON.stringify(content) : '';
						if (json && json.length <= 2500) {
							row.content = content;
							contentUsed += json.length;
						}
					}
					if (n.children && n.children.length && depth < 14) row.children = walk(n.children, depth + 1);
					return row;
				})
				.filter(Boolean);
		const sel = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
		const selNode = sel ? locateIn(state, sel) : null;
		const mg = W.XEditor && W.XEditor.classes;
		const allowed = (DATA().caps && DATA().caps.units) || null;
		const pro = !!(DATA().proLicense && DATA().proLicense.active);
		const usable = (DATA().units || []).filter((u) => u && u.type && (!allowed || allowed.indexOf(u.type) !== -1) && (pro || u.source !== 'pro')).slice(0, 260);
		const units = usable.map((u) => u.type + ': ' + (u.title || u.type));
		const outline = {
			page: { title: DATA().postTitle || '', type: DATA().postType || '' },
			device: typeof LB.getDevice === 'function' ? LB.getDevice() : 'desktop',
			scope: o.scope || 'page',
			selected: selNode ? { id: selNode.node.id, type: selNode.node.type, parent: selNode.parent ? selNode.parent.id : null, settings: compactSettings(selNode.node.settings) } : null,
			tree: walk(state.root, 0),
			design: mg
				? {
						variables: mg.variables().slice(0, 120).map((v) => ({ name: v.name, type: v.type, value: v.value })),
						classes: mg.classes().slice(0, 150).map((c) => ({ name: c.name, styles: c.styles || {} })),
				  }
				: null,
			breakpoints: Object.keys(DATA().breakpoints || { tablet: 1, mobile: 1 }),
			units,
		};
		if (selNode) onPage[selNode.node.type] = true;
		outline.unit_settings = rankedUnitSettings(
			usable.map((u) => u.type),
			o.query,
			onPage
		);
		if (count > limit) outline.truncated = true;
		return outline;
	};
	function compactSettings(s) {
		const json = JSON.stringify(s || {});
		if (json.length <= 4000) return JSON.parse(json);
		const out = {};
		Object.keys(s || {}).forEach((k) => {
			const v = JSON.stringify(s[k]);
			if (v && v.length <= 400) out[k] = s[k];
		});
		return out;
	}
	const MAX_CONTEXT_CHARS = 110000; // the server keeps the first 120,000 characters
	function stripContent(rows) {
		(rows || []).forEach((r) => {
			if (r) {
				delete r.content;
				stripContent(r.children);
			}
		});
	}
	function safeOutline(scope, query) {
		let o;
		try {
			o = LB.pageOutline({ scope, query });
		} catch (e) {
			o = LB.pageOutline({ scope, query, limit: 300 });
			o.selected = null;
		}
		// Keep the JSON whole: drop the least relevant unit settings first, then
		// the content copies, then fall back to a shorter page tree.
		const size = () => JSON.stringify(o).length;
		const keys = Object.keys(o.unit_settings || {});
		while (keys.length && size() > MAX_CONTEXT_CHARS) delete o.unit_settings[keys.pop()];
		if (size() > MAX_CONTEXT_CHARS) stripContent(o.tree);
		if (size() > MAX_CONTEXT_CHARS) {
			const selected = o.selected;
			o = LB.pageOutline({ scope, query, limit: 300 });
			o.selected = selected;
			o.unit_settings = {};
			stripContent(o.tree);
		}
		return o;
	}

	/* ================================================================== *
	 * HTML / CSS import
	 * ================================================================== */
	const BLOCK_TAGS = ['div', 'section', 'header', 'footer', 'main', 'nav', 'article', 'aside', 'figure', 'form', 'ul', 'ol', 'li', 'dl', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'img', 'picture', 'video', 'iframe', 'hr', 'pre', 'fieldset', 'address', 'details', 'button'];
	const INLINE_OK = ['strong', 'b', 'em', 'i', 'u', 'br', 'span', 'code', 'small', 'a', 'mark', 'sup', 'sub'];
	const SKIP_TAGS = ['script', 'style', 'link', 'meta', 'noscript', 'template', 'object', 'embed', 'head', 'title', 'base'];

	function cleanInline(el) {
		const walk = (node) => {
			let out = '';
			node.childNodes.forEach((c) => {
				if (c.nodeType === 3) out += esc(c.nodeValue.replace(/\s+/g, ' '));
				else if (c.nodeType === 1) {
					const tag = c.tagName.toLowerCase();
					if (SKIP_TAGS.indexOf(tag) !== -1 || tag === 'svg') return;
					const inner = walk(c);
					if (INLINE_OK.indexOf(tag) === -1) {
						out += inner;
						return;
					}
					if (tag === 'br') out += '<br>';
					else if (tag === 'a') {
						const href = String(c.getAttribute('href') || '');
						out += /^(https?:|mailto:|tel:|#|\/)/i.test(href) ? '<a href="' + esc(href) + '">' + inner + '</a>' : inner;
					} else out += '<' + tag + '>' + inner + '</' + tag + '>';
				}
			});
			return out;
		};
		return walk(el).replace(/\s+/g, ' ').trim();
	}
	function hasBlockChild(el) {
		return Array.from(el.children).some((c) => BLOCK_TAGS.indexOf(c.tagName.toLowerCase()) !== -1 || isButtonLink(c) || isLargeSvg(c));
	}
	/** An SVG drawn as a logo or illustration (small icons inside text stay out). */
	function isLargeSvg(el) {
		if (!el || el.tagName.toLowerCase() !== 'svg' || typeof el.getBoundingClientRect !== 'function') return false;
		const r = el.getBoundingClientRect();
		return r.width >= 32 || r.height >= 32;
	}
	const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|m4v|mov)$/i;
	const VIDEO_HOSTS = /(youtube(-nocookie)?\.com|youtu\.be|vimeo\.com|dailymotion\.com|dai\.ly|videopress\.com)/i;
	function urlExt(u) {
		const m = String(u || '')
			.split(/[?#]/)[0]
			.match(/\.([a-z0-9]{2,5})$/i);
		return m ? m[1].toLowerCase() : '';
	}
	/** Provider name for the Video unit's source setting. */
	function videoSource(url) {
		const u = String(url || '').toLowerCase();
		if (/youtu/.test(u)) return 'youtube';
		if (/vimeo/.test(u)) return 'vimeo';
		if (/dailymotion|dai\.ly/.test(u)) return 'dailymotion';
		if (/videopress/.test(u)) return 'videopress';
		return 'hosted';
	}
	function isButtonLink(el) {
		if (!el || el.tagName.toLowerCase() !== 'a') return false;
		const cls = String(el.getAttribute('class') || '').toLowerCase();
		return /\b(btn|button|cta)\b/.test(cls) || el.getAttribute('role') === 'button';
	}
	function absUrl(u, base) {
		u = String(u || '').trim();
		if (!u || /^(javascript|vbscript|data):/i.test(u)) return '';
		try {
			const abs = new URL(u, base || W.location.href).href;
			return /^https?:/i.test(abs) ? abs : '';
		} catch (e) {
			return '';
		}
	}
	/** Short stable hash of a style object's JSON (FNV-1a, base 36). */
	function styleHash(str) {
		let h = 2166136261;
		for (let i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (h >>> 0).toString(36);
	}
	/*
	 * Media queries are evaluated at one width per breakpoint (the converter
	 * renders at 1280px), so desktop-first (max-width) and mobile-first
	 * (min-width) stylesheets both end up as desktop styles with tablet and
	 * mobile overrides, the way XEditor classes cascade.
	 */
	const CSS_WIDTHS = { desktop: 1280, tablet: 800, mobile: 390 };
	const CSS_BPS = ['desktop', 'tablet', 'mobile'];
	/** The breakpoints a media query list matches, as { desktop: 1, … }. */
	function mediaWidths(media) {
		const hit = {};
		const px = (n, unit) => parseFloat(n) * (/r?em/i.test(unit || '') ? 16 : 1);
		String(media || 'all')
			.toLowerCase()
			.split(',')
			.forEach((q) => {
				q = q.trim() || 'all';
				if (/^not\b/.test(q) || (/\b(print|speech)\b/.test(q) && !/\b(screen|all)\b/.test(q))) return;
				let lo = 0;
				let hi = Infinity;
				let ok = true;
				(q.match(/\([^()]*\)/g) || []).forEach((f) => {
					let m = f.match(/^\(\s*(min|max)-(?:device-)?width\s*:\s*([\d.]+)\s*(px|em|rem)?\s*\)$/);
					if (m) {
						if (m[1] === 'min') lo = Math.max(lo, px(m[2], m[3]));
						else hi = Math.min(hi, px(m[2], m[3]));
						return;
					}
					m = f.match(/^\(\s*width\s*(>=|>|<=|<)\s*([\d.]+)\s*(px|em|rem)?\s*\)$/);
					if (m) {
						const v = px(m[2], m[3]);
						if (m[1] === '>=') lo = Math.max(lo, v);
						else if (m[1] === '>') lo = Math.max(lo, v + 0.02);
						else if (m[1] === '<=') hi = Math.min(hi, v);
						else hi = Math.min(hi, v - 0.02);
						return;
					}
					// What a desktop browser reports; anything else (dark mode, touch, portrait) is left out.
					if (!/^\(\s*(hover\s*:\s*hover|pointer\s*:\s*fine|any-hover\s*:\s*hover|any-pointer\s*:\s*fine|orientation\s*:\s*landscape|prefers-reduced-motion\s*:\s*no-preference|prefers-color-scheme\s*:\s*light|color|min-resolution[^)]*|-webkit-min-device-pixel-ratio[^)]*)\s*\)$/.test(f)) ok = false;
				});
				if (ok) CSS_BPS.forEach((bp) => CSS_WIDTHS[bp] >= lo && CSS_WIDTHS[bp] <= hi && (hit[bp] = 1));
			});
		return hit;
	}
	function parseCss(cssText, prefix) {
		const pfx = (n) => (prefix ? slug(prefix + n) : n);
		const out = { classes: {}, vars: {}, body: null, fonts: [], used: false };
		if (!cssText || !cssText.trim()) return out;
		let sheet = null;
		try {
			sheet = new CSSStyleSheet();
			sheet.replaceSync(cssText.replace(/@import[^;]+;/gi, ''));
		} catch (e) {
			return out;
		}
		const take = (rule, hit) => {
			const props = {};
			// Read the declarations as written: the CSSOM leaves shorthands that use var() empty.
			declarations(rule.style.cssText).forEach(([p, v]) => {
				if (p.indexOf('--') === 0) {
					if (hit.desktop && /(^|,)\s*(:root|html|body)\s*($|,)/.test(rule.selectorText)) out.vars[pfx(slug(p.slice(2)))] = v;
					return;
				}
				props[p] = v.replace(/var\(\s*--([a-zA-Z0-9_-]+)/g, (m, n) => 'var(--xe-var-' + pfx(slug(n)));
			});
			return props;
		};
		// Class rules in source order with the breakpoints they reach: name → state → [{ props, hit }].
		const found = {};
		const visit = (rules, hit) => {
			Array.from(rules || []).forEach((rule) => {
				if (rule.type === 4 /* MEDIA */) {
					const inner = mediaWidths(rule.media && rule.media.mediaText);
					CSS_BPS.forEach((bp) => hit[bp] || delete inner[bp]);
					if (Object.keys(inner).length) visit(rule.cssRules, inner);
					return;
				}
				if (rule.type === 5 /* FONT_FACE */) {
					out.fonts.push(...fontFace(rule.style));
					return;
				}
				if (rule.type !== 1 /* STYLE */) {
					// @supports and @layer blocks: their rules count as written.
					if (rule.type === 12 /* SUPPORTS */ || (rule.constructor && rule.constructor.name === 'CSSLayerBlockRule')) visit(rule.cssRules, hit);
					return;
				}
				const props = take(rule, hit);
				if (!Object.keys(props).length) return;
				String(rule.selectorText || '')
					.split(',')
					.forEach((sel) => {
						sel = sel.trim();
						const m = sel.match(/^(?:[a-z0-9]+)?\.([a-zA-Z0-9_-]+)(:hover|:focus|:active|:focus-visible)?$/);
						if (m) {
							const name = slug(m[1]);
							const state = m[2] ? m[2].slice(1).replace('-', '_') : 'base';
							const c = (found[name] = found[name] || {});
							(c[state] = c[state] || []).push({ props, hit });
						} else if (/^(body|html)$/.test(sel) && hit.desktop) out.body = Object.assign(out.body || {}, props);
					});
			});
		};
		visit(sheet.cssRules, { desktop: 1, tablet: 1, mobile: 1 });
		/*
		 * What each breakpoint shows, then desktop styles plus what changes at
		 * tablet and at mobile. A property set only for wider screens (a
		 * min-width rule) is reset on the narrower ones.
		 */
		const reset = (p) => (p === 'display' ? 'block' : 'unset');
		const changes = (narrow, wide) => {
			const d = {};
			Object.keys(wide).forEach((p) => p in narrow || (d[p] = reset(p)));
			Object.keys(narrow).forEach((p) => narrow[p] !== wide[p] && (d[p] = narrow[p]));
			return d;
		};
		Object.keys(found).forEach((name) => {
			const c = {};
			Object.keys(found[name]).forEach((state) => {
				const eff = { desktop: {}, tablet: {}, mobile: {} };
				found[name][state].forEach((e) => CSS_BPS.forEach((bp) => e.hit[bp] && Object.assign(eff[bp], e.props)));
				const st = {};
				const tablet = changes(eff.tablet, eff.desktop);
				const mobile = changes(eff.mobile, eff.tablet);
				if (Object.keys(eff.desktop).length) st.desktop = eff.desktop;
				if (Object.keys(tablet).length) st.tablet = tablet;
				if (Object.keys(mobile).length) st.mobile = mobile;
				if (Object.keys(st).length) c[state] = st;
			});
			if (Object.keys(c).length) out.classes[name] = c;
		});
		return out;
	}
	/**
	 * One @font-face rule as { family, weight, style, src: [urls], latin }. A variable
	 * font's weight range ("100 900") gives 400 when the range has it, else its lowest
	 * weight. latin: the face covers basic Latin letters (no unicode-range, or one with U+0041).
	 */
	function fontFace(style) {
		const family = String(style.getPropertyValue('font-family') || '')
			.trim()
			.replace(/^(['"])(.*)\1$/, '$2')
			.trim();
		const src = [];
		String(style.getPropertyValue('src') || '').replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
			if (/^https?:/i.test(u)) src.push(u);
			return m;
		});
		if (!family || !src.length) return [];
		const weights = String(style.getPropertyValue('font-weight') || '400')
			.trim()
			.split(/\s+/)
			.map((x) => (x === 'bold' ? 700 : x === 'normal' ? 400 : parseInt(x, 10)))
			.filter((x) => x > 0);
		const w = weights.length > 1 ? (weights[0] <= 400 && weights[1] >= 400 ? 400 : weights[0]) : weights[0] || 400;
		const range = String(style.getPropertyValue('unicode-range') || '').trim();
		const latin =
			!range ||
			range.split(',').some((part) => {
				const m = part.trim().match(/^u\+([0-9a-f?]+)(?:-([0-9a-f]+))?$/i);
				if (!m) return false;
				const lo = parseInt(m[1].replace(/\?/g, '0'), 16);
				const hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'f'), 16);
				return lo <= 0x41 && hi >= 0x41;
			});
		return [{ family, weight: w, style: /italic|oblique/i.test(style.getPropertyValue('font-style') || '') ? 'italic' : 'normal', src, latin }];
	}
	/** The @font-face rules of a stylesheet. */
	LB.cssFontFaces = function cssFontFaces(cssText) {
		return parseCss(cssText, '').fonts;
	};
	function declarations(text) {
		const out = [];
		let depth = 0;
		let quote = '';
		let cur = '';
		const push = () => {
			const i = cur.indexOf(':');
			if (i > 0) {
				const p = cur.slice(0, i).trim().toLowerCase();
				const v = cur.slice(i + 1).replace(/!important\s*$/i, '').trim();
				if (/^-{0,2}[a-z][a-z0-9-]*$/.test(p) && v) out.push([p, v]);
			}
			cur = '';
		};
		for (const ch of String(text || '')) {
			if (quote) {
				if (ch === quote) quote = '';
			} else if (ch === '"' || ch === "'") quote = ch;
			else if (ch === '(') depth++;
			else if (ch === ')') depth = Math.max(0, depth - 1);
			else if (ch === ';' && !depth) {
				push();
				continue;
			}
			cur += ch;
		}
		push();
		return out;
	}
	function inlineStyleProps(el) {
		const props = {};
		declarations(el.getAttribute('style')).forEach(([p, v]) => {
			if (p.indexOf('--') !== 0) props[p] = v.replace(/var\(\s*--([a-zA-Z0-9_-]+)/g, (m, n) => 'var(--xe-var-' + slug(n));
		});
		return props;
	}

	/**
	 * Convert HTML (and optional CSS) into a plan. The markup is rendered in a
	 * sandboxed, script-free frame so computed layout (flex, grid) can be read.
	 */
	LB.htmlToPlan = function htmlToPlan(html, extraCss, opts) {
		opts = opts || {};
		return new Promise((resolve) => {
			const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
			let cssText = String(extraCss || '');
			parsed.querySelectorAll('style').forEach((s) => (cssText += '\n' + s.textContent));
			parsed.querySelectorAll('script,link,meta,noscript,template,object,embed,base').forEach((n) => n.remove());
			parsed.querySelectorAll('*').forEach((n) => {
				Array.from(n.attributes).forEach((a) => {
					if (/^on/i.test(a.name) || /^\s*(javascript|vbscript):/i.test(a.value)) n.removeAttribute(a.name);
				});
			});
			const pageTitle = (parsed.querySelector('title') && parsed.querySelector('title').textContent.trim()) || '';
			const frame = document.createElement('iframe');
			frame.setAttribute('sandbox', 'allow-same-origin');
			frame.setAttribute('aria-hidden', 'true');
			frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:900px;border:0;visibility:hidden';
			const doc = '<!doctype html><html><head><meta charset="utf-8"><style>' + cssText.replace(/<\/style/gi, '') + '</style></head><body>' + parsed.body.innerHTML + '</body></html>';
			let done = false;
			const finish = () => {
				if (done) return;
				done = true;
				let plan;
				try {
					plan = convertDocument(frame.contentDocument, cssText, pageTitle, opts);
				} catch (e) {
					plan = { title: t('Imported HTML'), summary: t('The HTML could not be read.'), ops: [], stats: { nodes: 0 } };
				}
				frame.remove();
				resolve(plan);
			};
			// Read the page only once the srcdoc document has loaded: the frame's first load is
			// its blank page, and reading then could miss the end of a page still being parsed.
			frame.srcdoc = doc;
			frame.addEventListener('load', () => {
				const d = frame.contentDocument;
				if (d && d.URL === 'about:srcdoc') setTimeout(finish, 60);
			});
			document.body.appendChild(frame);
			// Embedded players that never finish loading must not hold the import up: after 4
			// seconds read the page as soon as it is parsed (and after 12 seconds in any case).
			const started = Date.now();
			const fallback = () => {
				if (done) return;
				const d = frame.contentDocument;
				if ((d && d.URL === 'about:srcdoc' && d.readyState !== 'loading') || Date.now() - started > 12000) finish();
				else setTimeout(fallback, 250);
			};
			setTimeout(fallback, 4000);
		});
	};
	function convertDocument(doc, cssText, pageTitle, opts) {
		// opts.classPrefix keeps imported class and variable names apart from the site's own.
		const prefix = opts.classPrefix ? slug(opts.classPrefix) + '-' : '';
		const pfx = (n) => (prefix ? slug(prefix + n) : n);
		const css = parseCss(cssText, prefix);
		const usedClasses = {};
		const inlineClasses = {};
		let nodes = 0;
		const MAX_NODES = opts.maxNodes || 1500;
		const win = doc.defaultView;
		const cs = (el) => (win ? win.getComputedStyle(el) : null);
		const notes = [];
		const note = (text) => notes.indexOf(text) === -1 && notes.push(text);
		const classesOf = (el, extra) => {
			const list = [];
			const raw = [];
			String(el.getAttribute('class') || '')
				.split(/\s+/)
				.forEach((c) => {
					const n = slug(c);
					if (n && css.classes[n] && raw.indexOf(n) === -1) {
						list.push(pfx(n));
						raw.push(n);
						usedClasses[n] = 1;
					}
				});
			let inl = inlineStyleProps(el);
			if (typeof extra === 'function') {
				// Properties the element's own classes and style attribute already set.
				const declared = {};
				raw.forEach((n) => Object.keys(((css.classes[n] || {}).base || {}).desktop || {}).forEach((p) => (declared[p] = 1)));
				Object.keys(inl).forEach((p) => (declared[p] = 1));
				inl = Object.assign({}, extra(declared), inl);
			}
			if (Object.keys(inl).length) {
				const key = JSON.stringify(inl);
				// Named after the styles: imports share the site-wide class list, so a counter
				// ("imported-1") from a later import would overwrite an earlier page's class.
				if (!inlineClasses[key]) inlineClasses[key] = 'imported-' + styleHash(key);
				list.push(inlineClasses[key]);
			}
			return list;
		};
		const settingsWith = (el, s, extra) => {
			const cls = classesOf(el, extra);
			if (cls.length) s.xe_classes = cls;
			return s;
		};
		/*
		 * XEditor buttons have a default dark fill and white text. When the HTML
		 * does not set a background or text color on the button itself (an outline
		 * or text-style button), keep the color the browser actually showed.
		 */
		const transparent = (v) => !v || v === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(v.replace(/\s+/g, ' '));
		const buttonColors = (el) => (declared) => {
			const st = cs(el);
			const out = {};
			if (!st) return out;
			if (!declared.background && !declared['background-color'] && !declared['background-image']) out.background = transparent(st.backgroundColor) ? 'transparent' : st.backgroundColor;
			if (!declared.color) out.color = st.color;
			return out;
		};
		/*
		 * Styles that reach an element through descendant or tag selectors
		 * (".card h3", "h1", ".media img") or the browser's defaults (bold
		 * headings) are not carried by its classes. Keep what the browser showed
		 * for these properties, unless the element's own classes set them, so the
		 * theme's heading and text styles do not replace the imported design.
		 */
		const HEADING_LOOK = ['font-size', 'font-weight', 'color', 'font-family', 'line-height', 'letter-spacing', 'text-transform', 'margin-top', 'margin-bottom'];
		const TEXT_LOOK = ['font-size', 'font-weight', 'color', 'font-family', 'line-height', 'margin-top', 'margin-bottom'];
		const IMAGE_LOOK = ['border-radius', 'box-shadow', 'object-fit'];
		// Boxes styled through selectors their classes do not carry (".hero > div", "#intro", "main section").
		const BOX_LOOK = ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-radius', 'box-shadow', 'max-width', 'min-height', 'color', 'text-align'];
		const computedLook = (el, props) => (declared) => {
			const st = cs(el);
			const out = {};
			if (!st) return out;
			const parent = el.parentElement && cs(el.parentElement);
			const hasImage = /url\(/.test(st.backgroundImage || '');
			props.forEach((p) => {
				if (declared[p] || (p.indexOf('padding-') === 0 && declared.padding) || (p.indexOf('background-') === 0 && declared.background)) return;
				const v = String(st.getPropertyValue(p) || '').trim();
				if (!v || v === 'normal' || v === 'none' || v === 'auto' || (/^(border-radius|margin-top|margin-bottom|padding-(top|right|bottom|left)|min-height)$/.test(p) && /^0(px)?$/.test(v)) || (p === 'object-fit' && v === 'fill')) return;
				if (p === 'background-color' && transparent(v)) return;
				if (/^background-(size|position|repeat)$/.test(p) && !hasImage) return;
				if ((p === 'background-size' && v === 'auto') || (p === 'background-position' && v === '0% 0%') || (p === 'background-repeat' && v === 'repeat')) return;
				if (p === 'text-align' && /^(start|left)$/.test(v)) return;
				// Inherited values only matter where they differ from the parent's.
				if ((p === 'color' || p === 'text-align') && parent && parent.getPropertyValue(p) === v) return;
				out[p] = v;
			});
			return out;
		};
		const containerFor = (el, tag) => {
			const st = cs(el);
			const boxLook = computedLook(el, BOX_LOOK);
			const display = st ? st.display : 'block';
			const allowedTags = ['div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'figure'];
			const t2 = allowedTags.indexOf(tag) !== -1 ? tag : 'div';
			if (/grid/.test(display)) {
				const cols = st.gridTemplateColumns && st.gridTemplateColumns !== 'none' ? st.gridTemplateColumns.split(/\s+(?![^(]*\))/).length : 1;
				return { type: 'xe_grid', settings: settingsWith(el, { tag: t2, columns: String(Math.max(1, Math.min(12, cols))), col_gap: st.columnGap && st.columnGap !== 'normal' ? st.columnGap : '0px', row_gap: st.rowGap && st.rowGap !== 'normal' ? st.rowGap : '0px' }, boxLook) };
			}
			if (/flex/.test(display)) {
				const dir = st.flexDirection === 'column' || st.flexDirection === 'column-reverse' ? 'column' : 'row';
				return {
					type: 'xe_flexbox',
					settings: settingsWith(el, { tag: t2, direction: dir, justify: st.justifyContent && st.justifyContent !== 'normal' ? st.justifyContent : 'flex-start', align: st.alignItems && st.alignItems !== 'normal' ? st.alignItems : 'stretch', wrap: st.flexWrap === 'nowrap' ? 'nowrap' : 'wrap', gap: st.gap && st.gap !== 'normal' ? st.gap.split(' ')[0] : '0px' }, boxLook),
				};
			}
			return { type: 'xe_div_block', settings: settingsWith(el, { tag: t2 }, boxLook) };
		};
		const textNode = (text, el) => ({ type: 'xe_paragraph', settings: settingsWith(el, { text, tag: 'p' }, computedLook(el, TEXT_LOOK)) });
		const walk = (el) => {
			if (nodes >= MAX_NODES) return [];
			const tag = el.tagName.toLowerCase();
			if (SKIP_TAGS.indexOf(tag) !== -1) return [];
			const st = cs(el);
			if (st && st.display === 'none') return [];
			nodes++;
			if (/^h[1-6]$/.test(tag)) return [{ type: 'xe_heading', settings: settingsWith(el, { text: el.textContent.replace(/\s+/g, ' ').trim(), tag }, computedLook(el, HEADING_LOOK)) }];
			if (tag === 'img') return [{ type: 'xe_image', settings: settingsWith(el, { source: 'url', src: absUrl(el.getAttribute('src'), opts.baseUrl), alt: String(el.getAttribute('alt') || '').slice(0, 200) }, computedLook(el, IMAGE_LOOK)) }];
			if (tag === 'picture') {
				const img = el.querySelector('img');
				return img ? walk(img) : [];
			}
			if (tag === 'svg') return guarded(svgNode, el);
			if (tag === 'video') return guarded(videoNode, el);
			if (tag === 'hr') return meta('divider').type ? [{ type: 'divider', settings: {} }] : [];
			if (tag === 'button' || (tag === 'input' && /^(submit|button)$/i.test(el.getAttribute('type') || '')) || isButtonLink(el)) {
				const text = tag === 'input' ? el.getAttribute('value') || t('Submit') : el.textContent.replace(/\s+/g, ' ').trim();
				return [{ type: 'xe_button', settings: settingsWith(el, { text: text || t('Button'), link: tag === 'a' ? absUrl(el.getAttribute('href'), opts.baseUrl) || '#' : '' }, buttonColors(el)) }];
			}
			if (tag === 'iframe') return guarded(iframeNode, el);
			if (tag === 'table') {
				const tmp = el.cloneNode(true);
				tmp.querySelectorAll('*').forEach((n) => Array.from(n.attributes).forEach((a) => /^(colspan|rowspan|scope)$/.test(a.name) || n.removeAttribute(a.name)));
				return meta('html').type ? [{ type: 'html', settings: { html: tmp.outerHTML.slice(0, MAX_STRING) } }] : [];
			}
			if (tag === 'form' && meta('form').type) return [{ type: 'form', settings: {} }];
			if (['input', 'select', 'textarea', 'label', 'option'].indexOf(tag) !== -1) return [];
			if (tag === 'ul' || tag === 'ol') {
				const box = { type: 'xe_flexbox', settings: settingsWith(el, { direction: 'column', gap: '8px', wrap: 'nowrap', align: 'stretch', justify: 'flex-start' }), children: [] };
				Array.from(el.children).forEach((li) => {
					if (li.tagName.toLowerCase() !== 'li') return;
					if (hasBlockChild(li)) box.children.push(...walk(li));
					else {
						const txt = cleanInline(li);
						if (txt) {
							nodes++;
							box.children.push({ type: 'xe_paragraph', settings: settingsWith(li, { text: (tag === 'ul' ? '• ' : '') + txt, tag: 'p' }, computedLook(li, TEXT_LOOK)) });
						}
					}
				});
				return box.children.length ? [box] : [];
			}
			// A flex or grid row of links or chips (a menu) keeps one item per child instead of
			// running them together as one line of text.
			const isLayout = !!st && /flex|grid/.test(st.display) && el.children.length > 1;
			const isLeafText = !hasBlockChild(el) && !isLayout;
			if (isLeafText) {
				const txt = cleanInline(el);
				if (!txt) {
					// Decorative boxes: a class, or a background image set some other way (a lazy data-bg).
					if (['div', 'section', 'figure', 'span'].indexOf(tag) !== -1 && (classesOf(el).length || /url\(/.test(st ? st.backgroundImage : '')) && st && parseFloat(st.height) > 2) return [containerFor(el, tag)];
					return [];
				}
				if (tag === 'a') return [{ type: 'xe_paragraph', settings: settingsWith(el, { text: cleanInline(wrapA(el)), tag: 'p' }) }];
				return [textNode(txt, el)].map((n) => (['blockquote', 'small'].indexOf(tag) !== -1 ? ((n.settings.tag = tag), n) : n));
			}
			const box = containerFor(el, tag);
			box.children = [];
			let buffer = '';
			const flush = () => {
				const txt = buffer.replace(/\s+/g, ' ').trim();
				if (txt) {
					nodes++;
					box.children.push({ type: 'xe_paragraph', settings: { text: esc(txt), tag: 'p' } });
				}
				buffer = '';
			};
			el.childNodes.forEach((c) => {
				if (c.nodeType === 3) buffer += c.nodeValue;
				else if (c.nodeType === 1) {
					const ctag = c.tagName.toLowerCase();
					if (!isLayout && INLINE_OK.indexOf(ctag) !== -1 && !isButtonLink(c) && !hasBlockChild(c)) buffer += c.textContent;
					else {
						flush();
						box.children.push(...walk(c));
					}
				}
			});
			flush();
			return [box];
		};
		/** One unusual element (odd markup, an address URL() rejects) is left out instead of failing the page. */
		function guarded(fn, el) {
			try {
				return fn(el);
			} catch (e) {
				return [];
			}
		}
		/** <video>: a Video block playing the file (copied to the Media Library when that option is on). */
		function videoNode(el) {
			if (!meta('video').type) return [];
			let src = absUrl(el.getAttribute('src'), opts.baseUrl);
			if (!src) {
				const sources = Array.from(el.querySelectorAll('source')).map((n) => ({ url: absUrl(n.getAttribute('src'), opts.baseUrl), type: String(n.getAttribute('type') || '') }));
				const pick = sources.find((x) => x.url && (/mp4/i.test(x.type) || /\.mp4$/i.test(x.url.split(/[?#]/)[0]))) || sources.find((x) => x.url);
				src = pick ? pick.url : '';
			}
			if (!src) {
				note(t('A video without a file address was left out.'));
				return [];
			}
			const on = (a) => el.hasAttribute(a);
			const settings = { source: VIDEO_HOSTS.test(src) ? videoSource(src) : 'hosted', url: src, autoplay: on('autoplay'), mute: on('muted') || on('autoplay'), loop: on('loop'), controls: on('controls'), play_on_mobile: on('autoplay') && on('playsinline') };
			const poster = absUrl(el.getAttribute('poster'), opts.baseUrl);
			if (poster) settings.poster_url = poster;
			return [{ type: 'video', settings: settingsWith(el, settings, computedLook(el, IMAGE_LOOK)) }];
		}
		/** <iframe>: Video for video sites, Google Maps for maps, Embed for the rest. */
		function iframeNode(el) {
			const src = absUrl(el.getAttribute('src') || el.getAttribute('data-src'), opts.baseUrl);
			if (!src) return [];
			let host = '';
			try {
				host = new URL(src).hostname.replace(/^www\./, '');
			} catch (e) {
				return [];
			}
			if (VIDEO_HOSTS.test(host)) return meta('video').type ? [{ type: 'video', settings: { source: videoSource(src), url: src, video_url: src } }] : [];
			if (/(^|\.)google\.[a-z.]+$/.test(host) && /\/maps/.test(src) || /^maps\.google\./.test(host)) {
				if (!meta('google_maps').type) return [];
				const u = new URL(src);
				let address = u.searchParams.get('q') || u.searchParams.get('query') || '';
				const pb = u.searchParams.get('pb') || '';
				// A place's name follows its id (!1s0x…!2sName); a bare !2s is the map's language or region.
				const named = pb.match(/!1s0x[^!]*!2s([^!]+)/);
				if (!address && named) address = decodeURIComponent(named[1].replace(/\+/g, ' '));
				const lng = pb.match(/!2d(-?[\d.]+)/);
				const lat = pb.match(/!3d(-?[\d.]+)/);
				if (!address && lat && lng) address = lat[1] + ',' + lng[1];
				if (!address) {
					address = String(el.getAttribute('title') || '').trim();
					note(t('A Google Map was added; check its address in the Google Maps block.'));
				}
				const st = cs(el);
				const height = Math.round(parseFloat(st ? st.height : el.getAttribute('height')) || 320);
				const zoom = parseInt(u.searchParams.get('z') || '', 10);
				return [{ type: 'google_maps', settings: { address: address.slice(0, 200), zoom: zoom > 0 && zoom < 22 ? zoom : 14, height } }];
			}
			if (!meta('embed').type) return [];
			// Player addresses become the page addresses oEmbed knows.
			let url = src;
			const u = new URL(src);
			if (/(^|\.)soundcloud\.com$/.test(host) && u.searchParams.get('url')) url = u.searchParams.get('url');
			else if (/open\.spotify\.com$/.test(host)) url = src.replace('/embed/', '/').split('?')[0];
			else if (/(^|\.)twitter\.com$|(^|\.)x\.com$/.test(host) && u.searchParams.get('id')) url = 'https://twitter.com/i/status/' + u.searchParams.get('id');
			note(t('Embedded content from %s was added as an Embed block; check that it shows.').replace('%s', host));
			return [{ type: 'embed', settings: { url } }];
		}
		/**
		 * Inline <svg> (logos, icons, illustrations) as an HTML block, cleaned
		 * of scripts, event handlers and outside references; icons from a
		 * sprite (<use href="#id">) are copied in.
		 */
		/**
		 * Put the colors and strokes the browser drew (from the SVG's <style>, its classes or the
		 * page's CSS) on the copy's shapes as attributes, so the drawing looks the same without them.
		 * The copy is made with cloneNode, so both trees have the same elements in the same order.
		 */
		const SVG_PAINT = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity'];
		const SVG_DEFAULTS = { 'fill-opacity': '1', 'fill-rule': 'nonzero', stroke: 'none', 'stroke-width': '1px', 'stroke-opacity': '1', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-dasharray': 'none', opacity: '1' };
		function paintSvg(src, dst) {
			const from = [src].concat(Array.from(src.querySelectorAll('*')));
			const to = [dst].concat(Array.from(dst.querySelectorAll('*')));
			from.forEach((n, i) => {
				const d = to[i];
				if (!d || !/^(svg|g|path|circle|rect|ellipse|line|polyline|polygon|text|tspan)$/i.test(n.tagName)) return;
				const st = cs(n);
				if (!st) return;
				SVG_PAINT.forEach((p) => {
					const v = String(st.getPropertyValue(p) || '').trim();
					// CSS wins over attributes, so what the browser computed replaces the attribute;
					// default values are only written where an attribute said otherwise.
					if (v && v !== d.getAttribute(p) && (d.hasAttribute(p) || SVG_DEFAULTS[p] !== v)) d.setAttribute(p, v);
				});
			});
		}
		function svgNode(el) {
			if (!meta('html').type) return [];
			const r = el.getBoundingClientRect();
			if (r.width < 1 && r.height < 1) return [];
			const copy = el.cloneNode(true);
			paintSvg(el, copy);
			copy.querySelectorAll('use').forEach((use) => {
				const ref = String(use.getAttribute('href') || use.getAttribute('xlink:href') || '');
				const id = ref.charAt(0) === '#' ? ref.slice(1) : '';
				// Looked up by attribute, not as a selector: ids such as "1-star" or "a.b" are not valid selectors.
				const inside = id && Array.from(copy.querySelectorAll('[id]')).some((n) => n.id === id);
				const sym = id && !inside ? doc.getElementById(id) : null;
				if (!sym || sym.contains(use)) return;
				const g = doc.createElementNS('http://www.w3.org/2000/svg', sym.tagName.toLowerCase() === 'symbol' ? 'svg' : 'g');
				if (sym.getAttribute('viewBox')) g.setAttribute('viewBox', sym.getAttribute('viewBox'));
				Array.from(sym.childNodes).forEach((c) => {
					const cc = c.cloneNode(true);
					if (c.nodeType === 1) paintSvg(c, cc);
					g.appendChild(cc);
				});
				use.replaceWith(g);
			});
			// The drawing's own <style> rules are now on its shapes; kept, they would style the whole page.
			copy.querySelectorAll('script, style, foreignObject, iframe, embed, object, audio, video, animate, set').forEach((n) => n.remove());
			[copy].concat(Array.from(copy.querySelectorAll('*'))).forEach((n) => {
				Array.from(n.attributes).forEach((a) => {
					const v = String(a.value || '').trim();
					if (/^on/i.test(a.name) || /(javascript|vbscript):/i.test(v) || (/(^|:)href$/i.test(a.name) && v.charAt(0) !== '#' && !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)) || a.name === 'class') n.removeAttribute(a.name);
				});
			});
			if (!copy.querySelector('path, circle, rect, ellipse, line, polyline, polygon, text, image')) return [];
			if (!copy.getAttribute('width')) copy.setAttribute('width', String(Math.round(r.width)));
			if (!copy.getAttribute('height')) copy.setAttribute('height', String(Math.round(r.height)));
			const st = cs(el);
			// Icons drawn with currentColor keep the color they had.
			if (st && st.color) copy.style.color = st.color;
			copy.removeAttribute('aria-hidden');
			const html = copy.outerHTML;
			if (html.length > 40000) {
				note(t('A large SVG drawing was left out.'));
				return [];
			}
			return [{ type: 'html', settings: { html } }];
		}
		function wrapA(a) {
			const d = doc.createElement('div');
			d.appendChild(a.cloneNode(true));
			return d;
		}
		const body = doc.body;
		let tree = [];
		Array.from(body.childNodes).forEach((c) => {
			if (c.nodeType === 1) tree.push(...walk(c));
			else if (c.nodeType === 3 && c.nodeValue.trim()) tree.push({ type: 'xe_paragraph', settings: { text: esc(c.nodeValue.trim()), tag: 'p' } });
		});
		const unwrap = (list) => (list.length === 1 && list[0].type === 'xe_div_block' && !(list[0].settings.xe_classes || []).length && list[0].children && list[0].children.length ? unwrap(list[0].children) : list);
		tree = unwrap(tree);
		if (css.body && tree.length) tree = [{ type: 'xe_div_block', settings: { tag: 'div', xe_classes: [pfx('page-body')] }, children: tree }];

		const ops = [];
		Object.keys(css.vars).forEach((name) => {
			const v = css.vars[name];
			const type = /^#|rgb|hsl/.test(v) ? 'color' : /px|rem|em|%/.test(v) ? 'size' : /,|serif|sans/.test(v) ? 'font' : 'custom';
			ops.push({ op: 'var', name, type, value: v });
		});
		Object.keys(usedClasses).forEach((name) => ops.push({ op: 'class', name: pfx(name), styles: css.classes[name] }));
		Object.keys(inlineClasses).forEach((key) => ops.push({ op: 'class', name: inlineClasses[key], styles: { base: { desktop: JSON.parse(key) } } }));
		if (css.body && tree.length) ops.push({ op: 'class', name: pfx('page-body'), styles: { base: { desktop: css.body } } });
		if (tree.length) ops.push({ op: 'insert', parent: opts.parent == null ? null : opts.parent, index: opts.index, nodes: tree });
		const classCount = Object.keys(usedClasses).length + Object.keys(inlineClasses).length + (css.body ? 1 : 0);
		const varCount = Object.keys(css.vars).length;
		const summary = t('%1$s elements, %2$s classes and %3$s variables converted to XEditor.').replace('%1$s', String(nodes)).replace('%2$s', String(classCount)).replace('%3$s', String(varCount)) + (nodes >= MAX_NODES ? ' ' + t('The page was long, so only the first part was imported.') : '');
		return { title: pageTitle ? t('Import:') + ' ' + pageTitle.slice(0, 40) : t('Imported HTML'), summary: summary + (notes.length ? ' ' + notes.join(' ') : ''), ops, notes, fonts: css.fonts, stats: { nodes, classes: classCount, variables: varCount } };
	}

	/* ================================================================== *
	 * Images (sent to vision models when the engine allows it)
	 * ================================================================== */
	function readImage(file, maxTiles) {
		return new Promise((resolve, reject) => {
			if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return reject(new Error(t('Use a PNG, JPG or WebP image.')));
			if (file.size > 15 * 1024 * 1024) return reject(new Error(t('The image is larger than 15 MB.')));
			const url = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				const scale = Math.min(1, 1280 / img.naturalWidth);
				const w = Math.round(img.naturalWidth * scale);
				const h = Math.round(img.naturalHeight * scale);
				const tileH = 1500;
				const count = Math.max(1, Math.min(maxTiles || 1, Math.ceil(h / tileH)));
				const sliceH = Math.ceil(h / count);
				const tiles = [];
				for (let i = 0; i < count; i++) {
					const c = document.createElement('canvas');
					c.width = w;
					c.height = Math.min(sliceH, h - i * sliceH);
					const ctx = c.getContext('2d');
					ctx.fillStyle = '#fff';
					ctx.fillRect(0, 0, c.width, c.height);
					ctx.drawImage(img, 0, (i * sliceH) / scale, img.naturalWidth, c.height / scale, 0, 0, c.width, c.height);
					const data = c.toDataURL('image/jpeg', 0.86);
					tiles.push({ mime: 'image/jpeg', data: data.slice(data.indexOf(',') + 1), thumb: i === 0 ? c.toDataURL('image/jpeg', 0.5) : '' });
				}
				URL.revokeObjectURL(url);
				resolve({ name: file.name, width: img.naturalWidth, height: img.naturalHeight, tiles });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error(t('The image could not be read.')));
			};
			img.src = url;
		});
	}

	/* ================================================================== *
	 * Breakpoint checks
	 *
	 * Before a plan is applied, its preview is measured on the canvas at every
	 * breakpoint the run is checked at: units that overflow the viewport, text
	 * that is clipped or spills out, collapsed boxes, overlapping siblings and
	 * small tap targets on narrow screens. The results (with each unit's box,
	 * a layout fingerprint) go into the run's validation artifact.
	 * ================================================================== */
	const frame = () => new Promise((r) => W.requestAnimationFrame(() => W.requestAnimationFrame(r)));
	const pause = (ms) => new Promise((r) => W.setTimeout(r, ms));
	const MAX_CHECKED = 300;
	function viewportList() {
		const list = (CFG().viewport && CFG().viewport.breakpoints) || [];
		return list.length ? list : [{ name: 'desktop', width: 1440 }, { name: 'tablet', width: 1024 }, { name: 'mobile', width: 390 }];
	}
	function subtreeIds(state, ids) {
		const out = [];
		const add = (n) => {
			if (!n || out.length >= MAX_CHECKED) return;
			if (out.indexOf(n.id) === -1) out.push(n.id);
			(n.children || []).forEach(add);
		};
		(ids || []).forEach((id) => {
			const r = locateIn(state, id);
			if (r) add(r.node);
		});
		return out;
	}
	function issue(code, message, id) {
		return { code, message, id: id || '' };
	}
	/**
	 * Inside a slider track, a scroller or an overflow:hidden wrapper, a box past
	 * the screen edge is clipped on purpose and does not make the page scroll.
	 */
	function clippedByAncestor(el, doc) {
		const win = doc.defaultView;
		for (let p = el.parentElement; p && p !== doc.body && p !== doc.documentElement; p = p.parentElement) {
			const s = win.getComputedStyle(p);
			if (s.overflowX !== 'visible' || s.position === 'fixed') return true;
		}
		return false;
	}
	function measure(doc, ids, width) {
		const vw = doc.documentElement.clientWidth;
		// The canvas may be narrower than the breakpoint's width (desktop fills the available space).
		const res = { width: vw || width, errors: [], warnings: [], boxes: [] };
		const win = doc.defaultView;
		const sx = win.scrollX || 0;
		const sy = win.scrollY || 0;
		const seen = [];
		ids.forEach((id) => {
			const host = doc.querySelector('[data-id="' + (W.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
			// The canvas keeps units hidden on this device visible (greyed out); they are not on the page here.
			if (!host || host.closest('.lb-hidden-here')) return;
			const el = host.querySelector(':scope > .xe-el') || host;
			const cs = win.getComputedStyle(el);
			if (cs.display === 'none' || cs.visibility === 'hidden') return; // Hidden on this device on purpose.
			const r = el.getBoundingClientRect();
			const label = nodeLabel((typeof LB.getNode === 'function' && LB.getNode(id)) || { type: '' });
			res.boxes.push({ id, x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) });
			const text = (el.textContent || '').trim();
			if ((r.width < 1 || r.height < 1) && text) res.warnings.push(issue('collapsed', label + ': ' + t('has text but no size.'), id));
			if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed' && !clippedByAncestor(el, doc)) res.errors.push(issue('overflow', label + ': ' + t('runs past the edge of the screen.'), id));
			if (text && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
				if (cs.overflowX !== 'visible' && cs.textOverflow === 'ellipsis') res.warnings.push(issue('ellipsis', label + ': ' + t('text is shortened with an ellipsis.'), id));
				else if (cs.overflowX !== 'visible') res.errors.push(issue('clipped', label + ': ' + t('text is cut off.'), id));
				else if (!el.children.length || /^(H[1-6]|P|A|BUTTON|SPAN)$/.test(el.tagName)) res.warnings.push(issue('text_overflow', label + ': ' + t('text spills out of its box.'), id));
			}
			if (width < 768 && (el.tagName === 'A' || el.tagName === 'BUTTON') && r.width > 0 && (r.height < 24 || r.width < 24)) res.warnings.push(issue('tap_target', label + ': ' + t('is smaller than 24px to tap.'), id));
			if (cs.position !== 'absolute' && cs.position !== 'fixed' && r.width > 0 && r.height > 0) seen.push({ id, label, r, parent: host.parentElement });
		});
		// Content inside a unit can run past the screen while the unit's own box fits (a squeezed
		// flex column, a long word, a wide child). When the page scrolls sideways, blame the
		// innermost checked unit that holds the overflowing element.
		if (doc.documentElement.scrollWidth > vw + 1) {
			const checked = {};
			ids.forEach((id) => (checked[id] = true));
			const blamed = {};
			res.errors.forEach((e) => e.code === 'overflow' && (blamed[e.id] = true));
			const all = doc.body ? doc.body.getElementsByTagName('*') : [];
			for (let i = 0; i < all.length && i < 6000; i++) {
				const el = all[i];
				const r = el.getBoundingClientRect();
				if (!(r.width > 0 && r.right > vw + 1)) continue;
				let host = el.closest('[data-id]');
				while (host && !checked[host.getAttribute('data-id')]) host = host.parentElement && host.parentElement.closest('[data-id]');
				if (!host || host.closest('.lb-hidden-here')) continue;
				const id = host.getAttribute('data-id');
				if (blamed[id] || win.getComputedStyle(el).position === 'fixed' || clippedByAncestor(el, doc)) continue;
				blamed[id] = true;
				const label = nodeLabel((typeof LB.getNode === 'function' && LB.getNode(id)) || { type: '' });
				res.errors.push(issue('overflow', label + ': ' + t('has content that runs past the edge of the screen.'), id));
			}
		}
		// Siblings drawn on top of each other (usually a fixed height or a negative margin).
		for (let i = 0; i < seen.length && res.warnings.length < 50; i++) {
			for (let j = i + 1; j < seen.length; j++) {
				const a = seen[i];
				const b = seen[j];
				if (a.parent !== b.parent) continue;
				const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
				const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
				if (w > 0 && h > 0 && w * h > 0.15 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) res.warnings.push(issue('overlap', a.label + ' / ' + b.label + ': ' + t('overlap.'), a.id));
			}
		}
		return res;
	}
	/**
	 * Measure nodes on the canvas at each breakpoint of the viewport, then go
	 * back to the device that was showing. Resolves to { breakpoint: result },
	 * or null when isCurrent() turns false (the preview ended).
	 */
	LB.checkLayout = async function checkLayout(ids, isCurrent) {
		const still = typeof isCurrent === 'function' ? isCurrent : () => true;
		const start = typeof LB.getDevice === 'function' ? LB.getDevice() : 'desktop';
		const pick = (name) => {
			const b = document.querySelector('button[data-device="' + name + '"]');
			if (b) b.click();
			return !!b;
		};
		const out = {};
		try {
			for (const bp of viewportList()) {
				if (!still()) return null;
				if (!pick(bp.name)) {
					out[bp.name] = { width: bp.width, errors: [], warnings: [issue('no_device', t('This breakpoint cannot be shown on the canvas.'))], boxes: [] };
					continue;
				}
				await frame();
				await pause(160);
				const doc = typeof LB.frameDoc === 'function' ? LB.frameDoc() : null;
				if (!doc || !still()) return null;
				out[bp.name] = measure(doc, ids, bp.width);
			}
		} finally {
			if (LB.getDevice && LB.getDevice() !== start) pick(start);
		}
		return out;
	};
	function layoutSummary(results) {
		let errors = 0;
		let warnings = 0;
		Object.keys(results || {}).forEach((k) => {
			errors += results[k].errors.length;
			warnings += results[k].warnings.length;
		});
		return { errors, warnings };
	}

	/* ---------------- recreation runs (see class-recreation.php) ---------------- */
	function runUrl(m, tail) {
		return CFG().runs + (DATA().postId || 0) + (m && m.run ? '/' + m.run : '') + (tail ? '/' + tail : '');
	}
	function runApi(url, body, method) {
		return fetch(url, { method: method || 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DATA().nonce || '' }, body: body ? JSON.stringify(body) : undefined }).then((r) =>
			r
				.json()
				.catch(() => ({}))
				.then((j) => {
					if (!r.ok) throw new Error((j && j.message) || t('Request failed (%s).').replace('%s', String(r.status)));
					return j;
				})
		);
	}
	async function uploadSource(file) {
		const url = CFG().media;
		if (!url || !file) return 0;
		const fd = new W.FormData();
		fd.append('file', file, file.name);
		const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'X-WP-Nonce': DATA().nonce || '' }, body: fd });
		const j = await r.json().catch(() => ({}));
		return r.ok && j && j.id ? j.id : 0;
	}
	function treeOf(m, ops) {
		return { format: 'plan', title: m.plan.title || '', summary: m.plan.summary || '', scope: chat.scope, ops };
	}
	const pendingRuns = new WeakMap(); // message => run being created
	/** Store the plan (and the uploaded design, if any) as a new recreation run. */
	function startRun(m, sourceFile) {
		const p = createRun(m, sourceFile);
		pendingRuns.set(m, p);
		return p;
	}
	async function createRun(m, sourceFile) {
		if (!CFG().runs || !DATA().postId || !m.plan) return;
		try {
			const body = { label: m.plan.title || '', client: 'editor', tree: treeOf(m, m.plan.ops) };
			const id = sourceFile ? await uploadSource(sourceFile).catch(() => 0) : 0;
			if (id) body.source = { attachment_id: id, breakpoint: 'desktop' };
			const res = await runApi(runUrl(null), body);
			m.run = res.run;
			m.treeKey = JSON.stringify(m.plan.ops);
			chat.save();
		} catch (e) {
			m.runError = (e && e.message) || '';
		}
	}
	/** The ops the user kept may differ from the stored plan: store them as a new tree revision. */
	async function syncTree(m, ops) {
		const key = JSON.stringify(ops);
		if (!m.run || m.treeKey === key) return;
		await runApi(runUrl(m, 'tree'), treeOf(m, ops), 'PUT');
		m.treeKey = key;
	}

	/* ================================================================== *
	 * Chat
	 * ================================================================== */
	const ICON = '<svg class="lb-ai-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 2l1.8 4.9L17 8.7l-5.2 1.8L10 15.4 8.2 10.5 3 8.7l5.2-1.8L10 2zm8 9l1 2.6 2.6 1-2.6 1L18 18.2l-1-2.6-2.6-1 2.6-1L18 11zM6 15l.8 2.2L9 18l-2.2.8L6 21l-.8-2.2L3 18l2.2-.8L6 15z"/></svg>';
	const chat = {
		messages: [],
		busy: false,
		error: '',
		attachments: [],
		scope: 'page',
		view: 'chat',
		controller: null,
		key() {
			return 'sidcraftPageBuilderAiChat:' + (DATA().postId || 0);
		},
		load() {
			const raw = store.get(this.key());
			if (!raw) return;
			try {
				const d = JSON.parse(raw);
				if (Array.isArray(d.messages)) this.messages = d.messages.slice(-60);
				// A check cut short by a reload is not running any more.
				this.messages.forEach((m) => {
					if (m && m.checks && m.checks.state === 'running') m.checks = null;
				});
				if (d.scope) this.scope = d.scope;
			} catch (e) {
				/* ignore a damaged saved chat */
			}
		},
		save() {
			const slim = this.messages.slice(-60).map((m) => {
				const c = Object.assign({}, m);
				if (c.plan && c.plan.ops && JSON.stringify(c.plan.ops).length > 200000) c.plan = Object.assign({}, c.plan, { ops: [], tooBig: true });
				return c;
			});
			store.set(this.key(), JSON.stringify({ messages: slim, scope: this.scope }));
		},
	};

	function button() {
		return document.getElementById('lb-ai-chat-button');
	}
	function setButtonState() {
		const b = button();
		if (!b) return;
		const open = LB.drawer.isOpen('ai-chat');
		b.classList.toggle('is-active', open);
		b.classList.toggle('is-busy', chat.busy);
		b.classList.toggle('is-error', !!chat.error && !chat.busy);
		b.setAttribute('aria-expanded', open ? 'true' : 'false');
		b.setAttribute('aria-busy', chat.busy ? 'true' : 'false');
		b.title = chat.error ? t('AI Chat Bot: ') + chat.error : t('AI Chat Bot (Ctrl/Cmd+Shift+A)');
	}
	function toggle() {
		if (LB.drawer.isOpen('ai-chat')) LB.drawer.close();
		else LB.drawer.open('ai-chat');
		setButtonState();
	}

	let body = null;
	function render() {
		if (!body || !LB.drawer.isOpen('ai-chat')) return;
		const cfg = CFG();
		const engine = cfg.engine === 'pro' ? 'Pro' : 'Lite';
		const model = cfg.ready ? esc((cfg.providerLabel || '') + (cfg.model ? ' · ' + cfg.model : '')) : esc(t('Not connected'));
		const sel = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
		const selNode = sel && typeof LB.getNode === 'function' ? LB.getNode(sel) : null;
		if (chat.scope === 'selected' && !selNode) chat.scope = 'page';
		const scopeBtn = (k, label, disabled, title) => `<button type="button" role="radio" aria-checked="${chat.scope === k}" class="${chat.scope === k ? 'is-on' : ''}" data-ai-scope="${k}"${disabled ? ' disabled' : ''}${title ? ' title="' + esc(title) + '"' : ''}>${esc(label)}</button>`;
		const head = `<header class="lb-ai-head"><div class="lb-ai-title">${ICON}<strong>${esc(t('AI Chat Bot'))}</strong><span class="lb-ai-engine" title="${model}">${esc(engine)}</span></div><div class="lb-ai-head-actions"><button type="button" class="lb-ai-icon-btn" data-ai-new title="${esc(t('New chat'))}" aria-label="${esc(t('New chat'))}">＋</button><button type="button" class="lb-ai-icon-btn${chat.view === 'settings' ? ' is-on' : ''}" data-ai-settings title="${esc(t('AI settings'))}" aria-label="${esc(t('AI settings'))}" aria-pressed="${chat.view === 'settings'}">⚙</button><button type="button" class="lb-ai-icon-btn" data-ai-close title="${esc(t('Close (Esc)'))}" aria-label="${esc(t('Close'))}">×</button></div></header>`;
		if (chat.view === 'settings') {
			body.innerHTML = head + settingsHTML(cfg);
			return;
		}
		const scope = `<div class="lb-ai-scope" role="radiogroup" aria-label="${esc(t('Apply changes to'))}">${scopeBtn('selected', selNode ? t('Selected:') + ' ' + nodeLabel(selNode) : t('Selected unit'), !selNode, selNode ? '' : t('Select a unit on the canvas first'))}${scopeBtn('page', t('This page'))}${scopeBtn('site', t('Site-wide styles'), false, t('Design variables and classes shared by every page'))}</div>`;
		const list = chat.messages.length ? chat.messages.map(messageHTML).join('') : welcomeHTML(cfg);
		const typing = chat.busy ? `<div class="lb-ai-msg is-bot lb-ai-typing" aria-live="polite"><span></span><span></span><span></span> ${esc(t('Designing…'))}</div>` : '';
		const err = chat.error && !chat.busy ? `<div class="lb-ai-error" role="alert"><strong>${esc(t('Something went wrong.'))}</strong> ${esc(chat.error)} <span class="lb-ai-error-actions"><button type="button" data-ai-retry>${esc(t('Try again'))}</button>${cfg.settingsUrl ? '<a href="' + esc(cfg.settingsUrl) + '" target="_blank" rel="noopener">' + esc(cfg.settingsLabel || t('Open settings')) + '</a>' : ''}</span></div>` : '';
		const chips = chat.attachments
			.map((a, i) => `<span class="lb-ai-chip">${a.kind === 'image' && a.thumb ? '<img src="' + esc(a.thumb) + '" alt="">' : '<span aria-hidden="true">&lt;/&gt;</span>'}<span class="lb-ai-chip-name">${esc(a.name)}</span>${a.kind === 'html' ? `<select data-ai-html-mode="${i}" aria-label="${esc(t('How to use this HTML'))}"><option value="convert"${a.mode !== 'ai' ? ' selected' : ''}>${esc(t('Convert directly'))}</option><option value="ai"${a.mode === 'ai' ? ' selected' : ''}>${esc(t('Rebuild with AI'))}</option></select>` : ''}<button type="button" data-ai-remove-att="${i}" aria-label="${esc(t('Remove attachment'))}">×</button></span>`)
			.join('');
		const imgBtn = cfg.images
			? `<button type="button" class="lb-ai-attach" data-ai-pick="image" title="${esc(t('Upload a screenshot, wireframe or mockup (PNG, JPG, WebP)'))}">🖼 ${esc(t('Image'))}</button>`
			: cfg.pro && cfg.proSettingsUrl
			? `<a class="lb-ai-attach lb-ai-pro" href="${esc(cfg.proSettingsUrl)}" target="_blank" rel="noopener" title="${esc(cfg.proHint || t('Choose a provider that accepts images on AI Connectivity'))}">🖼 ${esc(t('Image to layout'))} <em>${esc(t('Set up'))}</em></a>`
			: `<a class="lb-ai-attach lb-ai-pro" href="${esc(cfg.proUrl || '#')}" target="_blank" rel="noopener" title="${esc(t('Turn screenshots and mockups into layouts with Sidcraft Builder Pro'))}">🖼 ${esc(t('Image to layout'))} <em>Pro</em></a>`;
		const composer = `<form class="lb-ai-composer" data-ai-form>${chips ? '<div class="lb-ai-chips">' + chips + '</div>' : ''}<label class="screen-reader-text" for="lb-ai-input">${esc(t('Message'))}</label><textarea id="lb-ai-input" rows="3" placeholder="${esc(cfg.ready ? t('Describe a change, or attach a design…') : t('Attach HTML to convert, or connect AI to chat…'))}"${chat.busy ? ' disabled' : ''}></textarea><div class="lb-ai-composer-row"><button type="button" class="lb-ai-attach" data-ai-pick="html" title="${esc(t('Upload an HTML page, snippet or CSS file'))}">&lt;/&gt; ${esc(t('HTML'))}</button>${imgBtn}<button type="button" class="lb-ai-attach${cfg.siteImport ? '' : ' lb-ai-pro'}" data-ai-site title="${esc(t('Rebuild the pages of a website from its address'))}">🌐 ${esc(t('Website'))}${cfg.siteImport ? '' : ' <em>Pro</em>'}</button><span class="lb-ai-spacer"></span>${chat.busy ? `<button type="button" class="lb-ai-send is-stop" data-ai-stop>${esc(t('Stop'))}</button>` : `<button type="submit" class="lb-ai-send">${esc(t('Send'))}</button>`}</div><input type="file" hidden data-ai-file="html" accept=".html,.htm,.css,.txt,text/html,text/css"><input type="file" hidden data-ai-file="image" accept="image/png,image/jpeg,image/webp" multiple></form>`;
		const banner = preview ? `<div class="lb-ai-preview-bar" role="status"><span>${esc(t('Previewing on the canvas'))}</span><button type="button" data-ai-preview-apply class="is-primary">${esc(t('Apply'))}</button><button type="button" data-ai-preview-discard>${esc(t('Discard'))}</button></div>` : '';
		const keep = body.querySelector('#lb-ai-input');
		const draft = keep ? keep.value : '';
		body.innerHTML = head + scope + banner + `<div class="lb-ai-log" aria-live="polite">${list}${typing}${err}</div>` + (chat.site ? siteHTML(cfg) : '') + composer;
		const input = body.querySelector('#lb-ai-input');
		if (input && draft) input.value = draft;
		const log = body.querySelector('.lb-ai-log');
		if (log) log.scrollTop = log.scrollHeight;
	}
	function welcomeHTML(cfg) {
		const ideas = [t('Build a dark-mode SaaS pricing section with 3 tiers and an annual billing toggle.'), t('Change all secondary buttons to use our primary brand color #0052FF across the page.'), t('Convert this 3-column feature grid into 2 columns with hover cards.'), t('Translate this hero section to Spanish and make the copy more persuasive.')];
		return `<div class="lb-ai-welcome"><p><strong>${esc(t('Design by chatting.'))}</strong> ${esc(t('Describe what you want, attach an HTML page, or upload a design. You preview every change before it touches the page, and each one can be undone.'))}</p>${cfg.ready ? '' : `<p class="lb-ai-note">${esc(cfg.notice || t('HTML import works without AI. To chat, connect an AI provider.'))}${cfg.settingsUrl ? ' <a href="' + esc(cfg.settingsUrl) + '" target="_blank" rel="noopener">' + esc(cfg.settingsLabel || t('Open settings')) + '</a>' : ''}</p>`}<div class="lb-ai-ideas">${ideas.map((i) => `<button type="button" data-ai-idea="${esc(i)}">${esc(i)}</button>`).join('')}</div><p class="lb-ai-privacy">${esc(cfg.privacy || '')}</p></div>`;
	}
	function describeOp(op) {
		const k = String(op.op || '');
		const count = (nodes) => {
			let n = 0;
			const w = (l) => (l || []).forEach((x) => (n++, w(x.children)));
			w(nodes);
			return n;
		};
		const typeOf = (id) => {
			const n = id && typeof LB.getNode === 'function' ? LB.getNode(String(id)) : null;
			return n ? nodeLabel(n) : String(id || '').indexOf('ref:') === 0 ? t('new unit') : t('unit');
		};
		switch (k) {
			case 'insert': {
				const first = (op.nodes || [])[0];
				return '+ ' + t('Add') + ' ' + (first ? meta(first.type).title || first.type : t('units')) + (count(op.nodes) > 1 ? ' (' + count(op.nodes) + ' ' + t('elements') + ')' : '');
			}
			case 'update':
				return '~ ' + t('Edit') + ' ' + typeOf(op.id) + ': ' + Object.keys(op.settings || {}).slice(0, 4).join(', ');
			case 'move':
				return '↕ ' + t('Move') + ' ' + typeOf(op.id);
			case 'remove':
				return '− ' + t('Delete') + ' ' + typeOf(op.id);
			case 'class':
				return '◆ ' + t('Class') + ' .xe-class-' + slug(op.name);
			case 'var':
				return '◆ ' + t('Variable') + ' --xe-var-' + slug(op.name) + (op.value ? ' = ' + String(op.value).slice(0, 30) : '');
			case 'add_class':
				return '+ ' + t('Class on') + ' ' + typeOf(op.id) + ': ' + toClassList(op.classes).join(', ');
			case 'remove_class':
				return '− ' + t('Class from') + ' ' + typeOf(op.id) + ': ' + toClassList(op.classes).join(', ');
		}
		return k;
	}
	function messageHTML(m, idx) {
		if (m.role === 'user') {
			const atts = (m.attachments || []).map((a) => `<span class="lb-ai-chip is-static">${a.thumb ? '<img src="' + esc(a.thumb) + '" alt="">' : ''}${esc(a.name)}</span>`).join('');
			return `<div class="lb-ai-msg is-user">${atts ? '<div class="lb-ai-chips">' + atts + '</div>' : ''}${m.content ? '<p>' + esc(m.content).replace(/\n/g, '<br>') + '</p>' : ''}</div>`;
		}
		let html = '';
		if (m.content) html += `<div class="lb-ai-msg is-bot">${formatText(m.content)}${m.proLink && CFG().proUrl ? ` <a href="${esc(CFG().proUrl)}" target="_blank" rel="noopener">${esc(t('Get Sidcraft Builder Pro'))}</a>` : ''}</div>`;
		if (m.plan) {
			const p = m.plan;
			const ops = p.ops || [];
			const status = m.status || 'new';
			const shown = ops.slice(0, 40);
			const checks = shown.map((op, i) => `<li><label><input type="checkbox" data-ai-op="${idx}:${i}"${m.skip && m.skip.indexOf(i) !== -1 ? '' : ' checked'}${status !== 'new' ? ' disabled' : ''}> ${esc(describeOp(op))}</label></li>`).join('') + (ops.length > shown.length ? `<li class="lb-ai-more">${esc(t('…and %s more').replace('%s', String(ops.length - shown.length)))}</li>` : '');
			const warn = (m.warnings || []).length ? `<ul class="lb-ai-warn">${m.warnings.map((w) => '<li>' + esc(w) + '</li>').join('')}</ul>` : '';
			let actions = '';
			if (p.tooBig) actions = `<p class="lb-ai-note">${esc(t('This plan was too large to keep after reloading. Ask again to recreate it.'))}</p>`;
			else if (status === 'new') actions = `<button type="button" data-ai-preview="${idx}">${esc(t('Preview'))}</button><button type="button" class="is-primary" data-ai-apply="${idx}">${esc(t('Apply'))}</button><button type="button" data-ai-discard="${idx}">${esc(t('Discard'))}</button>`;
			else if (status === 'applied') actions = `<span class="lb-ai-status is-ok">✓ ${esc(t('Applied'))}</span><button type="button" data-ai-revert="${idx}">${esc(t('Revert'))}</button>`;
			else if (status === 'reverted') actions = `<span class="lb-ai-status">${esc(t('Reverted'))}</span>`;
			else if (status === 'discarded') actions = `<span class="lb-ai-status">${esc(t('Discarded'))}</span>`;
			html += `<div class="lb-ai-plan" data-status="${esc(status)}"><div class="lb-ai-plan-head"><strong>${esc(p.title || t('Proposed change'))}</strong><span>${esc(t('%s changes').replace('%s', String(ops.length)))}</span></div>${p.summary ? '<p>' + esc(p.summary) + '</p>' : ''}<details${status === 'new' && ops.length <= 12 ? ' open' : ''}><summary>${esc(t('Review changes'))}</summary><ul class="lb-ai-ops">${checks}</ul></details>${warn}${status === 'new' ? checksHTML(m, idx) : ''}<div class="lb-ai-plan-actions">${actions}</div></div>`;
		}
		return html;
	}
	function formatText(s) {
		return esc(s)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.split(/\n{2,}/)
			.map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
			.join('');
	}
	function settingsHTML(cfg) {
		const link = cfg.settingsUrl ? `<p><a class="button" href="${esc(cfg.settingsUrl)}" target="_blank" rel="noopener">${esc(cfg.settingsLabel || t('Open settings'))}</a></p>` : '';
		const hint = cfg.proHint ? `<p class="lb-ai-note">${esc(cfg.proHint)}${cfg.proSettingsUrl ? ' <a href="' + esc(cfg.proSettingsUrl) + '" target="_blank" rel="noopener">' + esc(t('Open AI Connectivity')) + '</a>' : ''}</p>` : '';
		return `<div class="lb-ai-settings"><h3>${esc(t('AI connection'))}</h3><p>${esc(t('Managed in %s.').replace('%s', cfg.managedBy || ''))}</p><p><strong>${esc(cfg.providerLabel || t('Not connected'))}</strong>${cfg.model ? ' · ' + esc(cfg.model) : ''}</p>${cfg.notice ? '<p class="description">' + esc(cfg.notice) + '</p>' : ''}${link}${hint}<p class="lb-ai-privacy">${esc(cfg.privacy || '')}</p><p><button type="button" data-ai-back>${esc(t('Back to chat'))}</button></p></div>`;
	}


	/* ---------------- networking ---------------- */
	function api(url, body, method) {
		const ctrl = W.AbortController ? new AbortController() : null;
		chat.controller = ctrl;
		return fetch(url, {
			method: method || 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': DATA().nonce || '' },
			body: body ? JSON.stringify(body) : undefined,
			signal: ctrl ? ctrl.signal : undefined,
		}).then((r) =>
			r
				.json()
				.catch(() => ({}))
				.then((j) => {
					if (!r.ok) throw new Error((j && j.message) || t('Request failed (%s).').replace('%s', String(r.status)));
					return j;
				})
		);
	}
	function transcript() {
		return chat.messages
			.filter((m) => m.content || m.plan || m.sent)
			.slice(-24)
			.map((m) => {
				if (m.role === 'user') return { role: 'user', content: m.sent || m.content || '' };
				let c = m.content || '';
				if (m.plan) c += (c ? '\n\n' : '') + '[' + t('Proposed plan') + ': ' + (m.plan.title || '') + ' (' + (m.status || 'new') + ')]';
				return { role: 'assistant', content: c };
			})
			.filter((m) => m.content);
	}

	async function send(text) {
		const cfg = CFG();
		text = String(text || '').trim();
		const atts = chat.attachments.slice();
		if (!text && !atts.length) return;
		chat.attachments = [];
		chat.error = '';
		const htmlConvert = atts.filter((a) => a.kind === 'html' && a.mode !== 'ai');
		const htmlAi = atts.filter((a) => a.kind === 'html' && a.mode === 'ai');
		const images = atts.filter((a) => a.kind === 'image');
		chat.messages.push({ role: 'user', content: text, attachments: atts.map((a) => ({ name: a.name, thumb: a.thumb || '' })) });
		// Direct HTML conversion runs in the browser and needs no AI.
		for (const a of htmlConvert) {
			const where = insertionPoint();
			const plan = await LB.htmlToPlan(a.html, a.css, { parent: where.parent, index: where.index });
			chat.messages.push({ role: 'assistant', content: plan.ops.length ? t('Here is your HTML as native Sidcraft layout. Preview it on the canvas, then apply.') : t('No content was found in that HTML.'), plan: plan.ops.length ? plan : null });
		}
		if (!text && !htmlAi.length && !images.length) {
			chat.save();
			render();
			return;
		}
		if (!cfg.ready) {
			chat.error = cfg.notice || t('Connect an AI provider to chat.');
			chat.save();
			render();
			setButtonState();
			return;
		}
		let sent = text;
		htmlAi.forEach((a) => {
			sent += '\n\n' + t('Rebuild this HTML as a native layout:') + '\n```html\n' + String(a.html || '').slice(0, 45000) + '\n```' + (a.css ? '\n```css\n' + String(a.css).slice(0, 15000) + '\n```' : '');
		});
		if (images.length) sent = (sent || t('Recreate this design as a native layout.')) + '\n\n[' + t('Attached images:') + ' ' + images.map((i) => i.name + ' (' + i.width + '×' + i.height + 'px' + (i.tiles.length > 1 ? ', ' + t('split top to bottom into %s parts').replace('%s', String(i.tiles.length)) : '') + ')').join(', ') + ']';
		chat.messages[chat.messages.length - 1].sent = sent;
		chat.busy = true;
		render();
		setButtonState();
		const imgs = [];
		images.forEach((i) => i.tiles.forEach((tile) => imgs.push({ mime: tile.mime, data: tile.data })));
		try {
			const res = await api(cfg.rest, {
				post_id: DATA().postId || 0,
				messages: transcript(),
				context: JSON.stringify(safeOutline(chat.scope, text)),
				images: imgs.slice(0, cfg.maxImages || 0),
			});
			const msg = { role: 'assistant', content: String(res.reply || '').replace(/<[^>]+>/g, ''), plan: res.plan && Array.isArray(res.plan.ops) && res.plan.ops.length ? res.plan : null };
			if (!msg.content && !msg.plan) msg.content = t('I could not turn that into a change. Try describing it differently.');
			chat.messages.push(msg);
			if (msg.plan) startRun(msg, images.length ? images[0].file : null).then(render);
		} catch (e) {
			if (e && e.name === 'AbortError') chat.messages.push({ role: 'assistant', content: t('Stopped.') });
			else chat.error = (e && e.message) || t('The request failed.');
		}
		chat.busy = false;
		chat.controller = null;
		chat.save();
		render();
		setButtonState();
	}
	/* ================================================================== *
	 * Website import (Sidcraft Builder Pro reads the site; see siteImport in the config)
	 * ================================================================== */
	function openSite() {
		const cfg = CFG();
		if (!cfg.siteImport || !cfg.siteImport.scan) {
			chat.messages.push({ role: 'assistant', content: t('This feature is available to Sidcraft Builder PRO.'), proLink: true });
			chat.save();
			return void render();
		}
		if (!chat.site) chat.site = { step: 'url', url: '', permit: false, skipChrome: true, copyMedia: !!cfg.siteImport.media, mode: 'convert', busy: false, error: '', pages: [], selected: {}, log: [], results: [] };
		render();
		const input = body && body.querySelector('#lb-ai-site-url');
		if (input) input.focus();
	}
	function siteHTML(cfg) {
		const s = chat.site;
		const max = (cfg.siteImport && cfg.siteImport.maxPages) || 20;
		const close = `<button type="button" class="lb-ai-icon-btn" data-ai-site-close aria-label="${esc(t('Close'))}"${s.busy ? ' disabled' : ''}>×</button>`;
		const err = (s.error ? `<p class="lb-ai-site-error" role="alert">${esc(s.error)}</p>` : '') + (s.busy && s.status ? `<p class="lb-ai-site-status" role="status">${esc(s.status)}</p>` : '');
		let inner = '';
		if (s.step === 'url') {
			inner = `<p>${esc(t('Enter a website address. Its pages are read and rebuilt as Sidcraft pages with the same design.'))}</p>
<label class="lb-ai-site-field"><span>${esc(t('Website address'))}</span><input id="lb-ai-site-url" type="url" placeholder="https://example.com" value="${esc(s.url)}"${s.busy ? ' disabled' : ''}></label>
<label class="lb-ai-site-check"><input type="checkbox" data-ai-site-opt="permit"${s.permit ? ' checked' : ''}> ${esc(t('I own this website or have permission to copy its design and content.'))}</label>
<label class="lb-ai-site-check"><input type="checkbox" data-ai-site-opt="skipChrome"${s.skipChrome ? ' checked' : ''}> ${esc(t('Leave out the site header and footer (your theme shows its own)'))}</label>
${cfg.siteImport.media ? `<label class="lb-ai-site-check"><input type="checkbox" data-ai-site-opt="copyMedia"${s.copyMedia ? ' checked' : ''}> ${esc(t('Copy media to my Media Library'))}<small>${esc(cfg.siteImport.canFonts ? t('Images, CSS backgrounds, SVG files and videos are downloaded to this site and the blocks use your copies; files already in your Media Library are used, not copied again. Web fonts (woff/woff2) are added to Fonts.') : t('Images, CSS backgrounds, SVG files and videos are downloaded to this site and the blocks use your copies; files already in your Media Library are used, not copied again. Web fonts are copied only when an administrator imports.'))}</small></label>` : ''}
<label class="lb-ai-site-field"><span>${esc(t('How to rebuild'))}</span><select data-ai-site-opt="mode"><option value="convert"${s.mode !== 'ai' ? ' selected' : ''}>${esc(t('Same design, converted directly'))}</option><option value="ai"${s.mode === 'ai' ? ' selected' : ''}${cfg.ready ? '' : ' disabled'}>${esc(t('Rebuilt by the AI (cleaner structure)'))}</option></select></label>
<div class="lb-ai-site-actions"><button type="button" class="is-primary" data-ai-site-scan${s.busy ? ' disabled' : ''}>${esc(s.busy ? t('Reading the website…') : t('Read website'))}</button></div>`;
		} else if (s.step === 'pages') {
			const rows = s.pages.map((p, i) => `<li><label><input type="checkbox" data-ai-site-page="${i}"${s.selected[i] ? ' checked' : ''}${s.busy ? ' disabled' : ''}> <strong>${esc(p.label || p.url)}</strong> <small>${esc(p.url)}</small></label></li>`).join('');
			const count = Object.keys(s.selected).filter((k) => s.selected[k]).length;
			inner = `<p>${esc(t('%s pages found. Choose the pages to rebuild (up to %d).').replace('%s', String(s.pages.length)).replace('%d', String(max)))} <button type="button" class="lb-ai-link" data-ai-site-all="1">${esc(t('Select all'))}</button> · <button type="button" class="lb-ai-link" data-ai-site-all="0">${esc(t('None'))}</button></p>
<ul class="lb-ai-site-pages">${rows}</ul>
<div class="lb-ai-site-actions"><button type="button" data-ai-site-back${s.busy ? ' disabled' : ''}>${esc(t('Back'))}</button><button type="button" data-ai-site-here${s.busy || count !== 1 ? ' disabled' : ''} title="${esc(t('Select one page to preview it on this page'))}">${esc(t('Build here'))}</button><button type="button" class="is-primary" data-ai-site-create${s.busy || !count ? ' disabled' : ''}>${esc(t('Create %s draft pages').replace('%s', String(count)))}</button></div>`;
		} else {
			const log = s.log.map((l) => `<li class="is-${esc(l.state)}">${esc(l.text)}${(l.details || []).length ? '<ul>' + l.details.map((d) => '<li>' + esc(d) + '</li>').join('') + '</ul>' : ''}${siteScriptsHTML(l.scripts)}</li>`).join('');
			const anyScripts = s.log.some((l) => (l.scripts || []).length);
			const done = s.results.map((r) => `<li><a href="${esc(r.edit)}" target="_blank" rel="noopener">${esc(r.title)}</a> <small>${esc(t('draft'))}</small></li>`).join('');
			inner = `<ul class="lb-ai-site-log">${log}</ul>${done ? '<p><strong>' + esc(t('Created pages (open in the builder):')) + '</strong></p><ul class="lb-ai-site-pages is-done">' + done + '</ul>' : ''}${!s.busy && anyScripts ? siteScriptsNote(cfg) : ''}${s.busy ? '' : `<div class="lb-ai-site-actions">${anyScripts ? `<button type="button" data-ai-site-scripts>${esc(t('Save script list'))}</button>` : ''}<button type="button" data-ai-site-back>${esc(t('Import more'))}</button><button type="button" class="is-primary" data-ai-site-close>${esc(t('Done'))}</button></div>`}`;
		}
		return `<section class="lb-ai-site" aria-label="${esc(t('Rebuild a website'))}"><header><strong>🌐 ${esc(t('Rebuild a website'))}</strong>${close}</header>${err}${inner}</section>`;
	}
	/*
	 * Scripts of the source pages are listed, never copied or run: the person
	 * importing decides which ones they trust and adds those themselves.
	 */
	const SCRIPT_KINDS = {
		tracker: 'analytics or ads',
		wordpress: 'WordPress core (this site has its own)',
		site: 'from the website',
		external: 'from another server',
		inline: 'inline code',
	};
	function scriptFlags(sc) {
		return [t(SCRIPT_KINDS[sc.kind] || sc.kind || '')]
			.concat(sc.type === 'module' ? ['module'] : [], sc.async ? ['async'] : [], sc.defer ? ['defer'] : [], sc.nomodule ? ['nomodule'] : [], sc.delayed ? [t('delayed by an optimization plugin')] : [])
			.filter(Boolean)
			.join(', ');
	}
	function scriptSize(n) {
		return n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
	}
	function siteScriptsHTML(list) {
		if (!list || !list.length) return '';
		const rows = list
			.map((sc) => {
				if (sc.src) return `<li><a href="${esc(/^https?:/i.test(sc.src) ? sc.src : '#')}" target="_blank" rel="noopener noreferrer">${esc(sc.src.replace(/^https?:\/\//, ''))}</a> <small>${esc(scriptFlags(sc))}</small></li>`;
				const cut = sc.size > (sc.code || '').length ? '\n/* … ' + t('shortened') + ' */' : '';
				return `<li>${esc(t('Inline script'))} (${esc(scriptSize(sc.size || 0))}) <small>${esc(scriptFlags(sc))}</small><details><summary>${esc(t('Show code'))}</summary><pre>${esc((sc.code || '') + cut)}</pre></details></li>`;
			})
			.join('');
		return `<details class="lb-ai-site-scripts"><summary>${esc(t('%s scripts on the original page (not copied)').replace('%s', String(list.length)))}</summary><ul>${rows}</ul></details>`;
	}
	function siteScriptsNote(cfg) {
		const where = cfg.siteImport.codeScreen ? `<a href="${esc(cfg.siteImport.codeScreen)}" target="_blank" rel="noopener">${esc(t('Custom Code'))}</a>` : esc(t('Custom Code (an administrator can add them)'));
		return `<p class="lb-ai-site-note">${esc(t('Scripts from the original site were not copied: they run with your site’s trust and usually expect the original markup. Review the list and add only the ones you trust under'))} ${where}${esc(t(', with a display rule for the pages that need them.'))}</p>`;
	}
	/** Plain-text list of every imported page's scripts, saved as a file. */
	function saveSiteScripts() {
		const s = chat.site;
		if (!s) return;
		const out = [t('Scripts on the original pages (not copied). Add only the ones you trust.'), ''];
		s.log.forEach((l) => {
			if (!(l.scripts || []).length) return;
			out.push('== ' + (l.page || l.text) + (l.url ? ' (' + l.url + ')' : '') + ' ==');
			l.scripts.forEach((sc) => {
				if (sc.src) out.push('<script src="' + sc.src + '"' + (sc.type === 'module' ? ' type="module"' : '') + (sc.async ? ' async' : '') + (sc.defer ? ' defer' : '') + '></script>   [' + scriptFlags(sc) + ']');
				else out.push('<script' + (sc.type === 'module' ? ' type="module"' : '') + '>   [' + scriptFlags(sc) + ', ' + scriptSize(sc.size || 0) + ']\n' + (sc.code || '') + (sc.size > (sc.code || '').length ? '\n/* … ' + t('shortened') + ' */' : '') + '\n</script>');
			});
			out.push('');
		});
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/plain' }));
		a.download = 'site-scripts-' + siteClassPrefix((s.pages[0] && s.pages[0].url) || s.url) + '.txt';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
	}
	function readSiteForm() {
		const s = chat.site;
		if (!s || !body) return;
		const url = body.querySelector('#lb-ai-site-url');
		if (url) s.url = url.value.trim();
		body.querySelectorAll('[data-ai-site-opt]').forEach((el) => {
			s[el.dataset.aiSiteOpt] = el.type === 'checkbox' ? el.checked : el.value;
		});
		body.querySelectorAll('[data-ai-site-page]').forEach((el) => {
			s.selected[+el.dataset.aiSitePage] = el.checked;
		});
	}
	function siteSelectAll(on) {
		readSiteForm();
		const max = (CFG().siteImport && CFG().siteImport.maxPages) || 20;
		chat.site.pages.forEach((p, i) => (chat.site.selected[i] = on && i < max));
		render();
	}
	async function siteScan() {
		readSiteForm();
		const s = chat.site;
		s.error = '';
		if (!s.url) return void ((s.error = t('Enter the website address.')), render());
		if (!s.permit) return void ((s.error = t('Confirm that you own this website or have permission to copy it.')), render());
		s.busy = true;
		render();
		try {
			const res = await api(CFG().siteImport.scan, { url: s.url });
			s.pages = Array.isArray(res.pages) ? res.pages : [];
			s.title = res.title || '';
			s.selected = {};
			s.pages.forEach((p, i) => (s.selected[i] = i < 10));
			s.step = 'pages';
			if (!s.pages.length) s.error = t('No pages were found at that address.');
		} catch (e) {
			s.error = (e && e.message) || t('The website could not be read.');
		}
		s.busy = false;
		render();
	}
	/** "northwind" for https://www.northwind.example/…, so imported classes do not replace the site's own. */
	function siteClassPrefix(url) {
		let host = '';
		try {
			host = new URL(url).hostname.replace(/^www\./, '');
		} catch (e) {
			host = '';
		}
		const first = /^[\d.]+$/.test(host) || !host ? 'site' : host.split('.')[0];
		return slug(first).slice(0, 20) || 'site';
	}
	/** Page title without the site name the source adds to every page ("About | Northwind"). */
	function pageTitle(title, page) {
		const s = chat.site;
		const site = String(s.title || '').split(/\s+[|\-–—·:]\s+/).pop().trim();
		let out = String(title || '').trim();
		const parts = out.split(/\s+[|\-–—·:]\s+/);
		if (parts.length > 1 && site && parts[parts.length - 1].trim() === site) out = parts.slice(0, -1).join(' | ').trim();
		return out || page.label || page.url;
	}
	function selectedSitePages() {
		const max = (CFG().siteImport && CFG().siteImport.maxPages) || 20;
		return chat.site.pages.filter((p, i) => chat.site.selected[i]).slice(0, max);
	}
	/** Remove the page's own header and footer, keeping those inside the content. */
	function withoutSiteChrome(html) {
		const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
		doc.querySelectorAll('header, footer, [role="banner"], [role="contentinfo"]').forEach((el) => {
			if (!el.parentElement || el.parentElement.closest('main, article, [role="main"]')) return;
			el.remove();
		});
		return doc.body.innerHTML;
	}
	/** Read one page and turn it into a plan. */
	async function sitePagePlan(page, where) {
		const s = chat.site;
		const data = await api(CFG().siteImport.page, { url: page.url });
		const html = s.skipChrome ? withoutSiteChrome(data.html) : String(data.html || '');
		const title = data.title || page.label || '';
		if (s.mode === 'ai' && CFG().ready) {
			try {
				const o = safeOutline('page', title);
				o.tree = [];
				o.selected = null;
				const ask = t('Rebuild this web page as a native layout with the same design:') + ' ' + page.url + '\n```html\n' + html.slice(0, 45000) + '\n```\n```css\n' + String(data.css || '').slice(0, 15000) + '\n```';
				const res = await api(CFG().rest, { post_id: DATA().postId || 0, messages: [{ role: 'user', content: ask }], context: JSON.stringify(o), images: [] });
				if (res && res.plan && Array.isArray(res.plan.ops) && res.plan.ops.length) return { plan: res.plan, title, fonts: LB.cssFontFaces(data.css || ''), scripts: data.scripts || [], url: data.url || page.url, source: data.source || null };
			} catch (e) {
				/* fall back to the direct conversion below */
			}
		}
		const plan = await LB.htmlToPlan(html, data.css || '', Object.assign({ baseUrl: data.url || page.url, classPrefix: siteClassPrefix(data.url || page.url) }, where || {}));
		return { plan, title, fonts: plan.fonts || [], scripts: data.scripts || [], url: data.url || page.url, source: data.source || null };
	}
	/** One line on where the page came from: "Built with Elementor (WordPress), on this site: …". */
	function siteSourceNote(source, copying) {
		if (!source || !source.builder) return '';
		const built = t('Built with %s').replace('%s', t(source.builder)) + (source.platform && source.platform !== source.builder ? ' (' + source.platform + ')' : '') + '.';
		if (!source.sameSite) return built;
		return built + ' ' + (copying ? t('This page is on your own site: images and videos already in your Media Library (or elsewhere on this site) are used, not copied again.') : t('This page is on your own site: images and videos already in your Media Library are used.'));
	}
	/** Same-site pages use the site's own media even when copying is off (nothing is downloaded then). */
	function siteMediaMode(s, out) {
		if (!CFG().siteImport.media || !out.plan.ops.length) return '';
		if (s.copyMedia) return 'copy';
		return out.source && out.source.sameSite ? 'local' : '';
	}
	/*
	 * "Copy media to my Media Library": the files a plan points at (image
	 * blocks, CSS backgrounds, images in HTML blocks, hosted videos and their
	 * posters) are copied by Sidcraft Builder Pro, then the plan is pointed at
	 * the copies. Fonts the page uses go to Pro's custom fonts.
	 */
	function planAssets(ops) {
		const out = [];
		const seen = {};
		const add = (u, kind) => {
			u = String(u || '')
				.trim()
				.replace(/&amp;/g, '&');
			if (!/^https?:\/\//i.test(u) || seen[u]) return;
			const ext = urlExt(u);
			if (/^(woff2?|ttf|otf|eot|css|js|json|html?|php|xml|txt)$/.test(ext)) return;
			seen[u] = 1;
			out.push({ url: u, kind: kind === 'video' || VIDEO_EXT.test('.' + ext) ? 'video' : 'image' });
		};
		const scan = (v) => {
			if (typeof v === 'string') {
				v.replace(/url\(\s*(['"]?)(https?:\/\/[^'")\s]+)\1\s*\)/gi, (m, q, u) => (add(u, 'image'), m));
				v.replace(/<(?:img|source|video)\b[^>]*?\s(?:src|poster)=(['"])(https?:\/\/[^'"]+)\1/gi, (m, q, u) => (add(u, 'image'), m));
			} else if (Array.isArray(v)) v.forEach(scan);
			else if (v && typeof v === 'object') Object.keys(v).forEach((k) => scan(v[k]));
		};
		const node = (n) => {
			if (!n || typeof n !== 'object') return;
			const st = n.settings || {};
			if (n.type === 'xe_image' && st.source !== 'media' && st.source !== 'featured') add(st.src, 'image');
			if (n.type === 'video') {
				if (videoSource(st.url) === 'hosted') add(st.url, 'video');
				add(st.poster_url, 'image');
			}
			scan(st);
			(n.children || []).forEach(node);
		};
		(ops || []).forEach((op) => {
			if (Array.isArray(op.nodes)) op.nodes.forEach(node);
			if (op.node) node(op.node);
			scan(Object.assign({}, op, { nodes: null, node: null }));
		});
		return out;
	}
	/** Point a plan at the copies: map is { original url: { id, url } }. */
	function rewritePlanMedia(ops, map) {
		const swap = (str) => {
			const key = str.replace(/&amp;/g, '&');
			if (map[key]) return map[key].url;
			return str
				.replace(/(url\(\s*['"]?)(https?:\/\/[^'")\s]+)/gi, (m, a, u) => (map[u] ? a + map[u].url : m))
				.replace(/(\s(?:src|poster)=['"])(https?:\/\/[^'"]+)/gi, (m, a, u) => (map[u.replace(/&amp;/g, '&')] ? a + map[u.replace(/&amp;/g, '&')].url : m));
		};
		const walk = (v) => {
			if (typeof v === 'string') return swap(v);
			if (Array.isArray(v)) return v.map(walk);
			if (v && typeof v === 'object') {
				const o = {};
				Object.keys(v).forEach((k) => (o[k] = walk(v[k])));
				// Image blocks use the Media Library item itself (with its sizes), not just its address.
				if (o.type === 'xe_image' && o.settings && v.settings && map[v.settings.src] && map[v.settings.src].id && !/svg/.test(map[v.settings.src].mime || '')) {
					o.settings.source = 'media';
					o.settings.image_id = map[v.settings.src].id;
				}
				return o;
			}
			return v;
		};
		return walk(ops);
	}
	/**
	 * The font faces a plan uses (its CSS may declare many more). Fonts stores one file per
	 * family, weight and style, so of the subsets a site declares (cyrillic, greek, latin…)
	 * the one with basic Latin letters is kept.
	 */
	function usedFonts(fonts, ops) {
		const text = JSON.stringify(ops || []).toLowerCase();
		const pick = {};
		(fonts || []).forEach((f) => {
			if (text.indexOf(f.family.toLowerCase()) === -1) return;
			const key = f.family.toLowerCase() + '|' + f.weight + '|' + f.style;
			if (!pick[key] || (f.latin && !pick[key].latin)) pick[key] = f;
		});
		return Object.keys(pick).map((k) => pick[k]);
	}
	/**
	 * Copy a plan's media (and fonts) and return { ops, details } with the
	 * plan pointed at the copies and one line per problem.
	 */
	async function copySiteMedia(out, postId, progress, localOnly) {
		const cfg = CFG().siteImport;
		const assets = planAssets(out.plan.ops);
		const fonts = localOnly ? [] : usedFonts(out.fonts, out.plan.ops);
		const map = {};
		const details = [];
		let copied = 0;
		let reused = 0;
		let library = 0;
		let onSite = 0;
		let failed = 0;
		const size = Math.max(1, cfg.mediaBatch || 12);
		const images = assets.filter((a) => a.kind !== 'video');
		const groups = [];
		for (let i = 0; i < images.length; i += size) groups.push(images.slice(i, i + size));
		// Videos one at a time: they are large.
		assets.filter((a) => a.kind === 'video').forEach((a) => groups.push([a]));
		let done = 0;
		for (const group of groups) {
			if (progress) progress(t('Copying media (%1$s of %2$s)…').replace('%1$s', String(done + 1)).replace('%2$s', String(assets.length)));
			try {
				const res = await api(cfg.media, { items: group, post_id: postId || 0, local_only: !!localOnly });
				group.forEach((a) => {
					const r = res && res.media ? res.media[a.url] : null;
					if (r && r.url) {
						map[a.url] = r;
						if (r.library) library++;
						else if (r.reused && !r.id) onSite++;
						else if (r.reused) reused++;
						else copied++;
					} else if (localOnly) {
						/* Not on this site: left linked, as asked. */
					} else {
						failed++;
						details.push(a.url.split(/[?#]/)[0].split('/').pop() + ': ' + ((r && r.error) || t('not copied')));
					}
				});
			} catch (e) {
				failed += group.length;
				group.forEach((a) => details.push(a.url.split(/[?#]/)[0].split('/').pop() + ': ' + ((e && e.message) || t('not copied'))));
			}
			done += group.length;
		}
		let fontsAdded = 0;
		if (fonts.length && !cfg.canFonts) details.push(t('The page uses web fonts (%s); only an administrator can copy them to Fonts.').replace('%s', fonts.map((f) => f.family).filter((f, i, a) => a.indexOf(f) === i).join(', ')));
		else if (fonts.length) {
			if (progress) progress(t('Copying fonts…'));
			try {
				const res = await api(cfg.media, { items: [], fonts: fonts.slice(0, 12), post_id: postId || 0 });
				(res && res.fonts ? res.fonts : []).forEach((f) => {
					if (f.id) fontsAdded++;
					else if (f.code !== 'sidcraft_site_media_font_google') details.push(f.family + ': ' + f.error);
				});
			} catch (e) {
				details.push(t('Fonts were not copied:') + ' ' + ((e && e.message) || ''));
			}
		}
		const parts = [];
		if (copied) parts.push(t('%s files copied').replace('%s', String(copied)));
		if (library) parts.push(t('%s used from your Media Library').replace('%s', String(library)));
		if (onSite) parts.push(t('%s already on this site').replace('%s', String(onSite)));
		if (reused) parts.push(t('%s copied before, reused').replace('%s', String(reused)));
		if (failed) parts.push(t('%s not copied (still linked to the website)').replace('%s', String(failed)));
		if (fontsAdded) parts.push(t('%s fonts added').replace('%s', String(fontsAdded)));
		return { ops: rewritePlanMedia(out.plan.ops, map), summary: parts.join(', '), details };
	}
	LB.planMedia = (ops) => planAssets(ops);
	LB.copyPlanMedia = function copyPlanMedia(plan, opts) {
		opts = opts || {};
		if (!CFG().siteImport || !CFG().siteImport.media) return Promise.reject(new Error(t('This feature is available to Sidcraft Builder PRO.')));
		return copySiteMedia({ plan, fonts: opts.fonts || plan.fonts || [] }, opts.postId || 0, opts.progress, !!opts.localOnly);
	};
	async function siteBuildHere() {
		readSiteForm();
		const s = chat.site;
		const page = selectedSitePages()[0];
		if (!page) return;
		s.busy = true;
		s.error = '';
		render();
		try {
			const out = await sitePagePlan(page, insertionPoint());
			let report = '';
			const mode = siteMediaMode(s, out);
			if (mode) {
				const copy = await copySiteMedia(out, DATA().postId || 0, (text) => {
					s.status = text;
					render();
				}, mode === 'local');
				s.status = '';
				out.plan.ops = copy.ops;
				report = [copy.summary].concat(copy.details.slice(0, 8)).filter(Boolean).join('\n');
			}
			const scripts = (out.scripts || []).map((sc) => '• ' + (sc.src || t('Inline script') + ' (' + scriptSize(sc.size || 0) + ')') + ' [' + scriptFlags(sc) + ']');
			const notes = [siteSourceNote(out.source, s.copyMedia)]
				.filter(Boolean)
				.concat(out.plan.notes || [])
				.concat(scripts.length ? [t('Scripts on the original page were not copied. Add only the ones you trust under Custom Code:')].concat(scripts.slice(0, 40)) : [])
				.join('\n');
			chat.messages.push({ role: 'user', content: t('Rebuild this page here:') + ' ' + page.url });
			chat.messages.push({ role: 'assistant', content: (out.plan.ops.length ? t('Here is that page as native Sidcraft layout. Preview it on the canvas, then apply.') : t('No content was found on that page.')) + (report ? '\n\n' + report : '') + (notes ? '\n\n' + notes : ''), plan: out.plan.ops.length ? out.plan : null });
			chat.site = null;
			chat.save();
		} catch (e) {
			s.error = (e && e.message) || t('The page could not be read.');
			s.busy = false;
		}
		render();
	}
	/** The pages share the classes and variables the import created: save them site-wide. */
	async function saveSiteClasses(s) {
		const mg = W.XEditor && W.XEditor.classes;
		if (!mg || !mg.dirty || typeof mg.save !== 'function') return;
		try {
			await mg.save();
		} catch (e) {
			s.error = t('The pages were created, but their shared styles could not be saved. Save the page to keep them.');
		}
	}
	async function siteCreatePages() {
		readSiteForm();
		const s = chat.site;
		const pages = selectedSitePages();
		if (!pages.length) return;
		const cfg = CFG().siteImport;
		const docApi = String(DATA().api || '').replace(/\/$/, '');
		s.step = 'progress';
		s.busy = true;
		s.error = '';
		s.log = [];
		s.results = [];
		render();
		for (const page of pages) {
			const line = { state: 'busy', text: t('Rebuilding %s…').replace('%s', page.label || page.url) };
			s.log.push(line);
			render();
			try {
				const out = await sitePagePlan(page, null);
				if (!out.plan.ops.length) throw new Error(t('No content was found on that page.'));
				line.details = [siteSourceNote(out.source, s.copyMedia)].filter(Boolean).concat(out.plan.notes || []);
				line.scripts = out.scripts;
				line.url = out.url;
				const title = pageTitle(out.title, page);
				line.page = title;
				const fields = { title, status: 'draft' };
				// Pro shows the page without the theme's header and footer: it has the site's own.
				if (!s.skipChrome && cfg.ownChrome) fields.meta = { [cfg.ownChrome]: true };
				const post = await api(cfg.pages, fields);
				if (!post || !post.id) throw new Error(t('The page could not be created.'));
				let copied = '';
				const mode = siteMediaMode(s, out);
				if (mode) {
					const copy = await copySiteMedia(out, post.id, (text) => {
						line.text = title + ': ' + text;
						render();
					}, mode === 'local');
					out.plan.ops = copy.ops;
					copied = copy.summary;
					line.details = line.details.concat(copy.details.slice(0, 12));
				}
				const built = LB.planToDocument(out.plan.ops);
				// Full width under the theme's header and footer, or the whole page on its own when
				// the site's header and footer were kept.
				built.document.settings = { template: s.skipChrome ? 'full_width' : 'canvas' };
				await api(docApi + '/document/' + post.id + '/import', built.document);
				s.results.push({ title, id: post.id, edit: cfg.editor + post.id });
				line.state = line.details.length > (out.source && out.source.builder ? 1 : 0) ? 'warn' : 'ok';
				line.text = t('%s: created').replace('%s', title) + (copied ? ' (' + copied + ')' : '');
			} catch (e) {
				line.state = 'error';
				line.text = (page.label || page.url) + ': ' + ((e && e.message) || t('failed'));
			}
			// Long imports (up to 500 pages) save the shared styles as they go, so pages already
			// created keep their styles if the editor is closed before the end.
			if (s.results.length && s.results.length % 10 === 0) await saveSiteClasses(s);
			render();
		}
		await saveSiteClasses(s);
		s.busy = false;
		render();
	}
	function insertionPoint() {
		const sel = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
		if (!sel || chat.scope !== 'selected') return { parent: null, index: undefined };
		const state = LB.getState();
		const r = locateIn(state, sel);
		if (!r) return { parent: null, index: undefined };
		if (acceptsChildren(r.node)) return { parent: r.node.id, index: undefined };
		return { parent: r.parent ? r.parent.id : null, index: r.index + 1 };
	}
	function planOps(idx) {
		const m = chat.messages[idx];
		if (!m || !m.plan) return [];
		const skip = m.skip || [];
		return (m.plan.ops || []).filter((op, i) => skip.indexOf(i) === -1);
	}
	let previewIdx = -1;
	let checkSeq = 0;
	function doPreview(idx) {
		const res = LB.previewOps(planOps(idx));
		previewIdx = idx;
		const m = chat.messages[idx];
		if (m) {
			m.warnings = res.warnings || [];
			m.checks = null;
		}
		render();
		return m && res.ok ? checkPlan(idx, res) : Promise.resolve(null);
	}
	/** Measure the previewed plan at every breakpoint and record the result in its run. */
	async function checkPlan(idx, res) {
		const m = chat.messages[idx];
		const seq = ++checkSeq;
		const current = () => seq === checkSeq && !!preview && previewIdx === idx;
		const key = JSON.stringify(planOps(idx));
		m.checks = { state: 'running' };
		render();
		const ids = subtreeIds(LB.getState(), (res.created || []).concat(res.changed || []));
		const layout = await LB.checkLayout(ids, current);
		if (!layout || !current()) {
			if (m.checks && m.checks.state === 'running') m.checks = null;
			return null;
		}
		const sum = layoutSummary(layout);
		m.checks = { state: 'done', layout, errors: sum.errors, warnings: sum.warnings, key };
		try {
			await pendingRuns.get(m);
			if (m.run && current()) {
				await syncTree(m, planOps(idx));
				const v = await runApi(runUrl(m, 'validate'), { layout });
				m.checks.structural = v.validation.structural;
				m.checks.acceptance = v.acceptance;
			}
		} catch (e) {
			m.checks.serverError = (e && e.message) || '';
		}
		chat.save();
		render();
		return m.checks;
	}
	function checksPass(m) {
		const c = m.checks;
		if (!c || c.state !== 'done') return false;
		if (c.acceptance) return !!c.acceptance.ok;
		return !c.errors;
	}
	async function doApply(idx, anyway) {
		const m = chat.messages[idx];
		if (!m || !m.plan) return;
		const key = JSON.stringify(planOps(idx));
		// Check at every breakpoint first, unless this exact plan was just checked.
		if (!anyway && !(m.checks && m.checks.state === 'done' && m.checks.key === key)) {
			if (!(await doPreview(idx))) return;
		}
		if (!anyway && !checksPass(m)) {
			m.blocked = true;
			return void render();
		}
		if (preview) LB.discardPreview();
		previewIdx = -1;
		m.blocked = false;
		const res = LB.applyOps(planOps(idx), { label: t('AI:') + ' ' + (m.plan.title || t('change')) });
		m.warnings = res.warnings || [];
		if (res.ok) {
			m.status = 'applied';
			m.inverse = res.inverse;
			remember(m, !checksPass(m));
		} else if (!m.warnings.length) m.warnings = [t('Nothing could be applied. The page may have changed; ask again.')];
		chat.save();
		render();
	}
	/** Accept the run (the server remembers the decision); without a run, just remember it. */
	function remember(m, override) {
		const note = (m.plan.title || '') + (m.plan.summary ? ': ' + m.plan.summary : '');
		const direct = () => (CFG().memory && note ? runApi(CFG().memory, { text: note, post_id: DATA().postId || 0, scope: chat.scope, run: m.run || '' }).catch(() => null) : null);
		if (!m.run) return void direct();
		runApi(runUrl(m, 'accept'), { override: !!override })
			.then((man) => {
				m.runStatus = man.status;
				chat.save();
			})
			.catch(direct);
	}
	function checksHTML(m, idx) {
		const c = m.checks;
		if (!c) return '';
		if (c.state === 'running') return `<p class="lb-ai-checks is-running" role="status">${esc(t('Checking the layout at each breakpoint…'))}</p>`;
		const names = Object.keys(c.layout || {});
		const rows = [];
		names.forEach((bp) => {
			const r = c.layout[bp];
			r.errors.forEach((x) => rows.push(`<li class="is-error"><strong>${esc(bp)}</strong> ${esc(x.message)}</li>`));
			r.warnings.forEach((x) => rows.push(`<li><strong>${esc(bp)}</strong> ${esc(x.message)}</li>`));
		});
		const st = c.structural;
		if (st) {
			st.errors.forEach((x) => rows.push(`<li class="is-error">${esc(x.message)}</li>`));
			st.warnings.forEach((x) => rows.push(`<li>${esc(x.message)}</li>`));
		}
		const errors = c.errors + (st ? st.errors.length : 0);
		const warnings = c.warnings + (st ? st.warnings.length : 0);
		const head = names.map((bp) => esc(bp) + ' ' + esc(String(c.layout[bp].width)) + 'px').join(' · ');
		const verdict = errors ? t('%s problems to fix').replace('%s', String(errors)) : warnings ? t('No blocking problems, %s notes').replace('%s', String(warnings)) : t('No problems found');
		const other = c.acceptance && !c.acceptance.ok && !errors ? c.acceptance.reasons.map((r) => `<li class="is-error">${esc(r.message)}</li>`).join('') : '';
		const blocked = m.blocked && m.status === 'new' ? `<p class="lb-ai-checks-blocked">${esc(t('Fix these first, ask the AI to fix them, or apply anyway.'))} <button type="button" data-ai-apply-anyway="${idx}">${esc(t('Apply anyway'))}</button></p>` : '';
		const list = rows.length || other ? `<details${errors || other ? ' open' : ''}><summary>${esc(t('Details'))}</summary><ul>${other}${rows.slice(0, 40).join('')}</ul></details>` : '';
		return `<div class="lb-ai-checks${errors || other ? ' has-errors' : ''}"><p><strong>${esc(verdict)}</strong> <span>${head}</span></p>${list}${c.serverError ? `<p class="lb-ai-note">${esc(c.serverError)}</p>` : ''}${blocked}</div>`;
	}
	function doRevert(idx) {
		const m = chat.messages[idx];
		if (!m || !m.inverse) return;
		const res = LB.applyOps(m.inverse, { label: t('Revert:') + ' ' + ((m.plan && m.plan.title) || t('AI change')) });
		m.status = 'reverted';
		m.warnings = res.warnings && res.warnings.length ? [t('Some parts had changed since and were left as they are.')].concat(res.warnings.slice(0, 3)) : [];
		chat.save();
		render();
	}

	/* ---------------- events ---------------- */
	function onClick(e) {
		if (!body || !body.contains(e.target)) return;
		const el = e.target.closest('button,[data-ai-idea]');
		if (!el) return;
		const d = el.dataset;
		if (d.aiClose !== undefined) return void (LB.drawer.close(), setButtonState());
		if (d.aiNew !== undefined) {
			if (preview) LB.discardPreview();
			chat.messages = [];
			chat.error = '';
			chat.save();
			return void render();
		}
		if (d.aiSettings !== undefined) return void ((chat.view = chat.view === 'settings' ? 'chat' : 'settings'), render());
		if (d.aiBack !== undefined) return void ((chat.view = 'chat'), render());
		if (d.aiScope) return void ((chat.scope = d.aiScope), chat.save(), render());
		if (d.aiIdea) {
			const input = body.querySelector('#lb-ai-input');
			if (input) {
				input.value = d.aiIdea;
				input.focus();
			}
			return;
		}
		if (d.aiPick) return void body.querySelector('[data-ai-file="' + d.aiPick + '"]').click();
		if (d.aiSite !== undefined) return void openSite();
		if (d.aiSiteClose !== undefined) return void ((chat.site = null), render());
		if (d.aiSiteScripts !== undefined) return void saveSiteScripts();
		if (d.aiSiteScan !== undefined) return void siteScan();
		if (d.aiSiteBack !== undefined) return void ((chat.site.step = 'url'), (chat.site.error = ''), render());
		if (d.aiSiteHere !== undefined) return void siteBuildHere();
		if (d.aiSiteCreate !== undefined) return void siteCreatePages();
		if (d.aiSiteAll !== undefined) return void siteSelectAll(d.aiSiteAll === '1');
		if (d.aiRemoveAtt) return void (chat.attachments.splice(+d.aiRemoveAtt, 1), render());
		if (d.aiStop !== undefined) return void (chat.controller && chat.controller.abort());
		if (d.aiRetry !== undefined) {
			const last = [...chat.messages].reverse().find((m) => m.role === 'user');
			chat.error = '';
			if (last) {
				chat.messages.splice(chat.messages.lastIndexOf(last), 1);
				send(last.content || '');
			} else render();
			return;
		}
		if (d.aiPreview) return void doPreview(+d.aiPreview);
		if (d.aiApply) return void doApply(+d.aiApply);
		if (d.aiApplyAnyway) return void doApply(+d.aiApplyAnyway, true);
		if (d.aiPreviewApply !== undefined) return void (previewIdx >= 0 ? doApply(previewIdx) : (LB.discardPreview(), render()));
		if (d.aiPreviewDiscard !== undefined) return void (LB.discardPreview(), (previewIdx = -1), render());
		if (d.aiDiscard) {
			if (preview && previewIdx === +d.aiDiscard) LB.discardPreview();
			const m = chat.messages[+d.aiDiscard];
			if (m) m.status = 'discarded';
			chat.save();
			return void render();
		}
		if (d.aiRevert) return void doRevert(+d.aiRevert);
	}
	function onChange(e) {
		if (!body || !body.contains(e.target)) return;
		const el = e.target;
		if (el.dataset.aiOp) {
			const [mi, oi] = el.dataset.aiOp.split(':').map(Number);
			const m = chat.messages[mi];
			if (!m) return;
			m.skip = m.skip || [];
			const at = m.skip.indexOf(oi);
			if (el.checked && at !== -1) m.skip.splice(at, 1);
			if (!el.checked && at === -1) m.skip.push(oi);
			m.checks = null;
			m.blocked = false;
			if (preview && previewIdx === mi) doPreview(mi);
			chat.save();
			return;
		}
		if (el.dataset.aiHtmlMode) {
			const a = chat.attachments[+el.dataset.aiHtmlMode];
			if (a) a.mode = el.value;
			return;
		}
		if (el.dataset.aiFile) return void addFiles(el.dataset.aiFile, Array.from(el.files || []), el);
	}
	async function addFiles(kind, files, input) {
		const cfg = CFG();
		for (const f of files) {
			try {
				if (kind === 'image') {
					if (!cfg.images) continue;
					if (chat.attachments.filter((a) => a.kind === 'image').length >= 3) {
						chat.error = t('Attach up to 3 images per message.');
						break;
					}
					const img = await readImage(f, Math.max(1, Math.min(4, cfg.maxImages || 1)));
					chat.attachments.push({ kind: 'image', name: f.name, thumb: img.tiles[0].thumb, width: img.width, height: img.height, tiles: img.tiles, file: f });
				} else {
					if (f.size > 2 * 1024 * 1024) throw new Error(t('The file is larger than 2 MB.'));
					const text = await f.text();
					const isCss = /\.css$/i.test(f.name) || f.type === 'text/css';
					const html = chat.attachments.find((a) => a.kind === 'html' && isCss && !a.css);
					if (isCss && html) {
						html.css = text;
						html.name += ' + ' + f.name;
					} else chat.attachments.push({ kind: 'html', name: f.name, html: isCss ? '' : text, css: isCss ? text : '', mode: 'convert' });
				}
			} catch (err) {
				chat.error = err.message || String(err);
			}
		}
		if (input) input.value = '';
		render();
		setButtonState();
	}
	function onSubmit(e) {
		if (!body || !body.contains(e.target)) return;
		const form = e.target;
		if (form.dataset.aiForm !== undefined) {
			e.preventDefault();
			const input = form.querySelector('#lb-ai-input');
			const text = input ? input.value : '';
			if (input) input.value = '';
			send(text);
			return;
		}

	}
	function onKey(e) {
		if (preview && (e.ctrlKey || e.metaKey) && /^[zZyY]$/.test(e.key)) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
			const tag = (e.target && e.target.tagName) || '';
			if (/INPUT|TEXTAREA/.test(tag) && !(body && body.contains(e.target))) return;
			e.preventDefault();
			toggle();
			return;
		}
		if (body && e.target && e.target.id === 'lb-ai-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			const form = e.target.form;
			if (form && !chat.busy) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
		}
	}
	function onPaste(e) {
		if (!body || e.target.id !== 'lb-ai-input') return;
		const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
		if (text.length > 200 && /^\s*</.test(text) && /<\/?(div|section|header|main|body|html|p|h[1-6])\b/i.test(text)) {
			e.preventDefault();
			chat.attachments.push({ kind: 'html', name: t('Pasted HTML'), html: text, css: '', mode: 'convert' });
			render();
		}
	}
	function onDrop(e) {
		if (!body || !body.contains(e.target)) return;
		const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
		if (!files.length) return;
		e.preventDefault();
		body.classList.remove('is-drop');
		const imgs = files.filter((f) => /^image\//.test(f.type));
		const docs = files.filter((f) => !/^image\//.test(f.type));
		if (docs.length) addFiles('html', docs);
		if (imgs.length) {
			if (CFG().images) addFiles('image', imgs);
			else {
				chat.error = t('Image to layout needs Sidcraft Builder Pro. HTML files work here.');
				render();
			}
		}
	}

	/* ================================================================== *
	 * Boot
	 * ================================================================== */
	function boot() {
		if (boot.done) return;
		boot.done = true;
		chat.load();
		LB.drawer.register('ai-chat', {
			title: t('AI Chat Bot'),
			render(el) {
				body = el;
				render();
				const input = el.querySelector('#lb-ai-input');
				if (input) input.focus();
				setButtonState();
			},
			onClose() {
				if (preview) LB.discardPreview();
				setButtonState();
			},
		});
		LB.topbar.register({ id: 'lb-ai-chat-button', label: t('AI Chat Bot'), title: t('AI Chat Bot (Ctrl/Cmd+Shift+A)'), icon: ICON, after: 'xeditor', className: 'lb-ai-chat-button', onClick: toggle });
		const h = hooks();
		h.addAction('editor/topbar', () => LB.topbar.mount(), 20, 'ai-chat');
		h.addAction('editor/render', () => {
			LB.topbar.mount();
			setButtonState();
			if (preview) markPreview();
		}, 30, 'ai-chat');
		h.addAction('editor/select', () => {
			if (LB.drawer.isOpen('ai-chat') && !chat.busy && chat.view === 'chat') {
				const input = body && body.querySelector('#lb-ai-input');
				const focused = input && document.activeElement === input;
				const draft = input ? input.value : '';
				render();
				const again = body && body.querySelector('#lb-ai-input');
				if (again) {
					again.value = draft;
					if (focused) again.focus();
				}
			}
		}, 30, 'ai-chat');
		h.addAction('editor/save/before', () => {
			if (preview) LB.discardPreview();
		}, 1, 'ai-chat');
		document.addEventListener('click', onClick);
		// Website import: keep the panel's choices when the drawer redraws.
		document.addEventListener('change', (e) => {
			if (!chat.site || !body || !body.contains(e.target) || !e.target.closest('.lb-ai-site')) return;
			readSiteForm();
			if (e.target.matches('[data-ai-site-page]')) render();
		});
		document.addEventListener('input', (e) => {
			if (chat.site && e.target && e.target.id === 'lb-ai-site-url') chat.site.url = e.target.value.trim();
		});
		document.addEventListener('change', onChange);
		document.addEventListener('submit', onSubmit);
		document.addEventListener('keydown', onKey, true);
		document.addEventListener('paste', onPaste);
		document.addEventListener('drop', onDrop);
		document.addEventListener('dragover', (e) => {
			if (body && body.contains(e.target)) {
				e.preventDefault();
				body.classList.add('is-drop');
			}
		});
		document.addEventListener('dragleave', (e) => {
			if (body && e.target === body) body.classList.remove('is-drop');
		});
		// XEditor mounts its own button a moment after the editor starts.
		let tries = 0;
		const iv = setInterval(() => {
			LB.topbar.mount();
			if (++tries > 20 || document.getElementById('xe-menu-button')) {
				LB.topbar.mount();
				clearInterval(iv);
			}
		}, 250);
	}
	if (LB.hooks && typeof LB.hooks.addAction === 'function') {
		if (LB._ready) boot();
		else LB.hooks.addAction('editor/init', boot, 20, 'ai-chat');
	} else document.addEventListener('DOMContentLoaded', () => LB.hooks && (LB._ready ? boot() : LB.hooks.addAction('editor/init', boot, 20, 'ai-chat')));
})();
