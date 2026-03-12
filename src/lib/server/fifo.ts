/**
 * FIFO print queue allocation logic.
 *
 * When a Maker taps [+1] on a variant, we find the oldest PAID order
 * containing that variant (with a PENDING item) and mark it PRINTED.
 *
 * When all items in an order are PRINTED, the order advances to PACKED.
 *
 * Business rules:
 * - Only orders in PRINTING status are eligible (Drop must be CLOSED first)
 * - FIFO = oldest created_at first
 * - Undo window: a PRINTED item may be reverted to PENDING within UNDO_WINDOW_MS
 */

export const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns true if the item was printed within the undo window.
 */
export function isWithinUndoWindow(printedAt: Date, now: Date): boolean {
	return now.getTime() - printedAt.getTime() <= UNDO_WINDOW_MS;
}

/**
 * Pure function: given a list of item statuses for an order,
 * returns true if all items are PRINTED (order should advance to PACKED).
 */
export function areAllItemsPrinted(itemStatuses: string[]): boolean {
	if (itemStatuses.length === 0) return false;
	return itemStatuses.every((s) => s === 'PRINTED');
}
