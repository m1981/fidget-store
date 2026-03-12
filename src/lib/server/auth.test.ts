import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createAdminSession, verifyAdminSession, destroyAdminSession } from './auth';

// ─── Password ─────────────────────────────────────────────────────────────────

describe('hashPassword / verifyPassword', () => {
	it('verifies correct password', async () => {
		const hash = await hashPassword('correct-horse-battery-staple');
		expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
	});

	it('rejects wrong password', async () => {
		const hash = await hashPassword('correct-horse-battery-staple');
		expect(await verifyPassword('wrong-password', hash)).toBe(false);
	});

	it('produces different hashes for same password (random salt)', async () => {
		const h1 = await hashPassword('same');
		const h2 = await hashPassword('same');
		expect(h1).not.toBe(h2);
		// Both should still verify
		expect(await verifyPassword('same', h1)).toBe(true);
		expect(await verifyPassword('same', h2)).toBe(true);
	});

	it('returns false for malformed hash', async () => {
		expect(await verifyPassword('any', 'not-a-valid-hash')).toBe(false);
		expect(await verifyPassword('any', '')).toBe(false);
	});
});

// ─── Session ──────────────────────────────────────────────────────────────────

function makeCookies() {
	const store = new Map<string, string>();
	return {
		get: (name: string) => store.get(name),
		set: (name: string, value: string) => { store.set(name, value); },
		delete: (name: string) => { store.delete(name); },
		// SvelteKit Cookies interface compat
		getAll: () => [],
		serialize: () => '',
	} as unknown as import('@sveltejs/kit').Cookies;
}

describe('createAdminSession / verifyAdminSession', () => {
	const SECRET = 'test-secret-32-bytes-xxxxxxxxxxx';

	it('creates a valid session', () => {
		const cookies = makeCookies();
		createAdminSession(cookies, SECRET);
		expect(verifyAdminSession(cookies, SECRET)).toBe(true);
	});

	it('returns false when no cookie present', () => {
		const cookies = makeCookies();
		expect(verifyAdminSession(cookies, SECRET)).toBe(false);
	});

	it('returns false when cookie is tampered', () => {
		const cookies = makeCookies();
		createAdminSession(cookies, SECRET);
		// Tamper with the cookie value
		const val = cookies.get('admin_session')!;
		(cookies as any).set('admin_session', val.slice(0, -4) + 'xxxx');
		expect(verifyAdminSession(cookies, SECRET)).toBe(false);
	});

	it('returns false when signed with wrong secret', () => {
		const cookies = makeCookies();
		createAdminSession(cookies, SECRET);
		expect(verifyAdminSession(cookies, 'wrong-secret')).toBe(false);
	});

	it('destroyAdminSession removes the session', () => {
		const cookies = makeCookies();
		createAdminSession(cookies, SECRET);
		expect(verifyAdminSession(cookies, SECRET)).toBe(true);
		destroyAdminSession(cookies);
		expect(verifyAdminSession(cookies, SECRET)).toBe(false);
	});
});
