/**
 * Pure order logic — no database side-effects.
 * All DB interactions happen in +page.server.ts / +server.ts via queries.ts.
 */
import type { Drop } from './db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DropValidationResult =
	| { ok: true; drop: Drop }
	| { ok: false; reason: 'NO_ACTIVE_DROP' | 'DROP_NOT_OPEN' };

export interface CartLineInput {
	variantId: number;
	quantity: number;
}

export interface ResolvedCartLine {
	variantId: number;
	productId: number;
	quantity: number;
	pricePln: number;
	printDurationMinutes: number;
	isMystery: boolean;
}

// ─── Drop validation ──────────────────────────────────────────────────────────

/**
 * Checks whether a drop is currently open for orders.
 * The drop must be ACTIVE and the current time must be within opens_at..closes_at.
 */
export function validateDropIsOpen(drop: Drop | null | undefined, now: Date): DropValidationResult {
	if (!drop) return { ok: false, reason: 'NO_ACTIVE_DROP' };
	if (drop.status !== 'ACTIVE') return { ok: false, reason: 'DROP_NOT_OPEN' as const };

	const opensAt = new Date(drop.opens_at);
	const closesAt = new Date(drop.closes_at);

	if (now < opensAt || now > closesAt) {
		return { ok: false, reason: 'DROP_NOT_OPEN' };
	}

	return { ok: true, drop };
}

// ─── Order total ──────────────────────────────────────────────────────────────

/**
 * Computes the total order value in grosze.
 * Always uses server-side resolved prices, never client-provided values.
 */
export function computeOrderTotal(
	items: Array<{ pricePln: number; quantity: number }>
): number {
	return items.reduce((sum, item) => sum + item.pricePln * item.quantity, 0);
}

// ─── Soft lock helpers ────────────────────────────────────────────────────────

/** Backend soft lock duration: 3 minutes (longer than the 2-min UI timer) */
export const SOFT_LOCK_DURATION_MS = 3 * 60 * 1000;

/** Returns the expiry timestamp for a new soft lock */
export function buildSoftLockExpiry(now: Date): Date {
	return new Date(now.getTime() + SOFT_LOCK_DURATION_MS);
}

/** Returns true if a soft lock is still active (not yet expired) */
export function isSoftLockActive(lockedUntil: Date | null | undefined, now: Date): boolean {
	if (!lockedUntil) return false;
	return new Date(lockedUntil) > now;
}

// ─── Cart minutes calculation (for use with capacity engine) ──────────────────

/**
 * Resolves print duration minutes for a cart line.
 * Mystery box items use a fixed duration from global settings.
 */
export function resolveItemMinutes(
	printDurationMinutes: number,
	isMystery: boolean,
	mysteryBoxMinutes: number
): number {
	return isMystery ? mysteryBoxMinutes : printDurationMinutes;
}
