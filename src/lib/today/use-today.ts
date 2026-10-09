import { addDays, format, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

const DAY_KEY_FORMAT = "yyyy-MM-dd";

/** Local midnight today — the single place the app asks "what day is it" for a write. */
export function currentDay(): Date {
	return startOfDay(new Date());
}

const dayKey = () => format(new Date(), DAY_KEY_FORMAT);

/** Milliseconds until the next local midnight (+1 s, so the clock is surely past it). */
function msUntilMidnight(): number {
	const now = new Date();
	return startOfDay(addDays(now, 1)).getTime() - now.getTime() + 1000;
}

/**
 * Today (local midnight), kept current (audit A7-02): it changes when the app
 * returns to the foreground on a later day and when midnight passes while the
 * app is open. Without it a screen left open overnight keeps yesterday as
 * "today" and logs onto it.
 *
 * The returned Date is the same object for the whole day, so it is safe in
 * memo/effect dependencies. A write should still call `currentDay()` at the
 * moment it runs instead of trusting the last render.
 */
export function useToday(): Date {
	const [key, setKey] = useState(dayKey);
	// Bumped by the midnight timer so it re-arms even if the clock hasn't ticked over.
	const [armed, setArmed] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` and `armed` are the re-arm triggers
	useEffect(() => {
		const refresh = () => setKey(dayKey());
		const timer = setTimeout(() => {
			refresh();
			setArmed((count) => count + 1);
		}, msUntilMidnight());
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		return () => {
			clearTimeout(timer);
			subscription.remove();
		};
		// `armed` and `key` re-arm the timer for the next midnight.
	}, [key, armed]);

	// parseISO of a date-only string is local midnight.
	return useMemo(() => parseISO(key), [key]);
}
