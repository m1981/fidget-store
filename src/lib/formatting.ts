/**
 * Shared formatting utilities — safe to import on both client and server.
 */

/**
 * Formats an integer grosze value as a Polish PLN string.
 * e.g. 2990 → "29,90 zł"
 */
export function formatPln(grosze: number): string {
	return `${(grosze / 100).toFixed(2).replace('.', ',')} zł`;
}

/**
 * Formats a print duration in minutes to a human-readable Polish string.
 * e.g. 90 → "ok. 1 godz. 30 min", 60 → "ok. 1 godz."
 */
export function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `ok. ${hours} godz. ${mins} min` : `ok. ${hours} godz.`;
}

/**
 * Returns a Polish label for a given order status enum value.
 */
export function orderStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		PENDING_PAYMENT: 'Oczekuje na płatność',
		PAID: 'Płatność potwierdzona',
		PRINTING: 'W drukarce',
		PACKED: 'Zapakowane i gotowe',
		SHIPPED: 'W drodze',
		DELIVERED: 'Dostarczono',
		CANCELLED: 'Anulowane',
		REFUNDED: 'Zwrot środków'
	};
	return labels[status] ?? status;
}

/**
 * Returns a scarcity label based on remaining drop capacity minutes.
 */
export function scarcityLabel(remainingMinutes: number): string {
	if (remainingMinutes <= 0) return 'Ostatnie sztuki!';
	if (remainingMinutes < 120) return 'Prawie wyprzedane!';
	const hours = Math.floor(remainingMinutes / 60);
	if (hours < 5) return `Zostało ok. ${hours} godz. produkcji`;
	return `Dostępne`;
}

/**
 * Formats a countdown in seconds as MM:SS.
 * e.g. 125 → "2:05"
 */
export function formatCountdown(totalSeconds: number): string {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}
