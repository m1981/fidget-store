/**
 * Client-side cart state — Svelte 5 runes module.
 * Persisted to sessionStorage. Safe to import in any Svelte component.
 *
 * Only variantId + quantity are sent to the server at checkout.
 * Prices and print durations are display-only and always re-validated server-side.
 */
import { browser } from '$app/environment';

export interface CartItem {
	variantId: number;
	productId: number;
	productName: string;
	filamentColor: string;
	hexCode: string;
	/** Display only — server re-validates from DB */
	pricePln: number;
	/** Display only — server re-validates from DB */
	printDurationMinutes: number;
	isMystery: boolean;
	quantity: number;
}

const STORAGE_KEY = 'fidget_cart';

function loadFromStorage(): CartItem[] {
	if (!browser) return [];
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as CartItem[];
	} catch {
		return [];
	}
}

let items = $state<CartItem[]>(loadFromStorage());

function persist(): void {
	if (!browser) return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function cartItems(): CartItem[] {
	return items;
}

export function cartCount(): number {
	return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(): number {
	return items.reduce((sum, i) => sum + i.pricePln * i.quantity, 0);
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
	const existing = items.find((i) => i.variantId === item.variantId);
	if (existing) {
		existing.quantity += quantity;
	} else {
		items.push({ ...item, quantity });
	}
	persist();
}

export function removeFromCart(variantId: number): void {
	const idx = items.findIndex((i) => i.variantId === variantId);
	if (idx !== -1) items.splice(idx, 1);
	persist();
}

export function clearCart(): void {
	items.length = 0;
	persist();
}

/** Serialises cart for the checkout form hidden input (variantId + quantity only) */
export function cartToCheckoutPayload(): Array<{ variantId: number; quantity: number }> {
	return items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
}
