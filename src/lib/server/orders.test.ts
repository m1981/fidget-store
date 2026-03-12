import { describe, it, expect } from 'vitest';
import {
	validateDropIsOpen,
	computeOrderTotal,
	buildSoftLockExpiry,
	isSoftLockActive,
	resolveItemMinutes,
	SOFT_LOCK_DURATION_MS
} from './orders';
import type { Drop } from './db/schema';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const NOW = new Date('2026-03-12T10:00:00Z');

function makeDrop(overrides: Partial<Drop> = {}): Drop {
	return {
		id: 1,
		status: 'ACTIVE',
		opens_at: new Date('2026-03-12T08:00:00Z'),
		closes_at: new Date('2026-03-12T20:00:00Z'),
		total_capacity_minutes: 600,
		allocated_minutes: 0,
		created_at: new Date('2026-03-10T00:00:00Z'),
		...overrides
	};
}

// ─── validateDropIsOpen ───────────────────────────────────────────────────────

describe('validateDropIsOpen', () => {
	it('returns ok when drop is active and within window', () => {
		const result = validateDropIsOpen(makeDrop(), NOW);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.drop.id).toBe(1);
		}
	});

	it('rejects null drop', () => {
		expect(validateDropIsOpen(null, NOW)).toEqual({
			ok: false,
			reason: 'NO_ACTIVE_DROP'
		});
	});

	it('rejects undefined drop', () => {
		expect(validateDropIsOpen(undefined, NOW)).toEqual({
			ok: false,
			reason: 'NO_ACTIVE_DROP'
		});
	});

	it('rejects DRAFT drop', () => {
		expect(validateDropIsOpen(makeDrop({ status: 'DRAFT' }), NOW)).toEqual({
			ok: false,
			reason: 'DROP_NOT_OPEN'
		});
	});

	it('rejects CLOSED drop', () => {
		expect(validateDropIsOpen(makeDrop({ status: 'CLOSED' }), NOW)).toEqual({
			ok: false,
			reason: 'DROP_NOT_OPEN'
		});
	});

	it('rejects when current time is before opens_at', () => {
		const earlyNow = new Date('2026-03-12T07:00:00Z');
		expect(validateDropIsOpen(makeDrop(), earlyNow)).toEqual({
			ok: false,
			reason: 'DROP_NOT_OPEN'
		});
	});

	it('rejects when current time is after closes_at', () => {
		const lateNow = new Date('2026-03-12T21:00:00Z');
		expect(validateDropIsOpen(makeDrop(), lateNow)).toEqual({
			ok: false,
			reason: 'DROP_NOT_OPEN'
		});
	});

	it('accepts at exact opens_at boundary', () => {
		const exactly = new Date('2026-03-12T08:00:00Z');
		expect(validateDropIsOpen(makeDrop(), exactly).ok).toBe(true);
	});

	it('accepts at exact closes_at boundary', () => {
		const exactly = new Date('2026-03-12T20:00:00Z');
		expect(validateDropIsOpen(makeDrop(), exactly).ok).toBe(true);
	});
});

// ─── computeOrderTotal ────────────────────────────────────────────────────────

describe('computeOrderTotal', () => {
	it('returns 0 for empty items', () => {
		expect(computeOrderTotal([])).toBe(0);
	});

	it('multiplies price by quantity for single item', () => {
		expect(computeOrderTotal([{ pricePln: 2990, quantity: 2 }])).toBe(5980);
	});

	it('sums multiple items', () => {
		expect(
			computeOrderTotal([
				{ pricePln: 2990, quantity: 1 },
				{ pricePln: 1500, quantity: 3 }
			])
		).toBe(2990 + 4500); // 7490
	});

	it('handles quantity of 1', () => {
		expect(computeOrderTotal([{ pricePln: 4999, quantity: 1 }])).toBe(4999);
	});
});

// ─── buildSoftLockExpiry ──────────────────────────────────────────────────────

describe('buildSoftLockExpiry', () => {
	it('returns now + 3 minutes', () => {
		const now = new Date('2026-03-12T10:00:00Z');
		const expiry = buildSoftLockExpiry(now);
		expect(expiry.getTime()).toBe(now.getTime() + SOFT_LOCK_DURATION_MS);
	});

	it('SOFT_LOCK_DURATION_MS is 3 minutes', () => {
		expect(SOFT_LOCK_DURATION_MS).toBe(3 * 60 * 1000);
	});
});

// ─── isSoftLockActive ─────────────────────────────────────────────────────────

describe('isSoftLockActive', () => {
	it('returns false for null lockedUntil', () => {
		expect(isSoftLockActive(null, NOW)).toBe(false);
	});

	it('returns false for undefined lockedUntil', () => {
		expect(isSoftLockActive(undefined, NOW)).toBe(false);
	});

	it('returns true when lock has not expired', () => {
		const future = new Date(NOW.getTime() + 60_000);
		expect(isSoftLockActive(future, NOW)).toBe(true);
	});

	it('returns false when lock has expired', () => {
		const past = new Date(NOW.getTime() - 1000);
		expect(isSoftLockActive(past, NOW)).toBe(false);
	});

	it('returns false at exact expiry moment', () => {
		expect(isSoftLockActive(NOW, NOW)).toBe(false);
	});
});

// ─── resolveItemMinutes ───────────────────────────────────────────────────────

describe('resolveItemMinutes', () => {
	it('returns print duration for normal items', () => {
		expect(resolveItemMinutes(90, false, 120)).toBe(90);
	});

	it('returns mystery box minutes for mystery items, ignoring print duration', () => {
		expect(resolveItemMinutes(0, true, 120)).toBe(120);
	});

	it('mystery box minutes override even non-zero print duration', () => {
		expect(resolveItemMinutes(999, true, 120)).toBe(120);
	});
});
