import type { LayoutServerLoad } from './$types';
import { getGlobalSettings, getActiveDrop } from '$lib/server/db/queries';

export const load: LayoutServerLoad = async () => {
	const [settings, activeDrop] = await Promise.all([getGlobalSettings(), getActiveDrop()]);
	return { settings, activeDrop };
};
