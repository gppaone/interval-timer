// Plain JS (not TS) on purpose: scripts/user.mjs imports this file directly
// with node, outside of the SvelteKit build.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

// scrypt parameters (OWASP-recommended N=2^15, r=8, p=3). They are stored in
// each hash, so they can be raised later without invalidating old hashes.
const N = 32768;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * 1024 * 1024;

/**
 * @param {string} password
 * @param {Buffer} salt
 * @param {number} n
 * @param {number} r
 * @param {number} p
 * @param {number} keyLength
 * @returns {Promise<Buffer>}
 */
function derive(password, salt, n, r, p, keyLength) {
	return new Promise((resolve, reject) => {
		scrypt(password, salt, keyLength, { N: n, r, p, maxmem: MAX_MEMORY }, (err, key) => {
			if (err) reject(err);
			else resolve(key);
		});
	});
}

/**
 * @param {string} password
 * @returns {Promise<string>} `scrypt$N$r$p$salt$hash`
 */
export async function hashPassword(password) {
	const salt = randomBytes(16);
	const key = await derive(password, salt, N, R, P, KEY_LENGTH);
	return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

/** @type {Promise<string> | undefined} */
let dummyHash;

/**
 * Pass `null` when the user does not exist: a hash is still computed so that
 * unknown emails and wrong passwords take about the same time.
 * @param {string} password
 * @param {string | null | undefined} stored
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
	if (!stored) {
		dummyHash ??= hashPassword('not-a-real-password');
		await verifyPassword(password, await dummyHash);
		return false;
	}

	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

	const [, n, r, p, saltB64, keyB64] = parts;
	const expected = Buffer.from(keyB64, 'base64url');
	const actual = await derive(
		password,
		Buffer.from(saltB64, 'base64url'),
		Number(n),
		Number(r),
		Number(p),
		expected.length
	);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeEmail(value) {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * @param {string} email already normalized
 * @returns {string | null} an error message, or null if valid
 */
export function validateEmail(email) {
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return 'Enter a valid email address.';
	}
	return null;
}

/**
 * @param {unknown} password
 * @returns {string | null} an error message, or null if valid
 */
export function validatePassword(password) {
	if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
	}
	return null;
}
