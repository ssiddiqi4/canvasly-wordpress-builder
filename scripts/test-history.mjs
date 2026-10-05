import {
	HISTORY_LIMIT,
	historySnap,
	historyLabel,
	historyTarget,
	makeHistoryEntry,
	jumpUndoCount,
	jumpRedoCount,
	parseHistoryState
} from '../src/editor/history.js';

let failed = 0;
function assert(cond, msg) {
	if (cond) {
		console.log('ok', msg);
		return;
	}
	failed++;
	console.log('FAIL', msg);
}

assert(HISTORY_LIMIT === 40, 'undo snapshots stay capped');
const snap = '{"version":"2.6","root":[],"settings":{}}';
const entry = makeHistoryEntry(snap, 'Added Heading', 'n_1');
assert(entry.s === snap && entry.label === 'Added Heading' && entry.target === 'n_1', 'makeHistoryEntry');
assert(historySnap(entry) === snap, 'historySnap object');
assert(historySnap(snap) === snap, 'historySnap string');
assert(historyLabel(entry) === 'Added Heading', 'historyLabel');
assert(historyLabel('raw') === 'Change', 'historyLabel fallback');
assert(historyTarget(entry) === 'n_1', 'historyTarget');
assert(parseHistoryState(entry).version === '2.6', 'parseHistoryState');
assert(parseHistoryState('not-json') === null, 'parseHistoryState invalid');

assert(jumpUndoCount(3, 2) === 0, 'newest action is already current');
assert(jumpUndoCount(3, 1) === 1, 'previous action undoes once');
assert(jumpUndoCount(3, 0) === 2, 'oldest action undoes to after first change');
assert(jumpRedoCount(0) === 1, 'first future redos once');
assert(jumpRedoCount(2) === 3, 'oldest future redos three times');

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
