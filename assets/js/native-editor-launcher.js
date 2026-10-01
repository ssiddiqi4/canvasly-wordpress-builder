(function () {
	'use strict';
	try {
		var cfg = window.sidcraftPageBuilderNativeEditor || {};
		var builderBase = cfg.url || '';
		var fixedId = parseInt(cfg.postId, 10) || 0;
		var label = cfg.label || 'Edit with Sidcraft Page Builder';
		var saving = false;

		function currentId() {
			try {
				if (fixedId) {
					return fixedId;
				}
				if (window.wp && wp.data && wp.data.select) {
					return parseInt(wp.data.select('core/editor').getCurrentPostId() || 0, 10) || 0;
				}
			} catch (e) {}
			return 0;
		}

		function openBuilder(id) {
			if (!id || !builderBase) {
				return;
			}
			window.location.href = builderBase + '&post_id=' + encodeURIComponent(id);
		}

		function saveAndOpen() {
			var id = currentId();
			if (id) {
				openBuilder(id);
				return;
			}
			if (saving) {
				return;
			}
			saving = true;
			try {
				if (window.wp && wp.data && wp.data.dispatch) {
					var editor = wp.data.dispatch('core/editor');
					if (editor && editor.savePost) {
						editor.savePost();
					}
				}
			} catch (e) {
				saving = false;
				return;
			}
			var tries = 0;
			var timer = setInterval(function () {
				tries++;
				var newId = currentId();
				if (newId) {
					clearInterval(timer);
					openBuilder(newId);
				} else if (tries > 80) {
					clearInterval(timer);
					saving = false;
				}
			}, 250);
		}

		function makeButton(className) {
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.id = 'lb-native-editor-button';
			btn.className = className;
			btn.textContent = label;
			btn.addEventListener('click', function (e) {
				e.preventDefault();
				saveAndOpen();
			});
			return btn;
		}

		function visible(node) {
			if (!node || !node.isConnected) {
				return false;
			}
			var rect = node.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}

		function toolbarTarget() {
			var selectors = [
				'.edit-post-header-toolbar',
				'.editor-document-tools',
				'.editor-header__toolbar',
				'.edit-post-header__toolbar',
				'.editor-header__left',
				'.editor-header__settings',
				'.edit-post-header__settings'
			];
			for (var i = 0; i < selectors.length; i++) {
				var node = document.querySelector(selectors[i]);
				if (visible(node)) {
					return node;
				}
			}
			return null;
		}

		function place(btn, target) {
			if (/(^|\s)(editor-header__settings|edit-post-header__settings)(\s|$)/.test(target.className || '')) {
				target.insertBefore(btn, target.firstChild);
			} else {
				target.appendChild(btn);
			}
		}

		function clearFallbacks() {
			var nodes = document.querySelectorAll('.lb-native-editor-launch, .lb-native-editor-float');
			for (var i = 0; i < nodes.length; i++) {
				nodes[i].remove();
			}
		}

		function addButton() {
			var existing = document.getElementById('lb-native-editor-button');
			if (existing && !visible(existing) && !existing.closest('.lb-native-editor-float')) {
				existing.remove();
				existing = null;
			}
			var target = toolbarTarget();
			if (target) {
				if (existing && existing.parentNode === target) {
					return;
				}
				var btn = existing || makeButton('components-button is-primary lb-native-editor-button');
				btn.className = 'components-button is-primary lb-native-editor-button';
				place(btn, target);
				clearFallbacks();
				return;
			}
			if (existing) {
				return;
			}
			var heading = document.querySelector('.wp-heading-inline');
			if (heading && heading.parentNode) {
				heading.parentNode.insertBefore(makeButton('page-title-action lb-native-editor-button'), heading.nextSibling);
				return;
			}
			var canvas = document.querySelector('.editor-visual-editor, .edit-post-visual-editor, .interface-interface-skeleton__content');
			if (canvas && canvas.parentNode) {
				var bar = document.createElement('div');
				bar.className = 'lb-native-editor-launch';
				bar.appendChild(makeButton('components-button is-primary is-compact lb-native-editor-button'));
				canvas.parentNode.insertBefore(bar, canvas);
				return;
			}
			if (tries >= 12 && document.body && (document.body.classList.contains('block-editor-page') || document.querySelector('#editor, .block-editor'))) {
				var float = document.createElement('div');
				float.className = 'lb-native-editor-float';
				float.appendChild(makeButton('components-button is-primary lb-native-editor-button'));
				document.body.appendChild(float);
			}
		}

		function settled() {
			var btn = document.getElementById('lb-native-editor-button');
			if (!btn || !visible(btn)) {
				return false;
			}
			if (btn.closest('.lb-native-editor-launch, .lb-native-editor-float')) {
				return !toolbarTarget();
			}
			return true;
		}

		function refresh() {
			if (!settled()) {
				addButton();
			}
		}

		var tries = 0;
		if (window.wp && wp.domReady) {
			wp.domReady(refresh);
		}
		window.addEventListener('load', refresh);
		var timer = setInterval(function () {
			tries++;
			refresh();
			if ((settled() && !document.querySelector('.lb-native-editor-launch, .lb-native-editor-float')) || tries > 240) {
				clearInterval(timer);
			}
		}, 250);
		if (window.MutationObserver && document.body) {
			var pending = false;
			var observer = new MutationObserver(function () {
				if (pending) {
					return;
				}
				pending = true;
				(window.requestAnimationFrame || setTimeout)(function () {
					pending = false;
					refresh();
				});
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}
		if (window.wp && wp.data && wp.data.subscribe) {
			wp.data.subscribe(function () {
				if (!document.getElementById('lb-native-editor-button')) {
					refresh();
				}
			});
		}
	} catch (e) {}
})();
