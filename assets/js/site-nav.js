/* Site Menu hamburger. Toggles .is-open and aria-expanded. No jQuery.
   Also opens a dropdown from a button or link whose address is #open-menu-<item-name>
   (Settings > General > Open a menu from a button). */
(function () {
	'use strict';

	function breakpoint(nav) {
		var bp = parseInt(nav.getAttribute('data-breakpoint'), 10);
		if (!bp || bp < 320) bp = 782;
		return bp;
	}

	function mobile(nav) {
		if (!window.matchMedia) return false;
		return window.matchMedia('(max-width: ' + breakpoint(nav) + 'px)').matches;
	}

	function dropdown(nav) {
		return nav.classList.contains('lb-site-nav--dropdown');
	}

	function sync(nav) {
		var btn = nav.querySelector('.lb-site-nav__toggle');
		if (!btn) return;
		var isMobile = mobile(nav);
		nav.classList.toggle('is-mobile', isMobile);
		if (!isMobile && !dropdown(nav)) {
			nav.classList.remove('is-open');
			btn.setAttribute('aria-expanded', 'false');
		}
	}

	function syncAll() {
		var nodes = document.querySelectorAll('.lb-site-nav');
		for (var i = 0; i < nodes.length; i++) sync(nodes[i]);
	}

	document.addEventListener('click', function (event) {
		var btn = event.target && event.target.closest ? event.target.closest('.lb-site-nav__toggle') : null;
		if (!btn) return;
		var nav = btn.closest('.lb-site-nav');
		if (!nav || (!mobile(nav) && !dropdown(nav))) return;
		var open = !nav.classList.contains('is-open');
		nav.classList.toggle('is-open', open);
		btn.setAttribute('aria-expanded', open ? 'true' : 'false');
	});

	function slug(text) {
		return String(text || '')
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	// A link to #open-menu-buy-tickets scrolls to the top and opens the "Buy Tickets" dropdown.
	document.addEventListener('click', function (event) {
		var cfg = window.SidcraftPageBuilderMenuOpen;
		if (!cfg || !cfg.enabled || !event.target || !event.target.closest) return;
		var link = event.target.closest('a[href*="#open-menu-"]');
		if (!link) return;
		var hash = (link.getAttribute('href') || '').split('#')[1] || '';
		if (hash.indexOf('open-menu-') !== 0) return;
		var wanted = slug(decodeURIComponent(hash.slice(10)));
		if (!wanted) return;
		var item = null;
		var parents = document.querySelectorAll('.lb-site-nav__item--has-children > a');
		for (var i = 0; i < parents.length && !item; i++) {
			if (slug(parents[i].textContent) === wanted) item = parents[i];
		}
		if (!item) return; // no such menu item: leave the link alone.
		event.preventDefault();
		var nav = item.closest('.lb-site-nav');
		var toggle = nav ? nav.querySelector('.lb-site-nav__toggle') : null;
		if (toggle && toggle.offsetParent !== null && !nav.classList.contains('is-open') && (mobile(nav) || dropdown(nav))) toggle.click();
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (cfg.scroll) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
		window.setTimeout(function () {
			item.focus({ preventScroll: true }); // keeps the dropdown open while it has focus.
		}, cfg.scroll && !reduce ? 400 : 0);
	});

	document.addEventListener('keydown', function (event) {
		if (event.key !== 'Escape') return;
		var nodes = document.querySelectorAll('.lb-site-nav.is-open');
		for (var i = 0; i < nodes.length; i++) {
			nodes[i].classList.remove('is-open');
			var btn = nodes[i].querySelector('.lb-site-nav__toggle');
			if (!btn) continue;
			btn.setAttribute('aria-expanded', 'false');
			btn.focus();
		}
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', syncAll);
	} else {
		syncAll();
	}
	window.addEventListener('resize', syncAll);
})();
