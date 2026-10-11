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
			const s = cleanValue(spec.settings && typeof spec.settings === 'object' ? spec.settings : {}) || {};
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
						const s = cleanValue(op.settings && typeof op.settings === 'object' ? op.settings : {}) || {};
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
		const walk = (nodes, depth) =>
			(nodes || [])
				.filter(Boolean)
				.map((n) => {
					if (count++ > limit) return null;
					const s = n.settings || {};
					const row = { id: n.id, type: n.type };
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
					if (n.children && n.children.length && depth < 14) row.children = walk(n.children, depth + 1);
					return row;
				})
				.filter(Boolean);
		const sel = typeof LB.getSelected === 'function' ? LB.getSelected() : null;
		const selNode = sel ? locateIn(state, sel) : null;
		const mg = W.XEditor && W.XEditor.classes;
		const allowed = (DATA().caps && DATA().caps.units) || null;
		const pro = !!(DATA().proLicense && DATA().proLicense.active);
		const units = (DATA().units || [])
			.filter((u) => u && u.type && (!allowed || allowed.indexOf(u.type) !== -1) && (pro || u.source !== 'pro'))
			.slice(0, 260)
			.map((u) => u.type + ': ' + (u.title || u.type));
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
	function safeOutline(scope) {
		try {
			return LB.pageOutline({ scope });
		} catch (e) {
			const o = LB.pageOutline({ scope, limit: 300 });
			o.selected = null;
			return o;
		}
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
		return Array.from(el.children).some((c) => BLOCK_TAGS.indexOf(c.tagName.toLowerCase()) !== -1 || isButtonLink(c));
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
	function parseCss(cssText) {
		const out = { classes: {}, vars: {}, body: null, used: false };
		if (!cssText || !cssText.trim()) return out;
		let sheet = null;
		try {
			sheet = new CSSStyleSheet();
			sheet.replaceSync(cssText.replace(/@import[^;]+;/gi, ''));
		} catch (e) {
			return out;
		}
		const bpFor = (media) => {
			const m = String(media || '').match(/max-width\s*:\s*(\d+)px/i);
			if (!m) return /min-width/i.test(media) ? null : 'desktop';
			const px = parseInt(m[1], 10);
			return px <= 767 ? 'mobile' : px <= 1024 ? 'tablet' : 'desktop';
		};
		const take = (rule, bp) => {
			const props = {};
			// Read the declarations as written: the CSSOM leaves shorthands that use var() empty.
			declarations(rule.style.cssText).forEach(([p, v]) => {
				if (p.indexOf('--') === 0) {
					if (bp === 'desktop' && /(^|,)\s*(:root|html|body)\s*($|,)/.test(rule.selectorText)) out.vars[slug(p.slice(2))] = v;
					return;
				}
				props[p] = v.replace(/var\(\s*--([a-zA-Z0-9_-]+)/g, (m, n) => 'var(--xe-var-' + slug(n));
			});
			return props;
		};
		const visit = (rules, bp) => {
			Array.from(rules || []).forEach((rule) => {
				if (rule.type === 4 /* MEDIA */) {
					const b = bpFor(rule.media && rule.media.mediaText);
					if (b) visit(rule.cssRules, b);
					return;
				}
				if (rule.type !== 1 /* STYLE */) return;
				const props = take(rule, bp);
				String(rule.selectorText || '')
					.split(',')
					.forEach((sel) => {
						sel = sel.trim();
						const m = sel.match(/^(?:[a-z0-9]+)?\.([a-zA-Z0-9_-]+)(:hover|:focus|:active|:focus-visible)?$/);
						if (m && Object.keys(props).length) {
							const name = slug(m[1]);
							const state = m[2] ? m[2].slice(1).replace('-', '_') : 'base';
							const c = (out.classes[name] = out.classes[name] || {});
							const st = (c[state] = c[state] || {});
							st[bp] = Object.assign(st[bp] || {}, props);
						} else if (/^(body|html)$/.test(sel) && bp === 'desktop' && Object.keys(props).length) out.body = Object.assign(out.body || {}, props);
					});
			});
		};
		visit(sheet.cssRules, 'desktop');
		return out;
	}
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
			frame.addEventListener('load', () => setTimeout(finish, 60));
			document.body.appendChild(frame);
			frame.srcdoc = doc;
			setTimeout(finish, 4000);
		});
	};
	function convertDocument(doc, cssText, pageTitle, opts) {
		const css = parseCss(cssText);
		const usedClasses = {};
		const inlineClasses = {};
		let inlineCount = 0;
		let nodes = 0;
		const MAX_NODES = opts.maxNodes || 1500;
		const win = doc.defaultView;
		const cs = (el) => (win ? win.getComputedStyle(el) : null);
		const classesOf = (el) => {
			const list = [];
			String(el.getAttribute('class') || '')
				.split(/\s+/)
				.forEach((c) => {
					const n = slug(c);
					if (n && css.classes[n]) {
						list.push(n);
						usedClasses[n] = 1;
					}
				});
			const inl = inlineStyleProps(el);
			if (Object.keys(inl).length) {
				const key = JSON.stringify(inl);
				if (!inlineClasses[key]) inlineClasses[key] = 'imported-' + ++inlineCount;
				list.push(inlineClasses[key]);
			}
			return list;
		};
		const settingsWith = (el, s) => {
			const cls = classesOf(el);
			if (cls.length) s.xe_classes = cls;
			return s;
		};
		const containerFor = (el, tag) => {
			const st = cs(el);
			const display = st ? st.display : 'block';
			const allowedTags = ['div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'figure'];
			const t2 = allowedTags.indexOf(tag) !== -1 ? tag : 'div';
			if (/grid/.test(display)) {
				const cols = st.gridTemplateColumns && st.gridTemplateColumns !== 'none' ? st.gridTemplateColumns.split(/\s+(?![^(]*\))/).length : 1;
				return { type: 'xe_grid', settings: settingsWith(el, { tag: t2, columns: String(Math.max(1, Math.min(12, cols))), col_gap: st.columnGap && st.columnGap !== 'normal' ? st.columnGap : '0px', row_gap: st.rowGap && st.rowGap !== 'normal' ? st.rowGap : '0px' }) };
			}
			if (/flex/.test(display)) {
				const dir = st.flexDirection === 'column' || st.flexDirection === 'column-reverse' ? 'column' : 'row';
				return {
					type: 'xe_flexbox',
					settings: settingsWith(el, { tag: t2, direction: dir, justify: st.justifyContent && st.justifyContent !== 'normal' ? st.justifyContent : 'flex-start', align: st.alignItems && st.alignItems !== 'normal' ? st.alignItems : 'stretch', wrap: st.flexWrap === 'nowrap' ? 'nowrap' : 'wrap', gap: st.gap && st.gap !== 'normal' ? st.gap.split(' ')[0] : '0px' }),
				};
			}
			return { type: 'xe_div_block', settings: settingsWith(el, { tag: t2 }) };
		};
		const textNode = (text, el) => ({ type: 'xe_paragraph', settings: settingsWith(el, { text, tag: 'p' }) });
		const walk = (el) => {
			if (nodes >= MAX_NODES) return [];
			const tag = el.tagName.toLowerCase();
			if (SKIP_TAGS.indexOf(tag) !== -1) return [];
			const st = cs(el);
			if (st && st.display === 'none') return [];
			nodes++;
			if (/^h[1-6]$/.test(tag)) return [{ type: 'xe_heading', settings: settingsWith(el, { text: el.textContent.replace(/\s+/g, ' ').trim(), tag }) }];
			if (tag === 'img') return [{ type: 'xe_image', settings: settingsWith(el, { source: 'url', src: absUrl(el.getAttribute('src'), opts.baseUrl), alt: String(el.getAttribute('alt') || '').slice(0, 200) }) }];
			if (tag === 'picture') {
				const img = el.querySelector('img');
				return img ? walk(img) : [];
			}
			if (tag === 'svg') return [];
			if (tag === 'hr') return meta('divider').type ? [{ type: 'divider', settings: {} }] : [];
			if (tag === 'button' || (tag === 'input' && /^(submit|button)$/i.test(el.getAttribute('type') || '')) || isButtonLink(el)) {
				const text = tag === 'input' ? el.getAttribute('value') || t('Submit') : el.textContent.replace(/\s+/g, ' ').trim();
				return [{ type: 'xe_button', settings: settingsWith(el, { text: text || t('Button'), link: tag === 'a' ? absUrl(el.getAttribute('href'), opts.baseUrl) || '#' : '' }) }];
			}
			if (tag === 'iframe') {
				const src = absUrl(el.getAttribute('src'), opts.baseUrl);
				if (/youtube\.com|youtu\.be|vimeo\.com/.test(src) && meta('video').type) return [{ type: 'video', settings: { url: src, video_url: src } }];
				return [];
			}
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
							box.children.push({ type: 'xe_paragraph', settings: settingsWith(li, { text: (tag === 'ul' ? '• ' : '') + txt, tag: 'p' }) });
						}
					}
				});
				return box.children.length ? [box] : [];
			}
			const isLeafText = !hasBlockChild(el);
			if (isLeafText) {
				const txt = cleanInline(el);
				if (!txt) {
					if (['div', 'section', 'figure', 'span'].indexOf(tag) !== -1 && classesOf(el).length && st && parseFloat(st.height) > 2) return [containerFor(el, tag)];
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
					if (INLINE_OK.indexOf(ctag) !== -1 && !isButtonLink(c) && !hasBlockChild(c)) buffer += c.textContent;
					else {
						flush();
						box.children.push(...walk(c));
					}
				}
			});
			flush();
			return [box];
		};
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
		if (css.body && tree.length) tree = [{ type: 'xe_div_block', settings: { tag: 'div', xe_classes: ['page-body'] }, children: tree }];

		const ops = [];
		Object.keys(css.vars).forEach((name) => {
			const v = css.vars[name];
			const type = /^#|rgb|hsl/.test(v) ? 'color' : /px|rem|em|%/.test(v) ? 'size' : /,|serif|sans/.test(v) ? 'font' : 'custom';
			ops.push({ op: 'var', name, type, value: v });
		});
		Object.keys(usedClasses).forEach((name) => ops.push({ op: 'class', name, styles: css.classes[name] }));
		Object.keys(inlineClasses).forEach((key) => ops.push({ op: 'class', name: inlineClasses[key], styles: { base: { desktop: JSON.parse(key) } } }));
		if (css.body && tree.length) ops.push({ op: 'class', name: 'page-body', styles: { base: { desktop: css.body } } });
		if (tree.length) ops.push({ op: 'insert', parent: opts.parent == null ? null : opts.parent, index: opts.index, nodes: tree });
		const classCount = Object.keys(usedClasses).length + Object.keys(inlineClasses).length + (css.body ? 1 : 0);
		const varCount = Object.keys(css.vars).length;
		const summary = t('%1$s elements, %2$s classes and %3$s variables converted to XEditor.').replace('%1$s', String(nodes)).replace('%2$s', String(classCount)).replace('%3$s', String(varCount)) + (nodes >= MAX_NODES ? ' ' + t('The page was long, so only the first part was imported.') : '');
		return { title: pageTitle ? t('Import:') + ' ' + pageTitle.slice(0, 40) : t('Imported HTML'), summary, ops, stats: { nodes, classes: classCount, variables: varCount } };
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
		const err = chat.error && !chat.busy ? `<div class="lb-ai-error" role="alert"><strong>${esc(t('Something went wrong.'))}</strong> ${esc(chat.error)} <span class="lb-ai-error-actions"><button type="button" data-ai-retry>${esc(t('Try again'))}</button>${!cfg.ready && cfg.canConfigure ? '<button type="button" data-ai-settings>' + esc(t('Connect AI')) + '</button>' : ''}${cfg.settingsUrl ? '<a href="' + esc(cfg.settingsUrl) + '" target="_blank" rel="noopener">' + esc(t('Open AI Connectivity')) + '</a>' : ''}</span></div>` : '';
		const chips = chat.attachments
			.map((a, i) => `<span class="lb-ai-chip">${a.kind === 'image' && a.thumb ? '<img src="' + esc(a.thumb) + '" alt="">' : '<span aria-hidden="true">&lt;/&gt;</span>'}<span class="lb-ai-chip-name">${esc(a.name)}</span>${a.kind === 'html' ? `<select data-ai-html-mode="${i}" aria-label="${esc(t('How to use this HTML'))}"><option value="convert"${a.mode !== 'ai' ? ' selected' : ''}>${esc(t('Convert directly'))}</option><option value="ai"${a.mode === 'ai' ? ' selected' : ''}>${esc(t('Rebuild with AI'))}</option></select>` : ''}<button type="button" data-ai-remove-att="${i}" aria-label="${esc(t('Remove attachment'))}">×</button></span>`)
			.join('');
		const imgBtn = cfg.images
			? `<button type="button" class="lb-ai-attach" data-ai-pick="image" title="${esc(t('Upload a screenshot, wireframe or mockup (PNG, JPG, WebP)'))}">🖼 ${esc(t('Image'))}</button>`
			: cfg.pro && cfg.settingsUrl
			? `<a class="lb-ai-attach lb-ai-pro" href="${esc(cfg.settingsUrl)}" target="_blank" rel="noopener" title="${esc(cfg.proHint || t('Choose a provider that accepts images on AI Connectivity'))}">🖼 ${esc(t('Image to layout'))} <em>${esc(t('Set up'))}</em></a>`
			: `<a class="lb-ai-attach lb-ai-pro" href="${esc(cfg.proUrl || '#')}" target="_blank" rel="noopener" title="${esc(t('Turn screenshots and mockups into layouts with Sidcraft Builder Pro'))}">🖼 ${esc(t('Image to layout'))} <em>Pro</em></a>`;
		const composer = `<form class="lb-ai-composer" data-ai-form>${chips ? '<div class="lb-ai-chips">' + chips + '</div>' : ''}<label class="screen-reader-text" for="lb-ai-input">${esc(t('Message'))}</label><textarea id="lb-ai-input" rows="3" placeholder="${esc(cfg.ready ? t('Describe a change, or attach a design…') : t('Attach HTML to convert, or connect AI to chat…'))}"${chat.busy ? ' disabled' : ''}></textarea><div class="lb-ai-composer-row"><button type="button" class="lb-ai-attach" data-ai-pick="html" title="${esc(t('Upload an HTML page, snippet or CSS file'))}">&lt;/&gt; ${esc(t('HTML'))}</button>${imgBtn}<span class="lb-ai-spacer"></span>${chat.busy ? `<button type="button" class="lb-ai-send is-stop" data-ai-stop>${esc(t('Stop'))}</button>` : `<button type="submit" class="lb-ai-send">${esc(t('Send'))}</button>`}</div><input type="file" hidden data-ai-file="html" accept=".html,.htm,.css,.txt,text/html,text/css"><input type="file" hidden data-ai-file="image" accept="image/png,image/jpeg,image/webp" multiple></form>`;
		const banner = preview ? `<div class="lb-ai-preview-bar" role="status"><span>${esc(t('Previewing on the canvas'))}</span><button type="button" data-ai-preview-apply class="is-primary">${esc(t('Apply'))}</button><button type="button" data-ai-preview-discard>${esc(t('Discard'))}</button></div>` : '';
		const keep = body.querySelector('#lb-ai-input');
		const draft = keep ? keep.value : '';
		body.innerHTML = head + scope + banner + `<div class="lb-ai-log" aria-live="polite">${list}${typing}${err}</div>` + composer;
		const input = body.querySelector('#lb-ai-input');
		if (input && draft) input.value = draft;
		const log = body.querySelector('.lb-ai-log');
		if (log) log.scrollTop = log.scrollHeight;
	}
	function welcomeHTML(cfg) {
		const ideas = [t('Build a dark-mode SaaS pricing section with 3 tiers and an annual billing toggle.'), t('Change all secondary buttons to use our primary brand color #0052FF across the page.'), t('Convert this 3-column feature grid into 2 columns with hover cards.'), t('Translate this hero section to Spanish and make the copy more persuasive.')];
		return `<div class="lb-ai-welcome"><p><strong>${esc(t('Design by chatting.'))}</strong> ${esc(t('Describe what you want, attach an HTML page, or upload a design. You preview every change before it touches the page, and each one can be undone.'))}</p>${cfg.ready ? '' : `<p class="lb-ai-note">${cfg.canConfigure ? esc(t('HTML import works without AI. To chat, connect your own AI provider key.')) + ' <button type="button" data-ai-settings>' + esc(t('Connect AI')) + '</button>' : esc(t('HTML import works now. Ask an administrator to connect an AI provider to chat.'))}</p>`}<div class="lb-ai-ideas">${ideas.map((i) => `<button type="button" data-ai-idea="${esc(i)}">${esc(i)}</button>`).join('')}</div><p class="lb-ai-privacy">${esc(cfg.privacy || '')}</p></div>`;
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
		if (m.content) html += `<div class="lb-ai-msg is-bot">${formatText(m.content)}</div>`;
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
			html += `<div class="lb-ai-plan" data-status="${esc(status)}"><div class="lb-ai-plan-head"><strong>${esc(p.title || t('Proposed change'))}</strong><span>${esc(t('%s changes').replace('%s', String(ops.length)))}</span></div>${p.summary ? '<p>' + esc(p.summary) + '</p>' : ''}<details${status === 'new' && ops.length <= 12 ? ' open' : ''}><summary>${esc(t('Review changes'))}</summary><ul class="lb-ai-ops">${checks}</ul></details>${warn}<div class="lb-ai-plan-actions">${actions}</div></div>`;
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
		if (cfg.managedBy) {
			return `<div class="lb-ai-settings"><p>${esc(t('The AI connection is managed by %s.').replace('%s', cfg.managedBy))}</p><p><strong>${esc(cfg.providerLabel || t('Not connected'))}</strong>${cfg.model ? ' · ' + esc(cfg.model) : ''}</p>${cfg.settingsUrl ? `<p><a class="button" href="${esc(cfg.settingsUrl)}" target="_blank" rel="noopener">${esc(t('Open AI Connectivity'))}</a></p>` : ''}<p><button type="button" data-ai-back>${esc(t('Back to chat'))}</button></p></div>`;
		}
		if (!cfg.canConfigure) return `<div class="lb-ai-settings"><p>${esc(t('Only an administrator can connect an AI provider.'))}</p><p><button type="button" data-ai-back>${esc(t('Back to chat'))}</button></p></div>`;
		const providers = cfg.providers || [];
		const cur = providers.find((p) => p.id === cfg.provider) || providers[0] || { models: [] };
		return `<form class="lb-ai-settings" data-ai-settings-form><h3>${esc(t('Connect your AI provider'))}</h3><p class="description">${esc(t('Use your own API key. It is stored encrypted on this site and is never shown again.'))}</p><label>${esc(t('Provider'))}<select name="provider">${providers.map((p) => `<option value="${esc(p.id)}"${p.id === cur.id ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label><label data-ai-endpoint-row${cur.endpoint ? '' : ' hidden'}>${esc(t('Endpoint'))}<input name="endpoint" type="url" placeholder="https://your-resource.openai.azure.com" value="${esc(cfg.endpoint || '')}"></label><label><span data-ai-model-label>${esc(cur.endpoint ? t('Deployment name') : t('Model'))}</span><input name="model" list="lb-ai-models" value="${esc(cfg.provider === cur.id ? cfg.model || '' : cur.models[0] || '')}"><datalist id="lb-ai-models">${(cur.models || []).map((m) => '<option value="' + esc(m) + '">').join('')}</datalist></label>${cur.tools === false ? '<p class="lb-ai-note" data-ai-tools-note>' + esc(t('This provider cannot call tools, so plans come back as JSON text. They work the same, but other providers are usually more reliable for page changes.')) + '</p>' : '<p class="lb-ai-note" data-ai-tools-note hidden></p>'}<label>${esc(t('API key'))}<input name="key" type="password" autocomplete="off" placeholder="${esc(cfg.hasKey ? t('Saved. Leave empty to keep it.') : t('Paste your API key'))}"></label><p class="lb-ai-privacy">${esc(cfg.privacy || '')}</p>${cfg.proHint ? `<p class="lb-ai-note">${esc(cfg.proHint)}${cfg.settingsUrl ? ' <a href="' + esc(cfg.settingsUrl) + '" target="_blank" rel="noopener">' + esc(t('Open AI Connectivity')) + '</a>' : ''}</p>` : ''}<div class="lb-ai-plan-actions"><button type="submit" class="is-primary">${esc(t('Save'))}</button>${cfg.hasKey ? `<button type="button" data-ai-clear-key>${esc(t('Remove key'))}</button>` : ''}<button type="button" data-ai-back>${esc(t('Back to chat'))}</button></div><p class="lb-ai-settings-msg" role="status"></p></form>`;
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
			chat.error = cfg.canConfigure ? t('Connect an AI provider in the settings to chat.') : t('Ask an administrator to connect an AI provider.');
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
				context: JSON.stringify(safeOutline(chat.scope)),
				images: imgs.slice(0, cfg.maxImages || 0),
			});
			const msg = { role: 'assistant', content: String(res.reply || '').replace(/<[^>]+>/g, ''), plan: res.plan && Array.isArray(res.plan.ops) && res.plan.ops.length ? res.plan : null };
			if (!msg.content && !msg.plan) msg.content = t('I could not turn that into a change. Try describing it differently.');
			chat.messages.push(msg);
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
	function doPreview(idx) {
		const res = LB.previewOps(planOps(idx));
		previewIdx = idx;
		const m = chat.messages[idx];
		if (m) m.warnings = res.warnings || [];
		render();
	}
	function doApply(idx) {
		const m = chat.messages[idx];
		if (!m || !m.plan) return;
		if (preview) LB.discardPreview();
		previewIdx = -1;
		const res = LB.applyOps(planOps(idx), { label: t('AI:') + ' ' + (m.plan.title || t('change')) });
		m.warnings = res.warnings || [];
		if (res.ok) {
			m.status = 'applied';
			m.inverse = res.inverse;
		} else if (!m.warnings.length) m.warnings = [t('Nothing could be applied. The page may have changed; ask again.')];
		chat.save();
		render();
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
		if (d.aiClearKey !== undefined) return void saveSettings({ provider: CFG().provider, model: CFG().model, endpoint: CFG().endpoint || '', clearKey: true });
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
			if (preview && previewIdx === mi) doPreview(mi);
			chat.save();
			return;
		}
		if (el.dataset.aiHtmlMode) {
			const a = chat.attachments[+el.dataset.aiHtmlMode];
			if (a) a.mode = el.value;
			return;
		}
		if (el.name === 'provider' && el.form && el.form.dataset.aiSettingsForm !== undefined) {
			const p = (CFG().providers || []).find((x) => x.id === el.value);
			const model = el.form.querySelector('[name="model"]');
			const dl = el.form.querySelector('#lb-ai-models');
			if (p && model) model.value = p.models[0] || '';
			if (p && dl) dl.innerHTML = p.models.map((m) => '<option value="' + esc(m) + '">').join('');
			const row = el.form.querySelector('[data-ai-endpoint-row]');
			if (row) row.hidden = !(p && p.endpoint);
			const ml = el.form.querySelector('[data-ai-model-label]');
			if (ml) ml.textContent = p && p.endpoint ? t('Deployment name') : t('Model');
			const tn = el.form.querySelector('[data-ai-tools-note]');
			if (tn) {
				tn.hidden = !(p && p.tools === false);
				tn.textContent = t('This provider cannot call tools, so plans come back as JSON text. They work the same, but other providers are usually more reliable for page changes.');
			}
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
					chat.attachments.push({ kind: 'image', name: f.name, thumb: img.tiles[0].thumb, width: img.width, height: img.height, tiles: img.tiles });
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
		if (form.dataset.aiSettingsForm !== undefined) {
			e.preventDefault();
			const fd = new FormData(form);
			saveSettings({ provider: fd.get('provider'), model: fd.get('model'), key: fd.get('key'), endpoint: fd.get('endpoint') || '' });
		}
	}
	function saveSettings(payload) {
		const cfg = CFG();
		const msg = body && body.querySelector('.lb-ai-settings-msg');
		if (msg) msg.textContent = t('Saving…');
		api(cfg.restSettings, payload)
			.then((next) => {
				if (DATA().aiChat) Object.assign(DATA().aiChat, next);
				chat.error = '';
				chat.view = next.ready ? 'chat' : 'settings';
				render();
				setButtonState();
				const m2 = body && body.querySelector('.lb-ai-settings-msg');
				if (m2) m2.textContent = next.ready ? '' : t('Saved.');
			})
			.catch((err) => {
				const m2 = body && body.querySelector('.lb-ai-settings-msg');
				if (m2) m2.textContent = err.message;
			});
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
