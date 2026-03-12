import { describe, it, expect } from 'vitest';
import { isWithinUndoWindow, areAllItemsPrinted, UNDO_WINDOW_MS } from './fifo';

describe('isWithinUndoWindow', () => {
	it('returns true when printed just now', () => {
		const now = new Date();
		const printedAt = new Date(now.getTime() - 10_000); // 10 seconds ago
		expect(isWithinUndoWindow(printedAt, now)).toBe(true);
	});

	it('returns true at exactly the boundary', () => {
		const now = new Date();
		const printedAt = new Date(now.getTime() - UNDO_WINDOW_MS);
		expect(isWithinUndoWindow(printedAt, now)).toBe(true);
	});

	it('returns false when outside the undo window', () => {
		const now = new Date();
		const printedAt = new Date(now.getTime() - UNDO_WINDOW_MS - 1);
		expect(isWithinUndoWindow(printedAt, now)).toBe(false);
	});
});

describe('areAllItemsPrinted', () => {
	it('returns true when all items are PRINTED', () => {
		expect(areAllItemsPrinted(['PRINTED', 'PRINTED', 'PRINTED'])).toBe(true);
	});

	it('returns false when any item is PENDING', () => {
		expect(areAllItemsPrinted(['PRINTED', 'PENDING', 'PRINTED'])).toBe(false);
	});

	it('returns false for empty list', () => {
		expect(areAllItemsPrinted([])).toBe(false);
	});

	it('returns false for single PENDING item', () => {
		expect(areAllItemsPrinted(['PENDING'])).toBe(false);
	});
});
