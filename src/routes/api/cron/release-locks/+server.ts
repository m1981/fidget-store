import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { releaseExpiredSoftLocks } from '$lib/server/db/queries';
import { env } from '$env/dynamic/private';

/**
 * Vercel Cron endpoint — runs every minute.
 * Releases expired BLIK soft locks and restores capacity.
 *
 * Vercel automatically sends Authorization: Bearer <CRON_SECRET>
 * when invoking scheduled cron jobs.
 */
export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	const cronSecret = env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	const result = await releaseExpiredSoftLocks();
	return json({ released: result.released });
};
