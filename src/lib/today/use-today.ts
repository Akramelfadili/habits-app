import { addDays, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { toDayKey } from "@/utils/day-key";
import { type Clock, systemClock } from "./clock";

export function currentDay(): Date {
	return startOfDay(new Date());
}

// +1 s so the clock is surely past midnight.
function msUntilMidnight(now: Date): number {
	return startOfDay(addDays(now, 1)).getTime() - now.getTime() + 1000;
}

// Without this a screen left open overnight keeps yesterday as "today" and logs onto it. The Date
// is the same object all day, so it is safe in deps; a write should still call `currentDay()` when it runs.
export function useToday(clock: Clock = systemClock): Date {
	const dayKey = () => toDayKey(clock.now());
	const [key, setKey] = useState(dayKey);
	const [armed, setArmed] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` and `armed` are the re-arm triggers
	useEffect(() => {
		const refresh = () => setKey(dayKey());
		const cancel = clock.after(msUntilMidnight(clock.now()), () => {
			refresh();
			setArmed((count) => count + 1);
		});
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		return () => {
			cancel();
			subscription.remove();
		};
	}, [key, armed]);

	return useMemo(() => parseISO(key), [key]);
}
