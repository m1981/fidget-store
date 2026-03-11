/**
 * Capacity Engine — pure functions with no database side-effects.
 *
 * All DB reads/writes happen in +page.server.ts or +server.ts files.
 * These functions are the single source of truth for capacity math and ETA logic.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveWindow {
	/** Hour of day (0–23) when printing starts */
	startHour: number;
	/** Hour of day (0–23) when printing stops for the day */
	endHour: number;
	/** Cool-down + bed-scrape time between print jobs, in minutes */
	bufferMinutes: number;
}

export interface CartItem {
	printDurationMinutes: number;
	quantity: number;
}

export type CapacityCheckResult = { ok: true } | { ok: false; reason: 'INSUFFICIENT_CAPACITY' };

export type GabarytRank = { A: 0; B: 1; C: 2 };
export type InpostGabaryt = keyof GabarytRank;

// ─── Capacity ─────────────────────────────────────────────────────────────────

/**
 * Returns total production minutes required for a cart, including turnaround buffer per item.
 * Mystery Box items should be passed with `printDurationMinutes = mysteryBoxMinutes`.
 */
export function calculateCartMinutes(items: CartItem[], bufferMinutes: number): number {
	return items.reduce((total, item) => {
		return total + (item.printDurationMinutes + bufferMinutes) * item.quantity;
	}, 0);
}

/**
 * Checks whether a drop has enough remaining capacity for a cart.
 */
export function checkCapacity(
	totalCapacityMinutes: number,
	allocatedMinutes: number,
	cartMinutes: number
): CapacityCheckResult {
	if (allocatedMinutes + cartMinutes > totalCapacityMinutes) {
		return { ok: false, reason: 'INSUFFICIENT_CAPACITY' };
	}
	return { ok: true };
}

/**
 * Returns the new `allocated_minutes` value after a soft lock is applied.
 * Performs the capacity check atomically — caller must wrap in a DB transaction.
 */
export function applySoftLock(
	totalCapacityMinutes: number,
	allocatedMinutes: number,
	minutesToLock: number
): { ok: true; newAllocated: number } | { ok: false; reason: 'INSUFFICIENT_CAPACITY' } {
	const check = checkCapacity(totalCapacityMinutes, allocatedMinutes, minutesToLock);
	if (!check.ok) return check;
	return { ok: true, newAllocated: allocatedMinutes + minutesToLock };
}

/**
 * Returns the new `allocated_minutes` after releasing a soft lock (cancellation/timeout).
 * Clamps to 0 to guard against double-release bugs.
 */
export function releaseSoftLock(allocatedMinutes: number, minutesToRelease: number): number {
	return Math.max(0, allocatedMinutes - minutesToRelease);
}

// ─── ETA Calculation ──────────────────────────────────────────────────────────

/**
 * Projects `minutesNeeded` onto the printer's active window, accounting for
 * overnight gaps (printer cannot run outside startHour–endHour).
 *
 * Returns the estimated completion Date.
 *
 * @param from    - The reference point (e.g. now, or drop open time)
 * @param minutesNeeded - Total production minutes to schedule
 * @param window  - Printer active window config
 */
export function calculateEta(from: Date, minutesNeeded: number, window: ActiveWindow): Date {
	const { startHour, endHour } = window;
	const dailyWorkMinutes = (endHour - startHour) * 60;

	if (dailyWorkMinutes <= 0) {
		throw new Error('Active window endHour must be greater than startHour');
	}
	if (minutesNeeded < 0) {
		throw new Error('minutesNeeded must be non-negative');
	}

	// Advance cursor to the next available work moment
	let cursor = new Date(from);
	const fromHour = cursor.getHours() + cursor.getMinutes() / 60;

	if (fromHour < startHour) {
		// Before window opens today — jump to window start
		cursor.setHours(startHour, 0, 0, 0);
	} else if (fromHour >= endHour) {
		// After window closed today — jump to next day's window start
		cursor.setDate(cursor.getDate() + 1);
		cursor.setHours(startHour, 0, 0, 0);
	}

	let remaining = minutesNeeded;

	while (remaining > 0) {
		// Minutes available until end of today's window
		const windowEnd = new Date(cursor);
		windowEnd.setHours(endHour, 0, 0, 0);
		const minutesLeftToday = (windowEnd.getTime() - cursor.getTime()) / 60_000;

		if (remaining <= minutesLeftToday) {
			cursor = new Date(cursor.getTime() + remaining * 60_000);
			remaining = 0;
		} else {
			remaining -= minutesLeftToday;
			cursor.setDate(cursor.getDate() + 1);
			cursor.setHours(startHour, 0, 0, 0);
		}
	}

	return cursor;
}

// ─── InPost Gabaryt ───────────────────────────────────────────────────────────

const GABARYT_RANK: Record<InpostGabaryt, number> = { A: 0, B: 1, C: 2 };
const GABARYT_BY_RANK: InpostGabaryt[] = ['A', 'B', 'C'];

/**
 * Returns the largest (most expensive) InPost parcel size required for an order.
 * Used at fulfillment time to auto-suggest the correct parcel size.
 */
export function calculateRequiredGabaryt(gabarytList: InpostGabaryt[]): InpostGabaryt {
	if (gabarytList.length === 0) {
		return 'A';
	}
	const maxRank = Math.max(...gabarytList.map((g) => GABARYT_RANK[g]));
	return GABARYT_BY_RANK[maxRank];
}
