/**
 * Gutenberg editor UI for the sidcraft-syntex/template block.
 * No build step: uses wp.element.createElement.
 */
(function (wp) {
	'use strict';
	if (!wp || !wp.blocks || !wp.element) return;

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var registerBlockType = wp.blocks.registerBlockType;
	var InspectorControls = (wp.blockEditor && wp.blockEditor.InspectorControls) || (wp.editor && wp.editor.InspectorControls);
	var useBlockProps = (wp.blockEditor && wp.blockEditor.useBlockProps) || function () { return {}; };
	var components = wp.components || {};
	var SelectControl = components.SelectControl;
	var PanelBody = components.PanelBody;
	var Placeholder = components.Placeholder;
	var Spinner = components.Spinner;
	var Disabled = components.Disabled;
	var Notice = components.Notice;
	var __ = (wp.i18n && wp.i18n.__) || function (s) { return s; };
	var apiFetch = wp.apiFetch;
	var ServerSideRender = wp.serverSideRender || (wp.components && wp.components.ServerSideRender);

	function optionsFrom(items) {
		var opts = [{ label: __('Select a template', 'sidcraft-syntex'), value: 0 }];
		(items || []).forEach(function (item) {
			if (!item || !item.id) return;
			var label = item.title || ('#' + item.id);
			if (item.type_label) label += ' (' + item.type_label + ')';
			opts.push({ label: label, value: Number(item.id) });
		});
		return opts;
	}

	function findItem(items, id) {
		id = Number(id) || 0;
		if (!id || !items) return null;
		for (var i = 0; i < items.length; i++) {
			if (Number(items[i].id) === id) return items[i];
		}
		return null;
	}

	function Edit(props) {
		var attributes = props.attributes || {};
		var setAttributes = props.setAttributes;
		var id = Number(attributes.id) || 0;
		var blockProps = useBlockProps({ className: 'lb-block-template' });
		var state = useState(null);
		var items = state[0];
		var setItems = state[1];
		var errState = useState('');
		var error = errState[0];
		var setError = errState[1];

		useEffect(function () {
			if (!apiFetch) {
				setItems([]);
				return;
			}
			var cancelled = false;
			apiFetch({ path: '/sidcraft-syntex/v1/templates/picker' })
				.then(function (list) {
					if (!cancelled) setItems(Array.isArray(list) ? list : []);
				})
				.catch(function () {
					if (!cancelled) {
						setItems([]);
						setError(__('Could not load templates.', 'sidcraft-syntex'));
					}
				});
			return function () { cancelled = true; };
		}, []);

		var selected = findItem(items, id);
		var inspector = InspectorControls ? el(InspectorControls, {},
			el(PanelBody, { title: __('Template', 'sidcraft-syntex'), initialOpen: true },
				items === null
					? el(Spinner)
					: el(SelectControl, {
						label: __('Saved Template', 'sidcraft-syntex'),
						value: id,
						options: optionsFrom(items),
						onChange: function (value) {
							setAttributes({ id: parseInt(value, 10) || 0 });
						},
						help: __('Choose a saved Sidcraft Syntex template. Its CSS and scripts load on the frontend.', 'sidcraft-syntex')
					})
			)
		) : null;

		var picker = items === null
			? el(Spinner)
			: el(SelectControl, {
				label: __('Saved Template', 'sidcraft-syntex'),
				value: id,
				options: optionsFrom(items),
				onChange: function (value) {
					setAttributes({ id: parseInt(value, 10) || 0 });
				}
			});

		if (!id) {
			return el('div', blockProps,
				inspector,
				el(Placeholder, {
					icon: 'layout',
					label: __('Sidcraft Syntex Template', 'sidcraft-syntex'),
					className: 'lb-block-template-placeholder'
				},
					error ? el(Notice, { status: 'warning', isDismissible: false }, error) : null,
					el('p', {}, __('Select a saved template to insert it into this post.', 'sidcraft-syntex')),
					picker
				)
			);
		}

		var preview = selected
			? el('figure', { className: 'lb-block-template-preview' },
				selected.thumbnail ? el('img', { src: selected.thumbnail, alt: selected.title || '' }) : null,
				el('figcaption', {},
					el('strong', {}, selected.title || ('#' + id)),
					selected.type_label ? el('small', {}, selected.type_label) : null,
					selected.shortcode ? el('code', {}, selected.shortcode) : null
				)
			)
			: el('p', { className: 'lb-block-template-placeholder' }, __('Template #%s', 'sidcraft-syntex').replace('%s', String(id)));

		var live = ServerSideRender
			? el('div', { className: 'lb-block-template-live' },
				Disabled
					? el(Disabled, {}, el(ServerSideRender, { block: 'sidcraft-syntex/template', attributes: { id: id } }))
					: el(ServerSideRender, { block: 'sidcraft-syntex/template', attributes: { id: id } })
			)
			: null;

		return el(Fragment, {},
			el('div', blockProps, inspector, preview, live)
		);
	}

	registerBlockType('sidcraft-syntex/template', {
		edit: Edit,
		save: function () { return null; }
	});
})(window.wp);
