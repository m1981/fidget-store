import { describe, it, expect } from 'vitest';
import {
	calculateCartMinutes,
	checkCapacity,
	applySoftLock,
	releaseSoftLock,
	calculateEta,
	calculateRequiredGabaryt,
	type ActiveWindow,
	type CartItem
} from './capacity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WINDOW: ActiveWindow = { startHour: 8, endHour: 18, bufferMinutes: 30 };

/** Returns a Date at a specific hour on 2026-03-12 (Warsaw time assumed local) */
function at(hour: number, minute = 0): Date {
	return new Date(2026, 2, 12, hour, minute, 0, 0); // month is 0-indexed
}

// ─── calculateCartMinutes ─────────────────────────────────────────────────────

describe('calculateCartMinutes', () => {
	it('returns 0 for an empty cart', () => {
		expect(calculateCartMinutes([], 30)).toBe(0);
	});

	it('adds print duration + buffer for a single item', () => {
		const items: CartItem[] = [{ printDurationMinutes: 120, quantity: 1 }];
		// 120 + 30 = 150
		expect(calculateCartMinutes(items, 30)).toBe(150);
	});

	it('multiplies by quantity', () => {
		const items: CartItem[] = [{ printDurationMinutes: 60, quantity: 3 }];
		// (60 + 30) * 3 = 270
		expect(calculateCartMinutes(items, 30)).toBe(270);
	});

	it('sums multiple items with different durations', () => {
		const items: CartItem[] = [
			{ printDurationMinutes: 60, quantity: 2 }, // (60+30)*2 = 180
			{ printDurationMinutes: 120, quantity: 1 } // (120+30)*1 = 150
		];
		expect(calculateCartMinutes(items, 30)).toBe(330);
	});

	it('uses mystery_box_minutes when passed as print duration', () => {
		// Mystery box items should be pre-filled with mystery_box_minutes by the caller
		const items: CartItem[] = [{ printDurationMinutes: 120, quantity: 1 }];
		expect(calculateCartMinutes(items, 30)).toBe(150);
	});

	it('respects zero buffer', () => {
		const items: CartItem[] = [{ printDurationMinutes: 45, quantity: 2 }];
		expect(calculateCartMinutes(items, 0)).toBe(90);
	});
});

// ─── checkCapacity ────────────────────────────────────────────────────────────

describe('checkCapacity', () => {
	it('returns ok when there is sufficient capacity', () => {
		expect(checkCapacity(600, 200, 300)).toEqual({ ok: true });
	});

	it('returns ok for exact fit (edge case)', () => {
		expect(checkCapacity(600, 300, 300)).toEqual({ ok: true });
	});

	it('returns INSUFFICIENT_CAPACITY when cart exceeds remaining', () => {
		expect(checkCapacity(600, 400, 300)).toEqual({
			ok: false,
			reason: 'INSUFFICIENT_CAPACITY'
		});
	});

	it('returns INSUFFICIENT_CAPACITY when drop is fully allocated', () => {
		expect(checkCapacity(600, 600, 1)).toEqual({
			ok: false,
			reason: 'INSUFFICIENT_CAPACITY'
		});
	});

	it('returns ok for zero cart minutes (no-op checkout)', () => {
		expect(checkCapacity(600, 600, 0)).toEqual({ ok: true });
	});
});

// ─── applySoftLock ────────────────────────────────────────────────────────────

describe('applySoftLock', () => {
	it('returns new allocated amount on success', () => {
		const result = applySoftLock(600, 200, 150);
		expect(result).toEqual({ ok: true, newAllocated: 350 });
	});

	it('allows exact fit', () => {
		const result = applySoftLock(600, 450, 150);
		expect(result).toEqual({ ok: true, newAllocated: 600 });
	});

	it('rejects when exceeding capacity', () => {
		const result = applySoftLock(600, 500, 150);
		expect(result).toEqual({ ok: false, reason: 'INSUFFICIENT_CAPACITY' });
	});

	it('does not mutate inputs (pure function)', () => {
		applySoftLock(600, 200, 150);
		// If applySoftLock were impure it would change external state — this just verifies
		// the function can be called multiple times without side effects
		const second = applySoftLock(600, 200, 150);
		expect(second).toEqual({ ok: true, newAllocated: 350 });
	});
});

// ─── releaseSoftLock ──────────────────────────────────────────────────────────

describe('releaseSoftLock', () => {
	it('subtracts locked minutes from allocated', () => {
		expect(releaseSoftLock(350, 150)).toBe(200);
	});

	it('clamps to 0 on double-release (guard against bugs)', () => {
		expect(releaseSoftLock(100, 200)).toBe(0);
	});

	it('handles exact release to 0', () => {
		expect(releaseSoftLock(150, 150)).toBe(0);
	});
});

// ─── calculateEta ─────────────────────────────────────────────────────────────

describe('calculateEta', () => {
	it('returns from-time unchanged for zero minutes', () => {
		const from = at(10);
		const eta = calculateEta(from, 0, WINDOW);
		expect(eta).toEqual(from);
	});

	it('projects minutes within the same active window', () => {
		const from = at(10); // 10:00
		const eta = calculateEta(from, 60, WINDOW); // 60 minutes
		expect(eta).toEqual(at(11)); // 11:00
	});

	it('spans multiple minutes correctly within window', () => {
		const from = at(8); // 08:00 — start of window
		const eta = calculateEta(from, 600, WINDOW); // 600 min = 10 hours
		// 08:00 + 600 min = 18:00 exactly
		expect(eta).toEqual(at(18));
	});

	it('rolls over to next day when work overflows end of window', () => {
		const from = at(16); // 16:00 — 2 hours left today
		// 2h = 120 min left today; need 180 min total → 60 min overflow to next day
		const eta = calculateEta(from, 180, WINDOW);
		const expected = new Date(2026, 2, 13, 9, 0, 0, 0); // 09:00 next day
		expect(eta).toEqual(expected);
	});

	it('handles a call made before the window opens (jumps to window start)', () => {
		const from = at(6); // 06:00 — before 08:00 window
		const eta = calculateEta(from, 120, WINDOW); // 2 hours of work
		expect(eta).toEqual(at(10)); // 08:00 + 120 min = 10:00
	});

	it('handles a call made after the window closes (jumps to next day)', () => {
		const from = at(20); // 20:00 — after 18:00 window
		const eta = calculateEta(from, 60, WINDOW); // 1 hour of work
		const expected = new Date(2026, 2, 13, 9, 0, 0, 0); // 08:00 + 60min = 09:00 next day
		expect(eta).toEqual(expected);
	});

	it('handles multi-day overflow correctly', () => {
		const from = at(8); // 08:00 — full day available
		const dailyMinutes = (18 - 8) * 60; // 600 min
		// Needs 2.5 days: 600 + 600 + 300 min
		const eta = calculateEta(from, dailyMinutes * 2 + 300, WINDOW);
		// Day 1: 600 min → 18:00
		// Day 2: 600 min → 18:00
		// Day 3: 300 min → 08:00 + 300 = 13:00
		const expected = new Date(2026, 2, 14, 13, 0, 0, 0);
		expect(eta).toEqual(expected);
	});

	it('throws for invalid window (endHour <= startHour)', () => {
		expect(() =>
			calculateEta(at(10), 60, { startHour: 18, endHour: 8, bufferMinutes: 30 })
		).toThrow();
	});

	it('throws for negative minutesNeeded', () => {
		expect(() => calculateEta(at(10), -1, WINDOW)).toThrow();
	});
});

// ─── calculateRequiredGabaryt ─────────────────────────────────────────────────

describe('calculateRequiredGabaryt', () => {
	it('defaults to A for empty list', () => {
		expect(calculateRequiredGabaryt([])).toBe('A');
	});

	it('returns A when all items are A', () => {
		expect(calculateRequiredGabaryt(['A', 'A', 'A'])).toBe('A');
	});

	it('returns B when any item is B', () => {
		expect(calculateRequiredGabaryt(['A', 'B', 'A'])).toBe('B');
	});

	it('returns C when any item is C', () => {
		expect(calculateRequiredGabaryt(['A', 'B', 'C'])).toBe('C');
	});

	it('returns C even if only one item is C', () => {
		expect(calculateRequiredGabaryt(['A', 'A', 'C', 'B'])).toBe('C');
	});

	it('returns single item gabaryt correctly', () => {
		expect(calculateRequiredGabaryt(['B'])).toBe('B');
	});
});
