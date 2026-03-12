import { describe, it, expect } from 'vitest';
import {
	formatPln,
	formatMinutes,
	orderStatusLabel,
	scarcityLabel,
	formatCountdown
} from './formatting';

describe('formatPln', () => {
	it('formats zero grosze', () => {
		expect(formatPln(0)).toBe('0,00 zł');
	});

	it('formats 1 PLN (100 grosze)', () => {
		expect(formatPln(100)).toBe('1,00 zł');
	});

	it('formats typical price', () => {
		expect(formatPln(2990)).toBe('29,90 zł');
	});

	it('formats odd cents', () => {
		expect(formatPln(4999)).toBe('49,99 zł');
	});

	it('uses comma decimal separator (Polish convention)', () => {
		expect(formatPln(1050)).toContain(',');
		expect(formatPln(1050)).not.toMatch(/\d\.\d/);
	});

	it('always appends zł', () => {
		expect(formatPln(5000)).toMatch(/zł$/);
	});
});

describe('formatMinutes', () => {
	it('shows minutes for sub-hour duration', () => {
		expect(formatMinutes(45)).toBe('45 min');
	});

	it('shows exact hour without minutes', () => {
		expect(formatMinutes(60)).toBe('ok. 1 godz.');
		expect(formatMinutes(120)).toBe('ok. 2 godz.');
	});

	it('shows hours and remainder minutes', () => {
		expect(formatMinutes(90)).toBe('ok. 1 godz. 30 min');
		expect(formatMinutes(135)).toBe('ok. 2 godz. 15 min');
	});

	it('handles single minute', () => {
		expect(formatMinutes(1)).toBe('1 min');
	});
});

describe('orderStatusLabel', () => {
	it('maps all known statuses to Polish labels', () => {
		expect(orderStatusLabel('PENDING_PAYMENT')).toBe('Oczekuje na płatność');
		expect(orderStatusLabel('PAID')).toBe('Płatność potwierdzona');
		expect(orderStatusLabel('PRINTING')).toBe('W drukarce');
		expect(orderStatusLabel('PACKED')).toBe('Zapakowane i gotowe');
		expect(orderStatusLabel('SHIPPED')).toBe('W drodze');
		expect(orderStatusLabel('DELIVERED')).toBe('Dostarczono');
		expect(orderStatusLabel('CANCELLED')).toBe('Anulowane');
		expect(orderStatusLabel('REFUNDED')).toBe('Zwrot środków');
	});

	it('returns raw value for unknown status', () => {
		expect(orderStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
	});
});

describe('scarcityLabel', () => {
	it('returns urgency for zero remaining', () => {
		expect(scarcityLabel(0)).toBe('Ostatnie sztuki!');
	});

	it('returns urgency for negative remaining (over-allocated guard)', () => {
		expect(scarcityLabel(-10)).toBe('Ostatnie sztuki!');
	});

	it('returns near-sold-out for small remainder', () => {
		expect(scarcityLabel(60)).toBe('Prawie wyprzedane!');
		expect(scarcityLabel(119)).toBe('Prawie wyprzedane!');
	});

	it('shows hours for moderate remainder', () => {
		expect(scarcityLabel(180)).toBe('Zostało ok. 3 godz. produkcji');
	});

	it('shows available for large capacity', () => {
		expect(scarcityLabel(600)).toBe('Dostępne');
	});
});

describe('formatCountdown', () => {
	it('formats 120 seconds as 2:00', () => {
		expect(formatCountdown(120)).toBe('2:00');
	});

	it('pads seconds below 10', () => {
		expect(formatCountdown(65)).toBe('1:05');
	});

	it('formats zero as 0:00', () => {
		expect(formatCountdown(0)).toBe('0:00');
	});

	it('formats 59 seconds as 0:59', () => {
		expect(formatCountdown(59)).toBe('0:59');
	});
});
