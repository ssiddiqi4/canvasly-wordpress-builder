/*! Canvasly — Cloudflare Turnstile loader (explicit rendering + submit gate). */
(function () {
	'use strict';
	var FIELD = 'cf-turnstile-response';
	var ids = [];
	var BUTTONS = 'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"], .cp-pay-gateway, [data-lb-turnstile-lock]';

	/** Standalone Turnstile unit: the Canvasly form(s) in the nearest container that holds both. */
	function scopeForms(el) {
		var node = el.closest('.lb-node, .xe-node') || el;
		var scope = node.parentElement;
		while (scope && scope !== document.body) {
			var forms = scope.querySelectorAll('.lb-form[data-lb-form]');
			if (forms.length) return Array.prototype.slice.call(forms);
			scope = scope.parentElement;
		}
		return [];
	}

	/** Buttons and links a gated widget controls. */
	function targets(el) {
		var out = [];
		var forms = [];
		var own = el.closest('form');
		if (own) forms.push(own);
		else if (el.hasAttribute('data-lb-turnstile-protect')) forms = scopeForms(el);
		forms.forEach(function (f) {
			f.querySelectorAll(BUTTONS).forEach(function (b) {
				if (b.type === 'button' && !b.classList.contains('cp-pay-gateway') && !b.hasAttribute('data-lb-turnstile-lock')) return;
				out.push(b);
			});
		});
		var extra = el.getAttribute('data-lb-turnstile-targets');
		if (extra) {
			try {
				document.querySelectorAll(extra).forEach(function (b) {
					out.push(b);
				});
			} catch (e) {}
		}
		return out;
	}

	function lock(el, locked) {
		if (!el || !el.hasAttribute('data-lb-turnstile-gate')) return;
		var wait = el.getAttribute('data-lb-turnstile-wait') || '';
		el.setAttribute('data-lb-turnstile-state', locked ? 'locked' : 'passed');
		targets(el).forEach(function (b) {
			if (locked) {
				b.classList.add('lb-ts-locked');
				b.setAttribute('aria-disabled', 'true');
				if (wait && !b.hasAttribute('data-lb-ts-title')) {
					b.setAttribute('data-lb-ts-title', b.getAttribute('title') || '');
					b.setAttribute('title', wait);
				}
				if ('disabled' in b && b.tagName !== 'A') b.disabled = true;
			} else {
				b.classList.remove('lb-ts-locked');
				b.removeAttribute('aria-disabled');
				if (b.hasAttribute('data-lb-ts-title')) {
					var t = b.getAttribute('data-lb-ts-title');
					if (t) b.setAttribute('title', t);
					else b.removeAttribute('title');
					b.removeAttribute('data-lb-ts-title');
				}
				if ('disabled' in b && b.tagName !== 'A') b.disabled = false;
			}
		});
	}

	function lockAll(root) {
		(root || document).querySelectorAll('.lb-turnstile[data-lb-turnstile-gate]').forEach(function (el) {
			if (el.getAttribute('data-lb-turnstile-state') !== 'passed') lock(el, true);
		});
	}

	function render(root) {
		lockAll(root);
		if (!window.turnstile || typeof window.turnstile.render !== 'function') return;
		(root || document).querySelectorAll('.lb-turnstile[data-sitekey]').forEach(function (el) {
			if (el.getAttribute('data-lb-rendered')) return;
			// Widgets inside a hidden tab or panel render when it is shown (see CanvaslyTurnstile.render).
			if (el.closest('[hidden]')) return;
			el.setAttribute('data-lb-rendered', '1');
			var opts = {
				sitekey: el.getAttribute('data-sitekey'),
				theme: el.getAttribute('data-theme') || 'auto',
				size: el.getAttribute('data-size') || 'normal',
				appearance: el.getAttribute('data-appearance') || 'always',
				action: el.getAttribute('data-action') || undefined,
				'response-field-name': FIELD,
				callback: function () {
					lock(el, false);
				},
				'expired-callback': function () {
					lock(el, true);
				},
				'timeout-callback': function () {
					lock(el, true);
				},
				'error-callback': function () {
					lock(el, true);
				},
			};
			var lang = el.getAttribute('data-language');
			if (lang) opts.language = lang;
			try {
				var id = window.turnstile.render(el, opts);
				el.setAttribute('data-lb-widget', id);
				ids.push(id);
			} catch (e) {
				el.removeAttribute('data-lb-rendered');
			}
		});
	}

	/** A standalone Turnstile unit protects the Canvasly form(s) in the same container. */
	function tokenFromSibling(form) {
		var node = form.closest('.lb-node, .xe-node') || form;
		var scope = node.parentElement;
		while (scope && scope !== document.body) {
			var w = scope.querySelector('.lb-turnstile[data-lb-turnstile-protect] input[name="' + FIELD + '"]');
			if (w) return w.value || '';
			if (scope.querySelector('.lb-turnstile[data-lb-turnstile-protect]')) return '';
			scope = scope.parentElement;
		}
		return '';
	}

	/** Is this form (or its standalone sibling widget) still waiting for a passed challenge? */
	function waiting(form) {
		var own = form.querySelector('.lb-turnstile[data-lb-turnstile-gate]');
		if (own) {
			var input = own.querySelector('input[name="' + FIELD + '"]');
			return !(input && input.value);
		}
		return false;
	}

	// Capture phase: runs before the Canvasly form handler builds its FormData.
	document.addEventListener(
		'submit',
		function (e) {
			var f = e.target;
			if (!f || !f.querySelector) return;
			// Gate: block Enter-key or scripted submits until the challenge passes.
			if (waiting(f)) {
				e.preventDefault();
				e.stopImmediatePropagation();
				var w = f.querySelector('.lb-turnstile[data-lb-turnstile-gate]');
				var msg = f.querySelector('.lb-form-message, .cp-pay-message');
				if (msg && w) msg.textContent = w.getAttribute('data-lb-turnstile-wait') || '';
				return;
			}
			if (!f.matches || !f.matches('.lb-form[data-lb-form]')) return;
			var own = f.querySelector('input[name="' + FIELD + '"]');
			if (own && own.value) return;
			var token = tokenFromSibling(f);
			if (!token) return;
			var hidden = f.querySelector('input[data-lb-turnstile-copy]');
			if (!hidden) {
				hidden = document.createElement('input');
				hidden.type = 'hidden';
				hidden.name = FIELD;
				hidden.setAttribute('data-lb-turnstile-copy', '1');
				f.appendChild(hidden);
			}
			hidden.value = token;
		},
		true
	);

	// Locked links (for example a Payment Button outside the form) do nothing until the check passes.
	document.addEventListener(
		'click',
		function (e) {
			var t = e.target && e.target.closest ? e.target.closest('.lb-ts-locked') : null;
			if (!t) return;
			e.preventDefault();
			e.stopImmediatePropagation();
		},
		true
	);

	window.CanvaslyTurnstile = {
		render: render,
		lock: lock,
		/** Current token of the widget inside `root` (a form), or ''. */
		token: function (root) {
			var input = root && root.querySelector ? root.querySelector('.lb-turnstile input[name="' + FIELD + '"]') : null;
			return input ? input.value || '' : '';
		},
		/** Tokens are single-use: reset after each submission, and lock the buttons again. */
		reset: function (root) {
			var scope = root && root.querySelectorAll ? root : document;
			scope.querySelectorAll('.lb-turnstile[data-lb-widget]').forEach(function (el) {
				if (window.turnstile) {
					try {
						window.turnstile.reset(el.getAttribute('data-lb-widget'));
					} catch (e) {}
				}
				el.removeAttribute('data-lb-turnstile-state');
			});
			lockAll(scope);
			scope.querySelectorAll('input[data-lb-turnstile-copy]').forEach(function (i) {
				i.value = '';
			});
		},
	};
	window.canvaslyTurnstileReady = function () {
		render(document);
	};
	(function style() {
		if (document.getElementById('lb-ts-style')) return;
		var st = document.createElement('style');
		st.id = 'lb-ts-style';
		st.textContent = '.lb-ts-locked{opacity:.55;cursor:not-allowed!important}a.lb-ts-locked{pointer-events:auto}';
		(document.head || document.documentElement).appendChild(st);
	})();
	// Lock right away so the buttons are never clickable before Cloudflare's script arrives.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			render(document);
		});
	} else {
		render(document);
	}
	if (window.CanvaslyLiteFrontend) {
		var prev = window.CanvaslyLiteFrontend.init;
		window.CanvaslyLiteFrontend.init = function (root) {
			if (typeof prev === 'function') prev(root);
			render(root || document);
		};
	}
})();
