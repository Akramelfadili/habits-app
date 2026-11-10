import { useMemo, useState } from "react";
import { useToday } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { nextSelectedKey } from "../domain/selected-day";

// Held in the screen's own React state, not a store: the tabs stay mounted, so it survives a tab switch without leaking into Progress.
export function useSelectedDayQueries() {
	const today = useToday();
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const selectedDay = useMemo(
		() => (selectedKey === null ? today : fromDayKey(selectedKey)),
		[selectedKey, today],
	);

	return {
		today,
		selectedKey,
		selectedDay,
		isPastDay: selectedKey !== null,
		selectDay: (day: Date) =>
			setSelectedKey((current) =>
				nextSelectedKey(current, toDayKey(day), toDayKey(today)),
			),
		showToday: () => setSelectedKey(null),
	};
}
