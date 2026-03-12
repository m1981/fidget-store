/**
 * Admin & Maker authentication.
 * - Passwords: scrypt (Node built-in crypto) — timing-safe compare
 * - Sessions: HMAC-SHA256 signed token stored in a cookie
 * No third-party deps required.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { Cookies } from '@sveltejs/kit';

const scryptAsync = promisify(scrypt);

const SALT_LEN = 16; // bytes → 32 hex chars
const KEY_LEN = 64; // scrypt output bytes
const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Returns a storable hash string: `<hex-salt>:<hex-key>`
 * Uses scrypt with N=16384, r=8, p=1 (OWASP recommended minimum).
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LEN);
	const key = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
	return `${salt.toString('hex')}:${key.toString('hex')}`;
}

/**
 * Constant-time comparison — safe against timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const [saltHex, keyHex] = hash.split(':');
	if (!saltHex || !keyHex) return false;
	const salt = Buffer.from(saltHex, 'hex');
	const expectedKey = Buffer.from(keyHex, 'hex');
	try {
		const actualKey = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
		return timingSafeEqual(actualKey, expectedKey);
	} catch {
		return false;
	}
}

// ─── Session Tokens ───────────────────────────────────────────────────────────

/** Token format: `<expiresAt_ms>.<hex-hmac>` */
function signToken(payload: string, secret: string): string {
	const mac = createHmac('sha256', secret).update(payload).digest('hex');
	return `${payload}.${mac}`;
}

function verifyToken(token: string, secret: string): string | null {
	const lastDot = token.lastIndexOf('.');
	if (lastDot === -1) return null;
	const payload = token.slice(0, lastDot);
	const mac = token.slice(lastDot + 1);
	const expected = createHmac('sha256', secret).update(payload).digest('hex');
	const expectedBuf = Buffer.from(expected, 'hex');
	const actualBuf = Buffer.from(mac.padEnd(expected.length, '0').slice(0, expected.length), 'hex');
	try {
		if (!timingSafeEqual(expectedBuf, actualBuf)) return null;
	} catch {
		return null;
	}
	// Re-check without padded buffer — reject length mismatches
	if (mac.length !== expected.length) return null;
	return payload;
}

// ─── Admin Session ────────────────────────────────────────────────────────────

export function createAdminSession(cookies: Cookies, sessionSecret: string): void {
	const expiresAt = Date.now() + SESSION_TTL_MS;
	const token = signToken(`admin:${expiresAt}`, sessionSecret);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: SESSION_TTL_MS / 1000
	});
}

export function verifyAdminSession(cookies: Cookies, sessionSecret: string): boolean {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return false;
	const payload = verifyToken(token, sessionSecret);
	if (!payload) return false;
	const [role, expiresStr] = payload.split(':');
	if (role !== 'admin') return false;
	const expiresAt = Number(expiresStr);
	return !isNaN(expiresAt) && Date.now() < expiresAt;
}

export function destroyAdminSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
