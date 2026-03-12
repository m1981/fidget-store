import { render } from 'vitest-browser-svelte';
import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest';
import BlikTimer from './BlikTimer.svelte';

describe('BlikTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the initial 2:00 countdown', async () => {
		const screen = render(BlikTimer, { onExpire: () => {} });
		await expect.element(screen.getByText('2:00')).toBeVisible();
	});

	it('renders the BLIK code input field', async () => {
		const screen = render(BlikTimer, { onExpire: () => {} });
		await expect.element(screen.getByRole('textbox')).toBeVisible();
	});

	it('renders the submit button as disabled initially (no code entered)', async () => {
		const screen = render(BlikTimer, { onExpire: () => {} });
		const btn = screen.getByRole('button', { name: /potwierdź/i });
		await expect.element(btn).toBeDisabled();
	});

	it('enables submit button when 6 digits are entered', async () => {
		const screen = render(BlikTimer, { onExpire: () => {} });
		const input = screen.getByRole('textbox');
		await input.fill('123456');
		const btn = screen.getByRole('button', { name: /potwierdź/i });
		await expect.element(btn).not.toBeDisabled();
	});

	it('does not enable submit with fewer than 6 digits', async () => {
		const screen = render(BlikTimer, { onExpire: () => {} });
		const input = screen.getByRole('textbox');
		await input.fill('12345');
		const btn = screen.getByRole('button', { name: /potwierdź/i });
		await expect.element(btn).toBeDisabled();
	});

	it('calls onExpire after the countdown reaches zero', async () => {
		const onExpire = vi.fn();
		render(BlikTimer, { onExpire, duration: 2 });

		vi.advanceTimersByTime(3000);
		expect(onExpire).toHaveBeenCalledOnce();
	});

	it('shows 0:00 after expiry', async () => {
		const screen = render(BlikTimer, { onExpire: () => {}, duration: 1 });
		vi.advanceTimersByTime(2000);
		await expect.element(screen.getByText('0:00')).toBeVisible();
	});

	it('accepts custom duration', async () => {
		const screen = render(BlikTimer, { onExpire: () => {}, duration: 60 });
		await expect.element(screen.getByText('1:00')).toBeVisible();
	});
});
