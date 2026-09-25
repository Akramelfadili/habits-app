import { format } from "date-fns";
import type { Entry } from "../types";

/**
 * Static fake entries backing the web-only repository (`entry-repository.web.ts`).
 * Marks habit #2 ("Read before bed") and #3 ("Glass of water") — both daily,
 * so they're due regardless of which real-world weekday the visual check
 * runs on — already done today, so the Today screen's progress bar and
 * per-group counts render non-zero instead of a flat 0%.
 */
export function makeEntryFixtures(): Entry[] {
	const today = format(new Date(), "yyyy-MM-dd");
	return [
		{ id: 1, habitId: 2, date: today, createdAt: new Date() },
		{ id: 2, habitId: 3, date: today, createdAt: new Date() },
	];
}
