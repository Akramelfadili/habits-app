import { useMemo, useState } from "react";
import { useToday } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { nextSelectedKey } from "../domain/selected-day";

/**
 * The day Today shows. `selectedKey` is a past day's key, or `null` to follow today: a followed
 * day moves with `useToday()` at midnight, a past one stays where it is. Held in the calling
 * screen's own React state, not a store: the tabs stay mounted, so it survives a tab switch
 * without leaking into Progress, which keeps its own range.
 *
 * Named `...Queries` for the hook-naming rule: it reads which day is shown; the one write,
 * `selectDay`, only moves that selection.
 */
export function useSelectedDayQueries() {
	const today = useToday();
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const selectedDay = useMemo(
		() => (selectedKey === null ? today : fromDayKey(selectedKey)),
		[selectedKey, today],
	);

	return {
		/** The real today — what streak-at-risk and the "Show today" bar are measured against. */
		today,
		selectedKey,
		selectedDay,
		isPastDay: selectedKey !== null,
		/** Future days are ignored; choosing today goes back to following it. */
		selectDay: (day: Date) =>
			setSelectedKey((current) =>
				nextSelectedKey(current, toDayKey(day), toDayKey(today)),
			),
		showToday: () => setSelectedKey(null),
	};
}
