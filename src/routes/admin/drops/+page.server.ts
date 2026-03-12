import type { PageServerLoad } from './$types';
import { getAllDrops } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const drops = await getAllDrops();
	return { drops };
};
