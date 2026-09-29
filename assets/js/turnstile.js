/*! Canvasly — Cloudflare Turnstile loader (explicit rendering). */
(function () {
	'use strict';
	var FIELD = 'cf-turnstile-response';
	var ids = [];

	function render(root) {
		if (!window.turnstile || typeof window.turnstile.render !== 'function') return;
		(root || document).querySelectorAll('.lb-turnstile[data-sitekey]').forEach(function (el) {
			if (el.getAttribute('data-lb-rendered')) return;
			el.setAttribute('data-lb-rendered', '1');
			var opts = {
				sitekey: el.getAttribute('data-sitekey'),
				theme: el.getAttribute('data-theme') || 'auto',
				size: el.getAttribute('data-size') || 'normal',
				appearance: el.getAttribute('data-appearance') || 'always',
				action: el.getAttribute('data-action') || undefined,
				'response-field-name': FIELD,
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

	// Capture phase: runs before the Canvasly form handler builds its FormData.
	document.addEventListener(
		'submit',
		function (e) {
			var f = e.target;
			if (!f || !f.matches || !f.matches('.lb-form[data-lb-form]')) return;
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

	window.CanvaslyTurnstile = {
		render: render,
		/** Tokens are single-use: reset after each submission. */
		reset: function () {
			if (!window.turnstile) return;
			ids.forEach(function (id) {
				try {
					window.turnstile.reset(id);
				} catch (e) {}
			});
			document.querySelectorAll('input[data-lb-turnstile-copy]').forEach(function (i) {
				i.value = '';
			});
		},
	};
	window.canvaslyTurnstileReady = function () {
		render(document);
	};
	if (window.turnstile) render(document);
	if (window.CanvaslyLiteFrontend) {
		var prev = window.CanvaslyLiteFrontend.init;
		window.CanvaslyLiteFrontend.init = function (root) {
			if (typeof prev === 'function') prev(root);
			render(root || document);
		};
	}
})();
