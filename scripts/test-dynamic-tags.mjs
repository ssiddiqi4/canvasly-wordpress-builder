import {
	dynEligible,
	dynCategories,
	dynTagsFor,
	dynHost,
	dynPreview,
	dynApplyPreviews
} from '../src/editor/dynamic-tags.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(dynEligible({ type: 'text', dynamic: true }), 'true flag is eligible');
assert(dynEligible({ type: 'text', dynamic: { active: true, categories: ['text'] } }), 'active object is eligible');
assert(!dynEligible({ type: 'text', hidden: true, dynamic: true }), 'hidden controls are not eligible');
assert(!dynEligible({ type: 'text' }), 'missing flag is not eligible');
assert(!dynEligible({ type: 'text', dynamic: { active: false, categories: ['text'] } }), 'active false is not eligible');

assert(dynCategories({ type: 'url' }).join(',') === 'url,text', 'url control categories');
assert(dynCategories({ type: 'media' }).join(',') === 'image', 'media control categories');
assert(dynCategories({ type: 'wysiwyg', dynamic: { categories: ['html'] } }).join(',') === 'html', 'explicit categories win');

const tags = [
	{ name: 'post_title', categories: ['text'] },
	{ name: 'post_url', categories: ['url', 'text'] },
	{ name: 'post_featured_image', categories: ['image', 'url'] }
];
assert(dynTagsFor({ type: 'text', dynamic: true }, tags).map((t) => t.name).join(',') === 'post_title,post_url', 'text control sees text tags');
assert(dynTagsFor({ type: 'media', dynamic: true }, tags).map((t) => t.name).join(',') === 'post_featured_image', 'media control sees image tags');

assert(dynHost({ text: 'Hi' }, 'text').key === 'text', 'top-level host');
assert(dynHost({ items: [{ title: 'A' }] }, 'items.0.title').key === 'title', 'repeater item host');
assert(dynHost({ items: [{ title: 'A' }] }, 'items.0.title').host.title === 'A', 'repeater host is the item');
assert(dynHost({ width: { desktop: '10' } }, 'width.desktop') === null, 'breakpoint suffix is not bindable');

const catalog = {
	tags,
	previews: { post_title: 'Hello Title', post_featured_image: 'https://example.test/feat.jpg' }
};
assert(dynPreview({ tag: 'post_title', before: 'Title: ', after: '!' }, catalog) === 'Title: Hello Title!', 'preview wraps before/after');
assert(dynPreview({ tag: 'post_title', fallback: 'Untitled' }, { tags, previews: {} }) === 'Untitled', 'preview uses fallback when empty');
assert(dynPreview({ tag: 'post_meta', key: 'price', before: '$' }, catalog) === '${price}', 'post meta preview shows the key');
assert(dynPreview({ tag: 'shortcode', shortcode: '[gallery]' }, catalog) === '[gallery]', 'shortcode preview shows the code');

const applied = dynApplyPreviews({
	text: 'static',
	_dynamic: { text: { tag: 'post_title', before: '', after: '', fallback: '' } }
}, catalog);
assert(applied.text === 'Hello Title', 'apply previews replaces bound text');

const img = dynApplyPreviews({
	image_id: 4,
	image_url: '',
	_dynamic: { image_id: { tag: 'post_featured_image' } }
}, catalog);
assert(img.image_id === 0 && img.image_url === 'https://example.test/feat.jpg', 'image binding fills companion url');

const nested = dynApplyPreviews({
	items: [{ title: 'A', _dynamic: { title: { tag: 'post_title' } } }]
}, catalog);
assert(nested.items[0].title === 'Hello Title', 'apply previews walks repeater items');

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
